jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import { hideEventOccurrence, snoozeEvent, buildIsDismissed, clearDismiss } from '../eventDismiss';
import type { ResolvedEvent } from '../../core/lifeEventEngine';

function ev(key: string, occursOn: Date): ResolvedEvent {
  return {
    source: 'package', key, displayName: key, icon: '📅', element: 'Mộc', meaning: 'm',
    doText: null, avoidText: null, themeColor: null, checklistText: null, faqText: null,
    offeringText: null, prayerText: null, xuatHanhBasis: 'day', tags: [], version: 1,
    promptTemplate: null, occursOn, daysUntil: 0, priority: 40,
  };
}

describe('eventDismiss — Ẩn / Nhắc lại sau (TUZI_M04 mục 8)', () => {
  it('chưa ẩn gì thì predicate luôn trả false', async () => {
    const isDismissed = await buildIsDismissed();
    expect(isDismissed(ev('tet', new Date(2026, 0, 1)))).toBe(false);
  });

  it('hideEventOccurrence chỉ ẩn ĐÚNG ngày đó, không ảnh hưởng ngày khác', async () => {
    const day = new Date(2026, 0, 1);
    await hideEventOccurrence('tet', day);
    const isDismissed = await buildIsDismissed();
    expect(isDismissed(ev('tet', day))).toBe(true);
    expect(isDismissed(ev('tet', new Date(2027, 0, 1)))).toBe(false);
    expect(isDismissed(ev('khac', day))).toBe(false);
  });

  it('snoozeEvent ẩn theo key, không phân biệt ngày, và hết hạn sau khi qua mốc thời gian', async () => {
    await snoozeEvent('trung_thu', 20);
    const isDismissed = await buildIsDismissed();
    expect(isDismissed(ev('trung_thu', new Date(2026, 7, 1)))).toBe(true);
    expect(isDismissed(ev('trung_thu', new Date(2030, 7, 1)))).toBe(true); // snooze theo key, không theo ngày
    expect(isDismissed(ev('khac', new Date(2026, 7, 1)))).toBe(false);
  });

  it('snooze đã hết hạn (giờ âm) không còn ẩn nữa', async () => {
    await snoozeEvent('mua_dong', -1); // hết hạn ngay lập tức (âm giờ)
    const isDismissed = await buildIsDismissed();
    expect(isDismissed(ev('mua_dong', new Date()))).toBe(false);
  });

  it('clearDismiss xóa CẢ Ẩn lẫn Nhắc lại sau của đúng 1 sự kiện, không ảnh hưởng sự kiện khác', async () => {
    const day = new Date(2026, 5, 1);
    await hideEventOccurrence('a', day);
    await snoozeEvent('a');
    await hideEventOccurrence('b', day);
    await clearDismiss('a');
    const isDismissed = await buildIsDismissed();
    expect(isDismissed(ev('a', day))).toBe(false);
    expect(isDismissed(ev('b', day))).toBe(true);
  });
});
