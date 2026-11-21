/**
 * Dịch vụ Đăng nhập / Đăng ký qua Supabase Auth + đồng bộ ví xu & mục đã mở.
 */
import { supabase } from './supabase';
import { trackSpend } from './pendingSpends';
import { SUPABASE_READY } from './supabaseConfig';
import {
  wallet, seedWallet, seedUnlocked, setWalletListeners,
} from '../constants/premium';

/** Domain email giả cho user vào qua Partner SSO — PHẢI khớp `syntheticEmail()` trong
 *  supabase/functions/partner-sso/index.ts. Dùng làm tín hiệu "tài khoản cần nâng cấp". */
const PARTNER_EMAIL_SUFFIX = '@users.tuzi.internal';

export interface AuthUser {
  id: string; email: string | null; displayName: string;
  /** true nếu tài khoản được tạo qua Partner SSO và CHƯA gắn email thật (xem PARTNER_EMAIL_SUFFIX). */
  isPartnerAccount: boolean;
}

/** Đăng ký tài khoản mới (email + mật khẩu). */
export async function signUp(email: string, password: string, displayName: string) {
  const { data, error } = await supabase.auth.signUp({
    email, password, options: { data: { display_name: displayName } },
  });
  if (error) throw new Error(viError(error.message));
  void sendWelcomeEmail(email, displayName);
  return data;
}

/**
 * Gửi email CHÀO MỪNG sau đăng ký. Không truyền mật khẩu vào email.
 * Best-effort: lỗi gửi mail KHÔNG làm hỏng luồng đăng ký.
 */
export async function sendWelcomeEmail(email: string, displayName: string): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke('auth-email', {
      body: { action: 'welcome', email, displayName },
    });
    if (error) {
      console.warn('[auth-email] welcome LỖI:', error.message ?? error);
    } else if (data && (data as any).ok === false) {
      console.warn('[auth-email] welcome KHÔNG gửi được (kiểm tra RESEND_API_KEY / domain):', data);
    } else if (data && (data as any).skipped) {
      console.warn('[auth-email] welcome bị bỏ qua:', (data as any).skipped, '(SQL find_user_id_by_email chưa chạy? hoặc user không mới)');
    } else {
      console.log('[auth-email] welcome OK:', data);
    }
  } catch (e) {
    console.warn('[auth-email] welcome exception:', (e as any)?.message);
  }
}

/**
 * QUÊN MẬT KHẨU: yêu cầu hệ thống gửi LIÊN KẾT đặt lại mật khẩu (một lần, hết hạn 30 phút) vào email đã đăng ký.
 * Mật khẩu CHỈ đổi khi chủ email bấm liên kết và tự đặt mật khẩu mới (xem confirmPasswordReset).
 * Luôn trả về "thành công" (kể cả email không tồn tại / bị giới hạn tần suất) để chống dò email.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const clean = email.trim().toLowerCase();
  if (!clean || !clean.includes('@')) throw new Error('Email chưa hợp lệ.');
  const { data, error } = await supabase.functions.invoke('auth-email', {
    body: { action: 'reset', email: clean },
  });
  if (error) {
    console.warn('[auth-email] reset LỖI:', error.message ?? error);
    throw new Error('Không gửi được email. Vui lòng thử lại sau.');
  }
  console.log('[auth-email] reset:', data);
}

/** Đăng nhập. */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(viError(error.message));
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
  // Xóa cache danh sách lá số để tài khoản khác không thấy dữ liệu cũ.
  try { const { invalidateChartsCache } = await import('./charts'); invalidateChartsCache(); } catch {}
}

/**
 * TỰ XÓA TÀI KHOẢN (App Store 5.1.1(v)): gọi RPC delete_my_account (xem
 * supabase_delete_my_account.sql) xóa toàn bộ dữ liệu + tài khoản auth, rồi dọn cache cục bộ.
 * Sau khi gọi xong, phiên hiện tại không còn hợp lệ → nơi gọi nên đăng xuất.
 */
export async function deleteMyAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw new Error(error.message || 'Không xóa được tài khoản.');
  try { const { invalidateChartsCache } = await import('./charts'); invalidateChartsCache(); } catch {}
}

/** Đổi TÊN HIỂN THỊ: cập nhật user metadata + bảng profiles. */
export async function updateDisplayName(name: string): Promise<void> {
  const clean = name.trim();
  if (!clean) throw new Error('Tên hiển thị không được để trống.');
  const { error } = await supabase.auth.updateUser({ data: { display_name: clean } });
  if (error) throw new Error(viError(error.message));
  const { data: ures } = await supabase.auth.getUser();
  const uid = ures.user?.id;
  if (uid) { await supabase.from('profiles').update({ display_name: clean }).eq('id', uid); }
}

/**
 * Đổi MẬT KHẨU: yêu cầu nhập mật khẩu CŨ để xác thực lại; mật khẩu mới phải
 * khác mật khẩu cũ và dài ≥ 6 ký tự.
 */
