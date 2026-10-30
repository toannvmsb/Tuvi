# CLAUDE.md — Handover cho session sau

Tài liệu này dành cho Claude (và Claude Code agent) khi mở session mới trên codebase
này. Đọc kỹ trước khi sửa code.

---

## ⏩ TÌNH TRẠNG WEB (cập nhật đầu tháng 6/2026 — sau khi hoàn thành build web)

### ✅ ĐÃ HOÀN THÀNH (branch `feature/web`)

- `npm run build:web` → **sạch, 1024 modules, không lỗi**.
- `netlify.toml` đã có: build command, publish dir `dist/`, SPA redirect `/*→/index.html`.
- **Platform guards đầy đủ:**
  - `src/lib/platform.ts`: `useContentWidth()` (cap 480px web), `printHtml`, `saveImageOrDownload`, `shareFile`, `downloadToCache`.
  - `src/lib/webAlert.ts` + `src/components/WebAlertHost.tsx`: thay `Alert.alert()` bằng React modal trên web (tránh `window.confirm()` bị block trong iframe).
  - `src/lib/iap.ts`: lazy load, `isIapAvailable()` false trên web — IAP không bao giờ khởi động.
  - `src/screens/WalletScreen.tsx`: `!isWeb && !__DEV__` cho IAP; `isWeb || __DEV__` cho VietQR.
  - `src/components/ImageViewerModal.tsx`: web path dùng `ScrollView` thay gesture handler.
  - `src/components/TuViChart/index.tsx`, `BatTuChart`, `WealthChart`, `DaiVanScreen`, `TieuVanScreen`, `NguyetVanScreen`: tất cả dùng `useContentWidth()` thay `useWindowDimensions()`.
- **Bug web đã fix:**
  - Navigation: thay `navigation.getParent()?.navigate()` bằng `navigationRef.navigate()`.
  - Bar chart bị vỡ trên Chrome: thêm `position:'relative'` cho column View.
  - Chip selector: `flexWrap:'wrap'` trên web (không cuộn ngang).
  - Lá số tràn màn hình: `useContentWidth()` cap 480px.
  - Dialog trừ xu: `webAlert` + `WebAlertHost`.
  - Xem ảnh lá số: modal render TuViChart trực tiếp + **xuất PNG (html2canvas) + in PDF**.
- **Responsive:** CSS injection `#root { max-width:480px; }` trong App.tsx.
- **Quên mật khẩu?:** code đúng ở LoginScreen dòng 109 — nút hiện khi `mode === 'login'`.

### ⏳ CÒN LẠI (anh Toàn tự làm hoặc tiếp tục session sau)

1. **Deploy lên Netlify:**
   ```bash
   npm run build:web           # tạo dist/
   npx vercel --prod           # hoặc connect GitHub → Netlify auto-deploy
   ```
   Netlify: Build command = `npx expo export --platform web`, Publish = `dist/`.

2. **Email (Resend) — CHƯA chắc đã deploy:**
   ```bash
   supabase functions deploy auth-email --no-verify-jwt
   supabase secrets set RESEND_API_KEY=re_xxxxxxxx
   supabase secrets set AUTH_FROM_EMAIL="Tuzi <no-reply@tuzi.vn>"
   ```
   Rồi chạy `supabase_auth_email.sql` trong Dashboard → SQL Editor.

3. **Verify domain tuzi.vn** trong Resend (DNS records tại Mắt Bão).

4. **Test end-to-end trên Chrome thật** (không phải preview tool):
   - Đăng nhập / Đăng ký
   - Lập lá số + xem 12 cung
   - Phân tích AI (cần xu)
   - Xem theo ngày, Xem ngày tốt
   - Nạp xu VietQR (cần test webhook SePay)
   - Quên mật khẩu (cần Resend đã deploy)

5. **Nếu Netlify build lỗi:** kiểm tra Node version (cần 18+), set trong Netlify Settings → Build image.

- **Email (Resend):** `lib/auth.ts` đã log `[auth-email] ...` ra console để chẩn đoán khi test.

---

## 1. Thông tin chung

- **Tên sản phẩm**: Tử Vi & Bát Tự (mobile app + sắp tới: bản web).
- **Tác giả**: Nguyễn Văn Toàn (publisher: cá nhân, không phải tổ chức).
- **Stack**: Expo SDK 54 + React Native + TypeScript + Supabase (Auth + Postgres + Edge Functions).
- **Trạng thái**: app mobile đã hoàn thiện logic chính, đang chuẩn bị build sang web.
- **AI provider**: OpenAI (gpt-4o-mini) **chính**, Anthropic (Claude) **dự phòng**.
- **Phái Tử Vi**: **NAM PHÁI Việt Nam** (theo hệ thống Lê Quang Lăng kết hợp phương pháp luận Diệu Xuân).

---

## 2. Quy tắc luận giải — BẮT BUỘC tuân thủ

Đây là các quy tắc đã được anh Toàn xác nhận sau nhiều vòng test. **KHÔNG được vi phạm
khi sửa code logic luận giải / AI prompt**:

### 2.1. Phái Nam Phái — KHÔNG dùng "Mệnh chủ" / "Thân chủ"

- Phái Nam Phái Việt Nam không dùng khái niệm sao chủ Mệnh / sao chủ Thân.
- Khi luận cung Mệnh / cung Thân: **chỉ phân tích các sao TỌA THỦ tại cung đó + sao tam hợp/nhị hợp/xung chiếu**.
- TUYỆT ĐỐI không được nhắc "Mệnh chủ" / "Thân chủ" trong bất kỳ prompt AI nào hoặc luận offline.

### 2.2. Tuần Không / Triệt Lộ — KHÔNG lan qua tam hợp

- Tuần/Triệt **chỉ áp dụng cho cung mà dữ liệu ghi nhận bị Tuần/Triệt**.
- TUYỆT ĐỐI không tự suy diễn Tuần/Triệt cho các cung tam hợp / nhị hợp.
- Trong context AI: dữ liệu Tuần/Triệt được đưa vào dưới dạng "DỮ KIỆN CỐ ĐỊNH" — AI phải dùng nguyên văn.

### 2.3. Phi Hóa Nam Phái — kỹ thuật gốc

- **File chuẩn**: `src/core/phiHoa.ts` — dùng CHUNG cho cả AI và offline. KHÔNG duplicate logic này ở nơi khác.
- Mỗi cung có `can` riêng. Từ `can` đó dẫn ra 4 hóa tinh (Lộc/Quyền/Khoa/Kỵ) qua bảng `HOA_BY_STEM`.
- 4 hóa tinh đó "phi" đến cung chứa sao tương ứng → cho biết cung X **phát Lộc/Quyền/Khoa/Kỵ đi đâu**.
- Helper sẵn: `computePhiHoa`, `summarizeAllPhiHoa`, `summarizeYearHoa`, `luuTuHoaPositions`, `monthStem`, `aggregatePhiHoa`.
- Lưu Tứ Hóa **năm**: dùng `luuTuHoaPositions(c, yearStem)`.
- Lưu Tứ Hóa **tháng**: dùng `luuTuHoaPositions(c, monthStem(yearStem, monthLunar))` — Ngũ Hổ Độn.

