-- ════════════════════════════════════════════════════════════════
--  PHASE 2: lưu KẾT QUẢ AI + cấu hình API KEY trên Supabase
--  Chạy ở Supabase → SQL Editor → New query → dán toàn bộ → Run.
-- ════════════════════════════════════════════════════════════════

-- 1) KẾT QUẢ AI ĐÃ TRẢ PHÍ (đọc lại miễn phí, không gọi lại AI)
create table if not exists public.ai_results (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  result_key  text not null,                 -- = fkey (theo lá số + mục)
  content     text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, result_key)
);
alter table public.ai_results enable row level security;
create policy "own ai_results" on public.ai_results
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2) CẤU HÌNH API KEY DÙNG CHUNG (của CHỦ APP)
--    1 dòng duy nhất id='ai', chứa 2 key. Ưu tiên dùng OpenAI trước, lỗi mới Claude.
create table if not exists public.app_secrets (
  id          text primary key,
  openai_key  text,
  claude_key  text,
  updated_at  timestamptz not null default now()
);
alter table public.app_secrets enable row level security;

-- BẢO MẬT: Bảng app_secrets KHÔNG được đọc bởi client. API keys được đọc
-- server-side qua Edge Function (ai-proxy) — không bao giờ trả key về app.
-- Không tạo SELECT policy cho authenticated users.

-- 3) CẬP NHẬT API KEY: Chạy SQL sau trong Supabase Dashboard → SQL Editor.
--    KHÔNG lưu key thật vào file này. Chạy xong không cần lưu lại.
--
-- insert into public.app_secrets (id, openai_key, claude_key)
-- values ('ai', '<OPENAI_KEY>', '<ANTHROPIC_KEY>')
-- on conflict (id) do update
--   set openai_key = excluded.openai_key,
--       claude_key = excluded.claude_key,
--       updated_at = now();
