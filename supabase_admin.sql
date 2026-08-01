-- ════════════════════════════════════════════════════════════════
--  QUẢN TRỊ TỔNG THỂ (ADMIN) — báo cáo, quản lý xu, user, lá số, audit log.
--  Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ → Run.
--  (Chạy SAU supabase_schema.sql, supabase_topup.sql, supabase_roles.sql.)
--
--  NGUYÊN TẮC BẢO MẬT: mọi hàm admin là SECURITY DEFINER (vượt RLS để tổng hợp
--  toàn hệ thống) nhưng CHẶN NGAY nếu người gọi không phải admin (is_admin()).
--  Mọi thao tác ghi đều lưu vào admin_audit_log.
-- ════════════════════════════════════════════════════════════════

-- ── 0) Hàm kiểm tra quyền admin của người gọi hiện tại ──
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ── 1) BẢNG NHẬT KÝ THAO TÁC ADMIN ──
create table if not exists public.admin_audit_log (
  id          bigserial primary key,
  admin_id    uuid references auth.users(id),
  action      text not null,            -- 'adjust_xu' | 'set_admin' | 'reset_password' | 'delete_chart' | ...
  target_user uuid,
  detail      jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists admin_audit_created_idx on public.admin_audit_log(created_at desc);
alter table public.admin_audit_log enable row level security;
-- Không tạo policy cho client → chỉ đọc/ghi qua các RPC admin bên dưới.

-- Hàm ghi log nội bộ (gọi từ các RPC admin khác).
create or replace function public.admin_log(p_action text, p_target uuid, p_detail jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.admin_audit_log(admin_id, action, target_user, detail)
  values (auth.uid(), p_action, p_target, p_detail);
$$;


-- ════════════════════════════════════════════════════════════════
--  2) BÁO CÁO HOẠT ĐỘNG
-- ════════════════════════════════════════════════════════════════

-- Tổng quan các chỉ số chính.
create or replace function public.admin_overview()
returns json language plpgsql stable security definer set search_path = public as $$
declare result json;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  select json_build_object(
    'users_total',      (select count(*) from public.profiles),
    'users_7d',         (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'users_30d',        (select count(*) from public.profiles where created_at > now() - interval '30 days'),
    'charts_total',     (select count(*) from public.charts),
    'charts_30d',       (select count(*) from public.charts where created_at > now() - interval '30 days'),
    'topup_vnd_total',  (select coalesce(sum(amount_vnd),0) from public.topup_orders where status='paid'),
    'topup_vnd_30d',    (select coalesce(sum(amount_vnd),0) from public.topup_orders where status='paid' and paid_at > now() - interval '30 days'),
    'topup_count',      (select count(*) from public.topup_orders where status='paid'),
    'ai_count',         (select count(*) from public.transactions where reason='ai'),
    'ai_30d',           (select count(*) from public.transactions where reason='ai' and created_at > now() - interval '30 days'),
    'advanced_count',   (select count(*) from public.transactions where reason='advanced'),
    'advanced_30d',     (select count(*) from public.transactions where reason='advanced' and created_at > now() - interval '30 days'),
    'xu_outstanding',   (select coalesce(sum(xu),0) from public.profiles),
    'admins',           (select count(*) from public.profiles where is_admin)
  ) into result;
  return result;
end; $$;

-- Chuỗi thời gian theo ngày cho 1 chỉ số (vẽ biểu đồ).
--   p_metric: 'users' | 'charts' | 'topup_vnd' | 'ai' | 'advanced'
create or replace function public.admin_timeseries(p_metric text, p_days int default 30)
returns table(bucket date, value numeric) language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_metric = 'users' then
    return query select created_at::date, count(*)::numeric from public.profiles
      where created_at > now() - (p_days||' days')::interval group by 1 order by 1;
  elsif p_metric = 'charts' then
    return query select created_at::date, count(*)::numeric from public.charts
      where created_at > now() - (p_days||' days')::interval group by 1 order by 1;
  elsif p_metric = 'topup_vnd' then
    return query select paid_at::date, sum(amount_vnd)::numeric from public.topup_orders
      where status='paid' and paid_at > now() - (p_days||' days')::interval group by 1 order by 1;
  elsif p_metric = 'ai' then
    return query select created_at::date, count(*)::numeric from public.transactions
      where reason='ai' and created_at > now() - (p_days||' days')::interval group by 1 order by 1;
  elsif p_metric = 'advanced' then
    return query select created_at::date, count(*)::numeric from public.transactions
      where reason='advanced' and created_at > now() - (p_days||' days')::interval group by 1 order by 1;
  else
    raise exception 'bad_metric';
  end if;
end; $$;


-- ════════════════════════════════════════════════════════════════
--  3) QUẢN LÝ XU
-- ════════════════════════════════════════════════════════════════

-- Cộng/trừ xu (p_delta âm là trừ). Ghi transactions + audit.
create or replace function public.admin_adjust_xu(p_user uuid, p_delta int, p_reason text default 'admin_adjust')
returns int language plpgsql security definer set search_path = public as $$
declare newbal int;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  update public.profiles set xu = greatest(0, xu + p_delta) where id = p_user returning xu into newbal;
  if newbal is null then raise exception 'user_not_found'; end if;
  insert into public.transactions(user_id, amount, reason, ref_key) values (p_user, p_delta, 'admin_adjust', p_reason);
  perform public.admin_log('adjust_xu', p_user, json_build_object('delta', p_delta, 'reason', p_reason, 'new_balance', newbal)::jsonb);
  return newbal;
end; $$;

-- Đặt số dư xu tuyệt đối.
create or replace function public.admin_set_xu(p_user uuid, p_value int, p_reason text default 'admin_set')
returns int language plpgsql security definer set search_path = public as $$
declare oldbal int; newbal int;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  select xu into oldbal from public.profiles where id = p_user;
  if oldbal is null then raise exception 'user_not_found'; end if;
  update public.profiles set xu = greatest(0, p_value) where id = p_user returning xu into newbal;
  insert into public.transactions(user_id, amount, reason, ref_key) values (p_user, newbal - oldbal, 'admin_set', p_reason);
  perform public.admin_log('set_xu', p_user, json_build_object('old', oldbal, 'new', newbal, 'reason', p_reason)::jsonb);
  return newbal;
end; $$;


-- ════════════════════════════════════════════════════════════════
--  4) QUẢN LÝ NGƯỜI DÙNG
-- ════════════════════════════════════════════════════════════════

