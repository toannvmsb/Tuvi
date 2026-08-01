/**
 * Câu hỏi/câu chúc ngày mới hiển thị dưới lời chào ở Home — chọn CỐ ĐỊNH theo
 * ngày trong năm (không đổi mỗi lần mở app trong cùng 1 ngày, đổi khi sang
 * ngày mới) thay vì random mỗi lần render.
 */
const DAILY_LINES: string[] = [
  'Hôm nay bạn muốn tập trung vào điều gì nhất?',
  'Một bước nhỏ hôm nay, một khác biệt lớn ngày mai.',
  'Điều gì khiến bạn thấy biết ơn sáng nay?',
  'Hãy bắt đầu ngày mới bằng một hơi thở thật sâu.',
  'Bạn đã sẵn sàng cho một ngày thật ý nghĩa chưa?',
  'Có việc gì bạn đã trì hoãn quá lâu rồi không?',
  'Hôm nay, hãy làm một điều tốt cho chính mình.',
  'Điều gì đang khiến bạn mong chờ nhất hôm nay?',
  'Một ngày mới — một trang mới để viết tiếp câu chuyện của bạn.',
  'Bạn muốn kết thúc ngày hôm nay với cảm giác thế nào?',
  'Ai là người bạn muốn dành thời gian hôm nay?',
  'Hôm nay, điều gì là ưu tiên số một của bạn?',
  'Chúc bạn một ngày an yên và nhiều năng lượng.',
  'Đừng quên nghỉ ngơi giữa những việc quan trọng hôm nay.',
];

export function dailyGreetingLine(date: Date = new Date()): string {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86400000);
  return DAILY_LINES[((dayOfYear % DAILY_LINES.length) + DAILY_LINES.length) % DAILY_LINES.length];
}
