/**
 * Ánh xạ 12 cung (tiếng Việt ↔ mã enum) + vài phép tính lịch nhỏ, ĐỘC LẬP với chart engine
 * (không sửa core/*): Can-Chi của 1 năm bất kỳ, Chi của 1 tháng âm lịch, Đẩu Quân của THÁNG.
 */
import type { AstrologyResult, EarthlyBranch, HeavenlyStem } from '../../types';
import type { Palace } from './types';

export const PALACE_VN_TO_CODE: Record<string, Palace> = {
  'Mệnh': 'MENH', 'Phụ Mẫu': 'PHU_MAU', 'Phúc Đức': 'PHUC_DUC', 'Điền Trạch': 'DIEN_TRACH',
  'Quan Lộc': 'QUAN_LOC', 'Nô Bộc': 'NO_BOC', 'Thiên Di': 'THIEN_DI', 'Tật Ách': 'TAT_ACH',
  'Tài Bạch': 'TAI_BACH', 'Tử Tức': 'TU_TUC', 'Phu Thê': 'PHU_THE', 'Huynh Đệ': 'HUYNH_DE',
};
export const PALACE_CODE_TO_VN: Record<Palace, string> = Object.fromEntries(
  Object.entries(PALACE_VN_TO_CODE).map(([vn, code]) => [code, vn]),
) as Record<Palace, string>;

export const BRANCHES: EarthlyBranch[] = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tị', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
export const STEMS: HeavenlyStem[] = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
export const branchIndex = (b: EarthlyBranch): number => BRANCHES.indexOf(b);

/** Can-Chi của 1 năm dương lịch bất kỳ — công thức chuẩn (giống hệt core/daiVanEngine.ts,
 *  không export nên khai báo lại; đây là toán lịch cố định, không phải quy ước theo trường phái). */
export function yearCanChi(year: number): { stem: HeavenlyStem; branch: EarthlyBranch } {
  return { stem: STEMS[((year + 6) % 10 + 10) % 10], branch: BRANCHES[((year + 8) % 12 + 12) % 12] };
}

/** Chi của tháng ÂM LỊCH (quy ước "Kiến Dần" cố định, không phụ thuộc năm/trường phái):
 *  tháng 1 = Dần, tháng 2 = Mão, ... tháng 11 = Tý, tháng 12 = Sửu. */
export function monthBranch(lunarMonth: number): EarthlyBranch {
  return BRANCHES[(lunarMonth + 1) % 12];
}

/** Bảng Lộc Tồn theo Can — GIỐNG core/starPlacer.ts (LOC_TON_BY_STEM, không export) — sao chép vì
 *  đây là hằng số cổ điển không đổi theo ai chỉnh sửa; dùng để suy ra vòng Lộc Tồn (Đại/Tiểu Hao). */
const LOC_TON_BY_STEM: Record<HeavenlyStem, EarthlyBranch> = {
  Giáp: 'Dần', Ất: 'Mão', Bính: 'Tị', Đinh: 'Ngọ', Mậu: 'Tị',
  Kỷ: 'Ngọ', Canh: 'Thân', Tân: 'Dậu', Nhâm: 'Hợi', Quý: 'Tý',
};
export function locTonBranchOf(stem: HeavenlyStem): EarthlyBranch {
  return LOC_TON_BY_STEM[stem];
}

const TAM_HOP_GROUPS: number[][] = [[8, 0, 4], [2, 6, 10], [5, 9, 1], [11, 3, 7]];
const oppositeIdx = (idx: number) => (idx + 6) % 12;

/** Chi (branch) của 1 cung theo mã enum, trong lá số gốc. */
export function palaceBranch(c: AstrologyResult['tuViChart'], palace: Palace): EarthlyBranch | null {
  const vn = PALACE_CODE_TO_VN[palace];
  return c.houses.find(h => h.palaceName === vn)?.branch ?? null;
}

/** Quan hệ vị trí 2 cung (theo chi): cùng cung / tam hợp / xung chiếu / không liên quan. */
export function branchRelation(a: EarthlyBranch, b: EarthlyBranch): 'SAME' | 'TAM_HOP' | 'XUNG' | 'NONE' {
  const ia = branchIndex(a), ib = branchIndex(b);
  if (ia === ib) return 'SAME';
  if (oppositeIdx(ia) === ib) return 'XUNG';
  const grp = TAM_HOP_GROUPS.find(g => g.includes(ia));
  if (grp && grp.includes(ib)) return 'TAM_HOP';
  return 'NONE';
}