### 2.4. Khung luận chuẩn (Lê Quang Lăng + Diệu Xuân)

Tất cả AI prompts (Toàn lá số / Cung / Đại Vận / Tiểu Vận / Nguyệt Vận) **phải tuân theo cấu trúc**:

- **Mỗi nhận định quan trọng** = 4 lớp: **[DỮ KIỆN lá số] → [PHÂN TÍCH] → [KẾT LUẬN] → [KHUYẾN NGHỊ hành động]**.
- Mỗi kết luận quan trọng phải dựa trên **≥ 2 dữ kiện** từ lá số.
- KHÔNG luận từng sao đơn lẻ — phải tổ hợp (sao + miếu hãm + tam hợp + xung chiếu + Tứ Hóa + Phi Hóa).
- KHÔNG phán đoán tuyệt đối ("chắc chắn giàu/nghèo/ly hôn"). Chỉ nói **xu hướng + mức độ thuận lợi/rủi ro + hành động**.
- KHÔNG dùng ngôn ngữ mê tín.
- Mỗi khuyến nghị phải **CÓ THỂ HÀNH ĐỘNG ngay** (cụ thể, không trừu tượng).
- Nếu dữ liệu thiếu → nói rõ "chưa đủ dữ liệu để kết luận sâu", KHÔNG bịa.

### 2.5. Tinh thần các loại vận

- **Đại vận / Tiểu vận / Nguyệt vận**: AI đóng vai **AI COACH cá nhân** — chuyển dữ liệu thành **kế hoạch hành động** (10 năm / 1 năm / 30 ngày), không chỉ "mô tả vận tốt/xấu".
- **Nguyệt vận** có nguyên tắc riêng cốt lõi: *"Nguyệt vận KHÔNG để dự đoán số mệnh trong tháng. Hãy phân tích tháng này đang KÍCH HOẠT phần nào của Đại vận và Tiểu vận."*
- **Tiểu vận** là **kế hoạch 1 năm**, không phải định mệnh cố định.

---

## 3. Kiến trúc folder

```
src/
├── core/                    Logic Tử Vi & Bát Tự (KHÔNG động khi làm web)
│   ├── starPlacer.ts        An sao 12 cung (chính tinh + phụ tinh + tứ hóa)
│   ├── tuViEngine.ts        Engine lập lá số
│   ├── batTuEngine.ts       Tứ trụ + dụng/kỵ thần
│   ├── daiVanEngine.ts      Đại vận
│   ├── daiVanScore.ts       Chấm điểm đại vận (Thiên Lương: Thiên thời/Địa lợi/Nhân hòa)
│   ├── tieuVanScore.ts      Chấm điểm tiểu vận
│   ├── nguyetVanScore.ts    Chấm điểm nguyệt vận (Vân Đằng)
│   ├── nhatVan.ts           Xem theo ngày + goodBadHours
│   ├── todaySummary.ts      Tóm tắt "ngày hôm nay" cho Home
│   ├── phiHoa.ts            ★ Phi Hóa Nam Phái — dùng chung AI + offline
│   ├── offlineLuanGiai.ts   Luận giải Nâng cao offline (full chart, đại/tiểu/nguyệt vận, palace lưu)
│   ├── luuStars.ts          Sao lưu (lưu tinh) năm
│   ├── phongThuyBatTu.ts    Phong thủy theo dụng thần (hướng, màu, thực phẩm)
│   ├── dayPicker.ts         Xem ngày tốt cho việc cụ thể (12 nhóm × 54 việc)
│   ├── vongTruongSinh.ts    Vòng Tràng Sinh
│   └── napAm.ts             Nạp âm (Bản Mệnh)
│
├── data/                    Kiến thức Tử Vi (text)
│   ├── starInfo.ts          110+ sao × ý nghĩa cơ bản + byPalace + combos
│   ├── starInfoByPalaceExt.ts  Bổ sung byPalace cho 100% cung × sao (merge tự động qua getStarInfo)
│   ├── starElements.ts      Hành + màu hiển thị mỗi sao
│   ├── cachCuc.ts           Phát hiện cách cục
│   ├── dayPickTasks.ts      12 nhóm × 54 việc cho "Xem ngày tốt"
│   ├── lasoLuanGiaiGuide.ts KHAI_QUAT_12_CUNG + CHINH_TINH_CORE
│   └── napAm.ts
│
├── utils/
│   └── aiAnalysis.ts        ★ Toàn bộ AI prompts (FULLCHART_RULES, DAIVAN_RULES, TIEUVAN_RULES, sections)
│
├── screens/                 Mọi màn hình
├── components/              UI dùng chung (BrandLogo, ScreenHeader, SimpleMarkdown…)
├── constants/               theme, premium (giá xu), payment (VietQR), combos, appInfo
├── lib/                     wrappers cho Supabase / IAP / topup / charts / myChart / notifications
├── navigation/              AppNavigator (Stack)
├── context/                 AuthContext
├── hooks/                   useStreamingAI (parallel fetch + retry)
└── i18n/                    vi/en
```

### File CỰC KỲ quan trọng — KHÔNG SỬA TÙY TIỆN khi làm web

- `src/core/*` — toàn bộ logic Tử Vi/Bát Tự. Nếu phát hiện bug, fix nhỏ thì OK, nhưng **commit message phải ghi rõ** để dễ tìm khi merge.
- `src/utils/aiAnalysis.ts` — AI prompts đã được tinh chỉnh qua nhiều vòng. Đừng restructure trừ khi có yêu cầu rõ.
- `src/data/starInfo.ts` & `starInfoByPalaceExt.ts` — dữ liệu sao.

---

## 4. Trạng thái tính năng hiện tại

### Đã làm xong

- ✅ Lập lá số Tử Vi (14 chính tinh + 100+ phụ tinh + tứ hóa + vòng Tràng Sinh + Tuần/Triệt)
- ✅ Bát Tự (Tứ trụ + dụng/kỵ thần)
- ✅ Phong thủy theo dụng thần
- ✅ Đại vận / Tiểu vận / Nguyệt vận — cả Nâng cao (offline) và AI (cả 2 cùng khung Nam Phái 8-15 bước)
- ✅ Phi Hóa Nam Phái (dùng chung phiHoa.ts)
- ✅ Phân tích Toàn lá số AI (8 phần) + Nâng cao offline (đồng bộ khung)
- ✅ Chi tiết cung (12 bước "KHUNG LUẬN MỘT CUNG" — anh Toàn cung cấp)
- ✅ Sao lưu cho từng cung (miễn phí)
- ✅ Xem theo ngày (Cơ bản miễn phí + AI có phí)
- ✅ Xem ngày tốt — 12 nhóm × 54 việc, top 3 ngày phù hợp, khung giờ tốt, hướng, màu mặc
- ✅ Home: tóm tắt ngày hôm nay + nhấn đúp → DailyView + 2 nút (Xem ngày tốt / Lá số đã lưu)
- ✅ Logo Tuzi (brand) trong `assets/logo.jpg`, component `BrandLogo`
- ✅ Privacy + Terms (Nguyễn Văn Toàn là publisher) — placeholders contact info có thể anh Toàn sẽ cập nhật
- ✅ Wallet (VietQR + IAP framework, IAP lazy load)
- ✅ Combo trọn đời
- ✅ PDF export
- ✅ My Charts (nhiều lá số, đánh dấu "của tôi")

