/**
 * Solar ↔ Vietnamese Lunar Calendar conversion
 * Based on the astronomical algorithm by Ho Ngoc Duc (2004)
 * Timezone: UTC+7 (Vietnam)
 */

import type { LunarDate, SolarDate, HeavenlyStem, EarthlyBranch } from '../types';
import { STEMS, BRANCHES, getStemByIndex, getBranchByIndex } from '../data/napAm';

const TIME_ZONE = 7; // UTC+7

function jdFromDate(dd: number, mm: number, yy: number): number {
  const a = Math.floor((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  if (jd < 2299161) {
    jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
  }
  return jd;
}

function jdToDate(jd: number): SolarDate {
  let a: number, b: number, c: number;
  if (jd > 2299160) {
    a = jd + 32044;
    b = Math.floor((4 * a + 3) / 146097);
    c = a - Math.floor((146097 * b) / 4);
  } else {
    b = 0;
    c = jd + 32082;
  }
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);
  return { year, month, day };
}

/**
 * Thời điểm Sóc (New Moon) — dùng bảng số hạng hiệu chỉnh ĐẦY ĐỦ theo Jean Meeus,
 * "Astronomical Algorithms" bản 2, chương 49 (~40 số hạng), THAY cho bản rút gọn cũ
 * (~14 số hạng, bản 1 chương 47 — vốn là công thức gốc của Hồ Ngọc Đức 2004).
 *
 * Lý do đổi: phát hiện thực tế bản rút gọn có thể lệch tới ~40 PHÚT so với thời điểm
 * Sóc thật ở một số kỳ trăng cụ thể (kiểm chứng bằng Sóc nhật thực 12/8/2026, 17:37
 * UTC — bản rút gọn cho 16:55 UTC, lệch 42 phút). Sai số này đủ lớn để LẬT NGÀY khi
 * thời điểm Sóc rơi sát nửa đêm giờ Việt Nam, gây tính sai mùng 1 tháng âm (bug thực
 * tế: mùng 1 tháng 7 âm 2026 tính ra rơi vào 12/8 (Thứ 4) trong khi đúng phải là 13/8
 * (Thứ 5) — kiểm chứng chéo với nhiều lịch vạn niên độc lập).
 *
 * `k` vẫn giữ NGUYÊN hệ quy chiếu cũ (mốc 1900, dùng xuyên suốt các hàm khác trong
 * file này — getLunarMonth11, getLeapMonthOffset, solarToLunar, lunarToSolar — KHÔNG
 * đổi gì ở các hàm đó) — chỉ quy đổi sang hệ k của Meeus bản 2 (mốc 2000) NGAY TRONG
 * hàm này bằng độ lệch cố định 1237 tuần trăng (kiểm chứng bằng số học: khoảng cách
 * 2 mốc epoch đúng bằng 1236.99999725 tuần trăng — làm tròn 1237 sai số ~7ms, không
 * đáng kể).
 */
function getNewMoonDay(k: number, timeZone: number): number {
  const dr = Math.PI / 180;

  // delta-T (chênh lệch giờ động lực TT so với UT) — vẫn dùng công thức cũ (khớp T
  // theo mốc 1900 mà công thức này được Meeus khớp số liệu), sai số ~30 giây so với
  // delta-T thực tế năm 2026 — không đáng kể so với việc thêm đủ số hạng hiệu chỉnh
  // Sóc bên dưới (vốn là nguồn sai số ~40 phút cần khắc phục).
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  let delT: number;
  if (T < -11) {
    delT = 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3;
  } else {
    delT = -0.000278 + 0.000265 * T + 0.000262 * T2;
  }

  const km = k - 1237; // quy đổi sang hệ k mốc 2000 của Meeus bản 2
  const Tm = km / 1236.85;
  const Tm2 = Tm * Tm;
  const Tm3 = Tm2 * Tm;
  const Tm4 = Tm3 * Tm;

  const JDE = 2451550.09766 + 29.530588861 * km + 0.00015437 * Tm2 - 0.000000150 * Tm3 + 0.00000000073 * Tm4;
  const E = 1 - 0.002516 * Tm - 0.0000074 * Tm2;
  const Ms = 2.5534 + 29.10535670 * km - 0.0000014 * Tm2 - 0.00000011 * Tm3; // Sun mean anomaly
  const Mp = 201.5643 + 385.81693528 * km + 0.0107582 * Tm2 + 0.00001238 * Tm3 - 0.000000058 * Tm4; // Moon mean anomaly
  const F = 160.7108 + 390.67050284 * km - 0.0016118 * Tm2 - 0.00000227 * Tm3 + 0.000000011 * Tm4; // Moon arg. of latitude
  const Om = 124.7746 - 1.56375588 * km + 0.0020672 * Tm2 + 0.00000215 * Tm3; // longitude of ascending node

  const A1 = 299.77 + 0.107408 * km - 0.009173 * Tm2;
  const A2 = 251.88 + 0.016321 * km;
  const A3 = 251.83 + 26.651886 * km;
  const A4 = 349.42 + 36.412478 * km;
  const A5 = 84.66 + 18.206239 * km;
  const A6 = 141.74 + 53.303771 * km;
  const A7 = 207.14 + 2.453732 * km;
  const A8 = 154.84 + 7.306860 * km;
  const A9 = 34.52 + 27.261239 * km;
  const A10 = 207.19 + 0.121824 * km;
  const A11 = 291.34 + 1.844379 * km;
  const A12 = 161.72 + 24.198154 * km;
  const A13 = 239.56 + 25.513099 * km;
  const A14 = 331.55 + 3.592518 * km;

  const sin = (deg: number) => Math.sin(deg * dr);

  let corr = -0.40720 * sin(Mp);
  corr += 0.17241 * E * sin(Ms);
  corr += 0.01608 * sin(2 * Mp);
  corr += 0.01039 * sin(2 * F);
  corr += 0.00739 * E * sin(Mp - Ms);
  corr -= 0.00514 * E * sin(Mp + Ms);
  corr += 0.00208 * E * E * sin(2 * Ms);
  corr -= 0.00111 * sin(Mp - 2 * F);
  corr -= 0.00057 * sin(Mp + 2 * F);
  corr += 0.00056 * E * sin(2 * Mp + Ms);
  corr -= 0.00042 * sin(3 * Mp);
  corr += 0.00042 * E * sin(Ms + 2 * F);
  corr += 0.00038 * E * sin(Ms - 2 * F);
  corr -= 0.00024 * E * sin(2 * Mp - Ms);
  corr -= 0.00017 * sin(Om);
  corr -= 0.00007 * sin(Mp + 2 * Ms);
  corr += 0.00004 * sin(2 * Mp - 2 * F);
  corr += 0.00004 * sin(3 * Ms);
  corr += 0.00003 * sin(Mp + Ms - 2 * F);
  corr += 0.00003 * sin(2 * Mp + 2 * F);
  corr -= 0.00003 * sin(Mp + Ms + 2 * F);
  corr += 0.00003 * sin(Mp - Ms + 2 * F);
  corr -= 0.00002 * sin(Mp - Ms - 2 * F);
  corr -= 0.00002 * sin(3 * Mp + Ms);
  corr += 0.00002 * sin(4 * Mp);

  let addl = 0.000325 * sin(A1);
  addl += 0.000165 * sin(A2);
  addl += 0.000164 * sin(A3);
  addl += 0.000126 * sin(A4);
  addl += 0.000110 * sin(A5);
  addl += 0.000062 * sin(A6);
  addl += 0.000060 * sin(A7);
  addl += 0.000056 * sin(A8);
  addl += 0.000047 * sin(A9);
  addl += 0.000042 * sin(A10);
  addl += 0.000040 * sin(A11);
  addl += 0.000037 * sin(A12);
  addl += 0.000035 * sin(A13);
  addl += 0.000023 * sin(A14);

  const JdNew = JDE + corr + addl - delT;
  return Math.floor(JdNew + 0.5 + timeZone / 24);
}

/**
 * Kinh độ mặt trời trên hoàng đạo (độ, 0-360) tại thời điểm jdn — công thức Hồ Ngọc Đức.
 * Export riêng (khác `getSunLongitude` bucket 0-11 bên dưới) để `core/solarTerms.ts` dùng
 * tính CHÍNH XÁC ngày 24 tiết khí (mỗi tiết = mốc kinh độ cố định, cách nhau 15°).
 */
export function getSunLongitudeDeg(jdn: number, timeZone: number): number {
  // Theo thuật toán Hồ Ngọc Đức — bản gốc Java
  const T = (jdn - 2451545.5 - timeZone / 24) / 36525;
  const T2 = T * T;
  const dr = Math.PI / 180;
  const M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  // Bug fix: 3 thành phần DL là cộng (additive), KHÔNG nhân chuỗi như cũ
  let DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
  DL += (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M);
  DL += 0.000290 * Math.sin(dr * 3 * M);
  let L = L0 + DL;
  L = L * dr;
  L = L - Math.PI * 2 * Math.floor(L / (Math.PI * 2));
  return L / dr; // radian → độ
}

function getSunLongitude(jdn: number, timeZone: number): number {
  const dr = Math.PI / 180;
  const L = getSunLongitudeDeg(jdn, timeZone) * dr;
  return Math.floor(L / Math.PI * 6);
}

function getLunarMonth11(yy: number, timeZone: number): number {
  const off = jdFromDate(31, 12, yy) - 2415021;
  const k = Math.floor(off / 29.530588853);
  let nm = getNewMoonDay(k, timeZone);
  const sunLong = getSunLongitude(nm, timeZone);
  if (sunLong >= 9) nm = getNewMoonDay(k - 1, timeZone);
  return nm;
}

function getLeapMonthOffset(a11: number, timeZone: number): number {
  const k = Math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last = 0;
  let i = 1;
  let arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
  do {
    last = arc;
    i++;
    arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
  } while (arc !== last && i < 14);
  return i - 1;
}

export function solarToLunar(dd: number, mm: number, yy: number): LunarDate {
  const dayNumber = jdFromDate(dd, mm, yy);
  const k = Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
  let monthStart = getNewMoonDay(k + 1, TIME_ZONE);
  if (monthStart > dayNumber) monthStart = getNewMoonDay(k, TIME_ZONE);
  let a11 = getLunarMonth11(yy, TIME_ZONE);
  let b11 = a11;
  let lunarYear: number;
  if (a11 >= monthStart) {
    lunarYear = yy;
    a11 = getLunarMonth11(yy - 1, TIME_ZONE);
  } else {
    lunarYear = yy + 1;
    b11 = getLunarMonth11(yy + 1, TIME_ZONE);
  }
  const lunarDay = dayNumber - monthStart + 1;
  const diff = Math.floor((monthStart - a11) / 29);
  let isLeapMonth = false;
  let lunarMonth = diff + 11;
  if (b11 - a11 > 365) {
    const leapMonthDiff = getLeapMonthOffset(a11, TIME_ZONE);
    if (diff >= leapMonthDiff) {
      lunarMonth = diff + 10;
      if (diff === leapMonthDiff) isLeapMonth = true;
    }
  }
  if (lunarMonth > 12) lunarMonth -= 12;
  if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;

  // Determine year stem and branch
  const yearStemIdx = (lunarYear + 6) % 10;
  const yearBranchIdx = (lunarYear + 8) % 12;

  return {
    year: lunarYear,
    month: lunarMonth,
    day: lunarDay,
    isLeapMonth,
    yearStem: getStemByIndex(yearStemIdx),
    yearBranch: getBranchByIndex(yearBranchIdx),
  };
}

export function lunarToSolar(lunarDay: number, lunarMonth: number, lunarYear: number, isLeapMonth: boolean): SolarDate {
  // BUG ĐÃ SỬA: `getLunarMonth11(yy)` trả về tháng 11 âm lịch rơi vào cuối năm DƯƠNG
  // lịch `yy` — tháng đó là "tháng 11" của năm ÂM LỊCH `yy` (nếu lunarMonth đang xét
  // là 11 hoặc 12) nhưng lại là "tháng 11" của năm âm lịch `yy - 1` (nếu lunarMonth
  // đang xét là 1-10, vì tháng Giêng...tháng 10 âm của năm `yy` nằm SAU tháng 11 âm
  // của năm dương `yy - 1`, chưa tới tháng 11 âm của năm dương `yy`). Code cũ LUÔN
  // lấy mốc theo `lunarYear`/`lunarYear+1`, đúng cho tháng 11-12 nhưng SAI cho tháng
  // 1-10 (đa số các tháng) — khiến kết quả lệch nguyên 1 năm dương lịch. Đây chính
  // là công thức gốc chuẩn của Hồ Ngọc Đức (có rẽ nhánh theo lunarMonth < 11).
  const [a11, b11] = lunarMonth < 11
    ? [getLunarMonth11(lunarYear - 1, TIME_ZONE), getLunarMonth11(lunarYear, TIME_ZONE)]
    : [getLunarMonth11(lunarYear, TIME_ZONE), getLunarMonth11(lunarYear + 1, TIME_ZONE)];
  const k = Math.floor(0.5 + (a11 - 2415021.076998695) / 29.530588853);
  let off = lunarMonth - 11;
  if (off < 0) off += 12;
  if (b11 - a11 > 365) {
    const leapOff = getLeapMonthOffset(a11, TIME_ZONE);
    // BUG ĐÃ SỬA: công thức đúng (khớp với cách solarToLunar gán nhãn tháng nhuận
    // qua `lunarMonth = diff + 10` khi `diff === leapMonthDiff`) là `leapOff - 2`
    // (mod 12) — code cũ dùng `leapOff + 11`/`leapOff - 1`, lệch đúng 1 tháng, khiến
    // lunarToSolar nhận nhầm tháng nhuận là tháng kế tiếp/trước đó.
    let leapMonth = leapOff - 2;
    if (leapMonth <= 0) leapMonth += 12;
    if (isLeapMonth && lunarMonth !== leapMonth) {
      // error: not a leap month
    } else if (isLeapMonth || off >= leapOff) {
      off += 1;
    }
  }
  const monthStart = getNewMoonDay(k + off, TIME_ZONE);
  return jdToDate(monthStart + lunarDay - 1);
}

export function getHourBranchIndex(hour: number): number {
  // 0=Tý(23-1), 1=Sửu(1-3), 2=Dần(3-5), ..., 11=Hợi(21-23)
  return Math.floor(((hour + 1) % 24) / 2);
}

export function getHourBranch(hour: number): EarthlyBranch {
  return getBranchByIndex(getHourBranchIndex(hour));
}

// Get year Can Chi from a given solar year
export function getYearCanChi(solarYear: number): { stem: HeavenlyStem; branch: EarthlyBranch } {
  const stemIdx = (solarYear + 6) % 10;
  const branchIdx = (solarYear + 8) % 12;
  return {
    stem: getStemByIndex(stemIdx),
    branch: getBranchByIndex(branchIdx),
  };
}

// Get day Can Chi from Julian Day Number
export function getDayCanChi(jd: number): { stem: HeavenlyStem; branch: EarthlyBranch } {
  const stemIdx = (jd + 9) % 10;
  const branchIdx = (jd + 1) % 12;
  return {
    stem: getStemByIndex(stemIdx),
    branch: getBranchByIndex(branchIdx),
  };
}
