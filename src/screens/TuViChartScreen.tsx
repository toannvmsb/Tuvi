import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, Switch, StyleSheet, TouchableOpacity, Alert, Modal, FlatList, Platform, ActivityIndicator, useWindowDimensions,
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
import { isWeb, useContentWidth } from '../lib/platform';
import { useScrollToTop } from '../hooks/useScrollToTop';
import ScrollToTopButton from '../components/ScrollToTopButton';
import { Display, Segmented, Body } from '../ui';
import Icon from '../ui/Icon';

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
  const { scrollRef, showTop, onScroll, scrollToTop } = useScrollToTop();

  // ── ZOOM lá số ────────────────────────────────────────────────────────
  // Hiện nút kính lúp trên WEB và iPad (tablet native); KHÔNG hiện trên iPhone.
  // Mặc định cân đối kiểu iPad (cap ~820px). ±5% mỗi lần; min = cỡ điện thoại, max = fit màn hình.
  const { width: winW, height: winH } = useWindowDimensions();
  const isTablet = !isWeb && Math.min(winW, winH) >= 768;   // iPad: cạnh ngắn ≥ 768pt
  const showZoom = isWeb || isTablet;
  const fullW = useContentWidth();                 // bề rộng cửa sổ (web) / thiết bị
  const ZOOM_MIN = Math.min(360, fullW);           // tối thiểu = cỡ điện thoại
  const ZOOM_MAX = fullW;                          // tối đa = fit màn hình
  const balancedDefault = Math.max(ZOOM_MIN, Math.min(fullW, 820));
  const [chartW, setChartW] = useState<number>(balancedDefault);
  // Khi đổi kích thước cửa sổ (resize/xoay) → kẹp lại trong [min, max].
  useEffect(() => {
    setChartW(w => Math.max(ZOOM_MIN, Math.min(w, ZOOM_MAX)));
  }, [fullW]); // eslint-disable-line react-hooks/exhaustive-deps
  const zoomIn  = () => setChartW(w => Math.min(ZOOM_MAX, Math.round(w * 1.05)));
  const zoomOut = () => setChartW(w => Math.max(ZOOM_MIN, Math.round(w * 0.95)));

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
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Tiêu đề + chuyển Tử Vi | Bát Tự (thiết kế mới) */}
      <View style={nx.header}>
        <View style={nx.headRow}>
          <TouchableOpacity style={nx.roundBtn} onPress={() => navigationRef.navigate('Home')} accessibilityRole="button" accessibilityLabel="Quay lại">
            <Icon name="back" size={22} />
          </TouchableOpacity>
          <Display size={34}>Lá số</Display>
        </View>
        <Segmented
          options={[{ value: 'tuvi', label: '紫微 Tử Vi' }, { value: 'battu', label: '八字 Bát Tự' }]}
          value="tuvi"
          onChange={(v) => { if (v === 'battu') navigation.navigate('BatTu', { result }); }}
        />
        <Body size={12.5}>
          {`${birthInfo.name || 'Hồ sơ'} · ${birthInfo.gender === 'nu' ? 'Nữ' : 'Nam'} · ${chart.lunarDate.yearStem} ${chart.lunarDate.yearBranch}`}
        </Body>
      </View>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} onScroll={onScroll} scrollEventThrottle={16}>
        {/* Lối tắt — Tài lộc · Nhật vận · Xem ngày tốt */}
        <View style={nx.quickRow}>
          {([
            { icon: 'coin', label: 'Xem tài lộc', go: () => navigationRef.navigate('WealthChart', { result }) },
            { icon: 'calendar', label: 'Nhật vận', go: () => navigationRef.navigate('DailyView', { result }) },
            { icon: 'event', label: 'Xem ngày tốt', go: () => navigationRef.navigate('DayPicker', { result }) },
          ] as const).map(q => (
            <TouchableOpacity key={q.label} style={nx.quickBtn} onPress={q.go} activeOpacity={0.85} accessibilityRole="button">
              <Icon name={q.icon} size={20} color={COLORS.gold} />
              <Text style={nx.quickTxt}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Toolbar — Hiện Lưu Tiểu Vận (trái) · Năm xem (phải) */}
        <View style={styles.toolbar}>
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

        {/* Chart — nhấn đúp vào 1 cung để xem chi tiết. Web: có nút kính lúp +/− bên phải. */}
        <View style={styles.hintRow}>
          <Text style={[styles.tapHint, { flex: 1 }]}>Mẹo: nhấn đúp vào một cung để xem chi tiết các sao</Text>
          {showZoom && (
            <View style={styles.zoomControls}>
              <TouchableOpacity
                style={[styles.zoomBtn, chartW <= ZOOM_MIN && styles.zoomBtnOff]}
                onPress={zoomOut} disabled={chartW <= ZOOM_MIN} activeOpacity={0.7}
              >
                <Text style={styles.zoomTxt}>🔍−</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.zoomBtn, chartW >= ZOOM_MAX && styles.zoomBtnOff]}
                onPress={zoomIn} disabled={chartW >= ZOOM_MAX} activeOpacity={0.7}
              >
                <Text style={styles.zoomTxt}>🔍＋</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <TuViChart
          ref={chartRef}
          chart={fullChartResult.tuViChart}
          birthInfo={fullChartResult.birthInfo}
          showLuuStars={showLuuTieuVan}
          width={showZoom ? chartW : undefined}
          scaled={showZoom}
          onPalacePress={(branchIndex) =>
            navigationRef.navigate('PalaceDetail', { result: fullChartResult, branchIndex })
          }
        />

        {/* 2 nút: Lưu ảnh + So sánh lá số · 1 nút: Phân tích AI */}
        <View style={styles.bottomActions}>
          <View style={styles.exportRow}>
            <TouchableOpacity
              style={[styles.compareChartBtn]}
              onPress={() => navigationRef.navigate('CompareCharts', { preSelectedResult: fullChartResult })}
              activeOpacity={0.85}
            >
              <Text style={styles.compareChartBtnText}>⚖️ So sánh lá số</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.exportBtn, exporting && { opacity: 0.5 }]}
              onPress={handleExport}
              disabled={exporting}
            >
              <Text style={styles.exportBtnText}>
                {exporting ? '⏳ Đang xử lý...' : '💾 Lưu ảnh lá số'}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.aiChartBtn}
            onPress={() => navigationRef.navigate('FullChartAI', { result: fullChartResult })}
            activeOpacity={0.85}
          >
            <Text style={styles.aiChartBtnText}>🔮 Phân tích chuyên sâu toàn lá số · {viewYear}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <ScrollToTopButton visible={showTop} onPress={scrollToTop} />

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
                  scaled
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

