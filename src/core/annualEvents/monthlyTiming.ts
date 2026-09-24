/**
 * Thời điểm trong THÁNG (lưu nguyệt) — TUZI_Monthly_Event_Timing_Engine_v2.md, thay thế hoàn
 * toàn bản v1 trước đây. Chỉ chạy khi sự kiện đã đạt `event.minAnnualScoreForMonthlyTiming`
 * (§2 "Hard Gate: Annual Before Monthly" — tầng tháng KHÔNG được tự tạo ra sự kiện lớn nếu năm/
 * đại vận/bản mệnh chưa ủng hộ).
 *
 * 7 thành phần cộng điểm (§20-22), mỗi thành phần đã trả điểm THÔ nằm sẵn trong khoảng cap của
 * chính nó (§21) — không nhân thêm trọng số nữa, trừ `annualBaseline` (điểm sự kiện năm × 25%):
 *  - annualBaseline      : annualStrength × 25%                         (cap 25)
 *  - axisResonance       : §6 Same-Function Overlap + §8 hình học        (cap 20)
 *  - monthlyTuHoa        : §9 Tứ Hóa tháng chạm trục sự kiện (§36)       (cap 25)
 *  - crossLayerEcho      : §10-11 Tứ Hóa tháng cộng hưởng bản mệnh/đại vận/lưu niên (cap 15)
 *  - douJun              : §14 Đẩu Quân tương tác                        (cap 5)
 *  - movingStars         : §15 sao lưu tháng                             (cap 5)
 *  - structural           : Structural Confirmation — spec không cho công thức cụ thể, engine
 *                            tự bổ sung tương tự "structuralSupport" đã có ở tầng năm (Tuần/Triệt
 *                            + độ sáng chính tinh) áp cho cung trục TẠI VỊ TRÍ THÁNG.               (cap 5)
 *
 * DIỄN GIẢI so với spec gốc (ghi rõ theo yêu cầu "đọc thấy chỗ nào chưa hợp lý thì sửa"):
 *  - "Da Han event palace" (§6/§11): app này (core/daiVanScore.ts) không có khái niệm 1 cung
 *    Quan Lộc/Tài Bạch RIÊNG của Đại Vận — chỉ có 1 cung DUY NHẤT mà Đại Vận đang chạy tới. Nên
 *    lấy chính cung đó (ctx.daHanBranch) làm điểm neo so trùng/hình học, thay vì dựng thêm 1 "lá
 *    số phụ" theo Đại Vận (app chưa có tiền lệ này ở tầng năm, tránh vượt phạm vi yêu cầu).
 *  - "Annual event palace" (§6/§11/§14): dùng ĐÚNG cách app đã tính — dựng "lá số lưu niên" bằng
 *    roleBranchIndex neo tại chi năm xem (quy ước "Lưu niên Mệnh an tại chi năm"), cho phần Same-
 *    Function Overlap; riêng phần Đẩu Quân Interaction (§14, chỉ nói "overlaps Annual Event
 *    Palace") dùng tập cung mà tín hiệu LƯU NIÊN thật sự đã ghi nhận trên trục sự kiện (ctx.signals
 *    source=ANNUAL) — cụ thể và bám sát dữ liệu đã có hơn là chỉ 1 cung Mệnh lưu niên duy nhất.
 *  - Bảng "Transformation Echo" khác loại hóa (§10) chỉ liệt kê 5/6 cặp — cặp không có trong bảng
 *    dùng ECHO_CROSS_TRANSFORM_FALLBACK (10 điểm, thấp hơn mọi cặp đã liệt kê) để không bịa số.
 *  - Ranh giới Tứ Hóa tháng theo Tiết Khí (§17 "SOLAR_TERM_JIEQI") CHƯA làm — app hiện chưa có dữ
 *    liệu tiết khí sẵn sàng cho việc này; giữ ranh giới THÁNG ÂM LỊCH cho cả cung lẫn Tứ Hóa (an
 *    toàn hơn, đã nêu rõ ở đây theo đúng §17 "this remains configurable by school").
 *  - "Event-Specific Timing Profiles" (§30, ưu tiên sao theo từng nhóm sự kiện) CHƯA tách riêng
 *    — đã có sẵn qua trọng số trục sự kiện (event.axis.weights) + bảng SIGNAL_MEANING/hướng cực
 *    (polarity) hiện có; tinh chỉnh sâu hơn theo từng category để dành cho vòng sau nếu cần.
 */
