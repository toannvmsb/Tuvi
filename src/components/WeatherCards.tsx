/**
 * Khối thời tiết dùng chung:
 *  - WeatherCard: thẻ nhỏ cho Tổng quan — hiện tại, cao/thấp nhất, ẩm, xác suất mưa + dải 5 ngày tới.
 *  - WeatherForDate: 1 dòng cho màn Xem ngày / Sự kiện — thời tiết đúng ngày đang xem (nếu nằm trong 16 ngày tới).
 * Không có mạng / lỗi → tự ẩn (không làm hỏng màn chính).
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../constants/theme';
import { Card, Eyebrow } from '../ui';
import { useWeather, dayForecast, describeWeather, type Weather } from '../lib/weather';

const WEEK = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function shortPlace(name: string): string {
  return name.split(',')[0];
}

export function WeatherCard() {
  const { weather, place, loading } = useWeather();
  if (loading) return null;
  if (!weather) return null;
  const today = weather.days[0];
  const d = describeWeather(weather.now.code, weather.now.isDay);
  return (
    <Card style={{ gap: 12, paddingVertical: 14 }}>
      <View style={s.head}>
        <Eyebrow>{`Thời tiết · ${shortPlace(place.name)}`}</Eyebrow>
        <Text style={s.desc}>{d.label}</Text>
      </View>
      <View style={s.mainRow}>
        <Text style={s.emoji}>{d.emoji}</Text>
        <Text style={s.temp}>{weather.now.temp}°</Text>
        <View style={{ flex: 1, gap: 3 }}>
          {today && <Text style={s.line}>Cao nhất {today.tmax}° · Thấp nhất {today.tmin}°</Text>}
          <Text style={s.line}>Độ ẩm {weather.now.humidity}% · Khả năng mưa {weather.now.rainProb}%</Text>
        </View>
      </View>
      <View style={s.strip}>
        {weather.days.slice(1, 6).map(day => {
          const dt = new Date(day.date + 'T00:00:00');
          const w = describeWeather(day.code);
          return (
            <View key={day.date} style={s.dayCol}>
              <Text style={s.dayName}>{WEEK[dt.getDay()]} {dt.getDate()}</Text>
              <Text style={s.dayEmoji}>{w.emoji}</Text>
              <Text style={s.dayTemp}>{day.tmax}°<Text style={s.dayTempLow}> {day.tmin}°</Text></Text>
              <Text style={[s.dayRain, day.rainProb >= 50 && { color: COLORS.blue }]}>{day.rainProb}%</Text>
            </View>
          );
        })}
      </View>
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
