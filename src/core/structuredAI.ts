/**
 * STRUCTURED AI LAYER (Phase 14 — full: Structured Output / JSON schema).
 *
 * Nền cho việc chuyển AI từ free-text sang JSON có kiểm chứng, theo chiến lược R4:
 * "chuyển JSON DẦN từng module, GIỮ text fallback khi parse fail".
 *
 * Thành phần:
 *   - Contract JSON (`NarrativeResponse`) — mỗi mục có `evidence_ids` trích dẫn
 *     facts đã xác nhận (rule_id cách cục/sao, hoặc palace:<tên cung>).
 *   - `extractJson()` — parse phòng thủ (model hay bọc JSON trong ```json hoặc prose).
 *   - `chartEvidenceIds()` — tập evidence HỢP LỆ của lá số này.
 *   - `validateStructured()` — kiểm shape + evidence không bịa.
 *   - `parseAndValidate()` — pipeline: parse → validate → {ok, data | fallbackText}.
 *
 * KHÔNG gọi API trực tiếp ở đây (tách để test được); tầng gọi AI sẽ dùng các hàm này.
 */

import type { AstrologyResult } from '../types';
import { extractChartFacts } from './aiResponseValidator';
import { cachCucRuleId, starRuleId } from './knowledgeBase';

export interface NarrativeSection {
  heading: string;
  body: string;
  evidence_ids: string[];
}
export interface NarrativeResponse {
  sections: NarrativeSection[];
  summary: string;
  confidence: number;
}

/** Chỉ dẫn nối vào prompt yêu cầu AI trả JSON đúng schema. */
export const STRUCTURED_INSTRUCTION =
  'TRẢ VỀ DUY NHẤT một JSON hợp lệ theo schema: ' +
  '{"sections":[{"heading":string,"body":string,"evidence_ids":string[]}],"summary":string,"confidence":number}. ' +
  'Mỗi "evidence_ids" phải là id facts đã cho (rule_id cách cục/sao dạng "CC.*"/"ST.*", hoặc "palace:<tên cung>"). ' +
  'KHÔNG thêm facts ngoài danh sách. KHÔNG viết gì ngoài JSON.';

/** Tập evidence_id HỢP LỆ cho một lá số: rule_id cách cục/sao có mặt + palace refs. */
export function chartEvidenceIds(result: AstrologyResult): Set<string> {
  const facts = extractChartFacts(result);
  const ids = new Set<string>();
  for (const name of [...facts.confirmedFormations, ...facts.potentialFormations]) {
    const id = cachCucRuleId(name);
    if (id) ids.add(id);
  }
  for (const name of facts.starNames) {
    const id = starRuleId(name);
    if (id) ids.add(id);
  }
  for (const p of facts.palaceNames) ids.add(`palace:${p}`);
  return ids;
}

/** Parse JSON phòng thủ: bỏ fence ```json, hoặc cắt từ '{' đầu tới '}' cuối. */
export function extractJson(text: string): unknown | null {
  if (!text) return null;
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  const tryParse = (s: string): unknown | null => {
    try { return JSON.parse(s); } catch { return null; }
  };
  let parsed = tryParse(cleaned);
  if (parsed !== null) return parsed;
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first >= 0 && last > first) parsed = tryParse(cleaned.slice(first, last + 1));
  return parsed;
}

export interface StructuredValidation {
  ok: boolean;
  errors: string[];
  hallucinatedEvidence: string[];
}

/** Kiểm shape NarrativeResponse + evidence_ids không bịa (theo allowed). */
export function validateStructured(data: unknown, allowed: Set<string>): StructuredValidation {
  const errors: string[] = [];
  const bad: string[] = [];
  const d = data as Partial<NarrativeResponse> | null;

  if (!d || typeof d !== 'object') return { ok: false, errors: ['Không phải object JSON.'], hallucinatedEvidence: [] };
  if (!Array.isArray(d.sections)) errors.push('Thiếu mảng "sections".');
  if (typeof d.summary !== 'string') errors.push('Thiếu "summary".');
  if (typeof d.confidence !== 'number') errors.push('Thiếu "confidence" (number).');

  for (const s of d.sections ?? []) {
    if (typeof s?.heading !== 'string' || typeof s?.body !== 'string') { errors.push('Section thiếu heading/body.'); continue; }
    if (!Array.isArray(s.evidence_ids)) { errors.push(`Section "${s.heading}" thiếu evidence_ids.`); continue; }
    for (const ev of s.evidence_ids) {
      if (!allowed.has(ev)) bad.push(ev);
    }
  }
  if (bad.length) errors.push(`Evidence bịa (không thuộc lá số): ${[...new Set(bad)].join(', ')}.`);

  return { ok: errors.length === 0, errors, hallucinatedEvidence: [...new Set(bad)] };
}

export interface StructuredResult {
  ok: boolean;
  data?: NarrativeResponse;
  fallbackText?: string;      // dùng khi parse/validate fail
  validation?: StructuredValidation;
}

/**
 * Pipeline: nhận text AI → parse JSON → validate theo facts lá số.
 *  - ok=true: trả `data` (NarrativeResponse hợp lệ).
 *  - ok=false: trả `fallbackText` = text gốc (tầng trên render như markdown thường).
 */
export function parseAndValidate(rawText: string, result: AstrologyResult): StructuredResult {
  const parsed = extractJson(rawText);
  if (parsed === null) {
    return { ok: false, fallbackText: rawText };
  }
  const validation = validateStructured(parsed, chartEvidenceIds(result));
  // Graceful degrade: nếu shape JSON đúng (có sections/summary) thì LUÔN render — chỉ
  // evidence lỗi sẽ được lọc bỏ. Người xem không thấy raw JSON, mà thấy markdown gọn.
  const d = parsed as Partial<NarrativeResponse> | null;
  if (d && Array.isArray(d.sections) && d.sections.every(s => typeof s?.heading === 'string' && typeof s?.body === 'string')) {
    const clean: NarrativeResponse = {
      sections: d.sections.map(s => ({
        heading: s.heading,
        body: s.body,
        evidence_ids: (s.evidence_ids ?? []).filter(id => !validation.hallucinatedEvidence.includes(id)),
      })),
      summary: typeof d.summary === 'string' ? d.summary : '',
      confidence: typeof d.confidence === 'number' ? d.confidence : 0,
    };
    return { ok: true, data: clean, validation };
  }
  return { ok: false, fallbackText: rawText, validation };
}

/** Render NarrativeResponse thành markdown (khi cần hiển thị). */
export function renderNarrative(resp: NarrativeResponse): string {
  const out: string[] = [];
  for (const s of resp.sections) {
    out.push(`# ${s.heading}`, '', s.body, '');
  }
  if (resp.summary) out.push(`> ${resp.summary}`);
  return out.join('\n').trim();
}
