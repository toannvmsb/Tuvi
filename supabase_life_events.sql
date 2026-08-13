-- ════════════════════════════════════════════════════════════════
--  SỰ KIỆN SẮP TỚI — CMS lễ Tết + 24 tiết khí (event_packages) và
--  sự kiện cá nhân của người dùng (user_events).
--
--  Kiến trúc: bảng này CHỈ lưu NỘI DUNG (ý nghĩa, nên làm/tránh, ưu tiên, cửa sổ hiển thị)
--  và "công thức ngày" (date_rule). App tự tính ngày xảy ra cụ thể mỗi năm (âm→dương qua
--  lunarCalendar.ts, tiết khí qua solarTerms.ts) + cá nhân hóa theo lá số — KHÔNG tính toán
--  lịch/Bát Tự trong SQL. Xem thêm src/core/lifeEventEngine.ts.
--
--  Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ → Run.
--  (Chạy sau supabase_admin.sql — cần is_admin()/admin_log() đã có.)
-- ════════════════════════════════════════════════════════════════

-- ── 1) BẢNG EVENT PACKAGES (seed CMS: lễ Tết + tiết khí) ──
create table if not exists public.event_packages (
  id                bigserial primary key,
  event_key         text not null unique,
  category          text not null check (category in ('traditional', 'solarterm')),
  display_name      text not null,
  icon              text not null default '📅',
  element           text not null check (element in ('Kim','Mộc','Thủy','Hỏa','Thổ')),
  calendar_type     text not null check (calendar_type in ('lunar', 'solar', 'solarterm')),
  date_rule         text not null,        -- 'MM-DD' cho lunar/solar; '0'..'23' (thứ tự lịch) cho solarterm
  priority          int not null default 40,
  show_before_days  int not null default 7,
  show_after_days   int not null default 1,
  meaning           text not null,
  do_text           text,                 -- các ý cách nhau bằng xuống dòng, hiện dạng bullet trong app
  avoid_text        text,                 -- null = không có kiêng kỵ dân gian rõ rệt
  theme_color       text,
  active            boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists event_packages_active_idx on public.event_packages(active, category);

alter table public.event_packages enable row level security;
-- Người dùng KHÔNG đọc trực tiếp bảng — chỉ qua RPC bên dưới.

-- ── Người dùng: lấy toàn bộ event package đang bật (nội dung công khai, không cá nhân) ──
drop function if exists public.list_active_event_packages();
create or replace function public.list_active_event_packages()
returns table(
  event_key text, category text, display_name text, icon text, element text,
  calendar_type text, date_rule text, priority int, show_before_days int, show_after_days int,
  meaning text, do_text text, avoid_text text, theme_color text
)
language sql stable security definer set search_path = public as $$
  select p.event_key, p.category, p.display_name, p.icon, p.element,
         p.calendar_type, p.date_rule, p.priority, p.show_before_days, p.show_after_days,
         p.meaning, p.do_text, p.avoid_text, p.theme_color
  from public.event_packages p
  where p.active
  order by p.priority desc;
$$;
grant execute on function public.list_active_event_packages() to anon, authenticated;

-- ── Admin: liệt kê đầy đủ (kể cả đã tắt) ──
create or replace function public.admin_list_event_packages(p_search text default '', p_limit int default 200)
returns table(
  id bigint, event_key text, category text, display_name text, icon text, element text,
  calendar_type text, date_rule text, priority int, show_before_days int, show_after_days int,
  meaning text, do_text text, avoid_text text, theme_color text, active boolean, updated_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query select p.id, p.event_key, p.category, p.display_name, p.icon, p.element,
    p.calendar_type, p.date_rule, p.priority, p.show_before_days, p.show_after_days,
    p.meaning, p.do_text, p.avoid_text, p.theme_color, p.active, p.updated_at
  from public.event_packages p
  where coalesce(p_search,'') = '' or p.display_name ilike '%'||p_search||'%' or p.event_key ilike '%'||p_search||'%'
  order by p.category, p.priority desc
  limit greatest(1, least(p_limit, 500));
end; $$;

-- ── Admin: tạo mới ──
create or replace function public.admin_create_event_package(
  p_event_key text, p_category text, p_display_name text, p_icon text, p_element text,
  p_calendar_type text, p_date_rule text, p_priority int, p_show_before_days int,
  p_show_after_days int, p_meaning text, p_do_text text, p_avoid_text text default null,
  p_theme_color text default null
) returns bigint language plpgsql security definer set search_path = public as $$
declare new_id bigint;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_category not in ('traditional','solarterm') then raise exception 'bad_category'; end if;
  if p_calendar_type not in ('lunar','solar','solarterm') then raise exception 'bad_calendar_type'; end if;
  insert into public.event_packages(event_key, category, display_name, icon, element, calendar_type,
    date_rule, priority, show_before_days, show_after_days, meaning, do_text, avoid_text, theme_color)
  values (p_event_key, p_category, p_display_name, p_icon, p_element, p_calendar_type,
    p_date_rule, p_priority, p_show_before_days, p_show_after_days, p_meaning, p_do_text, p_avoid_text, p_theme_color)
  returning id into new_id;
  perform public.admin_log('create_event_package', null,
    json_build_object('id', new_id, 'event_key', p_event_key)::jsonb);
  return new_id;
end; $$;

-- ── Admin: sửa nội dung (form sửa gửi đủ toàn bộ trường) ──
create or replace function public.admin_update_event_package(
  p_id bigint, p_category text, p_display_name text, p_icon text, p_element text,
  p_calendar_type text, p_date_rule text, p_priority int, p_show_before_days int,
  p_show_after_days int, p_meaning text, p_do_text text, p_avoid_text text default null,
  p_theme_color text default null
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
    updated_at = now()
  where id = p_id;
  if not found then raise exception 'event_package_not_found'; end if;
  perform public.admin_log('update_event_package', null, json_build_object('id', p_id)::jsonb);
end; $$;

-- ── Admin: bật/tắt ──
create or replace function public.admin_set_event_package_active(p_id bigint, p_active boolean)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  update public.event_packages set active = p_active, updated_at = now() where id = p_id;
  if not found then raise exception 'event_package_not_found'; end if;
  perform public.admin_log('set_event_package_active', null,
    json_build_object('id', p_id, 'active', p_active)::jsonb);
  return p_active;
end; $$;

-- ── Admin: xóa vĩnh viễn ──
create or replace function public.admin_delete_event_package(p_id bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  delete from public.event_packages where id = p_id;
  if not found then raise exception 'event_package_not_found'; end if;
  perform public.admin_log('delete_event_package', null, json_build_object('id', p_id)::jsonb);
end; $$;

do $$
declare fn text;
begin
  foreach fn in array array[
    'admin_list_event_packages(text,int)',
    'admin_create_event_package(text,text,text,text,text,text,text,int,int,int,text,text,text,text)',
    'admin_update_event_package(bigint,text,text,text,text,text,text,int,int,int,text,text,text,text)',
    'admin_set_event_package_active(bigint,boolean)',
    'admin_delete_event_package(bigint)'
  ] loop
    execute format('revoke all on function public.%s from anon;', fn);
    execute format('grant execute on function public.%s to authenticated;', fn);
  end loop;
end $$;

-- ── 2) BẢNG USER EVENTS (sự kiện cá nhân — sinh nhật, cưới hỏi, khai trương...) ──
create table if not exists public.user_events (
  id              bigserial primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  chart_id        uuid references public.charts(id) on delete set null,
  event_type      text not null check (event_type in ('birthday','wedding','moving','opening','exam','custom')),
  title           text not null,
  calendar_type   text not null check (calendar_type in ('lunar','solar')),
  event_date      date not null,          -- ngày gốc; nếu repeat_yearly thì chỉ tháng/ngày được dùng lại mỗi năm
  repeat_yearly   boolean not null default true,
  show_before_days int not null default 7,
  note            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists user_events_user_idx on public.user_events(user_id);

alter table public.user_events enable row level security;
-- Không mở policy trực tiếp — kể cả CRUD của chính chủ cũng qua RPC (đúng quy ước đã dùng cho
-- vouchers/broadcasts trong app này), để mọi thao tác ghi đi qua 1 nơi thống nhất, dễ audit/mở rộng.

create or replace function public.list_my_user_events()
returns table(
  id bigint, chart_id uuid, event_type text, title text, calendar_type text,
  event_date date, repeat_yearly boolean, show_before_days int, note text, created_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  return query select e.id, e.chart_id, e.event_type, e.title, e.calendar_type,
    e.event_date, e.repeat_yearly, e.show_before_days, e.note, e.created_at
  from public.user_events e where e.user_id = uid order by e.created_at desc;
end; $$;

create or replace function public.create_user_event(
  p_event_type text, p_title text, p_calendar_type text, p_event_date date,
  p_repeat_yearly boolean default true, p_show_before_days int default 7,
  p_note text default null, p_chart_id uuid default null
) returns bigint language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); new_id bigint;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if p_event_type not in ('birthday','wedding','moving','opening','exam','custom') then raise exception 'bad_event_type'; end if;
  if p_calendar_type not in ('lunar','solar') then raise exception 'bad_calendar_type'; end if;
  insert into public.user_events(user_id, chart_id, event_type, title, calendar_type,
    event_date, repeat_yearly, show_before_days, note)
  values (uid, p_chart_id, p_event_type, p_title, p_calendar_type,
    p_event_date, p_repeat_yearly, p_show_before_days, p_note)
  returning id into new_id;
  return new_id;
end; $$;

create or replace function public.update_user_event(
  p_id bigint, p_title text, p_calendar_type text, p_event_date date,
  p_repeat_yearly boolean, p_show_before_days int, p_note text default null
) returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if p_calendar_type not in ('lunar','solar') then raise exception 'bad_calendar_type'; end if;
  update public.user_events set title = p_title, calendar_type = p_calendar_type,
    event_date = p_event_date, repeat_yearly = p_repeat_yearly,
    show_before_days = p_show_before_days, note = p_note, updated_at = now()
  where id = p_id and user_id = uid;
  if not found then raise exception 'user_event_not_found'; end if;
end; $$;

create or replace function public.delete_user_event(p_id bigint)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  delete from public.user_events where id = p_id and user_id = uid;
  if not found then raise exception 'user_event_not_found'; end if;
end; $$;

revoke all on function public.list_my_user_events() from anon;
revoke all on function public.create_user_event(text,text,text,date,boolean,int,text,uuid) from anon;
revoke all on function public.update_user_event(bigint,text,text,date,boolean,int,text) from anon;
revoke all on function public.delete_user_event(bigint) from anon;
grant execute on function public.list_my_user_events() to authenticated;
grant execute on function public.create_user_event(text,text,text,date,boolean,int,text,uuid) to authenticated;
grant execute on function public.update_user_event(bigint,text,text,date,boolean,int,text) to authenticated;
grant execute on function public.delete_user_event(bigint) to authenticated;

-- ── 3) SEED DATA — 15 lễ Tết truyền thống ──
insert into public.event_packages (event_key, category, display_name, icon, element, calendar_type, date_rule, priority, show_before_days, show_after_days, meaning, do_text, avoid_text, theme_color) values
('tet_nguyen_dan', 'traditional', 'Tết Nguyên Đán', '🧧', 'Mộc', 'lunar', '01-01', 80, 30, 3,
 'Năm mới, đoàn viên gia đình, khởi đầu một chu kỳ mới.',
 'Chúc Tết người thân
Mở hàng đầu năm
Mặc đồ mới
Đi lễ chùa đầu năm',
 'Cãi vã, to tiếng
Làm vỡ đồ đạc
Quét nhà ngày mùng 1
Vay mượn tiền bạc',
 '#D64545'),
('giao_thua', 'traditional', 'Giao thừa', '🎆', 'Thổ', 'lunar', '12-30', 80, 3, 1,
 'Thời khắc tiễn năm cũ, đón năm mới.',
 'Cúng giao thừa
Dọn dẹp bàn thờ gia tiên
Xông đất (nếu hợp tuổi)',
 'Để đèn tắt qua đêm giao thừa
Còn nợ nần chưa thanh toán',
 '#6B4FA0'),
('ong_cong_ong_tao', 'traditional', 'Ông Công Ông Táo', '🐟', 'Hỏa', 'lunar', '12-23', 60, 7, 1,
 'Tiễn Táo quân về trời báo cáo việc nhà trong năm.',
 'Dọn dẹp bếp sạch sẽ
Cúng cá chép
Thả cá phóng sinh',
 'Cúng sau 12 giờ trưa ngày 23 tháng Chạp',
 '#E08A2B'),
('ram_thang_gieng', 'traditional', 'Rằm tháng Giêng', '🏮', 'Mộc', 'lunar', '01-15', 60, 7, 1,
 '"Cúng cả năm không bằng Rằm tháng Giêng" — ngày rằm quan trọng nhất năm.',
 'Đi chùa cầu an
Cúng rằm đầy đủ
Dâng sao giải hạn',
 'Sát sinh
Để nhà cửa bừa bộn khi cúng',
 '#C9962B'),
('via_than_tai', 'traditional', 'Vía Thần Tài', '🪙', 'Kim', 'lunar', '01-10', 60, 7, 1,
 'Ngày cầu tài lộc, mong việc làm ăn thuận lợi cả năm.',
 'Mua vàng lấy vía
Mở hàng đầu ngày
Lau dọn bàn thờ Thần Tài',
 'Cho vay hoặc đi mượn tiền
Làm đổ vỡ đồ đạc đầu ngày',
 '#D4A017'),
('tet_han_thuc', 'traditional', 'Tết Hàn Thực', '🍡', 'Thủy', 'lunar', '03-03', 40, 7, 1,
 'Ngày tưởng nhớ tổ tiên, ăn đồ nguội theo tích cổ.',
 'Làm bánh trôi, bánh chay cúng gia tiên',
 null,
 '#4C7FA0'),
('gio_to_hung_vuong', 'traditional', 'Giỗ Tổ Hùng Vương', '🏛️', 'Thổ', 'lunar', '03-10', 40, 7, 1,
 '"Dù ai đi ngược về xuôi / Nhớ ngày Giỗ Tổ mùng mười tháng Ba" — quốc lễ tưởng nhớ cội nguồn.',
 'Tưởng nhớ cội nguồn
Về quê, dâng hương',
 null,
 '#8A6D3B'),
('tet_doan_ngo', 'traditional', 'Tết Đoan Ngọ', '🌾', 'Hỏa', 'lunar', '05-05', 60, 7, 1,
 '"Diệt sâu bọ" — giữa năm, thời điểm dương khí thịnh nhất trong năm.',
 'Ăn cơm rượu nếp, trái cây chua vào buổi sáng sớm',
 'Ra ngoài giữa trưa nắng gắt (dương khí đỉnh điểm)',
 '#C74B3C'),
('vu_lan', 'traditional', 'Lễ Vu Lan', '🪷', 'Thủy', 'lunar', '07-15', 60, 7, 1,
 'Báo hiếu cha mẹ, xá tội vong nhân.',
 'Cài hoa hồng
Đi chùa, phóng sinh
Thăm hỏi cha mẹ',
 'Đi chơi khuya
Sát sinh
Để nhà cửa tối tăm',
 '#5B8C5A'),
('trung_thu', 'traditional', 'Tết Trung Thu', '🌕', 'Kim', 'lunar', '08-15', 80, 15, 1,
 'Đoàn viên, Tết thiếu nhi, trăng tròn nhất năm.',
 'Phá cỗ
Rước đèn
Tặng quà trẻ nhỏ',
 null,
 '#E8A33D'),
('trung_cuu', 'traditional', 'Tết Trùng Cửu', '🍂', 'Kim', 'lunar', '09-09', 40, 7, 1,
 'Trùng dương — theo cổ tục là ngày leo cao để tránh tai ương.',
 'Leo núi, lên cao
Ngắm cảnh
Uống trà hoa cúc',
 null,
 '#B08040'),
('ram_thang_10', 'traditional', 'Rằm tháng Mười (Tết Hạ Nguyên)', '🌾', 'Thủy', 'lunar', '10-15', 40, 7, 1,
 'Cúng cơm mới, tạ ơn trời đất một mùa vụ được mùa.',
 'Cúng cơm mới
Tạ ơn gia tiên',
 null,
 '#4C7FA0'),
('tet_duong_lich', 'traditional', 'Tết Dương lịch', '🎊', 'Mộc', 'solar', '01-01', 40, 7, 1,
 'Khởi đầu năm mới theo lịch dương, phổ biến trong đời sống hiện đại.',
 'Đặt mục tiêu năm mới
Tổng kết năm cũ',
 null,
 '#3B6B8C'),
('le_phat_dan', 'traditional', 'Lễ Phật Đản', '☸️', 'Mộc', 'lunar', '04-15', 40, 7, 1,
 'Ngày kỷ niệm Đức Phật đản sinh, hướng con người tới điều thiện và sự tĩnh tâm.',
 'Ăn chay
Phóng sinh
Đi chùa, làm việc thiện',
 'Sát sinh
Tranh cãi, nóng giận',
 '#D4A017'),
('giang_sinh', 'traditional', 'Giáng Sinh', '🎄', 'Thủy', 'solar', '12-25', 40, 7, 1,
 'Lễ hội cuối năm phổ biến trong đời sống hiện đại, dịp đoàn viên và sẻ chia.',
 'Tụ họp gia đình, bạn bè
Tặng quà
Làm việc thiện',
 null,
 '#3B6B8C')
on conflict (event_key) do nothing;

-- ── 4) SEED DATA — 24 tiết khí (date_rule = thứ tự trong SOLAR_TERM_NAMES, xem src/core/solarTerms.ts) ──
insert into public.event_packages (event_key, category, display_name, icon, element, calendar_type, date_rule, priority, show_before_days, show_after_days, meaning, do_text, avoid_text, theme_color) values
('lap_xuan',    'solarterm', 'Lập Xuân',    '🌱', 'Mộc',  'solarterm', '0',  20, 3, 1, 'Tiết khí đầu tiên trong năm, dương khí bắt đầu sinh, mùa xuân khởi đầu.', 'Dậy sớm đón khí xuân
Ăn nhẹ, giải hàn', null, '#7BAE5E'),
('vu_thuy',     'solarterm', 'Vũ Thủy',     '🌧️', 'Mộc',  'solarterm', '1',  20, 3, 1, 'Mưa ẩm tăng dần, đất trời chuyển ẩm.', 'Giữ ấm vùng bụng
Ăn uống ấm nóng', 'Đồ ăn sống lạnh', '#7BAE5E'),
('kinh_trap',   'solarterm', 'Kinh Trập',   '⚡', 'Mộc',  'solarterm', '2',  20, 3, 1, 'Sấm bắt đầu dậy, sâu bọ tỉnh giấc, dương khí tăng mạnh.', 'Vận động ngoài trời vào buổi sáng', null, '#7BAE5E'),
('xuan_phan',   'solarterm', 'Xuân Phân',   '⚖️', 'Mộc',  'solarterm', '3',  20, 3, 1, 'Giữa mùa xuân, ngày và đêm dài bằng nhau — thời điểm cân bằng âm dương.', 'Ăn uống điều độ, giữ cân bằng', null, '#7BAE5E'),
('thanh_minh',  'solarterm', 'Thanh Minh',  '🌤️', 'Mộc',  'solarterm', '4',  20, 3, 1, 'Tiết trời trong sáng, mát mẻ — thời điểm truyền thống đi tảo mộ.', 'Tảo mộ, thăm viếng tổ tiên
Đi lại, du xuân', null, '#7BAE5E'),
('coc_vu',      'solarterm', 'Cốc Vũ',      '🌦️', 'Mộc',  'solarterm', '5',  20, 3, 1, 'Mưa rào xuất hiện nhiều, nuôi dưỡng mùa màng — cuối xuân.', 'Chuẩn bị tinh thần chuyển sang hè', null, '#7BAE5E'),
('lap_ha',      'solarterm', 'Lập Hạ',      '☀️', 'Hỏa',  'solarterm', '6',  20, 3, 1, 'Bắt đầu mùa hè, dương khí tiếp tục tăng.', 'Dưỡng tâm, giữ tinh thần thư thái', 'Nóng vội, gắng sức quá mức', '#D9713C'),
('tieu_man',    'solarterm', 'Tiểu Mãn',    '🌾', 'Hỏa',  'solarterm', '7',  20, 3, 1, 'Nắng tăng dần, lúa bắt đầu chắc hạt.', 'Uống đủ nước mỗi ngày', 'Ra nắng gắt giữa trưa', '#D9713C'),
('mang_chung',  'solarterm', 'Mang Chủng',  '🌾', 'Hỏa',  'solarterm', '8',  20, 3, 1, 'Mùa vụ bận rộn nhất năm bắt đầu.', 'Sắp xếp nghỉ ngơi hợp lý giữa công việc', null, '#D9713C'),
('ha_chi',      'solarterm', 'Hạ Chí',      '🔆', 'Hỏa',  'solarterm', '9',  20, 3, 1, 'Ngày dài nhất năm, dương khí đạt đỉnh điểm.', 'Ngủ đủ giấc', 'Thức khuya', '#D9713C'),
('tieu_thu',    'solarterm', 'Tiểu Thử',    '🥵', 'Hỏa',  'solarterm', '10', 20, 3, 1, 'Nóng bắt đầu gay gắt.', 'Ăn thanh đạm', 'Đồ ăn nhiều dầu mỡ', '#D9713C'),
('dai_thu',     'solarterm', 'Đại Thử',     '🔥', 'Hỏa',  'solarterm', '11', 20, 3, 1, 'Nóng nhất năm.', 'Nghỉ ngơi giữa trưa, bù đủ nước', 'Hoạt động ngoài trời giữa trưa nắng gắt', '#D9713C'),
('lap_thu',     'solarterm', 'Lập Thu',     '🍁', 'Kim',  'solarterm', '12', 20, 3, 1, 'Bắt đầu mùa thu, dương khí giảm dần.', 'Dưỡng phổi, hít thở sâu', null, '#C9A227'),
('xu_thu',      'solarterm', 'Xử Thử',      '🍃', 'Kim',  'solarterm', '13', 20, 3, 1, 'Hết nóng, thời tiết dễ chịu hơn.', 'Ngủ đủ giấc', null, '#C9A227'),
('bach_lo',     'solarterm', 'Bạch Lộ',     '💧', 'Kim',  'solarterm', '14', 20, 3, 1, 'Sương trắng xuất hiện, sáng sớm bắt đầu se lạnh.', 'Giữ ấm vào buổi sáng sớm', null, '#C9A227'),
('thu_phan',    'solarterm', 'Thu Phân',    '⚖️', 'Kim',  'solarterm', '15', 20, 3, 1, 'Giữa mùa thu, ngày và đêm lại bằng nhau.', 'Cân bằng âm dương lần 2 trong năm', null, '#C9A227'),
('han_lo',      'solarterm', 'Hàn Lộ',      '🌫️', 'Kim',  'solarterm', '16', 20, 3, 1, 'Sương lạnh hơn, trời se lạnh rõ rệt.', 'Tăng đồ giữ ấm
Ăn bổ phế', null, '#C9A227'),
('suong_giang', 'solarterm', 'Sương Giáng', '❄️', 'Kim',  'solarterm', '17', 20, 3, 1, 'Sương muối xuất hiện, cuối thu chuẩn bị chuyển sang đông.', 'Chuẩn bị đồ giữ ấm cho mùa đông', null, '#C9A227'),
('lap_dong',    'solarterm', 'Lập Đông',    '🍂', 'Thủy', 'solarterm', '18', 20, 3, 1, 'Bắt đầu mùa đông.', 'Dưỡng thận, tẩm bổ cơ thể', null, '#4C7FA0'),
('tieu_tuyet',  'solarterm', 'Tiểu Tuyết',  '🌨️', 'Thủy', 'solarterm', '19', 20, 3, 1, 'Lạnh tăng rõ rệt.', 'Giữ ấm chân tay
Ngủ sớm', null, '#4C7FA0'),
('dai_tuyet',   'solarterm', 'Đại Tuyết',   '🌨️', 'Thủy', 'solarterm', '20', 20, 3, 1, 'Rét đậm hơn.', 'Hạn chế ra ngoài sáng sớm, giữ ấm kỹ', null, '#4C7FA0'),
('dong_chi',    'solarterm', 'Đông Chí',    '🌑', 'Thủy', 'solarterm', '21', 20, 3, 1, 'Đêm dài nhất năm, âm khí đạt đỉnh điểm.', 'Tĩnh dưỡng, nghỉ ngơi nhiều hơn', null, '#4C7FA0'),
('tieu_han',    'solarterm', 'Tiểu Hàn',    '🧊', 'Thủy', 'solarterm', '22', 20, 3, 1, 'Rét nhẹ, không khí Tết bắt đầu đến gần.', 'Giữ ấm đầu, cổ
Chuẩn bị đón Tết', null, '#4C7FA0'),
('dai_han',     'solarterm', 'Đại Hàn',     '🧊', 'Thủy', 'solarterm', '23', 20, 3, 1, 'Rét đậm nhất năm.', 'Giữ ấm toàn thân', 'Ra ngoài đêm khuya', '#4C7FA0')
on conflict (event_key) do nothing;

notify pgrst, 'reload schema';
