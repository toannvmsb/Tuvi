# Hướng dẫn cấu hình Resend (email) + Netlify (web) cho Tuzi

Kiến trúc đã chọn:
- **Domain**: tuzi.vn (Mắt Bão) — DNS quản lý tại Mắt Bão.
- **Email gửi tự động** (welcome + reset mật khẩu): **Resend**.
- **Hosting web**: **Netlify**.
- **Database/Auth/Functions**: **Supabase** (giữ nguyên).

---

## PHẦN A — CẤU HÌNH RESEND (gửi email đăng ký + reset mật khẩu)

> Làm phần này được NGAY — có lợi cho cả app mobile (email gửi đi từ Edge Function
> Supabase, không phụ thuộc web).

### A1. Tạo tài khoản Resend
1. Vào https://resend.com → Sign up (free 3.000 email/tháng, 100 email/ngày).
2. Vào **Domains** → **Add Domain** → nhập `tuzi.vn`.
3. Resend sẽ hiện ra **danh sách bản ghi DNS** cần thêm (mỗi domain một bộ khác nhau):
   - 1 bản ghi **MX** (cho subdomain gửi, vd `send.tuzi.vn`)
   - 1–2 bản ghi **TXT** (SPF + DKIM — DKIM tên kiểu `resend._domainkey`)
   - (tùy chọn) 1 bản ghi **TXT DMARC**
   → **Giữ nguyên tab này**, sang bước A2 để thêm vào Mắt Bão.

### A2. Thêm bản ghi DNS vào Mắt Bão
1. Đăng nhập **id.matbao.net** (hoặc trang quản trị tên miền Mắt Bão).
2. Vào tên miền `tuzi.vn` → **Quản lý DNS** (hoặc "Bản ghi DNS" / "DNS Records").
3. Thêm **đúng từng bản ghi** mà Resend hiển thị (copy chính xác Name + Type + Value):
   - Lưu ý: nếu Mắt Bão tự thêm hậu tố `.tuzi.vn` thì khi nhập Name chỉ điền phần
     trước (vd `send`, `resend._domainkey`) — không gõ lặp `.tuzi.vn`.
4. Lưu lại. DNS thường cập nhật trong **5–30 phút** (có thể tới vài giờ).
5. Quay lại Resend → bấm **Verify**. Khi tất cả bản ghi xanh ✅ là xong.

### A3. Lấy API Key
1. Resend → **API Keys** → **Create API Key** → quyền **Sending access**.
2. Copy key dạng `re_xxxxxxxx` (chỉ hiện 1 lần — lưu lại an toàn).

### A4. Deploy Edge Function + đặt secrets (Supabase)
Cần cài Supabase CLI (1 lần): `npm install -g supabase`

```bash
# 1) Đăng nhập + liên kết project
supabase login
supabase link --project-ref <PROJECT_REF>      # REF lấy ở URL dashboard

# 2) Deploy hàm gửi email
supabase functions deploy auth-email --no-verify-jwt

# 3) Đặt biến bí mật
supabase secrets set RESEND_API_KEY=re_xxxxxxxx
supabase secrets set AUTH_FROM_EMAIL="Tuzi <no-reply@tuzi.vn>"
supabase secrets set APP_NAME="Tuzi — Tử Vi & Bát Tự"
```

### A5. Chạy SQL helper
Supabase Dashboard → **SQL Editor** → dán toàn bộ nội dung file
`supabase_auth_email.sql` → **Run**.

### A6. Test
- **Test trước khi verify domain xong**: đặt tạm
  `supabase secrets set AUTH_FROM_EMAIL="Tuzi <onboarding@resend.dev>"`
  (địa chỉ test của Resend — chỉ gửi được tới email tài khoản Resend của anh).
- Đăng ký 1 tài khoản mới trong app → kiểm tra hộp thư (cả mục Spam).
- Bấm "Quên mật khẩu?" → nhập email → kiểm tra email nhận mật khẩu mới.

---

## PHẦN B — BUILD & DEPLOY WEB LÊN NETLIFY + GẮN tuzi.vn

> Project đã cài sẵn `react-native-web`, `react-dom`. File `netlify.toml` đã có
> (build command + SPA redirect). Bản web là static SPA.

### B1. Build thử ở máy (local)
```bash
# Chạy dev server web (xem trước ở trình duyệt)
npm run web

# Build production ra thư mục dist/
npm run build:web        # = npx expo export --platform web
```
- Nếu build báo lỗi do module chỉ-chạy-native (vd react-native-iap), cần bọc
  `Platform.OS === 'web'` guard (việc này thuộc giai đoạn hoàn thiện web).
- Build thành công → có thư mục `dist/` chứa file tĩnh.

### B2. Tạo site Netlify
**Cách 1 — Kéo thả (nhanh nhất để test):**
1. Vào https://app.netlify.com → **Add new site** → **Deploy manually**.
2. Kéo thả thư mục `dist/` vào. Vài giây sau có link `https://<random>.netlify.app`.

**Cách 2 — Kết nối Git (tự động deploy khi push — khuyến nghị lâu dài):**
1. Đẩy code lên GitHub (repo riêng).
2. Netlify → **Add new site** → **Import from Git** → chọn repo.
3. Netlify tự đọc `netlify.toml` (build = `npx expo export --platform web`,
   publish = `dist`). Bấm **Deploy**.

### B3. Gắn domain tuzi.vn (giữ DNS ở Mắt Bão — vì email cũng ở đây)
1. Netlify → site → **Domain settings** → **Add a domain** → nhập `tuzi.vn`.
2. Netlify hiện hướng dẫn DNS. **Chọn dùng DNS ngoài (external DNS)** — KHÔNG đổi
   nameserver sang Netlify (để giữ các bản ghi email Resend/MX ở Mắt Bão).
3. Vào **Quản lý DNS** ở Mắt Bão, thêm:
   - **Apex `tuzi.vn`**: bản ghi **A** → IP Netlify (Netlify hiện giá trị; thường
     là `75.2.60.5`). Nếu Mắt Bão hỗ trợ **ALIAS/ANAME** thì dùng ALIAS trỏ tới
     `<site>.netlify.app` (tốt hơn A record).
   - **`www`**: bản ghi **CNAME** → `<site>.netlify.app`
4. Quay lại Netlify → nó tự cấp **SSL (Let's Encrypt)** sau khi DNS trỏ đúng
   (5–30 phút). Khi thấy khóa 🔒 là xong.

### B4. Cập nhật cấu hình sau khi có domain
- Supabase Dashboard → **Authentication → URL Configuration**: thêm
  `https://tuzi.vn` vào **Site URL** và **Redirect URLs** (để auth hoạt động trên web).
- Kiểm tra app web gọi Supabase OK (đăng nhập, lập lá số, nạp xu VietQR).

---

## LƯU Ý QUAN TRỌNG

1. **Một domain, nhiều mục đích DNS** — tại Mắt Bão sẽ cùng tồn tại:
   - Bản ghi **A/CNAME** trỏ web → Netlify
   - Bản ghi **MX/TXT** của Resend (gửi mail) + (nếu mua Email Pro) MX mailbox
   → Các bản ghi này KHÔNG xung đột nhau, cứ thêm đủ.
2. **Resend dùng chung cho cả mobile + web** — email gửi từ Edge Function Supabase,
   không phụ thuộc nơi host web.
3. **Thanh toán**: web chỉ VietQR (đã cấu hình `isWeb` guard trong WalletScreen).
4. **Mobile** (iOS/Android) build riêng qua EAS Build → App Store / Google Play,
   KHÔNG liên quan Netlify.
