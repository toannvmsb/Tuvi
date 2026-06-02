/**
 * Độ sáng (miếu/vượng/đắc/bình hòa/hãm) của các sao theo cung.
 * Chuẩn Tử Vi Nam Phái — Lê Quang Lăng.
 *
 * Ký hiệu:
 *   M = Miếu (sáng nhất)
 *   V = Vượng (sáng)
 *   Đ = Đắc (sáng trung bình)
 *   B = Bình hòa
 *   H = Hãm (tối)
 */

import type { EarthlyBranch } from '../types';

export type BrightnessCode = 'M' | 'V' | 'Đ' | 'B' | 'H';
export type BrightnessLong = 'miếu' | 'vượng' | 'đắc' | 'bình' | 'hãm';

export const BRIGHTNESS_CODE_TO_LONG: Record<BrightnessCode, BrightnessLong> = {
  M: 'miếu',
  V: 'vượng',
  'Đ': 'đắc',
  B: 'bình',
  H: 'hãm',
};

// Bảng độ sáng cho 14 Chính Tinh + 1 số phụ tinh quan trọng
// Key: tên sao, Value: mapping branch → brightness code
const BRIGHTNESS_TABLE: Record<string, Partial<Record<EarthlyBranch, BrightnessCode>>> = {
  // ───────────────────────────────────────────────────────────────
  // BẢNG CHUẨN 14 CHÍNH TINH — consolidated & verified
  // Đối chiếu 15+ lá số mẫu altuvi, phủ Mệnh tại đủ 12 cung +
  // Vô Chính Diệu, đủ Âm/Dương Nam/Nữ. Bảng là tra cứu thuần
  // (sao × chi), KHÔNG phụ thuộc đồng cung. Thứ tự cung: Tý Sửu
  // Dần Mão Thìn Tị Ngọ Mùi Thân Dậu Tuất Hợi. Sửa cả dòng,
  // không patch lẻ tẻ.
  // ───────────────────────────────────────────────────────────────
  'Tử Vi': {
    Tý: 'B', Sửu: 'Đ', Dần: 'M', Mão: 'B', Thìn: 'V', Tị: 'M',
    Ngọ: 'M', Mùi: 'Đ', Thân: 'M', Dậu: 'B', Tuất: 'V', Hợi: 'B',
  },
  'Thiên Cơ': {
    Tý: 'Đ', Sửu: 'Đ', Dần: 'H', Mão: 'M', Thìn: 'M', Tị: 'V',
    Ngọ: 'Đ', Mùi: 'Đ', Thân: 'V', Dậu: 'M', Tuất: 'M', Hợi: 'M',
  },
  'Thái Dương': {
    Tý: 'H', Sửu: 'Đ', Dần: 'V', Mão: 'V', Thìn: 'V', Tị: 'M',
    Ngọ: 'M', Mùi: 'Đ', Thân: 'H', Dậu: 'H', Tuất: 'H', Hợi: 'H',
  },
  'Vũ Khúc': {
    Tý: 'V', Sửu: 'M', Dần: 'V', Mão: 'Đ', Thìn: 'M', Tị: 'H',
    Ngọ: 'V', Mùi: 'M', Thân: 'V', Dậu: 'Đ', Tuất: 'M', Hợi: 'H',
  },
  'Thiên Đồng': {
    Tý: 'V', Sửu: 'H', Dần: 'M', Mão: 'Đ', Thìn: 'H', Tị: 'Đ',
    Ngọ: 'H', Mùi: 'H', Thân: 'M', Dậu: 'H', Tuất: 'H', Hợi: 'Đ',
  },
  'Liêm Trinh': {
    Tý: 'V', Sửu: 'Đ', Dần: 'V', Mão: 'H', Thìn: 'Đ', Tị: 'H',
    Ngọ: 'V', Mùi: 'Đ', Thân: 'V', Dậu: 'H', Tuất: 'M', Hợi: 'H',
  },
  'Thiên Phủ': {
    Tý: 'M', Sửu: 'B', Dần: 'M', Mão: 'B', Thìn: 'Đ', Tị: 'Đ',
    Ngọ: 'M', Mùi: 'Đ', Thân: 'M', Dậu: 'B', Tuất: 'V', Hợi: 'Đ',
  },
  'Thái Âm': {
    Tý: 'V', Sửu: 'Đ', Dần: 'H', Mão: 'H', Thìn: 'H', Tị: 'H',
    Ngọ: 'H', Mùi: 'Đ', Thân: 'V', Dậu: 'M', Tuất: 'M', Hợi: 'M',
  },
  'Tham Lang': {
    Tý: 'H', Sửu: 'M', Dần: 'Đ', Mão: 'H', Thìn: 'V', Tị: 'H',
    Ngọ: 'V', Mùi: 'M', Thân: 'Đ', Dậu: 'H', Tuất: 'V', Hợi: 'H',
  },
  'Cự Môn': {
    Tý: 'V', Sửu: 'H', Dần: 'V', Mão: 'M', Thìn: 'H', Tị: 'H',
    Ngọ: 'V', Mùi: 'H', Thân: 'Đ', Dậu: 'M', Tuất: 'H', Hợi: 'Đ',
  },
  'Thiên Tướng': {
    Tý: 'V', Sửu: 'Đ', Dần: 'M', Mão: 'H', Thìn: 'V', Tị: 'Đ',
    Ngọ: 'V', Mùi: 'Đ', Thân: 'M', Dậu: 'H', Tuất: 'V', Hợi: 'Đ',
  },
  'Thiên Lương': {
    Tý: 'V', Sửu: 'Đ', Dần: 'V', Mão: 'V', Thìn: 'M', Tị: 'H',
    Ngọ: 'M', Mùi: 'Đ', Thân: 'V', Dậu: 'Đ', Tuất: 'M', Hợi: 'H',
  },
  'Thất Sát': {
    Tý: 'M', Sửu: 'Đ', Dần: 'M', Mão: 'H', Thìn: 'H', Tị: 'V',
    Ngọ: 'M', Mùi: 'Đ', Thân: 'M', Dậu: 'H', Tuất: 'Đ', Hợi: 'V',
  },
  'Phá Quân': {
    Tý: 'M', Sửu: 'V', Dần: 'Đ', Mão: 'H', Thìn: 'Đ', Tị: 'H',
    Ngọ: 'M', Mùi: 'V', Thân: 'H', Dậu: 'H', Tuất: 'Đ', Hợi: 'H',
  },

  // Phụ tinh quan trọng — bảng đã chỉnh theo Nam Phái + altuvi
  'Văn Xương': {
    Dậu: 'M',
    Thân: 'V', Tý: 'V',
    Sửu: 'Đ', Tị: 'Đ', Thìn: 'Đ',
    Mùi: 'Đ',
    Mão: 'Đ',  // sửa từ H → Đ (per altuvi Chiến)
    Dần: 'H', Ngọ: 'H', Tuất: 'H', Hợi: 'H',
  },
  'Văn Khúc': {
    Tị: 'M',
    Thân: 'V', Tý: 'V', Thìn: 'V',
    Sửu: 'Đ', Mão: 'Đ',
    Mùi: 'Đ',
    Hợi: 'Đ',  // sửa từ H → Đ (per altuvi Chiến)
    Dậu: 'H', Dần: 'H', Ngọ: 'H', Tuất: 'H',
  },
  // Tả Phù / Hữu Bật: không có brightness truyền thống — bỏ table
  // 'Tả Phù': { },
  // 'Hữu Bật': { },
  'Thiên Khôi': {
    Sửu: 'M', Mùi: 'M',
    Dần: 'Đ', Ngọ: 'Đ',
    // Thân: bỏ entry (per altuvi Mạnh — no suffix)
  },
  'Thiên Việt': {
    Sửu: 'M', Mùi: 'M',
    Dần: 'Đ', Ngọ: 'Đ',
    // Thân: bỏ entry (per altuvi Mạnh — no suffix)
  },
  // Lộc Tồn — Nam Phái: chỉ pop ở Tứ Sinh (Miếu), trừ Hợi (per altuvi)
  'Lộc Tồn': {
    Dần: 'M', Thân: 'M', Tị: 'M',
    // Hợi: bỏ (per altuvi Chiến)
    // Tý/Ngọ/Mão/Dậu, Thìn/Tuất/Sửu/Mùi: bình hòa (không hiển thị)
  },
  'Kình Dương': {
    Thìn: 'Đ', Tuất: 'Đ', Sửu: 'Đ', Mùi: 'Đ',  // Tứ Mộ = Đắc (không phải Miếu)
    Tý: 'H', Ngọ: 'H', Mão: 'H', Dậu: 'H',
  },
  'Đà La': {
    Thìn: 'Đ', Tuất: 'Đ', Sửu: 'Đ', Mùi: 'Đ',  // Tứ Mộ = Đắc
    Dần: 'H', Thân: 'H', Tị: 'H', Hợi: 'H',
  },
  'Hỏa Tinh': {
    Dần: 'Đ', Ngọ: 'Đ',
    Mão: 'Đ',  // sửa từ V → Đ (per altuvi Mạnh: Mão = Đ for Linh Tinh)
    Tị: 'Đ',
    Tuất: 'H',  // sửa từ Đ → H (per altuvi Mạnh)
    Hợi: 'H', Tý: 'H', Sửu: 'H', Mùi: 'H', Thân: 'H', Thìn: 'H', Dậu: 'H',
  },
  'Linh Tinh': {
    Dần: 'Đ', Ngọ: 'Đ',
    Mão: 'Đ',  // sửa từ V → Đ (per altuvi Mạnh)
    Tị: 'Đ',
    Tuất: 'H',  // sửa từ Đ → H
    Hợi: 'H', Tý: 'H', Sửu: 'H', Mùi: 'H', Thân: 'H', Thìn: 'H', Dậu: 'H',
  },
  'Địa Kiếp': {
    Tị: 'Đ', Hợi: 'Đ', Dần: 'Đ', Thân: 'Đ',
    Thìn: 'H', Tuất: 'H', Sửu: 'H', Mùi: 'H',
    Mão: 'H', Dậu: 'H', Tý: 'H', Ngọ: 'H',
  },
  'Địa Không': {
    Tị: 'Đ', Hợi: 'Đ', Dần: 'Đ', Thân: 'Đ',
    Thìn: 'H', Tuất: 'H', Sửu: 'H', Mùi: 'H',
    Mão: 'H', Dậu: 'H', Tý: 'H', Ngọ: 'H',
  },
  // Một số phụ tinh quan trọng có miếu/đắc/hãm (đã chỉnh theo Nam Phái)
  'Thiên Mã': {
    Dần: 'Đ', Thân: 'Đ',  // sửa từ M → Đ (per altuvi Chiến)
    Tị: 'Đ',
    Hợi: 'H',
  },
  'Thiên Khốc': {
    Tý: 'M', Ngọ: 'M',
    Sửu: 'Đ', Mùi: 'Đ',
    Tị: 'H', Hợi: 'H', Dần: 'H', Thân: 'H',
    Thìn: 'H', Tuất: 'H',  // bổ sung Thìn/Tuất = H (per altuvi Chiến)
    Mão: 'H', Dậu: 'H',
  },
  'Thiên Hư': {
    Tý: 'M', Ngọ: 'M',
    Sửu: 'Đ', Mùi: 'Đ',
    Tị: 'H', Hợi: 'H', Dần: 'H', Thân: 'H', Mão: 'H', Dậu: 'H',
  },
  // Đào Hoa, Hồng Loan: không có brightness truyền thống — bỏ
  // 'Đào Hoa': { },
  // 'Hồng Loan': { },

  // Tứ Hóa — Nam Phái: chỉ pop M ở Tứ Sinh, H ở các cung khắc; bỏ V ở Tứ Chính
  // (Hóa Lộc/Quyền/Khoa thường bình hòa ở Tứ Chính & Tứ Mộ)
  'Hóa Lộc': {
    Tị: 'M', Hợi: 'M', Dần: 'M', Thân: 'M',
    // Tứ Chính + Tứ Mộ: bình hòa (không hiển thị)
  },
  // Hóa Quyền: bỏ toàn bộ — altuvi không hiển thị brightness
  'Hóa Quyền': {
    // empty
  },
  'Hóa Khoa': {
    Thân: 'Đ', Dần: 'Đ', Tị: 'Đ',
    // Hợi: bỏ entry (per altuvi Mạnh — no suffix)
  },
  'Hóa Kỵ': {
    Tý: 'V', Ngọ: 'V',
    Sửu: 'Đ', Mùi: 'Đ',  // sửa từ H → Đ (per altuvi Chiến)
    Mão: 'H', Dậu: 'H',
    Tị: 'H', Hợi: 'H',
    Dần: 'H', Thân: 'H',
    Thìn: 'Đ', Tuất: 'Đ',
  },

  // Sát phụ tinh khác
  'Thiên Hình': {
    Dần: 'M', Thân: 'M', Tị: 'M', Ngọ: 'M',
    Mão: 'Đ', Dậu: 'Đ',
    Tý: 'H', Hợi: 'H',
    Thìn: 'H', Tuất: 'H',  // Tứ Mộ Thìn/Tuất = H (per altuvi)
    Sửu: 'H', Mùi: 'H',
  },
  'Thiên Riêu': {
    Tý: 'M', Ngọ: 'M',
    Mão: 'Đ', Dậu: 'Đ',
    Dần: 'H', Thân: 'H', Thìn: 'H', Tuất: 'H',
    Sửu: 'H', Mùi: 'H',  // sửa từ V → H
    Tị: 'H', Hợi: 'H',
  },
  'Long Trì': {
    Thìn: 'M', Tuất: 'M', Sửu: 'Đ', Mùi: 'Đ',
    // Tý: bỏ (per altuvi Chiến — no suffix)
    Ngọ: 'Đ',
  },
  'Phượng Các': {
    Thìn: 'M', Tuất: 'M', Sửu: 'Đ', Mùi: 'Đ',
    Tý: 'Đ', Ngọ: 'Đ',
  },
  // Thiên Quan / Thiên Phúc: không có brightness truyền thống — bỏ entry
  // 'Thiên Quan': { },
  // 'Thiên Phúc': { },

  // Vòng Thái Tuế + Lộc Tồn — chỉ pop ở Tứ Mộ (H) và Tứ Chính (Đ)
  // Bạch Hổ, Tang Môn, Tuế Phá, Điếu Khách, Quan Phù: hung
  'Bạch Hổ': {
    Dần: 'M', Thân: 'M',
    Sửu: 'H', Mùi: 'H', Thìn: 'H', Tuất: 'H',
  },
  'Tang Môn': {
    Dần: 'M', Thân: 'M',
    Sửu: 'H', Mùi: 'H', Thìn: 'H', Tuất: 'H',
  },
  'Tuế Phá': {
    Tý: 'Đ', Ngọ: 'Đ', Mão: 'Đ', Dậu: 'Đ',
    Sửu: 'H', Mùi: 'H', Thìn: 'H', Tuất: 'H',
  },
  // Điếu Khách: không có brightness truyền thống — bỏ entry
  // 'Điếu Khách': { },
  'Đại Hao': {
    Tý: 'Đ', Ngọ: 'Đ', Mão: 'Đ', Dậu: 'Đ',
    Sửu: 'H', Mùi: 'H', Thìn: 'H', Tuất: 'H',
    Dần: 'Đ', Thân: 'Đ', Tị: 'Đ', Hợi: 'Đ',  // Tứ Sinh = Đ (per altuvi Chiến)
  },
  'Tiểu Hao': {
    Tý: 'Đ', Ngọ: 'Đ', Mão: 'Đ', Dậu: 'Đ',
    Sửu: 'H', Mùi: 'H', Thìn: 'H', Tuất: 'H',
    Dần: 'Đ', Thân: 'Đ', Tị: 'Đ', Hợi: 'Đ',  // bổ sung Tứ Sinh = Đ (per altuvi Chiến: Tiểu Hao Dần Đ)
  },
};

