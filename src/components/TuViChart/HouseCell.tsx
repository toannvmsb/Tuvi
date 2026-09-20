/**
 * HouseCell — Một cung lá số. Cell hình chữ nhật đứng (h > w).
 *
 * Layout:
 *   ┌──────────────────────────────┐
 *   │  [TUẦN] [TRIỆT] (banner top) │
 *   │  Tuổi · CUNG NAME · [THÂN]   │  ← header
 *   │                              │
 *   │       Chính Tinh (M)         │  ← chính tinh: lớn, gold-bold, giữa
 *   │       Chính Tinh (V)         │
 *   │ ─────────────────────────────│
 *   │ Phụ Cát        │  Phụ Hung   │  ← phụ tinh: 2 cột, font nhỏ
 *   │ ...            │  ...        │
 *   │                              │
 *   │   vòng sao (italic xám)      │
 *   │   lưu sao (faded)            │
 *   │ ─────────────────────────────│
 *   │ Can.Chi              VTS     │  ← footer
 *   └──────────────────────────────┘
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { TuViHouse, StarEntry } from '../../types';
import { COLORS } from '../../constants/theme';
import { getStarColor } from '../../data/starElements';

interface Props {
  house: TuViHouse;
  width: number;
  height: number;
  showLuuStars?: boolean;
  /** true (web/iPad): chữ scale 85% theo kích thước lá số. false/bỏ trống (iPhone): tỷ lệ gốc. */
  scaled?: boolean;
}

// Vòng sao classified as cát hay hung (theo nghĩa truyền thống)
const VONG_HUNG = new Set([
  // Vòng Thái Tuế — hung & trung sát tinh
  'Thái Tuế', 'Tang Môn', 'Quan Phù', 'Tử Phù', 'Tuế Phá',
  'Bạch Hổ', 'Điếu Khách', 'Trực Phù',
  // Vòng Lộc Tồn — hung & sát tinh
  'Tiểu Hao', 'Đại Hao', 'Bệnh Phù', 'Quan Phủ', 'Phục Binh', 'Phi Liêm',
]);

function categorize(stars: StarEntry[]) {
  const chinh: StarEntry[] = [];
  const cat: StarEntry[] = [];
  const hung: StarEntry[] = [];
  const luu: StarEntry[] = [];

  for (const s of stars) {
    if (s.name.startsWith('L. ') || s.type === 'luu') { luu.push(s); continue; }
    if (s.type === 'chinh') { chinh.push(s); continue; }
    // Vòng sao trung tinh (type='trung'): phân vào hung nếu có trong VONG_HUNG, else cat
    if (s.type === 'trung') {
      if (VONG_HUNG.has(s.name)) hung.push(s);
      else cat.push(s);
      continue;
    }
    if (s.type === 'hung') { hung.push(s); continue; }
    cat.push(s);
  }
  return { chinh, cat, hung, luu };
}

function brightnessShort(b?: string): string {
  // Chỉ hiển thị M/V/Đ/H — bỏ qua 'bình hòa' (B) cho gọn
  switch (b) {
    case 'miếu': return 'M';
    case 'vượng': return 'V';
    case 'đắc': return 'Đ';
    case 'hãm': return 'H';
    default: return '';
  }
}

/** Độ sáng của sao → độ đậm chữ: miếu/vượng rõ nhất, hãm mờ nhất (như thiết kế mới). */
const BRIGHT_OPACITY: Record<string, number> = { 'miếu': 1, 'vượng': 1, 'đắc': 0.92, 'bình': 0.78, 'hãm': 0.6 };

function ChinhStar({ star, fontSize }: { star: StarEntry; fontSize: number }) {
  const color = getStarColor(star.name);
  const b = brightnessShort(star.brightness);
  const opacity = star.brightness ? (BRIGHT_OPACITY[star.brightness] ?? 1) : 1;
  return (
    <Text
      style={{
        color,
        opacity,
        fontSize,
        lineHeight: Math.round(fontSize * 1.2),
        fontWeight: '800',
        textAlign: 'center',
      }}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.7}
      ellipsizeMode="tail"
    >
      {star.name}{b ? ` (${b})` : ''}
    </Text>
  );
}

