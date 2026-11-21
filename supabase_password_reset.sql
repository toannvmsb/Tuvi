-- ════════════════════════════════════════════════════════════════
--  QUÊN MẬT KHẨU an toàn: gửi LIÊN KẾT một lần qua email; chỉ khi chủ email bấm liên kết và tự đặt mật khẩu mới thì mật khẩu mới đổi.
--  Vá lỗ hổng cũ: action 'reset' của auth-email đổi NGAY mật khẩu của bất kỳ ai khi biết email (khóa tài khoản người khác,
--  không giới hạn số lần, phản hồi còn cho biết email có tồn tại hay không).
--  Token ngẫu nhiên 256 bit, chỉ lưu BẢN BĂM SHA-256, hết hạn 30 phút, dùng một lần. Bảng chỉ service_role (Edge Function auth-email) truy cập.
--  Thứ tự triển khai: (1) chạy file này → (2) deploy web mới (có trang /reset) → (3) deploy Edge Function auth-email mới.
-- ════════════════════════════════════════════════════════════════

create table if not exists public.password_resets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists password_resets_user_idx on public.password_resets(user_id, created_at desc);
alter table public.password_resets enable row level security;
revoke all on table public.password_resets from anon, authenticated;

-- HOÀN TÁC: drop table public.password_resets;
