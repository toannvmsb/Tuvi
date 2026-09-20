import React, { useEffect, useState } from 'react';
import { Platform, AppState } from 'react-native';
import { syncBroadcasts } from './src/lib/broadcasts';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';
import LoginScreen from './src/screens/LoginScreen';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { loadLanguage } from './src/i18n';
import { COLORS } from './src/constants/theme';
import StartupProgress from './src/components/StartupProgress';
import WebAlertHost from './src/components/WebAlertHost';
import AiChatBubble from './src/components/AiChatBubble';
import { useAppFonts } from './src/ui/fonts';

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

/**
 * Khởi động: tải ngôn ngữ (core) + kiểm tra phiên/hồ sơ (auth) song song,
 * hiển thị MỘT thanh tiến trình % duy nhất cho tới khi cả hai xong.
 */
function Boot() {
  const { online, ready: authReady, user } = useAuth();
  const [langReady, setLangReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const fontsReady = useAppFonts();

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

  const done = langReady && authReady && fontsReady;

  if (showSplash) {
    return <StartupProgress done={done} onFinish={() => setShowSplash(false)} />;
  }
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
        <StatusBar style="light" backgroundColor={COLORS.background} />
        <AuthProvider>
          <Boot />
        </AuthProvider>
        <WebAlertHost />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
