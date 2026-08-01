/**
 * Supabase Edge Function — ADMIN API
 *
 * Các thao tác quyền cao CẦN service_role (Auth Admin API) cho web dashboard quản trị.
 * Mọi request PHẢI kèm Authorization: Bearer <JWT của admin>. Function tự xác minh
 * người gọi có profiles.is_admin = true trước khi thực thi, và ghi admin_audit_log.
 *
 * actions:
 *  - "reset_password" { user_id }      → đặt MẬT KHẨU MỚI ngẫu nhiên, trả về để admin trao cho user.
 *  - "set_password"   { user_id, password } → đặt mật khẩu chỉ định.
 *  - "send_reset"     { email }        → gửi email đặt lại mật khẩu (luồng tự phục vụ).
 *  - "delete_user"    { user_id }      → xóa hẳn user (cascade hồ sơ/lá số/giao dịch).
 *  - "get_email"      { user_id }      → tra cứu email theo id.
 *
 * TRIỂN KHAI:
 *   supabase functions deploy admin-api
 *   (SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY do nền tảng tự cấp.)
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Giới hạn CORS theo domain admin dashboard. Set env ADMIN_ORIGIN khi deploy,
// ví dụ: supabase secrets set ADMIN_ORIGIN=https://admin.yourdomain.com
const ALLOWED_ORIGIN = Deno.env.get('ADMIN_ORIGIN') ?? '*';
const CORS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json' } });

const svc = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

function genPassword(len = 12): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  let out = '';
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  return out.slice(0, len - 2) + 'A' + (arr[0] % 9 + 1);
}

/** Xác minh người gọi là admin. Trả về uid admin nếu hợp lệ, ngược lại null. */
async function verifyAdmin(req: Request): Promise<string | null> {
  const auth = req.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const { data, error } = await svc.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: prof } = await svc.from('profiles').select('is_admin').eq('id', data.user.id).single();
  return prof?.is_admin ? data.user.id : null;
}

async function logAudit(adminId: string, action: string, targetUser: string | null, detail: unknown) {
  await svc.from('admin_audit_log').insert({ admin_id: adminId, action, target_user: targetUser, detail });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const adminId = await verifyAdmin(req);
  if (!adminId) return json({ error: 'forbidden' }, 403);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const action = String(body?.action || '');

  try {
    switch (action) {
      case 'reset_password': {
        const userId = String(body.user_id || '');
        if (!userId) return json({ error: 'missing_user_id' }, 400);
        const newPass = genPassword();
        const { error } = await svc.auth.admin.updateUserById(userId, { password: newPass });
        if (error) return json({ error: error.message }, 400);
        await logAudit(adminId, 'reset_password', userId, { method: 'random' });
        return json({ ok: true, password: newPass });
      }
      case 'set_password': {
        const userId = String(body.user_id || '');
        const password = String(body.password || '');
        if (!userId || password.length < 6) return json({ error: 'invalid_input' }, 400);
        const { error } = await svc.auth.admin.updateUserById(userId, { password });
        if (error) return json({ error: error.message }, 400);
        await logAudit(adminId, 'set_password', userId, { method: 'manual' });
        return json({ ok: true });
      }
      case 'send_reset': {
        const email = String(body.email || '');
        if (!email) return json({ error: 'missing_email' }, 400);
        const { error } = await svc.auth.resetPasswordForEmail(email);
        if (error) return json({ error: error.message }, 400);
        await logAudit(adminId, 'send_reset', null, { email });
        return json({ ok: true });
      }
      case 'delete_user': {
        const userId = String(body.user_id || '');
        if (!userId) return json({ error: 'missing_user_id' }, 400);
        if (userId === adminId) return json({ error: 'cannot_delete_self' }, 400);
        const { error } = await svc.auth.admin.deleteUser(userId);
        if (error) return json({ error: error.message }, 400);
        await logAudit(adminId, 'delete_user', userId, {});
        return json({ ok: true });
      }
      case 'get_email': {
        const userId = String(body.user_id || '');
        if (!userId) return json({ error: 'missing_user_id' }, 400);
        const { data, error } = await svc.auth.admin.getUserById(userId);
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true, email: data.user?.email ?? null });
      }
      case 'send_broadcast_push': {
        const pushTitle = String(body.title || '');
        const pushBody  = String(body.body  || '');
        if (!pushTitle || !pushBody) return json({ error: 'missing_title_or_body' }, 400);

        // Lấy toàn bộ Expo push token hợp lệ từ profiles.
        const { data: profs } = await svc
          .from('profiles')
          .select('expo_push_token')
          .not('expo_push_token', 'is', null)
          .neq('expo_push_token', '');

        const tokens: string[] = (profs ?? [])
          .map((p: any) => p.expo_push_token)
          .filter((t: any) => typeof t === 'string' && t.startsWith('ExponentPushToken'));

        if (!tokens.length) return json({ ok: true, sent: 0 });

        // Gửi qua Expo Push API theo lô 100 token (giới hạn API).
        const BATCH = 100;
        let sent = 0;
        for (let i = 0; i < tokens.length; i += BATCH) {
          const messages = tokens.slice(i, i + BATCH).map((to) => ({
            to, title: pushTitle, body: pushBody,
            sound: 'default', data: { type: 'broadcast' },
          }));
          await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Accept-Encoding': 'gzip, deflate',
            },
            body: JSON.stringify(messages),
          });
          sent += messages.length;
        }

        await logAudit(adminId, 'send_broadcast_push', null, { title: pushTitle, sent });
        return json({ ok: true, sent });
      }
      default:
        return json({ error: 'unknown_action' }, 400);
    }
  } catch (e) {
    return json({ error: String((e as any)?.message || e) }, 500);
  }
});
