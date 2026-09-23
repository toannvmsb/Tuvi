/**
 * Chấm điểm 1 sự kiện — ENGINE_SPEC §9 (baseScore theo 8 nhóm) → §10 (ngưỡng sự kiện lớn) →
 * §11 (hướng) → §20 (độ tin cậy). Chạy 2 lượt (xem engine.ts):
 *  - PASS 1: chỉ dùng 1338 rule đồng dạng (signal/axis/matchMode) trên tín hiệu NATAL/DA_HAN/ANNUAL.
 *  - PASS 2: cộng thêm 5 rule đặc biệt (SP_*) vào nhóm "structuralSupport", dùng kết quả PASS 1
 *    của TẤT CẢ sự kiện làm ngữ cảnh (eventMin/categoryMin/annualCategoryDirection...).
 */
import type {
  AstrologySignal, EventDefinition, EventRule, EvidenceItem, EvidenceFamily,
  ScoredEvent, ScoreBreakdown, Direction, ConfidenceLevel, IntensityLevel, Palace, UniformCondition,
} from './types';
import { BASE_WEIGHTS, INTENSITY_BANDS, DIRECTION_DELTA, SUPPRESSION, CONFIDENCE_WEIGHTS } from './config';
import { convergenceMultiplier, countIndependentFamilies } from './convergence';
import { PALACE_CODE_TO_VN, palaceBranch, branchRelation } from './calendar';
import type { AnnualSignalContext } from './signals';

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

function isUniform(c: EventRule['condition']): c is UniformCondition {
  return typeof (c as UniformCondition).signal === 'string';
}

interface RawAccum {
  natal: number; daHan: number; annualAxis: number; annualFourTransform: number;
  positive: number; negative: number; activating: number;
  evidence: EvidenceItem[];
  families: Set<EvidenceFamily>;
  layersHit: Set<AstrologySignal['source']>;
}

function newAccum(): RawAccum {
  return { natal: 0, daHan: 0, annualAxis: 0, annualFourTransform: 0, positive: 0, negative: 0, activating: 0, evidence: [], families: new Set(), layersHit: new Set() };
}

/** Khớp 1338 rule đồng dạng cho 1 sự kiện, cộng dồn vào accum. Chỉ xét tín hiệu NATAL/DA_HAN/ANNUAL. */
function applyUniformRules(rules: EventRule[], axisPalaces: Set<Palace>, axisWeights: Record<string, number>, signals: AstrologySignal[], acc: RawAccum) {
  for (const r of rules) {
    if (!isUniform(r.condition)) continue;
    for (const s of signals) {
      if (s.source === 'MONTHLY') continue;
      if (s.signalType !== r.condition.signal) continue;
      if (!axisPalaces.has(s.palace)) continue;
      const axisWeight = axisWeights[s.palace] ?? 0.5;
      const layerMult = r.layerMultipliers?.[s.source] ?? 1.0;
      const contribution = r.baseWeight * axisWeight * layerMult * (s.intensity / 100);
      if (contribution <= 0) continue;

      acc.families.add(r.evidenceFamily);
      acc.layersHit.add(s.source);
      acc.evidence.push({
        ruleId: r.id, source: s.source, palace: s.palace, signalType: s.signalType, starName: s.starName,
        contribution: Math.round(contribution * 10) / 10, evidenceFamily: r.evidenceFamily, polarity: r.polarity,
      });

      if (s.source === 'NATAL') acc.natal += contribution;
      else if (s.source === 'DA_HAN') acc.daHan += contribution;
      else if (s.source === 'ANNUAL') {
        if (r.evidenceFamily === 'FOUR_TRANSFORMATION') acc.annualFourTransform += contribution;
        else if (r.evidenceFamily === 'MA_SYSTEM') acc.annualAxis += 0; // Thiên Mã tính riêng ở "movingStars", không cộng vào annualAxis
        else acc.annualAxis += contribution;
      }

      if (r.polarity === 'POSITIVE') acc.positive += contribution;
      else if (r.polarity === 'NEGATIVE') acc.negative += contribution;
      else if (r.polarity === 'ACTIVATING') acc.activating += contribution;
    }
  }
}

