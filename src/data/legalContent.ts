/**
 * Nội dung pháp lý dùng CHUNG cho toàn app:
 *  - PrivacyScreen / TermsScreen (qua menu)
 *  - Modal trong LoginScreen (khi đăng ký, KH nhấn vào link để đọc trước khi tích đồng ý)
 *
 * Tách ra đây để KHÔNG duplicate nội dung. Cập nhật thông tin liên hệ tại CONTACT.
 */

export const LEGAL_UPDATED = '08/08/2026';

export const CONTACT = {
  appName: 'Tuzi — Trợ lý thông minh của bạn',
  publisher: 'Tuzi.vn',
  website: 'https://tuzi.vn',
  email: 'tuzi.vn@gmail.com',
  phone: '0325585825',
  address: 'Hà Nội, Việt Nam',
};

export const PRIVACY_CONTENT = `
**Chính Sách Bảo Mật — Ứng dụng ${CONTACT.appName}**
Cập nhật lần cuối: ${LEGAL_UPDATED}

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
- **Nội dung "Việc & Mục tiêu"** — tiêu đề, ghi chú, ngày bắt đầu/kết thúc, trạng thái và thứ tự ưu tiên do Người dùng tự nhập — để hiển thị, nhắc hạn và gợi ý thời điểm phù hợp.
- **Nội dung "Ghi chú nhanh"** — nội dung ghi chú tự do và ngày ghi chú do Người dùng tự nhập — để lưu lại và hiển thị theo ngày, không được Hệ thống phân tích hay đối chiếu với lá số.
- **Nội dung "Sự kiện sắp tới"** — các sự kiện cá nhân do Người dùng tự thêm (tiêu đề, ngày, loại sự kiện, người liên quan nếu có), tùy chọn bật/tắt thông báo và số ngày nhắc trước cho từng sự kiện, trạng thái đã ẩn/nhắc lại sau — để hiển thị đúng lịch cá nhân và nhắc đúng lúc. "Gợi ý tài chính" ở Trang chủ KHÔNG thu thập thêm dữ liệu nào — chỉ đọc lại dữ liệu Bát Tự đã có của Người dùng để tạo gợi ý, xử lý hoàn toàn trên hệ thống của Ứng dụng, không gửi cho bên thứ ba.
- **Token thông báo đẩy (push token)** — mã định danh thiết bị do Expo cấp, dùng để gửi thông báo nhắc việc/sự kiện và thông báo khuyến mại từ Ứng dụng; Người dùng có thể tắt trong phần cài đặt thông báo của thiết bị bất kỳ lúc nào.
- **Lượt sử dụng "Hỏi Tuzi" (Chat AI)** — Hệ thống chỉ đếm SỐ LƯỢT hỏi theo ngày để tính hạn mức miễn phí; **KHÔNG lưu trữ nội dung câu hỏi và câu trả lời** sau khi phiên trò chuyện kết thúc. Nếu Người dùng có lá số đang gắn, một khối tóm tắt facts NGẮN GỌN từ lá số đó (Mệnh/Thân, Bát Tự, vận hiện tại — không kèm thông tin định danh khác) có thể được gửi kèm câu hỏi tới nhà cung cấp AI để trả lời đúng ngữ cảnh khi câu hỏi liên quan tới lá số; khối này KHÔNG được lưu trữ lại sau khi trả lời xong.
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
- Nhà cung cấp dịch vụ AI: OpenAI (ChatGPT) là dịch vụ chính, Anthropic (Claude) là dịch vụ dự phòng. Khi Người dùng chủ động yêu cầu "Phân tích AI", dữ liệu lá số (KHÔNG kèm email, mật khẩu, thông tin thanh toán) được gửi đến các nhà cung cấp này để tạo nội dung luận giải. Tương tự, khi Người dùng dùng "Hỏi Tuzi" (Chat AI), nội dung câu hỏi — và một khối tóm tắt facts ngắn gọn từ lá số đang gắn nếu câu hỏi liên quan tới lá số (KHÔNG kèm email, mật khẩu, thông tin thanh toán) — được gửi tới nhà cung cấp AI để tạo câu trả lời, và KHÔNG được lưu trữ lại sau khi trả lời xong. Việc xử lý dữ liệu tại các nhà cung cấp này tuân theo chính sách riêng của họ.
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

export const TERMS_CONTENT = `
**ĐIỀU KHOẢN SỬ DỤNG — Ứng dụng ${CONTACT.appName}**
Cập nhật lần cuối: ${LEGAL_UPDATED}

