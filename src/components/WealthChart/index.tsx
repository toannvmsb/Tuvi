import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useContentWidth } from '../../lib/platform';
import type { DaiVan } from '../../types';
import { COLORS, FONTS, SPACING } from '../../constants/theme';

interface Props {
  daiVans: DaiVan[];
  currentAge?: number;
}

const ELEMENT_COLORS: Record<string, string> = {
  Mộc: '#33aa55', Hỏa: '#cc4444', Thổ: '#bb8833', Kim: '#9999cc', Thủy: '#3388cc',
};

export default function WealthChart({ daiVans, currentAge }: Props) {
  const width = useContentWidth();
  const chartWidth = width - SPACING.lg * 2;
  const maxBarHeight = 120;
  const barWidth = Math.max(28, Math.floor((chartWidth - SPACING.md * 2) / daiVans.length) - 4);

  return (
    <View style={styles.container}>
      {/* Y-axis labels */}
      <View style={styles.chartArea}>
        <View style={styles.yAxis}>
          {[10, 8, 6, 4, 2].map(v => (
            <Text key={v} style={styles.yLabel}>{v}</Text>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.barsScroll}>
          <View style={[styles.barsArea, { width: daiVans.length * (barWidth + 4) }]}>
            {/* Grid lines */}
            {[0.2, 0.4, 0.6, 0.8, 1].map(frac => (
              <View
                key={frac}
                style={[styles.gridLine, { bottom: frac * maxBarHeight }]}
              />
            ))}

            {/* Bars */}
            {daiVans.map((dv, i) => {
              const barH = Math.round((dv.wealthScore / 10) * maxBarHeight);
              const color = ELEMENT_COLORS[dv.element] ?? COLORS.textSecondary;
              const isCurrent = currentAge !== undefined && currentAge >= dv.startAge && currentAge <= dv.endAge;

              return (
                <View key={i} style={[styles.barColumn, { width: barWidth + 4 }]}>
                  {/* Score label */}
                  <Text style={[styles.scoreLabel, { color }]}>{dv.wealthScore}</Text>

                  {/* Bar */}
                  <View style={[styles.barContainer, { height: maxBarHeight }]}>
                    <View style={[
                      styles.bar,
                      { height: barH, width: barWidth, backgroundColor: color + 'bb' },
                      isCurrent && styles.barCurrent,
                    ]}>
                      {isCurrent && <View style={styles.currentIndicator} />}
                    </View>
                  </View>

                  {/* Labels */}
                  <Text style={[styles.canChiLabel, { color, width: barWidth + 4 }]}>
                    {dv.stem}{dv.branch}
                  </Text>
                  <Text style={[styles.ageLabel, { width: barWidth + 4 }]}>
                    {dv.startAge}–{dv.endAge}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {Object.entries(ELEMENT_COLORS).map(([el, color]) => (
          <View key={el} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{el}</Text>
          </View>
        ))}
      </View>

      {/* Score table */}
      <View style={styles.table}>
        <Text style={styles.tableTitle}>Bảng chỉ số tài lộc</Text>
        {daiVans.map((dv, i) => {
          const color = ELEMENT_COLORS[dv.element] ?? COLORS.textSecondary;
          const stars = '★'.repeat(Math.round(dv.wealthScore / 2)) + '☆'.repeat(5 - Math.round(dv.wealthScore / 2));
          return (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.tableCanChi, { color }]}>{dv.stem}{dv.branch}</Text>
              <Text style={styles.tableAge}>{dv.startAge}–{dv.endAge}t</Text>
              <Text style={[styles.tableStars, { color }]}>{stars}</Text>
              <Text style={[styles.tableScore, { color }]}>{dv.wealthScore}/10</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: SPACING.md },
  chartArea: { flexDirection: 'row', height: 180 },
  yAxis: { width: 24, justifyContent: 'space-between', paddingBottom: 40, paddingTop: 16 },
  yLabel: { color: COLORS.textMuted, fontSize: 9, textAlign: 'right' },
  barsScroll: { flex: 1 },
  barsArea: { position: 'relative', paddingHorizontal: SPACING.xs, paddingBottom: 40 },
  gridLine: {
    position: 'absolute', left: 0, right: 0, height: 1,
    backgroundColor: COLORS.border,
  },
  barColumn: { alignItems: 'center', position: 'relative' },
  scoreLabel: { fontSize: 8, fontWeight: '600', marginBottom: 2 },
  barContainer: { justifyContent: 'flex-end', alignItems: 'center' },
  bar: { borderRadius: 4, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barCurrent: { opacity: 1, borderWidth: 2, borderColor: COLORS.gold },
  currentIndicator: {
    position: 'absolute', top: -4, left: '50%', width: 6, height: 6,
    borderRadius: 3, backgroundColor: COLORS.gold, marginLeft: -3,
  },
  canChiLabel: { fontSize: 8, fontWeight: '600', textAlign: 'center', marginTop: 2 },
  ageLabel: { fontSize: 7, color: COLORS.textMuted, textAlign: 'center' },
  legend: {
    flexDirection: 'row', gap: SPACING.md, flexWrap: 'wrap',
    backgroundColor: COLORS.card, borderRadius: 8, padding: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: COLORS.textSecondary, fontSize: FONTS.size.xs },
  table: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, gap: SPACING.xs,
  },
  tableTitle: { color: COLORS.gold, fontSize: FONTS.size.sm, fontWeight: '600', marginBottom: SPACING.xs },
  tableRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.xs,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tableCanChi: { width: 60, fontWeight: '600', fontSize: FONTS.size.sm },
  tableAge: { flex: 1, color: COLORS.textSecondary, fontSize: FONTS.size.xs },
  tableStars: { fontSize: FONTS.size.sm },
  tableScore: { width: 40, textAlign: 'right', fontWeight: '600', fontSize: FONTS.size.sm },
});
