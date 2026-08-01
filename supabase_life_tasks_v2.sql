-- ════════════════════════════════════════════════════════════════
--  LIFE TASKS v2 — thêm Ngày bắt đầu/Ngày kết thúc + thứ tự ưu tiên thủ công.
--   • start_date/end_date thay cho target_date (chọn qua lịch màu, không còn
--     gợi ý dạng chip).
--   • priority: số nguyên, NHỎ HƠN = quan trọng hơn. NULL = chưa xếp thủ công
--     → tự sắp theo start_date rồi end_date (áp dụng ở tầng ORDER BY).
--   • target_date/suggested_date/suggested_score GIỮ NGUYÊN (không xoá, tránh
--     mất dữ liệu cũ) nhưng KHÔNG còn được app ghi/đọc nữa.
--
--  Chạy: Supabase SQL Editor → dán toàn bộ → Run. (Sau supabase_life_tasks.sql.)
-- ════════════════════════════════════════════════════════════════

alter table public.life_tasks
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists priority integer;

-- Di chuyển dữ liệu cũ: mục đã có target_date → dùng làm start_date.
update public.life_tasks set start_date = target_date where start_date is null and target_date is not null;

create index if not exists life_tasks_order_idx on public.life_tasks(user_id, kind, status, priority, start_date, end_date);
