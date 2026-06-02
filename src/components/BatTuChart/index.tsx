import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import type { BatTuChart, Pillar, FiveElement } from '../../types';
import { COLORS, FONTS, SPACING } from '../../constants/theme';
import RadarChart, { type RadarPoint } from '../RadarChart';

const ELEMENT_COLORS: Record<FiveElement, string> = {
  Mộc: '#33aa55',
  Hỏa: '#ff5a5a',   // đỏ sáng hơn, dễ nhìn trên nền tối
  Thổ: '#bb8833',
  Kim: '#cfcfe8',   // bạc sáng hơn (trước xám tối khó đọc)
  Thủy: '#4da6ff',  // xanh dương sáng hơn
};

// Thứ tự ngũ hành theo vòng tương sinh — cho biểu đồ radar đẹp & dễ đọc.
const RADAR_ORDER: FiveElement[] = ['Mộc', 'Hỏa', 'Thổ', 'Kim', 'Thủy'];

function ElementBadge({ element }: { element: FiveElement }) {
  return (
    <View style={[styles.elBadge, { backgroundColor: ELEMENT_COLORS[element] + '33', borderColor: ELEMENT_COLORS[element] }]}>
      <Text style={[styles.elText, { color: ELEMENT_COLORS[element] }]}>{element}</Text>
    </View>
  );
}

function PillarCard({ pillar }: { pillar: Pillar }) {
  return (
    <View style={styles.pillarCard}>
      <Text style={styles.pillarLabel}>{pillar.label}</Text>
      <View style={styles.stemBranch}>
        <Text style={[styles.stemText, { color: COLORS.gold }]}>{pillar.stem}</Text>
        <Text style={[styles.branchText, { color: COLORS.goldLight }]}>{pillar.branch}</Text>
      </View>
      <ElementBadge element={pillar.element} />
      <View style={styles.hiddenStems}>
        <Text style={styles.hiddenLabel}>Tàng Can</Text>
        <Text style={styles.hiddenValues}>{pillar.hiddenStems.join(' ')}</Text>
      </View>
    </View>
  );
}

interface Props {
  chart: BatTuChart;
}

