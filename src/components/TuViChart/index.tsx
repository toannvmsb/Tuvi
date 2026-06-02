/**
 * Tử Vi Chart — 4×4 grid layout matching altuvi.com reference
 * Layout:
 *   row0: [Tị]  [Ngọ] [Mùi] [Thân]
 *   row1: [Thìn][   CENTER  ][Dậu]
 *   row2: [Mão ][   CENTER  ][Tuất]
 *   row3: [Dần] [Sửu] [Tý]  [Hợi]
 */
import React, { forwardRef, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useContentWidth } from '../../lib/platform';
import type { TuViChart as TuViChartType, BirthInfo } from '../../types';
import { COLORS, FONTS, SPACING } from '../../constants/theme';
import HouseCell from './HouseCell';

interface Props {
  chart: TuViChartType;
  birthInfo: BirthInfo;
  showLuuStars?: boolean;
  onPalacePress?: (branchIndex: number) => void;
}

const GRID_POSITIONS: Array<[number, number]> = [
  [3, 2], // Tý
  [3, 1], // Sửu
  [3, 0], // Dần
  [2, 0], // Mão
  [1, 0], // Thìn
  [0, 0], // Tị
  [0, 1], // Ngọ
  [0, 2], // Mùi
  [0, 3], // Thân
  [1, 3], // Dậu
  [2, 3], // Tuất
  [3, 3], // Hợi
];

function hourRangeLabel(hour: number): string {
  // hour: 0-23 → giờ Tý(23-0h59), Sửu(1-2h59), ...
  // Map to display range. Simplified: round to 2-hour window.
  const starts = [23, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21];
  const branchIdx = Math.floor(((hour + 1) % 24) / 2);
  const s = starts[branchIdx];
  const e = (s + 1) % 24;
  return `${s}h - ${e}h59`;
}

// Tương quan Mệnh - Cục theo ngũ hành
const ELEMENT_OF_CUC: Record<number, string> = {
  2: 'Thủy', 3: 'Mộc', 4: 'Kim', 5: 'Thổ', 6: 'Hỏa',
};
const SHENG_NEXT: Record<string, string> = {
  Kim: 'Thủy', Thủy: 'Mộc', Mộc: 'Hỏa', Hỏa: 'Thổ', Thổ: 'Kim',
};
const KE_NEXT: Record<string, string> = {
  Kim: 'Mộc', Mộc: 'Thổ', Thổ: 'Thủy', Thủy: 'Hỏa', Hỏa: 'Kim',
};
// Âm/Dương Nam/Nữ — dựa Can năm sinh (Yang stem → Dương; Yin stem → Âm) + giới tính
const YANG_STEMS_SET = new Set(['Giáp', 'Bính', 'Mậu', 'Canh', 'Nhâm']);
function amDuongGenderLabel(yearStem: string, gender: 'nam' | 'nu'): string {
  const yang = YANG_STEMS_SET.has(yearStem);
  const amDuong = yang ? 'Dương' : 'Âm';
  const g = gender === 'nam' ? 'Nam' : 'Nữ';
  return `${amDuong} ${g}`;
}

function menhCucRelation(menhEl: string, cucSo: number): string {
  const cucEl = ELEMENT_OF_CUC[cucSo] ?? '';
  if (!cucEl) return '—';
  if (menhEl === cucEl) return `Bình Hòa (${menhEl} - ${cucEl})`;
  if (SHENG_NEXT[menhEl] === cucEl) return `Mệnh sinh Cục (${menhEl} → ${cucEl})`;
  if (SHENG_NEXT[cucEl] === menhEl) return `Cục sinh Mệnh (${cucEl} → ${menhEl}) — tốt`;
  if (KE_NEXT[menhEl] === cucEl) return `Mệnh khắc Cục (${menhEl} → ${cucEl})`;
  if (KE_NEXT[cucEl] === menhEl) return `Cục khắc Mệnh (${cucEl} → ${menhEl}) — kém`;
  return `${menhEl} - ${cucEl}`;
}

