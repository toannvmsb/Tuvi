# Tuzi — Tài liệu tích hợp dành cho đối tác (WebView)

_Phiên bản 1.0 · 11/2026 · Liên hệ: support@tuzi.vn_

> **TÀI LIỆU MẬT.** Chỉ chia sẻ trong đội kỹ thuật của đối tác. Không đưa secret vào tài liệu này.


## 1. Tổng quan

Tài liệu này hướng dẫn đối tác nhúng ứng dụng Tuzi (Tử Vi & Bát Tự) vào ứng dụng của mình bằng WebView. Người dùng của đối tác bấm một biểu tượng là vào thẳng Tuzi, không phải tạo tài khoản hay đăng nhập riêng. Tuzi tự nhận biết người dùng nhờ một token (JWT) ngắn hạn mà máy chủ của đối tác ký sẵn.


#### Trải nghiệm của người dùng

- Bấm biểu tượng Tuzi trong ứng dụng của đối tác, vào thẳng Trang chủ Tuzi (khoảng 1–3 giây).
- Lần đầu: Tuzi tự tạo tài khoản gắn với ID người dùng bên đối tác. Từ lần sau: vẫn là tài khoản đó, giữ nguyên lá số, số xu và lịch sử.
- Tên hiển thị lấy từ tên hoặc biệt danh đối tác gửi kèm (nếu không gửi, hiển thị là “Khách”).
- Giao diện, thương hiệu Tuzi được giữ nguyên.


#### Luồng kỹ thuật (4 bước)

1. Người dùng bấm biểu tượng Tuzi. Ứng dụng đối tác gọi máy chủ của đối tác để lấy URL nhúng.
2. Máy chủ đối tác ký một JWT (HS256) bằng secret do Tuzi cấp, nhét vào URL: https://tuzi.vn/embed?partner=<MÃ_ĐỐI_TÁC>&token=<JWT>.
3. Ứng dụng mở URL này trong WebView.
4. Tuzi kiểm tra token, tìm hoặc tạo tài khoản, đăng nhập, rồi hiển thị màn hình chính.

> **Ghi chú:** Token chỉ dùng để vào Tuzi. Sau khi vào, Tuzi xoá token khỏi thanh địa chỉ và dùng phiên đăng nhập riêng (lưu trong bộ nhớ của WebView).


## 2. Thông tin Tuzi cấp cho đối tác

| Thông tin | Ý nghĩa | Ghi chú |
|---|---|---|
| Mã đối tác (partner) | Chuỗi định danh, ví dụ bank_x | Không đổi được sau khi cấp. Có trong URL nhúng. |
| Secret | Khoá HMAC (HS256) để ký token | BÍ MẬT. Chỉ để ở máy chủ của đối tác. Không đưa vào ứng dụng, không gửi qua email thường. |
| URL nhúng | https://tuzi.vn/embed?partner=<MÃ> | Tuzi gửi sẵn cho đối tác. |
| Mã thử nghiệm (nếu cần) | Mã và secret riêng để kiểm thử | Xin Tuzi cấp trước khi phát hành. |
| Tên miền được phép nhúng iframe | Chỉ cần nếu nhúng bằng iframe trên web | Gửi Tuzi danh sách tên miền (xem mục 7). |

Để được cấp thông tin, đối tác cung cấp cho Tuzi: tên pháp nhân, mã số doanh nghiệp, địa chỉ, email liên hệ kỹ thuật và website. Liên hệ: support@tuzi.vn.


## 3. Token đăng nhập (JWT)


### 3.1. Định dạng

- Thuật toán: HS256 (HMAC-SHA256). Các thuật toán khác (kể cả none, RS256) đều bị từ chối.
- Khoá ký: chuỗi secret do Tuzi cấp, dùng nguyên văn dạng chuỗi UTF-8 (không giải mã base64).
- Chữ ký tính trên header.payload dạng base64url theo chuẩn JWT (RFC 7519).


### 3.2. Các trường (claims)

