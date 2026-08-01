/**
 * Quản lý công việc (Task ngắn hạn) + Mục tiêu dài hạn (Goal) — 2 tab.
 * Chọn Ngày bắt đầu/Ngày kết thúc qua CHÍNH lịch màu dùng ở "Xem theo ngày"
 * (LunarCalendarPicker + buildMonthHeatmap) — nhất quán 1 nguồn "ngày đẹp/xấu"
 * duy nhất cho toàn app, không dựng lại thang điểm riêng.
 *
 * VỊ TRÍ MÀN HÌNH TRONG APP CHƯA CHỐT — hiện chỉ đăng ký route để test, entry
 * point tạm thời đặt ở Home (sẽ dời khi thống nhất vị trí chính thức).
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import ScreenHeader from '../components/ScreenHeader';
import LunarCalendarPicker from '../components/LunarCalendarPicker';
import { buildMonthHeatmap } from '../core/dailyPeriodService';
import {
  listLifeTasks, createLifeTask, setLifeTaskStatus, setLifeTaskPriority, deleteLifeTask,
  type LifeTask, type TaskKind,
} from '../lib/lifeTasks';

type Props = NativeStackScreenProps<RootStackParamList, 'Tasks'>;

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function dateRangeLabel(it: LifeTask): string {
  if (it.start_date && it.end_date && it.start_date !== it.end_date) return `${formatDate(it.start_date)} → ${formatDate(it.end_date)}`;
  if (it.start_date) return `Bắt đầu ${formatDate(it.start_date)}`;
  if (it.end_date) return `Hạn ${formatDate(it.end_date)}`;
  return '';
}

export default function TasksScreen({ route, navigation }: Props) {
  const { result } = route.params;

  const [tab, setTab] = useState<TaskKind>('task');
  const [items, setItems] = useState<LifeTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Modal chọn ngày — lịch màu giống hệt "Xem theo ngày".
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null);
  const [pickerSelDate, setPickerSelDate] = useState<Date>(new Date());
  const [pickerViewYM, setPickerViewYM] = useState<{ year: number; month0: number }>(() => {
    const n = new Date(); return { year: n.getFullYear(), month0: n.getMonth() };
  });
  const pickerHeatmap = useMemo(
    () => buildMonthHeatmap(result, pickerViewYM.year, pickerViewYM.month0 + 1),
    [result, pickerViewYM.year, pickerViewYM.month0],
  );

  const load = useCallback(async (kind: TaskKind) => {
    setLoading(true);
    try {
      setItems(await listLifeTasks(kind));
    } catch (e: any) {
      Alert.alert('Không tải được danh sách', e?.message || 'Lỗi không xác định.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(tab); }, [tab, load]));

  const resetAddForm = () => {
    setShowAdd(false);
    setTitle('');
    setStartDate(null);
    setEndDate(null);
  };

  const switchTab = (k: TaskKind) => {
    setTab(k);
    resetAddForm();
  };

  const openAdd = () => {
    setShowAdd(true);
    setTitle('');
    setStartDate(null);
    setEndDate(null);
  };

  const openPicker = (which: 'start' | 'end') => {
    const existing = which === 'start' ? startDate : endDate;
    const base = existing ? new Date(existing.split('-').map(Number)[0], existing.split('-').map(Number)[1] - 1, existing.split('-').map(Number)[2]) : new Date();
    setPickerSelDate(base);
    setPickerViewYM({ year: base.getFullYear(), month0: base.getMonth() });
    setPickerFor(which);
  };

  const onPickDate = (d: Date) => {
    const iso = toISO(d);
    if (pickerFor === 'start') setStartDate(iso);
    else if (pickerFor === 'end') setEndDate(iso);
    setPickerFor(null);
  };

  const save = async () => {
    if (!title.trim() || saving) return;
    if (startDate && endDate && endDate < startDate) {
      Alert.alert('Ngày không hợp lệ', 'Ngày kết thúc phải từ ngày bắt đầu trở đi.');
      return;
    }
    setSaving(true);
    try {
      await createLifeTask({ kind: tab, title, startDate, endDate });
      resetAddForm();
      await load(tab);
    } catch (e: any) {
      Alert.alert('Không lưu được', e?.message || 'Lỗi không xác định.');
    } finally {
      setSaving(false);
    }
  };

  const toggleDone = async (item: LifeTask) => {
    try {
      await setLifeTaskStatus(item.id, item.status === 'done' ? 'open' : 'done');
      await load(tab);
    } catch (e: any) {
      Alert.alert('Không cập nhật được', e?.message || 'Lỗi không xác định.');
    }
  };

  /** Đổi thứ tự quan trọng — gán priority tuần tự cho TOÀN bộ danh sách hiện tại (đơn giản, luôn nhất quán). */
  const move = async (index: number, dir: 'up' | 'down') => {
    const swapIdx = dir === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;
    const reordered = [...items];
    [reordered[index], reordered[swapIdx]] = [reordered[swapIdx], reordered[index]];
    setItems(reordered);
    try {
      await Promise.all(reordered.map((it, i) => setLifeTaskPriority(it.id, i)));
    } catch (e: any) {
      Alert.alert('Không lưu được thứ tự', e?.message || 'Lỗi không xác định.');
      await load(tab);
    }
  };

  const remove = (item: LifeTask) => {
    Alert.alert('Xóa mục này?', item.title, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive',
        onPress: async () => {
          try { await deleteLifeTask(item.id); await load(tab); }
          catch (e: any) { Alert.alert('Không xóa được', e?.message || 'Lỗi không xác định.'); }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScreenHeader title="Việc & Mục tiêu" onBack={() => navigation.goBack()} />
      <View style={styles.tabsRow}>
        <TouchableOpacity style={[styles.tab, tab === 'task' && styles.tabActive]} onPress={() => switchTab('task')}>
          <Text style={[styles.tabTxt, tab === 'task' && styles.tabTxtActive]}>✅ Việc</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'goal' && styles.tabActive]} onPress={() => switchTab('goal')}>
          <Text style={[styles.tabTxt, tab === 'goal' && styles.tabTxtActive]}>🎯 Mục tiêu</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {!showAdd && (
          <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.85}>
            <Text style={styles.addBtnText}>{tab === 'task' ? '+ Thêm việc mới' : '+ Thêm mục tiêu mới'}</Text>
          </TouchableOpacity>
        )}

        {showAdd && (
          <View style={styles.addBox}>
            <TextInput
              style={styles.input}
              placeholder={tab === 'task' ? 'Việc cần làm là gì?' : 'Mục tiêu của bạn là gì?'}
              placeholderTextColor={COLORS.textMuted}
              value={title}
              onChangeText={setTitle}
            />
            <View style={styles.dateRow}>
              <TouchableOpacity style={styles.dateField} onPress={() => openPicker('start')} activeOpacity={0.8}>
                <Text style={styles.dateFieldLabel}>Ngày bắt đầu</Text>
                <Text style={[styles.dateFieldValue, !startDate && styles.dateFieldPlaceholder]}>
                  {startDate ? formatDate(startDate) : 'Chọn ngày'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dateField} onPress={() => openPicker('end')} activeOpacity={0.8}>
                <Text style={styles.dateFieldLabel}>Ngày kết thúc</Text>
                <Text style={[styles.dateFieldValue, !endDate && styles.dateFieldPlaceholder]}>
                  {endDate ? formatDate(endDate) : 'Chọn ngày'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.addActionsRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={resetAddForm}>
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, (!title.trim() || saving) && styles.saveBtnDisabled]}
                onPress={save}
                disabled={!title.trim() || saving}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Đang lưu…' : 'Lưu'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {loading ? (
          <ActivityIndicator color={COLORS.gold} style={{ marginTop: SPACING.lg }} />
        ) : items.length === 0 ? (
          <Text style={styles.emptyHint}>
            {tab === 'task' ? 'Chưa có việc nào. Thêm việc đầu tiên nhé!' : 'Chưa có mục tiêu nào. Đặt mục tiêu đầu tiên nhé!'}
          </Text>
        ) : (
          items.map((it, idx) => (
            <View key={it.id} style={[styles.item, it.status === 'done' && styles.itemDone]}>
              <TouchableOpacity style={styles.checkbox} onPress={() => toggleDone(it)}>
                <Text style={styles.checkboxTxt}>{it.status === 'done' ? '✅' : '⬜'}</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemTitle, it.status === 'done' && styles.itemTitleDone]}>{it.title}</Text>
                {(it.start_date || it.end_date) && (
                  <Text style={styles.itemDate}>{tab === 'task' ? '📅' : '🎯'} {dateRangeLabel(it)}</Text>
                )}
              </View>
              <View style={styles.orderCol}>
                <TouchableOpacity onPress={() => move(idx, 'up')} disabled={idx === 0} hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}>
                  <Text style={[styles.orderBtn, idx === 0 && styles.orderBtnDisabled]}>▲</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => move(idx, 'down')} disabled={idx === items.length - 1} hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}>
                  <Text style={[styles.orderBtn, idx === items.length - 1 && styles.orderBtnDisabled]}>▼</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => remove(it)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.deleteTxt}>✕</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
        <Text style={styles.orderHint}>Nhấn ▲▼ để xếp việc quan trọng lên trước. Việc chưa xếp tự sắp theo ngày bắt đầu/kết thúc.</Text>
      </ScrollView>

      <Modal visible={!!pickerFor} transparent animationType="slide" onRequestClose={() => setPickerFor(null)}>
        <View style={styles.pickerBackdrop}>
          <TouchableOpacity style={styles.pickerBackdropTap} activeOpacity={1} onPress={() => setPickerFor(null)} />
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>{pickerFor === 'start' ? 'Chọn ngày bắt đầu' : 'Chọn ngày kết thúc'}</Text>
              <TouchableOpacity onPress={() => setPickerFor(null)}><Text style={styles.pickerClose}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView>
              <LunarCalendarPicker
                selectedDate={pickerSelDate}
                onSelectDate={onPickDate}
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
  tabsRow: {
    flexDirection: 'row', marginHorizontal: SPACING.lg, backgroundColor: COLORS.surface,
    borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  tab: { flex: 1, paddingVertical: SPACING.sm, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: COLORS.gold, backgroundColor: COLORS.gold + '11' },
  tabTxt: { color: COLORS.textSecondary, fontWeight: '700', fontSize: FONTS.size.sm },
  tabTxtActive: { color: COLORS.gold },
  addBtn: {
    borderWidth: 1, borderColor: COLORS.gold, borderRadius: 10, paddingVertical: SPACING.sm,
    alignItems: 'center', backgroundColor: COLORS.card,
  },
  addBtnText: { color: COLORS.gold, fontWeight: '800', fontSize: FONTS.size.sm },
  addBox: {
    backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, gap: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.card, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border,
    color: COLORS.textPrimary, padding: SPACING.sm, fontSize: FONTS.size.sm,
  },
  dateRow: { flexDirection: 'row', gap: SPACING.sm },
  dateField: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.sm, gap: 2,
  },
  dateFieldLabel: { color: COLORS.textMuted, fontSize: FONTS.size.xs, fontWeight: '700' },
  dateFieldValue: { color: COLORS.gold, fontSize: FONTS.size.sm, fontWeight: '700' },
  dateFieldPlaceholder: { color: COLORS.textSecondary, fontWeight: '600' },
  addActionsRow: { flexDirection: 'row', gap: SPACING.sm, justifyContent: 'flex-end' },
  cancelBtn: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: FONTS.size.sm },
  saveBtn: { backgroundColor: COLORS.gold, borderRadius: 8, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#1a0a00', fontWeight: '800', fontSize: FONTS.size.sm },
  emptyHint: { color: COLORS.textMuted, fontSize: FONTS.size.sm, fontStyle: 'italic', textAlign: 'center', marginTop: SPACING.md },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.sm,
  },
  itemDone: { opacity: 0.55 },
  checkbox: { padding: 2 },
  checkboxTxt: { fontSize: 18 },
  itemTitle: { color: COLORS.textPrimary, fontSize: FONTS.size.sm, fontWeight: '700' },
  itemTitleDone: { textDecorationLine: 'line-through' },
  itemDate: { color: COLORS.textSecondary, fontSize: FONTS.size.xs, marginTop: 2 },
  orderCol: { alignItems: 'center', gap: 2 },
  orderBtn: { color: COLORS.gold, fontSize: 12, fontWeight: '900', padding: 2 },
  orderBtnDisabled: { color: COLORS.textMuted, opacity: 0.35 },
  orderHint: { color: COLORS.textMuted, fontSize: FONTS.size.xs, fontStyle: 'italic', textAlign: 'center', marginTop: 4 },
  deleteTxt: { color: '#ff7a7a', fontSize: FONTS.size.md, fontWeight: '800', padding: 4 },

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
