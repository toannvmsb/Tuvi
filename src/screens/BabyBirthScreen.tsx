/**
 * CHỌN NGÀY GIỜ SINH CHO CON — nhập khoảng ngày (thường quanh ngày dự sinh) + lá số bố/mẹ (hoặc lá số so sánh),
 * Tuzi xếp hạng các (ngày, canh giờ) trong khoảng đó. Miễn phí, không AI (core/babyBirth).
 * Lời nhắc "bác sĩ quyết định" luôn hiện; không hỏi giới tính thai nhi; khoảng ngày tối đa MAX_DAYS.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import ChartPickerModal from '../components/ChartPickerModal';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { Card, GoldButton } from '../ui';
import type { AstrologyResult } from '../types';
import {
  MAX_DAYS, BABY_DISCLAIMER, scanBabyBirth, validateWindow, type BabyCandidate, type BabyScanResult,
} from '../core/babyBirth';

const DAY_CHOICES = [7, 10, 14, 21, 30];
const MAX_PARENTS = 3;
const WEEKDAYS = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

const dateLabel = (c: { year: number; month: number; day: number }) =>
  `${WEEKDAYS[new Date(c.year, c.month - 1, c.day).getDay()]}, ${String(c.day).padStart(2, '0')}/${String(c.month).padStart(2, '0')}/${c.year}`;

function CandidateCard({ c, rank, parentCount }: { c: BabyCandidate; rank?: number; parentCount: number }) {
  return (
    <Card style={{ gap: 8 }}>
      <View style={styles.cardHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{rank ? `#${rank} · ` : ''}{dateLabel(c)}</Text>
          <Text style={styles.cardSub}>Giờ {c.branch} ({c.range})</Text>
        </View>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreNum}>{c.total.toFixed(1)}</Text>
          <Text style={styles.scoreLbl}>điểm</Text>
        </View>
      </View>
      <View style={styles.subRow}>
        <Text style={styles.subChip}>Lá số bé {c.baby.toFixed(1)}</Text>
        {c.parent !== null && <Text style={styles.subChip}>Hợp bố/mẹ {c.parent.toFixed(1)}</Text>}
      </View>
      {c.reasons.slice(0, 3).map((t, i) => <Text key={`r${i}`} style={styles.good}>✓ {t}</Text>)}
      {c.cautions.slice(0, 3).map((t, i) => <Text key={`w${i}`} style={styles.warn}>⚠ {t}</Text>)}
      {parentCount === 0 && <Text style={styles.hint}>Chưa chọn lá số bố/mẹ nên chỉ chấm theo lá số của bé.</Text>}
    </Card>
  );
}

/** Ô số trong hàng ngày/tháng/năm. Bọc View `minWidth: 0` để TextInput trên web (có độ rộng tối thiểu theo nội dung) không tràn khỏi khung. */
function DateField({ flex, value, onChange, placeholder }: { flex: number; value: string; onChange: (t: string) => void; placeholder: string }) {
  return (
    <View style={{ flex, minWidth: 0 }}>
      <TextInput
        style={styles.input} value={value} onChangeText={onChange} keyboardType="number-pad"
        placeholder={placeholder} placeholderTextColor={COLORS.textMuted} accessibilityLabel={placeholder}
      />
    </View>
  );
}

