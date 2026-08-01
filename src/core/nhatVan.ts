/**
 * XEM THEO NGÀY (Nhật vận / Trạch nhật theo lá số) — v2.
 *
 * 6 cấp theo tài liệu "Phan_tich_ngay_tot_xau_v2":
 *   Cấp 1 (10%): Điểm nền — Trực ngày, Lục Diệu, Hoàng Đạo/Hắc Đạo ngày
 *   Cấp 2 (35%): Tương tác Bát Tự — Dụng/Hỷ/Kỵ thần với Can Chi ngày
 *   Cấp 3 (15%): Đại Vận — chưa có data, tạm trung tính
 *   Cấp 4 (20%): Lưu Niên — năm hiện tại so Dụng/Kỵ thần
 *   Cấp 5 (10%): Nguyệt Vận — hành ngày vượng/suy theo tháng âm lịch
 *   Cấp 6 (10%): Mục tiêu — được tính trong dayPicker
 *
 * Hard Rules: Xung tuổi, Tam Nương, Nguyệt Kỵ, Tam Tai, Kim Lâu.
 */

import type { AstrologyResult, FiveElement, HeavenlyStem, EarthlyBranch } from '../types';
import { elementPhongThuy } from './phongThuyBatTu';
import { solarToLunar } from './lunarCalendar';
import { scoreDaiVan } from './daiVanScore';

