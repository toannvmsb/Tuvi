/**
 * Thanh tiến trình % cho lúc chờ AI phân tích.
 * AI không trả progress thực, nên thanh chạy theo thời gian (tiệm cận ~95%)
 * để người dùng biết hệ thống đang chạy và yên tâm chờ. Khi có kết quả,
 * component bị unmount (parent đổi trạng thái) — coi như đạt 100%.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { COLORS, FONTS, SPACING } from '../constants/theme';

export default function AIProgressBar({ label }: { label?: string }) {
  const [pct, setPct] = useState(3);
  const anim = useRef(new Animated.Value(0.03)).current;

  useEffect(() => {
    let p = 3;
    const id = setInterval(() => {
      // Tiệm cận 95%: lúc đầu nhanh, càng về sau càng chậm (giống tải thật).
      p = p + Math.max(0.4, (95 - p) * 0.045);
      if (p > 95) p = 95;
      const v = Math.round(p);
      setPct(v);
      Animated.timing(anim, {
        toValue: p / 100,
        duration: 380,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
    }, 420);
    return () => clearInterval(id);
  }, [anim]);

  const widthInterp = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{label || 'AI đang phân tích…'}</Text>
        <Text style={styles.pct}>{pct}%</Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width: widthInterp }]} />
      </View>
      <Text style={styles.hint}>Đang luận giải chuyên sâu, vui lòng đợi trong giây lát…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: SPACING.xs, paddingVertical: SPACING.sm },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: COLORS.textPrimary, fontSize: FONTS.size.sm, fontWeight: '700' },
  pct: { color: COLORS.gold, fontSize: FONTS.size.md, fontWeight: '800' },
  track: {
    height: 10, borderRadius: 6, overflow: 'hidden',
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  fill: { height: '100%', backgroundColor: COLORS.gold, borderRadius: 6 },
  hint: { color: COLORS.textSecondary, fontSize: FONTS.size.xs, fontStyle: 'italic' },
});
