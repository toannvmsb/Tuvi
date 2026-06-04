/**
 * Màn hình Tiểu Vận (vận từng năm).
 *  - Chọn 1 đại vận → biểu đồ Tài lộc/Thách thức 10 năm trong đại vận đó (MIỄN PHÍ).
 *  - Mỗi năm có luận ngắn theo lý thuyết + nút "Phân tích chuyên sâu" (AI, PRO).
 */
import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../types';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { scoreAllTieuVan, type TieuVanScore } from '../core/tieuVanScore';
import { tieuVanSections } from '../utils/aiAnalysis';
import { generateOfflineTieuVan } from '../core/offlineLuanGiai';
import SimpleMarkdown from '../components/SimpleMarkdown';
import AIProgressBar from '../components/AIProgressBar';
import PaidGate from '../components/PaidGate';
import ExportPdfButton from '../components/ExportPdfButton';
import { chartHeaderLines } from '../utils/pdfExport';
import { fkey } from '../lib/featureKey';
import { premiumBadgeNote, PREMIUM, AI_VALUE_NOTE } from '../constants/premium';
import { useContentWidth } from '../lib/platform';
import { useStreamingAI } from '../hooks/useStreamingAI';
import MissingPartsNotice from '../components/MissingPartsNotice';
import ScreenHeader from '../components/ScreenHeader';
import MedDisclaimer from '../components/MedDisclaimer';

type Props = BottomTabScreenProps<MainTabParamList, 'TieuVan'>;

const RATING_COLOR: Record<TieuVanScore['rating'], string> = {
  'Rất tốt': '#22c55e', 'Tốt': '#5fdb8a', 'Khá': '#f5b942',
  'Trung bình': '#e0a23a', 'Nhiều thách thức': '#ff7a7a',
};
const CHART_H = 150;
const GREEN = '#5fdb8a';
const GRAY = '#7c8aa5';

