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

const mod12 = (n: number): number => ((n % 12) + 12) % 12;

/** Chi giờ sinh — app lưu birthInfo.hour là mốc BẮT ĐẦU mỗi khung 2 giờ theo đúng thứ tự Tý=0…Hợi=22. */
export function birthHourBranchIndex(result: AstrologyResult): number {
  return Math.floor(result.birthInfo.hour / 2) % 12;
}

/** Tháng sinh ÂM LỊCH (1–12, tháng nhuận tính như tháng thường theo đúng chính sách "SAME_AS_PREVIOUS_MONTH" mặc định của spec §19). */
export function birthLunarMonth(result: AstrologyResult): number {
  return result.tuViChart.lunarDate.month;
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
