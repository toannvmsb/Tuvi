/**
 * Supabase Edge Function — AUTH EMAIL
 *
 * Hai hành động (action):
 *  1) action="welcome": gửi email CHÀO MỪNG sau khi đăng ký, kèm thông tin
 *     đăng nhập (email + mật khẩu vừa đặt). Có kiểm tra CHỐNG LẠM DỤNG: chỉ gửi
 *     nếu thực sự có user với email đó vừa được tạo trong ~15 phút gần đây.
 *  2) action="reset": QUÊN MẬT KHẨU — sinh mật khẩu MỚI ngẫu nhiên, đặt lại cho
 *     user (admin API), rồi gửi mật khẩu mới vào email. Luôn trả về thành công
 *     chung chung (không tiết lộ email có tồn tại hay không — chống dò email).
 *
 * Vì sao không gửi lại mật khẩu CŨ? Supabase băm (bcrypt) mật khẩu, không thể
 * giải ngược — nên "quên mật khẩu" chỉ có thể tạo mật khẩu MỚI.
 *
 * ── TRIỂN KHAI ──
 *   supabase functions deploy auth-email --no-verify-jwt
 *   supabase secrets set RESEND_API_KEY=<khóa-Resend>
 *   supabase secrets set AUTH_FROM_EMAIL="Tuzi <no-reply@tuzi.vn>"   (tùy chọn)
 *   supabase secrets set APP_NAME="Tuzi — Tử Vi & Bát Tự"            (tùy chọn)
 *   -- chạy file supabase_auth_email.sql trong SQL Editor trước.
 * (SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY do nền tảng tự cấp.)
 *
 * Yêu cầu: tài khoản Resend (resend.com) đã VERIFY domain tuzi.vn để gửi từ
 * địa chỉ no-reply@tuzi.vn.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL = Deno.env.get('AUTH_FROM_EMAIL') ?? 'Tuzi <no-reply@tuzi.vn>';
const APP_NAME = Deno.env.get('APP_NAME') ?? 'Tuzi — Tử Vi & Bát Tự';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json' } });

/** Sinh mật khẩu ngẫu nhiên dễ đọc (bỏ ký tự dễ nhầm: O/0, I/l/1). */
function genPassword(len = 10): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  let out = '';
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  // Đảm bảo có ít nhất 1 số + 1 chữ hoa (cho chắc chắn ≥ yêu cầu phổ biến).
  return out.slice(0, len - 2) + 'A' + (arr[0] % 9 + 1);
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}

/** Gửi email qua Resend. Trả về true nếu thành công. */
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY chưa được cấu hình');
    return false;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });
  if (!res.ok) {
    console.error('Resend lỗi:', res.status, await res.text());
    return false;
  }
  return true;
}

const wrap = (title: string, bodyHtml: string) => `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#0f0a1e;color:#eee;border-radius:12px">
    <h2 style="color:#e0b341;margin:0 0 12px">${esc(APP_NAME)}</h2>
    <h3 style="color:#fff;margin:0 0 16px">${esc(title)}</h3>
    ${bodyHtml}
    <hr style="border:none;border-top:1px solid #333;margin:20px 0"/>
    <p style="font-size:12px;color:#999">Email tự động từ ${esc(APP_NAME)} — vui lòng không trả lời email này. Nếu bạn không thực hiện thao tác này, hãy bỏ qua email.</p>
  </div>`;

