/**
 * 24 TIẾT KHÍ — tính CHÍNH XÁC bằng thiên văn (không dùng bảng ngày xấp xỉ cố định).
 *
 * Mỗi tiết khí ứng với 1 mốc kinh độ mặt trời cố định trên hoàng đạo, cách nhau đúng 15°
 * (Xuân Phân = 0°, Lập Xuân = 315°, ...). Thuật toán: dò nhị phân quanh 1 ngày xấp xỉ (chỉ
 * dùng làm điểm khởi đầu tìm kiếm, KHÔNG phải kết quả) để tìm ngày mặt trời cắt đúng mốc góc đó,
 * dùng chung công thức kinh độ mặt trời Hồ Ngọc Đức đã có sẵn trong `lunarCalendar.ts`
 * (`getSunLongitudeDeg`) — cùng 1 nguồn thiên văn với lịch âm của app, không tính lại từ đầu.
 */
import type { SolarDate } from '../types';
import { getSunLongitudeDeg } from './lunarCalendar';

const TIME_ZONE = 7; // UTC+7

// 24 tên tiết khí, thứ tự Lập Xuân trước (quy ước phổ biến trong lịch Việt Nam).
export const SOLAR_TERM_NAMES = [
  'Lập Xuân', 'Vũ Thủy', 'Kinh Trập', 'Xuân Phân', 'Thanh Minh', 'Cốc Vũ',
  'Lập Hạ', 'Tiểu Mãn', 'Mang Chủng', 'Hạ Chí', 'Tiểu Thử', 'Đại Thử',
  'Lập Thu', 'Xử Thử', 'Bạch Lộ', 'Thu Phân', 'Hàn Lộ', 'Sương Giáng',
  'Lập Đông', 'Tiểu Tuyết', 'Đại Tuyết', 'Đông Chí', 'Tiểu Hàn', 'Đại Hàn',
] as const;

// Ngày dương xấp xỉ [tháng, ngày] mỗi tiết khí — CHỈ dùng làm điểm khởi đầu dò nhị phân,
// sai số ±1-2 ngày ở đây không ảnh hưởng kết quả cuối (bisect tự hội tụ về giá trị đúng).
const APPROX_MD: [number, number][] = [
  [2, 4], [2, 19], [3, 6], [3, 21], [4, 5], [4, 20],
  [5, 6], [5, 21], [6, 6], [6, 21], [7, 7], [7, 23],
  [8, 8], [8, 23], [9, 8], [9, 23], [10, 8], [10, 23],
  [11, 7], [11, 22], [12, 7], [12, 21], [1, 6], [1, 21],
];

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

function longitudeOf(termIndex: number): number {
  return (315 + 15 * termIndex) % 360;
}

function sunLongitudeDeg(jd: number): number {
  return getSunLongitudeDeg(jd, TIME_ZONE);
}

/** Độ lệch có dấu (target - current), quy về khoảng (-180, 180]. */
function wrappedDiff(target: number, current: number): number {
  return (((target - current) + 540) % 360) - 180;
}

/** Dò nhị phân trong cửa sổ ±5 ngày quanh `guessJd` (mặt trời tăng ~1°/ngày, đơn điệu trong cửa sổ hẹp). */
function bisectForLongitude(targetDeg: number, guessJd: number): number {
  let lo = guessJd - 5;
  let hi = guessJd + 5;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const d = wrappedDiff(targetDeg, sunLongitudeDeg(mid));
    if (d > 0) lo = mid; else hi = mid;
  }
  // BUG đã sửa: giá trị nguyên jdn đại diện cho THỜI ĐIỂM BẮT ĐẦU (0h, giờ Việt Nam) của ngày đó
  // trong công thức getSunLongitudeDeg — nghĩa là mọi thời điểm phân số n..n+1 đều thuộc NGÀY n,
  // không phải ngày gần n nhất. Trước đây dùng Math.round() nên khi thời điểm giao cắt thật rơi
  // vào nửa sau của ngày (phần thập phân ≥ 0.5), kết quả bị làm tròn LÊN sang ngày hôm sau — vd
  // Lập Thu 2026 lẽ ra 7/8 lại báo ra 8/8. Phải dùng Math.floor() để lấy đúng ngày CHỨA thời điểm đó.
  return Math.floor((lo + hi) / 2);
}

/**
 * Ngày dương lịch của tiết khí `termIndex` (0-23, thứ tự `SOLAR_TERM_NAMES`) "thuộc năm" `year`.
 * Quy ước năm: index 0-21 (Lập Xuân..Đông Chí) rơi vào chính năm `year`; index 22-23 (Tiểu Hàn,
 * Đại Hàn) rơi vào tháng Giêng DƯƠNG của năm `year + 1` (đúng trình tự thời gian thật).
 * Dùng cho seed/hiển thị theo năm cụ thể. Để tìm "lần xảy ra tới gần nhất" cho rule engine,
 * dùng `nextSolarTermOnOrAfter` bên dưới — tránh hoàn toàn nhầm lẫn ranh giới năm ở đây.
 */
export function getSolarTermDate(termIndex: number, year: number): SolarDate {
  const idx = ((termIndex % 24) + 24) % 24;
  const [mm, dd] = APPROX_MD[idx];
  const guessYear = idx >= 22 ? year + 1 : year;
  const guessJd = jdFromDate(dd, mm, guessYear);
  const exactJd = bisectForLongitude(longitudeOf(idx), guessJd);
  return jdToDate(exactJd);
}

/** Ngày dương lịch GẦN NHẤT (>= nửa đêm ngày `from`) mà tiết khí `termIndex` xảy ra. */
export function nextSolarTermOnOrAfter(termIndex: number, from: Date): Date {
  const y = from.getFullYear();
  const fromMidnight = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const candidates = [y - 1, y, y + 1]
    .map(yy => getSolarTermDate(termIndex, yy))
    .map(sd => new Date(sd.year, sd.month - 1, sd.day))
    .sort((a, b) => a.getTime() - b.getTime());
  return candidates.find(d => d.getTime() >= fromMidnight) ?? candidates[candidates.length - 1];
}
