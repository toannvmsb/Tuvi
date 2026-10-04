/**
 * Biểu đồ "thăng trầm" của Dòng đời đã qua (react-native-svg, vẽ tay — không thêm thư viện):
 *  - trục ngang = tuổi, dải nền xen kẽ theo ĐẠI HẠN (nhãn cung ở đáy);
 *  - đường tổng (vàng) + bốn đường mảng (sự nghiệp / tài lộc / tình duyên / gia đạo) bật–tắt được;
 *    KHÔNG có đường sức khỏe, "chỗ ở" chỉ nằm ở danh sách mốc;
 *  - phần tương lai bị làm mờ và ghi rõ "chưa xét" (không dự đoán). Ở chế độ `mode="future"` (màn Luận tương lai) thì ngược lại:
 *    trục kéo tới ~100 tuổi, không làm mờ, chỉ là xu hướng;
 *  - chấm trên đường tổng: mốc đã chọn (vòng vàng) và năm người xem đã xác nhận Đúng (chấm xanh);
 *  - chạm vào biểu đồ → chọn năm gần nhất (onSelectYear).
 */
import React, { useMemo } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Polyline, Circle, Text as SvgText, G } from 'react-native-svg';
import { COLORS, FONTS, TIER_COLORS } from '../constants/theme';
import type { Timeline } from '../core/pastReview/timeline';
import type { AreaId } from '../core/pastReview';

export type SeriesKey = 'total' | 'career' | 'wealth' | 'love' | 'family';
export const SERIES_COLOR: Record<SeriesKey, string> = {
  total: COLORS.gold,
  career: COLORS.blue,
  wealth: TIER_COLORS.great,
  love: '#F08FB0',
  family: COLORS.purple,
};
export const SERIES_LABEL: Record<SeriesKey, string> = {
  total: 'Tổng', career: 'Sự nghiệp', wealth: 'Tài lộc', love: 'Tình duyên', family: 'Gia đạo',
};

const PAD = { l: 30, r: 10, t: 12, b: 34 };
const FUTURE_AGES = 8; // chiều rộng vùng "tương lai" làm mờ (tuổi)

