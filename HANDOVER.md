# HANDOVER — đọc file này TRƯỚC khi làm bất cứ việc gì (cập nhật 08/11/2026)

Dành cho Claude khi mở session mới (sau khi anh Toàn cài lại Windows + Claude, mất toàn bộ ngữ cảnh cũ).
Thứ tự đọc: **file này → `CLAUDE.md`** (quy tắc luận giải Tử Vi Nam Phái + kiến trúc + các quyết định đã chốt) → khi cần thì `SYSTEM_INVENTORY.md`, `HUONG_DAN_DEPLOY.md`, `SETUP.md`.
`AGENTS.md` là bản sao của CLAUDE.md cho Codex — bỏ qua.

> Người dùng: **anh Toàn** (Nguyễn Văn Toàn, publisher cá nhân). Luôn trả lời **tiếng Việt**, xưng "em", gọi "anh". Anh rất rõ yêu cầu; có lựa chọn UX/giá khác biệt thì hỏi bằng AskUserQuestion thay vì đoán.

---

## 1. Dự án là gì

**Tuzi — Tử Vi & Bát Tự**: app mobile (iOS/Android) + web `tuzi.vn`, CÙNG một codebase.
- Stack: Expo SDK 58 · React Native 0.88.1 · React 19.3 · TypeScript 6 · Supabase (Auth + Postgres + Edge Functions) · Netlify (web).
- Bundle id `com.tuzi.app`, version `3.0` (iOS buildNumber 3, EAS `appVersionSource: remote` + `autoIncrement`).
- Repo: `https://github.com/toannvmsb/Tuvi.git` — **nhánh làm việc `feature/web`** (main = mobile stable). Commit web có prefix `[web]`.
- Repo thứ hai: **`D:\Lap trinh\Claude\tuvi-admin`** (dashboard admin, Vite). ⚠ Repo git LOCAL, **KHÔNG có remote** → xem mục 3.
- AI: OpenAI gpt-4o-mini chính, Anthropic dự phòng. 1 xu = 100đ.
- Thanh toán: mobile production = CHỈ IAP (expo-iap); web = CHỈ VietQR/SePay (chi tiết CLAUDE.md §5).

## 2. Trạng thái hiện tại (cuối phiên 07–08/11/2026)

Git: `feature/web` ở commit `fe02841`, **đã push**. Working tree chỉ còn file rác không commit: `supabase/.temp/cli-latest`, PDF "Tuzi 2.5.8 – Product Redesign…", `apple_review_reply_draft.txt`.
Web đã `npm run build:web` (thư mục `dist/` mới nhất) nhưng **CHƯA deploy Netlify** (chỉ deploy khi anh bảo).

### Việc đã làm trong phiên gần nhất (đừng làm lại)
1. **IAP iOS**: chuyển `react-native-iap` (Nitro, crash TestFlight) → **`expo-iap@6.4.1`**; `src/lib/iap.ts` load lười (`loadIap()`), `type:'in-app'`, `request:{apple:{sku},google:{skus}}`. Mua xong gọi Edge Function `iap-verify` (xác thực StoreKit 2 **JWS**, cộng xu qua RPC `credit_iap`, chỉ service_role). Không còn cộng xu giả cục bộ. Lịch sử nạp (`lib/topup.ts`) gộp `iap_transactions` (mã `APPLE-xxxxxxxx`). `AppErrorBoundary` bọc app.
   - **CHƯA kiểm chứng** trên giao dịch Apple thật: hash SHA-256 của Apple Root CA G3 (`APPLE_ROOT_G3_SHA256` trong `supabase/functions/iap-verify/index.ts`) viết từ trí nhớ — nếu mua sandbox báo `invalid_receipt` thì kiểm hash này đầu tiên.
   - Việc anh còn phải làm: build lại TestFlight, mua thử sandbox, xác nhận xu tăng + có dòng `APPLE-…` trong lịch sử.
