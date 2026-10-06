/**
 * Bảng tra Bát Tự dùng chung, KHÔNG phụ thuộc module nào khác (tránh vòng import giữa batTuEngine ↔ các bộ tính trụ/thân vượng).
 */
import type { EarthlyBranch, FiveElement, HeavenlyStem } from '../types';

export const STEM_ELEMENT: Record<HeavenlyStem, FiveElement> = {
  Giáp: 'Mộc', Ất: 'Mộc', Bính: 'Hỏa', Đinh: 'Hỏa', Mậu: 'Thổ',
  Kỷ: 'Thổ', Canh: 'Kim', Tân: 'Kim', Nhâm: 'Thủy', Quý: 'Thủy',
};

/** Tàng can của từng chi — can đầu tiên là bản khí. */
export const HIDDEN_STEMS: Record<EarthlyBranch, HeavenlyStem[]> = {
  Tý: ['Quý'],
  Sửu: ['Kỷ', 'Quý', 'Tân'],
  Dần: ['Giáp', 'Bính', 'Mậu'],
  Mão: ['Ất'],
  Thìn: ['Mậu', 'Ất', 'Quý'],
  Tị: ['Bính', 'Mậu', 'Canh'],
  Ngọ: ['Đinh', 'Kỷ'],
  Mùi: ['Kỷ', 'Đinh', 'Ất'],
  Thân: ['Canh', 'Nhâm', 'Mậu'],
  Dậu: ['Tân'],
  Tuất: ['Mậu', 'Tân', 'Đinh'],
  Hợi: ['Nhâm', 'Giáp'],
};
