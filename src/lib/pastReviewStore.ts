/**
 * Phản hồi "Nghiệm quá khứ" — bảng public.past_review_feedback (RLS chính chủ, xem supabase_past_review.sql).
 * Mỗi (lá số, năm âm lịch) có tối đa một phản hồi; đổi ý thì ghi đè. Cần lá số ĐÃ LƯU (có chartId).
 */
import { supabase } from './supabase';
import { RULEBOOK_VERSION, type AreaId, type PastMarker } from '../core/pastReview';
import type { FeedbackValue } from '../core/pastReview/feedback';

export interface FeedbackRow {
  year: number;
  value: FeedbackValue;
  life_area: AreaId;
  rule_ids: string[];
  rulebook_version: string;
}

export async function listFeedback(chartId: string): Promise<FeedbackRow[]> {
  const { data, error } = await supabase
    .from('past_review_feedback')
    .select('year, value, life_area, rule_ids, rulebook_version')
    .eq('chart_id', chartId);
  if (error) throw new Error(error.message);
  return (data ?? []) as FeedbackRow[];
}

/** Mã quy tắc của các tín hiệu ỦNG HỘ đã tạo ra mốc (để sau này cộng dồn "sổ quy tắc"). */
export function ruleIdsOf(marker: Pick<PastMarker, 'signals'>): string[] {
  return [...new Set(marker.signals.filter(s => s.supports && s.weight > 0).map(s => s.ruleId))];
}

export async function saveFeedback(input: {
  chartId: string; marker: PastMarker; value: FeedbackValue; source?: 'marker' | 'timeline';
}): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) throw new Error('Bạn cần đăng nhập để lưu phản hồi.');
  const { error } = await supabase.from('past_review_feedback').upsert({
    user_id: uid,
    chart_id: input.chartId,
    year: input.marker.year,
    value: input.value,
    life_area: input.marker.area,
    source: input.source ?? 'marker',
    rule_ids: ruleIdsOf(input.marker),
    rulebook_version: RULEBOOK_VERSION,
  }, { onConflict: 'user_id,chart_id,year' });
  if (error) throw new Error(error.message);
}

export async function deleteFeedback(chartId: string, year: number): Promise<void> {
  const { error } = await supabase.from('past_review_feedback').delete().eq('chart_id', chartId).eq('year', year);
  if (error) throw new Error(error.message);
}
