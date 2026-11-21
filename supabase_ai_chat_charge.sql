-- ════════════════════════════════════════════════════════════════
--  AI CHAT — hạn mức + trừ xu do MÁY CHỦ quyết (vá lỗ hổng: cờ `paid` do client gửi được tin vô điều kiện → dùng AI không giới hạn miễn phí).
--  Hai hàm NGUYÊN TỬ, CHỈ service_role (Edge Function ai-chat) gọi được:
--    ai_chat_begin(...)  — tăng bộ đếm ngày; trong hạn mức → 'free'; vượt hạn mức → nếu người dùng đồng ý trả phí thì TRỪ XU ngay trong
--                          cùng giao dịch (khóa dòng hồ sơ) → 'paid'; không đủ xu / chưa đồng ý → hoàn bộ đếm, trả 'insufficient' / 'quota'.
--    ai_chat_abort(...)  — AI lỗi sau khi đã tính: hoàn bộ đếm và HOÀN XU nếu đã trừ.
--  Giá 1 lượt vượt hạn mức = p_cost (Edge Function giữ hằng số, khớp PREMIUM.COST.aiChat ở app).
--  Thứ tự triển khai: (1) chạy file này (thêm hàm, không ảnh hưởng gì đang chạy) → (2) deploy web mới (aiChat.ts không tự trừ xu nữa) →
--                     (3) deploy Edge Function ai-chat mới.
-- ════════════════════════════════════════════════════════════════

create or replace function public.ai_chat_begin(
  p_user uuid, p_date date, p_limit int, p_cost int, p_allow_charge boolean, p_ref text
) returns json language plpgsql security definer set search_path = public as $$
declare n int; bal int;
begin
  if p_user is null then raise exception 'no_user'; end if;
  if p_limit < 0 or p_cost < 1 then raise exception 'bad_params'; end if;

  insert into public.ai_chat_usage(user_id, usage_date, msg_count) values (p_user, p_date, 1)
    on conflict (user_id, usage_date) do update set msg_count = public.ai_chat_usage.msg_count + 1, updated_at = now()
    returning msg_count into n;

  if n <= p_limit then
    return json_build_object('mode', 'free', 'used', n);
  end if;

  if not p_allow_charge then
    update public.ai_chat_usage set msg_count = greatest(msg_count - 1, 0), updated_at = now() where user_id = p_user and usage_date = p_date;
    return json_build_object('mode', 'quota', 'used', n - 1);
  end if;

  select xu into bal from public.profiles where id = p_user for update;
  if bal is null or bal < p_cost then
    update public.ai_chat_usage set msg_count = greatest(msg_count - 1, 0), updated_at = now() where user_id = p_user and usage_date = p_date;
    return json_build_object('mode', 'insufficient', 'balance', coalesce(bal, 0), 'cost', p_cost);
  end if;

  update public.profiles set xu = xu - p_cost where id = p_user;
  insert into public.transactions(user_id, amount, reason, ref_key) values (p_user, -p_cost, 'ai_chat', p_ref);
  return json_build_object('mode', 'paid', 'used', n, 'balance', bal - p_cost, 'cost', p_cost);
end; $$;

create or replace function public.ai_chat_abort(
  p_user uuid, p_date date, p_mode text, p_cost int, p_ref text
) returns json language plpgsql security definer set search_path = public as $$
declare bal int;
begin
  if p_user is null then raise exception 'no_user'; end if;
  update public.ai_chat_usage set msg_count = greatest(msg_count - 1, 0), updated_at = now() where user_id = p_user and usage_date = p_date;
  if p_mode = 'paid' and p_cost >= 1 then
    update public.profiles set xu = xu + p_cost where id = p_user returning xu into bal;
    insert into public.transactions(user_id, amount, reason, ref_key) values (p_user, p_cost, 'ai_chat_refund', p_ref);
  end if;
  return json_build_object('ok', true, 'balance', bal);
end; $$;

revoke all on function public.ai_chat_begin(uuid, date, int, int, boolean, text) from public, anon, authenticated;
revoke all on function public.ai_chat_abort(uuid, date, text, int, text) from public, anon, authenticated;
grant execute on function public.ai_chat_begin(uuid, date, int, int, boolean, text) to service_role;
grant execute on function public.ai_chat_abort(uuid, date, text, int, text) to service_role;

-- HOÀN TÁC: drop function public.ai_chat_begin(uuid, date, int, int, boolean, text); drop function public.ai_chat_abort(uuid, date, text, int, text);
