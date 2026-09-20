/**
 * Dịch vụ Đăng nhập / Đăng ký qua Supabase Auth + đồng bộ ví xu & mục đã mở.
 */
import { supabase } from './supabase';
import { SUPABASE_READY } from './supabaseConfig';
import {
  wallet, seedWallet, seedUnlocked, setWalletListeners,
} from '../constants/premium';

export interface AuthUser { id: string; email: string | null; displayName: string; }

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
 * QUÊN MẬT KHẨU: yêu cầu hệ thống sinh mật khẩu MỚI và gửi vào email đã đăng ký.
 * Luôn trả về "thành công" (kể cả email không tồn tại) để chống dò email.
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
  return { id: u.id, email: u.email ?? null, displayName: (u.user_metadata?.display_name as string) || (u.email?.split('@')[0] ?? 'Bạn') };
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
    onSpend: ({ key, kind, cost }) => {
      // Trừ xu atomic + ghi unlock; lỗi mạng không chặn UI (đã trừ cục bộ).
      supabase.rpc('spend_xu', { p_amount: cost, p_reason: kind, p_ref: key }).then(() => {});
      supabase.from('unlocks').insert({ user_id: user.id, unlock_key: key, kind }).then(() => {});
    },
    onDeposit: (amount) => {
      supabase.rpc('deposit_xu', { p_amount: amount }).then(() => {});
    },
    // Mua combo: trừ xu MỘT lần + ghi NHIỀU dòng mở khóa.
    onBundle: ({ keys, ref, cost }) => {
      supabase.rpc('spend_xu', { p_amount: cost, p_reason: 'combo', p_ref: ref }).then(() => {});
      const rows = keys.map(k => ({ user_id: user.id, unlock_key: k, kind: 'ai' }));
      supabase.from('unlocks').insert(rows).then(() => {});
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
