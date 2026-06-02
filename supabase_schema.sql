-- ════════════════════════════════════════════════════════════════
--  SCHEMA SUPABASE cho ứng dụng Tử Vi & Bát Tự
--  Cách dùng: Supabase Dashboard → SQL Editor → New query → dán toàn bộ → Run.
-- ════════════════════════════════════════════════════════════════

-- 1) HỒ SƠ NGƯỜI DÙNG (gắn 1-1 với auth.users) + số dư xu
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  xu          integer not null default 0,        -- số dư xu
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- 2) LÁ SỐ ĐÃ LƯU của user
create table if not exists public.charts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text,
  gender      text,
  birth_day   int, birth_month int, birth_year int, birth_hour int,
  calendar    text default 'solar',
  is_leap     boolean default false,
  viewing_year int,
  data        jsonb,                              -- lưu cả AstrologyResult nếu muốn
  created_at  timestamptz not null default now()
);

-- 3) CÁC MỤC ĐÃ MỞ KHÓA (đã trả phí) — đọc lại miễn phí, kể cả đổi máy
create table if not exists public.unlocks (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  chart_id    uuid references public.charts(id) on delete cascade,
  unlock_key  text not null,                      -- vd "dv:3:ai", "palace:0:adv"
  kind        text not null,                      -- 'advanced' | 'ai'
  created_at  timestamptz not null default now(),
  unique (user_id, chart_id, unlock_key)
);

-- 4) LỊCH SỬ GIAO DỊCH xu (nạp / trừ)
create table if not exists public.transactions (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  amount      integer not null,                   -- +nạp / -trừ
  reason      text,                               -- 'deposit' | 'advanced' | 'ai'
  ref_key     text,
  created_at  timestamptz not null default now()
);

-- ───────────── ROW LEVEL SECURITY: mỗi user chỉ thấy dữ liệu của mình ─────────────
alter table public.profiles     enable row level security;
alter table public.charts       enable row level security;
alter table public.unlocks      enable row level security;
alter table public.transactions enable row level security;

create policy "own profile select" on public.profiles for select using (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);

create policy "own charts" on public.charts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own unlocks" on public.unlocks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own tx" on public.transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ───────────── Tự tạo profile khi có user mới đăng ký (TẶNG 50 xu khởi đầu) ─────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name, xu)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)), 50)
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────── RPC trừ xu an toàn (atomic) + ghi giao dịch ─────────────
create or replace function public.spend_xu(p_amount int, p_reason text, p_ref text)
returns integer language plpgsql security definer as $$
declare cur int;
begin
  select xu into cur from public.profiles where id = auth.uid() for update;
  if cur is null then raise exception 'no profile'; end if;
  if cur < p_amount then raise exception 'insufficient'; end if;
  update public.profiles set xu = xu - p_amount where id = auth.uid();
  insert into public.transactions(user_id, amount, reason, ref_key)
    values (auth.uid(), -p_amount, p_reason, p_ref);
  return cur - p_amount;
end; $$;

-- ───────────── RPC nạp xu (bản test; thật thì gọi sau khi thanh toán) ─────────────
create or replace function public.deposit_xu(p_amount int)
returns integer language plpgsql security definer as $$
declare newbal int;
begin
  update public.profiles set xu = xu + p_amount where id = auth.uid()
    returning xu into newbal;
  insert into public.transactions(user_id, amount, reason) values (auth.uid(), p_amount, 'deposit');
  return newbal;
end; $$;