export async function updatePassword(oldPassword: string, newPassword: string): Promise<void> {
  if (newPassword.length < 6) throw new Error('Mật khẩu mới tối thiểu 6 ký tự.');
  if (newPassword === oldPassword) throw new Error('Mật khẩu mới phải khác mật khẩu cũ.');

  // Xác thực lại mật khẩu cũ bằng cách đăng nhập lại với email hiện tại.
  const { data: ures } = await supabase.auth.getUser();
  const email = ures.user?.email;
  if (!email) throw new Error('Không xác định được tài khoản hiện tại.');
  const { error: signErr } = await supabase.auth.signInWithPassword({ email, password: oldPassword });
  if (signErr) throw new Error('Mật khẩu cũ không đúng.');

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(viError(error.message));

  // Gửi email THÔNG BÁO BẢO MẬT (best-effort — không chặn việc đổi mật khẩu).
  const displayName = (ures.user?.user_metadata?.display_name as string) || '';
  void sendPasswordChangedEmail(displayName);
}

/**
 * Gửi email thông báo "mật khẩu vừa được thay đổi" (KHÔNG chứa mật khẩu).
 * Email lấy từ token phía server — best-effort.
 */
export async function sendPasswordChangedEmail(displayName: string): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke('auth-email', {
      body: { action: 'password-changed', displayName },
    });
    if (error) console.warn('[auth-email] password-changed LỖI:', error.message ?? error);
    else console.log('[auth-email] password-changed:', data);
  } catch (e) {
    console.warn('[auth-email] password-changed exception:', (e as any)?.message);
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data } = await supabase.auth.getUser();
  const u = data.user;
  if (!u) return null;
  return {
    id: u.id,
    email: u.email ?? null,
    displayName: (u.user_metadata?.display_name as string) || (u.email?.split('@')[0] ?? 'Bạn'),
    isPartnerAccount: !!u.email?.endsWith(PARTNER_EMAIL_SUFFIX),
  };
}

/**
 * ĐẶT LẠI MẬT KHẨU — bước xác nhận (trang /reset): đổi mật khẩu bằng token trong liên kết email.
 * Token hết hạn sau 30 phút, chỉ dùng được một lần.
 */
export async function confirmPasswordReset(token: string, newPassword: string): Promise<void> {
  if (newPassword.length < 6) throw new Error('Mật khẩu mới tối thiểu 6 ký tự.');
  const { data, error } = await supabase.functions.invoke('auth-email', {
    body: { action: 'confirm_reset', token, newPassword },
  });
  let code = (data as any)?.error as string | undefined;
  if (error && !code) {
    try { const b = typeof (error as any)?.context?.json === 'function' ? await (error as any).context.json() : null; code = b?.error; } catch { /* bỏ qua */ }
  }
  if (!error && (data as any)?.ok === true) return;
  if (code === 'invalid_token') throw new Error('Liên kết không hợp lệ hoặc đã hết hạn. Hãy yêu cầu liên kết mới ở màn Đăng nhập.');
  if (code === 'weak_password') throw new Error('Mật khẩu mới không hợp lệ (6–72 ký tự).');
  throw new Error('Không đặt lại được mật khẩu. Vui lòng thử lại.');
}

/**
 * NÂNG CẤP TÀI KHOẢN (Partner SSO) — bước 1: gửi mã OTP tới email thật muốn gắn vào tài
 * khoản. Chỉ dùng được cho tài khoản vào qua đối tác (`isPartnerAccount`); server tự kiểm
 * tra lại điều kiện này (xem action "request_partner_upgrade" trong auth-email).
 */
export async function requestPartnerUpgrade(newEmail: string): Promise<void> {
  const clean = newEmail.trim().toLowerCase();
  if (!clean || !clean.includes('@')) throw new Error('Email chưa hợp lệ.');
  const { data, error } = await supabase.functions.invoke('auth-email', {
    body: { action: 'request_partner_upgrade', newEmail: clean },
  });
  if (error) throw new Error('Không gửi được mã xác nhận. Vui lòng thử lại.');
  if (data && (data as any).ok === false) {
    const code = (data as any).error;
    if (code === 'email_in_use') throw new Error('Email này đã được dùng cho tài khoản khác.');
    if (code === 'not_partner_account') throw new Error('Tài khoản này không thuộc diện nâng cấp.');
    throw new Error('Không gửi được mã xác nhận. Vui lòng thử lại.');
  }
}

/**
 * NÂNG CẤP TÀI KHOẢN — bước 2: xác nhận mã OTP + đặt mật khẩu, gắn email thật vào tài
 * khoản hiện tại (giữ nguyên toàn bộ dữ liệu vì cùng user_id). Trả về email vừa gắn.
 */