### Chưa làm

- ❌ **Web build** (phương án A — Expo Web) ← **TASK HIỆN TẠI**
- ✅ Email đăng ký (welcome) + Quên mật khẩu (sinh mật khẩu mới) — Edge Function `auth-email` + Resend. CẦN: chạy `supabase_auth_email.sql`, deploy function, set `RESEND_API_KEY`, verify domain tuzi.vn trong Resend.
- ❌ Verify Apple/Google IAP receipt (Edge Function `iap-verify` mới có skeleton)
- ❌ Push notification (đã có wrapper lib/notifications.ts nhưng chưa cấu hình FCM/APNS)
- ❌ Production Edge Function cho AI keys (đang dùng client-side)

---

## 5. Quy tắc thanh toán

- 1 xu = 100đ
- **Mobile (production build)**: CHỈ IAP (Apple/Google) — VietQR ẩn hoàn toàn theo Apple Guideline 3.1.1 + Google Payments Policy. Nếu hiển thị VietQR trên app store build sẽ bị reject.
- **Mobile (dev mode, `__DEV__`)**: cả IAP và VietQR (cho dễ test). Production build: chỉ IAP.
- **Web (tuzi.vn)**: CHỈ VietQR/SePay — IAP bị ẩn hoàn toàn.
- File điều khiển: `src/screens/WalletScreen.tsx` — guard `isWeb || __DEV__` cho VietQR, `!isWeb && !__DEV__` cho IAP.
- **Gợi ý "Cách nạp khác → website tuzi.vn"** (chuyển khoản): card trong WalletScreen, gated bởi `SHOW_WEB_TOPUP` — **Android BẬT, iOS TẮT** mặc định (`ALLOW_WEB_TOPUP_IOS=false`) để tránh Apple từ chối (anti-steering). Ngôn từ trung tính (không so sánh giá). Chỉ hiện production mobile (web đã có VietQR). URL: `WEB_TOPUP_URL` trong `payment.ts`.
- Combo trọn đời: lifetime_basic (490 xu / 49k), lifetime_full (990 xu / 99k)
- Bank: VPBank 0913 377 666 — NGUYỄN VĂN TOÀN (real account)
- File: `src/constants/payment.ts`, `src/constants/combos.ts`, `src/lib/iap.ts`, `src/lib/topup.ts`

---

## 6. TASK HIỆN TẠI — Đưa app lên Web (Phương án A: Expo Web)

### Yêu cầu của anh Toàn

1. **Dùng chung Supabase** với mobile (không tách database)
2. **Web CHỈ thanh toán bằng VietQR/SePay** — ẩn hoàn toàn IAP
3. **Cùng codebase** với mobile (không viết lại)

### Roadmap chi tiết

#### Bước 1 — Cấu hình Expo cho web

- Sửa `app.json` thêm khối `web`:
  ```json
  "web": {
    "favicon": "./assets/favicon.png",
    "bundler": "metro"
  }
  ```
- Thêm vào `package.json`:
  ```json
  "scripts": {
    "web": "expo start --web",
    "build:web": "expo export --platform web"
  }
  ```
- Cài thêm nếu thiếu: `npm install react-native-web react-dom @expo/metro-runtime`

#### Bước 2 — Platform guards cho native-only modules

Wrap trong helper hoặc `Platform.OS !== 'web'` guard:

| Module native | Web fallback |
|---|---|
| `react-native-iap` | Bỏ qua hoàn toàn — `if (Platform.OS === 'web') return null;` |
| `expo-print` | Dùng `window.print()` hoặc thư viện `jsPDF` |
| `expo-sharing` | Web Share API (`navigator.share`) hoặc download trực tiếp |
| `expo-media-library` | Tạo `<a download>` element trigger download |
| `react-native-view-shot` | Dùng `html2canvas` để chụp DOM |
| `expo-notifications` | Skip hoặc dùng Web Push (FCM Web SDK — phase 2) |
| `KeyboardAvoidingView` | Bỏ qua trên web (không cần) |
| `expo-secure-store` | Tự fallback về localStorage (Expo đã handle) |

Khuyến nghị: tạo file `src/lib/platform.ts` export các wrapper:
```ts
export async function exportToPdf(...) {
  if (Platform.OS === 'web') { /* jsPDF or window.print */ }
  else { /* expo-print */ }
}
```

#### Bước 3 — Files cần sửa cụ thể

- `src/lib/iap.ts` — đầu file thêm `if (Platform.OS === 'web') { /* no-op exports */ }` để không bao giờ load `react-native-iap`.
- `src/utils/pdfExport.ts` — branch theo `Platform.OS`.
- `src/screens/WalletScreen.tsx` — ẩn section IAP nếu `Platform.OS === 'web'`.
- `src/components/HeaderMenuButton.tsx` — trên web, ActionSheet IOS không có; dùng menu Android (overlay) cho cả 2.
- Mọi `<TouchableOpacity>` với hover cảm ơn — cân nhắc dùng `<Pressable>` để có hover state trên web.

#### Bước 4 — Responsive

- Thêm `<View style={{ maxWidth: 480, width: '100%', alignSelf: 'center' }}>` wrap top-level cho các content text-heavy → tránh tràn full screen desktop.
- Lá số 12 cung trên desktop có thể TO ra (vd 600px thay vì 360px).
- Test các Modal — trên web nên center thay vì bottom sheet.
- Font size: trên web `Platform.OS === 'web' ? 14 : 16` để text desktop không quá lớn.

#### Bước 5 — Build & deploy

- Local test: `npm run web`
- Production build: `npm run build:web` → output ở `dist/`
- Deploy: Vercel (recommend) hoặc Netlify
  - Vercel CLI: `vercel --prod`
  - Hoặc connect GitHub → auto deploy
- Domain: **`tuzi.vn`** (đã mua, đã update trong Privacy/Terms/About). Email support: `support@tuzi.vn`.

#### Bước 6 — Kiểm thử trước khi merge

Trên web phải test:
- ✅ Đăng nhập / Đăng ký Supabase
- ✅ Lập lá số (form input, picker)
- ✅ Hiển thị lá số (12 cung, gradient, sao)
- ✅ Xem chi tiết cung
- ✅ Phân tích AI (gọi OpenAI/Claude qua proxy đã có)
- ✅ Xem theo ngày + Xem ngày tốt
- ✅ Nạp xu qua VietQR (cần test cả webhook SePay)
- ✅ My Charts
- ❌ Đảm bảo KHÔNG load `react-native-iap` (không lỗi runtime)

---

## 7. Các quyết định trước đó của anh Toàn (đừng đảo lại)

