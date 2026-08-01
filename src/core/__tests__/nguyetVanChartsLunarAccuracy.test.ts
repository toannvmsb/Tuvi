import { buildNguyetVanCharts } from '../nguyetVanCharts';
import { solarToLunar } from '../lunarCalendar';
import { allSampleResults } from './fixtures';

/**
 * Regression cho bug thực tế: Home (dùng buildNguyetVanCharts) từng hiện màu
 * KHÁC với màn Xem theo ngày (dùng solarToLunar trực tiếp) cho CÙNG 1 ngày —
 * do lunarMonthRange suy độ dài tháng bằng phép trừ, bị lệch khi có tháng
 * nhuận cùng số chen giữa. Test này khẳng định mỗi `lunarDay` trong
 * buildNguyetVanCharts().days luôn khớp CHÍNH XÁC với solarToLunar thật.
 */
describe('buildNguyetVanCharts — lunarDay phải khớp 100% solarToLunar thật', () => {
  it('quét tuổi 1..40, tháng 1..12 cho cả 3 lá số mẫu — không có sai lệch nào', () => {
    const mismatches: string[] = [];
    for (const result of allSampleResults()) {
      for (let age = 1; age <= 40; age++) {
        for (let month = 1; month <= 12; month++) {
          const data = buildNguyetVanCharts(result, age, month);
          if (!data) continue;
          for (const d of data.days) {
            const [y, m, dd] = d.date.split('-').map(Number);
            const real = solarToLunar(dd, m, y);
            if (real.day !== d.lunarDay || real.month !== data.month || real.isLeapMonth) {
              mismatches.push(`age=${age} month=${month} date=${d.date} claimedLunarDay=${d.lunarDay} realLunar=${real.day}/${real.month}${real.isLeapMonth ? 'n' : ''}`);
            }
          }
        }
      }
    }
    expect(mismatches).toEqual([]);
  });
});