| Trường | Bắt buộc | Kiểu | Mô tả và quy tắc |
|---|---|---|---|
| sub | Có | chuỗi | ID người dùng bên đối tác. Phải ỔN ĐỊNH (cùng một khách luôn cùng một ID) và duy nhất. Chỉ dùng ký tự A–Z a–z 0–9 _ - (tối đa 80 ký tự). Nên dùng mã nội bộ ngẫu nhiên, KHÔNG dùng số điện thoại, email hay CCCD. |
| iat | Có | số (giây Unix, UTC) | Thời điểm ký. Không được ở tương lai quá 60 giây so với giờ của Tuzi. |
| exp | Có | số (giây Unix, UTC) | Thời điểm hết hạn. Phải lớn hơn iat và exp − iat tối đa 300 giây. Khuyến nghị 60 giây. |
| name | Không | chuỗi | Tên hoặc biệt danh khách, hiển thị trong Tuzi (tối đa 60 ký tự). Nên dùng tên gọi, không dùng họ tên đầy đủ nếu không cần. Không gửi thì hiển thị “Khách”. |
| employeeCode | Không | chuỗi | Mã nhân viên của đối tác (tối đa 100 ký tự) nếu cần theo dõi nhân viên nào giới thiệu khách. Tuzi chỉ ghi nhận, không hiển thị cho người dùng. |


### 3.3. Quy tắc thời gian (Tuzi sẽ từ chối nếu vi phạm)

- Thiếu iat hoặc exp: từ chối.
- iat ở tương lai quá 60 giây: từ chối (thường do đồng hồ máy chủ đối tác chạy nhanh).
- Token ký quá 120 giây trước lúc Tuzi nhận: từ chối.
- exp − iat lớn hơn 300 giây hoặc exp không lớn hơn iat: từ chối.
- Chữ ký sai, hết hạn exp, hoặc dùng thuật toán khác HS256: từ chối.

> **Lưu ý:** Đồng bộ đồng hồ máy chủ với NTP. Lệch giờ vài chục giây là nguyên nhân phổ biến nhất của lỗi “token không hợp lệ”.


### 3.4. Ví dụ payload

```
{
  "sub": "cust-00123",
  "iat": 1795199666,
  "exp": 1795199726,
  "name": "Chị Lan",
  "employeeCode": "NV001"
}
```


### 3.5. Nguyên tắc dùng token

- Tạo token MỚI mỗi lần người dùng bấm vào Tuzi. Không lưu, không tái sử dụng, không gửi cho thiết bị khác.
- Tạo ở máy chủ của đối tác (không ký trong ứng dụng vì sẽ lộ secret).
- Không ghi token hay URL nhúng vào nhật ký (log) của máy chủ, hệ thống giám sát hoặc công cụ phân tích.
- Hiện chưa có cơ chế chặn dùng lại một token trong vòng vài phút ngắn của nó; vì vậy giữ exp ngắn (60 giây).


## 4. Mã mẫu tạo URL nhúng

Các ví dụ dưới đây tạo token và URL. Thay SECRET và MÃ_ĐỐI_TÁC bằng thông tin được cấp; đọc secret từ biến môi trường hoặc kho bí mật, không viết cứng vào mã nguồn.


### Node.js (thư viện jose)

```
import { SignJWT } from 'jose';

export async function tuziEmbedUrl(userId, displayName) {
  const secret = new TextEncoder().encode(process.env.TUZI_SECRET); // chuỗi UTF-8
  const now = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({ name: displayName })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(String(userId))
    .setIssuedAt(now)
    .setExpirationTime(now + 60)
    .sign(secret);
  return `https://tuzi.vn/embed?partner=${process.env.TUZI_PARTNER}&token=${token}`;
}
```


### Python (PyJWT)

```
import os, time, jwt  # pip install PyJWT

def tuzi_embed_url(user_id: str, display_name: str | None = None) -> str:
    now = int(time.time())
    payload = {"sub": str(user_id), "iat": now, "exp": now + 60}
    if display_name:
        payload["name"] = display_name
    token = jwt.encode(payload, os.environ["TUZI_SECRET"], algorithm="HS256")
    return f"https://tuzi.vn/embed?partner={os.environ['TUZI_PARTNER']}&token={token}"
```


### Java (jjwt 0.12)

```
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;

