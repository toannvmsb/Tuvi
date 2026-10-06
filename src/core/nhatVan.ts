/**
 * XEM THEO NGÀY (Nhật vận / Trạch nhật theo lá số) — v3 (07/10/2026, theo "Tuzi_Nghien_cuu_va_dac_ta_engine").
 *
 * Các tầng (trọng số: DAY_WEIGHTS trong dayQualityTables.ts, version DAY_RULEBOOK_VERSION):
 *   E  Lịch trạch nhật: Trực (Kiến Trừ), Hoàng/Hắc đạo ngày, Lục Diệu, Nhị thập bát tú, Thiên/Nguyệt Đức
 *   B  Tương tác Bát Tự: Dụng/Kỵ thần với can-chi ngày (+ thập thần) và quan hệ chi ngày với 4 trụ
 *   Đại vận · Lưu niên (năm Lập Xuân) · Nguyệt vận (mùa theo THÁNG TIẾT KHÍ)
 * Hard rules cấp ngày: Xung tuổi, Nguyệt phá, Tuế phá, Tam Nương, Nguyệt Kỵ (Tam Tai/Kim Lâu chỉ cảnh báo).
 *
 * SỬA SO VỚI BẢN CŨ: (1) Trực, Hoàng đạo, Nguyệt phá, vượng/suy theo mùa dùng THÁNG TIẾT KHÍ thay vì tháng âm lịch;
 * (2) Nguyệt phá/Trực Phá chỉ tính MỘT lần (chống đếm trùng, đặc tả §12.4); (3) lưu niên theo năm Lập Xuân, Tam Tai theo năm âm;
 * (4) bảng 28 tú sửa 8 tú chấm nhầm; (5) thêm quan hệ chi ngày với 4 trụ + thập thần; (6) quy tắc theo việc ở dayPicker.
 */

import type { AstrologyResult, FiveElement, HeavenlyStem, EarthlyBranch } from '../types';
import { elementPhongThuy } from './phongThuyBatTu';
import { scoreDaiVan } from './daiVanScore';
import { tuoiMuOfYear } from './ageUtil';
import { solarToLunar } from './lunarCalendar';
import { thapThanOf } from './thapThan';
import { branchRelations } from './baziRelations';
import { dayCalendarFacts, jdFromDate, STEMS, BRANCHES, type DayCalendarFacts } from './dayCalendar';
import {
  DAY_WEIGHTS, DAY_RATING_CUTS, DAY_HARD, DAY_RULEBOOK_VERSION,
  NHI28_NAMES, NHI28_SCORES, NHI28_HINT, NHI28_REF_JD, NHI28_REF_IDX,
  THIEN_DUC_BY_MONTH, NGUYET_DUC_BY_MONTH,
} from './dayQualityTables';

const STEM_ELEMENT: Record<HeavenlyStem, FiveElement> = {
  Giáp:'Mộc',Ất:'Mộc',Bính:'Hỏa',Đinh:'Hỏa',Mậu:'Thổ',Kỷ:'Thổ',
  Canh:'Kim',Tân:'Kim',Nhâm:'Thủy',Quý:'Thủy',
};
const BRANCH_ELEMENT: Record<EarthlyBranch, FiveElement> = {
  Tý:'Thủy',Sửu:'Thổ',Dần:'Mộc',Mão:'Mộc',Thìn:'Thổ',Tị:'Hỏa',
  Ngọ:'Hỏa',Mùi:'Thổ',Thân:'Kim',Dậu:'Kim',Tuất:'Thổ',Hợi:'Thủy',
};
const TAM_HOP: EarthlyBranch[][] = [
  ['Thân','Tý','Thìn'],['Dần','Ngọ','Tuất'],['Tị','Dậu','Sửu'],['Hợi','Mão','Mùi'],
];
const XUNG: Record<EarthlyBranch, EarthlyBranch> = {
  Tý:'Ngọ',Ngọ:'Tý',Sửu:'Mùi',Mùi:'Sửu',Dần:'Thân',Thân:'Dần',
  Mão:'Dậu',Dậu:'Mão',Thìn:'Tuất',Tuất:'Thìn',Tị:'Hợi',Hợi:'Tị',
};

export interface DayCanChi {
  stem: HeavenlyStem; branch: EarthlyBranch; stemEl: FiveElement; branchEl: FiveElement;
}

export function dayCanChi(date: Date): DayCanChi {
  const jd = jdFromDate(date.getDate(), date.getMonth()+1, date.getFullYear());
  const stem = STEMS[((jd+9)%10+10)%10];
  const branch = BRANCHES[((jd+1)%12+12)%12];
  return { stem, branch, stemEl: STEM_ELEMENT[stem], branchEl: BRANCH_ELEMENT[branch] };
}

