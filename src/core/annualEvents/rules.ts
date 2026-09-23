/**
 * Nạp bộ luật (rules/annual_event_rules_v1.yaml đã chuyển sẵn sang JSON lúc build —
 * xem src/data/annualEventRules.generated.json) + bộ định nghĩa 85 sự kiện.
 * Rule loader tối thiểu theo ENGINE_SPEC §18: validate cấu trúc, loại rule trùng id,
 * chỉ giữ rule tương thích school đang dùng.
 */
import type { EventDefinition, EventRule } from './types';
import rulesJson from '../../data/annualEventRules.generated.json';
import eventDefsJson from '../../data/annualEventDefinitions.json';

const SCHOOL_KEY = 'NAM_PHAI_TAM_HOP'; // id ngắn dùng trong rule.school[] (khác SCHOOL_PROFILE_ID đầy đủ)

function loadRules(): EventRule[] {
  const seen = new Set<string>();
  const out: EventRule[] = [];
  for (const r of rulesJson as EventRule[]) {
    if (seen.has(r.id)) continue; // loại rule trùng id
    if (r.school && !r.school.includes(SCHOOL_KEY)) continue; // chỉ giữ rule tương thích school
    seen.add(r.id);
    out.push(r);
  }
  return out;
}

export const ALL_RULES: EventRule[] = loadRules();
export const RULES_BY_EVENT: Record<string, EventRule[]> = ALL_RULES.reduce((acc, r) => {
  (acc[r.event] ??= []).push(r);
  return acc;
}, {} as Record<string, EventRule[]>);

export const EVENT_DEFINITIONS: Record<string, EventDefinition> = eventDefsJson as unknown as Record<string, EventDefinition>;
export const ALL_EVENT_IDS: string[] = Object.keys(EVENT_DEFINITIONS);
