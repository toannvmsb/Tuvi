import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { solarToLunar } from '../core/lunarCalendar';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { CAL_TONE, fadeColor } from '../constants/theme';
import { TONE_COLOR, TONE_LABEL, type DayTone, type MonthHeatmap } from '../core/dailyPeriodService';

export interface DayInfo { tone: DayTone; hasWarning: boolean }

interface Props {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  /**
   * Bản đồ nhiệt PHẢI khớp đúng tháng đang xem trên lịch (viewYear/viewMonth) —
   * dùng `onViewMonthChange` để biết tháng nào đang hiện mà tính lại. Có
   * truyền thì lịch tô màu từng ngày + hiện luôn khối "Thống kê tháng" gộp
   * ngay bên dưới lưới ngày (không tách khối riêng, đỡ tốn diện tích).
   */
  monthHeatmap?: MonthHeatmap;
  /** Bắn ra khi người dùng đổi tháng xem (bấm ‹ ›) hoặc lần đầu mount — để parent tính lại monthHeatmap cho đúng tháng. */
  onViewMonthChange?: (year: number, month0: number) => void;
  /** Có truyền → lịch hiện thêm ngày MỜ của tháng trước/sau (có màu theo bản đồ nhiệt của tháng đó). */
  getHeatmap?: (year: number, month1: number) => MonthHeatmap;
}

type Cell = { y: number; m0: number; d: number; out: boolean } | null;

const WEEK_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MONTH_VI = [
  'Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
  'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12',
];
const LEGEND_ITEMS: { tone: DayTone; label: string }[] = (['tốt', 'khá', 'trung bình', 'thận trọng', 'xấu'] as DayTone[]).map(tone => ({ tone, label: TONE_LABEL[tone] }));

