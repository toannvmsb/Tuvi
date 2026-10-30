/**
 * Dòng đối chiếu Bát Tự cho từng cửa sổ tháng của một sự kiện (Luận sự kiện năm / Sự kiện theo tháng).
 * Tử Vi chọn tháng; Bát Tự (trụ tháng theo tiết khí × lá số gốc) chỉ NÓI THÊM tháng đó có/không có dấu hiệu cùng mảng — KHÔNG đổi điểm,
 * và không phải bằng chứng độc lập (hai hệ cùng đọc một lá số).
 */
import type { AreaId } from '../config';
import { areaOfEvent } from '../areaMap';
import { AREA_LABEL } from '../config';

/** Ngưỡng điểm tháng (0..100) coi là "có dấu hiệu" — TẠM. */
export const BAZI_MONTH_NOTE_MIN = 40;

export function baziMonthNote(
  months: (Record<AreaId, number> | null)[] | null, eventId: string, startMonth: number, endMonth: number,
): string | null {
  const area = areaOfEvent(eventId);
  if (!months || !area) return null;
  let best = 0, seen = false;
  for (let m = startMonth; m <= endMonth; m++) {
    const s = months[m - 1]?.[area];
    if (s == null) continue;
    seen = true;
    best = Math.max(best, s);
  }
  if (!seen) return null;
  const label = AREA_LABEL[area].toLowerCase();
  return best >= BAZI_MONTH_NOTE_MIN
    ? `Bát Tự cũng có dấu hiệu ở mảng ${label} trong ${startMonth === endMonth ? `tháng ${startMonth}` : `tháng ${startMonth}–${endMonth}`} (cùng có dấu hiệu, chỉ là đối chiếu thêm).`
    : `Bát Tự chưa thấy dấu hiệu rõ ở mảng ${label} trong ${startMonth === endMonth ? `tháng ${startMonth}` : `tháng ${startMonth}–${endMonth}`}.`;
}
