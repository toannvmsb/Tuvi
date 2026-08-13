-- ════════════════════════════════════════════════════════════════
--  SỰ KIỆN SẮP TỚI — V3: "Mâm cúng / Lễ vật" (offering_text) và "Bài cúng" (prayer_text)
--  cho event_packages — chi tiết hóa nội dung "Dành riêng cho bạn" theo phong tục Việt Nam,
--  đặc biệt các lễ truyền thống lớn.
--
--  Chạy SAU `supabase_life_events.sql` (v1) và `supabase_life_events_v2.sql` (v2).
--  Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ → Run.
--
--  ⚠ prayer_text (bài cúng/văn khấn) CHƯA có nội dung ở đây — anh Toàn tự nhập qua trang admin
--  "Sự kiện" (mục Bài cúng) vì đây là văn bản nghi lễ cần đúng nguyên văn. offering_text (mâm
--  cúng/lễ vật) đã seed sẵn cho 5 lễ lớn — nội dung phổ biến, không mang tính nghi lễ đặc thù.
-- ════════════════════════════════════════════════════════════════

-- ── 1) Cột mới ──
alter table public.event_packages add column if not exists offering_text text;
alter table public.event_packages add column if not exists prayer_text text;

-- ── 2) Đưa 2 cột mới vào RPC đọc + ghi (đổi cột trả về → phải drop trước) ──
drop function if exists public.list_active_event_packages();
create or replace function public.list_active_event_packages()
returns table(
  event_key text, category text, display_name text, icon text, element text,
  calendar_type text, date_rule text, priority int, show_before_days int, show_after_days int,
  meaning text, do_text text, avoid_text text, theme_color text,
  checklist_text text, faq_text text, offering_text text, prayer_text text
)
language sql stable security definer set search_path = public as $$
  select p.event_key, p.category, p.display_name, p.icon, p.element,
         p.calendar_type, p.date_rule, p.priority, p.show_before_days, p.show_after_days,
         p.meaning, p.do_text, p.avoid_text, p.theme_color, p.checklist_text, p.faq_text,
         p.offering_text, p.prayer_text
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
  checklist_text text, faq_text text, offering_text text, prayer_text text
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query select p.id, p.event_key, p.category, p.display_name, p.icon, p.element,
    p.calendar_type, p.date_rule, p.priority, p.show_before_days, p.show_after_days,
    p.meaning, p.do_text, p.avoid_text, p.theme_color, p.active, p.updated_at,
    p.checklist_text, p.faq_text, p.offering_text, p.prayer_text
  from public.event_packages p
  where coalesce(p_search,'') = '' or p.display_name ilike '%'||p_search||'%' or p.event_key ilike '%'||p_search||'%'
  order by p.category, p.priority desc
  limit greatest(1, least(p_limit, 500));
end; $$;

drop function if exists public.admin_create_event_package(text,text,text,text,text,text,text,int,int,int,text,text,text,text,text,text);
create or replace function public.admin_create_event_package(
  p_event_key text, p_category text, p_display_name text, p_icon text, p_element text,
  p_calendar_type text, p_date_rule text, p_priority int, p_show_before_days int,
  p_show_after_days int, p_meaning text, p_do_text text, p_avoid_text text default null,
  p_theme_color text default null, p_checklist_text text default null, p_faq_text text default null,
  p_offering_text text default null, p_prayer_text text default null
) returns bigint language plpgsql security definer set search_path = public as $$
declare new_id bigint;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_category not in ('traditional','solarterm') then raise exception 'bad_category'; end if;
  if p_calendar_type not in ('lunar','solar','solarterm') then raise exception 'bad_calendar_type'; end if;
  insert into public.event_packages(event_key, category, display_name, icon, element, calendar_type,
    date_rule, priority, show_before_days, show_after_days, meaning, do_text, avoid_text, theme_color,
    checklist_text, faq_text, offering_text, prayer_text)
  values (p_event_key, p_category, p_display_name, p_icon, p_element, p_calendar_type,
    p_date_rule, p_priority, p_show_before_days, p_show_after_days, p_meaning, p_do_text, p_avoid_text, p_theme_color,
    p_checklist_text, p_faq_text, p_offering_text, p_prayer_text)
  returning id into new_id;
  perform public.admin_log('create_event_package', null,
    json_build_object('id', new_id, 'event_key', p_event_key)::jsonb);
  return new_id;