// ─────────────────────────────────────────────
// CẤP 1: TRỰC NGÀY
// ─────────────────────────────────────────────
export const TRUC_NAMES = ['Kiến','Trừ','Mãn','Bình','Định','Chấp','Phá','Nguy','Thành','Thu','Khai','Bế'];
// Điểm Trực CHUNG cho lịch màu (không gắn việc). Đã THU HẸP chênh lệch 07/10/2026: Hiệp Kỷ nói không Trực nào cát/hung tuyệt đối, Bình/Thu/Bế có
// danh sách kỵ rộng, nghi/kỵ phụ thuộc VIỆC (xem dayPicker.trucRulesOf). Phá (6) được trung hòa ở calendarLayer vì đã tính ở Nguyệt phá.
const TRUC_SCORES = [58, 60, 60, 48, 66, 56, 55, 50, 66, 52, 66, 46];
const TRUC_HINT = [
  'hợp khởi đầu, xuất quân, nhậm chức',
  'hợp dọn dẹp, trừ bệnh, cắt tóc',
  'hợp ăn hỏi, cầu tài, nhập trạch',
  'việc thường nhật, sửa đường đắp nền',
  'hợp cưới hỏi, ký kết, nhậm chức',
  'hợp ký khế ước, giao dịch',
  'kỵ mọi việc trọng đại — chỉ hợp phá dỡ',
  'kỵ leo cao, đi xa, việc mạo hiểm',
  'hợp cưới hỏi, khai trương, ký hợp đồng',
  'hợp thu tiền, nhập kho, ký kết',
  'hợp khai trương, động thổ, xuất hành',
  'kỵ khai trương, xuất hành — hợp đắp đê, xây bồn',
];
// Trực tốt cho từng loại việc (taskGroup → Trực index nên dùng)
const TRUC_GOOD_FOR: Record<string, number[]> = {
  WORK:   [4, 8, 10],   // Định, Thành, Khai
  BIZ:    [4, 8, 10, 0],// + Kiến
  FIN:    [4, 8, 9],    // Định, Thành, Thu
  PROP:   [4, 8, 10],
  LOVE:   [4, 8, 2],    // Định, Thành, Mãn
  CHILD:  [4, 8],
  EDU:    [0, 8, 10],
  TRAVEL: [0, 10],
  HEALTH: [1],          // Trừ hợp trừ bệnh
  LEGAL:  [4, 8, 5],    // Định, Thành, Chấp
  SPIRIT: [1, 0],
  VIP:    [4, 8, 10],
};
const TRUC_BAD_FOR: number[] = [6, 7, 11]; // Phá, Nguy, Bế — kỵ việc lớn

/**
 * Trực = (chi ngày − chi THÁNG TIẾT KHÍ) mod 12 (đặc tả §8.2). Ngày giao tiết dùng tháng MỚI nên Trực lặp lại với hôm trước — đúng truyền thống.
 * ⚠ Trước 07/10/2026 hàm nhận tháng ÂM LỊCH → sai Trực ở ~nửa số ngày.
 */
export function trucNgayInfo(dayBranch: EarthlyBranch, monthBranch: EarthlyBranch): { name: string; score: number; hint: string; idx: number } {
  const dayIdx = BRANCHES.indexOf(dayBranch);
  const mIdx = BRANCHES.indexOf(monthBranch);
  const trucIdx = ((dayIdx - mIdx) % 12 + 12) % 12;
  return { name: TRUC_NAMES[trucIdx], score: TRUC_SCORES[trucIdx], hint: TRUC_HINT[trucIdx], idx: trucIdx };
}

// ─────────────────────────────────────────────
// CẤP 1: LỤC DIỆU
// ─────────────────────────────────────────────
const LUC_DIEU_NAMES = ['Đại An','Lưu Niên','Tốc Hỷ','Xích Khẩu','Tiểu Cát','Không Vong'];
const LUC_DIEU_SCORES = [65, 50, 80, 25, 60, 20];
const LUC_DIEU_HINT = [
  'bình an, việc chậm nhưng chắc',
  'việc kéo dài, cần kiên nhẫn',
  'đại cát — tin vui đến nhanh',
  'dễ khẩu thiệt, tranh cãi — hung',
  'thuận lợi vừa phải',
  'trống rỗng, việc dễ tan vỡ — hung',
];
// Offset mùng 1 cho từng tháng âm lịch (index = lunarMonth - 1)
const LUC_DIEU_START = [0, 2, 4, 5, 3, 1, 0, 2, 4, 5, 3, 1];

export function lucDieuInfo(lunarMonth: number, lunarDay: number): { name: string; score: number; hint: string } {
  const start = LUC_DIEU_START[Math.max(0, Math.min(11, lunarMonth - 1))];
  const idx = (start + lunarDay - 1) % 6;
  return { name: LUC_DIEU_NAMES[idx], score: LUC_DIEU_SCORES[idx], hint: LUC_DIEU_HINT[idx] };
}

// ─────────────────────────────────────────────
// CẤP 1: HOÀNG ĐẠO / HẮC ĐẠO NGÀY
// ─────────────────────────────────────────────
// Cùng cấu trúc với bảng giờ Hoàng Đạo (tự tương đồng: tháng→ngày, ngày→giờ)
const HOANG_DAO_BY_MONTH: Record<EarthlyBranch, EarthlyBranch[]> = {
  Tý:  ['Tý','Sửu','Mão','Ngọ','Thân','Dậu'],  Ngọ: ['Tý','Sửu','Mão','Ngọ','Thân','Dậu'],
  Sửu: ['Dần','Mão','Tị','Thân','Tuất','Hợi'],  Mùi: ['Dần','Mão','Tị','Thân','Tuất','Hợi'],
  Dần: ['Tý','Sửu','Thìn','Tị','Mùi','Tuất'],   Thân:['Tý','Sửu','Thìn','Tị','Mùi','Tuất'],
  Mão: ['Tý','Dần','Mão','Ngọ','Mùi','Dậu'],    Dậu: ['Tý','Dần','Mão','Ngọ','Mùi','Dậu'],
  Thìn:['Dần','Thìn','Tị','Thân','Dậu','Hợi'],  Tuất:['Dần','Thìn','Tị','Thân','Dậu','Hợi'],
  Tị:  ['Sửu','Thìn','Ngọ','Mùi','Tuất','Hợi'], Hợi: ['Sửu','Thìn','Ngọ','Mùi','Tuất','Hợi'],
};

export function hoangDaoNgay(dayBranch: EarthlyBranch, monthBranch: EarthlyBranch): boolean {
  const goodDays = HOANG_DAO_BY_MONTH[monthBranch] || [];
  return goodDays.includes(dayBranch);
}