2. **Tóm tắt + Phân tích chi tiết** cho Toàn lá số / Đại vận / Tiểu vận / Nguyệt vận (Nâng cao + AI): `core/offlineSummary.ts`, `utils/aiSummary.ts` (AI summary = lần gọi AI thứ 2 tóm tắt bản chi tiết, cache theo chữ ký), `components/AnalysisSummary.tsx`; mỗi phần có nút Xuất/In PDF riêng. Mở khóa → hiện cả hai; chưa mở → preview như cũ.
3. **PDF mobile**: `lib/platform.ts` `printHtml` — copy file PDF phải `await` (expo-file-system API mới là async), thử chia sẻ nhiều lần. Anh xác nhận ổn.
4. **Lịch**: ngày MỜ của tháng trước/sau lấp các tuần thiếu (Home `OverviewScreen` + `LunarCalendarPicker` qua prop `getHeatmap`). Nền/viền mờ 0.25 (qua `fadeColor` trong `constants/theme.ts`), chữ mờ 0.4 — anh đã chốt số này, đừng đổi.
5. **Nút ĐỔI LÁ SỐ**: component dùng chung `src/components/ChartSwitchLine.tsx` (dòng chữ + icon `swap`, mở hộp chọn lá số đã lưu; chọn xong gọi `setMyChartId` → "lá số của tôi"). `lib/myChart.ts` có `subscribeMyChart`, `useMyResult` tự nạp lại khi đổi. Màn nhận `result` qua route dùng `replaceScreen` (dựng lại màn với lá số mới); `MainTabs` có `key` theo lá số. Đã gắn ở: Lá số chi tiết (Tử Vi/Bát Tự — đã bỏ chữ Hán 紫微/八字), Tổng quan lá số, Vận hạn tổng quát (dòng "[Tên] - [giới tính] - [Can Chi năm sinh]"), Xem theo ngày, Xem ngày tốt, Tài lộc, Chân dung ("Từ cung Phu Thê của [tên]").
6. Chú thích nút Chân dung ở Tổng quan lá số + Menu: "Dựa trên luận giải cung Phu Thê".

### Việc CHƯA làm / đang chờ
- Deploy web `dist/` lên Netlify (netlify.toml đã đủ).
- Email Resend (`auth-email`) — xác nhận đã deploy + verify domain tuzi.vn (CLAUDE.md mục "CÒN LẠI").
- Test end-to-end trên Chrome thật; webhook SePay.
- Verify IAP thật (mục 2.1), push notification, các mục "Chưa làm" trong CLAUDE.md §4, §10, §11 (cổng ra mắt Nghiệm quá khứ), §12.
- Toàn bộ UI mới của phiên này mới qua `tsc --noEmit` (sạch), **chưa test trên máy thật** — hỏi anh phản hồi nếu thấy lệch.

## 3. ⚠ BACKUP TRƯỚC KHI CÀI LẠI WIN (những thứ KHÔNG nằm trên GitHub)

Anh phải tự sao ra ổ ngoài/đám mây. Mất = mất vĩnh viễn:

