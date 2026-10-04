-- ════════════════════════════════════════════════════════════════
--  CHÂN DUNG TƯƠNG HỢP — LẦN VẼ ĐẦU TIÊN MIỄN PHÍ (mỗi tài khoản một lần).
--  Từ lần vẽ thứ hai trở đi tính xu như cũ (PREMIUM.COST.portrait, hiện 30 xu).
--
--   • portrait_free_claims: mỗi tài khoản tối đa một dòng = đã dùng lần miễn phí.
--     RLS bật, KHÔNG có policy → client không đọc/ghi trực tiếp, chỉ qua 2 RPC bên dưới.
--   • portrait_free_available(): true nếu tài khoản CHƯA dùng lần miễn phí (dùng để hiện nhãn nút).
--   • claim_free_portrait(): gọi SAU KHI vẽ thành công (vẽ lỗi thì không mất lượt). Trả true nếu đây
--     đúng là lần miễn phí (vừa ghi nhận); false nếu đã dùng rồi (khi đó client tính xu bình thường).
--   • Tài khoản ĐÃ từng trả xu để vẽ chân dung (transactions.ref_key 'portrait:%') được đánh dấu
--     là đã dùng — để lần miễn phí chỉ dành cho người chưa từng vẽ.
--
--  Chạy: Supabase SQL Editor → dán toàn bộ → Run (an toàn khi chạy lại). Chỉ THÊM, không sửa bảng cũ.
-- ════════════════════════════════════════════════════════════════

create table if not exists public.portrait_free_claims (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  claimed_at timestamptz not null default now()
);
alter table public.portrait_free_claims enable row level security;
-- (cố ý KHÔNG tạo policy nào)

-- Người đã trả xu vẽ chân dung trước đây → coi như đã dùng lượt đầu.
insert into public.portrait_free_claims(user_id)
  select distinct user_id from public.transactions where ref_key like 'portrait:%' and user_id is not null
  on conflict (user_id) do nothing;

create or replace function public.portrait_free_available()
returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null
     and not exists (select 1 from public.portrait_free_claims where user_id = auth.uid());
$$;

create or replace function public.claim_free_portrait()
returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is null then return false; end if;
  insert into public.portrait_free_claims(user_id) values (auth.uid()) on conflict (user_id) do nothing;
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

revoke all on function public.portrait_free_available() from public, anon;
revoke all on function public.claim_free_portrait() from public, anon;
grant execute on function public.portrait_free_available() to authenticated;
grant execute on function public.claim_free_portrait() to authenticated;

notify pgrst, 'reload schema';
