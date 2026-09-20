/**
 * MENU (tab cuối) — thẻ hồ sơ + số dư xu, rồi các nhóm: Cá nhân hóa · Tài khoản · Ứng dụng · Hỗ trợ.
 * Thay cho HeaderMenuButton ở các màn chính; các màn con vẫn dùng HeaderMenuButton cũ.
 */
import { formatXu } from '../lib/format';
import React from 'react';
import { View, Text, Pressable, StyleSheet, Alert, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONTS } from '../constants/theme';
import { Screen, Card, Display, Body, GoldButton } from '../ui';
import Icon, { type IconName } from '../ui/Icon';
import { useAuth } from '../context/AuthContext';
import { wallet } from '../constants/premium';
import { APP_VERSION } from '../constants/appInfo';

type Item = { icon: IconName; label: string; sub?: string; color?: string; onPress: () => void };

function Group({ title, items }: { title: string; items: Item[] }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.groupTitle}>{title.toUpperCase()}</Text>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {items.map((it, i) => {
          const c = it.color ?? COLORS.textSecondary;
          return (
            <Pressable key={it.label} onPress={it.onPress} style={[s.row, i > 0 && s.rowBorder]} accessibilityRole="button">
              <View style={[s.rowIcon, { backgroundColor: c + '22' }]}><Icon name={it.icon} size={20} color={c} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>{it.label}</Text>
                {it.sub ? <Text style={s.rowSub}>{it.sub}</Text> : null}
              </View>
              <Icon name="chev" size={16} color={COLORS.textMuted} />
            </Pressable>
          );
        })}
      </Card>
    </View>
  );
}

export default function MenuScreen() {
  const navigation = useNavigation<any>();
  const { online, user, logout } = useAuth();
  const name = user?.displayName || wallet.userName || 'Tuzi';
  const go = (route: string, params?: object) => () => navigation.navigate(route, params);

  const onLogout = () => Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
    { text: 'Hủy', style: 'cancel' },
    { text: 'Đăng xuất', style: 'destructive', onPress: () => logout() },
  ]);

  return (
    <Screen tabBarSpace>
      <Display size={34}>Menu</Display>

      <Pressable onPress={go('Account')} accessibilityRole="button" accessibilityLabel="Tài khoản">
        <Card hero style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 }}>
          <View style={s.avatar}><Text style={s.avatarTxt}>{name.slice(0, 1).toUpperCase()}</Text></View>
          <View style={{ flex: 1 }}>
            <Display size={26}>{name}</Display>
            <Body size={12.5}>{user?.email ?? (online ? '' : 'Chế độ ngoại tuyến')}</Body>
          </View>
          <Icon name="chev" size={18} color={COLORS.gold} />
        </Card>
      </Pressable>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable style={s.balance} onPress={go('Wallet')} accessibilityRole="button" accessibilityLabel="Ví xu">
          <Icon name="coin" size={24} color={COLORS.gold} />
          <View>
            <Text style={s.balanceNum}>{formatXu(wallet.balance)} xu</Text>
            <Text style={s.balanceSub}>Số dư ví</Text>
          </View>
        </Pressable>
        <GoldButton label="Nạp xu" onPress={go('Wallet')} style={{ minWidth: 110 }} />
      </View>

      <Group title="Cá nhân hóa" items={[
        { icon: 'user', label: 'Lá số đã lưu', sub: 'Quản lý và gắn hồ sơ của tôi', color: COLORS.gold, onPress: go('MyCharts') },
        { icon: 'compare', label: 'Tương hợp', sub: 'So sánh hai lá số', color: COLORS.purple, onPress: go('CompareCharts', {}) },
        { icon: 'user', label: 'Chân dung tương hợp', sub: 'AI vẽ người hợp với bạn (từ cung Phu Thê)', color: COLORS.red, onPress: go('Portrait') },
        { icon: 'note', label: 'Ghi chú', sub: 'Ghi chú nhanh gắn theo ngày', color: COLORS.blue, onPress: go('Notes') },
        { icon: 'event', label: 'Việc & Mục tiêu', sub: 'Danh sách việc và mục tiêu của bạn', color: COLORS.green, onPress: go('Tasks') },
      ]} />
      <Group title="Tài khoản" items={[
        { icon: 'coin', label: 'Ví xu và lịch sử', sub: 'Nạp xu, lịch sử giao dịch', color: COLORS.gold, onPress: go('Wallet') },
        { icon: 'gift', label: 'Ưu đãi', sub: 'Mã quà tặng, khuyến mãi', color: COLORS.red, onPress: go('Promotions') },
        { icon: 'bell', label: 'Thông báo', sub: 'Nhắc nhở, tin từ Tuzi', color: COLORS.blue, onPress: go('Notifications') },
      ]} />
      {/* Tạm ẩn nhóm "Ứng dụng" (Cài đặt) — chưa bổ sung chức năng chi tiết. Route Settings vẫn còn. */}
      <Group title="Hỗ trợ" items={[
        { icon: 'info', label: 'Về Tuzi', sub: `Phiên bản ${APP_VERSION}`, onPress: go('About') },
        { icon: 'doc', label: 'Điều khoản sử dụng', onPress: go('Terms') },
        { icon: 'shield', label: 'Chính sách quyền riêng tư', onPress: go('Privacy') },
        { icon: 'mail', label: 'Liên hệ hỗ trợ', sub: 'support@tuzi.vn', onPress: () => { void Linking.openURL('mailto:support@tuzi.vn'); } },
      ]} />

      {online && (
        <Pressable style={s.logout} onPress={onLogout} accessibilityRole="button">
          <Icon name="logout" size={20} color="#F3B0A5" />
          <Text style={s.logoutTxt}>Đăng xuất</Text>
        </Pressable>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  groupTitle: { fontFamily: FONTS.bodySemi, fontSize: 11, letterSpacing: 1.8, color: COLORS.textMuted, paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 60, paddingHorizontal: 14, paddingVertical: 8 },
  rowBorder: { borderTopWidth: 1, borderTopColor: 'rgba(226,194,133,0.1)' },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontFamily: FONTS.bodySemi, fontSize: 14.5, color: COLORS.textPrimary },
  rowSub: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.goldDeep, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontFamily: FONTS.bodyBold, fontSize: 22, color: '#1E1230' },
  balance: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 18,
    backgroundColor: 'rgba(226,194,133,0.12)', borderWidth: 1, borderColor: 'rgba(226,194,133,0.34)',
  },
  balanceNum: { fontFamily: FONTS.bodyBold, fontSize: 18, color: '#F5E0AE' },
  balanceSub: { fontFamily: FONTS.body, fontSize: 11.5, color: COLORS.textSecondary },
  logout: {
    minHeight: 52, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(231,123,107,0.4)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  logoutTxt: { fontFamily: FONTS.bodySemi, fontSize: 15, color: '#F3B0A5' },
});
