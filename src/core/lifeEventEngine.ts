/**
 * RULE ENGINE "Sự kiện sắp tới" — chọn ĐÚNG 1 sự kiện ưu tiên cao nhất để hiện trên Home
 * (Business Rule trong TUZI_M04: "Home chỉ hiển thị 01 Event Card ưu tiên cao nhất").
 *
 * Chạy hoàn toàn client-side: nhận seed content (event_packages) + sự kiện cá nhân
 * (user_events) đã tải từ Supabase, tự tính ngày xảy ra gần nhất (âm→dương qua
 * lunarCalendar.ts, tiết khí qua solarTerms.ts), lọc theo cửa sổ hiển thị, rồi xếp ưu tiên.
 */
import type { FiveElement } from '../types';
import { solarToLunar, lunarToSolar } from './lunarCalendar';
import { getSolarTermDate } from './solarTerms';
import type { DirectionGodsBasis } from './directionGods';

export type EventCategory = 'traditional' | 'solarterm';
export type EventCalendarType = 'lunar' | 'solar' | 'solarterm';
export type UserEventType =
  | 'birthday' | 'wedding' | 'moving' | 'opening' | 'exam' | 'custom'
  | 'death_anniversary' | 'contract' | 'graduation'
  // Nhóm "Lifestyle"/"Business" bổ sung theo TUZI_M04 mục 3 (Marathon/du lịch, ra mắt sản
  // phẩm/pitching) — "thiền"/"gym" là thói quen lặp lại chứ không phải 1 sự kiện có ngày cụ thể
  // nên KHÔNG thêm type riêng, dùng 'custom' nếu cần.
  | 'marathon' | 'travel' | 'product_launch' | 'pitching';

export interface EventPackage {
  event_key: string;
  category: EventCategory;
  display_name: string;
  icon: string;
  element: FiveElement;
  calendar_type: EventCalendarType;
  date_rule: string;
  priority: number;
  show_before_days: number;
  show_after_days: number;
  meaning: string;
  do_text: string | null;
  avoid_text: string | null;
  theme_color: string | null;
  checklist_text: string | null;
  faq_text: string | null;
  offering_text: string | null;
  prayer_text: string | null;
  /** Cơ sở tính Hướng xuất hành dân gian — admin cấu hình riêng từng sự kiện (xem directionGods.ts). */
  xuat_hanh_basis: DirectionGodsBasis;
  /** Nhãn phân loại tự do (TUZI_M04 mục 5 "tags") — vd ['lễ lớn','miền Bắc']. */
  tags: string[];
  /** Tăng dần mỗi lần admin sửa (TUZI_M04 mục 5 "version") — dùng cho Lịch sử phiên bản ở CMS. */
  version: number;
  /** Hướng dẫn AI THÊM riêng cho sự kiện này, do admin nhập (TUZI_M04 mục 4 "AI Prompt Template").
   * Đây KHÔNG thay thế toàn bộ prompt — chỉ chèn thêm 1 chỉ dẫn có kiểm soát, để không phá khung
   * DỮ KIỆN CỐ ĐỊNH / quy tắc Nam Phái đã cố định cứng trong `aiAnalysis.ts` (xem CLAUDE.md 2.4). */
  prompt_template: string | null;
}

export interface UserEvent {
  id: number;
  chart_id: string | null;
  event_type: UserEventType;
  title: string;
  calendar_type: 'lunar' | 'solar';
  event_date: string; // ISO date (yyyy-mm-dd)
  repeat_yearly: boolean;
  show_before_days: number;
  note: string | null;
  created_at: string;
  related_people: string | null;
}

export interface ResolvedEvent {
  source: 'package' | 'user';
  key: string;
  displayName: string;
  icon: string;
  element: FiveElement;
  meaning: string;
  doText: string | null;
  avoidText: string | null;
  themeColor: string | null;
  checklistText: string | null;
  faqText: string | null;
  offeringText: string | null;
  prayerText: string | null;
  xuatHanhBasis: DirectionGodsBasis;
  tags: string[];
  version: number;
  promptTemplate: string | null;
  occursOn: Date;
  daysUntil: number; // 0 = hôm nay, dương = còn N ngày, âm = đã qua N ngày (trong cửa sổ show_after)
  priority: number;
  userEvent?: UserEvent;
}

