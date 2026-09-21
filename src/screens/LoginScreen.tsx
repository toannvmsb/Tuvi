/**
 * Màn Chào (Welcome) + Đăng nhập / Đăng ký (Supabase Auth) — giao diện theo thiết kế mới.
 * Hiển thị khi đã cấu hình Supabase và người dùng chưa đăng nhập.
 *
 * LoginScreen render TRƯỚC AppNavigator (App.tsx) nên KHÔNG có navigation context →
 * Chính sách bảo mật / Điều khoản sử dụng hiển thị qua Modal nội bộ (không navigate).
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { signIn, signUp, requestPasswordReset } from '../lib/auth';
import { useAuth } from '../context/AuthContext';
import { COLORS, FONTS } from '../constants/theme';
import SimpleMarkdown from '../components/SimpleMarkdown';
import Icon from '../ui/Icon';
import { WelcomeBackground, WelcomeOrbits } from '../components/WelcomeBackdrop';
import { Segmented } from '../ui';
import { PRIVACY_CONTENT, TERMS_CONTENT } from '../data/legalContent';

/** Kiểm tra định dạng email cơ bản (đủ để chặn email sai trước khi gọi server). */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const isValidEmail = (s: string) => EMAIL_RE.test(s.trim());
const MIN_PW = 6;

type Mode = 'login' | 'register';

