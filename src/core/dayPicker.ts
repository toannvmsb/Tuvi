/**
 * Xếp hạng ngày phù hợp cho 1 việc cụ thể trong khoảng thời gian.
 * v2: dùng score100 (6 cấp) thay cho score integer; thêm Trực, Lục Diệu,
 *     Hoàng Đạo, cảnh báo hard rules vào kết quả.
 */

import type { AstrologyResult, FiveElement } from '../types';
import {
  scoreNhatVan, goodBadHours, auspiciousHours, trucNgayInfo,
  type HourWindow,
} from './nhatVan';
import { elementPhongThuy } from './phongThuyBatTu';
import { solarToLunar } from './lunarCalendar';
import { findTaskByCode } from '../data/dayPickTasks';

export interface DayPickResult {
  date: Date;
  dateLabel: string;
  lunarLabel: string;
  canChiLabel: string;
  rating: string;
  score: number;
  score100: number;
  reasons: string[];
  bestHours: HourWindow[];
  generalHours: HourWindow[];
  direction: string;
  goodColor: string;
  avoidColor: string;
  // v2
  truc: string;
  lucDieu: string;
  hoangDao: boolean;
  nhi28Tu: string;
  warnings: string[];
}

const WEEKDAY = ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'];

// Trực tốt/xấu theo nhóm việc (Cấp 6 bonus/malus)
const TRUC_GOOD: Record<string, number[]> = {
  WORK:   [4, 8, 10],
  BIZ:    [4, 8, 10, 0],
  FIN:    [4, 8, 9],
  PROP:   [4, 8, 10],
  LOVE:   [4, 8, 2],
  CHILD:  [4, 8],
  EDU:    [0, 8, 10],
  TRAVEL: [0, 10],
  HEALTH: [1],
  LEGAL:  [4, 8, 5],
  SPIRIT: [1, 0],
  VIP:    [4, 8, 10],
};
const TRUC_BAD_IDX = new Set([6, 7, 11]); // Phá, Nguy, Bế

function taskBonus(groupCode: string, dayElement: FiveElement, trucIdx: number): number {
  let bonus = 0;
  // Trực-based bonus/malus (Cấp 6)
  const goodTruc = TRUC_GOOD[groupCode] || [];
  if (goodTruc.includes(trucIdx)) bonus += 8;
  if (TRUC_BAD_IDX.has(trucIdx)) bonus -= 10;

  // Hành chi ngày (existing logic)
  if (groupCode === 'BIZ' || groupCode === 'FIN' || groupCode === 'PROP' || groupCode === 'VIP') {
    if (dayElement === 'Kim' || dayElement === 'Thổ') bonus += 3;
    if (dayElement === 'Hỏa') bonus -= 3;
  }
  if (groupCode === 'LOVE' || groupCode === 'CHILD') {
    if (dayElement === 'Mộc' || dayElement === 'Hỏa') bonus += 3;
    if (dayElement === 'Kim') bonus -= 3;
  }
  if (groupCode === 'EDU' || groupCode === 'SPIRIT') {
    if (dayElement === 'Mộc' || dayElement === 'Thủy') bonus += 3;
  }
  if (groupCode === 'HEALTH') {
    if (dayElement === 'Hỏa' || dayElement === 'Kim') bonus -= 3;
    if (dayElement === 'Mộc' || dayElement === 'Thủy') bonus += 3;
  }
  if (groupCode === 'TRAVEL') {
    if (dayElement === 'Mộc' || dayElement === 'Thủy') bonus += 3;
  }
  return bonus;
}

export interface DayPickOutput {
  task: { groupName: string; taskName: string; emoji: string };
  totalDays: number;
  okDays: number;
  top: DayPickResult[];
  warning?: string;
}

