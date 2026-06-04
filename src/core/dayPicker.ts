/**
 * Xếp hạng ngày phù hợp cho 1 việc cụ thể trong khoảng thời gian.
 * Reuse `scoreNhatVan` (đã có) + `goodBadHours` (đã có) + `elementPhongThuy`.
 *
 * Logic:
 *  - Với mỗi ngày trong [from, to]:
 *      • Tính score = scoreNhatVan(result, date).score (đã tính theo dụng/kỵ thần
 *        và hợp/xung tuổi).
 *      • Cộng/trừ thêm bonus theo loại việc:
 *          - Việc weight ≥ 4 mà ngày XUNG TUỔI → loại (đặt -999).
 *          - Việc liên quan TÀI/LOC (BIZ/FIN/PROP) → cộng nếu hành ngày = Kim/Thổ
 *            (tài-tinh), trừ nếu Hỏa (hao tài).
 *          - Việc LOVE/CHILD → cộng nếu hành ngày = Mộc/Hỏa (sinh khí).
 *          - Việc HEALTH/SPIRIT → cộng nếu là ngày DỤNG THẦN.
 *  - Lấy top 3 ngày điểm cao nhất, kèm: lý do / khung giờ tốt / hướng / màu mặc.
 */

import type { AstrologyResult, FiveElement } from '../types';
import { scoreNhatVan, goodBadHours, auspiciousHours, type HourWindow } from './nhatVan';
import { elementPhongThuy } from './phongThuyBatTu';
import { findTaskByCode } from '../data/dayPickTasks';

export interface DayPickResult {
  date: Date;
  dateLabel: string;       // "Thứ 6, 12/6/2026"
  canChiLabel: string;     // "Ngày Giáp Tý"
  rating: string;          // Rất tốt / Tốt / ...
  score: number;           // Số điểm tổng hợp
  reasons: string[];       // 2-4 lý do
  bestHours: HourWindow[];     // Khung giờ tốt CHO LÁ SỐ (theo dụng/kỵ thần + tuổi)
  generalHours: HourWindow[];  // Khung giờ tốt NÓI CHUNG (giờ hoàng đạo theo ngày)
  direction: string;       // Hướng tốt (vd "Tây - Tây Bắc")
  goodColor: string;       // Màu hợp ("Xanh dương, Đen")
  avoidColor: string;      // Màu tránh ("Đỏ, Hồng")
}

const WEEKDAY = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

/** Bonus điểm theo nhóm việc + hành ngày. */
function taskBonus(groupCode: string, dayElement: FiveElement): number {
  // Việc liên quan tài lộc → Kim/Thổ tốt, Hỏa hao tài.
  if (groupCode === 'BIZ' || groupCode === 'FIN' || groupCode === 'PROP' || groupCode === 'VIP') {
    if (dayElement === 'Kim' || dayElement === 'Thổ') return 1;
    if (dayElement === 'Hỏa') return -1;
  }
  // Tình cảm/Con cái → Mộc/Hỏa (sinh khí).
  if (groupCode === 'LOVE' || groupCode === 'CHILD') {
    if (dayElement === 'Mộc' || dayElement === 'Hỏa') return 1;
    if (dayElement === 'Kim') return -1;
  }
  // Học tập/Văn → Mộc/Thủy (sinh trí).
  if (groupCode === 'EDU' || groupCode === 'SPIRIT') {
    if (dayElement === 'Mộc' || dayElement === 'Thủy') return 1;
  }
  // Sức khỏe/Phẫu thuật → tránh Hỏa/Kim (sát khí).
  if (groupCode === 'HEALTH') {
    if (dayElement === 'Hỏa' || dayElement === 'Kim') return -1;
    if (dayElement === 'Mộc' || dayElement === 'Thủy') return 1;
  }
  // Xuất hành/Du lịch/Pháp lý → Mộc/Thủy (di động).
  if (groupCode === 'TRAVEL') {
    if (dayElement === 'Mộc' || dayElement === 'Thủy') return 1;
  }
  return 0;
}

export interface DayPickOutput {
  task: { groupName: string; taskName: string; emoji: string };
  totalDays: number;
  okDays: number;
  top: DayPickResult[];      // Tối đa 3
  warning?: string;          // Nếu khoảng thời gian không có ngày tốt
}

/**
 * Xếp hạng ngày phù hợp.
 * @param result lá số của user (cần để tính dụng/kỵ thần và xung tuổi)
 * @param taskCode mã việc (vd "BIZ_OPEN_SHOP")
 * @param from ngày bắt đầu (Date)
 * @param to ngày kết thúc (Date, inclusive)
 */
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

  // Giới hạn an toàn để không quá tốn CPU (~366 ngày = 1 năm).
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
    let total = sc.score;
    const reasons: string[] = [...sc.reasons];

    // Việc trọng đại + xung tuổi → loại
    if (task.weight >= 4 && sc.xungTuoi) {
      reasons.push('⚠ Ngày XUNG tuổi — không phù hợp việc trọng đại; bỏ qua.');
      candidates.push({
        date,
        dateLabel: `${WEEKDAY[date.getDay()]}, ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`,
        canChiLabel: `Ngày ${sc.canChi.stem} ${sc.canChi.branch}`,
        rating: 'Loại (xung tuổi)', score: -999, reasons,
        bestHours: [], generalHours: [], direction: '', goodColor: '', avoidColor: '',
      });
      continue;
    }

    // Bonus theo nhóm việc + hành chi ngày
    const bonus = taskBonus(group.code, sc.canChi.branchEl);
    total += bonus;
    if (bonus > 0) reasons.push(`Chi ngày hành ${sc.canChi.branchEl} hợp việc ${task.name.toLowerCase()}.`);
    else if (bonus < 0) reasons.push(`Chi ngày hành ${sc.canChi.branchEl} không thuận việc ${task.name.toLowerCase()}.`);

    // Khung giờ tốt cho LÁ SỐ (dụng/kỵ thần + tuổi) và NÓI CHUNG (giờ hoàng đạo)
    const { good: goodH } = goodBadHours(result, date);
    const generalH = auspiciousHours(date);
    if (sc.hopTuoi) total += 1;

    if (total >= 2) okCount++;

    candidates.push({
      date,
      dateLabel: `${WEEKDAY[date.getDay()]}, ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`,
      canChiLabel: `Ngày ${sc.canChi.stem} ${sc.canChi.branch}`,
      rating: sc.rating, score: total, reasons,
      bestHours: goodH.slice(0, 3),
      generalHours: generalH,
      direction: goodPhong.huong,
      goodColor: goodPhong.mau.split(';')[0].trim(),
      avoidColor: badPhong ? badPhong.mau.split(';')[0].trim() : '',
    });
  }

  // Lấy top 3 ngày điểm cao nhất (loại điểm âm hoặc < 1)
  const top = candidates
    .filter(c => c.score >= 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  let warning: string | undefined;
  if (totalDays > 366) warning = `Khoảng thời gian quá dài (${totalDays} ngày); chỉ phân tích 366 ngày đầu.`;
  if (top.length === 0) warning = (warning ? warning + ' ' : '') +
    `Trong ${safeTotal} ngày được chọn, KHÔNG có ngày nào thực sự phù hợp với "${task.name}". Có thể chọn khoảng thời gian khác hoặc giảm tiêu chí.`;

  return {
    task: { groupName: group.name, taskName: task.name, emoji: group.emoji },
    totalDays: safeTotal,
    okDays: okCount,
    top,
    warning,
  };
}