function PhuStar({ star, fontSize, align, tone }: {
  star: StarEntry; fontSize: number; align: 'left' | 'right'; tone: string;
}) {
  const color = tone;
  const b = brightnessShort(star.brightness);
  // Auto-shrink: nếu tên dài quá thì RN tự co font xuống min 60% — đảm bảo
  // hiển thị đầy đủ tên + suffix M/V/Đ/H trong 1 dòng.
  return (
    <Text
      style={{
        color,
        fontSize,
        lineHeight: Math.round(fontSize * 1.25),
        fontWeight: '500',
        textAlign: align,
      }}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.85}
      ellipsizeMode={b ? 'head' : 'tail'}
    >
      {star.name}{b ? ` (${b})` : ''}
    </Text>
  );
}

export default function HouseCell({ house, width, height, showLuuStars = false, scaled = false }: Props) {
  const { chinh, cat, hung, luu } = categorize(house.stars);

  // Font scaling:
  //  - iPhone (scaled=false): GIỮ NGUYÊN tỷ lệ gốc (ratio nhỏ + floor) như app cũ.
  //  - Web/iPad (scaled=true): chữ tăng bằng 85% mức tăng kích thước lá số (zoom).
  const BASE_CELL = 95;
  const fontScale = Math.max(1, 1 + 0.85 * (width / BASE_CELL - 1));
  const headerFs = scaled ? Math.round(7 * fontScale) : Math.max(7, Math.round(width * 0.055));
  const chinhFs  = scaled ? Math.round(9 * fontScale) : Math.max(9, Math.round(width * 0.072));
  const phuFs    = scaled ? Math.max(5, Math.round(5.3 * fontScale)) : Math.max(5, Math.round(width * 0.035));
  const luuFs    = scaled ? Math.round(5 * fontScale) : Math.max(5, Math.round(width * 0.038));
  const branchFs = scaled ? Math.round(8 * fontScale) : Math.max(8, Math.round(width * 0.06));

  // Estimate available height — line spacing chặt (1.2-1.25x)
  const headerH = headerFs * 1.4 + 10; // +10 for tuan/triet banner space
  const chinhH = chinh.length * (chinhFs * 1.2) + 2;
  const footerH = branchFs * 1.3 + 4;
  const luuH = (showLuuStars && luu.length > 0) ? luuFs * 1.4 + 3 : 0;
  const phuColH = Math.max(20, height - headerH - chinhH - footerH - luuH - 6);
  const phuLineH = phuFs * 1.25;
  const maxPhuPerCol = Math.max(4, Math.floor(phuColH / phuLineH));

  const showCat = cat.slice(0, maxPhuPerCol);
  const showHung = hung.slice(0, maxPhuPerCol);
  const showLuu = showLuuStars ? luu.slice(0, 4) : [];

  return (
    <View
      style={[
        styles.cell,
        { width, height },
        house.isManh && styles.cellMenh,
        house.isThan && styles.cellThan,
      ]}
    >
      {/* Tuần / Triệt banner */}
      {(house.tuanAt || house.trietAt) && (
        <View style={styles.tuanTrietBar}>
          {house.tuanAt && (
            <View style={styles.tuanFlag}>
              <Text style={styles.flagText}>TUẦN</Text>
            </View>
          )}
          {house.trietAt && (
            <View style={styles.trietFlag}>
              <Text style={styles.flagText}>TRIỆT</Text>
            </View>
          )}
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        {!!house.daiVanStartAge && (
          <Text style={[styles.dvAge, { fontSize: headerFs - 1 }]}>{house.daiVanStartAge}</Text>
        )}
        <Text
          style={[styles.palace, { fontSize: headerFs }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {house.palaceName}
        </Text>
        {house.isThan && (
          <Text style={[styles.thanChip, { fontSize: headerFs - 2 }]}>THÂN</Text>
        )}
      </View>

      {/* Chính tinh — nếu không có sao chính, hiển thị "(Không có)" placeholder */}
      <View style={styles.chinhBox}>
        {chinh.length > 0
          ? chinh.map((s, i) => <ChinhStar key={`c${i}`} star={s} fontSize={chinhFs} />)
          : (
            <Text
              style={{
                color: COLORS.textMuted,
                fontSize: chinhFs,
                fontStyle: 'italic',
                fontWeight: '500',
              }}
            >
              (Vô chính diệu)
            </Text>
          )
        }
      </View>

      {/* Phụ tinh: Cát LEFT — Hung RIGHT */}
      <View style={styles.twoCols}>
        <View style={styles.colCat}>
          {showCat.map((s, i) => <PhuStar key={`p${i}`} star={s} fontSize={phuFs} align="left" tone={COLORS.starCat} />)}
        </View>
        <View style={styles.colHung}>
          {showHung.map((s, i) => <PhuStar key={`h${i}`} star={s} fontSize={phuFs} align="right" tone={COLORS.starHung} />)}
        </View>
      </View>

      {/* Lưu sao */}
      {showLuu.length > 0 && (
        <View style={styles.luuRow}>
          {showLuu.map((s, i) => (
            <PhuStar key={`l${i}`} star={s} fontSize={luuFs} align="left" tone={COLORS.starLuu} />
          ))}
        </View>
      )}

      {/* Footer: Can.Chi (trái) — T.X tháng (giữa) — Vòng Trường Sinh (phải) */}
      <View style={styles.footer}>
        <Text style={[styles.footerBranch, { fontSize: branchFs }]}>
          {house.can.charAt(0)}.{house.branch}
        </Text>
        {!!house.monthIndex && (
          <Text style={[styles.footerMonth, { fontSize: phuFs }]}>
            T.{house.monthIndex}
          </Text>
        )}
        {!!house.vongTruongSinh && (
          <Text
            style={[styles.footerVTS, { fontSize: phuFs }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {house.vongTruongSinh}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    backgroundColor: COLORS.cellBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(226,194,133,0.28)',
    paddingHorizontal: 3,
    paddingVertical: 2,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'flex-start',
  },
  cellMenh: {
    borderColor: COLORS.gold,
    borderWidth: 1.5,
    backgroundColor: COLORS.cellBgMenh,
  },
  cellThan: {
    borderColor: COLORS.red,
    borderWidth: 2,
  },

  // Tuần / Triệt
  tuanTrietBar: {
    position: 'absolute',
    top: -1,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    zIndex: 10,
  },
  tuanFlag: {
    backgroundColor: COLORS.red,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  trietFlag: {
    backgroundColor: '#5B8DEF',
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  flagText: {
    color: '#1E1230',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(226,194,133,0.3)',
    paddingBottom: 1,
    marginBottom: 1,
    marginTop: 9, // chừa chỗ cho banner Tuần/Triệt
    minHeight: 14,
  },
  dvAge: {
    color: COLORS.purple,
    fontWeight: '800',
    minWidth: 16,
  },
  palace: {
    color: COLORS.gold,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  thanChip: {
    color: '#1E1230',
    backgroundColor: COLORS.red,
    paddingHorizontal: 3,
    paddingVertical: 1,
    fontWeight: '800',
    borderRadius: 3,
    marginLeft: 2,
  },

  // Chính tinh
  chinhBox: {
    alignItems: 'center',
    paddingVertical: 0,
    marginBottom: 1,
  },

  // 2 cột phụ tinh (Cát - Hung)
  twoCols: {
    flexDirection: 'row',
    flex: 1,
    gap: 4,
  },
  colCat: {
    flex: 1,
    alignItems: 'flex-start',
  },
  colHung: {
    flex: 1,
    alignItems: 'flex-end',
  },

  // Vòng sao
  vongRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 5,
    justifyContent: 'center',
    marginTop: 1,
  },

  // Lưu sao
  luuRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 4,
    marginTop: 1,
    paddingTop: 1,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(168,209,104,0.4)',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(226,194,133,0.3)',
    paddingTop: 1,
    marginTop: 1,
  },
  footerBranch: {
    color: COLORS.goldLight,
    fontWeight: '800',
  },
  footerMonth: {
    color: COLORS.textMuted,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  footerVTS: {
    color: COLORS.textMuted,
    fontWeight: '600',
    fontStyle: 'italic',
    textAlign: 'right',
    marginLeft: 4,
  },
});
