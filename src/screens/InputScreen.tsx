import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Switch, Alert, ActivityIndicator, Modal,
  KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, BirthInfo, AstrologyResult, Gender, CalendarType } from '../types';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { t } from '../i18n';
import { buildResult } from '../core/buildResult';
import { saveChart } from '../lib/charts';
import ScreenHeader from '../components/ScreenHeader';
import PlacePicker from '../components/PlacePicker';
import { savePlaceForChart, type Place } from '../lib/weather';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = NativeStackScreenProps<RootStackParamList, 'Input'>;

const HOUR_OPTIONS = [
  { label: '23:00 - 00:59 (Tý)', value: 0 },
  { label: '01:00 - 02:59 (Sửu)', value: 2 },
  { label: '03:00 - 04:59 (Dần)', value: 4 },
  { label: '05:00 - 06:59 (Mão)', value: 6 },
  { label: '07:00 - 08:59 (Thìn)', value: 8 },
  { label: '09:00 - 10:59 (Tị)', value: 10 },
  { label: '11:00 - 12:59 (Ngọ)', value: 12 },
  { label: '13:00 - 14:59 (Mùi)', value: 14 },
  { label: '15:00 - 16:59 (Thân)', value: 16 },
  { label: '17:00 - 18:59 (Dậu)', value: 18 },
  { label: '19:00 - 20:59 (Tuất)', value: 20 },
  { label: '21:00 - 22:59 (Hợi)', value: 22 },
];

