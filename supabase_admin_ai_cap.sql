-- ════════════════════════════════════════════════════════════════
--  ADMIN: cho anh Toàn chủ động chỉnh TRẦN LƯỢT GỌI AI MỖI NGƯỜI/NGÀY (ai-proxy) trong trang Cài đặt của tuvi-admin.
--  Khóa cấu hình mới: ai_proxy_daily_cap (mặc định 500; hợp lệ 20..5000). Edge Function ai-proxy đọc giá trị này (đệm 60 giây).
--  admin_set_config giữ NGUYÊN danh sách khóa hiện có, chỉ thêm khóa mới + kiểm tra giá trị của khóa này.
--  Khóa này KHÔNG nằm trong get_app_config (chỉ price_% và xu_topup_rate) nên app không đọc được.
-- ════════════════════════════════════════════════════════════════

insert into public.app_config(key, value, updated_at) values ('ai_proxy_daily_cap', '500', now())
  on conflict (key) do nothing;

create or replace function public.admin_set_config(p_key text, p_value text)
returns text language plpgsql security definer set search_path to 'public' as $$
declare n int;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_key not in (
    'price_ai', 'price_ai_medium', 'price_ai_large', 'price_ai_compare',
    'price_advanced', 'price_advanced_major', 'price_past_life', 'price_future_life',
    'price_bundle_basic', 'price_bundle_full',
    'xu_topup_rate', 'xu_new_user',
    'ai_proxy_daily_cap'
  ) then
    raise exception 'invalid_config_key';
  end if;
  if p_key = 'ai_proxy_daily_cap' then
    if p_value is null or p_value !~ '^[0-9]{1,5}$' then raise exception 'invalid_value'; end if;
    n := p_value::int;
    if n < 20 or n > 5000 then raise exception 'invalid_value'; end if;
  end if;
  insert into public.app_config(key, value, updated_at, updated_by)
    values (p_key, p_value, now(), auth.uid())
  on conflict(key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by;
  perform public.admin_log('set_config', null, json_build_object('key', p_key, 'value', p_value)::jsonb);
  return p_value;
end;
$$;

-- HOÀN TÁC: bỏ nhánh ai_proxy_daily_cap khỏi hàm trên (hoặc tạo lại bản cũ trong supabase_admin*.sql); delete from public.app_config where key = 'ai_proxy_daily_cap';
