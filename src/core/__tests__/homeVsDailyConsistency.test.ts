import { buildNguyetVanCharts } from '../nguyetVanCharts';
import { buildMonthHeatmap } from '../dailyPeriodService';
import { currentAgeOf } from '../ageUtil';
import { solarToLunar } from '../lunarCalendar';
import { allSampleResults } from './fixtures';

/**
 * Regression cho bug thực tế: Home ("Nhịp tháng này", dùng buildNguyetVanCharts
 * theo tháng ÂM) từng lệch hẳn 1 NĂM so với màn Xem theo ngày (buildMonthHeatmap,
 * theo tháng DƯƠNG trực tiếp) cho CÙNG một ngày thật — do lunarToSolar() trong
 * repo nhận tham số năm theo quy ước LỆCH 1 năm cho tháng 1–10 (đã sửa ở
 * lunarMonthRange). Test này ép buộc 2 pipeline phải ra CÙNG NGÀY DƯƠNG, CÙNG
 * ĐIỂM, CÙNG MÀU cho "hôm nay" — không chỉ tự nhất quán nội bộ như
 * nguyetVanChartsLunarAccuracy.test.ts (test đó không phát hiện được bug lệch
 * năm vì không đối chiếu với ngày dương thật).
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
