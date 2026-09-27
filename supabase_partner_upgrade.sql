-- ════════════════════════════════════════════════════════════════
--  NÂNG CẤP TÀI KHOẢN PARTNER SSO → email thật + mật khẩu tự đặt
--  Chạy trong Supabase SQL Editor (sau supabase_partner_sso.sql + supabase_auth_email.sql).
--
--  Cho phép user vào Tuzi qua đối tác (email giả @users.tuzi.internal, không có mật khẩu)
--  tự gắn 1 email thật + đặt mật khẩu để dùng trực tiếp tại tuzi.vn, giữ nguyên toàn bộ
--  dữ liệu (cùng user_id). Xem 2 action mới "request_partner_upgrade"/"confirm_partner_upgrade"
--  trong supabase/functions/auth-email/index.ts.
-- ════════════════════════════════════════════════════════════════

create table if not exists public.partner_upgrade_otps (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  new_email   text not null,
  code_hash   text not null,          -- SHA-256 hex của mã 6 số — KHÔNG lưu mã gốc
  attempts    int not null default 0, -- tối đa 5 lần nhập sai rồi phải xin mã mới
  expires_at  timestamptz not null,   -- 10 phút kể từ lúc tạo
  created_at  timestamptz not null default now()
);
create index if not exists partner_upgrade_otps_user_idx on public.partner_upgrade_otps(user_id);
alter table public.partner_upgrade_otps enable row level security;
-- KHÔNG tạo policy nào → deny-by-default cho anon/authenticated, đúng pattern
-- partners/partner_user_links/partner_sso_logins — chỉ Edge Function (service_role) đọc/ghi.

notify pgrst, 'reload schema';
