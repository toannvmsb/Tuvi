/**
 * Cổng trả phí cho nội dung đồng bộ (Nâng cao offline).
 * Chưa mở khóa → hiện preview (nếu có) với hiệu ứng mờ dần + nút "Mở đầy đủ".
 * Mở rồi → hiện nội dung, đọc lại miễn phí.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { isUnlocked, PREMIUM, xuVnd, type FeatureKind } from '../constants/premium';
import { confirmAndUnlock } from '../lib/confirmCharge';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import SimpleMarkdown from './SimpleMarkdown';

export default function PaidGate({
  unlockKey, kind, cost, label, onCharged, children, preview,
}: {
  unlockKey: string;
  kind: FeatureKind;
  cost?: number;
  label?: string;
  onCharged?: (balance: number) => void;
  children: React.ReactNode;
  /** Nội dung markdown rút gọn — hiện trước nút mở để người dùng biết sẽ xem gì. */
  preview?: string;
}) {
  const [open, setOpen] = useState(() => isUnlocked(unlockKey));
  const [err, setErr] = useState('');
  const price = cost ?? PREMIUM.COST[kind];

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
    <View>
      {!!preview && (
        <View style={styles.previewWrap}>
          <SimpleMarkdown content={preview} />
          <LinearGradient
            colors={['rgba(20,12,5,0)', COLORS.background]}
            style={styles.previewFade}
            pointerEvents="none"
          />
        </View>
      )}
      <View style={styles.box}>
        <Text style={styles.note}>Mục này tốn {xuVnd(price)} cho lần mở đầu; mở rồi thì đọc lại miễn phí.</Text>
        <TouchableOpacity style={styles.btn} onPress={unlock} activeOpacity={0.85}>
          <Text style={styles.btnTxt}>{label || `📘 Mở nâng cao đầy đủ (${xuVnd(price)})`}</Text>
        </TouchableOpacity>
        {!!err && <Text style={styles.err}>{err}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  previewWrap: { position: 'relative', overflow: 'hidden' },
  previewFade: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: 100,
    pointerEvents: 'none',
  } as any,
  box: { gap: SPACING.sm, paddingVertical: SPACING.sm },
  note: { color: COLORS.textSecondary, fontSize: FONTS.size.xs, fontStyle: 'italic' },
  btn: { backgroundColor: COLORS.gold, borderRadius: 8, paddingVertical: SPACING.sm, alignItems: 'center' },
  btnTxt: { color: '#1a0a00', fontWeight: '800', fontSize: FONTS.size.sm },
  err: { color: COLORS.red, fontSize: FONTS.size.sm },
});