ĐIỀU KHOẢN SỬ DỤNG này (sau đây gọi là "**Điều khoản**") do tác giả ứng dụng **${CONTACT.appName}** (sau đây gọi là "**Chúng tôi**" hoặc "**${CONTACT.appName}**") ban hành, áp dụng đối với người dùng, bao gồm nhưng không giới hạn bởi cá nhân, tổ chức hoặc doanh nghiệp, thực hiện truy cập và/hoặc tạo tài khoản trên website ${CONTACT.website} và/hoặc cài đặt và sử dụng ứng dụng ${CONTACT.appName} trên iOS, Android (sau đây gọi chung là "**Người dùng**"). Người dùng, theo đó, xác nhận đã đọc, hiểu và đồng ý với các điều kiện và điều khoản tại bản Điều khoản này.

# 1. Giới thiệu về ${CONTACT.appName}

Ứng dụng ${CONTACT.appName} (website ${CONTACT.website} và ứng dụng di động — sau đây gọi chung là "**Hệ thống dịch vụ**" hoặc "**Hệ thống**") là nền tảng **trợ lý thông minh cho đời sống hằng ngày** (AI Life Intelligence Platform), hoạt động trên nền tảng mạng internet, các thiết bị di động và điện thoại di động. Hệ thống kết hợp một trợ lý AI trò chuyện đồng hành cùng người dùng với nền tảng tri thức Tử Vi Đẩu Số (phái Nam Phái) và Tứ Trụ Bát Tự — Tử Vi & Bát Tự là MỘT module chuyên sâu trong Hệ thống, không phải toàn bộ mục đích của Hệ thống.

Hệ thống bao gồm các nhóm tính năng chính:

- **Hỏi Tuzi (Chat AI)** — biểu tượng trợ lý AI hiện trên mọi màn hình của Ứng dụng, cho phép Người dùng đặt câu hỏi ngắn (tối đa 500 từ) về công việc, cảm xúc, các mối quan hệ, mục tiêu cá nhân… và nhận câu trả lời ngắn gọn từ AI. Có hạn mức miễn phí theo ngày; sử dụng vượt hạn mức sẽ trừ xu theo mức phí niêm yết trong Ứng dụng.
- **Việc & Mục tiêu** — công cụ quản lý công việc ngắn hạn và mục tiêu dài hạn của Người dùng, cho phép đặt ngày bắt đầu/ngày kết thúc (tham khảo lịch "ngày tốt/xấu" do Hệ thống tính toán để hỗ trợ chọn thời điểm), sắp xếp thứ tự ưu tiên, và nhận thông báo nhắc hạn.
- **Ghi chú nhanh** — sổ ghi chú tự do theo ngày để Người dùng lưu lại điều chợt nhớ ra hoặc một sự kiện đã diễn ra; độc lập với "Việc & Mục tiêu", không có ngày hạn hay trạng thái hoàn thành.
- **Sự kiện sắp tới** — nhắc và cá nhân hóa các dịp lễ Tết truyền thống, tiết khí, cùng sự kiện cá nhân do Người dùng tự thêm (sinh nhật, cưới hỏi, khai trương, thi cử, giỗ, hợp đồng, tốt nghiệp…): ý nghĩa, nên làm/nên tránh, hướng xuất hành, gợi ý mâm cúng – bài cúng tham khảo, checklist chuẩn bị và tùy chọn phân tích AI cá nhân hóa theo lá số.
- **Gợi ý tài chính** — gợi ý định hướng tài chính – đầu tư mang tính tham khảo văn hóa – mệnh lý cho hôm nay và tháng này, dựa trên dữ liệu Bát Tự đã có của Người dùng; **KHÔNG phải lời khuyên đầu tư tài chính thực sự** (xem thêm Điều 9).
- **Tử Vi Đẩu Số & Tứ Trụ Bát Tự** — công cụ lập và phân tích lá số dựa trên giờ, ngày, tháng, năm sinh: cách cục Mệnh – Thân – Phúc Đức, đại vận, tiểu vận, nguyệt vận, nhật vận, tài vận, công danh sự nghiệp, tình duyên, gia đạo, sức khỏe, xem ngày tốt/xấu và nhiều khía cạnh khác; có thể so sánh mức độ tương hợp giữa hai lá số. Hệ thống tích hợp phân tích chuyên sâu bằng trí tuệ nhân tạo (AI) cho lá số tổng thể, từng cung, đại vận, tiểu vận, nguyệt vận, nhật vận và so sánh lá số.

