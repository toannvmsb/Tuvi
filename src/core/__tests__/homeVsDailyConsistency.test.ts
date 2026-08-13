import { buildNguyetVanCharts } from '../nguyetVanCharts';
import { buildMonthHeatmap } from '../dailyPeriodService';
import { currentAgeOf } from '../ageUtil';
import { solarToLunar } from '../lunarCalendar';
import { allSampleResults } from './fixtures';

/**
 * Regression cho bug thực tế: Home ("Nhịp tháng này", dùng buildNguyetVanCharts
 * theo tháng ÂM) từng lệch hẳn 1 NĂM so với màn Xem theo ngày (buildMonthHeatmap,
 * theo tháng DƯƠNG trực tiếp) cho CÙNG một ngày thật — do bug GỐC trong
 * `lunarToSolar()` (lunarCalendar.ts): luôn lấy mốc "tháng 11" theo
 * `lunarYear`/`lunarYear+1` bất kể tháng đang chuyển, đúng ra phải dùng
 * `lunarYear-1`/`lunarYear` cho các tháng 1–10. Từng được PATCH TẠM ở
 * `lunarMonthRange` (bù trừ năm truyền vào) thay vì sửa tận gốc; nay bug gốc đã
 * được sửa thẳng trong `lunarToSolar()` nên patch tạm đó đã được gỡ bỏ. Test
 * này ép buộc 2 pipeline phải ra CÙNG NGÀY DƯƠNG, CÙNG ĐIỂM, CÙNG MÀU cho "hôm
 * nay" — không chỉ tự nhất quán nội bộ như nguyetVanChartsLunarAccuracy.test.ts
 * (test đó không phát hiện được bug lệch năm vì không đối chiếu với ngày dương
 * thật).
 */
describe('Home (Nguyệt Vận theo tuổi thật) khớp Xem theo ngày (theo dương lịch) cho hôm nay', () => {
  it('cùng ngày → cùng date/score/tone cho cả 3 lá số mẫu', () => {
    const now = new Date();
    const nowLunar = solarToLunar(now.getDate(), now.getMonth() + 1, now.getFullYear());

    for (const result of allSampleResults()) {
      const age = currentAgeOf(result, now);
      const homeData = buildNguyetVanCharts(result, age, nowLunar.month);
      const dailyData = buildMonthHeatmap(result, now.getFullYear(), now.getMonth() + 1);

      const homeToday = homeData?.days.find(d => d.lunarDay === nowLunar.day);
      const dailyToday = dailyData.days.find(d => d.day === now.getDate());

      expect(homeToday).toBeDefined();
      expect(dailyToday).toBeDefined();
      expect(homeToday?.date).toBe(dailyToday?.date);
      expect(homeToday?.score).toBe(dailyToday?.score);
      expect(homeToday?.tone).toBe(dailyToday?.tone);
    }
  });
});
