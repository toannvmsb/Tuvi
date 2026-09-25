/**
 * Nền động theo thời tiết cho màn Tổng quan (Home): từ đầu trang tới hết box "Hỏi Tuzi" nền
 * sáng/tối theo đúng thời tiết hiện tại (nắng ấm áp, mưa dịu tối, mây trung tính, đêm quang ánh
 * trăng...), rồi MỜ DẦN về đúng nền tối mặc định (COLORS.background/gradient của Screen) ở phía
 * dưới — không sáng chói toàn trang, chỉ vùng đầu trang.
 * Không có mạng / chưa có dữ liệu thời tiết → không hiện gì (giữ nguyên nền mặc định).
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useWeather } from '../lib/weather';
import { describeWeather } from '../lib/weather';

/** Vùng nền phía trên cao bao nhiêu (áng chừng tới hết box "Hỏi Tuzi" ở đầu Tổng quan). */
const OVERLAY_HEIGHT = 380;

type Mood = 'sunnyDay' | 'sunnyNight' | 'cloudy' | 'rain' | 'other';

/** 3 điểm dừng: đậm nhất ở đỉnh trang → mờ dần → trong suốt hẳn (lộ nền tối mặc định bên dưới). */
const MOOD_COLORS: Record<Mood, [string, string, string]> = {
  sunnyDay: ['rgba(255,186,92,0.50)', 'rgba(255,150,64,0.20)', 'rgba(255,150,64,0)'],
  sunnyNight: ['rgba(130,150,225,0.30)', 'rgba(95,105,180,0.12)', 'rgba(95,105,180,0)'],
  cloudy: ['rgba(150,166,190,0.28)', 'rgba(130,146,175,0.11)', 'rgba(130,146,175,0)'],
  rain: ['rgba(70,96,142,0.42)', 'rgba(58,84,128,0.17)', 'rgba(58,84,128,0)'],
  other: ['rgba(160,170,185,0.24)', 'rgba(150,160,175,0.10)', 'rgba(150,160,175,0)'],
};

function moodOf(code: number, isDay: boolean, kind: ReturnType<typeof describeWeather>['kind']): Mood {
  if (kind === 'nắng') return isDay ? 'sunnyDay' : 'sunnyNight';
  if (kind === 'mây') return 'cloudy';
  if (kind === 'mưa') return 'rain';
  return 'other';
}

export default function WeatherBackdrop() {
  const { weather } = useWeather();
  if (!weather) return null;
  const d = describeWeather(weather.now.code, weather.now.isDay);
  const mood = moodOf(weather.now.code, weather.now.isDay, d.kind);
  const colors = MOOD_COLORS[mood];

  return (
    <View style={[StyleSheet.absoluteFill, { height: OVERLAY_HEIGHT }]} pointerEvents="none">
      <LinearGradient colors={colors} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <Text style={s.emoji}>{d.emoji}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  emoji: { position: 'absolute', top: 8, right: -6, fontSize: 130, opacity: 0.16 },
});
