/**
 * Màn hình XEM THEO NGÀY — chọn 1 ngày, xem ngày đó với lá số nên/không nên làm,
 * ăn gì, mặc gì, hướng nào…
 *  - Cơ bản (offline): MIỄN PHÍ, mở cho mọi user.
 *  - Phân tích AI: trả phí như các tab AI khác.
 */
import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { scoreNhatVan, generateNhatVanOffline } from '../core/nhatVan';
import { analyzeNhatVanWithAI } from '../utils/aiAnalysis';
import SimpleMarkdown from '../components/SimpleMarkdown';
import AIProgressBar from '../components/AIProgressBar';
import ExportPdfButton from '../components/ExportPdfButton';
import { chartHeaderLines } from '../utils/pdfExport';
import ScreenHeader from '../components/ScreenHeader';
import MedDisclaimer from '../components/MedDisclaimer';
import PaidGate from '../components/PaidGate';
import { fkey } from '../lib/featureKey';
import { getAiResult, setAiResult, clearAiResult } from '../lib/aiResults';
import { confirmAndUnlock, confirmReanalyze } from '../lib/confirmCharge';
import { premiumBadgeNote, PREMIUM, AI_VALUE_NOTE } from '../constants/premium';

type Props = NativeStackScreenProps<RootStackParamList, 'DailyView'>;

const RATING_COLOR: Record<string, string> = {
  'Rất tốt': '#22c55e', 'Tốt': '#5fdb8a', 'Bình thường': '#f5b942',
  'Cần thận trọng': '#e0a23a', 'Xấu': '#ff7a7a',
};

function startOfDay(d: Date) { const x = new Date(d); x.setHours(12, 0, 0, 0); return x; }

