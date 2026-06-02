/**
 * Màn hình "Điều khoản sử dụng" — quy định pháp lý giữa Người dùng và Ứng dụng.
 * Cấu trúc 17 điều mô phỏng chuẩn các ứng dụng Tử Vi thương mại, điều chỉnh
 * cho ứng dụng "Tử Vi & Bát Tự" do Nguyễn Văn Toàn phát hành.
 *
 * Anh có thể cập nhật các phần ĐỊA CHỈ / WEBSITE / EMAIL / SĐT trong hằng số
 * CONTACT bên dưới khi đã có thông tin chính thức.
 */
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import SimpleMarkdown from '../components/SimpleMarkdown';
import { COLORS, SPACING } from '../constants/theme';

const UPDATED = '29/05/2026';

// TODO: anh cập nhật thông tin chính thức tại đây.
const CONTACT = {
  appName: 'Tử Vi & Bát Tự',
  publisher: 'Nguyễn Văn Toàn',
  website: 'https://tuvi-batutu.vn',
  email: 'support@tuvi-batutu.vn',
  phone: '0913 377 666',
  address: 'Hà Nội, Việt Nam',
};

const CONTENT = `
**ĐIỀU KHOẢN SỬ DỤNG — Ứng dụng ${CONTACT.appName}**
Cập nhật lần cuối: ${UPDATED}

ĐIỀU KHOẢN SỬ DỤNG này (sau đây gọi là "**Điều khoản**") do tác giả ứng dụng **${CONTACT.appName}** (sau đây gọi là "**Chúng tôi**" hoặc "**${CONTACT.appName}**") ban hành, áp dụng đối với người dùng, bao gồm nhưng không giới hạn bởi cá nhân, tổ chức hoặc doanh nghiệp, thực hiện truy cập và/hoặc tạo tài khoản trên website ${CONTACT.website} và/hoặc cài đặt và sử dụng ứng dụng ${CONTACT.appName} trên iOS, Android (sau đây gọi chung là "**Người dùng**"). Người dùng, theo đó, xác nhận đã đọc, hiểu và đồng ý với các điều kiện và điều khoản tại bản Điều khoản này.

# 1. Giới thiệu về ${CONTACT.appName}

Ứng dụng ${CONTACT.appName} (website ${CONTACT.website} và ứng dụng di động — sau đây gọi chung là "**Hệ thống dịch vụ**" hoặc "**Hệ thống**") là hệ thống phần mềm chuyên về Tử Vi Đẩu Số (phái Nam Phái) và Tứ Trụ Bát Tự, hoạt động trên nền tảng mạng internet, các thiết bị di động và điện thoại di động.

Hệ thống giúp Người dùng khám phá và hiểu rõ hơn về bản thân thông qua các lá số Tử Vi và Bát Tự. Hệ thống cung cấp các công cụ phân tích lá số dựa trên giờ, ngày, tháng, năm sinh để cung cấp thông tin chi tiết về: cách cục Mệnh – Thân – Phúc Đức, đại vận, tiểu vận, nguyệt vận, tài vận, công danh sự nghiệp, tình duyên, gia đạo, sức khỏe, xem ngày tốt/xấu và nhiều khía cạnh khác trong cuộc sống. Hệ thống cũng tích hợp tính năng phân tích chuyên sâu bằng trí tuệ nhân tạo (AI) cho lá số tổng thể, từng cung, đại vận, tiểu vận, nguyệt vận và nhật vận.

# 2. Dữ liệu cá nhân

Các quy định về dữ liệu cá nhân của Người dùng được Chúng tôi cam kết giữ an toàn và bảo mật. Cách thức Chúng tôi thu thập, sử dụng, chia sẻ và xử lý dữ liệu cá nhân được quy định cụ thể tại **Chính Sách Bảo Mật** (trong mục "Thông tin bảo mật" của Ứng dụng). Người dùng, theo đó, đồng ý cho phép Chúng tôi thực hiện thu thập, sử dụng, chia sẻ và xử lý dữ liệu cá nhân cho mục đích cung cấp dịch vụ, tính năng trên Hệ thống.

# 3. Quyền sử dụng Hệ thống

Trừ các trường hợp được thỏa thuận riêng bằng văn bản giữa Chúng tôi và Người dùng, Chúng tôi cho phép Người dùng quyền sử dụng giới hạn, phi thương mại, không độc quyền và không thể chuyển giao đối với Hệ thống. Người dùng không được sao chép, đảo ngược, phân tách, lấy mã nguồn, chỉnh sửa, hoặc tạo ra các bản phái sinh, hoặc bất kỳ cải tiến, hoặc bất kỳ thành phần cấu tạo nào của Hệ thống.

Người dùng không được phép sử dụng tên gọi ${CONTACT.appName}, tên thương mại, logo hoặc bất kỳ nhận diện thương mại nào liên quan đến ${CONTACT.appName} và Hệ thống cho bất kỳ mục đích thương mại nào mà chưa có sự đồng ý bằng văn bản từ Chúng tôi.

Tất cả các quyền được trao cho Người dùng quy định tại Điều khoản này có thể được Chúng tôi thu hồi theo ý chí riêng trong bất kỳ hoàn cảnh nào, đặc biệt khi Người dùng có hành vi vi phạm Điều khoản hoặc quy định pháp luật.

# 4. Hỗ trợ Người dùng

Chúng tôi nỗ lực cung cấp các hỗ trợ về kỹ thuật, nâng cấp và cải tiến Hệ thống. Tuy nhiên, Chúng tôi sẽ không có nghĩa vụ phải thực hiện mọi hỗ trợ đối với Người dùng hoặc phải duy trì Hệ thống, đồng thời có quyền giới hạn và ngừng nâng cấp, cải tiến Hệ thống trong thời gian hoạt động.

Mọi yêu cầu hỗ trợ vui lòng gửi đến email **${CONTACT.email}** hoặc số điện thoại / Zalo **${CONTACT.phone}**. Chúng tôi sẽ phản hồi trong khoảng thời gian hợp lý, tùy theo độ phức tạp của yêu cầu.

# 5. Nghĩa vụ của Người dùng

Người dùng tuân thủ quy định về cung cấp thông tin tại Điều 7 của Điều khoản này, đảm bảo bất kỳ thông tin nào cung cấp cho Chúng tôi khi cài đặt, đăng ký tài khoản và sử dụng Hệ thống là thông tin thật của chính Người dùng, không vi phạm pháp luật, không gây ảnh hưởng hoặc gián đoạn hoạt động của Hệ thống.

Người dùng không được sử dụng Hệ thống cho mục đích vi phạm pháp luật, hoặc gây ảnh hưởng tới Chúng tôi, hoặc gây ảnh hưởng tới bất kỳ Người dùng hoặc bên thứ ba khác (bao gồm nhưng không giới hạn: tấn công hệ thống, gửi spam, gian lận xu, sử dụng tài khoản trái phép). Chúng tôi có toàn quyền ngừng hoặc chấm dứt quyền sử dụng của Người dùng và thực hiện các biện pháp ngăn chặn cần thiết theo quy định pháp luật khi phát hiện hành vi vi phạm.

# 6. Quyền sở hữu trí tuệ

Chúng tôi có toàn quyền sở hữu đối với Hệ thống ${CONTACT.appName} và toàn bộ các quyền sở hữu trí tuệ liên quan, bao gồm nhưng không giới hạn bởi: bản quyền mã nguồn, thuật toán an sao, cơ sở dữ liệu luận giải, giao diện, hình ảnh, tên thương mại, logo và các giải pháp công nghệ. Người dùng chỉ được phép sử dụng giới hạn Hệ thống theo các quy định tại Điều khoản này, và không bao gồm chuyển giao các quyền sở hữu trí tuệ hoặc các giấy phép bản quyền.

Các tư liệu cổ điển về Tử Vi Đẩu Số (Nam Phái – cụ Thiên Lương), Tứ Trụ Bát Tự và phong thủy được tham khảo, hệ thống hóa và lập trình lại trong Ứng dụng — phần triển khai kỹ thuật và nội dung luận giải gốc của Chúng tôi là tài sản trí tuệ thuộc sở hữu của Chúng tôi.

# 7. Cung cấp thông tin

Người dùng chịu toàn bộ trách nhiệm về các thông tin cung cấp cho Chúng tôi trong quá trình cài đặt và sử dụng Hệ thống. Người dùng cam kết các thông tin cung cấp:

- Đúng sự thật, không giả mạo hoặc gây nhầm lẫn;
- Không đe dọa, gây mất uy tín, nhạo báng, khiêu dâm, phân biệt chủng tộc, bịa đặt, vu khống hoặc vi phạm pháp luật;
- Thuộc sở hữu của Người dùng hoặc Người dùng được phép cung cấp và chia sẻ cho Chúng tôi (đặc biệt khi lập lá số cho người khác);
- Không vi phạm quyền sở hữu trí tuệ hoặc quyền riêng tư của bên thứ ba;
- Không chứa đựng thông tin quảng cáo, thư rác, hoặc các dạng tương tự;
- Không chứa virus hoặc bất kỳ công nghệ nào có khả năng gây ảnh hưởng tới Hệ thống hoặc Người dùng khác.

# 8. Điều khoản của bên thứ ba

Hệ thống có thể chứa các đường dẫn tới các nội dung khác được cung cấp bởi các bên thứ ba (OpenAI, Anthropic, Apple App Store, Google Play, ngân hàng đối tác, dịch vụ phân tích, v.v.). Các bên thứ ba này có thể ban hành các bản điều khoản sử dụng riêng và Chúng tôi sẽ không chịu trách nhiệm về quy định của các bên thứ ba đó.

# 9. Miễn trừ trách nhiệm

Trong phạm vi tối đa được pháp luật cho phép, Chúng tôi không đưa ra bất kỳ bảo đảm hay cam kết, dù rõ ràng hay ngụ ý, liên quan đến dịch vụ, tính năng, chất lượng, hiệu suất, sự phù hợp cho một mục đích cụ thể hoặc không vi phạm quyền của bên thứ ba. Các tính năng của Hệ thống được cung cấp **"nguyên trạng" (as-is)** và Người dùng chấp nhận tất cả các rủi ro có thể xảy ra trong quá trình sử dụng.

Người dùng hiểu và thừa nhận rằng đôi khi các tính năng có thể không khả dụng (lỗi mạng, lỗi nhà cung cấp AI, bảo trì hệ thống…) và Chúng tôi sẽ không chịu trách nhiệm về việc Người dùng không thể sử dụng Hệ thống vì bất kỳ lý do gì.

**Đặc biệt lưu ý — tính chất tham khảo:** Toàn bộ nội dung luận giải Tử Vi, Bát Tự, phong thủy, đại vận, tiểu vận, nguyệt vận, xem ngày tốt/xấu, phân tích AI… mang **tính tham khảo về văn hóa – tín ngưỡng dân gian phương Đông**, **KHÔNG phải lời khuyên y tế, tài chính, đầu tư, pháp lý hay quyết định trọng đại trong đời sống**. Người dùng có toàn quyền tự quyết định và tự chịu trách nhiệm về các hành động của mình. Chúng tôi không bảo đảm hay tuyên bố rằng Hệ thống sẽ luôn có sẵn để sử dụng ở mọi nơi; Người dùng chịu trách nhiệm tuân thủ luật pháp tại địa điểm sử dụng.

# 10. Giới hạn trách nhiệm

Trong phạm vi tối đa được pháp luật cho phép, Người dùng đồng ý rõ ràng rằng Chúng tôi trong mọi trường hợp sẽ KHÔNG chịu trách nhiệm về bất kỳ thiệt hại trực tiếp, gián tiếp, vô ý, hoặc do chủ quan, bao gồm nhưng không giới hạn: thiệt hại về lợi nhuận, dữ liệu, uy tín, các quyết định đầu tư – kinh doanh – hôn nhân – y tế… phát sinh từ việc sử dụng hoặc không thể sử dụng Hệ thống. Người dùng được toàn quyền gỡ cài đặt Hệ thống và ngừng sử dụng các tính năng khi thấy không hài lòng.

Chúng tôi sẽ không chịu trách nhiệm về tính hiệu lực, độ tin cậy hoặc tính chính xác của nội dung và thông tin được cung cấp qua Hệ thống. Việc sử dụng nội dung và thông tin thu được qua việc sử dụng Hệ thống sẽ thuộc quyền quyết định và chịu rủi ro của riêng Người dùng.

# 11. Phí sử dụng

Phí sử dụng được áp dụng đối với từng nội dung riêng biệt và được niêm yết công khai trên Hệ thống. Phí sử dụng được thể hiện thông qua hệ thống điểm **"xu"** (1 xu = 100 đồng) được quy định rõ trên Ứng dụng. Người dùng tích lũy xu thông qua việc:

- **Nạp xu trực tiếp** qua chuyển khoản ngân hàng / VietQR.
- **Mua qua kho ứng dụng** Apple App Store hoặc Google Play (in-app purchase).
- **Mua các Combo / Gói trọn đời** được công bố trên Ứng dụng.
- **Khuyến mãi tặng xu** (ví dụ: tặng 50 xu cho tài khoản đăng ký mới).

Mức giá của các Gói dịch vụ được niêm yết trên Ứng dụng hoặc trên Apple App Store / Google Play (nếu có) là giá cuối cùng Người dùng phải thanh toán, đã bao gồm phí sử dụng và các loại thuế, phí liên quan theo quy định pháp luật.

Mỗi Gói dịch vụ và số dư xu chỉ áp dụng cho một tài khoản của Người dùng. Khi Người dùng đăng nhập bằng tài khoản khác, Gói dịch vụ và số dư xu đã mua sẽ KHÔNG có hiệu lực. Trường hợp Người dùng nạp nhiều lần cho cùng một tài khoản, xu sẽ được tích lũy lũy kế.

Chúng tôi cung cấp miễn phí: tạo lá số Tử Vi, lập Bát Tự, luận giải Tổng quan, Tổng thể nâng cao (offline), Xem theo ngày (cơ bản), Đại vận / Tiểu vận / Nguyệt vận (cơ bản). Các nội dung mất phí — bao gồm phân tích chi tiết cung, phân tích AI cho toàn bộ lá số / cung / đại vận / tiểu vận / nguyệt vận / nhật vận — sẽ luôn hiển thị giá xu rõ ràng trước khi Người dùng quyết định mở khóa.

Xu đã mở khóa nội dung nào thì nội dung đó được giữ lại vĩnh viễn trong tài khoản (không cần trả lại xu khi xem lại). Trong trường hợp có sự thay đổi về chính sách hoặc giá niêm yết, Chúng tôi sẽ thông báo tới Người dùng trước khi áp dụng chính thức.

# 12. Hoàn, hủy gói dịch vụ

**Xu đã nạp và gói dịch vụ đã thanh toán sẽ KHÔNG được hoàn lại** trong bất kỳ trường hợp nào (trừ trường hợp nạp lỗi do hệ thống Chúng tôi gây ra, được Chúng tôi xác minh).

Trường hợp Người dùng mong muốn chấm dứt sử dụng dịch vụ, hoặc Chúng tôi chấm dứt cung cấp dịch vụ / quyền sử dụng của Người dùng với bất kỳ lý do nào (vẫn tuân thủ pháp luật hiện hành), tất cả các Gói dịch vụ đã thanh toán và xu còn lại trong tài khoản sẽ được mặc định hủy bỏ và KHÔNG được hoàn lại dưới bất kỳ hình thức nào.

**Xu KHÔNG phải là tiền**, không có giá trị lưu hành ngoài Hệ thống và không được sử dụng vào bất kỳ hình thức trao đổi nào khác nằm ngoài ${CONTACT.appName}. Xu KHÔNG thể rút ra khỏi Hệ thống dưới bất kỳ hình thức nào.

Đối với các giao dịch mua xu qua Apple App Store hoặc Google Play, chính sách hoàn tiền tuân theo quy định riêng của các kho ứng dụng đó — Người dùng vui lòng liên hệ trực tiếp Apple / Google để được hỗ trợ.

# 13. Chuyển giao quyền và nghĩa vụ

Chúng tôi có quyền tự do giao phó và chuyển nhượng các quyền và nghĩa vụ được quy định tại Điều khoản này cho bất kỳ bên thứ ba nào, kèm theo nghĩa vụ duy trì các cam kết về quyền lợi và quyền riêng tư của Người dùng.

# 14. Thay đổi và bổ sung

Chúng tôi có quyền cập nhật và thay đổi các quy định tại Điều khoản này vào bất kỳ thời điểm nào và cung cấp cho Người dùng bản sửa đổi bằng việc phát hành công khai và thông báo trên Ứng dụng. Trường hợp Người dùng không đồng ý với bản Điều khoản cập nhật, Người dùng có quyền ngừng sử dụng và gỡ cài đặt Hệ thống; tuy nhiên, mọi khoản phí đã thanh toán và xu còn lại sẽ KHÔNG được hoàn lại.

# 15. Luật áp dụng

Điều khoản này được điều chỉnh bởi luật pháp Việt Nam. Tất cả các tranh chấp hoặc khiếu kiện liên quan sẽ được giải quyết tại Trung Tâm Trọng Tài Thương Mại Quốc Tế Việt Nam (VIAC) tại Hà Nội theo quy tắc tố tụng của VIAC, hoặc tại Tòa án có thẩm quyền theo lựa chọn của bên khởi kiện.

# 16. Phiên bản Điều khoản

Điều khoản này có hiệu lực kể từ ngày được công bố trên Ứng dụng. Các quy định Miễn trừ trách nhiệm, Giới hạn trách nhiệm, Luật điều chỉnh sẽ tiếp tục có hiệu lực sau khi chấm dứt hiệu lực của Điều khoản này. Chúng tôi có quyền thay đổi Điều khoản này bất kỳ lúc nào. Người dùng nên chú ý cập nhật thường xuyên các thông báo từ Ứng dụng để nắm được các thay đổi mới nhất.

# 17. Bản quyền và quyền sở hữu trí tuệ

**17.1. Quyền sở hữu**

**${CONTACT.publisher}** là chủ sở hữu hợp pháp của Hệ thống ${CONTACT.appName}, bao gồm website ${CONTACT.website} và ứng dụng di động ${CONTACT.appName}, cùng toàn bộ công nghệ phát triển và nhãn hiệu giải pháp ${CONTACT.appName}. Tất cả nội dung trên website và ứng dụng — bao gồm nhưng không giới hạn ở văn bản, thiết kế, đồ họa, giao diện, hình ảnh, mã nguồn, nhãn hiệu, tên thương mại, logo và các sản phẩm phái sinh — đều thuộc bản quyền của ${CONTACT.publisher} hoặc bên thứ ba cấp phép cho ${CONTACT.publisher}, và được bảo hộ theo quy định của Luật Sở hữu trí tuệ Việt Nam và các văn bản liên quan.

**17.2. Cam kết về bản quyền**

${CONTACT.publisher} cam kết về bản quyền các nội dung và dịch vụ mà ${CONTACT.appName} cung cấp trên Hệ thống. ${CONTACT.publisher} là chủ sở hữu hợp pháp và có toàn quyền thương mại hóa các nội dung và dịch vụ này. Trong trường hợp có bất kỳ khiếu kiện, khiếu nại nào liên quan đến các nội dung và dịch vụ này, Người dùng vui lòng liên hệ bộ phận hỗ trợ của ${CONTACT.appName} qua email **${CONTACT.email}** để được giải đáp và hỗ trợ.

**17.3. Hành vi vi phạm**

Mọi hành vi sao chép, trích dẫn, sửa đổi, phân phối, xuất bản, lưu thông hoặc tái sử dụng trực tiếp hoặc gián tiếp những nội dung trên website và ứng dụng vì mục đích thương mại hoặc bất kỳ mục đích nào khác dưới bất kỳ hình thức nào mà không được sự chấp thuận trước bằng văn bản của ${CONTACT.publisher}; hoặc mọi hành động trực tiếp hoặc gián tiếp xâm phạm hoặc gây tổn hại đến công nghệ phát triển và nhãn hiệu giải pháp ${CONTACT.appName} đều được coi là xâm phạm quyền sở hữu hợp pháp của ${CONTACT.publisher}. ${CONTACT.publisher} có quyền yêu cầu Người dùng chấm dứt việc sử dụng dịch vụ, đồng thời người vi phạm phải chịu hoàn toàn mọi trách nhiệm trước pháp luật và phải bồi thường các tổn thất, thiệt hại gây ra cho ${CONTACT.publisher} (nếu có).

---

# Thông tin liên hệ

- **Đơn vị phát hành:** ${CONTACT.publisher}
- **Ứng dụng:** ${CONTACT.appName}
- **Email:** ${CONTACT.email}
- **Điện thoại / Zalo:** ${CONTACT.phone}
- **Website:** ${CONTACT.website}
- **Địa chỉ:** ${CONTACT.address}

_Bằng việc tiếp tục sử dụng Ứng dụng, Người dùng xác nhận đã đọc, hiểu và đồng ý với toàn bộ các điều khoản nêu trên._
`;

export default function TermsScreen() {
  const navigation = useNavigation<any>();
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="Điều khoản sử dụng" onBack={() => navigation.goBack()} />
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
