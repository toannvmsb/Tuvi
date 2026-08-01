-- ════════════════════════════════════════════════════════════════
--  AI CHAT — bảng đếm quota MIỄN PHÍ/ngày cho tính năng Chat AI nổi.
--   • CHỈ đếm số lượt hỏi trong ngày, KHÔNG lưu nội dung câu hỏi/trả lời
--     (đúng quyết định "không lưu lịch sử chat" — chỉ Edge Function
--     ai-chat (service_role) đọc/ghi bảng này, không client nào truy cập
--     trực tiếp nên KHÔNG cần policy cho anon/authenticated).
--
--  Chạy: Supabase SQL Editor → dán toàn bộ → Run.
-- ════════════════════════════════════════════════════════════════

create table if not exists public.ai_chat_usage (
  user_id     uuid not null references auth.users(id) on delete cascade,
  usage_date  date not null,
  msg_count   int not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (user_id, usage_date)
);

alter table public.ai_chat_usage enable row level security;
-- Không tạo policy nào → mặc định KHÔNG ai (anon/authenticated) đọc/ghi được
-- qua PostgREST; chỉ Edge Function dùng SUPABASE_SERVICE_ROLE_KEY mới thao tác được.
