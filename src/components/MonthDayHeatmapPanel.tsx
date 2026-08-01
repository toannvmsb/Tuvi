/**
 * Heatmap ngày trong tháng âm (daily action score — Nhật Vận Engine) — TÁCH RA
 * dùng chung cho màn Nguyệt Vận VÀ Home (box "Ngày hôm nay" thu gọn), tránh
 * lặp lại logic tô màu/đánh dấu hôm nay ở 2 nơi.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { TONE_COLOR, type DayTone } from '../core/dailyPeriodService';

export interface HeatmapDayCell {
  lunarDay: number;
  tone: DayTone;
  hasWarning: boolean;
}

const DEFAULT_CAPTION = 'Màu = mức độ thuận lợi của ngày (điểm Nhật Vận). Viền trắng đậm = hôm nay. Chấm trắng = ngày có cảnh báo (xung tuổi/Tam Nương/Nguyệt Kỵ…).';

export default function MonthDayHeatmapPanel({
  days, stats, todayLunarDay, title = 'Heatmap ngày trong tháng', caption = DEFAULT_CAPTION, dayKind = 'lunar', titleFontSize,
}: {
  days: HeatmapDayCell[];
  stats: { avgScore: number; bestDay: number; cautionDays: number };
  todayLunarDay?: number;
  title?: string;
  caption?: string;
  /** Số hiển thị trong từng ô là ngày ÂM hay ngày DƯƠNG — chỉ để hiện chú thích, không đổi cách tính. */
  dayKind?: 'lunar' | 'solar';
  /** Ghi đè cỡ chữ tiêu đề (vd box "Nhịp tháng này" ở Home) — không đổi cỡ chữ "(ngày âm/dương)". */
  titleFontSize?: number;
}) {
  return (
    <View style={styles.box}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, titleFontSize ? { fontSize: titleFontSize } : null]}>
          {title} <Text style={styles.dayKindTag}>({dayKind === 'lunar' ? 'ngày âm' : 'ngày dương'})</Text>
        </Text>
        <Text style={styles.statTxt}>TB {stats.avgScore} · Đỉnh {stats.bestDay}/{days.length} · Cẩn trọng {stats.cautionDays} ngày</Text>
      </View>
      <View style={styles.dayGrid}>
        {days.map(d => {
          const isToday = d.lunarDay === todayLunarDay;
          return (
            <View key={d.lunarDay} style={[styles.dayCell, { backgroundColor: TONE_COLOR[d.tone] }, isToday && styles.dayCellToday]}>
              <Text style={[styles.dayCellTxt, isToday && styles.dayCellTxtToday]}>{d.lunarDay}</Text>
              {d.hasWarning && <View style={styles.dayWarnDot} />}
              {isToday && <View style={styles.todayDot} />}
            </View>
          );
        })}
      </View>
      <Text style={styles.caption}>{caption}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: COLORS.surface, borderRadius: 10, padding: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border, gap: 6,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  title: { color: COLORS.goldLight, fontSize: 11, fontWeight: '700' },
  dayKindTag: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '600', fontStyle: 'italic' },
  statTxt: { color: COLORS.textSecondary, fontSize: 9 },
  caption: { color: COLORS.textSecondary, fontSize: 9, fontStyle: 'italic', lineHeight: 13 },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  dayCell: {
    width: 26, height: 26, borderRadius: 5, alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  dayCellTxt: { color: '#0a0a0a', fontSize: 10, fontWeight: '800' },
  dayWarnDot: {
    position: 'absolute', top: 1, right: 1, width: 5, height: 5,
    borderRadius: 2.5, backgroundColor: '#ffffff',
  },
  dayCellToday: {
    borderWidth: 3, borderColor: '#ffffff',
  },
  dayCellTxtToday: { fontSize: 11 },
  todayDot: {
    position: 'absolute', bottom: 1, left: 1, width: 5, height: 5,
    borderRadius: 2.5, backgroundColor: '#ffffff',
  },
});
