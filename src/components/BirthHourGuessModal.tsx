/**
 * SUY ĐOÁN GIỜ SINH — hộp thoại mở từ ô "Giờ sinh" của form lập lá số.
 * Miễn phí, không dùng AI (core/birthTime). Người dùng khai buổi nhớ được + các mốc đời có năm cụ thể
 * → xem mức khớp của 12 canh giờ → TỰ CHỌN canh giờ muốn dùng làm giờ sinh của lá số.
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BirthInfo } from '../types';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import {
  DAY_PARTS, LIFE_EVENT_KINDS, BUILD_OPTIONS, FACE_OPTIONS, guessBirthHour, statusMessage,
  type DayPartId, type HourGuess, type UserLifeEvent, type LookAnswer, type BuildKind, type FaceKind,
} from '../core/birthTime';

const MAX_EVENTS = 8;

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Thông tin sinh đã nhập (chưa có giờ). */
  base: Omit<BirthInfo, 'hour' | 'minute'> | null;
  /** Người dùng xác nhận một canh giờ → `hour` là giá trị BirthInfo.hour. */
  onConfirm: (hour: number, branch: string) => void;
}

const kindLabel = (id: string) => LIFE_EVENT_KINDS.find(k => k.id === id)?.label ?? id;

export default function BirthHourGuessModal({ visible, onClose, base, onConfirm }: Props) {
  const [dayParts, setDayParts] = useState<DayPartId[]>([]);
  const [events, setEvents] = useState<UserLifeEvent[]>([]);
  const [draftKind, setDraftKind] = useState<string>(LIFE_EVENT_KINDS[0].id);
  const [draftYear, setDraftYear] = useState('');
  const [look, setLook] = useState<LookAnswer>({});
  const [formError, setFormError] = useState('');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [guess, setGuess] = useState<HourGuess | null>(null);
  const [selected, setSelected] = useState<number | null>(null);

  const toggleDayPart = (id: DayPartId) =>
    setDayParts(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]));

  const addEvent = () => {
    const y = parseInt(draftYear, 10);
    const thisYear = new Date().getFullYear();
    if (!y || y < 1900 || y > thisYear) { setFormError(`Nhập năm dương lịch hợp lệ (đến ${thisYear}).`); return; }
    if (events.length >= MAX_EVENTS) { setFormError(`Tối đa ${MAX_EVENTS} sự kiện.`); return; }
    if (events.some(e => e.kind === draftKind && e.year === y)) { setFormError('Sự kiện này đã có trong danh sách.'); return; }
    setEvents(list => [...list, { kind: draftKind, year: y }]);
    setDraftYear('');
    setFormError('');
  };

  const run = async () => {
    if (!base) return;
    setFormError(''); setRunning(true); setProgress(0); setSelected(null);
    try {
      const g = await guessBirthHour({ base, events, dayParts, look }, done => setProgress(done));
      setGuess(g);
    } catch (e: any) {
      setFormError(e?.message ?? 'Không suy đoán được. Hãy kiểm tra lại ngày sinh.');
    } finally {
      setRunning(false);
    }
  };

  const reset = () => { setGuess(null); setSelected(null); };

  const confirm = () => {
    if (!guess || selected === null) return;
    const c = guess.candidates.find(x => x.index === selected);
    if (!c) return;
    onConfirm(c.hour, c.branch);
    reset();
  };

  const top = guess ? guess.candidates.slice(0, 6) : [];
  const maxP = top.length ? top[0].probability : 1;
  const lookFull = !!look.build && !!look.face;
  // Khớp core: dáng + mặt trả lời đủ được tính như thêm 1 bằng chứng.
  const enough = events.length + (lookFull ? 1 : 0) >= 3;
  const need = Math.max(1, 3 - events.length - (lookFull ? 1 : 0));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.header}>
            <Text style={styles.title}>🔮 Suy đoán giờ sinh</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Đóng"><Text style={styles.close}>✕</Text></TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {!guess && (
              <>
                <Text style={styles.intro}>
                  Dựa vào buổi bạn nhớ và các mốc đời có năm cụ thể, Tuzi so sánh với từng canh giờ để tìm canh giờ khớp nhất. Miễn phí, không dùng AI.
                </Text>

                <Text style={styles.step}>1. Bạn nhớ mình sinh vào buổi nào? (không bắt buộc)</Text>
                <View style={styles.wrap}>
                  {DAY_PARTS.map(p => {
                    const on = dayParts.includes(p.id);
                    return (
                      <TouchableOpacity key={p.id} style={[styles.chip, on && styles.chipOn]} onPress={() => toggleDayPart(p.id)}>
                        <Text style={[styles.chipText, on && styles.chipTextOn]}>{p.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={styles.hint}>Có thể chọn nhiều buổi nếu chưa chắc. Bỏ trống nếu không nhớ.</Text>

                <Text style={styles.step}>2. Dáng người & khuôn mặt của bạn (không bắt buộc)</Text>
                <Text style={styles.hint}>
                  Giờ sinh quyết định các sao ở cung Mệnh, và theo Tử Vi cổ điển các sao đó gắn với vóc dáng, khuôn mặt. Đây là dấu hiệu phụ, chỉ chọn nếu bạn tự nhận thấy rõ.
                </Text>
                <Text style={styles.sub}>Vóc dáng</Text>
                <View style={styles.wrap}>
                  {BUILD_OPTIONS.map(o => {
                    const on = look.build === o.id;
                    return (
                      <TouchableOpacity key={o.id} style={[styles.chip, on && styles.chipOn]}
                        onPress={() => setLook(l => ({ ...l, build: on ? undefined : (o.id as BuildKind) }))}>
                        <Text style={[styles.chipText, on && styles.chipTextOn]}>{o.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={styles.sub}>Khuôn mặt</Text>
                <View style={styles.wrap}>
                  {FACE_OPTIONS.map(o => {
                    const on = look.face === o.id;
                    return (
                      <TouchableOpacity key={o.id} style={[styles.chip, on && styles.chipOn]}
                        onPress={() => setLook(l => ({ ...l, face: on ? undefined : (o.id as FaceKind) }))}>
                        <Text style={[styles.chipText, on && styles.chipTextOn]}>{o.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.step}>3. Các mốc đời bạn nhớ rõ năm (cần ít nhất 3; chọn đủ dáng + mặt thì cần 2)</Text>
                <View style={styles.wrap}>
                  {LIFE_EVENT_KINDS.map(k => {
                    const on = draftKind === k.id;
                    return (
                      <TouchableOpacity key={k.id} style={[styles.chip, on && styles.chipOn]} onPress={() => setDraftKind(k.id)}>
                        <Text style={[styles.chipText, on && styles.chipTextOn]}>{k.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <View style={styles.addRow}>
                  <TextInput
                    style={styles.yearInput} value={draftYear} onChangeText={t => setDraftYear(t.replace(/[^0-9]/g, '').slice(0, 4))}
                    placeholder="Năm (dương lịch)" placeholderTextColor={COLORS.textMuted}
                    keyboardType="number-pad" maxLength={4}
                  />
                  <TouchableOpacity style={styles.addBtn} onPress={addEvent}>
                    <Text style={styles.addBtnText}>＋ Thêm</Text>
                  </TouchableOpacity>
                </View>

                {events.map((e, i) => (
                  <View key={`${e.kind}-${e.year}`} style={styles.eventRow}>
                    <Text style={styles.eventText}>{kindLabel(e.kind)} · {e.year}</Text>
                    <TouchableOpacity onPress={() => setEvents(list => list.filter((_, j) => j !== i))} accessibilityLabel="Xóa sự kiện">
                      <Text style={styles.remove}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <Text style={styles.hint}>
                  Chỉ nhập việc bạn nhớ chính xác năm. Càng nhiều mốc đúng thì càng đáng tin; mốc nhớ nhầm làm kết quả lệch.
                </Text>

                {!!formError && <Text style={styles.error}>{formError}</Text>}

                <TouchableOpacity
                  style={[styles.primary, (!enough || running || !base) && styles.primaryOff]}
                  onPress={run} disabled={!enough || running || !base} activeOpacity={0.85}
                >
                  {running
                    ? <View style={styles.runRow}><ActivityIndicator color="#1a0a00" /><Text style={styles.primaryText}>  Đang tính {progress}/12…</Text></View>
                    : <Text style={styles.primaryText}>{enough ? 'Suy đoán giờ sinh' : `Cần thêm ${need} sự kiện`}</Text>}
                </TouchableOpacity>
              </>
            )}

            {guess && (
              <>
                <View style={styles.msgBox}>
                  <Text style={styles.msgText}>{statusMessage(guess.status)}</Text>
                </View>

                {guess.skippedEvents.length > 0 && (
                  <Text style={styles.hint}>
                    Đã bỏ qua {guess.skippedEvents.length} sự kiện: {guess.skippedEvents.map(s => `${kindLabel(s.event.kind)} ${s.event.year} (${s.reason})`).join('; ')}.
                  </Text>
                )}

                {guess.status !== 'insufficient_data' && (
                  <>
                    <Text style={styles.step}>Mức khớp của các canh giờ</Text>
                    {top.map((c, i) => {
                      const on = selected === c.index;
                      return (
                        <TouchableOpacity
                          key={c.index} activeOpacity={0.85} style={[styles.resRow, on && styles.resRowOn]}
                          onPress={() => setSelected(c.index)}
                          accessibilityRole="button" accessibilityState={{ selected: on }}
                        >
                          <View style={styles.resHead}>
                            <Text style={[styles.resName, on && { color: COLORS.goldLight }]}>
                              {i === 0 ? '★ ' : ''}Giờ {c.branch} <Text style={styles.resRange}>({c.range})</Text>
                            </Text>
                            <Text style={styles.resPct}>{Math.round(c.probability * 100)}%</Text>
                          </View>
                          <View style={styles.barBg}>
                            <View style={[styles.barFill, { width: `${Math.max(3, (c.probability / maxP) * 100)}%` }]} />
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                    <Text style={styles.hint}>
                      Đây là mức khớp TƯƠNG ĐỐI giữa các canh giờ theo các mốc bạn khai, không phải xác suất chính xác tuyệt đối. Chạm vào một canh giờ để chọn.
                    </Text>
                  </>
                )}

                <TouchableOpacity
                  style={[styles.primary, selected === null && styles.primaryOff]}
                  onPress={confirm} disabled={selected === null} activeOpacity={0.85}
                >
                  <Text style={styles.primaryText}>
                    {selected === null
                      ? 'Chọn một canh giờ để dùng'
                      : `Dùng giờ ${guess.candidates.find(c => c.index === selected)?.branch} làm giờ sinh`}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondary} onPress={reset}>
                  <Text style={styles.secondaryText}>← Sửa thông tin đã khai</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.background, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    maxHeight: '92%', borderWidth: 1, borderColor: COLORS.gold, width: '100%', maxWidth: 560, alignSelf: 'center',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { color: COLORS.gold, fontFamily: FONTS.bodyBold, fontSize: 18 },
  close: { color: COLORS.textSecondary, fontSize: 20, padding: 4 },
  body: { padding: SPACING.md, gap: SPACING.sm, paddingBottom: SPACING.xl },
  intro: { color: COLORS.textSecondary, fontFamily: FONTS.body, fontSize: 14, lineHeight: 20 },
  step: { color: COLORS.textPrimary, fontFamily: FONTS.bodyBold, fontSize: 15, marginTop: SPACING.sm },
  sub: { color: COLORS.textSecondary, fontFamily: FONTS.bodyBold, fontSize: 13 },
  hint: { color: COLORS.textMuted, fontFamily: FONTS.body, fontSize: 12.5, lineHeight: 18 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  chipOn: { backgroundColor: COLORS.gold + '26', borderColor: COLORS.gold },
  chipText: { color: COLORS.textSecondary, fontFamily: FONTS.body, fontSize: 13.5 },
  chipTextOn: { color: COLORS.gold, fontFamily: FONTS.bodyBold },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  yearInput: {
    flex: 1, backgroundColor: COLORS.surface, color: COLORS.textPrimary, borderRadius: 8, padding: 12,
    fontSize: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  addBtn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, backgroundColor: COLORS.gold + '33', borderWidth: 1, borderColor: COLORS.gold },
  addBtnText: { color: COLORS.gold, fontFamily: FONTS.bodyBold, fontSize: 14 },
  eventRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, paddingVertical: 10, paddingHorizontal: 12,
  },
  eventText: { color: COLORS.textPrimary, fontFamily: FONTS.body, fontSize: 14 },
  remove: { color: COLORS.textSecondary, fontSize: 16, paddingHorizontal: 6 },
  error: { color: '#E57373', fontFamily: FONTS.body, fontSize: 13.5 },
  primary: { backgroundColor: COLORS.gold, borderRadius: 14, padding: SPACING.md, alignItems: 'center', marginTop: SPACING.md },
  primaryOff: { opacity: 0.5 },
  primaryText: { color: '#1a0a00', fontFamily: FONTS.bodyBold, fontSize: 16 },
  runRow: { flexDirection: 'row', alignItems: 'center' },
  secondary: { alignItems: 'center', padding: SPACING.sm },
  secondaryText: { color: COLORS.textSecondary, fontFamily: FONTS.body, fontSize: 14 },
  msgBox: { backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md },
  msgText: { color: COLORS.textPrimary, fontFamily: FONTS.body, fontSize: 14, lineHeight: 20 },
  resRow: { backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 12, gap: 8 },
  resRowOn: { borderWidth: 2, borderColor: COLORS.gold, backgroundColor: 'rgba(226,194,133,0.12)' },
  resHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  resName: { color: COLORS.textPrimary, fontFamily: FONTS.bodyBold, fontSize: 16 },
  resRange: { color: COLORS.textSecondary, fontFamily: FONTS.body, fontSize: 13 },
  resPct: { color: COLORS.gold, fontFamily: FONTS.bodyBold, fontSize: 16 },
  barBg: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3, backgroundColor: COLORS.gold },
});
