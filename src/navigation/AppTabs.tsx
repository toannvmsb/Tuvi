/**
 * Khung 5 tab chính (thiết kế mới). Được đăng ký làm route `Home` của Stack nên mọi
 * `navigation.navigate('Home')` / reset về Home cũ vẫn hoạt động (mở ở tab Tổng quan).
 * "Xem ngày" dùng lại DailyScreen (route.params.result tùy chọn → chế độ cơ bản khi chưa có lá số).
 */
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { TabParamList } from '../types';
import TuziTabBar from './TuziTabBar';
import OverviewScreen from '../screens/OverviewScreen';
import ChartHubScreen from '../screens/ChartHubScreen';
import VanHubScreen from '../screens/VanHubScreen';
import DailyScreen from '../screens/DailyScreen';
import MenuScreen from '../screens/MenuScreen';
import { useMyResult } from '../hooks/useMyResult';

const Tab = createBottomTabNavigator<TabParamList>();

/** DailyScreen ở chế độ tab: nạp lá số của tôi (nếu có) rồi truyền qua route; chưa có → chế độ cơ bản. */
function DayTab(props: any) {
  const { result } = useMyResult();
  const route = { ...(props.route ?? {}), params: { ...(props.route?.params ?? {}), result: result ?? undefined } };
  return <DailyScreen {...props} route={route} />;
}

export default function AppTabs() {
  return (
    <Tab.Navigator
      tabBar={(p) => <TuziTabBar {...p} />}
      screenOptions={{ headerShown: false }}
      initialRouteName="Overview"
    >
      <Tab.Screen name="Overview" component={OverviewScreen} />
      <Tab.Screen name="ChartHub" component={ChartHubScreen} />
      <Tab.Screen name="VanHub" component={VanHubScreen} />
      <Tab.Screen name="DayView" component={DayTab} />
      <Tab.Screen name="Menu" component={MenuScreen} />
    </Tab.Navigator>
  );
}
