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
import { APP_VERSION } from '../constants/appInfo';

const APP_NAME = 'Tuzi — Trợ lý tử vi của bạn';
// Lấy từ app.json (qua Constants.expoConfig) — KHÔNG hardcode riêng ở đây nữa để tránh lệch
// phiên bản với app.json mỗi lần bump (đã từng xảy ra: app.json ghi 1.0.1 nhưng đây vẫn giữ bản cũ).
const VERSION = APP_VERSION;
const AUTHOR = 'Tuzi.vn';
const WEBSITE = 'https://tuzi.vn';
const SUPPORT_EMAIL = 'tuzi.vn@gmail.com';
const SUPPORT_PHONE = '0325585825';
const COPYRIGHT_YEAR = 2026;

export default function AboutScreen() {
  const navigation = useNavigation<any>();
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="Giới thiệu" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <BrandLogo size={150} />
          <Text style={styles.appName}>{APP_NAME}</Text>
          <Text style={styles.tagline}>Hỏi Tuzi bất cứ điều gì · Việc & Mục tiêu · Tử Vi – Bát Tự chuyên sâu</Text>
          <View style={styles.verBadge}>
            <Text style={styles.verText}>Phiên bản {VERSION}</Text>
          </View>
        </View>

        <Card title="Thông tin sản phẩm">
          <Row label="Tên sản phẩm" value={APP_NAME} />
          <Row label="Phiên bản" value={VERSION} />
          <Row label="Tác giả" value={AUTHOR} />
          <Row label="Website" value="Tuzi.vn" link={WEBSITE} />
          <Row label="Nền tảng" value="iOS · Android · Web" />
          <Row label="Bản quyền" value={`© ${COPYRIGHT_YEAR} ${AUTHOR}`} />
        </Card>

        <Card title="Liên hệ & Hỗ trợ">
          <Row label="Email" value={SUPPORT_EMAIL} />
          <Row label="Điện thoại / Zalo" value={SUPPORT_PHONE} />
          <Row label="Website" value="Tuzi.vn" link={WEBSITE} />
          <Row label="Địa chỉ" value="Hà Nội, Việt Nam" />
        </Card>

        <Card title="Giới thiệu">
          <Text style={styles.body}>
            Tuzi là <Text style={styles.em}>trợ lý thông minh cho đời sống hằng ngày</Text> — không chỉ là một ứng
            dụng xem Tử Vi. Trung tâm của Tuzi là <Text style={styles.em}>Hỏi Tuzi</Text>, biểu tượng trợ lý AI
            luôn sẵn sàng trên mọi màn hình, cùng bộ công cụ đồng hành mỗi ngày: quản lý <Text style={styles.em}>Việc
            & Mục tiêu</Text>, và xem "Ngày hôm nay" thuận lợi hay cần thận trọng.
          </Text>
          <Text style={[styles.body, { marginTop: SPACING.sm }]}>
            Tử Vi Đẩu Số & Tứ Trụ Bát Tự là <Text style={styles.em}>một module chuyên sâu</Text> bên trong Tuzi —
            dành cho ai muốn một bản luận giải thực sự chi tiết, đúc kết từ nhiều trường phái và hàng nghìn trang
            tài liệu chuyên sâu, kết hợp cùng AI thế hệ mới để cho ra luận giải mạch lạc, cá nhân hóa, bám sát
            từng chi tiết của lá số.
          </Text>
        </Card>

        <Card title="🧭 Đồng hành mỗi ngày">
          <Bullet text="Hỏi Tuzi: đặt câu hỏi ngắn về công việc, cảm xúc, các mối quan hệ, mục tiêu cá nhân… và nhận câu trả lời ngắn gọn ngay lập tức, mọi lúc mọi nơi trong app." />
          <Bullet text="Việc & Mục tiêu: quản lý việc ngắn hạn và mục tiêu dài hạn, chọn ngày bắt đầu/kết thúc qua lịch có tô màu ngày đẹp/xấu, sắp xếp thứ tự ưu tiên, nhận nhắc hạn đúng lúc." />
          <Bullet text="Sự kiện sắp tới: nhắc trước các dịp lễ Tết truyền thống, tiết khí và ngày quan trọng của riêng bạn (sinh nhật, cưới hỏi, khai trương, thi cử, giỗ, hợp đồng, tốt nghiệp…) — kèm ý nghĩa, nên làm/nên tránh, hướng xuất hành, mâm cúng tham khảo, dự báo thời tiết đúng ngày sự kiện, tùy chọn phân tích AI cá nhân hóa theo lá số, và nút duyệt nhanh sang sự kiện trước/sau." />
          <Bullet text="Dự báo thời tiết: xem nhanh thời tiết hôm nay ngay trên Trang chủ (nền hình ảnh cũng đổi theo — nắng, nhiều mây, mưa, đêm quang) và thời tiết đúng ngày diễn ra từng sự kiện sắp tới." />
          <Bullet text="Gợi ý tài chính: định hướng tài chính – đầu tư mang tính tham khảo cho hôm nay và tháng này, dựa trên dữ liệu Bát Tự đã có của bạn (không phải lời khuyên đầu tư thực sự)." />
          <Bullet text="Ghi chú nhanh: lưu lại điều chợt nhớ ra hoặc một sự kiện vừa diễn ra, xem lại theo từng ngày." />
          <Bullet text="Trang chủ: nhìn nhanh ngày hôm nay, nhịp cả tháng và việc quan trọng nhất — tất cả trong một màn hình." />
        </Card>

        <Card title="✨ Tử Vi & Bát Tự chuyên sâu">
          <Text style={styles.body}>
            Hai tầng luận giải bổ trợ cho nhau, mang lại chiều sâu mà các công cụ thông thường khó có:
          </Text>
          <Bullet text="Phân tích NÂNG CAO (offline): luận giải bài bản theo khung của các nhà nghiên cứu Tử Vi Nam Phái (Lê Quang Lăng) và phương pháp luận Diệu Xuân — chi tiết từng cung, từng đại/tiểu/nguyệt vận, không giới hạn độ dài." />
          <Bullet text="Phân tích AI CHUYÊN SÂU: bản luận dài, cấu trúc nhiều mục, biến lá số thành tư vấn THỰC TẾ về sự nghiệp – tài chính – tình duyên – sức khỏe, kèm gợi ý ngành nghề cụ thể và chiến lược hành động theo từng giai đoạn." />
          <Bullet text="Mọi nhận định đều dựa trên dữ kiện của chính lá số (chính tinh, miếu hãm, cách cục, Tứ Hóa, Phi Hóa, Thập Thần…), không nói chung chung, không mê tín." />
        </Card>

        <Card title="Chức năng chính">
          <Bullet text="Lập lá số Tử Vi Nam Phái đầy đủ: 14 chính tinh, lục cát – lục sát, Tứ Hóa, Phi Hóa Nam Phái, vòng Trường Sinh – Thái Tuế – Lộc Tồn, Tuần/Triệt…" />
          <Bullet text="Tứ Trụ Bát Tự chuyên sâu: thân vượng/nhược, Dụng – Hỷ – Kỵ thần, Thập Thần, cách cục, xung – hợp – hình – hại – phá, và phong thủy ngũ hành ứng dụng." />
          <Bullet text="Đại Vận · Tiểu Vận · Nguyệt Vận · Nhật vận: biểu đồ lượng hóa Tài lộc – Thách thức, chấm điểm theo thang 10, bản đồ tròn 12 trục." />
          <Bullet text="Luận giải từng cung & toàn lá số (cả Nâng cao lẫn AI), kèm tam hợp – nhị hợp – xung chiếu và vị trí từng sao." />
          <Bullet text="Xem ngày tốt/xấu, khung giờ hợp, chọn ngày xuất hành riêng theo lá số của bạn." />
          <Bullet text="Tư vấn ngành nghề, màu sắc, hướng, vật phẩm hợp mệnh theo Dụng thần." />
          <Bullet text="So sánh 2 lá số: đối chiếu mức độ hợp – khắc giữa hai người trên 12 khía cạnh, cả bản Nâng cao lẫn AI song song." />
          <Bullet text="Chân dung tương hợp: AI vẽ hình ảnh minh họa gương mặt người bạn đời/đối tác tương hợp dựa trên cung Phu Thê trong lá số của bạn — hình ảnh mang tính tham khảo, giải trí, không phải diện mạo có thật." />
          <Bullet text="Lưu nhiều lá số, xuất ảnh & phóng to lá số, tra cứu mọi lúc – mọi nơi." />
          <Bullet text="Trung tâm thông báo & khuyến mại: nhắc việc, nhắc sự kiện đúng lúc, cập nhật ưu đãi nạp xu mới nhất." />
        </Card>

        <Card title="Dành cho ai?">
          <Bullet text="Bất kỳ ai muốn một trợ lý đồng hành gọn nhẹ cho công việc, cảm xúc và mục tiêu hằng ngày — kể cả khi chưa cần xem Tử Vi/Bát Tự." />
          <Bullet text="Người cần một bản luận giải chi tiết, sâu sắc và cá nhân hóa cho chính mình và người thân." />
          <Bullet text="Người yêu thích, muốn học hỏi và nghiên cứu Tử Vi – Bát Tự một cách hệ thống, bài bản." />
          <Bullet text="Người muốn ứng dụng mệnh lý vào quyết định thực tế: chọn nghề, chọn thời điểm, quản trị rủi ro." />
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

        <Text style={styles.footer}>
          Bộ ảnh nhân vật đại diện dùng tài nguyên "Fluent Emoji" của Microsoft Corporation, giấy phép MIT.
        </Text>
        <Text style={styles.footer}>Made with ❤️ in Vietnam · {COPYRIGHT_YEAR}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, link }: { label: string; value: string; link?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {link ? (
        <Text style={styles.rowLink} onPress={() => Linking.openURL(link)}>{value}</Text>
      ) : (
        <Text style={styles.rowValue}>{value}</Text>
      )}
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
  appName: { fontSize: FONTS.size.lg, color: COLORS.gold, fontWeight: '800' },
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
  rowLink: { color: COLORS.gold, fontSize: FONTS.size.sm, fontWeight: '700', textDecorationLine: 'underline' },
  body: { color: COLORS.textPrimary, fontSize: FONTS.size.md, lineHeight: 22, textAlign: 'justify' },
  em: { color: COLORS.gold, fontWeight: '800' },
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
