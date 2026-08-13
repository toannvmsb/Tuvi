-- ════════════════════════════════════════════════════════════════
--  SỰ KIỆN SẮP TỚI — V5: hoàn thiện các mục còn thiếu theo TUZI_M04:
--   (2) Metadata `tags` + `version` (mục 5)
--   (3) `prompt_template` — CMS Prompt Template có kiểm soát (mục 4, 11)
--   (4) `event_package_history` — Version History (mục 11), TÁCH RIÊNG khỏi admin_audit_log
--       (không dùng chung bảng audit log chung vì tên cột `target_user`/`target_user_id` đang
--       KHÔNG ĐỒNG NHẤT giữa supabase_admin.sql và supabase_security_fixes.sql trong repo — tạo
--       bảng lịch sử riêng cho event_packages để không phụ thuộc vào sự không chắc chắn đó).
--   (5) Thêm 4 loại sự kiện cá nhân mới: marathon, travel, product_launch, pitching.
--
--  Import/Export seed data (mục 11) làm HOÀN TOÀN CLIENT-SIDE trong tuvi-admin (JSON export từ
--  admin_list_event_packages() đã có, import gọi lại admin_create/admin_update_event_package có
--  sẵn) — KHÔNG cần RPC mới.
--
--  Chạy SAU v1, v2, v3, v4. Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ → Run.
-- ════════════════════════════════════════════════════════════════

-- ── 1) Cột mới cho event_packages ──
alter table public.event_packages add column if not exists tags text[] not null default '{}';
alter table public.event_packages add column if not exists version int not null default 1;
alter table public.event_packages add column if not exists prompt_template text;

-- ── 2) Bảng Version History riêng cho event_packages ──
create table if not exists public.event_package_history (
  id bigserial primary key,
  event_package_id bigint not null references public.event_packages(id) on delete cascade,
  version int not null,
  admin_id uuid references auth.users(id),
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists event_package_history_pkg_idx on public.event_package_history(event_package_id, created_at desc);
alter table public.event_package_history enable row level security;
-- Không tạo policy cho client → chỉ đọc qua RPC admin_list_event_package_history bên dưới.

-- ── 3) 4 loại sự kiện cá nhân mới (Lifestyle/Business — TUZI_M04 mục 3) ──
alter table public.user_events drop constraint if exists user_events_event_type_check;
alter table public.user_events add constraint user_events_event_type_check
  check (event_type in ('birthday','wedding','moving','opening','exam','custom',
                         'death_anniversary','contract','graduation',
                         'marathon','travel','product_launch','pitching'));

create or replace function public.create_user_event(
  p_event_type text, p_title text, p_calendar_type text, p_event_date date,
  p_repeat_yearly boolean default true, p_show_before_days int default 7,
  p_note text default null, p_chart_id uuid default null, p_related_people text default null
) returns bigint language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); new_id bigint;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if p_event_type not in ('birthday','wedding','moving','opening','exam','custom',
                           'death_anniversary','contract','graduation',
                           'marathon','travel','product_launch','pitching') then
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

-- ── 4) RPC đọc — thêm tags/version/prompt_template (đổi cột trả về → phải drop trước) ──
drop function if exists public.list_active_event_packages();
create or replace function public.list_active_event_packages()
returns table(
  event_key text, category text, display_name text, icon text, element text,
  calendar_type text, date_rule text, priority int, show_before_days int, show_after_days int,
  meaning text, do_text text, avoid_text text, theme_color text,
  checklist_text text, faq_text text, offering_text text, prayer_text text, xuat_hanh_basis text,
  tags text[], version int, prompt_template text
)
language sql stable security definer set search_path = public as $$
  select p.event_key, p.category, p.display_name, p.icon, p.element,
         p.calendar_type, p.date_rule, p.priority, p.show_before_days, p.show_after_days,
         p.meaning, p.do_text, p.avoid_text, p.theme_color, p.checklist_text, p.faq_text,
         p.offering_text, p.prayer_text, p.xuat_hanh_basis, p.tags, p.version, p.prompt_template
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
  checklist_text text, faq_text text, offering_text text, prayer_text text, xuat_hanh_basis text,
  tags text[], version int, prompt_template text
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query select p.id, p.event_key, p.category, p.display_name, p.icon, p.element,
    p.calendar_type, p.date_rule, p.priority, p.show_before_days, p.show_after_days,
    p.meaning, p.do_text, p.avoid_text, p.theme_color, p.active, p.updated_at,
    p.checklist_text, p.faq_text, p.offering_text, p.prayer_text, p.xuat_hanh_basis,
    p.tags, p.version, p.prompt_template
  from public.event_packages p
  where coalesce(p_search,'') = '' or p.display_name ilike '%'||p_search||'%' or p.event_key ilike '%'||p_search||'%'
  order by p.category, p.priority desc
  limit greatest(1, least(p_limit, 500));