// ─────────────────────────────────────────────
// CẤP 4: LƯU NIÊN (năm hiện tại)
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// CẤP 5: NGUYỆT VẬN
// ─────────────────────────────────────────────
const VUONG_THANG: Record<FiveElement, number[]> = {
  Mộc:[1,2], Hỏa:[4,5], Thổ:[3,6,9,12], Kim:[7,8], Thủy:[10,11],
};
const SUY_THANG: Record<FiveElement, number[]> = {
  Mộc:[7,8], Hỏa:[10,11], Thổ:[], Kim:[1,2], Thủy:[4,5],
};

// ─────────────────────────────────────────────
// HARD RULES
// ─────────────────────────────────────────────
const TAM_NUONG_DAYS = new Set([3,7,13,18,22,27]);
const NGUYET_KY_DAYS = new Set([5,14,23]);

const TAM_TAI: { g: EarthlyBranch[]; ty: EarthlyBranch[] }[] = [
  { g:['Thân','Tý','Thìn'], ty:['Dần','Mão','Thìn'] },
  { g:['Dần','Ngọ','Tuất'], ty:['Thân','Dậu','Tuất'] },
  { g:['Tị','Dậu','Sửu'],  ty:['Hợi','Tý','Sửu'] },
  { g:['Hợi','Mão','Mùi'], ty:['Tị','Ngọ','Mùi'] },
];

const KIM_LAU_MAP: Record<number, string> = {
  1:'Kim Lâu Thân', 3:'Kim Lâu Thê', 6:'Kim Lâu Tử', 8:'Kim Lâu Lục Súc',
};

export function kimLauType(age: number): string | null {
  return KIM_LAU_MAP[age % 9] || null;
}

export function isTamTai(birthBranch: EarthlyBranch, currentYearBranch: EarthlyBranch): boolean {
  return TAM_TAI.some(t => t.g.includes(birthBranch) && t.ty.includes(currentYearBranch));
}

// ─────────────────────────────────────────────
// CẤP 1: NHỊ THẬP BÁT TÚ (28 lunar mansions)
// ─────────────────────────────────────────────
// Bảng cát/hung 28 tú: xem dayQualityTables.ts (NHI28_*)

export function nhi28Info(date: Date): { name: string; score: number; idx: number; hint: string } {
  const jd = jdFromDate(date.getDate(), date.getMonth()+1, date.getFullYear());
  const idx = ((jd - NHI28_REF_JD + NHI28_REF_IDX) % 28 + 28) % 28;
  return { name: NHI28_NAMES[idx], score: NHI28_SCORES[idx], idx, hint: NHI28_HINT[idx] };
}

// ─────────────────────────────────────────────
// NhatVanScore interface (v3 — tương thích ngược, chỉ THÊM trường)
// ─────────────────────────────────────────────
export type NhatVanRating = 'Rất tốt' | 'Tốt' | 'Bình thường' | 'Cần thận trọng' | 'Xấu';

export function ratingOfScore(s: number): NhatVanRating {
  return s >= DAY_RATING_CUTS.veryGood ? 'Rất tốt'
    : s >= DAY_RATING_CUTS.good ? 'Tốt'
    : s >= DAY_RATING_CUTS.normal ? 'Bình thường'
    : s >= DAY_RATING_CUTS.caution ? 'Cần thận trọng' : 'Xấu';
}

export interface NhatVanScore {
  date: Date;
  canChi: DayCanChi;
  rating: NhatVanRating;
  score: number;      // integer, backward compat (Cấp 2 only)
  score100: number;   // 0-100 tổng hợp các tầng sau quy tắc cứng
  xungTuoi: boolean;
  hopTuoi: boolean;
  reasons: string[];
  // v2
  truc: string;
  lucDieu: string;
  hoangDao: boolean;
  nhi28Tu: string;    // Nhị thập bát tú
  tamNuong: boolean;
  nguyetKy: boolean;
  warnings: string[];
  // v3
  /** Chỉ số Trực 0..11 (0 = Kiến … 6 = Phá). */
  trucIdx: number;
  /** Chi tháng tiết khí chứa ngày. */
  monthBranch: EarthlyBranch;
  /** Nguyệt phá: chi ngày xung chi tháng tiết khí (cùng nguồn với Trực Phá — chỉ tính một lần). */
  monthBreak: boolean;
  /** Tuế phá: chi ngày xung Thái Tuế của năm (Lập Xuân). */
  tuePha: boolean;
  /** Đức trúng ngày: 'Thiên Đức' / 'Nguyệt Đức'. */
  duc: string[];
  /** Thập thần của can ngày so với nhật chủ. */
  thapThan: string;
  /** Điểm từng tầng (0..100) TRƯỚC quy tắc cứng — để dayPicker/giải thích dùng lại, không chấm lại. */
  layers: { calendar: number; bazi: number; daiVan: number; luuNien: number; nguyetVan: number; beforeHard: number };
  ruleVersion: string;
}

