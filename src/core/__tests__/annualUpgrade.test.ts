import { computeAnnualPrediction } from '../annualEvents/engine';
import { TUAN_TRIET_DAMP } from '../annualEvents/config';
import { buildBaziNatal, evaluateBaziYear, evaluateBaziMonths, monthPillarOf } from '../pastReview/bazi/engine';
import { baziMonthNote } from '../pastReview/bazi/monthNote';
import { sampleResult } from './fixtures';

const fired = (nat: ReturnType<typeof buildBaziNatal>, year: number) =>
  new Set(Object.values(evaluateBaziYear(nat, year)).flatMap(a => a.signals.map(s => s.ruleId)));

describe('Bát Tự pr-0.5 — quy tắc mới', () => {
  const base = buildBaziNatal(sampleResult());
  const withPillar = (i: number, patch: object) => ({ ...base, pillars: base.pillars.map((p, k) => (k === i ? { ...p, ...patch } : p)) });

  test('Hồng Loan / Thiên Hỷ theo chi năm sinh (Tý → Mão / Dậu)', () => {
    const n = withPillar(0, { branch: 'Tý' });
    expect(fired(n, 2023).has('BZ_LOV_HONGLOAN')).toBe(true);   // Quý Mão
    expect(fired(n, 2017).has('BZ_LOV_THIENHY')).toBe(true);    // Đinh Dậu
    expect(fired(n, 2017).has('BZ_LOV_HONGLOAN')).toBe(false);
  });

  test('ngũ hợp / tương xung thiên can với can trụ ngày', () => {
    const n = withPillar(2, { stem: 'Kỷ' });
    expect(fired(n, 2024).has('BZ_LOV_STEMCOMB_DAY')).toBe(true); // Giáp–Kỷ
    const x = withPillar(2, { stem: 'Canh' });
    expect(fired(x, 2024).has('BZ_HOM_STEMCLASH_DAY')).toBe(true); // Giáp–Canh
  });
});

describe('Lưu nguyệt Bát Tự', () => {
  test('dựng được trụ tháng theo tiết khí cho cả 12 tháng và điểm nằm trong 0..100', () => {
    const nat = buildBaziNatal(sampleResult());
    const months = evaluateBaziMonths(nat, 2025);
    expect(months).toHaveLength(12);
    for (const m of months) { expect(m).not.toBeNull(); for (const v of Object.values(m!)) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(100); } }
    // tháng 1 âm 2025 (Ất Tỵ) rơi sau Lập Xuân → tháng Dần; Ngũ Hổ Độn năm Ất → tháng Dần can Mậu
    expect(monthPillarOf(2025, 1)).toEqual({ stem: 'Mậu', branch: 'Dần' });
  });

  test('baziMonthNote: sự kiện không thuộc 5 mảng → không có dòng đối chiếu', () => {
    const nat = buildBaziNatal(sampleResult());
    const months = evaluateBaziMonths(nat, 2025);
    expect(baziMonthNote(months, 'HEALTH_ATTENTION', 3, 3)).toBeNull();
    expect(baziMonthNote(months, 'CAREER_PROMOTION', 3, 4)).toMatch(/Bát Tự/);
  });
});

describe('Tuần/Triệt làm giảm lực tín hiệu đóng đúng cung đó', () => {
  test(`tổng điểm 85 sự kiện khi có Tuần/Triệt ≤ khi bỏ Tuần/Triệt (hệ số ${TUAN_TRIET_DAMP})`, () => {
    const r = sampleResult();
    const year = r.birthInfo.year + 30;
    const sum = (res: typeof r) => computeAnnualPrediction(res, year, { skipMonthly: true }).allEvents.reduce((s, e) => s + e.strength, 0);
    const cleared = { ...r, tuViChart: { ...r.tuViChart, houses: r.tuViChart.houses.map(h => ({ ...h, tuanAt: false, trietAt: false })) } } as typeof r;
    expect(r.tuViChart.houses.some(h => h.tuanAt || h.trietAt)).toBe(true);
    expect(sum(r)).toBeLessThan(sum(cleared));
  });
});