export default function LoginScreen() {
  const { refresh } = useAuth();
  const [stage, setStage] = useState<'welcome' | 'form'>('welcome');
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [legalModal, setLegalModal] = useState<null | 'privacy' | 'terms'>(null);

  const submit = async () => {
    setErr('');
    const emailTrim = email.trim();
    if (!emailTrim || !pw) { setErr('Vui lòng nhập email và mật khẩu.'); return; }
    if (!isValidEmail(emailTrim)) {
      setErr('Email không đúng định dạng. Vui lòng nhập email hợp lệ (ví dụ: ten@gmail.com).');
      return;
    }
    if (pw.length < MIN_PW) {
      setErr(`Mật khẩu phải có ít nhất ${MIN_PW} ký tự.`);
      return;
    }
    if (mode === 'register' && pw !== pwConfirm) {
      setErr('Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại.');
      return;
    }
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
    if (!isValidEmail(email)) {
      setErr('Nhập email hợp lệ đã đăng ký vào ô Email, rồi bấm "Quên mật khẩu".');
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

  const switchMode = (m: Mode) => {
    setMode(m);
    setErr('');
    setPwConfirm('');
    setShowPw(false);
    setShowPwConfirm(false);
  };
  const enter = (m: Mode) => { switchMode(m); setStage('form'); };

  // Nút Tạo tài khoản bị khóa khi chưa tích đồng ý (chỉ ở mode đăng ký).
  const submitDisabled = busy || (mode === 'register' && !agreed);

  const bgColors = ['#2B2160', '#15162F', '#0A0B1A'] as const;

  // ── Màn chào (Welcome) ──
  if (stage === 'welcome') {
    return (
      <View style={styles.container}>
        <WelcomeBackground />
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.welcomeTop}>
            <WelcomeOrbits />
            <Image source={require('../../assets/logo.jpg')} style={styles.welcomeLogo} resizeMode="cover" accessibilityLabel="Logo Tuzi.vn" />
          </View>
          <View style={styles.welcomeBottom}>
            <Text style={styles.eyebrow}>TỬ VI · BÁT TỰ</Text>
            <Text style={styles.welcomeQuote}>{'Lá số của riêng bạn,\nđọc bằng dữ kiện, không bằng phán đoán.'}</Text>
            <Text style={styles.welcomeBody}>
              Lập lá số Tử Vi theo Nam Phái Việt Nam, Bát Tự và vận hạn từng năm, từng tháng. Mỗi nhận định đều chỉ rõ dựa trên sao nào, cung nào.
            </Text>
            <TouchableOpacity onPress={() => enter('register')} activeOpacity={0.85} style={{ width: '100%', marginTop: 8 }} accessibilityRole="button">
              <LinearGradient colors={[COLORS.goldLight, COLORS.goldDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryBtn}>
                <Text style={styles.primaryTxt}>Lập lá số của tôi</Text>
                <Icon name="arrow" size={20} color="#1E1230" strokeWidth={2.2} />
              </LinearGradient>
            </TouchableOpacity>
            <View style={styles.haveAccount}>
              <Text style={styles.haveAccountTxt}>Đã có tài khoản?</Text>
              <TouchableOpacity onPress={() => enter('login')} style={styles.haveAccountBtn} accessibilityRole="button">
                <Text style={styles.haveAccountLink}>Đăng nhập</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ── Form Đăng nhập / Đăng ký ──
  const pwField = (
    label: string, value: string, set: (v: string) => void, shown: boolean, toggle: () => void,
    opts: { go?: () => void; right?: React.ReactNode },
  ) => (
    <View style={{ gap: 8 }}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {opts.right}
      </View>
      <View>
        <TextInput
          style={[styles.input, { paddingRight: 52 }]} value={value} onChangeText={set}
          placeholder={label} placeholderTextColor={COLORS.textMuted}
          secureTextEntry={!shown} autoCapitalize="none" autoCorrect={false}
          returnKeyType={opts.go ? 'go' : 'next'} onSubmitEditing={opts.go}
        />
        <TouchableOpacity
          onPress={toggle} style={styles.eyeBtn} activeOpacity={0.7}
          accessibilityRole="button" accessibilityLabel={shown ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        >
          <Icon name={shown ? 'eyeOff' : 'eye'} size={22} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={bgColors} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.topRow}>
              <TouchableOpacity onPress={() => setStage('welcome')} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Quay lại">
                <Icon name="back" size={22} />
              </TouchableOpacity>
              <Image source={require('../../assets/logo.jpg')} style={styles.smallLogo} resizeMode="cover" accessibilityLabel="Logo Tuzi.vn" />
              <View style={{ width: 44 }} />
            </View>

            <View style={{ alignItems: 'center', gap: 6 }}>
              <Text style={styles.title}>{mode === 'login' ? 'Chào mừng trở lại' : 'Tạo tài khoản'}</Text>
              <Text style={styles.sub}>
                {mode === 'login'
                  ? 'Đăng nhập để đồng bộ hồ sơ, lá số và ghi chú của bạn trên mọi thiết bị.'
                  : 'Đăng ký để lưu lá số và nhận xu tặng cho tài khoản mới.'}
              </Text>
            </View>

            <Segmented<Mode>
              options={[{ value: 'login', label: 'Đăng nhập' }, { value: 'register', label: 'Đăng ký' }]}
              value={mode} onChange={switchMode}
            />

            <View style={{ gap: 16 }}>
              {mode === 'register' && (
                <View style={{ gap: 8 }}>
                  <Text style={styles.label}>Tên hiển thị</Text>
                  <TextInput
                    style={styles.input} value={name} onChangeText={setName}
                    placeholder="Tên hiển thị" placeholderTextColor={COLORS.textMuted} returnKeyType="next"
                  />
                </View>
              )}
              <View style={{ gap: 8 }}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input} value={email} onChangeText={setEmail}
                  placeholder="ten@gmail.com" placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="none" keyboardType="email-address" autoCorrect={false} returnKeyType="next"
                />
              </View>

              {pwField('Mật khẩu', pw, setPw, showPw, () => setShowPw(v => !v), {
                go: mode === 'login' ? submit : undefined,
                right: mode === 'login' ? (
                  <TouchableOpacity onPress={forgotPassword} disabled={busy} style={styles.forgotBtn} accessibilityRole="button">
                    <Text style={styles.forgot}>Quên mật khẩu?</Text>
                  </TouchableOpacity>
                ) : undefined,
              })}

              {mode === 'register' && (
                <Text style={[styles.hint, pw.length > 0 && pw.length < MIN_PW && { color: COLORS.red }]}>
                  Mật khẩu tối thiểu {MIN_PW} ký tự{pw.length > 0 && pw.length < MIN_PW ? ` (hiện ${pw.length})` : ''}.
                </Text>
              )}

              {mode === 'register' && pwField('Xác nhận mật khẩu', pwConfirm, setPwConfirm, showPwConfirm, () => setShowPwConfirm(v => !v), { go: submit })}
            </View>

            {mode === 'register' && (
              <TouchableOpacity
                style={styles.agreeRow} onPress={() => setAgreed(v => !v)} activeOpacity={0.7}
                accessibilityRole="checkbox" accessibilityState={{ checked: agreed }}
              >
                <View style={[styles.checkbox, agreed && styles.checkboxOn]}>
                  {agreed && <Icon name="check" size={16} color="#1E1230" strokeWidth={2.6} />}
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
              onPress={submit} disabled={submitDisabled} activeOpacity={0.85}
              style={submitDisabled ? { opacity: 0.5 } : undefined} accessibilityRole="button"
            >
              <LinearGradient colors={[COLORS.goldLight, COLORS.goldDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryBtn}>
                {busy ? <ActivityIndicator color="#1E1230" /> : (
                  <Text style={styles.primaryTxt}>{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {mode === 'login' && (
              <Text style={styles.note}>
                Bằng việc tiếp tục, bạn đồng ý với{' '}
                <Text style={styles.link} onPress={() => setLegalModal('privacy')}>Chính sách bảo mật</Text>
                {' '}&{' '}
                <Text style={styles.link} onPress={() => setLegalModal('terms')}>Điều khoản sử dụng</Text>.
              </Text>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Modal hiển thị Chính sách bảo mật / Điều khoản sử dụng đầy đủ */}
        <Modal visible={legalModal !== null} animationType="slide" onRequestClose={() => setLegalModal(null)} transparent={false}>
          <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {legalModal === 'privacy' ? 'Chính sách bảo mật' : 'Điều khoản sử dụng'}
              </Text>
              <TouchableOpacity
                onPress={() => setLegalModal(null)} style={styles.modalClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel="Đóng"
              >
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
                <TouchableOpacity style={styles.modalAgreeBtn} onPress={() => { setAgreed(true); setLegalModal(null); }} activeOpacity={0.85}>
                  <Text style={styles.modalAgreeTxt}>Tôi đã đọc & đồng ý</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalBackBtn} onPress={() => setLegalModal(null)} activeOpacity={0.85}>
                  <Text style={styles.modalBackTxt}>Đóng</Text>
                </TouchableOpacity>
              </View>
            )}
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const GOLD_LINE = 'rgba(226,194,133,0.28)';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  // Welcome
  welcomeTop: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  // Không gắn shadow/elevation lên chính <Image>: iOS/Android dựng bóng theo khung VUÔNG của ảnh (không theo borderRadius)
  // nên lộ viền chữ nhật quanh logo. Quầng sáng vàng đã có sẵn trong WelcomeOrbits (SVG).
  welcomeLogo: { width: 200, height: 200, borderRadius: 100, borderWidth: 2, borderColor: 'rgba(226,194,133,0.7)' },
  welcomeBottom: { paddingHorizontal: 24, paddingBottom: 24, alignItems: 'center', gap: 14 },
  eyebrow: { fontFamily: FONTS.bodySemi, fontSize: 11, letterSpacing: 2.4, color: COLORS.gold },
  welcomeQuote: { fontFamily: FONTS.displayItalic, fontSize: 28, lineHeight: 33, textAlign: 'center', color: COLORS.textPrimary },
  welcomeBody: { fontFamily: FONTS.body, fontSize: 13.5, lineHeight: 21, textAlign: 'center', color: COLORS.textSecondary, maxWidth: 310 },
  haveAccount: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  haveAccountTxt: { fontFamily: FONTS.body, fontSize: 14, color: COLORS.textSecondary },
  haveAccountBtn: { minHeight: 44, justifyContent: 'center' },
  haveAccountLink: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.gold },
  // Form
  scroll: { padding: 20, gap: 20, flexGrow: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(226,194,133,0.2)',
  },
  smallLogo: { width: 64, height: 64, borderRadius: 32, borderWidth: 1.5, borderColor: 'rgba(226,194,133,0.7)' },
  title: { fontFamily: FONTS.display, fontSize: 38, lineHeight: 42, color: COLORS.textPrimary, textAlign: 'center' },
  sub: { fontFamily: FONTS.body, fontSize: 13.5, lineHeight: 21, color: COLORS.textSecondary, textAlign: 'center', maxWidth: 310 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontFamily: FONTS.bodyMedium, fontSize: 12.5, color: '#C4C0D8' },
  input: {
    height: 52, borderRadius: 14, borderWidth: 1, borderColor: GOLD_LINE, backgroundColor: 'rgba(255,255,255,0.06)',
    color: COLORS.textPrimary, paddingHorizontal: 16, fontFamily: FONTS.bodyMedium, fontSize: 16,
  },
  eyeBtn: { position: 'absolute', right: 4, top: 4, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  forgotBtn: { minHeight: 44, justifyContent: 'center' },
  forgot: { fontFamily: FONTS.bodySemi, fontSize: 12.5, color: COLORS.gold },
  hint: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted, marginTop: -8 },
  agreeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  checkbox: {
    width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: COLORS.gold,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  checkboxOn: { backgroundColor: COLORS.gold },
  agreeText: { flex: 1, fontFamily: FONTS.body, color: COLORS.textSecondary, fontSize: 13, lineHeight: 20 },
  link: { color: COLORS.gold, fontFamily: FONTS.bodySemi, textDecorationLine: 'underline' },
  err: { fontFamily: FONTS.bodySemi, color: COLORS.red, fontSize: 13, lineHeight: 19 },
  primaryBtn: { height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  primaryTxt: { fontFamily: FONTS.bodyBold, color: '#1E1230', fontSize: 16 },
  note: { fontFamily: FONTS.body, color: COLORS.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18 },

  // Modal pháp lý
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(226,194,133,0.14)',
  },
  modalTitle: { fontFamily: FONTS.display, color: COLORS.textPrimary, fontSize: 24, flex: 1 },
  modalClose: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(226,194,133,0.2)',
  },
  modalCloseTxt: { color: COLORS.textPrimary, fontSize: 18 },
  modalScroll: { padding: 16, paddingBottom: 32 },
  modalCard: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: 'rgba(226,194,133,0.18)',
  },
  modalFooter: {
    flexDirection: 'row', gap: 10, padding: 16,
    borderTopWidth: 1, borderTopColor: 'rgba(226,194,133,0.14)',
  },
  modalAgreeBtn: { flex: 1, minHeight: 52, backgroundColor: COLORS.gold, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  modalAgreeTxt: { fontFamily: FONTS.bodyBold, color: '#1E1230', fontSize: 15 },
  modalBackBtn: { paddingHorizontal: 20, minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: GOLD_LINE, alignItems: 'center', justifyContent: 'center' },
  modalBackTxt: { fontFamily: FONTS.bodySemi, color: COLORS.textSecondary, fontSize: 15 },
});