export default function BatTuChartComponent({ chart }: Props) {
  const { width } = useWindowDimensions();
  const total = Object.values(chart.elementCounts).reduce((a, b) => a + b, 0) || 1;
  const radarSize = Math.min(width - 80, 320);

  // Dữ liệu radar: phần trăm của tổng. Thang hình học lấy theo hành mạnh nhất
  // (maxValue) để đa giác lấp đầy, dễ nhìn — nhãn vẫn hiển thị đúng % tổng.
  const radarData: RadarPoint[] = RADAR_ORDER.map(el => ({
    label: el,
    value: Math.round(((chart.elementCounts[el] || 0) / total) * 100),
  }));
  // Thang hình học = hành mạnh nhất + 20 (để đa giác không lấp sát mép, nhìn cân đối).
  const radarMax = Math.max(...radarData.map(d => d.value), 1) + 20;

  return (
    <View style={styles.container}>
      {/* Four pillars */}
      <View style={styles.pillarsRow}>
        {chart.pillars.map((p, i) => <PillarCard key={i} pillar={p} />)}
      </View>

      {/* Nhật Chủ + Dụng/Kỵ Thần — gộp 1 ô, chia 2 phần */}
      <View style={styles.combinedCard}>
        <View style={[styles.half, styles.halfDayMaster]}>
          <Text style={styles.sectionTitle}>Nhật Chủ</Text>
          <View style={styles.dayMasterRow}>
            <Text style={styles.dayMasterStem}>{chart.dayMaster}</Text>
            <ElementBadge element={chart.dayMasterElement} />
          </View>
        </View>
        <View style={styles.vSep} />
        <View style={[styles.half, styles.halfGods]}>
          <Text style={styles.sectionTitle}>Dụng Thần / Kỵ Thần</Text>
          <View style={styles.godLine}>
            <Text style={styles.godTag}>Dụng:</Text>
            <View style={styles.godRow}>
              {chart.favorableElements.length
                ? chart.favorableElements.map(el => (
                  <View key={el} style={[styles.godBadge, { backgroundColor: ELEMENT_COLORS[el] + '33', borderColor: ELEMENT_COLORS[el] }]}>
                    <Text style={[styles.godText, { color: ELEMENT_COLORS[el] }]}>{el}</Text>
                  </View>
                ))
                : <Text style={styles.godNone}>—</Text>}
            </View>
          </View>
          <View style={styles.godLine}>
            <Text style={styles.godTag}>Kỵ:</Text>
            <View style={styles.godRow}>
              {chart.unfavorableElements.length
                ? chart.unfavorableElements.map(el => (
                  <View key={el} style={[styles.godBadge, { backgroundColor: ELEMENT_COLORS[el] + '33', borderColor: ELEMENT_COLORS[el] }]}>
                    <Text style={[styles.godText, { color: ELEMENT_COLORS[el] }]}>{el}</Text>
                  </View>
                ))
                : <Text style={styles.godNone}>—</Text>}
            </View>
          </View>
        </View>
      </View>

      {/* Ngũ Hành phân bổ — biểu đồ radar */}
      <View style={styles.elementCard}>
        <Text style={styles.sectionTitle}>Ngũ Hành phân bổ (% tổng)</Text>
        <RadarChart data={radarData} size={radarSize} maxValue={radarMax} />
        {/* Chú thích: hành · số lượng · Dụng/Kỵ */}
        <View style={styles.legendWrap}>
          {RADAR_ORDER.map(el => (
            <View key={el} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: ELEMENT_COLORS[el] }]} />
              <Text style={[styles.legendName, { color: ELEMENT_COLORS[el] }]}>{el}</Text>
              <Text style={styles.legendCount}>{(chart.elementCounts[el] || 0).toFixed(1)}</Text>
              {chart.favorableElements.includes(el) && <Text style={styles.favorable}>✓Dụng</Text>}
              {chart.unfavorableElements.includes(el) && <Text style={styles.unfavorable}>✗Kỵ</Text>}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: SPACING.md },
  pillarsRow: { flexDirection: 'row', gap: SPACING.sm },
  pillarCard: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 12,
    padding: SPACING.sm, alignItems: 'center', gap: SPACING.xs,
    borderWidth: 1, borderColor: COLORS.border,
  },
  pillarLabel: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, fontWeight: '600' },
  stemBranch: { alignItems: 'center' },
  stemText: { fontSize: FONTS.size.xl, fontWeight: 'bold' },
  branchText: { fontSize: FONTS.size.lg, fontWeight: '600' },
  elBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, borderWidth: 1 },
  elText: { fontSize: FONTS.size.sm, fontWeight: '700' },
  hiddenStems: { alignItems: 'center', alignSelf: 'stretch' },
  hiddenLabel: { color: COLORS.textSecondary, fontSize: FONTS.size.xs, textAlign: 'center' },
  hiddenValues: { color: COLORS.textPrimary, fontSize: FONTS.size.sm, fontWeight: '600', textAlign: 'center', alignSelf: 'stretch' },
  // Ô gộp Nhật Chủ + Dụng/Kỵ Thần (chia 2 phần).
  combinedCard: {
    flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 12,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.gold + '55',
  },
  half: { gap: SPACING.xs },
  halfDayMaster: { flex: 40 },
  halfGods: { flex: 60 },
  vSep: { width: 1, backgroundColor: COLORS.border, marginHorizontal: SPACING.md },
  dayMasterRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginTop: SPACING.xs },
  dayMasterStem: { fontSize: FONTS.size.xxl, fontWeight: 'bold', color: COLORS.gold },
  godLine: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.xs },
  godTag: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, fontWeight: '700', width: 50 },
  godNone: { color: COLORS.textMuted, fontSize: FONTS.size.sm },
  godRow: { flex: 1, flexDirection: 'row', gap: SPACING.xs, flexWrap: 'wrap' },
  godBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  godText: { fontSize: FONTS.size.sm, fontWeight: '700' },
  elementCard: {
    backgroundColor: COLORS.card, borderRadius: 12,
    padding: SPACING.md, gap: SPACING.sm, borderWidth: 1, borderColor: COLORS.border,
  },
  sectionTitle: { color: COLORS.gold, fontSize: FONTS.size.sm, fontWeight: '600', marginBottom: SPACING.xs },
  legendWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: SPACING.md, marginTop: SPACING.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 12, height: 12, borderRadius: 3 },
  legendName: { fontSize: FONTS.size.sm, fontWeight: '700' },
  legendCount: { color: COLORS.textPrimary, fontSize: FONTS.size.sm, fontWeight: '600' },
  favorable: { color: '#33aa66', fontSize: FONTS.size.xs, fontWeight: '700' },
  unfavorable: { color: COLORS.starHung, fontSize: FONTS.size.xs, fontWeight: '700' },
});
