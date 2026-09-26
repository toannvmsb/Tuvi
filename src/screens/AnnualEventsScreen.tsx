/**
 * LUẬN SỰ KIỆN TRONG NĂM — 85 sự kiện theo Tử Vi Nam Phái, chấm điểm bằng engine xác định
 * (core/annualEvents), không phải AI đoán tự do. "Nâng cao" trình bày trực tiếp kết quả đã
 * chấm điểm (không cần AI); "Phân tích AI" biến kết quả đó thành lời khuyên hành động.
 *
 * Giá: NĂM HIỆN TẠI xem Nâng cao MIỄN PHÍ (Phân tích AI vẫn tính phí); mở NĂM KHÁC tính phí mở
 * Nâng cao + phí Phân tích AI riêng.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import SimpleMarkdown from '../components/SimpleMarkdown';
import ExportPdfButton from '../components/ExportPdfButton';
import AnnualEventCard from '../components/AnnualEventCard';
import { COLORS, FONTS } from '../constants/theme';
import { Screen, Card, Display, Eyebrow, Body, SectionTitle, Segmented, GoldButton } from '../ui';
import { useMyResult, NoChartState } from '../hooks/useMyResult';
import {
  computeAnnualPrediction, analyzeAnnualEventsWithAI,
  generateFullAnnualEventsExport, primaryMonthOf, INTENSITY_VN, type AnnualPrediction,
} from '../core/annualEvents';
import { chartHeaderLines } from '../utils/pdfExport';
import { PREMIUM, costNote } from '../constants/premium';
import { fkey } from '../lib/featureKey';
import { getAiResult, setAiResult, clearAiResult } from '../lib/aiResults';
import { confirmAndUnlock, confirmReanalyze } from '../lib/confirmCharge';
import type { AstrologyResult } from '../types';

type Mode = 'advanced' | 'ai';
type AiState = { status: 'idle' | 'loading' | 'done' | 'error'; text: string };

export default function AnnualEventsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const mine = useMyResult();
  const result: AstrologyResult | null = route.params?.result ?? mine.result;

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(route.params?.year ?? result?.tuViChart.viewingYear ?? currentYear);
  const isCurrentYear = year === currentYear;
  const [mode, setMode] = useState<Mode>('advanced');
  const [unlockedAdvanced, setUnlockedAdvanced] = useState(false);
  const [ai, setAi] = useState<AiState>({ status: 'idle', text: '' });

  const pred: AnnualPrediction | null = useMemo(() => (result ? computeAnnualPrediction(result, year) : null), [result, year]);
  const advancedKey = result ? fkey(result, `annualEvents:${year}:adv`) : '';
  const aiKey = result ? fkey(result, `annualEvents:${year}:ai`) : '';
  const showAdvancedContent = isCurrentYear || unlockedAdvanced;

  // "Sự kiện theo tháng" — đếm đúng các sự kiện đang hiện ở "Sự kiện nổi bật" (featuredGroups),
  // mỗi sự kiện tính vào ĐÚNG 1 tháng đại diện (xem primaryMonthOf — tháng của cửa sổ thời điểm có
  // xác suất cao nhất). Mảng 13 phần tử, chỉ dùng index 1..12.
  const monthCounts = useMemo(() => {
    const counts = new Array(13).fill(0) as number[];
    if (!pred) return counts;
    for (const g of pred.featuredGroups) {
      for (const e of g.events) {
        const m = primaryMonthOf(e);
        if (m && m >= 1 && m <= 12) counts[m]++;
      }
    }
    return counts;
  }, [pred]);

  React.useEffect(() => {
    setUnlockedAdvanced(false);
    setAi({ status: 'idle', text: '' });
    if (result) {
      const cached = getAiResult(aiKey);
      if (cached) setAi({ status: 'done', text: cached });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, result?.birthInfo.chartId]);

  if (mine.loading) return null;
  if (!result) return <NoChartState title="Cần có lá số để luận sự kiện trong năm" />;

  const unlockAdvanced = async () => {
    const r = await confirmAndUnlock(advancedKey, 'advanced', PREMIUM.COST.annualEvents);
    if (r === 'ok' || r === 'free') setUnlockedAdvanced(true);
  };

  const runAI = async (force = false) => {
    if (!pred) return;
    if (!force) {
      const cached = getAiResult(aiKey);
      if (cached) { setAi({ status: 'done', text: cached }); return; }
    }
    const r = force ? await confirmReanalyze(aiKey, 'ai', PREMIUM.COST.aiAnnualEvents) : await confirmAndUnlock(aiKey, 'ai', PREMIUM.COST.aiAnnualEvents);
    if (r === 'cancel') return;
    if (r === 'nofund') { setAi({ status: 'error', text: `🔒 Số dư không đủ (cần ${PREMIUM.COST.aiAnnualEvents} xu). Nạp thêm trong Menu → Nạp xu.` }); return; }
    if (force) { try { await clearAiResult(aiKey); } catch { /* bỏ qua */ } }
    setAi({ status: 'loading', text: '' });
    try {
      const txt = await analyzeAnnualEventsWithAI(result, pred);
      setAi({ status: 'done', text: txt });
      setAiResult(aiKey, txt);
    } catch (e: any) {
      const msg = String(e?.message) === 'OFFLINE' ? '⚠ Cần kết nối mạng để phân tích chuyên sâu.' : `⚠ ${e?.message || 'Có lỗi xảy ra.'}`;
      setAi({ status: 'error', text: msg });
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScreenHeader title="Luận sự kiện năm" onBack={() => navigation.goBack()} />
      <Screen contentStyle={{ paddingTop: 12 }}>
        <View style={s.yearRow}>
          <Pressable style={s.yearBtn} onPress={() => setYear(y => y - 1)} accessibilityRole="button" accessibilityLabel="Năm trước">
            <Text style={s.yearBtnTxt}>‹</Text>
          </Pressable>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Display size={30}>{year}</Display>
            {pred && <Text style={s.yearSub}>{pred.yearCanChi} · {pred.targetAge} tuổi{isCurrentYear ? ' · Năm hiện tại' : ''}</Text>}
          </View>
          <Pressable style={s.yearBtn} onPress={() => setYear(y => y + 1)} accessibilityRole="button" accessibilityLabel="Năm sau">
            <Text style={s.yearBtnTxt}>›</Text>
          </Pressable>
        </View>

        {pred && (
          <Card hero style={{ gap: 10 }}>
            <Eyebrow>{`Vận hạn diễn ra trong năm ${year} của ${result.birthInfo.name || 'bạn'}`}</Eyebrow>
            <Text style={s.overallTxt}>Nhìn chung, năm nay có {INTENSITY_VN[pred.overallIntensity]}.</Text>
            {pred.annualTheme.length > 0 ? (
              <View style={{ gap: 4 }}>
                {pred.annualTheme.map((t, i) => <Body key={i} size={13}>• {t}</Body>)}
              </View>
            ) : (
              <Body size={13}>Chưa ghi nhận sự kiện nào nổi bật đạt ngưỡng đáng chú ý — năm tương đối bình ổn theo các nhóm đã xét.</Body>
            )}
          </Card>
        )}

        <Segmented<Mode>
          options={[
            { value: 'advanced', label: isCurrentYear ? 'Nâng cao (miễn phí)' : `Nâng cao (${costNote(PREMIUM.COST.annualEvents)})` },
            {
              value: 'ai',
              label: (
                <View style={{ alignItems: 'center' }}>
                  <Text style={[s.segTxtLine, { color: mode === 'ai' ? '#1E1230' : COLORS.textSecondary, fontFamily: mode === 'ai' ? FONTS.bodyBold : FONTS.bodySemi }]}>Phân tích AI</Text>
                  <Text style={[s.segTxtSub, { color: mode === 'ai' ? '#1E1230' : COLORS.textSecondary }]}>{`(${costNote(PREMIUM.COST.aiAnnualEvents)})`}</Text>
                </View>
              ),
            },
          ]}
          value={mode} onChange={setMode}
        />

        {mode === 'advanced' && pred && (
          showAdvancedContent ? (
            pred.featuredGroups.length > 0 ? (
              <View style={{ gap: 10 }}>
                <Card style={{ gap: 10 }}>
                  <SectionTitle title="Sự kiện theo tháng" sub="Theo tháng âm lịch" />
                  <View style={s.monthGrid}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                      const count = monthCounts[m];
                      return (
                        <Pressable
                          key={m}
                          style={[s.monthBtn, count === 0 && s.monthBtnDisabled]}
                          disabled={count === 0}
                          onPress={() => navigation.navigate('MonthEvents', { result, year, month: m })}
                          accessibilityRole="button"
                          accessibilityLabel={`Sự kiện tháng ${m}, ${count} sự kiện`}
                        >
                          <Text style={s.monthBtnTxt}>Tháng {m}: {count}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </Card>

                <SectionTitle title="Sự kiện nổi bật" sub={`${pred.featuredGroups.length} lĩnh vực`} />
                {pred.featuredGroups.map(g => (
                  <View key={g.category} style={{ gap: 8 }}>
                    <Eyebrow color={COLORS.goldLight}>{g.label}</Eyebrow>
                    {g.events.map(e => <AnnualEventCard key={e.eventId} e={e} />)}
                  </View>
                ))}
                {pred.composites.length > 0 && (
                  <Card style={{ gap: 6 }}>
                    <Eyebrow color={COLORS.purple}>Liên hệ giữa các nhóm</Eyebrow>
                    {pred.composites.map(c => <Body key={c.id} size={12.5}>{c.narrativeHint}</Body>)}
                  </Card>
                )}
                <ExportPdfButton
                  label="Xuất đầy đủ các sự kiện"
                  title={`Toàn bộ sự kiện năm ${year}`}
                  subtitle={`${pred.yearCanChi} · ${pred.targetAge} tuổi`}
                  headerLines={chartHeaderLines(result)}
                  badge="TOÀN BỘ SỰ KIỆN"
                  fileName={`su-kien-nam-${year}`}
                  getContent={() => generateFullAnnualEventsExport(pred)}
                />
              </View>
            ) : (
              <Card><Body>Chưa ghi nhận sự kiện nào nổi bật đạt ngưỡng đáng chú ý trong năm {year}.</Body></Card>
            )
          ) : (
            <Card style={{ gap: 12, alignItems: 'center' }}>
              <Body style={{ textAlign: 'center' }}>Mở phân tích Nâng cao để xem chi tiết {pred.debugCandidateCount} nhóm sự kiện đã chấm điểm cho năm {year}.</Body>
              <GoldButton label={`Mở Nâng cao (${costNote(PREMIUM.COST.annualEvents)})`} onPress={unlockAdvanced} />
            </Card>
          )
        )}

        {mode === 'ai' && (
          ai.status === 'idle' ? (
            <Card style={{ gap: 12, alignItems: 'center' }}>
              <Body style={{ textAlign: 'center' }}>AI sẽ biến kết quả đã chấm điểm thành tổng quan năm, thời điểm cần lưu ý và lời khuyên hành động cụ thể.</Body>
              <GoldButton label={`Phân tích AI (${costNote(PREMIUM.COST.aiAnnualEvents)})`} onPress={() => runAI()} />
            </Card>
          ) : ai.status === 'loading' ? (
            <View style={s.loadingBox}><ActivityIndicator color={COLORS.gold} /><Body size={13}>Tuzi đang luận vận năm {year}…</Body></View>
          ) : ai.status === 'done' ? (
            <View style={{ gap: 12 }}>
              <Card><SimpleMarkdown content={ai.text} /></Card>
              <Pressable onPress={() => runAI(true)} accessibilityRole="button">
                <Text style={s.retry}>↻ Phân tích lại (−{PREMIUM.COST.aiAnnualEvents} xu)</Text>
              </Pressable>
            </View>
          ) : (
            <Card style={{ gap: 10 }}>
              <Body color={COLORS.red}>{ai.text}</Body>
              <GoldButton label="Thử lại" onPress={() => runAI()} />
            </Card>
          )
        )}

        <Text style={s.disclaimer}>
          Luận sự kiện thể hiện xu hướng và mức độ hội tụ dữ kiện trên lá số, không phải phán đoán tuyệt đối hay lời khuyên y tế/pháp lý/tài chính chuyên môn.
        </Text>
      </Screen>
    </View>
  );
}

