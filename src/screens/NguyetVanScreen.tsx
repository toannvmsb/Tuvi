/**
 * Tab NGUYỆT VẬN (vận từng tháng trong 1 năm).
 *  - Hàng 1: chọn ĐẠI VẬN (mặc định = đại vận hiện tại).
 *  - Hàng 2: chọn 1 trong 10 NĂM (tiểu vận) của đại vận đã chọn.
 *  - Bên dưới: biểu đồ tài lộc 12 tháng + chi tiết từng tháng (Nâng cao / AI).
 */
import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../types';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { scoreAllNguyetVan, type NguyetVanScore } from '../core/nguyetVanScore';
import { solarToLunar } from '../core/lunarCalendar';
import { generateOfflineNguyetVan } from '../core/offlineLuanGiai';
import { analyzeNguyetVanWithAI } from '../utils/aiAnalysis';
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
import { useContentWidth } from '../lib/platform';

type Props = BottomTabScreenProps<MainTabParamList, 'NguyetVan'>;

const RATING_COLOR: Record<NguyetVanScore['rating'], string> = {
  'Rất tốt': '#22c55e', 'Tốt': '#5fdb8a', 'Khá': '#f5b942',
  'Trung bình': '#e0a23a', 'Nhiều thách thức': '#ff7a7a',
};
const CHART_H = 130;
const GREEN = '#5fdb8a';
const GRAY = '#7c8aa5';

