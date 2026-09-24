/**
 * Thời điểm trong THÁNG (lưu nguyệt) — MONTHLY TIMING v3, theo
 * tuzi_annual_event_engine_full/TUZI_Tieu_Han_Annual_Event_Focus_Engine_v1.md §31-35, THAY THẾ
 * bản v2 trước đây (TUZI_Monthly_Event_Timing_Engine_v2.md) sau phản hồi trực tiếp của anh Toàn:
 *
 *  1) "Điểm sự kiện dưới 50% thì không có thông tin tháng" — v2 GATE cứng theo điểm năm
 *     (`annualStrength < event.minAnnualScoreForMonthlyTiming` → trả về rỗng). §34 của tài liệu
 *     mới nói rõ: "No event should return no timing solely because annual score is below 50" —
 *     v3 BỎ HẲN gate này. Điểm SỰ KIỆN (có xảy ra hay không, mạnh hay yếu) và THỜI ĐIỂM (nếu xảy
 *     ra thì rơi vào tháng nào) là 2 câu hỏi khác nhau — event yếu vẫn luôn có 1 tháng "nổi bật
 *     nhất trong năm" để tham khảo, chỉ khác là độ tin cậy của lựa chọn đó thấp hơn.
 *  2) "Các tháng đưa ra khá giống nhau" — nguyên nhân chính ở bản v2: `annualBaseline` (25% điểm
 *     SỰ KIỆN NĂM) được cộng THẲNG vào CẢ 12 tháng như nhau, khiến 12 tháng cùng bị kéo về gần
 *     một mặt bằng chung, và các ngưỡng suppression (cap 60/45 khi điểm năm thấp) càng nén thêm.
 *     §34 nói rõ: "Do not include Annual Event score directly in the month-ranking formula.
 *     Annual score = event strength only." — v3 bỏ hẳn thành phần này, xếp hạng THÁNG chỉ dựa
 *     trên dữ kiện RIÊNG của từng tháng, nên khoảng cách giữa các tháng phản ánh đúng dữ liệu hơn.
 *
 * 8 thành phần theo §33 (cộng lại = 100 điểm tuyệt đối, không nhân thêm trọng số — mỗi hàm con
 * đã trả điểm nằm sẵn trong khoảng cap của chính nó):
 *  - eventPalaceMatch     (18) — Same-Function Overlap + hình học (đổi tên từ "Axis Resonance" ở v2, giữ nguyên công thức).
 *  - monthlyFourTransform (18) — Tứ Hóa tháng chạm trục sự kiện (giữ nguyên công thức MONTHLY_GENERIC_ECHO_001 ở v2).
 *  - annualMovingStarResonance (12) — MỚI: sao lưu THÁNG có trùng cung với sao lưu NĂM đã chạm trục sự kiện không.
 *  - monthlyMovingStars   (12) — sao lưu tháng đóng tại trục sự kiện (giữ công thức v2, tăng cap 5→12).
 *  - tieuHanResonance     (15) — MỚI §32: tháng có cộng hưởng với cung TIỂU HẠN của năm xem không.
 *  - crossLayerEcho       (15) — Tứ Hóa tháng cộng hưởng bản mệnh/đại vận/lưu niên (giữ nguyên công thức v2).
 *  - eventSpecificPattern (7)  — MỚI §30: hóa tinh chiếm ưu thế trong tháng có "hợp cơ chế" với nhóm sự kiện không.
 *  - douJunStructure      (3)  — gộp Đẩu Quân tương tác (§14) + Structural Confirmation (giữ công thức v2, giảm cap).
 *
 * Xếp hạng THÁNG theo §34 "Relative Timing Ranking": LUÔN tính đủ 12 tháng, tháng nổi bật nhất
 * (argmax) luôn được trả về làm "cửa sổ chính" dù điểm tuyệt đối cao hay thấp; độ tin cậy
 * (`timingConfidence`, §35) đo khoảng cách giữa tháng đứng đầu và tháng nhì trên CẢ 12 tháng
 * (≥15 HIGH / 8-14 MEDIUM / <8 LOW) — KHÔNG phải xác suất sự kiện xảy ra.
 *
 * DIỄN GIẢI so với spec gốc (ghi rõ theo yêu cầu "đọc thấy chỗ nào chưa hợp lý thì sửa"):
 *  - "Tiểu Hạn calculator" (§4): app này ĐÃ CÓ SẴN đúng thuật toán Nam Phái Tam Hợp yêu cầu
 *    (`core/daiVanEngine.ts` → `tieuHanStartBranchIdx` + "Nam thuận, Nữ nghịch", khớp CHÍNH XÁC
 *    4 nhóm khởi cung ở §4) — dùng thẳng `ctx.tieuHanBranch` đã có, KHÔNG viết lại calculator.
 *  - Phần "Annual Event Focus Layer" đầy đủ ở §1-30 (Tiểu Hạn làm nhân hệ số ưu tiên SỰ KIỆN,
 *    domain-mapping 12 cung, pattern engine, dignity/ngũ hành modifier, Annual Scorer v3 thay
 *    hẳn breakdown 8 nhóm hiện tại) là 1 khối việc RIÊNG, ảnh hưởng tới việc CHỌN/XẾP HẠNG sự
 *    kiện — không phải nguyên nhân của 2 vấn đề anh Toàn báo (đều là vấn đề hiển thị THÁNG). Để
 *    tránh sửa lan sang toàn bộ cách tính điểm năm (rủi ro cao, ngoài phạm vi yêu cầu lần này),
 *    em CHỈ áp dụng phần Monthly Timing v3 (§31-35) — là phần trực tiếp gây ra 2 hiện tượng anh
 *    thấy. Phần Tiểu Hạn làm Event Focus Layer cho điểm SỰ KIỆN NĂM em để dành làm riêng nếu anh
 *    cần, tránh đổi luôn cả cách xếp hạng/chọn sự kiện trong 1 lần sửa.
 *  - "Event-Specific Pattern" (§30) chỉ liệt kê rõ Career/Finance/Property/Relationship/
 *    Health/Legal — 4 nhóm còn lại (Children/Family/Mobility/Education&Reputation) suy diễn theo
 *    đúng tinh thần §9 (Lộc=mở ra, Khoa=chính thức hóa, Quyền=hành động, Kỵ=vướng mắc), xem config.ts.
 */
