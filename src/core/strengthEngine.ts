/**
 * STRENGTH · CONFLICT · ACTIVATION ENGINE (Phase 5).
 *
 * Tách 3 tầng lượng hóa vốn nằm rải rác (inline trong daiVanScore/tieuVanScore/
 * cachCucEngine) thành module thuần, CÓ TRACE giải thích ("tại sao mạnh/yếu"):
 *
 *  1. StrengthEngine   — độ MẠNH của một cung dựa trên độ sáng chính tinh, lục
 *                        cát, Tứ Hóa tốt; trừ lục sát, Hóa Kỵ.
 *  2. ConflictEngine   — giải quyết xung đột CÁT ↔ HUNG trong cung → sắc thái
 *                        thực (cát/trung/hung) + lời giải thích.
 *  3. ActivationEngine — trạng thái KÍCH HOẠT theo vận: tiềm ẩn / được hỗ trợ /
 *                        kích hoạt / suy yếu / bị phá.
 *
 * Mọi hàm trả về { value, trace[] } để phục vụ debug, offline luận và AI evidence.
 */

import type { StarEntry, TuViHouse } from '../types';

const clean = (n: string) => (n.startsWith('L. ') ? n.slice(3) : n);

// ─── Bộ sao chuẩn ────────────────────────────────────────────────────────────

export const LUC_CAT = new Set(['Tả Phù', 'Hữu Bật', 'Văn Xương', 'Văn Khúc', 'Thiên Khôi', 'Thiên Việt']);
export const LUC_SAT = new Set(['Kình Dương', 'Đà La', 'Hỏa Tinh', 'Linh Tinh', 'Địa Không', 'Địa Kiếp']);
const CAT_PHU_KHAC = new Set([
  'Lộc Tồn', 'Thiên Mã', 'Long Trì', 'Phượng Các', 'Tam Thai', 'Bát Tọa',
  'Ân Quang', 'Thiên Quý', 'Thai Phụ', 'Phong Cáo', 'Quốc Ấn', 'Thiên Phúc',
  'Thiên Quan', 'Thiên Đức', 'Nguyệt Đức', 'Long Đức', 'Phúc Đức', 'Thiên Hỷ',
  'Hồng Loan', 'Đào Hoa', 'Thanh Long', 'Tấu Thư', 'Hỷ Thần', 'Giải Thần',
]);
const SAT_PHU_KHAC = new Set([
  'Thiên Hình', 'Thiên Riêu', 'Kiếp Sát', 'Đại Hao', 'Tiểu Hao', 'Tang Môn',
  'Bạch Hổ', 'Tuế Phá', 'Điếu Khách', 'Quan Phù', 'Quan Phủ', 'Phục Binh',
  'Phi Liêm', 'Bệnh Phù', 'Thiên Khốc', 'Thiên Hư', 'Cô Thần', 'Quả Tú',
  'Phá Toái', 'Thiên Thương', 'Thiên Sứ',
]);
const TU_HOA_TOT: Record<string, number> = { 'Hóa Lộc': 14, 'Hóa Quyền': 11, 'Hóa Khoa': 8 };

const BRIGHT_SCORE: Record<string, number> = {
  'miếu': 100, 'vượng': 85, 'đắc': 65, 'bình': 45, 'hãm': 15,
};

const isCat = (n: string) => LUC_CAT.has(n) || CAT_PHU_KHAC.has(n);
const isSat = (n: string) => LUC_SAT.has(n) || SAT_PHU_KHAC.has(n);

// ─── 1. STRENGTH ENGINE ──────────────────────────────────────────────────────

export interface StrengthResult {
  value: number;         // 0–100
  level: 'rất mạnh' | 'mạnh' | 'trung bình' | 'yếu' | 'rất yếu';
  chinhTinhVCD: boolean; // vô chính diệu
  trace: string[];
}

