/**
 * Chọn nơi ở / nơi sinh bằng danh sách 63 tỉnh/thành (droplist) — không phải nhập liệu.
 * Địa điểm dùng để lấy thời tiết khi gắn lá số; không chọn → mặc định Hà Nội.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, Modal, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS } from '../constants/theme';
import { PROVINCES, type Place } from '../lib/weather';

const strip = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

export default function PlacePicker({ value, onChange }: { value: Place | null; onChange: (p: Place | null) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const list = useMemo(() => {
    const k = strip(q.trim());
    return k ? PROVINCES.filter(p => strip(p.name).includes(k)) : PROVINCES;
  }, [q]);

  const close = () => { setOpen(false); setQ(''); };

  return (
    <View style={{ gap: 8 }}>
      <Pressable style={s.field} onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel="Chọn tỉnh thành">
        <Text style={[s.fieldTxt, !value && { color: COLORS.textMuted }]} numberOfLines={1}>
          {value ? `📍 ${value.name}` : 'Chọn tỉnh / thành phố'}
        </Text>
        <Text style={s.arrow}>▾</Text>
      </Pressable>
      <Text style={s.hint}>Dùng để hiển thị thời tiết. Không chọn thì Tuzi lấy Hà Nội.</Text>

      <Modal visible={open} animationType="slide" onRequestClose={close} transparent={false}>
        <SafeAreaView style={s.modal} edges={['top', 'bottom']}>
          <View style={s.modalHead}>
            <Text style={s.modalTitle}>Chọn tỉnh / thành phố</Text>
            <Pressable onPress={close} style={s.closeBtn} accessibilityRole="button" accessibilityLabel="Đóng">
              <Text style={s.closeTxt}>✕</Text>
            </Pressable>
          </View>
          <TextInput
            style={s.search} value={q} onChangeText={setQ}
            placeholder="Tìm nhanh (không cần gõ dấu)…" placeholderTextColor={COLORS.textMuted} autoCorrect={false}
          />
          <FlatList
            data={list}
            keyExtractor={p => p.name}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 16, gap: 8 }}
            ListEmptyComponent={<Text style={s.hint}>Không tìm thấy tỉnh/thành phù hợp.</Text>}
            ListHeaderComponent={value ? (
              <Pressable style={[s.item, { borderColor: 'rgba(231,123,107,0.4)' }]} onPress={() => { onChange(null); close(); }}>
                <Text style={[s.itemTxt, { color: COLORS.red }]}>Bỏ chọn (dùng Hà Nội)</Text>
              </Pressable>
            ) : undefined}
            renderItem={({ item }) => {
              const on = value?.name === item.name;
              return (
                <Pressable style={[s.item, on && s.itemOn]} onPress={() => { onChange(item); close(); }} accessibilityRole="button">
                  <Text style={[s.itemTxt, on && { color: COLORS.goldLight, fontFamily: FONTS.bodyBold }]}>{item.name}</Text>
                  {on && <Text style={{ color: COLORS.gold }}>✓</Text>}
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  field: {
    minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(226,194,133,0.28)', backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
  },
  fieldTxt: { flex: 1, fontFamily: FONTS.bodyMedium, fontSize: 15, color: COLORS.textPrimary },
  arrow: { color: COLORS.textMuted, fontSize: 16 },
  hint: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted },
  modal: { flex: 1, backgroundColor: COLORS.background },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  modalTitle: { fontFamily: FONTS.display, fontSize: 24, color: COLORS.textPrimary },
  closeBtn: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(226,194,133,0.2)',
  },
  closeTxt: { color: COLORS.textPrimary, fontSize: 18 },
  search: {
    marginHorizontal: 16, minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(226,194,133,0.28)', backgroundColor: 'rgba(255,255,255,0.06)',
    color: COLORS.textPrimary, paddingHorizontal: 14, fontFamily: FONTS.body, fontSize: 15,
  },
  item: {
    minHeight: 48, borderRadius: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(226,194,133,0.14)',
  },
  itemOn: { borderColor: COLORS.gold, backgroundColor: 'rgba(226,194,133,0.14)' },
  itemTxt: { fontFamily: FONTS.body, fontSize: 15, color: COLORS.textPrimary },
});
