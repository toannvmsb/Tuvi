/**
 * NGHIỆM QUÁ KHỨ — điểm vào của bộ máy (thuần TS, không phụ thuộc UI/Supabase/AI).
 *  computePastReviewSync: dùng cho test/công cụ nội bộ.
 *  computePastReview:     bản bất đồng bộ, nhường luồng UI giữa các năm và báo tiến trình.
 * Cả hai cho kết quả GIỐNG HỆT nhau với cùng (lá số, `now`).
 */
import type { AstrologyResult } from '../../types';
import { solarToLunar } from '../lunarCalendar';
import { currentAgeOf } from '../ageUtil';
import { PAST_CONFIG, RULEBOOK_VERSION } from './config';
import { tuviYearRaw } from './tuviSignals';
import type { EventContextFlags } from '../annualEvents/applicability';
import { buildBaziNatal, evaluateBaziYear, type BaziNatal } from './bazi/engine';
import { scoreYears, type YearRaw } from './scoreYear';
import { selectMarkers } from './selectMarkers';
import type { PastMarker, YearScore } from './types';

export * from './config';
export * from './types';
export { selectMarkers } from './selectMarkers';
export { scoreYears } from './scoreYear';

export interface PastReview {
  rulebookVersion: string;
  /** Năm âm lịch hiện tại (đã loại khỏi danh sách mốc). */
  currentLunarYear: number;
  scores: YearScore[];
  markers: PastMarker[];
}

export function lunarYearOf(d: Date): number {
  return solarToLunar(d.getDate(), d.getMonth() + 1, d.getFullYear()).year;
}

/** Các năm âm lịch cần chấm: `scoreYears` năm liền trước năm hiện tại, từ `minAge` tuổi trở lên, tăng dần. */
export function candidateYears(result: AstrologyResult, now: Date): number[] {
  const cur = lunarYearOf(now);
  const years: number[] = [];
  for (let y = cur - PAST_CONFIG.scoreYears; y < cur; y++) {
    if (currentAgeOf(result, new Date(y, 0, 1)) >= PAST_CONFIG.minAge) years.push(y);
  }
  return years;
}

function rawForYear(result: AstrologyResult, natal: BaziNatal, year: number, context?: EventContextFlags): YearRaw {
  return { tv: tuviYearRaw(result, year, context), bz: evaluateBaziYear(natal, year) };
}

function finish(result: AstrologyResult, raws: YearRaw[], now: Date): PastReview {
  const scores = scoreYears(raws);
  const currentLunarYear = lunarYearOf(now);
  const markers = selectMarkers(scores, { currentLunarYear, currentAge: currentAgeOf(result, now) });
  return { rulebookVersion: RULEBOOK_VERSION, currentLunarYear, scores, markers };
}

export function computePastReviewSync(result: AstrologyResult, opts: { now?: Date; context?: EventContextFlags } = {}): PastReview {
  const now = opts.now ?? new Date();
  const natal = buildBaziNatal(result);
  const raws = candidateYears(result, now).map(y => rawForYear(result, natal, y, opts.context));
  return finish(result, raws, now);
}

export async function computePastReview(
  result: AstrologyResult,
  opts: { now?: Date; context?: EventContextFlags; onProgress?: (done: number, total: number) => void } = {},
): Promise<PastReview> {
  const now = opts.now ?? new Date();
  const natal = buildBaziNatal(result);
  const years = candidateYears(result, now);
  const raws: YearRaw[] = [];
  for (let i = 0; i < years.length; i++) {
    raws.push(rawForYear(result, natal, years[i], opts.context));
    opts.onProgress?.(i + 1, years.length);
    // Nhường luồng giao diện sau mỗi 2 năm (mỗi năm vài ms trên Node, có thể gấp vài lần trên máy yếu).
    if (i % 2 === 1) await new Promise<void>(r => setTimeout(r, 0));
  }
  return finish(result, raws, now);
}
