/**
 * Thẻ 1 sự kiện trong "Luận sự kiện năm" — dùng chung cho mục "Sự kiện nổi bật" (AnnualEventsScreen)
 * và màn "Sự kiện tháng X" (MonthEventsScreen) để hiển thị NHẤT QUÁN cùng 1 định dạng.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { COLORS, FONTS, TIER_COLORS } from '../constants/theme';
import { Card, Body, ScoreRing } from '../ui';
import Icon from '../ui/Icon';
import { explainEvent, explainMonthWindow, categoryTitleOf, type ScoredEvent } from '../core/annualEvents';

const DIRECTION_COLOR: Record<ScoredEvent['direction'], string> = {
  POSITIVE: TIER_COLORS.great, NEGATIVE: TIER_COLORS.bad, MIXED: TIER_COLORS.caution,
};
const DIRECTION_LABEL: Record<ScoredEvent['direction'], string> = {
  POSITIVE: 'Thuận lợi', NEGATIVE: 'Cần thận trọng', MIXED: 'Hai chiều',
};

export default function AnnualEventCard({ e }: { e: ScoredEvent }) {
  const [open, setOpen] = useState(false);
  const color = DIRECTION_COLOR[e.direction];
  const ex = useMemo(() => explainEvent(e), [e]);
  return (
    <Pressable onPress={() => setOpen(v => !v)} accessibilityRole="button">
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <ScoreRing score={e.strength} size={52} stroke={5} numberSize={16} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.eventCat}>{categoryTitleOf(e.category)}</Text>
            <Text style={s.eventTitle} numberOfLines={2}>{e.title}</Text>
          </View>
          <Icon name="chev" size={18} color={COLORS.textMuted} />
        </View>
        <View style={s.chipRow}>
          <View style={[s.chip, { backgroundColor: color + '22', borderColor: color + '66' }]}>
            <Text style={[s.chipTxt, { color }]}>{DIRECTION_LABEL[e.direction]}</Text>
          </View>
          {e.isMajorEvent && <View style={[s.chip, { backgroundColor: COLORS.gold + '22', borderColor: COLORS.gold }]}><Text style={[s.chipTxt, { color: COLORS.goldLight }]}>⭐ Đáng chú ý trong năm</Text></View>}
        </View>
        {open && (
          <View style={{ gap: 10, paddingTop: 4, borderTopWidth: 1, borderTopColor: 'rgba(226,194,133,0.14)' }}>
            {ex.facts.length > 0 && (
              <View style={{ gap: 4 }}>
                <Text style={s.blockLabel}>Dữ kiện</Text>
                {ex.facts.map((f, i) => <Body key={i} size={12.5} style={s.justify}>• {f.replace(/\*\*/g, '')}</Body>)}
              </View>
            )}
            <View style={{ gap: 2 }}>
              <Text style={s.blockLabel}>Phân tích</Text>
              <Body size={12.5} style={s.justify}>{ex.analysis}</Body>
            </View>
            <View style={{ gap: 2 }}>
              <Text style={s.blockLabel}>Kết luận</Text>
              <Body size={12.5} color={COLORS.textPrimary} style={s.justify}>{ex.conclusion}</Body>
            </View>
            {e.peakMonths.length > 0 ? (
              <View style={{ gap: 4 }}>
                <Text style={s.blockLabel}>Thời điểm cần lưu ý</Text>
                {e.peakMonths.map((w, i) => <Body key={i} size={12.5} color={COLORS.goldLight} style={s.justify}>{explainMonthWindow(w)}</Body>)}
              </View>
            ) : (
              <Body size={12.5}>Chưa đủ dữ liệu để khoanh vùng tháng cụ thể cho sự kiện này.</Body>
            )}
          </View>
        )}
      </Card>
    </Pressable>
  );
}

const s = StyleSheet.create({
  eventCat: { fontFamily: FONTS.bodySemi, fontSize: 11, letterSpacing: 1, color: COLORS.textMuted, textTransform: 'uppercase' },
  eventTitle: { fontFamily: FONTS.display, fontSize: 19, color: COLORS.textPrimary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(226,194,133,0.22)', backgroundColor: 'rgba(255,255,255,0.05)' },
  chipTxt: { fontFamily: FONTS.bodySemi, fontSize: 11, color: COLORS.textSecondary },
  blockLabel: { fontFamily: FONTS.bodySemi, fontSize: 11, letterSpacing: 0.5, color: COLORS.gold, textTransform: 'uppercase' },
  justify: { textAlign: 'justify' },
});
