import React, { useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, AstrologyResult } from '../types';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { t } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { wallet } from '../constants/premium';
import { APP_VERSION, COPYRIGHT } from '../constants/appInfo';
import HeaderMenuButton from '../components/HeaderMenuButton';
import BrandLogo from '../components/BrandLogo';
import { getMyChartId } from '../lib/myChart';
import { listCharts, rowToResult } from '../lib/charts';
import { buildTodaySummary, type TodaySummary } from '../core/todaySummary';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const RATING_COLOR: Record<string, string> = {
  'Rất tốt': '#22c55e', 'Tốt': '#5fdb8a', 'Khá': '#a3d977',
  'Bình thường': COLORS.gold, 'Cần thận trọng': '#e0a23a', 'Xấu': '#ff7a7a',
};

export default function HomeScreen({ navigation }: Props) {
  const { online, user } = useAuth();
  const displayName = user?.displayName || (online ? '' : wallet.userName);
  const [summary, setSummary] = useState<TodaySummary | null>(null);
  const [myResult, setMyResult] = useState<AstrologyResult | null>(null);
  const lastTapRef = useRef<number>(0);

  const loadSummary = useCallback(async () => {
    let result: AstrologyResult | null = null;
    try {
      const id = await getMyChartId();
      if (id && online) {
        const rows = await listCharts();
        const row = rows.find(r => r.id === id);
        if (row) result = rowToResult(row);
      }
    } catch { /* dùng bản chung */ }
    setMyResult(result);
    setSummary(buildTodaySummary(result, new Date()));
  }, [online]);

  /** Nhấn đúp vào tóm tắt → mở Xem ngày của lá số của tôi. */
  const onTodayDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      lastTapRef.current = 0;
      if (myResult) {
        navigation.navigate('DailyView', { result: myResult });
      } else {
        Alert.alert('Chưa gắn lá số', 'Gắn lá số của bạn để có lời khuyên dành riêng cho bạn.');
      }
    } else {
      lastTapRef.current = now;
    }
  };

  /** Nhấn nút "Xem ngày xuất hành" → mở DayPicker; cần có lá số. */
  const goDayPicker = () => {
    if (myResult) {
      navigation.navigate('DayPicker', { result: myResult });
    } else {
      Alert.alert('Chưa gắn lá số', 'Gắn lá số của bạn để có lời khuyên dành riêng cho bạn.');
    }
  };

  useFocusEffect(useCallback(() => { loadSummary(); }, [loadSummary]));

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <LinearGradient colors={[COLORS.background, '#1a0a3a', COLORS.background]} style={styles.gradient}>
        <View style={styles.topBar}>
          <HeaderMenuButton />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <BrandLogo size={96} />
            <Text style={styles.title}>{t('homeTitle')}</Text>
            {displayName ? <Text style={styles.greeting}>Xin chào - {displayName}</Text> : null}
            <Text style={styles.subtitle}>{t('homeSubtitle')}</Text>
          </View>

          {/* Main CTA */}
          <TouchableOpacity style={styles.mainButton} onPress={() => navigation.navigate('Input')} activeOpacity={0.85}>
            <LinearGradient
              colors={['#8B6914', COLORS.gold, '#8B6914']}
              style={styles.mainButtonGradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              <Text style={styles.mainButtonText}>⊕  {t('newChart')}</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* TÓM TẮT NGÀY HÔM NAY — nhấn đúp để mở Xem theo ngày của lá số */}
          {summary && (
            <Pressable style={styles.todayCard} onPress={onTodayDoubleTap}>
              <View style={styles.todayHead}>
                <Text style={styles.todayTitle}>📅 Hôm nay · {summary.weekday}, {summary.dateLabel}</Text>
                <Text style={[styles.todayRating, { color: RATING_COLOR[summary.rating] || COLORS.gold }]}>{summary.rating}</Text>
              </View>
              <Text style={styles.blockLabel}>✅ Nên</Text>
              {summary.good.map((g, i) => <Text key={`g${i}`} style={styles.line}>• {g}</Text>)}

              <Text style={[styles.blockLabel, { color: '#ff9d8a' }]}>⛔ Hạn chế</Text>
              {summary.bad.map((b, i) => <Text key={`b${i}`} style={styles.line}>• {b}</Text>)}

              {(summary.goodHours.length > 0 || summary.badHours.length > 0) && (
                <>
                  <Text style={styles.blockLabel}>🕒 Khung giờ</Text>
                  {summary.goodHours.length > 0 && (
                    <Text style={styles.line}>• <Text style={{ color: COLORS.green, fontWeight: '700' }}>Tốt:</Text> {summary.goodHours.join(' · ')}</Text>
                  )}
                  {summary.badHours.length > 0 && (
                    <Text style={styles.line}>• <Text style={{ color: '#ff9d8a', fontWeight: '700' }}>Xấu:</Text> {summary.badHours.join(' · ')}</Text>
                  )}
                </>
              )}

              {summary.encourage && <Text style={styles.encourage}>💛 {summary.encourage}</Text>}

              {!summary.hasChart && (
                <TouchableOpacity onPress={() => navigation.navigate('MyCharts')} activeOpacity={0.8}>
                  <Text style={styles.cta}>📌 Gắn lá số của bạn để có lời khuyên dành riêng cho bạn →</Text>
                </TouchableOpacity>
              )}
              {summary.hasChart && (
                <Text style={styles.tapHint}>👆 Nhấn đúp để xem chi tiết theo ngày của lá số bạn</Text>
              )}
            </Pressable>
          )}

          {/* Hàng 2 nút chia đôi: Xem ngày xuất hành (trái) · Lá số đã lưu (phải) */}
          <View style={styles.twoBtnRow}>
            <TouchableOpacity style={[styles.halfBtn, styles.halfBtnLeft]} onPress={goDayPicker} activeOpacity={0.85}>
              <Text style={styles.halfBtnText}>🧭  Xem ngày tốt</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.halfBtn, styles.halfBtnRight]} onPress={() => navigation.navigate('MyCharts')} activeOpacity={0.85}>
              <Text style={styles.halfBtnText}>🗂️  Lá số đã lưu</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.version}>Phiên bản {APP_VERSION}</Text>
            <Text style={styles.copyright}>{COPYRIGHT}</Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  gradient: { flex: 1 },
  scroll: { padding: SPACING.xl, paddingTop: SPACING.xxl, alignItems: 'center', paddingBottom: SPACING.xl },
  topBar: { position: 'absolute', top: SPACING.sm, right: SPACING.md, zIndex: 50 },
  header: { alignItems: 'center', marginTop: SPACING.md },
  symbolCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: COLORS.card, borderWidth: 2, borderColor: COLORS.gold,
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm,
  },
  symbol: { fontSize: 36, color: COLORS.gold },
  title: { fontSize: FONTS.size.title, fontWeight: 'bold', color: COLORS.gold, textAlign: 'center' },
  greeting: { fontSize: FONTS.size.md, color: COLORS.goldLight, textAlign: 'center', marginTop: SPACING.xs, fontWeight: '700' },
  subtitle: { fontSize: FONTS.size.sm, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.xs, lineHeight: 20 },
  mainButton: { width: '100%', borderRadius: 16, overflow: 'hidden', marginVertical: SPACING.lg },
  mainButtonGradient: { padding: SPACING.lg, alignItems: 'center', borderRadius: 16 },
  mainButtonText: { fontSize: FONTS.size.xl, fontWeight: 'bold', color: '#1a0a00' },

  todayCard: {
    width: '100%', backgroundColor: COLORS.card, borderRadius: 14,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.gold, gap: 3,
  },
  todayHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  todayTitle: { color: COLORS.gold, fontSize: FONTS.size.md, fontWeight: '800', flex: 1 },
  todayRating: { fontSize: FONTS.size.md, fontWeight: '900' },
  todaySub: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, marginBottom: 4 },
  blockLabel: { color: '#5fdb8a', fontSize: FONTS.size.sm, fontWeight: '800', marginTop: SPACING.xs },
  line: { color: COLORS.textPrimary, fontSize: FONTS.size.sm, lineHeight: 20 },
  encourage: { color: COLORS.goldLight, fontSize: FONTS.size.sm, fontStyle: 'italic', lineHeight: 20, marginTop: SPACING.sm },
  cta: {
    color: COLORS.gold, fontSize: FONTS.size.sm, fontWeight: '700', fontStyle: 'italic',
    marginTop: SPACING.sm, textAlign: 'center',
  },

  savedBtn: {
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.gold, borderRadius: 8, marginTop: SPACING.lg, marginBottom: SPACING.sm,
  },
  savedBtnText: { color: COLORS.gold, fontSize: FONTS.size.md, fontWeight: '700' },
  tapHint: {
    color: COLORS.textMuted, fontSize: FONTS.size.xs, fontStyle: 'italic',
    textAlign: 'center', marginTop: SPACING.sm,
  },
  twoBtnRow: {
    flexDirection: 'row', gap: SPACING.sm,
    marginTop: SPACING.lg, marginBottom: SPACING.sm,
  },
  halfBtn: {
    flex: 1, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.gold, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', minHeight: 44,
  },
  halfBtnLeft: {},
  halfBtnRight: {},
  halfBtnText: { color: COLORS.gold, fontSize: FONTS.size.sm, fontWeight: '700' },
  footer: { alignItems: 'center', gap: 2, marginTop: SPACING.sm },
  version: { fontSize: FONTS.size.sm, color: COLORS.textSecondary, textAlign: 'center', fontWeight: '700' },
  copyright: { fontSize: FONTS.size.xs, color: COLORS.textMuted, textAlign: 'center' },
});
