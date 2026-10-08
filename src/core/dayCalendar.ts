/**
 * LỊCH PHÁP CỦA MỘT NGÀY (tầng "calendar-core" của đặc tả engine ngày đẹp — Tuzi_Nghien_cuu_va_dac_ta_engine §4, §8.2).
 *
 * Tách riêng việc LẤY DỮ KIỆN LỊCH khỏi việc luận cát/hung:
 *  - Tháng dùng cho Trực (Kiến Trừ), Hoàng/Hắc đạo ngày, Nguyệt phá, Nguyệt đức/Thiên đức, vượng-suy theo mùa
 *    là THÁNG TIẾT KHÍ (đổi ở 12 "tiết": Lập Xuân → Dần …), KHÔNG phải tháng âm lịch.
 *    (Trước 07/10/2026 app dùng tháng âm lịch cho các việc này → Trực/Hoàng Đạo/Nguyệt phá lệch ở ~nửa số ngày.)
 *  - Năm của lưu niên (Thái Tuế) theo Lập Xuân; "tuổi"/Tam Tai theo năm ÂM LỊCH (thói quen dân gian, đúng với phần còn lại của app).
 *  - Độ phân giải theo NGÀY (bỏ qua giờ phút giao tiết) — giống truePillars; ngày giao tiết dùng tháng MỚI.
 */
import type { EarthlyBranch, HeavenlyStem } from '../types';
import { getSolarTermDate } from './solarTerms';
import { lunarOfSolar } from './lunarFast';

export const STEMS: HeavenlyStem[] = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
export const BRANCHES: EarthlyBranch[] = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tị', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];

export function jdFromDate(dd: number, mm: number, yy: number): number {
  const a = Math.floor((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  if (jd < 2299161) jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
  return jd;
}

export interface DayCalendarFacts {
  /** Chi của THÁNG TIẾT KHÍ chứa ngày này (Dần = từ Lập Xuân …). */
  monthBranch: EarthlyBranch;
  /** 0 = tháng Dần … 11 = tháng Sửu. */
  monthIdx: number;
  /** Ngày này là ngày giao tiết (tháng tiết khí đổi so với hôm trước). */
  isJieDay: boolean;
  /** Năm Bát Tự (đổi ở Lập Xuân) và can/chi của nó — dùng cho lưu niên / Thái Tuế của ngày. */
  baziYear: number;
  yearStem: HeavenlyStem;
  yearBranch: EarthlyBranch;
  /** Ngày/tháng/năm ÂM lịch (Lục Diệu, Tam Nương, Nguyệt kỵ, Tam Tai theo năm âm). */
  lunarDay: number;
  lunarMonth: number;
  lunarYear: number;
  lunarLeap: boolean;
  /** Chi của năm âm lịch (cùng nghĩa với "tuổi" của người sinh). */
  lunarYearBranch: EarthlyBranch;
}

/** 12 "tiết" mở tháng Bát Tự (Lập Xuân … Tiểu Hàn): chỉ số trong SOLAR_TERM_NAMES, thứ tự tháng Dần … Sửu. */
const TIET_INDEX = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
const MONTH_BRANCH_BY_K: EarthlyBranch[] = ['Dần', 'Mão', 'Thìn', 'Tị', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi', 'Tý', 'Sửu'];

/** Ngày (yyyymmdd) 12 tiết của một năm dương — tính một lần/năm (getSolarTermDate khá tốn). */
const jieByYear = new Map<number, number[]>();
function jieKeys(year: number): number[] {
  let v = jieByYear.get(year);
  if (!v) {
    v = TIET_INDEX.map(idx => { const d = getSolarTermDate(idx, year); return d.year * 10000 + d.month * 100 + d.day; });
    jieByYear.set(year, v);
  }
  return v;
}

/** Tháng tiết khí chứa ngày yyyymmdd: tiết gần nhất không sau ngày đó (k = 0 Dần … 11 Sửu) + năm Bát Tự (đổi ở Lập Xuân). */
function jieMonthOf(y: number, key: number): { k: number; baziYear: number } {
  let best = -1, bestK = 11;
  for (const yy of [y - 1, y, y + 1]) {
    jieKeys(yy).forEach((kk, k) => { if (kk <= key && kk > best) { best = kk; bestK = k; } });
  }
  const baziYear = key < jieKeys(y)[0] ? y - 1 : y;
  return { k: bestK, baziYear };
}

const cache = new Map<number, DayCalendarFacts>();
const keyOf = (d: Date) => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();

export function dayCalendarFacts(date: Date): DayCalendarFacts {
  const key = keyOf(date);
  const hit = cache.get(key);
  if (hit) return hit;

  const day0 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const y = day0.getFullYear();
  const cur = jieMonthOf(y, key);
  const prevDay = new Date(y, day0.getMonth(), day0.getDate() - 1);
  const prev = jieMonthOf(prevDay.getFullYear(), keyOf(prevDay));
  const ld = lunarOfSolar(day0);
  const facts: DayCalendarFacts = {
    monthBranch: MONTH_BRANCH_BY_K[cur.k],
    monthIdx: cur.k,
    isJieDay: prev.k !== cur.k,
    baziYear: cur.baziYear,
    yearStem: STEMS[(((cur.baziYear + 6) % 10) + 10) % 10],
    yearBranch: BRANCHES[(((cur.baziYear + 8) % 12) + 12) % 12],
    lunarDay: ld.day,
    lunarMonth: ld.month,
    lunarYear: ld.year,
    lunarLeap: !!ld.isLeapMonth,
    lunarYearBranch: BRANCHES[(((ld.year - 4) % 12) + 12) % 12],
  };
  if (cache.size > 4000) cache.clear();
  cache.set(key, facts);
  return facts;
}
