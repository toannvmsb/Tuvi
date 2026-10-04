/**
 * BỘ CHỌN MỐC — chọn 5–8 mốc nổi bật từ điểm các năm đã qua (đúng "Chọn mốc nổi bật" của đặc tả):
 *  - mỗi năm tối đa một mốc (mảng mạnh nhất còn hợp lệ), tối đa `maxPerArea` mốc cùng một mảng và
 *    `maxPerDaiVan` mốc cùng một đại hạn;
 *  - trải trên ít nhất `minDaiVanSpan` đại hạn nếu lá số có đủ ứng viên;
 *  - chỉ năm từ `minAge` tuổi, ưu tiên `recentYears` năm gần nhất, bỏ năm hiện tại;
 *  - bỏ (mảng, tuổi) rơi đúng tuổi phổ biến của sự kiện đó;
 *  - dưới `under25Age` tuổi chỉ lấy `markersUnder25` mốc.
 * Thuần tất định: thứ tự ưu tiên có tie-break cố định (điểm → năm gần hơn → thứ tự mảng).
 */
import { AREAS, PAST_CONFIG, type AreaId } from './config';
import type { MarkerTier, PastMarker, YearScore } from './types';

interface Cand {
  year: number;
  age: number;
  area: AreaId;
  value: number;
  strength: number;
  daiVanIndex: number | null;
}

export function tierOf(agree: boolean, strength: number): MarkerTier {
  if (agree && strength >= PAST_CONFIG.tier.strong) return 'manh';
  if (agree || strength >= PAST_CONFIG.tier.medium) return 'vua';
  return 'nhe';
}

export function selectMarkers(scores: YearScore[], opts: { currentLunarYear: number; currentAge: number }): PastMarker[] {
  const { currentLunarYear, currentAge } = opts;
  const target = currentAge < PAST_CONFIG.under25Age ? PAST_CONFIG.markersUnder25 : PAST_CONFIG.markersMax;
  const minGuaranteed = Math.min(PAST_CONFIG.markersMin, target);

  const cands: Cand[] = [];
  for (const y of scores) {
    if (y.year >= currentLunarYear || y.age < PAST_CONFIG.minAge) continue;
    const factor = currentLunarYear - y.year <= PAST_CONFIG.recentYears ? 1 : PAST_CONFIG.olderYearFactor;
    for (const area of AREAS) {
      if (PAST_CONFIG.commonAges[area].includes(y.age)) continue;
      const as = y.areas[area];
      // Tie-break rất nhỏ theo tổng điểm hai hệ để các năm cùng độ mạnh không hòa hẳn (vẫn tất định).
      const value = as.strength * factor + 0.001 * (as.tuvi + as.bazi);
      cands.push({ year: y.year, age: y.age, area, value, strength: as.strength, daiVanIndex: y.daiVanIndex });
    }
  }
  const areaOrder = (a: AreaId) => AREAS.indexOf(a);
  cands.sort((a, b) => b.value - a.value || b.year - a.year || areaOrder(a.area) - areaOrder(b.area));

  const picked: Cand[] = [];
  const usedYears = new Set<number>();
  const perArea: Partial<Record<AreaId, number>> = {};
  const perDv = new Map<number | null, number>();
  const canTake = (c: Cand) =>
    !usedYears.has(c.year) &&
    (perArea[c.area] ?? 0) < PAST_CONFIG.maxPerArea &&
    (perDv.get(c.daiVanIndex) ?? 0) < PAST_CONFIG.maxPerDaiVan;
  const take = (c: Cand) => {
    picked.push(c); usedYears.add(c.year);
    perArea[c.area] = (perArea[c.area] ?? 0) + 1;
    perDv.set(c.daiVanIndex, (perDv.get(c.daiVanIndex) ?? 0) + 1);
  };

  for (const c of cands) {
    if (picked.length >= target) break;
    if (!canTake(c)) continue;
    // Ngưỡng điểm tối thiểu chỉ áp cho các mốc SAU mốc thứ `minGuaranteed`.
    if (picked.length >= minGuaranteed && c.strength < PAST_CONFIG.minMarkerStrength) continue;
    take(c);
  }

  // Trải trên ≥ minDaiVanSpan đại hạn: nếu chưa đủ, thay mốc yếu nhất bằng ứng viên mạnh nhất ở đại hạn khác.
  const span = () => new Set(picked.map(p => p.daiVanIndex)).size;
  while (picked.length >= 2 && span() < PAST_CONFIG.minDaiVanSpan) {
    const usedDv = new Set(picked.map(p => p.daiVanIndex));
    const repl = cands.find(c =>
      !usedDv.has(c.daiVanIndex) && !usedYears.has(c.year) &&
      c.strength >= PAST_CONFIG.minMarkerStrength && (perArea[c.area] ?? 0) < PAST_CONFIG.maxPerArea);
    if (!repl) break;
    const weakest = picked.reduce((w, p) => (p.value < w.value ? p : w), picked[0]);
    picked.splice(picked.indexOf(weakest), 1);
    usedYears.delete(weakest.year);
    perArea[weakest.area] = (perArea[weakest.area] ?? 1) - 1;
    perDv.set(weakest.daiVanIndex, (perDv.get(weakest.daiVanIndex) ?? 1) - 1);
    take(repl);
  }

  const byYear = new Map(scores.map(s => [s.year, s]));
  return picked
    .sort((a, b) => b.value - a.value || b.year - a.year || areaOrder(a.area) - areaOrder(b.area))
    .map(c => {
      const as = byYear.get(c.year)!.areas[c.area];
      return {
        year: c.year, age: c.age, area: c.area,
        tier: tierOf(as.agree, as.strength),
        agree: as.agree, strength: as.strength,
        daiVanIndex: c.daiVanIndex, topEventId: as.topEventId, signals: as.signals,
      };
    });
}
