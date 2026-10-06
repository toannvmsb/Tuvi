/**
 * Xếp hạng ngày phù hợp cho 1 việc cụ thể trong khoảng thời gian.
 * v3 (07/10/2026): quy tắc theo VIỆC (đặc tả §8.4/§12) — xung tuổi LOẠI ngày, Nguyệt phá/Tuế phá TRỪ ĐIỂM nặng cho việc trọng đại,
 * Tam Nương/Nguyệt kỵ/Kim Lâu/Tam Tai chỉ áp cho việc chịu các kỵ đó; Trực Phá/Nguyệt phá tính MỘT lần.
 * Một bộ máy dùng chung cho chế độ có lá số (scoreNhatVan) và chế độ cơ bản (genericDayFacts).
 */

import type { AstrologyResult, FiveElement } from '../types';
import {
  scoreNhatVan, goodBadHours, auspiciousHours, genericDayFacts, ratingOfScore,
  type HourWindow, type NhatVanScore, type GenericDayFacts,
} from './nhatVan';
import { elementPhongThuy } from './phongThuyBatTu';
import { solarToLunar } from './lunarCalendar';
import { findTaskByCode, DAY_PICK_GROUPS, NUMBER_GROUP_CODE, type DayPickGroup, type DayPickTask } from '../data/dayPickTasks';
import {
  DAY_HARD, BREAK_EXEMPT_GROUPS, KIM_LAU_TASKS, isBigTask, DAY_RULEBOOK_VERSION, TASK_TO_HK, TASK_SOFT_NGHI,
  HK_DAY_BRANCH_KY, HK_DAY_BRANCH_PENALTY,
} from './dayQualityTables';
import { HK_TRUC } from '../data/hiepKyTruc';

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
  // v3
  /** Trực của ngày nghi / kỵ việc này theo Hiệp Kỷ (hoặc nhóm việc nếu chưa có mục). */
  trucFit?: 'nghi' | 'ky' | '';
  /** Lý do chính ngắn gọn (dùng cho danh sách "việc hợp / nên tránh"). */
  note?: string;
}

const WEEKDAY = ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'];

// DỰ PHÒNG theo nhóm việc — chỉ dùng cho việc chưa có mục Hiệp Kỷ tương ứng (TASK_TO_HK). Việc có mục thì dùng nghi/kỵ đích danh của Hiệp Kỷ quyển 11.
const TRUC_GOOD: Record<string, number[]> = {
  WORK:   [4, 8, 10],
  BIZ:    [4, 8, 10, 0],
  FIN:    [4, 8, 9],
  PROP:   [4, 8, 10],
  LOVE:   [4, 8, 2],
  CHILD:  [4, 8],
  EDU:    [0, 8, 10],
  TRAVEL: [0, 10],
  HEALTH: [1, 6],
  LEGAL:  [4, 8, 5],
  SPIRIT: [1, 0],
  VIP:    [4, 8, 10],
};
// Dự phòng: Nguy, Bế kỵ việc lớn. Phá (6) KHÔNG ở đây: Trực Phá ≡ Nguyệt phá, xử lý một lần ở quy tắc loại/trần bên dưới.
const TRUC_BAD_IDX = new Set([7, 11]);

/** Trực nghi/kỵ của một việc: ưu tiên mục Hiệp Kỷ quyển 11 (đích danh), nếu không có mục thì dự phòng theo nhóm. */
export function trucRulesOf(task: DayPickTask, group: DayPickGroup): { nghi: number[]; ky: number[]; source: string } {
  const hk = TASK_TO_HK[task.code];
  if (hk && HK_TRUC[hk]) {
    const row = HK_TRUC[hk];
    return { nghi: [...new Set([...row.nghi, ...(TASK_SOFT_NGHI[task.code] || [])])], ky: row.ky, source: `Hiệp Kỷ «${row.vi}»` };
  }
  return { nghi: TRUC_GOOD[group.code] || [], ky: [...TRUC_BAD_IDX], source: 'nhóm việc' };
}

/** Điểm cộng/trừ theo Trực (nghi +8, kỵ −10; Phá-kỵ đã tính ở Nguyệt phá) + hành chi ngày (heuristic TẠM). */
function taskBonus(groupCode: string, dayElement: FiveElement, trucIdx: number, rules: { nghi: number[]; ky: number[] }): number {
  let bonus = 0;
  if (rules.nghi.includes(trucIdx)) bonus += 8;
  else if (trucIdx !== 6 && rules.ky.includes(trucIdx)) bonus -= 10;

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
  /** Số ngày bị LOẠI theo quy tắc cứng của việc này (để giải thích vì sao ít ngày). */
  excluded?: { xungTuoi: number };
  ruleVersion?: string;
  /** Mọi ngày đã chấm (kể cả < 40 điểm / bị loại) — chỉ khi gọi với includeAll. */
  all?: DayPickResult[];
}