export default function NguyetVanScreen({ route }: Props) {
  const { result } = route.params;
  const width = useContentWidth();
  const daiVans = result.daiVans;
  const currentAge = result.tuViChart.viewingAge;

  // Đại vận mặc định = đại vận chứa tuổi đang xem.
  const defaultDv = useMemo(() => {
    const dv = daiVans.find(d => currentAge != null && currentAge >= d.startAge && currentAge <= d.endAge);
    return dv ? dv.index : (daiVans[0]?.index ?? 0);
  }, [daiVans, currentAge]);

  const [dvIdx, setDvIdx] = useState<number>(defaultDv);

  // 10 năm tiểu vận của đại vận đang chọn.
  const years = useMemo(
    () => result.tieuVans.filter(t => t.daiVanIndex === dvIdx).sort((a, b) => a.age - b.age),
    [result, dvIdx],
  );

  // Tuổi (năm) đang chọn — mặc định tuổi hiện tại nếu thuộc đại vận, else năm đầu.
  const [age, setAge] = useState<number>(() => {
    const inDv = years.find(y => y.age === currentAge);
    return inDv ? inDv.age : (years[0]?.age ?? currentAge ?? 0);
  });

  const pickDaiVan = (idx: number) => {
    setDvIdx(idx);
    const ys = result.tieuVans.filter(t => t.daiVanIndex === idx).sort((a, b) => a.age - b.age);
    const inDv = ys.find(y => y.age === currentAge);
    setAge(inDv ? inDv.age : (ys[0]?.age ?? currentAge ?? 0));
    setOpenM(null);
  };

  const dv = daiVans.find(d => d.index === dvIdx);
  const months = useMemo(() => scoreAllNguyetVan(result, age), [result, age]);
  const tv = result.tieuVans.find(x => x.age === age);
  const year = tv?.year;
  // Tháng âm hiện tại (chỉ highlight khi đang xem năm ứng với tuổi hiện tại).
  const nowLunar = useMemo(() => {
    const t = new Date();
    return solarToLunar(t.getDate(), t.getMonth() + 1, t.getFullYear());
  }, []);
  const curMonth = (age === currentAge) ? nowLunar.month : -1;

  const [openM, setOpenM] = useState<number | null>(null);
  const [tabMode, setTabMode] = useState<Record<number, 'offline' | 'ai'>>({});
  const [ai, setAi] = useState<Record<number, { status: 'loading' | 'done' | 'error'; text: string }>>({});

  const chartW = width - SPACING.lg * 2 - SPACING.md * 2;
  const colW = Math.floor(chartW / 12);

  const openAiTab = (m: number) => {
    setTabMode(s => ({ ...s, [m]: 'ai' }));
    const cached = getAiResult(fkey(result, `nv:${age}:${m}:ai`));
    if (cached && !ai[m]) setAi(s => ({ ...s, [m]: { status: 'done', text: cached } }));
  };

  const runAI = async (m: number, force = false) => {
    const key = fkey(result, `nv:${age}:${m}:ai`);
    if (!force) {
      const cached = getAiResult(key);
      if (cached) { setAi(s => ({ ...s, [m]: { status: 'done', text: cached } })); return; }
    }
    const r = force ? await confirmReanalyze(key, 'ai') : await confirmAndUnlock(key, 'ai');
    if (r === 'cancel') return;
    if (r === 'nofund') {
      setAi(s => ({ ...s, [m]: { status: 'error', text: `🔒 Số dư không đủ (cần ${PREMIUM.COST.ai} xu). Nạp thêm trong Menu → Nạp xu.` } }));
      return;
    }
    if (force) { try { await clearAiResult(key); } catch {} }
    setAi(s => ({ ...s, [m]: { status: 'loading', text: '' } }));
    try {
      const txt = await analyzeNguyetVanWithAI(result, age, m);
      setAi(s => ({ ...s, [m]: { status: 'done', text: txt } }));
      setAiResult(key, txt);
    } catch (e: any) {
      const msg = String(e?.message) === 'OFFLINE'
        ? '⚠ Cần kết nối mạng để phân tích chuyên sâu.'
        : `⚠ ${e?.message || 'Có lỗi xảy ra.'}`;
      setAi(s => ({ ...s, [m]: { status: 'error', text: msg } }));
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="Nguyệt Vận" />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Hàng 1: chọn Đại vận */}
        <Text style={styles.rowLabel}>Chọn Đại vận</Text>
        {Platform.OS === 'web' ? (
          <View style={[styles.chipRow, { flexWrap: 'wrap' }]}>
            {daiVans.map(d => {
              const isNow = currentAge != null && currentAge >= d.startAge && currentAge <= d.endAge;
              return (
                <TouchableOpacity key={d.index} style={[styles.chip, d.index === dvIdx && styles.chipActive]} onPress={() => pickDaiVan(d.index)}>
                  <Text style={[styles.chipTxt, d.index === dvIdx && styles.chipTxtActive]}>{d.startAge}-{d.endAge}t{isNow ? ' ●' : ''}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {daiVans.map(d => {
                const isNow = currentAge != null && currentAge >= d.startAge && currentAge <= d.endAge;
                return (
                  <TouchableOpacity key={d.index} style={[styles.chip, d.index === dvIdx && styles.chipActive]} onPress={() => pickDaiVan(d.index)}>
                    <Text style={[styles.chipTxt, d.index === dvIdx && styles.chipTxtActive]}>{d.startAge}-{d.endAge}t{isNow ? ' ●' : ''}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* Hàng 2: chọn 1 trong 10 năm tiểu vận */}
        <Text style={styles.rowLabel}>Chọn năm (tiểu vận)</Text>
        {Platform.OS === 'web' ? (
          <View style={[styles.chipRow, { flexWrap: 'wrap' }]}>
            {years.map(y => {
              const isNow = y.age === currentAge;
              return (
                <TouchableOpacity key={y.age} style={[styles.chip, y.age === age && styles.chipActive]} onPress={() => { setAge(y.age); setOpenM(null); }}>
                  <Text style={[styles.chipTxt, y.age === age && styles.chipTxtActive]}>{y.age}t · {y.year}{isNow ? ' ●' : ''}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {years.map(y => {
                const isNow = y.age === currentAge;
                return (
                  <TouchableOpacity key={y.age} style={[styles.chip, y.age === age && styles.chipActive]} onPress={() => { setAge(y.age); setOpenM(null); }}>
                    <Text style={[styles.chipTxt, y.age === age && styles.chipTxtActive]}>{y.age}t · {y.year}{isNow ? ' ●' : ''}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        )}

        <Text style={styles.title}>Nguyệt Vận năm {year ?? ''}</Text>
        <Text style={styles.subtitle}>
          {age} tuổi{tv ? ` · ${tv.stem} ${tv.branch}` : ''}{dv ? ` · đại vận ${dv.startAge}-${dv.endAge}t` : ''} · vận 12 tháng âm lịch
        </Text>

        {/* Biểu đồ 12 tháng */}
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
              {months.map(d => (
                <View key={d.month} style={{ width: colW, height: CHART_H, justifyContent: 'flex-end', alignItems: 'center', position: 'relative' }}>
                  <View style={{ width: colW * 0.6, height: (d.taiLoc / 100) * CHART_H, backgroundColor: GREEN, borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />
                  <View style={{ position: 'absolute', bottom: 0, width: colW * 0.34, height: (d.thachThuc / 100) * CHART_H, backgroundColor: GRAY, opacity: 0.92 }} />
                </View>
              ))}
            </View>
          </View>
          <View style={styles.xRow}>
            {months.map(d => (
              <Text key={d.month} style={[styles.xLabel, { width: colW }]} numberOfLines={1}>{d.month}</Text>
            ))}
          </View>
          <Text style={styles.xCaption}>Tháng âm lịch (mỗi cột = 1 tháng)</Text>
        </View>

        {/* Danh sách 12 tháng */}
        {months.map(d => {
          const a = ai[d.month];
          const open = openM === d.month;
          const mode = tabMode[d.month] || 'offline';
          const isNow = d.month === curMonth;
          return (
            <View key={d.month} style={[styles.card, isNow && styles.cardNow]}>
              {isNow && <Text style={styles.nowBadge}>● Tháng hiện tại</Text>}
              <TouchableOpacity style={styles.cardHead} activeOpacity={0.7}
                onPress={() => setOpenM(open ? null : d.month)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardAge}>Tháng {d.month} (âm) · cung {d.palaceName}</Text>
                  <Text style={styles.cardYear}>{d.branch}</Text>
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

                  <View style={styles.tabsRow}>
                    <TouchableOpacity
                      style={[styles.tab, mode === 'offline' && styles.tabActive]}
                      onPress={() => setTabMode(s => ({ ...s, [d.month]: 'offline' }))}>
                      <Text style={[styles.tabTxt, mode === 'offline' && styles.tabTxtActive]}>📘 Nâng cao</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.tab, mode === 'ai' && styles.tabActive]}
                      onPress={() => openAiTab(d.month)}>
                      <Text style={[styles.tabTxt, mode === 'ai' && styles.tabTxtActive]}>🤖 Phân tích AI</Text>
                    </TouchableOpacity>
                  </View>

                  {mode === 'offline' ? (
                    <View style={styles.aiResult}>
                      <PaidGate unlockKey={fkey(result, `nv:${age}:${d.month}:adv`)} kind="advanced">
                        <SimpleMarkdown content={generateOfflineNguyetVan(result, age, d.month)} />
                        <ExportPdfButton
                          title={`Nguyệt Vận tháng ${d.month}${year ? ` năm ${year}` : ''}`}
                          subtitle="Bản Nâng cao (offline)"
                          badge="NÂNG CAO"
                          headerLines={chartHeaderLines(result)}
                          fileName={`${result.birthInfo.name || 'Lá số'} - Nguyệt vận - T${d.month}-${year ?? ''}`}
                          getContent={() => generateOfflineNguyetVan(result, age, d.month)}
                        />
                      </PaidGate>
                    </View>
                  ) : (
                    <>
                      {!a ? (
                        <View style={styles.aiResult}>
                          <Text style={styles.aiValueNote}>✨ {AI_VALUE_NOTE}</Text>
                          <TouchableOpacity style={styles.aiBtn} onPress={() => runAI(d.month)} activeOpacity={0.85}>
                            <Text style={styles.aiBtnText}>🔍 Phân tích AI ({PREMIUM.COST.ai} xu · {premiumBadgeNote()})</Text>
                          </TouchableOpacity>
                        </View>
                      ) : a.status === 'loading' ? (
                        <AIProgressBar label={`AI đang luận tháng ${d.month}…`} />
                      ) : a.status === 'done' ? (
                        <View style={styles.aiResult}>
                          <SimpleMarkdown content={a.text} />
                          <Text style={styles.dim}>* Nội dung AI, mang tính tham khảo.</Text>
                          <ExportPdfButton
                            title={`Nguyệt Vận tháng ${d.month}${year ? ` năm ${year}` : ''}`}
                            subtitle="Bản Phân tích AI"
                            badge="PHÂN TÍCH AI"
                            headerLines={chartHeaderLines(result)}
                            fileName={`${result.birthInfo.name || 'Lá số'} - Nguyệt vận - T${d.month}-${year ?? ''}`}
                            getContent={() => a.text}
                          />
                          <TouchableOpacity onPress={() => runAI(d.month, true)}><Text style={styles.retry}>↻ Phân tích lại (−{PREMIUM.COST.ai} xu)</Text></TouchableOpacity>
                        </View>
                      ) : (
                        <View style={styles.aiResult}>
                          <Text style={styles.summary}>{a.text}</Text>
                          <TouchableOpacity onPress={() => runAI(d.month)}><Text style={styles.retry}>↻ Thử lại</Text></TouchableOpacity>
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
  rowLabel: { color: COLORS.goldLight, fontSize: FONTS.size.sm, fontWeight: '700' },
  chipRow: { flexDirection: 'row', gap: SPACING.xs, paddingVertical: 2 },
  chip: {
    paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: 16,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  chipTxt: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, fontWeight: '700' },
  chipTxtActive: { color: '#1a0a00' },
  chartBox: { backgroundColor: COLORS.card, borderRadius: 12, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  legendRow: { flexDirection: 'row', gap: SPACING.lg, justifyContent: 'flex-end', marginBottom: SPACING.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 12, height: 12, borderRadius: 3 },
  legendTxt: { color: COLORS.textSecondary, fontSize: FONTS.size.xs },
  chartArea: { position: 'relative', justifyContent: 'flex-end' },
  grid: { position: 'absolute', left: 0, right: 0, borderTopWidth: 0.5, borderTopColor: COLORS.border },
  gridTxt: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700', position: 'absolute', left: -2, top: -8 },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end' },
  xRow: { flexDirection: 'row', marginTop: 4 },
  xLabel: { color: COLORS.goldLight, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  xCaption: { color: COLORS.textSecondary, fontSize: 12, textAlign: 'center', marginTop: 4, fontStyle: 'italic' },
  card: { backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  cardNow: { borderColor: COLORS.gold, borderWidth: 2.5 },
  nowBadge: { color: COLORS.gold, fontSize: FONTS.size.xs, fontWeight: '800', paddingHorizontal: SPACING.md, paddingTop: 6 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md },
  cardAge: { color: COLORS.textPrimary, fontSize: FONTS.size.md, fontWeight: '800' },
  cardYear: { color: COLORS.goldLight, fontSize: FONTS.size.sm, marginTop: 2, fontWeight: '600' },
  ratingChip: { color: '#1a0a00', fontSize: FONTS.size.xs, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, overflow: 'hidden' },
  chev: { color: COLORS.goldLight, fontSize: FONTS.size.lg, fontWeight: '800' },
  cardBody: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.md, gap: SPACING.sm },
  scoreLine: { flexDirection: 'row', gap: SPACING.sm },
  scoreTag: { color: '#0a2a14', backgroundColor: 'rgba(95,219,138,0.3)', fontSize: FONTS.size.xs, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  summary: { color: COLORS.textPrimary, fontSize: FONTS.size.md, lineHeight: 22 },
  tabsRow: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', marginTop: SPACING.xs,
  },
  tab: { flex: 1, paddingVertical: SPACING.sm, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: COLORS.gold, backgroundColor: COLORS.gold + '11' },
  tabTxt: { color: COLORS.textSecondary, fontWeight: '700', fontSize: FONTS.size.sm },
  tabTxtActive: { color: COLORS.gold },
  aiBtn: { backgroundColor: COLORS.purple, borderRadius: 8, padding: SPACING.sm, alignItems: 'center' },
  aiBtnText: { color: '#fff', fontSize: FONTS.size.sm, fontWeight: '800' },
  aiValueNote: { color: COLORS.goldLight, fontSize: FONTS.size.sm, fontStyle: 'italic', lineHeight: 18 },
  aiResult: { backgroundColor: COLORS.surface, borderRadius: 8, padding: SPACING.md, gap: SPACING.xs, borderWidth: 1, borderColor: COLORS.border },
  dim: { color: COLORS.textSecondary, fontSize: FONTS.size.xs, fontStyle: 'italic' },
  retry: { color: COLORS.purple, fontSize: FONTS.size.sm, fontWeight: '700', marginTop: 4 },
});
