/**
 * Supabase Edge Function — AUTH EMAIL
 *
 * Các hành động (action):
 *  1) action="welcome": gửi email CHÀO MỪNG sau khi đăng ký, kèm thông tin
 *     đăng nhập (email + mật khẩu vừa đặt). Có kiểm tra CHỐNG LẠM DỤNG: chỉ gửi
 *     nếu thực sự có user với email đó vừa được tạo trong ~15 phút gần đây.
 *  2) action="reset": QUÊN MẬT KHẨU — sinh mật khẩu MỚI ngẫu nhiên, đặt lại cho
 *     user (admin API), rồi gửi mật khẩu mới vào email. Luôn trả về thành công
 *     chung chung (không tiết lộ email có tồn tại hay không — chống dò email).
 *  3) action="password-changed": thông báo bảo mật sau khi user tự đổi mật khẩu.
 *  4) action="request_partner_upgrade" / "confirm_partner_upgrade": NÂNG CẤP TÀI
 *     KHOẢN cho user vào Tuzi qua đối tác (Partner SSO, email giả dạng
 *     `...@users.tuzi.internal`, KHÔNG có mật khẩu — xem partner-sso/index.ts)
 *     → tự gắn 1 email thật + đặt mật khẩu để dùng trực tiếp tại tuzi.vn, giữ
 *     nguyên toàn bộ dữ liệu vì cùng user_id. Xác thực quyền sở hữu email mới
 *     bằng mã OTP 6 số (bảng `partner_upgrade_otps`, xem supabase_partner_upgrade.sql)
 *     trước khi đổi — KHÔNG bao giờ đổi email/mật khẩu nếu chưa xác nhận đúng mã.
 *
 * Vì sao không gửi lại mật khẩu CŨ? Supabase băm (bcrypt) mật khẩu, không thể
 * giải ngược — nên "quên mật khẩu" chỉ có thể tạo mật khẩu MỚI.
 *
 * ── TRIỂN KHAI ──
 *   supabase functions deploy auth-email --no-verify-jwt
 *   supabase secrets set RESEND_API_KEY=<khóa-Resend>
 *   supabase secrets set AUTH_FROM_EMAIL="Tuzi <no-reply@tuzi.vn>"   (tùy chọn)
 *   supabase secrets set APP_NAME="Tuzi — Tử Vi & Bát Tự"            (tùy chọn)
 *   -- chạy file supabase_auth_email.sql RỒI supabase_partner_upgrade.sql trong SQL Editor trước.
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

/** Domain email giả dùng cho user vào qua Partner SSO — PHẢI khớp `syntheticEmail()` trong
 *  partner-sso/index.ts. Dùng làm tín hiệu duy nhất để nhận diện "tài khoản cần nâng cấp". */
const PARTNER_EMAIL_SUFFIX = '@users.tuzi.internal';

/** Sinh mã OTP 6 số ngẫu nhiên (crypto-safe). */
function genOtp(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(100000 + (arr[0] % 900000));
}

