-- ════════════════════════════════════════════════════════════════
--  SỰ KIỆN SẮP TỚI — V4: "Cơ sở tính Hướng xuất hành (dân gian)" — mỗi sự kiện cấu hình riêng
--  dùng Can Chi NGÀY hay Can Chi NĂM để tra Hỷ Thần/Tài Thần/Hạc Thần.
--
--  Theo đúng yêu cầu anh Toàn: "đối với từng event sẽ có các event lấy theo năm, có event theo
--  ngày/tháng. Ví dụ Giao thừa thì xuất hành lấy theo năm, Lập thu thì lấy theo ngày." — KHÔNG
--  phải đổi toàn bộ hệ thống sang 1 kiểu, mà thêm 1 cột cấu hình admin-chỉnh-được cho từng dòng.
--
--  Chạy SAU `supabase_life_events.sql` (v1), `supabase_life_events_v2.sql` (v2),
--  `supabase_life_events_v3.sql` (v3).
--  Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ → Run.
-- ════════════════════════════════════════════════════════════════

-- ── 1) Cột mới — mặc định 'day' (giữ nguyên hành vi hiện tại cho mọi sự kiện chưa cấu hình) ──
alter table public.event_packages add column if not exists xuat_hanh_basis text not null default 'day';
alter table public.event_packages drop constraint if exists event_packages_xuat_hanh_basis_check;
alter table public.event_packages add constraint event_packages_xuat_hanh_basis_check
  check (xuat_hanh_basis in ('day', 'year'));

-- ── 2) Đưa cột mới vào RPC đọc + ghi (đổi cột trả về → phải drop trước) ──
drop function if exists public.list_active_event_packages();
create or replace function public.list_active_event_packages()
returns table(
  event_key text, category text, display_name text, icon text, element text,
  calendar_type text, date_rule text, priority int, show_before_days int, show_after_days int,
  meaning text, do_text text, avoid_text text, theme_color text,
  checklist_text text, faq_text text, offering_text text, prayer_text text, xuat_hanh_basis text
)
language sql stable security definer set search_path = public as $$
  select p.event_key, p.category, p.display_name, p.icon, p.element,
         p.calendar_type, p.date_rule, p.priority, p.show_before_days, p.show_after_days,
         p.meaning, p.do_text, p.avoid_text, p.theme_color, p.checklist_text, p.faq_text,
         p.offering_text, p.prayer_text, p.xuat_hanh_basis
  from public.event_packages p
  where p.active
  order by p.priority desc;
$$;
grant execute on function public.list_active_event_packages() to anon, authenticated;

