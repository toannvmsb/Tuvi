/**
 * Đầu trang dùng chung cho 4 màn vận hạn: nút quay lại + tiêu đề + thanh chuyển nhanh
 * Đại vận | Tiểu vận | Nguyệt vận | Nhật vận (đúng thiết kế mới).
 */
import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AstrologyResult } from '../types';
import { Display, Segmented } from './primitives';
import Icon from './Icon';
import { navigationRef, popStack } from '../navigation/AppNavigator';

type Tier = 'dai' | 'tieu' | 'nguyet' | 'nhat';

export default function VanTierHeader({ active, result }: { active: Tier; result: AstrologyResult }) {
  const nav = useNavigation<any>();
  const go = (t: Tier) => {
    if (t === active) return;
    if (t === 'nhat') nav.navigate('DailyView', { result });
    else nav.navigate(t === 'dai' ? 'DaiVan' : t === 'tieu' ? 'TieuVan' : 'NguyetVan', { result });
  };
  return (
    <View style={s.wrap}>
      <View style={s.row}>
        <Pressable style={s.round} onPress={() => popStack()} accessibilityRole="button" accessibilityLabel="Quay lại">
          <Icon name="back" size={22} />
        </Pressable>
        <Display size={34}>Vận hạn</Display>
      </View>
      <Segmented<Tier>
        options={[
          { value: 'dai', label: 'Đại vận' }, { value: 'tieu', label: 'Tiểu vận' },
          { value: 'nguyet', label: 'Nguyệt vận' }, { value: 'nhat', label: 'Nhật vận' },
        ]}
        value={active}
        onChange={go}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  round: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(226,194,133,0.2)',
  },
});