/**
 * "Timeline" theo TUZI_M04 mục 7 (show_before → preparation → countdown → event_day →
 * follow_up) — tính TOÁN từ `daysUntil`, KHÔNG cần admin soạn nội dung riêng cho từng mốc (39 sự
 * kiện × 5 mốc là quá tải biên tập) — dùng để hiện 1 nhãn giai đoạn + gợi ý mục nào nên xem trước.
 */
export type EventStageKey = 'early' | 'preparation' | 'countdown' | 'event_day' | 'follow_up';
export interface EventStage {
  key: EventStageKey;
  label: string;
}
export function eventStage(daysUntil: number): EventStage {
  if (daysUntil < 0) return { key: 'follow_up', label: '🌤️ Sau sự kiện' };
  if (daysUntil === 0) return { key: 'event_day', label: '🎉 Hôm nay' };
  if (daysUntil <= 3) return { key: 'countdown', label: '⏳ Đếm ngược' };
  if (daysUntil <= 7) return { key: 'preparation', label: '🧭 Chuẩn bị' };
  return { key: 'early', label: '🔭 Sắp tới' };
}

// Sự kiện cá nhân "sắp/đang tới" luôn thắng lễ Tết/tiết khí (đúng bảng tier đã duyệt).
export const PERSONAL_TIER_IMMINENT = 100; // hôm nay hoặc ngày mai
export const PERSONAL_TIER_UPCOMING = 90;  // còn nhiều hơn 1 ngày nhưng vẫn trong show_before_days

