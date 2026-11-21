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
const APP_URL = (Deno.env.get('APP_URL') ?? 'https://tuzi.vn').replace(/\/+$/, '');
// Quên mật khẩu: tối đa N yêu cầu / giờ / tài khoản (chống spam thư), liên kết sống RESET_TTL_MIN phút.
const RESET_MAX_PER_HOUR = 3;
const RESET_TTL_MIN = 30;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json' } });

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
    // Chống gửi thư dồn vào một hộp thư: tối thiểu 60 giây giữa hai lần xin mã của cùng một tài khoản.
    const { data: lastOtp } = await supa.from('partner_upgrade_otps').select('created_at')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (lastOtp && Date.now() - new Date(lastOtp.created_at).getTime() < 60_000) {
      return json({ ok: false, error: 'too_soon' }, 429);
    }
    await supa.from('partner_upgrade_otps').delete().eq('user_id', user.id);
    const { error: insErr } = await supa.from('partner_upgrade_otps').insert({
      user_id: user.id, new_email: newEmail, code_hash: codeHash,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
    if (insErr) {
      console.error('[auth-email] request_partner_upgrade insert lỗi:', insErr.message);
      return json({ ok: false, error: 'internal' }, 500);
    }

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

  // ───────────────────────── XÁC NHẬN ĐẶT LẠI MẬT KHẨU (từ liên kết trong email) ─────────────────────────
  if (action === 'confirm_reset') {
    const token = String(body.token ?? '').trim().toLowerCase();
    const newPassword = String(body.newPassword ?? '');
    if (!/^[0-9a-f]{64}$/.test(token)) return json({ ok: false, error: 'invalid_token' }, 400);
    if (newPassword.length < 6 || newPassword.length > 72) return json({ ok: false, error: 'weak_password' }, 400);

    const { data: row } = await supa.from('password_resets').select('id, user_id, expires_at, used_at')
      .eq('token_hash', await sha256Hex(token)).maybeSingle();
    if (!row || row.used_at || new Date(row.expires_at).getTime() < Date.now()) return json({ ok: false, error: 'invalid_token' }, 400);
    // Đánh dấu ĐÃ DÙNG trước (điều kiện used_at is null) → hai lượt song song không cùng dùng được một liên kết.
    const { data: claimed } = await supa.from('password_resets').update({ used_at: new Date().toISOString() })
      .eq('id', row.id).is('used_at', null).select('id').maybeSingle();
    if (!claimed) return json({ ok: false, error: 'invalid_token' }, 400);

    const { error: upErr } = await supa.auth.admin.updateUserById(row.user_id, { password: newPassword });
    if (upErr) {
      console.error('[auth-email] confirm_reset updateUserById lỗi:', upErr.message);
      await supa.from('password_resets').update({ used_at: null }).eq('id', row.id); // cho phép thử lại
      return json({ ok: false, error: 'update_failed' }, 500);
    }
    await supa.from('password_resets').delete().eq('user_id', row.user_id).is('used_at', null); // hủy các liên kết còn lại
    const { data: ures } = await supa.auth.admin.getUserById(row.user_id);
    const to = ures?.user?.email;
    if (to && !to.endsWith(PARTNER_EMAIL_SUFFIX)) {
      const when = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      void sendEmail(to, `Mật khẩu vừa thay đổi — ${APP_NAME}`, wrap('Mật khẩu đã được thay đổi', `
        <p>Mật khẩu của tài khoản <b>${esc(to)}</b> vừa được đặt lại thành công lúc <b>${esc(when)}</b> (giờ Việt Nam).</p>
        <p style="font-size:13px;color:#f0c97a">⚠ Nếu KHÔNG phải bạn thực hiện, hãy liên hệ hỗ trợ ngay.</p>`));
    }
    return json({ ok: true });
  }

  // Các action còn lại (welcome/reset) BẮT BUỘC có email hợp lệ trong body.
  if (!email || !email.includes('@')) return json({ error: 'invalid_email' }, 400);

  // ───────────────────────── WELCOME ─────────────────────────
  if (action === 'welcome') {
    const displayName = String(body.displayName ?? '').trim().slice(0, 60);

    // Chống lạm dụng: chỉ gửi nếu có user với email này VỪA tạo gần đây (≤ 15 phút).
    const { data: uid } = await supa.rpc('find_user_id_by_email', { p_email: email });
    if (!uid) return json({ ok: true, skipped: 'no_user' });
    const { data: ures } = await supa.auth.admin.getUserById(uid as string);
    const createdAt = ures?.user?.created_at ? new Date(ures.user.created_at).getTime() : 0;
    if (!createdAt || Date.now() - createdAt > 15 * 60 * 1000) {
      return json({ ok: true, skipped: 'not_recent' });
    }

    // KHÔNG đưa mật khẩu vào email (client cũng không gửi); nội dung do máy chủ quyết, chỉ chèn tên đã escape.
    const hello = displayName ? `Xin chào ${esc(displayName)},` : 'Xin chào,';
    const html = wrap('Đăng ký tài khoản thành công 🎉', `
      <p>${hello}</p>
      <p>Cảm ơn bạn đã đăng ký <b>${esc(APP_NAME)}</b>. Bạn có thể đăng nhập bằng email <b>${esc(email)}</b> và mật khẩu bạn vừa đặt.</p>
      <p style="font-size:13px;color:#bbb">Bạn được tặng xu để trải nghiệm các tính năng nâng cao. Chúc bạn khám phá lá số thật thú vị!</p>`);
    const sent = await sendEmail(email, `Chào mừng đến với ${APP_NAME}`, html);
    return json({ ok: sent });
  }

  // ───────────────────────── RESET ─────────────────────────
  if (action === 'reset') {
    // Phản hồi LUÔN giống nhau (kể cả email không tồn tại, bị giới hạn tần suất, gửi lỗi) → không dò được email.
    const generic = json({ ok: true });
    if (email.endsWith(PARTNER_EMAIL_SUFFIX)) return generic;          // email nội bộ (đối tác) không nhận thư được
    const { data: uid } = await supa.rpc('find_user_id_by_email', { p_email: email });
    if (!uid) return generic;

    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supa.from('password_resets').select('id', { count: 'exact', head: true })
      .eq('user_id', uid as string).gte('created_at', since);
    if ((count ?? 0) >= RESET_MAX_PER_HOUR) return generic;

    const raw = crypto.getRandomValues(new Uint8Array(32));
    const token = Array.from(raw).map((b) => b.toString(16).padStart(2, '0')).join('');
    await supa.from('password_resets').delete().eq('user_id', uid as string).is('used_at', null); // chỉ giữ liên kết MỚI NHẤT
    const { error: insErr } = await supa.from('password_resets').insert({
      user_id: uid, token_hash: await sha256Hex(token), expires_at: new Date(Date.now() + RESET_TTL_MIN * 60 * 1000).toISOString(),
    });
    if (insErr) { console.error('[auth-email] reset insert lỗi:', insErr.message); return generic; }

    const link = `${APP_URL}/reset?token=${token}`;
    const html = wrap('Đặt lại mật khẩu', `
      <p>Bạn (hoặc ai đó dùng email này) vừa yêu cầu đặt lại mật khẩu. Bấm nút dưới đây để tự đặt mật khẩu mới:</p>
      <p style="margin:18px 0"><a href="${esc(link)}" style="background:#e0b341;color:#1a0a00;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:700">Đặt lại mật khẩu</a></p>
      <p style="font-size:13px;color:#bbb">Liên kết có hiệu lực ${RESET_TTL_MIN} phút và chỉ dùng được một lần. Nếu nút không mở được, hãy dán địa chỉ sau vào trình duyệt:<br><span style="word-break:break-all">${esc(link)}</span></p>
      <p style="font-size:13px;color:#f0c97a">Nếu KHÔNG phải bạn yêu cầu, hãy bỏ qua email này — mật khẩu hiện tại của bạn KHÔNG bị thay đổi.</p>`);
    await sendEmail(email, `Đặt lại mật khẩu — ${APP_NAME}`, html);
    return generic;
  }

  return json({ error: 'unknown_action' }, 400);
});
