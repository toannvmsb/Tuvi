/**
 * "Từ vựng" 38 loại tín hiệu dùng trong 1343 rule (rules/annual_event_rules_v1.yaml) — mỗi mã
 * chỉ thuộc ĐÚNG 1 evidence family (đã đối chiếu toàn bộ rule, không có mã nào lẫn 2 family).
 * `recomputable = true` → sao có thể "lưu" lại theo Can/Chi bất kỳ (dùng cho ĐẠI VẬN/LƯU NIÊN/
 * LƯU NGUYỆT); `false` → sao cố định theo lá số gốc (giờ sinh/năm sinh), chỉ có ở tầng NATAL
 * (theo quy ước phổ biến — các sao này không được "phi lưu" lại hằng năm/tháng trong đa số
 * trường phái Tử Vi, xem ghi chú trong signals.ts).
 */
import type { EvidenceFamily, Polarity } from './types';

export interface SignalDef { code: string; name: string; family: EvidenceFamily; polarity: Polarity; recomputable: boolean; }

export const SIGNAL_CATALOG: Record<string, SignalDef> = {
  HOA_LOC:    { code: 'HOA_LOC', name: 'Hóa Lộc', family: 'FOUR_TRANSFORMATION', polarity: 'POSITIVE', recomputable: true },
  HOA_QUYEN:  { code: 'HOA_QUYEN', name: 'Hóa Quyền', family: 'FOUR_TRANSFORMATION', polarity: 'POSITIVE', recomputable: true },
  HOA_KHOA:   { code: 'HOA_KHOA', name: 'Hóa Khoa', family: 'FOUR_TRANSFORMATION', polarity: 'POSITIVE', recomputable: true },
  HOA_KY:     { code: 'HOA_KY', name: 'Hóa Kỵ', family: 'FOUR_TRANSFORMATION', polarity: 'NEGATIVE', recomputable: true },

  LOC_TON:    { code: 'LOC_TON', name: 'Lộc Tồn', family: 'LOC_TON_SYSTEM', polarity: 'POSITIVE', recomputable: true },
  KINH_DUONG: { code: 'KINH_DUONG', name: 'Kình Dương', family: 'LOC_TON_SYSTEM', polarity: 'NEGATIVE', recomputable: true },
  DA_LA:      { code: 'DA_LA', name: 'Đà La', family: 'LOC_TON_SYSTEM', polarity: 'NEGATIVE', recomputable: true },

  THIEN_MA:   { code: 'THIEN_MA', name: 'Thiên Mã', family: 'MA_SYSTEM', polarity: 'ACTIVATING', recomputable: true },
  THAI_TUE:   { code: 'THAI_TUE', name: 'Thái Tuế', family: 'TAI_SUI', polarity: 'ACTIVATING', recomputable: true },

  BACH_HO:    { code: 'BACH_HO', name: 'Bạch Hổ', family: 'ADVERSITY_CLUSTER', polarity: 'NEGATIVE', recomputable: true },
  TANG_MON:   { code: 'TANG_MON', name: 'Tang Môn', family: 'ADVERSITY_CLUSTER', polarity: 'NEGATIVE', recomputable: true },
  THIEN_KHOC: { code: 'THIEN_KHOC', name: 'Thiên Khốc', family: 'ADVERSITY_CLUSTER', polarity: 'NEGATIVE', recomputable: true },
  THIEN_HU:   { code: 'THIEN_HU', name: 'Thiên Hư', family: 'ADVERSITY_CLUSTER', polarity: 'NEGATIVE', recomputable: true },

  // MAIN_STAR_PATTERN — có thể "lưu" (theo vòng Thái Tuế/Lộc Tồn hoặc theo Can/Chi năm-tháng)
  VAN_XUONG:   { code: 'VAN_XUONG', name: 'Văn Xương', family: 'MAIN_STAR_PATTERN', polarity: 'POSITIVE', recomputable: true },
  VAN_KHUC:    { code: 'VAN_KHUC', name: 'Văn Khúc', family: 'MAIN_STAR_PATTERN', polarity: 'POSITIVE', recomputable: true },
  THIEN_KHOI:  { code: 'THIEN_KHOI', name: 'Thiên Khôi', family: 'MAIN_STAR_PATTERN', polarity: 'POSITIVE', recomputable: true },
  THIEN_VIET:  { code: 'THIEN_VIET', name: 'Thiên Việt', family: 'MAIN_STAR_PATTERN', polarity: 'POSITIVE', recomputable: true },
  DAO_HOA:     { code: 'DAO_HOA', name: 'Đào Hoa', family: 'MAIN_STAR_PATTERN', polarity: 'NEUTRAL', recomputable: true },
  HONG_LOAN:   { code: 'HONG_LOAN', name: 'Hồng Loan', family: 'MAIN_STAR_PATTERN', polarity: 'POSITIVE', recomputable: true },
  TIEU_HAO:    { code: 'TIEU_HAO', name: 'Tiểu Hao', family: 'MAIN_STAR_PATTERN', polarity: 'NEGATIVE', recomputable: true },
  DAI_HAO:     { code: 'DAI_HAO', name: 'Đại Hao', family: 'MAIN_STAR_PATTERN', polarity: 'NEGATIVE', recomputable: true },
  QUAN_PHU:    { code: 'QUAN_PHU', name: 'Quan Phù', family: 'MAIN_STAR_PATTERN', polarity: 'NEGATIVE', recomputable: true },

  // MAIN_STAR_PATTERN — cố định theo lá số gốc (không "lưu" lại theo năm/tháng)
  CO_THAN:     { code: 'CO_THAN', name: 'Cô Thần', family: 'MAIN_STAR_PATTERN', polarity: 'NEGATIVE', recomputable: false },
  CU_MON:      { code: 'CU_MON', name: 'Cự Môn', family: 'MAIN_STAR_PATTERN', polarity: 'NEUTRAL', recomputable: false },
  DIA_KHONG:   { code: 'DIA_KHONG', name: 'Địa Không', family: 'MAIN_STAR_PATTERN', polarity: 'NEGATIVE', recomputable: false },
  DIA_KIEP:    { code: 'DIA_KIEP', name: 'Địa Kiếp', family: 'MAIN_STAR_PATTERN', polarity: 'NEGATIVE', recomputable: false },
  HOA_TINH:    { code: 'HOA_TINH', name: 'Hỏa Tinh', family: 'MAIN_STAR_PATTERN', polarity: 'NEGATIVE', recomputable: false },
  LINH_TINH:   { code: 'LINH_TINH', name: 'Linh Tinh', family: 'MAIN_STAR_PATTERN', polarity: 'NEGATIVE', recomputable: false },
  HUU_BAT:     { code: 'HUU_BAT', name: 'Hữu Bật', family: 'MAIN_STAR_PATTERN', polarity: 'POSITIVE', recomputable: false },
  TA_PHU:      { code: 'TA_PHU', name: 'Tả Phù', family: 'MAIN_STAR_PATTERN', polarity: 'POSITIVE', recomputable: false },
  PHA_QUAN:    { code: 'PHA_QUAN', name: 'Phá Quân', family: 'MAIN_STAR_PATTERN', polarity: 'ACTIVATING', recomputable: false },
  QUA_TU:      { code: 'QUA_TU', name: 'Quả Tú', family: 'MAIN_STAR_PATTERN', polarity: 'NEGATIVE', recomputable: false },
  THAM_LANG:   { code: 'THAM_LANG', name: 'Tham Lang', family: 'MAIN_STAR_PATTERN', polarity: 'ACTIVATING', recomputable: false },
  THAT_SAT:    { code: 'THAT_SAT', name: 'Thất Sát', family: 'MAIN_STAR_PATTERN', polarity: 'ACTIVATING', recomputable: false },
  THIEN_HY:    { code: 'THIEN_HY', name: 'Thiên Hỷ', family: 'MAIN_STAR_PATTERN', polarity: 'POSITIVE', recomputable: false },
  THIEN_PHU:   { code: 'THIEN_PHU', name: 'Thiên Phủ', family: 'MAIN_STAR_PATTERN', polarity: 'POSITIVE', recomputable: false },
  THIEN_TUONG: { code: 'THIEN_TUONG', name: 'Thiên Tướng', family: 'MAIN_STAR_PATTERN', polarity: 'POSITIVE', recomputable: false },
  VU_KHUC:     { code: 'VU_KHUC', name: 'Vũ Khúc', family: 'MAIN_STAR_PATTERN', polarity: 'ACTIVATING', recomputable: false },
};

