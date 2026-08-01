-- ════════════════════════════════════════════════════════════════
--  LIFE NOTES — Ghi chú nhanh (box "Ghi chú nhanh" ở Home).
--   • Ghi chú TỰ DO, không gắn với việc/mục tiêu nào — dùng để note lại điều
--     chợt nhớ ra hoặc một sự kiện đã diễn ra, theo ngày.
--   • note_date mặc định = ngày tạo, nhưng người dùng có thể chọn ngày khác
--     để ghi lại sự kiện đã xảy ra trước đó.
--   • Bảng dữ liệu CÁ NHÂN của từng user → RLS cho phép chính chủ đọc/ghi
--     trực tiếp qua client (giống life_tasks), không cần Edge Function.
--
--  Chạy: Supabase SQL Editor → dán toàn bộ → Run.
-- ════════════════════════════════════════════════════════════════

create table if not exists public.life_notes (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  content     text not null,
  note_date   date not null default current_date,
  created_at  timestamptz not null default now()
);
create index if not exists life_notes_user_idx on public.life_notes(user_id, note_date desc, created_at desc);

alter table public.life_notes enable row level security;

drop policy if exists "user manage own life_notes" on public.life_notes;
create policy "user manage own life_notes" on public.life_notes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
