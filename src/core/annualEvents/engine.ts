/**
 * ĐIỀU PHỐI TOÀN BỘ PIPELINE — Chart calculation (tái dùng core/* có sẵn) → Signal normalization
 * (signals.ts) → Event detection + Convergence + Conflict + Cross-event (scorer/specialRules/
 * conflictRules/crossEventRules) → Monthly timing (monthlyTiming.ts) → Structured JSON.
 * Bước "Claude narrative" nằm ở narrativePrompt.ts + lib/annualEventsAI.ts (gọi sau, ngoài engine
 * thuần túy) — engine.ts KHÔNG bao giờ gọi AI (đúng ranh giới ENGINE_SPEC §24).
 */
import type { AstrologyResult } from '../../types';
import type { AnnualPrediction, CompositeEvent, EventRule, ScoredEvent, UniformCondition } from './types';
import { ENGINE_VERSION, RULE_VERSION, SCHOOL_PROFILE_ID } from './config';
import { ALL_RULES, EVENT_DEFINITIONS, ALL_EVENT_IDS, RULES_BY_EVENT } from './rules';
import { buildAnnualContext } from './signals';
import { scoreEventPass1, finalizeEvent, intensityLevelOf, type ScoreEventResult } from './scorer';
import { buildCategoryAggregates, evaluateSpecialRules } from './specialRules';
import { computeMonthlyTiming } from './monthlyTiming';
import { rankEvents } from './ranking';
import { CONFLICT_RULES } from './conflictRules';
import { CROSS_EVENT_RULES } from './crossEventRules';
import { eventTitleOf, categoryTitleOf } from './eventTitles';
import { yearCanChi } from './calendar';

function isUniform(c: EventRule['condition']): c is UniformCondition {
  return typeof (c as UniformCondition).signal === 'string';
}

/** Áp rule xung khắc (conflict_rules_v1) — chỉ chỉnh HƯỚNG/ghi chú, KHÔNG đổi điểm strength (§9 finalScore đã chốt trước đó). */
function applyConflictRules(events: ScoredEvent[]): Record<string, string[]> {
  const themes: Record<string, string[]> = {};
  for (const ev of events) {
    const posFamilies = new Set(ev.evidence.filter(e => e.polarity === 'POSITIVE').map(e => e.evidenceFamily));
    const negFamilies = new Set(ev.evidence.filter(e => e.polarity === 'NEGATIVE').map(e => e.evidenceFamily));
    const codes = new Set(ev.evidence.map(e => e.signalType));
    for (const rule of CONFLICT_RULES) {
      if (rule.when.category && rule.when.category !== ev.category) continue;
      if (rule.when.positiveFamiliesMin != null && posFamilies.size < rule.when.positiveFamiliesMin) continue;
      if (rule.when.negativeFamiliesMin != null && negFamilies.size < rule.when.negativeFamiliesMin) continue;
      if (rule.when.signalsAny && !rule.when.signalsAny.some(s => codes.has(s))) continue;
      if (rule.when.negativeSignalsAny && !rule.when.negativeSignalsAny.some(s => codes.has(s))) continue;
      if (rule.action.addTheme) (themes[ev.eventId] ??= []).push(rule.action.addTheme);
      if (rule.action.suppressAbsoluteLossLanguage) ev.narrativeHints.push('Tránh dùng ngôn ngữ "mất mát tuyệt đối" — đây là biến động tài sản, không phải rủi ro chắc chắn.');
      if (rule.action.avoid) ev.narrativeHints.push(`Tránh diễn giải nhị phân kiểu "chắc chắn ${rule.action.avoid.includes('breakup') ? 'chia tay hoặc kết hôn' : rule.action.avoid}".`);
    }
  }
  return themes;
}

function applyCrossEventRules(events: ScoredEvent[]): CompositeEvent[] {
  const byId = new Map(events.map(e => [e.eventId, e]));
  const composites: CompositeEvent[] = [];
  for (const rule of CROSS_EVENT_RULES) {
    const ok = Object.entries(rule.requires).every(([id, min]) => (byId.get(id)?.strength ?? 0) >= min);
    if (!ok) continue;
    const memberEventIds = Object.keys(rule.requires).filter(id => byId.has(id));
    composites.push({ id: rule.id, result: rule.result, narrativeHint: rule.narrativeHint, memberEventIds });
    for (const id of memberEventIds) byId.get(id)?.narrativeHints.push(rule.narrativeHint);
  }
  return composites;
}

/**
 * Chấm điểm + luận toàn bộ 85 sự kiện cho 1 lá số + 1 năm xem. Trả về sự kiện đã lọc/xếp hạng
 * (tối đa 5, tối đa 2/nhóm) — cùng bản đầy đủ trong `debugCandidateCount` để biết đã xét bao nhiêu.
 */
export function computeAnnualPrediction(result: AstrologyResult, targetYear: number): AnnualPrediction {
  const ctx = buildAnnualContext(result, targetYear);
  const uniformRules = ALL_RULES.filter(r => isUniform(r.condition));
  const specialRules = ALL_RULES.filter(r => !isUniform(r.condition));

  // PASS 1
  const pass1: Record<string, ScoreEventResult> = {};
  for (const id of ALL_EVENT_IDS) {
    const def = EVENT_DEFINITIONS[id];
    pass1[id] = scoreEventPass1(def, RULES_BY_EVENT[id] ?? [], ctx, result);
  }
  const categories = buildCategoryAggregates(pass1);

  // PASS 2 — rule đặc biệt + hoàn thiện + thời điểm tháng
  const scored: ScoredEvent[] = [];
  for (const id of ALL_EVENT_IDS) {
    const def = EVENT_DEFINITIONS[id];
    const special = evaluateSpecialRules(def, specialRules, pass1, categories, ctx.signals);
    const ev = finalizeEvent(pass1[id], special.extraStructural, special.extraEvidence, special.extraFamilies);
    ev.title = eventTitleOf(id);
    ev.peakMonths = computeMonthlyTiming(def, ev.strength, RULES_BY_EVENT[id] ?? [], result, ctx);
    scored.push(ev);
  }

  applyConflictRules(scored);
  const composites = applyCrossEventRules(scored);

  const top = rankEvents(scored);
  const overallIntensity = intensityLevelOf(top.length ? Math.round(top.reduce((s, e) => s + e.strength, 0) / top.length) : 0);
  const annualTheme = top.slice(0, 5).map(e => `${categoryTitleOf(e.category)} — ${e.title} (${e.direction === 'POSITIVE' ? 'thuận' : e.direction === 'NEGATIVE' ? 'cần lưu ý' : 'hai chiều'})`);
  const { stem, branch } = yearCanChi(targetYear);

  return {
    targetYear,
    targetAge: ctx.targetAge,
    yearStem: stem,
    yearBranch: branch,
    yearCanChi: `${stem} ${branch}`,
    annualTheme,
    overallIntensity,
    events: top,
    composites,
    engineVersion: ENGINE_VERSION,
    ruleVersion: RULE_VERSION,
    schoolProfile: SCHOOL_PROFILE_ID,
    debugCandidateCount: scored.length,
  };
}