const credBox = (email: string, password: string) => `
  <div style="background:#1a1430;border:1px solid #3a2f5a;border-radius:8px;padding:16px;margin:12px 0">
    <p style="margin:0 0 8px"><b style="color:#e0b341">Email đăng nhập:</b> ${esc(email)}</p>
    <p style="margin:0"><b style="color:#e0b341">Mật khẩu:</b> <code style="background:#2a2150;padding:2px 8px;border-radius:4px;font-size:15px">${esc(password)}</code></p>
  </div>
  <p style="font-size:13px;color:#f0c97a">🔐 Vì lý do bảo mật, bạn nên đăng nhập rồi đổi mật khẩu trong mục "Thông tin tài khoản".</p>`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }

  const action = String(body.action ?? '');
  const email = String(body.email ?? '').trim().toLowerCase();
  const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

  // ─────────────────── PASSWORD-CHANGED (đã đăng nhập) ───────────────────
  // Email lấy từ TOKEN (không tin email trong body). Chỉ user đăng nhập gửi được,
  // và chỉ gửi tới CHÍNH email của họ → không cần body.email.
  if (action === 'password-changed') {
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return json({ ok: false, error: 'no_auth' }, 401);
    const { data: u, error: uErr } = await supa.auth.getUser(token);
    const userEmail = u?.user?.email;
    if (uErr || !userEmail) return json({ ok: false, error: 'invalid_token' }, 401);

    const displayName = String(body.displayName ?? '').trim();
    const when = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    const hello = displayName ? `Xin chào ${esc(displayName)},` : 'Xin chào,';
    const html = wrap('Mật khẩu đã được thay đổi', `
      <p>${hello}</p>
      <p>Mật khẩu của tài khoản <b>${esc(userEmail)}</b> vừa được thay đổi thành công lúc <b>${esc(when)}</b> (giờ Việt Nam).</p>
      <p style="font-size:13px;color:#f0c97a">⚠ Nếu KHÔNG phải bạn thực hiện, hãy dùng chức năng "Quên mật khẩu" ở màn đăng nhập để lấy lại quyền kiểm soát tài khoản ngay và liên hệ hỗ trợ.</p>`);
    const sent = await sendEmail(userEmail, `Mật khẩu vừa thay đổi — ${APP_NAME}`, html);
    return json({ ok: sent });
  }

  // Các action còn lại (welcome/reset) BẮT BUỘC có email hợp lệ trong body.
  if (!email || !email.includes('@')) return json({ error: 'invalid_email' }, 400);

  // ───────────────────────── WELCOME ─────────────────────────
  if (action === 'welcome') {
    const password = String(body.password ?? '');
    const displayName = String(body.displayName ?? '').trim();
    if (!password) return json({ error: 'missing_password' }, 400);

    // Chống lạm dụng: chỉ gửi nếu có user với email này VỪA tạo gần đây (≤ 15 phút).
    const { data: uid } = await supa.rpc('find_user_id_by_email', { p_email: email });
    if (!uid) return json({ ok: true, skipped: 'no_user' });
    const { data: ures } = await supa.auth.admin.getUserById(uid as string);
    const createdAt = ures?.user?.created_at ? new Date(ures.user.created_at).getTime() : 0;
    if (!createdAt || Date.now() - createdAt > 15 * 60 * 1000) {
      return json({ ok: true, skipped: 'not_recent' });
    }

    const hello = displayName ? `Xin chào ${esc(displayName)},` : 'Xin chào,';
    const html = wrap('Đăng ký tài khoản thành công 🎉', `
      <p>${hello}</p>
      <p>Cảm ơn bạn đã đăng ký <b>${esc(APP_NAME)}</b>. Dưới đây là thông tin đăng nhập của bạn:</p>
      ${credBox(email, password)}
      <p style="font-size:13px;color:#bbb">Bạn được tặng <b>50 xu</b> để trải nghiệm các tính năng nâng cao. Chúc bạn khám phá lá số thật thú vị!</p>`);
    const sent = await sendEmail(email, `Chào mừng đến với ${APP_NAME}`, html);
    return json({ ok: sent });
  }

  // ───────────────────────── RESET ─────────────────────────
  if (action === 'reset') {
    // Tìm user; nếu không có vẫn trả về OK chung chung (chống dò email).
    const { data: uid } = await supa.rpc('find_user_id_by_email', { p_email: email });
    if (!uid) return json({ ok: true });

    const newPassword = genPassword(10);
    const { error: upErr } = await supa.auth.admin.updateUserById(uid as string, { password: newPassword });
    if (upErr) {
      console.error('updateUserById lỗi:', upErr.message);
      return json({ ok: false, error: 'update_failed' }, 500);
    }

    const html = wrap('Yêu cầu lấy lại mật khẩu', `
      <p>Bạn (hoặc ai đó dùng email này) đã yêu cầu lấy lại mật khẩu. Chúng tôi đã tạo <b>mật khẩu mới</b> cho tài khoản của bạn:</p>
      ${credBox(email, newPassword)}
      <p style="font-size:13px;color:#bbb">Mật khẩu cũ đã không còn hiệu lực. Hãy dùng mật khẩu mới ở trên để đăng nhập.</p>`);
    const sent = await sendEmail(email, `Mật khẩu mới — ${APP_NAME}`, html);
    // Vẫn trả về ok chung chung dù gửi mail lỗi để không lộ trạng thái email.
    return json({ ok: true, _sent: sent });
  }

  return json({ error: 'unknown_action' }, 400);
});
