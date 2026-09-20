/**
 * Ngôn ngữ thiết kế Tuzi — "đêm sao, vàng lá, dữ kiện rõ ràng".
 * Nguồn: bản thiết kế lại giao diện (canvas "Tuzi — Thiết kế lại giao diện Tử Vi").
 * Giữ NGUYÊN tên khóa cũ để các màn hình chưa chuyển vẫn dùng được, chỉ đổi giá trị.
 */
export const COLORS = {
  // Nền: đêm mực → tím than
  background: '#12132B',
  surface: '#1A1B3A',
  card: '#22244A',
  border: '#3D3F6B',
  // Vàng lá
  gold: '#E2C285',
  goldLight: '#FFE3A6',
  goldDeep: '#C9A24E',
  // Ngữ nghĩa
  red: '#E77B6B',
  blue: '#7FB6F0',
  green: '#7BC6A4',
  purple: '#B79CFF',
  // Chữ
  textPrimary: '#F3EBDC',
  textSecondary: '#C4C0D8',
  textMuted: '#9A97B0',
  // Lá số 12 cung
  cellBg: '#15172F',
  cellBgMenh: '#3B2F1D',
  starChinhTinh: '#FFE3A6',
  starCat: '#7FB6F0',
  starHung: '#E77B6B',
  starLuu: '#A8D168',
};

/** Ngũ hành (Bát Tự) — dùng chung cho mọi màn. */
export const ELEMENT_COLORS = {
  Kim: '#D8D8EA', Mộc: '#7BC6A4', Thủy: '#6FA8E8', Hỏa: '#E77B6B', Thổ: '#D9B26A',
} as const;

/** Tứ hóa — màu + chữ Hán huy hiệu. */
export const HOA_STYLE = {
  Lộc: { color: '#7BC6A4', glyph: '祿' },
  Quyền: { color: '#B79CFF', glyph: '權' },
  Khoa: { color: '#7FB6F0', glyph: '科' },
  Kỵ: { color: '#E77B6B', glyph: '忌' },
} as const;

/** Mức độ ngày: 5 bậc dùng cho lịch/heatmap. */
export const TIER_COLORS = {
  great: '#7BC6A4', good: '#9FD08E', normal: '#C4C0D8', caution: '#E2A24E', bad: '#E77B6B',
} as const;

/**
 * Font: Cormorant Garamond (tiêu đề, con số điểm) + Be Vietnam Pro (thân bài).
 * Tên family khớp với @expo-google-fonts — được nạp ở App.tsx (useFonts).
 * `regular`/`bold` giữ 'System' để màn cũ không đổi; màn mới dùng `body*`/`display*`.
 */
export const FONTS = {
  regular: 'System',
  bold: 'System',
  display: 'CormorantGaramond_600SemiBold',
  displayBold: 'CormorantGaramond_700Bold',
  displayItalic: 'CormorantGaramond_500Medium_Italic',
  body: 'BeVietnamPro_400Regular',
  bodyMedium: 'BeVietnamPro_500Medium',
  bodySemi: 'BeVietnamPro_600SemiBold',
  bodyBold: 'BeVietnamPro_700Bold',
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    title: 30,
  },
};

/** Màu ô lịch theo mức ngày (kiểu bản thiết kế, sáng hơn): nền mờ + viền + màu chấm chú giải. */
export const CAL_TONE: Record<'tốt' | 'khá' | 'trung bình' | 'thận trọng' | 'xấu', { bg: string; border: string; dot: string }> = {
  'tốt':        { bg: TIER_COLORS.great   + '66', border: TIER_COLORS.great   + 'DD', dot: TIER_COLORS.great },
  'khá':        { bg: TIER_COLORS.good    + '55', border: TIER_COLORS.good    + 'CC', dot: TIER_COLORS.good },
  'trung bình': { bg: TIER_COLORS.normal  + '40', border: TIER_COLORS.normal  + 'AA', dot: TIER_COLORS.normal },
  'thận trọng': { bg: TIER_COLORS.caution + '5A', border: TIER_COLORS.caution + 'DD', dot: TIER_COLORS.caution },
  'xấu':        { bg: TIER_COLORS.bad     + '5A', border: TIER_COLORS.bad     + 'DD', dot: TIER_COLORS.bad },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const RADIUS = { sm: 10, md: 14, lg: 20, xl: 24, pill: 999 };

/** Nền lớp kính (card) và viền vàng mảnh dùng lặp lại ở thiết kế mới. */
export const SURFACE = {
  glass: 'rgba(255,255,255,0.05)',
  glassStrong: 'rgba(255,255,255,0.08)',
  hairline: 'rgba(226,194,133,0.18)',
  hairlineStrong: 'rgba(226,194,133,0.34)',
};
