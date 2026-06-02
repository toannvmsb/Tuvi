/**
 * Màn hình "Thông tin bảo mật" — Chính sách bảo mật / quyền riêng tư.
 * Mô phỏng cấu trúc chuẩn (10 điều) của các ứng dụng Tử Vi thương mại,
 * được điều chỉnh cho ứng dụng "Tử Vi & Bát Tự" do Nguyễn Văn Toàn phát hành.
 *
 * Anh có thể cập nhật các phần ĐỊA CHỈ / WEBSITE / EMAIL / SỐ ĐIỆN THOẠI
 * trong hằng số CONTACT bên dưới khi đã có thông tin chính thức.
 */
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import SimpleMarkdown from '../components/SimpleMarkdown';
import { COLORS, SPACING } from '../constants/theme';

const UPDATED = '29/05/2026';

// TODO: anh cập nhật các thông tin liên hệ chính thức tại đây.
const CONTACT = {
  appName: 'Tử Vi & Bát Tự',
  publisher: 'Nguyễn Văn Toàn',
  website: 'https://tuvi-batutu.vn',
  email: 'support@tuvi-batutu.vn',
  phone: '0913 377 666',
  address: 'Hà Nội, Việt Nam',
};

const CONTENT = `
**Chính Sách Bảo Mật — Ứng dụng ${CONTACT.appName}**
Cập nhật lần cuối: ${UPDATED}

Trên cơ sở tuân thủ các quy định pháp luật Việt Nam, Chính Sách Bảo Mật này được tác giả ứng dụng **${CONTACT.appName}** (sau đây gọi là "Ứng dụng" hoặc "Chúng tôi") xây dựng nhằm giúp Người dùng hiểu rõ về quy trình và các biện pháp bảo vệ dữ liệu cá nhân mà Ứng dụng đang áp dụng.

Chính Sách Bảo Mật này áp dụng cho tất cả Người dùng đã, đang sử dụng Ứng dụng trên các nền tảng di động (iOS, Android) và website (nếu có).

Chúng tôi tôn trọng quyền riêng tư của mỗi cá nhân, do đó, cam kết chỉ thu thập dữ liệu cá nhân sau khi được sự đồng ý của Người dùng về các nội dung được quy định tại Chính Sách này.

# 1. Thu thập sự đồng ý của Người dùng

1.1. Khi Người dùng sử dụng Ứng dụng hoặc truy cập và thực hiện một số thao tác trên Ứng dụng (đăng ký tài khoản, lập lá số, mua xu, mở khóa nội dung phân tích nâng cao hoặc phân tích AI…), trước tiên, Ứng dụng cần có được sự đồng ý của Người dùng với toàn bộ nội dung được quy định tại Chính Sách Bảo Mật này (bao gồm các phiên bản được sửa đổi, bổ sung trong tương lai). Sự chấp thuận của Người dùng được thể hiện thông qua việc cung cấp các dữ liệu cá nhân và sử dụng dịch vụ, đồng thời thông qua các hành động chấp thuận điện tử như: đánh dấu "tick" vào ô "Tôi đồng ý…", nhấn nút "Đồng ý / Tiếp tục", xác thực mật khẩu (OTP / email) hoặc đơn giản là tiếp tục sử dụng Ứng dụng ("Hành động chấp thuận").

1.2. Bằng việc thực hiện Hành động chấp thuận, Ứng dụng mặc nhiên hiểu rằng Người dùng đã đọc, hiểu rõ và đồng ý với việc thu thập và xử lý dữ liệu theo Chính Sách Bảo Mật này. Trường hợp Người dùng không đồng ý, vui lòng không thực hiện Hành động chấp thuận, không truy cập và không tiếp tục sử dụng Ứng dụng. Nếu Người dùng từ chối cung cấp thông tin, một số tính năng có thể không hoạt động đầy đủ (ví dụ: không có ngày–giờ sinh thì không lập được lá số).

# 2. Các loại dữ liệu cá nhân được thu thập và mục đích thu thập

Để cung cấp các dịch vụ và tính năng của Ứng dụng, theo yêu cầu của Người dùng và bên thứ ba cung cấp dịch vụ mà Ứng dụng sử dụng, có thể cần thu thập, ghi, phân tích, xác nhận, lưu trữ, chỉnh sửa, sử dụng, kết hợp, truy cập, mã hóa, giải mã, sao chép, chia sẻ, truyền đưa, cung cấp, chuyển giao, xóa, hủy dữ liệu cá nhân hoặc các hành động khác liên quan tới xử lý dữ liệu mà các thông tin này chứa đựng bất kỳ dữ liệu nào liên quan trực tiếp hoặc gián tiếp đến Người dùng. Người dùng đồng ý cho Ứng dụng và các bên thứ ba cung cấp dịch vụ (lưu trữ đám mây, AI, cổng thanh toán…) thu thập và xử lý các loại dữ liệu cá nhân sau đây:

**Dữ liệu cá nhân của Người dùng:**

- **Email và mật khẩu** — tạo và đăng nhập tài khoản, khôi phục mật khẩu.
- **Họ tên / biệt danh** — gắn nhãn lá số, cá nhân hóa lời chào, xuất file PDF.
- **Giới tính** — tính lá số (an sao theo Nam / Nữ).
- **Giờ, ngày, tháng, năm sinh (dương lịch)** — đầu vào bắt buộc để tính lá số Tử Vi và Tứ Trụ Bát Tự.
- **Tỉnh / thành phố nơi sinh** (tùy chọn) — bổ sung dữ liệu cho phần Nhật vận / xem ngày.
- **Bộ nhớ thiết bị** — lưu / xuất lá số dạng PDF khi Người dùng yêu cầu.
- **Thông tin thiết bị** (model, hệ điều hành, phiên bản app, ngôn ngữ) — đề xuất phiên bản phù hợp, hỗ trợ kỹ thuật.
- **Dữ liệu thanh toán** — thông qua dịch vụ bên thứ ba (VietQR / cổng ngân hàng / Apple App Store / Google Play) để xác thực giao dịch nạp xu. Ứng dụng KHÔNG lưu trữ số thẻ ngân hàng, mã CVV hay mật khẩu thanh toán.
- **Lịch sử sử dụng trong Ứng dụng** — danh sách lá số đã lưu, lịch sử nạp xu, lịch sử mở khóa nội dung — để Người dùng tra cứu lại và để Ứng dụng tính số dư xu chính xác.
- **Cookies và dữ liệu phân tích** (nếu sử dụng website) — phân tích, thống kê, tối ưu hóa trải nghiệm Người dùng.

**Ứng dụng KHÔNG thu thập:** danh bạ, vị trí GPS, micro, camera (trừ khi Người dùng chủ động chọn ảnh đại diện), tin nhắn, lịch sử cuộc gọi.

**Dữ liệu cá nhân không phải của Người dùng:**

Ứng dụng không hạn chế việc Người dùng tạo lá số cho người khác (vợ/chồng, con cái, bạn bè…). Tuy nhiên, trường hợp Người dùng nhập dữ liệu cá nhân của cá nhân khác để tạo lá số, Người dùng phải đảm bảo đã có sự đồng ý của cá nhân đó trước khi nhập. Ứng dụng được miễn trừ trách nhiệm liên quan khi có bất kỳ khiếu nại nào từ bên thứ ba liên quan đến việc sử dụng dữ liệu cá nhân trái phép bởi Người dùng.

# 3. Quyền của Người dùng đối với dữ liệu cá nhân

3.1. Người dùng có quyền cung cấp dữ liệu cá nhân cho Ứng dụng và có thể thay đổi quyết định đó bất cứ lúc nào. Người dùng có các quyền về Dữ liệu cá nhân theo quy định pháp luật, bao gồm nhưng không giới hạn: quyền được biết, quyền đồng ý, quyền truy cập, quyền rút lại sự đồng ý, quyền xóa dữ liệu, quyền hạn chế xử lý, quyền yêu cầu cung cấp dữ liệu, quyền phản đối xử lý, quyền khiếu nại, tố cáo, khởi kiện, quyền yêu cầu bồi thường, quyền tự bảo vệ và các quyền khác theo quy định pháp luật.

3.2. Người dùng có thể thực hiện các quyền trên ngay trong Ứng dụng (chỉnh sửa thông tin tài khoản, đổi mật khẩu, xóa lá số đã lưu, xóa lịch sử nạp xu) hoặc liên hệ trực tiếp theo thông tin tại Điều 8. Khi Người dùng yêu cầu sửa đổi, rút lại sự đồng ý hoặc xóa các dữ liệu trọng yếu, Ứng dụng có thể yêu cầu cung cấp dữ liệu xác minh nhằm bảo đảm tính chính chủ của người yêu cầu.

3.3. Khi Người dùng rút lại sự đồng ý hoặc xóa dữ liệu, Ứng dụng sẽ hạn chế hoặc ngừng sử dụng dữ liệu, hủy bỏ toàn bộ hoặc một phần dữ liệu. Tuy nhiên, điều này có thể dẫn đến việc Người dùng không thể tiếp tục sử dụng các tính năng hoặc làm ảnh hưởng đến trải nghiệm. Người dùng nên cân nhắc cẩn trọng trước khi thực hiện các quyền này.

# 4. Chia sẻ dữ liệu cá nhân

Người dùng đồng ý cho Ứng dụng chia sẻ dữ liệu cá nhân cho các đối tượng sau:

**4.1. Các đối tác / nhà cung cấp dịch vụ kỹ thuật:**

- Nền tảng lưu trữ đám mây (cơ sở dữ liệu, xác thực, lưu file) để vận hành tài khoản và đồng bộ lá số giữa các thiết bị.
- Nhà cung cấp dịch vụ AI: OpenAI (ChatGPT) là dịch vụ chính, Anthropic (Claude) là dịch vụ dự phòng. Khi Người dùng chủ động yêu cầu "Phân tích AI", dữ liệu lá số (KHÔNG kèm email, mật khẩu, thông tin thanh toán) được gửi đến các nhà cung cấp này để tạo nội dung luận giải. Việc xử lý dữ liệu tại đây tuân theo chính sách của các nhà cung cấp đó.
- Cổng thanh toán / cổng nạp xu (VietQR / SePay / Apple App Store / Google Play) để xác thực giao dịch.

**4.2. Cơ quan thực thi pháp luật và bảo vệ dữ liệu:**

- Ứng dụng sẽ chia sẻ dữ liệu cá nhân để thực hiện đúng nghĩa vụ hợp pháp theo luật hiện hành, hoặc theo yêu cầu của cơ quan có thẩm quyền.

**4.3. Bên mua / Bên nhận chuyển giao Ứng dụng:**

- Ứng dụng sẽ chia sẻ dữ liệu cá nhân trong trường hợp bán hoặc thương lượng để bán một phần hoặc toàn bộ Ứng dụng cho bên mua hoặc bên mua tiềm năng, kèm nghĩa vụ duy trì các cam kết về quyền riêng tư đã tuyên bố trong Chính Sách này.

Ngoài các trường hợp nêu trên, Ứng dụng cam kết KHÔNG bán, cho thuê hay trao đổi dữ liệu cá nhân của Người dùng vì mục đích thương mại.

# 5. Chuyển dữ liệu cá nhân ra nước ngoài

Trong một số trường hợp đặc biệt — sử dụng dịch vụ AI của OpenAI / Anthropic (máy chủ tại Hoa Kỳ), sử dụng dịch vụ lưu trữ đám mây quốc tế, hoặc phân tích dữ liệu không thể thực hiện trong nước — Người dùng đồng ý cho phép Ứng dụng chuyển dữ liệu cá nhân của Người dùng ra nước ngoài với điều kiện bảo đảm các yếu tố về an ninh và an toàn thông tin theo quy định pháp luật Việt Nam.

# 6. Lưu trữ, xóa, hủy dữ liệu cá nhân

6.1. Dữ liệu cá nhân của Người dùng được lưu trữ trên (a) thiết bị của Người dùng (lá số chưa đăng nhập, cài đặt cá nhân) và (b) nền tảng điện toán đám mây của tổ chức cung cấp giải pháp đám mây mà Ứng dụng sử dụng (khi Người dùng đăng nhập tài khoản). Ứng dụng chỉ lưu giữ dữ liệu cá nhân trong thời gian cần thiết để cung cấp dịch vụ và theo quy định pháp luật.

6.2. Ứng dụng thực hiện xử lý và lưu dữ liệu từ thời điểm thu thập cho đến khi Người dùng hoặc cơ quan nhà nước có thẩm quyền yêu cầu xóa hoặc huỷ dữ liệu. Trong trường hợp Người dùng yêu cầu xoá dữ liệu, một số dữ liệu có thể được giữ lại khi pháp luật quy định không cho phép xóa (ví dụ: hóa đơn / chứng từ giao dịch nạp xu).

6.3. **Yêu cầu xóa tài khoản:** Nếu Người dùng muốn xóa tài khoản khỏi hệ thống, vui lòng gửi email đến **${CONTACT.email}** với tiêu đề: *"Yêu cầu xóa tài khoản"*. Chúng tôi sẽ xử lý yêu cầu trong vòng **07 ngày làm việc**. Sau khi xóa, toàn bộ lá số đã lưu, lịch sử mở khóa nội dung và số dư xu trong tài khoản sẽ bị xóa vĩnh viễn và KHÔNG thể khôi phục — Người dùng vui lòng cân nhắc kỹ.

# 7. Dữ liệu cá nhân của trẻ em

Ứng dụng không cố ý hoặc được thiết kế để thu thập dữ liệu cá nhân của trẻ em dưới 13 tuổi. Việc lập lá số cho trẻ em (do cha mẹ thực hiện) là phổ biến trong văn hóa Tử Vi Việt Nam — trong trường hợp này, cha mẹ / người giám hộ chịu trách nhiệm về việc cung cấp thông tin của trẻ và đồng ý với Chính Sách này thay mặt cho trẻ. Chúng tôi khuyến khích cha mẹ và người giám hộ tham gia vào các hoạt động trực tuyến của trẻ em để đảm bảo an toàn dữ liệu.

# 8. Liên hệ

Chúng tôi cam kết bảo vệ dữ liệu cá nhân của Người dùng theo đúng quy định pháp luật và thực hiện các biện pháp kỹ thuật, tổ chức thích hợp trong khả năng để bảo vệ an toàn cho dữ liệu cá nhân. Tuy nhiên, không có hệ thống nào an toàn tuyệt đối; Người dùng cũng cần giữ gìn thiết bị, mật khẩu của mình cẩn thận.

Trường hợp có bất kỳ thắc mắc nào về Chính Sách Bảo Mật, Người dùng có thể liên hệ:

- **Đơn vị phát hành:** ${CONTACT.publisher}
- **Email:** ${CONTACT.email}
- **Điện thoại / Zalo:** ${CONTACT.phone}
- **Website:** ${CONTACT.website}
- **Địa chỉ:** ${CONTACT.address}

# 9. Luật áp dụng

Chính Sách Bảo Mật này được điều chỉnh bởi luật pháp Việt Nam. Tất cả các tranh chấp hoặc khiếu kiện liên quan sẽ được giải quyết tại Trung Tâm Trọng Tài Thương Mại Quốc Tế Việt Nam (VIAC) tại Hà Nội theo quy tắc tố tụng của VIAC, hoặc tại Tòa án có thẩm quyền theo lựa chọn của bên khởi kiện.

# 10. Phiên bản Chính Sách Bảo Mật

Chính Sách Bảo Mật này có hiệu lực kể từ ngày được công bố trên Ứng dụng. Các quy định Miễn trừ trách nhiệm, Giới hạn trách nhiệm, Luật điều chỉnh sẽ tiếp tục có hiệu lực sau khi chấm dứt hiệu lực của Chính Sách Bảo Mật. Chúng tôi có quyền thay đổi Chính Sách Bảo Mật này bất kỳ lúc nào; Người dùng nên chú ý cập nhật các thông báo từ Ứng dụng để nắm được các thay đổi mới nhất.

_Bằng việc tiếp tục sử dụng Ứng dụng, Người dùng xác nhận đã đọc, hiểu và đồng ý với Chính Sách Bảo Mật này._
`;

export default function PrivacyScreen() {
  const navigation = useNavigation<any>();
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="Thông tin bảo mật" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <SimpleMarkdown content={CONTENT} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  card: {
    backgroundColor: COLORS.card, borderRadius: 12,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
});
