/**
 * Bộ nhân vật đại diện (Home + Tài khoản) — PHƯƠNG ÁN A: ảnh 3D dựng sẵn
 * (không dựng/tuỳ biến mô hình 3D thời gian thực — đó là phương án B).
 *
 * Ảnh lấy từ bộ "Fluent Emoji — 3D style" của Microsoft (giấy phép MIT, dùng
 * thương mại tự do): https://github.com/microsoft/fluentui-emoji — đã tải về
 * cục bộ tại assets/avatars/, không phụ thuộc mạng khi chạy app.
 */
export interface AvatarOption {
  id: string;
  label: string;
  /** Cặp màu dùng cho hào quang/viền động phía sau ảnh — không phải màu ảnh. */
  colors: [string, string];
  image: number;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: 'sao-mai', label: 'Sao Mai', colors: ['#e8b34d', '#f6d992'], image: require('../../assets/avatars/sao-mai.png') },
  { id: 'nguyet-quang', label: 'Nguyệt Quang', colors: ['#9b8cff', '#c3b8ff'], image: require('../../assets/avatars/nguyet-quang.png') },
  { id: 'phuong-hoang', label: 'Phượng Hoàng', colors: ['#ef7b8e', '#f6a8b6'], image: require('../../assets/avatars/phuong-hoang.png') },
  { id: 'cu-tri-tue', label: 'Cú Trí Tuệ', colors: ['#60a5fa', '#93c5fd'], image: require('../../assets/avatars/cu-tri-tue.png') },
  { id: 'than-tai', label: 'Thần Tài', colors: ['#f0c04d', '#fde68a'], image: require('../../assets/avatars/than-tai.png') },
  { id: 'sao-bang', label: 'Sao Băng', colors: ['#8b7bff', '#c3b8ff'], image: require('../../assets/avatars/sao-bang.png') },
  { id: 'hoa-sen', label: 'Hoa Sen', colors: ['#ff9fc9', '#ffd1e8'], image: require('../../assets/avatars/hoa-sen.png') },
  { id: 'cau-pha-le', label: 'Cầu Pha Lê', colors: ['#a78bfa', '#ddd6fe'], image: require('../../assets/avatars/cau-pha-le.png') },
  // 12 con giáp — cùng bộ Fluent Emoji 3D, dùng "Mèo" cho Mão theo văn hoá Việt Nam (khác "Rabbit" gốc).
  { id: 'ty-chuot', label: 'Tý — Chuột', colors: ['#c9c9c9', '#eeeeee'], image: require('../../assets/avatars/zodiac-mouse-face.png') },
  { id: 'suu-trau', label: 'Sửu — Trâu', colors: ['#7c8a99', '#b8c4cf'], image: require('../../assets/avatars/zodiac-ox.png') },
  { id: 'dan-ho', label: 'Dần — Hổ', colors: ['#f0a530', '#f8cf8d'], image: require('../../assets/avatars/zodiac-tiger-face.png') },
  { id: 'mao-meo', label: 'Mão — Mèo', colors: ['#f5b678', '#fbe0c0'], image: require('../../assets/avatars/zodiac-cat-face.png') },
  { id: 'thin-rong', label: 'Thìn — Rồng', colors: ['#4fbf7a', '#a6e6bf'], image: require('../../assets/avatars/zodiac-dragon-face.png') },
  { id: 'ty-ran', label: 'Tỵ — Rắn', colors: ['#6bbf7a', '#bfe6c6'], image: require('../../assets/avatars/zodiac-snake.png') },
  { id: 'ngo-ngua', label: 'Ngọ — Ngựa', colors: ['#b5814a', '#e0bd8f'], image: require('../../assets/avatars/zodiac-horse-face.png') },
  { id: 'mui-de', label: 'Mùi — Dê', colors: ['#e8e0d0', '#fbf7ef'], image: require('../../assets/avatars/zodiac-goat.png') },
  { id: 'than-khi', label: 'Thân — Khỉ', colors: ['#b98a5e', '#e0c19c'], image: require('../../assets/avatars/zodiac-monkey-face.png') },
  { id: 'dau-ga', label: 'Dậu — Gà', colors: ['#e0574f', '#f3a29c'], image: require('../../assets/avatars/zodiac-rooster.png') },
  { id: 'tuat-cho', label: 'Tuất — Chó', colors: ['#c9a06a', '#ecd5ab'], image: require('../../assets/avatars/zodiac-dog-face.png') },
  { id: 'hoi-lon', label: 'Hợi — Lợn', colors: ['#f0a1b0', '#fbd4dc'], image: require('../../assets/avatars/zodiac-pig-face.png') },
];

export const DEFAULT_AVATAR_ID = AVATAR_OPTIONS[0].id;

/** 'thanh-long' đã gỡ (trùng hình Thìn — Rồng): ai đã chọn thì chuyển sang Thìn — Rồng. */
const LEGACY_AVATAR_ID: Record<string, string> = { 'thanh-long': 'thin-rong' };

export function getAvatarOption(id?: string | null): AvatarOption {
  const key = (id && LEGACY_AVATAR_ID[id]) || id;
  return AVATAR_OPTIONS.find(a => a.id === key) ?? AVATAR_OPTIONS[0];
}
