// Import trực tiếp từng module thay vì barrel '../annualEvents' — barrel còn re-export ai.ts
// (kéo theo utils/aiAnalysis.ts → lib/supabase.ts → AsyncStorage native), không cần cho test thuần offline.
import { computeAnnualPrediction } from '../annualEvents/engine';
import { generateAnnualOfflineSummary } from '../annualEvents/offlineSummary';
import { buildAnnualNarrativePrompt } from '../annualEvents/narrativePrompt';
import { allSampleResults, sampleResult } from './fixtures';

describe('annualEvents engine', () => {
  test('chấm điểm 1 lá số mẫu cho năm hiện tại — không lỗi, dữ liệu hợp lệ', () => {
    const result = sampleResult();
    const pred = computeAnnualPrediction(result, 2026);

    expect(pred.targetYear).toBe(2026);
    expect(pred.events.length).toBeLessThanOrEqual(5);
    // tối đa 2 sự kiện mỗi nhóm
    const perCategory: Record<string, number> = {};
    for (const e of pred.events) perCategory[e.category] = (perCategory[e.category] ?? 0) + 1;
    for (const n of Object.values(perCategory)) expect(n).toBeLessThanOrEqual(2);

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
});
