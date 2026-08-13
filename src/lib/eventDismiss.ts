/**
 * "Ẩn" / "Nhắc lại sau" cho box "Sự kiện sắp tới" ở Home (TUZI_M04 mục 8 — Home Card).
 * Lưu CỤC BỘ trên máy (AsyncStorage), không đồng bộ server — mỗi thiết bị tự nhớ riêng, đúng quy
 * ước try/catch-và-mặc-định đã dùng ở avatarPrefs.ts.
 *  - "Ẩn": bỏ qua ĐÚNG lần xảy ra này của sự kiện (khóa theo event.key + ngày occursOn) — sự kiện
 *    vẫn hiện lại bình thường vào lần xảy ra TIẾP THEO (năm sau / tiết khí kỳ sau).
 *  - "Nhắc lại sau": tạm ẩn ~20 tiếng (qua sáng hôm sau) rồi tự hiện lại, không cần chọn ngày.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ResolvedEvent } from '../core/lifeEventEngine';

const STORAGE_KEY = 'event_dismissals_v1';
type DismissMap = Record<string, number>; // value = epoch ms hết hạn ẩn

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function loadMap(): Promise<DismissMap> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

async function saveMap(m: DismissMap): Promise<void> {
  try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(m)); } catch { /* bỏ qua */ }
}

/** Ẩn ĐÚNG lần xảy ra này (theo ngày) — không ảnh hưởng các lần xảy ra sau. */
export async function hideEventOccurrence(eventKey: string, occursOn: Date): Promise<void> {
  const m = await loadMap();
  m[`occ:${eventKey}:${toISO(occursOn)}`] = Date.now() + 400 * 86400000; // dài hơn 1 năm — coi như ẩn hẳn cho lần này
  await saveMap(m);
}

/** Tạm ẩn `hours` giờ (mặc định 20h — qua sáng hôm sau) rồi tự hiện lại. */
export async function snoozeEvent(eventKey: string, hours = 20): Promise<void> {
  const m = await loadMap();
  m[`snooze:${eventKey}`] = Date.now() + hours * 3600000;
  await saveMap(m);
}

/**
 * Reset lại trạng thái "Ẩn"/"Nhắc lại sau" của 1 sự kiện (xóa CẢ 2 loại khóa liên quan tới
 * `eventKey`, không phân biệt ngày) — dùng ở mục "Quản lý thông báo" khi người dùng muốn sự kiện
 * này quay lại hiện/nhắc bình thường ngay lập tức.
 */
export async function clearDismiss(eventKey: string): Promise<void> {
  const m = await loadMap();
  let changed = false;
  for (const k of Object.keys(m)) {
    if (k === `snooze:${eventKey}` || k.startsWith(`occ:${eventKey}:`)) { delete m[k]; changed = true; }
  }
  if (changed) await saveMap(m);
}

/**
 * Nạp toàn bộ trạng thái ẩn hiện có, trả về 1 predicate ĐỒNG BỘ để truyền vào
 * `pickUpcomingEvent(..., isDismissed)` — engine giữ nguyên thuần túy/đồng bộ, không tự đọc
 * AsyncStorage; gọi lại hàm này sau mỗi lần "Ẩn"/"Nhắc lại sau" để có predicate mới nhất.
 */
export async function buildIsDismissed(): Promise<(ev: ResolvedEvent) => boolean> {
  const m = await loadMap();
  const now = Date.now();
  return (ev: ResolvedEvent) => {
    const occ = m[`occ:${ev.key}:${toISO(ev.occursOn)}`];
    if (occ && occ > now) return true;
    const snooze = m[`snooze:${ev.key}`];
    if (snooze && snooze > now) return true;
    return false;
  };
}