export default function TieuVanScreen({ route }: Props) {
  const { result } = route.params;
  const width = useContentWidth();
  const all = useMemo(() => scoreAllTieuVan(result), [result]);
  const daiVans = result.daiVans;
  const currentAge = result.tuViChart.viewingAge;

  // Đại vận mặc định = đại vận chứa tuổi đang xem
  const defaultDv = useMemo(() => {
    const dv = daiVans.find(d => currentAge != null && currentAge >= d.startAge && currentAge <= d.endAge);
    return dv ? dv.index : (daiVans[0]?.index ?? 0);
  }, [daiVans, currentAge]);
  const [dvIdx, setDvIdx] = useState<number>(defaultDv);
  const [openAge, setOpenAge] = useState<number | null>(null);
  const { ai, run, retryMissing, showCached } = useStreamingAI();
  // Tab phân tích trong mỗi card (key = tuổi): 'offline' hoặc 'ai'.
  const [tabMode, setTabMode] = useState<Record<number, 'offline' | 'ai'>>({});

  const headerLines = useMemo(() => chartHeaderLines(result), [result]);
  const years = all.filter(t => t.daiVanIndex === dvIdx).sort((a, b) => a.age - b.age);
  const dv = daiVans.find(d => d.index === dvIdx);
  const chartW = width - SPACING.lg * 2 - SPACING.md * 2;
  const colW = Math.floor(chartW / Math.max(1, years.length));

  const openAiTab = (age: number) => {
    setTabMode(s => ({ ...s, [age]: 'ai' }));
    if (!ai[age]) showCached(age, fkey(result, `tv:${age}:ai`));
  };

  const runAI = (age: number, force = false) =>
    run(age, fkey(result, `tv:${age}:ai`), tieuVanSections(result, age), force, PREMIUM.COST.aiLarge);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="Tiểu Vận" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Tiểu Vận của {result.birthInfo.name || 'bạn'}</Text>
        <Text style={styles.subtitle}>Chọn một đại vận để xem chi tiết vận từng năm</Text>

        {/* Chọn đại vận */}
        {Platform.OS === 'web' ? (
          <View style={[styles.dvChips, { flexWrap: 'wrap' }]}>
            {daiVans.map(d => (
              <TouchableOpacity key={d.index} style={[styles.chip, d.index === dvIdx && styles.chipActive]} onPress={() => { setDvIdx(d.index); setOpenAge(null); }}>
                <Text style={[styles.chipTxt, d.index === dvIdx && styles.chipTxtActive]}>{d.startAge}-{d.endAge}t</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.dvChips}>
            {daiVans.map(d => (
              <TouchableOpacity
                key={d.index}
                style={[styles.chip, d.index === dvIdx && styles.chipActive]}
                onPress={() => { setDvIdx(d.index); setOpenAge(null); }}
              >
                <Text style={[styles.chipTxt, d.index === dvIdx && styles.chipTxtActive]}>
                  {d.startAge}-{d.endAge}t
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          </ScrollView>
        )}

        {dv && (
          <Text style={styles.dvInfo}>
            Đại vận {dv.stem} {dv.branch} · {result.birthInfo.year + dv.startAge - 1}–{result.birthInfo.year + dv.endAge - 1}
          </Text>
        )}

        {/* Biểu đồ năm */}
        <View style={styles.chartBox}>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: GREEN }]} /><Text style={styles.legendTxt}>Tài lộc</Text></View>
            <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: GRAY }]} /><Text style={styles.legendTxt}>Thách thức</Text></View>
          </View>
          <View style={[styles.chartArea, { height: CHART_H }]}>
            {[100, 50, 0].map(g => (
              <View key={g} style={[styles.grid, { bottom: (g / 100) * CHART_H }]}>
                <Text style={styles.gridTxt}>{g}</Text>
              </View>
            ))}
            <View style={styles.barsRow}>
              {years.map(d => {
                const isNow = currentAge === d.age;
                return (
                  <View key={d.age} style={{ width: colW, height: CHART_H, justifyContent: 'flex-end', alignItems: 'center', position: 'relative' }}>
                    {isNow && <View style={[styles.nowLine, { height: CHART_H }]} />}
                    <View style={{ width: colW * 0.6, height: (d.taiLoc / 100) * CHART_H, backgroundColor: GREEN, borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />
                    <View style={{ position: 'absolute', bottom: 0, width: colW * 0.34, height: (d.thachThuc / 100) * CHART_H, backgroundColor: GRAY, opacity: 0.92 }} />
                  </View>
                );
              })}
            </View>
          </View>
          <View style={styles.xRow}>
            {years.map(d => (
              <Text key={d.age} style={[styles.xLabel, { width: colW }]} numberOfLines={1}>{d.age}</Text>
            ))}
          </View>
          <Text style={styles.xCaption}>Tuổi (mỗi cột = 1 năm)</Text>
        </View>

        {/* Danh sách từng năm */}
        {years.map(d => {
          const a = ai[d.age];
          const open = openAge === d.age;
          const isNow = currentAge === d.age;
          return (
            <View key={d.age} style={[styles.card, isNow && styles.cardNow]}>
              {isNow && <Text style={styles.nowBadge}>● Năm hiện tại</Text>}
              <TouchableOpacity style={styles.cardHead} activeOpacity={0.7}
                onPress={() => setOpenAge(open ? null : d.age)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardAge}>{d.age} tuổi · năm {d.year} · {d.stem} {d.branch}</Text>
                  <Text style={styles.cardYear}>nhập cung {d.palaceName}</Text>
                </View>
                <Text style={[styles.ratingChip, { backgroundColor: RATING_COLOR[d.rating] }]}>{d.rating}</Text>
                <Text style={styles.chev}>{open ? '▾' : '▸'}</Text>
              </TouchableOpacity>
              {open && (
                <View style={styles.cardBody}>
                  <View style={styles.scoreLine}>
                    <Text style={styles.scoreTag}>Tài lộc {d.taiLoc}</Text>
                    <Text style={[styles.scoreTag, { backgroundColor: 'rgba(124,138,165,0.25)', color: '#cbd5e1' }]}>Thách thức {d.thachThuc}</Text>
                  </View>
                  <Text style={styles.summary}>{d.summary}</Text>

                  {/* Tab switcher: Nâng cao (offline) <-> AI */}
                  <View style={styles.tabsRow}>
                    <TouchableOpacity
                      style={[styles.tab, (tabMode[d.age] || 'offline') === 'offline' && styles.tabActive]}
                      onPress={() => setTabMode(s => ({ ...s, [d.age]: 'offline' }))}
                    >
                      <Text style={[styles.tabTxt, (tabMode[d.age] || 'offline') === 'offline' && styles.tabTxtActive]}>📘 Nâng cao</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.tab, tabMode[d.age] === 'ai' && styles.tabActive]}
                      onPress={() => openAiTab(d.age)}
                    >
                      <Text style={[styles.tabTxt, tabMode[d.age] === 'ai' && styles.tabTxtActive]}>🤖 Phân tích AI</Text>
                    </TouchableOpacity>
                  </View>

                  {(tabMode[d.age] || 'offline') === 'offline' ? (
                    <View style={styles.aiResult}>
                      <PaidGate unlockKey={fkey(result, `tv:${d.age}:adv`)} kind="advanced" cost={PREMIUM.COST.advancedMajor}>
                        <SimpleMarkdown content={generateOfflineTieuVan(result, d.age)} />
                        <ExportPdfButton
                          title={`Tiểu Vận ${d.age} tuổi — năm ${d.year} (${d.stem} ${d.branch})`}
                          subtitle="Bản Nâng cao (offline)"
                          badge="NÂNG CAO"
                          headerLines={headerLines}
                          fileName={`${result.birthInfo.name || 'Lá số'} - Tiểu vận - ${d.age}t-${d.year}`}
                          getContent={() => generateOfflineTieuVan(result, d.age)}
                        />
                      </PaidGate>
                    </View>
                  ) : (
                    <>
                      {!a ? (
                        <View style={styles.aiResult}>
                          <Text style={styles.aiValueNote}>✨ {AI_VALUE_NOTE}</Text>
                          <TouchableOpacity style={styles.aiBtn} onPress={() => runAI(d.age)} activeOpacity={0.85}>
                            <Text style={styles.aiBtnText}>🔍 Phân tích AI ({PREMIUM.COST.aiLarge} xu · {premiumBadgeNote()})</Text>
                          </TouchableOpacity>
                        </View>
                      ) : a.status === 'loading' ? (
                        <AIProgressBar label={`AI đang luận năm ${d.year}…`} />
                      ) : a.status === 'done' ? (
                        <View style={styles.aiResult}>
                          <SimpleMarkdown content={a.shown ?? a.text} />
                          {a.fetchingMore && (
                            <Text style={styles.dim}>✍️ AI đang soạn tiếp các phần sau… (bạn cứ đọc, nội dung sẽ nối tiếp)</Text>
                          )}
                          <Text style={styles.dim}>* Nội dung AI, mang tính tham khảo.</Text>
                          {!a.fetchingMore && (
                            <MissingPartsNotice missing={a.missing} retrying={a.retrying} onRetry={() => retryMissing(d.age)} />
                          )}
                          {!a.fetchingMore && !a.missing && (
                            <ExportPdfButton
                              title={`Tiểu Vận ${d.age} tuổi — năm ${d.year} (${d.stem} ${d.branch})`}
                              subtitle="Bản Phân tích AI"
                              badge="PHÂN TÍCH AI"
                              headerLines={headerLines}
                              fileName={`${result.birthInfo.name || 'Lá số'} - Tiểu vận - ${d.age}t-${d.year}`}
                              getContent={() => a.shown ?? a.text}
                            />
                          )}
                          <TouchableOpacity onPress={() => runAI(d.age, true)}><Text style={styles.retry}>↻ Phân tích lại (−{PREMIUM.COST.aiLarge} xu)</Text></TouchableOpacity>
                        </View>
                      ) : (
                        <View style={styles.aiResult}>
                          <Text style={styles.summary}>{a.text}</Text>
                          <TouchableOpacity onPress={() => runAI(d.age)}><Text style={styles.retry}>↻ Thử lại</Text></TouchableOpacity>
                        </View>
                      )}
                    </>
                  )}
                </View>
              )}
            </View>
          );
        })}
        <MedDisclaimer compact style={{ marginTop: SPACING.md }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },
  title: { fontSize: FONTS.size.xl, fontWeight: 'bold', color: COLORS.gold, textAlign: 'center' },
  subtitle: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, textAlign: 'center' },
  dvChips: { flexDirection: 'row', gap: SPACING.xs, paddingVertical: SPACING.xs },
  chip: {
    paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: 16,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  chipTxt: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, fontWeight: '700' },
  chipTxtActive: { color: '#1a0a00' },
  dvInfo: { color: COLORS.goldLight, fontSize: FONTS.size.sm, fontWeight: '700', textAlign: 'center' },
  chartBox: { backgroundColor: COLORS.card, borderRadius: 12, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  legendRow: { flexDirection: 'row', gap: SPACING.lg, justifyContent: 'flex-end', marginBottom: SPACING.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 12, height: 12, borderRadius: 3 },
  legendTxt: { color: COLORS.textSecondary, fontSize: FONTS.size.xs },
  chartArea: { position: 'relative', justifyContent: 'flex-end' },
  grid: { position: 'absolute', left: 0, right: 0, borderTopWidth: 0.5, borderTopColor: COLORS.border },
  gridTxt: { color: COLORS.textMuted, fontSize: 9, position: 'absolute', left: -2, top: -6 },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end' },
  nowLine: { position: 'absolute', width: 2, backgroundColor: COLORS.red, opacity: 0.7 },
  xRow: { flexDirection: 'row', marginTop: 4 },
  xLabel: { color: COLORS.gold, fontSize: 10, fontWeight: '700', textAlign: 'center' },
  xCaption: { color: COLORS.textMuted, fontSize: 9, textAlign: 'center', marginTop: 2, fontStyle: 'italic' },
  card: { backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  cardNow: { borderColor: COLORS.gold, borderWidth: 2.5 },
  nowBadge: { color: COLORS.gold, fontSize: FONTS.size.xs, fontWeight: '800', paddingHorizontal: SPACING.md, paddingTop: 6 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md },
  cardAge: { color: COLORS.textPrimary, fontSize: FONTS.size.md, fontWeight: '800' },
  cardYear: { color: COLORS.textSecondary, fontSize: FONTS.size.xs, marginTop: 2 },
  ratingChip: { color: '#1a0a00', fontSize: FONTS.size.xs, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, overflow: 'hidden' },
  chev: { color: COLORS.goldLight, fontSize: FONTS.size.lg, fontWeight: '800' },
  cardBody: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.md, gap: SPACING.sm },
  scoreLine: { flexDirection: 'row', gap: SPACING.sm },
  scoreTag: { color: '#0a2a14', backgroundColor: 'rgba(95,219,138,0.3)', fontSize: FONTS.size.xs, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  summary: { color: COLORS.textPrimary, fontSize: FONTS.size.md, lineHeight: 22 },
  aiBtn: { backgroundColor: COLORS.purple, borderRadius: 8, padding: SPACING.sm, alignItems: 'center' },
  aiBtnText: { color: '#fff', fontSize: FONTS.size.sm, fontWeight: '800' },
  aiValueNote: { color: COLORS.goldLight, fontSize: FONTS.size.sm, fontStyle: 'italic', lineHeight: 18 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  aiResult: { backgroundColor: COLORS.surface, borderRadius: 8, padding: SPACING.md, gap: SPACING.xs, borderWidth: 1, borderColor: COLORS.border },
  dim: { color: COLORS.textSecondary, fontSize: FONTS.size.xs, fontStyle: 'italic' },
  retry: { color: COLORS.purple, fontSize: FONTS.size.sm, fontWeight: '700', marginTop: 4 },
  tabsRow: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderRadius: 8, borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden', marginTop: SPACING.xs,
  },
  tab: {
    flex: 1, paddingVertical: SPACING.sm, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.gold, backgroundColor: COLORS.gold + '11' },
  tabTxt: { color: COLORS.textSecondary, fontWeight: '700', fontSize: FONTS.size.sm },
  tabTxtActive: { color: COLORS.gold },
  nguyetBtn: {
    backgroundColor: COLORS.surface, borderRadius: 8, paddingVertical: SPACING.sm,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.gold,
  },
  nguyetBtnText: { color: COLORS.gold, fontWeight: '800', fontSize: FONTS.size.sm },
});