const nx = StyleSheet.create({
  header: { width: '100%', gap: 12, paddingTop: 4 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  roundBtn: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(226,194,133,0.2)',
  },
  quickRow: { flexDirection: 'row', gap: 8, width: '100%' },
  quickBtn: {
    flex: 1, minHeight: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(226,194,133,0.1)', borderWidth: 1, borderColor: 'rgba(226,194,133,0.3)',
  },
  quickTxt: { fontFamily: FONTS.bodySemi, fontSize: 12.5, color: COLORS.textPrimary, textAlign: 'center' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xxl, alignItems: 'center' },
  toolbar: { width: '100%', gap: SPACING.sm },
  // 3 tab chức năng trên cùng
  tabRow: { flexDirection: 'row', gap: SPACING.sm, width: '100%' },
  tabBtn: {
    flex: 1, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.gold, borderRadius: 10,
    paddingVertical: SPACING.sm, paddingHorizontal: 4,
    alignItems: 'center', justifyContent: 'center', minHeight: 64,
  },
  tabIcon: { fontSize: 22 },
  tabLabel: { color: COLORS.gold, fontSize: FONTS.size.sm, fontWeight: '800', marginTop: 4, textAlign: 'center' },
  // Cụm 2 nút dưới phần chú thích
  bottomActions: { width: '100%', gap: SPACING.sm },
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
  exportRow: { flexDirection: 'row', gap: SPACING.sm },
  compareChartBtn: {
    flex: 1, backgroundColor: COLORS.purple + '33', borderRadius: 8,
    padding: SPACING.md, alignItems: 'center', borderWidth: 1, borderColor: COLORS.purple,
  },
  compareChartBtnText: { color: COLORS.purple, fontWeight: '700', fontSize: FONTS.size.md },
  exportBtn: {
    flex: 1, backgroundColor: COLORS.gold,
    borderRadius: 8, padding: SPACING.md, alignItems: 'center',
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
  hintRow: { flexDirection: 'row', alignItems: 'center', width: '100%', gap: SPACING.sm },
  zoomControls: { flexDirection: 'row', gap: 6 },
  zoomBtn: {
    borderWidth: 1, borderColor: COLORS.gold, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5, backgroundColor: COLORS.gold + '1a',
  },
  zoomBtnOff: { opacity: 0.35 },
  zoomTxt: { color: COLORS.gold, fontSize: FONTS.size.md, fontWeight: '800' },
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
