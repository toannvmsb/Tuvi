import { buildResult } from '../buildResult';
import { computeDomainScores } from '../daiVanScore';
import { lunarToSolar } from '../lunarCalendar';
import type { BirthInfo, StarEntry } from '../../types';

const base: Omit<BirthInfo, 'calendarType' | 'year' | 'month' | 'day'> = {
  name: 'T', gender: 'nam', birthplace: 'Hà Nội', hour: 10, minute: 0, language: 'vi',
};

describe('Sửa lỗi có sẵn: tiểu vận của lá số nhập ÂM lịch', () => {
  // Mùng 1 Tết Canh Ngọ 1990 (27/1/1990 dương). Đọc nhầm "1/1/1990" là dương sẽ ra năm âm 1989 (Kỷ Tị) → lệch cung khởi tiểu hạn.
  test.each([
    { ld: 1, lm: 1, ly: 1990 },
    { ld: 15, lm: 6, ly: 1985 },
    { ld: 3, lm: 12, ly: 2000 },
  ])('âm $ld/$lm/$ly ra đúng tiểu vận như lá số dương tương ứng', ({ ld, lm, ly }) => {
    const s = lunarToSolar(ld, lm, ly, false);
    const lunarChart = buildResult({ ...base, calendarType: 'lunar', year: ly, month: lm, day: ld }, 2026);
    const solarChart = buildResult({ ...base, calendarType: 'solar', year: s.year, month: s.month, day: s.day }, 2026);
    // cùng một người → cùng cung khởi tiểu hạn và cùng thứ tự cung theo tuổi
    expect(lunarChart.tieuVans.map(t => [t.age, t.branch, t.stem])).toEqual(solarChart.tieuVans.map(t => [t.age, t.branch, t.stem]));
  });

  test('lá số dương không đổi hành vi (chi năm lấy từ ngày âm tương ứng)', () => {
    const r = buildResult({ ...base, calendarType: 'solar', year: 1990, month: 1, day: 27 }, 2026); // đúng mùng 1 Tết Canh Ngọ
    expect(r.tieuVans[0].age).toBe(1);
    expect(r.tieuVans[0].year).toBe(1990);
  });
});

describe('Sửa lỗi có sẵn: cung Phu Thê tính vào điểm quan hệ của đại vận', () => {
  const star = (name: string): StarEntry => ({ name, type: 'cat' } as StarEntry);
  const score = (palace: string) =>
    computeDomainScores([star('Hồng Loan'), star('Thiên Hỷ')], palace, 50, 50, 'binh', false, false).relationship;

  test("cung 'Phu Thê' (tên thật trong lá số) được cộng sao quan hệ như cung quan hệ khác", () => {
    expect(score('Phu Thê')).toBeGreaterThan(score('Mệnh'));   // trước đây Phu Thê không được tính nên bằng cung thường
    expect(score('Phu Thê')).toBe(score('Hôn Nhân'));           // tên gọi cũ vẫn tương đương
  });
});

import { currentAgeOf, lunarBirthYear, tuoiMuOfYear } from '../ageUtil';
import { truePillars } from '../baziPillars';
import { assessDayMasterStrength } from '../batTuStrength';

describe('Tuổi mụ theo NĂM ÂM LỊCH sinh (đồng nhất toàn app)', () => {
  const jan = { ...base, calendarType: 'solar' as const, year: 1990, month: 1, day: 15 };  // 19/12 âm lịch năm Kỷ Tị 1989
  test('người sinh 15/1/1990 (dương) thuộc năm âm lịch 1989', () => {
    expect(lunarBirthYear(jan)).toBe(1989);
    expect(tuoiMuOfYear(jan, 2026)).toBe(38);
    expect(lunarBirthYear({ ...base, calendarType: 'solar', year: 1990, month: 6, day: 15 })).toBe(1990);
    expect(lunarBirthYear({ ...base, calendarType: 'lunar', year: 1990, month: 1, day: 1 })).toBe(1990);
  });
  test('Tiểu vận, tuổi hiện tại và tuổi xem của lá số cùng một quy ước', () => {
    const r = buildResult(jan, 2026);
    expect(currentAgeOf(r, new Date(2026, 5, 1))).toBe(38);
    expect(r.tuViChart.viewingAge).toBe(38);
    expect(r.tieuVans[0]).toMatchObject({ age: 1, year: 1989 });
    expect(r.tieuVans.find(t => t.year === 2026)!.age).toBe(38);
  });
});

describe('Bát Tự lập theo tiết khí + dụng/kỵ thần thống nhất', () => {
  test('trụ năm/tháng của màn Bát Tự = trụ theo tiết khí (không còn tháng âm lịch)', () => {
    for (const [y, m, d] of [[1990, 7, 10], [2000, 2, 3], [2000, 2, 4], [1985, 11, 3], [1991, 1, 10]]) {
      const r = buildResult({ ...base, calendarType: 'solar', year: y, month: m, day: d }, 2026);
      const tp = truePillars(new Date(y, m - 1, d));
      const [yp, mp] = r.batTuChart.pillars;
      expect([yp.stem, yp.branch, mp.stem, mp.branch]).toEqual([tp.yearStem, tp.yearBranch, tp.monthStem, tp.monthBranch]);
    }
    // 10/7/1990: sau Tiểu Thử (7/7) là tháng Mùi (trước đây ra Ngọ do tháng 5 âm lịch)
    expect(buildResult({ ...base, calendarType: 'solar', year: 1990, month: 7, day: 10 }, 2026).batTuChart.pillars[1].branch).toBe('Mùi');
  });
  test('favorableElements của batTuChart = kết quả phù ức dùng cho Nghiệm quá khứ', () => {
    const r = buildResult({ ...base, calendarType: 'solar', year: 1985, month: 6, day: 15 }, 2026);
    const s = assessDayMasterStrength(r.batTuChart.dayMaster, r.batTuChart.pillars);
    expect(r.batTuChart.favorableElements).toEqual(s.favorable);
    expect(r.batTuChart.unfavorableElements).toEqual(s.unfavorable);
  });
});
