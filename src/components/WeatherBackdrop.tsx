/**
 * Nền động theo thời tiết cho màn Tổng quan (Home): từ đầu trang tới hết box "Hỏi Tuzi" nền
 * sáng/tối theo đúng thời tiết hiện tại, kèm hình ảnh minh họa đúng kiểu thời tiết (nắng: mặt
 * trời + mây trôi; mây: nhiều mây; mưa: mây + hạt mưa rơi; đêm quang: trăng + sao lấp lánh) —
 * rồi MỜ DẦN về đúng nền tối mặc định (COLORS.background/gradient của Screen) ở phía dưới, không
 * sáng chói toàn trang, chỉ vùng đầu trang.
 * Không có mạng / chưa có dữ liệu thời tiết → không hiện gì (giữ nguyên nền mặc định).
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, type LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useWeather, describeWeather } from '../lib/weather';

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

function moodOf(kind: ReturnType<typeof describeWeather>['kind'], isDay: boolean): Mood {
  if (kind === 'nắng') return isDay ? 'sunnyDay' : 'sunnyNight';
  if (kind === 'mây') return 'cloudy';
  if (kind === 'mưa') return 'rain';
  return 'other';
}

/** Sao lấp lánh (đêm quang) — vị trí cố định (%), tự nhấp nháy mờ/rõ lệch nhịp nhau. */
const STAR_POS = [
  { top: 18, left: '10%', size: 11 }, { top: 46, left: '28%', size: 7 },
  { top: 14, left: '52%', size: 9 }, { top: 70, left: '68%', size: 6 },
  { top: 30, left: '82%', size: 10 }, { top: 92, left: '18%', size: 6 },
  { top: 58, left: '42%', size: 5 }, { top: 100, left: '78%', size: 8 },
] as const;

function Star({ top, left, size, delay }: { top: number; left: string; size: number; delay: number }) {
  const opacity = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 1400, delay, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [delay, opacity]);
  return <Animated.Text style={[s.star, { top, left: left as any, fontSize: size, opacity }]}>✦</Animated.Text>;
}

const RAIN_COUNT = 14;

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Hạt mưa rơi — vị trí ngang (left) và độ cao bắt đầu random LẠI mỗi lần rơi (không phải 1 lần
 * lúc mount) nên không bao giờ rơi thành hàng đều/lặp lại y hệt nhau. Dùng vòng lặp animation thủ
 * công (start() → callback → random lại → start() tiếp) thay vì Animated.loop(): Animated.loop()
 * chỉ lặp lại đúng animation cũ mà KHÔNG reset giá trị đầu về startTop — sau lần rơi đầu, các lần
 * sau animate từ (đã ở toValue) → cùng toValue nên không di chuyển nữa, khiến hạt mưa đứng khựng
 * ở cuối, nhìn như "dừng thành 1 hàng" (đúng lỗi anh Toàn gặp).
 */
function Raindrop({ maxLeft }: { maxLeft: number }) {
  const y = useRef(new Animated.Value(-20)).current;
  const [left, setLeft] = useState(() => randomBetween(0, maxLeft));

  useEffect(() => {
    let cancelled = false;
    const fall = () => {
      if (cancelled) return;
      setLeft(randomBetween(0, maxLeft));
      y.setValue(randomBetween(-160, -10));
      Animated.timing(y, {
        toValue: OVERLAY_HEIGHT * 0.72,
        duration: randomBetween(850, 1400),
        delay: randomBetween(0, 500),
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => { if (finished) fall(); });
    };
    fall();
    return () => { cancelled = true; y.stopAnimation(); };
  }, [maxLeft, y]);

  return <Animated.View style={[s.raindrop, { left, transform: [{ translateY: y }, { rotate: '12deg' }] }]} />;
}

function RainLayer({ maxLeft }: { maxLeft: number }) {
  return (
    <>
      {Array.from({ length: RAIN_COUNT }, (_, i) => <Raindrop key={i} maxLeft={maxLeft} />)}
    </>
  );
}

function Cloud({ top, left, size, opacity }: { top: number; left: string; size: number; opacity: number }) {
  return <Text style={[s.cloud, { top, left: left as any, fontSize: size, opacity }]}>☁️</Text>;
}

export default function WeatherBackdrop() {
  const { weather } = useWeather();
  const [width, setWidth] = useState(360);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  if (!weather) return null;
  const d = describeWeather(weather.now.code, weather.now.isDay);
  const mood = moodOf(d.kind, weather.now.isDay);
  const colors = MOOD_COLORS[mood];

  return (
    <View onLayout={onLayout} style={[StyleSheet.absoluteFill, { height: OVERLAY_HEIGHT, overflow: 'hidden' }]} pointerEvents="none">
      <LinearGradient colors={colors} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />

      {mood === 'sunnyDay' && (
        <>
          <Text style={s.sun}>☀️</Text>
          <Cloud top={210} left="4%" size={58} opacity={0.32} />
          <Cloud top={250} left="52%" size={46} opacity={0.26} />
          <Cloud top={160} left="70%" size={38} opacity={0.20} />
        </>
      )}

      {mood === 'sunnyNight' && (
        <>
          <Text style={s.moon}>🌙</Text>
          {STAR_POS.map((p, i) => <Star key={i} top={p.top} left={p.left} size={p.size} delay={i * 210} />)}
        </>
      )}

      {mood === 'cloudy' && (
        <>
          <Cloud top={30} left="6%" size={64} opacity={0.30} />
          <Cloud top={110} left="46%" size={52} opacity={0.24} />
          <Cloud top={190} left="14%" size={44} opacity={0.20} />
          <Cloud top={70} left="74%" size={40} opacity={0.18} />
        </>
      )}

      {mood === 'rain' && (
        <>
          <Cloud top={16} left="8%" size={60} opacity={0.32} />
          <Cloud top={40} left="56%" size={44} opacity={0.24} />
          <RainLayer maxLeft={Math.max(width - 4, 40)} />
        </>
      )}

      {mood === 'other' && <Text style={s.plainEmoji}>{d.emoji}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  sun: { position: 'absolute', top: 4, right: -8, fontSize: 130, opacity: 0.22 },
  moon: { position: 'absolute', top: 8, right: -4, fontSize: 110, opacity: 0.20 },
  cloud: { position: 'absolute' },
  star: { position: 'absolute', color: '#FFF7DE' },
  raindrop: { position: 'absolute', top: 0, width: 2, height: 16, borderRadius: 1, backgroundColor: 'rgba(210,228,255,0.30)' },
  plainEmoji: { position: 'absolute', top: 8, right: -6, fontSize: 120, opacity: 0.16 },
});
