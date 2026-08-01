/**
 * Sinh các thông báo SỰ KIỆN cho trung tâm thông báo, gọi mỗi khi mở/Focus Home.
 *  1. Ngày đẹp / rất đẹp / xấu hôm nay (kèm vắn tắt nên / không nên).
 *  2. Bước sang tháng mới (gợi mở xem Nguyệt Vận).
 *  3. Sinh nhật (dương lịch) của các lá số đang lưu.
 * (Nạp xu được thêm ngay tại màn Nạp xu; push khi app đóng do webhook đảm nhiệm.)
 *
 * Mỗi tin có `id` cố định theo ngày/tháng/năm nên CHỈ tạo 1 lần (chống trùng).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AstrologyResult } from '../types';
import { buildTodaySummary } from '../core/todaySummary';
import { addNotification } from './notificationCenter';
import { cancelAppReminders, scheduleReminderAt } from './notifications';
import type { SavedChartRow } from './charts';
import type { LifeTask } from './lifeTasks';

const GOOD = new Set(['Rất tốt', 'Tốt']);
// Chỉ nhắc khi ngày THỰC SỰ xấu — bỏ "Cần thận trọng" để đỡ làm phiền.
const BAD = new Set(['Xấu']);

/** Tóm tắt "nên / hạn chế" cho 1 ngày → 1 dòng ngắn cho thông báo. */
function dayBrief(result: AstrologyResult, day: Date): { rating: string; body: string } | null {
  try {
    const sum = buildTodaySummary(result, day);
    if (!GOOD.has(sum.rating) && !BAD.has(sum.rating)) return null;
    const nen = sum.good.slice(0, 2).join('; ');
    const tranh = sum.bad.slice(0, 2).join('; ');
    const body = (nen ? `Nên: ${nen}. ` : '') + (tranh ? `Hạn chế: ${tranh}.` : '');
    return { rating: sum.rating, body: body.trim() || 'Mở "Xem theo ngày" để biết chi tiết.' };
  } catch { return null; }
}

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Tiêu đề + nội dung nhắc hạn cho 1 Việc/Mục tiêu — dùng chung cho bell (hôm nay/ngày mai) và lên lịch (trước hạn/đến hạn). */
function taskDueCopy(task: LifeTask, dateType: 'start' | 'end', dateStr: string, dueToday: boolean): { title: string; body: string } {
  const kindLabel = task.kind === 'goal' ? 'Mục tiêu' : 'Việc';
  const [, m, dd] = dateStr.split('-');
  const dateLabel = `${dd}/${m}`;
  if (dateType === 'start') {
    return dueToday
      ? { title: `🕐 ${kindLabel} bắt đầu hôm nay`, body: `"${task.title}" bắt đầu hôm nay (${dateLabel}).` }
      : { title: `🕐 ${kindLabel} bắt đầu ngày mai`, body: `"${task.title}" bắt đầu vào ngày mai (${dateLabel}).` };
  }
  return dueToday
    ? { title: `⏰ ${kindLabel} hết hạn hôm nay`, body: `"${task.title}" hết hạn hôm nay (${dateLabel}). Đừng quên nhé!` }
    : { title: `⏰ ${kindLabel} sắp hết hạn`, body: `"${task.title}" sẽ hết hạn vào ngày mai (${dateLabel}).` };
}

export async function syncEventNotifications(
  result: AstrologyResult | null,
  charts: SavedChartRow[],
  tasks: LifeTask[] = [],
): Promise<void> {
  const now = new Date();
  const y = now.getFullYear(), mo = now.getMonth() + 1, d = now.getDate();
  const ymd = `${y}-${mo}-${d}`;
  const ym = `${y}-${mo}`;

  // 1) Ngày đẹp / xấu hôm nay — chỉ báo khi đặc biệt (tốt hẳn hoặc cần thận trọng).
  if (result) {
    const brief = dayBrief(result, now);
    if (brief) {
      await addNotification({
        id: `day:${ymd}`,
        type: 'day',
        title: `📅 Ngày ${d}/${mo} là ngày ${brief.rating.toLowerCase()}`,
        body: brief.body,
      });
    }
  }

  // 2) Tháng mới — chỉ báo vào vài ngày đầu tháng để không làm phiền giữa tháng.
  if (d <= 3) {
    await addNotification({
      id: `month:${ym}`,
      type: 'month',
      title: `Chào tháng ${mo}/${y} 🌙`,
      body: result
        ? 'Bước sang tháng mới — mở mục "Nguyệt Vận" để xem tháng này của bạn có gì đặc biệt và nên ưu tiên điều gì.'
        : 'Chúc bạn một tháng mới hanh thông. Lập lá số để xem vận tháng dành riêng cho bạn.',
    });
  }

  // 3) Sinh nhật (dương lịch) lá số đang lưu.
  for (const c of charts) {
    if (c.birth_day === d && c.birth_month === mo) {
      const name = (c.name || '').trim();
      await addNotification({
        id: `bday:${c.id}:${y}`,
        type: 'birthday',
        title: `🎂 Sinh nhật lá số${name ? ` ${name}` : ''}`,
        body: `Hôm nay (dương lịch) là sinh nhật của lá số "${name || 'không tên'}". Chúc một tuổi mới như ý — mở lá số để xem vận năm nay nhé!`,
      });
    }
  }

  // 4) Việc & Mục tiêu — bắt đầu/hết hạn hôm nay hoặc ngày mai.
  const todayStr = ymd;
  const tomorrowStr = isoOf(new Date(y, mo - 1, d + 1));
  for (const t of tasks) {
    if (t.status !== 'open') continue;
    for (const [dateType, dateStr] of [['start', t.start_date], ['end', t.end_date]] as const) {
      if (!dateStr) continue;
      const dueToday = dateStr === todayStr;
      const dueTomorrow = dateStr === tomorrowStr;
      if (!dueToday && !dueTomorrow) continue;
      const { title, body } = taskDueCopy(t, dateType, dateStr, dueToday);
      await addNotification({
        id: `life_task:${t.id}:${dateType}:${dueToday ? 'due' : 'before'}:${dateStr}`,
        type: 'life_task',
        title, body,
      });
    }
  }
}