| Thứ | Ở đâu | Vì sao quan trọng |
|---|---|---|
| **`.secrets/review-notes.env`** | `tuvi-app\.secrets\` | Khóa `REVIEW_NOTES_KEY`: mất = mất toàn bộ ghi chú đã mã hóa của người dùng |
| **`@vantoan10__tuvi-app.jks`** | gốc `tuvi-app\` | Keystore ký Android — mất = không cập nhật được app trên Google Play (nếu EAS không giữ bản sao thì không lấy lại được) |
| **`API Key IOS.txt`** | gốc `tuvi-app\` | Khóa/ghi chú App Store |
| **Toàn bộ `D:\Lap trinh\Claude\tuvi-admin`** | repo git local, **không có remote**, có file `.claude/` và `AGENTS.md` chưa commit | Dashboard admin — chỉ tồn tại trên máy này. Nên tạo repo GitHub (private) và push, hoặc zip cả thư mục |
| `D:\Lap trinh\Tu vi\` | ngoài repo | Đặc tả gốc: `tuzi-nghiem-qua-khu-spec.md`, `Tai lieu\Ngay dep` (đặc tả ngày đẹp + Dev Pack), `Hiep_Ky_Doi_chieu`, gói `Tuzi_Hiep_Ky_1_2`, "Anh dua len Store" |
| `tuvi-app\exports\` | gitignored | Dữ liệu thử mù Nghiệm quá khứ (có ngày giờ sinh thật) |
| `tuvi-app\.claude\launch.json`, `settings.local.json` | gitignored | Cấu hình preview (xem mục 5) |
| 3 file rác chưa commit (PDF Tuzi 2.5.8, `apple_review_reply_draft.txt`) | gốc repo | Tài liệu sản phẩm/nháp trả lời Apple — copy giữ lại nếu cần |
| Bộ nhớ Claude cũ | `C:\Users\AD\.claude\projects\D--Lap-trinh-Claude-tuvi-app\memory\` | Xem mục 7 (đã chép nội dung vào đây) |
| Mật khẩu/khóa dịch vụ | Supabase Dashboard, Resend, OpenAI/Anthropic, SePay, Apple/Google, Netlify, EAS | Không lưu trong repo — anh tự đăng nhập lại |

Không có file `.env` ở gốc tuvi-app (đã kiểm). Secret chạy nằm ở **Supabase secrets** (Edge Functions) và cấu hình EAS/Netlify.

## 4. Dựng lại môi trường sau khi cài Win

1. Cài: **Node 24.x** (máy cũ v24.15.0; yêu cầu tối thiểu 18), Git, Claude Code/Desktop, (tuỳ) VS Code. Đăng nhập GitHub.
2. `git clone https://github.com/toannvmsb/Tuvi.git "D:\Lap trinh\Claude\tuvi-app"` rồi `git checkout feature/web`.
3. Khôi phục từ backup: `.secrets\review-notes.env`, `*.jks`, `API Key IOS.txt`, `exports\` (nếu cần), thư mục `tuvi-admin`.
4. `cd tuvi-app && npm ci` (dùng đúng `package-lock.json`; **đừng** thêm `--legacy-peer-deps` rồi commit lock — lỗi này từng làm EAS fail "Install dependencies").
5. Kiểm tra: `npx tsc --noEmit -p .` (phải sạch) → `npm run build:web` (phải ra `dist/`).
6. Công cụ cần đăng nhập lại: `npx supabase login` + `supabase link` (project của Tuzi; lấy ref trong Dashboard), `npx eas-cli login`, Netlify (deploy qua GitHub hoặc `npx netlify deploy`).
7. Tạo lại `.claude/launch.json` nếu cần preview (xem dưới).

## 5. Lệnh thường dùng

```bash
npm run web                 # dev web
npm run build:web           # build web → dist/ (đã có sẵn trong package.json)
npx tsc --noEmit -p .       # kiểm tra kiểu (luôn chạy trước khi báo xong)
npx expo start              # Metro cho Expo Go / dev build (cổng 8081, điện thoại cùng Wi‑Fi)
npx jest src/core/__tests__ # test lõi (có offlineSummary, dayQuality, knownBugFixes…)
npx supabase db query --linked --file supabase_xxx.sql     # chạy SQL lên production
npx supabase functions deploy <ten-ham> [--no-verify-jwt]  # deploy Edge Function
npx eas-cli build --platform ios --profile production      # build TestFlight
```
Edge Functions hiện có: `admin-api, ai-chat, ai-proxy, auth-email, generate-portrait, iap-verify, partner-sso, review-notes, sepay-webhook`.
File SQL `supabase_*.sql` ở gốc: mỗi file đã/ chưa chạy production ghi trong CLAUDE.md và `SYSTEM_INVENTORY.md`; `supabase_iap.sql` đã chạy (kèm revoke/grant `credit_iap`).
`.claude/launch.json` (gitignored) có cấu hình: `expo-web` (serve `dist/` cổng 8094), `admin-dev` (`npm --prefix ../tuvi-admin run dev`, 5174), `partner-sim` (serve `tools/`, 8095), `privacy-policy` (legal/, 5500).

## 6. Quy ước làm việc với anh Toàn (QUAN TRỌNG)

- **Chỉ commit khi anh yêu cầu; chỉ push khi anh yêu cầu.** Commit message kết thúc bằng dòng `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` (hoặc theo attribution hệ thống đưa ra lúc đó). Chỉ `git add src`/file liên quan — KHÔNG add 3 file rác ở mục 2.
- **Chỉ deploy/build khi anh yêu cầu.** "build web giúp anh" = `npm run build:web`, KHÔNG deploy. Anh tự chạy các lệnh đụng production (supabase deploy/SQL) hoặc nhờ em — một số lệnh production có thể bị chặn bởi chế độ auto, khi đó đưa lệnh cho anh chạy.
- Làm xong phải `tsc --noEmit` sạch; nói thẳng cái gì CHƯA kiểm chứng trên máy thật. Đừng nói "đã test" khi chưa chạy app.
- Khi anh chốt con số UI (ví dụ độ mờ 0.25/0.4) thì giữ nguyên, đừng "cải thiện".
- Khi anh nhờ "tạo QR Expo": Metro chạy sẵn ở `exp://<IP LAN>:8081`; không có thư viện qrcode trong project — cài tạm `qrcode` vào thư mục scratchpad rồi xuất PNG (đừng cài vào dự án), gửi bằng SendUserFile.
- Quy tắc luận giải (không Mệnh chủ/Thân chủ; Tuần/Triệt không lan tam hợp; khung 4 lớp; không phán tuyệt đối) → CLAUDE.md §2, **bắt buộc**. Test `offlineSummary.test.ts` chặn từ cấm (`Mệnh chủ|Thân chủ|chắc chắn|nhất định|100%`) — cả trong lời khuyên viết tay.
- Không động `src/core/*` data, `src/utils/aiAnalysis.ts` prompts, `src/data/starInfo*` trừ khi cần (CLAUDE.md §3). Riêng "Hỏi Tuzi" (chat) mới cần fact ngày hôm nay; đừng thêm vào prompt lá số/Bát Tự/Đại vận.

