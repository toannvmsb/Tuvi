/**
 * LUẬN TƯƠNG LAI — nhìn về các năm SẮP TỚI của lá số đang gắn, tới khi đủ 100 tuổi, bằng đúng bộ máy của "Nghiệm quá khứ"
 * (Tử Vi Nam Phái + Bát Tự, bốn tầng Bẩm sinh / Giai đoạn 10 năm / Trong năm / Tóm lại). Lời văn ở thể XU HƯỚNG, kèm gợi ý hành động;
 * không phán chắc, năm nhạy cảm chỉ nói ở mức mảng đời. Không có phản hồi Đúng/Sai (chưa xảy ra).
 * Miễn phí: danh sách năm nổi bật + biểu đồ xu hướng + chặng đại vận hiện tại. Mở khóa bằng xu (1 lần/lá số): các chặng sau + chi tiết năm của chúng.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import DetailLinkButton from '../components/DetailLinkButton';
import PastLifeChart, { ChartLegend, type SeriesKey } from '../components/PastLifeChart';
import { WhyBlock } from '../components/PastWhy';
import { COLORS, FONTS, TIER_COLORS } from '../constants/theme';
import { Screen, Card, Eyebrow, Body, Segmented, GoldButton } from '../ui';
import { useMyResult, NoChartState } from '../hooks/useMyResult';
import { PREMIUM, isUnlocked, xuVnd } from '../constants/premium';
import { confirmAndUnlock } from '../lib/confirmCharge';
import { fkey } from '../lib/featureKey';
import { webAlert } from '../lib/webAlert';
import { track } from '../lib/track';
import { useContentWidth } from '../lib/platform';
import { getFutureReview, cachedFutureReview } from '../lib/futureReviewCache';
import { pastReviewSignature } from '../lib/pastReviewCache';
import { yearCanChi } from '../core/annualEvents/calendar';
import { AREA_LABEL, FUTURE_CONFIG } from '../core/pastReview';
import type { FutureReview, FutureMarker } from '../core/pastReview/futureReview';
import { describeFutureMarker } from '../core/pastReview/futurePhrases';
import { buildFutureTimeline, markerOfYear, type TimelineYear } from '../core/pastReview/timeline';
import { solarRangeLabel } from '../core/pastReview/feedback';
import type { AstrologyResult } from '../types';

type Tab = 'markers' | 'chapters';
type SortMode = 'time' | 'strength';

const TIER_LABEL = { manh: 'Nổi bật rõ', vua: 'Nổi bật vừa', nhe: 'Nổi bật nhẹ' } as const;
const ALL_ON: Record<SeriesKey, boolean> = { total: true, career: false, wealth: false, love: false, family: false };

const safeRange = (y: number) => { try { return solarRangeLabel(y); } catch { return ''; } };
const yearHead = (y: number, age: number) => { const c = yearCanChi(y); return `Năm ${c.stem} ${c.branch} · tuổi ${age}`; };

function MarkerCard({ marker, openWhy, openLearner, onToggleWhy, onToggleLearner }: {
  marker: FutureMarker; openWhy: boolean; openLearner: boolean; onToggleWhy: () => void; onToggleLearner: () => void;
}) {
  const ph = useMemo(() => describeFutureMarker(marker), [marker]);
  const tierColor = marker.tier === 'manh' ? COLORS.gold : marker.tier === 'vua' ? COLORS.goldLight : COLORS.textMuted;
  return (
    <Card style={{ gap: 10 }}>
      <View style={{ gap: 2 }}>
        <Eyebrow>{yearHead(marker.year, marker.age)}</Eyebrow>
        <Text style={s.range}>{`${marker.year} âm lịch${safeRange(marker.year) ? ` (${safeRange(marker.year)})` : ''}`}</Text>
      </View>
      <View style={s.chipRow}>
        <View style={[s.pill, { borderColor: COLORS.gold + '66', backgroundColor: COLORS.gold + '1A' }]}>
          <Text style={[s.pillTxt, { color: COLORS.goldLight }]}>{AREA_LABEL[marker.area]}</Text>
        </View>
        <View style={[s.pill, { borderColor: tierColor + '88' }]}>
          <Text style={[s.pillTxt, { color: tierColor }]}>{`${TIER_LABEL[marker.tier]}${marker.agree ? ' · cả hai hệ cùng báo' : ''}`}</Text>
        </View>
      </View>
      <Text style={s.phrase}>{ph.text}</Text>
      <Text style={s.advice}><Text style={s.adviceHead}>Gợi ý: </Text>{ph.advice}</Text>
      <Pressable onPress={onToggleWhy} accessibilityRole="button" accessibilityLabel={openWhy ? 'Thu gọn phần Vì sao' : 'Xem phần Vì sao'}>
        <Text style={s.link}>{openWhy ? '▾ Thu gọn "Vì sao"' : '▸ Vì sao có xu hướng này?'}</Text>
      </Pressable>
      {openWhy && <WhyBlock marker={marker} sensitive={ph.sensitive} openLearner={openLearner} onToggleLearner={onToggleLearner} />}
    </Card>
  );
}

export default function FutureReviewScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const mine = useMyResult();
  const result: AstrologyResult | null = route.params?.result ?? mine.result;
  const cw = useContentWidth();
  const unlockKey = result ? fkey(result, 'future:full') : '';

  const [fr, setFr] = useState<FutureReview | null>(result ? cachedFutureReview(result) ?? null : null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('markers');
  const [sort, setSort] = useState<SortMode>('time');
  const [active, setActive] = useState<Record<SeriesKey, boolean>>(ALL_ON);
  const [selected, setSelected] = useState<number | null>(null);
  const [unlocked, setUnlocked] = useState(() => (unlockKey ? isUnlocked(unlockKey) : false));
  const [openWhy, setOpenWhy] = useState<Set<number>>(new Set());
  const [openLearner, setOpenLearner] = useState<Set<number>>(new Set());
  const sig = result ? pastReviewSignature(result) : '';
  const tracked = useRef('');

  useEffect(() => { setUnlocked(unlockKey ? isUnlocked(unlockKey) : false); }, [unlockKey]);

  useEffect(() => {
    if (!result) return;
    let cancelled = false;
    setError(null);
    const cached = cachedFutureReview(result);
    if (cached) { setFr(cached); setProgress(null); return; }
    setFr(null); setProgress({ done: 0, total: 1 });
    getFutureReview(result, (done, total) => { if (!cancelled) setProgress({ done, total }); })
      .then(r => { if (!cancelled) { setFr(r); setProgress(null); } })
      .catch(e => { if (!cancelled) { setError(e?.message || 'Không tính được các năm tới.'); setProgress(null); } });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  useEffect(() => {
    if (fr && tracked.current !== sig) { tracked.current = sig; track('future_review_open', { markers: fr.markers.length }); }
  }, [fr, sig]);

  const timeline = useMemo(() => (result && fr ? buildFutureTimeline(result, fr) : null), [result, fr]);
  const markers = useMemo(() => {
    if (!fr) return [];
    return sort === 'time' ? fr.markers : [...fr.markers].sort((a, b) => b.strength - a.strength || a.year - b.year);
  }, [fr, sort]);

  if (mine.loading) return null;
  if (!result) return <NoChartState title="Cần có lá số để luận tương lai" />;

  const price = PREMIUM.COST.futureLife;
  const unlock = async () => {
    const r = await confirmAndUnlock(unlockKey, 'advanced', price);
    if (r === 'ok' || r === 'free') { setUnlocked(true); if (r === 'ok') track('future_review_unlock', { cost: price }); }
    else if (r === 'nofund') webAlert.alert('Số dư không đủ', `Cần ${price.toLocaleString('vi-VN')} xu. Bạn nạp thêm trong Menu → Nạp xu nhé.`);
  };
  const toggle = (set: Set<number>, setter: (s: Set<number>) => void, year: number, evt?: () => void) => {
    const n = new Set(set);
    if (n.has(year)) n.delete(year); else { n.add(year); evt?.(); }
    setter(n);
  };

  const name = result.birthInfo.name || 'bạn';
  const chartW = Math.max(240, cw - 32 - 32);
  const chapterOfYear = (y: number) => timeline?.chapters.find(c => c.years.some(v => v.year === y));

  /** Chi tiết một năm được chọn (tab Theo đại vận). */
  const yearPanel = (() => {
    if (!fr || !timeline || selected == null) return null;
    const ty: TimelineYear | undefined = timeline.years.find(y => y.year === selected);
    if (!ty) return null;
    const locked = !unlocked && !chapterOfYear(ty.year)?.free;
    if (locked) {
      return (
        <Card tint={COLORS.gold} style={{ gap: 8 }}>
          <Eyebrow>{yearHead(ty.year, ty.age)}</Eyebrow>
          <Body size={13}>Năm này thuộc một chặng đại vận sau — mở khóa toàn bộ Luận tương lai để xem lý do và gợi ý cho từng năm.</Body>
          <GoldButton label={`Mở toàn bộ (${xuVnd(price)})`} onPress={unlock} />
        </Card>
      );
    }
    const score = fr.scores.find(sc => sc.year === ty.year);
    if (!score) return null;
    const m = markerOfYear(score);
    const fm: FutureMarker = { ...m, signed: score.areas[m.area].signed };
    const ph = describeFutureMarker(fm);
    return (
      <Card style={{ gap: 10 }}>
        <View style={{ gap: 2 }}>
          <Eyebrow>{yearHead(ty.year, ty.age)}</Eyebrow>
          <Text style={s.range}>{`${ty.year} âm lịch${safeRange(ty.year) ? ` (${safeRange(ty.year)})` : ''}`}</Text>
        </View>
        {ty.hasSignal ? (
          <>
            <View style={s.chipRow}>
              <View style={[s.pill, { borderColor: COLORS.gold + '66', backgroundColor: COLORS.gold + '1A' }]}>
                <Text style={[s.pillTxt, { color: COLORS.goldLight }]}>{AREA_LABEL[m.area]}</Text>
              </View>
              {ty.isMarker && <View style={s.pill}><Text style={s.pillTxt}>Là một năm nổi bật</Text></View>}
            </View>
            <Text style={s.phrase}>{ph.text}</Text>
            <Text style={s.advice}><Text style={s.adviceHead}>Gợi ý: </Text>{ph.advice}</Text>
            <Pressable onPress={() => toggle(openWhy, setOpenWhy, ty.year, () => track('future_review_why_open', { area: m.area }))} accessibilityRole="button">
              <Text style={s.link}>{openWhy.has(ty.year) ? '▾ Thu gọn "Vì sao"' : '▸ Vì sao có xu hướng này?'}</Text>
            </Pressable>
            {openWhy.has(ty.year) && (
              <WhyBlock marker={fm} sensitive={ph.sensitive}
                openLearner={openLearner.has(ty.year)} onToggleLearner={() => toggle(openLearner, setOpenLearner, ty.year)} />
            )}
          </>
        ) : (
          <Body size={13}>Năm này Tuzi chưa thấy dấu hiệu nổi bật nào để nhận định.</Body>
        )}
      </Card>
    );
  })();

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScreenHeader title="Luận tương lai" onBack={() => navigation.goBack()} />
      <Screen contentStyle={{ paddingTop: 12 }}>
        <Card hero style={{ gap: 8 }}>
          <View style={s.chipRow}>
            <View style={[s.pill, { borderColor: COLORS.purple + '88', backgroundColor: COLORS.purple + '22' }]}>
              <Text style={[s.pillTxt, { color: COLORS.purple }]}>Thử nghiệm</Text>
            </View>
          </View>
          <Eyebrow>{`Những năm sắp tới của ${name}`}</Eyebrow>
          <Body size={13}>
            Tuzi nhìn về phía trước từ năm nay tới khi bạn đủ {FUTURE_CONFIG.untilAge} tuổi, chọn ra những năm có xu hướng nổi bật và nói rõ vì sao theo
            cả Tử Vi lẫn Bát Tự, kèm gợi ý nên làm gì. Đây là xu hướng để chuẩn bị, không phải lời báo trước chắc chắn — càng xa thì càng chỉ nên xem
            như hướng đi chung.
          </Body>
        </Card>

        {progress && (
          <View style={s.center}>
            <ActivityIndicator color={COLORS.gold} />
            <Body size={13}>{`Đang nhìn về phía trước… ${progress.done}/${progress.total}`}</Body>
          </View>
        )}
        {error && <Card><Body color={COLORS.red}>{error}</Body></Card>}

        {fr && fr.markers.length === 0 && (
          <Card><Body>Chưa thấy năm nào nổi bật rõ trong những năm tới. Bạn vẫn có thể xem Vận hạn từng năm ở Luận sự kiện năm.</Body></Card>
        )}

        {fr && timeline && fr.markers.length > 0 && (
          <>
            <Segmented<Tab>
              options={[{ value: 'markers', label: 'Năm nổi bật' }, { value: 'chapters', label: 'Theo đại vận' }]}
              value={tab} onChange={setTab}
            />

            {tab === 'markers' && (
              <>
                <Segmented<SortMode>
                  options={[{ value: 'time', label: 'Theo thời gian' }, { value: 'strength', label: 'Theo mức nổi bật' }]}
                  value={sort} onChange={setSort}
                />
                {markers.map(m => (
                  <MarkerCard
                    key={m.year} marker={m}
                    openWhy={openWhy.has(m.year)} openLearner={openLearner.has(m.year)}
                    onToggleWhy={() => toggle(openWhy, setOpenWhy, m.year, () => track('future_review_why_open', { area: m.area, tier: m.tier }))}
                    onToggleLearner={() => toggle(openLearner, setOpenLearner, m.year)}
                  />
                ))}
              </>
            )}

            {tab === 'chapters' && (
              <>
                <Card style={{ gap: 10 }}>
                  <PastLifeChart
                    timeline={timeline} width={chartW} mode="future" active={active} confirmedYears={new Set()}
                    selectedYear={selected} onSelectYear={setSelected}
                  />
                  <ChartLegend active={active} onToggle={k => setActive(a => ({ ...a, [k]: !a[k] }))} />
                  <Text style={s.note}>
                    Đường lên là năm có xu hướng thuận hơn, đường xuống là năm có xu hướng nhiều thử thách. Vòng vàng là năm nổi bật. Chạm vào biểu đồ để chọn một năm.
                  </Text>
                </Card>

                {timeline.chapters.map(c => {
                  const open = c.free || unlocked;
                  return (
                    <Card key={c.key} style={{ gap: 8 }}>
                      <Eyebrow>{`${c.startAge}–${c.endAge} tuổi · ${c.stem} ${c.branch}${c.status === 'current' ? ' · hiện tại' : ''}`}</Eyebrow>
                      {open ? (
                        <>
                          {c.summary.map((line, i) => <Body key={i} size={13.5}>{line}</Body>)}
                          <View style={s.chipRow}>
                            {c.years.map(y => (
                              <Pressable key={y.year} onPress={() => setSelected(y.year)} accessibilityRole="button" accessibilityLabel={`Xem năm ${y.year}`}
                                style={[s.yearChip, selected === y.year && { backgroundColor: COLORS.gold + '33', borderColor: COLORS.gold }]}>
                                <Text style={s.yearChipTxt}>{`${y.year}${y.isMarker ? ' ◎' : ''}`}</Text>
                              </Pressable>
                            ))}
                          </View>
                        </>
                      ) : (
                        <>
                          <Body size={13}>{`🔒 ${c.summary[0]}`}</Body>
                          <GoldButton label={`Mở toàn bộ (${xuVnd(price)})`} onPress={unlock} />
                        </>
                      )}
                    </Card>
                  );
                })}
                {yearPanel}
                <Text style={s.note}>◎ là năm nổi bật. Mở khóa một lần là xem được mọi chặng của lá số này.</Text>
              </>
            )}
          </>
        )}

        <Text style={s.disclaimer}>
          Luận tương lai là xu hướng theo lá số, không phải sự thật chắc chắn; năm tính theo âm lịch. Tuzi chưa hỗ trợ lá số không rõ giờ sinh. Nội dung
          chỉ mang tính tham khảo, không thay thế lời khuyên chuyên môn.
        </Text>
        <DetailLinkButton result={result} target="DaiVan" />
      </Screen>
    </View>
  );
}

