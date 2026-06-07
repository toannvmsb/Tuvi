/**
 * Màn Đăng nhập / Đăng ký (Supabase Auth).
 * Hiển thị khi đã cấu hình Supabase và người dùng chưa đăng nhập.
 *
 * LoginScreen render TRƯỚC AppNavigator (App.tsx) nên KHÔNG có navigation context →
 * Chính sách bảo mật / Điều khoản sử dụng hiển thị qua Modal nội bộ (không navigate).
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { signIn, signUp, requestPasswordReset } from '../lib/auth';
import { useAuth } from '../context/AuthContext';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import SimpleMarkdown from '../components/SimpleMarkdown';
import BrandLogo from '../components/BrandLogo';
import { PRIVACY_CONTENT, TERMS_CONTENT } from '../data/legalContent';

export default function LoginScreen() {
  const { refresh } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [legalModal, setLegalModal] = useState<null | 'privacy' | 'terms'>(null);

  const submit = async () => {
    setErr('');
    if (!email.trim() || !pw) { setErr('Vui lòng nhập email và mật khẩu.'); return; }
    if (mode === 'register' && !name.trim()) { setErr('Vui lòng nhập tên hiển thị.'); return; }
    if (mode === 'register' && !agreed) {
      setErr('Vui lòng tích vào ô đồng ý Chính sách bảo mật và Điều khoản sử dụng.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'register') {
        await signUp(email.trim(), pw, name.trim());
        Alert.alert(
          'Đăng ký thành công 🎉',
          'Thông tin đăng nhập đã được gửi vào email của bạn. Vui lòng kiểm tra hộp thư (kể cả mục Spam) rồi đăng nhập.',
        );
        setMode('login');
      } else {
        await signIn(email.trim(), pw);
        await refresh();
      }
    } catch (e: any) {
      setErr(e?.message || 'Có lỗi xảy ra.');
    } finally {
      setBusy(false);
    }
  };

  /** Quên mật khẩu — gửi mật khẩu mới vào email đã đăng ký. */
  const forgotPassword = async () => {
    setErr('');
    if (!email.trim() || !email.includes('@')) {
      setErr('Nhập email đã đăng ký vào ô Email, rồi bấm "Quên mật khẩu".');
      return;
    }
    setBusy(true);
    try {
      await requestPasswordReset(email.trim());
      Alert.alert(
        'Đã gửi yêu cầu',
        'Nếu email này đã đăng ký, chúng tôi đã gửi MẬT KHẨU MỚI vào hộp thư của bạn. Vui lòng kiểm tra (kể cả mục Spam) rồi đăng nhập bằng mật khẩu mới.',
      );
    } catch (e: any) {
      setErr(e?.message || 'Không gửi được. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (m: 'login' | 'register') => {
    setMode(m);
    setErr('');
  };

  // Nút Tạo tài khoản bị khóa khi chưa tích đồng ý (chỉ ở mode đăng ký).
  const submitDisabled = busy || (mode === 'register' && !agreed);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[COLORS.background, '#1a0a3a', COLORS.background]} style={styles.bg}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.logoWrap}>
              <BrandLogo size={104} />
              <Text style={styles.appName}>Tử Vi & Bát Tự</Text>
              <Text style={styles.sub}>Đăng nhập để lưu lá số & nội dung đã mở</Text>
            </View>

            <View style={styles.tabs}>
              <TouchableOpacity style={[styles.tab, mode === 'login' && styles.tabActive]} onPress={() => switchMode('login')}>
                <Text style={[styles.tabTxt, mode === 'login' && styles.tabTxtActive]}>Đăng nhập</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tab, mode === 'register' && styles.tabActive]} onPress={() => switchMode('register')}>
                <Text style={[styles.tabTxt, mode === 'register' && styles.tabTxtActive]}>Đăng ký</Text>
              </TouchableOpacity>
            </View>

            {mode === 'register' && (
              <TextInput style={styles.input} value={name} onChangeText={setName}
                placeholder="Tên hiển thị" placeholderTextColor={COLORS.textMuted}
                returnKeyType="next" />
            )}
            <TextInput style={styles.input} value={email} onChangeText={setEmail}
              placeholder="Email" placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none" keyboardType="email-address" autoCorrect={false}
              returnKeyType="next" />
            <TextInput style={styles.input} value={pw} onChangeText={setPw}
              placeholder="Mật khẩu" placeholderTextColor={COLORS.textMuted}
              secureTextEntry autoCapitalize="none"
              returnKeyType={mode === 'login' ? 'go' : 'done'}
              onSubmitEditing={submit} />

            {/* Checkbox đồng ý — chỉ hiện ở mode đăng ký */}
            {mode === 'register' && (
              <TouchableOpacity
                style={styles.agreeRow}
                onPress={() => setAgreed(v => !v)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, agreed && styles.checkboxOn]}>
                  {agreed && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.agreeText}>
                  Tôi đã đọc và đồng ý với{' '}
                  <Text style={styles.link} onPress={() => setLegalModal('privacy')}>Chính sách bảo mật</Text>
                  {' '}và{' '}
                  <Text style={styles.link} onPress={() => setLegalModal('terms')}>Điều khoản sử dụng</Text>
                  {' '}của ứng dụng.
                </Text>
              </TouchableOpacity>
            )}

            {!!err && <Text style={styles.err}>{err}</Text>}

            <TouchableOpacity
              style={[styles.btn, submitDisabled && styles.btnDisabled]}
              onPress={submit}
              disabled={submitDisabled}
              activeOpacity={0.85}
            >
              {busy ? <ActivityIndicator color="#1a0a00" /> : (
                <Text style={styles.btnTxt}>{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</Text>
              )}
            </TouchableOpacity>

            {mode === 'login' && (
              <TouchableOpacity onPress={forgotPassword} disabled={busy} activeOpacity={0.7}>
                <Text style={styles.forgot}>Quên mật khẩu?</Text>
              </TouchableOpacity>
            )}

            {mode === 'login' && (
              <Text style={styles.note}>
                Bằng việc tiếp tục, bạn đồng ý với{' '}
                <Text style={styles.noteLink} onPress={() => setLegalModal('privacy')}>Chính sách bảo mật</Text>
                {' '}&{' '}
                <Text style={styles.noteLink} onPress={() => setLegalModal('terms')}>Điều khoản sử dụng</Text>.
              </Text>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Modal hiển thị Chính sách bảo mật / Điều khoản sử dụng đầy đủ */}
        <Modal
          visible={legalModal !== null}
          animationType="slide"
          onRequestClose={() => setLegalModal(null)}
          transparent={false}
        >
          <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {legalModal === 'privacy' ? 'Chính sách bảo mật' : 'Điều khoản sử dụng'}
              </Text>
              <TouchableOpacity onPress={() => setLegalModal(null)} style={styles.modalClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Text style={styles.modalCloseTxt}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalScroll}>
              <View style={styles.modalCard}>
                <SimpleMarkdown content={legalModal === 'privacy' ? PRIVACY_CONTENT : TERMS_CONTENT} />
              </View>
            </ScrollView>
            {/* Nút tiện: đọc xong → tích đồng ý luôn (chỉ ở mode đăng ký) */}
            {mode === 'register' && (
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalAgreeBtn}
                  onPress={() => { setAgreed(true); setLegalModal(null); }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.modalAgreeTxt}>Tôi đã đọc & đồng ý</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalBackBtn}
                  onPress={() => setLegalModal(null)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.modalBackTxt}>Đóng</Text>
                </TouchableOpacity>
              </View>
            )}
          </SafeAreaView>
        </Modal>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  bg: { flex: 1 },
  scroll: { padding: SPACING.xl, gap: SPACING.md, flexGrow: 1, justifyContent: 'center' },
  logoWrap: { alignItems: 'center', marginBottom: SPACING.lg, gap: 8 },
  appName: { fontSize: FONTS.size.xxl, fontWeight: 'bold', color: COLORS.gold },
  sub: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, textAlign: 'center' },
  tabs: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  tab: { flex: 1, paddingVertical: SPACING.sm, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: COLORS.gold, backgroundColor: COLORS.gold + '11' },
  tabTxt: { color: COLORS.textSecondary, fontWeight: '700', fontSize: FONTS.size.md },
  tabTxtActive: { color: COLORS.gold },
  input: {
    backgroundColor: COLORS.surface, color: COLORS.textPrimary, borderRadius: 8,
    padding: SPACING.md, fontSize: FONTS.size.md, borderWidth: 1, borderColor: COLORS.border,
  },
  agreeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginTop: SPACING.xs },
  checkbox: {
    width: 22, height: 22, borderRadius: 5, borderWidth: 2, borderColor: COLORS.gold,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  checkboxOn: { backgroundColor: COLORS.gold },
  checkmark: { color: '#1a0a00', fontSize: 15, fontWeight: '900', lineHeight: 17 },
  agreeText: { flex: 1, color: COLORS.textSecondary, fontSize: FONTS.size.sm, lineHeight: 20 },
  link: { color: COLORS.gold, fontWeight: '700', textDecorationLine: 'underline' },
  err: { color: COLORS.red, fontSize: FONTS.size.sm },
  btn: { backgroundColor: COLORS.gold, borderRadius: 10, padding: SPACING.md, alignItems: 'center', marginTop: SPACING.sm },
  btnDisabled: { opacity: 0.5 },
  btnTxt: { color: '#1a0a00', fontWeight: '800', fontSize: FONTS.size.lg },
  forgot: { color: COLORS.gold, fontSize: FONTS.size.sm, textAlign: 'center', fontWeight: '700', marginTop: SPACING.xs },
  note: { color: COLORS.textMuted, fontSize: FONTS.size.xs, textAlign: 'center', marginTop: SPACING.sm, lineHeight: 18 },
  noteLink: { color: COLORS.gold, fontWeight: '700', textDecorationLine: 'underline' },

  // Modal pháp lý
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  modalTitle: { color: COLORS.gold, fontSize: FONTS.size.lg, fontWeight: '800', flex: 1 },
  modalClose: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.card,
    alignItems: 'center', justifyContent: 'center',
  },
  modalCloseTxt: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '700' },
  modalScroll: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  modalCard: {
    backgroundColor: COLORS.card, borderRadius: 12,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  modalFooter: {
    flexDirection: 'row', gap: SPACING.sm, padding: SPACING.md,
    borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  modalAgreeBtn: { flex: 1, backgroundColor: COLORS.gold, borderRadius: 10, padding: SPACING.md, alignItems: 'center' },
  modalAgreeTxt: { color: '#1a0a00', fontWeight: '800', fontSize: FONTS.size.md },
  modalBackBtn: { paddingHorizontal: SPACING.lg, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  modalBackTxt: { color: COLORS.textSecondary, fontWeight: '700', fontSize: FONTS.size.md },
});
