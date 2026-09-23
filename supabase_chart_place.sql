-- Lưu Nơi ở/Nơi sinh của mỗi lá số LÊN SERVER (trước đây chỉ lưu cục bộ trên từng máy bằng AsyncStorage,
-- nên sửa nơi sinh trên máy A thì máy B không thấy thay đổi). Chạy trong Supabase Dashboard → SQL Editor.
-- An toàn khi chạy lại (IF NOT EXISTS).
alter table public.charts
  add column if not exists place_name text,
  add column if not exists place_lat  double precision,
  add column if not exists place_lon  double precision;
