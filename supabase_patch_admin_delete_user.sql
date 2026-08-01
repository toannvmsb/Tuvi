-- Patch: thêm function admin_delete_user để xóa hoàn toàn một user.
-- Chạy trong Supabase Dashboard → SQL Editor.

create or replace function public.admin_delete_user(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;

  -- Không cho phép admin tự xóa chính mình
  if p_user = auth.uid() then raise exception 'cannot_delete_self'; end if;

  -- Log trước khi xóa (để audit trail còn thông tin user)
  perform public.admin_log('delete_user', p_user, json_build_object('email',
    (select email from auth.users where id = p_user))::jsonb);

  -- Xóa kết quả AI
  delete from public.ai_results where user_id = p_user;

  -- Xóa unlock records
  delete from public.unlocks where user_id = p_user;

  -- Xóa lịch sử giao dịch xu
  delete from public.transactions where user_id = p_user;

  -- Xóa đơn nạp VietQR
  delete from public.topup_orders where user_id = p_user;

  -- Xóa giao dịch IAP (App Store / Google Play) — bảng có thể chưa tồn tại
  if exists (select from pg_tables where schemaname = 'public' and tablename = 'iap_transactions') then
    delete from public.iap_transactions where user_id = p_user;
  end if;

  -- Xóa voucher redemptions — bảng có thể chưa tồn tại
  if exists (select from pg_tables where schemaname = 'public' and tablename = 'voucher_redemptions') then
    delete from public.voucher_redemptions where user_id = p_user;
  end if;

  -- Xóa lá số
  delete from public.charts where user_id = p_user;

  -- Xóa profile
  delete from public.profiles where id = p_user;

  -- Xóa tài khoản auth (phải làm sau cùng)
  delete from auth.users where id = p_user;
end; $$;

-- Chỉ authenticated (admin) được gọi — is_admin() check bên trong function
revoke all on function public.admin_delete_user(uuid) from anon;
grant execute on function public.admin_delete_user(uuid) to authenticated;
