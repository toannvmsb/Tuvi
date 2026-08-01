-- ════════════════════════════════════════════════════════════════
--  RESET USER CHO ĐỢT TEST
--  - Hạ TẤT CẢ user về NGƯỜI DÙNG THƯỜNG và đặt 1000 xu.
--  - GIỮ admin + GIỮ NGUYÊN xu cho: admin@gmail.com, toannv.msb@gmail.com
--  Cách dùng: Supabase Dashboard → SQL Editor → New query → dán toàn bộ → Run.
-- ════════════════════════════════════════════════════════════════

-- Danh sách email admin (so sánh không phân biệt hoa/thường).
-- Sửa tại đây nếu muốn thêm/bớt admin.
--   ('admin@gmail.com', 'toannv.msb@gmail.com')

-- 1) Hạ tất cả về user thường + đặt 1000 xu, TRỪ các admin.
update public.profiles p
set    is_admin = false,
       xu = 1000
from   auth.users u
where  p.id = u.id
  and  lower(u.email) not in ('admin@gmail.com', 'toannv.msb@gmail.com');

-- 2) Đảm bảo 2 tài khoản admin vẫn là admin (KHÔNG đụng tới xu của họ).
update public.profiles p
set    is_admin = true
from   auth.users u
where  p.id = u.id
  and  lower(u.email) in ('admin@gmail.com', 'toannv.msb@gmail.com');

-- 3) KIỂM TRA kết quả.
select u.email,
       case when p.is_admin then '🛡️ ADMIN' else '👤 user' end as vai_tro,
       p.xu
from   public.profiles p
join   auth.users u on u.id = p.id
order  by p.is_admin desc, u.email;


-- ────────────────────────────────────────────────────────────────
-- (TÙY CHỌN) Cho NGƯỜI DÙNG MỚI đăng ký trong đợt test cũng nhận 1000 xu.
-- Mặc định hiện tại là 50 xu (supabase_schema.sql). Bỏ /* */ để áp dụng,
-- và NHỚ đổi lại 50 trước khi chạy thật.
-- ────────────────────────────────────────────────────────────────
/*
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name, xu)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)), 1000)
  on conflict (id) do nothing;
  return new;
end; $$;
*/
