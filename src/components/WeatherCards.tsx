/**
 * Khối thời tiết dùng chung:
 *  - WeatherCard: thẻ nhỏ cho Tổng quan — hiện tại, cao/thấp nhất, ẩm, xác suất mưa + dải 5 ngày tới.
 *  - WeatherForDate: 1 dòng cho màn Xem ngày / Sự kiện — thời tiết đúng ngày đang xem (nếu nằm trong 16 ngày tới).
 * Không có mạng / lỗi → tự ẩn (không làm hỏng màn chính).
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Icon from '../ui/Icon';
import { COLORS, FONTS } from '../constants/theme';
import { Card, Eyebrow } from '../ui';
import { useWeather, dayForecast, describeWeather, type Weather } from '../lib/weather';

const WEEK = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function shortPlace(name: string): string {
  return name.split(',')[0];
}

/** Thẻ thời tiết nhỏ cho Tổng quan: hôm nay — hiện tại, cao/thấp, trạng thái, khả năng mưa, độ ẩm. */
export function WeatherMini({ onPress }: { onPress?: () => void }) {
  const { weather, place, loading } = useWeather();
  const today = weather?.days[0];
  const d = weather ? describeWeather(weather.now.code, weather.now.isDay) : null;
  return (
    <Card tint={COLORS.blue} style={m.card}>
      <Pressable onPress={onPress} disabled={!onPress} style={{ flex: 1, justifyContent: 'space-between', gap: 4 }} accessibilityRole="button" accessibilityLabel="Thời tiết hôm nay">
        <View style={m.head}>
          <Icon name="pin" size={16} color={COLORS.blue} />
          <Text style={m.place} numberOfLines={1}>{shortPlace(place.name).toUpperCase()}</Text>
        </View>
        {weather && d ? (
          <>
            <View style={m.tempRow}>
              <Text style={m.emoji}>{d.emoji}</Text>
              <Text style={m.temp}>{weather.now.temp}°</Text>
            </View>
            <View style={{ gap: 2 }}>
              <Text style={m.status} numberOfLines={1}>{d.label}{today ? ` · ${today.tmin}°–${today.tmax}°` : ''}</Text>
              <Text style={m.sub} numberOfLines={1}>Mưa {weather.now.rainProb}% · Ẩm {weather.now.humidity}%</Text>
            </View>
          </>
        ) : (
          <Text style={m.sub}>{loading ? 'Đang tải thời tiết…' : 'Chưa lấy được thời tiết (kiểm tra mạng).'}</Text>
        )}
      </Pressable>
    </Card>
  );
}

const DAY_MS = 86400000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/**
 * Thời tiết đầy đủ cho màn Xem theo ngày: ngày đang chọn + 5 ngày tiếp theo (nhiệt độ cao/thấp, trạng thái, mưa, ẩm).
 * Ngày đã qua hoặc quá xa (ngoài dự báo 16 ngày) → hiện dữ liệu gần nhất có được kèm câu ước lượng tương đối.
 */
