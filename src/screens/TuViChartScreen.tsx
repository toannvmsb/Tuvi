import React, { useState, useRef, useMemo } from 'react';
import {
  View, Text, ScrollView, Switch, StyleSheet, TouchableOpacity, Alert, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../types';
import TuViChart from '../components/TuViChart';
import ImageViewerModal from '../components/ImageViewerModal';
import ScreenHeader from '../components/ScreenHeader';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { t } from '../i18n';
import { exportChartAsImage, shareImageFile, saveImageToGallery } from '../utils/exportChart';
import { buildResult } from '../core/buildResult';

type Props = BottomTabScreenProps<MainTabParamList, 'TuViChart'>;

export default function TuViChartScreen({ route, navigation }: Props) {
  const { result } = route.params;
  const { tuViChart: chart, birthInfo } = result;
  const [showLuuTieuVan, setShowLuuTieuVan] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const chartRef = useRef<View>(null);

  // NĂM XEM — chỉ ảnh hưởng PHÂN TÍCH TOÀN BỘ LÁ SỐ (đổi sao lưu của năm).
  // Các tab khác (Bát Tự, Đại/Tiểu/Nguyệt Vận, Xem theo ngày) KHÔNG bị ảnh hưởng.
  const currentYear = new Date().getFullYear();
  const [viewYear, setViewYear] = useState<number>(chart.viewingYear ?? currentYear);
  const [yearOpen, setYearOpen] = useState(false);
  const yearOptions = useMemo(
    () => Array.from({ length: (currentYear + 10) - 1950 + 1 }, (_, i) => (currentYear + 10) - i),
    [currentYear],
  );
  // Lá số dựng lại theo NĂM XEM đã chọn (chỉ dùng cho màn Phân tích toàn lá số).
  const fullChartResult = useMemo(
    () => (viewYear === (chart.viewingYear ?? currentYear) ? result : buildResult({ ...birthInfo, viewingYear: viewYear }, viewYear)),
    [viewYear],
  );

  const handleExport = async () => {
    setExporting(true);
    try {
      const r = await exportChartAsImage(chartRef, `laso-${birthInfo.name || 'tuvi'}.png`);
      setViewerUri(r.uri);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || String(e));
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    if (!viewerUri) return;
    try {
      await shareImageFile(viewerUri);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || String(e));
    }
  };

  const handleSave = async () => {
    if (!viewerUri) return;
    try {
      await saveImageToGallery(viewerUri);
      Alert.alert('Đã lưu', 'Ảnh lá số đã được lưu vào Thư viện ảnh.');
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || String(e));
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader
        title="Lá Số"
        onBack={() => navigation.getParent()?.navigate('Home' as any)}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Toolbar */}
        <View style={styles.toolbar}>
          {/* Hàng đầu: Hiện Lưu Tiểu Vận (trái) · Năm xem (phải) */}
          <View style={styles.firstRow}>
            <ToggleSwitch
              label={t('showLuuTieuVan') || 'Lưu Tiểu Vận'}
              value={showLuuTieuVan}
              onToggle={() => setShowLuuTieuVan(v => !v)}
            />
            <TouchableOpacity style={styles.yearBtn} onPress={() => setYearOpen(true)} activeOpacity={0.8}>
              <Text style={styles.yearBtnText}>Năm xem: {viewYear} ▾</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.exportBtn, exporting && { opacity: 0.5 }]}
            onPress={handleExport}
            disabled={exporting}
          >
            <Text style={styles.exportBtnText}>
              {exporting ? '⏳ Đang xử lý...' : '🔍 Xem ảnh & phóng to lá số'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.aiChartBtn}
            onPress={() => navigation.getParent()?.navigate('FullChartAI', { result: fullChartResult })}
            activeOpacity={0.85}
          >
            <Text style={styles.aiChartBtnText}>🤖 Phân tích AI toàn lá số (PRO) · năm {viewYear}</Text>
          </TouchableOpacity>
        </View>

        {/* Modal chọn Năm xem */}
        <Modal visible={yearOpen} transparent animationType="fade" onRequestClose={() => setYearOpen(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setYearOpen(false)}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Chọn năm xem (cho phân tích toàn lá số)</Text>
              <FlatList
                data={yearOptions}
                keyExtractor={(y) => String(y)}
                style={{ maxHeight: 320 }}
                initialScrollIndex={Math.max(0, yearOptions.indexOf(viewYear))}
                getItemLayout={(_, i) => ({ length: 44, offset: 44 * i, index: i })}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.yearItem, item === viewYear && styles.yearItemActive]}
                    onPress={() => { setViewYear(item); setYearOpen(false); }}
                  >
                    <Text style={[styles.yearItemTxt, item === viewYear && styles.yearItemTxtActive]}>
                      {item}{item === currentYear ? ' (hiện tại)' : ''}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Chart — nhấn đúp vào 1 cung để xem chi tiết */}
        <Text style={styles.tapHint}>Mẹo: nhấn đúp vào một cung để xem chi tiết các sao</Text>
        <TuViChart
          ref={chartRef}
          chart={fullChartResult.tuViChart}
          birthInfo={fullChartResult.birthInfo}
          showLuuStars={showLuuTieuVan}
          onPalacePress={(branchIndex) =>
            navigation.getParent()?.navigate('PalaceDetail', { result: fullChartResult, branchIndex })
          }
        />

        {/* Legend — color by ngũ hành */}
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Chú thích độ sáng & ngũ hành</Text>
          <View style={styles.legendRow}>
            <Text style={styles.legendNote}>M: Miếu · V: Vượng · Đ: Đắc · B: Bình hòa · H: Hãm</Text>
          </View>
          <View style={styles.legendRow}>
            {[
              { color: '#e5e7eb', label: 'Kim' },
              { color: '#10b981', label: 'Mộc' },
              { color: '#1e40af', label: 'Thủy' },
              { color: '#ff9d8a', label: 'Hỏa' },
              { color: '#f59e0b', label: 'Thổ' },
            ].map(({ color, label }) => (
              <View key={label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <Text style={styles.legendLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Birth info summary */}
        <View style={styles.birthSummary}>
          <Text style={styles.birthSummaryTitle}>Thông tin cá nhân</Text>
          <Text style={styles.birthSummaryText}>
            {birthInfo.name} • {birthInfo.gender === 'nam' ? '♂ Nam' : '♀ Nữ'}
          </Text>
          <Text style={styles.birthSummaryText}>
            Dương lịch: {birthInfo.day}/{birthInfo.month}/{birthInfo.year}
          </Text>
          <Text style={styles.birthSummaryText}>
            Âm lịch: {chart.lunarDate.day}/{chart.lunarDate.month}{chart.lunarDate.isLeapMonth ? '(n)' : ''}/{chart.lunarDate.year} ({chart.lunarDate.yearStem}{chart.lunarDate.yearBranch})
          </Text>
        </View>

        {/* Tài Lộc */}
        <TouchableOpacity
          style={styles.dayBtn}
          onPress={() => navigation.getParent()?.navigate('WealthChart', { result })}
          activeOpacity={0.85}
        >
          <Text style={styles.dayBtnText}>💰 Tài Lộc (xu hướng tài lộc cả đời)</Text>
        </TouchableOpacity>

        {/* Xem theo ngày */}
        <TouchableOpacity
          style={styles.dayBtn}
          onPress={() => navigation.getParent()?.navigate('DailyView', { result })}
          activeOpacity={0.85}
        >
          <Text style={styles.dayBtnText}>📅 Xem theo ngày (tốt/xấu, nên/không nên)</Text>
        </TouchableOpacity>

        {/* Xem ngày tốt cho việc cụ thể */}
        <TouchableOpacity
          style={styles.dayBtn}
          onPress={() => navigation.getParent()?.navigate('DayPicker', { result })}
          activeOpacity={0.85}
        >
          <Text style={styles.dayBtnText}>🧭 Xem ngày tốt cho việc cụ thể</Text>
        </TouchableOpacity>
      </ScrollView>

      <ImageViewerModal
        visible={viewerUri !== null}
        uri={viewerUri}
        onSave={handleSave}
        onShare={handleShare}
        onClose={() => setViewerUri(null)}
      />
    </SafeAreaView>
  );
}

function ToggleSwitch({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  return (
    <View style={styles.toggle}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value} onValueChange={onToggle}
        trackColor={{ true: COLORS.gold + '88' }}
        thumbColor={value ? COLORS.gold : COLORS.textSecondary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xxl, alignItems: 'center' },
  toolbar: { width: '100%', gap: SPACING.sm },
  firstRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: SPACING.sm },
  yearBtn: {
    borderWidth: 1, borderColor: COLORS.gold, borderRadius: 8,
    paddingHorizontal: SPACING.md, paddingVertical: 6, backgroundColor: COLORS.gold + '14',
  },
  yearBtnText: { color: COLORS.gold, fontWeight: '800', fontSize: FONTS.size.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  modalBox: { width: '100%', maxWidth: 360, backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.gold, padding: SPACING.md },
  modalTitle: { color: COLORS.gold, fontSize: FONTS.size.md, fontWeight: '800', marginBottom: SPACING.sm, textAlign: 'center' },
  yearItem: { height: 44, justifyContent: 'center', paddingHorizontal: SPACING.md, borderRadius: 8 },
  yearItemActive: { backgroundColor: COLORS.gold + '22' },
  yearItemTxt: { color: COLORS.textPrimary, fontSize: FONTS.size.md, textAlign: 'center' },
  yearItemTxtActive: { color: COLORS.gold, fontWeight: '800' },
  toggleRow: { flexDirection: 'row', gap: SPACING.md, justifyContent: 'center', flexWrap: 'wrap' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  toggleLabel: { color: COLORS.textSecondary, fontSize: FONTS.size.sm },
  exportBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 8,
    padding: SPACING.md,
    alignItems: 'center',
  },
  exportBtnText: { color: '#1a0a00', fontWeight: '700', fontSize: FONTS.size.md },
  aiChartBtn: {
    backgroundColor: COLORS.purple, borderRadius: 8,
    padding: SPACING.md, alignItems: 'center',
  },
  aiChartBtnText: { color: '#fff', fontWeight: '800', fontSize: FONTS.size.md },
  dayBtn: {
    width: '100%', alignSelf: 'stretch',
    backgroundColor: COLORS.surface, borderRadius: 10,
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg,
    alignItems: 'flex-start',
    borderWidth: 1, borderColor: COLORS.gold,
  },
  dayBtnText: { color: COLORS.gold, fontWeight: '800', fontSize: FONTS.size.md, textAlign: 'left' },
  tapHint: { color: COLORS.goldLight, fontSize: FONTS.size.sm, fontStyle: 'italic', textAlign: 'center' },
  legend: {
    backgroundColor: COLORS.card, borderRadius: 8, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, width: '100%',
  },
  legendTitle: { color: COLORS.textPrimary, fontSize: FONTS.size.md, marginBottom: SPACING.sm, fontWeight: '600' },
  legendRow: { flexDirection: 'row', gap: SPACING.md, flexWrap: 'wrap', marginTop: 4 },
  legendNote: { color: COLORS.textSecondary, fontSize: FONTS.size.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 14, height: 14, borderRadius: 3 },
  legendLabel: { color: COLORS.textSecondary, fontSize: FONTS.size.sm },
  birthSummary: {
    backgroundColor: COLORS.card, borderRadius: 8, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, width: '100%',
  },
  birthSummaryTitle: { color: COLORS.gold, fontSize: FONTS.size.lg, fontWeight: '700', marginBottom: SPACING.sm },
  birthSummaryText: { color: COLORS.textPrimary, fontSize: FONTS.size.md, marginTop: 3 },
});
