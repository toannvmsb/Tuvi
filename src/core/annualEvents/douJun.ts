/**
 * ĐẨU QUÂN v2 — đúng theo TUZI_Monthly_Event_Timing_Engine_v2.md §4: khác Đẩu Quân "bản mệnh"
 * đã có sẵn trong core/starPlacer.ts (dùng để AN SAO trên chính lá số gốc, cố định theo năm
 * SINH). Ở đây Đẩu Quân dùng để LUẬN THEO THÁNG của một NĂM XEM bất kỳ:
 *
 *   douJun = (chi của NĂM XEM) − (tháng sinh ÂM LỊCH − 1) + (chi giờ sinh)
 *   "Cung Mệnh của tháng 1" = Đẩu Quân; mỗi tháng tiếp theo tiến 1 cung.
 *
 * yearBranch thay đổi theo từng năm xem → Đẩu Quân dịch theo từng năm, nhưng tháng sinh + giờ
 * sinh (hằng số cá nhân) giữ nguyên — đây là điểm KHÁC BIỆT quan trọng so với bản v1 trước đây
 * (v1 chỉ tính "khởi từ Thái Tuế cho tháng 1", KHÔNG cá nhân hóa theo tháng/giờ sinh — sai so
 * với đúng thuật toán Đẩu Quân).
 */
import type { AstrologyResult, EarthlyBranch } from '../../types';
import { BRANCHES, branchIndex } from './calendar';
import { getHourBranchIndex } from '../lunarCalendar';
import { effLunarMonth } from '../lunarFix';

const mod12 = (n: number): number => ((n % 12) + 12) % 12;

/** Chi giờ sinh — dùng đúng hàm của lõi (giờ 23 = Tý, như lúc an Mệnh); bản cũ `floor(hour/2)` xếp giờ 23 vào Hợi. */
export function birthHourBranchIndex(result: AstrologyResult): number {
  return getHourBranchIndex(result.birthInfo.hour);
}

/** Tháng sinh ÂM LỊCH dùng để an Đẩu Quân (1–12). Sinh trong tháng nhuận: ngày 1–15 giữ số tháng, từ ngày 16 dùng tháng kế — cùng quy ước an Mệnh/Thân (core/lunarFix). */
export function birthLunarMonth(result: AstrologyResult): number {
  const l = result.tuViChart.lunarDate;
  return effLunarMonth(l.month, !!l.isLeapMonth, l.day);
}

/** Chỉ số cung Đẩu Quân (0-11) cho 1 NĂM XEM — dùng chi năm xem + tháng/giờ sinh cố định. */
export function douJunIndex(result: AstrologyResult, yearBranch: EarthlyBranch): number {
  return mod12(branchIndex(yearBranch) - (birthLunarMonth(result) - 1) + birthHourBranchIndex(result));
}

/** Cung "Mệnh của tháng" (lưu nguyệt) cho 1 tháng âm lịch cụ thể trong năm xem đó. */
export function monthlyMingBranchIndex(douJunIdx: number, lunarMonth: number): number {
  return mod12(douJunIdx + lunarMonth - 1);
}

export function monthlyMingBranch(result: AstrologyResult, yearBranch: EarthlyBranch, lunarMonth: number): EarthlyBranch {
  return BRANCHES[monthlyMingBranchIndex(douJunIndex(result, yearBranch), lunarMonth)];
}
