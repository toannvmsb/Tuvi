/**
 * LUẬN TƯƠNG LAI — phân tích các năm SẮP TỚI (từ năm âm lịch hiện tại tới khi đủ 100 tuổi) bằng ĐÚNG bộ máy của "Nghiệm quá khứ":
 * cùng hai hệ (Tử Vi Nam Phái qua engine "Luận sự kiện năm" + Bát Tự), cùng 5 mảng đời, cùng bốn tầng
 * (bẩm sinh · giai đoạn 10 năm · trong năm · tóm lại), cùng cách chấm và chuẩn hóa — chỉ khác:
 *  - không có phản hồi Đúng/Sai (chưa xảy ra) và không loại tuổi phổ biến / tuổi nhỏ;
 *  - chọn "năm nổi bật" trải đều các đại hạn (mỗi đại hạn tối đa `maxPerDaiVan` năm);
 *  - độ mạnh được chuẩn hóa theo CÁC NĂM TƯƠNG LAI của chính lá số (tương đối: "năm nổi bật nhất trong những năm tới");
 *  - lời văn ở thể xu hướng ("Có thể bạn sẽ …"), sự kiện nhạy cảm chỉ nói ở mức mảng đời + gợi ý chuẩn bị.
 * Thuần tất định, không UI/Supabase/AI.
 */
import type { AstrologyResult } from '../../types';
import { currentAgeOf } from '../ageUtil';
import { AREAS, FUTURE_CONFIG, RULEBOOK_VERSION, type AreaId } from './config';
import { tuviYearRaw } from './tuviSignals';
import type { EventContextFlags } from '../annualEvents/applicability';
import { buildBaziNatal, evaluateBaziYear, type BaziNatal } from './bazi/engine';
import { scoreYears, type YearRaw } from './scoreYear';
import { tierOf } from './selectMarkers';
import { lunarYearOf } from './index';
import type { PastMarker, YearScore } from './types';

/** Năm nổi bật của tương lai = mốc như quá khứ + điểm có dấu của mảng (để chọn gợi ý cơ hội / chuẩn bị). */
export interface FutureMarker extends PastMarker { signed: number }

export interface FutureReview {
  rulebookVersion: string;
  currentLunarYear: number;
  /** Năm âm lịch cuối cùng được xét (tuổi ≈ untilAge). */
  lastYear: number;
  scores: YearScore[];
  markers: FutureMarker[];
}

/** Các năm âm lịch cần xét: từ năm hiện tại tới khi tuổi (năm − năm sinh + 1) vượt `untilAge`. */
export function futureYears(result: AstrologyResult, now: Date): number[] {
  const cur = lunarYearOf(now);
  const years: number[] = [];
  for (let y = cur; years.length < FUTURE_CONFIG.maxYears; y++) {
    if (currentAgeOf(result, new Date(y, 0, 1)) > FUTURE_CONFIG.untilAge) break;
    years.push(y);
  }
  return years;
}

function rawForYear(result: AstrologyResult, natal: BaziNatal, year: number, context?: EventContextFlags): YearRaw {
  return { tv: tuviYearRaw(result, year, context), bz: evaluateBaziYear(natal, year) };
}

/**
 * Chọn năm nổi bật: lượt 1 lấy năm mạnh nhất của MỖI đại hạn (đảm bảo trải đều đời người), lượt 2 lấy tiếp theo thứ tự
 * điểm tới khi đủ `markersMax`. Mỗi năm tối đa một mốc; tối đa `maxPerArea` mốc/mảng; `maxPerDaiVan` mốc/đại hạn.
 * Tie-break cố định: điểm → năm gần hơn → thứ tự mảng.
 */
export function selectFutureMarkers(scores: YearScore[]): FutureMarker[] {
  interface Cand { year: number; area: AreaId; value: number; sc: YearScore }
  const cands: Cand[] = [];
  for (const sc of scores) {
    for (const area of AREAS) {
      const as = sc.areas[area];
      if (as.strength < FUTURE_CONFIG.minMarkerStrength) continue;
      cands.push({ year: sc.year, area, value: as.strength + 0.001 * (as.tuvi + as.bazi), sc });
    }
  }
  cands.sort((a, b) => b.value - a.value || a.year - b.year || AREAS.indexOf(a.area) - AREAS.indexOf(b.area));

  const picked: Cand[] = [];
  const usedYears = new Set<number>();
  const perArea: Partial<Record<AreaId, number>> = {};
  const perDv = new Map<number | null, number>();
  const canTake = (c: Cand) =>
    picked.length < FUTURE_CONFIG.markersMax &&
    !usedYears.has(c.year) &&
    (perArea[c.area] ?? 0) < FUTURE_CONFIG.maxPerArea &&
    (perDv.get(c.sc.daiVanIndex) ?? 0) < FUTURE_CONFIG.maxPerDaiVan;
  const take = (c: Cand) => {
    picked.push(c); usedYears.add(c.year);
    perArea[c.area] = (perArea[c.area] ?? 0) + 1;
    perDv.set(c.sc.daiVanIndex, (perDv.get(c.sc.daiVanIndex) ?? 0) + 1);
  };

  const firstOfDv = new Set<number | null>();
  for (const c of cands) {
    if (firstOfDv.has(c.sc.daiVanIndex)) continue;
    if (canTake(c)) { take(c); firstOfDv.add(c.sc.daiVanIndex); }
  }
  for (const c of cands) if (canTake(c)) take(c);

  return picked
    .sort((a, b) => a.year - b.year)
    .map(({ sc, area }) => {
      const as = sc.areas[area];
      return {
        year: sc.year, age: sc.age, area, tier: tierOf(as.agree, as.strength), agree: as.agree, strength: as.strength,
        daiVanIndex: sc.daiVanIndex, topEventId: as.topEventId, signals: as.signals, signed: as.signed,
      };
    });
}

function finish(scores: YearScore[], currentLunarYear: number): FutureReview {
  return {
    rulebookVersion: RULEBOOK_VERSION,
    currentLunarYear,
    lastYear: scores.length ? scores[scores.length - 1].year : currentLunarYear,
    scores,
    markers: selectFutureMarkers(scores),
  };
}

export function computeFutureReviewSync(result: AstrologyResult, opts: { now?: Date; context?: EventContextFlags } = {}): FutureReview {
  const now = opts.now ?? new Date();
  const natal = buildBaziNatal(result);
  const raws = futureYears(result, now).map(y => rawForYear(result, natal, y, opts.context));
  return finish(scoreYears(raws), lunarYearOf(now));
}

/** Bản bất đồng bộ: nhường luồng UI giữa các năm và báo tiến trình. Kết quả GIỐNG HỆT bản đồng bộ. */
export async function computeFutureReview(
  result: AstrologyResult,
  opts: { now?: Date; context?: EventContextFlags; onProgress?: (done: number, total: number) => void } = {},
): Promise<FutureReview> {
  const now = opts.now ?? new Date();
  const natal = buildBaziNatal(result);
  const years = futureYears(result, now);
  const raws: YearRaw[] = [];
  for (let i = 0; i < years.length; i++) {
    raws.push(rawForYear(result, natal, years[i], opts.context));
    opts.onProgress?.(i + 1, years.length);
    if (i % 3 === 2) await new Promise<void>(r => setTimeout(r, 0));
  }
  return finish(scoreYears(raws), lunarYearOf(now));
}