/** Riêng "movingStars" (5% baseScore) = family MA_SYSTEM (Thiên Mã) ở tầng ANNUAL — tách khỏi annualAxis. */
function movingStarsScore(rules: EventRule[], axisPalaces: Set<Palace>, axisWeights: Record<string, number>, signals: AstrologySignal[]): number {
  let raw = 0;
  for (const r of rules) {
    if (!isUniform(r.condition) || r.evidenceFamily !== 'MA_SYSTEM') continue;
    for (const s of signals) {
      if (s.source !== 'ANNUAL' || s.signalType !== r.condition.signal || !axisPalaces.has(s.palace)) continue;
      const axisWeight = axisWeights[s.palace] ?? 0.5;
      raw += r.baseWeight * axisWeight * (r.layerMultipliers?.ANNUAL ?? 1.0) * (s.intensity / 100);
    }
  }
  return clamp(raw);
}

/** "TieuHan" (8%) — cung Tiểu Hạn năm xem có trùng/tam hợp/xung với trục sự kiện không. */
function tieuHanScore(axisPalaces: Palace[], ctx: AnnualSignalContext, houses: import('../../types').AstrologyResult['tuViChart']): number {
  if (!ctx.tieuHanBranch) return 45; // ngoài phạm vi đã tính tuổi — trung tính, không thưởng/phạt
  let best = 30;
  for (const p of axisPalaces) {
    const b = palaceBranch(houses, p);
    if (!b) continue;
    const rel = branchRelation(ctx.tieuHanBranch, b);
    const score = rel === 'SAME' ? 85 : rel === 'TAM_HOP' ? 65 : rel === 'XUNG' ? 55 : 30;
    if (score > best) best = score;
  }
  return best;
}

/** "StructuralSupport" (5%) — Tuần/Triệt + độ sáng chính tinh tại cung CHỦ (primary) của trục. */
function structuralSupportScore(primaryPalaces: Palace[], houses: import('../../types').AstrologyResult['tuViChart']): number {
  let best = 55;
  for (const p of primaryPalaces) {
    const vn = PALACE_CODE_TO_VN[p];
    const h = houses.houses.find(x => x.palaceName === vn);
    if (!h) continue;
    let v = 55;
    if (h.tuanAt || h.trietAt) v -= 20;
    if (h.stars.some(s => s.type === 'chinh' && (s.brightness === 'miếu' || s.brightness === 'vượng'))) v += 20;
    else if (h.stars.filter(s => s.type === 'chinh').length === 0) v -= 10; // vô chính diệu
    if (v > best) best = v;
  }
  return clamp(best);
}

export interface ScoreEventResult {
  event: EventDefinition;
  accum: RawAccum;
  breakdown: ScoreBreakdown;
  baseScore: number;
  strength: number;
  positiveScore: number;
  negativeScore: number;
}

