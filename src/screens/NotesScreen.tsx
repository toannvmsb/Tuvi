/**
 * Ghi chú nhanh — sổ ghi chú TỰ DO theo ngày, tách biệt hoàn toàn với
 * Việc & Mục tiêu (không ngày bắt đầu/kết thúc, không trạng thái hoàn thành).
 * Dùng để note lại điều chợt nhớ ra hoặc một sự kiện đã diễn ra.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, AstrologyResult } from '../types';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import ScreenHeader from '../components/ScreenHeader';
import LunarCalendarPicker from '../components/LunarCalendarPicker';
import { listLifeNotes, createLifeNote, deleteLifeNote, type LifeNote } from '../lib/lifeNotes';
import { getMyChartId } from '../lib/myChart';
import { listCharts, getCachedCharts, rowToResult } from '../lib/charts';
import { buildMonthHeatmap } from '../core/dailyPeriodService';
import { buildGenericMonthHeatmapForMonth } from '../core/genericMonthHeatmap';

type Props = NativeStackScreenProps<RootStackParamList, 'Notes'>;

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function formatTime(createdAt: string): string {
  const d = new Date(createdAt);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function NotesScreen({ navigation }: Props) {
  const { online } = useAuth();
  const [items, setItems] = useState<LifeNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [noteDate, setNoteDate] = useState<string>(() => toISO(new Date()));
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [myResult, setMyResult] = useState<AstrologyResult | null>(null);

  const pickerSelDate = useMemo(() => {
    const [y, m, d] = noteDate.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [noteDate]);

  // Lịch chọn ngày tô màu tốt/xấu GIỐNG hệt "Việc & Mục tiêu": có lá số gắn thì
  // cá nhân hóa (buildMonthHeatmap), chưa gắn thì vẫn tô theo công thức chung
  // (buildGenericMonthHeatmapForMonth) thay vì để lịch trắng — Ghi chú nhanh
  // không bắt buộc phải có lá số.
  const [pickerViewYM, setPickerViewYM] = useState<{ year: number; month0: number }>(() => {
    const n = new Date(); return { year: n.getFullYear(), month0: n.getMonth() };
  });
  const pickerHeatmap = useMemo(
    () => (myResult
      ? buildMonthHeatmap(myResult, pickerViewYM.year, pickerViewYM.month0 + 1)
      : buildGenericMonthHeatmapForMonth(pickerViewYM.year, pickerViewYM.month0 + 1)),
    [myResult, pickerViewYM.year, pickerViewYM.month0],
  );

  useFocusEffect(useCallback(() => {
    (async () => {
      try {
        const charts = online ? await listCharts() : (getCachedCharts() ?? []);
        const id = await getMyChartId();
        const row = id ? charts.find(r => r.id === id) : undefined;
        setMyResult(row ? rowToResult(row) : null);
      } catch { setMyResult(null); }
    })();
  }, [online]));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listLifeNotes());
    } catch (e: any) {
      Alert.alert('Không tải được ghi chú', e?.message || 'Lỗi không xác định.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const save = async () => {
    if (!content.trim() || saving) return;
    setSaving(true);
    try {
      await createLifeNote({ content, noteDate });
      setContent('');
      setNoteDate(toISO(new Date()));
      await load();
    } catch (e: any) {
      Alert.alert('Không lưu được', e?.message || 'Lỗi không xác định.');
    } finally {
      setSaving(false);
    }
  };

  const remove = (item: LifeNote) => {
    Alert.alert('Xóa ghi chú này?', item.content, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive',
        onPress: async () => {
          try { await deleteLifeNote(item.id); await load(); }
          catch (e: any) { Alert.alert('Không xóa được', e?.message || 'Lỗi không xác định.'); }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScreenHeader title="Ghi chú nhanh" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.addBox}>
          <TextInput
            style={styles.input}
            placeholder="Chợt nhớ ra điều gì đó? Hoặc note lại một sự kiện…"
            placeholderTextColor={COLORS.textMuted}
            value={content}
            onChangeText={setContent}
            multiline
          />
          <TouchableOpacity style={styles.dateField} onPress={() => setShowPicker(true)} activeOpacity={0.8}>
            <Text style={styles.dateFieldLabel}>Ngày</Text>
            <Text style={styles.dateFieldValue}>{formatDate(noteDate)}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, (!content.trim() || saving) && styles.saveBtnDisabled]}
            onPress={save}
            disabled={!content.trim() || saving}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Đang lưu…' : 'Lưu ghi chú'}</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.gold} style={{ marginTop: SPACING.lg }} />
        ) : items.length === 0 ? (
          <Text style={styles.emptyHint}>Chưa có ghi chú nào. Note lại điều đầu tiên nhé!</Text>
        ) : (
          items.map(it => (
            <View key={it.id} style={styles.item}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemContent}>{it.content}</Text>
                <Text style={styles.itemDate}>📝 {formatDate(it.note_date)} · {formatTime(it.created_at)}</Text>
              </View>
              <TouchableOpacity onPress={() => remove(it)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.deleteTxt}>✕</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <View style={styles.pickerBackdrop}>
          <TouchableOpacity style={styles.pickerBackdropTap} activeOpacity={1} onPress={() => setShowPicker(false)} />
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Chọn ngày</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}><Text style={styles.pickerClose}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView>
              <LunarCalendarPicker
                selectedDate={pickerSelDate}
                onSelectDate={(d) => { setNoteDate(toISO(d)); setShowPicker(false); }}
                monthHeatmap={pickerHeatmap}
                onViewMonthChange={(year, month0) => setPickerViewYM({ year, month0 })}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.lg, gap: SPACING.sm, paddingBottom: SPACING.xxl },
  addBox: {
    backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, gap: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.card, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border,
    color: COLORS.textPrimary, padding: SPACING.sm, fontSize: FONTS.size.sm, minHeight: 70, textAlignVertical: 'top',
  },
  dateField: {
    backgroundColor: COLORS.card, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.sm, gap: 2, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  dateFieldLabel: { color: COLORS.textMuted, fontSize: FONTS.size.xs, fontWeight: '700' },
  dateFieldValue: { color: COLORS.gold, fontSize: FONTS.size.sm, fontWeight: '700' },
  saveBtn: { backgroundColor: COLORS.gold, borderRadius: 8, paddingVertical: SPACING.sm, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#1a0a00', fontWeight: '800', fontSize: FONTS.size.sm },
  emptyHint: { color: COLORS.textMuted, fontSize: FONTS.size.sm, fontStyle: 'italic', textAlign: 'center', marginTop: SPACING.md },
  item: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
    backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.sm,
  },
  itemContent: { color: COLORS.textPrimary, fontSize: FONTS.size.sm, fontWeight: '600', lineHeight: 20 },
  itemDate: { color: COLORS.textSecondary, fontSize: FONTS.size.xs, marginTop: 4 },
  deleteTxt: { color: COLORS.red, fontSize: FONTS.size.md, fontWeight: '800', padding: 4 },

  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  pickerBackdropTap: { flex: 1 },
  pickerSheet: {
    maxHeight: '80%', backgroundColor: COLORS.background, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: SPACING.lg, borderTopWidth: 1, borderColor: COLORS.gold,
  },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  pickerTitle: { color: COLORS.gold, fontSize: FONTS.size.md, fontWeight: '800' },
  pickerClose: { color: COLORS.textSecondary, fontSize: FONTS.size.lg, fontWeight: '700', padding: 4 },
});
