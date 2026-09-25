/**
 * Xếp hạng hiển thị. Theo yêu cầu của anh Toàn (thay ENGINE_SPEC §21 "tối đa 5 sự kiện/năm, tối
 * đa 2 sự kiện/nhóm"): hiện sự kiện đạt strength >= 50, tối đa 10 sự kiện/năm — KHÔNG còn giới
 * hạn riêng theo từng nhóm (nếu 1 nhóm có nhiều sự kiện mạnh, có thể chiếm nhiều hơn 2 chỗ, miễn
 * tổng không quá 10). Ngưỡng 50 từng thử ở mức 45 nhưng ra quá nhiều (có lá số lên tới 66/85 sự
 * kiện) — nâng lên 50 + trần 10 để danh sách vẫn gọn, "nổi bật" đúng nghĩa. Toàn bộ ứng viên (kể
 * cả dưới ngưỡng) vẫn giữ nguyên trong debug (engine.ts trả `debugCandidateCount`).
 *
 * Gộp trùng ý nghĩa: v1 mới định nghĩa 1 nhóm mẫu theo đúng ví dụ trong ENGINE_SPEC (biến động
 * công việc) — vẫn giữ lại (khác với giới hạn số lượng — đây là tránh liệt kê 2-3 sự kiện cùng ý
 * nghĩa). Có thể bổ sung thêm nhóm khác khi có nhu cầu — chưa phủ hết 85 sự kiện.
 */
import type { ScoredEvent } from './types';

const ROLLUP_GROUPS: { ids: string[]; label: string }[] = [
  { ids: ['CAREER_ROLE_CHANGE', 'CAREER_INTERNAL_TRANSFER', 'CAREER_JOB_CHANGE'], label: 'Biến động công việc' },
];

function rollupKeyOf(eventId: string): string | null {
  const g = ROLLUP_GROUPS.find(g => g.ids.includes(eventId));
  return g ? g.label : null;
}

export function rankEvents(all: ScoredEvent[], maxTotal = 10, minStrength = 50): ScoredEvent[] {
  const sorted = [...all].filter(e => e.strength >= minStrength).sort((a, b) => b.strength - a.strength);
  const seenRollup = new Set<string>();
  const out: ScoredEvent[] = [];

  for (const ev of sorted) {
    if (out.length >= maxTotal) break;
    const key = rollupKeyOf(ev.eventId);
    if (key) {
      if (seenRollup.has(key)) continue;
      seenRollup.add(key);
    }
    out.push(ev);
  }
  return out;
}
