import {
  hkFacts, hkMonthBreak, hkGrades, hkActivityStatus, hkSummary, isValidDayPillar, aggregateScenarios, validateBirthTime,
} from '../hiepKy';
import { HK_GRADE_CELLS, HK_MONTHLY } from '../../data/hiepKyThanSat';
import { HK_TRUC } from '../../data/hiepKyTruc';
import { dayCanChi } from '../nhatVan';
import type { EarthlyBranch, HeavenlyStem } from '../../types';

const STEMS: HeavenlyStem[] = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const BR: EarthlyBranch[] = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tị', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
const MONTHS: EarthlyBranch[] = ['Dần', 'Mão', 'Thìn', 'Tị', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi', 'Tý', 'Sửu'];

/** Golden/policy fixtures theo gói Hiệp Kỷ 1.2 (supplement_validation + Ví dụ A–D của tài liệu). */
describe('Hiệp Kỷ 1.2 — khởi lệ & bảng sáu bậc', () => {
  it('bảng sáu bậc đủ 11 × 12 = 132 ô; các ô nguồn trung gian từng sai', () => {
    const cells = Object.values(HK_GRADE_CELLS);
    expect(cells).toHaveLength(11);
    expect(cells.reduce((n, c) => n + Object.keys(c).length, 0)).toBe(132);
    expect(HK_GRADE_CELLS['平日']['巳']).toBe(1);
    expect(HK_GRADE_CELLS['平日']['午']).toBe(3);
    for (const m of '寅巳申亥') expect(HK_GRADE_CELLS['災煞'][m]).toBe(1);
    expect(HK_GRADE_CELLS['災煞']['卯']).toBe(5);
    expect(HK_GRADE_CELLS['災煞']['酉']).toBe(5);
  });

  it('35 khởi lệ theo tháng', () => {
    expect(HK_MONTHLY).toHaveLength(35);
  });

  it('can chi ngày phải hợp lệ (Tân Tý không tồn tại)', () => {
    expect(isValidDayPillar('Tân', 'Tý')).toBe(false);
    expect(() => hkFacts('Ngọ', 'Tân', 'Tý')).toThrow();
    expect(isValidDayPillar('Nhâm', 'Tý')).toBe(true);
  });

  it('720 tổ hợp tháng × can chi hợp lệ: không ném lỗi, luôn đúng một Trực, chuyển quy tắc luôn giải được', () => {
    let n = 0;
    for (const m of MONTHS) {
      for (let i = 0; i < 60; i++) {
        const f = hkFacts(m, STEMS[i % 10], BR[i % 12]);
        expect(f.active.filter(a => '建除滿平定執破危成收開閉'.includes(a[0]) && a.endsWith('日') && a.length === 2)).toHaveLength(1);
        expect(() => hkGrades(f)).not.toThrow();
        hkMonthBreak(f);
        n++;
      }
    }
    expect(n).toBe(720);
  });

  it('Phá ⇔ Nguyệt phá (cùng nguồn: chi ngày xung chi tháng)', () => {
    for (const m of MONTHS) for (let i = 0; i < 60; i++) {
      const f = hkFacts(m, STEMS[i % 10], BR[i % 12]);
      expect(f.active.includes('破日')).toBe(f.active.includes('月破'));
    }
  });

  it('Ví dụ A: tháng Mão, ngày Quý Dậu = Phá + Tai Sát + Nguyệt Yếm → mọi việc kỵ dù thêm Đức', () => {
    const f = hkFacts('Mão', 'Quý', 'Dậu');
    expect(f.active).toEqual(expect.arrayContaining(['月破', '災煞', '月厭', '破日']));
    expect(hkMonthBreak(f)).toMatchObject({ status: 'all_ji' });
    expect(hkActivityStatus(f, '求醫療病', HK_TRUC[36].ji).status).toBe('all_ji');
  });

  it('Ví dụ B: tháng Ngọ, ngày Nhâm Tý — không có Nguyệt Đức Hợp của tháng Ngọ → không được cứu', () => {
    const f = hkFacts('Ngọ', 'Nhâm', 'Tý');
    expect(f.active).toEqual(expect.arrayContaining(['月破', '災煞', '四廢']));
    expect(f.active).not.toContain('月德合');
    expect(hkMonthBreak(f).status).toBe('all_ji');
  });

  it('Ví dụ C: tháng Tý, ngày Bính Ngọ — Nguyệt Đức tháng Tý là Nhâm → không cứu, mọi việc kỵ', () => {
    const f = hkFacts('Tý', 'Bính', 'Ngọ');
    expect(f.active).toEqual(expect.arrayContaining(['月破', '災煞']));
    expect(f.active).not.toContain('月德');
    expect(hkMonthBreak(f).status).toBe('all_ji');
  });

  it('Nguyệt phá cơ sở (tháng Hợi, ngày Ất Tị): cầu y/phá nhà KHÔNG kỵ; việc khác (cưới) kỵ', () => {
    const f = hkFacts('Hợi', 'Ất', 'Tị');
    const b = hkMonthBreak(f);
    expect(b.status).toBe('scoped_ji');
    if (b.status === 'scoped_ji') { expect(b.notJi).toContain('求醫療病'); expect(b.notJi).toContain('破屋壞垣'); }
    const med = hkActivityStatus(f, '求醫療病', HK_TRUC[36].ji);
    expect(med.breakExempt).toBe(true);
    expect(med.status).not.toBe('ji');
    const wed = hkActivityStatus(f, '嫁娶', HK_TRUC[27].ji);
    expect(wed.fromBreak).toBe(true);
    expect(wed.status).toBe('ji');
  });

  it('Âm Dương Giao Phá: tháng Tỵ ngày Quý Hợi và tháng Hợi ngày Đinh Tỵ → mọi việc kỵ', () => {
    expect(hkMonthBreak(hkFacts('Tị', 'Quý', 'Hợi')).status).toBe('all_ji');
    expect(hkMonthBreak(hkFacts('Hợi', 'Đinh', 'Tị')).status).toBe('all_ji');
  });

  it('có Đức đúng nhánh: tháng Dần, ngày Bính Tý (Nguyệt Đức + Tai Sát bậc 1) → nghi, chỉ còn residual kỵ', () => {
    const f = hkFacts('Dần', 'Bính', 'Tý');
    expect(f.active).toContain('月德');
    const g = hkGrades(f).find(x => x.trigger === '災煞');
    expect(g?.mode).toBe('yi');
    expect(g?.residualJi).toContain('求醫療病');
    expect(hkActivityStatus(f, '求醫療病', HK_TRUC[36].ji).status).toBe('ji');
    expect(hkActivityStatus(f, '嫁娶', HK_TRUC[27].ji).status).toBe('none');
  });

  it('hkSummary liệt kê thần hung đã số hóa đang có mặt', () => {
    const s = hkSummary(hkFacts('Mão', 'Quý', 'Dậu'));
    expect(s.hung).toEqual(expect.arrayContaining(['Nguyệt phá', 'Tai Sát', 'Nguyệt Yếm']));
  });

  it('khớp lịch thật: 08/10/2026 là Trực Chấp, không có Nguyệt phá', () => {
    const cc = dayCanChi(new Date(2026, 9, 8));
    const f = hkFacts('Tuất', cc.stem, cc.branch);
    expect(f.active).toContain('執日');
    expect(f.active).not.toContain('月破');
  });
});

describe('Tổng hợp kịch bản & giờ sinh không rõ (hợp đồng v2)', () => {
  it('Ví dụ D: ba kịch bản [68,72] [66,75] [70,76] → [66,76], đẹp', () => {
    const r = aggregateScenarios([{ lower: 68, upper: 72 }, { lower: 66, upper: 75 }, { lower: 70, upper: 76 }]);
    expect(r).toMatchObject({ status: 'resolved', label: 'good', scoreRange: { min: 66, max: 76 }, probability: null });
  });
  it('thêm kịch bản [33,70] → [33,76] không xác định, không nhãn', () => {
    const r = aggregateScenarios([{ lower: 68, upper: 72 }, { lower: 66, upper: 75 }, { lower: 70, upper: 76 }, { lower: 33, upper: 70 }]);
    expect(r).toMatchObject({ status: 'indeterminate', label: null, scoreRange: { min: 33, max: 76 } });
  });
  it('một kịch bản bị veto → eligibility_uncertain, không lấy 0 vào min', () => {
    const r = aggregateScenarios([{ lower: 68, upper: 72 }, { veto: true }]);
    expect(r).toMatchObject({ status: 'eligibility_uncertain', label: null, scoreRange: { min: 68, max: 72 } });
  });
  it('tất cả bị veto → excluded_by_policy; thiếu miền/coverage<0,85 → insufficient_data', () => {
    expect(aggregateScenarios([{ veto: true }, { veto: true }]).status).toBe('excluded_by_policy');
    expect(aggregateScenarios([{ lower: 60, upper: 70 }], false).status).toBe('insufficient_data');
    expect(aggregateScenarios([{ lower: 60, upper: 70 }], true, 0.75).status).toBe('insufficient_data');
    expect(aggregateScenarios([]).status).toBe('insufficient_data');
  });
  it('kịch bản veto không được mang điểm; cận không hợp lệ bị từ chối', () => {
    expect(() => aggregateScenarios([{ veto: true, lower: 50, upper: 60 }])).toThrow();
    expect(() => aggregateScenarios([{ lower: 80, upper: 70 }])).toThrow();
  });
  it('xấu / bình thường theo ngưỡng 35 · 65', () => {
    expect(aggregateScenarios([{ lower: 10, upper: 35 }]).label).toBe('bad');
    expect(aggregateScenarios([{ lower: 36, upper: 64 }]).label).toBe('normal');
  });

  it('validateBirthTime: exact/approximate/unknown — unknown không mang giờ giả', () => {
    expect(validateBirthTime({ status: 'exact', localTime: '09:20' })).toBe(true);
    expect(validateBirthTime({ status: 'unknown', localTime: null })).toBe(true);
    expect(validateBirthTime({ status: 'approximate', localTime: null, intervals: [{ start: '23:00', end: '01:00', endDayOffset: 1 }] })).toBe(true);
    expect(() => validateBirthTime({ status: 'unknown', localTime: '12:00' })).toThrow();
    expect(() => validateBirthTime({ status: 'exact', localTime: '25:00' })).toThrow();
    expect(() => validateBirthTime({ status: 'approximate', localTime: null, intervals: [{ start: '10:00', end: '09:00' }] })).toThrow();
    expect(() => validateBirthTime({ status: 'approximate', localTime: '10:00', intervals: [{ start: '09:00', end: '11:00' }] })).toThrow();
  });
});