/**
 * Trả về mã độ sáng 1 ký tự (M/V/Đ/B/H) hoặc undefined nếu không có trong bảng.
 */
export function getBrightnessCode(starName: string, branch: EarthlyBranch): BrightnessCode | undefined {
  const clean = starName.startsWith('L. ') ? starName.slice(3) : starName;
  const entry = BRIGHTNESS_TABLE[clean];
  if (!entry) return undefined;
  return entry[branch];
}

// Tứ Chính (Tý Ngọ Mão Dậu) — cung mạnh; Tứ Mộ (Thìn Tuất Sửu Mùi); Tứ Sinh (Dần Thân Tị Hợi)
const FOUR_CARDINAL = new Set<EarthlyBranch>(['Tý', 'Ngọ', 'Mão', 'Dậu']);
const FOUR_EARTH = new Set<EarthlyBranch>(['Thìn', 'Tuất', 'Sửu', 'Mùi']);

/**
 * Brightness mặc định cho phụ tinh chưa có bảng riêng — heuristic theo Tứ Chính/Mộ/Sinh:
 *   Cát tinh: Tứ Chính → V, Tứ Mộ → M, Tứ Sinh → Đ
 *   Hung tinh: Tứ Chính → H, Tứ Mộ → V, Tứ Sinh → Đ
 */
export function getDefaultBrightnessCode(branch: EarthlyBranch, isHung: boolean): BrightnessCode {
  if (isHung) {
    if (FOUR_CARDINAL.has(branch)) return 'H';
    if (FOUR_EARTH.has(branch)) return 'V';
    return 'Đ';
  }
  if (FOUR_CARDINAL.has(branch)) return 'V';
  if (FOUR_EARTH.has(branch)) return 'M';
  return 'Đ';
}

/**
 * Lấy brightness — ưu tiên bảng tra, fallback theo heuristic Tứ Chính/Mộ/Sinh.
 */
export function getBrightnessCodeOrDefault(
  starName: string,
  branch: EarthlyBranch,
  isHung: boolean,
): BrightnessCode {
  const fromTable = getBrightnessCode(starName, branch);
  if (fromTable) return fromTable;
  return getDefaultBrightnessCode(branch, isHung);
}

export function getBrightnessLong(starName: string, branch: EarthlyBranch): BrightnessLong | undefined {
  const code = getBrightnessCode(starName, branch);
  return code ? BRIGHTNESS_CODE_TO_LONG[code] : undefined;
}