/** PASS 1 — chấm điểm 1 sự kiện chỉ bằng 1338 rule đồng dạng + các nhóm cấu trúc (TieuHan/LuuNienDaHan/StructuralSupport). */
export function scoreEventPass1(
  event: EventDefinition, rules: EventRule[], ctx: AnnualSignalContext, result: import('../../types').AstrologyResult,
): ScoreEventResult {
  const axisPalaces = new Set<Palace>([...event.axis.primary, ...event.axis.secondary]);
  const acc = newAccum();
  applyUniformRules(rules, axisPalaces, event.axis.weights, ctx.signals, acc);

  const movingStars = movingStarsScore(rules, axisPalaces, event.axis.weights, ctx.signals);
  const tieuHan = tieuHanScore([...axisPalaces], ctx, result.tuViChart);
  const structuralSupport = structuralSupportScore(event.axis.primary, result.tuViChart);

  const daHanBlended = clamp(0.6 * clamp(acc.daHan) + 0.4 * ctx.daHanStructuralScore);

  const breakdown: ScoreBreakdown = {
    natal: clamp(acc.natal),
    daHan: daHanBlended,
    annualAxis: clamp(acc.annualAxis),
    annualFourTransform: clamp(acc.annualFourTransform),
    tieuHan,
    luuNienDaHan: ctx.luuNienDaHanRelationScore,
    movingStars,
    structuralSupport,
  };

  const baseScore =
    breakdown.natal * BASE_WEIGHTS.natal +
    breakdown.daHan * BASE_WEIGHTS.daHan +
    breakdown.annualAxis * BASE_WEIGHTS.annualAxis +
    breakdown.annualFourTransform * BASE_WEIGHTS.annualFourTransform +
    breakdown.tieuHan * BASE_WEIGHTS.tieuHan +
    breakdown.luuNienDaHan * BASE_WEIGHTS.luuNienDaHan +
    breakdown.movingStars * BASE_WEIGHTS.movingStars +
    breakdown.structuralSupport * BASE_WEIGHTS.structuralSupport;

  return {
    event, accum: acc, breakdown, baseScore,
    strength: clamp(baseScore),
    positiveScore: clamp(acc.positive + acc.activating * 0.5),
    negativeScore: clamp(acc.negative + acc.activating * 0.5),
  };
}

export function intensityLevelOf(score: number): IntensityLevel {
  return INTENSITY_BANDS.find(b => score >= b.min && score <= b.max)?.level ?? 'VERY_LOW';
}

function directionOf(positive: number, negative: number): Direction {
  if (positive - negative >= DIRECTION_DELTA) return 'POSITIVE';
  if (negative - positive >= DIRECTION_DELTA) return 'NEGATIVE';
  return 'MIXED';
}

function confidenceOf(acc: RawAccum, breakdown: ScoreBreakdown): { level: ConfidenceLevel; score: number } {
  const layerCoverage = (acc.layersHit.size / 3) * 100;
  const evidenceIndependence = Math.min(100, acc.families.size * 20);
  const total = acc.positive + acc.negative + acc.activating;
  const dominant = Math.max(acc.positive, acc.negative, acc.activating);
  const ruleConsistency = total > 0 ? (dominant / total) * 100 : 50;
  const timingConsistency = 70; // v1: chưa tách theo tháng ở bước này (xem monthlyTiming.ts điều chỉnh khi có lịch tháng rõ)
  const score = Math.round(
    layerCoverage * CONFIDENCE_WEIGHTS.layerCoverage +
    evidenceIndependence * CONFIDENCE_WEIGHTS.evidenceIndependence +
    ruleConsistency * CONFIDENCE_WEIGHTS.ruleConsistency +
    timingConsistency * CONFIDENCE_WEIGHTS.timingConsistency,
  );
  const level: ConfidenceLevel = score >= 85 ? 'VERY_HIGH' : score >= 65 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW';
  return { level, score };
}

function reasoningChainOf(evidence: EvidenceItem[]): string[] {
  const top = [...evidence].sort((a, b) => b.contribution - a.contribution).slice(0, 6);
  const layerLabel: Record<string, string> = { NATAL: 'bản mệnh', DA_HAN: 'đại vận', ANNUAL: 'lưu niên', MONTHLY: 'lưu nguyệt' };
  return top.map(e => `${e.starName} (${layerLabel[e.source] ?? e.source}) tại cung ${PALACE_CODE_TO_VN[e.palace] ?? e.palace}`);
}

/**
 * Hoàn thiện 1 sự kiện từ kết quả PASS 1 + phần cộng thêm của PASS 2 (rule đặc biệt, nếu có).
 * `extraStructural` = điểm cộng thêm vào "structuralSupport" từ 5 rule SP_* (0 nếu không có).
 * `extraEvidence`/`extraFamilies` đi kèm để không mất dấu vết & không đếm hụt hội tụ.
 */