import type { AstrologyResult, EarthlyBranch } from '../../types';
import type { EventDefinition, EventRule, MonthDriver, MonthWindow, Palace, EventPhase } from './types';
import type { HoaKind } from '../phiHoa';
import type { HoaTargets } from './fourTransformTargets';
import {
  MONTHLY_V2_WEIGHTS, MONTHLY_V2_CAPS, MONTHLY_GEOMETRY_WEIGHT, KY_OPPOSITION_MULTIPLIER,
  MONTHLY_TU_HOA_GEOMETRY_BONUS, MONTHLY_OVERLAP_SCORE, ECHO_SAME_TRANSFORM, ECHO_CROSS_TRANSFORM,
  ECHO_CROSS_TRANSFORM_FALLBACK, ECHO_LAYER_PRIORITY, DOU_JUN_SCORE, MONTHLY_MOVING_STAR_SCORE,
  MONTHLY_CONVERGENCE_MULTIPLIER, MONTHLY_CONVERGENCE_MULTIPLIER_5PLUS, MONTHLY_CONVERGENCE_CAP,
  MONTHLY_V2_SUPPRESSION, TIMING_INTENSITY_BANDS, TIMING_WINDOW_MERGE, UNIQUE_PEAK_MIN_SCORE, UNIQUE_PEAK_MIN_DELTA,
} from './config';
import { buildMonthlyContext, type MonthlyContext } from './monthlySignals';
import { fourTransformTargets } from './fourTransformTargets';
import { roleBranchIndex, geometryOf, type Geometry } from './monthlyChart';
import { palaceBranch, branchIndex, PALACE_VN_TO_CODE, PALACE_CODE_TO_VN, BRANCHES } from './calendar';
import { SIGNAL_CATALOG } from './signalCatalog';
import type { AnnualSignalContext } from './signals';

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const HOA_LIST: HoaKind[] = ['Hóa Lộc', 'Hóa Quyền', 'Hóa Khoa', 'Hóa Kỵ'];
const hoaCode = (h: HoaKind): string => (h === 'Hóa Lộc' ? 'HOA_LOC' : h === 'Hóa Quyền' ? 'HOA_QUYEN' : h === 'Hóa Khoa' ? 'HOA_KHOA' : 'HOA_KY');
const LAYER_LABEL: Record<'ANNUAL' | 'DA_HAN' | 'NATAL', string> = { ANNUAL: 'lưu niên', DA_HAN: 'đại vận', NATAL: 'bản mệnh' };

interface Hit { starName: string; palace: Palace; signalType: string; contribution: number }

function axisRolesOf(event: EventDefinition): Palace[] {
  return [...event.axis.primary, ...event.axis.secondary];
}

