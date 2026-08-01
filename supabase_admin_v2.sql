-- ════════════════════════════════════════════════════════════════
--  ADMIN V2 — IAP doanh thu, khóa/mở user, cấu hình giá xu, lọc ngày.
--  Chạy SAU supabase_admin.sql (có thể chạy lại nhiều lần — idempotent).
-- ════════════════════════════════════════════════════════════════


-- ── A) CỘT MỚI: banned trên profiles ──
alter table public.profiles add column if not exists banned boolean not null default false;


-- ── B) BẢNG CẤU HÌNH ỨNG DỤNG ──
create table if not exists public.app_config (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.app_config enable row level security;
-- Chỉ đọc/ghi qua RPC admin — không cần client policy.

-- Giá trị mặc định (nếu chưa có). Khớp với PREMIUM.COST trong premium.ts.
insert into public.app_config(key, value) values
  -- Nâng cao (offline, tính toán cục bộ)
  ('price_advanced',       '10'),   -- Nâng cao mục nhỏ: cung / bát tự / nguyệt vận / xem ngày
  ('price_advanced_major', '20'),   -- Nâng cao lớn: toàn lá số / đại vận / tiểu vận
  -- Phân tích AI
  ('price_ai',             '30'),   -- AI nhỏ: chi tiết cung / nguyệt vận / xem ngày
  ('price_ai_medium',      '50'),   -- AI vừa: bát tự / tài lộc / tiểu vận từng năm
  ('price_ai_large',       '100'),  -- AI lớn: toàn lá số / đại vận
  ('price_ai_compare',     '30'),   -- AI so sánh: 02 lá số — 12 tầng song song
  -- Người dùng mới
  ('xu_new_user',          '50'),   -- Số xu tặng khi tạo tài khoản mới
  -- Gói combo trọn đời
  ('price_bundle_basic',   '490'),  -- Trọn đời Cơ bản (toàn lá + bát tự + tài lộc + 5 đại vận)
  ('price_bundle_full',    '990'),  -- Trọn đời Đầy đủ (như trên + cả 10 đại vận)
  -- Quy đổi tiền
  ('xu_topup_rate',        '100')   -- 1 xu = 100 đ VND
on conflict(key) do nothing;


-- ── C) admin_overview — thêm IAP (graceful fallback nếu bảng chưa tồn tại) ──
create or replace function public.admin_overview()
returns json language plpgsql stable security definer set search_path = public as $$
declare
  result            json;
  v_iap_xu_total    numeric := 0;
  v_iap_xu_30d      numeric := 0;
  v_iap_count_total bigint  := 0;
  v_iap_count_30d   bigint  := 0;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;

  -- Thử đọc iap_transactions; nếu bảng chưa tồn tại thì giữ nguyên giá trị 0.
  begin
    select
      coalesce(sum(xu), 0),
      coalesce(sum(xu) filter (where created_at > now() - interval '30 days'), 0),
      count(*),
      count(*) filter (where created_at > now() - interval '30 days')
    into v_iap_xu_total, v_iap_xu_30d, v_iap_count_total, v_iap_count_30d
    from public.iap_transactions;
  exception when undefined_table then
    null; -- bảng chưa có → trả 0, không crash
  end;

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
    'admins',           (select count(*) from public.profiles where is_admin),
    'iap_xu_total',     v_iap_xu_total,
    'iap_xu_30d',       v_iap_xu_30d,
    'iap_count_total',  v_iap_count_total,
    'iap_count_30d',    v_iap_count_30d
  ) into result;
  return result;
end; $$;


-- ── D) admin_timeseries — thêm metric iap_xu + lọc khoảng ngày ──
--  Thêm p_from / p_to (ngày tùy chọn). Khi null → dùng p_days ngược về hiện tại.
drop function if exists public.admin_timeseries(text, int);