public static String tuziEmbedUrl(String userId, String displayName) {
    byte[] key = System.getenv("TUZI_SECRET").getBytes(StandardCharsets.UTF_8);
    Date now = new Date();
    String token = Jwts.builder()
        .subject(userId)
        .claim("name", displayName)
        .issuedAt(now)
        .expiration(new Date(now.getTime() + 60_000))
        .signWith(Keys.hmacShaKeyFor(key), Jwts.SIG.HS256) // ép HS256 (khoá dài sẽ tự chọn HS384 nếu không chỉ định)
        .compact();
    return "https://tuzi.vn/embed?partner=" + System.getenv("TUZI_PARTNER") + "&token=" + token;
}
```


### PHP (firebase/php-jwt)

```
use Firebase\JWT\JWT;   // composer require firebase/php-jwt

function tuziEmbedUrl(string $userId, ?string $name = null): string {
    $now = time();
    $payload = ['sub' => $userId, 'iat' => $now, 'exp' => $now + 60];
    if ($name) { $payload['name'] = $name; }
    $token = JWT::encode($payload, getenv('TUZI_SECRET'), 'HS256');
    return 'https://tuzi.vn/embed?partner=' . getenv('TUZI_PARTNER') . '&token=' . $token;
}
```


### C# (.NET, không cần thư viện ngoài)

```
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

static string B64Url(byte[] b) => Convert.ToBase64String(b).TrimEnd('=').Replace('+', '-').Replace('/', '_');

public static string TuziEmbedUrl(string userId, string? name = null)
{
    var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
    var header = B64Url(Encoding.UTF8.GetBytes("{\"alg\":\"HS256\",\"typ\":\"JWT\"}"));
    var claims = new Dictionary<string, object> { ["sub"] = userId, ["iat"] = now, ["exp"] = now + 60 };
    if (!string.IsNullOrEmpty(name)) claims["name"] = name;
    var body = B64Url(JsonSerializer.SerializeToUtf8Bytes(claims));
    using var h = new HMACSHA256(Encoding.UTF8.GetBytes(Environment.GetEnvironmentVariable("TUZI_SECRET")!));
    var sig = B64Url(h.ComputeHash(Encoding.ASCII.GetBytes($"{header}.{body}")));
    return $"https://tuzi.vn/embed?partner={Environment.GetEnvironmentVariable("TUZI_PARTNER")}&token={header}.{body}.{sig}";
}
```


## 5. Nhúng bằng WebView


### 5.1. Yêu cầu bắt buộc với WebView

- Bật JavaScript.
- Bật DOM Storage / localStorage (Tuzi lưu phiên đăng nhập ở đây; không dùng cookie).
- Chỉ cho phép tải HTTPS. Không bật nội dung hỗn hợp (mixed content).
- Bàn phím: trên Android dùng chế độ adjustResize để ô nhập không bị che.
- Vùng an toàn (safe area): chừa phần tai thỏ/thanh điều hướng để thanh menu dưới cùng của Tuzi không bị che.
- Nút Back: gọi goBack() của WebView khi canGoBack() còn đúng; hết lịch sử thì đóng màn Tuzi. Tuzi dùng lịch sử trình duyệt để quay lại giữa các màn.
- Cho phép tải lại trang: sau khi vào, URL thành https://tuzi.vn/embed (không còn token) nên tải lại vẫn giữ phiên.


### 5.2. Android (Kotlin)

```
val web = findViewById<WebView>(R.id.tuziWeb)
web.settings.javaScriptEnabled = true
web.settings.domStorageEnabled = true
web.settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
web.webViewClient = WebViewClient()   // giữ điều hướng trong WebView

// url lấy từ máy chủ của đối tác (mục 4)
web.loadUrl(url)

// Nút Back
onBackPressedDispatcher.addCallback(this) {
    if (web.canGoBack()) web.goBack() else finish()
}

