-- ════════════════════════════════════════════════════════════════
--  SECURITY FIXES — Chạy trong Supabase Dashboard → SQL Editor
--  Kiểm tra từng section trước khi chạy.
--
--  ⚠ THỨ TỰ CHẠY FIX 1: phải deploy Edge Function `ai-proxy` TRƯỚC
--  (supabase functions deploy ai-proxy) rồi mới chạy FIX 1 bên dưới — client (utils/aiAnalysis.ts,
--  lib/compareAI.ts) đã được sửa để gọi AI qua ai-proxy thay vì đọc thẳng app_secrets, nhưng nếu
--  build app CŨ (chưa cập nhật) vẫn đang chạy mà đã revoke policy thì tính năng AI trên bản CŨ đó
--  sẽ hỏng. Vì app CHƯA phát hành công khai (đang chuẩn bị lần 1) nên không có rủi ro user cũ,
--  cứ deploy Edge Function + chạy FIX 1 cùng lúc trước khi build bản phát hành.
--
--  ⚠ ĐÃ SỬA LẠI (bản trước gây lỗi 42P13 khi chạy FIX 3): toàn bộ FIX 3/4/6/7 bên dưới ban đầu
--  được viết KHÔNG khớp với chữ ký hàm / tên bảng / tên cột THẬT đang chạy trên Supabase (viết
--  trước khi rà lại schema thật). Đã đối chiếu lại với supabase_admin.sql, supabase_admin_v2.sql,
--  supabase_broadcasts.sql, supabase_vouchers.sql và sửa cho khớp:
--    • FIX 3: tên tham số thật là p_target (không phải p_target_user), cột thật là target_user
--      (không phải target_user_id) → phải DROP FUNCTION trước vì đổi tên tham số.
--    • FIX 4: bảng thật là app_broadcasts (không phải broadcasts), hàm nhận p_kind chứ không có
--      p_scheduled_at; đã bổ sung cột promo_detail (dashboard đã dùng nhưng bảng gốc chưa có).
--    • FIX 5: ĐÃ BỎ — hàm thật admin_generate_vouchers đã tự chặn p_count > 1000 từ trước, chạy
--      bản FIX 5 cũ sẽ THAY THẾ mất hàm thật (mất tính năng discount/gift/per_user_limit...).
--    • FIX 6/7: tên tham số & cột thật khác bản cũ (p_user/p_delta, transactions.amount/ref_key
--      chứ không phải delta/ref) — đã sửa lại, giữ nguyên logic gốc, chỉ thêm phần chặn bảo mật.
-- ════════════════════════════════════════════════════════════════

-- ── FIX 1: Xóa policy cho phép user đọc app_secrets ──────────────
-- Policy này để lộ OpenAI/Anthropic key cho toàn bộ user đăng nhập.
drop policy if exists "auth can read secrets" on public.app_secrets;

-- ── FIX 2: Thu hồi quyền EXECUTE deposit_xu khỏi authenticated ──
-- Hàm test này cho phép bất kỳ user nào tự cộng xu tuỳ ý.
revoke execute on function public.deposit_xu(integer) from authenticated;
revoke execute on function public.deposit_xu(integer) from anon;

-- ── FIX 3: admin_log chỉ admin mới được gọi ──────────────────────
-- Hiện tại bất kỳ authenticated user nào cũng có thể gọi thẳng admin_log() qua RPC
-- (PostgREST) để ghi rác/giả vào admin_audit_log — hàm không revoke EXECUTE khỏi
-- PUBLIC và không tự kiểm tra is_admin(). Chữ ký thật (supabase_admin.sql) là
-- admin_log(p_action text, p_target uuid, p_detail jsonb) — PHẢI drop trước vì
-- CREATE OR REPLACE không cho đổi tên tham số (p_target_user → p_target là sai,
-- đây là nguyên nhân lỗi 42P13 khi chạy file cũ).
drop function if exists public.admin_log(text, uuid, jsonb);
create or replace function public.admin_log(
  p_action text,
  p_target uuid,
  p_detail jsonb
) returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;
  insert into public.admin_audit_log(admin_id, action, target_user, detail)
  values (auth.uid(), p_action, p_target, p_detail);
end;
$$;
-- Hàm này chỉ được gọi NỘI BỘ (perform public.admin_log(...)) từ các hàm admin_*
-- khác, vốn đã là security definer — nên không cần cấp EXECUTE trực tiếp cho ai.
revoke all on function public.admin_log(text, uuid, jsonb) from public, anon, authenticated;

-- ── FIX 4: Giới hạn độ dài broadcast title/body + đồng bộ cột promo_detail ──
-- Chữ ký thật (supabase_broadcasts.sql) là admin_create_broadcast(p_kind text,
-- p_title text, p_body text, p_expires_at timestamptz) → insert vào app_broadcasts.
-- Cột promo_detail đang được admin dashboard (Broadcasts.tsx) gửi lên và
-- list_active_broadcasts() đã SELECT sẵn, nhưng app_broadcasts / admin_create_broadcast
-- trong file gốc supabase_broadcasts.sql lại CHƯA có cột/tham số này — thêm ở đây
-- cho khớp thực tế (an toàn để chạy lại nhiều lần nhờ if not exists / default null).
--
-- ⚠ PHÁT SINH THÊM (lỗi "Could not choose the best candidate function" khi tạo broadcast):
-- database THẬT hoá ra đã có sẵn 1 bản admin_create_broadcast(p_kind,p_title,p_body,
-- p_promo_detail,p_expires_at) — promo_detail nằm TRƯỚC expires_at — được ai đó chỉnh tay
-- trên Supabase trước đây, không khớp thứ tự trong file gốc lẫn bản CREATE OR REPLACE lần
-- trước (promo_detail nằm SAU expires_at). Vì 2 tham số cuối đổi CHỖ cho nhau là đổi KIỂU
-- theo vị trí, Postgres coi đây là chữ ký khác → CREATE OR REPLACE không ghi đè mà tạo
-- thành 2 hàm trùng tên cùng tồn tại, khiến lời gọi bằng tham số có tên (named args) không
-- biết chọn hàm nào. Phải DROP cả 2 khả năng rồi tạo lại DUY NHẤT 1 bản.
alter table public.app_broadcasts add column if not exists promo_detail text;
drop function if exists public.admin_create_broadcast(text, text, text, timestamptz);
drop function if exists public.admin_create_broadcast(text, text, text, timestamptz, text);
drop function if exists public.admin_create_broadcast(text, text, text, text, timestamptz);

