/**
 * VOUCHER KHUYẾN MẠI NẠP XU — client gọi các RPC trong supabase_vouchers.sql.
 *
 * ⚠ CHÍNH SÁCH STORE: chỉ hiển thị UI nhập mã trên WEB (Platform.OS === 'web').
 * Bản iOS/Android tải từ store KHÔNG hiển thị để tránh vi phạm
 * Apple Guideline 3.1.1 / Google Payments policy (hàng hóa số phải qua IAP).
 */
import { supabase } from './supabase';
import { isOnlineMode } from './auth';

export interface VoucherPreview {
  ok: boolean;
  kind: 'discount' | 'gift';
  // kind = discount
  discount_vnd?: number;
  final_vnd?: number;
  discount_type?: 'percent' | 'fixed_vnd';
  discount_value?: number;
  // kind = gift
  gift_xu?: number;
}

export interface GiftRedeemResult {
  ok: boolean;
  xu_credited: number;
  new_balance: number;
}

/** Diễn giải mã lỗi từ server thành thông báo tiếng Việt thân thiện. */
export function voucherErrorMessage(raw: string): string {
  const m = String(raw || '');
  if (m.includes('voucher_not_found')) return 'Mã không tồn tại. Kiểm tra lại chính tả nhé.';
  if (m.includes('voucher_disabled')) return 'Mã này đã bị vô hiệu hóa.';
  if (m.includes('voucher_expired')) return 'Mã đã hết hạn sử dụng.';
  if (m.includes('voucher_exhausted')) return 'Mã đã hết lượt sử dụng.';
  if (m.includes('voucher_user_limit')) return 'Bạn đã dùng mã này rồi (vượt giới hạn mỗi người).';
  if (m.includes('voucher_min_amount')) return 'Gói nạp chưa đạt mức tối thiểu để áp mã này.';
  if (m.includes('voucher_wrong_kind')) return 'Mã này không áp dụng cho thao tác hiện tại.';
  if (m.includes('not_authenticated')) return 'Bạn cần đăng nhập để dùng mã.';
  return 'Không áp dụng được mã. Vui lòng thử lại.';
}

/** Xem trước hiệu lực của mã với 1 gói (không tiêu mã). Trả null nếu offline. */
export async function previewVoucher(code: string, amountVnd: number): Promise<VoucherPreview | null> {
  if (!isOnlineMode()) return null;
  const { data, error } = await supabase.rpc('preview_voucher', {
    p_code: code.trim(), p_amount_vnd: amountVnd,
  });
  if (error) throw new Error(error.message);
  return data as VoucherPreview;
}

/** Đổi mã GIFT — cộng xu trực tiếp. */
export async function redeemGiftVoucher(code: string): Promise<GiftRedeemResult> {
  const { data, error } = await supabase.rpc('redeem_gift_voucher', { p_code: code.trim() });
  if (error) throw new Error(error.message);
  return data as GiftRedeemResult;
}

/** Tạo đơn nạp VietQR KÈM mã giảm giá — server tự tính số tiền cuối. */
export async function createTopupWithVoucher(
  orderCode: string, amountVnd: number, xu: number, voucherCode: string,
): Promise<{ ok: boolean; final_vnd: number; discount_vnd: number }> {
  const { data, error } = await supabase.rpc('create_topup_with_voucher', {
    p_order_code: orderCode, p_amount_vnd: amountVnd, p_xu: xu, p_voucher_code: voucherCode.trim(),
  });
  if (error) throw new Error(error.message);
  return data as { ok: boolean; final_vnd: number; discount_vnd: number };
}
