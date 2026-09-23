/**
 * Xếp hạng hiển thị — ENGINE_SPEC §21: tối đa 5 sự kiện/năm, tối đa 2 sự kiện/nhóm, gộp các sự
 * kiện trùng ý nghĩa. Toàn bộ ứng viên vẫn giữ nguyên trong debug (engine.ts trả `debugCandidateCount`).
 *
 * Gộp trùng ý nghĩa: v1 mới định nghĩa 1 nhóm mẫu theo đúng ví dụ trong ENGINE_SPEC (biến động
 * công việc). Có thể bổ sung thêm nhóm khác khi có nhu cầu — chưa phủ hết 85 sự kiện.
 */
import type { ScoredEvent } from './types';

const ROLLUP_GROUPS: { ids: string[]; label: string }[] = [
  { ids: ['CAREER_ROLE_CHANGE', 'CAREER_INTERNAL_TRANSFER', 'CAREER_JOB_CHANGE'], label: 'Biến động công việc' },
];

function rollupKeyOf(eventId: string): string | null {
  const g = ROLLUP_GROUPS.find(g => g.ids.includes(eventId));
  return g ? g.label : null;
}

export function rankEvents(all: ScoredEvent[], maxTotal = 5, maxPerCategory = 2): ScoredEvent[] {
  const sorted = [...all].sort((a, b) => b.strength - a.strength);
  const perCategory: Record<string, number> = {};
  const seenRollup = new Set<string>();
  const out: ScoredEvent[] = [];

  for (const ev of sorted) {
    if (out.length >= maxTotal) break;
    if ((perCategory[ev.category] ?? 0) >= maxPerCategory) continue;
    const key = rollupKeyOf(ev.eventId);
    if (key) {
      if (seenRollup.has(key)) continue;
      seenRollup.add(key);
    }
    out.push(ev);
    perCategory[ev.category] = (perCategory[ev.category] ?? 0) + 1;
  }
  return out;
}
