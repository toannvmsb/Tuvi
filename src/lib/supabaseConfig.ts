/**
 * CẤU HÌNH SUPABASE — ANH ĐIỀN 2 GIÁ TRỊ DƯỚI ĐÂY.
 *
 * Lấy tại: Supabase Dashboard → Project Settings → API
 *  - Project URL  → SUPABASE_URL
 *  - anon public key (KHÔNG dùng service_role) → SUPABASE_ANON_KEY
 *
 * anon key an toàn để nhúng vào app (đã được bảo vệ bởi Row-Level Security).
 */
export const SUPABASE_URL = 'https://blvbsprsjjjwhrrzelfm.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsdmJzcHJzampqd2hycnplbGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNzA0NTUsImV4cCI6MjA5NDk0NjQ1NX0.PNImUWQml4AuaFtNDwApERWXuyyEh3D7zUpjtzfRwLk';

/** true khi đã điền cấu hình thật (để app biết bật chế độ online). */
export const SUPABASE_READY =
  !SUPABASE_URL.includes('YOUR-PROJECT-REF') && !SUPABASE_ANON_KEY.includes('YOUR-ANON');
