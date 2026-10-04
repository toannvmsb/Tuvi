/**
 * NGHIỆM QUÁ KHỨ — 5–8 mốc sự kiện CÓ THỂ ĐÃ XẢY RA trong quá khứ của lá số đang gắn, mỗi mốc kèm phần
 * "Vì sao" (Tử Vi + Bát Tự, bốn phần Bẩm sinh / Giai đoạn 10 năm / Trong năm / Tóm lại) ở hai mức: người xem và người học tử vi ("Xem sâu hơn").
 * Bộ máy (src/core/pastReview) hoàn toàn tất định, lời văn ghép từ tín hiệu — KHÔNG gọi AI, miễn phí.
 * Phản hồi Đúng / Gần đúng / Sai / Không nhớ là tùy chọn; mốc Sai giữ nguyên lời luận kèm nhãn.
 * Đang ở giai đoạn THỬ NGHIỆM: bảng quy tắc/trọng số còn tạm (xem docs/past-review-rulebook.md).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import DetailLinkButton from '../components/DetailLinkButton';
import { COLORS, FONTS, TIER_COLORS } from '../constants/theme';
import { Screen, Card, Eyebrow, Body, Segmented } from '../ui';
import { useMyResult, NoChartState } from '../hooks/useMyResult';
import { webAlert } from '../lib/webAlert';
import { track } from '../lib/track';
import { listFeedback, saveFeedback, deleteFeedback } from '../lib/pastReviewStore';
import { yearCanChi } from '../core/annualEvents/calendar';
import { AREA_LABEL, type PastReview, type PastMarker } from '../core/pastReview';
import { getPastReview, cachedPastReview, pastReviewSignature } from '../lib/pastReviewCache';
import { describeMarker } from '../core/pastReview/phrases';
import { WhyBlock, FeedbackRow } from '../components/PastWhy';
import {
  MISS_LABEL, HINT_BIRTH_HOUR,
  summarizeFeedback, summaryText, solarRangeLabel, type FeedbackValue,
} from '../core/pastReview/feedback';
import type { AstrologyResult } from '../types';

type SortMode = 'strength' | 'time';

const TIER_LABEL = { manh: 'Mạnh', vua: 'Vừa', nhe: 'Nhẹ' } as const;
function MarkerCard({ marker, value, canSave, openWhy, openLearner, onToggleWhy, onToggleLearner, onFeedback }: {
  marker: PastMarker; value?: FeedbackValue; canSave: boolean;
  openWhy: boolean; openLearner: boolean;
  onToggleWhy: () => void; onToggleLearner: () => void; onFeedback: (v: FeedbackValue) => void;
}) {
  const phrase = useMemo(() => describeMarker(marker), [marker]);
  const cc = yearCanChi(marker.year);
  const tierColor = marker.tier === 'manh' ? COLORS.gold : marker.tier === 'vua' ? COLORS.goldLight : COLORS.textMuted;

  return (
    <Card style={{ gap: 10 }}>
      <View style={{ gap: 2 }}>
        <Eyebrow>{`Năm ${cc.stem} ${cc.branch} · tuổi ${marker.age}`}</Eyebrow>
        <Text style={s.range}>{`${marker.year} âm lịch (${solarRangeLabel(marker.year)})`}</Text>
      </View>
      <View style={s.chipRow}>
        <View style={[s.pill, { borderColor: COLORS.gold + '66', backgroundColor: COLORS.gold + '1A' }]}>
          <Text style={[s.pillTxt, { color: COLORS.goldLight }]}>{AREA_LABEL[marker.area]}</Text>
        </View>
        <View style={[s.pill, { borderColor: tierColor + '88' }]}>
          <Text style={[s.pillTxt, { color: tierColor }]}>
            {`${TIER_LABEL[marker.tier]}${marker.agree ? ' · cả hai hệ cùng báo' : ''}`}
          </Text>
        </View>
      </View>

      <Text style={s.phrase}>{phrase.text}</Text>
      {value === 'sai' && <Text style={s.missLabel}>{MISS_LABEL}</Text>}

      <Pressable
        onPress={onToggleWhy} accessibilityRole="button"
        accessibilityLabel={openWhy ? 'Thu gọn phần Vì sao' : 'Xem phần Vì sao'}
      >
        <Text style={s.link}>{openWhy ? '▾ Thu gọn "Vì sao"' : '▸ Vì sao có mốc này?'}</Text>
      </Pressable>

      {openWhy && <WhyBlock marker={marker} sensitive={phrase.sensitive} openLearner={openLearner} onToggleLearner={onToggleLearner} />}

      <FeedbackRow value={value} canSave={canSave} onFeedback={onFeedback} />
    </Card>
  );
}

export default function PastReviewScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const mine = useMyResult();
  const result: AstrologyResult | null = route.params?.result ?? mine.result;

  const [review, setReview] = useState<PastReview | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortMode>('strength');
  const [feedback, setFeedback] = useState<Record<number, FeedbackValue>>({});
  const [openWhy, setOpenWhy] = useState<Set<number>>(new Set());
  const [openLearner, setOpenLearner] = useState<Set<number>>(new Set());
  const sig = result ? pastReviewSignature(result) : '';
  const chartId = result?.birthInfo.chartId;
  const tracked = useRef('');

  useEffect(() => {
    if (!result) return;
    let cancelled = false;
    setError(null);
    const cached = cachedPastReview(result);
    if (cached) { setReview(cached); setProgress(null); return; }
    setReview(null);
    setProgress({ done: 0, total: 1 });
    getPastReview(result, (done, total) => { if (!cancelled) setProgress({ done, total }); })
      .then(r => { if (cancelled) return; setReview(r); setProgress(null); })
      .catch(e => { if (!cancelled) { setError(e?.message || 'Không tính được các mốc.'); setProgress(null); } });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  useEffect(() => {
    if (!chartId) { setFeedback({}); return; }
    let cancelled = false;
    listFeedback(chartId)
      .then(rows => { if (!cancelled) setFeedback(Object.fromEntries(rows.map(r => [r.year, r.value]))); })
      .catch(() => { /* chưa đọc được phản hồi — vẫn xem được các mốc */ });
    return () => { cancelled = true; };
  }, [chartId]);

  useEffect(() => {
    if (review && tracked.current !== sig) {
      tracked.current = sig;
      track('past_review_open', { markers: review.markers.length });
    }
  }, [review, sig]);

  const markers = useMemo(() => {
    if (!review) return [];
    return sort === 'time' ? [...review.markers].sort((a, b) => a.year - b.year) : review.markers;
  }, [review, sort]);

  const summary = useMemo(() => {
    const vals = (review?.markers ?? []).map(m => feedback[m.year]).filter(Boolean) as FeedbackValue[];
    return summarizeFeedback(vals);
  }, [review, feedback]);

  if (mine.loading) return null;
  if (!result) return <NoChartState title="Cần có lá số để nghiệm quá khứ" />;

  const toggle = (set: Set<number>, setter: (s: Set<number>) => void, year: number, evt?: () => void) => {
    const next = new Set(set);
    if (next.has(year)) next.delete(year); else { next.add(year); evt?.(); }
    setter(next);
  };

  const onFeedback = async (m: PastMarker, v: FeedbackValue) => {
    if (!chartId) {
      webAlert.alert('Chưa lưu được', 'Cần đăng nhập và lưu lá số để ghi nhận phản hồi.');
      return;
    }
    const prev = feedback[m.year];
    const clearing = prev === v;
    setFeedback(f => { const n = { ...f }; if (clearing) delete n[m.year]; else n[m.year] = v; return n; });
    try {
      if (clearing) await deleteFeedback(chartId, m.year);
      else {
        await saveFeedback({ chartId, marker: m, value: v });
        track('past_review_feedback', { value: v, tier: m.tier, agree: m.agree, area: m.area, yearsAgo: review ? review.currentLunarYear - m.year : 0 });
      }
    } catch (e: any) {
      setFeedback(f => { const n = { ...f }; if (prev) n[m.year] = prev; else delete n[m.year]; return n; });
      webAlert.alert('Chưa lưu được', e?.message || 'Vui lòng thử lại.');
    }
  };

  const name = result.birthInfo.name || 'bạn';
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScreenHeader title="Nghiệm quá khứ" onBack={() => navigation.goBack()} />
      <Screen contentStyle={{ paddingTop: 12 }}>
        <Card hero style={{ gap: 8 }}>
          <View style={s.chipRow}>
            <View style={[s.pill, { borderColor: COLORS.purple + '88', backgroundColor: COLORS.purple + '22' }]}>
              <Text style={[s.pillTxt, { color: COLORS.purple }]}>Thử nghiệm</Text>
            </View>
          </View>
          <Eyebrow>{`Những năm đã qua của ${name}`}</Eyebrow>
          <Body size={13}>
            Tuzi nhìn lại lá số và chọn ra vài năm có thể đã có biến động, kèm lý do theo cả Tử Vi lẫn Bát Tự.
            Đây là chiêm nghiệm để tham khảo, không phải phán đoán — bạn đọc, đối chiếu với trải nghiệm của mình
            rồi tự đánh giá. Phản hồi là tùy chọn.
          </Body>
        </Card>

        <Pressable
          onPress={() => navigation.navigate('PastLife', { result })}
          accessibilityRole="button" accessibilityLabel="Xem dòng đời đã qua"
        >
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, gap: 3 }}>
              <Eyebrow>Dòng đời đã qua</Eyebrow>
              <Body size={13}>Xem thăng trầm theo từng đại hạn, ghi chú theo năm và thẻ chia sẻ.</Body>
            </View>
            <Text style={s.link}>Xem →</Text>
          </Card>
        </Pressable>

        {progress && (
          <View style={s.loadingBox}>
            <ActivityIndicator color={COLORS.gold} />
            <Body size={13}>{`Đang xem lại các năm đã qua… ${progress.done}/${progress.total}`}</Body>
          </View>
        )}
        {error && <Card><Body color={COLORS.red}>{error}</Body></Card>}

        {review && review.markers.length === 0 && (
          <Card><Body>
            Chưa đủ năm đã qua để nghiệm: Tuzi chỉ xét các năm bạn từ 15 tuổi trở lên và không xét năm hiện tại.
          </Body></Card>
        )}

        {review && review.markers.length > 0 && (
          <>
            <Segmented<SortMode>
              options={[{ value: 'strength', label: 'Theo độ chính xác' }, { value: 'time', label: 'Theo thời gian' }]}
              value={sort} onChange={setSort}
            />
            {summary.answered > 0 && (
              <Card tint={COLORS.gold} style={{ gap: 6 }}>
                <Text style={s.summary}>{summaryText(summary)}</Text>
                {summary.unsure > 0 && <Text style={s.note}>{`${summary.unsure} mốc bạn chọn "Không nhớ" — không tính vào số khớp.`}</Text>}
                {summary.showBirthHourHint && <Text style={s.hint}>{HINT_BIRTH_HOUR}</Text>}
              </Card>
            )}
            {markers.map(m => (
              <MarkerCard
                key={m.year}
                marker={m} value={feedback[m.year]} canSave={!!chartId}
                openWhy={openWhy.has(m.year)} openLearner={openLearner.has(m.year)}
                onToggleWhy={() => toggle(openWhy, setOpenWhy, m.year, () => track('past_review_why_open', { area: m.area, tier: m.tier }))}
                onToggleLearner={() => toggle(openLearner, setOpenLearner, m.year, () => track('past_review_learner_open', { area: m.area }))}
                onFeedback={v => onFeedback(m, v)}
              />
            ))}
          </>
        )}

        <Text style={s.disclaimer}>
          Mỗi mốc là một khả năng theo lá số, không phải sự thật đã được kiểm chứng; năm tính theo âm lịch kèm khoảng
          tháng dương lịch. Tuzi chưa hỗ trợ lá số không rõ giờ sinh. Nội dung chỉ mang tính tham khảo, không thay thế
          lời khuyên chuyên môn.
        </Text>
        <DetailLinkButton result={result} target="DaiVan" />
      </Screen>
    </View>
  );
}

const s = StyleSheet.create({
  range: { fontFamily: FONTS.display, fontSize: 24, color: COLORS.textPrimary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(226,194,133,0.25)' },
  pillTxt: { fontFamily: FONTS.bodySemi, fontSize: 11.5, color: COLORS.textSecondary },
  phrase: { fontFamily: FONTS.bodySemi, fontSize: 15, lineHeight: 22, color: COLORS.textPrimary },
  missLabel: { fontFamily: FONTS.bodySemi, fontSize: 12, color: TIER_COLORS.bad },
  link: { fontFamily: FONTS.bodySemi, fontSize: 13, color: COLORS.gold, paddingVertical: 4 },
  note: { fontFamily: FONTS.body, fontSize: 11.5, lineHeight: 17, color: COLORS.textMuted },
  summary: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.goldLight },
  hint: { fontFamily: FONTS.bodySemi, fontSize: 12.5, lineHeight: 19, color: TIER_COLORS.caution },
  loadingBox: { alignItems: 'center', gap: 10, paddingVertical: 20 },
  disclaimer: { fontFamily: FONTS.body, fontSize: 11.5, lineHeight: 17, color: COLORS.textMuted, textAlign: 'center', marginTop: 4 },
});
