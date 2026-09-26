import React, { useEffect, useRef, useState } from 'react';
import { Platform, AppState, View, Text, StyleSheet } from 'react-native';
import { syncBroadcasts } from './src/lib/broadcasts';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';
import LoginScreen from './src/screens/LoginScreen';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { loadLanguage } from './src/i18n';
import { COLORS, FONTS, SPACING } from './src/constants/theme';
import StartupProgress from './src/components/StartupProgress';
import WebAlertHost from './src/components/WebAlertHost';
import AiChatBubble from './src/components/AiChatBubble';
import { useAppFonts } from './src/ui/fonts';
import { signInViaPartner } from './src/lib/partnerAuth';

// Web: app fluid — tự fit TRỌN khung màn hình thiết bị (không giới hạn bề rộng).
// Lá số & biểu đồ fill full chiều ngang cửa sổ; cỡ chữ lá số scale theo.
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    body { background: ${COLORS.background}; }
    #root { width: 100%; position: relative; }
    * { -webkit-tap-highlight-color: transparent; }
    input, textarea { font-size: 16px !important; }
  `;
  document.head.appendChild(style);
}

/** Đọc `?partner=...&token=...` từ URL `/embed` (web only) — CHẾ ĐỘ NHÚNG cho đối tác (xem
 *  CLAUDE.md mục "Partner SSO"). Chỉ đọc 1 lần lúc mount, không phải theo dõi thay đổi URL. */
function useEmbedParams(): { partnerCode: string; token: string } | null {
  const [params] = useState(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
    if (window.location.pathname !== '/embed') return null;
    const qs = new URLSearchParams(window.location.search);
    const partnerCode = qs.get('partner');
    const token = qs.get('token');
    return partnerCode && token ? { partnerCode, token } : null;
  });
  return params;
}

function EmbedErrorScreen({ message }: { message: string }) {
  return (
    <View style={embedStyles.screen}>
      <Text style={embedStyles.title}>Không thể vào Tuzi</Text>
      <Text style={embedStyles.msg}>{message}</Text>
    </View>
  );
}

const embedStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, gap: 12 },
  title: { color: COLORS.gold, fontFamily: FONTS.bodyBold, fontSize: FONTS.size.lg },
  msg: { color: COLORS.textPrimary, fontFamily: FONTS.body, fontSize: FONTS.size.md, textAlign: 'center' },
});

/**
 * Khởi động: tải ngôn ngữ (core) + kiểm tra phiên/hồ sơ (auth) song song,
 * hiển thị MỘT thanh tiến trình % duy nhất cho tới khi cả hai xong.
 */
function Boot() {
  const { online, ready: authReady, user } = useAuth();
  const [langReady, setLangReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const fontsReady = useAppFonts();
  const embedParams = useEmbedParams();
  const [ssoPending, setSsoPending] = useState(!!embedParams);
  const [ssoError, setSsoError] = useState('');
  const ssoStarted = useRef(false);

  useEffect(() => {
    loadLanguage().then(() => setLangReady(true));
  }, []);

  // Kéo thông báo mới từ admin: khi app từ background → foreground và mỗi 5 phút.
  useEffect(() => {
    if (!online) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncBroadcasts();
    });
    const timer = setInterval(() => void syncBroadcasts(), 5 * 60 * 1000);
    return () => { sub.remove(); clearInterval(timer); };
  }, [online]);

  // Đăng nhập tự động qua đối tác (chế độ nhúng /embed) — chỉ chạy 1 lần, sau khi auth đã sẵn
  // sàng và CHƯA có user (đã có session sẵn, vd tải lại trang, thì khỏi cần SSO lại).
  useEffect(() => {
    if (!embedParams || !authReady || ssoStarted.current) return;
    if (user) { setSsoPending(false); return; }
    ssoStarted.current = true;
    let settled = false;
    // An toàn: nếu vì lý do gì đó AuthContext không cập nhật `user` sau khi setSession() xong,
    // không để màn hình kẹt mãi ở thanh tiến trình — rơi về LoginScreen sau 8s.
    const timeout = setTimeout(() => { if (!settled) setSsoPending(false); }, 8000);
    signInViaPartner(embedParams.partnerCode, embedParams.token).then((res) => {
      settled = true;
      clearTimeout(timeout);
      if (res.ok) {
        window.history.replaceState(null, '', '/embed');
        // KHÔNG setSsoPending(false) ở đây — chờ effect dưới bắt `user` cập nhật từ AuthContext,
        // tránh chớp màn LoginScreen 1 nhịp giữa lúc setSession() xong và `user` thực sự cập nhật.
      } else {
        setSsoError(res.message);
        setSsoPending(false);
      }
    });
  }, [embedParams, authReady, user]);

  useEffect(() => {
    if (ssoPending && user) setSsoPending(false);
  }, [user, ssoPending]);

  const done = langReady && authReady && fontsReady && !ssoPending;

  if (showSplash) {
    return <StartupProgress done={done} onFinish={() => setShowSplash(false)} />;
  }
  if (ssoError) return <EmbedErrorScreen message={ssoError} />;
  if (online && !user) return <LoginScreen />;
  return (
    <>
      <AppNavigator />
      {online && user && <AiChatBubble />}
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AuthProvider>
          <Boot />
        </AuthProvider>
        <WebAlertHost />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
