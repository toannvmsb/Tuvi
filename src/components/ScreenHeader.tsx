/**
 * Thanh tiêu đề dùng chung cho các màn con (thiết kế mới):
 *  - Safe-area top (không bị che bởi đồng hồ/notch).
 *  - Nút quay lại tròn, viền vàng mảnh (bên trái) — chỉ hiện khi có `onBack`.
 *  - Tiêu đề chữ serif (Cormorant Garamond) ở giữa.
 *  - Không còn nút Menu bên phải (đã có thanh tab dưới cùng); giữ ô trống để tiêu đề luôn cân giữa.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import Icon from '../ui/Icon';

export default function ScreenHeader({
  title, onBack,
}: { title: string; onBack?: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 6 }]}>
      <View style={styles.leftSlot}>
        {onBack ? (
          <Pressable
            onPress={onBack} style={styles.backBtn}
            accessibilityRole="button" accessibilityLabel="Quay lại"
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <Icon name="back" size={22} />
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <View style={styles.rightSlot} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1, borderBottomColor: 'rgba(226,194,133,0.14)',
    zIndex: 50,
  },
  leftSlot: { width: 56, alignItems: 'flex-start' },
  rightSlot: { width: 56, alignItems: 'flex-end' },
  backBtn: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(226,194,133,0.2)',
  },
  title: {
    flex: 1, textAlign: 'center', color: COLORS.textPrimary,
    fontFamily: FONTS.display, fontSize: 24, lineHeight: 28,
  },
});
