import { toneOf, buildMonthHeatmap, buildDailyActionCards } from '../dailyPeriodService';
import { sampleResult } from './fixtures';

describe('toneOf thresholds (Phase 10/11)', () => {
  it.each([
    [80, 'tốt'], [70, 'tốt'], [60, 'khá'], [55, 'khá'],
    [45, 'trung bình'], [40, 'trung bình'], [30, 'thận trọng'], [25, 'thận trọng'], [10, 'xấu'],
  ] as const)('%i → %s', (score, tone) => {
    expect(toneOf(score)).toBe(tone);
  });
});

describe('Month heatmap + weekly series', () => {
  const result = sampleResult();

  it('tháng 31 ngày → 31 day cells, 5 tuần', () => {
    const hm = buildMonthHeatmap(result, 2026, 7); // tháng 7 có 31 ngày
    expect(hm.days).toHaveLength(31);
    expect(hm.weeks).toHaveLength(5);
    expect(hm.weeks[4].fromDay).toBe(29);
    expect(hm.weeks[4].toDay).toBe(31);
    expect(hm.formulaVersion).toBe('2.0');
  });

  it('tháng 2/2026 (28 ngày) → 4 tuần', () => {
    const hm = buildMonthHeatmap(result, 2026, 2);
    expect(hm.days).toHaveLength(28);
    expect(hm.weeks).toHaveLength(4);
  });

  it('mỗi ngày có score 0–100 và tone hợp lệ', () => {
    const hm = buildMonthHeatmap(result, 2026, 7);
    for (const d of hm.days) {
      expect(d.score).toBeGreaterThanOrEqual(0);
      expect(d.score).toBeLessThanOrEqual(100);
      expect(['tốt', 'khá', 'trung bình', 'thận trọng', 'xấu']).toContain(d.tone);
    }
  });

  it('action cards có shouldDo/shouldAvoid', () => {
    const cards = buildDailyActionCards(result, new Date(2026, 6, 15));
    expect(cards.shouldDo.length).toBeGreaterThan(0);
    expect(cards.shouldAvoid.length).toBeGreaterThan(0);
    expect(cards.confidence).toBeGreaterThan(0);
  });
});
