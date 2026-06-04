/**
 * Màn hình "Xem ngày để xuất hành" — người dùng chọn 1 việc + khoảng ngày,
 * app trả top 3 ngày phù hợp nhất kèm lý do / khung giờ / hướng / màu mặc.
 */
import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import ScreenHeader from '../components/ScreenHeader';
import MedDisclaimer from '../components/MedDisclaimer';
import { DAY_PICK_GROUPS, type DayPickGroup, type DayPickTask } from '../data/dayPickTasks';
import { pickGoodDays, type DayPickOutput } from '../core/dayPicker';

type Props = NativeStackScreenProps<RootStackParamList, 'DayPicker'>;

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const YEARS_NOW = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => YEARS_NOW + i);  // năm nay + 5 năm tới

function daysInMonth(m: number, y: number): number {
  return new Date(y, m, 0).getDate();
}

export default function DayPickerScreen({ route, navigation }: Props) {
  const { result } = route.params;

  // Lựa chọn group/task
  const [group, setGroup] = useState<DayPickGroup | null>(null);
  const [task, setTask] = useState<DayPickTask | null>(null);

  // Khoảng thời gian — mặc định: hôm nay → +30 ngày
  const today = new Date();
  const plus30 = new Date(today.getTime() + 30 * 86400000);
  const [from, setFrom] = useState<{ d: number; m: number; y: number }>({
    d: today.getDate(), m: today.getMonth() + 1, y: today.getFullYear(),
  });
  const [to, setTo] = useState<{ d: number; m: number; y: number }>({
    d: plus30.getDate(), m: plus30.getMonth() + 1, y: plus30.getFullYear(),
  });

  // Modal state
  type ModalType = null | 'group' | 'task' | 'fromD' | 'fromM' | 'fromY' | 'toD' | 'toM' | 'toY';
  const [modal, setModal] = useState<ModalType>(null);

  const [output, setOutput] = useState<DayPickOutput | null>(null);

  const canRun = !!task;

  const run = () => {
    if (!task) return;
    const fromD = new Date(from.y, from.m - 1, from.d);
    const toD = new Date(to.y, to.m - 1, to.d);
    setOutput(pickGoodDays(result, task.code, fromD, toD));
  };

  const fromDays = useMemo(() => Array.from({ length: daysInMonth(from.m, from.y) }, (_, i) => i + 1), [from.m, from.y]);
  const toDays = useMemo(() => Array.from({ length: daysInMonth(to.m, to.y) }, (_, i) => i + 1), [to.m, to.y]);

  const closeModal = () => setModal(null);

  const renderModal = () => {
    if (!modal) return null;
    let title = '', data: any[] = [], current: any = null, onPick: (v: any) => void = () => {};
    if (modal === 'group') {
      title = 'Chọn nhóm việc'; data = DAY_PICK_GROUPS; current = group?.code;
      onPick = (g: DayPickGroup) => { setGroup(g); setTask(null); closeModal(); };
    } else if (modal === 'task' && group) {
      title = `Chọn việc — ${group.name}`; data = group.tasks; current = task?.code;
      onPick = (t: DayPickTask) => { setTask(t); closeModal(); };
    } else if (modal === 'fromD') {
      title = 'Chọn ngày bắt đầu'; data = fromDays; current = from.d;
      onPick = (v: number) => { setFrom({ ...from, d: v }); closeModal(); };
    } else if (modal === 'fromM') {
      title = 'Chọn tháng bắt đầu'; data = MONTHS; current = from.m;
      onPick = (v: number) => {
        const maxD = daysInMonth(v, from.y);
        setFrom({ ...from, m: v, d: Math.min(from.d, maxD) });
        closeModal();
      };
    } else if (modal === 'fromY') {
      title = 'Chọn năm bắt đầu'; data = YEARS; current = from.y;
      onPick = (v: number) => { setFrom({ ...from, y: v }); closeModal(); };
    } else if (modal === 'toD') {
      title = 'Chọn ngày kết thúc'; data = toDays; current = to.d;
      onPick = (v: number) => { setTo({ ...to, d: v }); closeModal(); };
    } else if (modal === 'toM') {
      title = 'Chọn tháng kết thúc'; data = MONTHS; current = to.m;
      onPick = (v: number) => {
        const maxD = daysInMonth(v, to.y);
        setTo({ ...to, m: v, d: Math.min(to.d, maxD) });
        closeModal();
      };
    } else if (modal === 'toY') {
      title = 'Chọn năm kết thúc'; data = YEARS; current = to.y;
      onPick = (v: number) => { setTo({ ...to, y: v }); closeModal(); };
    }
    return (
      <Modal visible transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>{title}</Text>
              <TouchableOpacity onPress={closeModal}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
            </View>
            <FlatList
              data={data}
              keyExtractor={(item: any) => String(item.code ?? item)}
              renderItem={({ item }) => {
                const value = item.code ?? item;
                const label = item.name
                  ? `${item.emoji ? item.emoji + '  ' : ''}${item.name}`
                  : String(item);
                const isActive = value === current;
                return (
                  <TouchableOpacity
                    style={[styles.modalItem, isActive && styles.modalItemActive]}
                    onPress={() => onPick(item)}
                  >
                    <Text style={[styles.modalItemText, isActive && styles.modalItemTextActive]}>{label}</Text>
                    {isActive && <Text style={styles.modalCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="Xem ngày tốt" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Hàng giới thiệu: lá số đang xem */}
        <Text style={styles.chartFor}>
          Xem ngày tốt cho{' '}
          <Text style={styles.chartName}>{result.birthInfo.name || '(không tên)'}</Text>
        </Text>

        {/* Hàng 1: 2 droplist (nhóm + việc) */}
        <View style={styles.card}>
          <Text style={styles.label}>Bước 1 — Chọn loại việc</Text>
          <View style={styles.row2}>
            <TouchableOpacity style={styles.dropdown} onPress={() => setModal('group')} activeOpacity={0.85}>
              <Text style={styles.dropdownLabel}>Nhóm việc</Text>
              <Text style={styles.dropdownValue} numberOfLines={1}>
                {group ? `${group.emoji}  ${group.name}` : 'Chọn nhóm ▾'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dropdown, !group && styles.dropdownDisabled]}
              onPress={() => group && setModal('task')}
              disabled={!group}
              activeOpacity={0.85}
            >
              <Text style={styles.dropdownLabel}>Việc cụ thể</Text>
              <Text style={styles.dropdownValue} numberOfLines={1}>
                {task ? task.name : (group ? 'Chọn việc ▾' : '— chọn nhóm trước —')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hàng 2: ngày bắt đầu / kết thúc */}
        <View style={styles.card}>
          <Text style={styles.label}>Bước 2 — Chọn khoảng thời gian muốn xem</Text>

          <Text style={styles.dateLabel}>Ngày bắt đầu</Text>
          <View style={styles.row3}>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setModal('fromD')}>
              <Text style={styles.dateBtnTxt}>{from.d}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setModal('fromM')}>
              <Text style={styles.dateBtnTxt}>Tháng {from.m}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setModal('fromY')}>
              <Text style={styles.dateBtnTxt}>{from.y}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.dateLabel}>Ngày kết thúc</Text>
          <View style={styles.row3}>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setModal('toD')}>
              <Text style={styles.dateBtnTxt}>{to.d}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setModal('toM')}>
              <Text style={styles.dateBtnTxt}>Tháng {to.m}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setModal('toY')}>
              <Text style={styles.dateBtnTxt}>{to.y}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Nút Xem ngày phù hợp */}
        <TouchableOpacity
          style={[styles.runBtn, !canRun && styles.runBtnDisabled]}
          onPress={run}
          disabled={!canRun}
          activeOpacity={0.85}
        >
          <Text style={styles.runBtnTxt}>🔍  Xem ngày phù hợp</Text>
        </TouchableOpacity>

        {/* Output */}
        {output && (
          <View style={styles.outputCard}>
            <Text style={styles.outputHead}>
              {output.task.emoji}  Kết quả cho: <Text style={{ color: COLORS.gold, fontWeight: '800' }}>{output.task.taskName}</Text>
            </Text>
            <Text style={styles.outputMeta}>
              Đã phân tích {output.totalDays} ngày — có {output.okDays} ngày khả dụng.
            </Text>
            {output.warning && <Text style={styles.warning}>⚠ {output.warning}</Text>}

            {output.top.length > 0 && (
              <>
                <Text style={styles.topLabel}>🏆 3 ngày phù hợp nhất (ưu tiên từ cao xuống thấp):</Text>
                {output.top.map((d, i) => {
                  const medal = ['🥇', '🥈', '🥉'][i] || '✦';
                  return (
                    <View key={d.dateLabel} style={styles.dayItem}>
                      <Text style={styles.dayHead}>{medal}  {d.dateLabel}</Text>
                      <Text style={styles.dayCanChi}>{d.canChiLabel}  ·  <Text style={{ color: COLORS.gold }}>{d.rating}</Text>  ·  điểm {d.score}</Text>
                      <Text style={styles.dayReasonHead}>Vì sao:</Text>
                      {d.reasons.slice(0, 3).map((r, ri) => <Text key={ri} style={styles.dayReason}>• {r}</Text>)}
                      {d.bestHours.length > 0 && (
                        <Text style={styles.dayDetail}>
                          🕒 <Text style={styles.bold}>Khung giờ tốt cho lá số:</Text>{' '}
                          {d.bestHours.map(h => `${h.branch} (${h.range})`).join(' · ')}
                        </Text>
                      )}
                      {d.generalHours.length > 0 && (
                        <Text style={styles.dayDetail}>
                          🕓 <Text style={styles.bold}>Khung giờ tốt nói chung:</Text>{' '}
                          {d.generalHours.map(h => `${h.branch} (${h.range})`).join(' · ')}
                        </Text>
                      )}
                      {d.direction && <Text style={styles.dayDetail}>🧭 <Text style={styles.bold}>Hướng xuất hành:</Text> {d.direction}</Text>}
                      {d.goodColor && <Text style={styles.dayDetail}>👕 <Text style={styles.bold}>Màu nên mặc:</Text> {d.goodColor}</Text>}
                      {d.avoidColor && <Text style={styles.dayDetail}>🚫 <Text style={styles.bold}>Màu nên tránh:</Text> {d.avoidColor}</Text>}
                    </View>
                  );
                })}
              </>
            )}
          </View>
        )}

        <Text style={styles.note}>
          _Logic dựa trên lá số của bạn (Dụng/Kỵ thần Bát Tự + hợp/xung tuổi) kết hợp tính chất từng việc.
          • "Khung giờ tốt cho lá số" hợp riêng với mệnh của bạn. • "Khung giờ tốt nói chung" là giờ
          hoàng đạo của ngày theo phong thủy (dùng khi giờ hợp lá số rơi vào lúc bất tiện).
          Kết quả mang tính tham khảo._
        </Text>

        <MedDisclaimer compact style={{ marginTop: SPACING.xs }} />
      </ScrollView>

      {renderModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.lg, paddingBottom: SPACING.xxl, gap: SPACING.md },
  chartFor: { color: COLORS.textPrimary, fontSize: FONTS.size.md, textAlign: 'center', fontStyle: 'italic' },
  chartName: { color: COLORS.gold, fontWeight: '800', fontStyle: 'normal' },
  card: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, gap: SPACING.sm,
  },
  label: { color: COLORS.gold, fontSize: FONTS.size.md, fontWeight: '800' },
  row2: { flexDirection: 'row', gap: SPACING.sm },
  row3: { flexDirection: 'row', gap: 8 },
  dropdown: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.sm,
    minHeight: 56, justifyContent: 'center',
  },
  dropdownDisabled: { opacity: 0.5 },
  dropdownLabel: { color: COLORS.goldLight, fontSize: FONTS.size.sm, fontWeight: '700', marginBottom: 4 },
  dropdownValue: { color: COLORS.textPrimary, fontSize: FONTS.size.sm, fontWeight: '700' },
  dateLabel: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, marginTop: 4 },
  dateBtn: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.border, paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  dateBtnTxt: { color: COLORS.textPrimary, fontSize: FONTS.size.md, fontWeight: '700' },
  runBtn: {
    backgroundColor: COLORS.gold, borderRadius: 10, paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  runBtnDisabled: { opacity: 0.4 },
  runBtnTxt: { color: '#1a0a00', fontSize: FONTS.size.md, fontWeight: '800' },

  outputCard: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.gold,
  },
  outputHead: { color: COLORS.textPrimary, fontSize: FONTS.size.md, fontWeight: '700', marginBottom: 4 },
  outputMeta: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, marginBottom: SPACING.sm },
  warning: { color: '#e0a23a', fontSize: FONTS.size.sm, marginBottom: SPACING.sm, fontStyle: 'italic' },

  topLabel: { color: COLORS.gold, fontSize: FONTS.size.md, fontWeight: '800', marginTop: SPACING.sm, marginBottom: SPACING.xs },
  dayItem: {
    backgroundColor: COLORS.surface, borderRadius: 10, padding: SPACING.sm,
    marginTop: SPACING.sm, borderLeftWidth: 3, borderLeftColor: COLORS.gold, gap: 4,
  },
  dayHead: { color: COLORS.textPrimary, fontSize: FONTS.size.md, fontWeight: '800' },
  dayCanChi: { color: COLORS.textSecondary, fontSize: FONTS.size.sm },
  dayReasonHead: { color: COLORS.textMuted, fontSize: FONTS.size.xs, marginTop: 4, fontWeight: '700' },
  dayReason: { color: COLORS.textPrimary, fontSize: FONTS.size.sm, marginLeft: 4 },
  dayDetail: { color: COLORS.textPrimary, fontSize: FONTS.size.sm, marginTop: 2 },
  bold: { fontWeight: '700', color: COLORS.gold },

  note: { color: COLORS.textMuted, fontSize: FONTS.size.xs, fontStyle: 'italic', marginTop: SPACING.sm },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    maxHeight: '75%', paddingBottom: SPACING.md,
  },
  modalHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalTitle: { color: COLORS.gold, fontSize: FONTS.size.lg, fontWeight: '800' },
  modalClose: { color: COLORS.textPrimary, fontSize: 22, padding: 4 },
  modalItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalItemActive: { backgroundColor: COLORS.surface },
  modalItemText: { color: COLORS.textPrimary, fontSize: FONTS.size.md },
  modalItemTextActive: { color: COLORS.gold, fontWeight: '800' },
  modalCheck: { color: COLORS.gold, fontSize: FONTS.size.lg, fontWeight: '800' },
});
