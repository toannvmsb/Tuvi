// Import trực tiếp từng module thay vì barrel '../annualEvents' — barrel còn re-export ai.ts
// (kéo theo utils/aiAnalysis.ts → lib/supabase.ts → AsyncStorage native), không cần cho test thuần offline.
import { computeAnnualPrediction } from '../annualEvents/engine';
import { generateAnnualOfflineSummary } from '../annualEvents/offlineSummary';
import { buildAnnualNarrativePrompt } from '../annualEvents/narrativePrompt';
import { buildAnnualContext } from '../annualEvents/signals';
import { tieuHanEventPriorMultiplier } from '../annualEvents/tieuHanFocus';
import { PALACE_EVENT_BOOST } from '../annualEvents/tieuHanDomains';
import { allSampleResults, sampleResult } from './fixtures';

describe('annualEvents engine', () => {
  test('chấm điểm 1 lá số mẫu cho năm hiện tại — không lỗi, dữ liệu hợp lệ', () => {
    const result = sampleResult();
    const pred = computeAnnualPrediction(result, 2026);

    expect(pred.targetYear).toBe(2026);
    // Tối đa 10 sự kiện/năm, không còn giới hạn riêng theo nhóm — mọi sự kiện hiện ra phải đạt ngưỡng 50.
    expect(pred.events.length).toBeLessThanOrEqual(10);
    for (const e of pred.events) expect(e.strength).toBeGreaterThanOrEqual(50);

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
});
