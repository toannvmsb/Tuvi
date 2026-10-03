/**
 * Thanh tiến trình % khi khởi động app (thay cho vòng xoay chờ).
 * Trong lúc dữ liệu đang tải (`done=false`) thanh chạy tiệm cận ~90% theo thời
 * gian. Khi tải xong (`done=true`) thanh nhảy lên 100% rồi gọi `onFinish` để
 * parent ẩn màn chờ và vào app.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { COLORS, FONTS, SPACING } from '../constants/theme';

export default function StartupProgress({
  done,
  onFinish,
}: {
  done: boolean;
  onFinish?: () => void;
}) {
  const [pct, setPct] = useState(5);
  const anim = useRef(new Animated.Value(0.05)).current;
  const finished = useRef(false);

  // Pha 1: bò tiệm cận ~90% trong khi chờ.
  useEffect(() => {
    if (done) return;
    let p = 5;
    const id = setInterval(() => {
      p = p + Math.max(1, (90 - p) * 0.12);
      if (p > 90) p = 90;
      setPct(Math.round(p));
      Animated.timing(anim, {
        toValue: p / 100, duration: 220,
        easing: Easing.out(Easing.quad), useNativeDriver: false,
      }).start();
    }, 240);
    return () => clearInterval(id);
  }, [done, anim]);

  // Pha 2: tải xong → chạy nốt lên 100% rồi báo parent.
  useEffect(() => {
    if (!done || finished.current) return;
    finished.current = true;
    setPct(100);
    Animated.timing(anim, {
      toValue: 1, duration: 320,
      easing: Easing.out(Easing.cubic), useNativeDriver: false,
    }).start(() => {
      setTimeout(() => onFinish?.(), 160);
    });
  }, [done, anim, onFinish]);

  const widthInterp = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.screen}>
      <View style={styles.box}>
        <Text style={styles.brand}>Trợ lý tử vi của bạn</Text>
        <Text style={styles.label}>Đang tải dữ liệu cho ứng dụng</Text>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, { width: widthInterp }]} />
        </View>
        <Text style={styles.pct}>{pct}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  box: { width: '100%', maxWidth: 360, gap: SPACING.sm, alignItems: 'center' },
  brand: { color: COLORS.gold, fontSize: FONTS.size.xl, fontWeight: '800', letterSpacing: 1, marginBottom: SPACING.sm },
  label: { color: COLORS.textPrimary, fontSize: FONTS.size.md, fontWeight: '700' },
  track: {
    width: '100%', height: 12, borderRadius: 7, overflow: 'hidden',
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  fill: { height: '100%', backgroundColor: COLORS.gold, borderRadius: 7 },
  pct: { color: COLORS.gold, fontSize: FONTS.size.sm, fontWeight: '800' },
});