export function computeStrength(stars: StarEntry[], hasTuanTriet = false): StrengthResult {
  const trace: string[] = [];
  const chinh = stars.filter(s => s.type === 'chinh');
  let value = 0;

  if (chinh.length === 0) {
    value = 30;
    trace.push('Vô chính diệu → nền tảng yếu (mượn tinh hệ xung chiếu), khởi 30đ.');
  } else {
    const avg = chinh.reduce((sum, s) => sum + (BRIGHT_SCORE[s.brightness ?? 'bình'] ?? 45), 0) / chinh.length;
    value = avg;
    trace.push(`Chính tinh ${chinh.map(s => `${s.name}(${s.brightness ?? 'bình'})`).join(', ')} → độ sáng TB ${Math.round(avg)}đ.`);
  }

  for (const s of stars) {
    const nm = clean(s.name);
    if (LUC_CAT.has(nm)) { value += 5; trace.push(`+5 lục cát ${nm}.`); }
    else if (CAT_PHU_KHAC.has(nm)) value += 2;
    else if (LUC_SAT.has(nm)) { value -= 6; trace.push(`−6 lục sát ${nm}.`); }
    else if (SAT_PHU_KHAC.has(nm)) value -= 2;
    if (TU_HOA_TOT[nm]) { value += TU_HOA_TOT[nm]; trace.push(`+${TU_HOA_TOT[nm]} ${nm}.`); }
    else if (nm === 'Hóa Kỵ') { value -= 12; trace.push('−12 Hóa Kỵ.'); }
  }

  if (hasTuanTriet) { value -= 10; trace.push('−10 Tuần/Triệt án ngữ (chững, bất định).'); }

  value = Math.max(0, Math.min(100, Math.round(value)));
  const level: StrengthResult['level'] =
    value >= 80 ? 'rất mạnh' : value >= 62 ? 'mạnh' : value >= 45 ? 'trung bình' : value >= 28 ? 'yếu' : 'rất yếu';
  return { value, level, chinhTinhVCD: chinh.length === 0, trace };
}

// ─── 2. CONFLICT ENGINE ──────────────────────────────────────────────────────

export interface ConflictResult {
  catScore: number;
  hungScore: number;
  netTone: 'cát' | 'trung tính' | 'hung';
  resolution: string;   // giải thích tương tác
  trace: string[];
}

/**
 * Giải quyết xung đột cát/hung trong một cung. Cân đo tổng lực cát vs hung, có
 * xét vài tương tác đặc thù (Hỏa/Linh + Tham Lang → hung chuyển thành động lực;
 * Không Kiếp áp đảo cát → cát khó thành).
 */
export function resolveConflict(stars: StarEntry[]): ConflictResult {
  const trace: string[] = [];
  const names = stars.map(s => clean(s.name));
  let catScore = 0, hungScore = 0;

  for (const s of stars) {
    const nm = clean(s.name);
    if (LUC_CAT.has(nm)) { catScore += 8; }
    else if (CAT_PHU_KHAC.has(nm)) catScore += 3;
    else if (TU_HOA_TOT[nm]) catScore += TU_HOA_TOT[nm];
    else if (LUC_SAT.has(nm)) hungScore += 8;
    else if (SAT_PHU_KHAC.has(nm)) hungScore += 3;
    else if (nm === 'Hóa Kỵ') hungScore += 12;
  }

  // Tương tác đặc thù
  const hasThamLang = names.includes('Tham Lang');
  const hasHoaLinh = names.includes('Hỏa Tinh') || names.includes('Linh Tinh');
  if (hasThamLang && hasHoaLinh) {
    catScore += 10; hungScore -= 6;
    trace.push('Hỏa/Linh gặp Tham Lang → "Hỏa Tham/Linh Tham" cách: hung tinh chuyển thành lực bùng phát (bất ngờ phát).');
  }
  const hasKhongKiep = names.includes('Địa Không') || names.includes('Địa Kiếp');
  if (hasKhongKiep && catScore > 0) {
    trace.push('Không/Kiếp hiện diện → cát tinh dễ bị "thành rồi bại", cần đề phòng hưng rồi phá.');
    hungScore += 4;
  }

  catScore = Math.max(0, catScore);
  hungScore = Math.max(0, hungScore);
  const diff = catScore - hungScore;
  const netTone: ConflictResult['netTone'] = diff >= 6 ? 'cát' : diff <= -6 ? 'hung' : 'trung tính';

  const resolution =
    netTone === 'cát' ? `Cát tinh áp đảo (${catScore} vs ${hungScore}) → cung hanh thông, phát huy mặt tốt.`
    : netTone === 'hung' ? `Hung tinh áp đảo (${hungScore} vs ${catScore}) → nhiều trắc trở, cần hóa giải/phòng thủ.`
    : `Cát–hung cân bằng (${catScore} vs ${hungScore}) → cát hung đan xen, kết quả tùy vận kích hoạt.`;
  trace.push(resolution);

  return { catScore, hungScore, netTone, resolution, trace };
}

