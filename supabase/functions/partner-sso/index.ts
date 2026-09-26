/**
 * Supabase Edge Function — PARTNER SSO
 *
 * Cho phép 1 đối tác ngoài (vd app ngân hàng) nhúng Tuzi (web) và tự động đăng
 * nhập người dùng của họ — KHÔNG qua màn Đăng ký/Đăng nhập thường của Tuzi.
 *
 * Luồng:
 *   1. Đối tác ký 1 JWT ngắn hạn (HS256, secret ở cột `partners.secret`, `sub` =
 *      external_user_id của họ, `iat`/`exp` bắt buộc, tuổi token ≤120s; có thể kèm
 *      claim tuỳ chọn `employeeCode` — mã nhân viên của đối tác, cho các đối tác cần
 *      quản lý tới cấp nhân viên, xem bước 3b) rồi mở
 *      `https://tuzi.vn/embed?partner=<code>&token=<jwt>` (webview/iframe).
 *   2. Web Tuzi gọi function này với `{ partnerCode, token }`.
 *   3. Function verify token bằng secret của đúng đối tác, map external_user_id
 *      sang 1 user Supabase nội bộ qua bảng `partner_user_links` (tạo mới nếu
 *      lần đầu — trigger `handle_new_user()` tự tặng 50 xu mặc định như mọi
 *      user mới), rồi CỘNG THÊM bonus xu riêng của đối tác (1 lần duy nhất,
 *      idempotent qua RPC `credit_partner_bonus`).
 *   4. Phát hành session KHÔNG cần mật khẩu: `admin.generateLink` (magiclink)
 *      rồi `verifyOtp` ngay tại đây bằng client anon key — KHÔNG đụng tới mật
 *      khẩu thật của user (khác cách "đổi mật khẩu rồi đăng nhập lại" ở
 *      auth-email) để không phá vỡ nếu sau này user tự đặt mật khẩu riêng.
 *   5. Trả `{ access_token, refresh_token }` — client tự `setSession(...)`.
 *
 * ── TRIỂN KHAI ──
 *   -- chạy file supabase_partner_sso.sql rồi supabase_partner_admin.sql trong SQL Editor trước.
 *   supabase functions deploy partner-sso --no-verify-jwt
 *   -- thêm đối tác mới qua trang "Đối tác" trong tuvi-admin (không cần sửa code/SQL tay nữa).
 * (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY do nền tảng tự cấp sẵn.)
 *
 * Xem CLAUDE.md mục "Partner SSO" để biết quy trình đầy đủ thêm 1 đối tác mới.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jwtVerify } from 'npm:jose@5';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

// Tuổi tối đa của token (giây) kể từ lúc đối tác ký (`iat`) — chống phát lại 1 URL cũ đã lộ
// (vd lưu trong lịch sử trình duyệt/log proxy). Ngắn hơn `exp` do đối tác tự đặt nếu họ đặt dài hơn.
const MAX_TOKEN_AGE_SEC = 120;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json' } });

/** Email nội bộ giả định cho user tạo qua đối tác — KHÔNG gửi mail thật tới đây, chỉ để
 *  Supabase Auth có 1 định danh duy nhất/user (bắt buộc phải có email hoặc phone). */
