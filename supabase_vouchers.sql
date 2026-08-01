-- ════════════════════════════════════════════════════════════════
--  VOUCHER KHUYẾN MẠI NẠP XU — 2 biến thể:
--   • kind='discount' : GIẢM GIÁ đơn nạp VietQR (chuyển ít tiền hơn, nhận đủ xu)
--   • kind='gift'     : MÃ ĐỔI XU trực tIẾP (nhập mã là cộng xu, không cần chuyển khoản)
--
--  ⚠ CHÍNH SÁCH STORE: chỉ hiển thị ô nhập mã trên WEB. Bản iOS/Android tải từ
--  store KHÔNG hiển thị (đã xử lý phía client) — tránh vi phạm Apple 3.1.1 / Google Payments.
--
--  Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ → Run.
--  (Chạy SAU supabase_schema.sql, supabase_topup.sql, supabase_admin.sql.)
-- ════════════════════════════════════════════════════════════════

-- ── 1) BẢNG VOUCHER ──
create table if not exists public.vouchers (
  id              bigserial primary key,
  code            text not null unique,              -- vd 'TUVI-AB3D-9XKQ'
  kind            text not null check (kind in ('discount', 'gift')),
  -- discount: giảm giá đơn nạp
  discount_type   text check (discount_type in ('percent', 'fixed_vnd')),
  discount_value  integer,                           -- % (1-100) hoặc số tiền VNĐ
  min_amount_vnd  integer default 0,                 -- đơn tối thiểu để áp mã
  -- gift: đổi xu trực tiếp
  gift_xu         integer,                           -- số xu cộng khi nhập mã
  -- giới hạn dùng
  max_uses        integer not null default 1,        -- tổng số lượt dùng của mã
  used_count      integer not null default 0,
  per_user_limit  integer not null default 1,        -- mỗi user dùng tối đa N lần
  expires_at      timestamptz,
  status          text not null default 'active' check (status in ('active', 'disabled')),
  note            text,                              -- ghi chú nội bộ (đợt KM nào…)
  created_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id)
);
create index if not exists vouchers_code_idx on public.vouchers(code);
create index if not exists vouchers_status_idx on public.vouchers(status);

-- ── 2) LỊCH SỬ DÙNG MÃ ──
create table if not exists public.voucher_redemptions (
  id             bigserial primary key,
  voucher_id     bigint not null references public.vouchers(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  order_code     text,                               -- đơn nạp áp mã (kind=discount)
  xu_credited    integer default 0,                  -- xu cộng (kind=gift)
  vnd_discounted integer default 0,                  -- số tiền được giảm (kind=discount)
  created_at     timestamptz not null default now()
);
create index if not exists voucher_red_voucher_idx on public.voucher_redemptions(voucher_id);
create index if not exists voucher_red_user_idx on public.voucher_redemptions(user_id);

-- Cột voucher trên đơn nạp (để đối soát).
alter table public.topup_orders add column if not exists voucher_code text;

-- ── 3) RLS: client KHÔNG đọc/ghi trực tiếp — mọi thao tác qua RPC ──
alter table public.vouchers enable row level security;
alter table public.voucher_redemptions enable row level security;
-- user xem được lịch sử dùng mã CỦA MÌNH
drop policy if exists "own redemptions" on public.voucher_redemptions;
create policy "own redemptions" on public.voucher_redemptions
  for select using (auth.uid() = user_id);

-- ── 4) Hàm nội bộ: VALIDATE mã (khóa dòng) — trả record voucher nếu hợp lệ ──
create or replace function public._voucher_check(p_code text, p_uid uuid)
returns public.vouchers language plpgsql security definer set search_path = public as $$
declare v public.vouchers; my_uses int;
begin
  select * into v from public.vouchers where upper(code) = upper(trim(p_code)) for update;
  if not found then raise exception 'voucher_not_found'; end if;
  if v.status <> 'active' then raise exception 'voucher_disabled'; end if;
  if v.expires_at is not null and v.expires_at < now() then raise exception 'voucher_expired'; end if;
  if v.used_count >= v.max_uses then raise exception 'voucher_exhausted'; end if;
  select count(*) into my_uses from public.voucher_redemptions
    where voucher_id = v.id and user_id = p_uid;
  if my_uses >= v.per_user_limit then raise exception 'voucher_user_limit'; end if;
  return v;
