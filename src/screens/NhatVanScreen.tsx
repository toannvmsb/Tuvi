/**
 * NHẬT VẬN — vận khí của 1 ngày theo lá số: điểm, Trực, Hoàng/Hắc Đạo, giờ tốt/tránh, nên & hạn chế,
 * dữ kiện, thời tiết. Đổi ngày trước/sau; luận giải AI và lịch chọn ngày nằm ở màn "Xem ngày".
 */
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONTS, TIER_COLORS } from '../constants/theme';
import { Screen, Card, Display, Eyebrow, Body, SectionTitle, ScoreRing, OutlineButton } from '../ui';
import VanTierHeader from '../ui/VanTierHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../ui/Icon';
import { WeatherForDate } from '../components/WeatherCards';
import { scoreNhatVan, goodBadHours, auspiciousHours, generateNhatVanOffline } from '../core/nhatVan';
import { solarToLunar } from '../core/lunarCalendar';
import type { AstrologyResult } from '../types';

const WEEKDAY = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const RATING_COLOR: Record<string, string> = {
  'Rất tốt': TIER_COLORS.great, 'Tốt': TIER_COLORS.good, 'Bình thường': TIER_COLORS.normal,
  'Cần thận trọng': TIER_COLORS.caution, 'Xấu': TIER_COLORS.bad,
};

const noon = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);

/** Lấy các dòng gạch đầu dòng ngay dưới một tiêu đề "# …" trong bản luận giải offline. */
function bulletsUnder(md: string, heading: string): string[] {
  const lines = md.split('\n');
  const i = lines.findIndex(l => l.trim() === `# ${heading}`);
  if (i < 0) return [];
  const out: string[] = [];
  for (let k = i + 1; k < lines.length; k++) {
    const t = lines[k].trim();
    if (!t || t.startsWith('#')) break;
    out.push(t.replace(/^-\s*/, '').replace(/\*\*/g, ''));
  }
  return out;
}

function Chip({ text, color }: { text: string; color: string }) {
  return (
    <View style={[s.chip, { backgroundColor: color + '24', borderColor: color + '77' }]}>
      <Text style={[s.chipTxt, { color }]}>{text}</Text>
    </View>
  );
}

