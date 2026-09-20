-- GỘP tài khoản test admin@gmail.com vào vantoan10@gmail.com rồi XÓA admin@gmail.com.
-- Chạy trong Supabase Dashboard -> SQL Editor. Chạy lại nhiều lần vẫn an toàn.
--
--  * Nếu vantoan10@gmail.com ĐÃ có: chuyển toàn bộ dữ liệu (lá số, lịch sử AI, mở khóa, giao dịch, ghi chú, việc, sự kiện…)
--    từ admin@gmail.com sang, cộng dồn xu, cấp quyền admin cho vantoan10, rồi xóa admin@gmail.com.
--  * Nếu vantoan10@gmail.com CHƯA có: đổi thẳng email của admin@gmail.com thành vantoan10@gmail.com (giữ nguyên mọi dữ liệu).
--  * Cuối cùng đặt mật khẩu của vantoan10@gmail.com = 123456 (đổi sang mật khẩu mạnh hơn khi chạy thật).
--
-- Dữ liệu được chuyển: MỌI bảng trong schema public có cột user_id (tự dò), cộng bảng profiles (xu, quyền admin).
-- Nếu một dòng của admin trùng khóa với dòng đã có của vantoan10 (vd cùng mục đã mở khóa) thì bỏ dòng trùng của admin.

do $$
declare
  old_id uuid;
  new_id uuid;
  r record;
  rid tid;
  old_xu numeric;
begin
  select id into old_id from auth.users where lower(email) = 'admin@gmail.com';
  select id into new_id from auth.users where lower(email) = 'vantoan10@gmail.com';

  if old_id is null then
    raise notice 'Không có admin@gmail.com — bỏ qua bước gộp.';
  elsif new_id is null then
    -- Chưa có tài khoản đích → đổi email tại chỗ.
    update auth.users
       set email = 'vantoan10@gmail.com',
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('email', 'vantoan10@gmail.com'),
           updated_at = now()
     where id = old_id;
    update auth.identities
       set identity_data = identity_data || jsonb_build_object('email', 'vantoan10@gmail.com'),
           provider_id = case when provider = 'email' then 'vantoan10@gmail.com' else provider_id end,
           updated_at = now()
     where user_id = old_id and provider = 'email';
    raise notice 'Đã đổi email admin@gmail.com -> vantoan10@gmail.com (giữ nguyên dữ liệu).';
  else
    -- 1) Cộng xu + cấp quyền admin cho tài khoản đích.
    select coalesce(xu, 0) into old_xu from public.profiles where id = old_id;
    update public.profiles
       set xu = coalesce(xu, 0) + coalesce(old_xu, 0),
           is_admin = true
     where id = new_id;

    -- 2) Chuyển mọi bảng có cột user_id.
    for r in
      select c.table_name
      from information_schema.columns c
      join information_schema.tables t
        on t.table_schema = c.table_schema and t.table_name = c.table_name and t.table_type = 'BASE TABLE'
      where c.table_schema = 'public' and c.column_name = 'user_id'
    loop
      begin
        execute format('update public.%I set user_id = $1 where user_id = $2', r.table_name) using new_id, old_id;
      exception when unique_violation then
        -- Có dòng trùng khóa: chuyển từng dòng, dòng nào trùng thì để lại rồi xóa.
        for rid in execute format('select ctid from public.%I where user_id = $1', r.table_name) using old_id loop
          begin
            execute format('update public.%I set user_id = $1 where ctid = $2', r.table_name) using new_id, rid;
          exception when unique_violation then
            null;
          end;
        end loop;
        execute format('delete from public.%I where user_id = $1', r.table_name) using old_id;
      end;
    end loop;

    -- 3) Xóa hồ sơ + tài khoản admin@gmail.com.
    delete from public.profiles where id = old_id;
    delete from auth.users where id = old_id;   -- identities/sessions đi theo (cascade)
    raise notice 'Đã gộp dữ liệu admin@gmail.com vào vantoan10@gmail.com và xóa admin@gmail.com.';
  end if;
end $$;

-- Mật khẩu của tài khoản còn lại.
update auth.users
   set encrypted_password = crypt('123456', gen_salt('bf')), updated_at = now()
 where lower(email) = 'vantoan10@gmail.com';

-- Kiểm tra: phải còn đúng 1 dòng vantoan10, admin@gmail.com biến mất.
select u.email, p.is_admin, p.xu,
       (select count(*) from public.charts c where c.user_id = u.id) as so_la_so
from auth.users u left join public.profiles p on p.id = u.id
where lower(u.email) in ('vantoan10@gmail.com', 'admin@gmail.com');
