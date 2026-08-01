/**
 * Tiện ích lấy SAO LƯU (lưu tinh) cho một NĂM cụ thể theo Can/Chi năm đó,
 * nhóm theo cung — phục vụ luận Tiểu Vận từng năm và luận cung theo năm hiện tại.
 */
import type { AstrologyResult, HeavenlyStem, EarthlyBranch } from '../types';
import { getLuuStarsForYear } from './starPlacer';

const BRANCHES: EarthlyBranch[] = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tị', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
const bIdx = (b: string) => BRANCHES.indexOf(b as EarthlyBranch);
const TAM_HOP: number[][] = [[8, 0, 4], [2, 6, 10], [5, 9, 1], [11, 3, 7]];

/** Sao lưu cát / hung để gắn nhãn khi luận. */
export const LUU_CAT = new Set(['Hóa Lộc', 'Hóa Quyền', 'Hóa Khoa', 'Lộc Tồn', 'Văn Xương', 'Văn Khúc', 'Thiên Khôi', 'Thiên Việt', 'Thiên Mã', 'Đào Hoa', 'Hồng Loan', 'Thái Tuế']);
export const LUU_HUNG = new Set(['Hóa Kỵ', 'Kình Dương', 'Đà La', 'Kiếp Sát', 'Thiên Khốc', 'Thiên Hư', 'Tang Môn', 'Bạch Hổ']);

/** Sao lưu trong 1 cung (theo chi cung) cho năm Can/Chi đã cho. */
export function luuStarsAtBranch(
  result: AstrologyResult, yearStem: HeavenlyStem, yearBranch: EarthlyBranch, cungBranch: string,
): string[] {
  const gender = result.birthInfo.gender;
  const all = getLuuStarsForYear(result.tuViChart.houses, yearStem, yearBranch, gender);
  const idx = bIdx(cungBranch);
  return all.filter(s => s.branchIdx === idx).map(s => s.name);
}

/** Sao lưu tại cung + tam hợp + xung chiếu (để luận ảnh hưởng tới cung/năm). */
export function luuStarsTamPhuong(
  result: AstrologyResult, yearStem: HeavenlyStem, yearBranch: EarthlyBranch, cungBranch: string,
): { same: string[]; tamHop: string[]; xung: string[] } {
  const gender = result.birthInfo.gender;
  const all = getLuuStarsForYear(result.tuViChart.houses, yearStem, yearBranch, gender);
  const idx = bIdx(cungBranch);
  const grp = TAM_HOP.find(g => g.includes(idx)) ?? [];
  const tamHopIdx = grp.filter(i => i !== idx);
  const xungIdx = (idx + 6) % 12;
  const same: string[] = [], tamHop: string[] = [], xung: string[] = [];
  for (const s of all) {
    if (s.branchIdx === idx) same.push(s.name);
    else if (tamHopIdx.includes(s.branchIdx)) tamHop.push(s.name);
    else if (s.branchIdx === xungIdx) xung.push(s.name);
  }
  return { same, tamHop, xung };
}

export interface LuuStarPos { name: string; branch: EarthlyBranch; palaceName: string }

/**
 * Như luuStarsTamPhuong nhưng GIỮ vị trí cung của từng sao (để hiển thị cụ thể
 * "tam hợp tại Tài Bạch chiếu về"). Mỗi sao kèm chi + tên cung nơi sao đóng.
 */
export function luuStarsTamPhuongPos(
  result: AstrologyResult, yearStem: HeavenlyStem, yearBranch: EarthlyBranch, cungBranch: string,
): { same: LuuStarPos[]; tamHop: LuuStarPos[]; xung: LuuStarPos[] } {
  const gender = result.birthInfo.gender;
  const all = getLuuStarsForYear(result.tuViChart.houses, yearStem, yearBranch, gender);
  const idx = bIdx(cungBranch);
  const grp = TAM_HOP.find(g => g.includes(idx)) ?? [];
  const tamHopIdx = grp.filter(i => i !== idx);
  const xungIdx = (idx + 6) % 12;
  const palaceAt = (bi: number): string =>
    result.tuViChart.houses.find(h => bIdx(h.branch) === bi)?.palaceName ?? (BRANCHES[bi] ?? '');
  const mk = (name: string, bi: number): LuuStarPos => ({ name, branch: BRANCHES[bi], palaceName: palaceAt(bi) });
  const same: LuuStarPos[] = [], tamHop: LuuStarPos[] = [], xung: LuuStarPos[] = [];
  for (const s of all) {
    if (s.branchIdx === idx) same.push(mk(s.name, s.branchIdx));
    else if (tamHopIdx.includes(s.branchIdx)) tamHop.push(mk(s.name, s.branchIdx));
    else if (s.branchIdx === xungIdx) xung.push(mk(s.name, s.branchIdx));
  }
  return { same, tamHop, xung };
}

const XUNG: Record<string, EarthlyBranch> = {
  Tý: 'Ngọ', Ngọ: 'Tý', Sửu: 'Mùi', Mùi: 'Sửu', Dần: 'Thân', Thân: 'Dần',
  Mão: 'Dậu', Dậu: 'Mão', Thìn: 'Tuất', Tuất: 'Thìn', Tị: 'Hợi', Hợi: 'Tị',
};

/** Quan hệ chi NĂM với chi NĂM SINH (tuổi): năm tuổi (phạm Thái Tuế) / xung tuổi. */
export function yearVsTuoi(result: AstrologyResult, yearBranch: EarthlyBranch): { namTuoi: boolean; xungTuoi: boolean } {
  const tuoi = result.tuViChart.lunarDate.yearBranch;
  return { namTuoi: yearBranch === tuoi, xungTuoi: XUNG[yearBranch] === tuoi };
}

/** Dòng mô tả ngắn gọn sao lưu cát/hung quanh cung (dùng cho prompt & offline). */
export function luuSummary(set: { same: string[]; tamHop: string[]; xung: string[] }): string {
  const parts: string[] = [];
  if (set.same.length) parts.push(`tại cung: ${set.same.join(', ')}`);
  if (set.tamHop.length) parts.push(`tam hợp chiếu: ${set.tamHop.join(', ')}`);
  if (set.xung.length) parts.push(`xung chiếu: ${set.xung.join(', ')}`);
  return parts.length ? parts.join(' · ') : '(không có sao lưu đáng kể)';
}
