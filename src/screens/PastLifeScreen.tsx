/**
 * DÒNG ĐỜI ĐÃ QUA — nhìn lại thăng trầm theo từng ĐẠI HẠN của lá số đang gắn (giai đoạn 3 của "Nghiệm quá khứ").
 *  Tổng quan (D1) · Chặng đời (D2 + chi tiết năm D3) · Nhật ký (D4) · Chia sẻ (D5).
 * Dùng lại điểm của bộ máy Nghiệm quá khứ (không chấm lại), lời văn ghép từ tín hiệu (mẫu, không AI).
 * Miễn phí: biểu đồ tổng, chặng tuổi thơ + chặng hiện tại, thẻ chia sẻ. Mở khóa bằng xu (1 lần/lá số):
 * các chặng đã qua còn lại + chi tiết các năm của chúng. Ghi chú ≤500 ký tự được mã hóa phía server,
 * KHÔNG vào AI và KHÔNG vào thẻ chia sẻ.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet, TextInput } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import PastLifeChart, { ChartLegend, SERIES_COLOR, type SeriesKey } from '../components/PastLifeChart';
import { WhyBlock, FeedbackRow } from '../components/PastWhy';
import { COLORS, FONTS, TIER_COLORS } from '../constants/theme';
import { Screen, Card, Eyebrow, Body, Segmented, Chip, GoldButton, OutlineButton } from '../ui';
import { useMyResult, NoChartState } from '../hooks/useMyResult';
import { PREMIUM, isUnlocked, xuVnd } from '../constants/premium';
import { confirmAndUnlock } from '../lib/confirmCharge';
import { fkey } from '../lib/featureKey';
import { webAlert } from '../lib/webAlert';
import { track } from '../lib/track';
import { isWeb, useContentWidth, saveImageOrDownload, shareFile } from '../lib/platform';
import { captureViewAsPng } from '../lib/captureView';
import { listFeedback, saveFeedback, deleteFeedback } from '../lib/pastReviewStore';
import { listNotes, saveNote, deleteNote, NOTE_MAX_LEN, type ReviewNote } from '../lib/reviewNotes';
import { getPastReview, cachedPastReview } from '../lib/pastReviewCache';
import { yearCanChi } from '../core/annualEvents/calendar';
import { AREAS, AREA_LABEL, type AreaId, type PastReview } from '../core/pastReview';
import { describeMarker } from '../core/pastReview/phrases';
import { buildTimeline, markerOfYear, type Timeline, type TimelineChapter, type TimelineYear } from '../core/pastReview/timeline';
import { solarRangeLabel, FEEDBACK_LABEL, MISS_LABEL, type FeedbackValue } from '../core/pastReview/feedback';
import type { AstrologyResult } from '../types';

type Tab = 'overview' | 'chapters' | 'diary' | 'share';

const ALL_ON: Record<SeriesKey, boolean> = { total: true, career: false, wealth: false, love: false, family: false };
const ALL_LINES: Record<SeriesKey, boolean> = { total: true, career: true, wealth: true, love: true, family: true };

const yearTitle = (year: number, age: number) => {
  const cc = yearCanChi(year);
  return `Năm ${cc.stem} ${cc.branch} ${year} · tuổi ${age}`;
};
const scoreColor = (v: number) => (v > 18 ? TIER_COLORS.great : v > 6 ? TIER_COLORS.good : v >= -6 ? TIER_COLORS.normal : v >= -18 ? TIER_COLORS.caution : TIER_COLORS.bad);

/* ───────── Ghi chú ───────── */