create or replace function public.admin_timeseries(
  p_metric text,
  p_days   int  default 30,
  p_from   date default null,
  p_to     date default null
)
returns table(bucket date, value numeric) language plpgsql stable security definer set search_path = public as $$
declare
  v_from timestamptz;
  v_to   timestamptz;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;

  v_to   := coalesce(p_to::timestamptz + interval '1 day', now());
  v_from := coalesce(p_from::timestamptz, v_to - (p_days||' days')::interval);

  if p_metric = 'users' then
    return query select created_at::date, count(*)::numeric from public.profiles
      where created_at >= v_from and created_at < v_to group by 1 order by 1;
  elsif p_metric = 'charts' then
    return query select created_at::date, count(*)::numeric from public.charts
      where created_at >= v_from and created_at < v_to group by 1 order by 1;
  elsif p_metric = 'topup_vnd' then
    return query select paid_at::date, sum(amount_vnd)::numeric from public.topup_orders
      where status='paid' and paid_at >= v_from and paid_at < v_to group by 1 order by 1;
  elsif p_metric = 'ai' then
    return query select created_at::date, count(*)::numeric from public.transactions
      where reason='ai' and created_at >= v_from and created_at < v_to group by 1 order by 1;
  elsif p_metric = 'advanced' then
    return query select created_at::date, count(*)::numeric from public.transactions
      where reason='advanced' and created_at >= v_from and created_at < v_to group by 1 order by 1;
  elsif p_metric = 'iap_xu' then
    begin
      return query select created_at::date, sum(xu)::numeric from public.iap_transactions
        where created_at >= v_from and created_at < v_to group by 1 order by 1;
    exception when undefined_table then
      return; -- trả rỗng nếu bảng chưa tồn tại
    end;
  else
    raise exception 'bad_metric';
  end if;
end; $$;


-- ── E) admin_ban_user — khóa / mở user ──
create or replace function public.admin_ban_user(p_user uuid, p_banned boolean)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  update public.profiles set banned = p_banned where id = p_user;
  if not found then raise exception 'user_not_found'; end if;
  perform public.admin_log(
    case when p_banned then 'ban_user' else 'unban_user' end,
    p_user,
    json_build_object('banned', p_banned)::jsonb
  );
  return p_banned;
end; $$;


-- ── F) admin_list_users — trả thêm cột banned ──
drop function if exists public.admin_list_users(text, int, int);
create or replace function public.admin_list_users(
  p_search text default '', p_limit int default 50, p_offset int default 0
)
returns table(id uuid, email text, display_name text, xu int, is_admin boolean, banned boolean,
              created_at timestamptz, charts_count bigint, last_tx timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query
    select p.id, u.email::text, p.display_name, p.xu, p.is_admin, p.banned, p.created_at,
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


-- ── G) admin_get_config / admin_set_config ──
create or replace function public.admin_get_config()
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return (select json_object_agg(key, value) from public.app_config);
end; $$;

create or replace function public.admin_set_config(p_key text, p_value text)
returns text language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  insert into public.app_config(key, value, updated_at, updated_by)
    values (p_key, p_value, now(), auth.uid())
  on conflict(key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by;
  perform public.admin_log('set_config', null, json_build_object('key', p_key, 'value', p_value)::jsonb);
  return p_value;
end; $$;


-- ── G1) admin_user_detail — thêm lịch sử nạp tiền (QR + IAP) ──
create or replace function public.admin_user_detail(p_user uuid)
returns json language plpgsql stable security definer set search_path = public as $$
declare result json;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  select json_build_object(
    'profile', (
      select json_build_object('id',p.id,'email',u.email,'display_name',p.display_name,
               'xu',p.xu,'is_admin',p.is_admin,'created_at',p.created_at)
      from public.profiles p join auth.users u on u.id=p.id where p.id=p_user
    ),
    'charts_count', (select count(*) from public.charts where user_id=p_user),
    'unlocks', (
      select json_object_agg(kind, c)
      from (select kind, count(*) c from public.unlocks where user_id=p_user group by kind) s
    ),
    'transactions', (
      select coalesce(json_agg(t order by t.created_at desc), '[]'::json)
      from (select amount, reason, ref_key, created_at
            from public.transactions where user_id=p_user
            order by created_at desc limit 50) t
    ),
    -- Lịch sử nạp qua VietQR / chuyển khoản
    'topups', (
      select coalesce(json_agg(o order by o.created_at desc), '[]'::json)
      from (
        select amount_vnd, xu, status, bank_tx_id, note, created_at, paid_at
        from public.topup_orders
        where user_id = p_user
        order by created_at desc limit 50
      ) o
    ),
    -- Lịch sử nạp qua IAP (App Store / Google Play)
    'iap', (
      select coalesce(json_agg(i order by i.created_at desc), '[]'::json)
      from (
        select platform, product_id, transaction_id, xu, created_at
        from public.iap_transactions
        where user_id = p_user
        order by created_at desc limit 50
      ) i
    )
  ) into result;
  return result;