end; $$;

-- ── 5) RPC ghi — thêm p_tags/p_prompt_template, tăng version, ghi Version History ──
drop function if exists public.admin_create_event_package(text,text,text,text,text,text,text,int,int,int,text,text,text,text,text,text,text,text,text);
create or replace function public.admin_create_event_package(
  p_event_key text, p_category text, p_display_name text, p_icon text, p_element text,
  p_calendar_type text, p_date_rule text, p_priority int, p_show_before_days int,
  p_show_after_days int, p_meaning text, p_do_text text, p_avoid_text text default null,
  p_theme_color text default null, p_checklist_text text default null, p_faq_text text default null,
  p_offering_text text default null, p_prayer_text text default null, p_xuat_hanh_basis text default 'day',
  p_tags text[] default '{}', p_prompt_template text default null
) returns bigint language plpgsql security definer set search_path = public as $$
declare new_id bigint;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_category not in ('traditional','solarterm') then raise exception 'bad_category'; end if;
  if p_calendar_type not in ('lunar','solar','solarterm') then raise exception 'bad_calendar_type'; end if;
  if p_xuat_hanh_basis not in ('day','year') then raise exception 'bad_xuat_hanh_basis'; end if;
  insert into public.event_packages(event_key, category, display_name, icon, element, calendar_type,
    date_rule, priority, show_before_days, show_after_days, meaning, do_text, avoid_text, theme_color,
    checklist_text, faq_text, offering_text, prayer_text, xuat_hanh_basis, tags, prompt_template)
  values (p_event_key, p_category, p_display_name, p_icon, p_element, p_calendar_type,
    p_date_rule, p_priority, p_show_before_days, p_show_after_days, p_meaning, p_do_text, p_avoid_text, p_theme_color,
    p_checklist_text, p_faq_text, p_offering_text, p_prayer_text, p_xuat_hanh_basis, p_tags, p_prompt_template)
  returning id into new_id;
  insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
  values (new_id, 1, auth.uid(), json_build_object(
    'event_key', p_event_key, 'category', p_category, 'display_name', p_display_name, 'icon', p_icon,
    'element', p_element, 'calendar_type', p_calendar_type, 'date_rule', p_date_rule, 'priority', p_priority,
    'show_before_days', p_show_before_days, 'show_after_days', p_show_after_days, 'meaning', p_meaning,
    'do_text', p_do_text, 'avoid_text', p_avoid_text, 'theme_color', p_theme_color,
    'checklist_text', p_checklist_text, 'faq_text', p_faq_text, 'offering_text', p_offering_text,
    'prayer_text', p_prayer_text, 'xuat_hanh_basis', p_xuat_hanh_basis, 'tags', p_tags,
    'prompt_template', p_prompt_template
  )::jsonb);
  perform public.admin_log('create_event_package', null,
    json_build_object('id', new_id, 'event_key', p_event_key)::jsonb);
  return new_id;
end; $$;

