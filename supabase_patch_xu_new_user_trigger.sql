-- Patch: cập nhật handle_new_user trigger để đọc xu_new_user từ app_config.
-- Chạy trong Supabase Dashboard → SQL Editor.

-- Bước 1: đảm bảo row xu_new_user tồn tại trong app_config
insert into public.app_config(key, value) values
  ('xu_new_user', '50')
on conflict(key) do nothing;

-- Bước 2: cập nhật trigger function (đọc từ app_config thay vì hardcode 50)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  v_xu int;
begin
  select coalesce(nullif(trim(value), ''), '50')::int
    into v_xu
    from public.app_config
   where key = 'xu_new_user'
   limit 1;
  if v_xu is null then v_xu := 50; end if;
  insert into public.profiles (id, display_name, xu, is_admin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)),
    v_xu,
    false
  )
  on conflict (id) do nothing;
  return new;
end; $$;
