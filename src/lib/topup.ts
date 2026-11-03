/**
 * Đơn NẠP XU qua chuyển khoản VietQR.
 *
 * HIỆN TẠI (UI-first): tạo đơn `pending` trên bảng `topup_orders` (nếu đã có) và
 * cho phép app POLL trạng thái. Khi tích hợp SePay/Casso + Edge Function webhook,
 * webhook sẽ khớp "nội dung chuyển khoản = code", cộng xu và đổi status='paid' —
 * app đang poll sẽ tự thấy 'paid' mà KHÔNG cần sửa thêm phía client.
 */
import { supabase } from './supabase';
import { isOnlineMode } from './auth';

export type TopupStatus = 'pending' | 'paid' | 'expired';

export interface TopupRow {
  code: string;
  amount_vnd: number;
  xu: number;
  status: TopupStatus;
  created_at: string;
  paid_at: string | null;
  /** 'iap' = mua qua App Store / CH Play (không xóa được khỏi lịch sử). */
  source?: 'iap';
}

/** Lịch sử nạp xu của user (mới nhất trước). */
export async function listTopupOrders(limit = 30): Promise<TopupRow[]> {
  if (!isOnlineMode()) return [];
  try {
    const { data: ures } = await supabase.auth.getUser();
    const uid = ures.user?.id;
    if (!uid) return [];
    const [{ data }, { data: iap }] = await Promise.all([
      supabase
        .from('topup_orders')
        .select('code, amount_vnd, xu, status, created_at, paid_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(limit),
      supabase
        .from('iap_transactions')
        .select('platform, transaction_id, xu, created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(limit),
    ]);
    // Giao dịch IAP: 1 xu = 100đ (khớp quy ước nạp xu), luôn là "đã thanh toán".
    const iapRows: TopupRow[] = ((iap as any[]) ?? []).map(r => ({
      code: `${r.platform === 'ios' ? 'APPLE' : 'GOOGLE'}-${String(r.transaction_id).slice(-8)}`,
      amount_vnd: r.xu * 100, xu: r.xu, status: 'paid' as TopupStatus,
      created_at: r.created_at, paid_at: r.created_at, source: 'iap' as const,
    }));
    return [...((data as TopupRow[]) ?? []), ...iapRows]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  } catch { return []; }
}

/** Tạo đơn nạp (pending). Bỏ qua êm nếu chưa có backend/bảng. */
export async function createTopupOrder(code: string, vnd: number, xu: number): Promise<void> {
  if (!isOnlineMode()) return;
  try {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (!uid) return;
    await supabase.from('topup_orders').insert({
      user_id: uid, code, amount_vnd: vnd, xu, status: 'pending',
    });
  } catch { /* chưa có bảng → bỏ qua, vẫn hiển thị QR để chuyển khoản */ }
}

/** Kiểm tra trạng thái đơn. Trả 'pending' nếu chưa có backend. */
export async function checkTopupStatus(code: string): Promise<TopupStatus> {
  if (!isOnlineMode()) return 'pending';
  try {
    const { data } = await supabase
      .from('topup_orders')
      .select('status')
      .eq('code', code)
      .maybeSingle();
    return ((data as any)?.status as TopupStatus) || 'pending';
  } catch { return 'pending'; }
}

/** Xóa 1 đơn nạp khỏi lịch sử (chỉ đơn của chính user — RLS bảo vệ). */
export async function deleteTopupOrder(code: string): Promise<void> {
  if (!isOnlineMode()) return;
  try {
    const { data: ures } = await supabase.auth.getUser();
    const uid = ures.user?.id;
    if (!uid) return;
    await supabase.from('topup_orders').delete().eq('user_id', uid).eq('code', code);
  } catch { /* bỏ qua */ }
}

/** Đọc lại số dư xu từ hồ sơ (sau khi nạp thành công). null nếu không lấy được. */
export async function fetchServerBalance(): Promise<number | null> {
  if (!isOnlineMode()) return null;
  try {
    const { data: ures } = await supabase.auth.getUser();
    const uid = ures.user?.id;
    if (!uid) return null;
    const { data } = await supabase.from('profiles').select('xu').eq('id', uid).single();
    return typeof (data as any)?.xu === 'number' ? (data as any).xu : null;
  } catch { return null; }
}