const USER_EVENT_ICON: Record<UserEventType, string> = {
  birthday: '🎂', wedding: '💍', moving: '🏠', opening: '🏪', exam: '📝', custom: '📌',
  death_anniversary: '🕯️', contract: '📄', graduation: '🎓',
  marathon: '🏃', travel: '✈️', product_launch: '🚀', pitching: '🎤',
};
const USER_EVENT_MEANING: Record<UserEventType, string> = {
  birthday: 'Sinh nhật bạn tự thêm — dịp nhìn lại một năm tuổi mới.',
  wedding: 'Ngày cưới hỏi bạn đã lưu.',
  moving: 'Ngày chuyển nhà bạn đã lưu.',
  opening: 'Ngày khai trương bạn đã lưu.',
  exam: 'Ngày thi cử bạn đã lưu.',
  custom: 'Sự kiện cá nhân bạn tự thêm.',
  death_anniversary: 'Ngày giỗ/kỵ giỗ bạn đã lưu — dịp tưởng nhớ người thân.',
  contract: 'Ngày ký hợp đồng/đấu thầu bạn đã lưu.',
  graduation: 'Ngày nhập học/tốt nghiệp bạn đã lưu.',
  marathon: 'Ngày chạy marathon/giải thể thao bạn đã lưu.',
  travel: 'Ngày khởi hành chuyến du lịch bạn đã lưu.',
  product_launch: 'Ngày ra mắt sản phẩm bạn đã lưu.',
  pitching: 'Ngày thuyết trình/pitching bạn đã lưu.',
};
// Advice TĨNH theo loại sự kiện — chỉ điều hướng tới đúng màn hình đã có sẵn logic, không tính lại gì mới.
const USER_EVENT_DO: Record<UserEventType, string | null> = {
  birthday: 'Xem lại Tiểu Vận / Nguyệt Vận năm tuổi mới trong mục Tiểu Vận',
  wedding: 'Kiểm tra giờ tốt và hướng theo phong thủy trước khi tổ chức, trong mục Xem ngày tốt',
  moving: 'Xem ngày tốt và hướng hợp mệnh trong mục Xem ngày tốt',
  opening: 'Xem giờ tốt mở hàng trong mục Xem ngày tốt',
  exam: 'Xem giờ tốt để ôn tập, đi thi trong mục Xem theo ngày',
  custom: null,
  death_anniversary: 'Xem ngày cúng giỗ theo âm lịch và giờ tốt trong mục Xem ngày tốt',
  contract: 'Xem giờ tốt để ký kết trong mục Xem ngày tốt',
  graduation: 'Xem giờ tốt và hướng xuất hành trong mục Xem ngày tốt',
  marathon: 'Xem giờ tốt để khởi động và hướng xuất phát thuận lợi trong mục Xem ngày tốt',
  travel: 'Xem ngày tốt và hướng xuất hành trong mục Xem ngày tốt',
  product_launch: 'Xem giờ tốt để ra mắt trong mục Xem ngày tốt',
  pitching: 'Xem giờ tốt để thuyết trình, hướng ngồi thuận lợi trong mục Xem ngày tốt',
};
// Checklist MẶC ĐỊNH theo loại sự kiện cá nhân — nội dung tĩnh trong code (user_events không có
// cột nội dung CMS như event_packages). `null` = không có gợi ý checklist sẵn cho loại đó.
export const USER_EVENT_CHECKLIST: Record<UserEventType, string[] | null> = {
  birthday: ['Chuẩn bị quà/tiệc nhỏ', 'Gửi lời chúc người thân'],
  wedding: ['Chọn ngày giờ đẹp', 'Đặt tiệc/địa điểm', 'In thiệp mời', 'Chuẩn bị trang phục', 'Xác nhận khách mời'],
  moving: ['Chọn ngày giờ tốt', 'Dọn dẹp nhà cũ', 'Sắp xếp xe chuyển đồ', 'Cúng nhập trạch'],
  opening: ['Chọn giờ tốt mở hàng', 'Chuẩn bị mâm cúng khai trương', 'Trang trí cửa hàng', 'Chuẩn bị hàng hóa'],
  exam: ['Ôn tập trọng tâm', 'Chuẩn bị giấy tờ dự thi', 'Kiểm tra giờ giấc, địa điểm thi'],
  custom: null,
  death_anniversary: ['Chuẩn bị mâm cúng', 'Mời họ hàng', 'Dọn dẹp bàn thờ'],
  contract: ['Rà soát điều khoản hợp đồng', 'Chuẩn bị hồ sơ pháp lý', 'Xác nhận thời gian, địa điểm ký'],
  graduation: ['Chuẩn bị hồ sơ nhập học/tốt nghiệp', 'Sắp xếp trang phục lễ', 'Thông báo người thân'],
  marathon: ['Chuẩn bị trang phục, giày chạy', 'Ngủ đủ giấc trước ngày thi đấu', 'Kiểm tra lộ trình, điểm tập kết'],
  travel: ['Chuẩn bị giấy tờ, hành lý', 'Đặt vé, khách sạn', 'Kiểm tra thời tiết nơi đến'],
  product_launch: ['Hoàn thiện sản phẩm/tài liệu ra mắt', 'Chuẩn bị truyền thông, sự kiện', 'Kiểm tra kênh bán hàng'],
  pitching: ['Chuẩn bị slide, tài liệu', 'Luyện tập thuyết trình', 'Kiểm tra thiết bị trình chiếu'],
};

function daysBetween(now: Date, target: Date): number {
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const b = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  return Math.round((b - a) / 86400000);
}

/**
 * Trong dải ứng viên (thường 3 mốc năm liền kề), chọn mốc SỚM NHẤT vẫn còn nằm trong tầm
 * "chưa quá hạn" (>= now trừ đi `graceDaysBack` ngày ân hạn). Đây KHÔNG phải "gần nhất theo trị
 * tuyệt đối" — vd còn 7 tháng nữa tới Giáng Sinh phải thắng Giáng Sinh của 5 tháng TRƯỚC đó, dù
 * xét theo khoảng cách thời gian tuyệt đối thì mốc đã qua đôi khi "gần" hơn.
 */
type OccurrencePicker = (candidates: Date[], now: Date, graceDaysBack: number) => Date;

