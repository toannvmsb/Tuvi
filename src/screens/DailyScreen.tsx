/**
 * Màn hình XEM THEO NGÀY — chọn 1 ngày, xem ngày đó với lá số nên/không nên làm,
 * ăn gì, mặc gì, hướng nào…
 *  - Cơ bản (offline): MIỄN PHÍ, mở cho mọi user.
 *  - Phân tích AI: trả phí như các tab AI khác.
 *
 * CHẾ ĐỘ MẶC ĐỊNH (route.params.result rỗng — vào từ Home lúc chưa gắn lá
 * số): vẫn cho chọn ngày + xem "Nên/Hạn chế" theo công thức chung (Can-Chi
 * ngày, không cá nhân hóa) — bỏ hẳn Trực/Hoàng Đạo/28 Tú, tab Phân tích AI,
 * và nút "Xem ngày tốt cho việc cụ thể" (đều cần lá số thật, không có bản
 * chung tương đương) — thay bằng 1 lời mời cá nhân hóa.
 */
import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { scoreNhatVan, dayCanChi, type NhatVanScore } from '../core/nhatVan';
import { generateNhatVanOffline } from '../core/nhatVanReport';
import { buildMonthHeatmap } from '../core/dailyPeriodService';
import { buildGenericMonthHeatmapForMonth } from '../core/genericMonthHeatmap';
import { buildTodaySummary } from '../core/todaySummary';
import { solarToLunar } from '../core/lunarCalendar';
import { analyzeNhatVanWithAI } from '../utils/aiAnalysis';
import LunarCalendarPicker from '../components/LunarCalendarPicker';
import SimpleMarkdown from '../components/SimpleMarkdown';
import AIProgressBar from '../components/AIProgressBar';
import ExportPdfButton from '../components/ExportPdfButton';
import { chartHeaderLines } from '../utils/pdfExport';
import { WeatherPanel } from '../components/WeatherCards';
import ScreenHeader from '../components/ScreenHeader';
import MedDisclaimer from '../components/MedDisclaimer';
import { fkey } from '../lib/featureKey';
import { getAiResult, setAiResult, clearAiResult } from '../lib/aiResults';
import { confirmAndUnlock, confirmReanalyze } from '../lib/confirmCharge';
import { costNote, PREMIUM, AI_VALUE_NOTE } from '../constants/premium';
import { promptPersonalize } from '../lib/personalizePrompt';
import { useScrollToTop } from '../hooks/useScrollToTop';
import ScrollToTopButton from '../components/ScrollToTopButton';
import DayTaskFitCard from '../components/DayTaskFitCard';

type Props = NativeStackScreenProps<RootStackParamList, 'DailyView'>;

const RATING_COLOR: Record<string, string> = {
  'Rất tốt': '#22c55e', 'Tốt': '#5fdb8a', 'Bình thường': '#f5b942',
  'Cần thận trọng': '#e0a23a', 'Xấu': '#ff7a7a',
};

function DayInfoBar({ sc }: { sc: NhatVanScore }) {
  const hdColor = sc.hoangDao ? '#22c55e' : '#94a3b8';
  const hdLabel = sc.hoangDao ? '☀ Hoàng Đạo' : '🌑 Hắc Đạo';
  return (
    <View style={dibStyles.row}>
      <View style={dibStyles.chip}><Text style={dibStyles.chipTxt}>Trực {sc.truc}</Text></View>
      <View style={dibStyles.chip}><Text style={dibStyles.chipTxt}>{sc.lucDieu}</Text></View>
      <View style={[dibStyles.chip, { borderColor: hdColor }]}><Text style={[dibStyles.chipTxt, { color: hdColor }]}>{hdLabel}</Text></View>
      <View style={dibStyles.chip}><Text style={dibStyles.chipTxt}>Tú {sc.nhi28Tu}</Text></View>
      <View style={[dibStyles.chip, { borderColor: RATING_COLOR[sc.rating] || '#f5b942' }]}>
        <Text style={[dibStyles.chipTxt, { color: RATING_COLOR[sc.rating] || '#f5b942' }]}>{sc.score100}/100</Text>
      </View>
    </View>
  );
}

const dibStyles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  chip: { borderWidth: 1, borderColor: '#475569', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  chipTxt: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },
});

function startOfDay(d: Date) { const x = new Date(d); x.setHours(12, 0, 0, 0); return x; }

