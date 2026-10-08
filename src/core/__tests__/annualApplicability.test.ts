import { computeAnnualPrediction } from '../annualEvents/engine';
import { hiddenReasonOf, EVENT_HIDDEN_IF_FALSE, EVENT_AGE_WINDOW } from '../annualEvents/applicability';
import { ALL_EVENT_IDS } from '../annualEvents/rules';
import { birthHourBranchIndex, birthLunarMonth } from '../annualEvents/douJun';
import { sampleResult } from './fixtures';

describe('annualEvents — áp dụng theo tuổi + hoàn cảnh', () => {
  test('mọi mã trong bảng tuổi/hoàn cảnh là sự kiện có thật', () => {
    const ids = new Set(ALL_EVENT_IDS);
    for (const id of [...Object.keys(EVENT_AGE_WINDOW), ...Object.keys(EVENT_HIDDEN_IF_FALSE)]) {
      if (id === 'MOBILITY_RELOCATION') continue;
      expect(ids.has(id)).toBe(true);
    }
  });

  test('hiddenReasonOf: tuổi ngoài khoảng → age; cờ false → context; cờ thiếu → vẫn hiện', () => {
    expect(hiddenReasonOf('CHILD_PREGNANCY_SIGNAL', 12)).toBe('age');
    expect(hiddenReasonOf('CHILD_PREGNANCY_SIGNAL', 60)).toBe('age');
    expect(hiddenReasonOf('CHILD_PREGNANCY_SIGNAL', 30)).toBeNull();
    expect(hiddenReasonOf('CHILD_PREGNANCY_SIGNAL', 30, { planningParenthood: false })).toBe('context');
    expect(hiddenReasonOf('CHILD_PREGNANCY_SIGNAL', 30, { planningParenthood: null })).toBeNull();
    expect(hiddenReasonOf('CHILD_PREGNANCY_SIGNAL', 30, { planningParenthood: true })).toBeNull();
    expect(hiddenReasonOf('HEALTH_ATTENTION', 5, { employed: false })).toBeNull();
  });

  test('engine: khai false thì sự kiện biến khỏi mọi danh sách, điểm các sự kiện còn lại không đổi', () => {
    const r = sampleResult();
    const year = r.birthInfo.year + 32;
    const base = computeAnnualPrediction(r, year, { skipMonthly: true });
    const ctx = { employed: false, partnered: false, hasChildren: false };
    const cut = computeAnnualPrediction(r, year, { skipMonthly: true, context: ctx });
    const hiddenIds = new Set(cut.hiddenEvents.map(h => h.event.eventId));
    expect(hiddenIds.size).toBeGreaterThan(5);
    expect(cut.allEvents.length + cut.hiddenEvents.length).toBe(base.allEvents.length + base.hiddenEvents.length);
    for (const e of [...cut.events, ...cut.featuredGroups.flatMap(g => g.events), ...cut.allEvents]) expect(hiddenIds.has(e.eventId)).toBe(false);
    const baseBy = new Map(base.allEvents.map(e => [e.eventId, e.strength]));
    for (const e of cut.allEvents) if (baseBy.has(e.eventId)) expect(e.strength).toBe(baseBy.get(e.eventId));
  });
});

describe('annualEvents — Đẩu Quân dùng quy ước của lõi', () => {
  test('giờ 23 là Tý, giờ 1 là Sửu (cùng getHourBranchIndex); tháng sinh nhuận theo effLunarMonth', () => {
    const r = sampleResult();
    const hr = (h: number) => birthHourBranchIndex({ ...r, birthInfo: { ...r.birthInfo, hour: h } });
    expect(hr(23)).toBe(0);
    expect(hr(0)).toBe(0);
    expect(hr(1)).toBe(1);
    expect(hr(2)).toBe(1);
    const lm = (month: number, isLeapMonth: boolean, day: number) =>
      birthLunarMonth({ ...r, tuViChart: { ...r.tuViChart, lunarDate: { ...r.tuViChart.lunarDate, month, isLeapMonth, day } } });
    expect(lm(5, true, 10)).toBe(5);
    expect(lm(5, true, 20)).toBe(6);
    expect(lm(12, true, 20)).toBe(1);
    expect(lm(5, false, 20)).toBe(5);
  });
});