const s = StyleSheet.create({
  range: { fontFamily: FONTS.display, fontSize: 22, color: COLORS.textPrimary },
  center: { alignItems: 'center', gap: 10, paddingVertical: 20 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(226,194,133,0.25)' },
  pillTxt: { fontFamily: FONTS.bodySemi, fontSize: 11.5, color: COLORS.textSecondary },
  phrase: { fontFamily: FONTS.bodySemi, fontSize: 15, lineHeight: 22, color: COLORS.textPrimary },
  advice: { fontFamily: FONTS.body, fontSize: 13.5, lineHeight: 21, color: COLORS.textSecondary, textAlign: 'justify' },
  adviceHead: { fontFamily: FONTS.bodySemi, color: TIER_COLORS.great },
  link: { fontFamily: FONTS.bodySemi, fontSize: 13, color: COLORS.gold, paddingVertical: 4 },
  note: { fontFamily: FONTS.body, fontSize: 11.5, lineHeight: 17, color: COLORS.textMuted, textAlign: 'justify' },
  yearChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(226,194,133,0.35)' },
  yearChipTxt: { fontFamily: FONTS.bodySemi, fontSize: 12, color: COLORS.textPrimary },
  disclaimer: { fontFamily: FONTS.body, fontSize: 11.5, lineHeight: 17, color: COLORS.textMuted, textAlign: 'center', marginTop: 4 },
});
