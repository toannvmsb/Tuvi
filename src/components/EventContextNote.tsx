/**
 * Dòng nhắc "Hoàn cảnh của bạn" — dẫn tới form 28 cờ để ẩn các sự kiện không áp dụng (đang có đôi? có con? đi làm?…).
 * Dùng ở Luận sự kiện năm, Nghiệm quá khứ, Luận tương lai. Cờ lưu cục bộ theo lá số (lib/eventContext).
 */
import React from 'react';
import { Pressable, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../constants/theme';
import { Card } from '../ui';
import { answeredCount, CONTEXT_KEYS } from '../lib/eventContext';
import type { AstrologyResult } from '../types';
import type { EventContextFlags } from '../core/annualEvents/applicability';

export default function EventContextNote({ result, ctx, past }: { result: AstrologyResult; ctx: EventContextFlags; past?: boolean }) {
  const navigation = useNavigation<any>();
  const n = answeredCount(ctx);
  return (
    <Pressable onPress={() => navigation.navigate('EventContext', { result })} accessibilityRole="button" accessibilityLabel="Chỉnh hoàn cảnh của bạn">
      <Card style={{ gap: 3, paddingVertical: 10 }}>
        <Text style={{ color: COLORS.goldLight, fontSize: 13, fontWeight: '600' }}>Hoàn cảnh của bạn: đã khai {n}/{CONTEXT_KEYS.length} · Chỉnh ›</Text>
        <Text style={{ color: COLORS.textSecondary, fontSize: 12, lineHeight: 17 }}>
          {past
            ? 'Mục nào khai “không” thì sự kiện tương ứng được ẩn. Hoàn cảnh là của HIỆN TẠI nên có thể chưa đúng với các năm đã qua.'
            : 'Mục nào khai “không” (chưa có con, chưa có đôi, không đi làm…) thì sự kiện tương ứng được ẩn khỏi danh sách.'}
        </Text>
      </Card>
    </Pressable>
  );
}
