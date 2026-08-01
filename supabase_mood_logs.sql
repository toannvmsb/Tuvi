-- ════════════════════════════════════════════════════════════════
--  MOOD LOGS — Nhật ký cảm xúc/năng lượng hằng ngày (1 chạm/ngày).
--   • Dữ liệu CÁ NHÂN của user (giống life_tasks) → RLS cho chính chủ tự
--     đọc/ghi trực tiếp qua client.
--   • Mỗi ngày CHỈ 1 bản ghi (unique user_id+log_date) — ghi đè nếu log lại.
--   • Đây là DỮ LIỆU THẬT của người dùng, dùng để đối chiếu với engine Nhật
--     Vận đã có (không phát sinh dữ liệu giả) → cá nhân hóa nhận xét theo
--     thời gian, đúng tinh thần "Life Intelligence".
--
--  Chạy: Supabase SQL Editor → dán toàn bộ → Run.
-- ════════════════════════════════════════════════════════════════

create table if not exists public.mood_logs (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  log_date    date not null,
  mood        smallint not null check (mood between 1 and 5),   -- 1=rất tệ .. 5=rất tốt
  energy      smallint not null check (energy between 1 and 5), -- 1=cạn kiệt .. 5=tràn đầy
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, log_date)
);
create index if not exists mood_logs_user_idx on public.mood_logs(user_id, log_date desc);

alter table public.mood_logs enable row level security;

drop policy if exists "user manage own mood_logs" on public.mood_logs;
create policy "user manage own mood_logs" on public.mood_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
