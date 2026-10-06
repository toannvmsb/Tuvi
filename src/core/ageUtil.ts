/**
 * Tuổi (mụ) TÍNH THEO NGÀY THỰC TẾ — KHÔNG dùng `tuViChart.viewingAge`.
 *
 * `viewingAge` được tính 1 LẦN lúc lập lá số theo "Năm xem" người dùng chọn
 * lúc đó (mặc định = năm hiện tại KHI TẠO LÁ SỐ) rồi lưu cố định — nếu lá số
 * được tạo từ trước và người dùng không cập nhật lại "Năm xem", giá trị này
 * sẽ CŨ dần theo thời gian. Các khối gắn nhãn "hôm nay/tháng này" (box Nhịp
 * tháng ở Home, gợi ý ngày/tháng ở Tasks…) cần tuổi ĐÚNG THỜI ĐIỂM THỰC, nên
 * phải tính lại từ `birthInfo.year` + ngày hệ thống, cùng công thức "tuổi mụ"
 * mà tuViEngine.ts dùng cho viewingAge (vy - solarYear + 1) để nhất quán với
 * cách lunarYearForAge/scoreNguyetVan diễn giải tham số `age`.
 */
import type { AstrologyResult, BirthInfo } from '../types';
import { solarToLunar } from './lunarCalendar';

/**
 * NĂM ÂM LỊCH SINH — mốc duy nhất để tính tuổi mụ, Đại hạn, Tiểu hạn. Lá số nhập DƯƠNG lịch: đổi ngày sinh sang âm lịch (người sinh từ 1/1 tới Tết
 * thuộc năm âm lịch TRƯỚC, nên trước 06/10/2026 họ bị lệch 1 tuổi mụ ở khắp app); lá số nhập ÂM lịch: `year` đã là năm âm lịch.
 */
export function lunarBirthYear(b: Pick<BirthInfo, 'day' | 'month' | 'year' | 'calendarType'>): number {
  return b.calendarType === 'solar' ? solarToLunar(b.day, b.month, b.year).year : b.year;
}

/** Tuổi mụ của một NĂM (năm − năm âm lịch sinh + 1). Dùng thay cho mọi phép `năm − birthInfo.year`. */
export function tuoiMuOfYear(b: Pick<BirthInfo, 'day' | 'month' | 'year' | 'calendarType'>, year: number): number {
  return year - lunarBirthYear(b) + 1;
}

export function currentAgeOf(result: AstrologyResult, atDate: Date = new Date()): number {
  return tuoiMuOfYear(result.birthInfo, atDate.getFullYear());
}