/** Cảnh báo cấp ngày/năm nào áp cho việc này — các cảnh báo không liên quan bị ẩn để khỏi nhiễu. */
/** Việc KHÔNG chịu Nguyệt phá/Tuế phá: nhóm Sức khỏe, hoặc mục Hiệp Kỷ có Phá trong Trực nghi (cầu y, phá nhà — quyển 10 nêu nhóm không kỵ Nguyệt phá). */
export function isBreakExempt(task: DayPickTask, group: DayPickGroup): boolean {
  if (BREAK_EXEMPT_GROUPS.has(group.code)) return true;
  const hk = TASK_TO_HK[task.code];
  return !!(hk && HK_TRUC[hk]?.nghi.includes(6));
}

function warningsForTask(warnings: string[], group: DayPickGroup, task: DayPickTask): string[] {
  const big = isBigTask(group.code, task.weight);
  const exempt = isBreakExempt(task, group);
  return warnings.filter(w => {
    if (w.includes('Tam Nương') || w.includes('Nguyệt Kỵ')) return big;
    if (w.includes('Nguyệt phá') || w.includes('Tuế phá')) return task.weight >= 4 && !exempt;
    if (w.includes('Kim Lâu')) return KIM_LAU_TASKS.has(task.code);
    if (w.includes('Tam Tai')) return task.weight >= 4;
    return true;
  });
}

interface DayInputs {
  /** Điểm các tầng TRƯỚC quy tắc cứng. */
  beforeHard: number;
  trucIdx: number;
  branchEl: FiveElement;
  xungTuoi: boolean;
  monthBreak: boolean;
  tuePha: boolean;
  tamNuong: boolean;
  nguyetKy: boolean;
}

/** Quy tắc cứng THEO VIỆC: trả điểm đã áp, hoặc lý do loại. */
function applyTaskRules(inp: DayInputs, group: DayPickGroup, task: DayPickTask): { score: number; excluded?: 'xungTuoi' } {
  const heavy = task.weight >= 4;
  const exempt = isBreakExempt(task, group);
  if (heavy && inp.xungTuoi) return { score: 0, excluded: 'xungTuoi' };

  let s = inp.beforeHard;
  // Việc trọng đại gặp Nguyệt phá/Tuế phá: TRỪ ĐIỂM nặng + trần (anh Toàn chọn 07/10/2026: không loại hẳn).
  if (heavy && !exempt && inp.monthBreak) s = Math.min(s - 15, DAY_HARD.monthBreakCap);
  if (heavy && !exempt && inp.tuePha) s = Math.min(s - 10, DAY_HARD.tuePhaCap);
  if (!heavy && !exempt && inp.monthBreak) s = Math.min(s, 50);          // việc nhẹ: Nguyệt phá chỉ kéo xuống mức "bình thường"
  if (!heavy && inp.xungTuoi) s = Math.min(s, DAY_HARD.xungTuoiCap + 10); // việc nhẹ: xung tuổi chỉ trần mềm
  if (isBigTask(group.code, task.weight)) {
    if (inp.tamNuong) s -= DAY_HARD.tamNuong;
    if (inp.nguyetKy) s -= DAY_HARD.nguyetKy;
  }
  return { score: Math.max(0, Math.min(100, s)) };
}

