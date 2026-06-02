/**
 * Khối "Gói Luận Trọn Đời" — mua 1 lần, mở khóa nhiều mục AI vĩnh viễn.
 * Trừ xu một lần (buyBundle). Dùng trong màn Toàn lá số.
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { wallet, buyBundle, isUnlocked } from '../constants/premium';
import { COMBOS, comboUnlockKeys, type Combo } from '../constants/combos';
import type { AstrologyResult } from '../types';

export default function ComboOffer({ result, onBought }: { result: AstrologyResult; onBought?: () => void }) {
  const [, force] = useState(0);
  const rerender = () => force(n => n + 1);

  const owned = (combo: Combo) => comboUnlockKeys(result, combo.id).every(isUnlocked);

  const buy = (combo: Combo) => {
    const keys = comboUnlockKeys(result, combo.id);
    Alert.alert(
      combo.name,
      `${combo.desc}\n\nGiá: ${combo.cost.toLocaleString('vi-VN')} xu (${combo.priceVnd.toLocaleString('vi-VN')}đ).\n` +
      `Số dư: ${wallet.balance.toLocaleString('vi-VN')} xu.\n\nMua gói này?`,
      [
        { text: 'Để sau', style: 'cancel' },
        {
          text: `Mua (${combo.cost.toLocaleString('vi-VN')} xu)`,
          onPress: () => {
            const r = buyBundle(keys, combo.cost, combo.id);
            if (r.ok) {
              Alert.alert('✓ Đã mở khóa', `${combo.name} đã được kích hoạt. Các mục AI trong gói nay xem miễn phí.`);
              rerender(); onBought?.();
            } else {
              Alert.alert('Số dư không đủ', `Cần ${combo.cost.toLocaleString('vi-VN')} xu. Vui lòng nạp thêm trong Menu → Nạp xu.`);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.box}>
      <Text style={styles.title}>💎 Gói Luận Trọn Đời (tiết kiệm hơn mua lẻ)</Text>
      {COMBOS.map(c => {
        const have = owned(c);
        return (
          <View key={c.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{c.name}</Text>
              <Text style={styles.desc}>{c.desc}</Text>
            </View>
            {have ? (
              <Text style={styles.owned}>✓ Đã sở hữu</Text>
            ) : (
              <TouchableOpacity style={styles.btn} onPress={() => buy(c)} activeOpacity={0.85}>
                <Text style={styles.btnTxt}>{c.priceVnd.toLocaleString('vi-VN')}đ{'\n'}{c.cost} xu</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.gold, gap: SPACING.sm,
  },
  title: { color: COLORS.gold, fontSize: FONTS.size.md, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, borderTopWidth: 0.5, borderTopColor: COLORS.border, paddingTop: SPACING.sm },
  name: { color: COLORS.textPrimary, fontSize: FONTS.size.md, fontWeight: '800' },
  desc: { color: COLORS.textSecondary, fontSize: FONTS.size.xs, lineHeight: 18, marginTop: 2 },
  btn: { backgroundColor: COLORS.gold, borderRadius: 8, paddingHorizontal: SPACING.md, paddingVertical: 6, alignItems: 'center', minWidth: 84 },
  btnTxt: { color: '#1a0a00', fontWeight: '800', fontSize: FONTS.size.xs, textAlign: 'center' },
  owned: { color: COLORS.green, fontSize: FONTS.size.sm, fontWeight: '800' },
});
