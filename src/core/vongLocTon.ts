/**
 * Vòng Lộc Tồn (Bác Sỹ) — 12-star cycle from Lộc Tồn position.
 * Chiều: Dương Nam + Âm Nữ → thuận; Âm Nam + Dương Nữ → nghịch.
 */

import type { EarthlyBranch, HeavenlyStem, Gender } from '../types';
import { BRANCHES, getBranchIndex } from '../data/napAm';
import { isYangStem } from './vongTruongSinh';

export const VONG_LOC_TON_SEQUENCE = [
  'Bác Sỹ', 'Lực Sĩ', 'Thanh Long', 'Tiểu Hao',
  'Tướng Quân', 'Tấu Thư', 'Phi Liêm', 'Hỷ Thần',
  'Bệnh Phù', 'Đại Hao', 'Phục Binh', 'Quan Phủ',
];

export function calculateVongLocTon(
  locTonBranch: EarthlyBranch,
  yearStem: HeavenlyStem,
  gender: Gender,
): Array<{ branch: EarthlyBranch; starName: string }> {
  const yang = isYangStem(yearStem);
  // Dương Nam hoặc Âm Nữ → thuận
  const forward = (yang && gender === 'nam') || (!yang && gender === 'nu');
  const startIdx = getBranchIndex(locTonBranch);
  const result: Array<{ branch: EarthlyBranch; starName: string }> = [];
  for (let i = 0; i < 12; i++) {
    const offset = forward ? i : -i;
    const branchIdx = ((startIdx + offset) % 12 + 12) % 12;
    result.push({ branch: BRANCHES[branchIdx], starName: VONG_LOC_TON_SEQUENCE[i] });
  }
  return result;
}