/** Điểm lịch nền (E): Trực + Hoàng/Hắc đạo + Lục Diệu + Tú + Đức; Trực Phá không tính ở đây (đã nằm ở Nguyệt phá). */
function calendarLayer(date: Date, cal: DayCalendarFacts, cc: DayCanChi) {
  const truc = trucNgayInfo(cc.branch, cal.monthBranch);
  const ld6 = lucDieuInfo(cal.lunarMonth, cal.lunarDay);
  const isHoangDao = hoangDaoNgay(cc.branch, cal.monthBranch);
  const nhi28 = nhi28Info(date);
  const monthBreak = truc.idx === 6; // chi ngày xung chi tháng ⇔ Trực Phá
  const trucScore = monthBreak ? 55 : truc.score;
  const hdScore = isHoangDao ? 70 : 30;
  let base100 = Math.round(trucScore * 0.30 + ld6.score * 0.15 + hdScore * 0.30 + nhi28.score * 0.25);

  const duc: string[] = [];
  if (THIEN_DUC_BY_MONTH[cal.monthIdx] === cc.stem || THIEN_DUC_BY_MONTH[cal.monthIdx] === cc.branch) duc.push('Thiên Đức');
  if (NGUYET_DUC_BY_MONTH[cal.monthIdx] === cc.stem) duc.push('Nguyệt Đức');
  base100 = Math.min(100, base100 + duc.length * DAY_HARD.ducBonus);

  const reasons: string[] = [];
  if (monthBreak) reasons.push(`Nguyệt phá — chi ngày ${cc.branch} xung chi tháng ${cal.monthBranch} (tiết khí): kỵ việc kiến lập, khai trương, cưới hỏi, động thổ.`);
  else reasons.push(`Trực ${truc.name} — ${truc.hint}.`);
  reasons.push(`Lục Diệu ${ld6.name} — ${ld6.hint}.`);
  reasons.push(isHoangDao ? 'Ngày Hoàng Đạo — khí trường tốt lành.' : 'Ngày Hắc Đạo — nên thận trọng trong hành động.');
  reasons.push(`Tú ${nhi28.name} — ${nhi28.hint}.`);
  if (duc.length) reasons.push(`${duc.join(' + ')} — ngày có đức khí, bớt được phần xấu thông thường (không giải được Nguyệt phá).`);

  return { truc, ld6, isHoangDao, nhi28, monthBreak, base100, duc, reasons };
}

/** Quy tắc cứng LỊCH CHUNG (không cần lá số): Nguyệt phá, Tuế phá, Tam Nương, Nguyệt Kỵ. */
function applyCalendarHardRules(raw100: number, cal: DayCalendarFacts, cc: DayCanChi, monthBreak: boolean, warnings: string[]) {
  let raw = raw100;
  const tuePha = XUNG[cc.branch] === cal.yearBranch;
  const tamNuong = TAM_NUONG_DAYS.has(cal.lunarDay);
  const nguyetKy = NGUYET_KY_DAYS.has(cal.lunarDay);
  if (monthBreak) {
    raw = Math.min(raw, DAY_HARD.monthBreakCap);
    warnings.push(`⚠ Ngày Nguyệt phá (chi ${cc.branch} xung tháng ${cal.monthBranch}) — tránh việc kiến lập, khai trương, cưới hỏi, động thổ.`);
  }
  if (tuePha) {
    raw = Math.min(raw, DAY_HARD.tuePhaCap);
    warnings.push(`⚠ Ngày Tuế phá (chi ${cc.branch} xung Thái Tuế ${cal.yearBranch}) — tránh việc lớn, động thổ, tu tạo.`);
  }
  if (tamNuong) {
    raw = Math.max(0, raw - DAY_HARD.tamNuong);
    warnings.push(`⚠ Ngày Tam Nương (${cal.lunarDay}/${cal.lunarMonth} âm) — kỵ cưới hỏi, khai trương, xuất hành.`);
  }
  if (nguyetKy) {
    raw = Math.max(0, raw - DAY_HARD.nguyetKy);
    warnings.push(`⚠ Ngày Nguyệt Kỵ (${cal.lunarDay}/${cal.lunarMonth} âm) — kỵ ký kết, xuất hành, việc lớn.`);
  }
  return { raw, tuePha, tamNuong, nguyetKy };
}

// Trọng số trụ khi xét quan hệ chi ngày với lá số: [năm, tháng, ngày, giờ]. TẠM.
const PILLAR_REL_W = [0.6, 0.8, 1.0, 0.5];
const PILLAR_LABEL = ['năm', 'tháng', 'ngày', 'giờ'];

/** Quan hệ chi ngày × chi 4 trụ của lá số. Xung dụng thần nặng hơn, xung kỵ thần nhẹ hơn (hỷ/kỵ ≠ cố định theo hành — đặc tả §3.1). */
function baziBranchRelations(
  result: AstrologyResult, dayBranch: EarthlyBranch, tuoiBranch: EarthlyBranch, xungTuoi: boolean,
  fav: FiveElement[], unfav: FiveElement[],
): { raw: number; notes: string[] } {
  const pillars = result.batTuChart.pillars;
  const items: { v: number; note: string }[] = [];
  pillars.forEach((p, i) => {
    const pb = p.branch;
    const w = PILLAR_REL_W[i];
    const rels = branchRelations(dayBranch, pb);
    const role = fav.includes(BRANCH_ELEMENT[pb]) ? 'dụng thần' : unfav.includes(BRANCH_ELEMENT[pb]) ? 'kỵ thần' : '';
    const roleTxt = role ? ` (${role})` : '';
    const where = `chi ${PILLAR_LABEL[i]} ${pb}`;
    if (rels.includes('xung')) {
      // Xung tuổi (trụ năm = chi tuổi) đã tính ở quy tắc cứng "Xung tuổi" — không phạt hai lần (đặc tả §12.4).
      if (!(i === 0 && xungTuoi && pb === tuoiBranch)) {
        const k = role === 'dụng thần' ? 1.3 : role === 'kỵ thần' ? 0.4 : 1;
        items.push({ v: -28 * w * k, note: `Chi ngày ${dayBranch} xung ${where}${roleTxt}.` });
      }
    } else {
      if (rels.includes('lucHop')) items.push({ v: 14 * w, note: `Chi ngày ${dayBranch} lục hợp ${where}${roleTxt}.` });
      else if (rels.includes('tamHop')) items.push({ v: 8 * w, note: `Chi ngày ${dayBranch} tam hợp ${where}${roleTxt}.` });
      if (rels.includes('hinh')) items.push({ v: -14 * w, note: `Chi ngày ${dayBranch} hình ${where}.` });
      if (rels.includes('hai')) items.push({ v: -10 * w, note: `Chi ngày ${dayBranch} hại ${where}.` });
      if (rels.includes('pha')) items.push({ v: -6 * w, note: `Chi ngày ${dayBranch} phá ${where}.` });
    }
  });
  const raw = Math.max(-45, Math.min(30, items.reduce((s, x) => s + x.v, 0)));
  const notes = items.sort((a, b) => Math.abs(b.v) - Math.abs(a.v)).slice(0, 3).map(x => x.note);
  return { raw, notes };
}

