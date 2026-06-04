-- ════════════════════════════════════════════════════════════════
--  AUTH EMAIL — hỗ trợ Edge Function "auth-email"
--  (gửi email đăng ký + quên mật khẩu / sinh mật khẩu mới).
--  Dán toàn bộ vào Supabase SQL Editor → Run.
-- ════════════════════════════════════════════════════════════════

-- Tìm UUID của user theo email (dùng bởi Edge Function với service role).
-- SECURITY DEFINER để truy cập schema auth; chỉ trả về id, không lộ dữ liệu nhạy cảm.
create or replace function public.find_user_id_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = auth, public
as $$
  select id from auth.users where lower(email) = lower(trim(p_email)) limit 1;
$$;

-- Chỉ cho phép service_role gọi (Edge Function dùng service role). Thu hồi quyền của
-- anon/authenticated để client thường không tự tra cứu được user theo email.
revoke all on function public.find_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.find_user_id_by_email(text) to service_role;