const TuViChart = forwardRef<View, Props>(function TuViChart({ chart, birthInfo, showLuuStars = false, onPalacePress }, ref) {
  const width = useContentWidth();
  const lastTap = useRef<{ idx: number; time: number }>({ idx: -1, time: 0 });

  const handleCellPress = (branchIdx: number) => {
    if (!onPalacePress) return;
    const now = Date.now();
    if (lastTap.current.idx === branchIdx && now - lastTap.current.time < 320) {
      lastTap.current = { idx: -1, time: 0 };
      onPalacePress(branchIdx);
    } else {
      lastTap.current = { idx: branchIdx, time: now };
    }
  };
  const chartWidth = Math.min(width - SPACING.md * 2, 720);
  const chartHeight = Math.round(chartWidth * 1.35); // chart cao hơn rộng → cell hình chữ nhật đứng
  const cellW = Math.floor(chartWidth / 4);
  const cellH = Math.floor(chartHeight / 4);

  const grid: (number | null)[][] = Array.from({ length: 4 }, () => Array(4).fill(null));
  for (let branchIdx = 0; branchIdx < 12; branchIdx++) {
    const [row, col] = GRID_POSITIONS[branchIdx];
    grid[row][col] = branchIdx;
  }

  return (
    <View ref={ref} collapsable={false} style={[styles.container, { width: chartWidth, height: chartHeight }]}>
      {grid.map((row, ri) =>
        row.map((branchIdx, ci) => {
          if (branchIdx === null) {
            if (ri === 1 && ci === 1) {
              return (
                <View
                  key="center"
                  style={[
                    styles.center,
                    { width: cellW * 2, height: cellH * 2, left: cellW, top: cellH }
                  ]}
                >
                  <Text style={styles.centerTitle}>LÁ SỐ TỬ VI</Text>
                  <Text style={styles.centerNameBig} numberOfLines={1} adjustsFontSizeToFit>
                    {birthInfo.name} · {birthInfo.gender === 'nam' ? '♂ Nam' : '♀ Nữ'}
                    {birthInfo.birthplace ? ` · ${birthInfo.birthplace}` : ''}
                  </Text>

                  <View style={styles.divider} />

                  {/* Ngày tháng giờ sinh + Can Chi */}
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Năm sinh</Text>
                    <Text style={styles.infoValue}>{birthInfo.year}</Text>
                    <Text style={styles.infoCanChi}>{chart.lunarDate.yearStem} {chart.lunarDate.yearBranch}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Tháng sinh</Text>
                    <Text style={styles.infoValue}>{birthInfo.month} ({chart.lunarDate.month})</Text>
                    {chart.monthStem && chart.monthBranch && (
                      <Text style={styles.infoCanChi}>{chart.monthStem} {chart.monthBranch}</Text>
                    )}
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Ngày sinh</Text>
                    <Text style={styles.infoValue}>{birthInfo.day} ({chart.lunarDate.day})</Text>
                    {chart.dayStem && chart.dayBranch && (
                      <Text style={styles.infoCanChi}>{chart.dayStem} {chart.dayBranch}</Text>
                    )}
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Giờ sinh</Text>
                    <Text style={styles.infoValue}>{hourRangeLabel(birthInfo.hour)}</Text>
                    {chart.hourStem && chart.hourBranch && (
                      <Text style={styles.infoCanChi}>{chart.hourStem} {chart.hourBranch}</Text>
                    )}
                  </View>
                  {chart.viewingYear && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Năm xem</Text>
                      <Text style={styles.infoValue}>
                        {chart.viewingYear}
                        {chart.viewingYearStem && chart.viewingYearBranch
                          ? ` (${chart.viewingYearStem} ${chart.viewingYearBranch})`
                          : ''}
                      </Text>
                      {chart.viewingAge && (
                        <Text style={[styles.infoCanChi, { color: COLORS.red }]}>
                          Tuổi: {chart.viewingAge}
                        </Text>
                      )}
                    </View>
                  )}

                  <View style={styles.divider} />

                  {/* Mệnh / Cục / tương quan */}
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Mệnh</Text>
                    <Text style={[styles.infoValue, { color: COLORS.gold, fontWeight: '700' }]}>{chart.napAmMenh}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Cục</Text>
                    <Text style={[styles.infoValue, { color: COLORS.gold, fontWeight: '700' }]}>{chart.cucName}</Text>
                  </View>
                  <View style={styles.relationBox}>
                    <Text style={styles.relationText}>
                      Mệnh-Cục: {menhCucRelation(chart.menhElement, chart.cucSo)}
                    </Text>
                    <Text style={styles.relationText}>
                      {amDuongGenderLabel(chart.lunarDate.yearStem, birthInfo.gender)} · Âm Dương {chart.amDuongThuanLy === 'thuận' ? 'Thuận' : 'Nghịch'} Lý
                    </Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Mệnh chủ</Text>
                    <Text style={styles.infoValue}>{chart.menhChu}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Thân chủ</Text>
                    <Text style={styles.infoValue}>{chart.thanChu}</Text>
                  </View>
                </View>
              );
            }
            return null;
          }
          const house = chart.houses[branchIdx];
          const [r, c] = GRID_POSITIONS[branchIdx];
          return (
            <Pressable
              key={branchIdx}
              onPress={() => handleCellPress(branchIdx)}
              style={{ position: 'absolute', left: c * cellW, top: r * cellH }}
            >
              <HouseCell house={house} width={cellW} height={cellH} showLuuStars={showLuuStars} />
            </Pressable>
          );
        })
      )}
    </View>
  );
});