- Tab "Tài Lộc" cũ → đổi thành "Nguyệt Vận" (Nguyệt vận là tab chính, Tài Lộc là link trong Lá Số tab).
- Bát Tự có icon 🧭 (la bàn).
- Mệnh chủ/Thân chủ → CẤM nhắc trong AI prompts.
- Daily "Cơ bản" → MIỄN PHÍ (chỉ AI tính phí).
- Pricing: nâng cao 10/20 xu, AI 30/50/100 xu, tặng 50 xu tài khoản mới.
- Logo `assets/logo.jpg` — Tuzi (yin-yang gold-purple).

---

## 8. Lưu ý git

- Branch `main` = app mobile stable.
- Branch `feature/web` = web đang phát triển (TASK HIỆN TẠI).
- Định kỳ `git rebase main` để hút thay đổi app vào web → giảm conflict cuối cùng.
- Commit message rõ ràng cho web: prefix `[web]` để dễ filter sau.

---

## 9. Khi cần hỏi anh Toàn

Anh Toàn rất rõ ràng về yêu cầu — nên ưu tiên hỏi (qua AskUserQuestion) thay vì giả định khi:
- Có lựa chọn UX khác biệt rõ giữa mobile/web (vd: Modal bottom sheet vs center)
- Cần đặt giá xu khác cho web (mặc định: giống mobile)
- Domain thật, contact email thật để update Privacy/Terms

---

## 10. Partner SSO — nhúng Tuzi vào app đối tác (vd bank)

**Mục đích**: cho phép 1 đối tác ngoài (app ngân hàng, ví điện tử…) nhúng Tuzi (web) vào app của
họ. Người dùng của đối tác bấm 1 icon là vào thẳng Tuzi, KHÔNG cần tạo tài khoản/đăng nhập riêng —
Tuzi tự nhận diện qua token đối tác ký sẵn và tự đăng nhập (map sang 1 user Supabase nội bộ, tài
khoản đầy đủ, lá số/lịch sử lưu lâu dài). Giữ nguyên thương hiệu Tuzi khi nhúng — không có
white-label/theme riêng theo đối tác.

**Kiến trúc**: đối tác tự ký 1 JWT ngắn hạn (HS256, secret dùng chung, `sub`=external_user_id,
`iat`/`exp` bắt buộc, tuổi token ≤120s) → mở `https://tuzi.vn/embed?partner=<code>&token=<jwt>`
(webview/iframe) → `App.tsx`'s `Boot()` phát hiện path `/embed` (web only, đọc thẳng
`window.location`, KHÔNG qua React Navigation) → gọi Edge Function `partner-sso` → verify token,
map/tạo user qua bảng `partner_user_links`, cấp bonus xu riêng của đối tác (CỘNG THÊM vào 100 xu
mặc định của `handle_new_user()`, không thay thế — 1 lần duy nhất, idempotent), phát hành session
KHÔNG cần mật khẩu (`admin.generateLink` magiclink + `verifyOtp` ngay trong function) → client
`setSession()` → `AuthContext` tự nhận, vào thẳng `AppNavigator`.

**File liên quan**:
- `supabase_partner_sso.sql` — bảng `partners` (code/secret/bonus_xu/active) + `partner_user_links`
  (map external_user_id ↔ user Supabase) + RPC `credit_partner_bonus` (idempotent, theo đúng
  pattern `credit_iap`/`credit_topup`). Cả 2 bảng deny-by-default cho client (RLS bật, không tạo
  policy nào) — chỉ service_role (Edge Function) đọc/ghi được.
- `supabase_partner_admin.sql` — thêm cột pháp lý cho `partners` (`business_reg_no`, `address`,
  `contact_email`, `website`), cột `employee_code` trên `partner_user_links`, bảng
  `partner_sso_logins` (log MỖI LẦN đăng nhập SSO kèm mã nhân viên — nguồn dữ liệu cho báo cáo cấp
  nhân viên sau này, chưa có UI xem), và 4 RPC `admin_list_partners` / `admin_create_partner` /
  `admin_update_partner` / `admin_set_partner_active` (security definer, tự check `is_admin()`,
  đúng khuôn `admin_create_broadcast`). `code` KHÔNG đổi được sau khi tạo (đối tác đã dùng trong
  URL nhúng thật).
- `supabase/functions/partner-sso/index.ts` — verify JWT bằng `npm:jose`, tạo/map user, phát
  session, cấp bonus. Đọc thêm claim tuỳ chọn `employeeCode` (mã nhân viên đối tác) từ JWT, ghi vào
  `partner_sso_logins` mỗi lần đăng nhập + cập nhật giá trị GẦN NHẤT vào `partner_user_links`.
- `src/lib/partnerAuth.ts` — `signInViaPartner(partnerCode, token)` gọi function trên rồi
  `supabase.auth.setSession(...)`.
- `App.tsx` — `useEmbedParams()` + logic SSO trong `Boot()` (đọc `window.location.pathname ===
  '/embed'`, không cần route/Stack.Screen mới vì `Boot()` vốn đã quyết định LoginScreen/AppNavigator
  độc lập với React Navigation).
- `netlify.toml` — block `[[headers]] for = "/embed"` nới CSP `frame-ancestors` riêng cho path này
  (path khác vẫn giữ `X-Frame-Options: SAMEORIGIN` như cũ).
- `tuvi-admin/src/pages/Partners.tsx` — trang "🤝 Đối tác" trong dashboard admin để tự tạo/sửa/bật-tắt
  đối tác (không cần vào SQL Editor nữa), có nút sinh secret ngẫu nhiên + copy URL nhúng.
- `tools/partner-sso-simulator.html` — công cụ DEV để tự ký JWT test (Web Crypto SubtleCrypto ngay
  trong trình duyệt, secret không gửi đi đâu) và mở `/embed?...` local, mô phỏng 1 đối tác thật khi
  chưa có đối tác thật để test. Chạy qua `http://localhost` (không phải `file://`, vì `crypto.subtle`
  cần secure context) — cấu hình `partner-sim` trong `.claude/launch.json` (không commit, đã gitignore).

**Nâng cấp tài khoản** (user vào qua đối tác muốn tự ra dùng trực tiếp tuzi.vn): user Partner SSO có
email GIẢ (`...@users.tuzi.internal`) và KHÔNG có mật khẩu nào, nên màn "Đổi mật khẩu" thường (cần
mật khẩu cũ) không dùng được. Xây riêng luồng self-service trong `AccountScreen.tsx` (card "🚀 Nâng
cấp tài khoản", chỉ hiện khi `user.isPartnerAccount` — tín hiệu này CHÍNH LÀ domain
`@users.tuzi.internal`, không cần cột/metadata riêng, tự hết hiệu lực khi đã gắn email thật):
1. `request_partner_upgrade` (action mới trong `auth-email`): xác thực Bearer token đúng là tài
   khoản Partner SSO, tra trùng email mới qua `find_user_id_by_email`, sinh mã OTP 6 số (hash SHA-256
   lưu vào bảng `partner_upgrade_otps` — xem `supabase_partner_upgrade.sql`, KHÔNG lưu password ở
   bước này), gửi mã qua Resend.
