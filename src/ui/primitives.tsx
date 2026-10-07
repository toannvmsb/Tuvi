/**
 * Bộ thành phần UI dùng chung của thiết kế mới (Card, Chip, nút vàng, chữ tiêu đề…).
 * Mỗi thành phần khớp 1-1 với mẫu trong bản thiết kế để màn hình mới chỉ việc ráp.
 */
import React from 'react';
import {
  View, Text, Pressable, StyleSheet, TextStyle, ViewStyle, StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { COLORS, FONTS, RADIUS, SURFACE, HOA_STYLE } from '../constants/theme';

/* ───────── Chữ ───────── */

export function Eyebrow({ children, color = COLORS.gold, style }: { children: React.ReactNode; color?: string; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.eyebrow, { color }, style]}>{String(children).toUpperCase()}</Text>;
}

export function Display({ children, size = 28, color = COLORS.textPrimary, style, numberOfLines }: {
  children: React.ReactNode; size?: number; color?: string; style?: StyleProp<TextStyle>; numberOfLines?: number;
}) {
  return <Text numberOfLines={numberOfLines} style={[{ fontFamily: FONTS.display, fontSize: size, lineHeight: size * 1.1, color }, style]}>{children}</Text>;
}

export function SectionTitle({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <View style={s.sectionRow}>
      <Display size={24}>{title}</Display>
      {right ?? (sub ? <Text style={s.sectionSub}>{sub}</Text> : null)}
    </View>
  );
}

export function Body({ children, size = 14, color = COLORS.textSecondary, style }: {
  children: React.ReactNode; size?: number; color?: string; style?: StyleProp<TextStyle>;
}) {
  return <Text style={[{ fontFamily: FONTS.body, fontSize: size, lineHeight: size * 1.55, color }, style]}>{children}</Text>;
}

/* ───────── Khối ───────── */

export function Card({ children, style, hero = false, tint }: {
  children: React.ReactNode; style?: StyleProp<ViewStyle>; hero?: boolean; tint?: string;
}) {
  if (hero) {
    return (
      <LinearGradient
        colors={['rgba(226,194,133,0.17)', 'rgba(120,90,220,0.11)', 'rgba(255,255,255,0.03)']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.card, s.cardHero, style]}
      >
        {children}
      </LinearGradient>
    );
  }
  return <View style={[s.card, tint ? { backgroundColor: tint + '14', borderColor: tint + '55' } : null, style]}>{children}</View>;
}

/** Chip lựa chọn (bộ lọc, nhãn). */
export function Chip({ label, active, onPress, color }: { label: string; active?: boolean; onPress?: () => void; color?: string }) {
  const c = color ?? COLORS.gold;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={[s.chip, active && { borderColor: c, backgroundColor: c + '2E' }]}
    >
      <Text style={[s.chipTxt, active && { color: COLORS.goldLight }]}>{label}</Text>
    </Pressable>
  );
}

