/**
 * Màn "Khuyến mại" — hiển thị các chương trình khuyến mại/giảm giá do admin gửi.
 * Thông tin có thể kèm mã voucher (admin ghi trong nội dung).
 *  - Trên WEB: hiện nút "Nhập mã voucher" → mở màn Nạp xu để nhập mã.
 *  - Trên iOS/Android: KHÔNG hiện ô nhập mã (theo Apple 3.1.1 / Google Payments) —
 *    người dùng vào web của ứng dụng để nhập mã.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { isWeb } from '../lib/platform';
import { fetchPromos, type Broadcast } from '../lib/broadcasts';

function fmtDate(s: string): string {
  const d = new Date(s);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

export default function PromotionsScreen() {
  const navigation = useNavigation<any>();
  const [promos, setPromos] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchPromos()
      .then(rows => { if (mounted) setPromos(rows); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="Khuyến mại" onBack={() => navigation.goBack()} />

      {isWeb && (
        <TouchableOpacity style={styles.voucherBtn} onPress={() => navigation.navigate('Wallet')} activeOpacity={0.85}>
          <Text style={styles.voucherBtnText}>🎟️ Nhập mã voucher / nạp xu</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={promos}
        keyExtractor={(it) => String(it.id)}
        contentContainerStyle={promos.length ? styles.list : styles.emptyWrap}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🎉</Text>
            <Text style={styles.emptyText}>{loading ? 'Đang tải…' : 'Hiện chưa có khuyến mại nào.'}</Text>
            {!loading && (
              <Text style={styles.emptySub}>Các chương trình khuyến mại/giảm giá sẽ hiển thị tại đây khi có.</Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🎉 {item.title}</Text>
            <Text style={styles.cardSummary}>{item.body}</Text>
            {!!item.promo_detail && (
              <View style={styles.detailBox}>
                <Text style={styles.detailText}>{item.promo_detail}</Text>
              </View>
            )}
            <Text style={styles.cardDate}>Áp dụng từ {fmtDate(item.created_at)}</Text>
          </View>
        )}
      />

      {!isWeb && promos.length > 0 && (
        <Text style={styles.webNote}>
          * Để nhập mã voucher/giảm giá, vui lòng truy cập ứng dụng trên trình duyệt web.
        </Text>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  voucherBtn: {
    margin: SPACING.md, backgroundColor: COLORS.gold, borderRadius: 10,
    paddingVertical: SPACING.md, alignItems: 'center',
  },
  voucherBtnText: { color: '#1a0a00', fontSize: FONTS.size.md, fontWeight: '800' },
  list: { padding: SPACING.md, gap: SPACING.sm, paddingBottom: SPACING.xxl },
  emptyWrap: { flexGrow: 1, justifyContent: 'center' },
  empty: { alignItems: 'center', padding: SPACING.xl, gap: SPACING.sm },
  emptyEmoji: { fontSize: 48 },
  emptyText: { color: COLORS.textPrimary, fontSize: FONTS.size.lg, fontWeight: '800' },
  emptySub: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, textAlign: 'center', lineHeight: 20 },
  card: {
    backgroundColor: COLORS.card, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.gold, padding: SPACING.md, gap: 6,
  },
  cardTitle: { color: COLORS.gold, fontSize: FONTS.size.lg, fontWeight: '800' },
  cardSummary: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, lineHeight: 20, fontStyle: 'italic' },
  detailBox: {
    marginTop: 8, backgroundColor: COLORS.surface, borderRadius: 8,
    borderLeftWidth: 3, borderLeftColor: COLORS.gold, padding: 10,
  },
  detailText: { color: COLORS.textPrimary, fontSize: FONTS.size.md, lineHeight: 22 },
  cardDate: { color: COLORS.textMuted, fontSize: FONTS.size.xs, marginTop: 4 },
  webNote: {
    color: COLORS.textSecondary, fontSize: FONTS.size.xs, fontStyle: 'italic',
    textAlign: 'center', paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md,
  },
});
