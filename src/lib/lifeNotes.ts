/**
 * CRUD cho Ghi chú nhanh — bảng public.life_notes (RLS: mỗi user chỉ thấy/sửa
 * được bản ghi của chính mình), nên gọi thẳng qua supabase client, không cần
 * Edge Function. Ghi chú TỰ DO, không gắn task/mục tiêu nào.
 */
import { supabase } from './supabase';

export interface LifeNote {
  id: number;
  content: string;
  note_date: string; // yyyy-mm-dd — ngày sự kiện (mặc định = ngày tạo)
  created_at: string;
}

export async function listLifeNotes(limit?: number, filterDate?: string): Promise<LifeNote[]> {
  let q = supabase
    .from('life_notes')
    .select('*')
    .order('note_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (filterDate) q = q.eq('note_date', filterDate);
  if (limit) q = q.limit(limit);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as LifeNote[];
}

export async function createLifeNote(input: { content: string; noteDate?: string | null }): Promise<LifeNote> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error('Bạn cần đăng nhập để dùng tính năng này.');
  const { data, error } = await supabase
    .from('life_notes')
    .insert({
      user_id: uid,
      content: input.content.trim(),
      ...(input.noteDate ? { note_date: input.noteDate } : {}),
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as LifeNote;
}

export async function deleteLifeNote(id: number): Promise<void> {
  const { error } = await supabase.from('life_notes').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
