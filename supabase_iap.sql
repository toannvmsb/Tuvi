-- ════════════════════════════════════════════════════════════════
--  NẠP XU QUA IAP (Apple/Google) — bảng giao dịch + RPC cộng xu
--  Chạy trong Supabase SQL Editor (sau supabase_schema.sql).
-- ════════════════════════════════════════════════════════════════

-- 1) Lịch sử giao dịch IAP (transaction_id UNIQUE → chống cộng trùng)
create table if not exists public.iap_transactions (
  id             bigserial primary key,
  user_id        uuid not null references auth.users(id) on delete cascade,
  platform       text,                 -- 'ios' | 'android'
  product_id     text not null,        -- 'xu_100' …
  transaction_id text not null unique, -- mã giao dịch từ store (idempotency)
  xu             integer not null,
  created_at     timestamptz not null default now()
);
create index if not exists iap_txn_user_idx on public.iap_transactions(user_id);

-- 2) RLS: chỉ chủ đơn được XEM; cộng xu chỉ qua RPC (service role) nên không cần insert policy.
alter table public.iap_transactions enable row level security;
drop policy if exists "own iap select" on public.iap_transactions;
create policy "own iap select" on public.iap_transactions
  for select using (auth.uid() = user_id);

-- 3) RPC cộng xu IAP (idempotent). Gọi từ Edge Function bằng SERVICE ROLE,
--    truyền p_user vì auth.uid() = null khi dùng service role.
create or replace function public.credit_iap(
  p_user uuid, p_platform text, p_product text, p_xu int, p_txn text
) returns integer language plpgsql security definer as $$
declare newbal int;
begin
  -- Đã xử lý giao dịch này rồi → trả số dư hiện tại, KHÔNG cộng lần nữa.
  if exists (select 1 from public.iap_transactions where transaction_id = p_txn) then
    return (select xu from public.profiles where id = p_user);
  end if;

  update public.profiles set xu = xu + p_xu where id = p_user returning xu into newbal;
  if newbal is null then raise exception 'no profile for %', p_user; end if;

  insert into public.transactions(user_id, amount, reason, ref_key)
    values (p_user, p_xu, 'iap', p_product);
  insert into public.iap_transactions(user_id, platform, product_id, transaction_id, xu)
    values (p_user, p_platform, p_product, p_txn, p_xu);

  return newbal;
end; $$;