Người dùng có thể sử dụng "Hỏi Tuzi", "Việc & Mục tiêu", "Ghi chú nhanh", "Sự kiện sắp tới" và "Gợi ý tài chính" độc lập, không bắt buộc phải lập lá số Tử Vi/Bát Tự trước.

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

Bộ ảnh nhân vật đại diện (mục "Nhân vật đại diện" trong Tài khoản) sử dụng tài nguyên **Fluent Emoji** của Microsoft Corporation, phát hành theo **giấy phép MIT**: cho phép sử dụng, sao chép, sửa đổi và phân phối tự do kể cả cho mục đích thương mại, với điều kiện giữ nguyên thông báo bản quyền gốc. Chi tiết: https://github.com/microsoft/fluentui-emoji.

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

**Đặc biệt lưu ý — tính chất tham khảo:** Toàn bộ nội dung luận giải Tử Vi, Bát Tự, phong thủy, đại vận, tiểu vận, nguyệt vận, xem ngày tốt/xấu, phân tích AI, **"Gợi ý tài chính"**, nội dung ý nghĩa/nên làm/nên tránh/mâm cúng/bài cúng tại **"Sự kiện sắp tới"**… mang **tính tham khảo về văn hóa – tín ngưỡng dân gian phương Đông**, **KHÔNG phải lời khuyên y tế, tài chính, đầu tư, pháp lý hay quyết định trọng đại trong đời sống**. Riêng "Gợi ý tài chính" chỉ gợi ý HÌNH THỨC/NHÓM tài sản chung chung (vàng, tiết kiệm, chứng khoán, bất động sản…) dựa trên dữ liệu Bát Tự, tuyệt đối KHÔNG khuyến nghị mã cổ phiếu, tài sản hay khoản đầu tư cụ thể nào. Người dùng có toàn quyền tự quyết định và tự chịu trách nhiệm về các hành động của mình. Chúng tôi không bảo đảm hay tuyên bố rằng Hệ thống sẽ luôn có sẵn để sử dụng ở mọi nơi; Người dùng chịu trách nhiệm tuân thủ luật pháp tại địa điểm sử dụng.

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

Chúng tôi cung cấp miễn phí: tạo lá số Tử Vi, lập Bát Tự, luận giải Tổng quan, Tổng thể nâng cao (offline), Xem theo ngày (cơ bản), Đại vận / Tiểu vận / Nguyệt vận (cơ bản), quản lý **Việc & Mục tiêu**, **Ghi chú nhanh**, nội dung cơ bản của **Sự kiện sắp tới** (ý nghĩa, nên làm/nên tránh, mâm cúng, hướng xuất hành, checklist, quản lý thông báo) và **Gợi ý tài chính**. Các nội dung mất phí — bao gồm phân tích chi tiết cung, phân tích AI cho toàn bộ lá số / cung / đại vận / tiểu vận / nguyệt vận / nhật vận / so sánh lá số / sự kiện — sẽ luôn hiển thị giá xu rõ ràng trước khi Người dùng quyết định mở khóa.

**Hỏi Tuzi (Chat AI)** có hạn mức miễn phí giới hạn số lượt hỏi mỗi ngày (hiển thị cụ thể trong Ứng dụng); khi dùng hết hạn mức miễn phí trong ngày, Người dùng có thể chọn trả thêm một mức xu nhỏ mỗi lượt hỏi tiếp theo để tiếp tục sử dụng, có xác nhận trước khi trừ xu.

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
