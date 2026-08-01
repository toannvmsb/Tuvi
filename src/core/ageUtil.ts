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
import type { AstrologyResult } from '../types';

export function currentAgeOf(result: AstrologyResult, atDate: Date = new Date()): number {
  return atDate.getFullYear() - result.birthInfo.year + 1;
}
