/**
 * NGUYỆT VẬN CHARTS (mục 5 tài liệu "Logic Nguyệt Vận v2.0") — 3 biểu đồ:
 *   1. Cột/đường 4 TUẦN — nhịp tháng: wealth (tài lộc) / challenge (thách thức)
 *      / opportunity (cơ hội) theo từng tuần trong tháng âm lịch.
 *   2. Heatmap NGÀY — daily action score, dùng lại NGUYÊN VẸN Nhật Vận Engine
 *      (đúng pipeline mục 3: "Tính ngày bằng Nhật vận Engine").
 *   3. Radar THÁNG — 8 domain (8 chủ đề đã có sẵn trong nguyetVanDetail).
 *
 * Nguyên tắc chống bịa: KHÔNG có engine nào tách "wealth/challenge/opportunity"
 * theo từng NGÀY (Nhật Vận Engine chỉ có 1 điểm tổng hợp/ngày). Vì vậy điểm 3
 * chỉ số theo TUẦN được suy ra bằng cách LẤY MỐC là tài lộc/thách thức/cơ hội
 * đã tính ở cấp THÁNG (scoreNguyetVan + nguyetVanDetail — facts đã xác nhận),
 * rồi ĐIỀU CHỈNH NHẸ theo độ lệch điểm ngày trung bình của tuần đó so với
 * trung bình cả tháng (tín hiệu thực từ Nhật Vận Engine, không phát sinh dữ
 * kiện mới) — không dùng một ngày xấu để phủ định cả tháng (mục 7).
 */

import type { AstrologyResult } from '../types';
import { lunarToSolar, solarToLunar } from './lunarCalendar';
import { scoreNhatVan } from './nhatVan';
import { scoreNguyetVan, nguyetVanDetail } from './nguyetVanScore';
import { toneOf, TONE_COLOR, type DayTone } from './dailyPeriodService';

export { toneOf, TONE_COLOR, type DayTone };

/** Lunar năm ứng với 1 tuổi (tiểu vận) — dùng năm âm lịch SINH + số năm đã qua. */
export function lunarYearForAge(result: AstrologyResult, age: number): number {
  return result.tuViChart.lunarDate.year + (age - 1);
}

/**
 * Ngày dương lịch bắt đầu (mùng 1) + tổng số ngày của 1 tháng âm lịch.
 *
 * `lunarYear` ở tham số hàm này LUÔN theo quy ước TỰ NHIÊN — tức khớp với
 * `solarToLunar(...).year` và `tuViChart.lunarDate.year` (năm âm = năm dương
 * chứa phần lớn tháng đó). NHƯNG `lunarToSolar(1, month, Y, false)` của thư
 * viện lịch trong repo lại nhận `Y` theo quy ước LỆCH: với `month` 1–10, `Y`
 * thực chất là "năm tự nhiên Y+1" (đã kiểm chứng thực nghiệm: lunarToSolar
 * (1,6,2026,false) trả về ngày dương 2027-07-04, tức mùng 1 tháng 6 ÂM của
 * năm TỰ NHIÊN 2027, không phải 2026!). Chỉ với `month` 11–12, `Y` mới khớp
 * quy ước tự nhiên. Đây LÀ NGUYÊN NHÂN THẬT của bug "Home lệch màu so với
 * Xem theo ngày ở cùng 1 ngày" — code cũ chỉ patch quy ước lệch này cho bước
 * tính "tháng kế" (10→11) mà QUÊN áp dụng ngay cho chính `start` của tháng
 * đang tính, khiến toàn bộ tháng 1–10 bị tính lùi/tiến sai hẳn 1 NĂM.
 */
export function lunarMonthRange(lunarYear: number, month: number): { start: Date; days: number } {
  const paramYear = month <= 10 ? lunarYear - 1 : lunarYear;
  const startS = lunarToSolar(1, month, paramYear, false);
  const start = new Date(startS.year, startS.month - 1, startS.day);

  // KHÔNG suy độ dài tháng bằng cách trừ "ngày bắt đầu tháng kế" — nếu giữa
  // tháng `month` và tháng `month+1` có XEN THÁNG NHUẬN cùng số (vd nhuận
  // tháng 8 chen giữa tháng 8 và tháng 9), lunarToSolar(1, month+1, year)
  // trỏ tới SAU CẢ tháng nhuận, khiến hiệu số ra ~59-60 ngày rồi bị clamp
  // nhầm về 30 — kết quả là ngày cuối "ảo" (ngày 30) thực ra là mùng 1 của
  // tháng nhuận, làm lệch màu/nhãn so với solarToLunar thật (đã phát hiện
  // qua báo cáo thực tế: Home hiện khác màu với màn Xem theo ngày ở cùng 1
  // ngày). Thay vào đó, ĐI TỪNG NGÀY DƯƠNG và tra ngược solarToLunar — dừng
  // ngay khi rời khỏi đúng tháng-âm (đổi số tháng, hoặc rơi vào bản nhuận
  // của tháng đó) — luôn khớp 100% với solarToLunar thật vì dùng chính nó.
  let days = 0;
  for (let i = 1; i <= 31; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i - 1);
    const lunar = solarToLunar(d.getDate(), d.getMonth() + 1, d.getFullYear());
    if (lunar.month !== month || lunar.isLeapMonth) break;
    days = i;
  }
  return { start, days: Math.max(1, Math.min(30, days)) };
}

/** Chia N ngày thành ĐÚNG 4 tuần gần bằng nhau (dư ngày dồn về các tuần cuối). */
function splitInto4(totalDays: number): { from: number; to: number }[] {
  const base = Math.floor(totalDays / 4);
  const rem = totalDays % 4;
  const sizes = [base, base, base, base];
  for (let i = 0; i < rem; i++) sizes[3 - i] += 1;
  const ranges: { from: number; to: number }[] = [];
  let start = 1;
  for (const sz of sizes) {
    ranges.push({ from: start, to: start + sz - 1 });
    start += sz;
  }
  return ranges;
}