end; $$;

-- ── 5) RPC: ĐỔI MÃ GIFT (cộng xu trực tiếp) — atomic, ghi giao dịch ──
create or replace function public.redeem_gift_voucher(p_code text)
returns json language plpgsql security definer set search_path = public as $$
declare v public.vouchers; uid uuid := auth.uid(); newbal int;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  v := public._voucher_check(p_code, uid);
  if v.kind <> 'gift' then raise exception 'voucher_wrong_kind'; end if;

  update public.vouchers set used_count = used_count + 1 where id = v.id;
  insert into public.voucher_redemptions(voucher_id, user_id, xu_credited)
    values (v.id, uid, v.gift_xu);
  update public.profiles set xu = xu + v.gift_xu where id = uid returning xu into newbal;
  insert into public.transactions(user_id, amount, reason, ref_key)
    values (uid, v.gift_xu, 'voucher_gift', v.code);

  return json_build_object('ok', true, 'xu_credited', v.gift_xu, 'new_balance', newbal);
end; $$;

-- ── 6) RPC: XEM TRƯỚC mã GIẢM GIÁ cho 1 gói (KHÔNG tiêu mã) ──
create or replace function public.preview_voucher(p_code text, p_amount_vnd int)
returns json language plpgsql security definer set search_path = public as $$
declare v public.vouchers; uid uuid := auth.uid(); off int;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  v := public._voucher_check(p_code, uid);
  if v.kind = 'gift' then
    return json_build_object('ok', true, 'kind', 'gift', 'gift_xu', v.gift_xu);
  end if;
  if p_amount_vnd < coalesce(v.min_amount_vnd, 0) then raise exception 'voucher_min_amount'; end if;
  off := case v.discount_type
           when 'percent'  then (p_amount_vnd * v.discount_value / 100)
           when 'fixed_vnd' then v.discount_value
         end;
  off := least(off, p_amount_vnd - 1000);            -- luôn còn ≥ 1.000đ để khớp CK
  return json_build_object('ok', true, 'kind', 'discount',
    'discount_vnd', off, 'final_vnd', p_amount_vnd - off,
    'discount_type', v.discount_type, 'discount_value', v.discount_value);
end; $$;

-- ── 7) RPC: TẠO ĐƠN NẠP KÈM MÃ GIẢM GIÁ (server tự tính tiền, tiêu mã ngay) ──
--  Lưu ý vận hành: mã được tiêu khi TẠO ĐƠN. Nếu đơn hết hạn không thanh toán,
--  admin có thể cấp lại mã khác (xem được qua voucher_redemptions.order_code).
create or replace function public.create_topup_with_voucher(
  p_order_code text, p_amount_vnd int, p_xu int, p_voucher_code text
) returns json language plpgsql security definer set search_path = public as $$
declare v public.vouchers; uid uuid := auth.uid(); off int; final_vnd int;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  v := public._voucher_check(p_voucher_code, uid);
  if v.kind <> 'discount' then raise exception 'voucher_wrong_kind'; end if;
  if p_amount_vnd < coalesce(v.min_amount_vnd, 0) then raise exception 'voucher_min_amount'; end if;

  off := case v.discount_type
           when 'percent'  then (p_amount_vnd * v.discount_value / 100)
           when 'fixed_vnd' then v.discount_value
         end;
  off := least(off, p_amount_vnd - 1000);
  final_vnd := p_amount_vnd - off;

  update public.vouchers set used_count = used_count + 1 where id = v.id;
  insert into public.voucher_redemptions(voucher_id, user_id, order_code, vnd_discounted)
    values (v.id, uid, p_order_code, off);
  insert into public.topup_orders(user_id, code, amount_vnd, xu, status, voucher_code)
    values (uid, p_order_code, final_vnd, p_xu, 'pending', v.code);

  return json_build_object('ok', true, 'final_vnd', final_vnd, 'discount_vnd', off);
end; $$;

