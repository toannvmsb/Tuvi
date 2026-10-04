/**
 * Nút "Luận chi tiết" — đưa người dùng từ các màn tổng quan (Luận sự kiện năm, Nghiệm quá khứ, Luận tương lai)
 * sang màn luận sâu hơn của tầng vận tương ứng: Tiểu vận (cho Luận sự kiện năm) hoặc Đại vận (cho quá khứ / tương lai).
 *  - variant "inline": nút viền vàng nhỏ, cùng kiểu nút "Xuất PDF" để đặt cạnh nhau.
 *  - variant "full": nút vàng toàn chiều ngang ở cuối màn hình.
 */
import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { GoldButton } from '../ui';
import type { AstrologyResult } from '../types';

export default function DetailLinkButton({ result, target, variant = 'full', label = 'Luận chi tiết' }: {
  result: AstrologyResult;
  target: 'TieuVan' | 'DaiVan';
  variant?: 'inline' | 'full';
  label?: string;
}) {
  const navigation = useNavigation<any>();
  const go = () => navigation.navigate('MainTabs', { result, screen: target, params: { result } });

  if (variant === 'full') return <GoldButton label={label} onPress={go} />;
  return (
    <TouchableOpacity style={s.inline} onPress={go} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={label}>
      <Text style={s.inlineTxt}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  // Cùng kích thước/viền với ExportPdfButton để đặt cạnh nhau cho đều.
  inline: {
    marginTop: SPACING.sm, alignSelf: 'flex-start',
    borderWidth: 1, borderColor: COLORS.gold, borderRadius: 8,
    paddingHorizontal: SPACING.md, paddingVertical: 6,
    backgroundColor: COLORS.gold,
  },
  inlineTxt: { color: '#1E1230', fontSize: FONTS.size.sm, fontWeight: '800' },
});