export default function BabyBirthScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const preset: AstrologyResult | undefined = route.params?.result;

  const today = useMemo(() => new Date(), []);
  const [ack, setAck] = useState(false);
  const [day, setDay] = useState(String(today.getDate()));
  const [month, setMonth] = useState(String(today.getMonth() + 1));
  const [year, setYear] = useState(String(today.getFullYear()));
  const [days, setDays] = useState(14);
  const [parents, setParents] = useState<AstrologyResult[]>(preset ? [preset] : []);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<BabyScanResult | null>(null);
  const [scanned, setScanned] = useState<{ start: string; days: number; parents: number } | null>(null);

  const addParent = (r: AstrologyResult) =>
    setParents(list => (list.length >= MAX_PARENTS || list.some(p => p.birthInfo.chartId && p.birthInfo.chartId === r.birthInfo.chartId) ? list : [...list, r]));

  const run = async () => {
    const start = { year: parseInt(year, 10), month: parseInt(month, 10), day: parseInt(day, 10) };
    const err = validateWindow({ start, days });
    if (err) { Alert.alert('Chưa thể tính', err); return; }
    setRunning(true); setProgress(0); setResult(null);
    try {
      const res = await scanBabyBirth({ start, days, parents }, done => setProgress(done));
      setResult(res);
      setScanned({ start: `${day}/${month}/${year}`, days, parents: parents.length });
    } catch (e: any) {
      Alert.alert('Chưa thể tính', e?.message ?? 'Có lỗi khi tính. Hãy thử lại.');
    } finally { setRunning(false); }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="Chọn ngày giờ sinh cho con" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerTitle}>⚕️ Lưu ý quan trọng</Text>
          <Text style={styles.disclaimerText}>{BABY_DISCLAIMER}</Text>
          <TouchableOpacity style={styles.ackRow} onPress={() => setAck(a => !a)} accessibilityRole="checkbox" accessibilityState={{ checked: ack }}>
            <View style={[styles.box, ack && styles.boxOn]}>{ack && <Text style={styles.tick}>✓</Text>}</View>
            <Text style={styles.ackText}>Tôi hiểu và chỉ dùng để tham khảo trong khoảng ngày dự sinh bác sĩ cho phép.</Text>
          </TouchableOpacity>
        </View>

        <Card style={{ gap: 10 }}>
          <Text style={styles.section}>📅 Khoảng ngày (thường quanh ngày dự sinh)</Text>
          <Text style={styles.label}>Từ ngày</Text>
          <View style={styles.dateRow}>
            <DateField flex={1} value={day} onChange={t => setDay(t.replace(/\D/g, '').slice(0, 2))} placeholder="Ngày" />
            <DateField flex={1} value={month} onChange={t => setMonth(t.replace(/\D/g, '').slice(0, 2))} placeholder="Tháng" />
            <DateField flex={1.5} value={year} onChange={t => setYear(t.replace(/\D/g, '').slice(0, 4))} placeholder="Năm" />
          </View>
          <Text style={styles.label}>Số ngày trong khoảng (tối đa {MAX_DAYS})</Text>
          <View style={styles.chips}>
            {DAY_CHOICES.map(n => (
              <TouchableOpacity key={n} style={[styles.chip, days === n && styles.chipOn]} onPress={() => setDays(n)}>
                <Text style={[styles.chipText, days === n && styles.chipTextOn]}>{n} ngày</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.hint}>Chỉ nhập khoảng ngày bác sĩ cho là an toàn. Tuzi không gợi ý ngày ngoài khoảng này.</Text>
        </Card>

        <Card style={{ gap: 10 }}>
          <Text style={styles.section}>👨‍👩‍👦 Lá số bố/mẹ (hoặc lá số so sánh)</Text>
          {parents.length === 0 && <Text style={styles.hint}>Không chọn thì chỉ chấm theo lá số của bé.</Text>}
          {parents.map((p, i) => (
            <View key={i} style={styles.parentRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.parentName}>{p.birthInfo.name || 'Không tên'}</Text>
                <Text style={styles.parentSub}>{p.birthInfo.day}/{p.birthInfo.month}/{p.birthInfo.year}</Text>
              </View>
              <TouchableOpacity onPress={() => setParents(list => list.filter((_, j) => j !== i))} accessibilityLabel="Bỏ lá số này">
                <Text style={styles.remove}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          {parents.length < MAX_PARENTS && (
            <TouchableOpacity style={styles.addBtn} onPress={() => setPickerOpen(true)}>
              <Text style={styles.addBtnText}>＋ Chọn lá số đã lưu</Text>
            </TouchableOpacity>
          )}
        </Card>

        <GoldButton label={running ? `Đang tính ${progress}/${days} ngày…` : '🔮 Tìm ngày giờ đẹp'} onPress={run} disabled={!ack || running} />
        {running && <ActivityIndicator color={COLORS.gold} />}
        {!ack && !running && <Text style={styles.hint}>Hãy đọc và tích xác nhận ở phần Lưu ý để bắt đầu.</Text>}

        {result && scanned && (
          <>
            <Text style={styles.resultTitle}>Kết quả: {scanned.days} ngày từ {scanned.start}{scanned.parents ? ` · hợp với ${scanned.parents} lá số` : ''}</Text>
            <Text style={styles.hint}>{BABY_DISCLAIMER}</Text>

            <Text style={styles.section}>🏆 {result.top.length} ngày giờ có điểm cao nhất</Text>
            {result.top.map((c, i) => <CandidateCard key={`t${i}`} c={c} rank={i + 1} parentCount={scanned.parents} />)}

            <Text style={[styles.section, { marginTop: SPACING.md }]}>📆 Giờ đẹp nhất của từng ngày</Text>
            {result.bestPerDay.map((c, i) => (
              <View key={`d${i}`} style={styles.dayRow}>
                <Text style={styles.dayDate}>{dateLabel(c)}</Text>
                <Text style={styles.dayHour}>Giờ {c.branch} ({c.range})</Text>
                <Text style={styles.dayScore}>{c.total.toFixed(1)}</Text>
              </View>
            ))}
            <Text style={styles.hint}>
              Điểm so sánh các ngày giờ với nhau trong cùng khoảng, theo bảng quy tắc thử nghiệm (không phải điểm tuyệt đối).
              Ngày giờ sinh thực tế do bác sĩ quyết định.
            </Text>
          </>
        )}
      </ScrollView>

      <ChartPickerModal visible={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={addParent} title="Chọn lá số bố/mẹ" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  // Không giới hạn bề ngang: màn hình co giãn theo cửa sổ như các màn khác của app.
  scroll: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },
  disclaimer: { backgroundColor: 'rgba(229,115,115,0.10)', borderColor: '#E57373', borderWidth: 1, borderRadius: 12, padding: SPACING.md, gap: 8 },
  disclaimerTitle: { color: '#FFB4B4', fontFamily: FONTS.bodyBold, fontSize: 15 },
  disclaimerText: { color: COLORS.textPrimary, fontFamily: FONTS.body, fontSize: 14, lineHeight: 20 },
  ackRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 4 },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: COLORS.gold, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: COLORS.gold },
  tick: { color: '#1a0a00', fontWeight: '800' },
  ackText: { flex: 1, color: COLORS.textPrimary, fontFamily: FONTS.body, fontSize: 13.5 },
  section: { color: COLORS.gold, fontFamily: FONTS.bodyBold, fontSize: 16 },
  label: { color: COLORS.textSecondary, fontFamily: FONTS.body, fontSize: 13 },
  hint: { color: COLORS.textMuted, fontFamily: FONTS.body, fontSize: 12.5, lineHeight: 18 },
  dateRow: { flexDirection: 'row', gap: 8, width: '100%' },
  input: { width: '100%', minWidth: 0, backgroundColor: COLORS.surface, color: COLORS.textPrimary, borderRadius: 8, padding: SPACING.md, fontSize: 16, borderWidth: 1, borderColor: COLORS.border, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  chipOn: { backgroundColor: COLORS.gold + '26', borderColor: COLORS.gold },
  chipText: { color: COLORS.textSecondary, fontFamily: FONTS.body, fontSize: 14 },
  chipTextOn: { color: COLORS.gold, fontFamily: FONTS.bodyBold },
  parentRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md },
  parentName: { color: COLORS.textPrimary, fontFamily: FONTS.bodyBold, fontSize: 15 },
  parentSub: { color: COLORS.textSecondary, fontFamily: FONTS.body, fontSize: 13 },
  remove: { color: COLORS.textSecondary, fontSize: 18, padding: 6 },
  addBtn: { borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.gold, borderRadius: 10, padding: SPACING.md, alignItems: 'center' },
  addBtnText: { color: COLORS.gold, fontFamily: FONTS.bodyBold, fontSize: 14.5 },
  resultTitle: { color: COLORS.textPrimary, fontFamily: FONTS.bodyBold, fontSize: 16, marginTop: SPACING.md },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle: { color: COLORS.textPrimary, fontFamily: FONTS.bodyBold, fontSize: 15 },
  cardSub: { color: COLORS.gold, fontFamily: FONTS.bodyBold, fontSize: 14, marginTop: 2 },
  scoreBox: { alignItems: 'center', minWidth: 62 },
  scoreNum: { color: COLORS.gold, fontFamily: FONTS.bodyBold, fontSize: 24 },
  scoreLbl: { color: COLORS.textMuted, fontFamily: FONTS.body, fontSize: 11 },
  subRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  subChip: { color: COLORS.textSecondary, fontFamily: FONTS.body, fontSize: 12.5, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, paddingVertical: 3, paddingHorizontal: 8, overflow: 'hidden' },
  good: { color: '#9be3a8', fontFamily: FONTS.body, fontSize: 13, lineHeight: 18 },
  warn: { color: '#ffd28a', fontFamily: FONTS.body, fontSize: 13, lineHeight: 18 },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, paddingVertical: 10, paddingHorizontal: 12 },
  dayDate: { flex: 1.4, color: COLORS.textPrimary, fontFamily: FONTS.body, fontSize: 13 },
  dayHour: { flex: 1, color: COLORS.gold, fontFamily: FONTS.body, fontSize: 13 },
  dayScore: { color: COLORS.textPrimary, fontFamily: FONTS.bodyBold, fontSize: 14, minWidth: 44, textAlign: 'right' },
});