// KHI NGƯỜI DÙNG ĐĂNG XUẤT KHỎI ỨNG DỤNG ĐỐI TÁC (bắt buộc, xem 5.6)
WebStorage.getInstance().deleteAllData()
CookieManager.getInstance().removeAllCookies(null)
web.clearCache(true)
```


### 5.3. iOS (Swift, WKWebView)

```
let config = WKWebViewConfiguration()
// Khuyến nghị cho thiết bị dùng chung: không lưu gì trên máy (mỗi lần mở lại đi vào bằng token mới)
// config.websiteDataStore = .nonPersistent()
let web = WKWebView(frame: .zero, configuration: config)
web.allowsBackForwardNavigationGestures = true
web.load(URLRequest(url: url))   // url lấy từ máy chủ đối tác (mục 4)

// KHI NGƯỜI DÙNG ĐĂNG XUẤT KHỎI ỨNG DỤNG ĐỐI TÁC (bắt buộc, xem 5.6)
WKWebsiteDataStore.default().removeData(
    ofTypes: WKWebsiteDataStore.allWebsiteDataTypes(),
    modifiedSince: Date(timeIntervalSince1970: 0)) { }
```


### 5.4. Flutter (webview_flutter)

```
final controller = WebViewController()
  ..setJavaScriptMode(JavaScriptMode.unrestricted)
  ..loadRequest(Uri.parse(url));   // url lấy từ máy chủ đối tác (mục 4)

// widget: WebViewWidget(controller: controller)

// KHI ĐĂNG XUẤT KHỎI ỨNG DỤNG ĐỐI TÁC (xem 5.6)
await controller.clearLocalStorage();
await controller.clearCache();
await WebViewCookieManager().clearCookies();
```


### 5.5. React Native (react-native-webview)

```
<WebView
  source={{ uri: url }}            // url lấy từ máy chủ đối tác (mục 4)
  javaScriptEnabled
  domStorageEnabled
  originWhitelist={['https://*']}
  // incognito   // bật nếu không muốn lưu phiên trên máy (thiết bị dùng chung)
/>
// Khi đăng xuất khỏi ứng dụng đối tác: tăng key của WebView hoặc dùng incognito,
// và xoá dữ liệu bằng CookieManager.clearAll() (@react-native-cookies/cookies).
```


### 5.6. Đăng xuất / đổi tài khoản trên ứng dụng đối tác (QUAN TRỌNG)

Phiên của Tuzi lưu trong bộ nhớ của WebView. Khi người dùng đăng xuất khỏi ứng dụng đối tác, đối tác PHẢI xoá dữ liệu của WebView (localStorage, cookie, cache) hoặc dùng chế độ không lưu (nonPersistent / incognito). Nếu không, trên thiết bị dùng chung hoặc khi đổi tài khoản, người dùng kế tiếp có thể còn thấy phiên cũ cho tới khi Tuzi nhận token mới.

> **Ghi chú:** Tuzi luôn đăng nhập theo token mới nhất khi URL có token, kể cả khi WebView còn phiên của người khác. Dù vậy, vẫn nên xoá dữ liệu WebView khi đăng xuất để không để lại dữ liệu cá nhân trên máy.


### 5.7. Những tính năng cần lưu ý trong WebView

| Tính năng | Hành vi trong WebView | Khuyến nghị |
|---|---|---|
| Nạp xu bằng chuyển khoản (VietQR) | Hiện mã QR, số tài khoản, số tiền và nội dung chuyển khoản. Có nút sao chép. | Người dùng sao chép nội dung rồi sang ứng dụng ngân hàng. Không quét QR ngay trên chính điện thoại đang hiển thị được. |
| Tải ảnh QR, xuất PDF, in | Phụ thuộc cơ chế tải file của WebView; thường không hoạt động mặc định. | Có thể bỏ qua; hoặc đối tác bổ sung xử lý tải file nếu cần. |
| Liên kết mở cửa sổ mới | Một số liên kết (hỗ trợ, điều khoản) mở cửa sổ mới. | Mở bằng trình duyệt hệ thống hoặc trong WebView, tuỳ đối tác. |
| Thông báo đẩy | Không có trong WebView. | Không áp dụng. |


## 6. Mạng và tên miền

Nếu ứng dụng đối tác giới hạn các tên miền WebView được truy cập, cần cho phép tối thiểu các tên miền sau (kiểm tra theo bản hiện hành, Tuzi có thể bổ sung khi có tính năng mới):

| Tên miền | Mục đích |
|---|---|
| tuzi.vn | Ứng dụng Tuzi (trang và tài nguyên) |
| blvbsprsjjjwhrrzelfm.supabase.co | Máy chủ dữ liệu, đăng nhập và các chức năng của Tuzi (HTTPS) |
| img.vietqr.io | Ảnh mã QR khi nạp xu |
| api.open-meteo.com, geocoding-api.open-meteo.com | Thời tiết trên Trang chủ |
| text.pollinations.ai | Phân tích AI (mô hình miễn phí) và tạo hình ảnh |

> **Ghi chú:** Để chắc chắn đủ danh sách, hãy thử toàn bộ các màn chính (Trang chủ, Lá số, Xem ngày, Nạp xu, Hỏi Tuzi) với tường lửa/bộ lọc bật rồi báo Tuzi nếu có yêu cầu bị chặn.


## 7. Nhúng bằng iframe (ứng dụng web của đối tác)

Nếu đối tác nhúng Tuzi vào trang web (không phải ứng dụng gốc), Tuzi cần đăng ký tên miền của đối tác vào danh sách được phép nhúng. Gửi Tuzi tên miền đầy đủ, ví dụ https://app.doi-tac.vn. Tuzi cấu hình lại và xác nhận lại với đối tác.

```
<iframe
  src="https://tuzi.vn/embed?partner=<MÃ>&token=<JWT>"
  allow="clipboard-write"
  style="width:100%;height:100%;border:0"
  title="Tuzi"></iframe>
