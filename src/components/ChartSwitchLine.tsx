/**
 * Dòng "[Tên] · [giới tính] · [năm sinh]" căn giữa + biểu tượng đổi lá số.
 * Nhấn → hộp chọn lá số đã lưu; chọn xong gắn làm "lá số của tôi" (như đổi lá số ở Lịch Home) rồi
 * báo `onPicked(result)` để màn hiện tại tải lại theo lá số mới.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, StyleSheet, ActivityIndicator, type StyleProp, type ViewStyle, type TextStyle } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from '../ui/Icon';
import { COLORS, FONTS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { listCharts, getCachedCharts, rowToResult, type SavedChartRow } from '../lib/charts';
import { getMyChartId, setMyChartId } from '../lib/myChart';
import type { AstrologyResult } from '../types';

interface Props {
  text: string;
  /** Id lá số đang xem (birthInfo.chartId) để đánh dấu trong danh sách. */
  currentId?: string;
  onPicked?: (result: AstrologyResult) => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  /** true → sau khi chọn, dựng lại CHÍNH màn hiện tại (stack) với lá số mới (reset mọi trạng thái cũ). */
  replaceScreen?: boolean;
  iconSize?: number;
}

export default function ChartSwitchLine({ text, currentId, onPicked, style, textStyle, replaceScreen, iconSize = 16 }: Props) {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { online } = useAuth();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<SavedChartRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(currentId ?? null);

  const show = useCallback(async () => {
    setOpen(true);
    setLoading(true);
    try {
      const list = online ? await listCharts() : (getCachedCharts() ?? []);
      setRows(list);
      setActiveId(currentId ?? (await getMyChartId()));
    } catch {
      setRows(getCachedCharts() ?? []);
    }
    setLoading(false);
  }, [online, currentId]);

  const pick = async (row: SavedChartRow) => {
    setOpen(false);
    if (row.id === activeId) return;
    await setMyChartId(row.id);
    const r = rowToResult(row);
    if (replaceScreen) navigation.replace(route.name, { ...(route.params ?? {}), result: r });
    onPicked?.(r);
  };

  const goSaved = () => { setOpen(false); navigation.navigate('MyCharts'); };

  return (
    <>
      <Pressable
        style={[s.line, style]}
        onPress={show}
        accessibilityRole="button" accessibilityLabel="Đổi lá số"
      >
        <Text style={[s.txt, textStyle]} numberOfLines={1}>{text}</Text>
        <Icon name="swap" size={iconSize} color={COLORS.gold} strokeWidth={2} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.overlay} onPress={() => setOpen(false)}>
          <Pressable style={s.box} onPress={() => { /* chặn đóng khi chạm trong hộp */ }}>
            <Text style={s.title}>Đổi lá số</Text>
            {loading ? (
              <ActivityIndicator color={COLORS.gold} style={{ marginVertical: 20 }} />
            ) : rows.length === 0 ? (
              <Text style={s.empty}>Chưa có lá số đã lưu.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 340 }}>
                {rows.map(r => {
                  const on = r.id === activeId;
                  return (
                    <Pressable key={r.id} style={[s.item, on && s.itemOn]} onPress={() => pick(r)} accessibilityRole="button">
                      <View style={{ flex: 1 }}>
                        <Text style={s.itemName} numberOfLines={1}>{r.name || 'Không tên'}</Text>
                        <Text style={s.itemSub}>{`${r.gender === 'nu' ? 'Nữ' : 'Nam'} · ${r.birth_day}/${r.birth_month}/${r.birth_year}${r.calendar === 'lunar' ? ' (âm)' : ''}`}</Text>
                      </View>
                      {on && <Text style={s.check}>✓</Text>}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
            <Pressable style={s.manage} onPress={goSaved} accessibilityRole="button">
              <Text style={s.manageTxt}>Quản lý lá số đã lưu</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 36, paddingVertical: 4, alignSelf: 'center', maxWidth: '100%' },
  txt: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textSecondary, flexShrink: 1, textAlign: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  box: { width: '100%', maxWidth: 420, borderRadius: 20, padding: 16, gap: 10, backgroundColor: '#1E1230', borderWidth: 1, borderColor: 'rgba(226,194,133,0.3)' },
  title: { fontFamily: FONTS.bodyBold, fontSize: 17, color: COLORS.textPrimary, textAlign: 'center' },
  empty: { fontFamily: FONTS.body, fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginVertical: 16 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14, marginBottom: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'transparent' },
  itemOn: { borderColor: COLORS.gold, backgroundColor: 'rgba(226,194,133,0.12)' },
  itemName: { fontFamily: FONTS.bodySemi, fontSize: 15, color: COLORS.textPrimary },
  itemSub: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  check: { fontFamily: FONTS.bodyBold, fontSize: 16, color: COLORS.gold },
  manage: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  manageTxt: { fontFamily: FONTS.bodySemi, fontSize: 14, color: '#F5E0AE' },
});
