/**
 * Logo Tuzi — wrap ảnh trong hình tròn có viền vàng và glow nhẹ để
 * ăn nhập theme tím-vàng của app. Phần "page background" trắng quanh
 * yin-yang trong file logo sẽ bị clip bởi borderRadius = size/2.
 *
 * Anh đặt file ảnh tại: `assets/logo.jpg` (đúng định dạng gốc — KHÔNG đổi đuôi .png).
 */
import React from 'react';
import { View, Image, StyleSheet, ViewStyle } from 'react-native';
import { COLORS } from '../constants/theme';

interface Props {
  size?: number;       // Đường kính tổng thể (mặc định 88)
  border?: boolean;    // Có vẽ viền vàng + glow không
  style?: ViewStyle;
}

export default function BrandLogo({ size = 88, border = true, style }: Props) {
  const radius = size / 2;
  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: radius,
          borderWidth: border ? 2 : 0,
          borderColor: border ? COLORS.gold : 'transparent',
          // Soft glow cho ăn nhập theme tối
          shadowColor: COLORS.gold,
          shadowOpacity: border ? 0.45 : 0,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 0 },
          elevation: border ? 8 : 0,
        },
        style,
      ]}
    >
      <Image
        source={require('../../assets/logo.jpg')}
        style={{ width: size - 4, height: size - 4, borderRadius: radius - 2 }}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#fff',           // nền trắng tự nhiên của logo
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',                // clip phần trắng vuông ngoài yin-yang
  },
});
