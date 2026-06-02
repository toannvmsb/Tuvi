import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';
import LoginScreen from './src/screens/LoginScreen';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { loadLanguage } from './src/i18n';
import { COLORS } from './src/constants/theme';
import StartupProgress from './src/components/StartupProgress';

/**
 * Khởi động: tải ngôn ngữ (core) + kiểm tra phiên/hồ sơ (auth) song song,
 * hiển thị MỘT thanh tiến trình % duy nhất cho tới khi cả hai xong.
 */
function Boot() {
  const { online, ready: authReady, user } = useAuth();
  const [langReady, setLangReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    loadLanguage().then(() => setLangReady(true));
  }, []);

  const done = langReady && authReady;

  if (showSplash) {
    return <StartupProgress done={done} onFinish={() => setShowSplash(false)} />;
  }
  if (online && !user) return <LoginScreen />;
  return <AppNavigator />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor={COLORS.background} />
        <AuthProvider>
          <Boot />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
