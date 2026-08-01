/**
 * Tab Tài Lộc: biểu đồ tài lộc theo các đại vận (MIỄN PHÍ) + thống kê
 * + nút "Phân tích tài lộc chuyên sâu" bằng AI (PRO).
 */
import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { scoreAllDaiVan, type DaiVanScore } from '../core/daiVanScore';
import { analyzeFinancialDNA, financialDNARadar, FINANCIAL_DIM_LABEL } from '../core/wealthAnalysis';
import RadarChart from '../components/RadarChart';
import { analyzeWealthWithAI } from '../utils/aiAnalysis';
import SimpleMarkdown from '../components/SimpleMarkdown';
import ExportPdfButton from '../components/ExportPdfButton';
import { chartHeaderLines } from '../utils/pdfExport';
import { costNote, PREMIUM, AI_VALUE_NOTE } from '../constants/premium';
import { fkey } from '../lib/featureKey';
import { getAiResult, setAiResult, clearAiResult } from '../lib/aiResults';
import { confirmAndUnlock, confirmReanalyze } from '../lib/confirmCharge';
import { useContentWidth } from '../lib/platform';
import ScreenHeader from '../components/ScreenHeader';
import AIProgressBar from '../components/AIProgressBar';

type Props = NativeStackScreenProps<RootStackParamList, 'WealthChart'>;

const CHART_H = 170;
const RISK_COLOR: Record<'thấp' | 'vừa' | 'cao', string> = {
  'thấp': '#22c55e', 'vừa': '#f5b942', 'cao': '#ff7a7a',
};
function barColor(v: number): string {
  if (v >= 60) return '#22c55e';
  if (v >= 48) return '#5fdb8a';
  if (v >= 38) return '#f5b942';
  if (v >= 28) return '#e0a23a';
  return '#ff7a7a';
}

