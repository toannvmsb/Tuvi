jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(), setItem: jest.fn(),
}));
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  EMPTY_INVITE_STATE, SNOOZE_DAYS, afterDismiss, loadInviteState, saveInviteState, shouldShowInvite,
} from '../../lib/upgradeInvite';

const DAY = 24 * 60 * 60 * 1000;
const T0 = 1_800_000_000_000;

describe('Lời mời nâng cấp — khi nào hiện', () => {
  test('chưa bỏ qua lần nào → luôn hiện', () => {
    expect(shouldShowInvite(EMPTY_INVITE_STATE, T0)).toBe(true);
  });
  test('bỏ qua lần 1 → ẩn 1 ngày rồi hiện lại', () => {
    const s = afterDismiss(EMPTY_INVITE_STATE, T0);
    expect(s.dismissCount).toBe(1);
    expect(shouldShowInvite(s, T0 + DAY - 1)).toBe(false);
    expect(shouldShowInvite(s, T0 + DAY)).toBe(true);
  });
  test('mỗi lần bỏ qua giãn dần: 1 → 3 → 7 → 14 → 30 ngày và dừng ở 30', () => {
    let s = EMPTY_INVITE_STATE;
    let t = T0;
    for (const days of SNOOZE_DAYS) {
      s = afterDismiss(s, t);
      expect(shouldShowInvite(s, t + days * DAY - 1)).toBe(false);
      expect(shouldShowInvite(s, t + days * DAY)).toBe(true);
      t += days * DAY;
    }
    s = afterDismiss(s, t); // lần thứ 6 vẫn 30 ngày
    expect(shouldShowInvite(s, t + 29 * DAY)).toBe(false);
    expect(shouldShowInvite(s, t + 30 * DAY)).toBe(true);
  });
  test('đồng hồ máy chỉnh lùi → vẫn đang trong thời gian ẩn', () => {
    const s = afterDismiss(EMPTY_INVITE_STATE, T0);
    expect(shouldShowInvite(s, T0 - 5 * DAY)).toBe(false);
  });
});

describe('Lời mời nâng cấp — lưu trạng thái', () => {
  beforeEach(() => { (AsyncStorage.getItem as jest.Mock).mockReset(); (AsyncStorage.setItem as jest.Mock).mockReset(); });
  test('chưa có dữ liệu / dữ liệu hỏng → trạng thái rỗng (hiện lời mời)', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    expect(await loadInviteState()).toEqual(EMPTY_INVITE_STATE);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('{không phải json');
    expect(await loadInviteState()).toEqual(EMPTY_INVITE_STATE);
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('x'));
    expect(await loadInviteState()).toEqual(EMPTY_INVITE_STATE);
  });
  test('đọc lại đúng và không văng khi ghi lỗi', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify({ dismissCount: 2, lastDismissedAt: T0 }));
    expect(await loadInviteState()).toEqual({ dismissCount: 2, lastDismissedAt: T0 });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify({ dismissCount: -3, lastDismissedAt: 'x' }));
    expect(await loadInviteState()).toEqual({ dismissCount: 0, lastDismissedAt: null });
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('đầy bộ nhớ'));
    await expect(saveInviteState({ dismissCount: 1, lastDismissedAt: T0 })).resolves.toBeUndefined();
  });
});
