import { buildGenericMonthHeatmap, buildGenericMonthHeatmapForMonth } from '../genericMonthHeatmap';

describe('genericMonthHeatmap (heatmap tháng dương khi chưa gắn lá số)', () => {
  it('trả đủ số ngày của tháng, không throw, mọi ngày có score/tone hợp lệ', () => {
    const dates = [new Date(2026, 0, 15), new Date(2026, 1, 10), new Date(2026, 11, 1)];
    for (const base of dates) {
      const data = buildGenericMonthHeatmap(base);
      const daysInMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
      expect(data.days).toHaveLength(daysInMonth);
      for (const d of data.days) {
        expect(d.score).toBeGreaterThanOrEqual(0);
        expect(d.score).toBeLessThanOrEqual(100);
        expect(d.isXungTuoi).toBe(false);
        expect(d.hasWarning).toBe(false);
      }
    }
  });

  it('lunarDay dùng làm số hiển thị = đúng ngày dương liên tục 1..N, không trùng lặp', () => {
    const data = buildGenericMonthHeatmap(new Date(2026, 3, 5));
    const nums = data.days.map(d => d.lunarDay);
    expect(nums).toEqual(Array.from({ length: nums.length }, (_, i) => i + 1));
  });

  it('stats.avgScore/bestDay/cautionDays tính hợp lệ, không throw', () => {
    const data = buildGenericMonthHeatmap(new Date());
    expect(data.stats.avgScore).toBeGreaterThanOrEqual(0);
    expect(data.stats.avgScore).toBeLessThanOrEqual(100);
    expect(data.stats.bestDay).toBeGreaterThanOrEqual(1);
    expect(data.stats.cautionDays).toBeGreaterThanOrEqual(0);
  });
});

describe('buildGenericMonthHeatmapForMonth (MonthHeatmap đầy đủ cho lịch chọn ngày khi chưa gắn lá số)', () => {
  it('cùng shape với buildMonthHeatmap: có weeks + stats + confidence, không throw cho tháng bất kỳ', () => {
    const cases: [number, number][] = [[2026, 1], [2026, 2], [2026, 12]];
    for (const [year, month] of cases) {
      const data = buildGenericMonthHeatmapForMonth(year, month);
      const daysInMonth = new Date(year, month, 0).getDate();
      expect(data.year).toBe(year);
      expect(data.month).toBe(month);
      expect(data.days).toHaveLength(daysInMonth);
      expect(data.weeks.length).toBeGreaterThan(0);
      expect(data.confidence).toBeGreaterThanOrEqual(0);
      expect(data.confidenceNote).toContain('Chưa gắn lá số');
      for (const d of data.days) {
        expect(d.day).toBeGreaterThanOrEqual(1);
        expect(d.tone).toBeTruthy();
      }
    }
  });
});