export default function DailyScreen({ route, navigation }: Props) {
  const { result } = route.params ?? {};
  const [date, setDate] = useState<Date>(startOfDay(new Date()));
  const [mode, setMode] = useState<'offline' | 'ai'>('offline');
  const [ai, setAi] = useState<{ status: 'idle' | 'loading' | 'done' | 'error'; text: string }>({ status: 'idle', text: '' });

  // Tháng đang HIỂN THỊ trên lịch — có thể khác tháng của `date` khi người
  // dùng bấm ‹ › xem tháng khác mà CHƯA chọn ngày nào trong đó. Heatmap phải
  // tính theo đúng tháng này (không phải theo `date`) để không lệch màu.
  const [viewYM, setViewYM] = useState<{ year: number; month0: number }>(
    () => ({ year: date.getFullYear(), month0: date.getMonth() }),
  );
  // Chế độ mặc định (không có lá số — vào từ Home lúc chưa gắn) → heatmap +
  // rating dùng công thức chung (Can-Chi ngày), không cá nhân hóa.
  const heatmap = useMemo(
    () => (result
      ? buildMonthHeatmap(result, viewYM.year, viewYM.month0 + 1)
      : buildGenericMonthHeatmapForMonth(viewYM.year, viewYM.month0 + 1)),
    [result, viewYM.year, viewYM.month0],
  );

  const sc = useMemo(() => (result ? scoreNhatVan(result, date) : null), [result, date]);
  const genericSummary = useMemo(() => (result ? null : buildTodaySummary(null, date)), [result, date]);
  const genericCanChi = useMemo(() => dayCanChi(date), [date]);
  const offlineText = useMemo(() => (result ? generateNhatVanOffline(result, date) : ''), [result, date]);
  const lunarDate = useMemo(() => solarToLunar(date.getDate(), date.getMonth() + 1, date.getFullYear()), [date]);
  const dayKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  const rating = result && sc ? sc.rating : genericSummary!.rating;

  const selectDate = (d: Date) => {
    setDate(d);
    setAi({ status: 'idle', text: '' });
  };

  const runAI = async (force = false) => {
    if (!result) return; // chế độ cơ bản không có tab Phân tích AI
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
  const { scrollRef, showTop, onScroll, scrollToTop } = useScrollToTop();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="Xem theo ngày" onBack={() => navigation.goBack()} />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} onScroll={onScroll} scrollEventThrottle={16}>
        <Text style={styles.title}>{result ? `Xem ngày cho ${result.birthInfo.name || 'bạn'}` : 'Xem theo ngày (chế độ cơ bản)'}</Text>

        {/* Lịch âm dương chọn ngày — đã hợp nhất bản đồ nhiệt + thống kê tháng
            ngay bên dưới lưới ngày (không tách khối riêng). */}
        <LunarCalendarPicker
          selectedDate={date}
          onSelectDate={selectDate}
          monthHeatmap={heatmap}
          onViewMonthChange={(year, month0) => setViewYM({ year, month0 })}
        />

        {/* Thông tin ngày đang chọn */}
        <View style={styles.selectedBar}>
          <View style={styles.selectedLeft}>
            <Text style={styles.dateBig}>
              {date.getDate()}/{date.getMonth() + 1}/{date.getFullYear()}
            </Text>
            <Text style={styles.dateLunar}>
              Âm lịch: {lunarDate.day}/{lunarDate.month}{lunarDate.isLeapMonth ? ' nhuận' : ''}/{lunarDate.year}
            </Text>
          </View>
          <Text style={[styles.ratingChip, { backgroundColor: RATING_COLOR[rating] || COLORS.gold }]}>
            {rating}
          </Text>
        </View>

        {/* Thời tiết ngày đang chọn + 5 ngày tiếp theo */}
        <WeatherPanel date={date} />

        {result && sc ? (
          <>
            <Text style={styles.canchi}>Ngày {sc.canChi.stem} {sc.canChi.branch} · Can {sc.canChi.stemEl} · Chi {sc.canChi.branchEl}</Text>

            <DayInfoBar sc={sc} />

            {sc.warnings.length > 0 && (
              <View style={styles.warningBox}>
                {sc.warnings.map((w, i) => <Text key={i} style={styles.warningTxt}>{w}</Text>)}
              </View>
            )}

            <Text style={styles.genericSectionTitle}>Việc hợp / nên tránh hôm nay</Text>
            <DayTaskFitCard date={date} result={result} />

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
                <SimpleMarkdown content={offlineText} />
                <ExportPdfButton
                  title={`Xem ngày ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`}
                  subtitle="Bản Cơ bản (miễn phí)"
                  badge="CƠ BẢN"
                  headerLines={chartHeaderLines(result)}
                  fileName={`${result.birthInfo.name || 'Lá số'} - Xem ngày ${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()} - Cơ bản`}
                  getContent={() => offlineText}
                />
              </View>
            ) : ai.status === 'idle' ? (
              <View style={styles.resultBox}>
                <Text style={styles.aiValueNote}>✨ {AI_VALUE_NOTE}</Text>
                <TouchableOpacity style={styles.aiBtn} onPress={() => runAI()} activeOpacity={0.85}>
                  <Text style={styles.aiBtnText}>🔍 Phân tích ngày này bằng AI ({costNote(PREMIUM.COST.ai)})</Text>
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
                  fileName={`${result.birthInfo.name || 'Lá số'} - Xem ngày ${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()} - AI`}
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

            <TouchableOpacity
              style={styles.pickerBtn}
              onPress={() => navigation.navigate('DayPicker', { result })}
              activeOpacity={0.85}
            >
              <Text style={styles.pickerBtnText}>🧭  Xem ngày tốt cho việc cụ thể</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.canchi}>
              Ngày {genericCanChi.stem} {genericCanChi.branch} · Can {genericCanChi.stemEl} · Chi {genericCanChi.branchEl}
            </Text>

            {/* Chế độ mặc định: không có Trực/Hoàng Đạo/28 Tú/Phân tích AI (đều cần lá số thật) —
                chỉ còn "Nên/Hạn chế" chung theo Can-Chi ngày, cùng công thức đang dùng ở box
                "Ngày hôm nay" trên Home. */}
            <View style={styles.resultBox}>
              <Text style={styles.genericSectionTitle}>✅ Nên</Text>
              {genericSummary!.good.map((g, i) => <Text key={i} style={styles.body}>{g}</Text>)}
              <Text style={[styles.genericSectionTitle, { marginTop: SPACING.sm }]}>⛔ Hạn chế</Text>
              {genericSummary!.bad.map((b, i) => <Text key={i} style={styles.body}>{b}</Text>)}
            </View>

            <Text style={styles.genericSectionTitle}>Việc hợp / nên tránh hôm nay</Text>
            <DayTaskFitCard date={date} result={null} />

            <TouchableOpacity style={styles.aiBtn} onPress={() => promptPersonalize(navigation)} activeOpacity={0.85}>
              <Text style={styles.aiBtnText}>✨ Cá nhân hóa để xem đầy đủ (Trực, Hoàng Đạo, phân tích AI…)</Text>
            </TouchableOpacity>
          </>
        )}

        <MedDisclaimer compact style={{ marginTop: SPACING.md }} />
      </ScrollView>
      <ScrollToTopButton visible={showTop} onPress={scrollToTop} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },
  title: { fontSize: 28, lineHeight: 32, fontFamily: FONTS.display, color: COLORS.textPrimary },

  selectedBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(226,194,133,0.13)', borderRadius: 24, padding: 18,
    borderWidth: 1, borderColor: 'rgba(226,194,133,0.38)',
  },
  selectedLeft: { gap: 2 },
  dateBig: { color: COLORS.goldLight, fontSize: 30, lineHeight: 34, fontFamily: FONTS.displayBold },
  dateLunar: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, fontFamily: FONTS.body },
  ratingChip: {
    color: '#1a0a00', fontSize: FONTS.size.sm, fontWeight: '800',
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, overflow: 'hidden',
  },

  canchi: { color: COLORS.goldLight, fontSize: FONTS.size.sm, textAlign: 'center', fontWeight: '700' },
  genericSectionTitle: { color: COLORS.gold, fontSize: FONTS.size.md, fontWeight: '800', marginBottom: 4 },
  pickerBtn: {
    marginTop: SPACING.md, alignSelf: 'stretch',
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.gold, borderRadius: 16, alignItems: 'center', minHeight: 52, justifyContent: 'center',
  },
  pickerBtnText: { color: '#1a0a00', fontSize: FONTS.size.md, fontWeight: '800' },
  tabsRow: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 4,
    borderWidth: 1, borderColor: 'rgba(226,194,133,0.2)', overflow: 'hidden',
  },
  tab: { flex: 1, minHeight: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 12 },
  tabActive: { backgroundColor: 'rgba(226,194,133,0.22)' },
  tabTxt: { color: COLORS.textSecondary, fontWeight: '700', fontSize: FONTS.size.sm },
  tabTxtActive: { color: COLORS.gold },
  resultBox: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: SPACING.md, borderWidth: 1, borderColor: 'rgba(226,194,133,0.18)' },
  body: { color: COLORS.textPrimary, fontSize: FONTS.size.md, lineHeight: 24, fontFamily: FONTS.body },
  aiBtn: { backgroundColor: COLORS.purple, borderRadius: 16, minHeight: 52, padding: SPACING.md, alignItems: 'center', justifyContent: 'center' },
  aiValueNote: { color: COLORS.goldLight, fontSize: FONTS.size.sm, fontStyle: 'italic', lineHeight: 18, marginBottom: SPACING.sm },
  aiBtnText: { color: '#fff', fontSize: FONTS.size.sm, fontWeight: '800', textAlign: 'center' },
  dim: { color: COLORS.textSecondary, fontSize: FONTS.size.xs, fontStyle: 'italic', marginTop: SPACING.xs },
  retry: { color: COLORS.purple, fontSize: FONTS.size.sm, fontWeight: '700', marginTop: 4 },
  warningBox: {
    backgroundColor: '#431407', borderRadius: 8, padding: SPACING.sm,
    borderWidth: 1, borderColor: '#ef4444', gap: 4,
  },
  warningTxt: { color: '#fca5a5', fontSize: FONTS.size.xs, fontWeight: '700', lineHeight: 18 },
});
