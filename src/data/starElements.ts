import type { FiveElement } from '../types';

/**
 * Ngũ hành của từng sao — dùng cho màu chữ trên lá số
 * Theo chuẩn Tử Vi Nam Phái — Lê Quang Lăng
 */
export const STAR_ELEMENT: Record<string, FiveElement> = {
  // 14 Chính Tinh
  'Tử Vi': 'Thổ',
  'Thiên Cơ': 'Mộc',
  'Thái Dương': 'Hỏa',
  'Vũ Khúc': 'Kim',
  'Thiên Đồng': 'Thủy',
  'Liêm Trinh': 'Hỏa',
  'Thiên Phủ': 'Thổ',
  'Thái Âm': 'Thủy',
  'Tham Lang': 'Mộc',
  'Cự Môn': 'Thủy',
  'Thiên Tướng': 'Thủy',
  'Thiên Lương': 'Thổ',
  'Thất Sát': 'Kim',
  'Phá Quân': 'Thủy',

  // Lục Cát
  'Văn Xương': 'Kim',
  'Văn Khúc': 'Thủy',
  'Tả Phù': 'Thổ',
  'Hữu Bật': 'Thủy',
  'Thiên Khôi': 'Hỏa',
  'Thiên Việt': 'Hỏa',

  // Lộc + Mã
  'Lộc Tồn': 'Thổ',
  'Thiên Mã': 'Hỏa',

  // Lục Sát
  'Kình Dương': 'Kim',
  'Đà La': 'Kim',
  'Hỏa Tinh': 'Hỏa',
  'Linh Tinh': 'Hỏa',
  'Địa Kiếp': 'Hỏa',
  'Địa Không': 'Hỏa',
  'Thiên Không': 'Hỏa',

  // Tứ Hóa
  'Hóa Lộc': 'Thổ',
  'Hóa Quyền': 'Mộc',
  'Hóa Khoa': 'Thủy',
  'Hóa Kỵ': 'Thủy',

  // Bộ sao lẻ phổ biến
  'Thiên Khốc': 'Thủy',
  'Thiên Hư': 'Thủy',
  'Thiên Đức': 'Hỏa',
  'Nguyệt Đức': 'Thổ',
  'Đào Hoa': 'Mộc',
  'Hồng Loan': 'Thủy',
  'Thiên Hỷ': 'Thủy',
  'Cô Thần': 'Hỏa',
  'Quả Tú': 'Hỏa',
  'Hoa Cái': 'Kim',
  'Kiếp Sát': 'Hỏa',
  'Phá Toái': 'Hỏa',
  'Long Trì': 'Thủy',
  'Phượng Các': 'Thổ',
  'Giải Thần': 'Kim',
  'Thiên Y': 'Mộc',
  'Thiên Trù': 'Thổ',
  'Thiên Tài': 'Mộc',
  'Thiên Thọ': 'Thổ',
  'Tam Thai': 'Thổ',
  'Bát Tọa': 'Thổ',
  'Ân Quang': 'Hỏa',
  'Thiên Quý': 'Thổ',
  'Thai Phụ': 'Thổ',
  'Phong Cáo': 'Thổ',
  'Thiên Hình': 'Hỏa',
  'Thiên Riêu': 'Thủy',
  'Thiên Quan': 'Thổ',
  'Thiên Phúc': 'Thổ',
  'Lưu Hà': 'Thủy',
  'Đường Phù': 'Thổ',
  'Quốc Ấn': 'Thổ',
  'Văn Tinh': 'Kim',
  'Đẩu Quân': 'Thổ',
  'Thiên Thương': 'Thủy',
  'Thiên Sứ': 'Thủy',
  'Thiên La': 'Thổ',
  'Địa Võng': 'Thổ',
  'Thiên Giải': 'Mộc',
  'Địa Giải': 'Mộc',
  'Lưu Niên Văn Tinh': 'Kim',
  'LN Văn Tinh': 'Kim',

  // Vòng Thái Tuế
  'Thái Tuế': 'Hỏa',
  'Thiếu Dương': 'Hỏa',
  'Tang Môn': 'Mộc',
  'Thiếu Âm': 'Thủy',
  'Quan Phù': 'Hỏa',
  'Tử Phù': 'Kim',
  'Tuế Phá': 'Hỏa',
  'Long Đức': 'Thủy',
  'Bạch Hổ': 'Kim',
  'Phúc Đức': 'Thổ',
  'Điếu Khách': 'Hỏa',
  'Trực Phù': 'Thổ',

  // Vòng Lộc Tồn
  'Bác Sỹ': 'Thủy',
  'Lực Sĩ': 'Hỏa',
  'Thanh Long': 'Thủy',
  'Tiểu Hao': 'Hỏa',
  'Tướng Quân': 'Mộc',
  'Tấu Thư': 'Kim',
  'Phi Liêm': 'Hỏa',
  'Hỷ Thần': 'Hỏa',
  'Bệnh Phù': 'Thổ',
  'Đại Hao': 'Hỏa',
  'Phục Binh': 'Hỏa',
  'Quan Phủ': 'Thổ',

  // Vòng Trường Sinh (Thủy ngũ hành mặc định)
  'Tràng Sinh': 'Thủy',
  'Mộc Dục': 'Thủy',
  'Quan Đới': 'Thủy',
  'Lâm Quan': 'Thủy',
  'Đế Vượng': 'Thủy',
  'Suy': 'Thủy',
  'Bệnh': 'Thủy',
  'Tử': 'Thủy',
  'Mộ': 'Thủy',
  'Tuyệt': 'Thủy',
  'Thai': 'Thủy',
  'Dưỡng': 'Thủy',
};

