-- ════════════════════════════════════════════════════════════════
--  SỰ KIỆN SẮP TỚI — V2: Checklist/FAQ cho event_packages, Người liên quan +
--  3 loại sự kiện cá nhân mới (Giỗ, Ký hợp đồng, Nhập học/Tốt nghiệp) cho user_events.
--
--  Chạy SAU `supabase_life_events.sql` (v1) đã chạy trước đó.
--  Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ → Run.
-- ════════════════════════════════════════════════════════════════

-- ── 1) Cột mới ──
alter table public.event_packages add column if not exists checklist_text text;
alter table public.event_packages add column if not exists faq_text text;
alter table public.user_events add column if not exists related_people text;

-- ── 2) Mở rộng danh sách loại sự kiện cá nhân ──
alter table public.user_events drop constraint if exists user_events_event_type_check;
alter table public.user_events add constraint user_events_event_type_check
  check (event_type in ('birthday','wedding','moving','opening','exam','custom',
                         'death_anniversary','contract','graduation'));

-- ── 3) event_packages: đưa checklist_text/faq_text vào RPC đọc + ghi ──
drop function if exists public.list_active_event_packages();
create or replace function public.list_active_event_packages()
returns table(
  event_key text, category text, display_name text, icon text, element text,
  calendar_type text, date_rule text, priority int, show_before_days int, show_after_days int,
  meaning text, do_text text, avoid_text text, theme_color text,
  checklist_text text, faq_text text
)
language sql stable security definer set search_path = public as $$
  select p.event_key, p.category, p.display_name, p.icon, p.element,
         p.calendar_type, p.date_rule, p.priority, p.show_before_days, p.show_after_days,
         p.meaning, p.do_text, p.avoid_text, p.theme_color, p.checklist_text, p.faq_text
  from public.event_packages p
  where p.active
  order by p.priority desc;
$$;
grant execute on function public.list_active_event_packages() to anon, authenticated;

