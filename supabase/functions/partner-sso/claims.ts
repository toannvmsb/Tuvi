/**
 * Kiểm tra THỜI GIAN của token đối tác — hàm thuần (không import gì) để Edge Function (Deno) dùng
 * và Jest kiểm thử được (src/core/__tests__/partnerSsoClaims.test.ts).
 * Chữ ký, thuật toán và `exp` đã được `jwtVerify` (jose) kiểm; ở đây thêm các luật của Tuzi.
 */

/** Tuổi tối đa (giây) của token kể từ `iat` — chống phát lại một URL cũ đã lộ. */
export const MAX_TOKEN_AGE_SEC = 120;
/** Cho phép đồng hồ máy chủ đối tác nhanh hơn Tuzi tối đa ngần này giây. */
export const MAX_CLOCK_SKEW_SEC = 60;
/** Thời gian sống tối đa đối tác được đặt (`exp − iat`). */
export const MAX_LIFETIME_SEC = 300;

export type TokenTimingError =
  | 'missing_iat' | 'missing_exp' | 'iat_in_future' | 'token_too_old' | 'lifetime_too_long' | 'exp_before_iat';

/** Trả về mã lỗi, hoặc null nếu hợp lệ. `nowSec` = giây hiện tại. */
export function checkTokenTiming(payload: { iat?: unknown; exp?: unknown }, nowSec: number): TokenTimingError | null {
  const { iat, exp } = payload;
  if (typeof iat !== 'number' || !Number.isFinite(iat)) return 'missing_iat';
  // BẮT BUỘC có exp: token không hạn dùng là rủi ro nếu đối tác ký sai.
  if (typeof exp !== 'number' || !Number.isFinite(exp)) return 'missing_exp';
  // iat ở tương lai xa sẽ khiến "tuổi token" âm → hợp lệ mãi. Chỉ chấp nhận lệch đồng hồ nhỏ.
  if (iat - nowSec > MAX_CLOCK_SKEW_SEC) return 'iat_in_future';
  if (nowSec - iat > MAX_TOKEN_AGE_SEC) return 'token_too_old';
  if (exp <= iat) return 'exp_before_iat';
  if (exp - iat > MAX_LIFETIME_SEC) return 'lifetime_too_long';
  return null;
}
