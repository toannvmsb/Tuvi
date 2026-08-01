/**
 * Chuông thông báo — hiển thị số tin CHƯA đọc (badge đỏ). Nhấn → mở màn "Tin thông báo".
 * Tự cập nhật khi danh sách thông báo thay đổi.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect, StackActions } from '@react-navigation/native';
import { COLORS } from '../constants/theme';
import { navigationRef } from '../navigation/AppNavigator';
import { loadNotifications, subscribeNotifications, unreadCount } from '../lib/notificationCenter';

export default function NotificationBell({ color }: { color?: string }) {
  const [count, setCount] = useState(unreadCount());

  useEffect(() => {
    let mounted = true;
    loadNotifications().then(() => { if (mounted) setCount(unreadCount()); });
    const unsub = subscribeNotifications(() => { if (mounted) setCount(unreadCount()); });
    return () => { mounted = false; unsub(); };
  }, []);

  // Cập nhật lại khi quay về màn có chuông.
  useFocusEffect(useCallback(() => { setCount(unreadCount()); }, []));

  const open = () => {
    if (navigationRef.isReady()) navigationRef.dispatch(StackActions.push('Notifications'));
  };

  return (
    <TouchableOpacity onPress={open} style={styles.btn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <Text style={[styles.bell, color ? { color } : null]}>🔔</Text>
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  bell: { fontSize: 22 },
  badge: {
    position: 'absolute', top: -2, right: -4,
    minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4,
    backgroundColor: COLORS.red, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.background,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
});
