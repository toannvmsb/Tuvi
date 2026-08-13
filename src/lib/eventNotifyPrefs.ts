/**
 * "Quản lý thông báo" theo TỪNG SỰ KIỆN — màn Chi tiết sự kiện cho phép:
 *  - Bật/tắt hẳn thông báo (Ẩn khỏi bell + không lên lịch nhắc) cho sự kiện đó.
 *  - Tùy chỉnh danh sách "nhắc trước bao nhiêu ngày" (mặc định 5/1/0 ngày — DEFAULT_NOTIFY_DAYS).
 * Lưu CỤC BỘ trên máy (AsyncStorage), không đồng bộ server — đúng quy ước try/catch-và-mặc-định
 * đã dùng ở avatarPrefs.ts/eventDismiss.ts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_NOTIFY_DAYS, type NotifyPrefLookup } from '../core/lifeEventEngine';

const STORAGE_KEY = 'event_notify_prefs_v1';

export interface NotifyPref {
  enabled: boolean;
  days: number[];
}

type PrefMap = Record<string, NotifyPref>;

async function loadMap(): Promise<PrefMap> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

async function saveMap(m: PrefMap): Promise<void> {
  try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(m)); } catch { /* bỏ qua */ }
}

function defaultPref(): NotifyPref {
  return { enabled: true, days: [...DEFAULT_NOTIFY_DAYS] };
}

/** Đọc tùy chỉnh hiện có của 1 sự kiện (mặc định: bật, nhắc 5/1/0 ngày nếu chưa từng chỉnh). */
export async function getNotifyPref(eventKey: string): Promise<NotifyPref> {
  const m = await loadMap();
  return m[eventKey] ?? defaultPref();
}

export async function setNotifyEnabled(eventKey: string, enabled: boolean): Promise<void> {
  const m = await loadMap();
  m[eventKey] = { ...(m[eventKey] ?? defaultPref()), enabled };
  await saveMap(m);
}

/** Chuẩn hóa danh sách ngày: bỏ trùng, bỏ số âm/không hợp lệ, sắp giảm dần; rỗng → về lại mặc định. */
export async function setNotifyDays(eventKey: string, days: number[]): Promise<void> {
  const m = await loadMap();
  const cleaned = Array.from(new Set(days.filter(d => Number.isFinite(d) && d >= 0))).sort((a, b) => b - a);
  m[eventKey] = { ...(m[eventKey] ?? defaultPref()), days: cleaned.length ? cleaned : [...DEFAULT_NOTIFY_DAYS] };
  await saveMap(m);
}

/** Xóa hẳn tùy chỉnh của 1 sự kiện — quay lại mặc định (bật, 5/1/0 ngày). */
export async function resetNotifyPref(eventKey: string): Promise<void> {
  const m = await loadMap();
  delete m[eventKey];
  await saveMap(m);
}

/**
 * Nạp toàn bộ tùy chỉnh hiện có, trả về 1 `NotifyPrefLookup` ĐỒNG BỘ để truyền thẳng vào
 * `syncEventNotifications`/`planScheduledReminders` (xem lib/notificationEvents.ts) — engine giữ
 * nguyên thuần túy, không tự đọc AsyncStorage.
 */
export async function buildNotifyPrefLookup(): Promise<NotifyPrefLookup> {
  const m = await loadMap();
  return {
    isEnabled: key => m[key]?.enabled ?? true,
    daysFor: key => m[key]?.days ?? DEFAULT_NOTIFY_DAYS,
  };
}
