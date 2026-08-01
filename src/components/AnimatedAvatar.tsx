/**
 * Nhân vật đại diện — ẢNH 3D THẬT (assets/avatars/, xem avatarCatalog.ts).
 * Đã BỎ hiệu ứng quầng sáng/vòng xoay phía sau theo phản hồi (rối mắt, chiếm
 * diện tích) — chỉ giữ ảnh tự "thở" nhẹ (phóng to/nhỏ rất nhẹ theo nhịp) cho
 * có sức sống mà không tốn thêm không gian. Dùng chung cho Home (to) và bộ
 * chọn ở Tài khoản (nhỏ, tắt animation).
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { getAvatarOption } from '../core/avatarCatalog';

export default function AnimatedAvatar({
  avatarId, size = 64, animated = true,
}: { avatarId?: string | null; size?: number; animated?: boolean }) {
  const opt = getAvatarOption(avatarId);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [animated, pulse]);

  // Biên độ rõ hơn hẳn (trước 1 → 1.04 gần như không thấy được).
  const breathe = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] });

  return (
    <Animated.Image
      source={opt.image}
      resizeMode="contain"
      style={{ width: size, height: size, transform: [{ scale: breathe }] }}
    />
  );
}
