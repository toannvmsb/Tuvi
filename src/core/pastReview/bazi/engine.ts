/**
 * BỘ ĐÁNH GIÁ BÁT TỰ cho một năm đã qua — áp bảng `BZ_RULES` (rules.ts) lên lá số.
 * Thuần tất định: cùng lá số + cùng năm ⇒ cùng tín hiệu. Không biết gì về giao diện hay AI.
 *
 * Mốc đổi năm: dùng NĂM ÂM LỊCH (khớp trụ năm của app) — lưu niên = can chi của năm âm lịch đó.
 */
import type { AstrologyResult, EarthlyBranch, FiveElement, HeavenlyStem, Pillar } from '../../../types';
import { thapThanOf, type ThapThan } from '../../thapThan';
import { yearCanChi } from '../../annualEvents/calendar';
import { AREAS, type AreaId } from '../config';
import type { PastSignal } from '../types';
import { BZ_RULES, BZ_SCORE, type BzRule, type PillarKey } from './rules';
import { branchRelations, REL_LABEL } from './relations';
import { computeBaziLuck, luckAtYear, type BaziLuck } from './luck';
import { STEM_ELEMENT, branchElement, horseBranchOf, mainHiddenStem, peachBranchOf } from './tables';

const PILLAR_INDEX: Record<PillarKey, number> = { year: 0, month: 1, day: 2, hour: 3 };
const PILLAR_VN: Record<PillarKey, string> = { year: 'Năm', month: 'Tháng', day: 'Ngày', hour: 'Giờ' };
const TAI_GODS: ThapThan[] = ['Chính Tài', 'Thiên Tài'];
const AN_GODS: ThapThan[] = ['Chính Ấn', 'Thiên Ấn'];
const BI_GODS: ThapThan[] = ['Tỷ Kiên', 'Kiếp Tài'];

export interface BaziNatal {
  dm: HeavenlyStem;
  gender: 'nam' | 'nu';
  pillars: Pillar[];
  favorable: FiveElement[];
  unfavorable: FiveElement[];
  hasTai: boolean;
  hasAn: boolean;
  taiCount: number;
  horse: EarthlyBranch[];
  peach: EarthlyBranch[];
  luck: BaziLuck;
}

export function buildBaziNatal(result: AstrologyResult): BaziNatal {
  const bt = result.batTuChart;
  const dm = bt.dayMaster;
  let taiCount = 0;
  let anCount = 0;
  bt.pillars.forEach((p, i) => {
    const stems = i === 2 ? [...p.hiddenStems] : [p.stem, ...p.hiddenStems];
    for (const s of stems) {
      const g = thapThanOf(dm, s);
      if (TAI_GODS.includes(g)) taiCount++;
      if (AN_GODS.includes(g)) anCount++;
    }
  });
  const yb = bt.pillars[0].branch;
  const db = bt.pillars[2].branch;
  return {
    dm,
    gender: result.birthInfo.gender,
    pillars: bt.pillars,
    favorable: bt.favorableElements,
    unfavorable: bt.unfavorableElements,
    hasTai: taiCount > 0,
    hasAn: anCount > 0,
    taiCount,
    horse: [...new Set([horseBranchOf(yb), horseBranchOf(db)])],
    peach: [...new Set([peachBranchOf(yb), peachBranchOf(db)])],
    luck: computeBaziLuck(result),
  };
}

interface FlowCtx {
  year: number;
  stem: HeavenlyStem;
  branch: EarthlyBranch;
  stemGod: ThapThan;
  branchGod: ThapThan;
  stemEl: FiveElement;
  branchEl: FiveElement;
  tone: -1 | 0 | 1;
  luckStem: HeavenlyStem | null;
  luckBranch: EarthlyBranch | null;
  luckStemGod: ThapThan | null;
  luckBranchGod: ThapThan | null;
}

function buildFlow(natal: BaziNatal, year: number): FlowCtx {
  const { stem, branch } = yearCanChi(year);
  const stemEl = STEM_ELEMENT[stem];
  const branchEl = branchElement(branch);
  const fav = (e: FiveElement) => (natal.favorable.includes(e) ? 1 : natal.unfavorable.includes(e) ? -1 : 0);
  const s = fav(stemEl) + fav(branchEl);
  const lp = luckAtYear(natal.luck, year);
  return {
    year, stem, branch, stemEl, branchEl,
    stemGod: thapThanOf(natal.dm, stem),
    branchGod: thapThanOf(natal.dm, mainHiddenStem(branch)),
    tone: s > 0 ? 1 : s < 0 ? -1 : 0,
    luckStem: lp?.stem ?? null,
    luckBranch: lp?.branch ?? null,
    luckStemGod: lp ? thapThanOf(natal.dm, lp.stem) : null,
    luckBranchGod: lp ? thapThanOf(natal.dm, mainHiddenStem(lp.branch)) : null,
  };
}

const flowWhere = (f: FlowCtx) => `lưu niên ${f.stem} ${f.branch}`;
const pillarWhere = (p: Pillar) => `trụ ${p.label.toLowerCase()} (${p.stem} ${p.branch})`;

