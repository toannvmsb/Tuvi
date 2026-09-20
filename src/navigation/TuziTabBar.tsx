/**
 * Thanh tab dưới cùng của thiết kế mới: Tổng quan · Lá số · Vận hạn · Xem ngày · Menu.
 * Tab đang chọn tô vàng + vạch nhỏ phía trên; nền tối mờ, viền vàng mảnh.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { COLORS, FONTS } from '../constants/theme';
import Icon, { type IconName } from '../ui/Icon';
import { TAB_BAR_HEIGHT } from '../ui/Screen';

const TABS: Record<string, { label: string; icon: IconName }> = {
  Overview: { label: 'Tổng quan', icon: 'spark' },
  ChartHub: { label: 'Lá số', icon: 'chart' },
  VanHub: { label: 'Vận hạn', icon: 'wave' },
  DayView: { label: 'Xem ngày', icon: 'calendar' },
  Menu: { label: 'Menu', icon: 'menu' },
};

export default function TuziTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={['rgba(16,16,38,0.92)', 'rgba(10,11,26,0.99)']}
      style={[styles.bar, { height: TAB_BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom }]}
    >
      {state.routes.map((route, index) => {
        const meta = TABS[route.name];
        if (!meta) return null;
        const focused = state.index === index;
        const color = focused ? COLORS.gold : '#8F8CA8';
        const onPress = () => {
          const ev = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !ev.defaultPrevented) navigation.navigate(route.name as never);
        };
        return (
          <Pressable
            key={route.key} onPress={onPress} style={styles.item}
            accessibilityRole="button" accessibilityState={{ selected: focused }} accessibilityLabel={meta.label}
          >
            <View style={[styles.indicator, { opacity: focused ? 1 : 0 }]} />
            <Icon name={meta.icon} size={24} color={color} />
            <Text style={[styles.label, { color }]}>{meta.label}</Text>
          </Pressable>
        );
      })}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', paddingHorizontal: 8, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: 'rgba(226,194,133,0.18)',
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 44 },
  indicator: { position: 'absolute', top: -9, width: 26, height: 3, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, backgroundColor: COLORS.gold },
  label: { fontFamily: FONTS.bodySemi, fontSize: 11 },
});