-- Danh sách / tìm kiếm user (kèm email, số lá số, giao dịch gần nhất).
create or replace function public.admin_list_users(p_search text default '', p_limit int default 50, p_offset int default 0)
returns table(id uuid, email text, display_name text, xu int, is_admin boolean,
              created_at timestamptz, charts_count bigint, last_tx timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query
    select p.id, u.email::text, p.display_name, p.xu, p.is_admin, p.created_at,
           (select count(*) from public.charts c where c.user_id = p.id),
           (select max(t.created_at) from public.transactions t where t.user_id = p.id)
    from public.profiles p
    join auth.users u on u.id = p.id
    where coalesce(p_search,'') = ''
       or u.email ilike '%'||p_search||'%'
       or coalesce(p.display_name,'') ilike '%'||p_search||'%'
    order by p.created_at desc
    limit greatest(1, least(p_limit, 200)) offset greatest(0, p_offset);
end; $$;

-- Chi tiết 1 user + giao dịch gần đây.
create or replace function public.admin_user_detail(p_user uuid)
returns json language plpgsql stable security definer set search_path = public as $$
declare result json;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  select json_build_object(
    'profile', (select json_build_object('id',p.id,'email',u.email,'display_name',p.display_name,
                  'xu',p.xu,'is_admin',p.is_admin,'created_at',p.created_at)
                from public.profiles p join auth.users u on u.id=p.id where p.id=p_user),
    'charts_count', (select count(*) from public.charts where user_id=p_user),
    'unlocks', (select json_object_agg(kind, c) from (select kind, count(*) c from public.unlocks where user_id=p_user group by kind) s),
    'transactions', (select coalesce(json_agg(t order by t.created_at desc), '[]'::json)
                     from (select amount, reason, ref_key, created_at from public.transactions
                           where user_id=p_user order by created_at desc limit 50) t)
  ) into result;
  return result;
end; $$;

-- Cấp / thu hồi quyền admin.
create or replace function public.admin_set_admin(p_user uuid, p_is_admin boolean)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  update public.profiles set is_admin = p_is_admin where id = p_user;
  if not found then raise exception 'user_not_found'; end if;
  perform public.admin_log('set_admin', p_user, json_build_object('is_admin', p_is_admin)::jsonb);
  return p_is_admin;
end; $$;

-- Cập nhật tên hiển thị.
create or replace function public.admin_update_display_name(p_user uuid, p_name text)
returns text language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  update public.profiles set display_name = p_name where id = p_user;
  if not found then raise exception 'user_not_found'; end if;
  perform public.admin_log('update_name', p_user, json_build_object('name', p_name)::jsonb);
  return p_name;
end; $$;


-- ════════════════════════════════════════════════════════════════
--  5) QUẢN LÝ LÁ SỐ (tìm kiếm lá số đã xem/lưu trên hệ thống)
-- ════════════════════════════════════════════════════════════════

