/**
 * Banner "Lưu ý quan trọng" — disclaimer y tế / tài chính / pháp lý.
 *
 * Bắt buộc xuất hiện ở mọi màn có nội dung luận giải (Home, Toàn lá số AI,
 * Đại/Tiểu/Nguyệt Vận, Xem theo ngày). Đây là yêu cầu BẮT BUỘC để app
 * được duyệt qua Apple App Store và Google Play khi thuộc category astrology.
 *
 * Props:
 *   compact = true  → 1 dòng nhỏ, dùng cho footer card / màn nhiều nội dung
 *   compact = false → card đầy đủ với tiêu đề + 2 dòng, dùng ở đầu/giữa
 */
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, FONTS, SPACING } from '../constants/theme';

interface Props {
  compact?: boolean;
  style?: ViewStyle;
}

export default function MedDisclaimer({ compact = false, style }: Props) {
  if (compact) {
    return (
      <Text style={[styles.compactText, style as any]} numberOfLines={3}>
        ⚠ Nội dung chỉ mang tính tham khảo về văn hóa – tín ngưỡng, KHÔNG thay
        thế lời khuyên của bác sĩ, chuyên gia tài chính hay luật sư.
      </Text>
    );
  }
  return (
    <View style={[styles.card, style]}>
      <Text style={styles.title}>⚠ Lưu ý quan trọng</Text>
      <Text style={styles.body}>
        Mọi nội dung luận giải (Tử Vi, Bát Tự, phong thủy, AI…) mang tính
        <Text style={styles.bold}> tham khảo </Text>
        về văn hóa – tín ngưỡng dân gian phương Đông.
      </Text>
      <Text style={styles.body}>
        Ứng dụng <Text style={styles.bold}>KHÔNG</Text> thay thế lời khuyên của:
      </Text>
      <Text style={styles.bullet}>• <Text style={styles.bold}>Bác sĩ / chuyên gia y tế</Text> (khi liên quan sức khỏe, bệnh tật).</Text>
      <Text style={styles.bullet}>• <Text style={styles.bold}>Cố vấn tài chính</Text> (khi liên quan đầu tư, vay nợ, mua bán lớn).</Text>
      <Text style={styles.bullet}>• <Text style={styles.bold}>Luật sư</Text> (khi liên quan hợp đồng, tranh chấp, pháp lý).</Text>
      <Text style={styles.footer}>
        Hãy sử dụng có trách nhiệm và đối chiếu với chuyên gia trước khi ra quyết định trọng đại.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#2a1f0a',
    borderRadius: 10,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#8a6a1a',
    gap: 4,
  },
  title: { color: COLORS.gold, fontSize: FONTS.size.md, fontWeight: '800', marginBottom: 4 },
  body: { color: COLORS.textPrimary, fontSize: FONTS.size.sm, lineHeight: 20 },
  bullet: { color: COLORS.textPrimary, fontSize: FONTS.size.sm, lineHeight: 20, marginLeft: 4 },
  bold: { fontWeight: '800', color: COLORS.goldLight },
  footer: { color: COLORS.textSecondary, fontSize: FONTS.size.xs, fontStyle: 'italic', marginTop: 6 },

  compactText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.size.xs,
    fontStyle: 'italic',
    lineHeight: 16,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    textAlign: 'center',
  },
});