/** §6 + §8 — cung "vai trò trục sự kiện" của tháng có trùng/hình chiếu tới đúng cung đó ở bản mệnh/đại vận/lưu niên không. */
function axisResonanceScore(event: EventDefinition, monthlyMingIdx: number, natalMingIdx: number, yearBranchIdx: number, daHanBranchIdx: number | null, hits: Hit[]): number {
  let total = 0;
  for (const role of axisRolesOf(event)) {
    const weight = event.axis.weights[role] ?? 0.5;
    const monthlyIdx = roleBranchIndex(monthlyMingIdx, role);
    const natalIdx = roleBranchIndex(natalMingIdx, role);
    const annualIdx = roleBranchIndex(yearBranchIdx, role);
    const exactNatal = monthlyIdx === natalIdx;
    const exactAnnual = monthlyIdx === annualIdx;
    const exactDaHan = daHanBranchIdx !== null && monthlyIdx === daHanBranchIdx;

    let base = 0;
    let label = '';
    if (exactNatal && exactDaHan && exactAnnual) { base = MONTHLY_OVERLAP_SCORE.allThree; label = 'trùng cả bản mệnh, đại vận và lưu niên'; }
    else if (exactAnnual && exactDaHan) { base = MONTHLY_OVERLAP_SCORE.annualPlusDaHan; label = 'trùng cả lưu niên và đại vận'; }
    else if (exactAnnual) { base = MONTHLY_OVERLAP_SCORE.annualOnly; label = 'trùng cung lưu niên'; }
    else if (exactDaHan) { base = MONTHLY_OVERLAP_SCORE.daHanOnly; label = 'trùng cung đại vận'; }
    else if (exactNatal) { base = MONTHLY_OVERLAP_SCORE.natalOnly; label = 'trùng cung bản mệnh'; }
    else {
      const gNatal = MONTHLY_GEOMETRY_WEIGHT[geometryOf(monthlyIdx, natalIdx)] * MONTHLY_OVERLAP_SCORE.natalOnly;
      const gDaHan = daHanBranchIdx !== null ? MONTHLY_GEOMETRY_WEIGHT[geometryOf(monthlyIdx, daHanBranchIdx)] * MONTHLY_OVERLAP_SCORE.daHanOnly : 0;
      const gAnnual = MONTHLY_GEOMETRY_WEIGHT[geometryOf(monthlyIdx, annualIdx)] * MONTHLY_OVERLAP_SCORE.annualOnly;
      base = Math.max(gNatal, gDaHan, gAnnual);
      label = 'chiếu tới';
    }
    const contribution = base * weight;
    if (contribution >= 1) {
      hits.push({ starName: `Cung ${PALACE_CODE_TO_VN[role] ?? role} của tháng ${label}`, palace: role, signalType: `OVERLAP_${role}`, contribution });
      total += contribution;
    }
  }
  return total;
}

/** §9 (dùng đúng công thức MONTHLY_GENERIC_ECHO_001 ở §36) — Tứ Hóa tháng có chạm trục sự kiện không, theo hình học. */
function monthlyFourTransformScore(
  event: EventDefinition, targets: HoaTargets, c: AstrologyResult['tuViChart'], hits: Hit[],
): { score: number; dominantHoa: HoaKind | null } {
  let total = 0;
  let dominantHoa: HoaKind | null = null;
  let dominantVal = 0;
  for (const hoa of HOA_LIST) {
    const t = targets[hoa];
    if (!t) continue;
    const targetBranch = palaceBranch(c, t.palace);
    if (!targetBranch) continue;
    const targetIdx = branchIndex(targetBranch);
    let best = 0;
    for (const role of axisRolesOf(event)) {
      const axisBranch = palaceBranch(c, role);
      if (!axisBranch) continue;
      const geo = geometryOf(targetIdx, branchIndex(axisBranch));
      let bonus = MONTHLY_TU_HOA_GEOMETRY_BONUS[geo];
      if (hoa === 'Hóa Kỵ' && geo === 'OPPOSITION') bonus *= KY_OPPOSITION_MULTIPLIER;
      const weight = event.axis.weights[role] ?? 0.5;
      best = Math.max(best, bonus * weight);
    }
    if (best > 0) {
      total += best;
      hits.push({ starName: `${t.star} hóa ${hoa.replace('Hóa ', '')}`, palace: t.palace, signalType: hoaCode(hoa), contribution: best });
      if (best > dominantVal) { dominantVal = best; dominantHoa = hoa; }
    }
  }
  return { score: total, dominantHoa };
}