/**
 * Màu HEX theo ngũ hành — dùng cho text màu trên lá số
 */
export const ELEMENT_COLOR: Record<FiveElement, string> = {
  Kim: '#f5f7fa',   // bạc trắng sáng
  Mộc: '#22d97e',   // xanh lá sáng
  Thủy: '#8ab4ff',  // xanh dương rất sáng để đọc rõ trên nền sáng
  Hỏa: '#ff9d8a',   // đỏ cam sáng — dễ đọc trên nền slate sáng
  Thổ: '#ffc94a',   // vàng cam
};

/**
 * Get color hex for a star by its name
 */
export function getStarColor(starName: string): string {
  // Sao Lưu ("L. ...") — tông sáng hơn cho dễ đọc (trước đây xám tối).
  if (starName.startsWith('L. ')) {
    return '#cdd9ee';
  }
  const element = STAR_ELEMENT[starName];
  if (!element) return '#d1d5db'; // fallback gray
  return ELEMENT_COLOR[element];
}

export function getElementOfStar(starName: string): FiveElement | undefined {
  const clean = starName.startsWith('L. ') ? starName.slice(3) : starName;
  return STAR_ELEMENT[clean];
}

/**
 * Tên các sao DÙNG ĐỂ TÔ MÀU trong văn bản (SimpleMarkdown).
 * Chỉ lấy tên có ≥2 âm tiết (có dấu cách) để TRÁNH tô nhầm các từ thường
 * (vd các sao Vòng Tràng Sinh 1 âm tiết: "Tử", "Mộ", "Bệnh", "Thai"… trùng
 * từ tiếng Việt thông dụng). Sắp xếp dài→ngắn để khớp tên dài trước.
 */
const COLORABLE_STAR_NAMES = Object.keys(STAR_ELEMENT)
  .filter(n => n.includes(' '))
  .sort((a, b) => b.length - a.length);

/** Regex khớp tên sao trong văn bản (global). Nhớ reset lastIndex trước khi dùng. */
export const STAR_NAME_REGEX = new RegExp(`(${COLORABLE_STAR_NAMES.join('|')})`, 'g');
