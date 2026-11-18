/** Hộp chọn một lá số đã lưu (dùng cho các màn cần chọn thêm lá số: chọn ngày sinh cho con…). */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList, ActivityIndicator } from 'react-native';
import { listCharts, rowToResult, type SavedChartRow } from '../lib/charts';
import type { AstrologyResult } from '../types';
import { COLORS, FONTS, SPACING } from '../constants/theme';

export default function ChartPickerModal({ visible, onClose, onSelect, title = 'Chọn lá số' }: {
  visible: boolean;
  onClose: () => void;
  onSelect: (r: AstrologyResult) => void;
  title?: string;
}) {
  const [rows, setRows] = useState<SavedChartRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await listCharts()); } catch { setRows([]); }
    setLoading(false);
  }, []);
  useEffect(() => { if (visible) load(); }, [visible, load]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.box}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Đóng"><Text style={styles.close}>✕</Text></TouchableOpacity>
          </View>
          {loading
            ? <ActivityIndicator color={COLORS.gold} style={{ marginTop: SPACING.xl }} />
            : rows.length === 0
              ? <Text style={styles.empty}>Chưa có lá số nào được lưu.</Text>
              : (
                <FlatList
                  data={rows}
                  keyExtractor={r => r.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.row} onPress={() => { onSelect(rowToResult(item)); onClose(); }} activeOpacity={0.8}>
                      <Text style={styles.name}>{item.name || 'Không tên'} · {item.gender === 'nam' ? '♂ Nam' : '♀ Nữ'}</Text>
                      <Text style={styles.sub}>{item.birth_day}/{item.birth_month}/{item.birth_year} · giờ {item.birth_hour}h</Text>
                    </TouchableOpacity>
                  )}
                  contentContainerStyle={{ padding: SPACING.md, gap: SPACING.sm }}
                />
              )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  box: {
    backgroundColor: COLORS.background, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '75%',
    borderWidth: 1, borderColor: COLORS.gold, width: '100%', alignSelf: 'center', paddingBottom: SPACING.lg,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { color: COLORS.gold, fontFamily: FONTS.bodyBold, fontSize: 17 },
  close: { color: COLORS.textSecondary, fontSize: 20, padding: 4 },
  empty: { color: COLORS.textSecondary, fontFamily: FONTS.body, padding: SPACING.lg, textAlign: 'center' },
  row: { backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md },
  name: { color: COLORS.textPrimary, fontFamily: FONTS.bodyBold, fontSize: 15 },
  sub: { color: COLORS.textSecondary, fontFamily: FONTS.body, fontSize: 13, marginTop: 2 },
});