function NoteEditor({ chartId, year, note, defaultArea, onSaved, onCancel }: {
  chartId: string; year: number; note?: ReviewNote; defaultArea?: AreaId | null;
  onSaved: (n: ReviewNote) => void; onCancel?: () => void;
}) {
  const [text, setText] = useState(note?.text ?? '');
  const [area, setArea] = useState<AreaId | null>(note?.lifeArea ?? defaultArea ?? null);
  const [busy, setBusy] = useState(false);
  const left = NOTE_MAX_LEN - text.length;

  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const id = await saveNote({ chartId, year, text, lifeArea: area, id: note?.id });
      track('past_life_note_save', { area: area ?? 'none', edit: !!note });
      onSaved({ id, year, lifeArea: area, text: text.trim(), updatedAt: new Date().toISOString() });
      if (!note) setText('');
    } catch (e: any) {
      webAlert.alert('Chưa lưu được ghi chú', e?.message || 'Vui lòng thử lại.');
    } finally { setBusy(false); }
  };

  return (
    <View style={s.noteEditor}>
      <TextInput
        value={text} onChangeText={t => setText(t.slice(0, NOTE_MAX_LEN))}
        multiline placeholder="Năm này bạn nhớ điều gì? (chỉ mình bạn đọc được)"
        placeholderTextColor={COLORS.textMuted} style={s.noteInput} maxLength={NOTE_MAX_LEN}
        accessibilityLabel={`Ghi chú cho năm ${year}`}
      />
      <Text style={[s.note, left < 40 && { color: TIER_COLORS.caution }]}>{`Còn ${left} ký tự`}</Text>
      <View style={s.chipRow}>
        {AREAS.map(a => (
          <Chip key={a} label={AREA_LABEL[a]} active={area === a} onPress={() => setArea(area === a ? null : a)} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <GoldButton label={busy ? 'Đang lưu…' : note ? 'Lưu thay đổi' : 'Lưu ghi chú'} onPress={save} disabled={busy || !text.trim()} />
        {onCancel && <OutlineButton label="Hủy" onPress={onCancel} />}
      </View>
    </View>
  );
}

function NoteItem({ note, chartId, onChanged, onDeleted }: {
  note: ReviewNote; chartId: string; onChanged: (n: ReviewNote) => void; onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const remove = () => webAlert.alert('Xóa ghi chú', 'Ghi chú này sẽ bị xóa hẳn khỏi máy chủ.', [
    { text: 'Để lại', style: 'cancel' },
    { text: 'Xóa', style: 'destructive', onPress: async () => {
      try { await deleteNote(note.id); onDeleted(note.id); }
      catch (e: any) { webAlert.alert('Chưa xóa được', e?.message || 'Vui lòng thử lại.'); }
    } },
  ]);
  if (editing) {
    return <NoteEditor chartId={chartId} year={note.year} note={note}
      onSaved={n => { setEditing(false); onChanged(n); }} onCancel={() => setEditing(false)} />;
  }
  return (
    <View style={s.noteItem}>
      {note.lifeArea && <Text style={s.noteArea}>{AREA_LABEL[note.lifeArea]}</Text>}
      <Text style={s.noteText}>{note.text}</Text>
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <Pressable onPress={() => setEditing(true)} accessibilityRole="button"><Text style={s.link}>Sửa</Text></Pressable>
        <Pressable onPress={remove} accessibilityRole="button"><Text style={[s.link, { color: TIER_COLORS.bad }]}>Xóa</Text></Pressable>
      </View>
    </View>
  );
}

/* ───────── Chi tiết năm (D3) ───────── */

function YearPanel({ review, year, chartId, feedback, notes, locked, priceText, onUnlock, onFeedback, onNoteSaved, onNoteDeleted, notesError }: {
  review: PastReview; year: TimelineYear; chartId?: string; feedback?: FeedbackValue; notes: ReviewNote[];
  locked: boolean; priceText: string; onUnlock: () => void; onFeedback: (v: FeedbackValue) => void;
  onNoteSaved: (n: ReviewNote) => void; onNoteDeleted: (id: string) => void; notesError: string | null;
}) {
  const [openWhy, setOpenWhy] = useState(false);
  const [openLearner, setOpenLearner] = useState(false);
  useEffect(() => { setOpenWhy(false); setOpenLearner(false); }, [year.year]);

  if (locked) {
    return (
      <Card tint={COLORS.gold} style={{ gap: 8 }}>
        <Eyebrow>{yearTitle(year.year, year.age)}</Eyebrow>
        <Body size={13}>Chi tiết năm này thuộc một chặng đã qua — mở khóa toàn bộ Dòng đời đã qua để xem lý do và ghi chú cho từng năm.</Body>
        <GoldButton label={`Mở toàn bộ (${priceText})`} onPress={onUnlock} />
      </Card>
    );
  }

  const score = review.scores.find(sc => sc.year === year.year);
  const marker = score ? markerOfYear(score) : null;
  const phrase = marker && year.hasSignal ? describeMarker(marker) : null;
  const yearNotes = notes.filter(n => n.year === year.year);
  const collapsedWrong = feedback === 'sai';

  return (
    <Card style={{ gap: 10 }}>
      <View style={{ gap: 2 }}>
        <Eyebrow>{yearTitle(year.year, year.age)}</Eyebrow>
        <Text style={s.range}>{`${year.year} âm lịch (${solarRangeLabel(year.year)})`}</Text>
      </View>
      {marker && phrase ? (
        <>
          <View style={s.chipRow}>
            <View style={[s.pill, { borderColor: COLORS.gold + '66', backgroundColor: COLORS.gold + '1A' }]}>
              <Text style={[s.pillTxt, { color: COLORS.goldLight }]}>{AREA_LABEL[marker.area]}</Text>
            </View>
            {year.isMarker && <View style={s.pill}><Text style={s.pillTxt}>Là một mốc ở "Nghiệm quá khứ"</Text></View>}
          </View>
          {collapsedWrong ? (
            <Text style={s.missLabel}>{`${MISS_LABEL} — Tuzi luận chưa đúng năm này.`}</Text>
          ) : (
            <Text style={s.phrase}>{phrase.text}</Text>
          )}
          <Pressable onPress={() => setOpenWhy(v => !v)} accessibilityRole="button">
            <Text style={s.link}>{openWhy ? '▾ Thu gọn "Vì sao"' : collapsedWrong ? '▸ Xem lại cách Tuzi luận' : '▸ Vì sao có năm này?'}</Text>
          </Pressable>
          {openWhy && <WhyBlock marker={marker} sensitive={phrase.sensitive} openLearner={openLearner} onToggleLearner={() => setOpenLearner(v => !v)} />}
          <FeedbackRow value={feedback} canSave={!!chartId} onFeedback={onFeedback} />
        </>
      ) : (
        <Body size={13}>Năm này Tuzi chưa thấy tín hiệu nổi bật nào để nhận định. Bạn vẫn có thể ghi lại điều mình nhớ bên dưới.</Body>
      )}

      <View style={s.fbBox}>
        <Text style={s.fbLabel}>Ghi chú của bạn về năm này</Text>
        {!chartId ? (
          <Text style={s.note}>Cần đăng nhập và lưu lá số để ghi chú.</Text>
        ) : (
          <>
            {notesError && <Text style={s.note}>{notesError}</Text>}
            {yearNotes.map(n => <NoteItem key={n.id} note={n} chartId={chartId} onChanged={onNoteSaved} onDeleted={onNoteDeleted} />)}
            <NoteEditor chartId={chartId} year={year.year} defaultArea={marker?.area ?? null} onSaved={onNoteSaved} />
            <Text style={s.note}>Ghi chú được mã hóa trên máy chủ, không dùng cho AI và không xuất hiện trên thẻ chia sẻ.</Text>
          </>
        )}
      </View>
    </Card>
  );
}

/* ───────── Màn hình ───────── */

export default function PastLifeScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const mine = useMyResult();
  const result: AstrologyResult | null = route.params?.result ?? mine.result;
  const cw = useContentWidth();
  const chartId = result?.birthInfo.chartId;
  const unlockKey = result ? fkey(result, 'pastLife:full') : '';

  const [review, setReview] = useState<PastReview | null>(result ? cachedPastReview(result) ?? null : null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [active, setActive] = useState<Record<SeriesKey, boolean>>(ALL_ON);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Record<number, FeedbackValue>>({});
  const [notes, setNotes] = useState<ReviewNote[]>([]);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(() => (unlockKey ? isUnlocked(unlockKey) : false));
  const [showName, setShowName] = useState(false);
  const [sharing, setSharing] = useState(false);
  const shareRef = useRef<View>(null);
  const tracked = useRef(false);

  useEffect(() => { setUnlocked(unlockKey ? isUnlocked(unlockKey) : false); }, [unlockKey]);

  useEffect(() => {
    if (!result) return;
    let cancelled = false;
    setError(null);
    const cached = cachedPastReview(result);
    if (cached) { setReview(cached); setProgress(null); return; }
    setReview(null); setProgress({ done: 0, total: 1 });
    getPastReview(result, (done, total) => { if (!cancelled) setProgress({ done, total }); })
      .then(r => { if (!cancelled) { setReview(r); setProgress(null); } })
      .catch(e => { if (!cancelled) { setError(e?.message || 'Không tính được dòng đời.'); setProgress(null); } });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.birthInfo.chartId, result?.birthInfo.year, result?.birthInfo.month, result?.birthInfo.day, result?.birthInfo.hour]);

  useEffect(() => {
    if (!chartId) { setFeedback({}); setNotes([]); return; }
    let cancelled = false;
    listFeedback(chartId).then(rows => { if (!cancelled) setFeedback(Object.fromEntries(rows.map(r => [r.year, r.value]))); }).catch(() => {});
    setNotesError(null);
    listNotes(chartId).then(n => { if (!cancelled) setNotes(n); })
      .catch(() => { if (!cancelled) setNotesError('Chưa đọc được ghi chú. Bạn vẫn có thể thêm ghi chú mới.'); });
    return () => { cancelled = true; };
  }, [chartId]);

  useEffect(() => {
    if (review && !tracked.current) { tracked.current = true; track('past_life_open', { years: review.scores.length }); }
  }, [review]);

  const timeline: Timeline | null = useMemo(() => (result && review ? buildTimeline(result, review) : null), [result, review]);
  const confirmed = useMemo(() => new Set(Object.entries(feedback).filter(([, v]) => v === 'dung').map(([y]) => Number(y))), [feedback]);
  const chapterOfYear = (y: number): TimelineChapter | undefined => timeline?.chapters.find(c => c.years.some(v => v.year === y));
  const price = PREMIUM.COST.pastLife;

  if (mine.loading) return null;
  if (!result) return <NoChartState title="Cần có lá số để xem dòng đời" />;

  const unlock = async () => {
    const r = await confirmAndUnlock(unlockKey, 'advanced', price);
    if (r === 'ok' || r === 'free') {
      setUnlocked(true);
      if (r === 'ok') track('past_life_unlock', { cost: price });
    } else if (r === 'nofund') {
      webAlert.alert('Số dư không đủ', `Cần ${price.toLocaleString('vi-VN')} xu. Bạn nạp thêm trong Menu → Nạp xu nhé.`);
    }
  };

  const onFeedback = async (year: TimelineYear, v: FeedbackValue) => {
    if (!chartId || !review) { webAlert.alert('Chưa lưu được', 'Cần đăng nhập và lưu lá số để ghi nhận phản hồi.'); return; }
    const score = review.scores.find(sc => sc.year === year.year);
    if (!score) return;
    const prev = feedback[year.year];
    const clearing = prev === v;
    setFeedback(f => { const n = { ...f }; if (clearing) delete n[year.year]; else n[year.year] = v; return n; });
    try {
      if (clearing) await deleteFeedback(chartId, year.year);
      else await saveFeedback({ chartId, marker: markerOfYear(score), value: v, source: 'timeline' });
    } catch (e: any) {
      setFeedback(f => { const n = { ...f }; if (prev) n[year.year] = prev; else delete n[year.year]; return n; });
      webAlert.alert('Chưa lưu được', e?.message || 'Vui lòng thử lại.');
    }
  };

  const upsertNote = (n: ReviewNote) => setNotes(list => {
    const i = list.findIndex(x => x.id === n.id);
    return i >= 0 ? list.map(x => (x.id === n.id ? n : x)) : [...list, n];
  });
  const dropNote = (id: string) => setNotes(list => list.filter(x => x.id !== id));

  const selectedYear = timeline?.years.find(y => y.year === selected) ?? null;
  const selectedLocked = !!selectedYear && !unlocked && !chapterOfYear(selectedYear.year)?.free;
  const panel = review && selectedYear && (
    <YearPanel
      review={review} year={selectedYear} chartId={chartId} feedback={feedback[selectedYear.year]} notes={notes}
      locked={selectedLocked} priceText={xuVnd(price)} onUnlock={unlock} onFeedback={v => onFeedback(selectedYear, v)}
      onNoteSaved={upsertNote} onNoteDeleted={dropNote} notesError={notesError}
    />
  );

  const toggleSeries = (k: SeriesKey) => setActive(a => ({ ...a, [k]: !a[k] }));
  const chartW = Math.max(240, cw - 32 - 32);
  const name = result.birthInfo.name || 'bạn';

  const doShare = async (mode: 'save' | 'share') => {
    if (sharing) return;
    setSharing(true);
    try {
      const uri = await captureViewAsPng(shareRef, 'tuzi-dong-doi.png');
      if (mode === 'save') {
        const saved = await saveImageOrDownload(uri, 'tuzi-dong-doi.png');
        if (saved) webAlert.alert('Đã lưu', isWeb ? 'Ảnh đã được tạo xong và tải xuống máy của bạn. Nếu trình duyệt mở ảnh ở tab mới, bạn hãy nhấn giữ ảnh để lưu.' : 'Ảnh đã được lưu vào Thư viện ảnh.');
      }
      else await shareFile(uri, { mimeType: 'image/png', title: 'Dòng đời đã qua — Tuzi' });
      track('past_life_share', { mode });
    } catch (e: any) {
      webAlert.alert('Chưa tạo được ảnh', e?.message || 'Vui lòng thử lại.');
    } finally { setSharing(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScreenHeader title="Dòng đời đã qua" onBack={() => navigation.goBack()} />
      <Screen contentStyle={{ paddingTop: 12 }}>
        <Card hero style={{ gap: 8 }}>
          <View style={s.chipRow}>
            <View style={[s.pill, { borderColor: COLORS.purple + '88', backgroundColor: COLORS.purple + '22' }]}>
              <Text style={[s.pillTxt, { color: COLORS.purple }]}>Thử nghiệm</Text>
            </View>
          </View>
          <Eyebrow>{`Thăng trầm theo từng đại hạn của ${name}`}</Eyebrow>
          <Body size={13}>
            Mỗi chặng là một đại hạn 10 năm. Đường lên là năm thuận hơn, đường xuống là năm nhiều thử thách — chỉ là xu hướng
            theo lá số để bạn đối chiếu với trải nghiệm của mình, không phải phán đoán. Tuzi xem tối đa 30 năm gần nhất và
            từ 15 tuổi trở lên.
          </Body>
        </Card>

        {progress && (
          <View style={s.loadingBox}>
            <ActivityIndicator color={COLORS.gold} />
            <Body size={13}>{`Đang dựng dòng đời… ${progress.done}/${progress.total}`}</Body>
          </View>
        )}
        {error && <Card><Body color={COLORS.red}>{error}</Body></Card>}

        {timeline && timeline.years.length === 0 && (
          <Card><Body>Chưa đủ năm đã qua để dựng dòng đời: Tuzi chỉ xét các năm bạn từ 15 tuổi trở lên và không xét năm hiện tại.</Body></Card>
        )}

        {timeline && review && timeline.years.length > 0 && (
          <>
            <Segmented<Tab>
              options={[
                { value: 'overview', label: 'Tổng quan' }, { value: 'chapters', label: 'Chặng đời' },
                { value: 'diary', label: 'Nhật ký' }, { value: 'share', label: 'Chia sẻ' },
              ]}
              value={tab} onChange={setTab}
            />

            {tab === 'overview' && (
              <>
                <Card style={{ gap: 10 }}>
                  <PastLifeChart
                    timeline={timeline} width={chartW} active={active} confirmedYears={confirmed}
                    selectedYear={selected} onSelectYear={setSelected}
                  />
                  <ChartLegend active={active} onToggle={toggleSeries} />
                  <Text style={s.note}>
                    Vòng vàng là mốc ở "Nghiệm quá khứ", chấm xanh là năm bạn xác nhận Đúng. Chạm vào biểu đồ để chọn một năm.
                    Không có đường sức khỏe; phần mờ bên phải là tương lai, Tuzi chưa xét.
                  </Text>
                </Card>
                {panel}
                {!panel && <Body size={13}>Chạm vào một năm trên biểu đồ để xem chi tiết.</Body>}
              </>
            )}

            {tab === 'chapters' && (
              <>
                {timeline.chapters.map(c => {
                  const open = c.free || unlocked;
                  return (
                    <Card key={c.key} style={{ gap: 8 }}>
                      <Eyebrow>{`${c.startAge}–${c.endAge} tuổi · ${c.stem} ${c.branch}${c.status === 'current' ? ' · hiện tại' : c.status === 'child' ? ' · tuổi thơ' : ''}`}</Eyebrow>
                      {open ? (
                        <>
                          {c.summary.map((line, i) => <Body key={i} size={13.5}>{line}</Body>)}
                          {c.years.length > 0 && (
                            <View style={s.chipRow}>
                              {[...c.years].reverse().map(y => (
                                <Pressable key={y.year} onPress={() => setSelected(y.year)} accessibilityRole="button"
                                  accessibilityLabel={`Xem năm ${y.year}`}
                                  style={[s.yearChip, { borderColor: scoreColor(y.vanScore) + (selected === y.year ? 'FF' : '88') },
                                    selected === y.year && { backgroundColor: scoreColor(y.vanScore) + '33' }]}>
                                  <Text style={s.yearChipTxt}>{`${y.year}${y.isMarker ? ' ◎' : ''}${confirmed.has(y.year) ? ' ✓' : ''}`}</Text>
                                </Pressable>
                              ))}
                            </View>
                          )}
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
                {panel}
                <Text style={s.note}>◎ là mốc ở "Nghiệm quá khứ" · ✓ là năm bạn xác nhận Đúng. Mở khóa một lần là xem được mọi chặng của lá số này.</Text>
              </>
            )}

            {tab === 'diary' && (
              <>
                <Card style={{ gap: 8 }}>
                  <Eyebrow>Năm bạn đã xác nhận</Eyebrow>
                  {Object.keys(feedback).length === 0 ? (
                    <Body size={13}>Chưa có phản hồi nào. Khi bạn bấm Đúng / Gần đúng / Sai ở một năm, năm đó sẽ hiện ở đây.</Body>
                  ) : (
                    Object.entries(feedback).sort((a, b) => Number(b[0]) - Number(a[0])).map(([y, v]) => (
                      <Text key={y} style={s.diaryLine}>{`${y} · ${FEEDBACK_LABEL[v]}`}</Text>
                    ))
                  )}
                </Card>
                <Card style={{ gap: 10 }}>
                  <Eyebrow>Nhật ký đời của bạn</Eyebrow>
                  {!chartId && <Body size={13}>Cần đăng nhập và lưu lá số để dùng nhật ký.</Body>}
                  {chartId && notes.length === 0 && (
                    <Body size={13}>Chưa có ghi chú. Chọn một năm ở Tổng quan hoặc Chặng đời rồi viết điều bạn nhớ.</Body>
                  )}
                  {chartId && [...notes].sort((a, b) => b.year - a.year).map(n => (
                    <View key={n.id} style={{ gap: 4 }}>
                      <Text style={s.diaryYear}>{`${n.year} · ${yearCanChi(n.year).stem} ${yearCanChi(n.year).branch}`}</Text>
                      <NoteItem note={n} chartId={chartId} onChanged={upsertNote} onDeleted={dropNote} />
                    </View>
                  ))}
                  {notesError && <Text style={s.note}>{notesError}</Text>}
                </Card>
              </>
            )}

            {tab === 'share' && (
              <>
                <Card style={{ gap: 10 }}>
                  <Eyebrow>Thẻ chia sẻ</Eyebrow>
                  <Body size={13}>
                    Thẻ chỉ có biểu đồ thăng trầm — không ngày giờ sinh, không ghi chú, không lời luận.
                  </Body>
                  <Segmented<'hide' | 'show'>
                    options={[{ value: 'hide', label: 'Ẩn tên' }, { value: 'show', label: 'Hiện tên' }]}
                    value={showName ? 'show' : 'hide'} onChange={v => setShowName(v === 'show')}
                  />
                </Card>
                <View ref={shareRef} collapsable={false} style={s.shareCard}>
                  <Text style={s.shareBrand}>TUZI · DÒNG ĐỜI ĐÃ QUA</Text>
                  {showName && <Text style={s.shareName}>{name}</Text>}
                  <PastLifeChart
                    timeline={timeline} width={Math.min(chartW, 340)} height={210} active={ALL_LINES}
                    confirmedYears={new Set()} selectedYear={null}
                  />
                  <View style={s.shareLegend}>
                    {(['total', 'career', 'wealth', 'love', 'family'] as SeriesKey[]).map(k => (
                      <View key={k} style={s.shareLegendItem}>
                        <View style={[s.dot, { backgroundColor: SERIES_COLOR[k] }]} />
                        <Text style={s.shareLegendTxt}>{k === 'total' ? 'Tổng' : AREA_LABEL[k as AreaId]}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={s.shareFoot}>Chiêm nghiệm tham khảo theo lá số · Tuzi — Trợ lý tử vi của bạn</Text>
                </View>
                <View style={{ gap: 10 }}>
                  <GoldButton label={sharing ? 'Đang tạo ảnh…' : 'Lưu ảnh'} onPress={() => doShare('save')} disabled={sharing} />
                  <OutlineButton label="Chia sẻ" onPress={() => doShare('share')} />
                </View>
              </>
            )}
          </>
        )}

        <Text style={s.disclaimer}>
          Dòng đời là xu hướng theo lá số, không phải sự thật đã được kiểm chứng. Năm tính theo âm lịch; Tuzi chưa hỗ trợ lá số không rõ
          giờ sinh. Nội dung chỉ mang tính tham khảo, không thay thế lời khuyên chuyên môn.
        </Text>
      </Screen>
    </View>
  );
}

const s = StyleSheet.create({
  range: { fontFamily: FONTS.display, fontSize: 22, color: COLORS.textPrimary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(226,194,133,0.25)' },
  pillTxt: { fontFamily: FONTS.bodySemi, fontSize: 11.5, color: COLORS.textSecondary },
  phrase: { fontFamily: FONTS.bodySemi, fontSize: 15, lineHeight: 22, color: COLORS.textPrimary },
  missLabel: { fontFamily: FONTS.bodySemi, fontSize: 13, color: TIER_COLORS.bad },
  link: { fontFamily: FONTS.bodySemi, fontSize: 13, color: COLORS.gold, paddingVertical: 4 },
  note: { fontFamily: FONTS.body, fontSize: 11.5, lineHeight: 17, color: COLORS.textMuted },
  fbBox: { gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(226,194,133,0.14)' },
  fbLabel: { fontFamily: FONTS.bodySemi, fontSize: 12, color: COLORS.textSecondary },
  loadingBox: { alignItems: 'center', gap: 10, paddingVertical: 20 },
  yearChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1.5 },
  yearChipTxt: { fontFamily: FONTS.bodySemi, fontSize: 12, color: COLORS.textPrimary },
  noteEditor: { gap: 8 },
  noteInput: {
    minHeight: 84, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(226,194,133,0.3)', padding: 10,
    fontFamily: FONTS.body, fontSize: 14, color: COLORS.textPrimary, backgroundColor: 'rgba(255,255,255,0.04)',
    textAlignVertical: 'top',
  },
  noteItem: { gap: 4, padding: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(226,194,133,0.14)' },
  noteArea: { fontFamily: FONTS.bodyBold, fontSize: 11, letterSpacing: 0.4, color: COLORS.gold, textTransform: 'uppercase' },
  noteText: { fontFamily: FONTS.body, fontSize: 14, lineHeight: 21, color: COLORS.textPrimary },
  diaryLine: { fontFamily: FONTS.bodySemi, fontSize: 13.5, color: COLORS.textPrimary },
  diaryYear: { fontFamily: FONTS.display, fontSize: 18, color: COLORS.goldLight },
  dot: { width: 8, height: 8, borderRadius: 4 },
  shareCard: {
    alignSelf: 'center', width: '100%', maxWidth: 380, padding: 16, borderRadius: 20, gap: 10,
    backgroundColor: '#12132B', borderWidth: 1.5, borderColor: 'rgba(226,194,133,0.5)',
  },
  shareBrand: { fontFamily: FONTS.bodyBold, fontSize: 12, letterSpacing: 1.4, color: COLORS.gold, textAlign: 'center' },
  shareName: { fontFamily: FONTS.display, fontSize: 24, color: COLORS.textPrimary, textAlign: 'center' },
  shareLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  shareLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  shareLegendTxt: { fontFamily: FONTS.bodySemi, fontSize: 11, color: COLORS.textSecondary },
  shareFoot: { fontFamily: FONTS.body, fontSize: 10.5, color: COLORS.textMuted, textAlign: 'center' },
  disclaimer: { fontFamily: FONTS.body, fontSize: 11.5, lineHeight: 17, color: COLORS.textMuted, textAlign: 'center', marginTop: 4 },
});