// ─── 3. TEMPORAL ACTIVATION ENGINE ───────────────────────────────────────────

const BRANCHES = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tị', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
const branchIdx = (b: string) => BRANCHES.indexOf(b);
const TAM_HOP: number[][] = [[8, 0, 4], [2, 6, 10], [5, 9, 1], [11, 3, 7]];
const NHI_HOP: Record<number, number> = {
  0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6,
};

const CAT_ACTIVATOR = ['Hóa Lộc', 'Hóa Quyền', 'Hóa Khoa', 'Lộc Tồn'];
const HUNG_ACTIVATOR = ['Hóa Kỵ', 'Kình Dương', 'Đà La', 'Địa Không', 'Địa Kiếp'];

export type ActivationState = 'tiềm ẩn' | 'được hỗ trợ' | 'kích hoạt' | 'suy yếu' | 'bị phá';

export interface ActivationResult {
  state: ActivationState;
  inGroup: boolean;   // transit có nằm trong group của cung không
  relation: 'đồng cung' | 'tam hợp' | 'xung chiếu' | 'nhị hợp' | 'không liên hệ';
  trace: string[];
}

/**
 * Xác định trạng thái kích hoạt của một cung dưới tác động của một VẬN (đại/tiểu).
 * @param goodBase  cung/cách này bản chất TỐT hay XẤU (ảnh hưởng cách diễn giải)
 */
export function activationState(
  pivotBranch: string,
  transitBranch: string,
  transitStars: string[],
  goodBase: boolean,
): ActivationResult {
  const trace: string[] = [];
  const pi = branchIdx(pivotBranch);
  const ti = branchIdx(transitBranch);
  const th = TAM_HOP.find(g => g.includes(pi)) ?? [];
  const xung = (pi + 6) % 12;
  const nh = NHI_HOP[pi];

  let relation: ActivationResult['relation'] = 'không liên hệ';
  if (ti === pi) relation = 'đồng cung';
  else if (th.includes(ti)) relation = 'tam hợp';
  else if (ti === xung) relation = 'xung chiếu';
  else if (ti === nh) relation = 'nhị hợp';

  const inGroup = relation !== 'không liên hệ';
  if (!inGroup) {
    trace.push(`Vận ${transitBranch} không liên hệ với cung ${pivotBranch} → cách/cung NGỦ, chưa được kích hoạt.`);
    return { state: 'tiềm ẩn', inGroup, relation, trace };
  }

  const cat = transitStars.map(clean).filter(s => CAT_ACTIVATOR.includes(s));
  const hung = transitStars.map(clean).filter(s => HUNG_ACTIVATOR.includes(s));
  trace.push(`Vận ${transitBranch} ${relation} cung ${pivotBranch}` +
    (cat.length ? ` · cát: ${cat.join(', ')}` : '') + (hung.length ? ` · hung: ${hung.join(', ')}` : '') + '.');

  let state: ActivationState;
  if (goodBase) {
    if (cat.length > 0 && hung.length === 0) state = 'kích hoạt';
    else if (cat.length > 0 && hung.length > 0) state = 'được hỗ trợ';
    else if (hung.length > cat.length) state = 'suy yếu';
    else state = 'được hỗ trợ';
  } else {
    if (hung.length > 0) state = 'bị phá';
    else if (cat.length > 0) state = 'suy yếu'; // cát tinh chế bớt hung
    else state = 'được hỗ trợ';
  }
  trace.push(`→ Trạng thái: ${state.toUpperCase()}.`);
  return { state, inGroup, relation, trace };
}

/** Tiện ích: có Tuần/Triệt tại cung không. */
export function hasTuanTriet(h?: TuViHouse): boolean {
  return !!(h?.tuanAt || h?.trietAt);
}