drop function if exists public.admin_list_event_packages(text, int);
create or replace function public.admin_list_event_packages(p_search text default '', p_limit int default 200)
returns table(
  id bigint, event_key text, category text, display_name text, icon text, element text,
  calendar_type text, date_rule text, priority int, show_before_days int, show_after_days int,
  meaning text, do_text text, avoid_text text, theme_color text, active boolean, updated_at timestamptz,
  checklist_text text, faq_text text, offering_text text, prayer_text text, xuat_hanh_basis text
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query select p.id, p.event_key, p.category, p.display_name, p.icon, p.element,
    p.calendar_type, p.date_rule, p.priority, p.show_before_days, p.show_after_days,
    p.meaning, p.do_text, p.avoid_text, p.theme_color, p.active, p.updated_at,
    p.checklist_text, p.faq_text, p.offering_text, p.prayer_text, p.xuat_hanh_basis
  from public.event_packages p
  where coalesce(p_search,'') = '' or p.display_name ilike '%'||p_search||'%' or p.event_key ilike '%'||p_search||'%'
  order by p.category, p.priority desc
  limit greatest(1, least(p_limit, 500));
end; $$;

drop function if exists public.admin_create_event_package(text,text,text,text,text,text,text,int,int,int,text,text,text,text,text,text,text,text);
create or replace function public.admin_create_event_package(
  p_event_key text, p_category text, p_display_name text, p_icon text, p_element text,
  p_calendar_type text, p_date_rule text, p_priority int, p_show_before_days int,
  p_show_after_days int, p_meaning text, p_do_text text, p_avoid_text text default null,
  p_theme_color text default null, p_checklist_text text default null, p_faq_text text default null,
  p_offering_text text default null, p_prayer_text text default null, p_xuat_hanh_basis text default 'day'
) returns bigint language plpgsql security definer set search_path = public as $$
declare new_id bigint;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_category not in ('traditional','solarterm') then raise exception 'bad_category'; end if;
  if p_calendar_type not in ('lunar','solar','solarterm') then raise exception 'bad_calendar_type'; end if;
  if p_xuat_hanh_basis not in ('day','year') then raise exception 'bad_xuat_hanh_basis'; end if;
  insert into public.event_packages(event_key, category, display_name, icon, element, calendar_type,
    date_rule, priority, show_before_days, show_after_days, meaning, do_text, avoid_text, theme_color,
    checklist_text, faq_text, offering_text, prayer_text, xuat_hanh_basis)
  values (p_event_key, p_category, p_display_name, p_icon, p_element, p_calendar_type,
    p_date_rule, p_priority, p_show_before_days, p_show_after_days, p_meaning, p_do_text, p_avoid_text, p_theme_color,
    p_checklist_text, p_faq_text, p_offering_text, p_prayer_text, p_xuat_hanh_basis)
  returning id into new_id;
  perform public.admin_log('create_event_package', null,
    json_build_object('id', new_id, 'event_key', p_event_key)::jsonb);
  return new_id;
end; $$;

drop function if exists public.admin_update_event_package(bigint,text,text,text,text,text,text,int,int,int,text,text,text,text,text,text,text,text);
create or replace function public.admin_update_event_package(
  p_id bigint, p_category text, p_display_name text, p_icon text, p_element text,
  p_calendar_type text, p_date_rule text, p_priority int, p_show_before_days int,
  p_show_after_days int, p_meaning text, p_do_text text, p_avoid_text text default null,
  p_theme_color text default null, p_checklist_text text default null, p_faq_text text default null,
  p_offering_text text default null, p_prayer_text text default null, p_xuat_hanh_basis text default 'day'
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_category not in ('traditional','solarterm') then raise exception 'bad_category'; end if;
  if p_calendar_type not in ('lunar','solar','solarterm') then raise exception 'bad_calendar_type'; end if;
  if p_xuat_hanh_basis not in ('day','year') then raise exception 'bad_xuat_hanh_basis'; end if;
  update public.event_packages set
    category = p_category, display_name = p_display_name, icon = p_icon, element = p_element,
    calendar_type = p_calendar_type, date_rule = p_date_rule, priority = p_priority,
    show_before_days = p_show_before_days, show_after_days = p_show_after_days,
    meaning = p_meaning, do_text = p_do_text, avoid_text = p_avoid_text, theme_color = p_theme_color,
    checklist_text = p_checklist_text, faq_text = p_faq_text,
    offering_text = p_offering_text, prayer_text = p_prayer_text, xuat_hanh_basis = p_xuat_hanh_basis,
    updated_at = now()
  where id = p_id;
  if not found then raise exception 'event_package_not_found'; end if;
  perform public.admin_log('update_event_package', null, json_build_object('id', p_id)::jsonb);
end; $$;

do $$
declare fn text;
begin
  foreach fn in array array[
    'admin_create_event_package(text,text,text,text,text,text,text,int,int,int,text,text,text,text,text,text,text,text,text)',
    'admin_update_event_package(bigint,text,text,text,text,text,text,int,int,int,text,text,text,text,text,text,text,text,text)'
  ] loop
    execute format('revoke all on function public.%s from anon;', fn);
    execute format('grant execute on function public.%s to authenticated;', fn);
  end loop;
end $$;

-- ── 3) Cấu hình 'year' cho 2 lễ gắn với "năm mới" — theo đúng ví dụ anh Toàn nêu (Giao Thừa lấy
-- theo năm). Tết Nguyên Đán (mùng 1, cùng thời khắc "năm mới") cũng để 'year' cho nhất quán; nếu
-- anh Toàn muốn khác có thể tự đổi qua trang admin "Sự kiện". Mọi lễ/tiết khí còn lại giữ 'day'
-- (mặc định ở bước 1, không cần update).
update public.event_packages set xuat_hanh_basis = 'year' where event_key in ('giao_thua', 'tet_nguyen_dan');

notify pgrst, 'reload schema';
