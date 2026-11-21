-- ============================================================
-- Tuzi Admin — phân trang cho Nhật ký (audit) và Voucher
-- Chạy trong Supabase SQL Editor. An toàn chạy lại nhiều lần.
--
-- Thêm tham số p_offset (default 0) cho admin_audit_list / admin_list_vouchers
-- và 2 RPC đếm. Lời gọi cũ chỉ truyền p_limit vẫn chạy bình thường.
-- ⚠ KHÔNG chạy lại phần admin_audit_list của supabase_admin.sql và
--   admin_list_vouchers của supabase_vouchers.sql sau file này — nó tạo lại
--   bản cũ (không có p_offset) thành overload thứ hai và gây lỗi mơ hồ.
-- ============================================================

drop function if exists public.admin_audit_list(int);
create or replace function public.admin_audit_list(p_limit int default 100, p_offset int default 0)
returns table(id bigint, admin_email text, action text, target_user uuid, detail jsonb, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query
    select a.id, u.email::text, a.action, a.target_user, a.detail, a.created_at
    from public.admin_audit_log a
    left join auth.users u on u.id = a.admin_id
    order by a.created_at desc, a.id desc
    limit greatest(1, least(p_limit, 500)) offset greatest(0, p_offset);
end; $$;

create or replace function public.admin_count_audit()
returns bigint
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return (select count(*) from public.admin_audit_log);
end; $$;


drop function if exists public.admin_list_vouchers(text, int);
create or replace function public.admin_list_vouchers(p_search text default '', p_limit int default 100, p_offset int default 0)
returns table(id bigint, code text, kind text, discount_type text, discount_value int,
              gift_xu int, min_amount_vnd int, max_uses int, used_count int,
              per_user_limit int, expires_at timestamptz, status text, note text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query select v.id, v.code, v.kind, v.discount_type, v.discount_value,
    v.gift_xu, v.min_amount_vnd, v.max_uses, v.used_count, v.per_user_limit,
    v.expires_at, v.status, v.note, v.created_at
  from public.vouchers v
  where coalesce(p_search,'') = '' or v.code ilike '%'||p_search||'%' or coalesce(v.note,'') ilike '%'||p_search||'%'
  order by v.created_at desc, v.id desc
  limit greatest(1, least(p_limit, 500)) offset greatest(0, p_offset);
end; $$;

create or replace function public.admin_count_vouchers(p_search text default '')
returns bigint
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return (
    select count(*) from public.vouchers v
    where coalesce(p_search,'') = '' or v.code ilike '%'||p_search||'%' or coalesce(v.note,'') ilike '%'||p_search||'%'
  );
end; $$;


revoke all on function public.admin_audit_list(int,int) from anon;
revoke all on function public.admin_count_audit() from anon;
revoke all on function public.admin_list_vouchers(text,int,int) from anon;
revoke all on function public.admin_count_vouchers(text) from anon;
grant execute on function public.admin_audit_list(int,int) to authenticated;
grant execute on function public.admin_count_audit() to authenticated;
grant execute on function public.admin_list_vouchers(text,int,int) to authenticated;
grant execute on function public.admin_count_vouchers(text) to authenticated;
