/**
 * THÂN VƯỢNG / THÂN NHƯỢC của Nhật Chủ và DỤNG / KỴ THẦN theo phép "phù ức" (扶抑) — nguồn DUY NHẤT cho batTuChart.favorable/unfavorableElements
 * (màn Bát Tự, phong thủy, AI) và cho Nghiệm quá khứ / Luận tương lai.
 *
 * Phép chấm (cổ điển, tổng 100 điểm — ĐỒNG ĐẢNG là Tỷ Kiếp + Ấn, DỊ ĐẢNG là Thực Thương + Tài + Quan Sát):
 *   - Chi THÁNG (tháng lệnh) 40 · can tháng 12 · can giờ 12 · chi ngày 12 · can năm 8 · chi năm 8 · chi giờ 8
 *   - Điểm của một chi chia cho các can tàng theo tỉ lệ bản khí/trung khí/dư khí (1 can: 100% · 2 can: 70/30 · 3 can: 60/30/10).
 *   - Tổng điểm đồng đảng ≥ 50 → THÂN VƯỢNG; < 50 → THÂN NHƯỢC.
 * Thân vượng: dụng Thực Thương (tiết), Tài (hao), Quan Sát (khắc); kỵ Ấn, Tỷ Kiếp.  Thân nhược: ngược lại.
 *
 * GIỚI HẠN (nói thật): chưa xét tòng cách / chuyên vượng, điều hậu (nóng–lạnh–khô–ướt), thông quan, bệnh–dược, hợp hóa và
 * thông căn/thấu can chi tiết — đây là mức "phù ức" cơ bản, phù hợp tính toán tự động, KHÔNG thay thế người luận Bát Tự.
 */
import type { EarthlyBranch, FiveElement, HeavenlyStem, Pillar } from '../types';
import { thapThanOf, type ThapThan } from './thapThan';
import { HIDDEN_STEMS, STEM_ELEMENT } from './baziTables';

const SUPPORT: ThapThan[] = ['Tỷ Kiên', 'Kiếp Tài', 'Chính Ấn', 'Thiên Ấn'];

const SHENG: Record<FiveElement, FiveElement> = { Mộc: 'Hỏa', Hỏa: 'Thổ', Thổ: 'Kim', Kim: 'Thủy', Thủy: 'Mộc' };
const KHAC: Record<FiveElement, FiveElement> = { Mộc: 'Thổ', Thổ: 'Thủy', Thủy: 'Hỏa', Hỏa: 'Kim', Kim: 'Mộc' };
const ELEMENTS: FiveElement[] = ['Mộc', 'Hỏa', 'Thổ', 'Kim', 'Thủy'];

/** Tỉ lệ chia điểm của một chi cho các can tàng. */
const HIDDEN_SPLIT: Record<number, number[]> = { 1: [1], 2: [0.7, 0.3], 3: [0.6, 0.3, 0.1] };

export const STRENGTH_WEIGHTS = {
  monthBranch: 40, monthStem: 12, hourStem: 12, dayBranch: 12, yearStem: 8, yearBranch: 8, hourBranch: 8,
  /** Điểm đồng đảng từ ngưỡng này trở lên là thân vượng. */
  strongAt: 50,
} as const;

export interface DayMasterStrength {
  /** Điểm đồng đảng (Tỷ Kiếp + Ấn) trên tổng 100. */
  score: number;
  verdict: 'vuong' | 'nhuoc';
  /** Cách ngưỡng bao nhiêu điểm — gần ngưỡng (< 6) nghĩa là thân gần cân bằng, kết luận kém chắc. */
  margin: number;
  /** Chi tháng dùng làm tháng lệnh. */
  monthBranch: EarthlyBranch;
  /** Tháng lệnh có đồng đảng với Nhật Chủ không (đắc lệnh). */
  dacLenh: boolean;
  favorable: FiveElement[];
  unfavorable: FiveElement[];
}

function branchSupport(dm: HeavenlyStem, branch: EarthlyBranch, weight: number): number {
  const hs = HIDDEN_STEMS[branch];
  const split = HIDDEN_SPLIT[hs.length] ?? [1];
  return hs.reduce((s, h, i) => s + (SUPPORT.includes(thapThanOf(dm, h)) ? weight * (split[i] ?? 0) : 0), 0);
}
const stemSupport = (dm: HeavenlyStem, stem: HeavenlyStem, weight: number) => (SUPPORT.includes(thapThanOf(dm, stem)) ? weight : 0);

/** Dụng / kỵ thần theo thân vượng nhược (xem đầu file). */
export function elementsFor(dm: HeavenlyStem, strong: boolean): { favorable: FiveElement[]; unfavorable: FiveElement[] } {
  const el = STEM_ELEMENT[dm] as FiveElement;
  const selfSide = ELEMENTS.filter(e => e === el || SHENG[e] === el);           // Tỷ Kiếp + Ấn
  const otherSide = ELEMENTS.filter(e => !selfSide.includes(e));                  // Thực Thương, Tài, Quan Sát
  void KHAC;
  return strong ? { favorable: otherSide, unfavorable: selfSide } : { favorable: selfSide, unfavorable: otherSide };
}

export function assessDayMasterStrength(dm: HeavenlyStem, pillars: Pillar[]): DayMasterStrength {
  const [year, month, day, hour] = pillars;
  const W = STRENGTH_WEIGHTS;
  const score =
    branchSupport(dm, month.branch, W.monthBranch) +
    stemSupport(dm, month.stem, W.monthStem) +
    stemSupport(dm, hour.stem, W.hourStem) +
    branchSupport(dm, day.branch, W.dayBranch) +
    stemSupport(dm, year.stem, W.yearStem) +
    branchSupport(dm, year.branch, W.yearBranch) +
    branchSupport(dm, hour.branch, W.hourBranch);
  const strong = score >= W.strongAt;
  const lenhMain = HIDDEN_STEMS[month.branch][0];
  return {
    score,
    verdict: strong ? 'vuong' : 'nhuoc',
    margin: Math.abs(score - W.strongAt),
    monthBranch: month.branch,
    dacLenh: SUPPORT.includes(thapThanOf(dm, lenhMain)),
    ...elementsFor(dm, strong),
  };
}
