import { solarToLunar, lunarToSolar } from '../lunarCalendar';

/**
 * Regression cho 3 bug thực tế phát hiện khi anh Toàn báo mùng 1 tháng 7 âm
 * 2026 tính sai (12/8 Thứ 4 thay vì đúng phải 13/8 Thứ 5):
 *
 * 1. `getNewMoonDay` dùng công thức Sóc RÚT GỌN (~14 số hạng, bản Hồ Ngọc Đức
 *    2004 / Meeus bản 1) — lệch tới ~40 PHÚT so với thời điểm Sóc thật ở một số
 *    kỳ trăng, đủ để LẬT NGÀY khi Sóc rơi sát nửa đêm giờ VN. Đã nâng cấp lên
 *    bảng ĐẦY ĐỦ (Meeus "Astronomical Algorithms" bản 2, chương 49, ~40 số
 *    hạng) — kiểm chứng bằng Sóc nhật thực 12/8/2026 17:37 UTC (thời điểm biết
 *    chính xác vì trùng nhật thực) và nhiều lịch vạn niên độc lập.
 * 2. `lunarToSolar` LUÔN lấy mốc "tháng 11" theo `lunarYear`/`lunarYear+1` bất
 *    kể tháng đang chuyển đổi — đúng ra với tháng 1–10 phải dùng
 *    `lunarYear-1`/`lunarYear` (tháng 11 âm của năm dương liền trước). Gây lệch
 *    NGUYÊN 1 NĂM cho phần lớn các tháng (1–10).
 * 3. `lunarToSolar` tính nhãn "tháng nhuận" (`leapMonth`) sai công thức, lệch 1
 *    tháng so với cách `solarToLunar` gán nhãn tháng nhuận — khiến chuyển đổi
 *    Âm→Dương cho đúng tháng nhuận ra sai hẳn 1 tháng âm lịch.
 */
describe('lunarCalendar', () => {
  it('mùng 1 tháng 7 âm 2026 đúng là 13/8/2026 (Thứ Năm) — không phải 12/8 (Thứ Tư)', () => {
    const l12 = solarToLunar(12, 8, 2026);
    const l13 = solarToLunar(13, 8, 2026);
    expect(l13.day).toBe(1);
    expect(l13.month).toBe(7);
    expect(l13.isLeapMonth).toBe(false);
    // 12/8 phải còn là ngày cuối tháng 6 âm (không phải mùng 1 tháng 7).
    expect(l12.month).toBe(6);
  });

  it('round-trip solarToLunar <-> lunarToSolar khớp 100% cho nhiều mốc mỗi năm 1950-2060 (kể cả tháng nhuận)', () => {
    let mismatches = 0;
    for (let y = 1950; y <= 2060; y++) {
      for (const [d, m] of [[1, 1], [15, 3], [1, 6], [30, 6], [15, 9], [31, 12]]) {
        const l = solarToLunar(d, m, y);
        const back = lunarToSolar(l.day, l.month, l.year, l.isLeapMonth);
        if (back.day !== d || back.month !== m || back.year !== y) mismatches++;
      }
    }
    expect(mismatches).toBe(0);
  });

  it('lunarToSolar cho tháng 1-10 dùng đúng năm dương liền trước cho mốc tháng 11', () => {
    // Ví dụ cụ thể: mùng 1 tháng 6 âm 2026 phải là 14/7/2026 (đã kiểm chứng qua
    // solarToLunar), KHÔNG được lệch sang năm 2027.
    const sd = lunarToSolar(1, 6, 2026, false);
    expect(sd.year).toBe(2026);
    expect(sd.month).toBe(7);
    expect(sd.day).toBe(14);
  });

  it('Tết (mùng 1 tháng 1 âm) khớp các năm đã biết', () => {
    const knownTet: Array<[number, number, number]> = [
      [10, 2, 2024], // Giáp Thìn
      [29, 1, 2025], // Ất Tỵ
      [17, 2, 2026], // Bính Ngọ
    ];
    for (const [d, m, y] of knownTet) {
      const l = solarToLunar(d, m, y);
      expect(l.day).toBe(1);
      expect(l.month).toBe(1);
    }
  });
});
