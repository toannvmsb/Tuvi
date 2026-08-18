import { genericDayFacts } from '../nhatVan';
import { pickGoodDaysGeneric } from '../dayPicker';

/**
 * Sanity cho chế độ CƠ BẢN (chưa gắn lá số) của "Xem ngày tốt":
 * genericDayFacts (nhatVan.ts) và pickGoodDaysGeneric (dayPicker.ts) đều
 * không cần AstrologyResult — chỉ dùng Trực/Lục Diệu/Hoàng Đạo/28 Tú theo
 * lịch chung.
 */
describe('genericDayFacts', () => {
  it('không crash, trả đủ field, rating hợp lệ cho nhiều ngày', () => {
    const dates = [new Date(2026, 7, 15), new Date(2026, 0, 1), new Date(2027, 5, 20)];
    for (const d of dates) {
      const f = genericDayFacts(d);
      expect(['Rất tốt', 'Tốt', 'Bình thường', 'Cần thận trọng', 'Xấu']).toContain(f.rating);
      expect(f.score100).toBeGreaterThanOrEqual(0);
      expect(f.score100).toBeLessThanOrEqual(100);
      expect(f.reasons.length).toBeGreaterThan(0);
      expect(f.truc).toBeTruthy();
      expect(f.nhi28Tu).toBeTruthy();
    }
  });
});

describe('pickGoodDaysGeneric', () => {
  it('trả kết quả hợp lệ cho 1 việc cụ thể trong 1 tháng, không cần lá số', () => {
    const from = new Date(2026, 7, 1);
    const to = new Date(2026, 7, 31);
    const out = pickGoodDaysGeneric('WORK_IMPORTANT', from, to);
    expect(out.totalDays).toBe(31);
    expect(out.top.length).toBeGreaterThan(0);
    for (const d of out.top) {
      expect(d.score100).toBeGreaterThanOrEqual(40);
      // Chế độ cơ bản: không có hướng/màu/giờ riêng theo lá số.
      expect(d.direction).toBe('');
      expect(d.goodColor).toBe('');
      expect(d.bestHours).toEqual([]);
    }
  });

  it('báo lỗi rõ ràng khi mã việc không tồn tại hoặc khoảng ngày ngược', () => {
    const from = new Date(2026, 7, 1);
    const to = new Date(2026, 7, 31);
    expect(pickGoodDaysGeneric('KHONG_TON_TAI', from, to).warning).toBeTruthy();
    expect(pickGoodDaysGeneric('WORK_IMPORTANT', to, from).warning).toBeTruthy();
  });
});
