/**
 * THÁNG NHUẬN KHI AN CUNG (profile Tuzi 2.1 / iztro `fixLeap=true`, 08/10/2026).
 *
 * Thiên văn xác định có tháng nhuận; cách dùng nhuận để an cung là quy tắc thuật số (chọn trường phái):
 *  - nửa đầu tháng nhuận (ngày 1–15) dùng số tháng TRƯỚC (chính số tháng nhuận mang);
 *  - từ ngày 16 dùng số tháng KẾ (tháng sau, 12 → 1).
 * Lịch thật vẫn giữ `month` và `isLeap`; hàm này chỉ cho SỐ THÁNG DÙNG ĐỂ AN CUNG (Mệnh/Thân, Đẩu Quân, lưu nguyệt).
 * Cách "giữ nguyên tháng nhuận" hoặc "ngày nối tháng" phải là profile khác — không đổi ngầm ở đây.
 */
export function effLunarMonth(month: number, isLeap: boolean, day: number): number {
  return isLeap && day > 15 ? (month % 12) + 1 : month;
}
