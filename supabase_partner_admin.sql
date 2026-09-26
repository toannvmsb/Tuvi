-- ════════════════════════════════════════════════════════════════
--  QUẢN LÝ ĐỐI TÁC (Admin) + MÃ NHÂN VIÊN cho Partner SSO
--  Chạy trong Supabase SQL Editor (sau supabase_partner_sso.sql + supabase_admin.sql).
--
--  Bổ sung: (1) thông tin pháp lý đối tác (ĐKKD/địa chỉ/email/website), (2) RPC admin_*
--  CRUD bảng `partners` để dùng trong tuvi-admin (trang Partners.tsx), (3) bảng
--  `partner_sso_logins` ghi lại MỖI LẦN đăng nhập qua SSO kèm mã nhân viên đối tác —
--  nguồn dữ liệu cho báo cáo cấp nhân viên sau này (chưa xây UI báo cáo ở lượt này).
-- ════════════════════════════════════════════════════════════════

-- 1) Thông tin pháp lý đối tác — cột mới trên bảng partners đã có (supabase_partner_sso.sql).
alter table public.partners
  add column if not exists business_reg_no text,   -- Mã số ĐKKD
  add column if not exists address text,
  add column if not exists contact_email text,
  add column if not exists website text;

-- 2) Mã nhân viên đối tác — lưu giá trị GẦN NHẤT ngay trên link (tiện tra cứu nhanh, không cần
--    join bảng log mỗi lần chỉ muốn biết "lần gần nhất ai giới thiệu").
alter table public.partner_user_links
  add column if not exists employee_code text;

-- 3) Lịch sử MỖI LẦN đăng nhập qua SSO kèm mã nhân viên — chỉ service_role (Edge Function) ghi.
create table if not exists public.partner_sso_logins (
  id               bigserial primary key,
  partner_id       uuid not null references public.partners(id) on delete cascade,
  external_user_id text not null,
  employee_code    text,
  user_id          uuid not null references auth.users(id) on delete cascade,
  created_at       timestamptz not null default now()
);
create index if not exists partner_sso_logins_partner_idx on public.partner_sso_logins(partner_id, employee_code);
alter table public.partner_sso_logins enable row level security;
-- KHÔNG tạo policy nào → deny-by-default cho anon/authenticated, đúng pattern partners/partner_user_links.

-- 4) RPC admin CRUD cho partners — ĐÚNG khuôn admin_create_broadcast/admin_list_broadcasts
--    (supabase_broadcasts.sql): security definer, tự check is_admin(), ghi admin_audit_log.

create or replace function public.admin_list_partners()
returns table (id uuid, code text, name text, secret text, bonus_xu integer, active boolean,
  business_reg_no text, address text, contact_email text, website text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query select p.id, p.code, p.name, p.secret, p.bonus_xu, p.active,
    p.business_reg_no, p.address, p.contact_email, p.website, p.created_at
    from public.partners p order by p.created_at desc;
end; $$;

-- `code` CHỈ đặt được lúc tạo — đối tác đã dùng code trong URL nhúng thật, đổi giữa chừng sẽ hỏng
-- tích hợp của họ, nên admin_update_partner (bên dưới) KHÔNG có tham số đổi code.
create or replace function public.admin_create_partner(
  p_code text, p_name text, p_secret text, p_bonus_xu integer default 0,
  p_business_reg_no text default null, p_address text default null,
  p_contact_email text default null, p_website text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_code is null or length(trim(p_code)) = 0 then raise exception 'missing_code'; end if;
  if p_secret is null or length(p_secret) < 16 then raise exception 'secret_too_short'; end if;
  insert into public.partners(code, name, secret, bonus_xu, business_reg_no, address, contact_email, website)
    values (trim(p_code), p_name, p_secret, coalesce(p_bonus_xu,0), p_business_reg_no, p_address, p_contact_email, p_website)
    returning id into new_id;
  perform public.admin_log('create_partner', null, json_build_object('id', new_id, 'code', p_code)::jsonb);
  return new_id;
end; $$;

create or replace function public.admin_update_partner(
  p_id uuid, p_name text, p_secret text, p_bonus_xu integer,
  p_business_reg_no text, p_address text, p_contact_email text, p_website text
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_secret is null or length(p_secret) < 16 then raise exception 'secret_too_short'; end if;
  update public.partners set name = p_name, secret = p_secret, bonus_xu = coalesce(p_bonus_xu,0),
    business_reg_no = p_business_reg_no, address = p_address, contact_email = p_contact_email, website = p_website
    where id = p_id;
  if not found then raise exception 'partner_not_found'; end if;
  perform public.admin_log('update_partner', null, json_build_object('id', p_id)::jsonb);
end; $$;

create or replace function public.admin_set_partner_active(p_id uuid, p_active boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  update public.partners set active = p_active where id = p_id;
  if not found then raise exception 'partner_not_found'; end if;
  perform public.admin_log('set_partner_active', null, json_build_object('id', p_id, 'active', p_active)::jsonb);
end; $$;

revoke all on function public.admin_list_partners() from public, anon;
revoke all on function public.admin_create_partner(text,text,text,integer,text,text,text,text) from public, anon;
revoke all on function public.admin_update_partner(uuid,text,text,integer,text,text,text,text) from public, anon;
revoke all on function public.admin_set_partner_active(uuid,boolean) from public, anon;
grant execute on function public.admin_list_partners() to authenticated;
grant execute on function public.admin_create_partner(text,text,text,integer,text,text,text,text) to authenticated;
grant execute on function public.admin_update_partner(uuid,text,text,integer,text,text,text,text) to authenticated;
grant execute on function public.admin_set_partner_active(uuid,boolean) to authenticated;

notify pgrst, 'reload schema';
