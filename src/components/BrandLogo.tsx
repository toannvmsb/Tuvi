/**
 * Logo Tuzi — hiển thị logo đầy đủ (biểu tượng âm dương + chữ "tuzi.vn" +
 * slogan) dạng Ô VUÔNG BO GÓC, nền navy hòa với theme tối của app.
 *
 * KHÔNG clip tròn (sẽ cắt mất chữ "tuzi.vn"). Logo gốc đã có nền navy nên không
 * cần nền trắng; chỉ thêm viền vàng mảnh + glow nhẹ cho khung gọn gàng, sang.
 *
 * Anh đặt file ảnh tại: `assets/logo.jpg` (đúng định dạng gốc — không đổi đuôi).
 */
import React from 'react';
import { View, Image, StyleSheet, ViewStyle } from 'react-native';
import { COLORS } from '../constants/theme';

interface Props {
  size?: number;       // Cạnh ô vuông (mặc định 88)
  border?: boolean;    // Có vẽ viền vàng + glow không
  style?: ViewStyle;
}

export default function BrandLogo({ size = 88, border = true, style }: Props) {
  // Bo góc kiểu "squircle" ~18% cạnh — không cắt chữ, vẫn mềm mại.
  const radius = Math.round(size * 0.18);
  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: radius,
          borderWidth: border ? 1.5 : 0,
          borderColor: border ? COLORS.gold : 'transparent',
          // Glow vàng nhẹ cho nổi trên nền tối, không quá rực.
          shadowColor: COLORS.gold,
          shadowOpacity: border ? 0.3 : 0,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 0 },
          elevation: border ? 6 : 0,
        },
        style,
      ]}
    >
      <Image
        source={require('../../assets/logo.jpg')}
        style={{ width: size, height: size, borderRadius: radius }}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#1a2350',   // navy hợp với nền logo (tránh viền trắng khi bo góc)
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',           // bo góc ảnh bên trong
  },
});