export default TuViChart;

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignSelf: 'center',
    backgroundColor: COLORS.background,
  },
  center: {
    position: 'absolute',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    padding: 8,
    borderRadius: 4,
  },
  centerSubtitle: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center', marginVertical: 1 },
  centerBrand: { fontSize: 11, color: COLORS.gold, textAlign: 'center', fontWeight: '700' },
  centerNameBig: { fontSize: 12.5, color: COLORS.goldLight, textAlign: 'center', fontWeight: '800', marginTop: 0 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 5 },
  centerTitle: { fontSize: 15, color: COLORS.gold, textAlign: 'center', fontWeight: '800', marginBottom: 1, letterSpacing: 1.2 },
  infoBlock: { alignItems: 'center', marginVertical: 2 },
  infoLabelCenter: { fontSize: 10, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValueBig: { fontSize: 14, color: COLORS.gold, fontWeight: '800', textAlign: 'center' },
  relationBox: {
    marginTop: 3,
    backgroundColor: COLORS.background,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: COLORS.gold,
    alignItems: 'center',
    gap: 0,
  },
  relationText: { fontSize: 8, color: COLORS.goldLight, textAlign: 'center', fontWeight: '700', lineHeight: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 1 },
  infoLabel: { fontSize: 10, color: COLORS.textSecondary, width: 64 },
  infoValue: { fontSize: 10, color: COLORS.textPrimary, fontWeight: '600', flex: 1 },
  infoCanChi: { fontSize: 10, color: COLORS.goldLight, fontWeight: '700' },
  centerLine: { fontSize: 10, color: COLORS.textPrimary, textAlign: 'center', marginVertical: 1 },
  ageText: { fontSize: 10, color: COLORS.red, textAlign: 'right', fontWeight: '800', marginTop: 1 },
  tuanTrietBox: {
    marginTop: 4,
    backgroundColor: COLORS.background,
    borderRadius: 4,
    padding: 3,
    borderWidth: 0.5,
    borderColor: COLORS.border,
  },
  tuanTrietText: { fontSize: 10, color: COLORS.goldLight, textAlign: 'center', fontWeight: '700' },
});