function syntheticEmail(partnerCode: string, externalUserId: string): string {
  const safeExt = externalUserId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
  return `partner_${partnerCode}_${safeExt}@users.tuzi.internal`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }

  const partnerCode = String(body.partnerCode ?? '').trim();
  const token = String(body.token ?? '').trim();
  if (!partnerCode || !token) return json({ error: 'missing_params' }, 400);

  const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

  // 1) Tra đối tác + secret ký JWT của họ.
  const { data: partner, error: partnerErr } = await supa
    .from('partners')
    .select('id, code, secret, bonus_xu, active')
    .eq('code', partnerCode)
    .maybeSingle();
  if (partnerErr || !partner || !partner.active) {
    return json({ error: 'unknown_partner' }, 401);
  }

  // 2) Verify chữ ký + hạn dùng JWT đối tác gửi lên.
  let externalUserId: string;
  let displayName: string | undefined;
  let employeeCode: string | undefined;
  try {
    const secretKey = new TextEncoder().encode(partner.secret);
    const { payload } = await jwtVerify(token, secretKey, { algorithms: ['HS256'] });
    if (typeof payload.iat !== 'number') throw new Error('missing_iat');
    if (Date.now() / 1000 - payload.iat > MAX_TOKEN_AGE_SEC) throw new Error('token_too_old');
    externalUserId = String(payload.sub ?? '');
    if (!externalUserId) throw new Error('missing_sub');
    const claims = payload as Record<string, unknown>;
    displayName = typeof claims.name === 'string' ? claims.name : undefined;
    // Mã nhân viên đối tác (tuỳ chọn) — vd đối tác ngân hàng cần biết nhân viên nào dẫn khách vào
    // dùng Tuzi. Lưu lại ở bước 3b/5b, KHÔNG ảnh hưởng gì tới việc map/tạo user (vẫn dựa hoàn toàn
    // vào external_user_id).
    employeeCode = typeof claims.employeeCode === 'string' ? claims.employeeCode.trim().slice(0, 100) || undefined : undefined;
  } catch (e) {
    console.error('[partner-sso] token không hợp lệ:', e instanceof Error ? e.message : e);
    return json({ error: 'invalid_token' }, 401);
  }

  // 3) Map sang user Supabase nội bộ — tạo mới nếu lần đầu người này vào qua đối tác.
  const { data: existingLink } = await supa
    .from('partner_user_links')
    .select('id, user_id, bonus_credited')
    .eq('partner_id', partner.id)
    .eq('external_user_id', externalUserId)
    .maybeSingle();

  const email = syntheticEmail(partner.code, externalUserId);
  let userId: string;
  let linkId: string;
  let bonusCredited: boolean;

  if (existingLink) {
    userId = existingLink.user_id;
    linkId = existingLink.id;
    bonusCredited = existingLink.bonus_credited;
  } else {
    const { data: created, error: createErr } = await supa.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { partner_code: partner.code, external_user_id: externalUserId, display_name: displayName },
    });
    if (createErr || !created?.user) {
      console.error('[partner-sso] createUser lỗi:', createErr?.message);
      return json({ error: 'create_user_failed' }, 500);
    }
    userId = created.user.id;
    const { data: link, error: linkErr } = await supa
      .from('partner_user_links')
      .insert({ partner_id: partner.id, external_user_id: externalUserId, user_id: userId })
      .select('id')
      .single();
    if (linkErr || !link) {
      console.error('[partner-sso] tạo partner_user_links lỗi:', linkErr?.message);
      return json({ error: 'link_failed' }, 500);
    }
    linkId = link.id;
    bonusCredited = false;
  }

  // 4) Phát hành session KHÔNG cần mật khẩu (xem giải thích ở đầu file).
  const { data: linkData, error: genErr } = await supa.auth.admin.generateLink({ type: 'magiclink', email });
  const emailOtp = linkData?.properties?.email_otp;
  if (genErr || !emailOtp) {
    console.error('[partner-sso] generateLink lỗi:', genErr?.message);
    return json({ error: 'session_failed' }, 500);
  }

  const anon = createClient(SUPABASE_URL, ANON_KEY);
  const { data: verified, error: verifyErr } = await anon.auth.verifyOtp({ email, token: emailOtp, type: 'magiclink' });
  if (verifyErr || !verified?.session) {
    console.error('[partner-sso] verifyOtp lỗi:', verifyErr?.message);
    return json({ error: 'session_failed' }, 500);
  }

  // 5) Cấp bonus xu của đối tác — CHỈ lần đầu (idempotent qua credit_partner_bonus).
  if (!bonusCredited && partner.bonus_xu > 0) {
    const { error: creditErr } = await supa.rpc('credit_partner_bonus', {
      p_link_id: linkId, p_user: userId, p_xu: partner.bonus_xu, p_partner_code: partner.code,
    });
    if (creditErr) console.error('[partner-sso] credit_partner_bonus lỗi:', creditErr.message);
  }

  // 6) Ghi lịch sử đăng nhập kèm mã nhân viên (nếu có) — dữ liệu cho báo cáo cấp nhân viên sau
  //    này, không chặn response nếu lỗi (không quan trọng bằng việc đăng nhập thành công).
  await supa.from('partner_sso_logins').insert({
    partner_id: partner.id, external_user_id: externalUserId, employee_code: employeeCode ?? null, user_id: userId,
  }).then(({ error }) => { if (error) console.error('[partner-sso] ghi partner_sso_logins lỗi:', error.message); });
  if (employeeCode) {
    await supa.from('partner_user_links').update({ employee_code: employeeCode }).eq('id', linkId)
      .then(({ error }) => { if (error) console.error('[partner-sso] cập nhật employee_code lỗi:', error.message); });
  }

  return json({
    access_token: verified.session.access_token,
    refresh_token: verified.session.refresh_token,
  });
});
