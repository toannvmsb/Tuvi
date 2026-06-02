/**
 * Thanh tiêu đề dùng chung cho các tab màn hình:
 *  - Hỗ trợ safe-area top (không bị che bởi đồng hồ/notch).
 *  - Nút "Quay lại" tùy chọn (bên trái).
 *  - Tiêu đề ở giữa.
 *  - Nút Menu (☰) bên phải — dùng component HeaderMenuButton dùng chung.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import HeaderMenuButton from './HeaderMenuButton';

export default function ScreenHeader({
  title, onBack,
}: { title: string; onBack?: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 6 }]}>
      <View style={styles.leftSlot}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.back} numberOfLines={1}>‹ Quay lại</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <View style={styles.rightSlot}>
        <HeaderMenuButton />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    zIndex: 50,
  },
  leftSlot: { width: 72, alignItems: 'flex-start' },
  rightSlot: { width: 72, alignItems: 'flex-end' },
  back: { color: COLORS.gold, fontSize: FONTS.size.sm, fontWeight: '700' },
  title: { flex: 1, color: COLORS.textPrimary, fontSize: FONTS.size.lg, fontWeight: '800', textAlign: 'center' },
});