const WEEK_LABEL = ['Tuần 1 — Khởi động', 'Tuần 2 — Tăng tốc', 'Tuần 3 — Điểm nhấn', 'Tuần 4 — Tổng kết'];

export interface NguyetVanWeek {
  index: number;       // 1–4
  label: string;
  fromDay: number;      // ngày âm lịch bắt đầu tuần
  toDay: number;
  wealth: number;       // 0–100
  challenge: number;    // 0–100
  opportunity: number;  // 0–100
  bestDay: number;      // ngày âm lịch có điểm ngày cao nhất trong tuần
}

export interface NguyetVanDayCell {
  date: string;      // ISO dương lịch
  lunarDay: number;
  weekday: number;   // 0=CN…6=T7
  score: number;      // 0–100 (Nhật Vận Engine)
  tone: DayTone;
  rating: string;
  isXungTuoi: boolean;
  hasWarning: boolean;
}

export interface NguyetVanRadarAxis { label: string; value: number; }

export interface NguyetVanChartData {
  lunarYear: number;
  month: number;
  solarStart: string;   // ISO ngày mùng 1 âm lịch (dương lịch)
  totalDays: number;
  weeks: NguyetVanWeek[];
  days: NguyetVanDayCell[];
  radar: NguyetVanRadarAxis[]; // 8 domain (8 chủ đề)
  stats: { avgScore: number; bestDay: number; cautionDays: number };
  formulaVersion: '2.0';
}

/**
 * Dựng dữ liệu 3 biểu đồ mục 5 cho 1 tháng âm lịch (age = tuổi/tiểu vận, month = 1–12).
 * Tính LAZY — chỉ gọi khi màn hình thực sự cần hiển thị (mở tab biểu đồ).
 */
export function buildNguyetVanCharts(result: AstrologyResult, age: number, month: number): NguyetVanChartData | null {
  const monthSc = scoreNguyetVan(result, age, month);
  const detail = nguyetVanDetail(result, age, month);
  if (!monthSc || !detail) return null;

  const lunarYear = lunarYearForAge(result, age);
  const { start, days: totalDays } = lunarMonthRange(lunarYear, month);

  // ── Ngày (Heatmap) — Nhật Vận Engine nguyên vẹn cho từng ngày dương trong tháng âm ──
  const days: NguyetVanDayCell[] = [];
  for (let i = 0; i < totalDays; i++) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const sc = scoreNhatVan(result, date);
    days.push({
      date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
      lunarDay: i + 1,
      weekday: date.getDay(),
      score: sc.score100,
      tone: toneOf(sc.score100),
      rating: sc.rating,
      isXungTuoi: sc.xungTuoi,
      // CHỈ đánh dấu cảnh báo cho các mốc RIÊNG NGÀY (xung tuổi/Tam Nương/Nguyệt
      // Kỵ) — KHÔNG dùng sc.warnings.length (mảng đó còn gồm Tam Tai/Kim Lâu,
      // là cảnh báo theo NĂM/TUỔI nên đúng ra ngày nào trong năm đó cũng có,
      // làm chấm đỏ xuất hiện tràn lan mất tác dụng đánh dấu ngày đặc biệt).
      hasWarning: sc.xungTuoi || sc.tamNuong || sc.nguyetKy,
    });
  }
  const monthDailyAvg = days.reduce((s, d) => s + d.score, 0) / days.length;

  // ── Cơ hội tháng (mốc) — lấy từ nguyetVanDetail đã tính sẵn (0–10 → 0–100) ──
  const coHoiMonth = (detail.scores.find(s => s.key === 'coHoi')?.value ?? 5) * 10;

  // ── 4 tuần — mốc THÁNG (facts đã xác nhận) + điều chỉnh theo độ lệch ngày thực tế ──
  const ranges = splitInto4(totalDays);
  const weeks: NguyetVanWeek[] = ranges.map((r, idx) => {
    const slice = days.slice(r.from - 1, r.to);
    const weekAvg = slice.reduce((s, d) => s + d.score, 0) / slice.length;
    const delta = weekAvg - monthDailyAvg; // tín hiệu thực từ Nhật Vận Engine, damped bên dưới
    const clamp = (v: number) => Math.max(4, Math.min(100, Math.round(v)));
    const best = slice.reduce((a, b) => (b.score > a.score ? b : a));
    return {
      index: idx + 1,
      label: WEEK_LABEL[idx],
      fromDay: r.from,
      toDay: r.to,
      wealth: clamp(monthSc.taiLoc + delta * 0.4),
      challenge: clamp(monthSc.thachThuc - delta * 0.4),
      opportunity: clamp(coHoiMonth + delta * 0.5),
      bestDay: best.lunarDay,
    };
  });

  // ── Radar tháng — 8 domain (8 chủ đề, đã có sẵn từ nguyetVanDetail) ──
  const radar: NguyetVanRadarAxis[] = detail.themes.map(t => ({ label: t.label, value: t.score * 10 }));

  const avgScore = Math.round(monthDailyAvg);
  const bestDay = days.reduce((a, b) => (b.score > a.score ? b : a)).lunarDay;
  const cautionDays = days.filter(d => d.tone === 'thận trọng' || d.tone === 'xấu').length;

  return {
    lunarYear, month,
    solarStart: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`,
    totalDays, weeks, days, radar,
    stats: { avgScore, bestDay, cautionDays },
    formulaVersion: '2.0',
  };
}
