/**
 * Trung tâm thông báo trong app (in-app notification center).
 *  - Lưu danh sách thông báo vào AsyncStorage (giữ qua các lần mở app).
 *  - Có cơ chế lắng nghe (subscribe) để chuông & màn danh sách tự cập nhật.
 *  - `addNotification` tự CHỐNG TRÙNG theo `id` (vd 1 ngày/1 tháng/1 sinh nhật chỉ 1 lần)
 *    và bắn 1 thông báo cục bộ (banner hệ thống) khi là tin MỚI.
 *
 * Loại tin: topup (nạp xu) · day (ngày đẹp/xấu) · month (tháng mới) ·
 *           birthday (sinh nhật lá số) · life_task (Việc/Mục tiêu sắp/đến hạn) ·
 *           life_event (Sự kiện sắp tới — mốc T-5/T-1/T-0) · system (khác — mở rộng về sau).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notifyLocal } from './notifications';

export type NotifType = 'topup' | 'day' | 'month' | 'birthday' | 'life_task' | 'life_event' | 'promo' | 'feature' | 'system';

export interface AppNotification {
  id: string;          // khóa chống trùng (vd "day:2026-6-13")
  type: NotifType;
  title: string;
  body: string;
  createdAt: number;   // epoch ms
  read: boolean;
}

const STORE_KEY = 'app_notifications_v1';
const SEEN_KEY = 'app_notifications_seen_v1';
const MAX_ITEMS = 100;
const MAX_SEEN = 1000;

let items: AppNotification[] = [];
// Các id ĐÃ TỪNG tạo (kể cả đã đọc/đã xóa) — KHÔNG tạo lại để khỏi "mọc lại" sau khi xóa.
let seenIds: string[] = [];
let seenSet = new Set<string>();
let loaded = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach(l => { try { l(); } catch {} });
async function persist() {
  try {
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(items));
    await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(seenIds));
  } catch {}
}

/** Lắng nghe thay đổi (trả về hàm hủy đăng ký). */
export function subscribeNotifications(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** Nạp từ bộ nhớ (chỉ đọc đĩa lần đầu). */
export async function loadNotifications(): Promise<AppNotification[]> {
  if (!loaded) {
    try {
      const raw = await AsyncStorage.getItem(STORE_KEY);
      if (raw) items = JSON.parse(raw) as AppNotification[];
    } catch { items = []; }
    try {
      const rawSeen = await AsyncStorage.getItem(SEEN_KEY);
      if (rawSeen) seenIds = JSON.parse(rawSeen) as string[];
    } catch { seenIds = []; }
    // Mọi tin hiện có cũng coi như "đã từng tạo".
    for (const it of items) if (!seenIds.includes(it.id)) seenIds.push(it.id);
    seenSet = new Set(seenIds);
    loaded = true;
  }
  return getNotifications();
}

/** Danh sách hiện có (mới nhất trước). */
export function getNotifications(): AppNotification[] {
  return [...items].sort((a, b) => b.createdAt - a.createdAt);
}

/** Số tin CHƯA đọc. */
export function unreadCount(): number {
  return items.reduce((n, x) => (x.read ? n : n + 1), 0);
}

/**
 * Thêm 1 thông báo. Trả về true nếu là tin MỚI (chưa từng có `id`).
 * Mặc định bắn kèm 1 thông báo cục bộ (banner) khi mới — đặt opts.push=false để tắt.
 */
export async function addNotification(
  n: { id: string; type: NotifType; title: string; body: string; createdAt?: number },
  opts?: { push?: boolean },
): Promise<boolean> {
  await loadNotifications();
  // Đã TỪNG tạo id này (kể cả đã xóa) → không tạo lại, tránh "mọc lại" sau khi người dùng xóa.
  if (seenSet.has(n.id)) return false;
  const notif: AppNotification = {
    id: n.id, type: n.type, title: n.title, body: n.body,
    createdAt: n.createdAt ?? Date.now(), read: false,
  };
  items.unshift(notif);
  if (items.length > MAX_ITEMS) items = items.slice(0, MAX_ITEMS);
  seenIds.push(n.id); seenSet.add(n.id);
  if (seenIds.length > MAX_SEEN) {
    const removed = seenIds.splice(0, seenIds.length - MAX_SEEN);
    for (const r of removed) seenSet.delete(r);
  }
  await persist();
  emit();
  if (opts?.push !== false) { try { void notifyLocal(notif.title, notif.body); } catch {} }
  return true;
}

/** Đánh dấu TẤT CẢ đã đọc (gọi khi mở màn danh sách). */
export async function markAllRead(): Promise<void> {
  await loadNotifications();
  let changed = false;
  for (const x of items) if (!x.read) { x.read = true; changed = true; }
  if (changed) { await persist(); emit(); }
}

/** Xóa 1 tin. */
export async function deleteNotification(id: string): Promise<void> {
  await loadNotifications();
  const before = items.length;
  items = items.filter(x => x.id !== id);
  if (items.length !== before) { await persist(); emit(); }
}

/** Xóa toàn bộ. */
export async function clearAllNotifications(): Promise<void> {
  await loadNotifications();
  if (items.length) { items = []; await persist(); emit(); }
}