export function scoreNhatVan(result: AstrologyResult, date: Date): NhatVanScore {
  const cc = dayCanChi(date);
  const cal = dayCalendarFacts(date);
  const fav = result.batTuChart.favorableElements || [];
  const unfav = result.batTuChart.unfavorableElements || [];
  const yearBranch = result.tuViChart.lunarDate.yearBranch; // "tuổi" = chi năm âm lịch sinh

  const reasons: string[] = [];
  const warnings: string[] = [];

  // ── Xung / tam hợp tuổi ──
  const xungTuoi = XUNG[cc.branch] === yearBranch;
  const hopTuoi = TAM_HOP.some(g => g.includes(cc.branch) && g.includes(yearBranch) && cc.branch !== yearBranch);

  // ── B: Bát Tự (thập thần + hỷ/kỵ + quan hệ chi) ──
  const dm = result.batTuChart.dayMaster;
  const tt = thapThanOf(dm, cc.stem);
  let batTuRaw = 0;
  if (fav.includes(cc.stemEl)) { batTuRaw += 50; reasons.push(`Can ngày ${cc.stem} (${tt}) hành ${cc.stemEl} thuộc Dụng thần → được tiếp khí.`); }
  if (unfav.includes(cc.stemEl)) { batTuRaw -= 50; reasons.push(`Can ngày ${cc.stem} (${tt}) hành ${cc.stemEl} thuộc Kỵ thần → khí nghịch.`); }
  if (fav.includes(cc.branchEl)) { batTuRaw += 30; reasons.push(`Chi ngày hành ${cc.branchEl} hợp Dụng thần.`); }
  if (unfav.includes(cc.branchEl)) { batTuRaw -= 30; reasons.push(`Chi ngày hành ${cc.branchEl} thuộc Kỵ thần.`); }
  const rel = baziBranchRelations(result, cc.branch, yearBranch, xungTuoi, fav, unfav);
  batTuRaw += rel.raw;
  rel.notes.forEach(n => reasons.push(n));
  const batTu100 = Math.max(0, Math.min(100, Math.round(50 + batTuRaw * 0.625)));

  // Backward-compat integer score (Cấp 2 only, original scale)
  let score = 0;
  if (fav.includes(cc.stemEl)) score += 2;
  if (unfav.includes(cc.stemEl)) score -= 2;
  if (fav.includes(cc.branchEl)) score += 1;
  if (unfav.includes(cc.branchEl)) score -= 1;
  if (xungTuoi) { score -= 2; reasons.push(`Chi ngày ${cc.branch} XUNG tuổi ${yearBranch} → kiêng việc trọng đại.`); }
  else if (hopTuoi) { score += 1; reasons.push(`Chi ngày ${cc.branch} tam hợp tuổi ${yearBranch} → thuận hòa.`); }

  // ── E: lịch trạch nhật ──
  const E = calendarLayer(date, cal, cc);
  E.reasons.forEach(r => reasons.push(r));

  // ── Lưu niên: năm Lập Xuân (Thái Tuế của ngày) so Dụng/Kỵ + chi ngày hợp Thái Tuế ──
  const yStemEl = STEM_ELEMENT[cal.yearStem];
  const yBranchEl = BRANCH_ELEMENT[cal.yearBranch];
  let luuNienRaw = 0;
  if (fav.includes(yStemEl)) luuNienRaw += 40;
  if (unfav.includes(yStemEl)) luuNienRaw -= 40;
  if (fav.includes(yBranchEl)) luuNienRaw += 30;
  if (unfav.includes(yBranchEl)) luuNienRaw -= 30;
  if (branchRelations(cc.branch, cal.yearBranch).includes('lucHop')) luuNienRaw += 15;
  const luuNien100 = Math.max(0, Math.min(100, Math.round((luuNienRaw + 85) / 170 * 100)));

  // ── Nguyệt vận: hành ngày vượng/suy theo MÙA (tháng tiết khí). Nguyệt phá đã tính một lần ở quy tắc cứng → trung tính ở đây. ──
  const monthNo = cal.monthIdx + 1; // Dần = 1 … Sửu = 12
  let nguyetVanRaw = 10;
  if (E.monthBreak) {
    nguyetVanRaw = 0;
  } else if (SUY_THANG[cc.stemEl]?.includes(monthNo)) {
    nguyetVanRaw = -20;
    reasons.push(`Hành ngày ${cc.stemEl} đang suy trong tháng ${cal.monthBranch} (tiết khí).`);
  } else if (VUONG_THANG[cc.stemEl]?.includes(monthNo)) {
    nguyetVanRaw = 60;
    reasons.push(`Hành ngày ${cc.stemEl} đang vượng trong tháng ${cal.monthBranch} (tiết khí).`);
  }
  const nguyetVan100 = Math.max(0, Math.min(100, Math.round((nguyetVanRaw + 70) / 140 * 100)));

  // ── Đại Vận ──
  const age = Math.max(0, tuoiMuOfYear(result.birthInfo, cal.lunarYear)); // tuổi mụ theo năm ÂM của ngày xét
  let daiVan100 = 50;
  if (result.daiVans && result.daiVans.length > 0) {
    const curDV = result.daiVans.find(dv => age >= dv.startAge && age <= dv.endAge);
    if (curDV) {
      const dvSc = scoreDaiVan(result, curDV);
      const net = dvSc.taiLoc - dvSc.thachThuc * 0.5;
      daiVan100 = Math.max(0, Math.min(100, Math.round(50 + (net - 28) * 0.8)));
      reasons.push(`Đại Vận ${curDV.stem} ${curDV.branch} (tuổi ${curDV.startAge}–${curDV.endAge}): ${dvSc.rating}.`);
    }
  }

  // ── TỔNG HỢP ──
  const beforeHard =
    E.base100 * DAY_WEIGHTS.calendar + batTu100 * DAY_WEIGHTS.bazi + daiVan100 * DAY_WEIGHTS.daiVan +
    luuNien100 * DAY_WEIGHTS.luuNien + nguyetVan100 * DAY_WEIGHTS.nguyetVan;

  // ── HARD RULES ──
  let raw100 = beforeHard;
  if (xungTuoi) {
    raw100 = Math.min(raw100, DAY_HARD.xungTuoiCap);
    warnings.push(`⚠ Ngày XUNG TUỔI (${yearBranch}) — tránh mọi việc trọng đại.`);
  }
  const hr = applyCalendarHardRules(raw100, cal, cc, E.monthBreak, warnings);
  raw100 = hr.raw;
  // Tam Tai theo NĂM ÂM của ngày; Kim Lâu theo tuổi mụ — cảnh báo cấp năm, không trừ điểm ngày.
  if (isTamTai(yearBranch, cal.lunarYearBranch)) {
    warnings.push(`⚠ Năm Tam Tai (tuổi ${yearBranch}) — hạn chế việc trọng đại cả năm.`);
  }
  const kl = kimLauType(age);
  if (kl) warnings.push(`⚠ ${kl} (tuổi ${age}) — cẩn thận cưới hỏi, làm nhà trong năm.`);

  const score100 = Math.max(0, Math.min(100, Math.round(raw100)));

  return {
    date, canChi: cc,
    rating: ratingOfScore(score100), score, score100,
    xungTuoi, hopTuoi,
    reasons,
    truc: E.truc.name,
    lucDieu: E.ld6.name,
    hoangDao: E.isHoangDao,
    nhi28Tu: E.nhi28.name,
    tamNuong: hr.tamNuong, nguyetKy: hr.nguyetKy,
    warnings,
    trucIdx: E.truc.idx, monthBranch: cal.monthBranch, monthBreak: E.monthBreak, tuePha: hr.tuePha,
    duc: E.duc, thapThan: tt,
    layers: { calendar: E.base100, bazi: batTu100, daiVan: daiVan100, luuNien: luuNien100, nguyetVan: nguyetVan100, beforeHard: Math.round(beforeHard) },
    ruleVersion: DAY_RULEBOOK_VERSION,
  };
}