2. `confirm_partner_upgrade`: xác nhận mã đúng (tối đa 5 lần sai, hết hạn 10 phút) rồi
   `admin.updateUserById(userId, {email, password, email_confirm:true})` — giữ nguyên `userId` nên
   toàn bộ dữ liệu (lá số/xu/`partner_user_links`) tự động giữ nguyên; vẫn dùng được cả 2 lối vào
   (qua đối tác lẫn trực tiếp) sau khi nâng cấp.
- `src/lib/auth.ts`: `AuthUser.isPartnerAccount`, `requestPartnerUpgrade()`, `confirmPartnerUpgrade()`.

**Thêm 1 đối tác mới**:
1. Vào `tuvi-admin` → trang "🤝 Đối tác" → tạo mới (mã, tên, secret sinh sẵn, bonus xu, thông tin
   pháp lý). Secret hiện nguyên văn trong danh sách để copy gửi lại cho đối tác bất cứ lúc nào.
2. Sửa `netlify.toml`, thêm domain thật của đối tác vào dòng `Content-Security-Policy:
   frame-ancestors` của block `/embed`, rồi build + deploy lại web.
3. Gửi đối tác: URL `https://tuzi.vn/embed?partner=<code>` (copy sẵn trong trang Đối tác) + hướng
   dẫn ký JWT (HS256, secret đã cấp, `sub`=ID user của họ, `iat`=thời điểm hiện tại, `exp`≤120s sau
   `iat`, tuỳ chọn thêm `employeeCode` nếu đối tác cần theo dõi tới cấp nhân viên).

**Việc CHƯA làm** (chờ có đối tác thật mới cần): UI báo cáo/thống kê theo `employee_code` (dữ liệu
đã ghi vào `partner_sso_logins`, chỉ chưa có màn hình xem), chống phát lại bằng nonce-store riêng
(hiện dựa vào `exp` ngắn làm lớp phòng thủ chính), white-label/theme riêng theo đối tác.

---

## 11. Nghiệm quá khứ, Dòng đời đã qua, Luận tương lai (nhãn "Thử nghiệm" ĐÃ GỠ 27/10/2026 — chạy chính thức theo quyết định của anh Toàn; cổng ra mắt bên dưới vẫn CHƯA đạt)

Các box nằm dưới box "Vận hạn diễn ra trong năm" ở `VanHubScreen` → route `PastReview` (rồi `FutureReview`). Đặc tả gốc của anh Toàn:
`D:\Lap trinh\Tu vi\tuzi-nghiem-qua-khu-spec.md` (được phép chỉnh). Tiến độ: **GĐ1 bộ máy** + **GĐ2 Nghiệm quá khứ/Vì sao** (đã commit),
**GĐ3 Dòng đời đã qua** (đã commit), **GĐ4 Luận tương lai** (làm xong, chờ duyệt).

**Tên hiển thị các tầng "Vì sao" (anh Toàn chốt 04/10/2026):** Bẩm sinh (goc) · Giai đoạn 10 năm (nen) · Trong năm (ngoi) · Tóm lại (ket) — `LAYER_FRIENDLY` trong `explainWhy.ts`; mã nội bộ goc/nen/ngoi giữ nguyên trong code/dữ liệu. Phần "Xem sâu hơn (dành cho người học tử vi)" viết lời thường, KHÔNG hiện mã quy tắc/điểm thô (test chặn); các dòng cùng một sao phục vụ nhiều sự kiện được gộp thành một dòng.

**Quyết định của anh Toàn (đừng đảo):** lời văn = **mẫu ghép từ tín hiệu, KHÔNG AI**; giờ sinh không rõ → để sau;
mỗi giai đoạn dừng cho anh duyệt rồi mới commit. ~~Mốc đổi năm Bát Tự theo âm lịch của app~~ → **ĐÃ ĐỔI 06/10/2026** (anh yêu cầu rà logic cho đúng lý thuyết): lá số gốc của tính năng lập theo TIẾT KHÍ (xem `BAZI_BASIS`).

**Kiến trúc** (`src/core/pastReview/`, thuần TS, tất định, không UI/Supabase/AI):
- `config.ts` — MỌI trọng số/ngưỡng đều **TẠM** + `RULEBOOK_VERSION` (đổi trọng số phải tăng version).
- Tử Vi: tái dùng `annualEvents/engine.computeAnnualPrediction(result, year, { skipMonthly: true })` → ánh xạ 5 mảng
  (Sự nghiệp/Chỗ ở/Tình duyên/Tài lộc/Gia đạo) qua `areaMap.ts`; `HEALTH_/LEGAL_/EDUCATION_` bị loại (không luận bệnh/tai nạn).
- Bát Tự: `bazi/` (lưu niên, thập thần, xung/hợp/hình/hại/phá, Dịch Mã/Đào Hoa, đại vận Bát Tự, `truePillars.ts` trụ theo tiết khí, `strength.ts` thân vượng/nhược + dụng/kỵ) + bảng quy tắc `BZ_*`.
- Bốn tầng **Gốc/Nền/Ngòi/Kết**; hai hệ cùng báo → thưởng; một hệ → ×0.6. Chọn 5–8 mốc (3 nếu <25 tuổi), ≤2/mảng, trải ≥2 đại hạn.
- Lời văn (GĐ2): `phrases.ts` ("Có thể bạn đã …", sự kiện nhạy cảm chỉ nói ở mức mảng đời), `explainWhy.ts` (2 mức: người xem /
  người học), `lint.ts` (từ cấm: Mệnh chủ/Thân chủ/chắc chắn…, chạy trong test trên mọi câu mẫu), `feedback.ts` (khớp x/y, nhắc giờ sinh khi >50% Sai).
- Server: `supabase_past_review.sql` (ĐÃ chạy trên production) — `past_review_feedback` (RLS chính chủ, cascade) + `analytics_events`
  (chỉ ghi; admin đọc). Client: `lib/pastReviewStore.ts`, `lib/track.ts` (best-effort, không ghi nội dung riêng tư).
- Không tính xu ở GĐ2 (miễn phí). Kết quả tính chỉ cache trong bộ nhớ phiên (không cache bền).

**GĐ3 — Dòng đời đã qua** (`PastLifeScreen`, route `PastLife`, vào từ cuối màn Nghiệm quá khứ):
- `pastReview/timeline.ts` gom các năm ĐÃ CHẤM (cùng điểm với danh sách mốc — không chấm lại) theo đại hạn Tử Vi thành "chặng"; 3 câu tóm
  tắt bằng mẫu; `markerOfYear()` dựng mốc cho năm bất kỳ để dùng lại `explainWhy`. Chỉ có 30 năm gần nhất, từ 15 tuổi; KHÔNG có đường sức khỏe.
- `components/PastLifeChart.tsx` (react-native-svg: dải đại hạn, đường tổng + 4 mảng, tương lai làm mờ, chạm chọn năm — web tính vị trí từ
  `clientX`), `components/PastWhy.tsx` (khối Vì sao + hàng phản hồi dùng chung với màn Nghiệm quá khứ), `lib/captureView.ts` (thẻ chia sẻ PNG:
  html2canvas trên web, view-shot trên native), `lib/pastReviewCache.ts` (cache bộ nhớ dùng chung hai màn).