export function finalizeEvent(
  pass1: ScoreEventResult, extraStructural: number, extraEvidence: EvidenceItem[], extraFamilies: EvidenceFamily[],
): ScoredEvent {
  const { event, accum, breakdown } = pass1;
  const finalBreakdown: ScoreBreakdown = { ...breakdown, structuralSupport: clamp(breakdown.structuralSupport + extraStructural) };
  const baseScore =
    finalBreakdown.natal * BASE_WEIGHTS.natal +
    finalBreakdown.daHan * BASE_WEIGHTS.daHan +
    finalBreakdown.annualAxis * BASE_WEIGHTS.annualAxis +
    finalBreakdown.annualFourTransform * BASE_WEIGHTS.annualFourTransform +
    finalBreakdown.tieuHan * BASE_WEIGHTS.tieuHan +
    finalBreakdown.luuNienDaHan * BASE_WEIGHTS.luuNienDaHan +
    finalBreakdown.movingStars * BASE_WEIGHTS.movingStars +
    finalBreakdown.structuralSupport * BASE_WEIGHTS.structuralSupport;

  const allEvidence = [...accum.evidence, ...extraEvidence];
  const families = countIndependentFamilies([...accum.families, ...extraFamilies]);
  let extraPositive = 0, extraNegative = 0;
  for (const e of extraEvidence) {
    if (e.polarity === 'POSITIVE') extraPositive += e.contribution;
    else if (e.polarity === 'NEGATIVE') extraNegative += e.contribution;
    else if (e.polarity === 'ACTIVATING') { extraPositive += e.contribution * 0.5; extraNegative += e.contribution * 0.5; }
  }
  const positiveScore = clamp(pass1.positiveScore + extraPositive);
  const negativeScore = clamp(pass1.negativeScore + extraNegative);

  let strength = clamp(baseScore * convergenceMultiplier(families.length));

  // Suppression §10 — Đại Vận yếu thì trần điểm.
  if (finalBreakdown.daHan < SUPPRESSION.daHanScoreLtCapFinal.threshold) {
    strength = Math.min(strength, SUPPRESSION.daHanScoreLtCapFinal.cap);
  }
  const majorBlocked = finalBreakdown.natal < SUPPRESSION.natalDaHanBlockMajor.natalLt
    && finalBreakdown.daHan < SUPPRESSION.natalDaHanBlockMajor.daHanLt;

  const annualCombined = clamp(finalBreakdown.annualAxis * (20 / 35) + finalBreakdown.annualFourTransform * (15 / 35));
  const gate = event.majorEventGate;
  const isMajorEvent = !majorBlocked
    && finalBreakdown.natal >= gate.minNatal
    && finalBreakdown.daHan >= gate.minDaHan
    && annualCombined >= gate.minAnnual
    && families.length >= gate.minIndependentFamilies;

  const requiredLayersOk = event.veryHighGate.requiredLayers.every(l => allEvidence.some(e => e.source === l));
  const isVeryHigh = isMajorEvent && families.length >= event.veryHighGate.minIndependentFamilies && requiredLayersOk;

  const direction = directionOf(positiveScore, negativeScore);
  const { level: confidence } = confidenceOf(accum, finalBreakdown);
  const level = intensityLevelOf(strength);

  const directionCounter = direction === 'POSITIVE' ? 'NEGATIVE' : direction === 'NEGATIVE' ? 'POSITIVE' : null;
  const counterEvidence = directionCounter ? allEvidence.filter(e => e.polarity === directionCounter) : [];

  return {
    eventId: event.id,
    category: event.category,
    title: event.id,
    strength: Math.round(strength),
    level,
    direction,
    positiveScore: Math.round(positiveScore),
    negativeScore: Math.round(negativeScore),
    confidence,
    isMajorEvent,
    isVeryHigh,
    independentEvidenceFamilies: families,
    evidence: allEvidence,
    counterEvidence,
    reasoningChain: reasoningChainOf(allEvidence),
    peakMonths: [],
    narrativeHints: [...event.notes],
    breakdown: finalBreakdown,
  };
}