export default function NhatVanScreen({ route }: any) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const result: AstrologyResult = route.params.result;
  const [date, setDate] = useState(() => noon(new Date()));

  const sc = useMemo(() => scoreNhatVan(result, date), [result, date]);
  const hours = useMemo(() => goodBadHours(result, date), [result, date]);
  const hoangDaoHours = useMemo(() => auspiciousHours(date), [date]);
  const md = useMemo(() => generateNhatVanOffline(result, date), [result, date]);
  const nen = bulletsUnder(md, 'Nên làm hôm nay');
  const han = bulletsUnder(md, 'Không nên làm hôm nay');
  const lunar = solarToLunar(date.getDate(), date.getMonth() + 1, date.getFullYear());
  const color = RATING_COLOR[sc.rating] ?? COLORS.gold;
  const isToday = noon(new Date()).getTime() === date.getTime();

  const shift = (n: number) => setDate(d => noon(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)));
  const dayLabel = (n: number) => (n < 0 ? (isToday ? 'Hôm qua' : 'Ngày trước') : (isToday ? 'Ngày mai' : 'Ngày sau'));

  return (
    <Screen gap={16} contentStyle={{ paddingTop: insets.top }} scroll>
      <View style={{ marginHorizontal: -16 }}><VanTierHeader active="nhat" result={result} /></View>

      <View style={s.dateRow}>
        <Pressable style={s.shiftBtn} onPress={() => shift(-1)} accessibilityRole="button">
          <Text style={s.shiftTxt}>‹ {dayLabel(-1)}</Text>
        </Pressable>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={s.dateBig}>{WEEKDAY[date.getDay()]} {date.getDate()}/{date.getMonth() + 1}</Text>
          <Text style={s.dateSub}>Mồng {lunar.day} tháng {lunar.month} âm lịch{lunar.isLeapMonth ? ' (nhuận)' : ''}</Text>
        </View>
        <Pressable style={s.shiftBtn} onPress={() => shift(1)} accessibilityRole="button">
          <Text style={s.shiftTxt}>{dayLabel(1)} ›</Text>
        </Pressable>
      </View>

      <WeatherForDate date={date} />

      <Card hero style={{ gap: 14 }}>
        <View style={s.heroHead}>
          <Eyebrow>{isToday ? 'Nhật vận hôm nay' : 'Nhật vận'}</Eyebrow>
          <Text style={s.heroSub}>Theo lá số của bạn</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <ScoreRing score={sc.score100} size={96} stroke={8} />
          <View style={{ flex: 1, gap: 8 }}>
            <Display size={28} color={color}>{sc.rating}</Display>
            <View style={s.chipRow}>
              <Chip text={`Trực ${sc.truc}`} color={COLORS.gold} />
              <Chip text={sc.hoangDao ? 'Hoàng Đạo' : 'Hắc Đạo'} color={sc.hoangDao ? TIER_COLORS.great : TIER_COLORS.caution} />
              <Chip text={`Tú ${sc.nhi28Tu}`} color={COLORS.purple} />
            </View>
            <Body size={12.5} style={{ lineHeight: 18 }}>
              {`Ngày ${sc.canChi.stem} ${sc.canChi.branch} · Can ${sc.canChi.stemEl} · Chi ${sc.canChi.branchEl}`}
            </Body>
          </View>
        </View>
      </Card>

      {sc.warnings.length > 0 && (
        <Card tint={COLORS.red} style={{ gap: 6 }}>
          <Eyebrow color={COLORS.red}>Lưu ý</Eyebrow>
          {sc.warnings.map((w, i) => <Body key={i} size={13} color={COLORS.textPrimary}>{w}</Body>)}
        </Card>
      )}

      <SectionTitle title="Khung giờ" sub="Theo dụng thần & Hoàng Đạo" />
      <Card style={{ gap: 12 }}>
        <View style={{ gap: 8 }}>
          <Text style={s.blockLabel}>Giờ tốt cho bạn</Text>
          <View style={s.chipRow}>
            {hours.good.length ? hours.good.map((h, i) => <Chip key={i} text={`${h.branch} · ${h.range}`} color={TIER_COLORS.great} />)
              : <Body size={13}>Không có khung giờ nổi bật.</Body>}
          </View>
        </View>
        <View style={{ gap: 8 }}>
          <Text style={s.blockLabel}>Giờ Hoàng Đạo</Text>
          <View style={s.chipRow}>
            {hoangDaoHours.map((h, i) => <Chip key={i} text={`${h.branch} · ${h.range}`} color={COLORS.gold} />)}
          </View>
        </View>
        {hours.bad.length > 0 && (
          <View style={{ gap: 8 }}>
            <Text style={s.blockLabel}>Giờ nên tránh việc quan trọng</Text>
            <View style={s.chipRow}>
              {hours.bad.map((h, i) => <Chip key={i} text={`${h.branch} · ${h.range}`} color={TIER_COLORS.bad} />)}
            </View>
          </View>
        )}
      </Card>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card tint={TIER_COLORS.great} style={{ flex: 1, gap: 8 }}>
          <Eyebrow color={TIER_COLORS.great}>Nên</Eyebrow>
          {nen.map((t, i) => <Text key={i} style={s.bullet}>• {t}</Text>)}
        </Card>
        <Card tint={TIER_COLORS.caution} style={{ flex: 1, gap: 8 }}>
          <Eyebrow color={TIER_COLORS.caution}>Hạn chế</Eyebrow>
          {han.map((t, i) => <Text key={i} style={s.bullet}>• {t}</Text>)}
        </Card>
      </View>

      <SectionTitle title="Dữ kiện của ngày" sub="Miễn phí" />
      <Card style={{ gap: 8 }}>
        {sc.reasons.map((r, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
            <View style={[s.dot, { backgroundColor: color }]} />
            <Body size={13.5} style={{ flex: 1 }}>{r}</Body>
          </View>
        ))}
      </Card>

      <Pressable style={s.linkRow} onPress={() => navigation.navigate('Notes')} accessibilityRole="button">
        <View style={s.linkIcon}><Icon name="note" size={20} color={COLORS.gold} /></View>
        <Text style={s.linkTxt}>Ghi chú cho ngày này</Text>
        <Icon name="chev" size={18} color={COLORS.textMuted} />
      </Pressable>
      <OutlineButton label="Luận giải AI & lịch chọn ngày" onPress={() => navigation.navigate('DailyView', { result })} />
      <Text style={s.disclaimer}>Luận giải là xu hướng và gợi ý hành động, không phải định mệnh.</Text>
    </Screen>
  );
}

const s = StyleSheet.create({
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  shiftBtn: {
    minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(226,194,133,0.2)',
  },
  shiftTxt: { fontFamily: FONTS.bodySemi, fontSize: 12.5, color: COLORS.goldLight },
  dateBig: { fontFamily: FONTS.display, fontSize: 24, color: COLORS.textPrimary },
  dateSub: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textSecondary },
  heroHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroSub: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textSecondary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  chipTxt: { fontFamily: FONTS.bodySemi, fontSize: 12 },
  blockLabel: { fontFamily: FONTS.bodySemi, fontSize: 13, color: COLORS.textPrimary },
  bullet: { fontFamily: FONTS.body, fontSize: 12.5, lineHeight: 19, color: COLORS.textPrimary },
  dot: { width: 7, height: 7, borderRadius: 4, marginTop: 8 },
  linkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, padding: 12, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(226,194,133,0.18)',
  },
  linkIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(226,194,133,0.15)' },
  linkTxt: { flex: 1, fontFamily: FONTS.bodySemi, fontSize: 14.5, color: COLORS.textPrimary },
  disclaimer: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted, textAlign: 'center' },
});