/** Tra ngược: tên sao tiếng Việt (đúng như trong house.stars[].name) → mã tín hiệu. */
export const STAR_NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.values(SIGNAL_CATALOG).map(d => [d.name, d.code]),
);

/** Các mã "lưu" được (dùng cho ĐẠI VẬN/LƯU NIÊN/LƯU NGUYỆT) — tách theo cách tính. */
export const RECOMPUTABLE_BY_STEM = ['LOC_TON', 'VAN_XUONG', 'VAN_KHUC', 'THIEN_KHOI', 'THIEN_VIET', 'KINH_DUONG', 'DA_LA'];
export const RECOMPUTABLE_BY_BRANCH = ['THIEN_MA', 'DAO_HOA', 'HONG_LOAN', 'THIEN_KHOC', 'THIEN_HU'];
export const RECOMPUTABLE_VONG_THAI_TUE = ['THAI_TUE', 'TANG_MON', 'BACH_HO', 'QUAN_PHU'];
export const RECOMPUTABLE_VONG_LOC_TON = ['TIEU_HAO', 'DAI_HAO'];

/** Độ sáng (miếu/vượng/đắc/bình/hãm) → cường độ 0-100 cho chính tinh; sao không có độ sáng dùng mặc định. */
export function brightnessToIntensity(brightness?: string): number {
  switch (brightness) {
    case 'miếu': case 'vượng': return 92;
    case 'đắc': return 78;
    case 'bình': return 58;
    case 'hãm': return 36;
    default: return 68;
  }
}
