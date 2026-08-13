import { getSolarTermDate, nextSolarTermOnOrAfter, SOLAR_TERM_NAMES } from '../solarTerms';
import { getSunLongitudeDeg } from '../lunarCalendar';

function jdFromDate(dd: number, mm: number, yy: number): number {
  const a = Math.floor((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  if (jd < 2299161) jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
  return jd;
}

describe('solarTerms', () => {
  it('có đủ 24 tên tiết khí', () => {
    expect(SOLAR_TERM_NAMES.length).toBe(24);
  });

  // jdn nguyên đại diện cho THỜI ĐIỂM 0h (giờ VN) bắt đầu ngày đó trong getSunLongitudeDeg — nên
  // ngày ĐÚNG của 1 tiết khí là ngày mà mặt trời CHƯA đạt mốc góc lúc 0h đầu ngày, nhưng ĐÃ đạt
  // (hoặc vượt) mốc góc đó lúc 0h đầu ngày HÔM SAU — tức thời điểm giao cắt thật nằm trong
  // khoảng [0h ngày đó, 0h ngày hôm sau). Đây là định nghĩa chuẩn (không phải "gần mốc góc nhất").
  it('mỗi tiết khí chọn đúng NGÀY CHỨA thời điểm mặt trời đạt mốc góc (0h đầu ngày chưa tới, 0h hôm sau đã qua)', () => {
    for (let i = 0; i < 24; i++) {
      const sd = getSolarTermDate(i, 2026);
      const jd = jdFromDate(sd.day, sd.month, sd.year);
      const target = (315 + 15 * i) % 360;
      const signedDiff = (jdCheck: number) => {
        const v = getSunLongitudeDeg(jdCheck, 7);
        return (((target - v) + 540) % 360) - 180; // >0 = chưa tới mốc, <0 = đã qua mốc
      };
      expect(signedDiff(jd)).toBeGreaterThanOrEqual(0);   // đầu ngày này: chưa đạt mốc
      expect(signedDiff(jd + 1)).toBeLessThanOrEqual(0);  // đầu ngày sau: đã đạt/qua mốc
    }
  });

  it.each([
    [3, 'Xuân Phân', 3, [19, 22]],
    [9, 'Hạ Chí', 6, [20, 22]],
    [15, 'Thu Phân', 9, [21, 24]],
    [21, 'Đông Chí', 12, [20, 23]],
  ])('tiết khí index %i (%s) rơi vào tháng %i, ngày trong khoảng %s cho nhiều năm liên tiếp', (idx, _name, month, [dMin, dMax]) => {
    for (const year of [2024, 2025, 2026, 2027, 2028]) {
      const sd = getSolarTermDate(idx as number, year);
      expect(sd.month).toBe(month);
      expect(sd.day).toBeGreaterThanOrEqual(dMin);
      expect(sd.day).toBeLessThanOrEqual(dMax);
    }
  });

  it('Tiểu Hàn/Đại Hàn (index 22-23) của "năm Y" rơi vào tháng 1 của năm Y+1', () => {
    const tieuHan = getSolarTermDate(22, 2025);
    const daiHan = getSolarTermDate(23, 2025);
    expect(tieuHan.year).toBe(2026);
    expect(tieuHan.month).toBe(1);
    expect(daiHan.year).toBe(2026);
    expect(daiHan.month).toBe(1);
  });

  it('24 tiết khí liên tiếp trong 1 chu kỳ cách nhau 13-17 ngày (tốc độ mặt trời không đều)', () => {
    const dates = Array.from({ length: 24 }, (_, i) => {
      const sd = getSolarTermDate(i, 2026);
      return jdFromDate(sd.day, sd.month, sd.year);
    });
    for (let i = 1; i < dates.length; i++) {
      const gap = dates[i] - dates[i - 1];
      expect(gap).toBeGreaterThanOrEqual(13);
      expect(gap).toBeLessThanOrEqual(17);
    }
  });

  it('nextSolarTermOnOrAfter luôn trả về ngày >= from và trong vòng 1 năm tới', () => {
    const from = new Date(2026, 0, 15); // 15/1/2026
    for (let i = 0; i < 24; i++) {
      const d = nextSolarTermOnOrAfter(i, from);
      expect(d.getTime()).toBeGreaterThanOrEqual(new Date(2026, 0, 15).getTime());
      const daysAhead = (d.getTime() - from.getTime()) / 86400000;
      expect(daysAhead).toBeLessThanOrEqual(370);
    }
  });

  it('nextSolarTermOnOrAfter cho đúng dịp Tết Dương lịch chuyển giao Đông Chí -> Tiểu Hàn', () => {
    // Đông Chí (~21/12) vừa qua vài ngày trước — Tiểu Hàn (~5-6/1) phải là tiết khí gần nhất tiếp theo.
    const from = new Date(2025, 11, 25); // 25/12/2025
    const next = nextSolarTermOnOrAfter(22, from); // Tiểu Hàn
    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(0); // January
    expect(next.getDate()).toBeGreaterThanOrEqual(4);
    expect(next.getDate()).toBeLessThanOrEqual(7);
  });
});
