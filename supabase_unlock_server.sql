-- ════════════════════════════════════════════════════════════════
--  MỞ KHÓA TÍNH NĂNG — GIÁ DO MÁY CHỦ QUYẾT (Phần C bảo mật)
--  Trước đây client tự gọi spend_xu(p_amount tự chọn) và tự insert vào `unlocks` → ai cũng có thể gửi số xu nhỏ/âm tùy ý để "mua" rẻ
--  hoặc dựng sổ giao dịch 'ai' giả để lấy tín dụng AI. Nay:
--    unlock_feature(p_key, p_kind, p_force)  — giá suy ra từ dạng khóa (key) + bảng app_config; đã mở → không trừ; p_force = "Phân tích lại" (trừ lại).
--    unlock_bundle(p_ref, p_keys)            — giá theo mã gói (lifetime_basic / lifetime_full) từ app_config.
--  Cả hai chạy dưới quyền người gọi (auth.uid()), khóa dòng hồ sơ nên không trừ trùng; trả JSON {ok, charged, balance, ...}.
--  Thứ tự triển khai: (1) chạy file này (cộng thêm, chưa chặn gì) → (2) deploy web mới gọi RPC mới → (3) chạy phần "SIẾT" ở cuối file.
-- ════════════════════════════════════════════════════════════════

create or replace function public.unlock_price(p_key text, p_kind text)
returns int language plpgsql stable security definer set search_path = public as $$
declare
  suffix text := regexp_replace(p_key, '^[^:]+:', '');   -- bỏ tiền tố chartId
  v text;
  def int; cfg text;
begin
  -- (khóa cấu hình, giá mặc định) theo dạng khóa — PHẢI khớp PREMIUM.COST ở src/constants/premium.ts
  if p_key like 'compare\_ai\_v1\_%' then cfg := 'price_ai_compare'; def := 30;
  elsif suffix = 'future:full'           then cfg := 'price_future_life'; def := 50;
  elsif suffix = 'pastLife:full'         then cfg := 'price_past_life';   def := 50;
  elsif suffix ~ '^annualEvents:[^:]+:(adv|ai)$' then cfg := null; def := 20;
  elsif p_kind = 'ai' and (suffix ~ '^chart:ai:' or suffix ~ '^(dv|tv):[^:]+:ai$') then cfg := 'price_ai_large'; def := 100;
  elsif p_kind = 'advanced' and (suffix ~ '^chart:adv:' or suffix ~ '^(dv|tv|palace):[^:]+:adv$') then cfg := 'price_advanced_major'; def := 20;
  elsif p_kind = 'ai'      then cfg := 'price_ai';       def := 30;
  else                          cfg := 'price_advanced'; def := 10;
  end if;
  if cfg is not null then
    select value into v from public.app_config where key = cfg;
    if v is not null and v ~ '^[0-9]{1,5}$' and v::int > 0 then return v::int; end if;
  end if;
  return def;
end; $$;

create or replace function public.unlock_feature(p_key text, p_kind text, p_force boolean default false)
returns json language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  bal int; price int; had boolean;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if p_kind not in ('ai', 'advanced') then raise exception 'bad_kind'; end if;
  if p_key is null or length(p_key) < 1 or length(p_key) > 200 then raise exception 'bad_key'; end if;

  select xu into bal from public.profiles where id = uid for update;   -- khóa dòng: tuần tự hóa mọi lần mở của người này
  if bal is null then raise exception 'no_profile'; end if;

  select exists(select 1 from public.unlocks where user_id = uid and unlock_key = p_key) into had;
  if had and not coalesce(p_force, false) then
    return json_build_object('ok', true, 'already', true, 'charged', 0, 'balance', bal);
  end if;

  price := public.unlock_price(p_key, p_kind);
  if bal < price then
    return json_build_object('ok', false, 'reason', 'insufficient', 'balance', bal, 'price', price);
  end if;

  update public.profiles set xu = xu - price where id = uid;
  insert into public.transactions(user_id, amount, reason, ref_key) values (uid, -price, p_kind, p_key);
  if not had then
    insert into public.unlocks(user_id, unlock_key, kind) values (uid, p_key, p_kind);
  end if;
  return json_build_object('ok', true, 'already', false, 'charged', price, 'balance', bal - price);
end; $$;

create or replace function public.unlock_bundle(p_ref text, p_keys text[])
returns json language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  bal int; price int; v text; cfg text; def int; k text; missing int := 0;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if p_ref = 'lifetime_basic' then cfg := 'price_bundle_basic'; def := 490;
  elsif p_ref = 'lifetime_full' then cfg := 'price_bundle_full'; def := 990;
  else raise exception 'bad_bundle'; end if;
  if p_keys is null or coalesce(array_length(p_keys, 1), 0) < 1 or array_length(p_keys, 1) > 20 then raise exception 'bad_keys'; end if;
  foreach k in array p_keys loop
    if k is null or length(k) < 1 or length(k) > 200 then raise exception 'bad_key'; end if;
  end loop;

  select value into v from public.app_config where key = cfg;
  price := case when v is not null and v ~ '^[0-9]{1,5}$' and v::int > 0 then v::int else def end;

  select xu into bal from public.profiles where id = uid for update;
  if bal is null then raise exception 'no_profile'; end if;

  select count(*) into missing from unnest(p_keys) as t(k)
    where not exists (select 1 from public.unlocks u where u.user_id = uid and u.unlock_key = t.k);
  if missing = 0 then
    return json_build_object('ok', true, 'already', true, 'charged', 0, 'balance', bal);
  end if;
  if bal < price then
    return json_build_object('ok', false, 'reason', 'insufficient', 'balance', bal, 'price', price);
  end if;

  update public.profiles set xu = xu - price where id = uid;
  insert into public.transactions(user_id, amount, reason, ref_key) values (uid, -price, 'combo', p_ref);
  insert into public.unlocks(user_id, unlock_key, kind)
    select uid, t.k, 'ai' from unnest(p_keys) as t(k)
    where not exists (select 1 from public.unlocks u where u.user_id = uid and u.unlock_key = t.k);
  return json_build_object('ok', true, 'already', false, 'charged', price, 'balance', bal - price);
end; $$;

revoke all on function public.unlock_price(text, text) from public, anon, authenticated;
revoke all on function public.unlock_feature(text, text, boolean) from public, anon;
revoke all on function public.unlock_bundle(text, text[]) from public, anon;
grant execute on function public.unlock_feature(text, text, boolean) to authenticated;
grant execute on function public.unlock_bundle(text, text[]) to authenticated;

-- ── SIẾT (chỉ chạy SAU KHI web mới đã deploy; bản web cũ còn gọi spend_xu / insert unlocks trực tiếp) ──
-- revoke execute on function public.spend_xu(int, text, text) from authenticated;
-- revoke insert, update, delete on public.unlocks from authenticated;   -- (và xóa policy ghi nếu có)
-- HOÀN TÁC: drop function public.unlock_feature(text,text,boolean); drop function public.unlock_bundle(text,text[]); drop function public.unlock_price(text,text);
