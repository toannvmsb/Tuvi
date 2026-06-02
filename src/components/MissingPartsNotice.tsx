/**
 * Thông báo + nút "Lấy lại phần còn thiếu" cho phân tích AI chia nhiều phần.
 * Hiện khi còn phần chưa lấy được kết quả. Bấm lại KHÔNG trừ xu (chỉ gọi lại
 * những prompt chưa có kết quả).
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, FONTS, SPACING } from '../constants/theme';

export default function MissingPartsNotice({
  missing, retrying, onRetry,
}: { missing?: number; retrying?: boolean; onRetry: () => void }) {
  if (!missing || missing <= 0) return null;
  return (
    <View style={styles.box}>
      <Text style={styles.text}>
        ⚠ Kết nối hệ thống đang gián đoạn nên còn <Text style={styles.bold}>{missing}</Text> phần chưa lấy được kết quả.
        Nhấn nút bên dưới để AI phân tích lại các phần còn thiếu — <Text style={styles.bold}>không trừ thêm xu</Text>.
      </Text>
      <TouchableOpacity style={styles.btn} onPress={onRetry} disabled={retrying} activeOpacity={0.85}>
        {retrying ? (
          <View style={styles.row}>
            <ActivityIndicator color={COLORS.gold} size="small" />
            <Text style={styles.btnTxt}>Đang lấy lại…</Text>
          </View>
        ) : (
          <Text style={styles.btnTxt}>🔄 Lấy lại phần còn thiếu (miễn phí)</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: 'rgba(245,185,66,0.10)', borderWidth: 1, borderColor: COLORS.gold,
    borderRadius: 8, padding: SPACING.sm, gap: SPACING.xs, marginTop: SPACING.xs,
  },
  text: { color: COLORS.textPrimary, fontSize: FONTS.size.sm, lineHeight: 20 },
  bold: { color: COLORS.gold, fontWeight: '800' },
  btn: {
    alignSelf: 'flex-start', borderWidth: 1, borderColor: COLORS.gold, borderRadius: 8,
    paddingHorizontal: SPACING.md, paddingVertical: 6, backgroundColor: COLORS.gold + '14',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btnTxt: { color: COLORS.gold, fontSize: FONTS.size.sm, fontWeight: '800' },
});
