/**
 * Thời điểm trong THÁNG — ENGINE_SPEC §15. Chỉ chạy khi sự kiện đã đạt
 * `event.minAnnualScoreForMonthlyTiming` (luôn = 55 trong bộ 85 sự kiện) — tầng tháng KHÔNG
 * được tự tạo ra sự kiện lớn nếu năm/đại vận/bản mệnh chưa ủng hộ (§15 "hard rule").
 * Trả về CỬA SỔ tháng (có thể gộp các tháng liền kề tương đương), không khẳng định 1 ngày cụ thể.
 */
import type { AstrologyResult, EarthlyBranch } from '../../types';
import type { EventDefinition, EventRule, MonthWindow, Palace, UniformCondition } from './types';
import { MONTHLY_WEIGHTS, SUPPRESSION } from './config';
import { buildMonthlyContext, dauQuanInteracts } from './monthlySignals';
import { palaceBranch } from './calendar';
import { intensityLevelOf } from './scorer';
import type { AnnualSignalContext } from './signals';

const clamp = (v: number) => Math.max(0, Math.min(100, v));
function isUniform(c: EventRule['condition']): c is UniformCondition {
  return typeof (c as UniformCondition).signal === 'string';
}

function contributionOf(rules: EventRule[], family: 'FOUR_TRANSFORMATION' | 'OTHER', axisPalaces: Set<Palace>, weights: Record<string, number>, monthlySignals: { signalType: string; palace: Palace; intensity: number }[]): number {
  let raw = 0;
  for (const r of rules) {
    if (!isUniform(r.condition)) continue;
    const isFT = r.evidenceFamily === 'FOUR_TRANSFORMATION';
    if (family === 'FOUR_TRANSFORMATION' && !isFT) continue;
    if (family === 'OTHER' && isFT) continue;
    for (const s of monthlySignals) {
      if (s.signalType !== r.condition.signal || !axisPalaces.has(s.palace)) continue;
      const axisWeight = weights[s.palace] ?? 0.5;
      raw += r.baseWeight * axisWeight * (r.layerMultipliers?.MONTHLY ?? 0.45) * (s.intensity / 100);
    }
  }
  return clamp(raw);
}

export function computeMonthlyTiming(
  event: EventDefinition, annualStrength: number, rules: EventRule[], result: AstrologyResult, ctx: AnnualSignalContext,
): MonthWindow[] {
  if (annualStrength < event.minAnnualScoreForMonthlyTiming) return [];
  const axisPalaces = new Set<Palace>([...event.axis.primary, ...event.axis.secondary]);
  const axisBranches = [...axisPalaces].map(p => palaceBranch(result.tuViChart, p)).filter((b): b is EarthlyBranch => !!b);

  const monthly: { month: number; score: number }[] = [];
  for (let m = 1; m <= 12; m++) {
    const mc = buildMonthlyContext(result, ctx.yearStem, ctx.yearBranch, m);
    const ft = contributionOf(rules, 'FOUR_TRANSFORMATION', axisPalaces, event.axis.weights, mc.fourTransformSignals);
    const axisHit = contributionOf(rules, 'OTHER', axisPalaces, event.axis.weights, mc.axisSignals);
    const other = contributionOf(rules, 'OTHER', axisPalaces, event.axis.weights, mc.otherSignals);
    const douJun = dauQuanInteracts(mc.dauQuanBranch, axisBranches) ? 78 : 32;

    let raw =
      annualStrength * MONTHLY_WEIGHTS.annualEventBaseline +
      axisHit * MONTHLY_WEIGHTS.monthlyAxisHit +
      ft * MONTHLY_WEIGHTS.monthlyFourTransform +
      douJun * MONTHLY_WEIGHTS.douJunInteraction +
      other * MONTHLY_WEIGHTS.otherMonthlySignals;

    for (const cap of SUPPRESSION.monthlyCap) {
      if (annualStrength < cap.annualEventScoreLt) raw = Math.min(raw, cap.cap);
    }
    monthly.push({ month: m, score: Math.round(clamp(raw)) });
  }

  // Chỉ giữ tháng "nổi bật" (điểm cao hơn hẳn mặt bằng chung), gộp các tháng liền kề.
  const avg = monthly.reduce((s, x) => s + x.score, 0) / 12;
  const threshold = Math.max(55, avg + 8);
  const notable = monthly.filter(x => x.score >= threshold);
  if (notable.length === 0) return [];

  const windows: MonthWindow[] = [];
  let start = notable[0].month, prev = notable[0].month, peak = notable[0].score;
  for (let i = 1; i < notable.length; i++) {
    const cur = notable[i];
    if (cur.month === prev + 1) {
      prev = cur.month;
      peak = Math.max(peak, cur.score);
    } else {
      windows.push({ startLunarMonth: start, endLunarMonth: prev, strength: intensityLevelOf(peak), score: peak });
      start = cur.month; prev = cur.month; peak = cur.score;
    }
  }
  windows.push({ startLunarMonth: start, endLunarMonth: prev, strength: intensityLevelOf(peak), score: peak });

  return windows.sort((a, b) => b.score - a.score).slice(0, 3);
}
