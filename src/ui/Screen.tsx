/**
 * Khung màn hình thiết kế mới: nền đêm sao (gradient) + vùng an toàn + cuộn.
 * `tabBarSpace` chừa chỗ cho nút chat nổi "Hỏi Tuzi" (kéo thả được, mount ở App.tsx, có thể nằm
 * đè gần đáy màn hình). KHÔNG cộng thêm khoảng cho chính thanh tab dưới cùng — AppTabs/TuziTabBar
 * không đặt `position: 'absolute'` nên thanh tab đã chiếm không gian layout bình thường, vùng nội
 * dung/cuộn của mỗi tab TỰ ĐỘNG đã ngắn hơn đúng bằng chiều cao thanh tab rồi; cộng thêm
 * TAB_BAR_HEIGHT + insets.bottom ở đây từng gây khoảng trống thừa y hệt chiều cao thanh tab bên
 * dưới nội dung mỗi màn (Trang chính/Tổng quan lá số/Vận hạn/Menu).
 *
 * Dùng KeyboardAwareScreen (thay ScrollView trần) để mọi ô nhập trong các màn dùng Screen (vd ô
 * ghi chú nhanh ở Tổng quan) tự cuộn lên trên bàn phím khi gõ, không bị che — trên web hành vi
 * giữ NGUYÊN như trước (KeyboardAwareScreen tự fallback về KeyboardAvoidingView + ScrollView y hệt
 * cũ ở nhánh web), chỉ NATIVE (iOS/Android) mới đổi sang KeyboardAwareScrollView.
 */
import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';
import KeyboardAwareScreen from '../components/KeyboardAwareScreen';

export const TAB_BAR_HEIGHT = 64;

export default function Screen({
  children, tabBarSpace = false, contentStyle, scroll = true, gap = 18, topOverlay,
}: {
  children: React.ReactNode;
  tabBarSpace?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  scroll?: boolean;
  gap?: number;
  /** Lớp phủ tùy chọn vẽ đè lên nền đêm sao mặc định, chỉ ở phần trên màn (vd nền động theo thời
   *  tiết ở Tổng quan) — không ảnh hưởng các màn khác không truyền prop này. */
  topOverlay?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const bottom = (tabBarSpace ? 72 : insets.bottom + 32);
  const inner = [{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: bottom, gap }, contentStyle];
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <LinearGradient
        colors={['#2B2160', '#15162F', '#0A0B1A']} locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill} pointerEvents="none"
      />
      {topOverlay}
      {scroll ? (
        <KeyboardAwareScreen contentContainerStyle={inner} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {children}
        </KeyboardAwareScreen>
      ) : (
        <View style={[{ flex: 1 }, ...inner]}>{children}</View>
      )}
    </View>
  );
}
