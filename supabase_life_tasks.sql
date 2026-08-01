-- ════════════════════════════════════════════════════════════════
--  LIFE TASKS — Quản lý công việc (task) + Mục tiêu dài hạn (goal).
--   • Bảng dữ liệu CÁ NHÂN của từng user (không phải secret dùng chung) →
--     RLS cho phép chính chủ đọc/ghi trực tiếp qua client (khác app_secrets).
--   • kind='task' : việc ngắn hạn, target_date là 1 ngày cụ thể.
--   • kind='goal' : mục tiêu dài hạn, target_date là mùng 1 tháng âm gợi ý.
--   • suggested_date lưu lại gợi ý gốc từ engine tại thời điểm tạo, để đối
--     chiếu về sau nếu người dùng đổi target_date thủ công.
--
--  Chạy: Supabase SQL Editor → dán toàn bộ → Run.
-- ════════════════════════════════════════════════════════════════

create table if not exists public.life_tasks (
  id              bigserial primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  kind            text not null check (kind in ('task', 'goal')),
  title           text not null,
  note            text,
  status          text not null default 'open' check (status in ('open', 'done', 'cancelled')),
  target_date     date,
  suggested_date  date,
  suggested_score int,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  completed_at    timestamptz
);
create index if not exists life_tasks_user_idx on public.life_tasks(user_id, kind, status);

alter table public.life_tasks enable row level security;

drop policy if exists "user manage own life_tasks" on public.life_tasks;
create policy "user manage own life_tasks" on public.life_tasks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
