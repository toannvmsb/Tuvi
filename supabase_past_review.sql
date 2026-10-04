-- ════════════════════════════════════════════════════════════════
--  NGHIỆM QUÁ KHỨ (src/core/pastReview) — dữ liệu phía server.
--   1) past_review_feedback: phản hồi Đúng / Gần đúng / Sai / Không nhớ THEO NĂM của từng lá số.
--      Lưu kèm danh sách mã quy tắc đã tạo ra mốc (rule_ids) + phiên bản bảng quy tắc để:
--        • biết mốc nào cần tính lại khi đổi trọng số,
--        • (giai đoạn sau) cộng dồn "sổ quy tắc" cho người học bằng truy vấn tổng hợp.
--      KHÔNG chứa nội dung ghi chú (ghi chú có bảng riêng, mã hóa, ở giai đoạn sau).
--   2) analytics_events: sự kiện đo lường tối thiểu (đặc tả "Chỉ số đo lường"), chỉ ghi, chỉ admin đọc.
--
--  Dữ liệu CÁ NHÂN của từng user → RLS chính chủ đọc/ghi trực tiếp qua client (giống life_notes).
--  Xóa dữ liệu: cả hai bảng `on delete cascade` theo auth.users; phản hồi còn cascade theo charts (xóa lá số
--  → xóa phản hồi của lá số đó). Nên KHÔNG cần sửa delete_my_account() — xóa tài khoản tự dọn sạch.
--
--  Chạy: Supabase SQL Editor → dán toàn bộ → Run (an toàn khi chạy lại).
-- ════════════════════════════════════════════════════════════════

create table if not exists public.past_review_feedback (
  id               bigserial primary key,
  user_id          uuid not null references auth.users(id) on delete cascade,
  chart_id         uuid not null references public.charts(id) on delete cascade,
  year             int  not null check (year between 1850 and 2200),   -- NĂM ÂM LỊCH
  value            text not null check (value in ('dung', 'gan_dung', 'sai', 'khong_nho')),
  life_area        text not null check (life_area in ('career', 'home', 'love', 'wealth', 'family')),
  source           text not null default 'marker' check (source in ('marker', 'timeline')),
  rule_ids         text[] not null default '{}',
  rulebook_version text not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, chart_id, year)
);
create index if not exists past_review_feedback_chart_idx on public.past_review_feedback(user_id, chart_id);

alter table public.past_review_feedback enable row level security;

drop policy if exists "user manage own past_review_feedback" on public.past_review_feedback;
create policy "user manage own past_review_feedback" on public.past_review_feedback
  for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    -- chỉ ghi phản hồi cho lá số CỦA CHÍNH MÌNH
    and exists (select 1 from public.charts c where c.id = chart_id and c.user_id = auth.uid())
  );

create or replace function public.past_review_feedback_touch()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;
drop trigger if exists trg_past_review_feedback_touch on public.past_review_feedback;
create trigger trg_past_review_feedback_touch before update on public.past_review_feedback
  for each row execute function public.past_review_feedback_touch();

-- ─────────────────────────────────────────────────────────────────
create table if not exists public.analytics_events (
  id          bigserial primary key,
  user_id     uuid references auth.users(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 64),
  props       jsonb not null default '{}'::jsonb check (pg_column_size(props) < 4096),
  created_at  timestamptz not null default now()
);
create index if not exists analytics_events_name_idx on public.analytics_events(name, created_at desc);

alter table public.analytics_events enable row level security;

-- Người dùng chỉ GHI được sự kiện của chính mình; không ai (ngoài admin) đọc được.
drop policy if exists "user insert own analytics_events" on public.analytics_events;
create policy "user insert own analytics_events" on public.analytics_events
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "admin read analytics_events" on public.analytics_events;
create policy "admin read analytics_events" on public.analytics_events
  for select to authenticated
  using (public.is_admin());

notify pgrst, 'reload schema';