create or replace function public.admin_create_broadcast(
  p_kind text,
  p_title text,
  p_body text,
  p_expires_at timestamptz default null,
  p_promo_detail text default null
) returns bigint
language plpgsql security definer
set search_path = public
as $$
declare new_id bigint;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_kind not in ('promo','feature','news') then raise exception 'bad_kind'; end if;
  if length(p_title) > 200 then raise exception 'title_too_long'; end if;
  if length(p_body)  > 2000 then raise exception 'body_too_long'; end if;
  insert into public.app_broadcasts(kind, title, body, expires_at, promo_detail, created_by)
    values (p_kind, p_title, p_body, p_expires_at, p_promo_detail, auth.uid())
    returning id into new_id;
  perform public.admin_log('create_broadcast', null,
    json_build_object('id', new_id, 'kind', p_kind, 'title', p_title)::jsonb);
  return new_id;
end;
$$;

-- admin_list_broadcasts thật (supabase_broadcasts.sql) CHƯA trả promo_detail — nhưng
-- Broadcasts.tsx (dòng ~142) đã đọc b.promo_detail từ danh sách này để hiện trên UI.
-- Bổ sung cho khớp, nếu không cột "Chi tiết KM" trên dashboard admin sẽ luôn trống dù đã lưu.
-- Thêm cột vào RETURNS TABLE cũng phải drop trước (không đổi được qua CREATE OR REPLACE).
drop function if exists public.admin_list_broadcasts(int);
create or replace function public.admin_list_broadcasts(p_limit int default 100)
returns table(id bigint, kind text, title text, body text, promo_detail text, active boolean,
              starts_at timestamptz, expires_at timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query select b.id, b.kind, b.title, b.body, b.promo_detail, b.active, b.starts_at, b.expires_at, b.created_at
    from public.app_broadcasts b order by b.created_at desc limit greatest(1, least(p_limit, 500));
end; $$;

-- ── FIX 5: Giới hạn số lượng voucher tạo mỗi lần ─────────────────
-- KHÔNG CẦN — đã kiểm tra: admin_generate_vouchers thật (supabase_vouchers.sql)
-- đã có is_admin() check và "if p_count < 1 or p_count > 1000 then raise exception
-- 'bad_count'" sẵn từ trước. Bản FIX 5 gốc dùng sai tên tham số/bảng (p_xu, bảng
-- "vouchers" phẳng) và nếu chạy sẽ THAY THẾ hàm thật bằng bản thiếu tính năng
-- (kind/discount/gift/per_user_limit...) → cố tình bỏ qua, không sửa gì ở đây.

-- ── FIX 6: Whitelist key cho admin_set_config ─────────────────────
-- Chữ ký thật (supabase_admin_v2.sql) trả về text (không phải void) và có cột
-- updated_by — giữ nguyên, chỉ thêm whitelist key. Danh sách whitelist lấy đúng
-- 10 key mà tuvi-admin/src/pages/Settings.tsx thực sự cho sửa (không phải danh
-- sách đoán — bản FIX 6 trước liệt kê nhầm cả key không tồn tại như
-- 'price_combo'/'price_palace_ai'/'price_battu_ai' và thiếu nhiều key thật).
create or replace function public.admin_set_config(
  p_key text,
  p_value text
) returns text
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_key not in (
    'price_ai', 'price_ai_medium', 'price_ai_large', 'price_ai_compare',
    'price_advanced', 'price_advanced_major',
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
$$;

-- ── FIX 7: Giới hạn độ dài p_reason trong admin_adjust_xu ─────────
-- Chữ ký thật (supabase_admin.sql) là admin_adjust_xu(p_user uuid, p_delta int,
-- p_reason text) trả về int (số dư mới) — giữ nguyên logic "greatest(0, ...)" chặn
-- âm và cột thật của transactions (user_id, amount, reason, ref_key), chỉ thêm
-- giới hạn độ dài p_reason.
create or replace function public.admin_adjust_xu(
  p_user uuid,
  p_delta int,
  p_reason text default 'admin_adjust'
) returns int
language plpgsql security definer
set search_path = public
as $$
declare newbal int;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if length(p_reason) > 200 then raise exception 'reason_too_long'; end if;
  update public.profiles set xu = greatest(0, xu + p_delta) where id = p_user returning xu into newbal;
  if newbal is null then raise exception 'user_not_found'; end if;
  insert into public.transactions(user_id, amount, reason, ref_key) values (p_user, p_delta, 'admin_adjust', p_reason);
  perform public.admin_log('adjust_xu', p_user, json_build_object('delta', p_delta, 'reason', p_reason, 'new_balance', newbal)::jsonb);
  return newbal;
end;
$$;

-- Nạp lại schema cache của PostgREST vì chữ ký admin_create_broadcast đã đổi (thêm p_promo_detail).
notify pgrst, 'reload schema';
