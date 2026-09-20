-- Đổi tài khoản admin: admin@gmail.com -> vantoan10@gmail.com, mật khẩu -> 123456.
-- Chạy trong Supabase Dashboard -> SQL Editor. Quyền admin gắn theo id (profiles.is_admin) nên giữ nguyên.
update auth.users
set email = 'vantoan10@gmail.com',
    encrypted_password = crypt('123456', gen_salt('bf')),
    email_confirmed_at = coalesce(email_confirmed_at, now()),
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('email', 'vantoan10@gmail.com'),
    updated_at = now()
where lower(email) = 'admin@gmail.com';

update auth.identities
set identity_data = identity_data || jsonb_build_object('email', 'vantoan10@gmail.com'),
    provider_id = case when provider = 'email' then 'vantoan10@gmail.com' else provider_id end,
    updated_at = now()
where provider = 'email'
  and lower(identity_data->>'email') = 'admin@gmail.com';

select u.email, p.is_admin from auth.users u left join public.profiles p on p.id = u.id
where lower(u.email) = 'vantoan10@gmail.com';