/** §10-11 — Tứ Hóa tháng có "cộng hưởng" (cùng đích, cùng trục sự kiện) với bản mệnh/đại vận/lưu niên không. */
function crossLayerEchoScore(
  event: EventDefinition, monthlyTargets: HoaTargets, natalTargets: HoaTargets, daHanTargets: HoaTargets, annualTargets: HoaTargets, hits: Hit[],
): number {
  const axisSet = new Set(axisRolesOf(event));
  let total = 0;
  const layers: { name: 'ANNUAL' | 'DA_HAN' | 'NATAL'; targets: HoaTargets; weight: number }[] = [
    { name: 'ANNUAL', targets: annualTargets, weight: ECHO_LAYER_PRIORITY.ANNUAL },
    { name: 'DA_HAN', targets: daHanTargets, weight: ECHO_LAYER_PRIORITY.DA_HAN },
    { name: 'NATAL', targets: natalTargets, weight: ECHO_LAYER_PRIORITY.NATAL },
  ];
  for (const mHoa of HOA_LIST) {
    const mt = monthlyTargets[mHoa];
    if (!mt || !axisSet.has(mt.palace)) continue;
    for (const layer of layers) {
      for (const lHoa of HOA_LIST) {
        const lt = layer.targets[lHoa];
        if (!lt || lt.palace !== mt.palace) continue;
        const bonus = mHoa === lHoa ? ECHO_SAME_TRANSFORM[mHoa] : (ECHO_CROSS_TRANSFORM[`${lHoa}|${mHoa}`] ?? ECHO_CROSS_TRANSFORM_FALLBACK);
        const contribution = bonus * layer.weight;
        total += contribution;
        hits.push({
          starName: `${mt.star} — hóa ${mHoa.replace('Hóa ', '')} tháng cộng hưởng ${lHoa.replace('Hóa ', '')} ${LAYER_LABEL[layer.name]}`,
          palace: mt.palace, signalType: `ECHO_${layer.name}`, contribution,
        });
      }
    }
  }
  return total;
}

/** §14 — Đẩu Quân của tháng tương tác với trục sự kiện / cung lưu niên tới đâu. */
function douJunScore(event: EventDefinition, ctx: AnnualSignalContext, result: AstrologyResult, douJunIdx: number, hits: Hit[]): number {
  const c = result.tuViChart;
  const axisSet = new Set(axisRolesOf(event));
  const douJunBranch = BRANCHES[douJunIdx];
  const douJunHouse = c.houses.find(h => h.branch === douJunBranch);
  const douJunPalace: Palace | null = douJunHouse ? PALACE_VN_TO_CODE[douJunHouse.palaceName] ?? null : null;
  let total = 0;

  const onAxis = !!douJunPalace && axisSet.has(douJunPalace);
  if (onAxis && douJunPalace) {
    total += DOU_JUN_SCORE.onEventAxis;
    hits.push({ starName: 'Đẩu Quân tháng nằm trên trục sự kiện', palace: douJunPalace, signalType: 'DOU_JUN_AXIS', contribution: DOU_JUN_SCORE.onEventAxis });
  }

  const annualHitPalaces = new Set(ctx.signals.filter(s => s.source === 'ANNUAL' && axisSet.has(s.palace)).map(s => s.palace));
  if (douJunPalace && annualHitPalaces.has(douJunPalace)) {
    total += DOU_JUN_SCORE.overlapsAnnualEventPalace;
    hits.push({ starName: 'Đẩu Quân tháng trùng cung lưu niên đang tác động', palace: douJunPalace, signalType: 'DOU_JUN_ANNUAL', contribution: DOU_JUN_SCORE.overlapsAnnualEventPalace });
  }

  let ownHitsAxis = false;
  if (douJunHouse) {
    const dqTargets = fourTransformTargets(c, douJunHouse.can);
    for (const t of Object.values(dqTargets)) {
      if (t && axisSet.has(t.palace)) { ownHitsAxis = true; break; }
    }
    if (ownHitsAxis && douJunPalace) {
      total += DOU_JUN_SCORE.ownTransformHitsAxis;
      hits.push({ starName: 'Tứ Hóa của cung Đẩu Quân chạm trục sự kiện', palace: douJunPalace, signalType: 'DOU_JUN_OWN_HOA', contribution: DOU_JUN_SCORE.ownTransformHitsAxis });
    }
  }

  const mingHouse = c.houses.find(h => h.branch === ctx.yearBranch);
  let mingHitsDouJun = false;
  if (mingHouse && douJunPalace) {
    const mingTargets = fourTransformTargets(c, mingHouse.can);
    for (const t of Object.values(mingTargets)) {
      if (t && t.palace === douJunPalace) { mingHitsDouJun = true; break; }
    }
    if (mingHitsDouJun) {
      total += DOU_JUN_SCORE.annualMingHitsDouJun;
      hits.push({ starName: 'Tứ Hóa của cung Mệnh lưu niên chiếu vào Đẩu Quân', palace: douJunPalace, signalType: 'DOU_JUN_MING_HOA', contribution: DOU_JUN_SCORE.annualMingHitsDouJun });
    }
  }
  if (mingHitsDouJun && ownHitsAxis && douJunPalace) {
    total += DOU_JUN_SCORE.mutualInteraction;
    hits.push({ starName: 'Đẩu Quân và Mệnh lưu niên tương tác 2 chiều', palace: douJunPalace, signalType: 'DOU_JUN_MUTUAL', contribution: DOU_JUN_SCORE.mutualInteraction });
  }
  return total;
}

