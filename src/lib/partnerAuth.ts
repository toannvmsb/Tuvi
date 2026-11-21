/**
 * PARTNER SSO (client) — gọi Edge Function `partner-sso` để đổi 1 token đối tác lấy 1 session
 * Supabase hợp lệ, rồi tự set session (không qua màn Đăng nhập thường). Chỉ dùng ở "chế độ nhúng"
 * (App.tsx đọc URL `/embed?partner=...&token=...` trên web) — xem CLAUDE.md mục "Partner SSO".
 */
import { supabase } from './supabase';

export type PartnerSignInResult = { ok: true; userId?: string } | { ok: false; message: string };

export async function signInViaPartner(partnerCode: string, token: string): Promise<PartnerSignInResult> {
  try {
    const { data, error } = await supabase.functions.invoke('partner-sso', {
      body: { partnerCode, token },
    });
    if (error || !data?.access_token || !data?.refresh_token) {
      return { ok: false, message: 'Không xác thực được từ đối tác. Vui lòng thử lại từ ứng dụng đối tác.' };
    }
    const { data: sess, error: setErr } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    if (setErr) return { ok: false, message: setErr.message };
    return { ok: true, userId: sess?.user?.id };
  } catch {
    return { ok: false, message: 'Không kết nối được tới máy chủ. Vui lòng thử lại.' };
  }
}