/** Hash SHA-256 → hex, dùng để lưu mã OTP mà không lưu bản gốc. */
async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Lấy user hiện tại từ header Authorization (Bearer <access_token>). */
async function getUserFromAuthHeader(supa: ReturnType<typeof createClient>, req: Request) {
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const { data, error } = await supa.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
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

  // ─────────────── NÂNG CẤP TÀI KHOẢN (Partner SSO) — bước 1: xin mã OTP ───────────────
  // Chỉ cho user vào qua đối tác (email giả PARTNER_EMAIL_SUFFIX) — chặn user thường lợi
  // dụng action này để đổi email tùy tiện (đổi email thường không thuộc phạm vi action này).
  if (action === 'request_partner_upgrade') {
    const user = await getUserFromAuthHeader(supa, req);
    if (!user) return json({ ok: false, error: 'no_auth' }, 401);
    if (!user.email?.endsWith(PARTNER_EMAIL_SUFFIX)) {
      return json({ ok: false, error: 'not_partner_account' }, 403);
    }
    const newEmail = String(body.newEmail ?? '').trim().toLowerCase();
    if (!newEmail || !newEmail.includes('@')) return json({ ok: false, error: 'invalid_email' }, 400);

    const { data: existingUid } = await supa.rpc('find_user_id_by_email', { p_email: newEmail });
    if (existingUid) return json({ ok: false, error: 'email_in_use' }, 409);

    const code = genOtp();
    const codeHash = await sha256Hex(code);
    await supa.from('partner_upgrade_otps').delete().eq('user_id', user.id);
    const { error: insErr } = await supa.from('partner_upgrade_otps').insert({
      user_id: user.id, new_email: newEmail, code_hash: codeHash,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
    if (insErr) {
      console.error('[auth-email] request_partner_upgrade insert lỗi:', insErr.message);
      return json({ ok: false, error: 'internal' }, 500);
    }
    // Debug tạm: chỉ ra ở log Edge Function (supabase functions logs auth-email), KHÔNG trả về client.
    console.log('[auth-email] OTP debug (request_partner_upgrade):', code, '→', newEmail);

    const html = wrap('Xác nhận email để bảo vệ tài khoản', `
      <p>Bạn vừa yêu cầu gắn email này vào tài khoản Tuzi của mình để khôi phục tài khoản khi cần
      (bạn vẫn dùng Tuzi như hiện tại). Mã xác nhận của bạn:</p>
      <div style="background:#1a1430;border:1px solid #3a2f5a;border-radius:8px;padding:16px;margin:12px 0;text-align:center">
        <span style="font-size:28px;letter-spacing:6px;color:#e0b341;font-weight:800">${esc(code)}</span>
      </div>
      <p style="font-size:13px;color:#bbb">Mã có hiệu lực trong 10 phút. Nếu không phải bạn yêu cầu, hãy bỏ qua email này.</p>`);
    const sent = await sendEmail(newEmail, `Mã xác nhận bảo vệ tài khoản — ${APP_NAME}`, html);
    return json({ ok: sent });
  }

  // ─────────────── NÂNG CẤP TÀI KHOẢN (Partner SSO) — bước 2: xác nhận mã + đặt mật khẩu ──
  if (action === 'confirm_partner_upgrade') {
    const user = await getUserFromAuthHeader(supa, req);
    if (!user) return json({ ok: false, error: 'no_auth' }, 401);
    if (!user.email?.endsWith(PARTNER_EMAIL_SUFFIX)) {
      return json({ ok: false, error: 'not_partner_account' }, 403);
    }
    const code = String(body.code ?? '').trim();
    const newPassword = String(body.newPassword ?? '');
    if (!code || newPassword.length < 6) return json({ ok: false, error: 'invalid_input' }, 400);

    const { data: otp, error: otpErr } = await supa
      .from('partner_upgrade_otps')
      .select('id, new_email, code_hash, attempts, expires_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (otpErr || !otp) return json({ ok: false, error: 'no_pending_request' }, 400);
    if (new Date(otp.expires_at).getTime() < Date.now()) {
      await supa.from('partner_upgrade_otps').delete().eq('id', otp.id);
      return json({ ok: false, error: 'expired' }, 400);
    }
    if (otp.attempts >= 5) {
      await supa.from('partner_upgrade_otps').delete().eq('id', otp.id);
      return json({ ok: false, error: 'too_many_attempts' }, 400);
    }

    const codeHash = await sha256Hex(code);
    if (codeHash !== otp.code_hash) {
      await supa.from('partner_upgrade_otps').update({ attempts: otp.attempts + 1 }).eq('id', otp.id);
      return json({ ok: false, error: 'invalid_code' }, 400);
    }

    const { error: upErr } = await supa.auth.admin.updateUserById(user.id, {
      email: otp.new_email, password: newPassword, email_confirm: true,
    });
    if (upErr) {
      console.error('[auth-email] confirm_partner_upgrade updateUserById lỗi:', upErr.message);
      return json({ ok: false, error: 'update_failed' }, 500);
    }
    await supa.from('partner_upgrade_otps').delete().eq('id', otp.id);

    const html = wrap('Tài khoản đã được bảo vệ 🎉', `
      <p>Tài khoản Tuzi của bạn đã được gắn email này. Bạn có thể dùng email và mật khẩu vừa đặt để đăng nhập
      lại khi cần (ví dụ khi đổi điện thoại). Bạn vẫn có thể tiếp tục dùng Tuzi như bình thường — dữ liệu
      dùng chung một tài khoản.</p>`);
    void sendEmail(otp.new_email, `Tài khoản đã được bảo vệ — ${APP_NAME}`, html);

    return json({ ok: true, email: otp.new_email });
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