/** Thanh chọn phân đoạn (Tử Vi | Bát Tự, Đại vận | Tiểu vận…). */
export function Segmented<T extends string>({ options, value, onChange }: {
  options: { value: T; label: React.ReactNode }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <View style={s.seg}>
      {options.map(o => {
        const on = o.value === value;
        const content = typeof o.label === 'string'
          ? <Text style={[s.segTxt, { color: on ? '#1E1230' : COLORS.textSecondary, fontFamily: on ? FONTS.bodyBold : FONTS.bodySemi }]}>{o.label}</Text>
          : o.label;
        return on ? (
          <LinearGradient key={o.value} colors={[COLORS.goldLight, COLORS.goldDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.segItem} accessibilityRole="button">
            {content}
          </LinearGradient>
        ) : (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={s.segItem} accessibilityRole="button">
            {content}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Nút chính màu vàng lá. */
export function GoldButton({ label, onPress, icon, style, disabled }: {
  label: string; onPress?: () => void; icon?: React.ReactNode; style?: StyleProp<ViewStyle>; disabled?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" style={[{ opacity: disabled ? 0.5 : 1 }, style]}>
      <LinearGradient colors={['#F5E0AE', COLORS.goldDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.goldBtn}>
        {icon}
        <Text style={s.goldBtnTxt}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

/** Nút viền vàng (phụ). */
export function OutlineButton({ label, onPress, style }: { label: string; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={[s.outlineBtn, style]}>
      <Text style={s.outlineBtnTxt}>{label}</Text>
    </Pressable>
  );
}

/* ───────── Biểu đồ nhỏ ───────── */

/** Vòng điểm 0–100 (Vận khí, Đại vận…). */
/** `color` (tùy chọn): tô vòng + số một màu đặc (vd màu theo mức ngày) thay cho gradient vàng mặc định. */
export function ScoreRing({ score, size = 104, stroke = 8, numberSize, color }: { score: number; size?: number; stroke?: number; numberSize?: number; color?: string }) {
  const r = size / 2 - stroke / 2 - 1;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const id = `ring${size}`;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#F5E0AE" />
            <Stop offset="1" stopColor={COLORS.goldDeep} />
          </SvgGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.09)" strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r} stroke={color ?? `url(#${id})`} strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={`${(c * pct) / 100} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ fontFamily: FONTS.displayBold, fontSize: numberSize ?? Math.round(size * 0.38), color: color ?? COLORS.goldLight, lineHeight: (numberSize ?? Math.round(size * 0.38)) * 1.05 }}>
          {Math.round(pct)}
        </Text>
        {size > 90 ? <Text style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.textMuted }}>/ 100</Text> : null}
      </View>
    </View>
  );
}

/** Thanh tiến độ mảnh. */
export function ProgressBar({ value, color = COLORS.gold, height = 6 }: { value: number; color?: string; height?: number }) {
  return (
    <View style={{ height, borderRadius: height, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(100, value))}%`, height, borderRadius: height, backgroundColor: color }} />
    </View>
  );
}

/** Huy hiệu Tứ hóa (祿 權 科 忌). */
export function HoaBadge({ kind, size = 38 }: { kind: keyof typeof HOA_STYLE; size?: number }) {
  const st = HOA_STYLE[kind];
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: st.color + '2E', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: st.color, fontSize: size * 0.52 }}>{st.glyph}</Text>
    </View>
  );
}

/** Ô "Lưu Tứ Hóa": huy hiệu + tên sao + cung. */
export function HoaTile({ kind, star, sub }: { kind: keyof typeof HOA_STYLE; star: string; sub: string }) {
  const c = HOA_STYLE[kind].color;
  return (
    <View style={[s.hoaTile, { backgroundColor: c + '1A', borderColor: c + '4D' }]}>
      <HoaBadge kind={kind} />
      <View style={{ flex: 1 }}>
        <Text style={s.hoaStar}>{star}</Text>
        <Text style={s.hoaSub}>{sub}</Text>
      </View>
    </View>
  );
}

/** Khối luận giải 4 lớp: Dữ kiện → Phân tích → Kết luận → Khuyến nghị. */
export function LayerBlock({ label, text }: { label: 'DỮ KIỆN' | 'PHÂN TÍCH' | 'KẾT LUẬN' | 'KHUYẾN NGHỊ'; text: string }) {
  const color = { 'DỮ KIỆN': COLORS.blue, 'PHÂN TÍCH': COLORS.purple, 'KẾT LUẬN': COLORS.gold, 'KHUYẾN NGHỊ': COLORS.green }[label];
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <View style={{ width: 4, borderRadius: 4, backgroundColor: color }} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 10.5, letterSpacing: 1.4, color }}>{label}</Text>
        <Text style={{ fontFamily: FONTS.body, fontSize: 13.5, lineHeight: 21, color: '#E6E2F2' }}>{text}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  eyebrow: { fontFamily: FONTS.bodySemi, fontSize: 11, letterSpacing: 1.8 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sectionSub: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted },
  card: {
    borderRadius: RADIUS.lg, padding: 16, borderWidth: 1,
    borderColor: SURFACE.hairline, backgroundColor: SURFACE.glass,
  },
  cardHero: { borderRadius: RADIUS.xl, borderColor: SURFACE.hairlineStrong, padding: 20 },
  chip: {
    minHeight: 44, paddingHorizontal: 16, borderRadius: RADIUS.pill, justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(226,194,133,0.25)', backgroundColor: SURFACE.glass,
  },
  chipTxt: { fontFamily: FONTS.bodySemi, fontSize: 13, color: COLORS.textSecondary },
  seg: {
    flexDirection: 'row', padding: 4, borderRadius: 16, height: 48,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(226,194,133,0.2)',
  },
  segItem: { flex: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  segTxt: { fontFamily: FONTS.bodySemi, fontSize: 13 },
  goldBtn: {
    height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: COLORS.gold, shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 6,
  },
  goldBtnTxt: { fontFamily: FONTS.bodyBold, fontSize: 16, color: '#1E1230' },
  outlineBtn: {
    minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18,
    borderWidth: 1, borderColor: 'rgba(226,194,133,0.4)',
  },
  outlineBtnTxt: { fontFamily: FONTS.bodySemi, fontSize: 14, color: '#F5E0AE' },
  hoaTile: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, borderWidth: 1, flex: 1 },
  hoaStar: { fontFamily: FONTS.bodyBold, fontSize: 13.5, color: COLORS.textPrimary },
  hoaSub: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
});
