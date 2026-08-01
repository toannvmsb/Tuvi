-- ════════════════════════════════════════════════════════════════
--  SECURITY FIXES — Chạy trong Supabase Dashboard → SQL Editor
--  Kiểm tra từng section trước khi chạy.
-- ════════════════════════════════════════════════════════════════

-- ── FIX 1: Xóa policy cho phép user đọc app_secrets ──────────────
-- Policy này để lộ OpenAI/Anthropic key cho toàn bộ user đăng nhập.
drop policy if exists "auth can read secrets" on public.app_secrets;

-- ── FIX 2: Thu hồi quyền EXECUTE deposit_xu khỏi authenticated ──
-- Hàm test này cho phép bất kỳ user nào tự cộng xu tuỳ ý.
revoke execute on function public.deposit_xu(integer) from authenticated;
revoke execute on function public.deposit_xu(integer) from anon;

-- ── FIX 3: admin_log chỉ admin mới được gọi ──────────────────────
-- Hiện tại bất kỳ authenticated user nào cũng có thể ghi audit log.
create or replace function public.admin_log(
  p_action text,
  p_target_user uuid default null,
  p_detail jsonb default '{}'
) returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;
  insert into public.admin_audit_log(admin_id, action, target_user_id, detail)
  values (auth.uid(), p_action, p_target_user, p_detail);
end;
$$;

-- ── FIX 4: Giới hạn độ dài broadcast title/body ──────────────────
create or replace function public.admin_create_broadcast(
  p_title text,
  p_body text,
  p_promo_detail text default null,
  p_scheduled_at timestamptz default null
) returns uuid
language plpgsql security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if length(p_title) > 200 then raise exception 'title_too_long'; end if;
  if length(p_body)  > 2000 then raise exception 'body_too_long'; end if;
  insert into public.broadcasts(title, body, promo_detail, scheduled_at, created_by)
  values (p_title, p_body, p_promo_detail, p_scheduled_at, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

-- ── FIX 5: Giới hạn số lượng voucher tạo mỗi lần ─────────────────
create or replace function public.admin_generate_vouchers(
  p_xu integer,
  p_count integer,
  p_note text default null,
  p_expires_at timestamptz default null
) returns integer
language plpgsql security definer
set search_path = public
as $$
declare
  v_inserted integer := 0;
  v_code text;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_count > 1000 then raise exception 'count_too_large_max_1000'; end if;
  if p_xu <= 0   then raise exception 'xu_must_be_positive'; end if;
  for i in 1..p_count loop
    v_code := upper(substring(md5(random()::text || clock_timestamp()::text) for 8));
    insert into public.vouchers(code, xu, note, expires_at)
    values (v_code, p_xu, p_note, p_expires_at)
    on conflict (code) do nothing;
    v_inserted := v_inserted + 1;
  end loop;
  return v_inserted;
end;
$$;

-- ── FIX 6: Whitelist key cho admin_set_config ─────────────────────
create or replace function public.admin_set_config(
  p_key text,
  p_value text
) returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_key not in (
    'price_ai', 'price_ai_medium', 'price_advanced', 'price_combo',
    'xu_topup_rate', 'price_palace_ai', 'price_battu_ai'
  ) then
    raise exception 'invalid_config_key';
  end if;
  insert into public.app_config(key, value)
  values (p_key, p_value)
  on conflict (key) do update set value = excluded.value, updated_at = now();
end;
$$;

-- ── FIX 7: Giới hạn độ dài p_reason trong admin_adjust_xu ─────────
create or replace function public.admin_adjust_xu(
  p_user_id uuid,
  p_amount integer,
  p_reason text default 'admin_dashboard'
) returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if length(p_reason) > 200 then raise exception 'reason_too_long'; end if;
  update public.profiles set xu = xu + p_amount where id = p_user_id;
  insert into public.transactions(user_id, delta, reason, ref)
  values (p_user_id, p_amount, p_reason, 'admin');
  insert into public.admin_audit_log(admin_id, action, target_user_id, detail)
  values (auth.uid(), 'adjust_xu', p_user_id, jsonb_build_object('amount', p_amount, 'reason', p_reason));
end;
$$;
