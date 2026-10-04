import { allSampleResults } from './fixtures';
import { computePastReviewSync, AREAS, CHART_AREAS, PAST_CONFIG } from '../pastReview';
import { buildTimeline, markerOfYear } from '../pastReview/timeline';
import { lintText } from '../pastReview/lint';
import { explainWhy, viewerTexts } from '../pastReview/explainWhy';

const NOW = new Date(2026, 9, 4);

describe('pastReview — dòng đời đã qua (timeline)', () => {
  const results = allSampleResults();

  test.each(results.map((r, i) => [i, r] as const))('lá số mẫu %i: chặng hợp lệ, tất định, khớp điểm năm', (_i, r) => {
    const review = computePastReviewSync(r, { now: NOW });
    const t = buildTimeline(r, review, NOW);
    const t2 = buildTimeline(r, review, NOW);
    expect(t2).toEqual(t);

    // đúng một chặng hiện tại; không có chặng chưa tới
    expect(t.chapters.filter(c => c.status === 'current')).toHaveLength(1);
    for (const c of t.chapters) expect(c.startAge).toBeLessThanOrEqual(t.currentAge);

    // mỗi năm đã chấm nằm đúng một chặng (hoặc không chặng nào nếu ngoài đại hạn), và khớp điểm gốc
    const seen = new Set<number>();
    for (const c of t.chapters) {
      for (const y of c.years) {
        expect(seen.has(y.year)).toBe(false); seen.add(y.year);
        expect(y.age).toBeGreaterThanOrEqual(c.startAge - 1);
        expect(y.age).toBeLessThanOrEqual(c.endAge + 1);
        const sc = review.scores.find(s => s.year === y.year)!;
        expect(y.vanScore).toBe(sc.vanScore);
        for (const a of AREAS) expect(y.signed[a]).toBe(sc.areas[a].signed);
        expect(y.vanScore).toBeGreaterThanOrEqual(-100);
        expect(y.vanScore).toBeLessThanOrEqual(100);
      }
      expect(c.highlights.length).toBeLessThanOrEqual(2);
      for (const h of c.highlights) expect(c.years.some(y => y.year === h && y.hasSignal)).toBe(true);
      expect(c.free).toBe(c.status === 'child' || c.status === 'current');
    }
    // mốc ở màn Nghiệm quá khứ được đánh dấu trên dòng đời
    for (const m of review.markers) expect(t.years.find(y => y.year === m.year)!.isMarker).toBe(true);
    // chặng tuổi thơ (kết thúc ≤ 15 tuổi) chỉ có thể chứa đúng năm 15 tuổi
    for (const c of t.chapters.filter(c => c.status === 'child')) for (const y of c.years) expect(y.age).toBe(PAST_CONFIG.minAge);
  });

  test('câu tóm tắt chặng: sạch từ cấm, không dùng giọng tuyệt đối, ≤3 câu, không nhắc sức khỏe', () => {
    for (const r of results) {
      const t = buildTimeline(r, computePastReviewSync(r, { now: NOW }), NOW);
      for (const c of t.chapters) {
        expect(c.summary.length).toBeGreaterThanOrEqual(1);
        expect(c.summary.length).toBeLessThanOrEqual(3);
        for (const s of c.summary) {
          const bad = lintText(s, []).filter(i => i.kind !== 'unknown_term'); // tên cung/hành là thuật ngữ được phép ở đây
          expect(bad).toEqual([]);
          expect(s).not.toMatch(/sức khỏe|bệnh|tai nạn/i);
        }
      }
    }
  });

  test('biểu đồ chỉ có các mảng không phải sức khỏe; markerOfYear dựng đúng từ điểm năm', () => {
    expect(CHART_AREAS).toEqual(['career', 'wealth', 'love', 'family']);
    const r = results[0];
    const review = computePastReviewSync(r, { now: NOW });
    for (const s of review.scores) {
      const m = markerOfYear(s);
      expect(m.year).toBe(s.year);
      expect(m.area).toBe(s.bestArea);
      expect(m.strength).toBe(s.areas[s.bestArea].strength);
      // "Vì sao" cho năm bất kỳ vẫn viết được và sạch từ cấm
      const why = explainWhy(m);
      for (const text of viewerTexts(why.viewer)) {
        expect(lintText(text, m.signals).filter(i => i.kind !== 'unknown_term')).toEqual([]);
      }
    }
    expect(PAST_CONFIG.scoreYears).toBe(30);
  });
});