export default function InputScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('nam');
  const [calendarType, setCalendarType] = useState<CalendarType>('solar');
  const [year, setYear] = useState('1990');
  const [month, setMonth] = useState('1');
  const [day, setDay] = useState('1');
  const [hour, setHour] = useState(12);
  const [isLeapMonth, setIsLeapMonth] = useState(false);
  const [loading, setLoading] = useState(false);
  const [place, setPlace] = useState<Place | null>(null);
  const [pickerOpen, setPickerOpen] = useState<null | 'day' | 'month' | 'year' | 'viewingYear'>(null);

  const currentYear = new Date().getFullYear();
  const [viewingYear, setViewingYear] = useState(String(currentYear));
  const dayOptions = Array.from({ length: 31 }, (_, i) => i + 1);
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  const yearOptions = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => currentYear - i);
  // Năm xem: 1900 → currentYear + 100, sort giảm dần (mới nhất ở đầu)
  const viewingYearOptions = Array.from({ length: (currentYear + 100) - 1900 + 1 }, (_, i) => (currentYear + 100) - i);
  const [viewingYearSearch, setViewingYearSearch] = useState('');
  const [yearSearch, setYearSearch] = useState('');
  const pickerListRef = useRef<ScrollView>(null);
  const PICKER_ROW_HEIGHT = 52;

  // Mở picker: LUÔN ẩn bàn phím trước (tránh bàn phím từ ô Họ tên / tìm Năm xem còn hiện).
  const openPicker = (which: 'day' | 'month' | 'year' | 'viewingYear') => {
    Keyboard.dismiss();
    if (which === 'viewingYear') setViewingYearSearch('');
    if (which === 'year') setYearSearch('');
    setPickerOpen(which);
  };

  // Danh sách hiện tại của picker đang mở (áp dụng lọc tìm kiếm nếu có).
  const pickerItems: number[] =
    pickerOpen === 'day' ? dayOptions
    : pickerOpen === 'month' ? monthOptions
    : pickerOpen === 'year'
      ? (yearSearch ? yearOptions.filter(y => String(y).includes(yearSearch.trim())) : yearOptions)
    : pickerOpen === 'viewingYear'
      ? (viewingYearSearch ? viewingYearOptions.filter(y => String(y).includes(viewingYearSearch.trim())) : viewingYearOptions)
    : [];

  // Cuộn tới mục đang chọn khi vừa mở picker. Dùng ScrollView.scrollTo (thay vì
  // FlatList initialScrollIndex) vì trên web, initialScrollIndex kết hợp với
  // windowing của FlatList hay để trống (blank) phần nội dung phía trên vị trí
  // cuộn tới — ScrollView cuộn thật (scrollTop) không bị lỗi này, và danh sách
  // tối đa ~230 dòng nên không cần ảo hoá (virtualization) vẫn mượt.
  useEffect(() => {
    if (!pickerOpen) return;
    const current = pickerOpen === 'day' ? day
      : pickerOpen === 'month' ? month
      : pickerOpen === 'viewingYear' ? viewingYear
      : year;
    const idx = pickerItems.findIndex(it => String(it) === current);
    if (idx < 0) return;
    const t = setTimeout(() => {
      const y = Math.max(0, idx * PICKER_ROW_HEIGHT - PICKER_ROW_HEIGHT * 2);
      pickerListRef.current?.scrollTo({ y, animated: false });
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickerOpen]);

  async function handleCalculate() {
    if (!name.trim()) { Alert.alert('Lỗi', 'Vui lòng nhập họ và tên'); return; }
    const y = parseInt(year); const m = parseInt(month); const d = parseInt(day);
    if (!y || !m || !d || m < 1 || m > 12 || d < 1 || d > 31) {
      Alert.alert('Lỗi', 'Ngày sinh không hợp lệ');
      return;
    }

    setLoading(true);
    try {
      // Web: SecureStore không hỗ trợ → bọc try/catch để KHÔNG vỡ luồng lập lá số.
      // (Trên web dùng AI key phía server; key client chỉ dùng cho native.)
      let apiKey = '', oaiKey = '';
      try { apiKey = (await SecureStore.getItemAsync('anthropicApiKey')) ?? ''; } catch {}
      try { oaiKey = (await SecureStore.getItemAsync('openaiApiKey')) ?? ''; } catch {}
      const aiProv = (await AsyncStorage.getItem('aiProvider') ?? 'auto') as 'auto' | 'claude' | 'openai';
      const birthInfo: BirthInfo = {
        name: name.trim(), gender, birthplace: place?.name ?? '',
        calendarType, year: y, month: m, day: d,
        hour, minute: 0, isLeapMonth,
        language: 'vi',
        anthropicApiKey: apiKey || undefined,
        openaiApiKey: oaiKey || undefined,
        aiProvider: aiProv,
        viewingYear: parseInt(viewingYear) || undefined,
      };

      const result = buildResult(birthInfo, birthInfo.viewingYear);

      // Đăng nhập rồi → lưu lá số lên server (đọc lại sau không phải nhập lại).
      try {
        const id = await saveChart(result);
        if (id) result.birthInfo.chartId = id;
      } catch {}
      // Nơi ở/nơi sinh → dùng lấy thời tiết khi gắn lá số này (lưu cục bộ theo chartId).
      if (place) await savePlaceForChart(result.birthInfo.chartId, place);

      navigation.navigate('MainTabs', { result });
    } catch (e: any) {
      Alert.alert('Lỗi tính toán', e?.message ?? 'Không thể tính lá số. Vui lòng kiểm tra thông tin nhập.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title={t('inputTitle')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Name */}
        <Section title="👤 Họ và tên">
          <TextInput
            style={styles.input} value={name} onChangeText={setName}
            placeholder={t('namePlaceholder')} placeholderTextColor={COLORS.textMuted}
          />
        </Section>

        {/* Gender */}
        <Section title="⚥ Giới tính">
          <Row>
            {(['nam', 'nu'] as Gender[]).map(g => (
              <TouchableOpacity
                key={g} style={[styles.choice, gender === g && styles.choiceActive]}
                onPress={() => setGender(g)}
              >
                <Text style={[styles.choiceText, gender === g && styles.choiceTextActive]}>
                  {g === 'nam' ? '♂ Nam' : '♀ Nữ'}
                </Text>
              </TouchableOpacity>
            ))}
          </Row>
        </Section>


        {/* Năm xem — đặt phía trên Loại lịch */}
        <Section title="🔭 Năm xem">
          <TouchableOpacity
            style={[styles.input, styles.pickerBtn]}
            onPress={() => openPicker('viewingYear')}
          >
            <Text style={styles.pickerBtnText}>{viewingYear}</Text>
            <Text style={styles.pickerArrow}>▾</Text>
          </TouchableOpacity>
        </Section>

        {/* Calendar type */}
        <Section title="📅 Loại lịch">
          <Row>
            {(['solar', 'lunar'] as CalendarType[]).map(c => (
              <TouchableOpacity
                key={c} style={[styles.choice, calendarType === c && styles.choiceActive]}
                onPress={() => setCalendarType(c)}
              >
                <Text style={[styles.choiceText, calendarType === c && styles.choiceTextActive]}>
                  {c === 'solar' ? '☀ Dương lịch' : '🌙 Âm lịch'}
                </Text>
              </TouchableOpacity>
            ))}
          </Row>
        </Section>

        {/* Date — scroll picker thay vì TextInput số */}
        <Section title="🗓 Ngày sinh">
          <Row>
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>Ngày</Text>
              <TouchableOpacity
                style={[styles.input, styles.pickerBtn, styles.dateInput]}
                onPress={() => openPicker('day')}
              >
                <Text style={styles.pickerBtnText}>{day}</Text>
                <Text style={styles.pickerArrow}>▾</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>Tháng</Text>
              <TouchableOpacity
                style={[styles.input, styles.pickerBtn, styles.dateInput]}
                onPress={() => openPicker('month')}
              >
                <Text style={styles.pickerBtnText}>{month}</Text>
                <Text style={styles.pickerArrow}>▾</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.dateField, { flex: 1.5 }]}>
              <Text style={styles.dateLabel}>Năm</Text>
              <TouchableOpacity
                style={[styles.input, styles.pickerBtn, styles.dateInput]}
                onPress={() => openPicker('year')}
              >
                <Text style={styles.pickerBtnText}>{year}</Text>
                <Text style={styles.pickerArrow}>▾</Text>
              </TouchableOpacity>
            </View>
          </Row>
          {calendarType === 'lunar' && (
            <Row style={{ marginTop: SPACING.sm }}>
              <Text style={styles.label}>Tháng nhuận</Text>
              <Switch
                value={isLeapMonth} onValueChange={setIsLeapMonth}
                trackColor={{ true: COLORS.gold }} thumbColor={COLORS.textPrimary}
              />
            </Row>
          )}
        </Section>

        {/* Birth hour */}
        <Section title="⏰ Giờ sinh">
          <View style={styles.hourGrid}>
            {HOUR_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.hourChip, hour === opt.value && styles.hourChipActive]}
                onPress={() => setHour(opt.value)}
              >
                <Text style={[styles.hourChipText, hour === opt.value && styles.hourChipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        {/* Nơi ở / nơi sinh — căn cứ lấy thời tiết */}
        <Section title="📍 Nơi ở / nơi sinh">
          <PlacePicker value={place} onChange={setPlace} />
        </Section>

        {/* Calculate button */}
        <TouchableOpacity
          style={[styles.calcBtn, loading && styles.calcBtnDisabled]}
          onPress={handleCalculate} disabled={loading}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color="#1a0a00" />
            : <Text style={styles.calcBtnText}>☯  {t('calculate')}</Text>
          }
        </TouchableOpacity>
      </ScrollView>

      {/* Date picker modal — dùng chung cho day / month / year */}
      <Modal
        visible={pickerOpen !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerOpen(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {pickerOpen === 'day' ? 'Chọn ngày'
                  : pickerOpen === 'month' ? 'Chọn tháng'
                  : pickerOpen === 'viewingYear' ? 'Chọn năm xem'
                  : 'Chọn năm sinh'}
              </Text>
              <TouchableOpacity onPress={() => setPickerOpen(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {pickerOpen === 'viewingYear' && (
              <TextInput
                style={[styles.input, { marginHorizontal: SPACING.md, marginBottom: SPACING.sm }]}
                value={viewingYearSearch}
                onChangeText={(text) => {
                  setViewingYearSearch(text);
                  // Cho phép user tự nhập năm: nếu là số 4 chữ số → set ngay
                  const n = parseInt(text, 10);
                  if (!isNaN(n) && text.length === 4 && n >= 1800 && n <= 2200) {
                    setViewingYear(String(n));
                  }
                }}
                placeholder="Nhập năm (vd 2026)..."
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                maxLength={4}
              />
            )}
            {pickerOpen === 'year' && (
              <TextInput
                style={[styles.input, { marginHorizontal: SPACING.md, marginBottom: SPACING.sm }]}
                value={yearSearch}
                onChangeText={(text) => {
                  setYearSearch(text);
                  // Cho phép user tự nhập năm: nếu là số 4 chữ số → set ngay
                  const n = parseInt(text, 10);
                  if (!isNaN(n) && text.length === 4 && n >= 1900 && n <= currentYear) {
                    setYear(String(n));
                  }
                }}
                placeholder="Nhập năm sinh (vd 1990)..."
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                maxLength={4}
              />
            )}
            {/* Dùng ScrollView thay FlatList: danh sách tối đa ~230 dòng, không cần ảo
                hoá — tránh lỗi "khoảng trắng phía trên vị trí cuộn tới" của FlatList
                initialScrollIndex trên bản web (xem ghi chú tại pickerListRef). */}
            <ScrollView
              ref={pickerListRef}
              keyboardShouldPersistTaps="handled"
              style={styles.pickerList}
            >
              {pickerItems.map((item) => {
                const current = pickerOpen === 'day' ? day
                  : pickerOpen === 'month' ? month
                  : pickerOpen === 'viewingYear' ? viewingYear
                  : year;
                const isActive = String(item) === current;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.provinceItem, isActive && styles.provinceItemActive]}
                    onPress={() => {
                      const v = String(item);
                      if (pickerOpen === 'day') setDay(v);
                      else if (pickerOpen === 'month') setMonth(v);
                      else if (pickerOpen === 'year') setYear(v);
                      else if (pickerOpen === 'viewingYear') setViewingYear(v);
                      setPickerOpen(null);
                      // Sau khi chọn xong → đóng luôn bàn phím (nếu đang mở do ô tìm kiếm)
                      // để người dùng dễ thao tác các nút bên dưới (Tính lá số).
                      Keyboard.dismiss();
                    }}
                  >
                    <Text style={[styles.provinceText, isActive && styles.provinceTextActive]}>
                      {item}
                    </Text>
                    {isActive && <Text style={styles.provinceCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[{ flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },
  section: {
    backgroundColor: COLORS.card, borderRadius: 12,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  sectionTitle: { color: COLORS.gold, fontSize: FONTS.size.md, fontWeight: '700', marginBottom: SPACING.sm },
  input: {
    backgroundColor: COLORS.surface, color: COLORS.textPrimary,
    borderRadius: 8, padding: SPACING.md, fontSize: FONTS.size.lg,
    borderWidth: 1, borderColor: COLORS.border,
  },
  label: { color: COLORS.textSecondary, fontSize: FONTS.size.md },
  choice: {
    flex: 1, padding: SPACING.md, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  choiceActive: { backgroundColor: COLORS.gold + '33', borderColor: COLORS.gold },
  choiceText: { color: COLORS.textSecondary, fontSize: FONTS.size.md },
  choiceTextActive: { color: COLORS.gold, fontWeight: '600' },
  dateField: { flex: 1 },
  dateLabel: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, marginBottom: 4 },
  dateInput: { justifyContent: 'center' },
  hourGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  hourChip: {
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md,
    borderRadius: 6, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  hourChipActive: { backgroundColor: COLORS.gold + '22', borderColor: COLORS.gold },
  hourChipText: { color: COLORS.textSecondary, fontSize: FONTS.size.sm },
  hourChipTextActive: { color: COLORS.gold, fontWeight: '600' },
  calcBtn: {
    backgroundColor: COLORS.gold, borderRadius: 16,
    padding: SPACING.lg, alignItems: 'center', marginTop: SPACING.md,
  },
  calcBtnDisabled: { opacity: 0.7 },
  calcBtnText: { fontSize: FONTS.size.xl, fontWeight: 'bold', color: '#1a0a00' },

  // Province picker
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerBtnText: { color: COLORS.textPrimary, fontSize: FONTS.size.md },
  pickerArrow: { color: COLORS.gold, fontSize: 16, fontWeight: '700' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    paddingTop: SPACING.md, paddingBottom: SPACING.lg,
    maxHeight: '80%',
    borderWidth: 1, borderColor: COLORS.gold,
  },
  pickerList: { maxHeight: 420 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  modalTitle: { color: COLORS.gold, fontSize: FONTS.size.lg, fontWeight: '700' },
  modalClose: { color: COLORS.textPrimary, fontSize: 22, fontWeight: '700', paddingHorizontal: SPACING.sm },
  provinceItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg,
    borderBottomWidth: 0.5, borderBottomColor: COLORS.border,
  },
  provinceItemActive: { backgroundColor: COLORS.gold + '22' },
  provinceText: { color: COLORS.textPrimary, fontSize: FONTS.size.md },
  provinceTextActive: { color: COLORS.gold, fontWeight: '700' },
  provinceCheck: { color: COLORS.gold, fontSize: 18, fontWeight: '700' },
});
