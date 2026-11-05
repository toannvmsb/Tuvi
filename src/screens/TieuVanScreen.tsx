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
import { scoreDaiVan } from '../core/daiVanScore';
import { getYearsForDaiVan } from '../core/annualPeriodService';
import { DaiVanRadarBlock, Years10Chart, DomainScoresPanel } from '../components/VanVisualPanels';
import { buildTieuVanCharts, type TieuVanChartData } from '../core/tieuVanCharts';
import RadarChart from '../components/RadarChart';
import Svg, { Polyline, Circle } from 'react-native-svg';
import { tieuVanSections } from '../utils/aiAnalysis';
import { generateOfflineTieuVan, cutAtSection } from '../core/offlineLuanGiai';
import { summarizeOfflineTieuVan } from '../core/offlineSummary';
import SimpleMarkdown from '../components/SimpleMarkdown';
import AIProgressBar from '../components/AIProgressBar';
import PaidGate from '../components/PaidGate';
import ExportPdfButton from '../components/ExportPdfButton';
import { SummaryCard, AiSummaryCard, DetailHeader, type SummaryPdfProps } from '../components/AnalysisSummary';
import { chartHeaderLines } from '../utils/pdfExport';
import { fkey } from '../lib/featureKey';
import { costNote, PREMIUM, AI_PREVIEW } from '../constants/premium';
import { useContentWidth } from '../lib/platform';
import { useStreamingAI } from '../hooks/useStreamingAI';
import MissingPartsNotice from '../components/MissingPartsNotice';
import ScreenHeader from '../components/ScreenHeader';
import VanTierHeader from '../ui/VanTierHeader';
import { navigationRef } from '../navigation/AppNavigator';
import MedDisclaimer from '../components/MedDisclaimer';
import { useScrollToTop } from '../hooks/useScrollToTop';
import ScrollToTopButton from '../components/ScrollToTopButton';
import { lunarBirthYear } from '../core/ageUtil';

type Props = BottomTabScreenProps<MainTabParamList, 'TieuVan'>;

const RATING_COLOR: Record<TieuVanScore['rating'], string> = {
  'Rất tốt': '#22c55e', 'Tốt': '#5fdb8a', 'Khá': '#f5b942',
  'Trung bình': '#e0a23a', 'Nhiều thách thức': '#ff7a7a',
};

const TV_GREEN = '#5fdb8a';
const TV_GRAY = '#7c8aa5';
const TV_BLUE = '#60a5fa';
const TV_MONTH_H = 90;

