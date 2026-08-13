/**
 * Nút nổi "Lên đầu trang" cho các màn luận giải dài (lá số, Bát Tự, đại/tiểu/
 * nguyệt vận, tài lộc, nhật vận, phân tích toàn lá số, so sánh lá số…). Chỉ
 * hiện khi đã cuộn xuống quá một ngưỡng nhất định — tránh chiếm chỗ khi nội
 * dung còn ngắn hoặc đang ở đầu trang.
 *
 * Đặt ở góc dưới-phải nhưng SÁT ĐÁY màn hình (khác vị trí mặc định ~62% chiều
 * cao của bong bóng "Hỏi Tuzi" nổi toàn app — xem AiChatBubble.tsx) để hạn chế
 * đè lên nhau; "Hỏi Tuzi" có thể kéo thả nên không tránh được 100% mọi lúc.
 */
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

export default function ScrollToTopButton({ visible, onPress }: { visible: boolean; onPress: () => void }) {
  if (!visible) return null;
  return (
    <TouchableOpacity
      style={styles.btn}
      onPress={onPress}
      activeOpacity={0.8}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityLabel="Lên đầu trang"
    >
      <Text style={styles.icon}>↑</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: 'absolute', right: 16, bottom: 20, width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(245,185,66,0.85)', borderWidth: 1, borderColor: COLORS.gold,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 900, elevation: 10,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
  },
  icon: { fontSize: 20, fontWeight: '800', color: '#1a0a00' },
});