- Xu: `PREMIUM.COST.pastLife` = 50 (TẠM; key `price_past_life` trong `app_config`, whitelist trong `admin_set_config`, ô nhập ở `tuvi-admin` Settings).
  Miễn phí: biểu đồ, chặng tuổi thơ + chặng hiện tại, nhật ký, thẻ chia sẻ. Mở khóa 1 lần/lá số qua `confirmAndUnlock(fkey(result,'pastLife:full'),'advanced')`.
  KHÔNG nằm trong combo trọn đời.
- Ghi chú ≤500 ký tự: Edge Function `review-notes` (AES-GCM, khóa riêng mỗi người = HKDF(secret `REVIEW_NOTES_KEY`, salt=user_id)), bảng
  `past_review_notes` không có policy (chỉ service_role). Máy chủ giải mã được (không phải mã hóa đầu-cuối). **Bản sao khóa nằm ở `.secrets/review-notes.env`
  (gitignored) — anh Toàn cần tự sao lưu ra nơi an toàn; mất khóa = mất toàn bộ ghi chú.** Ghi chú không vào AI và không vào thẻ chia sẻ.
- SQL: `supabase_past_life.sql` (ĐÃ chạy production). Edge Function `review-notes` ĐÃ deploy.

**GĐ4 — Luận tương lai** (`FutureReviewScreen`, route `FutureReview`; box thứ ba ở `VanHubScreen`, ngay sau box Nghiệm quá khứ). Anh Toàn ĐÃ BỎ
"Chế độ học" (04/10/2026) — đừng làm lại; các bảng/RPC của nó đã gỡ khỏi production (`supabase_future_review.sql`).
- Phân tích các năm SẮP TỚI (từ năm âm lịch hiện tại tới khi đủ 100 tuổi) bằng ĐÚNG bộ máy của Nghiệm quá khứ (Tử Vi qua engine "Luận sự kiện năm" +
  Bát Tự, 5 mảng, bốn tầng, cùng `scoreYears`): `pastReview/futureReview.ts` (`computeFutureReview`, `selectFutureMarkers`: ≤12 năm nổi bật, ≤3/mảng, ≤2/đại hạn,
  mỗi đại hạn có đại diện), `futurePhrases.ts` (xu hướng "Có thể bạn sẽ …"; năm nhạy cảm chỉ nói mảng đời; mỗi năm một GỢI Ý hành động — cơ hội nếu điểm có dấu ≥0,
  chuẩn bị nếu <0), `timeline.buildFutureTimeline` (chặng theo đại hạn tới ~100 tuổi), `PastLifeChart mode="future"` (trục tới 100 tuổi, không làm mờ).
- Độ mạnh chuẩn hóa theo CÁC NĂM TƯƠNG LAI của chính lá số (tương đối). Không có phản hồi Đúng/Sai, không ghi chú. `EVENT_MAX_AGE` (config.ts, TẠM) chặn sự kiện vô lý theo
  tuổi (thăng chức sau 62…, mua nhà sau 80…, sinh con sau ~50); áp cả cho Nghiệm quá khứ nhưng chỉ ảnh hưởng người trên ~50 tuổi. Đại vận Bát Tự kéo dài 12 vận.
- Xu: miễn phí = danh sách năm nổi bật + biểu đồ + chặng hiện tại; mở khóa 1 lần/lá số các chặng còn lại qua `confirmAndUnlock(fkey(result,'future:full'),'advanced')`,
  `PREMIUM.COST.futureLife` = 50 (TẠM; `app_config.price_future_life`, whitelist `admin_set_config`, ô nhập ở `tuvi-admin` Settings). Không nằm trong combo trọn đời.
- Cache bộ nhớ phiên: `lib/futureReviewCache.ts`. Tracking: future_review_open / why_open / unlock.

**Rà soát lý thuyết 06/10/2026 (bảng `pr-0.2-tam`)** — ĐÃ KIỂM ĐÚNG, không sửa: bảng sao theo can/chi năm (Lộc Tồn, Kình/Đà, Khôi/Việt, Xương/Khúc, Mã, Đào Hoa, Hồng Loan/Thiên Hỷ,
Khốc/Hư, Kiếp Sát, Cô/Quả, Phá Toái, Hoa Cái…), Tứ Hóa 10 can Nam Phái, cung khởi + chiều Tiểu hạn, Tứ Hóa đại hạn theo can cung / lưu niên theo can năm, Tuần/Triệt chỉ ở cung chính;
Bát Tự: thập thần, lục hợp/xung/hại/phá, tam hợp, tam hình/tự hình, tàng can, Dịch Mã/Đào Hoa, Ngũ Hổ Độn, chiều đại vận. ĐÃ SỬA (chỉ trong module pastReview, không đụng core):
(1) dụng/kỵ thần: bỏ cách đếm hành đơn giản, dùng phép phù ức `bazi/strength.ts` (tháng lệnh 40/100…; đổi kết luận vượng/nhược ở ~31% lá số so với cách cũ);
(2) trụ năm/tháng theo tiết khí `bazi/truePillars.ts` (cũ: tháng âm lịch → sai tháng lệnh ở ~17% người, sai trụ năm ~2%); đại vận Bát Tự khởi từ trụ tháng tiết khí + 12 vận;
(3) `EVENT_MAX_AGE`. **CHƯA SỬA, cần anh Toàn quyết (ảnh hưởng toàn app):**
 • ĐÃ XỬ LÝ (anh Toàn duyệt 06/10/2026): `core/batTuEngine.ts` nay lập trụ năm/tháng theo TIẾT KHÍ (`core/baziPillars.ts`) và dụng/kỵ thần theo phù ức (`core/batTuStrength.ts`) —
   màn Bát Tự, phong thủy, AI, Nghiệm quá khứ/Luận tương lai dùng chung một nguồn. TUỔI MỤ nay theo NĂM ÂM LỊCH sinh ở khắp app: `ageUtil.lunarBirthYear/tuoiMuOfYear/currentAgeOf`
   (tuViEngine.viewingAge, calculateTieuVan, daiVanScore, offlineLuanGiai, nhatVan, todaySummary, compareCharts, aiAnalysis, TieuVanScreen, bazi/luck). ĐỪNG viết `năm − birthInfo.year` nữa.
 • Đã thêm vào bảng Bát Tự (pr-0.3-tam): năm trùng tuổi (BZ_FAM_TAISUI), Phục ngâm trụ ngày (BZ_LOV_FUYIN_DAY), Phản ngâm trụ ngày (BZ_HOM_FANYIN_DAY). VẪN chưa có: tòng cách, điều hậu, thông quan.
 • Trọng số Tử Vi (engine annualEvents) và bảng BZ_* là heuristic, chỉ kiểm chứng được bằng thử mù (xem Cổng ra mắt).

**Bảng trọng số Bát Tự (`docs/past-review-rulebook.md`, `pr-0.1-tam`) đã được anh Toàn DUYỆT ngày 04/10/2026** (vẫn là giá trị khởi điểm, chỉnh được khi có dữ liệu phản hồi).

