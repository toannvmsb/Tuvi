-- Người dùng TỰ XÓA tài khoản của mình (bắt buộc theo App Store Guideline 5.1.1(v)).
-- Chạy trong Supabase Dashboard → SQL Editor. An toàn khi chạy lại.
--
-- Xóa toàn bộ dữ liệu gắn với auth.uid() rồi xóa chính tài khoản auth.
-- Bảng nào chưa tồn tại (do chưa chạy patch tương ứng) sẽ được bỏ qua.

create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  t text;
begin
  if uid is null then raise exception 'not_authenticated'; end if;

  -- Bảng có cột user_id.
  foreach t in array array[
    'ai_results', 'unlocks', 'transactions', 'topup_orders', 'iap_transactions',
    'voucher_redemptions', 'charts', 'life_notes', 'life_tasks', 'user_events',
    'mood_logs', 'ai_chat_usage'
  ] loop
    if exists (select 1 from pg_tables where schemaname = 'public' and tablename = t) then
      execute format('delete from public.%I where user_id = $1', t) using uid;
    end if;
  end loop;

  delete from public.profiles where id = uid;
  delete from auth.users where id = uid;
end; $$;

revoke all on function public.delete_my_account() from anon;
grant execute on function public.delete_my_account() to authenticated;
