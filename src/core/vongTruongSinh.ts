/**
 * Vòng Trường Sinh (12 Life Stages Cycle)
 * An vòng dài 12 sao theo Cục số và Âm Dương của Can năm sinh.
 */

import type { CucSo, EarthlyBranch, HeavenlyStem, Gender } from '../types';
import { BRANCHES, getBranchIndex } from '../data/napAm';

// Thứ tự 12 sao trong vòng Trường Sinh
export const VONG_TRUONG_SINH_SEQUENCE = [
  'Tràng Sinh', 'Mộc Dục', 'Quan Đới', 'Lâm Quan',
  'Đế Vượng', 'Suy', 'Bệnh', 'Tử',
  'Mộ', 'Tuyệt', 'Thai', 'Dưỡng',
];

// Vị trí khởi đầu của Tràng Sinh theo Cục
const TRANG_SINH_START_BY_CUC: Record<CucSo, EarthlyBranch> = {
  2: 'Thân',   // Thủy Nhị Cục
  3: 'Hợi',    // Mộc Tam Cục
  4: 'Tị',     // Kim Tứ Cục
  5: 'Thân',   // Thổ Ngũ Cục
  6: 'Dần',    // Hỏa Lục Cục
};

// Dương Can: Giáp, Bính, Mậu, Canh, Nhâm → thuận
const YANG_STEMS: HeavenlyStem[] = ['Giáp', 'Bính', 'Mậu', 'Canh', 'Nhâm'];

export function isYangStem(stem: HeavenlyStem): boolean {
  return YANG_STEMS.includes(stem);
}

/**
 * Tính vòng Trường Sinh cho lá số.
 * Quy tắc chiều an theo Tử Vi truyền thống (kết hợp Can năm + Giới tính):
 *   - Dương Nam hoặc Âm Nữ → THUẬN lý → vòng đi thuận chiều địa chi
 *   - Âm Nam  hoặc Dương Nữ → NGHỊCH lý → vòng đi nghịch chiều
 * @returns Record<branch → tên sao> (label at footer của cell)
 */
export function calculateVongTruongSinh(
  cucSo: CucSo,
  yearStem: HeavenlyStem,
  gender?: Gender,
): Record<EarthlyBranch, string> {
  const startBranch = TRANG_SINH_START_BY_CUC[cucSo];
  const startIdx = getBranchIndex(startBranch);
  const yang = isYangStem(yearStem);
  // Default to legacy behaviour (theo riêng Can năm) khi không truyền gender.
  let forward: boolean;
  if (gender) {
    forward = (gender === 'nam' && yang) || (gender === 'nu' && !yang);
  } else {
    forward = yang;
  }

  const result: Partial<Record<EarthlyBranch, string>> = {};
  for (let i = 0; i < 12; i++) {
    const offset = forward ? i : -i;
    const branchIdx = ((startIdx + offset) % 12 + 12) % 12;
    const branch = BRANCHES[branchIdx];
    result[branch] = VONG_TRUONG_SINH_SEQUENCE[i];
  }
  return result as Record<EarthlyBranch, string>;
}