```

> **Lưu ý:** Nên ưu tiên WebView (ứng dụng gốc) thay vì iframe. Trình duyệt Safari và một số trình duyệt khác tách riêng hoặc giới hạn bộ nhớ của iframe khác tên miền nên phiên đăng nhập có thể mất sớm. Nếu dùng iframe, đối tác tự kiểm tra trên các trình duyệt mục tiêu.


## 8. Tài khoản, dữ liệu và quyền riêng tư


### 8.1. Tuzi lưu gì về người dùng đi qua đối tác

- Tài khoản nội bộ gắn với ID bên đối tác (không có mật khẩu). Email nội bộ dạng giả, không nhận thư.
- Tên hiển thị (từ trường name), mã đối tác, ID người dùng bên đối tác, mã nhân viên gần nhất (nếu có).
- Nhật ký mỗi lần vào qua đối tác (thời gian, đối tác, ID, mã nhân viên).
- Dữ liệu người dùng tự tạo khi dùng Tuzi: lá số (tên, giới tính, ngày giờ sinh, nơi ở), số xu và giao dịch, ghi chú, kết quả phân tích.


### 8.2. Tuzi không làm gì

- Không gửi dữ liệu người dùng ngược về đối tác (không có API trả dữ liệu cho đối tác trong phiên bản này).
- Không nhận hay lưu họ tên thật, số điện thoại, email, số thẻ nếu đối tác không tự gửi trong sub hoặc name. Vì vậy: ĐỪNG đưa thông tin nhận dạng cá nhân vào hai trường này.


### 8.3. Trách nhiệm của đối tác

- Thông báo cho khách hàng và xin đồng ý theo quy định về bảo vệ dữ liệu cá nhân của đối tác khi đưa Tuzi vào ứng dụng.
- Dẫn tới Điều khoản sử dụng và Chính sách quyền riêng tư của Tuzi (có trong menu của ứng dụng, mục Hỗ trợ).
- Người dùng có thể tự xoá tài khoản trong Tuzi (Menu, Tài khoản). Yêu cầu khác gửi support@tuzi.vn.


### 8.4. Bảo vệ tài khoản

Tài khoản qua đối tác không có mật khẩu nên chỉ vào được từ ứng dụng của đối tác. Trong Menu, Tuzi hiển thị lời mời “Bảo vệ tài khoản” để người dùng tự thêm email và mật khẩu (xác nhận bằng mã gửi qua email), nhằm khôi phục khi đổi điện thoại. Việc này tuỳ chọn, giữ nguyên toàn bộ dữ liệu và người dùng vẫn vào được từ ứng dụng đối tác như cũ. Sau khi bảo vệ, tài khoản vẫn được nhận ra theo cùng ID của đối tác.


### 8.5. Nạp xu

- Trong WebView (bản web), nạp xu bằng chuyển khoản ngân hàng qua VietQR; xu được cộng tự động sau khi nhận tiền (thường trong 1–2 phút).
- Không dùng thanh toán trong ứng dụng (App Store / Google Play) trong chế độ nhúng.
- Đối tác tự đánh giá quy định của cửa hàng ứng dụng (Apple/Google) đối với việc bán nội dung số bằng chuyển khoản trong WebView của ứng dụng mình.


### 8.6. Xu thưởng

Hai nguồn xu khi người dùng mới vào: xu chào mừng mặc định của Tuzi và xu thưởng riêng của đối tác (nếu có thoả thuận), chỉ cộng một lần cho mỗi người dùng.


## 9. Danh sách kiểm tra bảo mật

- Secret chỉ ở máy chủ, đọc từ biến môi trường hoặc kho bí mật; không có trong ứng dụng, mã nguồn, ảnh chụp màn hình hay tài liệu chia sẻ chung.
- Token ký ở máy chủ, sống tối đa 60 giây, tạo mới cho mỗi lần mở.
- Không ghi token hoặc URL nhúng vào nhật ký, công cụ giám sát hay analytics.
- Đồng hồ máy chủ đồng bộ NTP.
- WebView chỉ tải HTTPS; tắt chế độ gỡ lỗi WebView trong bản phát hành.
- Xoá dữ liệu WebView khi người dùng đăng xuất khỏi ứng dụng đối tác (mục 5.6).
- ID sub ổn định, không phải thông tin nhận dạng cá nhân.
- Quy trình đổi secret: báo Tuzi trước; khi đổi, secret cũ mất hiệu lực ngay nên hai bên thống nhất thời điểm. Nghi ngờ lộ secret thì báo Tuzi ngay để thay.


## 10. Kiểm thử và phát hành


### 10.1. Kiểm tra nhanh token (không cần ứng dụng)

Sau khi có mã thử nghiệm và secret, đối tác có thể kiểm tra token hợp lệ bằng lệnh sau (chỉ để thử; không dùng trong luồng chạy thật và không ghi lại kết quả vì có chứa mã phiên):

```
curl -s -X POST https://blvbsprsjjjwhrrzelfm.supabase.co/functions/v1/partner-sso \
  -H "content-type: application/json" \
  -d '{"partnerCode":"<MÃ_ĐỐI_TÁC>","token":"<JWT>"}' \
  -w "\nHTTP %{http_code}\n"
