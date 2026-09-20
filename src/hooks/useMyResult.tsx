/**
 * Lá số "của tôi" cho các màn KHÔNG nhận `result` qua route (tab chính, Menu…).
 * Cùng cơ chế với NotesScreen/TasksScreen: đọc id đã gắn (myChart) + danh sách lá số
 * (online → server, offline → cache) rồi dựng AstrologyResult. Nạp lại mỗi lần màn lấy focus.
 */
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getMyChartId } from '../lib/myChart';
import { listCharts, getCachedCharts, rowToResult } from '../lib/charts';
import type { AstrologyResult } from '../types';
import { COLORS, FONTS } from '../constants/theme';
import { Screen, Card, Display, Body, GoldButton, OutlineButton } from '../ui';

export function useMyResult(): { result: AstrologyResult | null; loading: boolean } {
  const { online } = useAuth();
  const [result, setResult] = useState<AstrologyResult | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    (async () => {
      try {
        const charts = online ? await listCharts() : (getCachedCharts() ?? []);
        const id = await getMyChartId();
        const row = id ? charts.find(r => r.id === id) : undefined;
        if (!cancelled) setResult(row ? rowToResult(row) : null);
      } catch {
        if (!cancelled) setResult(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [online]));

  return { result, loading };
}

/** Trạng thái rỗng khi chưa gắn lá số: mời tạo mới hoặc gắn hồ sơ đã lưu. */
export function NoChartState({ title = 'Chưa có lá số của bạn' }: { title?: string }) {
  const navigation = useNavigation<any>();
  return (
    <Screen tabBarSpace>
      <Card hero style={{ gap: 12, marginTop: 24 }}>
        <Display size={28} color={COLORS.goldLight}>{title}</Display>
        <Body>Thêm hồ sơ để Tuzi lập lá số và đưa ra những gợi ý phù hợp với riêng bạn.</Body>
        <GoldButton label="Tạo mới Lá số" onPress={() => navigation.navigate('Input')} />
        <OutlineButton label="Gắn Hồ sơ đã lưu" onPress={() => navigation.navigate('MyCharts')} />
      </Card>
    </Screen>
  );
}

/**
 * Bọc 1 màn cũ (nhận `route.params.result`) để dùng làm tab: tự nạp lá số "của tôi"
 * rồi truyền xuống qua `route`. Chưa có lá số → NoChartState.
 */
export function withMyResult<P extends object>(Component: React.ComponentType<P>, emptyTitle?: string) {
  return function WithMyResult(props: any) {
    const { result, loading } = useMyResult();
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.gold} />
          <Text style={styles.loadingTxt}>Đang mở lá số…</Text>
        </View>
      );
    }
    if (!result) return <NoChartState title={emptyTitle} />;
    const route = { ...(props.route ?? {}), params: { ...(props.route?.params ?? {}), result } };
    return <Component {...(props as P)} route={route} />;
  };
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: COLORS.background },
  loadingTxt: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textMuted },
});
