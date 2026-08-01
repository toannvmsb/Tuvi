/**
 * CRUD cho Quản lý công việc (task) + Mục tiêu dài hạn (goal) — bảng
 * public.life_tasks (RLS: mỗi user chỉ thấy/sửa được bản ghi của chính mình),
 * nên gọi thẳng qua supabase client, không cần Edge Function.
 */
import { supabase } from './supabase';

export type TaskKind = 'task' | 'goal';
export type TaskStatus = 'open' | 'done' | 'cancelled';

export interface LifeTask {
  id: number;
  kind: TaskKind;
  title: string;
  note: string | null;
  status: TaskStatus;
  start_date: string | null;
  end_date: string | null;
  priority: number | null;
  created_at: string;
  completed_at: string | null;
}

export async function listLifeTasks(kind: TaskKind): Promise<LifeTask[]> {
  const { data, error } = await supabase
    .from('life_tasks')
    .select('*')
    .eq('kind', kind)
    .order('status', { ascending: true })
    .order('priority', { ascending: true, nullsFirst: false })
    .order('start_date', { ascending: true, nullsFirst: false })
    .order('end_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as LifeTask[];
}

/**
 * So sánh 2 mục để GỘP danh sách task+goal ở Home theo ĐÚNG quy tắc DB:
 * priority thủ công trước (nhỏ hơn = quan trọng hơn), mục chưa xếp thì theo
 * start_date rồi end_date (càng sớm càng ưu tiên), null xếp sau cùng.
 */
export function compareLifeTasks(a: LifeTask, b: LifeTask): number {
  if (a.priority != null || b.priority != null) {
    if (a.priority == null) return 1;
    if (b.priority == null) return -1;
    if (a.priority !== b.priority) return a.priority - b.priority;
  }
  const aDate = a.start_date ?? a.end_date;
  const bDate = b.start_date ?? b.end_date;
  if (aDate !== bDate) {
    if (!aDate) return 1;
    if (!bDate) return -1;
    return aDate < bDate ? -1 : 1;
  }
  return b.created_at.localeCompare(a.created_at);
}

export async function createLifeTask(input: {
  kind: TaskKind; title: string; note?: string;
  startDate?: string | null; endDate?: string | null;
}): Promise<LifeTask> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error('Bạn cần đăng nhập để dùng tính năng này.');
  const { data, error } = await supabase
    .from('life_tasks')
    .insert({
      user_id: uid,
      kind: input.kind,
      title: input.title.trim(),
      note: input.note?.trim() || null,
      start_date: input.startDate ?? null,
      end_date: input.endDate ?? null,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as LifeTask;
}

export async function setLifeTaskStatus(id: number, status: TaskStatus): Promise<void> {
  const { error } = await supabase
    .from('life_tasks')
    .update({ status, updated_at: new Date().toISOString(), completed_at: status === 'done' ? new Date().toISOString() : null })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/** Đặt thứ tự ưu tiên thủ công (nhỏ hơn = quan trọng hơn). `null` = bỏ xếp, quay lại tự sắp theo ngày. */
export async function setLifeTaskPriority(id: number, priority: number | null): Promise<void> {
  const { error } = await supabase
    .from('life_tasks')
    .update({ priority, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteLifeTask(id: number): Promise<void> {
  const { error } = await supabase.from('life_tasks').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
