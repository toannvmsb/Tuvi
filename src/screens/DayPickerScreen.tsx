/**
 * Màn hình "Xem ngày để xuất hành" — người dùng chọn 1 việc + khoảng ngày,
 * app trả top 3 ngày phù hợp nhất kèm lý do / khung giờ / hướng / màu mặc.
 */
import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, FlatList, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import ScreenHeader from '../components/ScreenHeader';
import ChartSwitchLine from '../components/ChartSwitchLine';
import MedDisclaimer from '../components/MedDisclaimer';
import { DAY_PICK_GROUPS, NUMBER_GROUP_CODE, type DayPickGroup, type DayPickTask } from '../data/dayPickTasks';
import { pickGoodDays, pickGoodDaysGeneric, type DayPickOutput } from '../core/dayPicker';
import { analyzeNumber, minDigitsFor, NUMBER_PURPOSES, type NumberAnalysis } from '../core/numberAnalysis';
import { promptPersonalize } from '../lib/personalizePrompt';
import { useWeather, dayForecast } from '../lib/weather';
import { WeatherForDate } from '../components/WeatherCards';

type Props = NativeStackScreenProps<RootStackParamList, 'DayPicker'>;

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const YEARS_NOW = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => YEARS_NOW + i);  // năm nay + 5 năm tới

function daysInMonth(m: number, y: number): number {
  return new Date(y, m, 0).getDate();
}

