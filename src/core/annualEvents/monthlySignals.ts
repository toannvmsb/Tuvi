/**
 * Dữ liệu THÔ của 1 tháng âm lịch cụ thể (không chấm điểm ở đây — xem monthlyTiming.ts):
 * Can/Chi tháng, Tứ Hóa tháng (đích sao/cung), Đẩu Quân v2 + "Mệnh của tháng", và sao lưu tháng.
 * Theo TUZI_Monthly_Event_Timing_Engine_v2.md — thay thế bản v1 trước đây (v1 gộp luôn cả việc
 * khớp rule vào file này; v2 tách hẳn "dữ liệu" khỏi "chấm điểm" cho rõ ràng, xem §5/§9/§15).
 */
import type { AstrologyResult, EarthlyBranch, HeavenlyStem } from '../../types';
import { monthStem } from '../phiHoa';
import { monthBranch } from './calendar';
import { fourTransformTargets, type HoaTargets } from './fourTransformTargets';
import { movingStarsCore, daiHaoOf } from './movingStars';
import { douJunIndex, monthlyMingBranchIndex } from './douJun';

export interface MonthlyMovingStarHit { code: string; branchIdx: number }

export interface MonthlyContext {
  lunarMonth: number;
  monthStemValue: HeavenlyStem;
  monthBranchValue: EarthlyBranch;
  /** Đích của 4 hóa tinh tháng (Lộc/Quyền/Khoa/Kỵ) — LUÔN qua core/phiHoa.ts. */
  fourTransformTargets: HoaTargets;
  /** Chỉ số cung Đẩu Quân (0-11) của NĂM XEM này (không đổi theo tháng — chỉ đổi theo năm xem). */
  douJunIdx: number;
  /** Chỉ số chi "Mệnh của tháng" (lưu nguyệt) — Đẩu Quân + (tháng - 1). */
  monthlyMingIdx: number;
  /** Sao lưu (lưu nguyệt) theo Can/Chi tháng, gồm cả Đại Hao + Thiên Hỷ (suy ra từ đối cung Hồng Loan). */
  movingStars: MonthlyMovingStarHit[];
}

export function buildMonthlyContext(
  result: AstrologyResult, yearStem: HeavenlyStem, yearBranch: EarthlyBranch, lunarMonth: number,
): MonthlyContext {
  const c = result.tuViChart;
  const mStem = monthStem(yearStem, lunarMonth) as HeavenlyStem;
  const mBranch = monthBranch(lunarMonth);

  const movingStars = movingStarsCore(c.houses, mStem, mBranch, result.birthInfo.gender);
  const dh = daiHaoOf(mStem, result.birthInfo.gender);
  if (dh) movingStars.push(dh);
  // Thiên Hỷ không nằm trong getLuuStarsForYear (core/starPlacer.ts) — quy tắc cổ điển: Thiên Hỷ
  // luôn ở cung ĐỐI XUNG với Hồng Loan cùng Can/Chi đó, nên suy trực tiếp từ Hồng Loan đã tính ở trên.
  const hongLoan = movingStars.find(m => m.code === 'HONG_LOAN');
  if (hongLoan) movingStars.push({ code: 'THIEN_HY', branchIdx: (hongLoan.branchIdx + 6) % 12 });

  const douJunIdx = douJunIndex(result, yearBranch);
  const monthlyMingIdx = monthlyMingBranchIndex(douJunIdx, lunarMonth);

  return {
    lunarMonth, monthStemValue: mStem, monthBranchValue: mBranch,
    fourTransformTargets: fourTransformTargets(c, mStem),
    douJunIdx, monthlyMingIdx, movingStars,
  };
}

