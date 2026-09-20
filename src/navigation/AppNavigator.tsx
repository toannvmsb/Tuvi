import React, { useEffect } from 'react';
import { NavigationContainer, createNavigationContainerRef, StackActions, CommonActions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RootStackParamList, MainTabParamList, AstrologyResult } from '../types';
import AppTabs from './AppTabs';
import { TuziTabBarView } from './TuziTabBar';
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
import TasksScreen from '../screens/TasksScreen';
import NotesScreen from '../screens/NotesScreen';
import PrivacyScreen from '../screens/PrivacyScreen';
import TermsScreen from '../screens/TermsScreen';
import WalletScreen from '../screens/WalletScreen';
import MyChartsScreen from '../screens/MyChartsScreen';
import CompareChartsScreen from '../screens/CompareChartsScreen';
import AboutScreen from '../screens/AboutScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import PromotionsScreen from '../screens/PromotionsScreen';
import EventDetailScreen from '../screens/EventDetailScreen';
import DaiVanScreen from '../screens/DaiVanScreen';
import TieuVanScreen from '../screens/TieuVanScreen';
import WealthChartScreen from '../screens/WealthChartScreen';
import { COLORS } from '../constants/theme';
import { t } from '../i18n';

// Ref điều hướng toàn cục — dùng cho menu trong ScreenHeader để điều hướng
// độc lập với context navigator hiện tại (tránh stale parent gây kẹt nút back).
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

// Lắng nghe tap push notification → mở màn Tin thông báo.
let Notifications: any;
try { Notifications = require('expo-notifications'); } catch { Notifications = null; }
function usePushNotificationTap() {
  useEffect(() => {
    if (!Notifications) return;
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      if (navigationRef.isReady()) {
        navigationRef.navigate('Notifications' as any);
      }
    });
    return () => sub.remove();
  }, []);
}

/** Quay lại màn trước trong Stack (không bị Tab lồng bên trong "nuốt" thao tác back). */
export function popStack() {
  if (!navigationRef.isReady()) return;
  if (navigationRef.canGoBack()) navigationRef.dispatch(StackActions.pop());
  else navigationRef.navigate('Home');
}

/** Thanh menu chung cho các màn chi tiết (MainTabs): cùng 5 mục với thanh tab chính. */
function SharedTabBar({ state }: BottomTabBarProps) {
  const cur = state.routes[state.index]?.name;
  const activeName = cur === 'TuViChart' || cur === 'BatTu' || cur === 'Analysis' ? 'ChartHub' : 'VanHub';
  return (
    <TuziTabBarView
      activeName={activeName}
      onSelect={(name) => {
        if (!navigationRef.isReady()) return;
        navigationRef.dispatch(CommonActions.navigate({ name: 'Home', params: { screen: name } }));
      }}
    />
  );
}

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
  const insets = useSafeAreaInsets();
  const result: AstrologyResult = route.params.result;
  return (
    <Tab.Navigator
      tabBar={(p) => <SharedTabBar {...p} />}
      screenOptions={{ headerShown: false }}
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
  Input: 'Tạo mới Hồ sơ/Lá số',
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
  Tasks: 'Việc & Mục tiêu',
  Notes: 'Ghi chú nhanh',
  EventDetail: 'Sự kiện sắp tới',
  MyCharts: 'Hồ sơ/Lá số đã lưu',
  CompareCharts: 'So sánh lá số',
  Wallet: 'Nạp xu',
  Account: 'Tài khoản',
  Settings: 'Cài đặt',
  Privacy: 'Thông tin bảo mật',
  Terms: 'Điều khoản sử dụng',
  About: 'Giới thiệu',
};

const BRAND = 'Tuzi — Trợ lý thông minh của bạn';

export default function AppNavigator() {
  usePushNotificationTap();
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
        <Stack.Screen name="Home" component={AppTabs} options={{ headerShown: false }} />
        <Stack.Screen name="Input" component={InputScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Account" component={AccountScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="PalaceDetail" component={PalaceDetailScreen} options={{ headerShown: false }} />
        <Stack.Screen name="FullChartAI" component={FullChartAIScreen} options={{ headerShown: false }} />
        <Stack.Screen name="WealthChart" component={WealthChartScreen} options={{ headerShown: false }} />
        <Stack.Screen name="DailyView" component={DailyScreen} options={{ headerShown: false }} />
        <Stack.Screen name="DayPicker" component={DayPickerScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Tasks" component={TasksScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Notes" component={NotesScreen} options={{ headerShown: false }} />
        <Stack.Screen name="EventDetail" component={EventDetailScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MyCharts" component={MyChartsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="CompareCharts" component={CompareChartsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Wallet" component={WalletScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Privacy" component={PrivacyScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Terms" component={TermsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="About" component={AboutScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Promotions" component={PromotionsScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
