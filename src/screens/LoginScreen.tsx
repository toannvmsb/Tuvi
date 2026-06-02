/**
 * Màn Đăng nhập / Đăng ký (Supabase Auth).
 * Hiển thị khi đã cấu hình Supabase và người dùng chưa đăng nhập.
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { signIn, signUp } from '../lib/auth';
import { useAuth } from '../context/AuthContext';
import { COLORS, FONTS, SPACING } from '../constants/theme';

export default function LoginScreen() {
  const { refresh } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    setErr('');
    if (!email.trim() || !pw) { setErr('Vui lòng nhập email và mật khẩu.'); return; }
    if (mode === 'register' && !name.trim()) { setErr('Vui lòng nhập tên hiển thị.'); return; }
    setBusy(true);
    try {
      if (mode === 'register') {
        await signUp(email.trim(), pw, name.trim());
        Alert.alert('Đăng ký thành công', 'Nếu dự án bật xác minh email, vui lòng kiểm tra hộp thư rồi đăng nhập.');
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

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[COLORS.background, '#1a0a3a', COLORS.background]} style={styles.bg}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.logoWrap}>
              <Text style={styles.logo}>☯</Text>
              <Text style={styles.appName}>Tử Vi & Bát Tự</Text>
              <Text style={styles.sub}>Đăng nhập để lưu lá số & nội dung đã mở</Text>
            </View>

            <View style={styles.tabs}>
              <TouchableOpacity style={[styles.tab, mode === 'login' && styles.tabActive]} onPress={() => setMode('login')}>
                <Text style={[styles.tabTxt, mode === 'login' && styles.tabTxtActive]}>Đăng nhập</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tab, mode === 'register' && styles.tabActive]} onPress={() => setMode('register')}>
                <Text style={[styles.tabTxt, mode === 'register' && styles.tabTxtActive]}>Đăng ký</Text>
              </TouchableOpacity>
            </View>

            {mode === 'register' && (
              <TextInput style={styles.input} value={name} onChangeText={setName}
                placeholder="Tên hiển thị" placeholderTextColor={COLORS.textMuted} />
            )}
            <TextInput style={styles.input} value={email} onChangeText={setEmail}
              placeholder="Email" placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none" keyboardType="email-address" autoCorrect={false} />
            <TextInput style={styles.input} value={pw} onChangeText={setPw}
              placeholder="Mật khẩu" placeholderTextColor={COLORS.textMuted}
              secureTextEntry autoCapitalize="none" />

            {!!err && <Text style={styles.err}>{err}</Text>}

            <TouchableOpacity style={[styles.btn, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy} activeOpacity={0.85}>
              {busy ? <ActivityIndicator color="#1a0a00" /> : (
                <Text style={styles.btnTxt}>{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.note}>
              Bằng việc tiếp tục, bạn đồng ý với Chính sách bảo mật của ứng dụng.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  bg: { flex: 1 },
  scroll: { padding: SPACING.xl, gap: SPACING.md, flexGrow: 1, justifyContent: 'center' },
  logoWrap: { alignItems: 'center', marginBottom: SPACING.lg, gap: 6 },
  logo: { fontSize: 56, color: COLORS.gold },
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
  err: { color: COLORS.red, fontSize: FONTS.size.sm },
  btn: { backgroundColor: COLORS.gold, borderRadius: 10, padding: SPACING.md, alignItems: 'center', marginTop: SPACING.sm },
  btnTxt: { color: '#1a0a00', fontWeight: '800', fontSize: FONTS.size.lg },
  note: { color: COLORS.textMuted, fontSize: FONTS.size.xs, textAlign: 'center', marginTop: SPACING.sm },
});