end; $$;

drop function if exists public.admin_update_event_package(bigint,text,text,text,text,text,text,int,int,int,text,text,text,text,text,text);
create or replace function public.admin_update_event_package(
  p_id bigint, p_category text, p_display_name text, p_icon text, p_element text,
  p_calendar_type text, p_date_rule text, p_priority int, p_show_before_days int,
  p_show_after_days int, p_meaning text, p_do_text text, p_avoid_text text default null,
  p_theme_color text default null, p_checklist_text text default null, p_faq_text text default null,
  p_offering_text text default null, p_prayer_text text default null
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
    checklist_text = p_checklist_text, faq_text = p_faq_text,
    offering_text = p_offering_text, prayer_text = p_prayer_text, updated_at = now()
  where id = p_id;
  if not found then raise exception 'event_package_not_found'; end if;
  perform public.admin_log('update_event_package', null, json_build_object('id', p_id)::jsonb);
end; $$;

do $$
declare fn text;
begin
  foreach fn in array array[
    'admin_create_event_package(text,text,text,text,text,text,text,int,int,int,text,text,text,text,text,text,text,text)',
    'admin_update_event_package(bigint,text,text,text,text,text,text,int,int,int,text,text,text,text,text,text,text,text)'
  ] loop
    execute format('revoke all on function public.%s from anon;', fn);
    execute format('grant execute on function public.%s to authenticated;', fn);
  end loop;
end $$;

-- ── 3) Seed "Mâm cúng / Lễ vật" cho 5 lễ lớn (nội dung phổ biến, không phải văn khấn) ──
-- prayer_text CỐ Ý để trống — anh Toàn tự nhập qua admin.
update public.event_packages set offering_text =
  'Mâm cúng ngoài trời (cúng trời đất, chư vị thần linh): gà trống luộc nguyên con, xôi hoặc bánh chưng, rượu, trà, hoa tươi, trầu cau, vàng mã, nhang đèn
Mâm cúng trong nhà (cúng gia tiên): mâm cỗ mặn hoặc chay tùy gia đình, hoa quả, bánh kẹo
Nên cúng đúng thời khắc giao thừa (0 giờ)'
where event_key = 'giao_thua';

update public.event_packages set offering_text =
  'Mâm cỗ cúng Tất niên/mùng 1: bánh chưng hoặc bánh tét, giò chả, gà luộc, xôi gấc, mâm ngũ quả, hoa tươi (đào/mai/quất), trầu cau, rượu, nhang đèn
Chuẩn bị sẵn lì xì mừng tuổi trước Tết'
where event_key = 'tet_nguyen_dan';

update public.event_packages set offering_text =
  'Mâm cúng: cá chép sống hoặc cá chép giấy (3 con), mũ áo Táo quân, xôi, chè, hoa quả, trầu cau, nhang đèn, vàng mã
Sau khi cúng, thả cá chép sống ra sông/hồ (phóng sinh), không thả từ trên cao xuống'
where event_key = 'ong_cong_ong_tao';

update public.event_packages set offering_text =
  'Mâm cúng: heo quay hoặc thịt heo luộc, tôm/cua, trứng luộc, hoa quả tươi, hoa tươi, nước, rượu, vàng mã, nhang đèn
Lau dọn sạch sẽ bàn thờ Thần Tài - Thổ Địa trước khi cúng'
where event_key = 'via_than_tai';

update public.event_packages set offering_text =
  'Mâm cúng chay hoặc mặn tùy gia đình: xôi, chè, hoa quả, hoa tươi, trầu cau, nhang đèn
Nên đi chùa lễ Phật, cầu an đầu năm'
where event_key = 'ram_thang_gieng';

notify pgrst, 'reload schema';