function pickNearestUpcoming(candidates: Date[], now: Date, graceDaysBack: number): Date {
  const threshold = new Date(now.getFullYear(), now.getMonth(), now.getDate() - graceDaysBack).getTime();
  const sorted = [...candidates].sort((a, b) => a.getTime() - b.getTime());
  return sorted.find(d => d.getTime() >= threshold) ?? sorted[sorted.length - 1];
}

/**
 * Mốc GẦN NOW NHẤT theo khoảng cách tuyệt đối (quá khứ hay tương lai đều tính như nhau) — KHÁC
 * `pickNearestUpcoming` (luôn thiên về tương lai/sắp tới, nhảy sang năm sau nếu mốc gần đây đã
 * quá hạn ân hạn `show_after_days` riêng của sự kiện đó). Dùng cho `resolveAllUpcomingEvents` (nút
 * ‹ › duyệt lịch sử): nếu không dùng cách này, 1 sự kiện đã qua khá lâu (vd Lập Thu ~50 ngày
 * trước, trong khi show_after_days của nó chỉ vài ngày) sẽ bị tính nhầm thành "lần năm sau", xếp
 * SAU cả những sự kiện gần đây hơn (vd Tết Trung Thu) thay vì đúng vị trí thời gian thực của nó.
 */
// Tham số thứ 3 (graceDaysBack) bỏ qua — khớp chữ ký `OccurrencePicker` để truyền thẳng vào
// resolveOccurrence/resolveUserEventOccurrence mà không cần ép kiểu.
const pickNearestAbsolute: OccurrencePicker = (candidates, now) =>
  [...candidates].sort((a, b) => Math.abs(a.getTime() - now.getTime()) - Math.abs(b.getTime() - now.getTime()))[0];

/** Ngày xảy ra GẦN NHẤT (sắp tới, hoặc vừa qua trong hạn ân hạn `show_after_days`) của 1 event
 *  package. `pick` mặc định ưu tiên tương lai (dùng cho Home/thông báo) — truyền `pickNearestAbsolute`
 *  khi cần liệt kê đúng thứ tự thời gian thực (xem `resolveAllUpcomingEvents`). */
export function resolveOccurrence(pkg: EventPackage, now: Date, pick: OccurrencePicker = pickNearestUpcoming): Date {
  if (pkg.calendar_type === 'solarterm') {
    const idx = parseInt(pkg.date_rule, 10);
    const candidates = [-1, 0, 1].map(yOff => {
      const sd = getSolarTermDate(idx, now.getFullYear() + yOff);
      return new Date(sd.year, sd.month - 1, sd.day);
    });
    return pick(candidates, now, pkg.show_after_days);
  }
  const [mm, dd] = pkg.date_rule.split('-').map(Number);
  const candidates: Date[] = [];
  for (const yOff of [-1, 0, 1]) {
    const y = now.getFullYear() + yOff;
    if (pkg.calendar_type === 'lunar') {
      try {
        const sd = lunarToSolar(dd, mm, y, false);
        candidates.push(new Date(sd.year, sd.month - 1, sd.day));
      } catch { /* năm/tháng âm hiếm gặp lỗi chuyển đổi — bỏ qua mốc năm này */ }
    } else {
      candidates.push(new Date(y, mm - 1, dd));
    }
  }
  if (!candidates.length) return now;
  return pick(candidates, now, pkg.show_after_days);
}

/** Ngày xảy ra GẦN NHẤT của 1 sự kiện cá nhân — có tính lặp lại hàng năm hay không. `pick` xem
 *  giải thích ở `resolveOccurrence`. */
