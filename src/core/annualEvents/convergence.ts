/**
 * Hội tụ bằng chứng (Convergence) — đếm SỐ NHÓM ĐỘC LẬP (evidence family) có tham gia, không
 * đếm số rule/sao — tránh "hội tụ giả" khi 3 sao cùng 1 hệ (vd Lộc Tồn+Kình+Đà) được tính như
 * 3 bằng chứng riêng (ENGINE_SPEC §5).
 */
import type { EvidenceFamily } from './types';
import { CONVERGENCE_MULTIPLIER, CONVERGENCE_MULTIPLIER_6PLUS, CONVERGENCE_MULTIPLIER_CAP } from './config';

export function convergenceMultiplier(nFamilies: number): number {
  if (nFamilies <= 0) return 1.0;
  const m = nFamilies >= 6 ? CONVERGENCE_MULTIPLIER_6PLUS : (CONVERGENCE_MULTIPLIER[nFamilies] ?? 1.0);
  return Math.min(CONVERGENCE_MULTIPLIER_CAP, m);
}

export function countIndependentFamilies(families: EvidenceFamily[]): EvidenceFamily[] {
  return Array.from(new Set(families));
}
