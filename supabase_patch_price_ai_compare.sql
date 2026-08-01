-- Patch: thêm price_ai_compare và xu_new_user vào app_config (nếu chưa có).
-- Chạy 1 lần trong Supabase Dashboard → SQL Editor.

insert into public.app_config(key, value) values
  ('price_ai_compare', '30'),  -- AI so sánh 02 lá số (12 tầng song song)
  ('xu_new_user',      '50')   -- Xu tặng khi tạo tài khoản mới
on conflict(key) do nothing;