export default function WealthChartScreen({ route, navigation }: Props) {
  const { result } = route.params;
  const width = useContentWidth();
  const scores = useMemo(() => scoreAllDaiVan(result).slice(0, 10), [result]);
  const dna = useMemo(() => analyzeFinancialDNA(result), [result]);
  const currentAge = result.tuViChart.viewingAge;
  const taiBach = result.tuViChart.houses.find(h => h.palaceName === 'Tài Bạch');

  const best = [...scores].sort((a, b) => b.taiLoc - a.taiLoc)[0];
  const avg = Math.round(scores.reduce((s, d) => s + d.taiLoc, 0) / Math.max(1, scores.length));

  const aiKey = fkey(result, 'wealth:ai');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>(
    () => (getAiResult(aiKey) ? 'done' : 'idle'),
  );
  const [text, setText] = useState(() => getAiResult(aiKey) ?? '');

  const chartW = width - SPACING.lg * 2 - SPACING.md * 2;
  const colW = Math.floor(chartW / Math.max(1, scores.length));

  const runAI = async (force = false) => {
    if (!force) {
      const cached = getAiResult(aiKey);
      if (cached) { setText(cached); setStatus('done'); return; }
    }
    const r = force ? await confirmReanalyze(aiKey, 'ai') : await confirmAndUnlock(aiKey, 'ai');
    if (r === 'cancel') return;
    if (r === 'nofund') { setStatus('error'); setText(`🔒 Số dư không đủ (cần ${PREMIUM.COST.ai} xu). Nạp thêm trong Menu → Nạp xu.`); return; }
    if (force) { try { await clearAiResult(aiKey); } catch {} }
    setStatus('loading');
    try {
      const t = await analyzeWealthWithAI(result);
      setText(t); setStatus('done'); setAiResult(aiKey, t);
    } catch (e: any) {
      setText(String(e?.message) === 'OFFLINE'
        ? '⚠ Cần kết nối mạng để phân tích chuyên sâu.'
        : `⚠ ${e?.message || 'Có lỗi xảy ra.'}`);
      setStatus('error');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="Tài Lộc" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Tài Lộc của {result.birthInfo.name || 'bạn'}</Text>
        <Text style={styles.subtitle}>Xu hướng tài lộc qua các đại vận cả đời</Text>

        <View style={styles.statsRow}>
          <Stat icon="📊" value={`${avg}/100`} label="Tài lộc TB" />
          <Stat icon="⭐" value={`${best?.label ?? '?'}t`} label="Đỉnh cao" />
          <Stat icon="💰" value={taiBach?.branch ?? '?'} label="Cung Tài" />
        </View>

        <View style={styles.chartBox}>
          <View style={[styles.chartArea, { height: CHART_H }]}>
            {[100, 50, 0].map(g => (
              <View key={g} style={[styles.grid, { bottom: (g / 100) * CHART_H }]}>
                <Text style={styles.gridTxt}>{g}</Text>
              </View>
            ))}
            <View style={styles.barsRow}>
              {scores.map(d => {
                const isNow = currentAge != null && currentAge >= d.startAge && currentAge <= d.endAge;
                return (
                  <View key={d.index} style={{ width: colW, height: CHART_H, justifyContent: 'flex-end', alignItems: 'center' }}>
                    {isNow && <View style={[styles.nowLine, { height: CHART_H }]} />}
                    <View style={{ width: colW * 0.6, height: (d.taiLoc / 100) * CHART_H, backgroundColor: barColor(d.taiLoc), borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />
                  </View>
                );
              })}
            </View>
          </View>
          <View style={styles.xRow}>
            {scores.map(d => (
              <Text key={d.index} style={[styles.xLabel, { width: colW }]} numberOfLines={1}>{d.label}</Text>
            ))}
          </View>
          <Text style={styles.xCaption}>Khoảng tuổi từng đại vận · cột cao = tài lộc tốt</Text>
        </View>

        {/* ADN Tài Chính — 8 chiều (Financial DNA) */}
        <View style={styles.dnaBox}>
          <Text style={styles.dnaTitle}>🧬 ADN Tài Chính</Text>
          <Text style={styles.dnaArchetype}>{dna.archetype}</Text>
          <RadarChart data={financialDNARadar(dna)} size={Math.min(width - 40, 340)} />
          <View style={styles.dnaTagsRow}>
            <View style={[styles.dnaTag, { borderColor: COLORS.gold }]}>
              <Text style={styles.dnaTagLabel}>Trội nhất</Text>
              <Text style={[styles.dnaTagVal, { color: COLORS.gold }]}>{FINANCIAL_DIM_LABEL[dna.dominant]}</Text>
            </View>
            <View style={[styles.dnaTag, { borderColor: RISK_COLOR[dna.riskLevel] }]}>
              <Text style={styles.dnaTagLabel}>Rủi ro</Text>
              <Text style={[styles.dnaTagVal, { color: RISK_COLOR[dna.riskLevel] }]}>{dna.riskLevel} ({dna.risk})</Text>
            </View>
            <View style={[styles.dnaTag, { borderColor: COLORS.border }]}>
              <Text style={styles.dnaTagLabel}>Tin cậy</Text>
              <Text style={[styles.dnaTagVal, { color: COLORS.textPrimary }]}>{dna.confidence}%</Text>
            </View>
          </View>
          {dna.notes.length > 0 && (
            <View style={styles.dnaNotes}>
              {dna.notes.map((n, i) => (
                <Text key={i} style={styles.dnaNote}>• {n}</Text>
              ))}
            </View>
          )}
          <Text style={styles.dnaCaption}>
            8 chiều tổng hợp từ 6 cung: Mệnh · Tài Bạch · Quan Lộc · Điền Trạch · Phúc Đức · Thiên Di.
            "Rủi ro" cao nghĩa là tài chính dễ biến động — cần phòng thủ.
          </Text>
        </View>

        {status === 'idle' && <Text style={styles.aiValueNote}>✨ {AI_VALUE_NOTE}</Text>}
        <TouchableOpacity
          style={[styles.aiBtn, status === 'loading' && { opacity: 0.6 }]}
          onPress={() => runAI()} disabled={status === 'loading'} activeOpacity={0.85}
        >
          <Text style={styles.aiBtnText}>
            {status === 'loading' ? '🤖 Đang phân tích…' : `🤖 Phân tích tài lộc bằng AI (${costNote(PREMIUM.COST.ai)})`}
          </Text>
        </TouchableOpacity>

        {status === 'loading' && (
          <AIProgressBar label="AI đang luận tài lộc theo chuỗi đại vận…" />
        )}
        {status === 'done' && (
          <View style={styles.aiResult}>
            <SimpleMarkdown content={text} />
            <Text style={styles.dim}>* Nội dung AI, mang tính tham khảo.</Text>
            <ExportPdfButton
              title="Phân tích Tài Lộc cả đời"
              subtitle="Bản Phân tích AI"
              badge="PHÂN TÍCH AI"
              headerLines={chartHeaderLines(result)}
              fileName={`${result.birthInfo.name || 'Lá số'} - Tài lộc - AI`}
              getContent={() => text}
            />
            <TouchableOpacity onPress={() => runAI(true)}><Text style={styles.retry}>↻ Phân tích lại (−{PREMIUM.COST.ai} xu)</Text></TouchableOpacity>
          </View>
        )}
        {status === 'error' && (
          <View style={styles.aiResult}>
            <Text style={styles.summary}>{text}</Text>
            <TouchableOpacity onPress={() => runAI()}><Text style={styles.retry}>↻ Thử lại</Text></TouchableOpacity>
          </View>
        )}

        <View style={styles.guide}>
          <Text style={styles.guideTitle}>📖 Cách đọc</Text>
          <Text style={styles.guideText}>
            • Điểm tài lộc 0–100 mỗi đại vận, chấm theo chính tinh miếu/hãm tại cung đại vận,
            Hóa Lộc/Quyền/Khoa, Lộc Tồn, cát tinh; trừ điểm khi gặp Hóa Kỵ, Lục Sát, Tuần/Triệt.{'\n'}
            • Cột càng cao càng thuận tài; màu xanh đậm = thịnh, đỏ = nhiều thách thức.{'\n'}
            • Vạch đỏ là đại vận hiện tại. Kết hợp tab Tiểu Vận để xem chi tiết từng năm.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },
  title: { fontSize: FONTS.size.xl, fontWeight: 'bold', color: COLORS.gold, textAlign: 'center' },
  subtitle: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: SPACING.sm },
  statCard: { flex: 1, backgroundColor: COLORS.card, borderRadius: 10, padding: SPACING.md, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statValue: { color: COLORS.gold, fontSize: FONTS.size.lg, fontWeight: 'bold' },
  statLabel: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, marginTop: 2, fontWeight: '600' },
  chartBox: { backgroundColor: COLORS.card, borderRadius: 12, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  chartArea: { position: 'relative', justifyContent: 'flex-end' },
  grid: { position: 'absolute', left: 0, right: 0, borderTopWidth: 0.5, borderTopColor: COLORS.border },
  gridTxt: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700', position: 'absolute', left: -2, top: -8 },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end' },
  nowLine: { position: 'absolute', width: 2, backgroundColor: COLORS.red, opacity: 0.7 },
  xRow: { flexDirection: 'row', marginTop: 4 },
  xLabel: { color: COLORS.goldLight, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  xCaption: { color: COLORS.textSecondary, fontSize: 12, textAlign: 'center', marginTop: 4, fontStyle: 'italic' },
  aiBtn: { backgroundColor: COLORS.purple, borderRadius: 8, padding: SPACING.md, alignItems: 'center' },
  aiValueNote: { color: COLORS.goldLight, fontSize: FONTS.size.sm, fontStyle: 'italic', lineHeight: 18 },
  aiBtnText: { color: '#fff', fontSize: FONTS.size.sm, fontWeight: '800' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  aiResult: { backgroundColor: COLORS.surface, borderRadius: 8, padding: SPACING.md, gap: SPACING.xs, borderWidth: 1, borderColor: COLORS.border },
  summary: { color: COLORS.textPrimary, fontSize: FONTS.size.md, lineHeight: 22 },
  dim: { color: COLORS.textSecondary, fontSize: FONTS.size.xs, fontStyle: 'italic' },
  retry: { color: COLORS.purple, fontSize: FONTS.size.sm, fontWeight: '700', marginTop: 4 },
  guide: { backgroundColor: COLORS.card, borderRadius: 12, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  guideTitle: { color: COLORS.gold, fontSize: FONTS.size.md, fontWeight: '700', marginBottom: SPACING.sm },
  guideText: { color: COLORS.textPrimary, fontSize: FONTS.size.md, lineHeight: 24 },

  dnaBox: { backgroundColor: COLORS.card, borderRadius: 12, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', gap: SPACING.sm },
  dnaTitle: { color: COLORS.gold, fontSize: FONTS.size.lg, fontWeight: '800' },
  dnaArchetype: { color: COLORS.goldLight, fontSize: FONTS.size.sm, fontWeight: '700', textAlign: 'center', fontStyle: 'italic', lineHeight: 20 },
  dnaTagsRow: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap', justifyContent: 'center' },
  dnaTag: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: SPACING.md, paddingVertical: 6, alignItems: 'center', minWidth: 90 },
  dnaTagLabel: { color: COLORS.textSecondary, fontSize: FONTS.size.xs, fontWeight: '600' },
  dnaTagVal: { fontSize: FONTS.size.md, fontWeight: '800', marginTop: 2 },
  dnaNotes: { alignSelf: 'stretch', backgroundColor: COLORS.surface, borderRadius: 8, padding: SPACING.sm, gap: 3, borderWidth: 1, borderColor: COLORS.border },
  dnaNote: { color: COLORS.textPrimary, fontSize: FONTS.size.sm, lineHeight: 19 },
  dnaCaption: { color: COLORS.textSecondary, fontSize: FONTS.size.xs, textAlign: 'center', fontStyle: 'italic', lineHeight: 17 },
});
