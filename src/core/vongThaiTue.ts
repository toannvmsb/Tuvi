/**
 * Vòng Thái Tuế (12-star cycle based on year branch)
 * Khởi từ cung có Địa Chi năm sinh, luôn đi thuận chiều.
 */

import type { EarthlyBranch } from '../types';
import { BRANCHES, getBranchIndex } from '../data/napAm';

export const VONG_THAI_TUE_SEQUENCE = [
  'Thái Tuế', 'Thiếu Dương', 'Tang Môn', 'Thiếu Âm',
  'Quan Phù', 'Tử Phù', 'Tuế Phá', 'Long Đức',
  'Bạch Hổ', 'Phúc Đức', 'Điếu Khách', 'Trực Phù',
];

export function calculateVongThaiTue(
  yearBranch: EarthlyBranch,
): Array<{ branch: EarthlyBranch; starName: string }> {
  const startIdx = getBranchIndex(yearBranch);
  const result: Array<{ branch: EarthlyBranch; starName: string }> = [];
  for (let i = 0; i < 12; i++) {
    const branchIdx = (startIdx + i) % 12;
    result.push({ branch: BRANCHES[branchIdx], starName: VONG_THAI_TUE_SEQUENCE[i] });
  }
  return result;
}