const s = StyleSheet.create({
  yearRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  yearBtn: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(226,194,133,0.2)',
  },
  yearBtnTxt: { fontFamily: FONTS.display, fontSize: 22, color: COLORS.goldLight },
  yearSub: { fontFamily: FONTS.body, fontSize: 12.5, color: COLORS.textSecondary },
  overallTxt: { fontFamily: FONTS.bodySemi, fontSize: 14, color: COLORS.goldLight },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  monthBtn: {
    width: '31%', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(226,194,133,0.25)',
    backgroundColor: 'rgba(255,255,255,0.04)', paddingVertical: 10, alignItems: 'center',
  },
  monthBtnDisabled: { opacity: 0.35 },
  monthBtnTxt: { fontFamily: FONTS.bodySemi, fontSize: 13, color: COLORS.textPrimary },
  segTxtLine: { fontSize: 12.5, lineHeight: 15, textAlign: 'center' },
  segTxtSub: { fontFamily: FONTS.body, fontSize: 10.5, lineHeight: 13, textAlign: 'center' },
  loadingBox: { alignItems: 'center', gap: 10, paddingVertical: 20 },
  retry: { fontFamily: FONTS.bodySemi, fontSize: 13, color: COLORS.gold, textAlign: 'center' },
  disclaimer: { fontFamily: FONTS.body, fontSize: 11.5, lineHeight: 17, color: COLORS.textMuted, textAlign: 'center', marginTop: 4 },
});
