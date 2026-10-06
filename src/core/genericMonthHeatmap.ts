/**
 * Heatmap ngày trong THÁNG DƯƠNG HIỆN TẠI khi người dùng CHƯA gắn lá số nào —
 * dùng cho box "Nhịp tháng này" ở Home lúc chưa có myResult.
 *
 * Không cần Bát Tự/Tử Vi cá nhân — dùng genericDayFacts (lịch trạch nhật), cùng một công thức với "Xem ngày tốt" chế độ cơ bản.
 */
import { genericDayFacts } from './nhatVan';
import { toneOf, assembleMonthHeatmap, type DayTone, type DayCell, type MonthHeatmap } from './dailyPeriodService';

/** Điểm/rating 1 ngày theo công thức lịch chung — KHÔNG cần lá số. Dùng ĐÚNG tầng lịch trạch nhật của scoreNhatVan
 * (genericDayFacts: Trực theo tiết khí, Hoàng/Hắc đạo, Lục Diệu, 28 Tú, Đức + Nguyệt phá/Tuế phá/Tam Nương/Nguyệt kỵ) thay cho
 * công thức sinh-khắc Can-Chi cũ (07/10/2026) để "ngày bình thường" cùng một nguồn với Xem ngày tốt. Export để dùng chung
 * (vd financialAdvisor.ts's buildGenericFinancialAdvice) — không tính lại logic. */
export function genericDayScore(date: Date): { score: number; rating: string } {
  const f = genericDayFacts(date);
  return { score: f.score100, rating: f.rating };
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
    'Chưa gắn lá số — điểm ngày theo lịch trạch nhật chung (Trực, Hoàng đạo, 28 Tú…), không cá nhân hóa.',
  );
}