function noon(d: Date) {
  const x = new Date(d); x.setHours(12, 0, 0, 0); return x;
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

export default function LunarCalendarPicker({ selectedDate, onSelectDate, monthHeatmap, onViewMonthChange, getHeatmap }: Props) {
  const todayDate = useMemo(() => noon(new Date()), []);
  const [viewYear, setViewYear]   = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());

  // Đồng bộ khi selectedDate đổi tháng (ví dụ bấm "Hôm nay")
  useEffect(() => {
    setViewYear(selectedDate.getFullYear());
    setViewMonth(selectedDate.getMonth());
  }, [selectedDate.getFullYear(), selectedDate.getMonth()]);

  // Báo cho parent biết tháng đang xem — kể cả khi chỉ bấm ‹ › mà chưa chọn ngày nào.
  useEffect(() => {
    onViewMonthChange?.(viewYear, viewMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewYear, viewMonth]);

  const goToday = () => onSelectDate(noon(new Date()));

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // Ô lưới ngày (Mon-first). Có `getHeatmap` → ô trống đầu/cuối tuần được lấp bằng ngày MỜ của tháng trước/sau.
  const cells = useMemo<Cell[]>(() => {
    const firstDow = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
    const total    = new Date(viewYear, viewMonth + 1, 0).getDate();
    const fade = !!getHeatmap;
    const arr: Cell[] = [];
    if (fade) {
      const prevTotal = new Date(viewYear, viewMonth, 0).getDate();
      const pm0 = viewMonth === 0 ? 11 : viewMonth - 1;
      const py = viewMonth === 0 ? viewYear - 1 : viewYear;
      for (let i = firstDow; i > 0; i--) arr.push({ y: py, m0: pm0, d: prevTotal - i + 1, out: true });
    } else {
      for (let i = 0; i < firstDow; i++) arr.push(null);
    }
    for (let d = 1; d <= total; d++) arr.push({ y: viewYear, m0: viewMonth, d, out: false });
    const nm0 = viewMonth === 11 ? 0 : viewMonth + 1;
    const ny = viewMonth === 11 ? viewYear + 1 : viewYear;
    let nd = 1;
    while (arr.length % 7 !== 0) arr.push(fade ? { y: ny, m0: nm0, d: nd++, out: true } : null);
    return arr;
  }, [viewYear, viewMonth, !!getHeatmap]);

  // Bản đồ nhiệt của tháng trước/sau (cho ngày mờ).
  const adjInfo = useMemo(() => {
    const out: Record<string, DayInfo> = {};
    if (!getHeatmap) return out;
    const seen = new Set<string>();
    for (const c of cells) {
      if (!c || !c.out) continue;
      const k = `${c.y}-${c.m0}`;
      if (seen.has(k)) continue;
      seen.add(k);
      try {
        const hm = getHeatmap(c.y, c.m0 + 1);
        for (const d of hm.days) out[`${c.y}-${c.m0}-${d.day}`] = { tone: d.tone, hasWarning: d.hasWarning };
      } catch { /* ngày mờ không màu */ }
    }
    return out;
  }, [cells, getHeatmap]);

  // Âm lịch tất cả ngày trong tháng (memo tránh tính lại)
  const lunarMap = useMemo(() => {
    const total = new Date(viewYear, viewMonth + 1, 0).getDate();
    const m: Record<number, { day: number; month: number; isLeapMonth: boolean }> = {};
    for (let d = 1; d <= total; d++) m[d] = solarToLunar(d, viewMonth + 1, viewYear);
    return m;
  }, [viewYear, viewMonth]);

  // Chỉ dùng monthHeatmap khi ĐÚNG tháng đang xem (tránh lệch màu lúc bấm ‹ › mà parent chưa kịp tính lại).
  const dayInfo: Record<number, DayInfo> | null = useMemo(() => {
    if (!monthHeatmap || monthHeatmap.year !== viewYear || monthHeatmap.month !== viewMonth + 1) return null;
    const m: Record<number, DayInfo> = {};
    for (const d of monthHeatmap.days) m[d.day] = { tone: d.tone, hasWarning: d.hasWarning };
    return m;
  }, [monthHeatmap, viewYear, viewMonth]);

  const rows: Cell[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <View style={styles.wrap}>
      {/* Header tháng */}
      <View style={styles.header}>
        <TouchableOpacity onPress={prevMonth} style={styles.arrowBtn}>
          <Text style={styles.arrowTxt}>‹</Text>
        </TouchableOpacity>

        <View style={styles.headerMid}>
          <Text style={styles.monthTxt}>{MONTH_VI[viewMonth]} {viewYear}</Text>
          <TouchableOpacity onPress={goToday} style={styles.todayPill}>
            <Text style={styles.todayPillTxt}>● Hôm nay</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={nextMonth} style={styles.arrowBtn}>
          <Text style={styles.arrowTxt}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Nhãn thứ */}
      <View style={styles.weekRow}>
        {WEEK_LABELS.map((lb, i) => (
          <Text key={lb} style={[styles.weekLbl, i === 6 && styles.sunLbl]}>{lb}</Text>
        ))}
      </View>

      {/* Lưới ngày */}
      {rows.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map((cell, ci) => {
            if (!cell) return <View key={ci} style={styles.cell} />;

            const day        = cell.d;
            const lunar      = cell.out ? solarToLunar(day, cell.m0 + 1, cell.y) : lunarMap[day];
            const selDate    = new Date(cell.y, cell.m0, day);
            const isSel      = isSameDay(selDate, selectedDate);
            const isToday    = isSameDay(selDate, todayDate);
            const isSun      = ci === 6;
            const info       = cell.out ? adjInfo[`${cell.y}-${cell.m0}-${day}`] : dayInfo?.[day];
            const isHighlight = isToday || isSel;

            // Nhãn âm lịch: ngày 1 hiện "d/m", ngày khác chỉ hiện số ngày
            const lunarLbl = lunar.day === 1
              ? `${lunar.day}/${lunar.month}${lunar.isLeapMonth ? 'n' : ''}`
              : `${lunar.day}`;

            return (
              <TouchableOpacity
                key={ci}
                style={[
                  styles.cell,
                  info && { backgroundColor: fadeColor(CAL_TONE[info.tone].bg, cell.out ? 0.25 : 1), borderWidth: 1, borderColor: fadeColor(CAL_TONE[info.tone].border, cell.out ? 0.25 : 1) },
                  // Hôm nay VÀ ngày đang chọn KHÔNG đổi màu nền — chỉ viền trắng nổi bật.
                  isHighlight && styles.cellHighlight,
                ]}
                onPress={() => onSelectDate(noon(selDate))}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.solar,
                  !info && isSun && styles.sunTxt,
                  !info && isToday && styles.todayNumTxt,
                  info && styles.tonedTxt,
                  cell.out && styles.outTxt,
                ]}>
                  {day}
                </Text>
                <Text style={[styles.lunar, info && styles.tonedLunarTxt, cell.out && styles.outTxt]}>
                  {lunarLbl}
                </Text>
                {info?.hasWarning && <View style={styles.warnDot} />}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      {dayInfo && (
        <>
          {/* Chú thích màu ngày */}
          <View style={styles.legendRow}>
            {LEGEND_ITEMS.map(item => (
              <View key={item.tone} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: CAL_TONE[item.tone].bg, borderWidth: 1, borderColor: CAL_TONE[item.tone].border }]} />
                <Text style={styles.legendTxt}>{item.label}</Text>
              </View>
            ))}
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: 'transparent', borderWidth: 3, borderColor: '#FFFFFF' }]} />
              <Text style={styles.legendTxt}>Hôm nay</Text>
            </View>
          </View>
          <Text style={styles.legendNote}>
            Màu ô = mức thuận lợi của ngày (điểm Nhật Vận). Chấm trắng = ngày có cảnh báo (xung tuổi/Tam Nương/Nguyệt Kỵ…). Viền trắng = hôm nay/ngày đang chọn.
          </Text>
        </>
      )}

      {/* Thống kê tháng — gộp ngay dưới lưới ngày, không tách khối riêng. */}
      {monthHeatmap && dayInfo && (
        <View style={styles.statsBlock}>
          <View style={styles.statsRow}>
            <Text style={styles.stat}>TB tháng: <Text style={styles.statVal}>{monthHeatmap.stats.avg}</Text></Text>
            <Text style={styles.stat}>Ngày đẹp: <Text style={[styles.statVal, { color: TONE_COLOR['tốt'] }]}>{monthHeatmap.stats.goodDays}</Text></Text>
            <Text style={styles.stat}>Thận trọng: <Text style={[styles.statVal, { color: TONE_COLOR['xấu'] }]}>{monthHeatmap.stats.cautionDays}</Text></Text>
          </View>
          <View style={styles.weekRow2}>
            {monthHeatmap.weeks.map(w => (
              <View key={w.weekIndex} style={styles.weekChip}>
                <Text style={styles.weekLabel}>{w.label}</Text>
                <Text style={[styles.weekScore, { color: TONE_COLOR[w.tone] }]}>{w.avgScore}</Text>
                <Text style={styles.weekBest}>★{w.bestDay}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.confNote}>Độ tin cậy {monthHeatmap.confidence}% — {monthHeatmap.confidenceNote}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.sm,
    paddingTop: SPACING.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 2,
  },
  arrowBtn: {
    width: 34, height: 34,
    borderRadius: 8, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  arrowTxt: { color: COLORS.gold, fontSize: 20, fontWeight: '700', lineHeight: 24 },
  headerMid: { alignItems: 'center', gap: 2 },
  monthTxt: { color: COLORS.gold, fontSize: FONTS.size.md, fontWeight: '800' },
  todayPill: {
    backgroundColor: COLORS.gold + '22',
    borderRadius: 10, borderWidth: 1, borderColor: COLORS.gold + '55',
    paddingHorizontal: 8, paddingVertical: 2,
  },
  todayPillTxt: { color: COLORS.gold, fontSize: 10, fontWeight: '700' },

  weekRow: { flexDirection: 'row', marginBottom: 2 },
  weekLbl: {
    flex: 1, textAlign: 'center',
    color: COLORS.textSecondary, fontSize: 10, fontWeight: '700', paddingVertical: 4,
  },
  sunLbl: { color: '#ef4444' },

  row: { flexDirection: 'row' },
  cell: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    minHeight: 44, borderRadius: 8, paddingVertical: 3, gap: 1, position: 'relative',
  },
  cellHighlight: { borderWidth: 3, borderColor: '#FFFFFF' },
  outTxt: { opacity: 0.4 },

  solar: { color: COLORS.textPrimary, fontSize: FONTS.size.sm, fontWeight: '800' },
  sunTxt:      { color: '#ef4444' },
  todayNumTxt: { color: COLORS.gold },
  tonedTxt:    { color: COLORS.textPrimary },

  lunar:        { color: COLORS.textSecondary, fontSize: 9, fontWeight: '600' },
  tonedLunarTxt: { color: COLORS.textSecondary },
  warnDot: {
    position: 'absolute', top: 2, right: 2, width: 5, height: 5,
    borderRadius: 2.5, backgroundColor: '#ffffff',
  },

  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: SPACING.sm, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 12, height: 12, borderRadius: 4 },
  legendTxt: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '600' },
  legendNote: { color: COLORS.textMuted, fontSize: 9, fontStyle: 'italic', lineHeight: 13, textAlign: 'center', marginTop: 4 },

  statsBlock: {
    marginTop: SPACING.sm, paddingTop: SPACING.sm, gap: SPACING.sm,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { color: COLORS.textSecondary, fontSize: FONTS.size.xs, fontWeight: '600' },
  statVal: { color: COLORS.gold, fontWeight: '800' },
  weekRow2: { flexDirection: 'row', gap: 4, justifyContent: 'space-between' },
  weekChip: { flex: 1, alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 6, paddingVertical: 4, borderWidth: 1, borderColor: COLORS.border },
  weekLabel: { color: COLORS.textSecondary, fontSize: 9, fontWeight: '600' },
  weekScore: { fontSize: FONTS.size.md, fontWeight: '800' },
  weekBest: { color: COLORS.textMuted, fontSize: 8 },
  confNote: { color: COLORS.textMuted, fontSize: 9, fontStyle: 'italic', textAlign: 'center' },
});
