/**
 * Tứ Hóa (Lộc/Quyền/Khoa/Kỵ) của 1 CAN bất kỳ → {sao, cung đích}, LUÔN qua core/phiHoa.ts
 * (nguồn chuẩn duy nhất theo CLAUDE.md §2.3). Dùng chung cho việc so sánh "đích Tứ Hóa" giữa
 * 4 tầng NATAL/DA_HAN/ANNUAL/MONTHLY (TUZI_Monthly_Event_Timing_Engine_v2.md §10-11).
 */
import type { AstrologyResult, HeavenlyStem } from '../../types';
import type { HoaKind } from '../phiHoa';
import { luuTuHoaPositions } from '../phiHoa';
import type { Palace } from './types';
import { PALACE_VN_TO_CODE } from './calendar';

export type HoaTargets = Partial<Record<HoaKind, { star: string; palace: Palace }>>;

export function fourTransformTargets(c: AstrologyResult['tuViChart'], stem: HeavenlyStem): HoaTargets {
  const out: HoaTargets = {};
  for (const p of luuTuHoaPositions(c, stem)) {
    const palace = PALACE_VN_TO_CODE[p.palace];
    if (!palace) continue;
    out[p.hoa] = { star: p.star, palace };
  }
  return out;
}
