/**
 * Heatmap ngày trong THÁNG DƯƠNG HIỆN TẠI khi người dùng CHƯA gắn lá số nào —
 * dùng cho box "Nhịp tháng này" ở Home lúc chưa có myResult.
 *
 * Không cần Bát Tự/Tử Vi cá nhân — chỉ dùng quan hệ Can–Chi ngày (sinh/khắc/
 * đồng/bình) như đã làm ở nhánh "CHƯA CÓ LÁ SỐ" của todaySummary.ts, để nhất
 * quán 1 công thức "ngày bình thường" cho toàn app, không phát minh thêm.
 */
import type { FiveElement } from '../types';
import { dayCanChi } from './nhatVan';
import { toneOf, assembleMonthHeatmap, type DayTone, type DayCell, type MonthHeatmap } from './dailyPeriodService';

const SINH: Record<FiveElement, FiveElement> = { Mộc: 'Hỏa', Hỏa: 'Thổ', Thổ: 'Kim', Kim: 'Thủy', Thủy: 'Mộc' };
const KHAC: Record<FiveElement, FiveElement> = { Mộc: 'Thổ', Thổ: 'Thủy', Thủy: 'Hỏa', Hỏa: 'Kim', Kim: 'Mộc' };

/** Điểm/rating 1 ngày theo công thức chung (quan hệ Can-Chi ngày) — KHÔNG cần lá số.
 * Export để dùng chung ở nơi khác cần cùng 1 công thức "ngày bình thường" (vd
 * financialAdvisor.ts's buildGenericFinancialAdvice) — không tính lại logic. */
export function genericDayScore(date: Date): { score: number; rating: string } {
  const cc = dayCanChi(date);
  const a = cc.stemEl, b = cc.branchEl;
  const rel = a === b ? 'dong' : SINH[a] === b || SINH[b] === a ? 'sinh' : KHAC[a] === b || KHAC[b] === a ? 'khac' : 'binh';
  if (rel === 'sinh') return { score: 72, rating: 'Tốt' };
  if (rel === 'dong') return { score: 60, rating: 'Khá' };
  if (rel === 'khac') return { score: 35, rating: 'Cần thận trọng' };
  return { score: 50, rating: 'Bình thường' };
}

export interface GenericDayCell {
  date: string;      // YYYY-MM-DD
  lunarDay: number;   // dùng làm số hiển thị trên ô — Ở ĐÂY LÀ NGÀY DƯƠNG (không có lá số nên không quy đổi âm lịch theo tuổi)
  weekday: number;
  score: number;
  tone: DayTone;
  rating: string;
  isXungTuoi: boolean;   // luôn false — không có tuổi để tính xung
  hasWarning: boolean;   // luôn false — không có cảnh báo cá nhân hóa
}

export interface GenericMonthHeatmap {
  year: number;
  month: number; // tháng dương hiện tại
  days: GenericDayCell[];
  stats: { avgScore: number; bestDay: number; cautionDays: number };
}

function pad(n: number): string { return String(n).padStart(2, '0'); }

/** Tính heatmap cho THÁNG DƯƠNG chứa `base` (mặc định hôm nay). */
export function buildGenericMonthHeatmap(base: Date = new Date()): GenericMonthHeatmap {
  const year = base.getFullYear();
  const month = base.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();

  const days: GenericDayCell[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    const { score, rating } = genericDayScore(date);
    days.push({
      date: `${year}-${pad(month)}-${pad(d)}`,
      lunarDay: d,
      weekday: date.getDay(),
      score, tone: toneOf(score), rating,
      isXungTuoi: false, hasWarning: false,
    });
  }

  const avgScore = Math.round(days.reduce((s, x) => s + x.score, 0) / days.length);
  const best = days.reduce((a, b) => (b.score > a.score ? b : a));
  const cautionDays = days.filter(d => d.tone === 'thận trọng' || d.tone === 'xấu').length;

  return { year, month, days, stats: { avgScore, bestDay: best.lunarDay, cautionDays } };
}

/**
 * Bản `MonthHeatmap` ĐẦY ĐỦ (cùng shape với `buildMonthHeatmap`) nhưng KHÔNG
 * cá nhân hóa — dùng cho lịch chọn ngày (vd "Ghi chú nhanh") khi người dùng
 * CHƯA gắn lá số nào, để vẫn tô màu ngày tốt/xấu theo công thức chung thay vì
 * để lịch trắng. Nhận trực tiếp năm/tháng bất kỳ (khác `buildGenericMonthHeatmap`
 * chỉ tính tháng hiện tại) vì người dùng có thể bấm ‹ › xem tháng khác.
 */
export function buildGenericMonthHeatmapForMonth(year: number, month: number): MonthHeatmap {
  const daysInMonth = new Date(year, month, 0).getDate();
  const days: DayCell[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    const { score, rating } = genericDayScore(date);
    days.push({
      date: `${year}-${pad(month)}-${pad(d)}`,
      day: d,
      weekday: date.getDay(),
      score, rating, tone: toneOf(score),
      isXungTuoi: false, hasWarning: false,
    });
  }
  return assembleMonthHeatmap(
    year, month, days, 50,
    'Chưa gắn lá số — điểm ngày theo công thức chung (quan hệ Can-Chi ngày), không cá nhân hóa.',
  );
}
