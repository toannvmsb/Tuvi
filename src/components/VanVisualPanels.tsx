/**
 * Bộ 3 khối trực quan DÙNG CHUNG cho Đại Vận:
 *  - DaiVanRadarBlock: bản đồ tròn 12 trục + ô cung khởi nguồn đại vận.
 *  - Years10Chart: biểu đồ cột đôi 10 năm (Tài lộc/Thách thức) + đánh dấu
 *    năm đỉnh / năm cần cẩn trọng.
 *  - DomainScoresPanel: bảng điểm 6 lĩnh vực (sự nghiệp, tình cảm, sức khỏe,
 *    tài sản, cơ hội, biến động) + chiến lược tổng hợp.
 *
 * Dùng ở cả DaiVanScreen (khi mở 1 đại vận) và TieuVanScreen (khi chọn 1 đại
 * vận để xem chi tiết 10 năm) — đảm bảo 2 màn hình hiển thị nhất quán.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { AstrologyResult, DaiVan } from '../types';
import type { DomainScores } from '../core/daiVanScore';
import type { DaiVanAnnualBreakdown } from '../core/annualPeriodService';
import { computeDaiVanRadar } from '../core/daiVanRadar';
import RadarChart from './RadarChart';
import HouseCell from './TuViChart/HouseCell';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { useContentWidth } from '../lib/platform';

const GREEN = '#5fdb8a';
const GRAY = '#7c8aa5';
const CHART_H2 = 118;

export const RATING_COLOR: Record<string, string> = {
  'Rất tốt': '#22c55e',
  'Tốt': '#5fdb8a',
  'Khá': '#f5b942',
  'Trung bình': '#e0a23a',
  'Nhiều thách thức': '#ff7a7a',
};

// ─── Radar 12 trục + cung khởi nguồn ──────────────────────────────────────────

export function DaiVanRadarBlock({
  result, dv, cellW, cellH,
}: { result: AstrologyResult; dv: DaiVan; cellW: number; cellH: number }) {
  const width = useContentWidth();
  const radar = computeDaiVanRadar(result, dv);
  const cung = result.tuViChart.houses.find(hh => hh.branch === dv.branch);
  return (
    <View style={radarStyles.radarBox}>
      <Text style={radarStyles.radarTitle}>
        Bản đồ đại vận · cung khởi đầu: {radar.palaceName} ({radar.branch})
      </Text>
      <RadarChart data={radar.axes} size={Math.min(width - 60, 360)} />
      {cung && (
        <View style={radarStyles.cungWrap}>
          <Text style={radarStyles.cungLabel}>Cung khởi nguồn đại vận</Text>
          <HouseCell house={cung} width={cellW} height={cellH} showLuuStars={false} />
        </View>
      )}
    </View>
  );
}

const radarStyles = StyleSheet.create({
  radarBox: {
    backgroundColor: COLORS.surface, borderRadius: 10, padding: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  radarTitle: { color: COLORS.goldLight, fontSize: FONTS.size.sm, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  cungWrap: { alignItems: 'center', marginTop: SPACING.md, gap: 4 },
  cungLabel: { color: COLORS.gold, fontSize: FONTS.size.sm, fontWeight: '800' },
});

// ─── Biểu đồ 10 năm trong đại vận ──────────────────────────────────────────────

export function Years10Chart({ breakdown, currentAge }: { breakdown: DaiVanAnnualBreakdown; currentAge?: number }) {
  const width = useContentWidth();
  const chartW = width - SPACING.lg * 2 - SPACING.md * 2;
  const years = breakdown.years;
  const colW = Math.floor(chartW / Math.max(years.length, 1));
  if (!years.length) return null;

  const peakSet = new Set(breakdown.peakAges);
  const cautionSet = new Set(breakdown.cautionAges);
  const peakAges = breakdown.peakAges;
  const cautionAges = breakdown.cautionAges;

  return (
    <View style={stylesYr.container}>
      <View style={stylesYr.headerRow}>
        <Text style={stylesYr.title}>Bản đồ {years.length} năm trong đại vận</Text>
        <View style={stylesYr.legend}>
          <View style={[stylesYr.dot, { backgroundColor: GREEN }]} />
          <Text style={stylesYr.legendTxt}>Tài lộc</Text>
          <View style={[stylesYr.dot, { backgroundColor: GRAY }]} />
          <Text style={stylesYr.legendTxt}>Thách thức</Text>
        </View>
      </View>

      <View style={[stylesYr.chartArea, { height: CHART_H2 }]}>
        {[100, 50, 0].map(g => (
          <View key={g} style={[stylesYr.grid, { bottom: (g / 100) * CHART_H2 }]}>
            <Text style={stylesYr.gridTxt}>{g}</Text>
          </View>
        ))}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: CHART_H2 }}>
          {years.map(y => {
            const isNow = currentAge === y.age;
            const isPeak = peakSet.has(y.age);
            const isCaution = cautionSet.has(y.age);
            const barColor = RATING_COLOR[y.rating] ?? GREEN;
            return (
              <View key={y.age} style={{ width: colW, height: CHART_H2, justifyContent: 'flex-end', alignItems: 'center', position: 'relative' }}>
                {isNow && <View style={[stylesYr.nowLine, { height: CHART_H2 }]} />}
                {isPeak && <View style={stylesYr.peakDot} />}
                {isCaution && <View style={stylesYr.cautionDot} />}
                <View style={{ width: colW * 0.55, height: (y.taiLoc / 100) * CHART_H2, backgroundColor: barColor, borderTopLeftRadius: 2, borderTopRightRadius: 2, zIndex: 1 }} />
                <View style={{ position: 'absolute', bottom: 0, width: colW * 0.28, height: (y.thachThuc / 100) * CHART_H2, backgroundColor: GRAY, opacity: 0.8, borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />
              </View>
            );
          })}
        </View>
      </View>

      <View style={{ flexDirection: 'row' }}>
        {years.map(y => (
          <View key={y.age} style={{ width: colW, alignItems: 'center' }}>
            <Text style={stylesYr.ageLabel}>{y.age}</Text>
            <Text style={stylesYr.yearLabel}>{String(y.year).slice(2)}</Text>
          </View>
        ))}
      </View>

      {(peakAges.length > 0 || cautionAges.length > 0) && (
        <View style={stylesYr.summaryRow}>
          {peakAges.length > 0 && (
            <Text style={stylesYr.peakTxt}>★ Đỉnh: {peakAges.map(a => `${a}t`).join(', ')}</Text>
          )}
          {cautionAges.length > 0 && (
            <Text style={stylesYr.cautionTxt}>⚠ Cẩn trọng: {cautionAges.map(a => `${a}t`).join(', ')}</Text>
          )}
        </View>
      )}
    </View>
  );
}

const stylesYr = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface, borderRadius: 10, padding: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border, gap: 6,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: COLORS.goldLight, fontSize: 11, fontWeight: '700' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 2 },
  legendTxt: { color: COLORS.textSecondary, fontSize: 9 },
  chartArea: { position: 'relative', justifyContent: 'flex-end' },
  grid: { position: 'absolute', left: 0, right: 0, borderTopWidth: 0.5, borderTopColor: COLORS.border },
  gridTxt: { color: COLORS.textMuted, fontSize: 9, position: 'absolute', left: -2, top: -6 },
  nowLine: { position: 'absolute', width: 2, backgroundColor: COLORS.red, opacity: 0.7 },
  peakDot: {
    position: 'absolute', top: 1, width: 7, height: 7,
    borderRadius: 3.5, backgroundColor: '#22c55e', zIndex: 5,
  },
  cautionDot: {
    position: 'absolute', top: 1, width: 7, height: 7,
    borderRadius: 3.5, backgroundColor: '#ff7a7a', zIndex: 5,
  },
  ageLabel: { color: COLORS.gold, fontSize: 9, fontWeight: '700' },
  yearLabel: { color: COLORS.textSecondary, fontSize: 7 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  peakTxt: { color: '#22c55e', fontSize: FONTS.size.xs, fontWeight: '700' },
  cautionTxt: { color: '#ff7a7a', fontSize: FONTS.size.xs, fontWeight: '700' },
});

// ─── Bảng điểm 6 lĩnh vực ──────────────────────────────────────────────────────

const DOMAIN_STRATEGY_COLOR: Record<string, string> = {
  'Thuận lợi rõ': '#22c55e',
  'Cơ hội cao – áp lực cao': '#f5b942',
  'Ổn định – ít đột phá': '#60a5fa',
  'Nhiều thách thức': '#ff7a7a',
};

const DOMAINS: { key: keyof DomainScores; label: string; icon: string; invert?: boolean }[] = [
  { key: 'career', label: 'Sự nghiệp', icon: '🏢' },
  { key: 'relationship', label: 'Tình cảm', icon: '💞' },
  { key: 'health', label: 'Sức khỏe', icon: '🏥' },
  { key: 'property', label: 'Tài sản', icon: '🏠' },
  { key: 'opportunity', label: 'Cơ hội', icon: '⚡' },
  { key: 'volatility', label: 'Biến động', icon: '🌊', invert: true },
];

function domainColor(score: number, invert = false): string {
  const effective = invert ? 100 - score : score;
  if (effective >= 70) return '#22c55e';
  if (effective >= 50) return '#f5b942';
  return '#ff7a7a';
}

export function DomainScoresPanel({ d }: { d: DomainScores }) {
  const stratColor = DOMAIN_STRATEGY_COLOR[d.strategyLabel] ?? '#f5b942';
  return (
    <View style={stylesDom.container}>
      <View style={stylesDom.headerRow}>
        <Text style={stylesDom.sectionTitle}>6 lĩnh vực</Text>
        <View style={[stylesDom.stratChip, { borderColor: stratColor }]}>
          <Text style={[stylesDom.stratTxt, { color: stratColor }]}>{d.strategyLabel}</Text>
        </View>
      </View>
      <View style={stylesDom.grid}>
        {DOMAINS.map(dom => {
          const score = d[dom.key] as number;
          const col = domainColor(score, dom.invert);
          return (
            <View key={dom.key} style={stylesDom.chip}>
              <Text style={stylesDom.chipIcon}>{dom.icon}</Text>
              <Text style={stylesDom.chipLabel}>{dom.label}</Text>
              <Text style={[stylesDom.chipScore, { color: col }]}>{score}</Text>
              <View style={[stylesDom.chipBar, { width: `${score}%` as any, backgroundColor: col }]} />
            </View>
          );
        })}
      </View>
      <Text style={stylesDom.confidence}>Độ tin cậy dự đoán: {d.confidence}%</Text>
    </View>
  );
}

const stylesDom = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface, borderRadius: 10, padding: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border, gap: 6,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: COLORS.goldLight, fontSize: 11, fontWeight: '700' },
  stratChip: {
    borderWidth: 1.5, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2,
  },
  stratTxt: { fontSize: 10, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    width: '30%', flexGrow: 1,
    backgroundColor: COLORS.card, borderRadius: 7, padding: 7,
    gap: 2, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  chipIcon: { fontSize: 14 },
  chipLabel: { color: COLORS.textSecondary, fontSize: 9, fontWeight: '600' },
  chipScore: { fontSize: 16, fontWeight: '800' },
  chipBar: { height: 3, borderRadius: 2, maxWidth: '100%' },
  confidence: { color: COLORS.textMuted, fontSize: 9, textAlign: 'right', fontStyle: 'italic' },
});