/** §15 — sao lưu tháng đóng tại trục sự kiện. */
function monthlyMovingStarsScore(event: EventDefinition, mc: MonthlyContext, c: AstrologyResult['tuViChart'], hits: Hit[]): number {
  const axisSet = new Set(axisRolesOf(event));
  let total = 0;
  for (const m of mc.movingStars) {
    const bonus = MONTHLY_MOVING_STAR_SCORE[m.code];
    if (!bonus) continue;
    const h = c.houses.find(x => x.branch === BRANCHES[m.branchIdx]);
    if (!h) continue;
    const palace = PALACE_VN_TO_CODE[h.palaceName];
    if (!palace || !axisSet.has(palace)) continue;
    total += bonus;
    hits.push({ starName: SIGNAL_CATALOG[m.code]?.name ?? m.code, palace, signalType: m.code, contribution: bonus });
  }
  return total;
}

/** Structural Confirmation — spec không cho công thức, engine bổ sung tương tự tầng năm (Tuần/Triệt + độ sáng chính tinh), áp cho cung trục TẠI VỊ TRÍ THÁNG (xem ghi chú đầu file). */
function structuralConfirmationScore(event: EventDefinition, monthlyMingIdx: number, c: AstrologyResult['tuViChart']): number {
  let best = 0;
  for (const role of event.axis.primary) {
    const idx = roleBranchIndex(monthlyMingIdx, role);
    const h = c.houses.find(x => x.branch === BRANCHES[idx]);
    if (!h) continue;
    let v = 2.5;
    if (h.tuanAt || h.trietAt) v -= 1.5;
    if (h.stars.some(s => s.type === 'chinh' && (s.brightness === 'miếu' || s.brightness === 'vượng'))) v += 2.5;
    if (v > best) best = v;
  }
  return best;
}

function phaseOfHoa(hoa: HoaKind | null): EventPhase {
  if (hoa === 'Hóa Lộc') return 'ONSET';
  if (hoa === 'Hóa Quyền') return 'PEAK';
  if (hoa === 'Hóa Khoa') return 'FORMALIZATION';
  if (hoa === 'Hóa Kỵ') return 'PRESSURE';
  return 'NONE';
}

