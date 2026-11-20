/**
 * LỜI MỜI NÂNG CẤP TÀI KHOẢN (user vào qua đối tác, chưa có email thật/mật khẩu).
 * Hiện ở Trang chủ; "Để sau" ẩn một thời gian rồi nhắc lại, mỗi lần bỏ qua thì giãn dần để không làm phiền.
 * Phần quyết định là hàm thuần (có test); phần lưu trạng thái dùng bộ nhớ cục bộ của máy (best-effort).
 * KHÔNG lưu gì lên server. Tự biến mất khi user đã nâng cấp (isPartnerAccount = false).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface InviteState {
  /** Số lần người dùng đã bấm "Để sau". */
  dismissCount: number;
  /** Thời điểm (ms) bấm "Để sau" gần nhất. */
  lastDismissedAt: number | null;
}

export const EMPTY_INVITE_STATE: InviteState = { dismissCount: 0, lastDismissedAt: null };

const DAY_MS = 24 * 60 * 60 * 1000;
/** Số ngày ẩn sau lần bỏ qua thứ 1, 2, 3… (lần thứ n dùng phần tử n-1; vượt quá dùng phần tử cuối). TẠM. */
export const SNOOZE_DAYS = [1, 3, 7, 14, 30] as const;

/** Có nên hiện lời mời lúc `nowMs`? Chưa bỏ qua lần nào → luôn hiện. */
export function shouldShowInvite(state: InviteState, nowMs: number): boolean {
  if (state.dismissCount <= 0 || state.lastDismissedAt === null) return true;
  const days = SNOOZE_DAYS[Math.min(state.dismissCount, SNOOZE_DAYS.length) - 1];
  // Đồng hồ máy bị chỉnh lùi (nowMs < lần bỏ qua): coi như vẫn đang trong thời gian ẩn.
  return nowMs - state.lastDismissedAt >= days * DAY_MS;
}

export function afterDismiss(state: InviteState, nowMs: number): InviteState {
  return { dismissCount: state.dismissCount + 1, lastDismissedAt: nowMs };
}

const KEY = 'tuzi.upgradeInvite.v1';

export async function loadInviteState(): Promise<InviteState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return EMPTY_INVITE_STATE;
    const j = JSON.parse(raw);
    const count = Number.isFinite(j?.dismissCount) ? Math.max(0, Math.floor(j.dismissCount)) : 0;
    const at = Number.isFinite(j?.lastDismissedAt) ? Number(j.lastDismissedAt) : null;
    return { dismissCount: count, lastDismissedAt: at };
  } catch { return EMPTY_INVITE_STATE; }
}

export async function saveInviteState(state: InviteState): Promise<void> {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(state)); } catch { /* bỏ qua */ }
}
