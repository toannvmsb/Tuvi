/**
 * Xếp hạng hiển thị. Theo yêu cầu của anh Toàn (thay ENGINE_SPEC §21 "tối đa 5 sự kiện/năm, tối
 * đa 2 sự kiện/nhóm"): hiện sự kiện đạt strength >= 50, tối đa 10 sự kiện/năm — KHÔNG còn giới
 * hạn riêng theo từng nhóm (nếu 1 nhóm có nhiều sự kiện mạnh, có thể chiếm nhiều hơn 2 chỗ, miễn
 * tổng không quá 10). Ngưỡng 50 từng thử ở mức 45 nhưng ra quá nhiều (có lá số lên tới 66/85 sự
 * kiện) — nâng lên 50 + trần 10 để danh sách vẫn gọn, "nổi bật" đúng nghĩa.
 *
 * Sàn tối thiểu 5 (anh Toàn không muốn có lá số/năm KHÔNG có sự kiện nào): nếu số sự kiện đạt
 * ngưỡng 50 chưa đủ 5, HẠ DẦN xuống các sự kiện điểm thấp hơn (vẫn theo thứ tự mạnh nhất trước)
 * cho tới khi đủ 5, hoặc hết ứng viên. Ngưỡng 50 vẫn là chuẩn khi năm đó đủ sự kiện mạnh — chỉ
 * "mềm" khi năm quá bình lặng.
 *
 * Toàn bộ ứng viên (kể cả dưới ngưỡng) vẫn giữ nguyên trong debug (engine.ts trả `debugCandidateCount`).
 *
 * Gộp trùng ý nghĩa: chỉ giữ lại sự kiện MẠNH NHẤT trong 1 nhóm ý nghĩa gần nhau, nhường chỗ cho
 * nhóm khác đa dạng hơn (không hiện 8-9/10 chỗ đều là biến thể "Tài sản" như trước). Có thể bổ
 * sung thêm nhóm khác khi có nhu cầu — chưa phủ hết 85 sự kiện.
 */
import type { ScoredEvent } from './types';

const ROLLUP_GROUPS: { ids: string[]; label: string }[] = [
  { ids: ['CAREER_ROLE_CHANGE', 'CAREER_INTERNAL_TRANSFER', 'CAREER_JOB_CHANGE'], label: 'Biến động công việc' },
  {
    ids: [
      'PROPERTY_PURCHASE', 'PROPERTY_SALE', 'PROPERTY_RELOCATION', 'PROPERTY_RENOVATION',
      'PROPERTY_LARGE_EXPENSE', 'PROPERTY_INVESTMENT', 'PROPERTY_FAMILY_ASSET',
      'PROPERTY_INHERITANCE', 'PROPERTY_DISPUTE',
    ],
    label: 'Biến động tài sản',
  },
];

function rollupKeyOf(eventId: string): string | null {
  const g = ROLLUP_GROUPS.find(g => g.ids.includes(eventId));
  return g ? g.label : null;
}

export function rankEvents(all: ScoredEvent[], maxTotal = 10, minStrength = 50, minGuaranteed = 5): ScoredEvent[] {
  const sorted = [...all].sort((a, b) => b.strength - a.strength);
  const seenRollup = new Set<string>();
  const out: ScoredEvent[] = [];

  for (const ev of sorted) {
    if (out.length >= maxTotal) break;
    // Đã đủ sàn tối thiểu VÀ sự kiện này dưới ngưỡng chuẩn → dừng (các sự kiện sau chỉ thấp điểm hơn).
    if (ev.strength < minStrength && out.length >= minGuaranteed) break;
    const key = rollupKeyOf(ev.eventId);
    if (key) {
      if (seenRollup.has(key)) continue;
      seenRollup.add(key);
    }
    out.push(ev);
  }
  return out;
}