function timingIntensityOf(score: number): MonthWindow['strength'] {
  return TIMING_INTENSITY_BANDS.find(b => score >= b.min && score <= b.max)?.level ?? 'NOTABLE';
}

function driversOf(hits: Hit[]): MonthDriver[] {
  const byKey = new Map<string, Hit>();
  for (const h of hits) {
    const key = `${h.signalType}:${h.palace}`;
    const prev = byKey.get(key);
    if (!prev || h.contribution > prev.contribution) byKey.set(key, h);
  }
  return [...byKey.values()].sort((a, b) => b.contribution - a.contribution).slice(0, 4)
    .map(h => ({ starName: h.starName, palace: h.palace, signalType: h.signalType }));
}

interface MonthResult { month: number; score: number; hits: Hit[]; dominantHoa: HoaKind | null; familiesCount: number }

export function computeMonthlyTiming(
  event: EventDefinition, annualStrength: number, _rules: EventRule[], result: AstrologyResult, ctx: AnnualSignalContext,
): MonthWindow[] {
  if (annualStrength < MONTHLY_V2_SUPPRESSION.blockBelowAnnual) return [];
  if (annualStrength < event.minAnnualScoreForMonthlyTiming) return [];

  const c = result.tuViChart;
  const natalMingBranch: EarthlyBranch | undefined = c.houses.find(h => h.palaceName === 'Mệnh')?.branch;
  if (!natalMingBranch) return [];
  const natalMingIdx = branchIndex(natalMingBranch);
  const yearBranchIdx = branchIndex(ctx.yearBranch);
  const daHanBranchIdx = ctx.daHanBranch ? branchIndex(ctx.daHanBranch) : null;

  const natalTargets = fourTransformTargets(c, c.lunarDate.yearStem);
  const daHanTargets = ctx.daHanStem ? fourTransformTargets(c, ctx.daHanStem) : {};
  const annualTargets = fourTransformTargets(c, ctx.yearStem);

  const monthly: MonthResult[] = [];
  for (let m = 1; m <= 12; m++) {
    const mc = buildMonthlyContext(result, ctx.yearStem, ctx.yearBranch, m);

    const axisHits: Hit[] = [];
    const axisResonance = clamp(axisResonanceScore(event, mc.monthlyMingIdx, natalMingIdx, yearBranchIdx, daHanBranchIdx, axisHits), 0, MONTHLY_V2_CAPS.axisResonance);

    const ftHits: Hit[] = [];
    const { score: ftScoreRaw, dominantHoa } = monthlyFourTransformScore(event, mc.fourTransformTargets, c, ftHits);
    const monthlyTuHoa = clamp(ftScoreRaw, 0, MONTHLY_V2_CAPS.monthlyFourTransform);

    const echoHits: Hit[] = [];
    const crossLayerEcho = clamp(crossLayerEchoScore(event, mc.fourTransformTargets, natalTargets, daHanTargets, annualTargets, echoHits), 0, MONTHLY_V2_CAPS.crossLayerEcho);

    const djHits: Hit[] = [];
    const douJun = clamp(douJunScore(event, ctx, result, mc.douJunIdx, djHits), 0, MONTHLY_V2_CAPS.douJun);

    const msHits: Hit[] = [];
    const movingStars = clamp(monthlyMovingStarsScore(event, mc, c, msHits), 0, MONTHLY_V2_CAPS.movingStars);

    const structural = clamp(structuralConfirmationScore(event, mc.monthlyMingIdx, c), 0, MONTHLY_V2_CAPS.structural);

    const annualBaseline = clamp(annualStrength) * MONTHLY_V2_WEIGHTS.annualBaseline;

    let raw = annualBaseline + axisResonance + monthlyTuHoa + crossLayerEcho + douJun + movingStars + structural;

    const families = new Set<string>();
    if (axisResonance > 0) families.add('MONTHLY_PALACE_RESONANCE');
    if (monthlyTuHoa > 0) families.add('MONTHLY_FOUR_TRANSFORMATION');
    if (crossLayerEcho > 0) families.add('CROSS_LAYER_TRANSFORMATION_ECHO');
    if (douJun > 0) families.add('DOU_JUN_INTERACTION');
    if (movingStars > 0) families.add('MONTHLY_SUPPORTING_STARS');
    const n = families.size;
    const mult = n <= 0 ? 1 : n <= 4 ? (MONTHLY_CONVERGENCE_MULTIPLIER[n] ?? 1) : MONTHLY_CONVERGENCE_MULTIPLIER_5PLUS;
    raw = raw * Math.min(mult, MONTHLY_CONVERGENCE_CAP);

    if (annualStrength < MONTHLY_V2_SUPPRESSION.capAt60BelowAnnual) raw = Math.min(raw, 60);
    if (annualStrength < MONTHLY_V2_SUPPRESSION.capAt45BelowAnnual) raw = Math.min(raw, 45);

    monthly.push({
      month: m, score: Math.round(clamp(raw)),
      hits: [...axisHits, ...ftHits, ...echoHits, ...djHits, ...msHits],
      dominantHoa, familiesCount: n,
    });
  }

  const notable = monthly.filter(x => x.score >= 55);
  if (notable.length === 0) return [];

  // §27/§28 — chỉ 1 tháng "đỉnh duy nhất" khi vượt hẳn tháng nhì trong CẢ 12 tháng, không chỉ trong 1 cửa sổ.
  const sortedAll = [...monthly].sort((a, b) => b.score - a.score);
  const uniquePeakMonth = sortedAll.length >= 2
    && sortedAll[0].score >= UNIQUE_PEAK_MIN_SCORE
    && sortedAll[0].score - sortedAll[1].score >= UNIQUE_PEAK_MIN_DELTA
    ? sortedAll[0].month
    : null;

  const windows: MonthWindow[] = [];
  let idx = 0;
  while (idx < notable.length) {
    const group = [notable[idx]];
    while (
      idx + 1 < notable.length
      && group.length < TIMING_WINDOW_MERGE.maxWindowMonths
      && notable[idx + 1].month === notable[idx].month + 1
      && notable[idx].score >= TIMING_WINDOW_MERGE.minScore
      && notable[idx + 1].score >= TIMING_WINDOW_MERGE.minScore
      && Math.abs(notable[idx + 1].score - notable[idx].score) <= TIMING_WINDOW_MERGE.maxDelta
    ) {
      idx++;
      group.push(notable[idx]);
    }

    const peak = group.reduce((a, b) => (b.score > a.score ? b : a));
    const combinedHits = group.flatMap(g => g.hits);

    // §26 — VERY_HIGH chỉ khi đủ cả 5 điều kiện, không thì trần ở STRONG dù điểm số đã ≥85.
    const monthlyHitsAxis = peak.hits.some(h => h.signalType.startsWith('HOA_'));
    const crossLayerEchoTrue = peak.hits.some(h => h.signalType.startsWith('ECHO_'));
    const veryHighAllowed = peak.score >= 85 && annualStrength >= 70 && peak.familiesCount >= 4 && monthlyHitsAxis && crossLayerEchoTrue;
    let strength = timingIntensityOf(peak.score);
    if (strength === 'VERY_STRONG' && !veryHighAllowed) strength = 'STRONG';

    windows.push({
      startLunarMonth: group[0].month,
      endLunarMonth: group[group.length - 1].month,
      strength,
      isUniquePeak: uniquePeakMonth !== null && group.some(g => g.month === uniquePeakMonth),
      phase: phaseOfHoa(peak.dominantHoa),
      score: peak.score,
      drivers: driversOf(combinedHits),
    });
    idx++;
  }

  return windows.sort((a, b) => b.score - a.score).slice(0, 3);
}
