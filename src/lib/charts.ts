/**
 * Lưu / liệt kê / mở lại / xóa LÁ SỐ trên Supabase (bảng public.charts).
 * Lưu thông tin sinh + năm xem; khi mở lại sẽ dựng lại lá số bằng buildResult.
 */
import { supabase } from './supabase';
import { isOnlineMode } from './auth';
import type { AstrologyResult, BirthInfo } from '../types';
import { buildResult } from '../core/buildResult';

export interface SavedChartRow {
  id: string;
  name: string | null;
  gender: string | null;
  birth_day: number; birth_month: number; birth_year: number; birth_hour: number;
  calendar: string; is_leap: boolean; viewing_year: number | null;
  created_at: string;
}

// Cache danh sách lá số trong phiên — chỉ request Supabase lần đầu, lần sau dùng
// lại cache (làm mới khi lưu/xóa lá số, hoặc khi đăng xuất → đăng nhập lại).
let chartsCache: SavedChartRow[] | null = null;

/** Trả về cache hiện có (null nếu chưa tải lần nào). */
export function getCachedCharts(): SavedChartRow[] | null {
  return chartsCache;
}

/** Xóa cache (gọi khi đăng xuất / đổi tài khoản). */
export function invalidateChartsCache(): void {
  chartsCache = null;
}

/** Lưu lá số (tự bỏ qua nếu trùng thông tin sinh). Trả về chartId hoặc null. */
export async function saveChart(result: AstrologyResult): Promise<string | null> {
  if (!isOnlineMode()) return null;
  const { data: ures } = await supabase.auth.getUser();
  const uid = ures.user?.id;
  if (!uid) return null;
  const b = result.birthInfo;

  // Tránh tạo trùng: tìm lá số cùng thông tin sinh.
  const { data: existing } = await supabase
    .from('charts')
    .select('id')
    .eq('user_id', uid)
    .eq('birth_day', b.day).eq('birth_month', b.month).eq('birth_year', b.year)
    .eq('birth_hour', b.hour).eq('gender', b.gender)
    .limit(1)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from('charts')
    .insert({
      user_id: uid,
      name: b.name || null,
      gender: b.gender,
      birth_day: b.day, birth_month: b.month, birth_year: b.year, birth_hour: b.hour,
      calendar: b.calendarType, is_leap: b.isLeapMonth ?? false,
      viewing_year: b.viewingYear ?? null,
    })
    .select('id')
    .single();
  if (error) return null;
  invalidateChartsCache();   // có lá số mới → làm mới danh sách lần tải sau
  return data?.id ?? null;
}

/**
 * Danh sách lá số đã lưu của user (mới nhất trước).
 *  - Mặc định trả về CACHE nếu đã tải (không request lại).
 *  - `force=true` để buộc tải mới từ server (vd khi người dùng kéo làm mới).
 */
export async function listCharts(force = false): Promise<SavedChartRow[]> {
  if (!isOnlineMode()) return [];
  if (!force && chartsCache) return chartsCache;
  const { data: ures } = await supabase.auth.getUser();
  const uid = ures.user?.id;
  if (!uid) return [];
  const { data } = await supabase
    .from('charts')
    .select('id, name, gender, birth_day, birth_month, birth_year, birth_hour, calendar, is_leap, viewing_year, created_at')
    .eq('user_id', uid)
    .order('created_at', { ascending: false });
  chartsCache = (data as SavedChartRow[]) ?? [];
  return chartsCache;
}

/** Cập nhật thông tin lá số đã lưu (sửa lá số). Trả về true nếu thành công. */
export async function updateChart(id: string, b: BirthInfo): Promise<boolean> {
  if (!isOnlineMode()) return false;
  const { data: ures } = await supabase.auth.getUser();
  const uid = ures.user?.id;
  if (!uid) return false;
  const { error } = await supabase
    .from('charts')
    .update({
      name: b.name || null,
      gender: b.gender,
      birth_day: b.day, birth_month: b.month, birth_year: b.year, birth_hour: b.hour,
      calendar: b.calendarType, is_leap: b.isLeapMonth ?? false,
      viewing_year: b.viewingYear ?? null,
    })
    .eq('id', id).eq('user_id', uid);
  if (error) return false;
  invalidateChartsCache();   // danh sách/Home/Lá số của tôi tải lại dữ liệu mới
  return true;
}

/** Dựng lại AstrologyResult từ 1 dòng đã lưu (gắn chartId để unlock theo lá số). */
export function rowToResult(row: SavedChartRow): AstrologyResult {
  const birthInfo: BirthInfo = {
    name: row.name || '',
    gender: (row.gender as any) || 'nam',
    birthplace: '',
    calendarType: (row.calendar as any) || 'solar',
    year: row.birth_year, month: row.birth_month, day: row.birth_day,
    hour: row.birth_hour, minute: 0,
    isLeapMonth: row.is_leap,
    language: 'vi',
    chartId: row.id,
    viewingYear: row.viewing_year ?? undefined,
  };
  return buildResult(birthInfo, row.viewing_year ?? undefined);
}

export async function deleteChart(id: string): Promise<void> {
  if (!isOnlineMode()) return;
  const { data: ures } = await supabase.auth.getUser();
  const uid = ures.user?.id;
  if (!uid) return;
  await supabase.from('charts').delete().eq('id', id).eq('user_id', uid);
  if (chartsCache) chartsCache = chartsCache.filter(r => r.id !== id);
}