export function pickGoodDays(
  result: AstrologyResult,
  taskCode: string,
  from: Date,
  to: Date,
): DayPickOutput {
  const found = findTaskByCode(taskCode);
  if (!found) {
    return {
      task: { groupName: '?', taskName: '?', emoji: '' },
      totalDays: 0, okDays: 0, top: [],
      warning: 'Không tìm thấy việc trong danh mục.',
    };
  }
  const { group, task } = found;
  const candidates: DayPickResult[] = [];
  const fromTs = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const toTs = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  if (toTs < fromTs) return {
    task: { groupName: group.name, taskName: task.name, emoji: group.emoji },
    totalDays: 0, okDays: 0, top: [],
    warning: 'Ngày kết thúc phải sau ngày bắt đầu.',
  };
  const DAY_MS = 86400000;
  const totalDays = Math.floor((toTs - fromTs) / DAY_MS) + 1;
  const safeTo = totalDays > 366 ? new Date(fromTs + 365 * DAY_MS) : to;
  const safeTotal = Math.min(totalDays, 366);

  const fav = result.batTuChart.favorableElements || [];
  const unfav = result.batTuChart.unfavorableElements || [];
  const favEl = fav[0] || result.batTuChart.dayMasterElement;
  const unfavEl = unfav[0];
  const goodPhong = elementPhongThuy(favEl);
  const badPhong = unfavEl ? elementPhongThuy(unfavEl) : null;

  let okCount = 0;
  for (let t = fromTs; t <= safeTo.getTime(); t += DAY_MS) {
    const date = new Date(t);
    const sc = scoreNhatVan(result, date);
    const ld = solarToLunar(date.getDate(), date.getMonth()+1, date.getFullYear());
    const truc = trucNgayInfo(sc.canChi.branch, ld.month);

    // Việc trọng đại + xung tuổi → loại
    if (task.weight >= 4 && sc.xungTuoi) {
      candidates.push({
        date,
        dateLabel: `${WEEKDAY[date.getDay()]}, ${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()}`,
        lunarLabel: `Âm: ${ld.day}/${ld.month}${ld.isLeapMonth ? ' nhuận' : ''}/${ld.year}`,
        canChiLabel: `Ngày ${sc.canChi.stem} ${sc.canChi.branch}`,
        rating: 'Loại (xung tuổi)', score: -999, score100: 0,
        reasons: [...sc.reasons, '⚠ Ngày XUNG tuổi — không phù hợp việc trọng đại; bỏ qua.'],
        bestHours: [], generalHours: [], direction: '', goodColor: '', avoidColor: '',
        truc: sc.truc, lucDieu: sc.lucDieu, hoangDao: sc.hoangDao, nhi28Tu: sc.nhi28Tu,
        warnings: sc.warnings,
      });
      continue;
    }

    // Cấp 6 bonus (task-specific Trực + element)
    const bonus = taskBonus(group.code, sc.canChi.branchEl, truc.idx);
    const adjustedScore100 = Math.max(0, Math.min(100, sc.score100 + bonus));
    const reasons = [...sc.reasons];
    if (bonus > 0) reasons.push(`Trực ${sc.truc} hợp việc "${task.name}" — thêm điểm.`);
    if (bonus < 0 && TRUC_BAD_IDX.has(truc.idx)) reasons.push(`Trực ${sc.truc} kỵ mọi việc trọng đại.`);

    if (adjustedScore100 >= 55) okCount++;

    const { good: goodH } = goodBadHours(result, date);
    const generalH = auspiciousHours(date);

    candidates.push({
      date,
      dateLabel: `${WEEKDAY[date.getDay()]}, ${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()}`,
      lunarLabel: `Âm: ${ld.day}/${ld.month}${ld.isLeapMonth ? ' nhuận' : ''}/${ld.year}`,
      canChiLabel: `Ngày ${sc.canChi.stem} ${sc.canChi.branch}`,
      rating: sc.rating, score: sc.score, score100: adjustedScore100,
      reasons: reasons.slice(0, 5),
      bestHours: goodH.slice(0, 3),
      generalHours: generalH,
      direction: goodPhong.huong,
      goodColor: goodPhong.mau.split(';')[0].trim(),
      avoidColor: badPhong ? badPhong.mau.split(';')[0].trim() : '',
      truc: sc.truc, lucDieu: sc.lucDieu, hoangDao: sc.hoangDao, nhi28Tu: sc.nhi28Tu,
      warnings: sc.warnings,
    });
  }

  // Top 5 ngày score100 cao nhất, loại < 40
  const top = candidates
    .filter(c => c.score100 >= 40)
    .sort((a, b) => b.score100 - a.score100)
    .slice(0, 5);

  let warning: string | undefined;
  if (totalDays > 366) warning = `Khoảng thời gian quá dài; chỉ phân tích 366 ngày đầu.`;
  if (top.length === 0) warning = (warning ? warning + ' ' : '') +
    `Trong ${safeTotal} ngày, không có ngày phù hợp cho "${task.name}". Thử chọn khoảng thời gian khác.`;

  return {
    task: { groupName: group.name, taskName: task.name, emoji: group.emoji },
    totalDays: safeTotal, okDays: okCount, top, warning,
  };
}