import type { AstrologyResult, EarthlyBranch } from '../../types';
import type { EventDefinition, EventRule, MonthDriver, MonthWindow, Palace, EventPhase, TimingConfidence } from './types';
import type { HoaKind } from '../phiHoa';
import type { HoaTargets } from './fourTransformTargets';
import {
  MONTHLY_V3_CAPS, MONTHLY_GEOMETRY_WEIGHT, KY_OPPOSITION_MULTIPLIER, MONTHLY_TU_HOA_GEOMETRY_BONUS,
  MONTHLY_OVERLAP_SCORE, ECHO_SAME_TRANSFORM, ECHO_CROSS_TRANSFORM, ECHO_CROSS_TRANSFORM_FALLBACK,
  ECHO_LAYER_PRIORITY, DOU_JUN_SCORE, MONTHLY_MOVING_STAR_SCORE, TIMING_INTENSITY_BANDS,
  TIMING_CONFIDENCE_GAP, MONTHLY_V3_WINDOW, CATEGORY_PREFERRED_HOA, CATEGORY_ADVERSE_HOA,
} from './config';
import { buildMonthlyContext, type MonthlyContext } from './monthlySignals';
import { fourTransformTargets } from './fourTransformTargets';
import { roleBranchIndex, geometryOf } from './monthlyChart';
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

