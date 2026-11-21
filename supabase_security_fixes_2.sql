-- ════════════════════════════════════════════════════════════════
--  SECURITY FIXES 2 (11/2026) — vá các lỗ hổng KHẨN phát hiện khi rà soát toàn bộ code + cấu hình production.
--  TRẠNG THÁI: PHẦN A ĐÃ CHẠY trên production ngày 21/11/2026 (đã thử trước trong khối tự hoàn tác, rồi kiểm tra lại bằng người dùng thật).
--              PHẦN B ĐÃ CHẠY cùng ngày, sau khi web mới (topup.ts gọi create_topup_order) được deploy. PHẦN C CHƯA làm.
--              ĐỪNG chạy lại file này từ đầu trừ khi cần: các lệnh idempotent nhưng PHẦN B bị comment (đã chạy riêng).
--  Cách chạy (để tham khảo):
--     npx supabase db query --linked -f supabase_security_fixes_2.sql      (hoặc dán vào SQL Editor)
--
--  Các lỗ hổng (đã xác nhận trên production):
--   1. profiles: user tự UPDATE được xu / is_admin / banned của chính mình (không có trigger/cột nào chặn).
--   2. deposit_xu(số): anon + authenticated gọi được, không kiểm tra gì → tự cộng xu.
--   3. credit_topup(mã, tiền, mã GD): anon + authenticated gọi được → tự "xác nhận đã thanh toán" đơn nạp của mình.
--   4. topup_orders: user tự INSERT đơn với xu/amount_vnd tùy ý; create_topup_with_voucher cũng tin p_xu/p_amount
--      do máy khách gửi; webhook cộng đúng số xu ghi trong đơn → chuyển 1.000đ nhận hàng triệu xu.
--   5. transactions / unlocks: policy ALL cho user ghi tự do (sổ giao dịch + mở khóa tính năng).
--      → transactions khóa ngay ở PHẦN A; unlocks CHỈ khóa UPDATE/DELETE (INSERT còn cần cho app hiện tại, khóa ở PHẦN C
--        sau khi app chuyển sang hàm mở khóa phía máy chủ).
--
--  THỨ TỰ:
--   PHẦN A  — chạy NGAY. Không cần phát hành lại app. Thêm hàm create_topup_order (additive) + khóa các lỗ 1,2,3 + kiểm tra gói ở
--             create_topup_with_voucher. App hiện tại (insert trực tiếp vào topup_orders, nhưng chưa có số xu hợp lệ) VẪN chạy vì
--             quyền INSERT topup_orders chưa bị thu hồi ở phần này.
--   PHẦN B  — chạy SAU KHI web mới (topup.ts gọi RPC create_topup_order) đã deploy: thu hồi INSERT trực tiếp vào topup_orders
--             (đóng nốt lỗ 4 đường INSERT tay).
--   PHẦN C  — SAU này (cần đổi app): hàm mở khóa phía máy chủ rồi thu hồi INSERT unlocks. Chỉ để dạng ghi chú.
--   Cuối file: câu lệnh KIỂM TRA sau khi chạy + câu lệnh HOÀN TÁC.
-- ════════════════════════════════════════════════════════════════

-- ═════════════════════════ PHẦN A ═════════════════════════
begin;

-- A1) profiles: user chỉ được sửa display_name và expo_push_token (đúng 2 cột app đang cập nhật: auth.ts, notifications.ts).
--     Mọi thay đổi xu / is_admin / banned phải đi qua hàm SECURITY DEFINER (spend_xu, credit_*, admin_*).
drop policy if exists "own profile insert" on public.profiles;
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
revoke all on table public.profiles from anon;
revoke insert, update, delete, truncate, references, trigger on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name, expo_push_token) on table public.profiles to authenticated;
-- Cột xu đang mặc định 100000 (nếu hồ sơ nào được tạo ngoài handle_new_user sẽ có sẵn 100.000 xu). handle_new_user luôn ghi xu tường minh.
alter table public.profiles alter column xu set default 0;

-- A2) Thu hồi quyền gọi các hàm chỉ dành cho máy chủ / nội bộ.
--     (Supabase tự cấp EXECUTE cho anon/authenticated/service_role khi tạo hàm → phải revoke tường minh; bản vá cũ FIX 2
--      chỉ revoke deposit_xu khỏi authenticated và rõ ràng chưa có hiệu lực trên production.)
revoke all on function public.deposit_xu(integer) from public, anon, authenticated;
revoke all on function public.credit_topup(text, integer, text) from public, anon, authenticated;
revoke all on function public.expire_topups() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public._voucher_check(text, uuid) from public, anon, authenticated;
grant execute on function public.credit_topup(text, integer, text) to service_role;   -- sepay-webhook
grant execute on function public.expire_topups() to service_role;
-- (deposit_xu: chỉ còn dùng cho 2 nút thử nghiệm trong __DEV__; production không cần. handle_new_user là hàm trigger — không cần
--  EXECUTE để trigger chạy. _voucher_check chỉ được gọi từ các hàm SECURITY DEFINER khác.)