/** Biểu đồ 1 (mục 5): Cột đôi 12 tháng — tài lộc/thách thức, dùng chung Nguyệt Vận Engine. */
function TieuVanMonthsChart({ months }: { months: TieuVanChartData['months'] }) {
  return (
    <View style={vStyles.box}>
      <View style={vStyles.headerRow}>
        <Text style={vStyles.title}>Nhịp 12 tháng trong năm</Text>
        <View style={vStyles.legend}>
          <View style={[vStyles.dot, { backgroundColor: TV_GREEN }]} /><Text style={vStyles.legendTxt}>Tài lộc</Text>
          <View style={[vStyles.dot, { backgroundColor: TV_GRAY }]} /><Text style={vStyles.legendTxt}>Thách thức</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: TV_MONTH_H, paddingTop: 4 }}>
        {months.map(m => (
          <View key={m.month} style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', height: TV_MONTH_H, gap: 2 }}>
            <View style={{ width: 5, height: (m.taiLoc / 100) * TV_MONTH_H, backgroundColor: TV_GREEN, borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />
            <View style={{ width: 5, height: (m.thachThuc / 100) * TV_MONTH_H, backgroundColor: TV_GRAY, borderTopLeftRadius: 2, borderTopRightRadius: 2, opacity: 0.9 }} />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row' }}>
        {months.map(m => (
          <View key={m.month} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={vStyles.weekLabel}>{m.month}</Text>
          </View>
        ))}
      </View>
      <Text style={vStyles.caption}>Mỗi tháng: Tài lộc · Thách thức (0–100), tính bằng Nguyệt Vận Engine — dữ liệu khớp màn hình Nguyệt vận.</Text>
    </View>
  );
}

/** Biểu đồ 2 (mục 5): Radar năm — 8 domain, chấm theo kích hoạt cung năm + Lưu Tứ Hóa. */
function TieuVanYearRadar({ radar }: { radar: TieuVanChartData['radar'] }) {
  const width = useContentWidth();
  return (
    <View style={[vStyles.box, { alignItems: 'center' }]}>
      <Text style={vStyles.title}>Cấu trúc năm — 8 lĩnh vực</Text>
      <RadarChart data={radar} size={Math.min(width - 80, 320)} />
    </View>
  );
}

const TV_QUARTER_H = 100;

/** Biểu đồ 3 (mục 5): Đường 4 quý — overall/opportunity, gộp từ 12 tháng đã tính. */
function TieuVanQuartersChart({ quarters }: { quarters: TieuVanChartData['quarters'] }) {
  const width = useContentWidth();
  const chartW = Math.min(width - 64, 340);
  const n = quarters.length;
  const xOf = (i: number) => (n <= 1 ? chartW / 2 : (i / (n - 1)) * chartW);
  const yOf = (v: number) => TV_QUARTER_H - (v / 100) * TV_QUARTER_H;
  const overallPts = quarters.map((q, i) => `${xOf(i)},${yOf(q.overall)}`).join(' ');
  const oppPts = quarters.map((q, i) => `${xOf(i)},${yOf(q.opportunity)}`).join(' ');
  return (
    <View style={vStyles.box}>
      <View style={vStyles.headerRow}>
        <Text style={vStyles.title}>Nhịp triển khai 4 quý</Text>
        <View style={vStyles.legend}>
          <View style={[vStyles.dot, { backgroundColor: TV_GREEN }]} /><Text style={vStyles.legendTxt}>Tổng thể</Text>
          <View style={[vStyles.dot, { backgroundColor: TV_BLUE }]} /><Text style={vStyles.legendTxt}>Cơ hội</Text>
        </View>
      </View>
      <Svg width={chartW} height={TV_QUARTER_H + 8} style={{ marginTop: 4 }}>
        <Polyline points={overallPts} fill="none" stroke={TV_GREEN} strokeWidth={2} />
        <Polyline points={oppPts} fill="none" stroke={TV_BLUE} strokeWidth={2} />
        {quarters.map((q, i) => (
          <Circle key={`o${q.index}`} cx={xOf(i)} cy={yOf(q.overall)} r={3} fill={TV_GREEN} />
        ))}
        {quarters.map((q, i) => (
          <Circle key={`p${q.index}`} cx={xOf(i)} cy={yOf(q.opportunity)} r={3} fill={TV_BLUE} />
        ))}
      </Svg>
      <View style={{ flexDirection: 'row' }}>
        {quarters.map(q => (
          <View key={q.index} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={vStyles.weekLabel}>{q.label}</Text>
            <Text style={vStyles.weekDays}>T{q.fromMonth}–T{q.toMonth}</Text>
          </View>
        ))}
      </View>
      <Text style={vStyles.caption}>Tổng thể/Cơ hội (0–100), gộp trực tiếp từ 12 tháng đã tính ở biểu đồ trên — không phát sinh dữ liệu mới.</Text>
    </View>
  );
}

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
  const breakdown = useMemo(() => getYearsForDaiVan(result, dvIdx, all), [result, dvIdx, all]);
  const years = breakdown.years;
  const dv = daiVans.find(d => d.index === dvIdx);
  const dvScore = useMemo(() => (dv ? scoreDaiVan(result, dv) : null), [result, dv]);
  const cellW = Math.min(width - SPACING.lg * 2 - SPACING.md * 2, 320);
  const cellH = Math.round(cellW * 1.18);

  // Thuộc tính PDF (dùng chung cho Tóm tắt + Chi tiết).
  const pdfProps = (d: { age: number; year: number; stem: string; branch: string }, mode: 'off' | 'ai'): SummaryPdfProps => ({
    title: `Tiểu Vận ${d.age} tuổi — năm ${d.year} (${d.stem} ${d.branch})`,
    subtitle: mode === 'ai' ? 'Bản Phân tích AI' : 'Bản Nâng cao (offline)',
    badge: mode === 'ai' ? 'PHÂN TÍCH AI' : 'NÂNG CAO',
    headerLines,
    fileName: `${result.birthInfo.name || 'Lá số'} - Tiểu vận ${d.age} tuổi năm ${d.year} - ${mode === 'ai' ? 'AI' : 'Nâng cao'}`,
  });

  const openAiTab = (age: number) => {
    setTabMode(s => ({ ...s, [age]: 'ai' }));
    if (!ai[age]) showCached(age, fkey(result, `tv:${age}:ai`));
  };

  const runAI = (age: number, force = false) =>
    run(age, fkey(result, `tv:${age}:ai`), tieuVanSections(result, age), force, PREMIUM.COST.aiLarge);
  const { scrollRef, showTop, onScroll, scrollToTop } = useScrollToTop();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <VanTierHeader active="tieu" result={result} />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} onScroll={onScroll} scrollEventThrottle={16}>
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
            Đại vận {dv.stem} {dv.branch} · {lunarBirthYear(result.birthInfo) + dv.startAge - 1}–{lunarBirthYear(result.birthInfo) + dv.endAge - 1}
          </Text>
        )}

        {/* Bản đồ tròn 12 trục + cung khởi nguồn của đại vận đang chọn */}
        {dv && <DaiVanRadarBlock result={result} dv={dv} cellW={cellW} cellH={cellH} />}

        {/* Biểu đồ 10 năm trong đại vận (đánh dấu năm đỉnh / năm cần cẩn trọng) */}
        <Years10Chart breakdown={breakdown} currentAge={currentAge} />

        {/* Bảng điểm 6 lĩnh vực của đại vận đang chọn */}
        {dvScore && <DomainScoresPanel d={dvScore} />}

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

                  {(() => {
                    const charts = buildTieuVanCharts(result, d.age);
                    if (!charts) return null;
                    return (
                      <View style={{ gap: SPACING.sm, marginBottom: SPACING.sm }}>
                        <TieuVanMonthsChart months={charts.months} />
                        <TieuVanYearRadar radar={charts.radar} />
                        <TieuVanQuartersChart quarters={charts.quarters} />
                      </View>
                    );
                  })()}

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
                      {(() => {
                        const c = generateOfflineTieuVan(result, d.age);
                        const pdf = pdfProps(d, 'off');
                        return (
                          <PaidGate unlockKey={fkey(result, `tv:${d.age}:adv`)} kind="advanced" cost={PREMIUM.COST.advancedMajor}
                            preview={cutAtSection(c, 'Sắc thái của năm')}>
                        <SummaryCard markdown={summarizeOfflineTieuVan(result, d.age)} pdf={pdf} />
                        <DetailHeader />
                        <SimpleMarkdown content={c} />
                        <ExportPdfButton {...pdf} label="📄 Xuất / In PDF — Chi tiết" getContent={() => c} />
                          </PaidGate>
                        );
                      })()}
                    </View>
                  ) : (
                    <>
                      {!a ? (
                        <View style={styles.aiResult}>
                          <Text style={styles.aiValueNote}>{AI_PREVIEW.tieuVan}</Text>
                          <TouchableOpacity style={styles.aiBtn} onPress={() => runAI(d.age)} activeOpacity={0.85}>
                            <Text style={styles.aiBtnText}>🔍 Phân tích AI đầy đủ ({costNote(PREMIUM.COST.aiLarge)})</Text>
                          </TouchableOpacity>
                        </View>
                      ) : a.status === 'loading' ? (
                        <AIProgressBar label={`AI đang luận năm ${d.year}…`} />
                      ) : a.status === 'done' ? (
                        <View style={styles.aiResult}>
                          <AiSummaryCard
                            summaryKey={fkey(result, `tv:${d.age}:ai:sum`)} kind="tv" result={result}
                            pdf={pdfProps(d, 'ai')} detail={a.shown ?? a.text} ready={!a.fetchingMore && !a.missing}
                          />
                          <DetailHeader />
                          <SimpleMarkdown content={a.shown ?? a.text} />
                          {a.fetchingMore && (
                            <Text style={styles.dim}>✍️ AI đang soạn tiếp các phần sau… (bạn cứ đọc, nội dung sẽ nối tiếp)</Text>
                          )}
                          <Text style={styles.dim}>* Nội dung AI, mang tính tham khảo.</Text>
                          {!a.fetchingMore && (
                            <MissingPartsNotice missing={a.missing} retrying={a.retrying} onRetry={() => retryMissing(d.age)} />
                          )}
                          {!a.fetchingMore && !a.missing && (
                            <ExportPdfButton {...pdfProps(d, 'ai')} label="📄 Xuất / In PDF — Chi tiết" getContent={() => a.shown ?? a.text} />
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
      <ScrollToTopButton visible={showTop} onPress={scrollToTop} />
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

const vStyles = StyleSheet.create({
  box: {
    backgroundColor: COLORS.surface, borderRadius: 10, padding: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border, gap: 6,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  title: { color: COLORS.goldLight, fontSize: 11, fontWeight: '700' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 2 },
  legendTxt: { color: COLORS.textSecondary, fontSize: 9, marginRight: 4 },
  weekLabel: { color: COLORS.gold, fontSize: 10, fontWeight: '700' },
  weekDays: { color: COLORS.textMuted, fontSize: 8 },
  caption: { color: COLORS.textSecondary, fontSize: 9, fontStyle: 'italic', lineHeight: 13 },
});