function pickDays(taskCode: string, from: Date, to: Date, personal: AstrologyResult | null, includeAll = false): DayPickOutput {
  const found = findTaskByCode(taskCode);
  if (!found) {
    return {
      task: { groupName: '?', taskName: '?', emoji: '' },
      totalDays: 0, okDays: 0, top: [],
      warning: 'Không tìm thấy việc trong danh mục.',
    };
  }
  const { group, task } = found;
  const fromTs = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const toTs = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  if (toTs < fromTs) return {
    task: { groupName: group.name, taskName: task.name, emoji: group.emoji },
    totalDays: 0, okDays: 0, top: [],
    warning: 'Ngày kết thúc phải sau ngày bắt đầu.',
  };
  const DAY_MS = 86400000;
  const totalDays = Math.floor((toTs - fromTs) / DAY_MS) + 1;
  const safeTotal = Math.min(totalDays, 366);
  const lastTs = totalDays > 366 ? fromTs + 365 * DAY_MS : toTs;

  let goodPhong: ReturnType<typeof elementPhongThuy> | null = null;
  let badPhong: ReturnType<typeof elementPhongThuy> | null = null;
  if (personal) {
    const fav = personal.batTuChart.favorableElements || [];
    const unfav = personal.batTuChart.unfavorableElements || [];
    goodPhong = elementPhongThuy(fav[0] || personal.batTuChart.dayMasterElement);
    badPhong = unfav[0] ? elementPhongThuy(unfav[0]) : null;
  }

  const trucRules = trucRulesOf(task, group);
  const candidates: DayPickResult[] = [];
  const excluded = { xungTuoi: 0 };
  let okCount = 0;

  for (let t = fromTs; t <= lastTs; t += DAY_MS) {
    const date = new Date(t);
    const ld = solarToLunar(date.getDate(), date.getMonth() + 1, date.getFullYear());
    const sc: NhatVanScore | null = personal ? scoreNhatVan(personal, date) : null;
    const gf: GenericDayFacts | null = personal ? null : genericDayFacts(date);
    const f = (sc ?? gf)!;

    const inp: DayInputs = sc
      ? {
        beforeHard: sc.layers.beforeHard, trucIdx: sc.trucIdx, branchEl: sc.canChi.branchEl, xungTuoi: sc.xungTuoi,
        monthBreak: sc.monthBreak, tuePha: sc.tuePha, tamNuong: sc.tamNuong, nguyetKy: sc.nguyetKy,
      }
      : {
        beforeHard: gf!.beforeHard, trucIdx: gf!.trucIdx, branchEl: gf!.canChi.branchEl, xungTuoi: false,
        monthBreak: gf!.monthBreak, tuePha: gf!.tuePha, tamNuong: gf!.tamNuong, nguyetKy: gf!.nguyetKy,
      };

    const base = {
      date,
      dateLabel: `${WEEKDAY[date.getDay()]}, ${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()}`,
      lunarLabel: `Âm: ${ld.day}/${ld.month}${ld.isLeapMonth ? ' nhuận' : ''}/${ld.year}`,
      canChiLabel: `Ngày ${f.canChi.stem} ${f.canChi.branch}`,
      truc: f.truc, lucDieu: f.lucDieu, hoangDao: f.hoangDao, nhi28Tu: f.nhi28Tu,
      warnings: warningsForTask(f.warnings, group, task),
    };

    const r = applyTaskRules(inp, group, task);
    if (r.excluded) {
      excluded[r.excluded]++;
      const why = 'XUNG tuổi';
      candidates.push({
        ...base,
        rating: `Loại (${why.toLowerCase()})`, score: -999, score100: 0, trucFit: '', note: 'xung tuổi',
        reasons: [...f.reasons, `⚠ Ngày ${why} — không phù hợp việc trọng đại "${task.name}"; bỏ qua.`],
        bestHours: [], generalHours: [], direction: '', goodColor: '', avoidColor: '',
      });
      continue;
    }

    const bonus = taskBonus(group.code, inp.branchEl, inp.trucIdx, trucRules);
    const adjusted = Math.max(0, Math.min(100, Math.round(r.score + bonus)));
    const reasons = [...f.reasons];
    const dayKy = TASK_TO_HK[task.code] ? HK_DAY_BRANCH_KY[TASK_TO_HK[task.code]] : undefined;
    let adjustedFinal = adjusted;
    if (dayKy && f.canChi.branch === dayKy.branch) {
      adjustedFinal = Math.max(0, adjusted - HK_DAY_BRANCH_PENALTY);
      reasons.push(`Hiệp Kỷ: ${dayKy.why} — trừ điểm.`);
    }
    if (trucRules.nghi.includes(inp.trucIdx)) reasons.push(`Trực ${f.truc} nghi việc "${task.name}" (${trucRules.source}) — thêm điểm.`);
    else if (inp.trucIdx !== 6 && trucRules.ky.includes(inp.trucIdx)) reasons.push(`Trực ${f.truc} kỵ việc "${task.name}" (${trucRules.source}) — trừ điểm.`);

    if (adjustedFinal >= 55) okCount++;

    const trucFit: 'nghi' | 'ky' | '' = trucRules.nghi.includes(inp.trucIdx) ? 'nghi' : (inp.trucIdx !== 6 && trucRules.ky.includes(inp.trucIdx)) ? 'ky' : '';
    const heavy = task.weight >= 4 && !isBreakExempt(task, group);
    const note =
      heavy && inp.monthBreak ? 'Nguyệt phá'
      : heavy && inp.tuePha ? 'Tuế phá'
      : dayKy && f.canChi.branch === dayKy.branch ? dayKy.why
      : trucFit === 'nghi' ? `Trực ${f.truc} nghi`
      : trucFit === 'ky' ? `Trực ${f.truc} kỵ`
      : isBigTask(group.code, task.weight) && (inp.tamNuong || inp.nguyetKy) ? (inp.tamNuong ? 'Tam Nương' : 'Nguyệt kỵ')
      : adjustedFinal < 40 ? 'điểm ngày thấp' : '';

    candidates.push({
      ...base,
      rating: ratingOfScore(adjustedFinal), score: sc ? sc.score : 0, score100: adjustedFinal,
      reasons: reasons.slice(0, 5),
      bestHours: personal ? goodBadHours(personal, date).good.slice(0, 3) : [],
      generalHours: auspiciousHours(date),
      direction: goodPhong ? goodPhong.huong : '',
      goodColor: goodPhong ? goodPhong.mau.split(';')[0].trim() : '',
      avoidColor: badPhong ? badPhong.mau.split(';')[0].trim() : '',
      trucFit, note,
    });
  }

  const top = candidates
    .filter(c => c.score100 >= 40)
    .sort((a, b) => b.score100 - a.score100)
    .slice(0, 5);

  let warning: string | undefined;
  if (totalDays > 366) warning = `Khoảng thời gian quá dài; chỉ phân tích 366 ngày đầu.`;
  if (top.length === 0) {
    warning = (warning ? warning + ' ' : '') +
      `Trong ${safeTotal} ngày, không có ngày phù hợp cho "${task.name}".` +
      (excluded.xungTuoi > 0 ? ` (${excluded.xungTuoi} ngày bị loại vì xung tuổi.)` : '') +
      ' Thử chọn khoảng thời gian khác.';
  }

  return {
    task: { groupName: group.name, taskName: task.name, emoji: group.emoji },
    totalDays: safeTotal, okDays: okCount, top, warning,
    excluded, ruleVersion: DAY_RULEBOOK_VERSION,
    ...(includeAll ? { all: candidates } : {}),
  };
}