revoke all on function public.redeem_gift_voucher(text) from anon;
revoke all on function public.preview_voucher(text, int) from anon;
revoke all on function public.create_topup_with_voucher(text, int, int, text) from anon;
grant execute on function public.redeem_gift_voucher(text) to authenticated;
grant execute on function public.preview_voucher(text, int) to authenticated;
grant execute on function public.create_topup_with_voucher(text, int, int, text) to authenticated;

-- ════════════════════════════════════════════════════════════════
--  8) ADMIN — sinh mã hàng loạt, liệt kê, bật/tắt (yêu cầu is_admin())
-- ════════════════════════════════════════════════════════════════

-- Sinh N mã ngẫu nhiên dạng TUVI-XXXX-XXXX (bỏ ký tự dễ nhầm 0/O/1/I).
create or replace function public.admin_generate_vouchers(
  p_kind text, p_count int,
  p_discount_type text default null, p_discount_value int default null,
  p_gift_xu int default null,
  p_min_amount_vnd int default 0, p_max_uses int default 1,
  p_per_user_limit int default 1, p_expires_at timestamptz default null,
  p_note text default null
) returns setof text language plpgsql security definer set search_path = public as $$
declare chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; c text; i int; j int;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_kind not in ('discount','gift') then raise exception 'bad_kind'; end if;
  if p_kind = 'discount' and (p_discount_type is null or p_discount_value is null) then
    raise exception 'discount_params_required';
  end if;
  if p_kind = 'gift' and (p_gift_xu is null or p_gift_xu <= 0) then
    raise exception 'gift_xu_required';
  end if;
  if p_count < 1 or p_count > 1000 then raise exception 'bad_count'; end if;

  for i in 1..p_count loop
    loop
      c := 'TUVI-';
      for j in 1..4 loop c := c || substr(chars, 1 + floor(random()*length(chars))::int, 1); end loop;
      c := c || '-';
      for j in 1..4 loop c := c || substr(chars, 1 + floor(random()*length(chars))::int, 1); end loop;
      exit when not exists (select 1 from public.vouchers where code = c);
    end loop;
    insert into public.vouchers(code, kind, discount_type, discount_value, gift_xu,
      min_amount_vnd, max_uses, per_user_limit, expires_at, note, created_by)
    values (c, p_kind, p_discount_type, p_discount_value, p_gift_xu,
      p_min_amount_vnd, p_max_uses, p_per_user_limit, p_expires_at, p_note, auth.uid());
    return next c;
  end loop;
  perform public.admin_log('generate_vouchers', null,
    json_build_object('kind', p_kind, 'count', p_count, 'note', p_note)::jsonb);
end; $$;

-- Danh sách voucher + thống kê dùng.
create or replace function public.admin_list_vouchers(p_search text default '', p_limit int default 100)
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
  order by v.created_at desc
  limit greatest(1, least(p_limit, 500));
end; $$;

-- Bật / tắt mã.
create or replace function public.admin_set_voucher_status(p_id bigint, p_status text)
returns text language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_status not in ('active','disabled') then raise exception 'bad_status'; end if;
  update public.vouchers set status = p_status where id = p_id;
  if not found then raise exception 'voucher_not_found'; end if;
  perform public.admin_log('set_voucher_status', null,
    json_build_object('voucher_id', p_id, 'status', p_status)::jsonb);
  return p_status;
end; $$;

-- Lịch sử dùng của 1 mã.
create or replace function public.admin_voucher_redemptions(p_voucher_id bigint)
returns table(email text, order_code text, xu_credited int, vnd_discounted int, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query select u.email::text, r.order_code, r.xu_credited, r.vnd_discounted, r.created_at
  from public.voucher_redemptions r join auth.users u on u.id = r.user_id
  where r.voucher_id = p_voucher_id order by r.created_at desc;
end; $$;

do $$
declare fn text;
begin
  foreach fn in array array[
    'admin_generate_vouchers(text,int,text,int,int,int,int,int,timestamptz,text)',
    'admin_list_vouchers(text,int)',
    'admin_set_voucher_status(bigint,text)',
    'admin_voucher_redemptions(bigint)'
  ] loop
    execute format('revoke all on function public.%s from anon;', fn);
    execute format('grant execute on function public.%s to authenticated;', fn);
  end loop;
end $$;
