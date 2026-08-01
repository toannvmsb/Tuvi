/**
 * Nút "Xuất PDF" dùng chung cho các nội dung phân tích (Nâng cao / AI).
 * - getContent(): trả markdown nội dung hiện tại (rỗng → báo chưa có nội dung).
 * - captureChart?(): tùy chọn, trả data URI ảnh lá số để nhúng (toàn lá số / đại vận).
 */
import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator, View } from 'react-native';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { exportAnalysisToPdf, type PdfDaiVanInfo, type PdfTieuVanInfo } from '../utils/pdfExport';

interface Props {
  title: string;
  subtitle?: string;
  headerLines?: string[];
  badge?: string;
  fileName?: string;
  getContent: () => string;
  captureChart?: () => Promise<string | undefined>;
  /** Chụp ảnh ô cung Đại vận / Tiểu vận để nhúng vào trang 1 (kèm chú thích). */
  captureCells?: () => Promise<{ dvCell?: string; tvCell?: string }>;
  daiVanInfo?: PdfDaiVanInfo;
  tieuVanInfo?: PdfTieuVanInfo;
}

export default function ExportPdfButton({ title, subtitle, headerLines, badge, fileName, getContent, captureChart, captureCells, daiVanInfo, tieuVanInfo }: Props) {
  const [busy, setBusy] = useState(false);

  const onPress = async () => {
    if (busy) return;
    const md = (getContent() || '').trim();
    if (!md) { Alert.alert('Chưa có nội dung', 'Hãy mở/hoàn tất phần phân tích trước khi xuất PDF.'); return; }
    setBusy(true);
    try {
      let chartDataUri: string | undefined;
      if (captureChart) { try { chartDataUri = await captureChart(); } catch {} }
      // Chụp ô cung Đại vận / Tiểu vận (nếu có) rồi gắn vào info để render ảnh ở trang 1.
      let dvInfo = daiVanInfo, tvInfo = tieuVanInfo;
      if (captureCells) {
        try {
          const cells = await captureCells();
          if (daiVanInfo && cells?.dvCell) dvInfo = { ...daiVanInfo, cellImage: cells.dvCell };
          if (tieuVanInfo && cells?.tvCell) tvInfo = { ...tieuVanInfo, cellImage: cells.tvCell };
        } catch {}
      }
      await exportAnalysisToPdf({ title, subtitle, headerLines, badge, fileName, markdown: md, chartDataUri, daiVanInfo: dvInfo, tieuVanInfo: tvInfo });
    } catch (e: any) {
      Alert.alert('Lỗi xuất PDF', e?.message || 'Không tạo được file PDF.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <TouchableOpacity style={styles.btn} onPress={onPress} disabled={busy} activeOpacity={0.8}>
      {busy ? (
        <View style={styles.row}>
          <ActivityIndicator color={COLORS.gold} size="small" />
          <Text style={styles.txt}>Đang tạo PDF…</Text>
        </View>
      ) : (
        <Text style={styles.txt}>📄 Xuất / In PDF</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    marginTop: SPACING.sm, alignSelf: 'flex-start',
    borderWidth: 1, borderColor: COLORS.gold, borderRadius: 8,
    paddingHorizontal: SPACING.md, paddingVertical: 6,
    backgroundColor: COLORS.gold + '14',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  txt: { color: COLORS.gold, fontSize: FONTS.size.sm, fontWeight: '800' },
});
