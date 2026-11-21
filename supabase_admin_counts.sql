-- ============================================================
-- Tuzi Admin — RPC đếm tổng số bản ghi để hiện "Trang x/y"
-- Chạy trong Supabase SQL Editor. An toàn chạy lại nhiều lần.
-- Không đổi chữ ký admin_list_users / admin_search_charts.
-- Điều kiện lọc PHẢI khớp y hệt hai hàm đó (supabase_admin_v2.sql F, G2).
-- ============================================================

create or replace function public.admin_count_users(p_search text default '')
returns bigint
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return (
    select count(*)
    from public.profiles p
    join auth.users u on u.id = p.id
    where coalesce(p_search,'') = ''
       or u.email ilike '%'||p_search||'%'
       or coalesce(p.display_name,'') ilike '%'||p_search||'%'
  );
end; $$;

create or replace function public.admin_count_charts(
  p_search       text default '',
  p_birth_day    int  default null,
  p_birth_month  int  default null,
  p_birth_year   int  default null
)
returns bigint
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return (
    select count(*)
    from public.charts c
    join auth.users u on u.id = c.user_id
    where (coalesce(p_search,'') = ''
           or coalesce(c.name,'') ilike '%'||p_search||'%'
           or u.email ilike '%'||p_search||'%')
      and (p_birth_day   is null or c.birth_day   = p_birth_day)
      and (p_birth_month is null or c.birth_month = p_birth_month)
      and (p_birth_year  is null or c.birth_year  = p_birth_year)
  );
end; $$;

revoke all on function public.admin_count_users(text) from anon;
revoke all on function public.admin_count_charts(text,int,int,int) from anon;
grant execute on function public.admin_count_users(text) to authenticated;
grant execute on function public.admin_count_charts(text,int,int,int) to authenticated;
