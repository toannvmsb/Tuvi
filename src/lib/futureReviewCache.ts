/**
 * Kết quả "Luận tương lai" trong BỘ NHỚ của phiên (không lưu bền) — khóa theo lá số + ngày giờ sinh + phiên bản bảng quy tắc.
 * Dùng chung chữ ký với lib/pastReviewCache để đổi lá số / sửa giờ sinh thì tính lại.
 */
import type { AstrologyResult } from '../types';
import { computeFutureReview, type FutureReview } from '../core/pastReview/futureReview';
import { pastReviewSignature } from './pastReviewCache';
import { loadEventContext } from './eventContext';

const done = new Map<string, FutureReview>();

export function cachedFutureReview(r: AstrologyResult): FutureReview | undefined {
  return done.get(pastReviewSignature(r));
}

export async function getFutureReview(
  r: AstrologyResult, onProgress?: (done: number, total: number) => void,
): Promise<FutureReview> {
  const context = await loadEventContext(r);
  const sig = pastReviewSignature(r);
  const hit = done.get(sig);
  if (hit) return hit;
  const fr = await computeFutureReview(r, { onProgress, context });
  done.set(sig, fr);
  return fr;
}
