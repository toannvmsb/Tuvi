import { allSampleResults } from './fixtures';
import { AREAS, FUTURE_CONFIG, PAST_CONFIG, EVENT_MAX_AGE } from '../pastReview';
import { computeFutureReviewSync, computeFutureReview, futureYears, selectFutureMarkers } from '../pastReview/futureReview';
import { describeFutureMarker } from '../pastReview/futurePhrases';
import { explainWhy, viewerTexts } from '../pastReview/explainWhy';
import { buildFutureTimeline } from '../pastReview/timeline';
import { lintText, lintAll } from '../pastReview/lint';
import { EVENT_PHRASE } from '../pastReview/phrases';
import { computeBaziLuck, luckAtYear } from '../pastReview/bazi/luck';
import { currentAgeOf } from '../ageUtil';

const NOW = new Date(2026, 9, 4); // năm âm lịch hiện tại = 2026

describe('Luận tương lai — bộ máy', () => {
  const results = allSampleResults();

  test('các năm xét: từ năm âm lịch hiện tại tới khi đủ 100 tuổi, liên tục', () => {
    for (const r of results) {
      const ys = futureYears(r, NOW);
      expect(ys[0]).toBe(2026);
      for (let i = 1; i < ys.length; i++) expect(ys[i]).toBe(ys[i - 1] + 1);
      expect(currentAgeOf(r, new Date(ys[ys.length - 1], 0, 1))).toBeLessThanOrEqual(FUTURE_CONFIG.untilAge);
      expect(currentAgeOf(r, new Date(ys[ys.length - 1] + 1, 0, 1))).toBeGreaterThan(FUTURE_CONFIG.untilAge);
    }
    // sinh 2001 → tuổi 100 vào năm 2100: có ~75 năm
    const r2001 = results[2];
    expect(futureYears(r2001, NOW).length).toBeGreaterThan(70);
  });

  test('đại vận Bát Tự phủ tới 100 tuổi (không hết tín hiệu nền ở tuổi già)', () => {
    for (const r of results) {
      const luck = computeBaziLuck(r);
      const lastYear = futureYears(r, NOW).slice(-1)[0];
      expect(luckAtYear(luck, lastYear)).not.toBeNull();
    }
  });

  test('tất định: chạy hai lần và bản bất đồng bộ cho kết quả giống hệt', async () => {
    const r = results[0];
    const a = computeFutureReviewSync(r, { now: NOW });
    const b = computeFutureReviewSync(r, { now: NOW });
    expect(b).toEqual(a);
    const c = await computeFutureReview(r, { now: NOW });
    expect(c).toEqual(a);
  });

  test.each(results.map((r, i) => [i, r] as const))('lá số mẫu %i: năm nổi bật hợp lệ và trải đều đại hạn', (_i, r) => {
    const fr = computeFutureReviewSync(r, { now: NOW });
    expect(fr.scores).toHaveLength(futureYears(r, NOW).length);
    const ms = fr.markers;
    expect(ms.length).toBeGreaterThan(0);
    expect(ms.length).toBeLessThanOrEqual(FUTURE_CONFIG.markersMax);
    // tăng dần theo năm, mỗi năm một mốc
    expect(ms.map(m => m.year)).toEqual([...new Set(ms.map(m => m.year))].sort((a, b) => a - b));
    for (const a of AREAS) expect(ms.filter(m => m.area === a).length).toBeLessThanOrEqual(FUTURE_CONFIG.maxPerArea);
    const byDv = new Map<number | null, number>();
    for (const m of ms) byDv.set(m.daiVanIndex, (byDv.get(m.daiVanIndex) ?? 0) + 1);
    for (const n of byDv.values()) expect(n).toBeLessThanOrEqual(FUTURE_CONFIG.maxPerDaiVan);
    expect(byDv.size).toBeGreaterThanOrEqual(2); // trải trên nhiều đại hạn
    for (const m of ms) {
      expect(m.strength).toBeGreaterThanOrEqual(FUTURE_CONFIG.minMarkerStrength);
      // không báo sự kiện vô lý theo tuổi (vd thăng chức ở tuổi 90)
      if (m.topEventId) expect(m.age).toBeLessThanOrEqual(EVENT_MAX_AGE[m.topEventId] ?? 999);
      // truy được về đúng điểm năm
      const sc = fr.scores.find(s => s.year === m.year)!;
      expect(m.signals).toEqual(sc.areas[m.area].signals);
      expect(m.signed).toBe(sc.areas[m.area].signed);
    }
    // chọn lại từ cùng điểm cho kết quả y hệt
    expect(selectFutureMarkers(fr.scores)).toEqual(ms);
  });
});