-- A2b) Các hàm admin_*: không cho anon (và PUBLIC) gọi; authenticated vẫn gọi được (mỗi hàm tự kiểm tra is_admin()).
--      Chỉ cấp lại cho authenticated những hàm mà authenticated ĐANG gọi được (vd admin_log đã bị khóa từ trước thì giữ khóa).
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig, has_function_privilege('authenticated', p.oid, 'execute') as auth_ok
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'admin\_%'
  loop
    if r.auth_ok then execute format('grant execute on function %s to authenticated', r.sig); end if;
    execute format('revoke execute on function %s from public, anon', r.sig);
  end loop;
end $$;

-- A3) Quyền ghi bảng.
--     anon không bao giờ cần ghi vào bảng nào (mọi policy ghi đều yêu cầu auth.uid()).
revoke insert, update, delete, truncate on all tables in schema public from anon;
--     Sổ giao dịch: chỉ các hàm SECURITY DEFINER được ghi. Client không ghi trực tiếp (đã kiểm tra: không có from('transactions') trong src/).
revoke insert, update, delete, truncate on table public.transactions from authenticated;
--     Mở khóa: tạm giữ INSERT (app hiện ghi trực tiếp, xem PHẦN C); khóa sửa/xóa.
revoke update, delete, truncate on table public.unlocks from authenticated;
--     Bảng chỉ dành cho máy chủ (Edge Function dùng service_role; không có policy cho client) → thu hồi hết quyền của client.
revoke all on table public.app_secrets, public.partners, public.partner_user_links, public.partner_sso_logins,
                    public.partner_upgrade_otps from anon, authenticated;

-- A4) Đơn nạp xu: giá do MÁY CHỦ quyết (1 xu = 100đ; chỉ các gói trong constants/payment.ts XU_PACKS: 100/200/500/1000/2000/5000 xu).
--     Hàm mới (không mã giảm giá). Giữ danh sách gói ĐỒNG BỘ với XU_PACKS và iap-verify.
create or replace function public.create_topup_order(p_order_code text, p_xu int)
returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); pending int;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if p_order_code is null or p_order_code !~ '^TUVI[0-9A-Z]{6}$' then raise exception 'invalid_order_code'; end if;
  if p_xu is null or p_xu not in (100, 200, 500, 1000, 2000, 5000) then raise exception 'invalid_pack'; end if;
  -- Chặn spam đơn chờ.
  select count(*) into pending from public.topup_orders
    where user_id = uid and status = 'pending' and created_at > now() - interval '1 hour';
  if pending >= 20 then raise exception 'too_many_orders'; end if;
  insert into public.topup_orders(user_id, code, amount_vnd, xu, status)
    values (uid, p_order_code, p_xu * 100, p_xu, 'pending');
  return json_build_object('ok', true, 'amount_vnd', p_xu * 100);
end; $$;
revoke all on function public.create_topup_order(text, int) from public, anon;
grant execute on function public.create_topup_order(text, int) to authenticated;

--     Hàm có mã giảm giá: GIỮ NGUYÊN logic production, chỉ thêm 3 dòng kiểm tra (mã đơn, gói hợp lệ, tiền gốc = xu × 100).
create or replace function public.create_topup_with_voucher(
  p_order_code text, p_amount_vnd int, p_xu int, p_voucher_code text
) returns json language plpgsql security definer set search_path to 'public' as $$
declare v public.vouchers; uid uuid := auth.uid(); off int; final_vnd int;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if p_order_code is null or p_order_code !~ '^TUVI[0-9A-Z]{6}$' then raise exception 'invalid_order_code'; end if;
  if p_xu is null or p_xu not in (100, 200, 500, 1000, 2000, 5000) then raise exception 'invalid_pack'; end if;
  if p_amount_vnd is distinct from p_xu * 100 then raise exception 'invalid_amount'; end if;
  v := public._voucher_check(p_voucher_code, uid);
  if v.kind <> 'discount' then raise exception 'voucher_wrong_kind'; end if;
  if p_amount_vnd < coalesce(v.min_amount_vnd, 0) then raise exception 'voucher_min_amount'; end if;

  off := case v.discount_type
           when 'percent'  then (p_amount_vnd * v.discount_value / 100)
           when 'fixed_vnd' then v.discount_value
         end;
  off := least(off, p_amount_vnd - 1000);
  final_vnd := p_amount_vnd - off;

  update public.vouchers set used_count = used_count + 1 where id = v.id;
  insert into public.voucher_redemptions(voucher_id, user_id, order_code, vnd_discounted)
    values (v.id, uid, p_order_code, off);
  insert into public.topup_orders(user_id, code, amount_vnd, xu, status, voucher_code)
    values (uid, p_order_code, final_vnd, p_xu, 'pending', v.code);

  return json_build_object('ok', true, 'final_vnd', final_vnd, 'discount_vnd', off);
