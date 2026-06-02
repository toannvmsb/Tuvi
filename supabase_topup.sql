-- ════════════════════════════════════════════════════════════════
--  NẠP XU qua chuyển khoản VietQR (đối soát tự động qua SePay/Casso)
--  Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ → Run.
--  (Chạy SAU supabase_schema.sql vì dùng profiles/transactions sẵn có.)
-- ════════════════════════════════════════════════════════════════

-- 0) Lưu Expo push token để máy chủ đẩy thông báo (nạp xu thành công…)
alter table public.profiles add column if not exists expo_push_token text;

-- 1) ĐƠN NẠP XU
create table if not exists public.topup_orders (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  code        text not null unique,                 -- nội dung chuyển khoản, vd 'TUVI8K3QF2'
  amount_vnd  integer not null,                      -- số tiền cần chuyển
  xu          integer not null,                      -- số xu sẽ cộng
  status      text not null default 'pending',       -- pending | paid | expired
  bank_tx_id  text,                                  -- mã giao dịch ngân hàng (chống cộng trùng)
  note        text,                                  -- ghi chú (vd 'amount_mismatch')
  created_at  timestamptz not null default now(),
  paid_at     timestamptz,
  expires_at  timestamptz not null default (now() + interval '30 minutes')
);

create index if not exists topup_orders_user_idx   on public.topup_orders(user_id);
create index if not exists topup_orders_status_idx on public.topup_orders(status);

-- 2) RLS: user chỉ XEM & TẠO đơn của mình; KHÔNG được tự đổi status (chỉ webhook/RPC mới cộng xu).
alter table public.topup_orders enable row level security;

create policy "own topup select" on public.topup_orders
  for select using (auth.uid() = user_id);
create policy "own topup insert" on public.topup_orders
  for insert with check (auth.uid() = user_id);
-- Cho phép user XÓA đơn của mình (dọn lịch sử các đơn chưa thanh toán).
create policy "own topup delete" on public.topup_orders
  for delete using (auth.uid() = user_id);
-- (Không tạo policy UPDATE → người dùng không thể tự đánh dấu 'paid'.)

-- 3) RPC CỘNG XU khi nhận được tiền — gọi từ Edge Function bằng SERVICE ROLE.
--    SECURITY DEFINER để bỏ qua RLS; idempotent: chỉ cộng khi đơn đang 'pending'.
create or replace function public.credit_topup(
  p_code text, p_amount_vnd int, p_bank_tx_id text
) returns text language plpgsql security definer as $$
declare o record;
begin
  select * into o from public.topup_orders where code = p_code for update;
  if not found then return 'not_found'; end if;
  if o.status = 'paid' then return 'already_paid'; end if;          -- chống webhook gửi lại
  if o.status = 'expired' then return 'expired'; end if;

  -- Số tiền không đủ → giữ pending, ghi chú để đối soát thủ công.
  if p_amount_vnd < o.amount_vnd then
    update public.topup_orders
      set note = 'amount_mismatch:' || p_amount_vnd, bank_tx_id = p_bank_tx_id
      where id = o.id;
    return 'amount_mismatch';
  end if;

  -- Cộng xu cho đúng chủ đơn + ghi lịch sử + đánh dấu đã thanh toán.
  update public.profiles set xu = xu + o.xu where id = o.user_id;
  insert into public.transactions(user_id, amount, reason, ref_key)
    values (o.user_id, o.xu, 'topup', o.code);
  update public.topup_orders
    set status = 'paid', paid_at = now(), bank_tx_id = p_bank_tx_id
    where id = o.id;
  return 'paid';
end; $$;

-- 4) (Tuỳ chọn) Hết hạn các đơn pending quá 30 phút — có thể gọi định kỳ bằng pg_cron.
create or replace function public.expire_topups()
returns void language sql security definer as $$
  update public.topup_orders set status = 'expired'
   where status = 'pending' and expires_at < now();
$$;
