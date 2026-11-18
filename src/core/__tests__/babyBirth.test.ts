import type { BirthInfo } from '../../types';
import { buildResult } from '../buildResult';
import {
  BIRTH_HOUR_SLOTS, MAX_DAYS, scanBabyBirthSync, scoreBabyChart, scoreBabyBothGenders, validateWindow, parentFits, combineFits, BABY_DISCLAIMER,
} from '../babyBirth';

const NOW = new Date(2026, 10, 19);
const START = { year: 2026, month: 12, day: 1 };
const mk = (gender: 'nam' | 'nu', over: Partial<BirthInfo> = {}): BirthInfo => ({
  name: 'P', gender, birthplace: '', calendarType: 'solar', year: 1988, month: 3, day: 9, hour: 8, minute: 0, language: 'vi', ...over,
});
const father = buildResult(mk('nam', { name: 'Bố' }));
const mother = buildResult(mk('nu', { name: 'Mẹ', year: 1990, month: 8, day: 21, hour: 14 }));

describe('Chọn ngày giờ sinh cho con — kiểm tra khoảng ngày', () => {
  test('hợp lệ / quá khứ / vượt giới hạn / ngày không tồn tại / quá xa', () => {
    expect(validateWindow({ start: START, days: 7, now: NOW })).toBeNull();
    expect(validateWindow({ start: { year: 2026, month: 11, day: 19 }, days: 1, now: NOW })).toBeNull(); // hôm nay
    expect(validateWindow({ start: { year: 2026, month: 11, day: 18 }, days: 7, now: NOW })).toMatch(/hôm nay/);
    expect(validateWindow({ start: START, days: MAX_DAYS + 1, now: NOW })).toMatch(/Khoảng ngày/);
    expect(validateWindow({ start: START, days: 0, now: NOW })).toMatch(/Khoảng ngày/);
    expect(validateWindow({ start: { year: 2026, month: 2, day: 31 }, days: 7, now: NOW })).toMatch(/không hợp lệ/);
    expect(validateWindow({ start: { year: 2028, month: 1, day: 1 }, days: 7, now: NOW })).toMatch(/quá xa/);
    expect(() => scanBabyBirthSync({ start: START, days: 99, now: NOW })).toThrow();
  });
  test('lời nhắc bắt buộc có nói bác sĩ quyết định', () => {
    expect(BABY_DISCLAIMER).toMatch(/bác sĩ/);
  });
});

describe('Chọn ngày giờ sinh cho con — chấm điểm', () => {
  jest.setTimeout(180000);

  test('không dùng giới tính thai nhi: điểm = trung bình lá số nam và nữ; lời giải thích chỉ giữ ý có ở cả hai', () => {
    let maxGap = 0;
    for (const [d, h] of [[1, 0], [3, 6], [5, 12], [8, 18], [12, 22]] as const) {
      const a = scoreBabyChart(buildResult(mk('nam', { year: 2026, month: 12, day: d, hour: h })));
      const b = scoreBabyChart(buildResult(mk('nu', { year: 2026, month: 12, day: d, hour: h })));
      const both = scoreBabyBothGenders(2026, 12, d, h).score;
      expect(both.total).toBeCloseTo((a.total + b.total) / 2, 6);
      expect(both.reasons.every(r => a.reasons.includes(r) && b.reasons.includes(r))).toBe(true);
      expect(both.cautions.every(r => a.cautions.includes(r) && b.cautions.includes(r))).toBe(true);
      maxGap = Math.max(maxGap, Math.abs(a.total - b.total));
    }
    // eslint-disable-next-line no-console
    console.log(`chênh lớn nhất giữa lá số nam và nữ cùng giờ: ${maxGap.toFixed(2)} điểm`);
  });

  test('độ hợp bố/mẹ không phụ thuộc giới tính của em bé', () => {
    const base = { year: 2026, month: 12, day: 4, hour: 10 };
    const fa = parentFits(buildResult(mk('nam', base)), [father, mother]).map(p => p.fit);
    const fb = parentFits(buildResult(mk('nu', base)), [father, mother]).map(p => p.fit);
    fa.forEach((v, i) => expect(fb[i]).toBeCloseTo(v, 6));
  });

  test('quét 3 ngày không bố/mẹ: 36 kết quả, điểm 0–100, xếp giảm dần, tất định', () => {
    const t0 = Date.now();
    const r1 = scanBabyBirthSync({ start: START, days: 3, now: NOW });
    const ms = Date.now() - t0;
    const r2 = scanBabyBirthSync({ start: START, days: 3, now: NOW });
    // eslint-disable-next-line no-console
    console.log(`36 lá số (không bố/mẹ): ${ms}ms (~${Math.round(ms / 36)}ms/lá số)`);
    expect(r1.candidates).toHaveLength(3 * BIRTH_HOUR_SLOTS.length);
    expect(r1.candidates.every(c => c.total >= 0 && c.total <= 100 && c.parent === null)).toBe(true);
    for (let i = 1; i < r1.candidates.length; i++) expect(r1.candidates[i - 1].total).toBeGreaterThanOrEqual(r1.candidates[i].total);
    expect(r1.bestPerDay).toHaveLength(3);
    expect(r1.candidates.map(c => [c.day, c.hour, c.total])).toEqual(r2.candidates.map(c => [c.day, c.hour, c.total]));
    const spread = r1.candidates[0].total - r1.candidates[r1.candidates.length - 1].total;
    // eslint-disable-next-line no-console
    console.log(`điểm cao nhất ${r1.candidates[0].total}, thấp nhất ${r1.candidates[r1.candidates.length - 1].total}, chênh ${spread.toFixed(1)}`);
    expect(spread).toBeGreaterThan(3); // bộ chấm phải phân biệt được các giờ
  });

  test('có bố và mẹ: có điểm hợp, điểm tổng = tổ hợp lá số bé và độ hợp; ngày/giờ tốt nhất khác khi có lá số so sánh', () => {
    const t0 = Date.now();
    const r = scanBabyBirthSync({ start: START, days: 2, parents: [father, mother], now: NOW });
    // eslint-disable-next-line no-console
    console.log(`24 lá số (2 bố/mẹ): ${Date.now() - t0}ms`);
    const c = r.top[0];
    expect(c.parent).not.toBeNull();
    expect(c.parents).toHaveLength(2);
    const fit = combineFits(c.parents.map(p => p.fit))!;
    expect(c.total).toBeCloseTo(c.baby * 0.6 + fit * 0.4, 0);
    const noParent = scanBabyBirthSync({ start: START, days: 2, now: NOW });
    expect(r.candidates.map(x => x.total)).not.toEqual(noParent.candidates.map(x => x.total));
  });

  test('lời giải thích không có từ cấm (Mệnh chủ/Thân chủ) và không phán tuyệt đối', () => {
    const r = scanBabyBirthSync({ start: START, days: 2, parents: [father], now: NOW });
    const text = r.candidates.flatMap(c => [...c.reasons, ...c.cautions]).join(' | ');
    expect(text).not.toMatch(/Mệnh chủ|Thân chủ|chắc chắn/i);
  });
});