**Cổng ra mắt (CHƯA đạt — giữ nhãn "Thử nghiệm"):** cần (1) mốc do bộ máy chọn khớp cao hơn RÕ RỆT năm ngẫu nhiên và (2) người có nghề xác nhận phần Vì sao luận đúng phép.
Công cụ (chạy bằng jest + biến môi trường, file trong `exports/` đã gitignore vì chứa ngày giờ sinh) — xem đầu `src/core/__tests__/pastReviewExport.test.ts`:
- `PAST_REVIEW_EXPORT=1 PAST_REVIEW_BIRTHS_FILE=nguoi-thu.csv` (mỗi dòng `tên,NĂM-THÁNG-NGÀY-GIỜ-nam|nu`) → mỗi người một bộ thử mù (5 mốc bộ máy + 5 năm ngẫu nhiên CÙNG MẢNG, trộn) + file đáp án.
- Người thử điền cột "Phản hồi" (Đúng / Gần đúng / Sai / Không nhớ) trong `*-blind.md` → `PAST_REVIEW_SCORE=1` chấm: tỉ lệ khớp hai nhóm, chênh ghép cặp + khoảng tin cậy 95%, chia theo tuổi
  (logic ở `pastReview/blindTest.ts`, có test). Ngưỡng đạt = `LAUNCH_GATE` trong config.ts, **chốt TẠM 05/10/2026 theo anh Toàn để chạy thật trước**: chênh ≥15 điểm %, CI nằm hẳn trên 0, ≥50 người (đổi được bằng PAST_REVIEW_PASS_DIFF / PAST_REVIEW_MIN_PERSONS); điều chỉnh lại khi có dữ liệu thử nghiệm.
- `PAST_REVIEW_EXPERT=1` → `past-review-expert-pack.md` cho người luận Tử Vi/Bát Tự đánh dấu Đúng phép / Gượng / Sai phép. `PAST_REVIEW_RULEBOOK=1` xuất lại `docs/past-review-rulebook.md`.

**Hai lỗi có sẵn từng ghi chú — ĐÃ SỬA (04/10/2026, test ở `knownBugFixes.test.ts`):** `daiVanScore.REL_PALACES` dùng 'Hôn Nhân' thay cho cung thật 'Phu Thê' (nay có cả hai);
`daiVanEngine.calculateTieuVan` đổi nhầm dương→âm cho lá số nhập ÂM lịch (nay lấy chi năm trực tiếp, khớp tuViEngine).

---

## 12. Logic NGÀY ĐẸP (Xem theo ngày · Xem ngày tốt · lịch tô màu · Home) — v3 (07/10/2026)

Đặc tả gốc của anh Toàn: thư mục `D:\Lap trinh\Tu vi\Tai lieu\Ngay dep` (md/html + zip Dev Pack). Một bộ máy dùng chung — KHÔNG viết công thức ngày thứ hai:
- `core/dayCalendar.ts` — dữ kiện lịch của một ngày: **THÁNG TIẾT KHÍ** (chi tháng đổi ở 12 tiết, ngày giao tiết dùng tháng mới), năm Bát Tự theo Lập Xuân, ngày/tháng/năm âm. Cache theo ngày + bảng tiết theo năm.
- `core/dayQualityTables.ts` — trọng số `DAY_WEIGHTS`, ngưỡng, bảng 28 tú theo Ngọc Hạp Ký (14 cát/14 hung; trường phái lịch Việt, KHÔNG phải Hiệp Kỷ; mốc 01/01/2000 = Vị), Thiên/Nguyệt Đức, phân việc; `DAY_RULEBOOK_VERSION='dq-1.0-tam'` (đổi trọng số/bảng ⇒ tăng version). Mọi con số là TẠM.
- `core/nhatVan.ts` — `scoreNhatVan` (có lá số) và `genericDayFacts` (chưa có lá số) dùng chung `calendarLayer`. Tầng: Lịch trạch nhật 27% · Bát Tự 38% · Đại vận 12% · Lưu niên 13% · Nguyệt vận 10%. KHÔNG có tầng Tử Vi (đặc tả §7.5: chưa có rule pack được duyệt).
- `core/dayPicker.ts` — `pickGoodDays`/`pickGoodDaysGeneric` cùng một `pickDays`: xung tuổi **loại** ngày, Nguyệt phá/Tuế phá **trừ điểm nặng + trần** (anh Toàn chốt 07/10/2026, không loại) cho việc trọng đại (weight ≥ 4, trừ nhóm HEALTH); Tam Nương/Nguyệt kỵ chỉ trừ điểm việc trọng đại hoặc xuất hành; Kim Lâu chỉ cảnh báo ở cưới/làm nhà.
- `data/hiepKyTruc.ts` — Trực nghi/kỵ đích danh của 73 mục việc Hiệp Kỷ quyển 11 (sinh từ `Hiep_Ky_Doi_chieu/hiep_ky_73_muc_viec.json`); `TASK_TO_HK` (dayQualityTables) ánh xạ 54 việc → mục Hiệp Kỷ, hôn nhân giữ Định/Thành làm nghi mềm (Tam Hợp). Mới là LỚP ỨNG VIÊN: chưa có thần sát/Nguyệt phá gia trọng/điều lệ "gặp Đức vẫn kỵ".
- `core/baziRelations.ts` — quan hệ xung/hợp/hình/hại/phá giữa hai chi (dùng chung Nghiệm quá khứ và ngày đẹp).

**Đã sửa so với bản cũ:** (1) Trực/Hoàng đạo ngày/vượng-suy theo mùa dùng tháng âm lịch → nay tháng tiết khí (Trực khác ở ~nửa số ngày); (2) Nguyệt phá ≡ Trực Phá chỉ tính MỘT lần (cũ: phạt 2–3 lần); (3) lưu niên theo năm Lập Xuân, Tam Tai theo năm âm, tuổi mụ theo năm âm của ngày; (4) bảng 28 tú sai 8 tú; (5) thêm thập thần + quan hệ chi ngày với 4 trụ (xung dụng thần nặng hơn, xung kỵ thần nhẹ hơn); (6) heatmap/Home chưa có lá số dùng cùng công thức lịch với Xem ngày tốt (cũ: quan hệ sinh-khắc Can–Chi, không có trong truyền thống trạch nhật).
- `core/hiepKy.ts` + `data/hiepKyThanSat.ts` (sinh từ gói `Tuzi_Hiep_Ky_1_2`, 07/10/2026) — port `tuzi_supplement_reference.py`: 35 khởi lệ thần sát theo THÁNG TIẾT KHÍ + 13 bảng theo mùa, bảng sáu bậc 132 ô, điều kiện Đức/chuyển quy tắc (có phát hiện vòng lặp), Nguyệt phá gia trọng (Tý/Ngọ/Mùi/Thân cần Đức; Mão/Dậu; Âm Dương Giao Phá; Tứ Phế). `hkActivityStatus(facts, việc)` → all_ji / ji / balance / none; `dayPicker` chỉ áp MỘT mức phạt nặng nhất (Hiệp Kỷ: −20 mọi việc kỵ, −15 Nguyệt phá cơ sở, −10 kỵ thường), thay cho trừ phẳng Bình/Thu/Bế. Việc nằm trong danh sách "không kỵ" của Nguyệt phá (cầu y, phá nhà, giải trừ…) KHÔNG bị phạt nhưng "không kỵ ≠ nghi". Bậc 0–5 là mã thứ tự, không phải điểm. `aggregateScenarios` + `validateBirthTime` (hợp đồng giờ sinh v2) đã có nhưng CHƯA nối app (cần migration DB + UI "Biết chính xác / Khoảng / Không rõ").
- Home "Vận khí hôm nay" dùng `toneOf` + `CAL_TONE` (cùng ngưỡng và màu với ô lịch tháng); `ScoreRing` nhận prop `color`.

