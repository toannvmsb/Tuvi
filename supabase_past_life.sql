-- ════════════════════════════════════════════════════════════════
--  DÒNG ĐỜI ĐÃ QUA (src/core/pastReview/timeline.ts, giai đoạn 3) — dữ liệu phía server.
--   1) past_review_notes: ghi chú ≤500 ký tự của người dùng cho từng năm (nhãn mảng đời tùy chọn).
--      Nội dung được MÃ HÓA phía server (AES-GCM, khóa riêng từng người) bởi Edge Function `review-notes`;
--      bảng KHÔNG có policy nào → client không đọc/ghi trực tiếp được (deny-by-default), chỉ function
--      (service_role) thao tác. Ghi chú KHÔNG đi vào AI/prompt và KHÔNG vào thẻ chia sẻ.
--      Xóa lá số hoặc tài khoản → cascade xóa ghi chú (không cần sửa delete_my_account()).
--   2) price_past_life: giá mở "Dòng đời đã qua" (xu) — TẠM 50, chỉnh được ở admin → Cấu hình giá.
--
--  Chạy: Supabase SQL Editor → dán toàn bộ → Run (an toàn khi chạy lại). Chỉ THÊM, không sửa bảng cũ
--  (admin_set_config chỉ thêm đúng một key vào whitelist).
-- ════════════════════════════════════════════════════════════════

create table if not exists public.past_review_notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  chart_id    uuid not null references public.charts(id) on delete cascade,
  year        int  not null check (year between 1850 and 2200),   -- NĂM ÂM LỊCH
  life_area   text check (life_area in ('career', 'home', 'love', 'wealth', 'family')),
  note_enc    text not null check (char_length(note_enc) between 1 and 4096),   -- base64(iv || ciphertext)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists past_review_notes_chart_idx on public.past_review_notes(user_id, chart_id, year);

alter table public.past_review_notes enable row level security;
-- (cố ý KHÔNG tạo policy nào — chỉ service_role qua Edge Function review-notes)

-- ── Giá mở Dòng đời đã qua (admin chỉnh được) ───────────────────
insert into public.app_config(key, value) values ('price_past_life', '50')
  on conflict (key) do nothing;

create or replace function public.admin_set_config(p_key text, p_value text)
 returns text
 language plpgsql security definer
 set search_path to 'public'
as $function$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_key not in (
    'price_ai', 'price_ai_medium', 'price_ai_large', 'price_ai_compare',
    'price_advanced', 'price_advanced_major', 'price_past_life',
    'price_bundle_basic', 'price_bundle_full',
    'xu_topup_rate', 'xu_new_user'
  ) then
    raise exception 'invalid_config_key';
  end if;
  insert into public.app_config(key, value, updated_at, updated_by)
    values (p_key, p_value, now(), auth.uid())
  on conflict(key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by;
  perform public.admin_log('set_config', null, json_build_object('key', p_key, 'value', p_value)::jsonb);
  return p_value;
end;
$function$;

notify pgrst, 'reload schema';
