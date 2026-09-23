/**
 * PASS 2 — 5 rule đặc biệt "SP_*" (điều kiện dạng `all: [...]`) tham chiếu tới kết quả PASS 1
 * của CHÍNH sự kiện đó và của CẢ NHÓM (category) — vì vậy phải chạy SAU khi đã có điểm PASS 1
 * của mọi sự kiện (ENGINE_SPEC §13 "Specific-event resolver": suy luận hoạt động chung của nhóm
 * trước, rồi mới chốt sự kiện cụ thể).
 */
import type { AstrologySignal, Direction, EventDefinition, EventRule, EvidenceFamily, EvidenceItem, SpecialCondition, SpecialSubCondition } from './types';
import type { ScoreEventResult } from './scorer';
import { PALACE_CODE_TO_VN } from './calendar';

export interface CategoryAggregate { score: number; positive: number; negative: number; direction: Direction }

function directionOf(positive: number, negative: number): Direction {
  if (positive - negative >= 25) return 'POSITIVE';
  if (negative - positive >= 25) return 'NEGATIVE';
  return 'MIXED';
}

export function buildCategoryAggregates(pass1: Record<string, ScoreEventResult>): Record<string, CategoryAggregate> {
  const acc: Record<string, { score: number; positive: number; negative: number }> = {};
  for (const r of Object.values(pass1)) {
    const a = (acc[r.event.category] ??= { score: 0, positive: 0, negative: 0 });
    a.score = Math.max(a.score, r.strength);
    a.positive += r.positiveScore;
    a.negative += r.negativeScore;
  }
  const out: Record<string, CategoryAggregate> = {};
  for (const [cat, a] of Object.entries(acc)) {
    out[cat] = { score: a.score, positive: a.positive, negative: a.negative, direction: directionOf(a.positive, a.negative) };
  }
  return out;
}

function subConditionHolds(
  sub: SpecialSubCondition, event: EventDefinition, pass1: Record<string, ScoreEventResult>,
  categories: Record<string, CategoryAggregate>, signals: AstrologySignal[],
): { ok: boolean; matched?: AstrologySignal } {
  if (sub.anySignal) {
    const axisPalaces = new Set([...event.axis.primary, ...event.axis.secondary]);
    const hit = signals.find(s => s.source !== 'MONTHLY' && sub.anySignal!.includes(s.signalType) && axisPalaces.has(s.palace));
    return { ok: !!hit, matched: hit };
  }
  if (sub.minIndependentFamilies != null) {
    return { ok: (pass1[event.id]?.accum.families.size ?? 0) >= sub.minIndependentFamilies };
  }
  if (sub.minDaHanScore != null) {
    return { ok: (pass1[event.id]?.breakdown.daHan ?? 0) >= sub.minDaHanScore };
  }
  if (sub.minAnnualAxisScore != null) {
    return { ok: (pass1[event.id]?.breakdown.annualAxis ?? 0) >= sub.minAnnualAxisScore };
  }
  if (sub.annualCategoryDirection) {
    return { ok: categories[event.category]?.direction === sub.annualCategoryDirection };
  }
  if (sub.eventMin) {
    return { ok: Object.entries(sub.eventMin).every(([id, min]) => (pass1[id]?.strength ?? 0) >= min) };
  }
  if (sub.categoryMin) {
    return { ok: Object.entries(sub.categoryMin).every(([cat, min]) => (categories[cat]?.score ?? 0) >= min) };
  }
  if (sub.propertyDirectionIn) {
    return { ok: sub.propertyDirectionIn.includes(categories['PROPERTY']?.direction ?? 'MIXED') };
  }
  return { ok: true };
}

export interface SpecialResult { extraStructural: number; extraEvidence: EvidenceItem[]; extraFamilies: EvidenceFamily[] }

/** Đánh giá toàn bộ rule SP_* cho 1 sự kiện — trả về phần cộng thêm vào "structuralSupport". */
export function evaluateSpecialRules(
  event: EventDefinition, specialRules: EventRule[], pass1: Record<string, ScoreEventResult>,
  categories: Record<string, CategoryAggregate>, signals: AstrologySignal[],
): SpecialResult {
  const result: SpecialResult = { extraStructural: 0, extraEvidence: [], extraFamilies: [] };
  for (const r of specialRules) {
    if (r.event !== event.id) continue;
    const cond = r.condition as SpecialCondition;
    let matchedSignal: AstrologySignal | undefined;
    const allOk = cond.all.every(sub => {
      const res = subConditionHolds(sub, event, pass1, categories, signals);
      if (res.matched) matchedSignal = res.matched;
      return res.ok;
    });
    if (!allOk) continue;
    const axisWeight = matchedSignal ? (event.axis.weights[matchedSignal.palace] ?? 0.6) : 0.7;
    const intensity = matchedSignal ? matchedSignal.intensity / 100 : 0.8;
    const contribution = Math.round(r.baseWeight * axisWeight * intensity * 10) / 10;
    result.extraStructural += contribution;
    result.extraFamilies.push('SPECIAL_PATTERN');
    result.extraEvidence.push({
      ruleId: r.id,
      source: matchedSignal?.source ?? 'ANNUAL',
      palace: matchedSignal?.palace ?? event.axis.primary[0],
      signalType: matchedSignal?.signalType ?? 'SPECIAL',
      starName: matchedSignal?.starName ?? PALACE_CODE_TO_VN[event.axis.primary[0]] ?? r.id,
      contribution,
      evidenceFamily: 'SPECIAL_PATTERN',
      polarity: r.polarity,
    });
  }
  result.extraStructural = Math.min(30, result.extraStructural); // trần nhỏ — đây là phần BỔ SUNG, không thay chính
  return result;
}