drop function if exists public.admin_update_event_package(bigint,text,text,text,text,text,text,int,int,int,text,text,text,text,text,text,text,text,text);
create or replace function public.admin_update_event_package(
  p_id bigint, p_category text, p_display_name text, p_icon text, p_element text,
  p_calendar_type text, p_date_rule text, p_priority int, p_show_before_days int,
  p_show_after_days int, p_meaning text, p_do_text text, p_avoid_text text default null,
  p_theme_color text default null, p_checklist_text text default null, p_faq_text text default null,
  p_offering_text text default null, p_prayer_text text default null, p_xuat_hanh_basis text default 'day',
  p_tags text[] default '{}', p_prompt_template text default null
) returns void language plpgsql security definer set search_path = public as $$
declare new_version int;
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
    tags = p_tags, prompt_template = p_prompt_template, version = event_packages.version + 1,
    updated_at = now()
  where id = p_id
  returning version into new_version;
  if not found then raise exception 'event_package_not_found'; end if;
  insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
  values (p_id, new_version, auth.uid(), json_build_object(
    'category', p_category, 'display_name', p_display_name, 'icon', p_icon, 'element', p_element,
    'calendar_type', p_calendar_type, 'date_rule', p_date_rule, 'priority', p_priority,
    'show_before_days', p_show_before_days, 'show_after_days', p_show_after_days, 'meaning', p_meaning,
    'do_text', p_do_text, 'avoid_text', p_avoid_text, 'theme_color', p_theme_color,
    'checklist_text', p_checklist_text, 'faq_text', p_faq_text, 'offering_text', p_offering_text,
    'prayer_text', p_prayer_text, 'xuat_hanh_basis', p_xuat_hanh_basis, 'tags', p_tags,
    'prompt_template', p_prompt_template
  )::jsonb);
  perform public.admin_log('update_event_package', null, json_build_object('id', p_id, 'version', new_version)::jsonb);
end; $$;

do $$
declare fn text;
begin
  foreach fn in array array[
    'admin_create_event_package(text,text,text,text,text,text,text,int,int,int,text,text,text,text,text,text,text,text,text,text[],text)',
    'admin_update_event_package(bigint,text,text,text,text,text,text,int,int,int,text,text,text,text,text,text,text,text,text,text[],text)'
  ] loop
    execute format('revoke all on function public.%s from anon;', fn);
    execute format('grant execute on function public.%s to authenticated;', fn);
  end loop;
end $$;

-- ── 6) RPC đọc Version History ──
drop function if exists public.admin_list_event_package_history(bigint);
create or replace function public.admin_list_event_package_history(p_id bigint)
returns table(version int, admin_email text, snapshot jsonb, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query select h.version, u.email::text, h.snapshot, h.created_at
  from public.event_package_history h
  left join auth.users u on u.id = h.admin_id
  where h.event_package_id = p_id
  order by h.created_at desc;
end; $$;
grant execute on function public.admin_list_event_package_history(bigint) to authenticated;

-- ── 7) Backfill: mỗi event_package hiện có ghi 1 dòng history "phiên bản hiện tại" để Version
-- History không trống ngay từ đầu (không có admin_id vì không rõ ai đã tạo trước khi có bảng này).
insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select p.id, p.version, null, json_build_object(
  'event_key', p.event_key, 'category', p.category, 'display_name', p.display_name, 'icon', p.icon,
  'element', p.element, 'calendar_type', p.calendar_type, 'date_rule', p.date_rule, 'priority', p.priority,
  'show_before_days', p.show_before_days, 'show_after_days', p.show_after_days, 'meaning', p.meaning,
  'do_text', p.do_text, 'avoid_text', p.avoid_text, 'theme_color', p.theme_color,
  'checklist_text', p.checklist_text, 'faq_text', p.faq_text, 'offering_text', p.offering_text,
  'prayer_text', p.prayer_text, 'xuat_hanh_basis', p.xuat_hanh_basis, 'tags', p.tags,
  'prompt_template', p.prompt_template
)::jsonb
from public.event_packages p
where not exists (select 1 from public.event_package_history h where h.event_package_id = p.id);

notify pgrst, 'reload schema';
