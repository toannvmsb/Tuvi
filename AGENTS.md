# AGENTS.md — Handover cho session sau

Tài liệu này dành cho Codex (và Codex agent) khi mở session mới trên codebase
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
- **AI provider**: OpenAI (gpt-4o-mini) **chính**, Anthropic (Codex) **dự phòng**.
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
- Bank: VPBank 3838386666 — LE NHU QUYNH (tài khoản nhận tiền thật; anh Toàn xác nhận 11/2026; nguồn thật là `src/constants/payment.ts`)
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
- ✅ Phân tích AI (gọi OpenAI/Codex qua proxy đã có)
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

_Cập nhật lần cuối: cuối tháng 5/2026, ngay trước khi mở session web._