export default function PastLifeChart({
  timeline, width, height = 230, active, confirmedYears, selectedYear, onSelectYear, mode = 'past',
}: {
  timeline: Timeline; width: number; height?: number; mode?: 'past' | 'future';
  active: Record<SeriesKey, boolean>;
  confirmedYears: Set<number>;
  selectedYear?: number | null;
  onSelectYear?: (year: number) => void;
}) {
  const geo = useMemo(() => {
    const yrs = timeline.years;
    if (!yrs.length) return null;
    const minAge = yrs[0].age;
    const nowAge = timeline.currentAge;
    const maxAge = mode === 'future' ? yrs[yrs.length - 1].age + 1 : nowAge + FUTURE_AGES;
    const w = width - PAD.l - PAD.r;
    const h = height - PAD.t - PAD.b;
    const x = (age: number) => PAD.l + ((age - minAge) / Math.max(1, maxAge - minAge)) * w;
    let maxAbs = 30;
    for (const y of yrs) {
      maxAbs = Math.max(maxAbs, Math.abs(y.vanScore));
      for (const k of ['career', 'wealth', 'love', 'family'] as AreaId[]) maxAbs = Math.max(maxAbs, Math.abs(y.signed[k]));
    }
    maxAbs = Math.min(100, Math.ceil(maxAbs / 10) * 10);
    const yScale = (v: number) => PAD.t + h / 2 - (v / maxAbs) * (h / 2);
    return { yrs, minAge, nowAge, maxAge, w, h, x, yScale, maxAbs };
  }, [timeline, width, height, mode]);

  if (!geo) return null;
  const { yrs, minAge, nowAge, x, yScale, maxAbs } = geo;
  const valueOf = (k: SeriesKey, i: number) => (k === 'total' ? yrs[i].vanScore : yrs[i].signed[k as AreaId]);
  const pts = (k: SeriesKey) => yrs.map((y, i) => `${x(y.age).toFixed(1)},${yScale(valueOf(k, i)).toFixed(1)}`).join(' ');
  const plotBottom = height - PAD.b;

  const onPress = (e: any) => {
    if (!onSelectYear) return;
    // Native: locationX. Web: sự kiện click của trình duyệt không có locationX → tính từ clientX.
    const ne = e?.nativeEvent;
    let lx: number | undefined = typeof ne?.locationX === 'number' ? ne.locationX : undefined;
    if (lx === undefined && typeof ne?.clientX === 'number' && typeof e?.currentTarget?.getBoundingClientRect === 'function') {
      lx = ne.clientX - e.currentTarget.getBoundingClientRect().left;
    }
    if (lx === undefined) return;
    let best = yrs[0], bd = Infinity;
    for (const y of yrs) { const d = Math.abs(x(y.age) - lx); if (d < bd) { bd = d; best = y; } }
    onSelectYear(best.year);
  };

  return (
    <View>
      <Pressable
        onPress={onPress}
        accessibilityRole="image"
        accessibilityLabel={`Biểu đồ ${mode === 'future' ? 'xu hướng' : 'thăng trầm'} từ tuổi ${minAge} đến tuổi ${mode === 'future' ? geo.maxAge - 1 : nowAge}. Chạm vào một năm để xem chi tiết.`}
      >
        <Svg width={width} height={height}>
          {/* dải đại hạn xen kẽ */}
          {timeline.chapters.map((c, i) => {
            const a0 = Math.max(c.startAge, minAge), a1 = Math.min(c.endAge + 1, geo.maxAge);
            if (a1 <= a0) return null;
            return (
              <G key={c.key}>
                <Rect x={x(a0)} y={PAD.t} width={x(a1) - x(a0)} height={plotBottom - PAD.t}
                  fill={i % 2 ? 'rgba(226,194,133,0.05)' : 'rgba(183,156,255,0.06)'} />
                {x(a1) - x(a0) >= 36 && (
                  <SvgText x={(x(a0) + x(a1)) / 2} y={height - 6} fontSize={9.5} fill={COLORS.textMuted} textAnchor="middle">
                    {c.palaceName ?? `${c.startAge}-${c.endAge}`}
                  </SvgText>
                )}
              </G>
            );
          })}

          {/* tương lai: làm mờ, không vẽ đường (chỉ ở chế độ quá khứ) */}
          {mode === 'past' && (
            <>
              <Rect x={x(nowAge + 0.5)} y={PAD.t} width={Math.max(0, x(geo.maxAge) - x(nowAge + 0.5))} height={plotBottom - PAD.t}
                fill="rgba(18,19,43,0.72)" />
              <SvgText x={(x(nowAge + 0.5) + x(geo.maxAge) ) / 2} y={PAD.t + 14} fontSize={9.5} fill={COLORS.textMuted} textAnchor="middle">
                chưa xét
              </SvgText>
            </>
          )}

          {/* trục: 0 và biên */}
          <Line x1={PAD.l} x2={width - PAD.r} y1={yScale(0)} y2={yScale(0)} stroke="rgba(243,235,220,0.35)" strokeDasharray="4 4" strokeWidth={1} />
          <SvgText x={PAD.l - 4} y={yScale(maxAbs) + 3} fontSize={9} fill={COLORS.textMuted} textAnchor="end">thuận</SvgText>
          <SvgText x={PAD.l - 4} y={yScale(-maxAbs) + 3} fontSize={9} fill={COLORS.textMuted} textAnchor="end">khó</SvgText>

          {/* nhãn tuổi mỗi 10 */}
          {Array.from({ length: Math.floor(geo.maxAge / 10) + 1 }, (_, i) => i * 10).filter(a => a >= minAge && a <= (mode === 'future' ? geo.maxAge : nowAge)).map(a => (
            <SvgText key={a} x={x(a)} y={plotBottom + 12} fontSize={9.5} fill={COLORS.textSecondary} textAnchor="middle">{a}</SvgText>
          ))}

          {/* năm đang chọn */}
          {selectedYear != null && (() => {
            const y = yrs.find(v => v.year === selectedYear);
            return y ? <Line x1={x(y.age)} x2={x(y.age)} y1={PAD.t} y2={plotBottom} stroke={COLORS.goldLight} strokeWidth={1} strokeOpacity={0.7} /> : null;
          })()}

          {/* bốn đường mảng rồi đường tổng (nằm trên cùng) */}
          {(['career', 'wealth', 'love', 'family'] as SeriesKey[]).filter(k => active[k]).map(k => (
            <Polyline key={k} points={pts(k)} fill="none" stroke={SERIES_COLOR[k]} strokeWidth={1.6} strokeOpacity={0.9} strokeLinejoin="round" />
          ))}
          {active.total && <Polyline points={pts('total')} fill="none" stroke={SERIES_COLOR.total} strokeWidth={2.6} strokeLinejoin="round" />}

          {/* mốc + năm đã xác nhận Đúng */}
          {yrs.map(y => {
            const cy = yScale(y.vanScore), cx = x(y.age);
            const ok = confirmedYears.has(y.year);
            if (!y.isMarker && !ok) return null;
            return (
              <G key={y.year}>
                {y.isMarker && <Circle cx={cx} cy={cy} r={6} fill="none" stroke={COLORS.goldLight} strokeWidth={1.6} />}
                {ok && <Circle cx={cx} cy={cy} r={3.4} fill={TIER_COLORS.great} />}
              </G>
            );
          })}
        </Svg>
      </Pressable>
    </View>
  );
}

export function ChartLegend({ active, onToggle }: { active: Record<SeriesKey, boolean>; onToggle: (k: SeriesKey) => void }) {
  return (
    <View style={s.legend}>
      {(Object.keys(SERIES_LABEL) as SeriesKey[]).map(k => (
        <Pressable key={k} onPress={() => onToggle(k)} accessibilityRole="button" accessibilityState={{ selected: active[k] }}
          accessibilityLabel={`${active[k] ? 'Ẩn' : 'Hiện'} đường ${SERIES_LABEL[k]}`}
          style={[s.legendItem, { borderColor: active[k] ? SERIES_COLOR[k] : 'rgba(243,235,220,0.18)', opacity: active[k] ? 1 : 0.55 }]}>
          <View style={[s.dot, { backgroundColor: SERIES_COLOR[k] }]} />
          <Text style={s.legendTxt}>{SERIES_LABEL[k]}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendTxt: { fontFamily: FONTS.bodySemi, fontSize: 11.5, color: COLORS.textSecondary },
});
