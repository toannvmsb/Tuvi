/**
 * Tín hiệu LƯU NGUYỆT (1 tháng âm lịch cụ thể trong năm xem) — chỉ dựng khi sự kiện đã đạt
 * ngưỡng annualEventScore ≥ 55 (ENGINE_SPEC §15), tránh tầng tháng "tự bịa" ra sự kiện lớn.
 */
import type { AstrologyResult, EarthlyBranch, HeavenlyStem } from '../../types';
import type { AstrologySignal, Palace } from './types';
import { luuTuHoaPositions, monthStem } from '../phiHoa';
import { PALACE_VN_TO_CODE, monthBranch, dauQuanOfMonth, branchRelation } from './calendar';
import { SIGNAL_CATALOG } from './signalCatalog';
import { movingStarsCore, daiHaoOf } from './movingStars';

const BR: EarthlyBranch[] = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tị', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
function palaceOf(vn: string): Palace | null { return PALACE_VN_TO_CODE[vn] ?? null; }

export interface MonthlyContext {
  lunarMonth: number;
  monthStemValue: HeavenlyStem;
  monthBranchValue: EarthlyBranch;
  /** Tách riêng theo trọng số §15: Tứ Hóa tháng (25%) — signals[].family === 'FOUR_TRANSFORMATION'. */
  fourTransformSignals: AstrologySignal[];
  /** "Trục tháng" (20%) — sao theo Can/Chi tháng (Lộc Tồn/Xương/Khúc/Khôi/Việt/Kình/Đà/Mã/Đào/Hồng/Khốc/Hư). */
  axisSignals: AstrologySignal[];
  /** Tín hiệu phụ nhóm vòng Thái Tuế/Lộc Tồn kéo theo tháng (5%, "OtherMonthlySignals") — ít chuẩn hơn nên trọng số nhỏ. */
  otherSignals: AstrologySignal[];
  /** Đẩu Quân của tháng có rơi vào (hoặc tam hợp/xung) 1 trong các cung trục sự kiện không. */
  dauQuanBranch: EarthlyBranch;
}

export function buildMonthlyContext(
  result: AstrologyResult, yearStem: HeavenlyStem, yearBranch: EarthlyBranch, lunarMonth: number,
): MonthlyContext {
  const c = result.tuViChart;
  const mStem = monthStem(yearStem, lunarMonth) as HeavenlyStem;
  const mBranch = monthBranch(lunarMonth);

  const fourTransformSignals: AstrologySignal[] = [];
  for (const p of luuTuHoaPositions(c, mStem)) {
    const palace = palaceOf(p.palace);
    if (!palace) continue;
    const code = p.hoa === 'Hóa Lộc' ? 'HOA_LOC' : p.hoa === 'Hóa Quyền' ? 'HOA_QUYEN' : p.hoa === 'Hóa Khoa' ? 'HOA_KHOA' : 'HOA_KY';
    const def = SIGNAL_CATALOG[code];
    fourTransformSignals.push({
      source: 'MONTHLY', family: 'FOUR_TRANSFORMATION', palace, signalType: code, starName: p.star,
      intensity: 82, polarity: def.polarity, monthLunar: lunarMonth,
    });
  }

  const axisSignals: AstrologySignal[] = [];
  const otherSignals: AstrologySignal[] = [];
  const OTHER_CODES = new Set(['THAI_TUE', 'TANG_MON', 'BACH_HO', 'QUAN_PHU', 'TIEU_HAO', 'DAI_HAO']);
  const moving = movingStarsCore(c.houses, mStem, mBranch, result.birthInfo.gender);
  const dh = daiHaoOf(mStem, result.birthInfo.gender);
  if (dh) moving.push(dh);
  for (const m of moving) {
    const br = BR[m.branchIdx];
    const h = c.houses.find(x => x.branch === br);
    if (!h) continue;
    const palace = palaceOf(h.palaceName);
    if (!palace) continue;
    const def = SIGNAL_CATALOG[m.code];
    if (!def) continue;
    const sig: AstrologySignal = {
      source: 'MONTHLY', family: def.family, palace, signalType: m.code, starName: def.name,
      intensity: 75, polarity: def.polarity, monthLunar: lunarMonth,
    };
    (OTHER_CODES.has(m.code) ? otherSignals : axisSignals).push(sig);
  }

  return {
    lunarMonth, monthStemValue: mStem, monthBranchValue: mBranch,
    fourTransformSignals, axisSignals, otherSignals,
    dauQuanBranch: dauQuanOfMonth(yearBranch, lunarMonth),
  };
}

/** Đẩu Quân tháng có tương tác (đồng cung/tam hợp/xung) với 1 trong các cung trục sự kiện không. */
export function dauQuanInteracts(dauQuanBranch: EarthlyBranch, axisPalaceBranches: EarthlyBranch[]): boolean {
  return axisPalaceBranches.some(b => branchRelation(dauQuanBranch, b) !== 'NONE');
}