```

| HTTP | Nội dung | Nguyên nhân thường gặp |
|---|---|---|
| 200 | Có access_token và refresh_token | Token hợp lệ. |
| 400 | missing_params | Thiếu mã đối tác hoặc token trong yêu cầu. |
| 401 | unknown_partner | Mã đối tác sai, hoặc đối tác đang bị tắt. |
| 401 | invalid_token | Sai secret; thiếu iat hoặc exp; token hết hạn; iat ở tương lai (lệch giờ); exp − iat quá dài; thuật toán khác HS256; thiếu sub. |
| 500 | create_user_failed / link_failed / session_failed / user_lookup_failed | Lỗi phía Tuzi. Báo Tuzi kèm thời điểm xảy ra. |

> **Ghi chú:** Mỗi lần gọi thành công có thể tạo tài khoản thử và nhật ký đăng nhập. Hãy dùng sub riêng cho thử nghiệm, ví dụ test-001.


### 10.2. Các bước kiểm thử trong ứng dụng

1. Mở Tuzi từ ứng dụng đối tác với một ID mới: vào được Trang chủ, tên hiển thị đúng với trường name, có số xu chào mừng.
2. Thoát rồi mở lại với cùng ID: vào lại đúng tài khoản cũ, dữ liệu (ví dụ lá số vừa lưu) còn nguyên.
3. Mở với một ID khác (trên cùng thiết bị): phải thấy tài khoản của ID khác, không thấy dữ liệu của ID trước.
4. Đăng xuất khỏi ứng dụng đối tác, đăng nhập người dùng khác, mở Tuzi: không còn dữ liệu của người trước.
5. Thử nút Back, xoay màn hình, bàn phím, tải lại trang (kéo để làm mới), mất mạng rồi có mạng lại.
6. Thử nạp xu: chọn gói, kiểm tra QR, nút sao chép và thông tin chuyển khoản hiển thị đúng.
7. Thử token sai (đổi một ký tự, hết hạn, thiếu exp): phải thấy màn “Không thể vào Tuzi”, không vào được.


### 10.3. Danh sách kiểm tra trước khi phát hành

- Đã chuyển sang mã đối tác và secret chính thức (không dùng mã thử nghiệm).
- Tuzi xác nhận đã cấu hình tên miền iframe (nếu dùng) và xu thưởng (nếu có).
- Đã xử lý đăng xuất/đổi tài khoản (mục 5.6).
- Đã kiểm tra tên miền mạng (mục 6) nếu có bộ lọc.
- Đối tác đã hoàn tất mục thông báo và đồng ý của khách hàng (mục 8.3).
- Hai bên thống nhất đầu mối hỗ trợ và kênh liên lạc khi có sự cố.


### 10.4. Màn hình lỗi người dùng có thể gặp

| Thông báo | Ý nghĩa | Cách xử lý |
|---|---|---|
| Không thể vào Tuzi: Không xác thực được từ đối tác. Vui lòng thử lại từ ứng dụng đối tác. | Token bị từ chối (xem bảng 10.1). | Mở lại từ ứng dụng đối tác để lấy token mới. Nếu lặp lại, kiểm tra secret, đồng hồ và các trường iat, exp. |
| Không thể vào Tuzi: Không kết nối được tới máy chủ. | Mất mạng hoặc bị chặn tên miền. | Kiểm tra mạng, mục 6. |
| Màn hình Đăng nhập của Tuzi | URL thiếu mã đối tác hoặc token (hoặc mở trực tiếp ở địa chỉ khác /embed). | Đảm bảo URL đúng định dạng ở mục 1 và có cả hai tham số. |


## 11. Hỗ trợ

- Email: support@tuzi.vn.
- Khi báo lỗi, gửi: mã đối tác, thời điểm xảy ra (kèm múi giờ), loại thiết bị và hệ điều hành, ảnh chụp màn hình, và mã ID người dùng thử (sub) dùng để thử.
- TUYỆT ĐỐI KHÔNG gửi secret, token hay URL nhúng đầy đủ qua email hoặc tin nhắn.


## Phụ lục A. Câu hỏi thường gặp

| Câu hỏi | Trả lời |
|---|---|
| Người dùng đổi mật khẩu hoặc đổi thông tin ở ứng dụng đối tác thì sao? | Không ảnh hưởng. Tuzi nhận ra người dùng theo ID (sub), không theo mật khẩu hay email. |
| Nếu người dùng đổi ID bên đối tác thì sao? | Tuzi coi là người dùng mới và tạo tài khoản mới. Hãy giữ ID ổn định. |
| Một người dùng dùng nhiều thiết bị? | Cùng ID thì cùng tài khoản trên mọi thiết bị. |
| Một người có tài khoản Tuzi riêng (đăng ký trực tiếp) thì có gộp được không? | Phiên bản này chưa tự gộp. Hai tài khoản tách biệt. Trao đổi với Tuzi nếu cần phương án. |
| Người dùng xoá tài khoản trong Tuzi rồi vào lại từ ứng dụng đối tác? | Sẽ được tạo tài khoản mới (nhận lại xu chào mừng và xu thưởng nếu có). |
| Có thể tuỳ biến màu sắc, logo theo đối tác không? | Phiên bản này giữ nguyên thương hiệu Tuzi. |
| Muốn báo cáo theo nhân viên giới thiệu? | Tuzi ghi nhận employeeCode mỗi lần vào. Phần báo cáo chưa có giao diện; trao đổi với Tuzi khi cần. |


## Phụ lục B. Lịch sử thay đổi

| Phiên bản | Ngày | Nội dung |
|---|---|---|
| 1.0 | 11/2026 | Bản đầu: đăng nhập một chạm (HS256), tên hiển thị, mã nhân viên, WebView và iframe. |