/** §6/§8 (đổi tên "Event Palace Match") — cung trục sự kiện của tháng có trùng/hình chiếu tới đúng cung đó ở bản mệnh/đại vận/lưu niên không. */
function eventPalaceMatchScore(event: EventDefinition, monthlyMingIdx: number, natalMingIdx: number, yearBranchIdx: number, daHanBranchIdx: number | null, hits: Hit[]): number {
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

/** §9/§36 MONTHLY_GENERIC_ECHO_001 — Tứ Hóa tháng có chạm trục sự kiện không, theo hình học. Trả kèm hóa tinh chiếm ưu thế (dùng cho phase + event-specific pattern). */
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

/** MỚI (§16 "Annual Moving Stars" + tinh thần §11 áp cho sao lưu thay vì Tứ Hóa) — sao lưu tháng có trùng cung với sao lưu NĂM đã chạm trục sự kiện không. */
function annualMovingStarResonanceScore(event: EventDefinition, mc: MonthlyContext, ctx: AnnualSignalContext, c: AstrologyResult['tuViChart'], hits: Hit[]): number {
  const axisSet = new Set(axisRolesOf(event));
  const annualHitPalaces = new Set(
    ctx.signals
      .filter(s => s.source === 'ANNUAL' && axisSet.has(s.palace) && ['MA_SYSTEM', 'LOC_TON_SYSTEM', 'ADVERSITY_CLUSTER', 'TAI_SUI'].includes(s.family))
      .map(s => s.palace),
  );
  if (annualHitPalaces.size === 0) return 0;
  let total = 0;
  for (const m of mc.movingStars) {
    const h = c.houses.find(x => x.branch === BRANCHES[m.branchIdx]);
    if (!h) continue;
    const palace = PALACE_VN_TO_CODE[h.palaceName];
    if (!palace || !axisSet.has(palace) || !annualHitPalaces.has(palace)) continue;
    const bonus = 6;
    total += bonus;
    hits.push({ starName: `${SIGNAL_CATALOG[m.code]?.name ?? m.code} tháng cộng hưởng sao lưu lưu niên`, palace, signalType: `ANNUAL_MS_${m.code}`, contribution: bonus });
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

/** MỚI §32 — tháng có cộng hưởng với cung TIỂU HẠN của năm xem không (dùng thẳng ctx.tieuHanBranch đã có sẵn, đúng thuật toán Nam Phái Tam Hợp — xem ghi chú đầu file). */
function monthlyTieuHanResonanceScore(event: EventDefinition, mc: MonthlyContext, ctx: AnnualSignalContext, c: AstrologyResult['tuViChart'], hits: Hit[]): number {
  if (!ctx.tieuHanBranch) return 0;
  const tieuHanIdx = branchIndex(ctx.tieuHanBranch);
  const tieuHanHouse = c.houses.find(h => h.branch === ctx.tieuHanBranch);
  const tieuHanPalace: Palace | null = tieuHanHouse ? PALACE_VN_TO_CODE[tieuHanHouse.palaceName] ?? null : null;
  let total = 0;

  // (a) Cung trục sự kiện của tháng có hình chiếu tới đúng cung Tiểu Hạn không.
  for (const role of axisRolesOf(event)) {
    const monthlyIdx = roleBranchIndex(mc.monthlyMingIdx, role);
    const geo = geometryOf(monthlyIdx, tieuHanIdx);
    const w = MONTHLY_GEOMETRY_WEIGHT[geo];
    if (w <= 0) continue;
    const contribution = w * 10 * (event.axis.weights[role] ?? 0.5);
    if (contribution < 1) continue;
    total += contribution;
    hits.push({ starName: `Cung ${PALACE_CODE_TO_VN[role] ?? role} của tháng cộng hưởng cung Tiểu Hạn`, palace: role, signalType: `TIEU_HAN_OVERLAP_${role}`, contribution });
  }

  // (b) Tứ Hóa tháng có đánh trúng đúng cung Tiểu Hạn không.
  if (tieuHanPalace) {
    for (const hoa of HOA_LIST) {
      const t = mc.fourTransformTargets[hoa];
      if (t && t.palace === tieuHanPalace) {
        total += 6;
        hits.push({ starName: `${t.star} hóa ${hoa.replace('Hóa ', '')} đánh trúng cung Tiểu Hạn`, palace: tieuHanPalace, signalType: `TIEU_HAN_HOA_${hoaCode(hoa)}`, contribution: 6 });
      }
    }
  }

  // (c) Lộc Tồn/Thiên Mã tháng có kích hoạt đúng cung Tiểu Hạn không.
  if (tieuHanPalace) {
    for (const m of mc.movingStars) {
      if ((m.code !== 'LOC_TON' && m.code !== 'THIEN_MA') || BRANCHES[m.branchIdx] !== ctx.tieuHanBranch) continue;
      total += 5;
      hits.push({ starName: `${SIGNAL_CATALOG[m.code]?.name ?? m.code} tháng kích hoạt cung Tiểu Hạn`, palace: tieuHanPalace, signalType: `TIEU_HAN_MS_${m.code}`, contribution: 5 });
    }
  }
  return total;
}

/** MỚI §30 — hóa tinh chiếm ưu thế trong tháng có "hợp cơ chế" với nhóm sự kiện không (xem bảng CATEGORY_PREFERRED_HOA/CATEGORY_ADVERSE_HOA trong config.ts). */
function eventSpecificPatternScore(event: EventDefinition, dominantHoa: HoaKind | null, hits: Hit[]): number {
  if (!dominantHoa) return 0;
  const preferred = CATEGORY_PREFERRED_HOA[event.category] ?? [];
  const adverse = CATEGORY_ADVERSE_HOA[event.category] ?? [];
  if (preferred.includes(dominantHoa)) {
    hits.push({ starName: `Cơ chế hóa ${dominantHoa.replace('Hóa ', '')} khớp với nhóm sự kiện này`, palace: event.axis.primary[0], signalType: 'PATTERN_PREFERRED', contribution: 7 });
    return 7;
  }
  if (adverse.includes(dominantHoa)) {
    hits.push({ starName: `Cơ chế hóa ${dominantHoa.replace('Hóa ', '')} là dạng áp lực thường gặp của nhóm sự kiện này`, palace: event.axis.primary[0], signalType: 'PATTERN_ADVERSE', contribution: 5 });
    return 5;
  }
  return 0;
}

/** §14 (Đẩu Quân) gộp với Structural Confirmation — cùng 1 cap nhỏ 3 điểm theo §33. */
function douJunStructureScore(event: EventDefinition, ctx: AnnualSignalContext, result: AstrologyResult, mc: MonthlyContext, hits: Hit[]): number {
  const c = result.tuViChart;
  const axisSet = new Set(axisRolesOf(event));
  const douJunBranch = BRANCHES[mc.douJunIdx];
  const douJunHouse = c.houses.find(h => h.branch === douJunBranch);
  const douJunPalace: Palace | null = douJunHouse ? PALACE_VN_TO_CODE[douJunHouse.palaceName] ?? null : null;
  let total = 0;

  if (douJunPalace && axisSet.has(douJunPalace)) {
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
    for (const t of Object.values(dqTargets)) if (t && axisSet.has(t.palace)) { ownHitsAxis = true; break; }
    if (ownHitsAxis && douJunPalace) {
      total += DOU_JUN_SCORE.ownTransformHitsAxis;
      hits.push({ starName: 'Tứ Hóa của cung Đẩu Quân chạm trục sự kiện', palace: douJunPalace, signalType: 'DOU_JUN_OWN_HOA', contribution: DOU_JUN_SCORE.ownTransformHitsAxis });
    }
  }
  const mingHouse = c.houses.find(h => h.branch === ctx.yearBranch);
  let mingHitsDouJun = false;
  if (mingHouse && douJunPalace) {
    const mingTargets = fourTransformTargets(c, mingHouse.can);
    for (const t of Object.values(mingTargets)) if (t && t.palace === douJunPalace) { mingHitsDouJun = true; break; }
    if (mingHitsDouJun) {
      total += DOU_JUN_SCORE.annualMingHitsDouJun;
      hits.push({ starName: 'Tứ Hóa của cung Mệnh lưu niên chiếu vào Đẩu Quân', palace: douJunPalace, signalType: 'DOU_JUN_MING_HOA', contribution: DOU_JUN_SCORE.annualMingHitsDouJun });
    }
  }
  if (mingHitsDouJun && ownHitsAxis && douJunPalace) {
    total += DOU_JUN_SCORE.mutualInteraction;
    hits.push({ starName: 'Đẩu Quân và Mệnh lưu niên tương tác 2 chiều', palace: douJunPalace, signalType: 'DOU_JUN_MUTUAL', contribution: DOU_JUN_SCORE.mutualInteraction });
  }

  for (const role of event.axis.primary) {
    const idx = roleBranchIndex(mc.monthlyMingIdx, role);
    const h = c.houses.find(x => x.branch === BRANCHES[idx]);
    if (!h) continue;
    let v = 0;
    if (!h.tuanAt && !h.trietAt) v += 1;
    if (h.stars.some(s => s.type === 'chinh' && (s.brightness === 'miếu' || s.brightness === 'vượng'))) v += 1.5;
    if (v > 0) { total += v; hits.push({ starName: 'Cấu trúc cung trục tháng ổn định (không Tuần/Triệt, chính tinh vượng)', palace: role, signalType: 'STRUCTURAL', contribution: v }); }
  }

  return total;
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

interface MonthResult { month: number; score: number; hits: Hit[]; dominantHoa: HoaKind | null }

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Gộp các tháng liền kề quanh 1 tháng tâm — §27 (cơ chế) vẫn giữ, chỉ bỏ ngưỡng tuyệt đối ≥70 (v2) vì v3 không còn thang điểm có "sàn". */
function mergeAround(byMonth: Map<number, MonthResult>, centerMonth: number, used: Set<number>): MonthResult[] {
  const center = byMonth.get(centerMonth)!;
  let lo = centerMonth, hi = centerMonth;
  const group = [center];
  while (group.length < MONTHLY_V3_WINDOW.maxWindowMonths) {
    const leftCand = lo - 1 >= 1 && !used.has(lo - 1) ? byMonth.get(lo - 1) : undefined;
    const rightCand = hi + 1 <= 12 && !used.has(hi + 1) ? byMonth.get(hi + 1) : undefined;
    const leftOk = !!leftCand && Math.abs(leftCand.score - center.score) <= MONTHLY_V3_WINDOW.maxDelta;
    const rightOk = !!rightCand && Math.abs(rightCand.score - center.score) <= MONTHLY_V3_WINDOW.maxDelta;
    if (!leftOk && !rightOk) break;
    if (leftOk && (!rightOk || leftCand!.score >= rightCand!.score)) { group.unshift(leftCand!); lo--; }
    else { group.push(rightCand!); hi++; }
  }
  return group;
}

export function computeMonthlyTiming(
  event: EventDefinition, _annualStrength: number, _rules: EventRule[], result: AstrologyResult, ctx: AnnualSignalContext,
): MonthWindow[] {
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
    const allHits: Hit[] = [];

    const eventPalaceMatch = clamp(eventPalaceMatchScore(event, mc.monthlyMingIdx, natalMingIdx, yearBranchIdx, daHanBranchIdx, allHits), 0, MONTHLY_V3_CAPS.eventPalaceMatch);

    const ftHits: Hit[] = [];
    const { score: ftScoreRaw, dominantHoa } = monthlyFourTransformScore(event, mc.fourTransformTargets, c, ftHits);
    const monthlyFourTransform = clamp(ftScoreRaw, 0, MONTHLY_V3_CAPS.monthlyFourTransform);
    allHits.push(...ftHits);

    const annualMsHits: Hit[] = [];
    const annualMovingStarResonance = clamp(annualMovingStarResonanceScore(event, mc, ctx, c, annualMsHits), 0, MONTHLY_V3_CAPS.annualMovingStarResonance);
    allHits.push(...annualMsHits);

    const msHits: Hit[] = [];
    const monthlyMovingStars = clamp(monthlyMovingStarsScore(event, mc, c, msHits), 0, MONTHLY_V3_CAPS.monthlyMovingStars);
    allHits.push(...msHits);

    const thHits: Hit[] = [];
    const tieuHanResonance = clamp(monthlyTieuHanResonanceScore(event, mc, ctx, c, thHits), 0, MONTHLY_V3_CAPS.tieuHanResonance);
    allHits.push(...thHits);

    const echoHits: Hit[] = [];
    const crossLayerEcho = clamp(crossLayerEchoScore(event, mc.fourTransformTargets, natalTargets, daHanTargets, annualTargets, echoHits), 0, MONTHLY_V3_CAPS.crossLayerEcho);
    allHits.push(...echoHits);

    const patternHits: Hit[] = [];
    const eventSpecificPattern = clamp(eventSpecificPatternScore(event, dominantHoa, patternHits), 0, MONTHLY_V3_CAPS.eventSpecificPattern);
    allHits.push(...patternHits);

    const djHits: Hit[] = [];
    const douJunStructure = clamp(douJunStructureScore(event, ctx, result, mc, djHits), 0, MONTHLY_V3_CAPS.douJunStructure);
    allHits.push(...djHits);

    const raw = eventPalaceMatch + monthlyFourTransform + annualMovingStarResonance + monthlyMovingStars
      + tieuHanResonance + crossLayerEcho + eventSpecificPattern + douJunStructure;

    monthly.push({ month: m, score: Math.round(clamp(raw)), hits: allHits, dominantHoa });
  }

  // §34 Relative Timing Ranking — LUÔN trả về 1 cửa sổ chính (tháng nổi bật nhất trong năm), bất
  // kể điểm tuyệt đối cao hay thấp. Độ tin cậy dùng relativeTimingIndex = đỉnh − trung vị 12
  // tháng (§34), KHÔNG dùng "đỉnh trừ tháng nhì" (§35 gốc) — xem lý do ở config.ts TIMING_CONFIDENCE_GAP.
  const sortedAll = [...monthly].sort((a, b) => b.score - a.score);
  const med = median(monthly.map(m => m.score));
  const relativeTimingIndex = sortedAll[0].score - med;
  const timingConfidence: TimingConfidence = relativeTimingIndex >= TIMING_CONFIDENCE_GAP.high ? 'HIGH' : relativeTimingIndex >= TIMING_CONFIDENCE_GAP.medium ? 'MEDIUM' : 'LOW';

  const byMonth = new Map(monthly.map(m => [m.month, m]));
  const used = new Set<number>();
  const primaryGroup = mergeAround(byMonth, sortedAll[0].month, used);
  for (const g of primaryGroup) used.add(g.month);

  const remaining = sortedAll.filter(m => !used.has(m.month));
  let secondaryGroup: MonthResult[] | null = null;
  if (remaining.length > 0 && remaining[0].score >= med + MONTHLY_V3_WINDOW.secondaryMinGapAboveMedian) {
    secondaryGroup = mergeAround(byMonth, remaining[0].month, used);
  }

  const toWindow = (group: MonthResult[]): MonthWindow => {
    const peak = group.reduce((a, b) => (b.score > a.score ? b : a));
    return {
      startLunarMonth: Math.min(...group.map(g => g.month)),
      endLunarMonth: Math.max(...group.map(g => g.month)),
      strength: timingIntensityOf(peak.score),
      timingConfidence,
      phase: phaseOfHoa(peak.dominantHoa),
      score: peak.score,
      drivers: driversOf(group.flatMap(g => g.hits)),
    };
  };

  const windows: MonthWindow[] = [toWindow(primaryGroup)];
  if (secondaryGroup) windows.push(toWindow(secondaryGroup));
  return windows;
}
