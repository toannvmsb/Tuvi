/**
 * OFFLINE NARRATIVE ENGINE (Phase 13).
 *
 * Bộ soạn lời luận offline THEO TEMPLATE + FACTS (thay cho code imperative rải
 * rác). Chạy SONG SONG với `offlineLuanGiai.ts` cũ (không thay thế — R5). Ưu điểm:
 *   - Traceability: mỗi mảnh (fragment) gắn `knowledgeId`/`ruleId`.
 *   - Deduplication: không lặp lại cùng một ý (theo key).
 *   - A/B wording: chọn biến thể câu chữ ỔN ĐỊNH theo lá số (seed) → đa dạng giữa
 *     các lá số nhưng nhất quán trong 1 lá số.
 *
 * Nguồn facts: NatalFacts (Phase 7) — engine chỉ DIỄN GIẢI, không sinh sao mới.
 */

import type { AstrologyResult } from '../types';
import { analyzeNatal, type NatalFacts } from './natalAnalysisService';

export interface Fragment {
  key: string;         // khóa dedup (một ý chỉ xuất hiện 1 lần)
  section: string;     // nhóm mục để sắp xếp
  text: string;
  knowledgeId?: string; // rule_id/knowledge_id để trích dẫn nguồn
  priority: number;    // trong cùng section, cao = lên trước
}

const SECTION_ORDER = ['identity', 'meta', 'strength', 'weakness', 'caveat'];

export class OfflineNarrativeEngine {
  private frags = new Map<string, Fragment>();
  private seed: number;

  constructor(seed = 0) { this.seed = seed; }

  /** Thêm fragment; nếu trùng key thì giữ bản priority cao hơn (dedup). */
  add(f: Fragment): this {
    const existing = this.frags.get(f.key);
    if (!existing || f.priority > existing.priority) this.frags.set(f.key, f);
    return this;
  }

  /** Chọn 1 biến thể câu chữ ỔN ĐỊNH theo seed (A/B wording). */
  pick(variants: string[]): string {
    if (variants.length === 0) return '';
    return variants[this.seed % variants.length];
  }

  fragments(): Fragment[] {
    return [...this.frags.values()].sort((a, b) => {
      const sa = SECTION_ORDER.indexOf(a.section);
      const sb = SECTION_ORDER.indexOf(b.section);
      if (sa !== sb) return sa - sb;
      return b.priority - a.priority;
    });
  }

  /** Render markdown; `cite=true` gắn [rule:id] để truy vết. */
  render(opts: { cite?: boolean } = {}): string {
    const out: string[] = [];
    let curSection = '';
    for (const f of this.fragments()) {
      if (f.section !== curSection) {
        curSection = f.section;
        out.push('', `## ${SECTION_TITLE[f.section] ?? f.section}`);
      }
      const cite = opts.cite && f.knowledgeId ? ` _[rule:${f.knowledgeId}]_` : '';
      out.push(`- ${f.text}${cite}`);
    }
    return out.join('\n').trim();
  }
}

const SECTION_TITLE: Record<string, string> = {
  identity: 'Bản chất & cốt cách',
  meta: 'Cơ chế vận mệnh',
  strength: 'Điểm mạnh nổi trội',
  weakness: 'Điểm cần lưu tâm',
  caveat: 'Lưu ý khi luận',
};

/** Soạn fragments từ NatalFacts. */
export function composeNatalNarrative(natal: NatalFacts, seed = 0): OfflineNarrativeEngine {
  const eng = new OfflineNarrativeEngine(seed);
  const id = natal.identity;

  // ── Identity ──
  eng.add({
    key: 'identity.core', section: 'identity', priority: 10,
    text: eng.pick([
      `Mệnh an tại ${id.menhBranch}, bản mệnh ${id.napAm}, Cục ${id.cuc}, Âm Dương ${id.amDuong}. Sao chủ Mệnh: ${id.menhChu}.`,
      `Cốt cách khởi từ cung Mệnh tại ${id.menhBranch} (${id.napAm}, Cục ${id.cuc}); Mệnh chủ ${id.menhChu}, Âm Dương ${id.amDuong}.`,
    ]),
  });
  if (id.menhThanChung) {
    eng.add({ key: 'identity.menhthan', section: 'identity', priority: 8, text: 'Mệnh–Thân đồng cung: con người nhất quán giữa bản chất và hành động, ít mâu thuẫn nội tâm.' });
  }

  // ── Meta ──
  const toneVi: Record<string, string> = { 'cát': 'hanh thông', 'trung tính': 'ổn định', 'hung': 'nhiều thử thách' };
  eng.add({
    key: 'meta.tongdanh', section: 'meta', priority: 10,
    text: eng.pick([
      `Lá số thuộc dạng "${natal.metaPattern.tongDanh}", tổng thể thiên về ${toneVi[natal.overallTone] ?? natal.overallTone}.`,
      `Nét chính của lá số: ${natal.metaPattern.tongDanh}, cuộc đời thiên về ${toneVi[natal.overallTone] ?? natal.overallTone}.`,
    ]),
  });
  for (const t of natal.topFormations.filter(t => t.rank === 'chủ')) {
    eng.add({
      key: `meta.cach.${t.name}`, section: 'meta', priority: t.score, knowledgeId: t.ruleId,
      text: `Cách chủ **${t.name}** hội tại cung ${t.palace} — trục cốt lõi định hình vận mệnh.`,
    });
  }

  // ── Strengths ── (bỏ số điểm kỹ thuật, chỉ giữ tên cung/cách)
  const stripTech = (s: string) => s.replace(/\s*\([^)]*\)/g, '').trim();
  natal.strengths.slice(0, 5).forEach((s, i) => {
    eng.add({ key: `strength.${i}.${s}`, section: 'strength', priority: 10 - i, text: `Thế mạnh: ${stripTech(s)}.` });
  });

  // ── Weaknesses ──
  natal.weaknesses.slice(0, 5).forEach((w, i) => {
    eng.add({ key: `weakness.${i}.${w}`, section: 'weakness', priority: 10 - i, text: `Cần lưu tâm: ${stripTech(w)}.` });
  });

  // ── Caveats (nhất quán) ──
  for (const iss of natal.consistency.issues) {
    eng.add({ key: `caveat.${iss.code}`, section: 'caveat', priority: 10, knowledgeId: iss.code, text: iss.message });
  }

  return eng;
}

/**
 * Sinh lời luận toàn lá số offline (bản V2 template hóa). Chạy SONG SONG với
 * `generateOfflineFullChart` cũ — không thay thế.
 */
export function generateNatalNarrativeV2(result: AstrologyResult, opts: { cite?: boolean } = {}): string {
  const natal = analyzeNatal(result);
  // Seed ổn định theo lá số (giờ/branch) để A/B wording nhất quán.
  const seed = (result.tuViChart.houses.find(h => h.isManh)?.branch?.length ?? 0)
    + (result.birthInfo.hour ?? 0);
  const eng = composeNatalNarrative(natal, seed);
  return eng.render(opts);
}
