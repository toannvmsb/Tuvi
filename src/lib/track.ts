/**
 * Ghi sự kiện đo lường tối thiểu (bảng public.analytics_events — chỉ ghi, chỉ admin đọc).
 * Best-effort: KHÔNG bao giờ chặn UI hay ném lỗi. Không ghi nội dung riêng tư (ghi chú, ngày giờ sinh).
 * Tên sự kiện của "Nghiệm quá khứ" theo bảng "Sau khi ra mắt" trong đặc tả.
 */
import { supabase } from './supabase';

export type TrackName =
  | 'past_review_open'        // mở màn Nghiệm quá khứ
  | 'past_review_why_open'    // mở phần Vì sao của một mốc (người xem)
  | 'past_review_learner_open'// mở mức người học
  | 'past_review_feedback';   // phản hồi một mốc

export function track(name: TrackName, props: Record<string, string | number | boolean | null> = {}): void {
  void (async () => {
    try {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) return;
      await supabase.from('analytics_events').insert({ user_id: uid, name, props });
    } catch { /* bỏ qua */ }
  })();
}