export function WeatherPanel({ date }: { date: Date }) {
  const { weather, place, loading } = useWeather();
  if (loading) return null;
  if (!weather) return null;
  const first = new Date(weather.days[0].date + 'T00:00:00');
  const last = new Date(weather.days[weather.days.length - 1].date + 'T00:00:00');
  const sel = startOfDay(date);
  const past = sel < first;
  const far = sel > last;
  const inRange = !past && !far;

  // Cửa sổ 6 ngày bắt đầu từ ngày chọn; ngoài phạm vi thì lấy 6 ngày gần nhất có dữ liệu.
  let startIdx = 0;
  if (inRange) startIdx = Math.round((sel.getTime() - first.getTime()) / DAY_MS);
  else if (far) startIdx = Math.max(0, weather.days.length - 6);
  const rows = weather.days.slice(startIdx, startIdx + 6);

  let note: string | null = null;
  if (past) note = 'Ngày đã qua nên không còn dự báo. Đang hiển thị thời tiết những ngày gần đây nhất để tham khảo.';
  else if (far) {
    const diff = Math.round((sel.getTime() - last.getTime()) / DAY_MS);
    note = `Ngày này còn xa (quá ${diff} ngày so với dữ liệu dự báo) nên chưa có dự báo chính xác. Thời tiết thường gần với những ngày cuối dự báo bên dưới, nhưng có thể khác — chỉ mang tính ước lượng tương đối.`;
  } else if (rows.length < 6) {
    note = 'Các ngày sau nữa chưa có dự báo (dữ liệu chỉ có 16 ngày tới).';
  }

  return (
    <Card tint={COLORS.blue} style={{ gap: 12 }}>
      <View style={s.head}>
        <Eyebrow color={COLORS.blue}>{`Thời tiết · ${shortPlace(place.name)}`}</Eyebrow>
        <Text style={s.desc}>{inRange ? 'Từ ngày đang chọn' : 'Gần nhất có dữ liệu'}</Text>
      </View>
      {rows.map((day, i) => {
        const dt = new Date(day.date + 'T00:00:00');
        const w = describeWeather(day.code);
        const isSel = inRange && i === 0;
        return (
          <View key={day.date} style={[p.row, isSel && p.rowSel]}>
            <View style={{ width: 54 }}>
              <Text style={p.dayName}>{WEEK[dt.getDay()]}</Text>
              <Text style={p.dayDate}>{dt.getDate()}/{dt.getMonth() + 1}</Text>
            </View>
            <Text style={p.emoji}>{w.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={p.status} numberOfLines={1}>{w.label}</Text>
              <Text style={p.meta} numberOfLines={1}>Mưa {day.rainProb}% · Ẩm {day.humidity}%</Text>
            </View>
            <Text style={p.temp}>{day.tmax}°<Text style={p.tempLow}> / {day.tmin}°</Text></Text>
          </View>
        );
      })}
      {note && <Text style={p.note}>{note}</Text>}
    </Card>
  );
}

/** Thời tiết đúng ngày `date` (theo địa điểm của lá số / Hà Nội). Ngoài dự báo 16 ngày → không hiện. */
export function WeatherForDate({ date, weather: given }: { date: Date; weather?: Weather | null }) {
  const own = useWeather();
  const weather = given ?? own.weather;
  const f = dayForecast(weather, date);
  if (!weather || !f) return null;
  const w = describeWeather(f.code);
  return (
    <View style={s.dateBox}>
      <Text style={s.dateEmoji}>{w.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={s.dateTitle}>{w.label} · {f.tmin}° – {f.tmax}°</Text>
        <Text style={s.dateSub}>{`Ẩm ${f.humidity}% · Khả năng mưa ${f.rainProb}% · ${shortPlace(weather.place.name)}`}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  desc: { fontFamily: FONTS.bodySemi, fontSize: 12.5, color: COLORS.textSecondary },
  mainRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emoji: { fontSize: 34 },
  temp: { fontFamily: FONTS.display, fontSize: 40, lineHeight: 44, color: COLORS.textPrimary },
  line: { fontFamily: FONTS.body, fontSize: 12.5, color: COLORS.textSecondary },
  strip: { flexDirection: 'row', gap: 6, borderTopWidth: 1, borderTopColor: 'rgba(226,194,133,0.14)', paddingTop: 10 },
  dayCol: { flex: 1, alignItems: 'center', gap: 2 },
  dayName: { fontFamily: FONTS.bodySemi, fontSize: 11, color: COLORS.textMuted },
  dayEmoji: { fontSize: 20 },
  dayTemp: { fontFamily: FONTS.bodySemi, fontSize: 12.5, color: COLORS.textPrimary },
  dayTempLow: { color: COLORS.textMuted, fontFamily: FONTS.body },
  dayRain: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.textMuted },
  dateBox: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16,
    backgroundColor: 'rgba(127,182,240,0.09)', borderWidth: 1, borderColor: 'rgba(127,182,240,0.28)',
  },
  dateEmoji: { fontSize: 26 },
  dateTitle: { fontFamily: FONTS.bodySemi, fontSize: 14, color: COLORS.textPrimary },
  dateSub: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
});

const m = StyleSheet.create({
  card: { flex: 1, minHeight: 136, padding: 10, borderRadius: 20 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  place: { flex: 1, fontFamily: FONTS.bodyBold, fontSize: 11.5, letterSpacing: 1.6, color: COLORS.blue },
  tempRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emoji: { fontSize: 40 },
  temp: { fontFamily: FONTS.display, fontSize: 48, lineHeight: 50, color: COLORS.textPrimary },
  status: { fontFamily: FONTS.bodySemi, fontSize: 12.5, color: COLORS.textPrimary },
  sub: { fontFamily: FONTS.body, fontSize: 11.5, color: COLORS.textSecondary },
});

const p = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 12 },
  rowSel: { backgroundColor: 'rgba(127,182,240,0.16)', borderWidth: 1, borderColor: 'rgba(127,182,240,0.45)' },
  dayName: { fontFamily: FONTS.bodySemi, fontSize: 12.5, color: COLORS.textPrimary },
  dayDate: { fontFamily: FONTS.body, fontSize: 11.5, color: COLORS.textMuted },
  emoji: { fontSize: 24 },
  status: { fontFamily: FONTS.bodySemi, fontSize: 13, color: COLORS.textPrimary },
  meta: { fontFamily: FONTS.body, fontSize: 11.5, color: COLORS.textSecondary },
  temp: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.textPrimary },
  tempLow: { fontFamily: FONTS.body, color: COLORS.textMuted },
  note: { fontFamily: FONTS.body, fontSize: 12, lineHeight: 18, color: COLORS.textSecondary, fontStyle: 'italic' },
});
