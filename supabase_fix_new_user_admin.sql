-- ════════════════════════════════════════════════════════════════
--  FIX: USER MỚI ĐĂNG KÝ BỊ MẶC ĐỊNH QUYỀN ADMIN
--  Nguyên nhân: cột profiles.is_admin trên DB đang có DEFAULT = true
--  (hoặc trigger dựa vào default của cột). Script này ép về false ở MỌI lớp.
--  Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ → Run.
-- ════════════════════════════════════════════════════════════════

-- 1) Ép DEFAULT của cột về false (sửa luôn trường hợp cột đang default true).
alter table public.profiles alter column is_admin set default false;
alter table public.profiles alter column is_admin set not null;

-- 2) Trigger tạo user mới: GHI RÕ is_admin = false (không phụ thuộc default cột).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name, xu, is_admin)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)), 50, false)
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3) Hạ MỌI user về người dùng thường, TRỪ các email admin chỉ định.
--    → Sửa danh sách email admin của bạn nếu cần.
update public.profiles set is_admin = false;

update public.profiles p set is_admin = true
from auth.users u
where p.id = u.id
  and lower(u.email) in ('admin@gmail.com', 'toannv.msb@gmail.com');

-- 4) Kiểm tra: ai còn là admin?
select u.email,
       case when p.is_admin then '🛡️ ADMIN' else '👤 user' end as vai_tro,
       p.created_at
from   public.profiles p
join   auth.users u on u.id = p.id
order  by p.is_admin desc, p.created_at desc;
