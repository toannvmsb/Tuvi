/**
 * Đổi dương → âm NHANH cho các vòng lặp theo ngày (engine sự kiện, dayCalendarFacts).
 * solarToLunar tính thiên văn (Sóc, kinh độ Mặt Trời) nên tốn; ở đây: (1) nhớ kết quả theo ngày; (2) nếu NGÀY HÔM TRƯỚC đã biết và ở ngày âm < 29
 * thì hôm nay chỉ là ngày kế (cùng tháng, cùng năm, cùng cờ nhuận) vì mọi tháng âm đều dài ≥ 29 ngày. Kết quả luôn GIỐNG solarToLunar.
 */
import { solarToLunar } from './lunarCalendar';

export interface LunarLite { year: number; month: number; day: number; isLeapMonth?: boolean }
const memo = new Map<number, LunarLite>();
const keyOf = (y: number, m: number, d: number) => y * 10000 + m * 100 + d;

export function lunarOfSolar(date: Date): LunarLite {
  const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
  const key = keyOf(y, m, d);
  const hit = memo.get(key);
  if (hit) return hit;
  const pd = new Date(y, m - 1, d - 1);
  const prev = memo.get(keyOf(pd.getFullYear(), pd.getMonth() + 1, pd.getDate()));
  const ld: LunarLite = prev && prev.day < 29 ? { ...prev, day: prev.day + 1 } : solarToLunar(d, m, y);
  if (memo.size > 30000) memo.clear();
  memo.set(key, ld);
  return ld;
}
