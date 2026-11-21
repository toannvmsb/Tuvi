/**
 * Trang ĐẶT LẠI MẬT KHẨU (web) — mở từ liên kết trong email "Quên mật khẩu": https://tuzi.vn/reset?token=…
 * Người dùng tự đặt mật khẩu mới; chỉ khi đó mật khẩu mới đổi (trước đây ai biết email cũng khóa được tài khoản người khác).
 * Token lấy từ URL rồi XÓA khỏi thanh địa chỉ (App.tsx) để không lọt vào lịch sử/Referer.
 */
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { confirmPasswordReset } from '../lib/auth';
import { COLORS, FONTS, SPACING } from '../constants/theme';

export default function ResetPasswordScreen({ token }: { token: string }) {
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  const goHome = () => { if (Platform.OS === 'web' && typeof window !== 'undefined') window.location.assign('/'); };

  const submit = async () => {
    setErr('');
    if (pw1.length < 6) { setErr('Mật khẩu mới tối thiểu 6 ký tự.'); return; }
    if (pw1 !== pw2) { setErr('Hai lần nhập mật khẩu chưa khớp.'); return; }
    setBusy(true);
    try { await confirmPasswordReset(token, pw1); setDone(true); }
    catch (e: any) { setErr(e?.message || 'Không đặt lại được mật khẩu. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{done ? '✔ Đã đặt lại mật khẩu' : 'Đặt lại mật khẩu'}</Text>
        {done ? (
          <>
            <Text style={styles.body}>Mật khẩu của bạn đã được thay đổi. Hãy đăng nhập bằng mật khẩu mới.</Text>
            <TouchableOpacity style={styles.btn} onPress={goHome} accessibilityRole="button"><Text style={styles.btnTxt}>Về trang đăng nhập</Text></TouchableOpacity>
          </>
        ) : !token ? (
          <>
            <Text style={styles.body}>Liên kết không hợp lệ hoặc đã hết hạn. Hãy quay lại màn Đăng nhập, bấm "Quên mật khẩu?" để nhận liên kết mới.</Text>
            <TouchableOpacity style={styles.btn} onPress={goHome} accessibilityRole="button"><Text style={styles.btnTxt}>Về trang đăng nhập</Text></TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.body}>Nhập mật khẩu mới cho tài khoản của bạn.</Text>
            <TextInput
              style={styles.input} value={pw1} onChangeText={setPw1} placeholder="Mật khẩu mới (≥ 6 ký tự)" placeholderTextColor={COLORS.textMuted}
              secureTextEntry autoCapitalize="none" autoCorrect={false}
            />
            <TextInput
              style={styles.input} value={pw2} onChangeText={setPw2} placeholder="Nhập lại mật khẩu mới" placeholderTextColor={COLORS.textMuted}
              secureTextEntry autoCapitalize="none" autoCorrect={false} onSubmitEditing={submit} returnKeyType="go"
            />
            {!!err && <Text style={styles.err}>{err}</Text>}
            <TouchableOpacity style={[styles.btn, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy} accessibilityRole="button">
              {busy ? <ActivityIndicator color="#1a0a00" /> : <Text style={styles.btnTxt}>Đặt lại mật khẩu</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  card: { width: '100%', maxWidth: 440, backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg, gap: 12 },
  title: { color: COLORS.gold, fontFamily: FONTS.bodyBold, fontSize: 20, textAlign: 'center' },
  body: { color: COLORS.textPrimary, fontFamily: FONTS.body, fontSize: 14.5, lineHeight: 21, textAlign: 'center' },
  input: { backgroundColor: COLORS.surface, color: COLORS.textPrimary, borderRadius: 10, padding: SPACING.md, fontSize: 16, borderWidth: 1, borderColor: COLORS.border },
  err: { color: '#ff8a8a', fontFamily: FONTS.body, fontSize: 13.5, textAlign: 'center' },
  btn: { backgroundColor: COLORS.gold, borderRadius: 12, padding: SPACING.md, alignItems: 'center', marginTop: 4 },
  btnTxt: { color: '#1a0a00', fontFamily: FONTS.bodyBold, fontSize: 16 },
});
