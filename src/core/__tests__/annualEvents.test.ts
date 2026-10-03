// Import trực tiếp từng module thay vì barrel '../annualEvents' — barrel còn re-export ai.ts
// (kéo theo utils/aiAnalysis.ts → lib/supabase.ts → AsyncStorage native), không cần cho test thuần offline.
import { computeAnnualPrediction } from '../annualEvents/engine';
import { generateAnnualOfflineSummary, generateFullAnnualEventsExport } from '../annualEvents/offlineSummary';
import { buildAnnualNarrativePrompt } from '../annualEvents/narrativePrompt';
import { buildAnnualContext } from '../annualEvents/signals';
import { tieuHanEventPriorMultiplier } from '../annualEvents/tieuHanFocus';
import { PALACE_EVENT_BOOST } from '../annualEvents/tieuHanDomains';
import { groupEventsForExport, primaryMonthOf } from '../annualEvents/ranking';
import { CATEGORY_VN } from '../annualEvents/eventTitles';
import { allSampleResults, sampleResult } from './fixtures';

describe('annualEvents engine', () => {
  test('chấm điểm 1 lá số mẫu cho năm hiện tại — không lỗi, dữ liệu hợp lệ', () => {
    const result = sampleResult();
    const pred = computeAnnualPrediction(result, 2026);

    expect(pred.targetYear).toBe(2026);
    // Tối đa 10 sự kiện/năm; ngưỡng chuẩn 50 nhưng có sàn tối thiểu 5 (hạ ngưỡng nếu năm quá bình lặng).
    expect(pred.events.length).toBeLessThanOrEqual(10);

    for (const e of pred.events) {
      expect(e.strength).toBeGreaterThanOrEqual(0);
      expect(e.strength).toBeLessThanOrEqual(100);
      expect(['POSITIVE', 'NEGATIVE', 'MIXED']).toContain(e.direction);
      expect(['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH']).toContain(e.confidence);
      // major event chỉ bật khi đủ ngưỡng hội tụ (không có evidence gì mà vẫn major)
      if (e.isMajorEvent) expect(e.evidence.length).toBeGreaterThan(0);
      // mọi bằng chứng phải trỏ đúng rule + cung + sao
      for (const ev of e.evidence) {
        expect(ev.ruleId).toBeTruthy();
        expect(ev.palace).toBeTruthy();
      }
    }
  });

  test('chạy được cho nhiều lá số + nhiều năm khác nhau mà không ném lỗi', () => {
    for (const result of allSampleResults()) {
      for (const year of [2024, 2026, 2030]) {
        expect(() => computeAnnualPrediction(result, year)).not.toThrow();
      }
    }
  });

  test('tầng tháng LUÔN có ít nhất 1 cửa sổ chính, kể cả khi sự kiện điểm thấp (Monthly Timing v3 §34)', () => {
    for (const result of allSampleResults()) {
      const pred = computeAnnualPrediction(result, 2026);
      for (const e of pred.events) {
        expect(e.peakMonths.length).toBeGreaterThanOrEqual(1);
        expect(e.peakMonths.length).toBeLessThanOrEqual(2);
        for (const w of e.peakMonths) {
          expect(['LOW', 'MEDIUM', 'HIGH']).toContain(w.timingConfidence);
          expect(w.startLunarMonth).toBeGreaterThanOrEqual(1);
          expect(w.endLunarMonth).toBeLessThanOrEqual(12);
        }
      }
    }
  });

  test('bản Nâng cao offline dựng được văn bản không lỗi', () => {
    const pred = computeAnnualPrediction(sampleResult(), 2026);
    const md = generateAnnualOfflineSummary(pred);
    expect(typeof md).toBe('string');
    expect(md.length).toBeGreaterThan(10);
  });

  test('prompt cho AI không chứa placeholder rỗng bất thường', () => {
    const pred = computeAnnualPrediction(sampleResult(), 2026);
    const prompt = buildAnnualNarrativePrompt(pred, 'Test Nam');
    expect(prompt).toContain('Mệnh chủ'); // câu literal cấm nhắc — phải xuất hiện trong PHẦN QUY TẮC (cấm dùng), không phải bị thiếu
    expect(prompt).toContain(String(pred.targetYear));
  });

  test('Tiểu Hạn Event Focus Layer: sự kiện được "Boost" đúng cung Tiểu Hạn phải có eventPriorMultiplier 1.25 (§25)', () => {
    const result = sampleResult();
    for (const year of [2025, 2026, 2027, 2028, 2029]) {
      const ctx = buildAnnualContext(result, year);
      const focus = ctx.tieuHanFocus;
      if (!focus.palace) continue;
      const boosted = PALACE_EVENT_BOOST[focus.palace] ?? [];
      if (boosted.length === 0) continue;
      const def = require('../../data/annualEventDefinitions.json')[boosted[0]];
      const { multiplier, tier } = tieuHanEventPriorMultiplier(focus, def);
      expect(tier).toBe('PRIMARY_EVENT');
      expect(multiplier).toBeGreaterThanOrEqual(1.22);
      expect(multiplier).toBeLessThanOrEqual(1.30);
      return; // đủ 1 lần khớp là đạt — chỉ cần xác nhận công thức chạy đúng, không lặp toàn bộ 85 sự kiện
    }
  });

  test('danh sách sự kiện (>= 50 điểm, tối đa 10) xu hướng lệch theo ĐÚNG domain của cung Tiểu Hạn năm xem', () => {
    for (const result of allSampleResults()) {
      for (const year of [2025, 2026, 2027]) {
        const ctx = buildAnnualContext(result, year);
        const pred = computeAnnualPrediction(result, year);
        if (!ctx.tieuHanFocus.palace || pred.events.length === 0) continue;
        const boosted = new Set(PALACE_EVENT_BOOST[ctx.tieuHanFocus.palace] ?? []);
        for (const p of ctx.tieuHanFocus.sanFangPalaces) for (const id of PALACE_EVENT_BOOST[p] ?? []) boosted.add(id);
        if (boosted.size === 0) continue;
        // Không đòi hỏi TUYỆT ĐỐI (còn nhiều tầng khác cũng góp phần), chỉ xác nhận ít nhất 1 trong
        // top-5 khớp domain Tiểu Hạn năm đó — tránh trường hợp domain hoàn toàn không liên quan gì.
        const anyMatch = pred.events.some(e => boosted.has(e.eventId));
        expect(anyMatch).toBe(true);
      }
    }
  });

  test('sàn tối thiểu 5 sự kiện: năm nào không đủ 5 sự kiện >= 50 điểm thì hạ dần để lấy đủ 5', () => {
    for (const result of allSampleResults()) {
      for (let year = 2024; year <= 2033; year++) {
        const pred = computeAnnualPrediction(result, year);
        // Luôn có ít nhất 5 sự kiện (85 sự kiện trong bộ luôn đủ để hạ ngưỡng lấy đủ 5).
        expect(pred.events.length).toBeGreaterThanOrEqual(5);
        expect(pred.events.length).toBeLessThanOrEqual(10);
        // Vẫn xếp giảm dần theo điểm.
        for (let i = 1; i < pred.events.length; i++) {
          expect(pred.events[i].strength).toBeLessThanOrEqual(pred.events[i - 1].strength);
        }
      }
    }
  });

  test('gộp nhóm "Biến động tài sản": không hiện quá 1 sự kiện PROPERTY_* trong danh sách', () => {
    const PROPERTY_IDS = new Set([
      'PROPERTY_PURCHASE', 'PROPERTY_SALE', 'PROPERTY_RELOCATION', 'PROPERTY_RENOVATION',
      'PROPERTY_LARGE_EXPENSE', 'PROPERTY_INVESTMENT', 'PROPERTY_FAMILY_ASSET',
      'PROPERTY_INHERITANCE', 'PROPERTY_DISPUTE',
    ]);
    for (const result of allSampleResults()) {
      for (let year = 2024; year <= 2033; year++) {
        const pred = computeAnnualPrediction(result, year);
        const propertyCount = pred.events.filter(e => PROPERTY_IDS.has(e.eventId)).length;
        expect(propertyCount).toBeLessThanOrEqual(1);
      }
    }
  });

  test('featuredGroups: luôn đủ 10 nhóm lớn, mỗi nhóm tối đa 3 sự kiện, xếp giảm dần, KHÔNG chặn điểm tối thiểu', () => {
    for (const result of allSampleResults()) {
      for (const year of [2024, 2026, 2030]) {
        const pred = computeAnnualPrediction(result, year);
        // 85 sự kiện luôn đủ >=3 định nghĩa/nhóm (nhóm ít nhất là CHILDREN với 5) → luôn đủ 10 nhóm.
        expect(pred.featuredGroups.length).toBe(Object.keys(CATEGORY_VN).length);
        for (const g of pred.featuredGroups) {
          expect(g.events.length).toBeLessThanOrEqual(3);
          expect(g.events.length).toBeGreaterThan(0);
          expect(g.events.every(e => e.category === g.category)).toBe(true);
          for (let i = 1; i < g.events.length; i++) {
            expect(g.events[i].strength).toBeLessThanOrEqual(g.events[i - 1].strength);
          }
        }
      }
    }
  });

  test('primaryMonthOf: trả đúng startLunarMonth của cửa sổ ĐẦU TIÊN (mạnh nhất) trong peakMonths — dùng cho box "Sự kiện theo tháng"', () => {
    for (const result of allSampleResults()) {
      for (const year of [2024, 2026, 2030]) {
        const pred = computeAnnualPrediction(result, year);
        const allFeatured = pred.featuredGroups.flatMap(g => g.events);
        for (const e of allFeatured) {
          const m = primaryMonthOf(e);
          if (e.peakMonths.length === 0) {
            expect(m).toBeNull();
          } else {
            expect(m).toBe(e.peakMonths[0].startLunarMonth);
            expect(m).toBeGreaterThanOrEqual(1);
            expect(m).toBeLessThanOrEqual(12);
          }
        }
      }
    }
  });

  test('groupEventsForExport: gồm toàn bộ sự kiện nổi bật + sự kiện >= 45 điểm, nhóm theo lĩnh vực, không giới hạn số lượng/nhóm', () => {
    for (const result of allSampleResults()) {
      const pred = computeAnnualPrediction(result, 2026);
      const groups = groupEventsForExport(pred.allEvents, 45, pred.featuredGroups);
      const featuredIds = new Set(pred.featuredGroups.flatMap(g => g.events.map(e => e.eventId)));
      const exported = groups.flatMap(g => g.events);
      const exportedIds = new Set(exported.map(e => e.eventId));

      // (1) Mọi sự kiện đang hiện ở "Sự kiện nổi bật" đều có mặt trong PDF (kể cả điểm thấp hơn 45).
      for (const id of featuredIds) expect(exportedIds.has(id)).toBe(true);
      // (2) Sự kiện KHÔNG nổi bật chỉ có mặt nếu đạt >= 45 điểm; và mọi sự kiện >= 45 đều có mặt.
      for (const e of exported) {
        if (!featuredIds.has(e.eventId)) expect(e.strength).toBeGreaterThanOrEqual(45);
      }
      for (const e of pred.allEvents) {
        if (e.strength >= 45) expect(exportedIds.has(e.eventId)).toBe(true);
      }
      // (3) Nhóm đúng lĩnh vực, xếp giảm dần theo điểm trong nhóm, không trùng sự kiện.
      expect(exportedIds.size).toBe(exported.length);
      for (const g of groups) {
        expect(g.events.length).toBeGreaterThan(0);
        for (const e of g.events) expect(e.category).toBe(g.category);
        for (let i = 1; i < g.events.length; i++) {
          expect(g.events[i].strength).toBeLessThanOrEqual(g.events[i - 1].strength);
        }
      }
      // allEvents chứa toàn bộ ứng viên đã chấm điểm (kể cả điểm thấp) — khớp debugCandidateCount.
      expect(pred.allEvents.length).toBe(pred.debugCandidateCount);
    }
  });

  test('bản xuất PDF đầy đủ: đánh số thứ tự liên tục và ghi điểm từng sự kiện', () => {
    const pred = computeAnnualPrediction(sampleResult(), 2026);
    const md = generateFullAnnualEventsExport(pred);
    expect(typeof md).toBe('string');
    expect(md.length).toBeGreaterThan(10);

    const groups = groupEventsForExport(pred.allEvents, 45, pred.featuredGroups);
    const flat = groups.flatMap(g => g.events);
    const headings = md.split('\n').filter(l => /^## \d+\. /.test(l));
    expect(headings.length).toBe(flat.length);
    headings.forEach((h, i) => expect(h.startsWith(`## ${i + 1}. `)).toBe(true));
    for (const e of flat) expect(md).toContain(`**Điểm: ${e.strength}/100**`);
  });
});
