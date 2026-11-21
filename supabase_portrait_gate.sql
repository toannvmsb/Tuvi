-- ════════════════════════════════════════════════════════════════
--  VẼ CHÂN DUNG — máy chủ tự quyết lượt miễn phí đầu tiên + TỰ TRỪ XU (vá lỗ hổng: generate-portrait chỉ kiểm tra đã đăng nhập, việc trừ xu
--  làm ở client SAU khi vẽ → ai cũng gọi OpenAI + Cloudflare Workers AI không giới hạn mà không mất xu).
--  portrait_begin(...)  — nguyên tử: chưa từng dùng lượt miễn phí → ghi nhận lượt miễn phí ('free'); ngược lại khóa dòng hồ sơ, đủ xu thì TRỪ ngay ('paid');
--                         không đủ → 'insufficient'.
--  portrait_abort(...)  — vẽ lỗi: lượt miễn phí được trả lại (xóa ghi nhận) / xu được hoàn.
--  Chỉ service_role (Edge Function generate-portrait) gọi được. Giá = p_cost (Edge Function giữ hằng số, khớp PREMIUM.COST.portrait ở app).
--  Thứ tự triển khai: (1) chạy file này → (2) deploy web mới (không tự trừ xu/ghi nhận lượt miễn phí nữa) → (3) deploy Edge Function generate-portrait mới.
-- ════════════════════════════════════════════════════════════════

create or replace function public.portrait_begin(p_user uuid, p_cost int, p_ref text)
returns json language plpgsql security definer set search_path = public as $$
declare n int; bal int;
begin
  if p_user is null or p_cost < 1 then raise exception 'bad_params'; end if;
  insert into public.portrait_free_claims(user_id) values (p_user) on conflict (user_id) do nothing;
  get diagnostics n = row_count;
  if n > 0 then return json_build_object('mode', 'free'); end if;

  select xu into bal from public.profiles where id = p_user for update;
  if bal is null or bal < p_cost then
    return json_build_object('mode', 'insufficient', 'balance', coalesce(bal, 0), 'cost', p_cost);
  end if;
  update public.profiles set xu = xu - p_cost where id = p_user;
  insert into public.transactions(user_id, amount, reason, ref_key) values (p_user, -p_cost, 'portrait', p_ref);
  return json_build_object('mode', 'paid', 'balance', bal - p_cost, 'cost', p_cost);
end; $$;

create or replace function public.portrait_abort(p_user uuid, p_mode text, p_cost int, p_ref text)
returns json language plpgsql security definer set search_path = public as $$
declare bal int;
begin
  if p_user is null then raise exception 'no_user'; end if;
  if p_mode = 'free' then
    delete from public.portrait_free_claims where user_id = p_user;
  elsif p_mode = 'paid' and p_cost >= 1 then
    update public.profiles set xu = xu + p_cost where id = p_user returning xu into bal;
    insert into public.transactions(user_id, amount, reason, ref_key) values (p_user, p_cost, 'portrait_refund', p_ref);
  end if;
  return json_build_object('ok', true, 'balance', bal);
end; $$;

revoke all on function public.portrait_begin(uuid, int, text) from public, anon, authenticated;
revoke all on function public.portrait_abort(uuid, text, int, text) from public, anon, authenticated;
grant execute on function public.portrait_begin(uuid, int, text) to service_role;
grant execute on function public.portrait_abort(uuid, text, int, text) to service_role;

-- HOÀN TÁC: drop function public.portrait_begin(uuid, int, text); drop function public.portrait_abort(uuid, text, int, text);
