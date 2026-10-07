/**
 * DAILY & MONTHLY PERIOD SERVICE (Phase 10 + 11).
 *
 * Gộp hai deliverable liên quan chặt:
 *   - Phase 11 (Nhật Vận): CALENDAR HEATMAP — điểm từng ngày trong một tháng
 *     dương lịch + action cards + cờ độ tin cậy khi dữ liệu Bát Tự thiếu.
 *   - Phase 10 (Nguyệt Vận): WEEKLY SERIES — 4–5 tuần, mỗi tuần TỔNG HỢP từ điểm
 *     NGÀY (không nội suy ngẫu nhiên; tuần = trung bình các ngày trong tuần đó),
 *     bảo đảm nhất quán tuần ⟷ ngày (giống Phase 9 nhất quán năm ⟷ đại vận).
 *
 * Mọi điểm ngày lấy từ 1 nguồn duy nhất: `scoreNhatVan()`.
 */

import type { AstrologyResult } from '../types';
import { scoreNhatVan, goodBadHours, type NhatVanScore } from './nhatVan';

export type DayTone = 'tốt' | 'khá' | 'trung bình' | 'thận trọng' | 'xấu';

export function toneOf(score: number): DayTone {
  if (score >= 70) return 'tốt';
  if (score >= 55) return 'khá';
  if (score >= 40) return 'trung bình';
  if (score >= 25) return 'thận trọng';
  return 'xấu';
}

/** NHÃN HIỂN THỊ DUY NHẤT của mức ngày — cùng từ vựng với `rating` ở màn Xem theo ngày/Nhật vận (Rất tốt · Tốt · Bình thường · Cần thận trọng · Xấu).
 * Mọi chú giải lịch / box "Vận khí hôm nay" dùng bảng này để không còn "Tốt" ở chỗ này nhưng "Khá" ở chỗ kia (07/10/2026). */
export const TONE_LABEL: Record<DayTone, string> = {
  'tốt': 'Rất tốt', 'khá': 'Tốt', 'trung bình': 'Bình thường', 'thận trọng': 'Cần thận trọng', 'xấu': 'Xấu',
};

// Hạ 1 tông (giảm ~15% độ sáng) so với bộ màu gốc để đỡ chói mắt trên nền tối.
export const TONE_COLOR: Record<DayTone, string> = {
  'tốt': '#1da750',
  'khá': '#51ba75',
  'trung bình': '#d09d38',
  'thận trọng': '#be8a31',
  'xấu': '#d96868',
};

export interface DayCell {
  date: string;      // ISO yyyy-mm-dd
  day: number;       // ngày trong tháng
  weekday: number;   // 0=CN … 6=T7
  score: number;     // 0–100
  rating: string;    // nhãn hiển thị — KHÔNG dùng để so khớp logic (nguồn có thể là scoreNhatVan hoặc công thức chung khi chưa gắn lá số)
  tone: DayTone;
  isXungTuoi: boolean;
  hasWarning: boolean;
}

export interface WeekCell {
  weekIndex: number; // 1..n
  label: string;     // "Tuần 1"
  fromDay: number;
  toDay: number;
  avgScore: number;
  tone: DayTone;
  bestDay: number;   // ngày điểm cao nhất trong tuần
  worstDay: number;  // ngày điểm thấp nhất
}

export interface MonthHeatmap {
  year: number;
  month: number;     // 1–12 dương lịch
  days: DayCell[];
  weeks: WeekCell[];
  stats: { avg: number; bestDay: number; worstDay: number; goodDays: number; cautionDays: number };
  confidence: number;         // thấp khi thiếu Dụng/Kỵ thần Bát Tự
  confidenceNote: string;
  formulaVersion: '2.0';
}

function dataConfidence(result: AstrologyResult): { value: number; note: string } {
  const fav = result.batTuChart?.favorableElements ?? [];
  const unfav = result.batTuChart?.unfavorableElements ?? [];
  if (fav.length === 0 && unfav.length === 0) {
    return { value: 55, note: 'Thiếu Dụng/Kỵ thần Bát Tự — điểm ngày dựa chủ yếu vào lịch pháp, độ tin cậy giảm.' };
  }
  if (fav.length === 0 || unfav.length === 0) {
    return { value: 72, note: 'Dụng/Kỵ thần Bát Tự chưa đầy đủ — độ tin cậy trung bình.' };
  }
  return { value: 88, note: 'Đủ Dụng/Kỵ thần Bát Tự — độ tin cậy cao.' };
}

/**
 * Ghép `days[]` đã chấm điểm (dù từ scoreNhatVan cá nhân hóa hay công thức
 * chung khi chưa gắn lá số) thành 1 `MonthHeatmap` đầy đủ — tính weekly series
 * (Phase 10) + stats tháng. Dùng chung cho `buildMonthHeatmap` (có lá số) và
 * `buildGenericMonthHeatmapForMonth` (chưa gắn lá số) để không lặp logic tuần.
 */
