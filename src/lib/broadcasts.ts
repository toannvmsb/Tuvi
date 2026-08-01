/**
 * Thông báo từ ADMIN (broadcast):
 *  - promo  (khuyến mại/giảm giá): hiện THÔNG BÁO trên MỌI nền tảng, đồng thời
 *    xuất hiện ở mục "Khuyến mại" trong menu. (Riêng việc NHẬP MÃ VOUCHER vẫn chỉ
 *    trên web — xử lý ở màn Nạp xu, theo Apple 3.1.1 / Google Payments.)
 *  - feature / news: tin chức năng / tin chung — mọi nền tảng.
 * Mỗi broadcast chỉ tạo 1 lần (id "bc:<id>"); người dùng xóa rồi sẽ không mọc lại.
 */
import { supabase } from './supabase';
import { isOnlineMode } from './auth';
import { addNotification, type NotifType } from './notificationCenter';

export interface Broadcast {
  id: number;
  kind: 'promo' | 'feature' | 'news';
  title: string;
  body: string;
  promo_detail: string | null;
  created_at: string;
}

/** Lấy danh sách broadcast đang hiệu lực + lỗi (nếu có) để chẩn đoán. */
export async function fetchActiveBroadcastsResult(): Promise<{ rows: Broadcast[]; error?: string }> {
  if (!isOnlineMode()) return { rows: [], error: 'Đang ở chế độ ngoại tuyến — cần đăng nhập máy chủ để nhận thông báo.' };
  try {
    const { data, error } = await supabase.rpc('list_active_broadcasts');
    if (error) return { rows: [], error: error.message };
    return { rows: (data as Broadcast[]) ?? [] };
  } catch (e: any) { return { rows: [], error: e?.message || 'Lỗi không xác định' }; }
}

/** Lấy danh sách broadcast đang hiệu lực từ server. */
export async function fetchActiveBroadcasts(): Promise<Broadcast[]> {
  return (await fetchActiveBroadcastsResult()).rows;
}

/** Đẩy các broadcast vào trung tâm thông báo (mọi nền tảng). */
export async function syncBroadcasts(): Promise<void> {
  const rows = await fetchActiveBroadcasts();
  for (const b of rows) {
    const type: NotifType = b.kind === 'promo' ? 'promo' : 'feature';
    await addNotification({
      id: `bc:${b.id}`,
      type,
      title: b.title,
      body: b.body,
      createdAt: Date.parse(b.created_at) || Date.now(),
    });
  }
}

/** Chỉ lấy các tin KHUYẾN MẠI (cho mục "Khuyến mại"). */
export async function fetchPromos(): Promise<Broadcast[]> {
  return (await fetchActiveBroadcasts()).filter(b => b.kind === 'promo');
}