exception when undefined_table then
  -- iap_transactions chưa tồn tại → trả không có iap
  select json_build_object(
    'profile', (
      select json_build_object('id',p.id,'email',u.email,'display_name',p.display_name,
               'xu',p.xu,'is_admin',p.is_admin,'created_at',p.created_at)
      from public.profiles p join auth.users u on u.id=p.id where p.id=p_user
    ),
    'charts_count', (select count(*) from public.charts where user_id=p_user),
    'unlocks', (
      select json_object_agg(kind, c)
      from (select kind, count(*) c from public.unlocks where user_id=p_user group by kind) s
    ),
    'transactions', (
      select coalesce(json_agg(t order by t.created_at desc), '[]'::json)
      from (select amount, reason, ref_key, created_at
            from public.transactions where user_id=p_user
            order by created_at desc limit 50) t
    ),
    'topups', (
      select coalesce(json_agg(o order by o.created_at desc), '[]'::json)
      from (
        select amount_vnd, xu, status, bank_tx_id, note, created_at, paid_at
        from public.topup_orders where user_id = p_user
        order by created_at desc limit 50
      ) o
    ),
    'iap', '[]'::json
  ) into result;
  return result;
end; $$;


-- ── G2) admin_search_charts — thêm lọc ngày/tháng/năm sinh ──
drop function if exists public.admin_search_charts(text, int, int);

create or replace function public.admin_search_charts(
  p_search       text    default '',
  p_limit        int     default 50,
  p_offset       int     default 0,
  p_birth_day    int     default null,
  p_birth_month  int     default null,
  p_birth_year   int     default null
)
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
    where (coalesce(p_search,'') = ''
           or coalesce(c.name,'') ilike '%'||p_search||'%'
           or u.email ilike '%'||p_search||'%')
      and (p_birth_day   is null or c.birth_day   = p_birth_day)
      and (p_birth_month is null or c.birth_month = p_birth_month)
      and (p_birth_year  is null or c.birth_year  = p_birth_year)
    order by c.created_at desc
    limit greatest(1, least(p_limit, 200)) offset greatest(0, p_offset);
end; $$;


-- ── G3) get_app_config — public (anon + authenticated), chỉ trả key giá ──
--  Dùng cho app để fetch giá lúc khởi động, không cần đăng nhập.
create or replace function public.get_app_config()
returns json language sql stable security definer set search_path = public as $$
  select coalesce(
    json_object_agg(key, value::numeric),
    '{}'::json
  )
  from public.app_config
  where key like 'price_%' or key = 'xu_topup_rate';
$$;
-- Không revoke anon vì đây là public API.
grant execute on function public.get_app_config() to anon, authenticated;


-- ── H) Cập nhật khóa quyền (revoke anon, grant authenticated) ──
do $$
declare fn text;
begin
  foreach fn in array array[
    'admin_overview()',
    'admin_timeseries(text,int,date,date)',
    'admin_adjust_xu(uuid,int,text)', 'admin_set_xu(uuid,int,text)',
    'admin_list_users(text,int,int)', 'admin_user_detail(uuid)',
    'admin_set_admin(uuid,boolean)', 'admin_update_display_name(uuid,text)',
    'admin_ban_user(uuid,boolean)',
    'admin_search_charts(text,int,int,int,int,int)', 'admin_delete_chart(uuid)',
    'admin_audit_list(int)',
    'admin_get_config()', 'admin_set_config(text,text)'
  ] loop
    execute format('revoke all on function public.%s from anon;', fn);
    execute format('grant execute on function public.%s to authenticated;', fn);
  end loop;
end $$;