**Chưa làm (cần người thạo duyệt bảng / ngoài phạm vi):** Âm Dương Đại Hội/Tiểu Hội, Âm Vị, Tam Âm, Tuyệt Âm/Dương, Tuế Bạc/Trục Trận (chưa có detector → ngày đó chưa xét, KHÔNG phải "không có"); điều lệ liên đới giữa các mục việc (30 điều lệ) mới đưa vào 3 điều (Tị/Dậu/Dần); mẫu Thương ngoại lệ Thổ vượng; Thiên Đức phương vị không quy đổi sang chi; nối giờ sinh không rõ vào chấm điểm cá nhân. Trước đây còn ghi: Tử Vi ở độ phân giải ngày (lưu nguyệt/lưu nhật), bảng thần sát đầy đủ + sáu mức chế hóa Hiệp Kỷ, giờ Tý muộn/can giờ, nhánh giờ sinh không rõ (khoảng điểm), nhiều chủ sự, giờ giao tiết chính xác (hiện theo ngày), trạng thái "chưa đủ dữ liệu" thay cho điểm. Golden test: `__tests__/dayQuality.test.ts`.

---

## 13. Sự kiện theo năm — engine CŨ (85 sự kiện) được GẮN LẠI + cải tiến từ đặc tả Tuzi 2.1 (08/10/2026)

Luận sự kiện năm · Nghiệm quá khứ · Luận tương lai **dùng lại `core/annualEvents` (85 sự kiện, rule dạng dữ liệu)**. Anh Toàn thấy bộ 60 chủ đề của đặc tả 2.1 "áp dụng full chưa chuẩn", nên chỉ lấy
các ý hay của 2.1 gắn vào bộ cũ (đừng đảo):
- **Lọc theo hoàn cảnh + tuổi** (`annualEvents/applicability.ts`): `computeAnnualPrediction(result, year, { context })`. Cờ hoàn cảnh = `false` → sự kiện bị ẩn (`EVENT_HIDDEN_IF_FALSE`); cờ chưa khai → VẪN hiện
  (khác 2.1, tránh kết quả thưa). Tuổi mụ ngoài `EVENT_AGE_WINDOW` → ẩn. ĐIỂM sự kiện không đổi; `allEvents/events/featuredGroups` chỉ gồm sự kiện áp dụng được, phần bị ẩn ở `hiddenEvents`.
  `EVENT_AGE_WINDOW` là nguồn DUY NHẤT của khoảng tuổi (`pastReview/config.EVENT_MIN_AGE/MAX_AGE` suy ra từ đó). `RULEBOOK_VERSION='pr-0.4-tam'`.
- **28 cờ hoàn cảnh**: màn `EventContextScreen` (route `EventContext`), lưu CỤC BỘ theo lá số (`lib/eventContext.ts`), dòng nhắc `components/EventContextNote` ở ba màn. Nghiệm quá khứ/Luận tương lai nạp cờ trong
  `lib/pastReviewCache`/`futureReviewCache` (chữ ký cache có `contextSig`); hoàn cảnh là của HIỆN TẠI nên có thể chưa đúng với năm đã qua (đã ghi trên màn Nghiệm quá khứ).
- **Đẩu Quân** (`annualEvents/douJun.ts`) sửa theo lõi: chi giờ dùng `getHourBranchIndex` (giờ 23 = Tý; cũ xếp vào Hợi), tháng sinh nhuận theo `effLunarMonth` (`core/lunarFix.ts`, nhuận ngày ≥16 dùng tháng kế).
- Lõi dùng chung đã sửa kèm: an Mệnh/Thân theo `effLunarMonth` (`tuViEngine`), tra âm lịch nhanh `core/lunarFast.ts` + nhớ ngày Sóc trong `lunarCalendar`.
- **Nâng cấp 08/10/2026 (`RULEBOOK_VERSION='pr-0.5-tam'`, CHƯA commit, chờ anh duyệt trọng số):**
  • Bát Tự (`pastReview/bazi/rules.ts` + `engine.ts`): +12 quy tắc — ngũ hợp/tương xung thiên can với can trụ ngày/tháng/năm, tam hợp chi tháng/chi năm, Hồng Loan & Thiên Hỷ (theo chi năm sinh), Thiên Ất Quý Nhân (theo can ngày/năm sinh, trọng số thấp vì xuất hiện ~1/3 số năm).
    Nguồn: tài liệu dân gian/tổng hợp tra trên mạng (không có sách kinh điển để đối chiếu) — mọi trọng số TẠM.
  • Tử Vi (`annualEvents/scorer.ts`, `config.TUAN_TRIET_DAMP=0.8`): tín hiệu đóng ĐÚNG cung bị Tuần/Triệt giảm 20% (không lan sang tam hợp, theo §2.2). Đặt 1 để tắt.
  • Lưu nguyệt Bát Tự (`bazi/engine.evaluateBaziMonth(s)`, `bazi/monthNote.ts`, `lib/useBaziMonths.ts`): trụ tháng theo tiết khí (Ngũ Hổ Độn), hiện dòng "🧭 Bát Tự …" dưới từng cửa sổ tháng của thẻ sự kiện (chỉ đối chiếu, KHÔNG đổi điểm). Ngưỡng `BAZI_MONTH_NOTE_MIN=40`.
  • Kiểm chứng (120 lá số tổng hợp): không quy tắc "chết"; tháng đỉnh Tử Vi trùng tháng có dấu hiệu Bát Tự 56,7% so với 44,6% tháng ngẫu nhiên (chỉ +12 điểm → Bát Tự theo tháng là tín hiệu YẾU, đừng diễn giải như bằng chứng độc lập).
- **Engine 2.1 ĐÃ GỠ khỏi repo** (08/10/2026, build web cho nhẹ; anh Toàn chưa dùng): `core/eventEngine`, `data/eventCatalog21`, `pastReview/eventYear`, `EventTopicCard`, test golden. Khôi phục từ git (commit trước commit gỡ) nếu cần; ghi chú: app đặt Linh Tinh ở Tý, iztro ở Ngọ — chưa chốt quy ước. Chỉ còn `data/eventContextLabels.ts` (nhãn 28 cờ hoàn cảnh).

---

_Cập nhật lần cuối: 07/10/2026, sau khi cập nhật logic ngày đẹp (dq-1.0)._
