/**
 * Ghi chú theo năm của "Dòng đời đã qua" — gọi Edge Function `review-notes` (mã hóa AES-GCM phía server).
 * Ghi chú KHÔNG đi vào AI/prompt và KHÔNG vào thẻ chia sẻ. Cần lá số ĐÃ LƯU (có chartId).
 */
import { supabase } from './supabase';
import type { AreaId } from '../core/pastReview';

export const NOTE_MAX_LEN = 500;

export interface ReviewNote {
  id: string;
  year: number;
  lifeArea: AreaId | null;
  text: string;
  updatedAt: string;
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('review-notes', { body });
  if (error) {
    // Edge Function trả lỗi nghiệp vụ trong body JSON (status ≠ 2xx) → cố đọc câu thông báo tiếng Việt.
    let msg = '';
    try { msg = (await (error as any).context?.json?.())?.error ?? ''; } catch { /* bỏ qua */ }
    throw new Error(msg || 'Không kết nối được máy chủ ghi chú.');
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export async function listNotes(chartId: string): Promise<ReviewNote[]> {
  const r = await call<{ notes: ReviewNote[] }>({ action: 'list', chartId });
  return r.notes ?? [];
}

export async function saveNote(input: {
  chartId: string; year: number; text: string; lifeArea?: AreaId | null; id?: string;
}): Promise<string> {
  const text = input.text.trim();
  if (!text) throw new Error('Ghi chú đang trống.');
  if (text.length > NOTE_MAX_LEN) throw new Error(`Ghi chú tối đa ${NOTE_MAX_LEN} ký tự.`);
  const r = await call<{ id: string }>({
    action: 'save', chartId: input.chartId, year: input.year, text, lifeArea: input.lifeArea ?? null, id: input.id,
  });
  return r.id;
}

export async function deleteNote(id: string): Promise<void> {
  await call<{ ok: true }>({ action: 'delete', id });
}