const STEMS: HeavenlyStem[] = ['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];
const BRANCHES: EarthlyBranch[] = ['Tý','Sửu','Dần','Mão','Thìn','Tị','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
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

function jdFromDate(dd: number, mm: number, yy: number): number {
  const a = Math.floor((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd = dd + Math.floor((153*m+2)/5) + 365*y + Math.floor(y/4) - Math.floor(y/100) + Math.floor(y/400) - 32045;
  if (jd < 2299161) jd = dd + Math.floor((153*m+2)/5) + 365*y + Math.floor(y/4) - 32083;
  return jd;
}

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
const TRUC_SCORES = [60, 65, 60, 55, 80, 60, 20, 30, 85, 70, 80, 25];
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

// Lunar month branch: month 1 = Dần (idx 2), month 11 = Tý (idx 0), month 12 = Sửu (idx 1)
function lunarMonthBranchIdx(lunarMonth: number): number {
  return (lunarMonth + 1) % 12;
}

export function trucNgayInfo(dayBranch: EarthlyBranch, lunarMonth: number): { name: string; score: number; hint: string; idx: number } {
  const dayIdx = BRANCHES.indexOf(dayBranch);
  const mIdx = lunarMonthBranchIdx(lunarMonth);
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

export function hoangDaoNgay(dayBranch: EarthlyBranch, lunarMonth: number): boolean {
  const mBranch = BRANCHES[lunarMonthBranchIdx(lunarMonth)];
  const goodDays = HOANG_DAO_BY_MONTH[mBranch] || [];
  return goodDays.includes(dayBranch);
}

// ─────────────────────────────────────────────
// CẤP 4: LƯU NIÊN (năm hiện tại)
// ─────────────────────────────────────────────
function yearCanChiEl(year: number): { stemEl: FiveElement; branchEl: FiveElement } {
  const stem = STEMS[((year - 4) % 10 + 10) % 10];
  const branch = BRANCHES[((year - 4) % 12 + 12) % 12];
  return { stemEl: STEM_ELEMENT[stem], branchEl: BRANCH_ELEMENT[branch] };
}

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
// Thứ tự: Giác(0)…Chẩn(27) — vòng 28 ngày theo JDN
const NHI28_NAMES = [
  'Giác','Cang','Đê','Phòng','Tâm','Vĩ','Cơ',
  'Đẩu','Ngưu','Nữ','Hư','Nguy','Thất','Bích',
  'Khuê','Lâu','Vị','Mão','Tất','Chủy','Sâm',
  'Tỉnh','Quỷ','Liễu','Tinh','Trương','Dực','Chẩn',
];
// Thượng cát=85, Trung cát=70, Bình=50, Tiểu hung=30, Đại hung=15
const NHI28_SCORES = [
  85, 50, 85, 85, 70, 70, 50, // 0–6  Giác…Cơ
  70, 85, 70, 50, 30, 85, 70, // 7–13 Đẩu…Bích
  85, 70, 30, 50, 85, 50, 50, // 14–20 Khuê…Sâm
  50, 15, 15, 30, 85, 70, 70, // 21–27 Tỉnh…Chẩn
];
const NHI28_HINT = [
  'đại cát — xuất hành, khai trương, khởi sự lớn',   // 0 Giác
  'bình — cẩn thận hao tài, khẩu thiệt',              // 1 Cang
  'đại cát — cưới hỏi, xây dựng, mua bán nhà đất',   // 2 Đê
  'đại cát — quan lộc, hôn nhân, khai trương',        // 3 Phòng
  'cát — công danh, thương mại, học tập',              // 4 Tâm
  'cát — sinh đẻ, tang ma, kinh doanh',               // 5 Vĩ
  'bình — tránh việc lớn, làm việc thường',           // 6 Cơ
  'cát — thương mại, hôn nhân, nhập trạch',           // 7 Đẩu
  'đại cát — khai trương, xuất hành, xây dựng',      // 8 Ngưu
  'cát — thương mại, du lịch, hôn nhân',              // 9 Nữ
  'bình — làm việc vừa phải, tránh mạo hiểm',         // 10 Hư
  'hung — tranh kiện, mất của, tai ương',              // 11 Nguy
  'đại cát — khai trương, cưới hỏi, xuất hành',      // 12 Thất
  'cát — thương mại, xây dựng, xuất hành',            // 13 Bích
  'đại cát — hôn nhân, quan lộc, khai trương',       // 14 Khuê
  'cát — xây dựng, chăn nuôi, thương mại',            // 15 Lâu
  'hung — tránh xuất hành, khai trương, giao dịch lớn', // 16 Vị
  'bình — làm việc thường, tránh việc lớn',            // 17 Mão
  'đại cát — cưới hỏi, khai trương, xuất hành',      // 18 Tất
  'bình — buôn bán nhỏ, dọn dẹp',                    // 19 Chủy
  'bình — dưỡng sức, tránh mạo hiểm',                 // 20 Sâm
  'bình — cẩn thận lời nói, tranh luận',              // 21 Tỉnh
  'đại hung — kỵ mọi việc trọng đại',                 // 22 Quỷ
  'đại hung — thất bại, tai ương, bệnh tật',          // 23 Liễu
  'hung — cẩn thận sức khỏe, tài chính, kiện tụng',  // 24 Tinh
  'đại cát — khai trương, xây dựng, quan lộc',       // 25 Trương
  'cát — xuất hành, hôn nhân, ký kết',               // 26 Dực
  'cát — giao dịch vừa phải, ổn định, thương mại',   // 27 Chẩn
];
// Neo: JD 2451545 (1/1/2000 dương lịch) = Nữ (index 9)
const NHI28_REF_JD = 2451545;
const NHI28_REF_IDX = 9;

export function nhi28Info(date: Date): { name: string; score: number; idx: number; hint: string } {
  const jd = jdFromDate(date.getDate(), date.getMonth()+1, date.getFullYear());
  const idx = ((jd - NHI28_REF_JD + NHI28_REF_IDX) % 28 + 28) % 28;
  return { name: NHI28_NAMES[idx], score: NHI28_SCORES[idx], idx, hint: NHI28_HINT[idx] };
}

// ─────────────────────────────────────────────
// NhatVanScore interface (v2 — backward compat)
// ─────────────────────────────────────────────
export interface NhatVanScore {
  date: Date;
  canChi: DayCanChi;
  rating: 'Rất tốt' | 'Tốt' | 'Bình thường' | 'Cần thận trọng' | 'Xấu';
  score: number;      // integer, backward compat (Cấp 2 only)
  score100: number;   // 0-100 tổng hợp 6 cấp
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
}

export function scoreNhatVan(result: AstrologyResult, date: Date): NhatVanScore {
  const cc = dayCanChi(date);
  const fav = result.batTuChart.favorableElements || [];
  const unfav = result.batTuChart.unfavorableElements || [];
  const yearBranch = result.tuViChart.lunarDate.yearBranch;
  const ld = solarToLunar(date.getDate(), date.getMonth()+1, date.getFullYear());
  const lunarMonth = ld.month;
  const lunarDay = ld.day;

  const reasons: string[] = [];
  const warnings: string[] = [];

  // ── CẤP 2: Bát Tự (35%) ──
  let batTuRaw = 0;
  if (fav.includes(cc.stemEl)) { batTuRaw += 50; reasons.push(`Can ngày hành ${cc.stemEl} thuộc Dụng thần → được tiếp khí.`); }
  if (unfav.includes(cc.stemEl)) { batTuRaw -= 50; reasons.push(`Can ngày hành ${cc.stemEl} thuộc Kỵ thần → khí nghịch.`); }
  if (fav.includes(cc.branchEl)) { batTuRaw += 30; reasons.push(`Chi ngày hành ${cc.branchEl} hợp Dụng thần.`); }
  if (unfav.includes(cc.branchEl)) { batTuRaw -= 30; reasons.push(`Chi ngày hành ${cc.branchEl} thuộc Kỵ thần.`); }
  const batTu100 = Math.max(0, Math.min(100, Math.round((batTuRaw + 80) / 160 * 100)));

  // Backward-compat integer score (Cấp 2 only, original scale)
  let score = 0;
  if (fav.includes(cc.stemEl)) score += 2;
  if (unfav.includes(cc.stemEl)) score -= 2;
  if (fav.includes(cc.branchEl)) score += 1;
  if (unfav.includes(cc.branchEl)) score -= 1;

  // Xung / tam hợp tuổi (hard rule + Cấp 2 boost)
  const xungTuoi = XUNG[cc.branch] === yearBranch;
  const hopTuoi = TAM_HOP.some(g => g.includes(cc.branch) && g.includes(yearBranch) && cc.branch !== yearBranch);
  if (xungTuoi) { score -= 2; reasons.push(`Chi ngày ${cc.branch} XUNG tuổi ${yearBranch} → kiêng việc trọng đại.`); }
  else if (hopTuoi) { score += 1; reasons.push(`Chi ngày ${cc.branch} tam hợp tuổi ${yearBranch} → thuận hòa.`); }

  // ── CẤP 1: Điểm nền (10%) ──
  const truc = trucNgayInfo(cc.branch, lunarMonth);
  const ld6 = lucDieuInfo(lunarMonth, lunarDay);
  const isHoangDao = hoangDaoNgay(cc.branch, lunarMonth);
  const hdScore = isHoangDao ? 70 : 30;
  const nhi28 = nhi28Info(date);
  const base100 = Math.round(truc.score * 0.30 + ld6.score * 0.15 + hdScore * 0.30 + nhi28.score * 0.25);

  reasons.push(`Trực ${truc.name} — ${truc.hint}.`);
  reasons.push(`Lục Diệu ${ld6.name} — ${ld6.hint}.`);
  if (isHoangDao) reasons.push('Ngày Hoàng Đạo — khí trường tốt lành.');
  else reasons.push('Ngày Hắc Đạo — nên thận trọng trong hành động.');
  reasons.push(`Tú ${nhi28.name} — ${nhi28.hint}.`);

  // ── CẤP 4: Lưu Niên (20%) ──
  const yearEl = yearCanChiEl(date.getFullYear());
  let luuNienRaw = 0;
  if (fav.includes(yearEl.stemEl)) luuNienRaw += 40;
  if (unfav.includes(yearEl.stemEl)) luuNienRaw -= 40;
  if (fav.includes(yearEl.branchEl)) luuNienRaw += 30;
  if (unfav.includes(yearEl.branchEl)) luuNienRaw -= 30;
  const luuNien100 = Math.max(0, Math.min(100, Math.round((luuNienRaw + 70) / 140 * 100)));

  // ── CẤP 5: Nguyệt Vận (10%) ──
  const monthBr = BRANCHES[lunarMonthBranchIdx(lunarMonth)];
  let nguyetVanRaw = 10;
  if (XUNG[cc.branch] === monthBr) {
    nguyetVanRaw = -70;
    reasons.push(`Chi ngày ${cc.branch} xung Nguyệt kiến ${monthBr} → Nghịch tháng nặng.`);
  } else if (SUY_THANG[cc.stemEl]?.includes(lunarMonth)) {
    nguyetVanRaw = -20;
    reasons.push(`Hành ngày ${cc.stemEl} đang suy trong tháng ${lunarMonth} âm lịch.`);
  } else if (VUONG_THANG[cc.stemEl]?.includes(lunarMonth)) {
    nguyetVanRaw = 60;
    reasons.push(`Hành ngày ${cc.stemEl} đang vượng trong tháng ${lunarMonth} âm lịch.`);
  }
  const nguyetVan100 = Math.max(0, Math.min(100, Math.round((nguyetVanRaw + 70) / 140 * 100)));

  // ── CẤP 3: Đại Vận (15%) ──
  let daiVan100 = 50; // fallback trung tính nếu không có Đại Vận
  if (result.daiVans && result.daiVans.length > 0) {
    const age = Math.max(0, date.getFullYear() - (result.birthInfo.year || date.getFullYear()));
    const curDV = result.daiVans.find(dv => age >= dv.startAge && age <= dv.endAge);
    if (curDV) {
      const dvSc = scoreDaiVan(result, curDV);
      const net = dvSc.taiLoc - dvSc.thachThuc * 0.5;
      daiVan100 = Math.max(0, Math.min(100, Math.round(50 + (net - 28) * 0.8)));
      reasons.push(`Đại Vận ${curDV.stem} ${curDV.branch} (tuổi ${curDV.startAge}–${curDV.endAge}): ${dvSc.rating}.`);
    }
  }

  // ── TỔNG HỢP (Cấp 6 tính trong dayPicker) ──
  let raw100 = base100 * 0.10 + batTu100 * 0.35 + daiVan100 * 0.15 + luuNien100 * 0.20 + nguyetVan100 * 0.10 + 50 * 0.10;

  // ── HARD RULES ──
  const tamNuong = TAM_NUONG_DAYS.has(lunarDay);
  const nguyetKy = NGUYET_KY_DAYS.has(lunarDay);
  if (xungTuoi) {
    raw100 = Math.min(raw100, 40);
    warnings.push(`⚠ Ngày XUNG TUỔI (${yearBranch}) — tránh mọi việc trọng đại.`);
  }
  if (tamNuong) {
    raw100 = Math.max(0, raw100 - 20);
    warnings.push(`⚠ Ngày Tam Nương (${lunarDay}/${lunarMonth} âm) — kỵ cưới hỏi, khai trương, xuất hành.`);
  }
  if (nguyetKy) {
    raw100 = Math.max(0, raw100 - 15);
    warnings.push(`⚠ Ngày Nguyệt Kỵ (${lunarDay}/${lunarMonth} âm) — kỵ ký kết, xuất hành, việc lớn.`);
  }
  // Tam Tai: cảnh báo cấp năm (không trừ điểm ngày)
  const currentYearBranch = BRANCHES[((date.getFullYear() - 4) % 12 + 12) % 12];
  if (isTamTai(yearBranch, currentYearBranch)) {
    warnings.push(`⚠ Năm Tam Tai (tuổi ${yearBranch}) — hạn chế việc trọng đại cả năm.`);
  }
  // Kim Lâu: tính theo tuổi hiện tại
  const age = date.getFullYear() - (result.birthInfo.year || date.getFullYear());
  const kl = kimLauType(age);
  if (kl) {
    warnings.push(`⚠ ${kl} (tuổi ${age}) — cẩn thận cưới hỏi, làm nhà trong năm.`);
  }

  const score100 = Math.max(0, Math.min(100, Math.round(raw100)));

  const rating: NhatVanScore['rating'] =
    score100 >= 70 ? 'Rất tốt' :
    score100 >= 55 ? 'Tốt' :
    score100 >= 40 ? 'Bình thường' :
    score100 >= 25 ? 'Cần thận trọng' : 'Xấu';

  return {
    date, canChi: cc,
    rating, score, score100,
    xungTuoi, hopTuoi,
    reasons,
    truc: truc.name,
    lucDieu: ld6.name,
    hoangDao: isHoangDao,
    nhi28Tu: nhi28.name,
    tamNuong, nguyetKy,
    warnings,
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
  if (sc.tamNuong) out.push('- ⚠ Tam Nương: tránh cưới hỏi, khai trương, xuất hành quan trọng.');
  if (sc.nguyetKy) out.push('- ⚠ Nguyệt Kỵ: tránh ký kết, xuất hành, ra quyết định lớn.');
  if (sc.rating === 'Cần thận trọng' || sc.rating === 'Xấu') {
    out.push('- Hạn chế đầu tư mạo hiểm, tranh cãi, đứng ra bảo lãnh.');
    out.push('- Cẩn trọng giấy tờ, đi lại, lời ăn tiếng nói.');
  } else if (!sc.xungTuoi && !sc.tamNuong && !sc.nguyetKy) {
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
