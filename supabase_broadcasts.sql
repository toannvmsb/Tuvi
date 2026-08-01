-- ════════════════════════════════════════════════════════════════
--  THÔNG BÁO TỪ ADMIN (broadcast) — đẩy vào "Trung tâm thông báo" của app.
--   • kind = 'promo'   : khuyến mại / giảm giá → hiện THÔNG BÁO + mục "Khuyến mại"
--                        trên MỌI nền tảng. (Riêng việc NHẬP MÃ VOUCHER vẫn chỉ
--                        trên web — theo Apple 3.1.1 / Google Payments.)
--   • kind = 'feature' : bổ sung / cập nhật chức năng mới → hiện mọi nền tảng.
--   • kind = 'news'    : tin chung khác → hiện mọi nền tảng.
--
--  Chạy: Supabase SQL Editor → dán toàn bộ → Run. (Sau supabase_admin.sql.)
-- ════════════════════════════════════════════════════════════════

create table if not exists public.app_broadcasts (
  id          bigserial primary key,
  kind        text not null check (kind in ('promo', 'feature', 'news')),
  title       text not null,
  body        text not null,
  active      boolean not null default true,
  starts_at   timestamptz not null default now(),
  expires_at  timestamptz,                       -- null = không hết hạn
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id)
);
create index if not exists app_broadcasts_active_idx on public.app_broadcasts(active, starts_at);

alter table public.app_broadcasts enable row level security;
-- Người dùng KHÔNG đọc trực tiếp bảng — chỉ qua RPC bên dưới.

-- ── Người dùng: lấy các broadcast đang hiệu lực ──
drop function if exists public.list_active_broadcasts();
create or replace function public.list_active_broadcasts()
returns table(id bigint, kind text, title text, body text, promo_detail text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select b.id, b.kind, b.title, b.body, b.promo_detail, b.created_at
  from public.app_broadcasts b
  where b.active
    and b.starts_at <= now()
    and (b.expires_at is null or b.expires_at > now())
  order by b.created_at desc
  limit 50;
$$;

-- ── Admin: tạo broadcast ──
create or replace function public.admin_create_broadcast(
  p_kind text, p_title text, p_body text, p_expires_at timestamptz default null
) returns bigint language plpgsql security definer set search_path = public as $$
declare new_id bigint;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_kind not in ('promo','feature','news') then raise exception 'bad_kind'; end if;
  insert into public.app_broadcasts(kind, title, body, expires_at, created_by)
    values (p_kind, p_title, p_body, p_expires_at, auth.uid())
    returning id into new_id;
  perform public.admin_log('create_broadcast', null,
    json_build_object('id', new_id, 'kind', p_kind, 'title', p_title)::jsonb);
  return new_id;
end; $$;

-- ── Admin: liệt kê (mọi trạng thái) ──
create or replace function public.admin_list_broadcasts(p_limit int default 100)
returns table(id bigint, kind text, title text, body text, active boolean,
              starts_at timestamptz, expires_at timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query select b.id, b.kind, b.title, b.body, b.active, b.starts_at, b.expires_at, b.created_at
    from public.app_broadcasts b order by b.created_at desc limit greatest(1, least(p_limit, 500));
end; $$;

-- ── Admin: xóa vĩnh viễn ──
create or replace function public.admin_delete_broadcast(p_id bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  delete from public.app_broadcasts where id = p_id;
  if not found then raise exception 'broadcast_not_found'; end if;
  perform public.admin_log('delete_broadcast', null,
    json_build_object('id', p_id)::jsonb);
end; $$;

-- ── Admin: bật/tắt ──
create or replace function public.admin_set_broadcast_active(p_id bigint, p_active boolean)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  update public.app_broadcasts set active = p_active where id = p_id;
  if not found then raise exception 'broadcast_not_found'; end if;
  perform public.admin_log('set_broadcast_active', null,
    json_build_object('id', p_id, 'active', p_active)::jsonb);
  return p_active;
end; $$;

-- ── Quyền ──
-- Tin đang hiệu lực là thông tin công khai (khuyến mại/chức năng) → cho cả khách (anon)
-- lẫn người đã đăng nhập đọc, tránh lỗi "permission denied" khi chưa đăng nhập.
grant execute on function public.list_active_broadcasts() to anon, authenticated;
do $$
declare fn text;
begin
  foreach fn in array array[
    'admin_create_broadcast(text,text,text,timestamptz)',
    'admin_list_broadcasts(int)',
    'admin_set_broadcast_active(bigint,boolean)',
    'admin_delete_broadcast(bigint)'
  ] loop
    execute format('revoke all on function public.%s from anon;', fn);
    execute format('grant execute on function public.%s to authenticated;', fn);
  end loop;
end $$;

-- Nạp lại schema cache của PostgREST để RPC mới hiện ra ngay (tránh lỗi 404 "function not found").
notify pgrst, 'reload schema';
