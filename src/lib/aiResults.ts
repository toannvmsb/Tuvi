/**
 * Lưu & đọc lại KẾT QUẢ PHÂN TÍCH AI đã trả phí.
 *  - Cache trong phiên (Map) để đọc lại tức thì, không gọi lại AI.
 *  - Đồng bộ Supabase (bảng ai_results) để đọc lại kể cả đăng nhập lại / máy khác.
 *
 * Khóa dùng chung với unlock (fkey: theo từng lá số + mục).
 */
import { supabase } from './supabase';
import { isOnlineMode } from './auth';

const cache = new Map<string, string>();

/** Lấy kết quả AI đã lưu (đồng bộ, từ cache). null nếu chưa có. */
export function getAiResult(key: string): string | null {
  return cache.get(key) ?? null;
}

/** Lưu kết quả AI (cache + đẩy lên Supabase nếu online). */
export async function setAiResult(key: string, content: string): Promise<void> {
  cache.set(key, content);
  if (!isOnlineMode()) return;
  try {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (!uid) return;
    await supabase.from('ai_results').upsert(
      { user_id: uid, result_key: key, content },
      { onConflict: 'user_id,result_key' },
    );
  } catch {}
}

/** Xóa kết quả AI đã lưu (cache + Supabase) — dùng khi "Phân tích lại". */
export async function clearAiResult(key: string): Promise<void> {
  cache.delete(key);
  if (!isOnlineMode()) return;
  try {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (!uid) return;
    await supabase.from('ai_results').delete().eq('user_id', uid).eq('result_key', key);
  } catch {}
}

/** Tải toàn bộ kết quả AI của user vào cache (gọi sau khi đăng nhập). */
export async function loadAllAiResults(): Promise<void> {
  if (!isOnlineMode()) return;
  try {
    const { data: ures } = await supabase.auth.getUser();
    const uid = ures.user?.id;
    if (!uid) return;
    const { data } = await supabase.from('ai_results').select('result_key, content').eq('user_id', uid);
    for (const r of data ?? []) cache.set((r as any).result_key, (r as any).content);
  } catch {}
}
