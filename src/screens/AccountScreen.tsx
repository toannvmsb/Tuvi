/**
 * Màn "Thông tin tài khoản" — thay cho Cài đặt cũ.
 * Gồm: lời chào + email + số dư xu; đổi TÊN HIỂN THỊ; đổi MẬT KHẨU; chọn ngôn ngữ;
 * và đăng xuất. (Chế độ khách/offline: chỉ hiện ngôn ngữ + phiên bản.)
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import KeyboardAwareScreen from '../components/KeyboardAwareScreen';
import AnimatedAvatar from '../components/AnimatedAvatar';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { updateDisplayName, updatePassword, deleteMyAccount, requestPartnerUpgrade, confirmPartnerUpgrade } from '../lib/auth';
import { wallet } from '../constants/premium';
import { APP_VERSION, COPYRIGHT } from '../constants/appInfo';
import { AVATAR_OPTIONS } from '../core/avatarCatalog';
import { getSelectedAvatarId, setSelectedAvatarId } from '../lib/avatarPrefs';

export default function AccountScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  // Mở từ lời mời nâng cấp ở Trang chủ → đưa thẻ "Nâng cấp tài khoản" lên đầu trang.
  const focusUpgrade = route.params?.focus === 'upgrade';
  const { online, user, refresh, logout } = useAuth();

  const [name, setName] = useState(user?.displayName || wallet.userName || '');
  const [savingName, setSavingName] = useState(false);

  const [avatarId, setAvatarId] = useState<string | null>(null);
  useEffect(() => { getSelectedAvatarId().then(setAvatarId); }, []);
  const pickAvatar = async (id: string) => {
    setAvatarId(id);
    await setSelectedAvatarId(id);
  };

  const [pwOld, setPwOld] = useState('');
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  // Nâng cấp tài khoản (Partner SSO → email thật + mật khẩu tự đặt).
  const [upgradeStep, setUpgradeStep] = useState<'form' | 'otp'>('form');
  const [upgEmail, setUpgEmail] = useState('');
  const [upgPw1, setUpgPw1] = useState('');
  const [upgPw2, setUpgPw2] = useState('');
  const [upgCode, setUpgCode] = useState('');
  const [upgSending, setUpgSending] = useState(false);
  const [upgConfirming, setUpgConfirming] = useState(false);

  const onRequestUpgrade = async () => {
    const email = upgEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) { Alert.alert('Email chưa hợp lệ', 'Vui lòng nhập email thật của bạn.'); return; }
    if (upgPw1.length < 6) { Alert.alert('Mật khẩu yếu', 'Mật khẩu mới tối thiểu 6 ký tự.'); return; }
    if (upgPw1 !== upgPw2) { Alert.alert('Không khớp', 'Hai lần nhập mật khẩu mới chưa khớp.'); return; }
    setUpgSending(true);
    try {
      await requestPartnerUpgrade(email);
      setUpgradeStep('otp');
      Alert.alert('✓', `Đã gửi mã xác nhận tới ${email}. Mã có hiệu lực 10 phút.`);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không gửi được mã xác nhận.');
    } finally { setUpgSending(false); }
  };

  const onConfirmUpgrade = async () => {
    if (!upgCode.trim()) { Alert.alert('Thiếu mã', 'Vui lòng nhập mã xác nhận đã gửi tới email.'); return; }
    setUpgConfirming(true);
    try {
      const email = await confirmPartnerUpgrade(upgCode, upgPw1);
      setUpgCode(''); setUpgPw1(''); setUpgPw2(''); setUpgEmail(''); setUpgradeStep('form');
      await refresh();
      Alert.alert('🎉 Tài khoản đã được bảo vệ', `Bạn có thể dùng email ${email} và mật khẩu vừa đặt để đăng nhập lại khi cần.`);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không xác nhận được mã.');
    } finally { setUpgConfirming(false); }
  };

  const onSaveName = async () => {
    if (!name.trim()) { Alert.alert('Thiếu tên', 'Vui lòng nhập tên hiển thị.'); return; }
    setSavingName(true);
    try {
      await updateDisplayName(name);
      await refresh();
      Alert.alert('✓', 'Đã cập nhật tên hiển thị.');
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không cập nhật được tên.');
    } finally { setSavingName(false); }
  };

  const onSavePassword = async () => {
    if (!pwOld) { Alert.alert('Thiếu mật khẩu cũ', 'Vui lòng nhập mật khẩu hiện tại để xác thực.'); return; }
    if (pw1.length < 6) { Alert.alert('Mật khẩu yếu', 'Mật khẩu mới tối thiểu 6 ký tự.'); return; }
    if (pw1 === pwOld) { Alert.alert('Trùng mật khẩu', 'Mật khẩu mới phải khác mật khẩu cũ.'); return; }
    if (pw1 !== pw2) { Alert.alert('Không khớp', 'Hai lần nhập mật khẩu mới chưa khớp.'); return; }
    setSavingPw(true);
    try {
      await updatePassword(pwOld, pw1);
      setPwOld(''); setPw1(''); setPw2('');
      Alert.alert('✓', 'Đã đổi mật khẩu.');
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không đổi được mật khẩu.');
    } finally { setSavingPw(false); }
  };

  const [deleting, setDeleting] = useState(false);
  /** Xóa tài khoản: 2 bước xác nhận (giải thích hậu quả → xác nhận cuối) rồi RPC + đăng xuất. */
  const onDeleteAccount = () => {
    Alert.alert(
      'Xóa tài khoản?',
      'Toàn bộ hồ sơ, lá số, ghi chú, việc, lịch sử giao dịch và số xu còn lại sẽ bị xóa vĩnh viễn. Thao tác này không thể hoàn tác.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Tiếp tục', style: 'destructive',
          onPress: () => Alert.alert('Xác nhận lần cuối', 'Bạn thật sự muốn xóa vĩnh viễn tài khoản này?', [
            { text: 'Không xóa', style: 'cancel' },
            {
              text: 'Xóa vĩnh viễn', style: 'destructive',
              onPress: async () => {
                setDeleting(true);
                try {
                  await deleteMyAccount();
                  Alert.alert('Đã xóa tài khoản', 'Cảm ơn bạn đã sử dụng Tuzi.');
                  await logout();
                } catch (e: any) {
                  Alert.alert('Không xóa được', e?.message || 'Vui lòng thử lại sau hoặc liên hệ support@tuzi.vn.');
                } finally { setDeleting(false); }
              },
            },
          ]),
        },
      ],
    );
  };

  const onLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const upgradeCard = online && user?.isPartnerAccount ? (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>🔐 Bảo vệ tài khoản</Text>
      <Text style={styles.note}>
        Thêm email thật và đặt mật khẩu để khôi phục tài khoản khi cần, không mất lá số, số xu nếu đổi điện thoại
        hoặc cài lại ứng dụng. Bạn vẫn dùng Tuzi như hiện tại; dữ liệu hiện có được giữ nguyên.
      </Text>
      {upgradeStep === 'form' ? (
        <>
          <TextInput
            style={styles.input}
            value={upgEmail}
            onChangeText={setUpgEmail}
            placeholder="Email thật của bạn"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="email-address" autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            value={upgPw1}
            onChangeText={setUpgPw1}
            placeholder="Mật khẩu muốn đặt (≥ 6 ký tự)"
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            value={upgPw2}
            onChangeText={setUpgPw2}
            placeholder="Nhập lại mật khẩu"
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry autoCapitalize="none"
          />
          <TouchableOpacity style={styles.btn} onPress={onRequestUpgrade} disabled={upgSending} activeOpacity={0.85}>
            {upgSending ? <ActivityIndicator color="#1a0a00" /> : <Text style={styles.btnText}>Gửi mã xác nhận</Text>}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.note}>Mã xác nhận đã gửi tới {upgEmail}, hết hạn sau 10 phút.</Text>
          <TextInput
            style={styles.input}
            value={upgCode}
            onChangeText={setUpgCode}
            placeholder="Mã xác nhận (6 số)"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="number-pad"
          />
          <TouchableOpacity style={styles.btn} onPress={onConfirmUpgrade} disabled={upgConfirming} activeOpacity={0.85}>
            {upgConfirming ? <ActivityIndicator color="#1a0a00" /> : <Text style={styles.btnText}>Xác nhận &amp; Hoàn tất</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setUpgradeStep('form'); setUpgCode(''); }} activeOpacity={0.7}>
            <Text style={styles.linkText}>Đổi email khác</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  ) : null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="Thông tin tài khoản" onBack={() => navigation.goBack()} />
      <KeyboardAwareScreen contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {focusUpgrade && upgradeCard}

        {/* Hồ sơ */}
        <View style={styles.card}>
          <Text style={styles.greeting}>Xin chào{user?.displayName ? ` - ${user.displayName}` : (wallet.userName ? ` - ${wallet.userName}` : '')} 👋</Text>
          {online && user?.email ? (
            <Text style={styles.sub}>
              {user.isPartnerAccount ? '🔗 Đã liên kết qua đối tác' : `📧 ${user.email}`}
            </Text>
          ) : null}
          <Text style={styles.sub}>💰 Số dư: <Text style={styles.gold}>{wallet.balance.toLocaleString('vi-VN')} xu</Text></Text>
          {!online && (
            <Text style={styles.note}>Đang ở chế độ khách (offline). Đăng nhập để đồng bộ tài khoản, đổi tên & mật khẩu.</Text>
          )}
        </View>

        {/* Nhân vật đại diện */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🧿 Nhân vật đại diện</Text>
          <Text style={styles.note}>Hiện ở đầu trang chủ, bên cạnh lời chào của bạn.</Text>
          <View style={styles.avatarGrid}>
            {AVATAR_OPTIONS.map(a => (
              <TouchableOpacity
                key={a.id}
                style={[styles.avatarCell, avatarId === a.id && styles.avatarCellActive]}
                onPress={() => pickAvatar(a.id)}
                activeOpacity={0.8}
              >
                <AnimatedAvatar avatarId={a.id} size={54} animated={false} />
                <Text style={[styles.avatarLabel, avatarId === a.id && styles.avatarLabelActive]} numberOfLines={1}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {online && user && (
          <>
            {/* Đổi tên hiển thị */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>✏️ Tên hiển thị</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Tên hiển thị"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="words"
              />
              <TouchableOpacity style={styles.btn} onPress={onSaveName} disabled={savingName} activeOpacity={0.85}>
                {savingName ? <ActivityIndicator color="#1a0a00" /> : <Text style={styles.btnText}>Lưu tên hiển thị</Text>}
              </TouchableOpacity>
            </View>

            {/* Đổi mật khẩu — không áp dụng cho tài khoản vào qua đối tác (chưa có mật khẩu cũ) */}
            {!user.isPartnerAccount && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>🔑 Đổi mật khẩu</Text>
                <TextInput
                  style={styles.input}
                  value={pwOld}
                  onChangeText={setPwOld}
                  placeholder="Mật khẩu hiện tại"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry autoCapitalize="none"
                />
                <TextInput
                  style={styles.input}
                  value={pw1}
                  onChangeText={setPw1}
                  placeholder="Mật khẩu mới (≥ 6 ký tự, khác mật khẩu cũ)"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry autoCapitalize="none"
                />
                <TextInput
                  style={styles.input}
                  value={pw2}
                  onChangeText={setPw2}
                  placeholder="Nhập lại mật khẩu mới"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry autoCapitalize="none"
                />
                <TouchableOpacity style={styles.btn} onPress={onSavePassword} disabled={savingPw} activeOpacity={0.85}>
                  {savingPw ? <ActivityIndicator color="#1a0a00" /> : <Text style={styles.btnText}>Đổi mật khẩu</Text>}
                </TouchableOpacity>
              </View>
            )}

            {/* Nâng cấp tài khoản — chỉ hiện cho user vào qua đối tác (Partner SSO); khi mở từ lời mời nó nằm ĐẦU trang (xem upgradeCard). */}
            {!focusUpgrade && upgradeCard}
          </>
        )}

        {/* Đăng xuất */}
        {online && user && (
          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.85}>
            <Text style={styles.logoutText}>🚪 Đăng xuất</Text>
          </TouchableOpacity>
        )}

        {/* Xóa tài khoản — bắt buộc theo App Store 5.1.1(v) */}
        {online && user && (
          <View style={styles.dangerBox}>
            <Text style={styles.dangerTitle}>Xóa tài khoản</Text>
            <Text style={styles.dangerText}>
              Xóa vĩnh viễn tài khoản, hồ sơ, lá số, ghi chú và số xu còn lại. Không thể hoàn tác.
            </Text>
            <TouchableOpacity
              style={[styles.dangerBtn, deleting && { opacity: 0.5 }]}
              onPress={onDeleteAccount} disabled={deleting} activeOpacity={0.85}
            >
              <Text style={styles.logoutText}>{deleting ? 'Đang xóa…' : 'Xóa tài khoản của tôi'}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.version}>Phiên bản {APP_VERSION}</Text>
          <Text style={styles.copyright}>{COPYRIGHT}</Text>
        </View>
      </KeyboardAwareScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: {
    padding: SPACING.lg, gap: SPACING.md,
    paddingBottom: Platform.OS === 'web' ? 300 : SPACING.xxl,
  },
  card: {
    backgroundColor: COLORS.card, borderRadius: 12,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.sm,
  },
  greeting: { color: COLORS.gold, fontSize: FONTS.size.lg, fontWeight: '800' },
  sub: { color: COLORS.textPrimary, fontSize: FONTS.size.md },
  gold: { color: COLORS.gold, fontWeight: '800' },
  note: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, fontStyle: 'italic', lineHeight: 20 },
  cardTitle: { color: COLORS.gold, fontSize: FONTS.size.md, fontWeight: '700' },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, justifyContent: 'flex-start' },
  avatarCell: {
    width: 78, alignItems: 'center', gap: 4, padding: SPACING.xs, borderRadius: 10,
    borderWidth: 1, borderColor: 'transparent',
  },
  avatarCellActive: { borderColor: COLORS.gold, backgroundColor: COLORS.gold + '14' },
  avatarLabel: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '600', textAlign: 'center' },
  avatarLabelActive: { color: COLORS.gold, fontWeight: '800' },
  input: {
    backgroundColor: COLORS.surface, color: COLORS.textPrimary,
    borderRadius: 8, padding: SPACING.sm, fontSize: FONTS.size.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  btn: { backgroundColor: COLORS.gold, borderRadius: 8, padding: SPACING.sm, alignItems: 'center' },
  btnText: { color: '#1a0a00', fontWeight: '800', fontSize: FONTS.size.md },
  linkText: { color: COLORS.gold, fontSize: FONTS.size.sm, fontWeight: '700', textAlign: 'center' },
  langRow: { flexDirection: 'row', gap: SPACING.sm },
  langBtn: {
    flex: 1, padding: SPACING.sm, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  langBtnActive: { backgroundColor: COLORS.gold + '22', borderColor: COLORS.gold },
  langBtnText: { color: COLORS.textSecondary, fontSize: FONTS.size.sm },
  langBtnTextActive: { color: COLORS.gold, fontWeight: '600' },
  logoutBtn: {
    borderWidth: 1, borderColor: COLORS.red, borderRadius: 10,
    padding: SPACING.md, alignItems: 'center',
  },
  logoutText: { color: COLORS.red, fontSize: FONTS.size.md, fontWeight: '800' },
  dangerBox: {
    gap: SPACING.sm, padding: SPACING.md, borderRadius: 14,
    backgroundColor: 'rgba(231,123,107,0.07)', borderWidth: 1, borderColor: 'rgba(231,123,107,0.3)',
  },
  dangerTitle: { color: COLORS.red, fontSize: FONTS.size.md, fontWeight: '800' },
  dangerText: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, lineHeight: 20 },
  dangerBtn: { borderWidth: 1, borderColor: COLORS.red, borderRadius: 10, padding: SPACING.md, alignItems: 'center' },
  footer: { alignItems: 'center', marginTop: SPACING.lg, gap: 2 },
  version: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, fontWeight: '700' },
  copyright: { color: COLORS.textMuted, fontSize: FONTS.size.xs, textAlign: 'center' },
});