export interface GenericDayFacts {
  canChi: DayCanChi;
  rating: NhatVanRating;
  score100: number;
  reasons: string[];
  truc: string;
  trucIdx: number;
  lucDieu: string;
  hoangDao: boolean;
  nhi28Tu: string;
  warnings: string[];
  // v3
  /** Điểm lịch nền trước quy tắc cứng (dayPicker áp quy tắc theo việc). */
  beforeHard: number;
  monthBreak: boolean;
  tuePha: boolean;
  tamNuong: boolean;
  nguyetKy: boolean;
  duc: string[];
  ruleVersion: string;
}

/**
 * Bản KHÔNG cá nhân hóa của scoreNhatVan — dùng đúng tầng E (lịch trạch nhật: Trực, Lục Diệu, Hoàng Đạo, 28 Tú, Đức, tính
 * y hệt bên trong scoreNhatVan qua calendarLayer) + quy tắc cứng lịch chung (Nguyệt phá, Tuế phá, Tam Nương, Nguyệt Kỵ).
 * Bỏ các tầng cần lá số. Dùng cho Home/lịch/"Xem ngày tốt" khi CHƯA gắn lá số.
 */
export function genericDayFacts(date: Date): GenericDayFacts {
  const cc = dayCanChi(date);
  const cal = dayCalendarFacts(date);
  const E = calendarLayer(date, cal, cc);
  const warnings: string[] = [];
  const hr = applyCalendarHardRules(E.base100, cal, cc, E.monthBreak, warnings);
  const score100 = Math.max(0, Math.min(100, Math.round(hr.raw)));
  return {
    canChi: cc, rating: ratingOfScore(score100), score100, reasons: E.reasons,
    truc: E.truc.name, trucIdx: E.truc.idx, lucDieu: E.ld6.name, hoangDao: E.isHoangDao, nhi28Tu: E.nhi28.name,
    warnings,
    beforeHard: E.base100,
    monthBreak: E.monthBreak, tuePha: hr.tuePha, tamNuong: hr.tamNuong, nguyetKy: hr.nguyetKy, duc: E.duc,
    ruleVersion: DAY_RULEBOOK_VERSION,
  };
}

const WEEKDAY = ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'];

// ─────────────────────────────────────────────
// KHUNG GIỜ TỐT / XẤU TRONG NGÀY
// ─────────────────────────────────────────────
const HOUR_BRANCHES: { ch: EarthlyBranch; range: string; start: number; end: number }[] = [
  { ch:'Tý',  range:'23h–1h',  start:23, end:1 },
  { ch:'Sửu', range:'1h–3h',   start:1,  end:3 },
  { ch:'Dần', range:'3h–5h',   start:3,  end:5 },
  { ch:'Mão', range:'5h–7h',   start:5,  end:7 },
  { ch:'Thìn',range:'7h–9h',   start:7,  end:9 },
  { ch:'Tị',  range:'9h–11h',  start:9,  end:11 },
  { ch:'Ngọ', range:'11h–13h', start:11, end:13 },
  { ch:'Mùi', range:'13h–15h', start:13, end:15 },
  { ch:'Thân',range:'15h–17h', start:15, end:17 },
  { ch:'Dậu', range:'17h–19h', start:17, end:19 },
  { ch:'Tuất',range:'19h–21h', start:19, end:21 },
  { ch:'Hợi', range:'21h–23h', start:21, end:23 },
];

