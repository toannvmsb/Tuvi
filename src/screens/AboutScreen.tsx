/**
 * Màn hình "Giới thiệu" — thông tin về sản phẩm, phiên bản, tác giả.
 */
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import BrandLogo from '../components/BrandLogo';
import { COLORS, FONTS, SPACING } from '../constants/theme';

const APP_NAME = 'Tuzi — Tử Vi & Bát Tự';
const VERSION = '1.0.0';
const AUTHOR = 'Nguyễn Văn Toàn';
const WEBSITE = 'https://tuzi.vn';
const SUPPORT_EMAIL = 'support@tuzi.vn';
const SUPPORT_PHONE = '0913 377 666';
const YEAR = new Date().getFullYear();

export default function AboutScreen() {
  const navigation = useNavigation<any>();
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="Giới thiệu" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <BrandLogo size={120} />
          <Text style={styles.appName}>{APP_NAME}</Text>
          <Text style={styles.tagline}>Lá số Tử Vi · Bát Tự · Luận giải bằng AI</Text>
          <View style={styles.verBadge}>
            <Text style={styles.verText}>Phiên bản {VERSION}</Text>
          </View>
        </View>

        <Card title="Thông tin sản phẩm">
          <Row label="Tên sản phẩm" value={APP_NAME} />
          <Row label="Phiên bản" value={VERSION} />
          <Row label="Tác giả" value={AUTHOR} />
          <Row label="Website" value="tuzi.vn" />
          <Row label="Nền tảng" value="iOS · Android · Web" />
          <Row label="Bản quyền" value={`© ${YEAR} ${AUTHOR}`} />
        </Card>

        <Card title="Liên hệ & Hỗ trợ">
          <Row label="Email" value={SUPPORT_EMAIL} />
          <Row label="Điện thoại / Zalo" value={SUPPORT_PHONE} />
          <Row label="Website" value="tuzi.vn" />
          <Row label="Địa chỉ" value="Hà Nội, Việt Nam" />
        </Card>

        <Card title="Giới thiệu">
          <Text style={styles.body}>
            Ứng dụng hỗ trợ lập và luận giải lá số Tử Vi Đẩu Số (phái Nam Phái) cùng
            Tứ Trụ Bát Tự, có biểu đồ Đại Vận – Tiểu Vận – Tài Lộc, bản đồ tròn 12 trục,
            và luận giải chuyên sâu bằng AI. Toàn bộ logic an sao, đại vận, tiểu vận
            được tính theo các tài liệu Tử Vi Đẩu Số truyền thống (Tử Vi Đẩu Số Toàn Thư,
            Tử Vi Hàm Số…), đối chiếu với các phần mềm phổ biến.
          </Text>
        </Card>

        <Card title="Chức năng chính">
          <Bullet text="Lập lá số Tử Vi đầy đủ 14 chính tinh, lục cát, lục sát, tứ hóa, vòng Trường Sinh, Thái Tuế, Bác Sĩ…" />
          <Bullet text="Bát Tự (Tứ Trụ) với dụng/kỵ thần ngũ hành." />
          <Bullet text="Đại Vận / Tiểu Vận với biểu đồ lượng hóa Tài lộc – Thách thức, bản đồ tròn 12 trục." />
          <Bullet text="Phân tích chuyên sâu bằng AI cho từng cung và toàn lá số." />
          <Bullet text="Xuất ảnh, phóng to lá số, lưu vào thư viện ảnh." />
        </Card>

        <Card title="Lưu ý">
          <Text style={styles.body}>
            Nội dung do AI tạo mang tính tham khảo, không thay thế luận giải của chuyên gia.
            Vui lòng sử dụng có trách nhiệm và đối chiếu với các tài liệu chính thống.
          </Text>
        </Card>

        <TouchableOpacity
          style={styles.btn}
          onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>✉️ Liên hệ / Góp ý</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnGhost]}
          onPress={() => Linking.openURL(WEBSITE)}
          activeOpacity={0.85}
        >
          <Text style={[styles.btnText, { color: COLORS.gold }]}>🌐 Truy cập tuzi.vn</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>Made with ❤️ in Vietnam · {YEAR}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}
function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bullet}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.body}>{text}</Text>
    </View>
  );
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },
  hero: { alignItems: 'center', gap: 6, paddingVertical: SPACING.md },
  logo: { fontSize: 56, color: COLORS.gold },
  appName: { fontSize: FONTS.size.xxl, color: COLORS.gold, fontWeight: '800' },
  tagline: { fontSize: FONTS.size.sm, color: COLORS.textSecondary, fontStyle: 'italic' },
  verBadge: {
    marginTop: 6, backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md, paddingVertical: 4, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.gold,
  },
  verText: { color: COLORS.gold, fontWeight: '700', fontSize: FONTS.size.sm },
  card: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, gap: SPACING.xs,
  },
  cardTitle: { color: COLORS.gold, fontSize: FONTS.size.md, fontWeight: '800', marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { color: COLORS.textSecondary, fontSize: FONTS.size.sm },
  rowValue: { color: COLORS.textPrimary, fontSize: FONTS.size.sm, fontWeight: '700' },
  body: { color: COLORS.textPrimary, fontSize: FONTS.size.md, lineHeight: 22 },
  bullet: { flexDirection: 'row', gap: 6, paddingVertical: 2 },
  bulletDot: { color: COLORS.gold, fontSize: FONTS.size.md, lineHeight: 22 },
  btn: {
    backgroundColor: COLORS.gold, borderRadius: 10,
    paddingVertical: SPACING.md, alignItems: 'center',
  },
  btnText: { color: '#1a0a00', fontSize: FONTS.size.md, fontWeight: '800' },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.gold, marginTop: SPACING.sm },
  footer: { color: COLORS.textMuted, fontSize: FONTS.size.xs, textAlign: 'center', marginTop: SPACING.md },
});
