/**
 * "LÁ SỐ THÁNG" đầy đủ 12 cung (TUZI_Monthly_Event_Timing_Engine_v2.md §5) — không chỉ tính
 * riêng cung Mệnh của tháng mà dựng lại TOÀN BỘ 12 vai trò cung (Mệnh, Huynh Đệ, Phu Thê,...)
 * quanh cung Mệnh-tháng đó, dùng ĐÚNG thứ tự an cung nghịch chiều mà core/tuViEngine.ts dùng cho
 * lá số gốc (PALACE_NAMES_VI, không export nên khai báo lại thứ tự — đây là toán an cung cố định,
 * không phải quy ước trường phái, nên chép lại an toàn).
 *
 * Cùng 1 hàm roleBranch() này dùng được cho CẢ 3 tầng tham chiếu (chỉ khác "cung Mệnh neo"):
 *  - NATAL   : neo = chi cung Mệnh gốc trên lá số.
 *  - ANNUAL  : neo = chi của năm xem (quy ước "Lưu niên Mệnh an tại chi năm").
 *  - MONTHLY : neo = chi cung Mệnh của tháng (Đẩu Quân + số tháng, xem douJun.ts).
 * Đại Vận trong app này (core/daiVanScore.ts) không có khái niệm "cung Quan Lộc riêng của Đại
 * Vận" — chỉ có 1 cung duy nhất mà Đại Vận đang chạy tới — nên tầng ĐẠI VẬN không dùng roleBranch,
 * mà so trực tiếp với chi cung Đại Vận (xem monthlyTiming.ts).
 */
import type { EarthlyBranch } from '../../types';
import type { Palace } from './types';
import { BRANCHES } from './calendar';

/** Thứ tự 12 cung tính NGHỊCH từ Mệnh — khớp hệt PALACE_NAMES_VI trong core/tuViEngine.ts. */
export const ROLE_ORDER: Palace[] = [
  'MENH', 'HUYNH_DE', 'PHU_THE', 'TU_TUC', 'TAI_BACH', 'TAT_ACH',
  'THIEN_DI', 'NO_BOC', 'QUAN_LOC', 'DIEN_TRACH', 'PHUC_DUC', 'PHU_MAU',
];

const mod12 = (n: number): number => ((n % 12) + 12) % 12;

export function roleBranchIndex(anchorBranchIdx: number, role: Palace): number {
  const roleIdx = ROLE_ORDER.indexOf(role);
  return mod12(anchorBranchIdx - roleIdx);
}

export function roleBranch(anchorBranchIdx: number, role: Palace): EarthlyBranch {
  return BRANCHES[roleBranchIndex(anchorBranchIdx, role)];
}

const oppositeIdx = (i: number): number => mod12(i + 6);
const TAM_HOP_GROUPS: number[][] = [[8, 0, 4], [2, 6, 10], [5, 9, 1], [11, 3, 7]];

export type Geometry = 'DIRECT' | 'OPPOSITION' | 'TRINE' | 'ADJACENT' | 'NONE';

/** §8 — quan hệ hình học giữa 2 chi (đồng cung / xung / tam hợp / liền kề / không liên quan). */
export function geometryOf(aIdx: number, bIdx: number): Geometry {
  if (aIdx === bIdx) return 'DIRECT';
  if (oppositeIdx(aIdx) === bIdx) return 'OPPOSITION';
  const grp = TAM_HOP_GROUPS.find(g => g.includes(aIdx));
  if (grp?.includes(bIdx)) return 'TRINE';
  if (mod12(aIdx - bIdx) === 1 || mod12(bIdx - aIdx) === 1) return 'ADJACENT';
  return 'NONE';
}