create or replace function public.admin_search_charts(p_search text default '', p_limit int default 50, p_offset int default 0)
returns table(id uuid, user_id uuid, email text, name text, gender text,
              birth_day int, birth_month int, birth_year int, birth_hour int,
              viewing_year int, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query
    select c.id, c.user_id, u.email::text, c.name, c.gender,
           c.birth_day, c.birth_month, c.birth_year, c.birth_hour, c.viewing_year, c.created_at
    from public.charts c
    join auth.users u on u.id = c.user_id
    where coalesce(p_search,'') = ''
       or coalesce(c.name,'') ilike '%'||p_search||'%'
       or u.email ilike '%'||p_search||'%'
    order by c.created_at desc
    limit greatest(1, least(p_limit, 200)) offset greatest(0, p_offset);
end; $$;

create or replace function public.admin_delete_chart(p_chart uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare owner uuid;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  select user_id into owner from public.charts where id = p_chart;
  if owner is null then raise exception 'chart_not_found'; end if;
  delete from public.charts where id = p_chart;
  perform public.admin_log('delete_chart', owner, json_build_object('chart_id', p_chart)::jsonb);
  return true;
end; $$;


-- ════════════════════════════════════════════════════════════════
--  6) NHẬT KÝ AUDIT (đọc)
-- ════════════════════════════════════════════════════════════════

create or replace function public.admin_audit_list(p_limit int default 100)
returns table(id bigint, admin_email text, action text, target_user uuid, detail jsonb, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query
    select a.id, u.email::text, a.action, a.target_user, a.detail, a.created_at
    from public.admin_audit_log a
    left join auth.users u on u.id = a.admin_id
    order by a.created_at desc
    limit greatest(1, least(p_limit, 500));
end; $$;


-- ── 7) Khóa quyền gọi: thu hồi của anon, chỉ cho authenticated (đã có is_admin() chặn) ──
do $$
declare fn text;
begin
  foreach fn in array array[
    'admin_overview()', 'admin_timeseries(text,int)',
    'admin_adjust_xu(uuid,int,text)', 'admin_set_xu(uuid,int,text)',
    'admin_list_users(text,int,int)', 'admin_user_detail(uuid)',
    'admin_set_admin(uuid,boolean)', 'admin_update_display_name(uuid,text)',
    'admin_search_charts(text,int,int)', 'admin_delete_chart(uuid)',
    'admin_audit_list(int)'
  ] loop
    execute format('revoke all on function public.%s from anon;', fn);
    execute format('grant execute on function public.%s to authenticated;', fn);
  end loop;
end $$;