export function resolveUserEventOccurrence(ev: UserEvent, now: Date, pick: OccurrencePicker = pickNearestUpcoming): Date {
  const [by, bm, bd] = ev.event_date.split('-').map(Number);
  if (!ev.repeat_yearly) return new Date(by, bm - 1, bd);
  if (ev.calendar_type === 'lunar') {
    try {
      const lunarBase = solarToLunar(bd, bm, by);
      const candidates = [-1, 0, 1].map(yOff => {
        const sd = lunarToSolar(lunarBase.day, lunarBase.month, now.getFullYear() + yOff, lunarBase.isLeapMonth);
        return new Date(sd.year, sd.month - 1, sd.day);
      });
      return pick(candidates, now, 0);
    } catch {
      // rơi vào trường hợp hiếm (tháng nhuận lệch) — dùng lại tháng/ngày dương gốc làm phương án dự phòng.
    }
  }
  const candidates = [-1, 0, 1].map(yOff => new Date(now.getFullYear() + yOff, bm - 1, bd));
  return pick(candidates, now, 0);
}

// Hoist ra module-scope để dùng chung cho pickUpcomingEvent, resolveEventsOnDate,
// resolveAllUpcomingEvents (đều cần dựng ResolvedEvent theo cùng 1 khuôn).
function fromPackage(pkg: EventPackage, occursOn: Date, daysUntil: number): ResolvedEvent {
  return {
    source: 'package', key: pkg.event_key, displayName: pkg.display_name, icon: pkg.icon,
    element: pkg.element, meaning: pkg.meaning, doText: pkg.do_text, avoidText: pkg.avoid_text,
    themeColor: pkg.theme_color, checklistText: pkg.checklist_text, faqText: pkg.faq_text,
    offeringText: pkg.offering_text, prayerText: pkg.prayer_text, xuatHanhBasis: pkg.xuat_hanh_basis,
    tags: pkg.tags ?? [], version: pkg.version ?? 1, promptTemplate: pkg.prompt_template,
    occursOn, daysUntil, priority: pkg.priority,
  };
}
function fromUserEvent(ev: UserEvent, occursOn: Date, daysUntil: number): ResolvedEvent {
  return {
    source: 'user', key: `user:${ev.id}`, displayName: ev.title, icon: USER_EVENT_ICON[ev.event_type],
    element: 'Thổ', // sự kiện tự do người dùng nhập, không gắn hành cố định
    meaning: USER_EVENT_MEANING[ev.event_type], doText: USER_EVENT_DO[ev.event_type],
    avoidText: null, themeColor: null,
    checklistText: (USER_EVENT_CHECKLIST[ev.event_type] ?? null)?.join('\n') ?? null, faqText: null,
    offeringText: null, prayerText: null, xuatHanhBasis: 'day', // sự kiện cá nhân: giữ hành vi gốc theo ngày
    tags: [], version: 1, promptTemplate: null, // khái niệm CMS — không áp dụng cho sự kiện cá nhân
    occursOn, daysUntil,
    priority: daysUntil <= 1 ? PERSONAL_TIER_IMMINENT : PERSONAL_TIER_UPCOMING, userEvent: ev,
  };
}

/** Mặc định nhắc trước 5 ngày, 1 ngày, và đúng ngày diễn ra — có thể tùy chỉnh RIÊNG từng sự
 * kiện qua mục "Quản lý thông báo" (xem `lib/eventNotifyPrefs.ts`), nên đây chỉ còn là giá trị
 * MẶC ĐỊNH khi người dùng chưa tự chỉnh. */
export const DEFAULT_NOTIFY_DAYS: readonly number[] = [5, 1, 0];

export interface EventNotifyTarget {
  ev: ResolvedEvent;
  milestone: number;
  notifyAt: Date; // = occursOn - milestone ngày
}

/** Tra cứu tùy chỉnh thông báo theo `event.key` — caller (HomeScreen) nạp từ AsyncStorage rồi
 * truyền vào dạng hàm ĐỒNG BỘ, engine không tự đọc storage (giữ thuần túy/dễ test). */
export interface NotifyPrefLookup {
  isEnabled?: (key: string) => boolean;
  daysFor?: (key: string) => readonly number[];
}

