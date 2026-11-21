-- ════════════════════════════════════════════════════════════════
--  AI PROXY — "tín dụng AI" gắn với xu ĐÃ TRỪ THẬT phía máy chủ + trần theo ngày (vá lỗ hổng: ai-proxy chỉ kiểm tra đã đăng nhập,
--  không kiểm tra đã trả phí → ai cũng gọi OpenAI/Claude không giới hạn bằng key dùng chung của app).
--
--  Cách tính (nguyên tử, khóa dòng hồ sơ để các lượt gọi song song của cùng một người xếp hàng):
--    đã chi    = Σ |amount| của giao dịch ÂM với reason 'ai' (hệ số p_ai_per_xu) và 'combo' (hệ số p_combo_per_xu)
--                — các giao dịch này chỉ do hàm SECURITY DEFINER spend_xu ghi nên không giả được nếu không thật sự trừ xu
--    cho phép  = floor(đã chi theo hệ số)         (mỗi lượt gọi ai-proxy = 1 đơn vị)
--    đã dùng   = Σ lượt gọi từng được chấp nhận (bảng ai_proxy_usage, tính từ lúc triển khai)
--    chấp nhận khi: đã dùng < cho phép  VÀ  số lượt hôm nay < trần/ngày.   Tài khoản admin: bỏ qua điều kiện đầu.
--  Hiệu chỉnh theo dữ liệu thật (11/2026): 43 người đã chi 51.698 xu cho 'ai', 11 người mua combo; 0 người có mở khóa AI mà chưa có chi tiêu
--  'ai'/'combo' → không ai đang dùng hợp lệ bị chặn. Một lần phân tích tốn tối đa ~12 lượt gọi cho ≥20 xu (hệ số 1 là dư dả).
--  Thứ tự triển khai: (1) chạy file này → (2) deploy web mới (chờ lệnh trừ xu ghi xong trước khi gọi AI) → (3) deploy Edge Function ai-proxy.
-- ════════════════════════════════════════════════════════════════

create table if not exists public.ai_proxy_usage (
  user_id     uuid not null references auth.users(id) on delete cascade,
  usage_date  date not null,
  calls       int  not null default 0,
  primary key (user_id, usage_date)
);
alter table public.ai_proxy_usage enable row level security;
revoke all on table public.ai_proxy_usage from anon, authenticated;   -- chỉ service_role (Edge Function) đọc/ghi

create or replace function public.ai_proxy_begin(
  p_user uuid, p_date date, p_daily_cap int, p_ai_per_xu numeric, p_combo_per_xu numeric
) returns json language plpgsql security definer set search_path = public as $$
declare is_adm boolean; used bigint; today bigint; spent_ai bigint; spent_combo bigint; allowed bigint;
begin
  if p_user is null then raise exception 'no_user'; end if;
  select is_admin into is_adm from public.profiles where id = p_user for update;
  if not found then return json_build_object('mode', 'no_profile'); end if;

  select coalesce(sum(calls), 0), coalesce(sum(calls) filter (where usage_date = p_date), 0)
    into used, today from public.ai_proxy_usage where user_id = p_user;
  if today >= p_daily_cap then return json_build_object('mode', 'daily_cap', 'today', today); end if;

  if not is_adm then
    select coalesce(sum(-amount) filter (where reason = 'ai'), 0), coalesce(sum(-amount) filter (where reason = 'combo'), 0)
      into spent_ai, spent_combo from public.transactions where user_id = p_user and amount < 0 and reason in ('ai', 'combo');
    allowed := floor(spent_ai * p_ai_per_xu + spent_combo * p_combo_per_xu);
    if used >= allowed then
      return json_build_object('mode', 'no_credit', 'spent_ai', spent_ai, 'spent_combo', spent_combo, 'used', used);
    end if;
  end if;

  insert into public.ai_proxy_usage(user_id, usage_date, calls) values (p_user, p_date, 1)
    on conflict (user_id, usage_date) do update set calls = public.ai_proxy_usage.calls + 1;
  return json_build_object('mode', 'ok', 'used', used + 1, 'allowed', case when is_adm then null else allowed end, 'today', today + 1);
end; $$;

-- AI lỗi sau khi đã tính: hoàn lại 1 lượt (không phạt người dùng vì lỗi phía nhà cung cấp AI).
create or replace function public.ai_proxy_abort(p_user uuid, p_date date)
returns void language sql security definer set search_path = public as $$
  update public.ai_proxy_usage set calls = greatest(calls - 1, 0) where user_id = p_user and usage_date = p_date;
$$;

revoke all on function public.ai_proxy_begin(uuid, date, int, numeric, numeric) from public, anon, authenticated;
revoke all on function public.ai_proxy_abort(uuid, date) from public, anon, authenticated;
grant execute on function public.ai_proxy_begin(uuid, date, int, numeric, numeric) to service_role;
grant execute on function public.ai_proxy_abort(uuid, date) to service_role;

-- HOÀN TÁC: drop function public.ai_proxy_begin(uuid, date, int, numeric, numeric); drop function public.ai_proxy_abort(uuid, date); drop table public.ai_proxy_usage;
