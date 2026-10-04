/**
 * Kết quả tính "Nghiệm quá khứ" dùng chung cho màn Nghiệm quá khứ và Dòng đời đã qua.
 * Chỉ cache TRONG BỘ NHỚ của phiên (không lưu bền) — khóa theo lá số + ngày giờ sinh + phiên bản bảng quy tắc.
 */
import type { AstrologyResult } from '../types';
import { computePastReview, RULEBOOK_VERSION, type PastReview } from '../core/pastReview';

const done = new Map<string, PastReview>();

export function pastReviewSignature(r: AstrologyResult): string {
  const b = r.birthInfo;
  return `${b.chartId ?? 'local'}|${b.year}-${b.month}-${b.day}-${b.hour}|${b.gender}|${b.calendarType}|${RULEBOOK_VERSION}`;
}

export function cachedPastReview(r: AstrologyResult): PastReview | undefined {
  return done.get(pastReviewSignature(r));
}

export async function getPastReview(
  r: AstrologyResult, onProgress?: (done: number, total: number) => void,
): Promise<PastReview> {
  const sig = pastReviewSignature(r);
  const hit = done.get(sig);
  if (hit) return hit;
  const review = await computePastReview(r, { onProgress });
  done.set(sig, review);
  return review;
}