describe('Luận tương lai — lời văn', () => {
  const results = allSampleResults();

  test('mọi câu sự kiện đổi sang "sẽ" không còn dấu vết thì quá khứ; câu nhạy cảm không gọi tên sự kiện', () => {
    for (const [id, p] of Object.entries(EVENT_PHRASE)) {
      if (p.sensitive) continue;
      const t = describeFutureMarker({ area: 'career', topEventId: id, signed: 1 }).text;
      expect(t.startsWith('Có thể bạn sẽ ')).toBe(true);
      expect(t).not.toMatch(/\b(đã|từng|vừa)\b/);
    }
    const s = describeFutureMarker({ area: 'family', topEventId: 'FAMILY_PARENT_EVENT', signed: -1 });
    expect(s.sensitive).toBe(true);
    expect(s.text).toBe('Năm này cần để tâm hơn đến mảng gia đạo.');
  });

  test('mọi năm nổi bật của mọi lá số mẫu: câu mô tả + gợi ý + phần Vì sao đều qua bộ kiểm tra lời văn', () => {
    for (const r of results) {
      const fr = computeFutureReviewSync(r, { now: NOW });
      for (const m of fr.markers) {
        const ph = describeFutureMarker(m);
        expect(ph.advice.startsWith('Nên ') || ph.advice.startsWith('Nếu ')).toBe(true);
        expect(lintText(ph.text, m.signals)).toEqual([]);
        expect(lintText(ph.advice, m.signals)).toEqual([]);
        expect(ph.text + ph.advice).not.toMatch(/chắc chắn|nhất định|100%|sẽ chết|bệnh/i);
        const why = explainWhy(m, { sensitive: ph.sensitive });
        expect(lintAll(viewerTexts(why.viewer), m.signals)).toEqual([]);
        // gợi ý theo dấu: điểm ≥ 0 → cơ hội, < 0 → chuẩn bị
        const same = describeFutureMarker({ ...m, signed: m.signed >= 0 ? -1 : 1 }).advice;
        expect(same).not.toBe(ph.advice);
      }
    }
  });
});

describe('Luận tương lai — dòng thời gian theo đại hạn', () => {
  test.each(allSampleResults().map((r, i) => [i, r] as const))('lá số mẫu %i: chặng hợp lệ, chỉ chặng hiện tại miễn phí', (_i, r) => {
    const fr = computeFutureReviewSync(r, { now: NOW });
    const t = buildFutureTimeline(r, fr, NOW);
    expect(buildFutureTimeline(r, fr, NOW)).toEqual(t);
    expect(t.chapters.filter(c => c.status === 'current')).toHaveLength(1);
    for (const c of t.chapters) {
      expect(c.endAge).toBeGreaterThanOrEqual(t.currentAge);
      expect(c.free).toBe(c.status === 'current');
      expect(c.years.length).toBeGreaterThan(0);
      expect(c.highlights.length).toBeLessThanOrEqual(2);
      expect(c.summary.length).toBeLessThanOrEqual(3);
      for (const line of c.summary) {
        expect(lintText(line, []).filter(i => i.kind !== 'unknown_term')).toEqual([]);
        expect(line).not.toMatch(/sức khỏe|bệnh|tai nạn/i);
      }
    }
    // chặng cuối chạm tới ~100 tuổi
    expect(t.years[t.years.length - 1].age).toBeGreaterThanOrEqual(FUTURE_CONFIG.untilAge - 1);
    // mọi năm đã nằm đúng một chặng
    const seen = new Set<number>();
    for (const c of t.chapters) for (const y of c.years) { expect(seen.has(y.year)).toBe(false); seen.add(y.year); }
    expect(PAST_CONFIG.minAge).toBe(15); // cấu hình quá khứ không bị đụng
  });
});