export function pickGoodDays(result: AstrologyResult, taskCode: string, from: Date, to: Date): DayPickOutput {
  return pickDays(taskCode, from, to, result);
}

/** Bản KHÔNG cá nhân hóa (chưa gắn lá số): chỉ tầng lịch trạch nhật + quy tắc cứng lịch chung; bỏ xung tuổi, giờ riêng, hướng/màu theo Dụng-Kỵ thần. */
export function pickGoodDaysGeneric(taskCode: string, from: Date, to: Date): DayPickOutput {
  return pickDays(taskCode, from, to, null);
}

export interface DayTaskFit { code: string; name: string; emoji: string; groupName: string; score100: number; note: string }

/**
 * "Việc hợp / nên tránh hôm nay": chấm CHÍNH NGÀY ĐÓ cho 54 việc của "Xem ngày tốt" bằng đúng bộ máy pickDays (không công thức riêng).
 *  - HỢP: Trực của ngày NGHI việc đó (Hiệp Kỷ quyển 11) và điểm sau quy tắc ≥ 55.
 *  - NÊN TRÁNH: bị loại (xung tuổi), hoặc việc trọng đại gặp Nguyệt phá/Tuế phá, hoặc điểm < 40, hoặc Trực kỵ việc đó.
 * Nhóm "Xem số hợp mệnh" không có ngày nên không xét. Ô trống Hiệp Kỷ ≠ "được phép" nên việc không nghi cũng không kỵ không xuất hiện ở đâu cả.
 */
export function tasksForDay(date: Date, personal: AstrologyResult | null): { good: DayTaskFit[]; avoid: DayTaskFit[] } {
  const good: DayTaskFit[] = [];
  const avoid: DayTaskFit[] = [];
  for (const g of DAY_PICK_GROUPS) {
    if (g.code === NUMBER_GROUP_CODE) continue;
    for (const task of g.tasks) {
      const c = pickDays(task.code, date, date, personal, true).all?.[0];
      if (!c) continue;
      const item: DayTaskFit = { code: task.code, name: task.name, emoji: g.emoji, groupName: g.name, score100: c.score100, note: c.note || '' };
      const excludedDay = c.score100 === 0 && c.rating.startsWith('Loại');
      const broken = c.note === 'Nguyệt phá' || c.note === 'Tuế phá';
      if (excludedDay || broken || c.score100 < 40 || c.trucFit === 'ky') avoid.push({ ...item, note: item.note || 'Trực kỵ' });
      else if (c.trucFit === 'nghi' && c.score100 >= 55) good.push(item);
    }
  }
  good.sort((a, b) => b.score100 - a.score100);
  avoid.sort((a, b) => a.score100 - b.score100);
  return { good, avoid };
}
