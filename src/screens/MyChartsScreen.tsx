/**
 * Màn "Lá số của tôi" — danh sách lá số đã lưu (Supabase), mở lại hoặc xóa.
 */
import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import { listCharts, getCachedCharts, rowToResult, deleteChart, type SavedChartRow } from '../lib/charts';
import { isOnlineMode } from '../lib/auth';
import { getMyChartId, setMyChartId } from '../lib/myChart';
import { COLORS, FONTS, SPACING } from '../constants/theme';

export default function MyChartsScreen() {
  const navigation = useNavigation<any>();
  const [rows, setRows] = useState<SavedChartRow[]>(() => getCachedCharts() ?? []);
  // Chỉ hiện spinner ở LẦN ĐẦU (chưa có cache); các lần sau dùng cache → không tải lại.
  const [loading, setLoading] = useState(() => getCachedCharts() == null);
  const [myId, setMyId] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    // Đã có cache và không ép làm mới → dùng luôn, không request lại.
    const cached = getCachedCharts();
    if (cached && !force) { setRows(cached); setLoading(false); return; }
    setLoading(true);
    try { setRows(await listCharts(force)); } catch { setRows([]); }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); getMyChartId().then(setMyId); }, [load]));

  // Đánh dấu / bỏ đánh dấu "lá số của tôi" (chỉ 1 lá số chính) — Home dùng để luận Ngày hôm nay.
  const toggleMine = async (row: SavedChartRow) => {
    const next = myId === row.id ? null : row.id;
    setMyId(next);
    await setMyChartId(next);
  };

  const open = (row: SavedChartRow) => {
    const result = rowToResult(row);
    navigation.navigate('MainTabs', { result });
  };

  const remove = (row: SavedChartRow) => {
    Alert.alert('Xóa lá số', `Xóa lá số "${row.name || 'Không tên'}"?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => { await deleteChart(row.id); load(); } },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="Lá số đã lưu" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.topActions}>
          <TouchableOpacity style={styles.compareBtn} onPress={() => navigation.navigate('CompareCharts', {})} activeOpacity={0.8}>
            <Text style={styles.compareTxt}>⚖️ So sánh tương hợp</Text>
          </TouchableOpacity>
          {isOnlineMode() && (
            <TouchableOpacity style={styles.refreshBtn} onPress={() => load(true)} activeOpacity={0.7}>
              <Text style={styles.refreshTxt}>🔄 Làm mới</Text>
            </TouchableOpacity>
          )}
        </View>
        {!isOnlineMode() ? (
          <Text style={styles.empty}>Cần đăng nhập (chế độ online) để lưu và xem lại lá số.</Text>
        ) : loading ? (
          <ActivityIndicator color={COLORS.gold} style={{ marginTop: SPACING.xl }} />
        ) : rows.length === 0 ? (
          <Text style={styles.empty}>Chưa có lá số nào được lưu. Hãy lập một lá số mới — nó sẽ tự động được lưu lại.</Text>
        ) : (
          rows.map(r => (
            <View key={r.id} style={styles.card}>
              <TouchableOpacity style={{ flex: 1 }} onPress={() => open(r)} activeOpacity={0.7}>
                <Text style={styles.name}>{r.name || 'Không tên'} · {r.gender === 'nam' ? '♂ Nam' : '♀ Nữ'}</Text>
                <Text style={styles.sub}>
                  {r.calendar === 'lunar' ? 'Âm lịch' : 'Dương lịch'}: {r.birth_day}/{r.birth_month}/{r.birth_year}
                  {' · '}giờ {r.birth_hour}h{r.viewing_year ? ` · năm xem ${r.viewing_year}` : ''}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => toggleMine(r)} style={styles.checkBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[styles.checkTxt, myId === r.id && styles.checkTxtOn]}>{myId === r.id ? '☑' : '☐'}</Text>
                <Text style={styles.checkLabel}>Của tôi</Text>
              </TouchableOpacity>
              <View style={styles.actionCol}>
                <TouchableOpacity onPress={() => remove(r)} style={styles.delBtn} accessibilityRole="button" accessibilityLabel="Xóa lá số">
                  <Text style={styles.delTxt}>🗑</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('EditChart', { row: r })} style={styles.editBtn} accessibilityRole="button" accessibilityLabel="Sửa lá số">
                  <Text style={styles.delTxt}>✏️</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <TouchableOpacity style={styles.newBtn} onPress={() => navigation.navigate('Input')} activeOpacity={0.85}>
          <Text style={styles.newTxt}>＋ Lập lá số mới</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },
  empty: { color: COLORS.textSecondary, fontSize: FONTS.size.md, textAlign: 'center', marginTop: SPACING.xl, lineHeight: 22 },
  topActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  compareBtn: {
    backgroundColor: COLORS.purple + '33', borderRadius: 8, borderWidth: 1, borderColor: COLORS.purple,
    paddingHorizontal: SPACING.md, paddingVertical: 6,
  },
  compareTxt: { color: COLORS.purple, fontSize: FONTS.size.sm, fontWeight: '700' },
  refreshBtn: { paddingHorizontal: SPACING.sm, paddingVertical: 4 },
  refreshTxt: { color: COLORS.goldLight, fontSize: FONTS.size.sm, fontWeight: '700' },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.card, borderRadius: 10, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  name: { color: COLORS.gold, fontSize: FONTS.size.md, fontWeight: '800' },
  sub: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, marginTop: 2 },
  checkBtn: { alignItems: 'center', paddingHorizontal: 4 },
  checkTxt: { fontSize: 20, color: COLORS.textSecondary },
  checkTxtOn: { color: COLORS.gold },
  checkLabel: { fontSize: 9, color: COLORS.textSecondary },
  delBtn: { padding: SPACING.xs, borderRadius: 8, backgroundColor: '#ff6b6b22', borderWidth: 1, borderColor: '#ff8a8a' },
  delTxt: { fontSize: 22 },
  actionCol: { gap: SPACING.xs },
  editBtn: { padding: SPACING.xs, alignItems: 'center', borderRadius: 8, backgroundColor: COLORS.gold + '22', borderWidth: 1, borderColor: COLORS.gold },
  newBtn: {
    backgroundColor: COLORS.gold, borderRadius: 10, paddingVertical: SPACING.md,
    alignItems: 'center', marginTop: SPACING.sm,
  },
  newTxt: { color: '#1a0a00', fontWeight: '800', fontSize: FONTS.size.md },
});
