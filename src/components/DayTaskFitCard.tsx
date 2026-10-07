/**
 * "Việc hợp / nên tránh hôm nay" — chấm chính ngày đang xem cho 54 việc của "Xem ngày tốt" (core/dayPicker.tasksForDay).
 * Trực nghi/kỵ theo Hiệp Kỷ quyển 11; có lá số thì thêm xung tuổi và điểm cá nhân hóa.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { COLORS, TIER_COLORS } from '../constants/theme';
import { Card, Eyebrow, Body } from '../ui';
import { tasksForDay, type DayTaskFit } from '../core/dayPicker';
import type { AstrologyResult } from '../types';

const LIMIT = 6;

function Row({ it, color }: { it: DayTaskFit; color: string }) {
  return (
    <View style={s.row}>
      <Text style={s.name} numberOfLines={2}>{it.emoji} {it.name}</Text>
      {!!it.note && <Text style={[s.note, { color: it.tier === 'thuan' ? COLORS.textMuted : color }]}>{it.note}</Text>}
    </View>
  );
}

export default function DayTaskFitCard({ date, result }: { date: Date; result: AstrologyResult | null }) {
  const key = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  const { good, avoid, consider } = useMemo(() => tasksForDay(date, result), [key, result]); // eslint-disable-line react-hooks/exhaustive-deps
  const [more, setMore] = useState(false);
  const g = more ? good : good.slice(0, LIMIT);
  const a = more ? avoid : avoid.slice(0, LIMIT);
  const c = more ? consider : consider.slice(0, LIMIT);
  const hasMore = good.length > LIMIT || avoid.length > LIMIT || consider.length > LIMIT;

  return (
    <View style={{ gap: 12 }}>
      <Card tint={TIER_COLORS.great} style={{ gap: 8 }}>
        <Eyebrow color={TIER_COLORS.great}>Việc hợp hôm nay</Eyebrow>
        {g.length ? g.map(it => <Row key={it.code} it={it} color={TIER_COLORS.great} />)
          : <Body size={13}>Hôm nay chưa có việc nào nổi bật — nên làm việc thường ngày.</Body>}
      </Card>
      <Card tint={TIER_COLORS.bad} style={{ gap: 8 }}>
        <Eyebrow color={TIER_COLORS.bad}>{`Nên tránh${avoid.length ? ` (${avoid.length})` : ''}`}</Eyebrow>
        {a.length ? a.map(it => <Row key={it.code} it={it} color={TIER_COLORS.bad} />)
          : <Body size={13}>Không có việc nào bị kỵ nặng hôm nay.</Body>}
      </Card>
      {consider.length > 0 && (
        <Card tint={TIER_COLORS.caution} style={{ gap: 8 }}>
          <Eyebrow color={TIER_COLORS.caution}>{`Cân nhắc / hạn chế (${consider.length})`}</Eyebrow>
          {c.map(it => <Row key={it.code} it={it} color={TIER_COLORS.caution} />)}
        </Card>
      )}
      {hasMore && (
        <Pressable onPress={() => setMore(m => !m)} accessibilityRole="button">
          <Text style={s.more}>{more ? 'Thu gọn' : `Xem đủ (${good.length} hợp · ${avoid.length} nên tránh · ${consider.length} cân nhắc)`}</Text>
        </Pressable>
      )}
      <Text style={s.foot}>Theo Hiệp Kỷ Biện Phương Thư (Trực nghi/kỵ từng việc, thần sát, bậc cát hung) kết hợp điểm ngày{result ? ' và lá số của bạn' : ''}. "Nên tránh" là kỵ nặng; "Cân nhắc" là kỵ nhẹ hơn, có thể làm nếu cần và chuẩn bị kỹ. Chưa xét một số ngày đặc biệt (Âm Dương Đại Hội, Tuế Bạc…). Tham khảo, không phải định mệnh.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  name: { flex: 1, color: COLORS.textPrimary, fontSize: 13.5, lineHeight: 19 },
  note: { fontSize: 12, fontWeight: '700' },
  more: { color: COLORS.gold, fontSize: 13, textAlign: 'center', paddingVertical: 4 },
  foot: { color: COLORS.textMuted, fontSize: 11.5, lineHeight: 16 },
});
