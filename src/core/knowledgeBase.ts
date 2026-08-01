/**
 * KNOWLEDGE BASE / RULE LOADER (Phase 2).
 *
 * Bọc các dữ liệu tĩnh (`CACH_CUC`, `STAR_INFO`) thành một MODEL RULE thống nhất
 * có TRUY VẾT: mỗi rule có `ruleId` ổn định, `version`, `source` (nguồn), `scope`,
 * `priority`. Data gốc VẪN là source of truth — module này chỉ là lớp nạp/truy vấn
 * (không sửa data), nên không phá vỡ code hiện tại (R12 — rủi ro thấp).
 *
 * Mục tiêu V2.0: rule có version hóa + traceability (rule_id) để lời luận/engine
 * có thể trích dẫn "theo rule nào".
 */

import { CACH_CUC, type CachCuc } from '../data/cachCuc';
import { STAR_INFO, type StarInfo } from '../data/starInfo';

export const RULE_KB_VERSION = '2.0';
const SOURCE_CACH = 'Nam Phái — cụ Thiên Lương / cohoc.net';
const SOURCE_STAR = 'Nam Phái — Lê Quang Lăng / Diệu Xuân';

export type RuleType = 'cach_cuc' | 'star';
export type RuleScope = 'same' | 'group' | 'star';

export interface KnowledgeRule {
  ruleId: string;            // ổn định, vd "CC.tu-phu-vu-tuong", "ST.tu-vi"
  type: RuleType;
  version: string;
  source: string;
  scope: RuleScope;
  priority: number;          // 0–100, cao = luận trước
  name: string;
  meaning: string;           // ý nghĩa (cách) hoặc mô tả cơ bản (sao)
  good?: boolean;            // chỉ cách cục
  category?: string;
  requiredStars?: string[];  // chỉ cách cục
  optionalStars?: string[];  // chỉ cách cục
  baseScore?: number;
}

// ─── Slug/ID ─────────────────────────────────────────────────────────────────

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}
function slugify(s: string): string {
  return stripDiacritics(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
/** Sinh id duy nhất trong 1 tập (thêm hậu tố số nếu trùng slug). */
function uniqueId(prefix: string, name: string, used: Set<string>): string {
  const base = `${prefix}.${slugify(name)}`;
  let id = base, n = 2;
  while (used.has(id)) id = `${base}-${n++}`;
  used.add(id);
  return id;
}

// ─── Priority ────────────────────────────────────────────────────────────────

const CATEGORY_BONUS: Record<string, number> = {
  chinh: 12, quy: 8, phu: 6, bien: 4, hung: 6, nghe: 2, phu_tinh: 2,
};
function cachPriority(c: CachCuc): number {
  const base = c.baseScore ?? 65;
  const bonus = c.category ? (CATEGORY_BONUS[c.category] ?? 0) : 0;
  return Math.max(0, Math.min(100, base + bonus));
}

// ─── Loaders ─────────────────────────────────────────────────────────────────

function loadCachCucRules(used: Set<string>): KnowledgeRule[] {
  return CACH_CUC.map(c => ({
    ruleId: uniqueId('CC', c.name, used),
    type: 'cach_cuc' as const,
    version: RULE_KB_VERSION,
    source: SOURCE_CACH,
    scope: c.scope as RuleScope,
    priority: cachPriority(c),
    name: c.name,
    meaning: c.meaning,
    good: c.good,
    category: c.category,
    requiredStars: c.stars,
    optionalStars: c.optionalStars ?? [],
    baseScore: c.baseScore,
  }));
}

function loadStarRules(used: Set<string>): KnowledgeRule[] {
  return Object.values(STAR_INFO).map((s: StarInfo) => ({
    ruleId: uniqueId('ST', s.name, used),
    type: 'star' as const,
    version: RULE_KB_VERSION,
    source: SOURCE_STAR,
    scope: 'star' as const,
    priority: 50,
    name: s.name,
    meaning: s.basic,
  }));
}

// ─── Registry (build 1 lần, cache) ───────────────────────────────────────────

interface KnowledgeBase {
  rules: KnowledgeRule[];
  byId: Map<string, KnowledgeRule>;
  byName: Map<string, KnowledgeRule>; // key = `${type}:${name}`
}

let _kb: KnowledgeBase | null = null;

export function knowledgeBase(): KnowledgeBase {
  if (_kb) return _kb;
  const used = new Set<string>();
  const rules = [...loadCachCucRules(used), ...loadStarRules(used)];
  const byId = new Map<string, KnowledgeRule>();
  const byName = new Map<string, KnowledgeRule>();
  for (const r of rules) {
    byId.set(r.ruleId, r);
    byName.set(`${r.type}:${r.name}`, r);
  }
  _kb = { rules, byId, byName };
  return _kb;
}

// ─── Query API ───────────────────────────────────────────────────────────────

export function getRule(ruleId: string): KnowledgeRule | undefined {
  return knowledgeBase().byId.get(ruleId);
}
export function rulesByType(type: RuleType): KnowledgeRule[] {
  return knowledgeBase().rules.filter(r => r.type === type);
}
export function rulesByCategory(category: string): KnowledgeRule[] {
  return knowledgeBase().rules.filter(r => r.category === category);
}
/** Rule sắp theo priority giảm dần (luận cái quan trọng trước). */
export function rulesByPriority(type?: RuleType): KnowledgeRule[] {
  const rs = type ? rulesByType(type) : knowledgeBase().rules;
  return [...rs].sort((a, b) => b.priority - a.priority);
}
/** Trích ruleId của một cách cục theo tên (traceability cho engine/lời luận). */
export function cachCucRuleId(name: string): string | undefined {
  return knowledgeBase().byName.get(`cach_cuc:${name}`)?.ruleId;
}
export function starRuleId(name: string): string | undefined {
  return knowledgeBase().byName.get(`star:${name}`)?.ruleId;
}
