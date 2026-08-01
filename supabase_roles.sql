-- ════════════════════════════════════════════════════════════════
--  QUẢN TRỊ VAI TRÒ NGƯỜI DÙNG (admin vs người dùng thường)
--  Dùng: Supabase Dashboard → SQL Editor → New query → dán phần cần chạy → Run.
--
--  Bối cảnh: profiles.is_admin mặc định = false (xem supabase_schema.sql).
--  → Người dùng đăng ký mới LUÔN là user thường. Chỉ TÀI KHOẢN CHỈ ĐỊNH mới là admin.
-- ════════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────────
-- 0) ĐẢM BẢO CỘT is_admin TỒN TẠI & MẶC ĐỊNH false
--    (chạy 1 lần; an toàn nếu đã có sẵn)
-- ────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- Bảo hiểm: trigger tạo user mới KHÔNG cấp admin (giữ nguyên handle_new_user mặc định).


-- ────────────────────────────────────────────────────────────────
-- 1) HÀM TIỆN ÍCH: cấp / thu hồi quyền admin theo EMAIL
--    SECURITY DEFINER để join sang schema auth. Chỉ service_role gọi được.
-- ────────────────────────────────────────────────────────────────
create or replace function public.set_admin_by_email(p_email text, p_is_admin boolean)
returns text language plpgsql security definer as $$
declare uid uuid;
begin
  select id into uid from auth.users where lower(email) = lower(p_email);
  if uid is null then
    return 'KHÔNG tìm thấy user: ' || p_email;
  end if;
  update public.profiles set is_admin = p_is_admin where id = uid;
  return (case when p_is_admin then 'ĐÃ cấp admin cho ' else 'ĐÃ thu hồi admin của ' end) || p_email;
end; $$;

revoke all on function public.set_admin_by_email(text, boolean) from public, anon, authenticated;
grant execute on function public.set_admin_by_email(text, boolean) to service_role;


-- ────────────────────────────────────────────────────────────────
-- 2) THIẾT LẬP LẠI VAI TRÒ CHO ĐỢT TEST
--    a) Hạ TẤT CẢ về người dùng thường
--    b) Nâng riêng (các) email quản trị của bạn lên admin
--    → Đổi 'toannv.msb@gmail.com' thành email admin thật của bạn.
-- ────────────────────────────────────────────────────────────────
update public.profiles set is_admin = false;                 -- (a) tất cả = user thường

update public.profiles p set is_admin = true                  -- (b) nâng admin theo email
from auth.users u
where p.id = u.id
  and lower(u.email) in (
    'toannv.msb@gmail.com'          -- ← email ADMIN của bạn (thêm dòng nữa nếu nhiều admin)
    -- , 'admin2@example.com'
  );


-- ────────────────────────────────────────────────────────────────
-- 3) KIỂM TRA NHANH: ai đang là admin / ai là user thường
-- ────────────────────────────────────────────────────────────────
select u.email,
       p.display_name,
       p.xu,
       case when p.is_admin then '🛡️ ADMIN' else '👤 user' end as vai_tro,
       p.created_at
from public.profiles p
join auth.users u on u.id = p.id
order by p.is_admin desc, p.created_at;


-- ════════════════════════════════════════════════════════════════
--  4) XÓA SẠCH USER TEST (chạy SAU 1 tuần, khi bắt đầu chạy app thật)
--     ⚠️ KHÔNG THỂ HOÀN TÁC. Xóa toàn bộ user + lá số + giao dịch.
--     Bỏ ghi chú (xóa "/*" và "*/") rồi Run khi thực sự muốn xóa.
-- ════════════════════════════════════════════════════════════════
/*
-- 4a) XÓA TẤT CẢ user (kể cả admin). profiles/charts/unlocks/transactions tự xóa theo
--     ràng buộc ON DELETE CASCADE khi xóa auth.users.
delete from auth.users;

-- 4b) HOẶC: chỉ xóa user THƯỜNG, GIỮ LẠI admin (an toàn hơn):
-- delete from auth.users u
-- using public.profiles p
-- where p.id = u.id and p.is_admin = false;
*/
