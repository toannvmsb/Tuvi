-- Kho ảnh chân dung "người tương hợp" (Edge Function generate-portrait ghi bằng service role).
-- Chạy trong Supabase Dashboard → SQL Editor. An toàn khi chạy lại.
insert into storage.buckets (id, name, public)
values ('portraits', 'portraits', true)
on conflict (id) do nothing;

-- Đọc công khai theo URL (tên file có dấu thời gian, khó đoán); ghi chỉ qua Edge Function (service role).
drop policy if exists "portraits public read" on storage.objects;
create policy "portraits public read" on storage.objects
  for select using (bucket_id = 'portraits');