export async function confirmPartnerUpgrade(code: string, newPassword: string): Promise<string> {
  if (newPassword.length < 6) throw new Error('Mật khẩu mới tối thiểu 6 ký tự.');
  const { data, error } = await supabase.functions.invoke('auth-email', {
    body: { action: 'confirm_partner_upgrade', code: code.trim(), newPassword },
  });
  if (error) throw new Error('Không xác nhận được. Vui lòng thử lại.');
  if (!data || (data as any).ok === false) {
    const errCode = data && (data as any).error;
    if (errCode === 'invalid_code') throw new Error('Mã xác nhận không đúng.');
    if (errCode === 'expired') throw new Error('Mã xác nhận đã hết hạn. Vui lòng gửi lại mã.');
    if (errCode === 'too_many_attempts') throw new Error('Nhập sai quá nhiều lần. Vui lòng gửi lại mã.');
    if (errCode === 'no_pending_request') throw new Error('Chưa có yêu cầu nào đang chờ. Vui lòng gửi lại mã.');
    throw new Error('Không xác nhận được. Vui lòng thử lại.');
  }
  return (data as any).email as string;
}

/** Đồng bộ số dư hiển thị theo kết quả máy chủ sau khi mở khóa (máy chủ là nguồn đúng; client đã trừ tạm `localCost`). */
function reconcileBalance(data: any, error: { message?: string } | null, localCost: number): void {
  if (error) { console.warn('[unlock] máy chủ từ chối/không phản hồi:', error.message); return; }
  if (data && typeof data.balance === 'number') seedWallet({ balance: data.balance });
  else if (localCost) console.warn('[unlock] phản hồi không có số dư');
}

/**
 * Sau khi đăng nhập: tải hồ sơ (số dư xu) + danh sách mục đã mở khóa từ server
 * vào ví cục bộ, đồng thời đăng ký listener để ĐẨY mọi thay đổi (trừ/nạp/mở khóa)
 * lên Supabase. Giúp các màn hình vẫn dùng ví đồng bộ như cũ.
 */
export async function loadProfileIntoWallet(user: AuthUser): Promise<void> {
  // ── DỮ LIỆU CHÍNH (chặn vào app): hồ sơ + số dư + mục đã mở khóa ──
  // Tải SONG SONG để vào app nhanh nhất.
  const [profileRes, unlocksRes] = await Promise.all([
    supabase.from('profiles').select('xu, is_admin, display_name').eq('id', user.id).single(),
    supabase.from('unlocks').select('unlock_key').eq('user_id', user.id),
  ]);
  const profile = profileRes.data;
  seedWallet({
    balance: profile?.xu ?? 0,
    userName: profile?.display_name || user.displayName,
    isAdmin: !!profile?.is_admin,
  });
  if (unlocksRes.data?.length) seedUnlocked(unlocksRes.data.map((r: any) => r.unlock_key));

  // ── DỮ LIỆU PHỤ (tải nền, KHÔNG chặn vào app) ──
  // Kết quả AI đã lưu tải nền; các màn AI chỉ thực sự cần khi người dùng bấm xem nên không
  // cần chặn. (Đã BỎ tải "API key dùng chung" về client — SỬA LỖI BẢO MẬT, xem
  // supabase/functions/ai-proxy: key giờ chỉ được đọc phía server, không bao giờ về client.)
  void Promise.allSettled([
    import('./aiResults').then(m => m.loadAllAiResults()),
  ]);

  // 3) Đăng ký đẩy thay đổi lên server (fire-and-forget)
  setWalletListeners({
    onSpend: ({ key, kind, cost, again }) => {
      // GIÁ DO MÁY CHỦ QUYẾT (RPC unlock_feature): client chỉ gửi khóa + loại, không gửi số xu. Số dư hiển thị được đồng bộ lại theo máy chủ.
      // "Phân tích lại" = mục đã mở mà vẫn bị trừ → force. trackSpend: ai-proxy cấp tín dụng theo xu đã trừ → các lượt gọi AI chờ lệnh này xong.
      trackSpend(
        Promise.resolve(supabase.rpc('unlock_feature', { p_key: key, p_kind: kind, p_force: !!again }))
          .then(({ data, error }) => { reconcileBalance(data, error, cost); }),
      );
    },
    onDeposit: (amount) => {
      supabase.rpc('deposit_xu', { p_amount: amount }).then(() => {});
    },
    // Mua combo: trừ xu MỘT lần + ghi NHIỀU dòng mở khóa.
    onBundle: ({ keys, ref, cost }) => {
      trackSpend(
        Promise.resolve(supabase.rpc('unlock_bundle', { p_ref: ref, p_keys: keys }))
          .then(({ data, error }) => { reconcileBalance(data, error, cost); }),
      );
    },
  });
}

/** Có cấu hình Supabase hợp lệ chưa. */
export function isOnlineMode(): boolean { return SUPABASE_READY; }

function viError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return 'Email hoặc mật khẩu không đúng.';
  if (m.includes('already registered') || m.includes('already exists')) return 'Email này đã được đăng ký.';
  if (m.includes('password')) return 'Mật khẩu chưa hợp lệ (tối thiểu 6 ký tự).';
  if (m.includes('email')) return 'Email chưa hợp lệ.';
  if (m.includes('network') || m.includes('fetch')) return 'Lỗi kết nối mạng. Vui lòng thử lại.';
  return msg;
}
