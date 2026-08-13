/**
 * Màn "Tin thông báo" — danh sách thông báo của hệ thống (ngày đẹp/xấu, tháng mới,
 * sinh nhật lá số, nạp xu…). Người dùng có thể xóa từng tin hoặc xóa tất cả.
 * Mở màn này tự đánh dấu ĐÃ ĐỌC (xóa số đỏ trên chuông).
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import type { AstrologyResult } from '../types';
import { useAuth } from '../context/AuthContext';
import { getMyChartId } from '../lib/myChart';
import { listCharts, getCachedCharts, rowToResult } from '../lib/charts';
import {
  loadNotifications, getNotifications, subscribeNotifications, markAllRead,
  deleteNotification, clearAllNotifications, type AppNotification, type NotifType,
} from '../lib/notificationCenter';
import { syncBroadcasts } from '../lib/broadcasts';

const TYPE_EMOJI: Record<NotifType, string> = {
  topup: '💰', day: '📅', month: '🌙', birthday: '🎂', life_task: '✅', life_event: '🗓️',
  promo: '🎉', feature: '✨', system: '🔔',
};

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'vừa xong';
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} ngày trước`;
  const date = new Date(ms);
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const { online } = useAuth();
  const [items, setItems] = useState<AppNotification[]>(getNotifications());
  const [myResult, setMyResult] = useState<AstrologyResult | null>(null);

  const refresh = useCallback(() => setItems(getNotifications()), []);

  useEffect(() => {
    let mounted = true;
    loadNotifications().then(() => { if (mounted) { refresh(); markAllRead(); } });
    const unsub = subscribeNotifications(() => { if (mounted) refresh(); });
    // Mở màn này cũng KÉO thông báo mới từ máy chủ (admin) về.
    void syncBroadcasts();
    // Tải lá số "của tôi" để điều hướng tới Nhật vận khi bấm tin ngày tốt/xấu.
    (async () => {
      try {
        const charts = online ? await listCharts() : (getCachedCharts() ?? []);
        const id = await getMyChartId();
        const row = id ? charts.find(r => r.id === id) : undefined;
        if (mounted && row) setMyResult(rowToResult(row));
      } catch { /* không có lá số → vẫn xem được danh sách */ }
    })();
    return () => { mounted = false; unsub(); };
  }, [refresh, online]);

  // Bấm vào 1 tin → điều hướng tới màn liên quan.
  const onPressItem = (it: AppNotification) => {
    switch (it.type) {
      case 'day':
        if (myResult) navigation.navigate('DailyView', { result: myResult });
        else Alert.alert('Chưa gắn lá số', 'Hãy gắn lá số của bạn để xem Nhật vận theo ngày.');
        break;
      case 'topup':
        navigation.navigate('Wallet');
        break;
      case 'birthday':
        navigation.navigate('MyCharts');
        break;
      case 'promo':
      case 'feature':
        navigation.navigate('Promotions');
        break;
      default:
        break;
    }
  };

  const onClearAll = () => {
    if (!items.length) return;
    Alert.alert('Xóa tất cả thông báo?', 'Toàn bộ tin sẽ bị xóa và không khôi phục được.', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa tất cả', style: 'destructive', onPress: () => { void clearAllNotifications(); } },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="Tin thông báo" onBack={() => navigation.goBack()} />

      {items.length > 0 && (
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={onClearAll}>
            <Text style={styles.clearAll}>🗑 Xóa tất cả</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={items.length ? styles.list : styles.emptyWrap}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🔔</Text>
            <Text style={styles.emptyText}>Chưa có thông báo nào.</Text>
            <Text style={styles.emptySub}>
              Hệ thống sẽ báo cho bạn khi có ngày đẹp/xấu, bước sang tháng mới, sinh nhật lá số đã lưu, hoặc nạp xu thành công.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.item, !item.read && styles.itemUnread]}
            activeOpacity={0.7}
            onPress={() => onPressItem(item)}
          >
            <Text style={styles.itemEmoji}>{TYPE_EMOJI[item.type] || '🔔'}</Text>
            <View style={styles.itemBody}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemText}>{item.body}</Text>
              <Text style={styles.itemTime}>{timeAgo(item.createdAt)}</Text>
            </View>
            <TouchableOpacity
              onPress={() => Alert.alert(
                'Xóa thông báo?',
                'Tin này sẽ bị xóa và không khôi phục được.',
                [
                  { text: 'Hủy', style: 'cancel' },
                  { text: 'Xóa', style: 'destructive', onPress: () => deleteNotification(item.id) },
                ],
              )}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.itemDelete}>✕</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  toolbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
  },
  count: { color: COLORS.textSecondary, fontSize: FONTS.size.sm },
  refresh: { color: COLORS.gold, fontSize: FONTS.size.sm, fontWeight: '700' },
  clearAll: { color: COLORS.red, fontSize: FONTS.size.sm, fontWeight: '700' },
  list: { padding: SPACING.md, gap: SPACING.sm, paddingBottom: SPACING.xxl },
  emptyWrap: { flexGrow: 1, justifyContent: 'center' },
  empty: { alignItems: 'center', padding: SPACING.xl, gap: SPACING.sm },
  emptyEmoji: { fontSize: 48 },
  emptyText: { color: COLORS.textPrimary, fontSize: FONTS.size.lg, fontWeight: '800' },
  emptySub: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, textAlign: 'center', lineHeight: 20 },
  item: {
    flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start',
    backgroundColor: COLORS.card, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md,
  },
  itemUnread: { borderColor: COLORS.gold, backgroundColor: COLORS.surface },
  itemEmoji: { fontSize: 22, marginTop: 1 },
  itemBody: { flex: 1, gap: 2 },
  itemTitle: { color: COLORS.textPrimary, fontSize: FONTS.size.md, fontWeight: '800' },
  itemText: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, lineHeight: 19 },
  itemTime: { color: COLORS.textMuted, fontSize: FONTS.size.xs, marginTop: 2 },
  itemDelete: { color: COLORS.textMuted, fontSize: FONTS.size.lg, fontWeight: '800', paddingLeft: 4 },
});
