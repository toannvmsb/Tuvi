/**
 * Quan hệ giữa HAI địa chi (xung/hợp/hình/hại/phá/tam hợp). Dùng chung cho Nghiệm quá khứ (chi lưu niên × trụ) và
 * logic ngày đẹp (chi ngày × trụ). Dùng các bảng đã export trong core/thapThan.
 */
import type { EarthlyBranch } from '../types';
import {
  LUC_HOP, LUC_XUNG, LUC_HAI, LUC_PHA, TAM_HOP, HINH_TRIPLE, HINH_PAIR, TU_HINH,
} from './thapThan';

export type BranchRel = 'xung' | 'lucHop' | 'hai' | 'pha' | 'hinh' | 'tamHop';

const inPair = (pairs: [EarthlyBranch, EarthlyBranch, ...unknown[]][], a: EarthlyBranch, b: EarthlyBranch) =>
  pairs.some(p => (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a));

export function branchRelations(a: EarthlyBranch, b: EarthlyBranch): BranchRel[] {
  const out: BranchRel[] = [];
  if (inPair(LUC_XUNG, a, b)) out.push('xung');
  if (inPair(LUC_HOP, a, b)) out.push('lucHop');
  if (inPair(LUC_HAI, a, b)) out.push('hai');
  if (inPair(LUC_PHA, a, b)) out.push('pha');
  if (a !== b && TAM_HOP.some(([g]) => g.includes(a) && g.includes(b))) out.push('tamHop');
  const hinh =
    (a !== b && HINH_TRIPLE.some(([g]) => g.includes(a) && g.includes(b))) ||
    inPair(HINH_PAIR, a, b) ||
    (a === b && TU_HINH.includes(a));
  if (hinh) out.push('hinh');
  return out;
}

export const REL_LABEL: Record<BranchRel, string> = {
  xung: 'xung', lucHop: 'lục hợp', hai: 'hại', pha: 'phá', hinh: 'hình', tamHop: 'tam hợp',
};