export interface HourWindow {
  branch: string;
  range: string;
  element: FiveElement;
  score: number;
  reason: string;
}

interface ScoredHour {
  ch: EarthlyBranch; start: number; end: number;
  element: FiveElement; score: number; reason: string;
}

function mergeConsecutiveHours(hours: ScoredHour[]): HourWindow[] {
  if (hours.length === 0) return [];
  const sorted = [...hours].sort((a, b) => a.start - b.start);
  const blocks: { chs: EarthlyBranch[]; start: number; end: number; score: number; reason: string; element: FiveElement }[] = [];
  for (const h of sorted) {
    const last = blocks[blocks.length - 1];
    if (last && last.end === h.start) {
      last.chs.push(h.ch); last.end = h.end;
      if (h.score > last.score) { last.score = h.score; last.reason = h.reason; last.element = h.element; }
    } else {
      blocks.push({ chs:[h.ch], start:h.start, end:h.end, score:h.score, reason:h.reason, element:h.element });
    }
  }
  return blocks.map(b => ({
    branch: b.chs.length > 1 ? `${b.chs[0]}–${b.chs[b.chs.length-1]}` : b.chs[0],
    range: `${b.start}h–${b.end}h`,
    element: b.element, score: b.score, reason: b.reason,
  }));
}

export function goodBadHours(result: AstrologyResult, date: Date): { good: HourWindow[]; bad: HourWindow[] } {
  const cc = dayCanChi(date);
  const fav = result.batTuChart.favorableElements || [];
  const unfav = result.batTuChart.unfavorableElements || [];
  const yearBranch = result.tuViChart.lunarDate.yearBranch;

  const scored: ScoredHour[] = HOUR_BRANCHES.map(({ ch, start, end }) => {
    const el = BRANCH_ELEMENT[ch];
    let s = 0; const parts: string[] = [];
    if (fav.includes(el)) { s += 2; parts.push(`hành ${el} hợp dụng thần`); }
    if (unfav.includes(el)) { s -= 2; parts.push(`hành ${el} thuộc kỵ thần`); }
    if (XUNG[ch] === cc.branch) { s -= 2; parts.push(`xung Chi ngày ${cc.branch}`); }
    else if (TAM_HOP.some(g => g.includes(ch) && g.includes(cc.branch) && ch !== cc.branch)) { s += 1; parts.push(`tam hợp Chi ngày`); }
    if (XUNG[ch] === yearBranch) { s -= 2; parts.push(`xung tuổi ${yearBranch}`); }
    else if (TAM_HOP.some(g => g.includes(ch) && g.includes(yearBranch) && ch !== yearBranch)) { s += 1; parts.push(`tam hợp tuổi`); }
    return { ch, start, end, element: el, score: s, reason: parts.join('; ') || 'trung tính' };
  });

  let goodH = scored.filter(h => h.score >= 2);
  if (goodH.length === 0) goodH = scored.filter(h => h.score > 0);
  const good = mergeConsecutiveHours(goodH).sort((a,b) => b.score - a.score).slice(0, 3);

  let badH = scored.filter(h => h.score <= -2);
  if (badH.length === 0) badH = scored.filter(h => h.score < 0);
  const bad = mergeConsecutiveHours(badH).sort((a,b) => a.score - b.score).slice(0, 2);

  return { good, bad };
}

const fmtHourLine = (h: HourWindow) => `Giờ ${h.branch} (${h.range}) — ${h.reason}`;

// ─────────────────────────────────────────────
// GIỜ HOÀNG ĐẠO (tốt CHUNG theo ngày — phong thủy lịch vạn niên)
// ─────────────────────────────────────────────
const HOANG_DAO_BY_DAY_BRANCH: Record<EarthlyBranch, EarthlyBranch[]> = {
  Tý:  ['Tý','Sửu','Mão','Ngọ','Thân','Dậu'],  Ngọ: ['Tý','Sửu','Mão','Ngọ','Thân','Dậu'],
  Sửu: ['Dần','Mão','Tị','Thân','Tuất','Hợi'],  Mùi: ['Dần','Mão','Tị','Thân','Tuất','Hợi'],
  Dần: ['Tý','Sửu','Thìn','Tị','Mùi','Tuất'],   Thân:['Tý','Sửu','Thìn','Tị','Mùi','Tuất'],
  Mão: ['Tý','Dần','Mão','Ngọ','Mùi','Dậu'],    Dậu: ['Tý','Dần','Mão','Ngọ','Mùi','Dậu'],
  Thìn:['Dần','Thìn','Tị','Thân','Dậu','Hợi'],  Tuất:['Dần','Thìn','Tị','Thân','Dậu','Hợi'],
  Tị:  ['Sửu','Thìn','Ngọ','Mùi','Tuất','Hợi'], Hợi: ['Sửu','Thìn','Ngọ','Mùi','Tuất','Hợi'],
};

export function auspiciousHours(date: Date): HourWindow[] {
  const cc = dayCanChi(date);
  const set = new Set<EarthlyBranch>(HOANG_DAO_BY_DAY_BRANCH[cc.branch] || []);
  const scored: ScoredHour[] = HOUR_BRANCHES
    .filter(hb => set.has(hb.ch))
    .map(hb => ({ ch:hb.ch, start:hb.start, end:hb.end, element:BRANCH_ELEMENT[hb.ch], score:1, reason:'giờ hoàng đạo' }));
  return mergeConsecutiveHours(scored);
}