/**
 * Toàn bộ mốc cần nhắc của MỌI sự kiện (package + cá nhân), tính từ lần xảy ra GẦN `now` NHẤT
 * của mỗi sự kiện — dùng chung cho cả bell (lọc `notifyAt` = hôm nay) lẫn lên lịch trước (lọc
 * `notifyAt` ở tương lai), xem `lib/notificationEvents.ts`. Bỏ qua hẳn sự kiện đã tắt thông báo
 * (`isEnabled` trả false) — không sinh mốc nào cho sự kiện đó.
 */
export function upcomingEventNotifyTargets(
  packages: EventPackage[],
  userEvents: UserEvent[],
  now: Date = new Date(),
  prefs?: NotifyPrefLookup,
): EventNotifyTarget[] {
  const out: EventNotifyTarget[] = [];
  const addFor = (key: string, occursOn: Date, showBeforeDays: number, build: (daysUntil: number) => ResolvedEvent) => {
    if (prefs?.isEnabled && !prefs.isEnabled(key)) return;
    const days = prefs?.daysFor ? prefs.daysFor(key) : DEFAULT_NOTIFY_DAYS;
    for (const m of days) {
      if (m < 0 || m > showBeforeDays) continue;
      const notifyAt = new Date(occursOn); notifyAt.setDate(notifyAt.getDate() - m);
      out.push({ ev: build(daysBetween(now, occursOn)), milestone: m, notifyAt });
    }
  };
  for (const pkg of packages) {
    const occursOn = resolveOccurrence(pkg, now);
    addFor(pkg.event_key, occursOn, pkg.show_before_days, d => fromPackage(pkg, occursOn, d));
  }
  for (const ev of userEvents) {
    const occursOn = resolveUserEventOccurrence(ev, now);
    addFor(`user:${ev.id}`, occursOn, ev.show_before_days, d => fromUserEvent(ev, occursOn, d));
  }
  return out;
}

/**
 * TẤT CẢ sự kiện (package + cá nhân) xảy ra ĐÚNG cùng 1 ngày dương lịch với `date` — dùng khi 1
 * ngày trùng nhiều sự kiện (vd tiết khí trùng ngày lễ) để màn chi tiết cho người dùng CHỌN xem cái
 * nào, thay vì chỉ hiện 1 cái duy nhất như box Home. `daysUntil` của kết quả tính theo `now` THẬT
 * (không phải theo `date`) để hiển thị đếm ngược đúng thực tế khi người dùng chuyển qua lại.
 */
export function resolveEventsOnDate(
  packages: EventPackage[],
  userEvents: UserEvent[],
  date: Date,
  now: Date = new Date(),
): ResolvedEvent[] {
  const results: ResolvedEvent[] = [];
  for (const pkg of packages) {
    const occursOn = resolveOccurrence(pkg, date);
    if (daysBetween(date, occursOn) !== 0) continue;
    results.push(fromPackage(pkg, occursOn, daysBetween(now, occursOn)));
  }
  for (const ev of userEvents) {
    const occursOn = resolveUserEventOccurrence(ev, date);
    if (daysBetween(date, occursOn) !== 0) continue;
    results.push(fromUserEvent(ev, occursOn, daysBetween(now, occursOn)));
  }
  results.sort((a, b) => b.priority - a.priority);
  return results;
}

/**
 * Toàn bộ sự kiện (package + cá nhân), mỗi package đúng 1 lần xuất hiện GẦN `now` NHẤT THEO
 * KHOẢNG CÁCH TUYỆT ĐỐI — dùng `pickNearestAbsolute`, KHÁC với `resolveOccurrence` mặc định (luôn
 * thiên về tương lai, nhảy sang năm sau nếu mốc gần đây đã quá hạn ân hạn riêng của sự kiện đó).
 * Nếu dùng mặc định, 1 sự kiện đã qua khá lâu (vd Lập Thu ~50 ngày trước, ân hạn chỉ vài ngày) sẽ
 * bị tính nhầm thành mốc NĂM SAU, khiến nó biến mất khỏi vị trí đúng (trước cả Trung Thu) khi bấm
 * "‹" duyệt lịch sử. Không giới hạn cửa sổ show_before/show_after như pickUpcomingEvent — sắp theo
 * thời gian xảy ra tăng dần — dùng cho nút duyệt ‹ › (xem sự kiện trước/sau) ở box "Sự kiện sắp
 * tới".
 */