end; $$;
revoke all on function public.create_topup_with_voucher(text, int, int, text) from public, anon;
grant execute on function public.create_topup_with_voucher(text, int, int, text) to authenticated;

commit;

-- ═════════════════════════ PHẦN B ═════════════════════════
-- CHẠY SAU KHI web mới (topup.ts gọi supabase.rpc('create_topup_order', ...)) đã được deploy lên tuzi.vn.
-- (Nếu chạy trước: web cũ không tạo được đơn → trước đây sẽ vẫn hiện QR và khách chuyển khoản không có đơn.)
--
-- begin;
-- drop policy if exists "own topup insert" on public.topup_orders;
-- revoke insert, update, truncate on table public.topup_orders from authenticated;
-- commit;

-- ═════════════════════════ PHẦN C (sau này, cần đổi app) ═════════════════════════
-- 1) Tạo hàm unlock_feature(p_key text, p_kind text, p_chart uuid) SECURITY DEFINER: lấy giá từ bảng giá phía máy chủ (app_config),
--    trừ xu (spend) và ghi unlocks trong MỘT giao dịch, từ chối nếu không đủ xu. Tương tự unlock_bundle(...) cho combo.
-- 2) Sửa src/lib/auth.ts (onSpend/onBundle) gọi hàm đó và CHỜ kết quả thay vì "gửi rồi quên".
-- 3) Các Edge Function trả phí (ai-chat, ai-proxy, generate-portrait) kiểm tra quyền/xu phía máy chủ.
-- 4) Rồi: revoke insert on table public.unlocks from authenticated; drop policy "own unlocks"; tạo lại policy chỉ SELECT.

-- ═════════════════════════ KIỂM TRA SAU KHI CHẠY (kỳ vọng ghi bên phải) ═════════════════════════
-- select grantee, column_name from information_schema.column_privileges
--  where table_schema='public' and table_name='profiles' and privilege_type='UPDATE' and grantee in ('anon','authenticated');
--      → chỉ authenticated × (display_name, expo_push_token)
-- select p.proname, has_function_privilege('anon', p.oid,'execute') anon_x, has_function_privilege('authenticated', p.oid,'execute') auth_x
--   from pg_proc p join pg_namespace n on n.oid=p.pronamespace
--  where n.nspname='public' and p.proname in ('deposit_xu','credit_topup','expire_topups','handle_new_user','_voucher_check');
--      → tất cả false / false
-- select proname, has_function_privilege('anon', oid,'execute') from pg_proc where proname like 'admin\_%' and pronamespace='public'::regnamespace;
--      → anon = false hết
-- Và thử qua API (khóa anon): POST /rest/v1/rpc/credit_topup  → lỗi "permission denied for function credit_topup" (trước khi vá trả "not_found").

-- ═════════════════════════ HOÀN TÁC (nếu cần; đưa về đúng trạng thái trước khi vá) ═════════════════════════
-- grant execute on function public.deposit_xu(integer), public.credit_topup(text, integer, text), public.expire_topups(),
--   public.handle_new_user(), public._voucher_check(text, uuid) to anon, authenticated, service_role;
-- grant insert, update, delete, truncate on all tables in schema public to anon;   -- chỉ khi thật sự cần (không khuyến nghị)
-- grant insert, update, delete, truncate on table public.transactions to authenticated;
-- grant update, delete, truncate on table public.unlocks to authenticated;
-- grant insert, update, delete, truncate, references, trigger on table public.profiles to authenticated;
-- drop policy if exists "own profile update" on public.profiles;
-- create policy "own profile update" on public.profiles for update using (auth.uid() = id);
-- create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
-- alter table public.profiles alter column xu set default 100000;
-- (create_topup_order và bản create_topup_with_voucher mới vô hại nếu giữ lại; để trả về bản cũ của create_topup_with_voucher dùng
--  nội dung trong supabase_vouchers.sql mục 7.)
