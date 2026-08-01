/**
 * ANNUAL PERIOD SERVICE (Phase 9 — Tiểu Vận) — NGUỒN CHÂN LÝ DUY NHẤT cho
 * điểm vận từng năm và việc xác định năm đỉnh / năm cẩn trọng.
 *
 * Nguyên tắc V2.0: "điểm một NĂM hiển thị ở drill-down Đại Vận PHẢI BẰNG điểm
 * năm đó ở màn Tiểu Vận." Để đảm bảo điều này về mặt cấu trúc (không dựa vào
 * việc hai nơi tình cờ gọi cùng hàm), mọi màn hình lấy dữ liệu năm qua service
 * này — cùng một `scoreTieuVan` engine, cùng logic peak/caution.
 */

import type { AstrologyResult } from '../types';
import { scoreAllTieuVan, scoreTieuVan, type TieuVanScore } from './tieuVanScore';

export interface AnnualPeriod extends TieuVanScore {
  isPeak: boolean;    // năm đỉnh cao trong đại vận
  isCaution: boolean; // năm cần cẩn trọng
}

export interface DaiVanAnnualBreakdown {
  daiVanIndex: number;
  years: AnnualPeriod[];
  peakAges: number[];
  cautionAges: number[];
}

/** Ngưỡng xác định năm đỉnh / năm cẩn trọng (dùng chung mọi nơi). */
export const PEAK_TAILOC_MIN = 70;
export const PEAK_RATIO = 0.88;      // ≥ 88% của đỉnh cao nhất trong vận
export const CAUTION_THACHTHUC_MIN = 62;
export const CAUTION_TAILOC_MAX = 50;

function markPeakCaution(years: TieuVanScore[]): AnnualPeriod[] {
  if (!years.length) return [];
  const maxTaiLoc = Math.max(...years.map(y => y.taiLoc));
  return years.map(y => ({
    ...y,
    isPeak: y.taiLoc >= PEAK_TAILOC_MIN && y.taiLoc >= maxTaiLoc * PEAK_RATIO,
    isCaution:
      y.rating === 'Nhiều thách thức' ||
      (y.thachThuc >= CAUTION_THACHTHUC_MIN && y.taiLoc < CAUTION_TAILOC_MAX),
  }));
}

/** Toàn bộ điểm năm của lá số (passthrough có memo-hóa ở phía màn hình). */
export function getAllAnnualPeriods(result: AstrologyResult): TieuVanScore[] {
  return scoreAllTieuVan(result);
}

/**
 * Điểm 10 (hoặc n) năm thuộc một Đại Vận, đã đánh dấu peak/caution.
 * Đây là API mà cả DaiVanScreen (drill-down) lẫn TieuVanScreen dùng.
 */
export function getYearsForDaiVan(
  result: AstrologyResult,
  daiVanIndex: number,
  preScored?: TieuVanScore[],
): DaiVanAnnualBreakdown {
  const all = preScored ?? scoreAllTieuVan(result);
  const filtered = all
    .filter(t => t.daiVanIndex === daiVanIndex)
    .sort((a, b) => a.age - b.age);
  const years = markPeakCaution(filtered);
  return {
    daiVanIndex,
    years,
    peakAges: years.filter(y => y.isPeak).map(y => y.age),
    cautionAges: years.filter(y => y.isCaution).map(y => y.age),
  };
}

export interface ConsistencyReport {
  ok: boolean;
  totalYears: number;
  mismatches: { age: number; reason: string }[];
  orphanYears: number[]; // năm không thuộc đại vận nào
}

/**
 * KIỂM TRA NHẤT QUÁN (Phase 9 / Phase 16): với mỗi năm, điểm lấy qua
 * getYearsForDaiVan (drill-down Đại Vận) phải TRÙNG KHỚP điểm tính trực tiếp
 * bằng scoreTieuVan (màn Tiểu Vận). Đồng thời mỗi năm phải thuộc đúng 1 đại vận.
 */
export function checkTieuVanConsistency(result: AstrologyResult): ConsistencyReport {
  const all = scoreAllTieuVan(result);
  const mismatches: { age: number; reason: string }[] = [];
  const orphanYears: number[] = [];
  const dvIndexes = new Set(result.daiVans.map(d => d.index));

  for (const tv of result.tieuVans) {
    if (!dvIndexes.has(tv.daiVanIndex)) {
      orphanYears.push(tv.age);
      continue;
    }
    // Điểm qua service (drill-down)
    const viaService = getYearsForDaiVan(result, tv.daiVanIndex, all)
      .years.find(y => y.age === tv.age);
    // Điểm tính trực tiếp (màn Tiểu Vận)
    const direct = scoreTieuVan(result, tv);
    if (!viaService) {
      mismatches.push({ age: tv.age, reason: 'không tìm thấy trong drill-down đại vận' });
      continue;
    }
    if (viaService.taiLoc !== direct.taiLoc || viaService.thachThuc !== direct.thachThuc) {
      mismatches.push({
        age: tv.age,
        reason: `drill-down (${viaService.taiLoc}/${viaService.thachThuc}) ≠ trực tiếp (${direct.taiLoc}/${direct.thachThuc})`,
      });
    }
  }

  return {
    ok: mismatches.length === 0 && orphanYears.length === 0,
    totalYears: result.tieuVans.length,
    mismatches,
    orphanYears,
  };
}
