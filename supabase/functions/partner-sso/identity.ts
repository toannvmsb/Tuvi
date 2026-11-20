/**
 * Định danh & tên hiển thị của user vào qua đối tác — hàm thuần (không import gì) để Edge Function (Deno) dùng
 * và Jest kiểm thử được (src/core/__tests__/partnerSsoIdentity.test.ts).
 */

/** Tên hiển thị khi đối tác không gửi `name` — KHÔNG để lộ ID người dùng của đối tác ra giao diện. */
export const DEFAULT_PARTNER_DISPLAY_NAME = 'Khách';
export const MAX_DISPLAY_NAME_LEN = 60;

/** Làm sạch tên đối tác gửi (ký tự điều khiển, khoảng trắng thừa, quá dài). Trả undefined nếu rỗng/không phải chữ. */
export function sanitizeDisplayName(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const s = v.replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_DISPLAY_NAME_LEN).trim();
  return s || undefined;
}

/**
 * Có nên cập nhật tên hiển thị trong hồ sơ theo `newName` đối tác vừa gửi?
 * CÓ khi người dùng CHƯA tự đổi tên: hồ sơ trống, hoặc đang là tên mặc định/tên tự sinh, hoặc đúng bằng tên đối tác gửi lần trước.
 * KHÔNG khi họ đã tự đặt tên khác (không ghi đè tên người dùng chọn), hoặc tên không đổi.
 */
export function shouldUpdateDisplayName(
  profileName: string | null | undefined,
  lastPartnerName: string | null | undefined,
  newName: string,
): boolean {
  const cur = (profileName ?? '').trim();
  if (cur === newName) return false;
  if (!cur) return true;
  if (cur === DEFAULT_PARTNER_DISPLAY_NAME) return true;
  if (cur.startsWith('partner_')) return true;                  // tên tự sinh từ email giả của bản cũ
  if (lastPartnerName && cur === lastPartnerName.trim()) return true;
  return false;
}

/**
 * Email dùng để phát hành phiên đăng nhập cho user ĐÃ có liên kết: PHẢI là email HIỆN TẠI của tài khoản.
 * Sau khi user "Nâng cấp tài khoản" (gắn email thật) email giả cũ không còn tồn tại; dùng lại email giả sẽ không khớp tài khoản cũ.
 */
export function pickLoginEmail(currentEmail: string | null | undefined, synthetic: string): string {
  const e = (currentEmail ?? '').trim();
  return e || synthetic;
}