const PLANNED_KEY = 'reminders_planned_on';

/**
 * LÊN LỊCH thông báo cho NHỮNG NGÀY TỚI để app nhắc CẢ KHI ĐÃ ĐÓNG:
 *  - 7 ngày tới: ngày nào đẹp/xấu → nhắc lúc 7h30 sáng hôm đó.
 *  - Ngày 1 tháng sau: chào tháng mới (8h sáng).
 *  - Sinh nhật kế tiếp của mỗi lá số (8h sáng).
 *  - Việc/Mục tiêu: ngày TRƯỚC hạn 1 ngày và ĐÚNG ngày hạn (bắt đầu/kết thúc) — nhắc lúc 7h30 sáng.
 * Chạy TỐI ĐA 1 lần/ngày (chống lên lịch lặp mỗi lần mở app).
 */
export async function planScheduledReminders(
  result: AstrologyResult | null,
  charts: SavedChartRow[],
  tasks: LifeTask[] = [],
): Promise<void> {
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  try {
    if ((await AsyncStorage.getItem(PLANNED_KEY)) === todayKey) return; // đã lên lịch hôm nay
  } catch { /* vẫn tiếp tục */ }

  await cancelAppReminders();

  const at = (base: Date, h: number, m: number) => {
    const x = new Date(base); x.setHours(h, m, 0, 0); return x;
  };

  // (a) 7 ngày tới — ngày đặc biệt.
  if (result) {
    for (let i = 0; i <= 7; i++) {
      const day = new Date(now); day.setDate(now.getDate() + i);
      const brief = dayBrief(result, day);
      if (brief) {
        await scheduleReminderAt(
          at(day, 7, 30),
          `📅 Ngày ${day.getDate()}/${day.getMonth() + 1} là ngày ${brief.rating.toLowerCase()}`,
          brief.body,
        );
      }
    }
  }

  // (b) Tháng mới — ngày 1 tháng kế tiếp.
  const firstNextMonth = at(new Date(now.getFullYear(), now.getMonth() + 1, 1), 8, 0);
  await scheduleReminderAt(
    firstNextMonth,
    `Chào tháng ${firstNextMonth.getMonth() + 1}/${firstNextMonth.getFullYear()} 🌙`,
    result
      ? 'Bước sang tháng mới — mở "Nguyệt Vận" xem tháng này của bạn có gì đặc biệt.'
      : 'Chúc bạn một tháng mới hanh thông.',
  );

  // (c) Sinh nhật kế tiếp của từng lá số.
  for (const c of charts) {
    let bday = at(new Date(now.getFullYear(), c.birth_month - 1, c.birth_day), 8, 0);
    if (bday.getTime() <= now.getTime()) bday = at(new Date(now.getFullYear() + 1, c.birth_month - 1, c.birth_day), 8, 0);
    const name = (c.name || '').trim();
    await scheduleReminderAt(
      bday,
      `🎂 Sinh nhật lá số${name ? ` ${name}` : ''}`,
      `Hôm nay là sinh nhật (dương lịch) của lá số "${name || 'không tên'}". Mở lá số để xem vận năm nay nhé!`,
    );
  }

  // (d) Việc & Mục tiêu — nhắc lúc 7h30 vào ngày trước hạn 1 ngày VÀ đúng ngày hạn.
  for (const t of tasks) {
    if (t.status !== 'open') continue;
    for (const [dateType, dateStr] of [['start', t.start_date], ['end', t.end_date]] as const) {
      if (!dateStr) continue;
      const [yy, mm, dd] = dateStr.split('-').map(Number);
      const dueDate = new Date(yy, mm - 1, dd);
      const dayBefore = new Date(yy, mm - 1, dd - 1);
      const beforeCopy = taskDueCopy(t, dateType, dateStr, false);
      const dueCopy = taskDueCopy(t, dateType, dateStr, true);
      await scheduleReminderAt(at(dayBefore, 7, 30), beforeCopy.title, beforeCopy.body);
      await scheduleReminderAt(at(dueDate, 7, 30), dueCopy.title, dueCopy.body);
    }
  }

  try { await AsyncStorage.setItem(PLANNED_KEY, todayKey); } catch { /* bỏ qua */ }
}
