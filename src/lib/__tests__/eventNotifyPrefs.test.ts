jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import { getNotifyPref, setNotifyEnabled, setNotifyDays, resetNotifyPref, buildNotifyPrefLookup } from '../eventNotifyPrefs';
import { DEFAULT_NOTIFY_DAYS } from '../../core/lifeEventEngine';

describe('eventNotifyPrefs — Quản lý thông báo theo từng sự kiện', () => {
  it('chưa chỉnh gì thì mặc định bật, nhắc theo DEFAULT_NOTIFY_DAYS', async () => {
    const pref = await getNotifyPref('tet');
    expect(pref.enabled).toBe(true);
    expect(pref.days).toEqual([...DEFAULT_NOTIFY_DAYS]);
  });

  it('setNotifyEnabled(false) → lookup.isEnabled trả false CHỈ cho đúng sự kiện đó', async () => {
    await setNotifyEnabled('tet_muted', false);
    const lookup = await buildNotifyPrefLookup();
    expect(lookup.isEnabled?.('tet_muted')).toBe(false);
    expect(lookup.isEnabled?.('khac')).toBe(true);
  });

  it('setNotifyDays chuẩn hóa: bỏ trùng, bỏ số âm, sắp giảm dần', async () => {
    await setNotifyDays('custom_ev', [3, 10, 3, -1, 0]);
    const pref = await getNotifyPref('custom_ev');
    expect(pref.days).toEqual([10, 3, 0]);
  });

  it('setNotifyDays với mảng rỗng/toàn số không hợp lệ → quay lại DEFAULT_NOTIFY_DAYS', async () => {
    await setNotifyDays('reset_ev', [-5, -1]);
    const pref = await getNotifyPref('reset_ev');
    expect(pref.days).toEqual([...DEFAULT_NOTIFY_DAYS]);
  });

  it('resetNotifyPref xóa hẳn tùy chỉnh, quay lại mặc định', async () => {
    await setNotifyEnabled('will_reset', false);
    await setNotifyDays('will_reset', [15]);
    await resetNotifyPref('will_reset');
    const pref = await getNotifyPref('will_reset');
    expect(pref.enabled).toBe(true);
    expect(pref.days).toEqual([...DEFAULT_NOTIFY_DAYS]);
  });

  it('buildNotifyPrefLookup.daysFor trả đúng days đã tùy chỉnh, mặc định cho sự kiện chưa chỉnh', async () => {
    await setNotifyDays('has_custom_days', [7, 2]);
    const lookup = await buildNotifyPrefLookup();
    expect(lookup.daysFor?.('has_custom_days')).toEqual([7, 2]);
    expect(lookup.daysFor?.('no_custom')).toEqual(DEFAULT_NOTIFY_DAYS);
  });
});