export default function DailyScreen({ route, navigation }: Props) {
  const { result } = route.params;
  const [date, setDate] = useState<Date>(startOfDay(new Date()));
  const [mode, setMode] = useState<'offline' | 'ai'>('offline');
  const [ai, setAi] = useState<{ status: 'idle' | 'loading' | 'done' | 'error'; text: string }>({ status: 'idle', text: '' });

  const sc = useMemo(() => scoreNhatVan(result, date), [result, date]);
  const offlineText = useMemo(() => generateNhatVanOffline(result, date), [result, date]);
  const dayKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

  const shift = (days: number) => {
    const d = new Date(date); d.setDate(d.getDate() + days);
    setDate(startOfDay(d));
    setAi({ status: 'idle', text: '' });
  };
  const today = () => { setDate(startOfDay(new Date())); setAi({ status: 'idle', text: '' }); };

  const runAI = async (force = false) => {
    const key = fkey(result, `day:${dayKey}:ai`);
    if (!force) {
      const cached = getAiResult(key);
      if (cached) { setAi({ status: 'done', text: cached }); return; }
    }
    const r = force ? await confirmReanalyze(key, 'ai') : await confirmAndUnlock(key, 'ai');
    if (r === 'cancel') return;
    if (r === 'nofund') { setAi({ status: 'error', text: `🔒 Số dư không đủ (cần ${PREMIUM.COST.ai} xu). Nạp thêm trong Menu → Nạp xu.` }); return; }
    if (force) { try { await clearAiResult(key); } catch {} }
    setAi({ status: 'loading', text: '' });
    try {
      const txt = await analyzeNhatVanWithAI(result, date.getTime());
      setAi({ status: 'done', text: txt });
      setAiResult(key, txt);
    } catch (e: any) {
      const msg = String(e?.message) === 'OFFLINE'
        ? '⚠ Cần kết nối mạng để phân tích chuyên sâu.'
        : `⚠ ${e?.message || 'Có lỗi xảy ra.'}`;
      setAi({ status: 'error', text: msg });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="Xem theo ngày" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Xem ngày cho {result.birthInfo.name || 'bạn'}</Text>

        {/* Bộ chọn ngày */}
        <View style={styles.dateBar}>
          <TouchableOpacity style={styles.navBtn} onPress={() => shift(-1)}><Text style={styles.navTxt}>‹ Hôm trước</Text></TouchableOpacity>
          <View style={styles.dateMid}>
            <Text style={styles.dateBig}>{date.getDate()}/{date.getMonth() + 1}/{date.getFullYear()}</Text>
            <Text style={[styles.ratingChip, { backgroundColor: RATING_COLOR[sc.rating] || COLORS.gold }]}>{sc.rating}</Text>
          </View>
          <TouchableOpacity style={styles.navBtn} onPress={() => shift(1)}><Text style={styles.navTxt}>Hôm sau ›</Text></TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.todayBtn} onPress={today}><Text style={styles.todayTxt}>● Về hôm nay</Text></TouchableOpacity>

        <Text style={styles.canchi}>Ngày {sc.canChi.stem} {sc.canChi.branch} · Can {sc.canChi.stemEl} · Chi {sc.canChi.branchEl}</Text>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          <TouchableOpacity style={[styles.tab, mode === 'offline' && styles.tabActive]} onPress={() => setMode('offline')}>
            <Text style={[styles.tabTxt, mode === 'offline' && styles.tabTxtActive]}>📘 Cơ bản (miễn phí)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, mode === 'ai' && styles.tabActive]} onPress={() => {
            setMode('ai');
            const c = getAiResult(fkey(result, `day:${dayKey}:ai`));
            if (c && ai.status === 'idle') setAi({ status: 'done', text: c });
          }}>
            <Text style={[styles.tabTxt, mode === 'ai' && styles.tabTxtActive]}>🤖 Phân tích AI</Text>
          </TouchableOpacity>
        </View>

        {mode === 'offline' ? (
          <View style={styles.resultBox}>
            {/* Cơ bản: MIỄN PHÍ — không trừ xu. */}
            <SimpleMarkdown content={offlineText} />
            <ExportPdfButton
              title={`Xem ngày ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`}
              subtitle="Bản Cơ bản (miễn phí)"
              badge="CƠ BẢN"
              headerLines={chartHeaderLines(result)}
              fileName={`${result.birthInfo.name || 'Lá số'} - Xem theo ngày - ${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`}
              getContent={() => offlineText}
            />
          </View>
        ) : ai.status === 'idle' ? (
          <View style={styles.resultBox}>
            <Text style={styles.aiValueNote}>✨ {AI_VALUE_NOTE}</Text>
            <TouchableOpacity style={styles.aiBtn} onPress={() => runAI()} activeOpacity={0.85}>
              <Text style={styles.aiBtnText}>🔍 Phân tích ngày này bằng AI ({PREMIUM.COST.ai} xu · {premiumBadgeNote()})</Text>
            </TouchableOpacity>
          </View>
        ) : ai.status === 'loading' ? (
          <AIProgressBar label="AI đang luận vận ngày…" />
        ) : ai.status === 'done' ? (
          <View style={styles.resultBox}>
            <SimpleMarkdown content={ai.text} />
            <Text style={styles.dim}>* Nội dung AI, mang tính tham khảo.</Text>
            <ExportPdfButton
              title={`Xem ngày ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`}
              subtitle="Bản Phân tích AI"
              badge="PHÂN TÍCH AI"
              headerLines={chartHeaderLines(result)}
              fileName={`${result.birthInfo.name || 'Lá số'} - Xem theo ngày - ${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`}
              getContent={() => ai.text}
            />
            <TouchableOpacity onPress={() => runAI(true)}><Text style={styles.retry}>↻ Phân tích lại (−{PREMIUM.COST.ai} xu)</Text></TouchableOpacity>
          </View>
        ) : (
          <View style={styles.resultBox}>
            <Text style={styles.body}>{ai.text}</Text>
            <TouchableOpacity onPress={() => runAI()}><Text style={styles.retry}>↻ Thử lại</Text></TouchableOpacity>
          </View>
        )}

        {/* Nút cuối: nhảy sang "Xem ngày tốt" cho việc cụ thể */}
        <TouchableOpacity
          style={styles.pickerBtn}
          onPress={() => navigation.navigate('DayPicker', { result })}
          activeOpacity={0.85}
        >
          <Text style={styles.pickerBtnText}>🧭  Xem ngày tốt cho việc cụ thể</Text>
        </TouchableOpacity>

        <MedDisclaimer compact style={{ marginTop: SPACING.md }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },
  title: { fontSize: FONTS.size.lg, fontWeight: 'bold', color: COLORS.gold, textAlign: 'center' },
  dateBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  navBtn: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.sm, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.card },
  navTxt: { color: COLORS.gold, fontWeight: '700', fontSize: FONTS.size.sm },
  dateMid: { flex: 1, alignItems: 'center', gap: 4 },
  dateBig: { color: COLORS.textPrimary, fontSize: FONTS.size.xl, fontWeight: '900' },
  ratingChip: { color: '#1a0a00', fontSize: FONTS.size.xs, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, overflow: 'hidden' },
  todayBtn: { alignSelf: 'center' },
  todayTxt: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, fontWeight: '700' },
  canchi: { color: COLORS.goldLight, fontSize: FONTS.size.sm, textAlign: 'center', fontWeight: '700' },
  pickerBtn: {
    marginTop: SPACING.md, alignSelf: 'stretch',
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.gold, borderRadius: 10, alignItems: 'center',
  },
  pickerBtnText: { color: '#1a0a00', fontSize: FONTS.size.md, fontWeight: '800' },
  tabsRow: {
    flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  tab: { flex: 1, paddingVertical: SPACING.sm, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: COLORS.gold, backgroundColor: COLORS.gold + '11' },
  tabTxt: { color: COLORS.textSecondary, fontWeight: '700', fontSize: FONTS.size.sm },
  tabTxtActive: { color: COLORS.gold },
  resultBox: { backgroundColor: COLORS.card, borderRadius: 10, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  body: { color: COLORS.textPrimary, fontSize: FONTS.size.md, lineHeight: 22 },
  aiBtn: { backgroundColor: COLORS.purple, borderRadius: 8, padding: SPACING.md, alignItems: 'center' },
  aiValueNote: { color: COLORS.goldLight, fontSize: FONTS.size.sm, fontStyle: 'italic', lineHeight: 18, marginBottom: SPACING.sm },
  aiBtnText: { color: '#fff', fontSize: FONTS.size.sm, fontWeight: '800', textAlign: 'center' },
  dim: { color: COLORS.textSecondary, fontSize: FONTS.size.xs, fontStyle: 'italic', marginTop: SPACING.xs },
  retry: { color: COLORS.purple, fontSize: FONTS.size.sm, fontWeight: '700', marginTop: 4 },
});
