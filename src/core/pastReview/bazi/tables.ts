/**
 * Bảng tra nhỏ cho phần Bát Tự của "Nghiệm quá khứ". Bảng tàng can lấy từ core/batTuEngine
 * (HIDDEN_STEMS), bảng xung/hợp/hại/phá/hình từ core/thapThan — KHÔNG sao chép lại.
 */
import type { EarthlyBranch, FiveElement, HeavenlyStem } from '../../../types';
import { HIDDEN_STEMS } from '../../batTuEngine';

export { HIDDEN_STEMS };

export const STEMS: HeavenlyStem[] = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
export const BRANCHES: EarthlyBranch[] = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tị', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];

export const STEM_ELEMENT: Record<HeavenlyStem, FiveElement> = {
  Giáp: 'Mộc', Ất: 'Mộc', Bính: 'Hỏa', Đinh: 'Hỏa', Mậu: 'Thổ',
  Kỷ: 'Thổ', Canh: 'Kim', Tân: 'Kim', Nhâm: 'Thủy', Quý: 'Thủy',
};

export const isYangStem = (s: HeavenlyStem): boolean => STEMS.indexOf(s) % 2 === 0;

/** Can chính khí (tàng can đầu tiên) của một chi. */
export const mainHiddenStem = (b: EarthlyBranch): HeavenlyStem => HIDDEN_STEMS[b][0];

/** Hành của một chi = hành của can chính khí tàng trong chi đó. */
export const branchElement = (b: EarthlyBranch): FiveElement => STEM_ELEMENT[mainHiddenStem(b)];

/**
 * Dịch Mã và Đào Hoa theo tam hợp của chi (bảng cổ điển cố định):
 *   Thân-Tý-Thìn → Mã Dần, Đào Hoa Dậu      Dần-Ngọ-Tuất → Mã Thân, Đào Hoa Mão
 *   Tị-Dậu-Sửu   → Mã Hợi, Đào Hoa Ngọ      Hợi-Mão-Mùi  → Mã Tị,   Đào Hoa Tý
 */
const TRIAD_STARS: { group: EarthlyBranch[]; horse: EarthlyBranch; peach: EarthlyBranch }[] = [
  { group: ['Thân', 'Tý', 'Thìn'], horse: 'Dần', peach: 'Dậu' },
  { group: ['Dần', 'Ngọ', 'Tuất'], horse: 'Thân', peach: 'Mão' },
  { group: ['Tị', 'Dậu', 'Sửu'], horse: 'Hợi', peach: 'Ngọ' },
  { group: ['Hợi', 'Mão', 'Mùi'], horse: 'Tị', peach: 'Tý' },
];

const triadOf = (b: EarthlyBranch) => TRIAD_STARS.find(t => t.group.includes(b))!;
export const horseBranchOf = (b: EarthlyBranch): EarthlyBranch => triadOf(b).horse;
export const peachBranchOf = (b: EarthlyBranch): EarthlyBranch => triadOf(b).peach;
