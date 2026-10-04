-- ════════════════════════════════════════════════════════════════
--  LUẬN TƯƠNG LAI (src/core/pastReview/futureReview.ts, screens/FutureReviewScreen.tsx).
--   • price_future_life: giá mở toàn bộ các chặng đại vận tương lai (xu) — TẠM 50, chỉnh ở admin → Cấu hình giá.
--   • Bỏ "Chế độ học" (anh Toàn quyết định không làm): gỡ các đối tượng giai đoạn 4 cũ do em tạo ra ở lần chạy
--     trước và chưa từng có người dùng thật (learner_pass, past_review_essays, buy_learner_pass(), my_rule_book(),
--     khóa giá price_learner_pass / price_future_year). Dữ liệu duy nhất từng có là tài khoản test đã xóa.
--
--  Chạy: Supabase SQL Editor → dán toàn bộ → Run (an toàn khi chạy lại).
-- ════════════════════════════════════════════════════════════════

drop function if exists public.buy_learner_pass();
drop function if exists public.my_rule_book();
drop table if exists public.learner_pass;
drop table if exists public.past_review_essays;
drop function if exists public.past_review_essays_touch();
delete from public.app_config where key in ('price_learner_pass', 'price_future_year');

insert into public.app_config(key, value) values ('price_future_life', '50') on conflict (key) do nothing;

create or replace function public.admin_set_config(p_key text, p_value text)
 returns text
 language plpgsql security definer
 set search_path to 'public'
as $function$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_key not in (
    'price_ai', 'price_ai_medium', 'price_ai_large', 'price_ai_compare',
    'price_advanced', 'price_advanced_major', 'price_past_life', 'price_future_life',
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