export function assembleMonthHeatmap(
  year: number, month: number, days: DayCell[], confidence: number, confidenceNote: string,
): MonthHeatmap {
  const daysInMonth = days.length;

  // Weekly series — chia block 7 ngày từ ngày 1 (Phase 10).
  const weeks: WeekCell[] = [];
  for (let start = 1; start <= daysInMonth; start += 7) {
    const end = Math.min(start + 6, daysInMonth);
    const slice = days.filter(x => x.day >= start && x.day <= end);
    const avg = Math.round(slice.reduce((s, x) => s + x.score, 0) / slice.length);
    const best = slice.reduce((a, b) => (b.score > a.score ? b : a));
    const worst = slice.reduce((a, b) => (b.score < a.score ? b : a));
    weeks.push({
      weekIndex: weeks.length + 1,
      label: `Tuần ${weeks.length + 1}`,
      fromDay: start,
      toDay: end,
      avgScore: avg,
      tone: toneOf(avg),
      bestDay: best.day,
      worstDay: worst.day,
    });
  }

  const avg = Math.round(days.reduce((s, x) => s + x.score, 0) / days.length);
  const best = days.reduce((a, b) => (b.score > a.score ? b : a));
  const worst = days.reduce((a, b) => (b.score < a.score ? b : a));

  return {
    year, month, days, weeks,
    stats: {
      avg,
      bestDay: best.day,
      worstDay: worst.day,
      goodDays: days.filter(x => x.tone === 'tốt' || x.tone === 'khá').length,
      cautionDays: days.filter(x => x.tone === 'thận trọng' || x.tone === 'xấu').length,
    },
    confidence,
    confidenceNote,
    formulaVersion: '2.0',
  };
}

/**
 * Heatmap một tháng dương lịch (Phase 11) + weekly series (Phase 10).
 * Tính lazy (chỉ khi mở lịch) — tối đa 31 lần `scoreNhatVan`.
 */
export function buildMonthHeatmap(result: AstrologyResult, year: number, month: number): MonthHeatmap {
  const daysInMonth = new Date(year, month, 0).getDate();
  const days: DayCell[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    const sc = scoreNhatVan(result, date);
    days.push({
      date: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      day: d,
      weekday: date.getDay(),
      score: sc.score100,
      rating: sc.rating,
      tone: toneOf(sc.score100),
      isXungTuoi: sc.xungTuoi,
      // CHỈ mốc riêng ngày (xung tuổi/Tam Nương/Nguyệt Kỵ) — sc.warnings còn
      // gồm Tam Tai/Kim Lâu (cảnh báo theo NĂM/TUỔI, gần như ngày nào trong
      // năm đó cũng có) nên không dùng warnings.length để tránh chấm đỏ tràn lan.
      hasWarning: sc.xungTuoi || sc.tamNuong || sc.nguyetKy,
    });
  }

  const conf = dataConfidence(result);
  return assembleMonthHeatmap(year, month, days, conf.value, conf.note);
}

export interface DailyActionCards {
  date: string;
  score: number;
  rating: NhatVanScore['rating'];
  tone: DayTone;
  shouldDo: string[];
  shouldAvoid: string[];
  bestHours: string[];
  confidence: number;
  formulaVersion: '2.0';
}

/** Action cards cho một ngày cụ thể (Phase 11). */
export function buildDailyActionCards(result: AstrologyResult, date: Date): DailyActionCards {
  const sc = scoreNhatVan(result, date);
  const tone = toneOf(sc.score100);
  const good = tone === 'tốt' || tone === 'khá';

  const shouldDo: string[] = [];
  const shouldAvoid: string[] = [];
  if (good) {
    shouldDo.push('Tiến hành việc quan trọng: ký kết, khai trương, gặp đối tác, khởi sự.');
    shouldDo.push('Chủ động đề xuất, mở rộng quan hệ, ra quyết định lớn.');
  } else if (tone === 'trung bình') {
    shouldDo.push('Làm việc thường ngày, hoàn thiện việc dang dở, củng cố quan hệ.');
  } else {
    shouldDo.push('Ưu tiên việc nội bộ, rà soát hơn là khởi sự mới; giữ sức khỏe.');
  }

  if (sc.xungTuoi) shouldAvoid.push('XUNG TUỔI: tránh cưới hỏi, khởi công, ký hợp đồng lớn, đi xa.');
  if (sc.tamNuong) shouldAvoid.push('Tam Nương: tránh cưới hỏi, khai trương, xuất hành.');
  if (sc.nguyetKy) shouldAvoid.push('Nguyệt Kỵ: tránh ký kết, xuất hành, quyết định lớn.');
  if (!good && !sc.xungTuoi && !sc.tamNuong && !sc.nguyetKy) {
    shouldAvoid.push('Hạn chế đầu tư mạo hiểm, tranh cãi, đứng ra bảo lãnh.');
  }
  if (shouldAvoid.length === 0) shouldAvoid.push('Không có điều đại kỵ — vẫn nên tránh nóng giận, quyết định vội.');

  const hr = goodBadHours(result, date);
  const bestHours = hr.good.map(h => `${h.branch} (${h.range})`);

  const conf = dataConfidence(result);
  return {
    date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
    score: sc.score100,
    rating: sc.rating,
    tone,
    shouldDo,
    shouldAvoid,
    bestHours,
    confidence: conf.value,
    formulaVersion: '2.0',
  };
}
