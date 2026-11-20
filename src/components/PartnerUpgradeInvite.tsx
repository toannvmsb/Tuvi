/**
 * Lời mời nâng cấp tài khoản — chỉ hiện cho user vào Tuzi qua đối tác (isPartnerAccount) và đang online.
 * ĐẶT Ở MÀN MENU (không ở Trang chủ) và dùng lời lẽ trung tính ("bảo vệ tài khoản"): nhiều đối tác không muốn
 * cảm giác Tuzi lôi khách của họ đi chỗ khác.
 * "Nâng cấp ngay" mở màn Tài khoản với thẻ Nâng cấp ở đầu; "Để sau" ẩn một thời gian (xem lib/upgradeInvite).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import {
  EMPTY_INVITE_STATE, afterDismiss, loadInviteState, saveInviteState, shouldShowInvite, type InviteState,
} from '../lib/upgradeInvite';

export default function PartnerUpgradeInvite() {
  const navigation = useNavigation<any>();
  const { online, user } = useAuth();
  const [state, setState] = useState<InviteState | null>(null); // null = chưa đọc xong → chưa hiện (tránh chớp)

  useEffect(() => {
    let alive = true;
    loadInviteState().then(s => { if (alive) setState(s); });
    return () => { alive = false; };
  }, []);

  const later = useCallback(() => {
    const next = afterDismiss(state ?? EMPTY_INVITE_STATE, Date.now());
    setState(next);
    void saveInviteState(next);
  }, [state]);

  if (!online || !user?.isPartnerAccount || state === null || !shouldShowInvite(state, Date.now())) return null;

  return (
    <View style={styles.card} accessibilityRole="summary">
      <Text style={styles.title}>🔐 Bảo vệ tài khoản của bạn</Text>
      <Text style={styles.body}>
        Thêm email và mật khẩu (khoảng 1 phút) để khôi phục tài khoản khi cần và không mất lá số, số xu nếu sau này
        đổi điện thoại hoặc cài lại ứng dụng. Bạn vẫn dùng Tuzi như hiện tại; mọi dữ liệu được giữ nguyên.
      </Text>
      <View style={styles.row}>
        <TouchableOpacity style={styles.primary} onPress={() => navigation.navigate('Account', { focus: 'upgrade' })} activeOpacity={0.85}>
          <Text style={styles.primaryText}>Nâng cấp ngay</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={later} activeOpacity={0.7}>
          <Text style={styles.secondaryText}>Để sau</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(226,194,133,0.10)', borderColor: COLORS.gold, borderWidth: 1, borderRadius: 14,
    padding: SPACING.md, gap: 8,
  },
  title: { color: COLORS.gold, fontFamily: FONTS.bodyBold, fontSize: 16 },
  body: { color: COLORS.textPrimary, fontFamily: FONTS.body, fontSize: 13.5, lineHeight: 20 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 2 },
  primary: { backgroundColor: COLORS.gold, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 18 },
  primaryText: { color: '#1a0a00', fontFamily: FONTS.bodyBold, fontSize: 14.5 },
  secondary: { paddingVertical: 11, paddingHorizontal: 14 },
  secondaryText: { color: COLORS.textSecondary, fontFamily: FONTS.body, fontSize: 14 },
});
