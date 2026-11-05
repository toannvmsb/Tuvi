/**
 * Màn hình Đại Vận:
 *  - Biểu đồ lượng hóa toàn bộ đại vận (Tài lộc / Thách thức) — MIỄN PHÍ.
 *  - Mỗi đại vận có luận ngắn theo lý thuyết (miễn phí) + nút
 *    "Phân tích chuyên sâu" bằng AI (PRO, trừ xu / Admin miễn phí).
 */
import React, { useMemo, useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../types';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { scoreAllDaiVan, type DaiVanScore } from '../core/daiVanScore';
import { scoreAllTieuVan, type TieuVanScore } from '../core/tieuVanScore';
import { getYearsForDaiVan } from '../core/annualPeriodService';
import { DaiVanRadarBlock, Years10Chart, DomainScoresPanel } from '../components/VanVisualPanels';
import HouseCell from '../components/TuViChart/HouseCell';
import TuViChart from '../components/TuViChart';
import ExportPdfButton from '../components/ExportPdfButton';
import { SummaryCard, AiSummaryCard, DetailHeader, type SummaryPdfProps } from '../components/AnalysisSummary';
import { captureChartDataUri, captureRefDataUri, chartHeaderLines, type PdfDaiVanInfo, type PdfTieuVanInfo } from '../utils/pdfExport';
import ScreenHeader from '../components/ScreenHeader';
import VanTierHeader from '../ui/VanTierHeader';
import { navigationRef } from '../navigation/AppNavigator';
import MedDisclaimer from '../components/MedDisclaimer';
import { daiVanSections } from '../utils/aiAnalysis';
import { generateOfflineDaiVan, cutAtSection } from '../core/offlineLuanGiai';
import { summarizeOfflineDaiVan } from '../core/offlineSummary';
import SimpleMarkdown from '../components/SimpleMarkdown';
import AIProgressBar from '../components/AIProgressBar';
import PaidGate from '../components/PaidGate';
import { fkey } from '../lib/featureKey';
import { costNote, PREMIUM, AI_PREVIEW } from '../constants/premium';
import { useContentWidth } from '../lib/platform';
import { useStreamingAI } from '../hooks/useStreamingAI';
import MissingPartsNotice from '../components/MissingPartsNotice';
import { useScrollToTop } from '../hooks/useScrollToTop';
import ScrollToTopButton from '../components/ScrollToTopButton';
import type { ViewRef } from '../types/refs';

type Props = BottomTabScreenProps<MainTabParamList, 'DaiVan'>;

const RATING_COLOR: Record<DaiVanScore['rating'], string> = {
  'Rất tốt': '#22c55e',
  'Tốt': '#5fdb8a',
  'Khá': '#f5b942',
  'Trung bình': '#e0a23a',
  'Nhiều thách thức': '#ff7a7a',
};

const CHART_H = 170;
const GREEN = '#5fdb8a';
const GRAY = '#7c8aa5';

function Bars({ data, currentAge }: { data: DaiVanScore[]; currentAge?: number }) {
  const width = useContentWidth();
  const chartW = width - SPACING.lg * 2 - SPACING.md * 2;
  const colW = Math.floor(chartW / Math.max(1, data.length));
  return (
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
          {data.map(d => {
            const isNow = currentAge != null && currentAge >= d.startAge && currentAge <= d.endAge;
            return (
              <View key={d.index} style={{ width: colW, height: CHART_H, justifyContent: 'flex-end', alignItems: 'center', position: 'relative' }}>
                {isNow && <View style={[styles.nowLine, { height: CHART_H }]} />}
                <View style={{ width: colW * 0.62, height: (d.taiLoc / 100) * CHART_H, backgroundColor: GREEN, borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />
                <View style={{ position: 'absolute', bottom: 0, width: colW * 0.36, height: (d.thachThuc / 100) * CHART_H, backgroundColor: GRAY, opacity: 0.92, borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />
              </View>
            );
          })}
        </View>
      </View>
      <View style={styles.xRow}>
        {data.map(d => (
          <Text key={d.index} style={[styles.xLabel, { width: colW }]} numberOfLines={1}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

export default function DaiVanScreen({ route }: Props) {
  const { result } = route.params;
  const width = useContentWidth();
  const cellW = Math.min(width - SPACING.lg * 2 - SPACING.md * 2, 320);
  const cellH = Math.round(cellW * 1.18);
  // Chỉ tới ~100 tuổi → tối đa 10 đại vận (10 cột).
  const scores = useMemo(() => scoreAllDaiVan(result).slice(0, 10), [result]);
  const allTieuVanScores = useMemo(() => scoreAllTieuVan(result), [result]);
  const currentAge = result.tuViChart.viewingAge;
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  // Tab phân tích trong mỗi card: 'offline' (nâng cao miễn phí) hoặc 'ai' (PRO).
  const [tabMode, setTabMode] = useState<Record<number, 'offline' | 'ai'>>({});

  const { ai, run, retryMissing, showCached } = useStreamingAI();
  const { scrollRef, showTop, onScroll, scrollToTop } = useScrollToTop();

  // Chụp lá số (ẩn) để nhúng vào PDF.
  const chartRef = useRef<ViewRef>(null);
  const dvCellRefs = useRef<Record<number, ViewRef | null>>({});
  const tvCellRef = useRef<ViewRef>(null);
  const headerLines = useMemo(() => chartHeaderLines(result), [result]);
  const captureChart = () => captureChartDataUri(chartRef);
  const captureCells = async (dvIndex: number) => ({
    dvCell: await captureRefDataUri(dvCellRefs.current[dvIndex]),
    tvCell: await captureRefDataUri(tvCellRef),
  });

  // Cung của từng đại vận + cung Tiểu vận năm xem (để chụp ảnh ô cung vào PDF).
  const houseAt = (b?: string) => (b ? result.tuViChart.houses.find(h => h.branch === b) : undefined);
  const tvHouse = useMemo(() => {
    const vy = result.tuViChart.viewingYear;
    const tv = vy != null ? result.tieuVans.find(t => t.year === vy) : undefined;
    return houseAt(tv?.branch);
  }, [result]);

  // Tính sidebar PDF cho từng đại vận (lá số trái + info đại vận/tiểu vận bên phải).
  const chinhTinhAt = (branch: string) => {
    const h = result.tuViChart.houses.find(x => x.branch === branch);
    const names = h ? h.stars.filter(s => s.type === 'chinh').map(s => s.name) : [];
    return names.length ? names.join(', ') : 'Vô chính diệu';
  };
  const getPdfSideInfo = (dvIndex: number) => {
    const dv = result.daiVans[dvIndex];
    const dvInfo: PdfDaiVanInfo | undefined = dv ? {
      label: `${dv.startAge}–${dv.endAge} tuổi`,
      stemBranch: `${dv.stem} ${dv.branch}`,
      palaceName: result.tuViChart.houses.find(h => h.branch === dv.branch)?.palaceName ?? '',
      chinhTinh: chinhTinhAt(dv.branch),
      isCurrent: currentAge != null && currentAge >= dv.startAge && currentAge <= dv.endAge,
    } : undefined;
    const viewingYear = result.tuViChart.viewingYear;
    const tv = viewingYear != null ? result.tieuVans.find(t => t.year === viewingYear) : undefined;
    const tvInfo: PdfTieuVanInfo | undefined = tv ? {
      year: tv.year,
      age: tv.age,
      stemBranch: `${tv.stem} ${tv.branch}`,
      palaceName: result.tuViChart.houses.find(h => h.branch === tv.branch)?.palaceName ?? '',
      chinhTinh: chinhTinhAt(tv.branch),
    } : undefined;
    return { dvInfo, tvInfo };
  };

  // Thuộc tính PDF bản AI (dùng chung cho Tóm tắt + Chi tiết).
  const aiPdf = (d: { index: number; label: string; stem: string; branch: string; startAge: number; endAge: number }): SummaryPdfProps => ({
    title: `Đại Vận ${d.label} tuổi (${d.stem} ${d.branch})`,
    subtitle: 'Bản Phân tích AI',
    badge: 'PHÂN TÍCH AI',
    headerLines,
    fileName: `${result.birthInfo.name || 'Lá số'} - Đại vận ${d.startAge}-${d.endAge} tuổi - AI`,
    captureChart,
    captureCells: () => captureCells(d.index),
    daiVanInfo: getPdfSideInfo(d.index).dvInfo,
    tieuVanInfo: getPdfSideInfo(d.index).tvInfo,
  });

  // Mở tab AI của 1 đại vận: nếu đã có kết quả lưu → hiện lại ngay (miễn phí).
  const openAiTab = (idx: number) => {
    setTabMode(s => ({ ...s, [idx]: 'ai' }));
    if (!ai[idx]) showCached(idx, fkey(result, `dv:${idx}:ai`));
  };

  const runAI = (idx: number, force = false) =>
    run(idx, fkey(result, `dv:${idx}:ai`), daiVanSections(result, idx), force, PREMIUM.COST.aiLarge);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Lá số ẩn + ô cung đại vận/tiểu vận ẩn để chụp ảnh nhúng PDF */}
      <View style={styles.hiddenChart} pointerEvents="none">
        <TuViChart ref={chartRef} chart={result.tuViChart} birthInfo={result.birthInfo} />
        {result.daiVans.map(d => {
          const hh = houseAt(d.branch);
          return hh ? (
            <View key={`dvc${d.index}`} ref={el => { dvCellRefs.current[d.index] = el; }} collapsable={false}>
              <HouseCell house={hh} width={380} height={500} showLuuStars />
            </View>
          ) : null;
        })}
        {tvHouse && (
          <View ref={tvCellRef} collapsable={false}>
            <HouseCell house={tvHouse} width={380} height={500} showLuuStars />
          </View>
        )}
      </View>
      <VanTierHeader active="dai" result={result} />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} onScroll={onScroll} scrollEventThrottle={16}>
        <Text style={styles.title}>Đại Vận của {result.birthInfo.name || 'bạn'}</Text>
        <Text style={styles.subtitle}>Biểu đồ xu hướng các đại vận (từ {scores[0]?.label ?? '?'} đến {scores[scores.length - 1]?.label ?? '?'} tuổi)</Text>

        <Bars data={scores} currentAge={currentAge} />

        <View style={styles.noteBox}>
          <Text style={styles.noteTitle}>Biểu đồ nói gì</Text>
          <Text style={styles.noteText}>
            Biểu đồ lượng hóa từng đại vận qua hai yếu tố "Tài lộc" (xanh) và "Thách thức" (xám),
            chấm điểm dựa trên chính tinh miếu/hãm, Tứ Hóa, cát tinh và sát tinh tại cung đại vận.
            Cột xanh càng cao càng hanh thông; cột xám càng cao càng nhiều trở ngại. Đây là logic
            tổng hợp theo lý thuyết Tử Vi, mang tính tham khảo để hình dung con đường phía trước.
          </Text>
        </View>

        {scores.map((d) => {
          const a = ai[d.index];
          const open = openIdx === d.index;
          const isNow = currentAge != null && currentAge >= d.startAge && currentAge <= d.endAge;
          return (
            <View key={d.index} style={[styles.card, isNow && styles.cardNow]}>
              {isNow && <Text style={styles.nowBadge}>● Đại vận hiện tại</Text>}
              <TouchableOpacity
                style={styles.cardHead}
                activeOpacity={0.7}
                onPress={() => setOpenIdx(open ? null : d.index)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardAge}>Đại vận {d.label} tuổi · {d.stem} {d.branch}</Text>
                  <Text style={styles.cardYear}>{d.yearLabel} · cung {d.palaceName}</Text>
                </View>
                <Text style={[styles.ratingChip, { backgroundColor: RATING_COLOR[d.rating] }]}>{d.rating}</Text>
                <Text style={styles.chev}>{open ? '▾' : '▸'}</Text>
              </TouchableOpacity>

              {open && (
                <View style={styles.cardBody}>
                  {/* Bản đồ tròn 12 trục cho đại vận này */}
                  {result.daiVans[d.index] && (
                    <DaiVanRadarBlock result={result} dv={result.daiVans[d.index]} cellW={cellW} cellH={cellH} />
                  )}
                  <View style={styles.scoreLine}>
                    <Text style={styles.scoreTag}>Tài lộc {d.taiLoc}</Text>
                    <Text style={[styles.scoreTag, { backgroundColor: 'rgba(124,138,165,0.25)', color: '#cbd5e1' }]}>Thách thức {d.thachThuc}</Text>
                  </View>
                  <Years10Chart
                    breakdown={getYearsForDaiVan(result, d.index, allTieuVanScores)}
                    currentAge={currentAge}
                  />
                  <DomainScoresPanel d={d} />
                  <Text style={styles.summary}>{d.summary}</Text>

                  {/* Tab switcher: Nâng cao (offline) <-> Phân tích AI */}
                  <View style={styles.tabsRow}>
                    <TouchableOpacity
                      style={[styles.tab, (tabMode[d.index] || 'offline') === 'offline' && styles.tabActive]}
                      onPress={() => setTabMode(s => ({ ...s, [d.index]: 'offline' }))}
                    >
                      <Text style={[styles.tabTxt, (tabMode[d.index] || 'offline') === 'offline' && styles.tabTxtActive]}>📘 Nâng cao</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.tab, tabMode[d.index] === 'ai' && styles.tabActive]}
                      onPress={() => openAiTab(d.index)}
                    >
                      <Text style={[styles.tabTxt, tabMode[d.index] === 'ai' && styles.tabTxtActive]}>🤖 Phân tích AI</Text>
                    </TouchableOpacity>
                  </View>

                  {(tabMode[d.index] || 'offline') === 'offline' ? (
                    <View style={styles.aiResult}>
                      {(() => {
                        const c = generateOfflineDaiVan(result, d.index);
                        const pdf: SummaryPdfProps = {
                          title: `Đại Vận ${d.label} tuổi (${d.stem} ${d.branch})`,
                          subtitle: 'Bản Nâng cao (offline)',
                          badge: 'NÂNG CAO',
                          headerLines,
                          fileName: `${result.birthInfo.name || 'Lá số'} - Đại vận ${d.startAge}-${d.endAge} tuổi - Nâng cao`,
                          captureChart,
                          captureCells: () => captureCells(d.index),
                          daiVanInfo: getPdfSideInfo(d.index).dvInfo,
                          tieuVanInfo: getPdfSideInfo(d.index).tvInfo,
                        };
                        return (
                          <PaidGate unlockKey={fkey(result, `dv:${d.index}:adv`)} kind="advanced" cost={PREMIUM.COST.advancedMajor}
                            preview={cutAtSection(c, 'Cục diện chung của đại vận')}>
                            <SummaryCard markdown={summarizeOfflineDaiVan(result, d.index)} pdf={pdf} />
                            <DetailHeader />
                            <SimpleMarkdown content={c} />
                            <ExportPdfButton {...pdf} label="📄 Xuất / In PDF — Chi tiết" getContent={() => c} />
                          </PaidGate>
                        );
                      })()}
                    </View>
                  ) : (
                    <>
                      {!a || a.status === 'idle' ? (
                        <View style={styles.aiResult}>
                          <Text style={styles.aiValueNote}>{AI_PREVIEW.daiVan}</Text>
                          <TouchableOpacity style={styles.aiBtn} onPress={() => runAI(d.index)} activeOpacity={0.85}>
                            <Text style={styles.aiBtnText}>🔍 Phân tích AI đầy đủ ({costNote(PREMIUM.COST.aiLarge)})</Text>
                          </TouchableOpacity>
                        </View>
                      ) : a.status === 'loading' ? (
                        <AIProgressBar label={`AI đang luận đại vận ${d.label}…`} />
                      ) : a.status === 'done' ? (
                        <View style={styles.aiResult}>
                          <AiSummaryCard
                            summaryKey={fkey(result, `dv:${d.index}:ai:sum`)} kind="dv" result={result}
                            pdf={aiPdf(d)} detail={a.shown ?? a.text} ready={!a.fetchingMore && !a.missing}
                          />
                          <DetailHeader />
                          <SimpleMarkdown content={a.shown ?? a.text} />
                          {a.fetchingMore && (
                            <Text style={styles.dim}>✍️ AI đang soạn tiếp các phần sau… (bạn cứ đọc, nội dung sẽ nối tiếp)</Text>
                          )}
                          <Text style={styles.dim}>* Nội dung AI, mang tính tham khảo.</Text>
                          {!a.fetchingMore && (
                            <MissingPartsNotice missing={a.missing} retrying={a.retrying} onRetry={() => retryMissing(d.index)} />
                          )}
                          {!a.fetchingMore && !a.missing && (
                            <ExportPdfButton {...aiPdf(d)} label="📄 Xuất / In PDF — Chi tiết" getContent={() => a.shown ?? a.text} />
                          )}
                          <TouchableOpacity onPress={() => runAI(d.index, true)}>
                            <Text style={styles.retry}>↻ Phân tích lại (−{PREMIUM.COST.aiLarge} xu)</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={styles.aiResult}>
                          <Text style={styles.summary}>{a.text}</Text>
                          <TouchableOpacity onPress={() => runAI(d.index)}>
                            <Text style={styles.retry}>↻ Thử lại</Text>
                          </TouchableOpacity>
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
      <ScrollToTopButton visible={showTop} onPress={scrollToTop} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  hiddenChart: { position: 'absolute', top: 0, left: 0, right: 0, opacity: 0, zIndex: -1 },
  scroll: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },
  title: { fontSize: FONTS.size.xl, fontWeight: 'bold', color: COLORS.gold, textAlign: 'center' },
  subtitle: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, textAlign: 'center' },

  chartBox: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
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

  noteBox: { backgroundColor: COLORS.surface, borderRadius: 10, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  noteTitle: { color: COLORS.gold, fontSize: FONTS.size.md, fontWeight: '700', marginBottom: 4 },
  noteText: { color: COLORS.textPrimary, fontSize: FONTS.size.sm, lineHeight: 20, fontStyle: 'italic' },

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
});