-- Đổi cột trả về (return type) → phải drop trước, create or replace không cho đổi return type.
drop function if exists public.admin_list_event_packages(text, int);
create or replace function public.admin_list_event_packages(p_search text default '', p_limit int default 200)
returns table(
  id bigint, event_key text, category text, display_name text, icon text, element text,
  calendar_type text, date_rule text, priority int, show_before_days int, show_after_days int,
  meaning text, do_text text, avoid_text text, theme_color text, active boolean, updated_at timestamptz,
  checklist_text text, faq_text text
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query select p.id, p.event_key, p.category, p.display_name, p.icon, p.element,
    p.calendar_type, p.date_rule, p.priority, p.show_before_days, p.show_after_days,
    p.meaning, p.do_text, p.avoid_text, p.theme_color, p.active, p.updated_at,
    p.checklist_text, p.faq_text
  from public.event_packages p
  where coalesce(p_search,'') = '' or p.display_name ilike '%'||p_search||'%' or p.event_key ilike '%'||p_search||'%'
  order by p.category, p.priority desc
  limit greatest(1, least(p_limit, 500));
end; $$;

-- Chữ ký tham số đổi (thêm 2 tham số cuối) → drop hàm CŨ trước để không tồn tại song song 2 bản.
drop function if exists public.admin_create_event_package(text,text,text,text,text,text,text,int,int,int,text,text,text,text);
create or replace function public.admin_create_event_package(
  p_event_key text, p_category text, p_display_name text, p_icon text, p_element text,
  p_calendar_type text, p_date_rule text, p_priority int, p_show_before_days int,
  p_show_after_days int, p_meaning text, p_do_text text, p_avoid_text text default null,
  p_theme_color text default null, p_checklist_text text default null, p_faq_text text default null
) returns bigint language plpgsql security definer set search_path = public as $$
declare new_id bigint;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_category not in ('traditional','solarterm') then raise exception 'bad_category'; end if;
  if p_calendar_type not in ('lunar','solar','solarterm') then raise exception 'bad_calendar_type'; end if;
  insert into public.event_packages(event_key, category, display_name, icon, element, calendar_type,
    date_rule, priority, show_before_days, show_after_days, meaning, do_text, avoid_text, theme_color,
    checklist_text, faq_text)
  values (p_event_key, p_category, p_display_name, p_icon, p_element, p_calendar_type,
    p_date_rule, p_priority, p_show_before_days, p_show_after_days, p_meaning, p_do_text, p_avoid_text, p_theme_color,
    p_checklist_text, p_faq_text)
  returning id into new_id;
  perform public.admin_log('create_event_package', null,
    json_build_object('id', new_id, 'event_key', p_event_key)::jsonb);
  return new_id;
end; $$;

drop function if exists public.admin_update_event_package(bigint,text,text,text,text,text,text,int,int,int,text,text,text,text);
create or replace function public.admin_update_event_package(
  p_id bigint, p_category text, p_display_name text, p_icon text, p_element text,
  p_calendar_type text, p_date_rule text, p_priority int, p_show_before_days int,
  p_show_after_days int, p_meaning text, p_do_text text, p_avoid_text text default null,
  p_theme_color text default null, p_checklist_text text default null, p_faq_text text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_category not in ('traditional','solarterm') then raise exception 'bad_category'; end if;
  if p_calendar_type not in ('lunar','solar','solarterm') then raise exception 'bad_calendar_type'; end if;
  update public.event_packages set
    category = p_category, display_name = p_display_name, icon = p_icon, element = p_element,
    calendar_type = p_calendar_type, date_rule = p_date_rule, priority = p_priority,
    show_before_days = p_show_before_days, show_after_days = p_show_after_days,
    meaning = p_meaning, do_text = p_do_text, avoid_text = p_avoid_text, theme_color = p_theme_color,
    checklist_text = p_checklist_text, faq_text = p_faq_text, updated_at = now()
  where id = p_id;
  if not found then raise exception 'event_package_not_found'; end if;
  perform public.admin_log('update_event_package', null, json_build_object('id', p_id)::jsonb);
end; $$;

-- Chữ ký đã đổi (thêm 2 tham số cuối) — revoke/grant lại theo chữ ký MỚI để lần chạy script sau
-- này (hoặc lần đầu) đều cấp quyền đúng hàm hiện hành.
do $$
declare fn text;
begin
  foreach fn in array array[
    'admin_create_event_package(text,text,text,text,text,text,text,int,int,int,text,text,text,text,text,text)',
    'admin_update_event_package(bigint,text,text,text,text,text,text,int,int,int,text,text,text,text,text,text)'
  ] loop
    execute format('revoke all on function public.%s from anon;', fn);
    execute format('grant execute on function public.%s to authenticated;', fn);
  end loop;
end $$;

-- ── 4) user_events: Người liên quan + 3 loại sự kiện mới trong RPC đọc/ghi ──
drop function if exists public.list_my_user_events();
create or replace function public.list_my_user_events()
returns table(
  id bigint, chart_id uuid, event_type text, title text, calendar_type text,
  event_date date, repeat_yearly boolean, show_before_days int, note text, created_at timestamptz,
  related_people text
)
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  return query select e.id, e.chart_id, e.event_type, e.title, e.calendar_type,
    e.event_date, e.repeat_yearly, e.show_before_days, e.note, e.created_at, e.related_people
  from public.user_events e where e.user_id = uid order by e.created_at desc;
end; $$;

drop function if exists public.create_user_event(text,text,text,date,boolean,int,text,uuid);
create or replace function public.create_user_event(
  p_event_type text, p_title text, p_calendar_type text, p_event_date date,
  p_repeat_yearly boolean default true, p_show_before_days int default 7,
  p_note text default null, p_chart_id uuid default null, p_related_people text default null
) returns bigint language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); new_id bigint;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if p_event_type not in ('birthday','wedding','moving','opening','exam','custom',
                           'death_anniversary','contract','graduation') then
    raise exception 'bad_event_type';
  end if;
  if p_calendar_type not in ('lunar','solar') then raise exception 'bad_calendar_type'; end if;
  insert into public.user_events(user_id, chart_id, event_type, title, calendar_type,
    event_date, repeat_yearly, show_before_days, note, related_people)
  values (uid, p_chart_id, p_event_type, p_title, p_calendar_type,
    p_event_date, p_repeat_yearly, p_show_before_days, p_note, p_related_people)
  returning id into new_id;
  return new_id;
end; $$;

drop function if exists public.update_user_event(bigint,text,text,date,boolean,int,text);
create or replace function public.update_user_event(
  p_id bigint, p_title text, p_calendar_type text, p_event_date date,
  p_repeat_yearly boolean, p_show_before_days int, p_note text default null,
  p_related_people text default null
) returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if p_calendar_type not in ('lunar','solar') then raise exception 'bad_calendar_type'; end if;
  update public.user_events set title = p_title, calendar_type = p_calendar_type,
    event_date = p_event_date, repeat_yearly = p_repeat_yearly,
    show_before_days = p_show_before_days, note = p_note, related_people = p_related_people,
    updated_at = now()
  where id = p_id and user_id = uid;
  if not found then raise exception 'user_event_not_found'; end if;
end; $$;

revoke all on function public.create_user_event(text,text,text,date,boolean,int,text,uuid,text) from anon;
revoke all on function public.update_user_event(bigint,text,text,date,boolean,int,text,text) from anon;
grant execute on function public.create_user_event(text,text,text,date,boolean,int,text,uuid,text) to authenticated;
grant execute on function public.update_user_event(bigint,text,text,date,boolean,int,text,text) to authenticated;

notify pgrst, 'reload schema';
