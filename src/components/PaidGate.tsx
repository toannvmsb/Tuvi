/**
 * Cổng trả phí cho nội dung đồng bộ (Nâng cao offline).
 * Chưa mở khóa → hiện nút "Mở (… xu)" + hỏi xác nhận trước khi trừ. Mở rồi →
 * hiện nội dung, đọc lại miễn phí. Tự cập nhật khi unlockKey đổi (vd đổi ngày).
 */
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { isUnlocked, PREMIUM, type FeatureKind } from '../constants/premium';
import { confirmAndUnlock } from '../lib/confirmCharge';
import { COLORS, FONTS, SPACING } from '../constants/theme';

export default function PaidGate({
  unlockKey, kind, cost, label, onCharged, children,
}: {
  unlockKey: string;
  kind: FeatureKind;
  cost?: number;
  label?: string;
  onCharged?: (balance: number) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(() => isUnlocked(unlockKey));
  const [err, setErr] = useState('');
  const price = cost ?? PREMIUM.COST[kind];

  // Khi đổi mục (unlockKey thay đổi — vd chuyển ngày khác): kiểm tra lại trạng
  // thái mở khóa. Mục mới chưa trả phí → hiện lại nút trừ phí.
  useEffect(() => {
    setOpen(isUnlocked(unlockKey));
    setErr('');
  }, [unlockKey]);

  if (open) return <>{children}</>;

  const unlock = async () => {
    const r = await confirmAndUnlock(unlockKey, kind, price);
    if (r === 'ok' || r === 'free') { setOpen(true); onCharged?.(0); }
    else if (r === 'nofund') {
      setErr(`🔒 Số dư không đủ (cần ${price.toLocaleString('vi-VN')} xu). Vui lòng nạp thêm trong Menu → Nạp xu.`);
    }
  };

  return (
    <View style={styles.box}>
      <Text style={styles.note}>Mục này tốn {price.toLocaleString('vi-VN')} xu cho lần mở đầu; mở rồi thì đọc lại miễn phí.</Text>
      <TouchableOpacity style={styles.btn} onPress={unlock} activeOpacity={0.85}>
        <Text style={styles.btnTxt}>{label || `📘 Mở Nâng cao (${price.toLocaleString('vi-VN')} xu)`}</Text>
      </TouchableOpacity>
      {!!err && <Text style={styles.err}>{err}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: SPACING.sm, paddingVertical: SPACING.sm },
  note: { color: COLORS.textSecondary, fontSize: FONTS.size.xs, fontStyle: 'italic' },
  btn: { backgroundColor: COLORS.gold, borderRadius: 8, paddingVertical: SPACING.sm, alignItems: 'center' },
  btnTxt: { color: '#1a0a00', fontWeight: '800', fontSize: FONTS.size.sm },
  err: { color: COLORS.red, fontSize: FONTS.size.sm },
});
