import React from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';

import type { RootStackParamList, MainTabParamList, AstrologyResult } from '../types';
import HomeScreen from '../screens/HomeScreen';
import InputScreen from '../screens/InputScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AccountScreen from '../screens/AccountScreen';
import TuViChartScreen from '../screens/TuViChartScreen';
import BatTuScreen from '../screens/BatTuScreen';
import PalaceDetailScreen from '../screens/PalaceDetailScreen';
import FullChartAIScreen from '../screens/FullChartAIScreen';
import NguyetVanScreen from '../screens/NguyetVanScreen';
import DailyScreen from '../screens/DailyScreen';
import DayPickerScreen from '../screens/DayPickerScreen';
import PrivacyScreen from '../screens/PrivacyScreen';
import TermsScreen from '../screens/TermsScreen';
import WalletScreen from '../screens/WalletScreen';
import MyChartsScreen from '../screens/MyChartsScreen';
import AboutScreen from '../screens/AboutScreen';
import DaiVanScreen from '../screens/DaiVanScreen';
import TieuVanScreen from '../screens/TieuVanScreen';
import WealthChartScreen from '../screens/WealthChartScreen';
import { COLORS } from '../constants/theme';
import { t } from '../i18n';

// Ref điều hướng toàn cục — dùng cho menu trong ScreenHeader để điều hướng
// độc lập với context navigator hiện tại (tránh stale parent gây kẹt nút back).
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    TuViChart: '☯', BatTu: '🧭', DaiVan: '🔄', TieuVan: '📅', NguyetVan: '🌙',
  };
  return (
    <Text style={{ fontSize: 26, opacity: focused ? 1 : 0.5 }}>
      {icons[name] ?? '●'}
    </Text>
  );
}

function MainTabs({ route }: any) {
  const result: AstrologyResult = route.params.result;
  return (
    <Tab.Navigator
      screenOptions={({ route: tabRoute }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          height: 70,
          paddingTop: 6,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontSize: 14,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarActiveTintColor: COLORS.gold,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarIcon: ({ focused }) => <TabIcon name={tabRoute.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="TuViChart" component={TuViChartScreen}
        initialParams={{ result }} options={{ tabBarLabel: t('tabTuVi') }} />
      <Tab.Screen name="BatTu" component={BatTuScreen}
        initialParams={{ result }} options={{ tabBarLabel: t('tabBatTu') }} />
      <Tab.Screen name="DaiVan" component={DaiVanScreen}
        initialParams={{ result }} options={{ tabBarLabel: t('tabDaiVan') }} />
      <Tab.Screen name="TieuVan" component={TieuVanScreen}
        initialParams={{ result }} options={{ tabBarLabel: t('tabTieuVan') }} />
      <Tab.Screen name="NguyetVan" component={NguyetVanScreen}
        initialParams={{ result }} options={{ tabBarLabel: 'Nguyệt Vận' }} />
    </Tab.Navigator>
  );
}

// Tên hiển thị tiếng Việt cho tiêu đề tab Chrome (document.title) theo từng route.
// Mặc định React Navigation lấy tên route (vd "BatTu") → map sang tên đẹp.
const ROUTE_TITLES: Record<string, string> = {
  Home: 'Trang chủ',
  Input: 'Lập lá số',
  MainTabs: 'Lá số Tử Vi',
  TuViChart: 'Lá số Tử Vi',
  BatTu: 'Bát Tự',
  DaiVan: 'Đại Vận',
  TieuVan: 'Tiểu Vận',
  NguyetVan: 'Nguyệt Vận',
  PalaceDetail: 'Chi tiết cung',
  FullChartAI: 'Phân tích AI toàn lá số',
  WealthChart: 'Tài Lộc',
  DailyView: 'Xem theo ngày',
  DayPicker: 'Xem ngày tốt',
  MyCharts: 'Lá số đã lưu',
  Wallet: 'Nạp xu',
  Account: 'Tài khoản',
  Settings: 'Cài đặt',
  Privacy: 'Thông tin bảo mật',
  Terms: 'Điều khoản sử dụng',
  About: 'Giới thiệu',
};

const BRAND = 'Tuzi — Tử Vi & Bát Tự';

export default function AppNavigator() {
  return (
    <NavigationContainer
      ref={navigationRef}
      documentTitle={{
        // Tiêu đề tab Chrome: "Tuzi - <Tên chức năng>". Home/không xác định → tên brand đầy đủ.
        formatter: (options, route) => {
          const friendly = (options as any)?.title ?? (route ? ROUTE_TITLES[route.name] : undefined);
          if (!friendly || route?.name === 'Home') return BRAND;
          return `Tuzi - ${friendly}`;
        },
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.surface },
          headerTintColor: COLORS.gold,
          headerTitleStyle: { fontWeight: 'bold', color: COLORS.textPrimary },
          headerBackTitle: 'Quay lại',
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        {/* TẤT CẢ màn đều ẩn native header → dùng ScreenHeader (back trong nội dung)
            để nút Quay lại luôn nhận touch, tránh lỗi đóng băng header native iOS
            sau khi điều hướng qua menu. */}
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Input" component={InputScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Account" component={AccountScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="PalaceDetail" component={PalaceDetailScreen} options={{ headerShown: false }} />
        <Stack.Screen name="FullChartAI" component={FullChartAIScreen} options={{ headerShown: false }} />
        <Stack.Screen name="WealthChart" component={WealthChartScreen} options={{ headerShown: false }} />
        <Stack.Screen name="DailyView" component={DailyScreen} options={{ headerShown: false }} />
        <Stack.Screen name="DayPicker" component={DayPickerScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MyCharts" component={MyChartsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Wallet" component={WalletScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Privacy" component={PrivacyScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Terms" component={TermsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="About" component={AboutScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
