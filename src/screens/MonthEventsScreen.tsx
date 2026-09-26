/**
 * SỰ KIỆN THEO THÁNG [X] — chi tiết các sự kiện thuộc "Sự kiện nổi bật" (featuredGroups) của màn
 * Luận sự kiện năm rơi vào 1 tháng ÂM LỊCH cụ thể, mở từ box "Sự kiện theo tháng". Tính lại
 * computeAnnualPrediction(result, year) tại đây (thay vì truyền mảng sự kiện qua route params) để
 * luôn khớp đúng logic chấm điểm/nhóm hiện hành, không có nguy cơ lệch dữ liệu nếu logic đổi sau.
 */
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import AnnualEventCard from '../components/AnnualEventCard';
import { COLORS } from '../constants/theme';
import { Screen, Card, Body, SectionTitle } from '../ui';
import { computeAnnualPrediction, primaryMonthOf, type ScoredEvent } from '../core/annualEvents';
import type { AstrologyResult } from '../types';

export default function MonthEventsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { result, year, month } = route.params as { result: AstrologyResult; year: number; month: number };

  const events: ScoredEvent[] = useMemo(() => {
    const pred = computeAnnualPrediction(result, year);
    const all = pred.featuredGroups.flatMap(g => g.events);
    return all.filter(e => primaryMonthOf(e) === month).sort((a, b) => b.strength - a.strength);
  }, [result, year, month]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScreenHeader title={`Sự kiện tháng ${month}`} onBack={() => navigation.goBack()} />
      <Screen contentStyle={{ paddingTop: 12 }}>
        {events.length > 0 ? (
          <View style={{ gap: 10 }}>
            <SectionTitle title={`Tháng ${month} (âm lịch)`} sub={`${events.length} sự kiện`} />
            {events.map(e => <AnnualEventCard key={e.eventId} e={e} />)}
          </View>
        ) : (
          <Card><Body>Không có sự kiện nào trong "Sự kiện nổi bật" rơi vào tháng {month} âm lịch năm {year}.</Body></Card>
        )}
      </Screen>
    </View>
  );
}