export default function DayPickerScreen({ route, navigation }: Props) {
  const { result } = route.params ?? {};
  // Chế độ cơ bản (chưa gắn lá số): ẩn nhóm "Xem số hợp mệnh" — vốn cần Bát Tự
  // để so số với mệnh, không có bản chung tương đương.
  const groupOptions = result ? DAY_PICK_GROUPS : DAY_PICK_GROUPS.filter(g => g.code !== NUMBER_GROUP_CODE);

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
  type ModalType = null | 'group' | 'task' | 'fromD' | 'fromM' | 'fromY' | 'toD' | 'toM' | 'toY' | 'purpose';
  const [modal, setModal] = useState<ModalType>(null);

  const [output, setOutput] = useState<DayPickOutput | null>(null);

  // Thời tiết cho các ngày gợi ý (Open-Meteo, dự báo 16 ngày tới, theo nơi ở của lá số "của tôi").
  const { weather, loading: weatherLoading } = useWeather();

  // ── Chế độ "Xem số hợp mệnh" ──
  const isNumberMode = group?.code === NUMBER_GROUP_CODE;
  const [numberInput, setNumberInput] = useState('');
  const [purpose, setPurpose] = useState<{ code: string; name: string }>(NUMBER_PURPOSES[0]);
  const [numberOut, setNumberOut] = useState<NumberAnalysis | null>(null);

  const canRun = !!task;
  const numDigitCount = numberInput.match(/\d/g)?.length ?? 0;
  const minDigits = task ? minDigitsFor(task.code) : 0;
  const canRunNumber = !!task && numDigitCount >= minDigits;

  const run = () => {
    if (!task) return;
    const fromD = new Date(from.y, from.m - 1, from.d);
    const toD = new Date(to.y, to.m - 1, to.d);
    setOutput(result ? pickGoodDays(result, task.code, fromD, toD) : pickGoodDaysGeneric(task.code, fromD, toD));
  };

  const runNumber = () => {
    if (!task || !result) return; // "Xem số hợp mệnh" cần lá số, đã ẩn nhóm này ở chế độ cơ bản
    setNumberOut(analyzeNumber(result, numberInput, task.code, purpose.code));
  };

  const fromDays = useMemo(() => Array.from({ length: daysInMonth(from.m, from.y) }, (_, i) => i + 1), [from.m, from.y]);
  const toDays = useMemo(() => Array.from({ length: daysInMonth(to.m, to.y) }, (_, i) => i + 1), [to.m, to.y]);

  const closeModal = () => setModal(null);

  const renderModal = () => {
    if (!modal) return null;
    let title = '', data: any[] = [], current: any = null, onPick: (v: any) => void = () => {};
    if (modal === 'group') {
      title = 'Chọn nhóm việc'; data = groupOptions; current = group?.code;
      // Đổi nhóm → reset việc & mọi kết quả (giao diện cũ hiện lại khi chọn nhóm khác).
      onPick = (g: DayPickGroup) => { setGroup(g); setTask(null); setOutput(null); setNumberOut(null); closeModal(); };
    } else if (modal === 'task' && group) {
      title = `Chọn việc — ${group.name}`; data = group.tasks; current = task?.code;
      onPick = (t: DayPickTask) => { setTask(t); setNumberOut(null); closeModal(); };
    } else if (modal === 'purpose') {
      title = 'Chọn mục đích xem số'; data = NUMBER_PURPOSES; current = purpose.code;
      onPick = (p: { code: string; name: string }) => { setPurpose(p); closeModal(); };
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
      <ScreenHeader title="Xem ngày tốt cho sự kiện" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Hàng giới thiệu: lá số đang xem, hoặc báo chế độ cơ bản nếu chưa gắn lá số */}
        <ChartSwitchLine
          replaceScreen
          currentId={result?.birthInfo.chartId}
          text={result ? `Xem ngày tốt cho ${result.birthInfo.name || '(không tên)'}` : 'Xem ngày tốt (chế độ cơ bản — chưa gắn lá số)'}
          textStyle={styles.chartFor}
        />

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

        {!isNumberMode && (
        <>
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

        {/* Output ngày */}
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
                <Text style={styles.topLabel}>🏆 Tối đa 5 ngày phù hợp nhất (ưu tiên từ cao xuống thấp):</Text>
                {output.top.map((d, i) => {
                  const medal = ['🥇', '🥈', '🥉'][i] || '✦';
                  return (
                    <View key={d.dateLabel} style={styles.dayItem}>
                      <Text style={styles.dayHead}>{medal}  {d.dateLabel}</Text>
                      <Text style={styles.dayLunar}>{d.lunarLabel}</Text>
                      <Text style={styles.dayCanChi}>{d.canChiLabel}  ·  <Text style={{ color: COLORS.gold }}>{d.rating}</Text>  ·  <Text style={{ color: COLORS.gold, fontWeight: '800' }}>{d.score100}/100</Text></Text>

                      {/* Thời tiết của ngày (chỉ có khi ngày nằm trong 16 ngày dự báo) */}
                      {dayForecast(weather, d.date) ? (
                        <WeatherForDate date={d.date} weather={weather} />
                      ) : (!weatherLoading && (
                        <Text style={styles.weatherNote}>
                          🌤️ {weather ? 'Chưa có dự báo thời tiết cho ngày này (chỉ dự báo được trong 16 ngày tới).' : 'Chưa tải được dự báo thời tiết.'}
                        </Text>
                      ))}

                      {/* Trực · Lục Diệu · Hoàng/Hắc Đạo · 28 Tú */}
                      <View style={styles.chipRow}>
                        <View style={styles.chipSmall}><Text style={styles.chipSmallTxt}>Trực {d.truc}</Text></View>
                        <View style={styles.chipSmall}><Text style={styles.chipSmallTxt}>{d.lucDieu}</Text></View>
                        <View style={[styles.chipSmall, d.hoangDao ? styles.chipGreen : styles.chipGray]}>
                          <Text style={[styles.chipSmallTxt, d.hoangDao ? { color: '#86efac' } : {}]}>
                            {d.hoangDao ? '☀ Hoàng Đạo' : '🌑 Hắc Đạo'}
                          </Text>
                        </View>
                        <View style={styles.chipSmall}><Text style={styles.chipSmallTxt}>Tú {d.nhi28Tu}</Text></View>
                      </View>

                      {/* Cảnh báo */}
                      {d.warnings.filter(w => !w.includes('Tam Tai') && !w.includes('Kim Lâu')).map((w, wi) => (
                        <Text key={wi} style={styles.dayWarning}>{w}</Text>
                      ))}

                      <Text style={styles.dayReasonHead}>Phân tích:</Text>
                      {d.reasons.slice(0, 3).map((r, ri) => <Text key={ri} style={styles.dayReason}>• {r}</Text>)}
                      {d.bestHours.length > 0 && (
                        <Text style={styles.dayDetail}>
                          🕒 <Text style={styles.bold}>Giờ tốt cho lá số:</Text>{' '}
                          {d.bestHours.map(h => `${h.branch} (${h.range})`).join(' · ')}
                        </Text>
                      )}
                      {d.generalHours.length > 0 && (
                        <Text style={styles.dayDetail}>
                          🕓 <Text style={styles.bold}>Giờ Hoàng Đạo:</Text>{' '}
                          {d.generalHours.map(h => `${h.branch} (${h.range})`).join(' · ')}
                        </Text>
                      )}
                      {d.direction && <Text style={styles.dayDetail}>🧭 <Text style={styles.bold}>Hướng:</Text> {d.direction}</Text>}
                      {d.goodColor && <Text style={styles.dayDetail}>👕 <Text style={styles.bold}>Màu:</Text> {d.goodColor}{d.avoidColor ? ` · tránh ${d.avoidColor}` : ''}</Text>}
                    </View>
                  );
                })}
              </>
            )}
          </View>
        )}
        </>
        )}

        {/* ── CHẾ ĐỘ XEM SỐ HỢP MỆNH ── */}
        {isNumberMode && (
        <>
          <View style={styles.card}>
            <Text style={styles.label}>Bước 2 — Nhập số cần xem</Text>
            <View style={styles.row2}>
              <TextInput
                style={[styles.numInput, { flex: 1 }]}
                value={numberInput}
                onChangeText={setNumberInput}
                placeholder={task ? 'Nhập số…' : 'Chọn loại số trước'}
                placeholderTextColor={COLORS.textMuted}
                keyboardType="number-pad"
                editable={!!task}
              />
              <TouchableOpacity
                style={[styles.dropdown, { flex: 1, minHeight: 52 }]}
                onPress={() => setModal('purpose')}
                activeOpacity={0.85}
              >
                <Text style={styles.dropdownLabel}>Mục đích xem số</Text>
                <Text style={styles.dropdownValue} numberOfLines={1}>{purpose.name} ▾</Text>
              </TouchableOpacity>
            </View>
            {task && (
              <Text style={styles.numHint}>
                {task.name}: tối thiểu {minDigits} chữ số
                {numDigitCount > 0 ? ` · đã nhập ${numDigitCount}` : ''}
                {numDigitCount > 0 && numDigitCount < minDigits ? ' (chưa đủ)' : ''}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.runBtn, !canRunNumber && styles.runBtnDisabled]}
            onPress={runNumber}
            disabled={!canRunNumber}
            activeOpacity={0.85}
          >
            <Text style={styles.runBtnTxt}>🔮  Luận số theo mệnh</Text>
          </TouchableOpacity>

          {numberOut && (
            <View style={styles.outputCard}>
              <Text style={styles.outputHead}>
                {numberOut.typeName} · <Text style={{ color: COLORS.gold, fontWeight: '800' }}>{numberOut.digits}</Text>
              </Text>
              <Text style={styles.scoreBig}>
                {numberOut.total}<Text style={styles.scoreMax}>/100</Text>
                {'   '}<Text style={{ color: COLORS.gold }}>{numberOut.rating}</Text>
              </Text>
              <Text style={styles.outputMeta}>
                Mục đích: {numberOut.purposeName} · Hành chủ đạo: {numberOut.chuDao} · Đuôi số: {numberOut.duoiEl} ·
                Âm/Dương: {numberOut.amCount}/{numberOut.duongCount} · Tổng nút: {numberOut.tongNut}
              </Text>

              <Text style={styles.numBreak}>
                Hợp Bát Tự {numberOut.breakdown.batTu}/40 · Cân bằng {numberOut.breakdown.canBang}/20 ·
                Ý nghĩa số {numberOut.breakdown.yNghia}/20 · Hợp mục đích {numberOut.breakdown.mucDich}/20
              </Text>

              <Text style={styles.numSectionHead}>Kết luận</Text>
              <Text style={styles.dayReason}>{numberOut.ketLuan}</Text>

              <Text style={styles.numSectionHead}>✦ Điểm mạnh</Text>
              {numberOut.diemManh.map((s, i) => <Text key={`m${i}`} style={styles.dayReason}>• {s}</Text>)}

              <Text style={[styles.numSectionHead, { color: '#e0a23a' }]}>⚠ Điểm cần lưu ý</Text>
              {numberOut.diemLuuY.map((s, i) => <Text key={`l${i}`} style={styles.dayReason}>• {s}</Text>)}

              <Text style={styles.numSectionHead}>💡 Gợi ý</Text>
              <Text style={styles.dayReason}>{numberOut.goiY}</Text>
            </View>
          )}

          <Text style={styles.note}>
            _Luận theo 3 tầng: số tự thân có đẹp không · có hợp Bát Tự của bạn không · có hợp mục đích sử dụng không.
            Quy đổi ngũ hành: 0,1→Thủy · 2,5,8→Thổ · 3,4→Mộc · 6,7→Kim · 9→Hỏa. Kết quả mang tính tham khảo._
          </Text>
        </>
        )}

        {!isNumberMode && (
        <Text style={styles.note}>
          {result
            ? '_Logic dựa trên lá số của bạn (Dụng/Kỵ thần Bát Tự + hợp/xung tuổi) kết hợp tính chất từng việc. ' +
              '• "Khung giờ tốt cho lá số" hợp riêng với mệnh của bạn. • "Khung giờ tốt nói chung" là giờ ' +
              'hoàng đạo của ngày theo phong thủy (dùng khi giờ hợp lá số rơi vào lúc bất tiện). ' +
              'Kết quả mang tính tham khảo._'
            : '_Chế độ cơ bản — chưa gắn lá số nên chỉ xét Trực/Lục Diệu/Hoàng Đạo/28 Tú theo lịch chung, ' +
              'không có Dụng/Kỵ thần hay xung/hợp tuổi riêng của bạn. Kết quả mang tính tham khảo._'}
        </Text>
        )}

        {!result && (
          <TouchableOpacity style={styles.personalizeBtn} onPress={() => promptPersonalize(navigation)} activeOpacity={0.85}>
            <Text style={styles.personalizeBtnTxt}>✨ Cá nhân hóa để xem đầy đủ (Dụng/Kỵ thần, xung/hợp tuổi…)</Text>
          </TouchableOpacity>
        )}

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
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: SPACING.md,
    borderWidth: 1, borderColor: 'rgba(226,194,133,0.18)', gap: SPACING.sm,
  },
  label: { color: COLORS.gold, fontSize: 11, fontFamily: FONTS.bodySemi, letterSpacing: 1.6, textTransform: 'uppercase' },
  row2: { flexDirection: 'row', gap: SPACING.sm },
  row3: { flexDirection: 'row', gap: 8 },
  dropdown: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(226,194,133,0.28)', padding: SPACING.sm,
    minHeight: 56, justifyContent: 'center',
  },
  dropdownDisabled: { opacity: 0.5 },
  dropdownLabel: { color: COLORS.goldLight, fontSize: FONTS.size.sm, fontWeight: '700', marginBottom: 4 },
  dropdownValue: { color: COLORS.textPrimary, fontSize: FONTS.size.sm, fontWeight: '700' },
  dateLabel: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, marginTop: 4 },
  dateBtn: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, minHeight: 48, justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(226,194,133,0.28)', paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  dateBtnTxt: { color: COLORS.textPrimary, fontSize: FONTS.size.md, fontWeight: '700' },
  runBtn: {
    backgroundColor: COLORS.gold, borderRadius: 16, minHeight: 54, justifyContent: 'center', paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  runBtnDisabled: { opacity: 0.4 },
  runBtnTxt: { color: '#1a0a00', fontSize: FONTS.size.md, fontWeight: '800' },
  personalizeBtn: {
    backgroundColor: COLORS.purple, borderRadius: 10, paddingVertical: SPACING.sm,
    alignItems: 'center', marginTop: SPACING.xs,
  },
  personalizeBtnTxt: { color: '#fff', fontSize: FONTS.size.sm, fontWeight: '800', textAlign: 'center' },

  outputCard: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.gold,
  },
  outputHead: { color: COLORS.textPrimary, fontSize: FONTS.size.md, fontWeight: '700', marginBottom: 4 },
  outputMeta: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, marginBottom: SPACING.sm, textAlign: 'justify' },
  warning: { color: '#e0a23a', fontSize: FONTS.size.sm, marginBottom: SPACING.sm, fontStyle: 'italic' },

  topLabel: { color: COLORS.gold, fontSize: FONTS.size.md, fontWeight: '800', marginTop: SPACING.sm, marginBottom: SPACING.xs },
  dayItem: {
    backgroundColor: COLORS.surface, borderRadius: 10, padding: SPACING.sm,
    marginTop: SPACING.sm, borderLeftWidth: 3, borderLeftColor: COLORS.gold, gap: 4,
  },
  dayHead: { color: COLORS.textPrimary, fontSize: FONTS.size.md, fontWeight: '800' },
  dayLunar: { color: COLORS.textSecondary, fontSize: FONTS.size.xs, fontStyle: 'italic' },
  dayCanChi: { color: COLORS.textSecondary, fontSize: FONTS.size.sm },
  dayReasonHead: { color: COLORS.textMuted, fontSize: FONTS.size.xs, marginTop: 4, fontWeight: '700' },
  dayReason: { color: COLORS.textPrimary, fontSize: FONTS.size.sm, marginLeft: 4, textAlign: 'justify' },
  dayDetail: { color: COLORS.textPrimary, fontSize: FONTS.size.sm, marginTop: 2 },
  bold: { fontWeight: '700', color: COLORS.gold },

  note: { color: COLORS.textMuted, fontSize: FONTS.size.xs, fontStyle: 'italic', marginTop: SPACING.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  chipSmall: { borderWidth: 1, borderColor: '#475569', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  chipSmallTxt: { color: '#94a3b8', fontSize: 10, fontWeight: '700' },
  chipGreen: { borderColor: '#22c55e' },
  chipGray: { borderColor: '#475569' },
  dayWarning: { color: '#fca5a5', fontSize: FONTS.size.xs, fontWeight: '700', marginTop: 2 },
  weatherNote: { color: COLORS.textMuted, fontSize: FONTS.size.xs, fontStyle: 'italic', marginTop: 2 },

  // Chế độ xem số
  numInput: {
    backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, color: COLORS.textPrimary,
    fontSize: FONTS.size.lg, fontWeight: '800', letterSpacing: 2,
  },
  numHint: { color: COLORS.textMuted, fontSize: FONTS.size.xs, fontStyle: 'italic', marginTop: 2 },
  scoreBig: { color: COLORS.textPrimary, fontSize: 30, fontWeight: '900', marginVertical: 2 },
  scoreMax: { color: COLORS.textSecondary, fontSize: FONTS.size.md, fontWeight: '700' },
  numBreak: { color: COLORS.textSecondary, fontSize: FONTS.size.xs, marginBottom: SPACING.xs, marginTop: 2, textAlign: 'justify' },
  numSectionHead: { color: COLORS.gold, fontSize: FONTS.size.sm, fontWeight: '800', marginTop: SPACING.sm, marginBottom: 2 },

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
