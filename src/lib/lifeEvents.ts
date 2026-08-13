/**
 * SỰ KIỆN SẮP TỚI — client gọi các RPC trong supabase_life_events.sql.
 *
 * `event_packages` (lễ Tết + tiết khí) là nội dung CMS công khai, ít đổi trong phiên
 * làm việc → cache 1 lần trong bộ nhớ (không cần AsyncStorage như broadcasts→notification,
 * vì đây không phải thông báo cần dedup theo id, chỉ là dữ liệu nền để rule engine tính toán).
 * `user_events` là dữ liệu riêng của người dùng, không cache — luôn lấy mới.
 */
import { supabase } from './supabase';
import { isOnlineMode } from './auth';
import type { EventPackage, UserEvent, UserEventType } from '../core/lifeEventEngine';

export type { EventPackage, UserEvent, UserEventType };

export interface CreateUserEventInput {
  eventType: UserEventType;
  title: string;
  calendarType: 'lunar' | 'solar';
  eventDate: string; // ISO date
  repeatYearly?: boolean;
  showBeforeDays?: number;
  note?: string | null;
  chartId?: string | null;
  relatedPeople?: string | null;
}

export interface UpdateUserEventInput {
  title: string;
  calendarType: 'lunar' | 'solar';
  eventDate: string;
  repeatYearly: boolean;
  showBeforeDays: number;
  note?: string | null;
  relatedPeople?: string | null;
}

let eventPackagesCache: EventPackage[] | null = null;

/** Lấy toàn bộ event package đang bật (lễ Tết + tiết khí) — cache trong phiên, gọi `force` để làm mới. */
export async function fetchEventPackages(force = false): Promise<EventPackage[]> {
  if (!force && eventPackagesCache) return eventPackagesCache;
  if (!isOnlineMode()) return eventPackagesCache ?? [];
  try {
    const { data, error } = await supabase.rpc('list_active_event_packages');
    if (error) return eventPackagesCache ?? [];
    eventPackagesCache = (data as EventPackage[]) ?? [];
    return eventPackagesCache;
  } catch {
    return eventPackagesCache ?? [];
  }
}

/** Danh sách sự kiện cá nhân của người dùng đang đăng nhập. */
export async function listMyUserEvents(): Promise<UserEvent[]> {
  if (!isOnlineMode()) return [];
  const { data, error } = await supabase.rpc('list_my_user_events');
  if (error) throw new Error(error.message);
  return (data as UserEvent[]) ?? [];
}

/** Tạo 1 sự kiện cá nhân mới, trả về id vừa tạo. */
export async function createUserEvent(input: CreateUserEventInput): Promise<number> {
  const { data, error } = await supabase.rpc('create_user_event', {
    p_event_type: input.eventType,
    p_title: input.title.trim(),
    p_calendar_type: input.calendarType,
    p_event_date: input.eventDate,
    p_repeat_yearly: input.repeatYearly ?? true,
    p_show_before_days: input.showBeforeDays ?? 7,
    p_note: input.note?.trim() || null,
    p_chart_id: input.chartId ?? null,
    p_related_people: input.relatedPeople?.trim() || null,
  });
  if (error) throw new Error(error.message);
  return data as number;
}

/** Sửa 1 sự kiện cá nhân (chỉ chủ sở hữu mới sửa được — kiểm tra ở server). */
export async function updateUserEvent(id: number, input: UpdateUserEventInput): Promise<void> {
  const { error } = await supabase.rpc('update_user_event', {
    p_id: id,
    p_title: input.title.trim(),
    p_calendar_type: input.calendarType,
    p_event_date: input.eventDate,
    p_repeat_yearly: input.repeatYearly,
    p_show_before_days: input.showBeforeDays,
    p_note: input.note?.trim() || null,
    p_related_people: input.relatedPeople?.trim() || null,
  });
  if (error) throw new Error(error.message);
}

/** Xóa 1 sự kiện cá nhân. */
export async function deleteUserEvent(id: number): Promise<void> {
  const { error } = await supabase.rpc('delete_user_event', { p_id: id });
  if (error) throw new Error(error.message);
}

/** Diễn giải mã lỗi từ server thành thông báo tiếng Việt thân thiện. */
export function lifeEventErrorMessage(raw: string): string {
  const m = String(raw || '');
  if (m.includes('bad_event_type')) return 'Loại sự kiện không hợp lệ.';
  if (m.includes('bad_calendar_type')) return 'Loại lịch không hợp lệ.';
  if (m.includes('user_event_not_found')) return 'Không tìm thấy sự kiện này (có thể đã bị xóa).';
  if (m.includes('not_authenticated')) return 'Bạn cần đăng nhập để dùng tính năng này.';
  return 'Không thực hiện được thao tác. Vui lòng thử lại.';
}
