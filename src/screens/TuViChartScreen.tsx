import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, Switch, StyleSheet, TouchableOpacity, Alert, Modal, FlatList, Platform, ActivityIndicator,
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
import { navigationRef } from '../navigation/AppNavigator';

type Props = BottomTabScreenProps<MainTabParamList, 'TuViChart'>;

export default function TuViChartScreen({ route, navigation }: Props) {
  const { result } = route.params;
  const { tuViChart: chart, birthInfo } = result;
  const [showLuuTieuVan, setShowLuuTieuVan] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [webChartOpen, setWebChartOpen] = useState(false);
  const [webExporting, setWebExporting] = useState(false);
  const chartRef = useRef<View>(null);
  const webChartContainerRef = useRef<View>(null);

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
    // Web: react-native-view-shot không hỗ trợ → mở modal render chart trực tiếp
    if (Platform.OS === 'web') {
      setWebChartOpen(true);
      return;
    }
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

  /** Web: tải ảnh PNG bằng html2canvas */
  const handleWebExportPNG = useCallback(async () => {
    if (webExporting) return;
    setWebExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const node = webChartContainerRef.current as any;
      const domNode: HTMLElement = node?._nativeTag ?? node;
      if (!domNode || typeof domNode.getBoundingClientRect !== 'function') {
        Alert.alert('Lỗi', 'Không thể xác định vùng lá số. Thử lại sau.');
        return;
      }
      const canvas = await html2canvas(domNode, {
        backgroundColor: '#0a0a1a',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      const name = (birthInfo.name || 'laso').replace(/\s+/g, '-');
      a.download = `laso-tuvi-${name}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e: any) {
      Alert.alert('Lỗi xuất ảnh', e?.message || 'Không tạo được ảnh PNG.');
    } finally {
      setWebExporting(false);
    }
  }, [webExporting, birthInfo.name]);

  /** Web: in / xuất PDF bằng window.print() */
  const handleWebPrint = useCallback(() => {
    const name = birthInfo.name || 'Lá số Tử Vi';
    const printStyle = document.createElement('style');
    printStyle.id = '__tuvi_print_style';
    printStyle.textContent = `
      @media print {
        body > * { display: none !important; }
        body > #root { display: flex !important; }
        #root > * { display: none !important; }
        #__tuvi_print_root { display: block !important; }
      }
    `;
    document.head.appendChild(printStyle);

    // Tạo div in ấn ngoài React tree
    const printDiv = document.createElement('div');
    printDiv.id = '__tuvi_print_root';
    printDiv.style.cssText = 'display:none;position:fixed;top:0;left:0;width:100%;background:#0a0a1a;z-index:99999;padding:20px;box-sizing:border-box;';

    const node = webChartContainerRef.current as any;
    const domNode: HTMLElement = node?._nativeTag ?? node;
    if (domNode && typeof domNode.cloneNode === 'function') {
      const clone = domNode.cloneNode(true) as HTMLElement;
      clone.style.cssText = 'width:100%;max-width:600px;margin:0 auto;';
      const title = document.createElement('h2');
      title.textContent = `Lá số Tử Vi — ${name}`;
      title.style.cssText = 'color:#b8860b;font-family:sans-serif;text-align:center;margin-bottom:12px;';
      printDiv.appendChild(title);
      printDiv.appendChild(clone);
    }
    document.body.appendChild(printDiv);

    window.print();

    // Dọn dẹp sau khi in
    setTimeout(() => {
      document.getElementById('__tuvi_print_style')?.remove();
      document.getElementById('__tuvi_print_root')?.remove();
    }, 1000);
  }, [birthInfo.name]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader
        title="Lá Số"
        onBack={() => navigationRef.navigate('Home')}
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
            onPress={() => navigationRef.navigate('FullChartAI', { result: fullChartResult })}
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
            navigationRef.navigate('PalaceDetail', { result: fullChartResult, branchIndex })
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
          onPress={() => navigationRef.navigate('WealthChart', { result })}
          activeOpacity={0.85}
        >
          <Text style={styles.dayBtnText}>💰 Tài Lộc (xu hướng tài lộc cả đời)</Text>
        </TouchableOpacity>

        {/* Xem theo ngày */}
        <TouchableOpacity
          style={styles.dayBtn}
          onPress={() => navigationRef.navigate('DailyView', { result })}
          activeOpacity={0.85}
        >
          <Text style={styles.dayBtnText}>📅 Xem theo ngày (tốt/xấu, nên/không nên)</Text>
        </TouchableOpacity>

        {/* Xem ngày tốt cho việc cụ thể */}
        <TouchableOpacity
          style={styles.dayBtn}
          onPress={() => navigationRef.navigate('DayPicker', { result })}
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

      {/* Web: modal phóng to lá số — render trực tiếp TuViChart (không cần capture) */}
      {Platform.OS === 'web' && (
        <Modal visible={webChartOpen} transparent animationType="fade" onRequestClose={() => setWebChartOpen(false)}>
          <View style={styles.webChartBackdrop}>
            <View style={styles.webChartHeader}>
              <Text style={styles.webChartTitle}>Lá số Tử Vi — {birthInfo.name || 'Chưa đặt tên'}</Text>
              <TouchableOpacity onPress={() => setWebChartOpen(false)} style={styles.webChartClose}>
                <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.webChartScroll}>
              <View ref={webChartContainerRef} collapsable={false}>
                <TuViChart
                  chart={fullChartResult.tuViChart}
                  birthInfo={fullChartResult.birthInfo}
                  showLuuStars={showLuuTieuVan}
                  onPalacePress={(branchIndex) => {
                    setWebChartOpen(false);
                    setTimeout(() => navigationRef.navigate('PalaceDetail', { result: fullChartResult, branchIndex }), 200);
                  }}
                />
              </View>
            </ScrollView>

            {/* Nút xuất file */}
            <View style={styles.webChartActions}>
              <TouchableOpacity
                style={[styles.webActionBtn, styles.webActionPNG, webExporting && { opacity: 0.6 }]}
                onPress={handleWebExportPNG}
                disabled={webExporting}
                activeOpacity={0.8}
              >
                {webExporting
                  ? <ActivityIndicator size="small" color="#1a0a00" />
                  : <Text style={styles.webActionTxt}>🖼️ Tải ảnh PNG</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.webActionBtn, styles.webActionPDF]}
                onPress={handleWebPrint}
                activeOpacity={0.8}
              >
                <Text style={styles.webActionTxt}>🖨️ In / Xuất PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.webActionBtn, styles.webActionClose]}
                onPress={() => setWebChartOpen(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.webActionTxt, { color: COLORS.textSecondary }]}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
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
  webChartBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
  webChartHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  webChartTitle: { color: COLORS.gold, fontSize: FONTS.size.md, fontWeight: '700', flex: 1 },
  webChartClose: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  webChartScroll: { padding: SPACING.sm, alignItems: 'center' },
  webChartActions: {
    flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm,
    padding: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border,
    justifyContent: 'center',
  },
  webActionBtn: {
    paddingHorizontal: SPACING.lg, paddingVertical: 10,
    borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    minWidth: 130,
  },
  webActionPNG: { backgroundColor: COLORS.gold },
  webActionPDF: { backgroundColor: '#7c3aed' },
  webActionClose: { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.border },
  webActionTxt: { color: '#1a0a00', fontSize: FONTS.size.md, fontWeight: '700' },
});
