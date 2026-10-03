/**
 * Xếp hạng hiển thị — 2 cơ chế song song, phục vụ 2 mục đích khác nhau:
 *
 * 1) `rankEvents()` — tóm tắt "Nhìn chung"/prompt AI/bản Nâng cao offline (KHÔNG đổi so với trước):
 *    hiện sự kiện đạt strength >= 50, tối đa 10 sự kiện/năm, sàn tối thiểu 5 (hạ ngưỡng dần nếu
 *    năm quá bình lặng), gộp trùng ý nghĩa qua ROLLUP_GROUPS. Xem lịch sử quyết định ở dưới.
 *
 * 2) `groupFeaturedEvents()` / `groupEventsForExport()` — mục "Sự kiện nổi bật" hiển thị trên app
 *    (theo yêu cầu mới của anh Toàn): gom TẤT CẢ sự kiện theo 10 nhóm lớn (CATEGORY_VN), mỗi nhóm
 *    LUÔN lấy đúng 3 sự kiện mạnh nhất trong nhóm, xếp giảm dần — KHÔNG chặn điểm tối thiểu, KHÔNG
 *    gộp trùng (ROLLUP_GROUPS không áp dụng ở đây: có nhóm như "Tài sản" mà toàn bộ 9 sự kiện con
 *    đều chung 1 rollup key, gộp sẽ chỉ còn lại 1/3 chỗ — sai yêu cầu "mỗi nhóm 3 sự kiện con").
 *    `groupEventsForExport()`: toàn bộ sự kiện đang hiện ở "Sự kiện nổi bật" + các sự kiện khác đạt
 *    từ 45 điểm (ngưỡng riêng, không giới hạn số lượng/nhóm) — chỉ dùng để xuất PDF đầy đủ (nút
 *    "Xuất đầy đủ các sự kiện"), không hiển thị hết trên app.
 *
 * — Lịch sử `rankEvents()`: thay ENGINE_SPEC §21 "tối đa 5 sự kiện/năm, tối đa 2 sự kiện/nhóm".
 * Ngưỡng 50 từng thử ở mức 45 nhưng ra quá nhiều (có lá số lên tới 66/85 sự kiện) — nâng lên 50 +
 * trần 10. Sàn tối thiểu 5 vì anh Toàn không muốn có lá số/năm KHÔNG có sự kiện nào ở phần tóm tắt.
 *
 * Toàn bộ ứng viên (kể cả dưới ngưỡng) vẫn giữ nguyên trong debug (engine.ts trả `debugCandidateCount`).
 */
import type { CategoryEventGroup, ScoredEvent } from './types';
import { CATEGORY_VN, categoryTitleOf } from './eventTitles';

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

function groupByCategory(all: ScoredEvent[]): Map<string, ScoredEvent[]> {
  const map = new Map<string, ScoredEvent[]>();
  for (const ev of all) {
    if (!map.has(ev.category)) map.set(ev.category, []);
    map.get(ev.category)!.push(ev);
  }
  return map;
}

/** "Sự kiện nổi bật" — xem giải thích ở đầu file. */
export function groupFeaturedEvents(all: ScoredEvent[], perCategory = 3): CategoryEventGroup[] {
  const byCategory = groupByCategory(all);
  const groups: CategoryEventGroup[] = [];
  for (const category of Object.keys(CATEGORY_VN)) {
    const events = byCategory.get(category);
    if (!events || events.length === 0) continue;
    const sorted = [...events].sort((a, b) => b.strength - a.strength).slice(0, perCategory);
    groups.push({ category, label: categoryTitleOf(category), events: sorted });
  }
  return groups;
}

/**
 * Nhóm đầy đủ để xuất PDF — xem giải thích ở đầu file. Gồm: (1) TOÀN BỘ sự kiện đang hiện ở mục
 * "Sự kiện nổi bật" (`featured`, bất kể điểm) + (2) mọi sự kiện khác đạt >= `minStrength` (mặc định 45).
 * Trong mỗi nhóm xếp giảm dần theo điểm.
 */
export function groupEventsForExport(all: ScoredEvent[], minStrength = 45, featured: CategoryEventGroup[] = []): CategoryEventGroup[] {
  const featuredIds = new Set(featured.flatMap(g => g.events.map(e => e.eventId)));
  const byCategory = groupByCategory(all.filter(e => e.strength >= minStrength || featuredIds.has(e.eventId)));
  const groups: CategoryEventGroup[] = [];
  for (const category of Object.keys(CATEGORY_VN)) {
    const events = byCategory.get(category);
    if (!events || events.length === 0) continue;
    groups.push({ category, label: categoryTitleOf(category), events: [...events].sort((a, b) => b.strength - a.strength) });
  }
  return groups;
}

/**
 * Tháng âm lịch ĐẠI DIỆN của 1 sự kiện — dùng cho mục "Sự kiện theo tháng" (đếm số sự kiện/tháng +
 * lọc theo tháng ở màn chi tiết). `peakMonths[0]` LUÔN là cửa sổ có điểm cao nhất (xem
 * monthlyTiming.ts — mergeAround dựng quanh `sortedAll[0]`, tức mốc "xác suất xảy ra nhiều hơn"),
 * lấy `startLunarMonth` của cửa sổ đó làm tháng đại diện (cửa sổ có thể trải dài 2 tháng, vd 3–4).
 * `null` nếu sự kiện chưa xác định được cửa sổ tháng nào (hiếm — mọi sự kiện LUÔN có ít nhất 1
 * cửa sổ theo Monthly Timing v3 §34, nhưng vẫn phòng hờ).
 */
export function primaryMonthOf(e: ScoredEvent): number | null {
  return e.peakMonths[0]?.startLunarMonth ?? null;
}