## 7. Kiến thức/bẫy kỹ thuật đã học (đừng vấp lại)

- Metro `guardedLoadModule` biến lỗi lúc `require` thành lỗi fatal dù có try/catch → kiểm tra native có sẵn TRƯỚC khi `require`, load lười (pattern trong `lib/iap.ts`).
- `expo-file-system` API mới: `File.copy/move` là **async** (phải `await`); `Paths.cache`, `Directory.create()`.
- iOS share sheet nhỏ là hành vi hệ thống, không sửa được.
- `SimpleMarkdown` hỗ trợ `#`, `**đậm**`, danh sách, bảng; KHÔNG hỗ trợ `_nghiêng_`.
- Tuổi mụ: dùng `ageUtil.lunarBirthYear/tuoiMuOfYear/currentAgeOf`, đừng viết `năm − birthInfo.year` (CLAUDE.md §11).
- Opacity của View cha NHÂN vào con — muốn nền mờ hơn chữ thì làm mờ bằng alpha màu (`fadeColor`), không dùng `opacity` cha.
- Web: không dùng `Alert.alert` (dùng `webAlert`), không `navigation.getParent()?.navigate()` (dùng `navigationRef`), rộng nội dung cap 480px (`useContentWidth`).
- `deno check` không resolve được `npm:` specifier → code Edge Function chỉ kiểm chứng được khi deploy thật.
- IAP iOS: `purchaseToken` là JWS StoreKit 2 (không có `transactionReceipt`); mã lỗi huỷ là `user-cancelled`.
- `navigation.replace(route.name, {...params, result})` là cách `ChartSwitchLine replaceScreen` đổi lá số; màn nhận lá số qua `route.params.result` hoặc `useMyResult()`.

### Ghi chú trong bộ nhớ Claude cũ (đã mất sau cài lại — nếu muốn thì lưu lại bằng memory)
- "AI date-grounding scope": chỉ chat "Hỏi Tuzi" cần fact ngày hôm nay một cách tường minh; không đụng prompt lá số/Bát Tự/Đại vận.

## 8. Cấu trúc nhanh (chi tiết ở CLAUDE.md §3)

`src/core/` lõi Tử Vi/Bát Tự/ngày đẹp/pastReview · `src/data/` tri thức · `src/utils/aiAnalysis.ts` + `aiSummary.ts` prompts · `src/screens/` · `src/components/` (có `ChartSwitchLine`, `AnalysisSummary`, `LunarCalendarPicker`) · `src/ui/` (primitives thiết kế mới: Screen, Card, Display, Eyebrow, Segmented, Icon…) · `src/lib/` (supabase, iap, topup, charts, myChart, platform…) · `src/navigation/AppNavigator.tsx` (Stack + `MainTabs` 6 tab: TuViChart, BatTu, DaiVan, TieuVan, NguyetVan, NhatVan) · `supabase/functions/` · `tools/` (partner SSO simulator) · `docs/` (rulebook Nghiệm quá khứ) · `tuvi-admin/` (repo riêng).
Tab chính (thiết kế mới): Trang chủ `OverviewScreen` · Tổng quan lá số `ChartHubScreen` · Vận hạn `VanHubScreen` · Menu `MenuScreen`.

## 9. Câu mở đầu gợi ý cho session mới

"Đọc HANDOVER.md và CLAUDE.md trong D:\Lap trinh\Claude\tuvi-app rồi tóm tắt trạng thái, sau đó chờ anh giao việc." — rồi chạy `git status`, `git log --oneline -5`, `npx tsc --noEmit -p .` để xác nhận môi trường dựng lại đúng.
