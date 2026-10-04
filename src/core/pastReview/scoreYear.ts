/**
 * BỘ CHẤM ĐIỂM NĂM — gộp hai hệ cho TẤT CẢ các năm cần xét của một lá số:
 *  1. Mỗi hệ có điểm thô theo mảng (Tử Vi: điểm sự kiện mạnh nhất; Bát Tự: Σ trọng số quy tắc).
 *  2. Chuẩn hóa mỗi hệ về 0..100 theo phân vị của CHÍNH lá số (xem config.NORMALIZE).
 *  3. Gộp: hai hệ cùng báo → trung bình × thưởng; chỉ một hệ → điểm hệ đó × hệ số thấp (xếp sau).
 *  4. Có tín hiệu nền (đại vận/đại hạn) cùng mảng với tín hiệu lưu niên → nhân hệ số đại vận.
 *  5. Hai con số: `strength` (không dấu, chọn mốc) và `signed`/`vanScore` (có dấu, vẽ biểu đồ).
 */
import { AREAS, CHART_AREAS, NORMALIZE, PAST_CONFIG, RULEBOOK_VERSION, type AreaId } from './config';
import type { AreaScore, PastSignal, YearScore } from './types';
import type { TuviYearRaw } from './tuviSignals';
import type { BaziYearEval } from './bazi/engine';

export interface YearRaw {
  tv: TuviYearRaw;
  bz: BaziYearEval;
}

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

export function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = p * (sortedAsc.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * (idx - lo);
}

function normalizer(values: number[]): (raw: number) => number {
  const sorted = [...values].sort((a, b) => a - b);
  const low = percentile(sorted, NORMALIZE.lowPercentile);
  const high = percentile(sorted, NORMALIZE.highPercentile);
  return raw => {
    if (high <= low) return raw > low ? 100 : 0;
    return clamp(((raw - low) / (high - low)) * 100, 0, 100);
  };
}

export function scoreYears(raws: YearRaw[]): YearScore[] {
  const tvNorm = {} as Record<AreaId, (r: number) => number>;
  const bzNorm = {} as Record<AreaId, (r: number) => number>;
  for (const a of AREAS) {
    tvNorm[a] = normalizer(raws.map(r => r.tv.areas[a].raw));
    bzNorm[a] = normalizer(raws.map(r => r.bz[a].score));
  }

  return raws.map(({ tv, bz }) => {
    const areas = {} as Record<AreaId, AreaScore>;
    for (const a of AREAS) {
      const tvN = tvNorm[a](tv.areas[a].raw);
      const bzN = bzNorm[a](bz[a].score);
      const agree = tvN >= PAST_CONFIG.agreeMinEach && bzN >= PAST_CONFIG.agreeMinEach;
      let strength = agree
        ? ((tvN + bzN) / 2) * PAST_CONFIG.agreeBonus
        : Math.max(tvN, bzN) * PAST_CONFIG.singleSystemFactor;

      const signals: PastSignal[] = [...tv.areas[a].signals, ...bz[a].signals];
      const hasNen = signals.some(s => s.layer === 'nen' && s.supports && s.weight > 0);
      const hasNgoi = signals.some(s => s.layer === 'ngoi' && s.supports && s.weight > 0);
      if (hasNen && hasNgoi) strength *= PAST_CONFIG.daiVanSameAreaMult;
      strength = clamp(strength, 0, 100);

      const wSum = tvN + bzN;
      const balance = wSum > 0 ? (tvN * tv.areas[a].balance + bzN * bz[a].balance) / wSum : 0;
      areas[a] = {
        area: a,
        tuvi: tvN,
        bazi: bzN,
        agree,
        strength,
        signed: clamp(balance * strength, -100, 100),
        topEventId: tv.areas[a].topEventId,
        signals,
      };
    }

    let best: AreaId = AREAS[0];
    for (const a of AREAS) if (areas[a].strength > areas[best].strength) best = a;
    const vanScore = CHART_AREAS.reduce((s, a) => s + areas[a].signed, 0) / CHART_AREAS.length;

    return {
      year: tv.year,
      age: tv.age,
      daiVanIndex: tv.daiVanIndex,
      areas,
      bestArea: best,
      strength: areas[best].strength,
      vanScore,
      rulebookVersion: RULEBOOK_VERSION,
    };
  });
}