export function resolveAllUpcomingEvents(
  packages: EventPackage[],
  userEvents: UserEvent[],
  now: Date = new Date(),
): ResolvedEvent[] {
  const results: ResolvedEvent[] = [];
  for (const pkg of packages) {
    const occursOn = resolveOccurrence(pkg, now, pickNearestAbsolute);
    results.push(fromPackage(pkg, occursOn, daysBetween(now, occursOn)));
  }
  for (const ev of userEvents) {
    const occursOn = resolveUserEventOccurrence(ev, now, pickNearestAbsolute);
    results.push(fromUserEvent(ev, occursOn, daysBetween(now, occursOn)));
  }
  results.sort((a, b) => a.occursOn.getTime() - b.occursOn.getTime());
  return results;
}

/**
 * Chọn 1 sự kiện ưu tiên cao nhất trong tầm hiển thị, tại thời điểm `now`.
 * `isDismissed` (tùy chọn): predicate ĐỒNG BỘ để loại các sự kiện người dùng đã bấm "Ẩn"/"Nhắc
 * lại sau" trên Home (xem `lib/eventDismiss.ts`) — engine giữ nguyên thuần túy/đồng bộ, không tự
 * đọc AsyncStorage; caller tự nạp trạng thái ẩn rồi truyền vào dạng hàm tra cứu.
 */
export function pickUpcomingEvent(
  packages: EventPackage[],
  userEvents: UserEvent[],
  now: Date = new Date(),
  isDismissed?: (ev: ResolvedEvent) => boolean,
): ResolvedEvent | null {
  const resolved: ResolvedEvent[] = [];
  for (const pkg of packages) {
    const occursOn = resolveOccurrence(pkg, now);
    const daysUntil = daysBetween(now, occursOn);
    if (daysUntil < -pkg.show_after_days || daysUntil > pkg.show_before_days) continue;
    const ev = fromPackage(pkg, occursOn, daysUntil);
    if (isDismissed?.(ev)) continue;
    resolved.push(ev);
  }
  for (const ev of userEvents) {
    const occursOn = resolveUserEventOccurrence(ev, now);
    const daysUntil = daysBetween(now, occursOn);
    if (daysUntil < 0 || daysUntil > ev.show_before_days) continue; // sự kiện cá nhân: qua rồi thì thôi
    const resolvedEv = fromUserEvent(ev, occursOn, daysUntil);
    if (isDismissed?.(resolvedEv)) continue;
    resolved.push(resolvedEv);
  }

  if (resolved.length) {
    resolved.sort((a, b) => (b.priority - a.priority) || (a.daysUntil - b.daysUntil));
    return resolved[0];
  }

  // Không có gì trong cửa sổ hiển thị bình thường (vd khoảng trống giữa 2 tiết khí) — thay vì
  // để box trống, hiện tạm SỰ KIỆN SẮP TỚI GẦN NHẤT dù đang ngoài show_before_days của nó.
  const fallback: ResolvedEvent[] = [];
  for (const pkg of packages) {
    const occursOn = resolveOccurrence(pkg, now);
    const daysUntil = daysBetween(now, occursOn);
    if (daysUntil >= 0) {
      const ev = fromPackage(pkg, occursOn, daysUntil);
      if (!isDismissed?.(ev)) fallback.push(ev);
    }
  }
  for (const ev of userEvents) {
    const occursOn = resolveUserEventOccurrence(ev, now);
    const daysUntil = daysBetween(now, occursOn);
    if (daysUntil >= 0) {
      const resolvedEv = fromUserEvent(ev, occursOn, daysUntil);
      if (!isDismissed?.(resolvedEv)) fallback.push(resolvedEv);
    }
  }
  if (!fallback.length) return null;
  fallback.sort((a, b) => a.daysUntil - b.daysUntil);
  return fallback[0];
}