/** Trả về tín hiệu nếu quy tắc khớp, null nếu không. */
function evalRule(rule: BzRule, natal: BaziNatal, f: FlowCtx): Pick<PastSignal, 'where' | 'param'> | null {
  const m = rule.match;
  switch (m.kind) {
    case 'flow_god': {
      if (m.gender && m.gender !== natal.gender) return null;
      const hitStem = m.gods.includes(f.stemGod);
      const hitBranch = m.gods.includes(f.branchGod);
      if (!hitStem && !hitBranch) return null;
      return {
        where: flowWhere(f),
        param: { thapThan: hitStem ? f.stemGod : f.branchGod, nguon: hitStem ? `can ${f.stem}` : `chi ${f.branch}` },
      };
    }
    case 'flow_rel': {
      const p = natal.pillars[PILLAR_INDEX[m.pillar]];
      if (!branchRelations(f.branch, p.branch).includes(m.rel)) return null;
      return {
        where: `${flowWhere(f)} ↔ ${pillarWhere(p)}`,
        param: { quanHe: REL_LABEL[m.rel], chiLuuNien: f.branch, chiTru: p.branch, tru: PILLAR_VN[m.pillar] },
      };
    }
    case 'flow_star': {
      const set = m.star === 'horse' ? natal.horse : natal.peach;
      if (!set.includes(f.branch)) return null;
      return { where: flowWhere(f), param: { sao: m.star === 'horse' ? 'Dịch Mã' : 'Đào Hoa', chi: f.branch } };
    }
    case 'flow_wealth_el': {
      const list = m.mode === 'fav' ? natal.favorable : natal.unfavorable;
      const stemHit = TAI_GODS.includes(f.stemGod) && list.includes(f.stemEl);
      const branchHit = TAI_GODS.includes(f.branchGod) && list.includes(f.branchEl);
      if (!stemHit && !branchHit) return null;
      return {
        where: flowWhere(f),
        param: { thapThan: stemHit ? f.stemGod : f.branchGod, hanh: stemHit ? f.stemEl : f.branchEl, vai: m.mode === 'fav' ? 'dụng thần' : 'kỵ thần' },
      };
    }
    case 'flow_rob': {
      const hit = BI_GODS.includes(f.stemGod) ? f.stemGod : BI_GODS.includes(f.branchGod) ? f.branchGod : null;
      if (!hit || !natal.hasTai) return null;
      return { where: flowWhere(f), param: { thapThan: hit } };
    }
    case 'flow_wealth_hurts_seal': {
      const hit = TAI_GODS.includes(f.stemGod) ? f.stemGod : TAI_GODS.includes(f.branchGod) ? f.branchGod : null;
      if (!hit || !natal.hasAn) return null;
      return { where: flowWhere(f), param: { thapThan: hit } };
    }
    case 'luck_god': {
      if (!f.luckStem || !f.luckBranch) return null;
      if (m.gender && m.gender !== natal.gender) return null;
      const hitStem = f.luckStemGod && m.gods.includes(f.luckStemGod);
      const hitBranch = f.luckBranchGod && m.gods.includes(f.luckBranchGod);
      if (!hitStem && !hitBranch) return null;
      return {
        where: `đại vận ${f.luckStem} ${f.luckBranch}`,
        param: { thapThan: (hitStem ? f.luckStemGod : f.luckBranchGod) as string },
      };
    }
    case 'luck_star': {
      if (!f.luckBranch || !natal.horse.includes(f.luckBranch)) return null;
      return { where: `đại vận ${f.luckStem} ${f.luckBranch}`, param: { sao: 'Dịch Mã', chi: f.luckBranch } };
    }
    case 'root_pillar': {
      const p = natal.pillars[PILLAR_INDEX[m.pillar]];
      const god = m.pillar === 'day' ? 'Nhật Chủ' : thapThanOf(natal.dm, p.stem);
      return { where: pillarWhere(p), param: { tru: PILLAR_VN[m.pillar], can: p.stem, chi: p.branch, thapThan: god } };
    }
    case 'root_wealth':
      return {
        where: 'tứ trụ',
        param: { soTaiTinh: natal.taiCount, dungThan: natal.favorable.join(', '), kyThan: natal.unfavorable.join(', ') },
      };
  }
}

export interface BaziAreaEval {
  signals: PastSignal[];
  /** 0..100 — độ mạnh của hệ Bát Tự ở mảng này. */
  score: number;
  /** −1..+1 — cân bằng thuận (+) / nghịch (−) của các tín hiệu có trọng số (Σ sắc thái×trọng số ÷ Σ trọng số). */
  balance: number;
}

export type BaziYearEval = Record<AreaId, BaziAreaEval>;

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

export function evaluateBaziYear(natal: BaziNatal, year: number): BaziYearEval {
  const f = buildFlow(natal, year);
  const out = {} as BaziYearEval;
  for (const area of AREAS) out[area] = { signals: [], score: 0, balance: 0 };

  for (const rule of BZ_RULES) {
    const hit = evalRule(rule, natal, f);
    if (!hit) continue;
    const tone: -1 | 0 | 1 = rule.tone === 'flow' ? f.tone : rule.tone;
    out[rule.area].signals.push({
      ruleId: rule.id, system: 'bazi', area: rule.area, layer: rule.layer, supports: rule.supports,
      tone, weight: rule.weight, where: hit.where, param: hit.param, label: rule.label,
    });
  }

  for (const area of AREAS) {
    const sigs = out[area].signals;
    let support = 0, against = 0, toneSum = 0, wSum = 0;
    for (const s of sigs) {
      if (s.weight === 0) continue;
      if (s.supports) support += s.weight; else against += s.weight;
      toneSum += s.tone * s.weight;
      wSum += s.weight;
    }
    out[area].score = clamp((support - BZ_SCORE.againstFactor * against) * BZ_SCORE.scale, 0, 100);
    out[area].balance = wSum > 0 ? toneSum / wSum : 0;
  }
  return out;
}