// ─────────────────────────────────────────────
// BÁO CÁO OFFLINE (Cơ bản)
// ─────────────────────────────────────────────
export function generateNhatVanOffline(result: AstrologyResult, date: Date): string {
  const sc = scoreNhatVan(result, date);
  const ld = solarToLunar(date.getDate(), date.getMonth()+1, date.getFullYear());
  const fav = (result.batTuChart.favorableElements || []).slice(0, 2);
  const dung = fav.length ? fav : [result.batTuChart.dayMasterElement];
  const out: string[] = [];

  out.push(`**${WEEKDAY[date.getDay()]}, ngày ${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()}**`);
  out.push(`Âm lịch: ${ld.day}/${ld.month}${ld.isLeapMonth ? ' nhuận' : ''}/${ld.year}`);
  out.push(`Ngày **${sc.canChi.stem} ${sc.canChi.branch}** · Can ${sc.canChi.stemEl} · Chi ${sc.canChi.branchEl}`);
  out.push('');

  // Dòng tổng quan ngày
  const hdLabel = sc.hoangDao ? '☀ Hoàng Đạo' : '🌑 Hắc Đạo';
  out.push(`# Tổng quan ngày`);
  out.push(`- Trực: **${sc.truc}** · Lục Diệu: **${sc.lucDieu}** · ${hdLabel} · Tú **${sc.nhi28Tu}**`);
  out.push(`- Điểm tổng hợp: **${sc.score100}/100** — **${sc.rating}**`);
  out.push('');

  if (sc.warnings.length) {
    out.push('# ⚠ Cảnh báo quan trọng');
    sc.warnings.forEach(w => out.push(`- ${w}`));
    out.push('');
  }

  out.push('# Phân tích chi tiết');
  sc.reasons.forEach(r => out.push(`- ${r}`));
  out.push('');

  // Nên / không nên
  out.push('# Nên làm hôm nay');
  if (sc.rating === 'Rất tốt' || sc.rating === 'Tốt') {
    out.push('- Thuận để TIẾN HÀNH việc quan trọng: ký kết, khai trương, gặp đối tác, khởi sự.');
    out.push('- Chủ động đề xuất, mở rộng quan hệ, ra quyết định lớn.');
  } else if (sc.rating === 'Bình thường') {
    out.push('- Làm các việc thường ngày, hoàn thiện việc dang dở.');
    out.push('- Củng cố quan hệ, dọn dẹp, sắp xếp công việc.');
  } else {
    out.push('- Ưu tiên việc nội bộ, nhẹ nhàng; rà soát hơn là khởi sự mới.');
    out.push('- Giữ sức khỏe, nghỉ ngơi điều độ, làm việc thiện.');
  }
  out.push('');

  out.push('# Không nên làm hôm nay');
  if (sc.xungTuoi) out.push('- ⚠ XUNG TUỔI: tuyệt đối tránh cưới hỏi, khởi công, ký hợp đồng lớn, đi xa.');
  if (sc.monthBreak) out.push('- ⚠ NGUYỆT PHÁ: tránh khai trương, cưới hỏi, động thổ, nhập trạch, ký kết lớn.');
  if (sc.tuePha) out.push('- ⚠ TUẾ PHÁ: tránh việc lớn, động thổ, tu tạo.');
  if (sc.tamNuong) out.push('- ⚠ Tam Nương: tránh cưới hỏi, khai trương, xuất hành quan trọng.');
  if (sc.nguyetKy) out.push('- ⚠ Nguyệt Kỵ: tránh ký kết, xuất hành, ra quyết định lớn.');
  if (sc.rating === 'Cần thận trọng' || sc.rating === 'Xấu') {
    out.push('- Hạn chế đầu tư mạo hiểm, tranh cãi, đứng ra bảo lãnh.');
    out.push('- Cẩn trọng giấy tờ, đi lại, lời ăn tiếng nói.');
  } else if (!sc.xungTuoi && !sc.tamNuong && !sc.nguyetKy && !sc.monthBreak && !sc.tuePha) {
    out.push('- Không có điều đại kỵ; vẫn nên tránh nóng giận và quyết định vội vàng.');
  }
  out.push('');

  // Khung giờ
  const hr = goodBadHours(result, date);
  const general = auspiciousHours(date);
  out.push('# Khung giờ tốt / xấu');

  out.push('**▸ Khung giờ tốt CHO LÁ SỐ:**');
  if (hr.good.length) hr.good.forEach(h => out.push(`- ✦ ${fmtHourLine(h)}.`));
  else out.push('- Không có khung giờ nổi bật riêng cho lá số.');
  out.push('');

  out.push('**▸ Khung giờ tốt NÓI CHUNG (Giờ Hoàng Đạo):**');
  if (general.length) {
    general.forEach(h => out.push(`- ✧ Giờ ${h.branch} (${h.range}).`));
    out.push('  _(Dùng khi giờ hợp lá số rơi vào lúc bất tiện.)_');
  }
  out.push('');

  if (hr.bad.length) {
    out.push('**▸ Khung giờ XẤU (hạn chế việc trọng đại):**');
    hr.bad.forEach(h => out.push(`- ⚠ ${fmtHourLine(h)}.`));
    out.push('');
  }

  // Ăn / Mặc / Hướng
  out.push('# Ăn – Mặc – Hướng (theo Dụng thần)');
  for (const el of dung) {
    const g = elementPhongThuy(el);
    out.push(`**▸ Bổ hành ${el}**`);
    out.push(`- 🍚 Nên ăn: ${g.thucPham}.`);
    out.push(`- 👕 Nên mặc màu: ${g.mau}.`);
    out.push(`- 🧭 Hướng tốt: ${g.huong}.`);
    out.push('');
  }
  out.push(`- 🔢 Con số hợp: ${dung.map(e => elementPhongThuy(e).so).join(', ')}.`);
  out.push('');
  out.push('_Gợi ý tham khảo theo ngũ hành kết hợp lá số. Muốn luận sâu hơn, dùng Phân tích AI._');
  return out.join('\n');
}
