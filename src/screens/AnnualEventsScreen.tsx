/**
 * LUẬN SỰ KIỆN TRONG NĂM — 85 sự kiện theo Tử Vi Nam Phái, chấm điểm bằng engine xác định
 * (core/annualEvents), không phải AI đoán tự do. "Nâng cao" trình bày trực tiếp kết quả đã
 * chấm điểm (không cần AI); "Phân tích AI" biến kết quả đó thành lời khuyên hành động.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import SimpleMarkdown from '../components/SimpleMarkdown';
import { COLORS, FONTS, TIER_COLORS } from '../constants/theme';
import { Screen, Card, Display, Eyebrow, Body, SectionTitle, ScoreRing, Segmented, GoldButton } from '../ui';
import Icon from '../ui/Icon';
import { useMyResult, NoChartState } from '../hooks/useMyResult';
import { computeAnnualPrediction, generateAnnualOfflineSummary, analyzeAnnualEventsWithAI, type AnnualPrediction, type ScoredEvent } from '../core/annualEvents';
import { PREMIUM, costNote } from '../constants/premium';
import { fkey } from '../lib/featureKey';
import { getAiResult, setAiResult, clearAiResult } from '../lib/aiResults';
import { confirmAndUnlock, confirmReanalyze } from '../lib/confirmCharge';
import type { AstrologyResult } from '../types';

const DIRECTION_COLOR: Record<ScoredEvent['direction'], string> = {
  POSITIVE: TIER_COLORS.great, NEGATIVE: TIER_COLORS.bad, MIXED: TIER_COLORS.caution,
};
const DIRECTION_LABEL: Record<ScoredEvent['direction'], string> = {
  POSITIVE: 'Thuận lợi', NEGATIVE: 'Cần thận trọng', MIXED: 'Hai chiều',
};

type Mode = 'advanced' | 'ai';
type AiState = { status: 'idle' | 'loading' | 'done' | 'error'; text: string };

function EventCard({ e }: { e: ScoredEvent }) {
  const [open, setOpen] = useState(false);
  const color = DIRECTION_COLOR[e.direction];
  return (
    <Pressable onPress={() => setOpen(v => !v)} accessibilityRole="button">
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <ScoreRing score={e.strength} size={52} stroke={5} numberSize={16} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.eventCat}>{e.category}</Text>
            <Text style={s.eventTitle} numberOfLines={2}>{e.title}</Text>
          </View>
          <Icon name="chev" size={18} color={COLORS.textMuted} />
        </View>
        <View style={s.chipRow}>
          <View style={[s.chip, { backgroundColor: color + '22', borderColor: color + '66' }]}>
            <Text style={[s.chipTxt, { color }]}>{DIRECTION_LABEL[e.direction]}</Text>
          </View>
          <View style={s.chip}><Text style={s.chipTxt}>{e.level}</Text></View>
          <View style={s.chip}><Text style={s.chipTxt}>Tin cậy {e.confidence}</Text></View>
          {e.isMajorEvent && <View style={[s.chip, { backgroundColor: COLORS.gold + '22', borderColor: COLORS.gold }]}><Text style={[s.chipTxt, { color: COLORS.goldLight }]}>⭐ Sự kiện lớn</Text></View>}
        </View>
        {open && (
          <View style={{ gap: 8, paddingTop: 4, borderTopWidth: 1, borderTopColor: 'rgba(226,194,133,0.14)' }}>
            {e.reasoningChain.length > 0 && (
              <Body size={12.5}>Dữ kiện: {e.reasoningChain.join('; ')}.</Body>
            )}
            {e.peakMonths.length > 0 ? (
              <Body size={12.5} color={COLORS.goldLight}>
                Thời điểm mạnh: {e.peakMonths.map(m => (m.startLunarMonth === m.endLunarMonth ? `tháng ${m.startLunarMonth}` : `tháng ${m.startLunarMonth}–${m.endLunarMonth}`)).join('; ')} âm lịch.
              </Body>
            ) : (
              <Body size={12.5}>Chưa đủ dữ liệu để khoanh vùng tháng cụ thể cho sự kiện này.</Body>
            )}
            {e.counterEvidence.length > 0 && (
              <Body size={12} color={COLORS.textMuted}>Dữ kiện ngược chiều: {e.counterEvidence.slice(0, 3).map(c => c.starName).join(', ')} — không nên chủ quan tuyệt đối theo một hướng.</Body>
            )}
          </View>
        )}
      </Card>
    </Pressable>
  );
}

export default function AnnualEventsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const mine = useMyResult();
  const result: AstrologyResult | null = route.params?.result ?? mine.result;

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(route.params?.year ?? result?.tuViChart.viewingYear ?? currentYear);
  const [mode, setMode] = useState<Mode>('advanced');
  const [unlockedAdvanced, setUnlockedAdvanced] = useState(false);
  const [ai, setAi] = useState<AiState>({ status: 'idle', text: '' });

  const pred: AnnualPrediction | null = useMemo(() => (result ? computeAnnualPrediction(result, year) : null), [result, year]);
  const advancedKey = result ? fkey(result, `annualEvents:${year}:adv`) : '';
  const aiKey = result ? fkey(result, `annualEvents:${year}:ai`) : '';

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
            {pred && <Text style={s.yearSub}>{pred.yearCanChi} · {pred.targetAge} tuổi</Text>}
          </View>
          <Pressable style={s.yearBtn} onPress={() => setYear(y => y + 1)} accessibilityRole="button" accessibilityLabel="Năm sau">
            <Text style={s.yearBtnTxt}>›</Text>
          </Pressable>
        </View>

        {pred && (
          <Card hero style={{ gap: 10 }}>
            <Eyebrow>Vận hạn diễn ra trong năm {year}</Eyebrow>
            <Text style={s.overallTxt}>Độ sôi động chung: {pred.overallIntensity}</Text>
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
          options={[{ value: 'advanced', label: `Nâng cao (${costNote(PREMIUM.COST.annualEvents)})` }, { value: 'ai', label: `Phân tích AI (${costNote(PREMIUM.COST.aiAnnualEvents)})` }]}
          value={mode} onChange={setMode}
        />

        {mode === 'advanced' && pred && (
          unlockedAdvanced ? (
            pred.events.length > 0 ? (
              <View style={{ gap: 10 }}>
                <SectionTitle title="Sự kiện nổi bật" sub={`${pred.events.length}/${pred.debugCandidateCount} nhóm đã xét`} />
                {pred.events.map(e => <EventCard key={e.eventId} e={e} />)}
                {pred.composites.length > 0 && (
                  <Card style={{ gap: 6 }}>
                    <Eyebrow color={COLORS.purple}>Liên hệ giữa các nhóm</Eyebrow>
                    {pred.composites.map(c => <Body key={c.id} size={12.5}>{c.narrativeHint}</Body>)}
                  </Card>
                )}
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

        {mode === 'advanced' && unlockedAdvanced && pred && (
          <Card style={{ marginTop: 4 }}>
            <SimpleMarkdown content={generateAnnualOfflineSummary(pred)} />
          </Card>
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
  eventCat: { fontFamily: FONTS.bodySemi, fontSize: 11, letterSpacing: 1, color: COLORS.textMuted, textTransform: 'uppercase' },
  eventTitle: { fontFamily: FONTS.display, fontSize: 19, color: COLORS.textPrimary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(226,194,133,0.22)', backgroundColor: 'rgba(255,255,255,0.05)' },
  chipTxt: { fontFamily: FONTS.bodySemi, fontSize: 11, color: COLORS.textSecondary },
  loadingBox: { alignItems: 'center', gap: 10, paddingVertical: 20 },
  retry: { fontFamily: FONTS.bodySemi, fontSize: 13, color: COLORS.gold, textAlign: 'center' },
  disclaimer: { fontFamily: FONTS.body, fontSize: 11.5, lineHeight: 17, color: COLORS.textMuted, textAlign: 'center', marginTop: 4 },
});
