/**
 * Khối "Xuất ảnh & chia sẻ biểu đồ": thẻ ảnh (thương hiệu + biểu đồ đủ 5 đường + chú thích) kèm nút Lưu ảnh / Chia sẻ.
 * Thẻ KHÔNG chứa ngày giờ sinh, ghi chú hay lời luận — chỉ biểu đồ; tên chỉ hiện khi người dùng chọn "Hiện tên".
 * Dùng chung cơ chế chụp ảnh của Dòng đời đã qua (html2canvas trên web, view-shot trên native) và thông báo "Đã lưu".
 */
import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PastLifeChart, { SERIES_COLOR, SERIES_LABEL, type SeriesKey } from './PastLifeChart';
import { COLORS, FONTS } from '../constants/theme';
import { Card, Eyebrow, Body, Segmented, GoldButton, OutlineButton } from '../ui';
import { captureViewAsPng } from '../lib/captureView';
import { isWeb, saveImageOrDownload, shareFile } from '../lib/platform';
import { webAlert } from '../lib/webAlert';
import { track } from '../lib/track';
import type { Timeline } from '../core/pastReview/timeline';
import type { ViewRef } from '../types/refs';

const ALL_LINES: Record<SeriesKey, boolean> = { total: true, career: true, wealth: true, love: true, family: true };

export default function ChartShareBlock({ timeline, mode, brand, footnote, fileName, name, width }: {
  timeline: Timeline; mode: 'past' | 'future';
  /** Dòng thương hiệu đầu thẻ, vd "TUZI · LUẬN TƯƠNG LAI". */
  brand: string;
  footnote: string;
  fileName: string;
  name: string;
  width: number;
}) {
  const ref = useRef<ViewRef>(null);
  const [showName, setShowName] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (kind: 'save' | 'share') => {
    if (busy) return;
    setBusy(true);
    try {
      const uri = await captureViewAsPng(ref, fileName);
      if (kind === 'save') {
        const saved = await saveImageOrDownload(uri, fileName);
        if (saved) webAlert.alert('Đã lưu', isWeb ? 'Ảnh đã được tạo xong và tải xuống máy của bạn. Nếu trình duyệt mở ảnh ở tab mới, bạn hãy nhấn giữ ảnh để lưu.' : 'Ảnh đã được lưu vào Thư viện ảnh.');
      } else {
        await shareFile(uri, { mimeType: 'image/png', title: brand });
      }
      track('past_life_share', { mode: kind, kind: mode });
    } catch (e: any) {
      webAlert.alert('Chưa tạo được ảnh', e?.message || 'Vui lòng thử lại.');
    } finally { setBusy(false); }
  };

  return (
    <>
      <Card style={{ gap: 10 }}>
        <Eyebrow>Xuất ảnh biểu đồ</Eyebrow>
        <Body size={13}>Ảnh chỉ có biểu đồ — không ngày giờ sinh, không ghi chú, không lời luận. Bạn lưu vào máy hoặc chia sẻ cho người thân.</Body>
        <Segmented<'hide' | 'show'>
          options={[{ value: 'hide', label: 'Ẩn tên' }, { value: 'show', label: 'Hiện tên' }]}
          value={showName ? 'show' : 'hide'} onChange={v => setShowName(v === 'show')}
        />
      </Card>
      <View ref={ref} collapsable={false} style={s.card}>
        <Text style={s.brand}>{brand}</Text>
        {showName && <Text style={s.name}>{name}</Text>}
        <PastLifeChart timeline={timeline} width={Math.min(width, 340)} height={210} mode={mode} active={ALL_LINES} confirmedYears={new Set()} selectedYear={null} />
        <View style={s.legend}>
          {(Object.keys(SERIES_LABEL) as SeriesKey[]).map(k => (
            <View key={k} style={s.legendItem}>
              <View style={[s.dot, { backgroundColor: SERIES_COLOR[k] }]} />
              <Text style={s.legendTxt}>{SERIES_LABEL[k]}</Text>
            </View>
          ))}
        </View>
        <Text style={s.foot}>{footnote}</Text>
      </View>
      <View style={{ gap: 10 }}>
        <GoldButton label={busy ? 'Đang tạo ảnh…' : 'Lưu ảnh'} onPress={() => run('save')} disabled={busy} />
        <OutlineButton label="Chia sẻ" onPress={() => run('share')} />
      </View>
    </>
  );
}

const s = StyleSheet.create({
  card: {
    alignSelf: 'center', width: '100%', maxWidth: 380, padding: 16, borderRadius: 20, gap: 10,
    backgroundColor: '#12132B', borderWidth: 1.5, borderColor: 'rgba(226,194,133,0.5)',
  },
  brand: { fontFamily: FONTS.bodyBold, fontSize: 12, letterSpacing: 1.4, color: COLORS.gold, textAlign: 'center' },
  name: { fontFamily: FONTS.display, fontSize: 24, color: COLORS.textPrimary, textAlign: 'center' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendTxt: { fontFamily: FONTS.bodySemi, fontSize: 11, color: COLORS.textSecondary },
  foot: { fontFamily: FONTS.body, fontSize: 10.5, color: COLORS.textMuted, textAlign: 'center' },
});
