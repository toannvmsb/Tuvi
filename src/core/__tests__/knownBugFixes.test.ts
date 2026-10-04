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
