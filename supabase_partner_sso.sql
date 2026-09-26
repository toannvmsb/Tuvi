-- ════════════════════════════════════════════════════════════════
--  PARTNER SSO — nhúng Tuzi vào app đối tác (vd bank), tự động đăng nhập
--  Chạy trong Supabase SQL Editor (sau supabase_schema.sql).
--
--  Luồng: đối tác ký 1 JWT ngắn hạn (HS256, secret ở cột `partners.secret`)
--  chứa external_user_id, gửi kèm URL nhúng. Edge Function `partner-sso` verify
--  token, map sang 1 user Supabase nội bộ qua bảng `partner_user_links` (tạo
--  mới nếu lần đầu), cấp bonus xu MỘT LẦN DUY NHẤT (cộng dồn với 50 xu mặc
--  định của handle_new_user(), KHÔNG thay thế), rồi phát hành session.
--
--  Thêm 1 đối tác mới: insert 1 dòng vào `partners` (code, name, secret,
--  bonus_xu) — không cần sửa code. Xem CLAUDE.md mục "Partner SSO" để biết
--  quy trình đầy đủ (gồm cả bước nới CSP frame-ancestors ở netlify.toml).
-- ════════════════════════════════════════════════════════════════

-- 1) Danh sách đối tác đã cấp phép — CHỈ service_role đọc được (deny-by-default
--    cho anon/authenticated vì bật RLS nhưng KHÔNG tạo policy nào).
create table if not exists public.partners (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,   -- slug dùng trong URL, vd 'bank_x'
  name        text not null,          -- tên nội bộ để quản lý, KHÔNG hiển thị cho user
  secret      text not null,          -- HMAC secret (HS256) dùng verify JWT đối tác gửi lên
  bonus_xu    integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table public.partners enable row level security;

-- 2) Map "user bên đối tác" ↔ "user Supabase nội bộ của Tuzi", 1 dòng/user/đối tác.
create table if not exists public.partner_user_links (
  id                 uuid primary key default gen_random_uuid(),
  partner_id         uuid not null references public.partners(id) on delete cascade,
  external_user_id   text not null,
  user_id            uuid not null references auth.users(id) on delete cascade,
  bonus_credited     boolean not null default false,
  created_at         timestamptz not null default now(),
  unique (partner_id, external_user_id)
);
create index if not exists partner_user_links_user_idx on public.partner_user_links(user_id);
alter table public.partner_user_links enable row level security;

-- 3) RPC cộng bonus xu của đối tác (idempotent — chỉ cộng lần đầu, giống hệt
--    pattern credit_iap: p_user truyền tay vì service role không có auth.uid()).
create or replace function public.credit_partner_bonus(
  p_link_id uuid, p_user uuid, p_xu int, p_partner_code text
) returns integer language plpgsql security definer as $$
declare newbal int;
begin
  -- Đánh dấu đã cấp NGAY trong điều kiện UPDATE — nếu link đã bonus_credited=true
  -- (lần thứ 2 trở đi) thì UPDATE không khớp dòng nào (not found), không cộng nữa.
  update public.partner_user_links
    set bonus_credited = true
    where id = p_link_id and bonus_credited = false;
  if not found then
    return (select xu from public.profiles where id = p_user);
  end if;

  update public.profiles set xu = xu + p_xu where id = p_user returning xu into newbal;
  if newbal is null then raise exception 'no profile for %', p_user; end if;

  insert into public.transactions(user_id, amount, reason, ref_key)
    values (p_user, p_xu, 'partner_bonus', p_partner_code);

  return newbal;
end; $$;

revoke all on function public.credit_partner_bonus(uuid, uuid, int, text) from public, anon, authenticated;
grant execute on function public.credit_partner_bonus(uuid, uuid, int, text) to service_role;
