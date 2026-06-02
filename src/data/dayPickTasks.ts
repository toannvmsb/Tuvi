/**
 * Cây lựa chọn "Xem ngày để xuất hành" — 12 nhóm việc × 54 việc cụ thể.
 * Nguồn: tài liệu nội bộ "Cây lựa chọn xem ngày Tử Vi" (anh Toàn).
 *
 * Mỗi việc có thêm thuộc tính `weight` (mức độ "trọng đại") — việc weight cao
 * (vd cưới hỏi, động thổ, M&A) cần ngày đẹp HƠN, phải loại ngày xung tuổi.
 * Việc weight thấp (đầu tư, mua bảo hiểm) chỉ cần ngày khá là được.
 */

export interface DayPickTask {
  /** Mã việc — dùng làm key */
  code: string;
  /** Tên hiển thị */
  name: string;
  /** Mức độ trọng đại 1-5 (5 = phải tránh xung tuổi tuyệt đối) */
  weight: 1 | 2 | 3 | 4 | 5;
}

export interface DayPickGroup {
  code: string;
  name: string;
  emoji: string;
  tasks: DayPickTask[];
}

export const DAY_PICK_GROUPS: DayPickGroup[] = [
  {
    code: 'WORK', name: 'Công việc & Sự nghiệp', emoji: '💼',
    tasks: [
      { code: 'WORK_IMPORTANT', name: 'Đi làm việc quan trọng', weight: 3 },
      { code: 'WORK_MEET_LEADER', name: 'Gặp lãnh đạo', weight: 3 },
      { code: 'WORK_INTERVIEW', name: 'Phỏng vấn', weight: 4 },
      { code: 'WORK_NEW_JOB', name: 'Nhận việc mới', weight: 4 },
      { code: 'WORK_CHANGE_JOB', name: 'Đổi việc', weight: 4 },
      { code: 'WORK_PROMOTION', name: 'Nhận chức vụ mới', weight: 5 },
      { code: 'WORK_LABOR_CONTRACT', name: 'Ký hợp đồng lao động', weight: 4 },
      { code: 'WORK_NEGOTIATE', name: 'Đàm phán công việc', weight: 3 },
      { code: 'WORK_BIG_DECISION', name: 'Ra quyết định lớn', weight: 5 },
    ],
  },
  {
    code: 'BIZ', name: 'Kinh doanh', emoji: '🏪',
    tasks: [
      { code: 'BIZ_OPEN_SHOP', name: 'Khai trương cửa hàng', weight: 5 },
      { code: 'BIZ_OPEN_COMPANY', name: 'Mở công ty', weight: 5 },
      { code: 'BIZ_OPEN_BRANCH', name: 'Mở chi nhánh', weight: 4 },
      { code: 'BIZ_LAUNCH', name: 'Ra mắt sản phẩm mới', weight: 5 },
      { code: 'BIZ_CONTRACT', name: 'Ký hợp đồng kinh doanh', weight: 4 },
      { code: 'BIZ_PARTNER', name: 'Gặp đối tác', weight: 3 },
      { code: 'BIZ_HIRE', name: 'Tuyển dụng nhân sự', weight: 3 },
      { code: 'BIZ_COOP', name: 'Ký hợp đồng hợp tác', weight: 4 },
      { code: 'BIZ_EXPAND', name: 'Mở rộng thị trường', weight: 4 },
      { code: 'BIZ_BIGDEAL', name: 'Chốt giao dịch lớn', weight: 5 },
    ],
  },
  {
    code: 'FIN', name: 'Tài chính & Đầu tư', emoji: '💰',
    tasks: [
      { code: 'FIN_INVEST', name: 'Đầu tư', weight: 4 },
      { code: 'FIN_LOAN', name: 'Vay vốn', weight: 3 },
      { code: 'FIN_COLLECT', name: 'Thu hồi công nợ', weight: 3 },
      { code: 'FIN_INSURANCE', name: 'Mua bảo hiểm', weight: 2 },
    ],
  },
  {
    code: 'PROP', name: 'Nhà đất & Tài sản', emoji: '🏠',
    tasks: [
      { code: 'PROP_BUY_HOUSE', name: 'Mua nhà', weight: 5 },
      { code: 'PROP_SELL_HOUSE', name: 'Bán nhà', weight: 4 },
      { code: 'PROP_DEPOSIT_HOUSE', name: 'Đặt cọc nhà', weight: 4 },
      { code: 'PROP_GROUNDBREAK', name: 'Động thổ', weight: 5 },
      { code: 'PROP_BUILD', name: 'Khởi công xây dựng', weight: 5 },
      { code: 'PROP_MOVE_IN', name: 'Nhập trạch', weight: 5 },
      { code: 'PROP_BUY_LAND', name: 'Mua đất', weight: 5 },
      { code: 'PROP_BUY_CAR', name: 'Mua xe', weight: 4 },
    ],
  },
  {
    code: 'LOVE', name: 'Tình cảm & Gia đình', emoji: '💖',
    tasks: [
      { code: 'LOVE_CONFESS', name: 'Tỏ tình', weight: 3 },
      { code: 'LOVE_ENGAGE', name: 'Đính hôn', weight: 5 },
      { code: 'LOVE_REGISTER_MARRIAGE', name: 'Đăng ký kết hôn', weight: 5 },
      { code: 'LOVE_WEDDING', name: 'Tổ chức đám cưới', weight: 5 },
    ],
  },
  {
    code: 'CHILD', name: 'Con cái', emoji: '👶',
    tasks: [
      { code: 'CHILD_CSECTION', name: 'Chọn ngày sinh mổ', weight: 5 },
      { code: 'CHILD_NAME', name: 'Đặt tên con', weight: 4 },
      { code: 'CHILD_EXAM', name: 'Thi cử', weight: 4 },
    ],
  },
  {
    code: 'EDU', name: 'Học tập', emoji: '📚',
    tasks: [
      { code: 'EDU_CERT', name: 'Thi chứng chỉ', weight: 4 },
      { code: 'EDU_START', name: 'Khai giảng khóa học', weight: 3 },
    ],
  },
  {
    code: 'TRAVEL', name: 'Xuất hành & Du lịch', emoji: '🧳',
    tasks: [
      { code: 'TRAVEL_BUSINESS', name: 'Đi công tác', weight: 3 },
      { code: 'TRAVEL_VACATION', name: 'Du lịch', weight: 2 },
      { code: 'TRAVEL_ABROAD', name: 'Xuất ngoại', weight: 4 },
    ],
  },
  {
    code: 'HEALTH', name: 'Sức khỏe', emoji: '🩺',
    tasks: [
      { code: 'HEALTH_CHECKUP', name: 'Khám sức khỏe', weight: 2 },
      { code: 'HEALTH_SURGERY', name: 'Phẫu thuật', weight: 5 },
    ],
  },
  {
    code: 'LEGAL', name: 'Pháp lý & Giấy tờ', emoji: '📜',
    tasks: [
      { code: 'LEGAL_NOTARIZE', name: 'Công chứng', weight: 3 },
      { code: 'LEGAL_PROPERTY_DOC', name: 'Làm giấy tờ nhà đất', weight: 4 },
      { code: 'LEGAL_OPEN_BIZ', name: 'Mở doanh nghiệp', weight: 5 },
    ],
  },
  {
    code: 'SPIRIT', name: 'Tâm linh & Truyền thống', emoji: '🙏',
    tasks: [
      { code: 'SPIRIT_RITUAL', name: 'Cúng lễ', weight: 3 },
      { code: 'SPIRIT_FIRST_SALE', name: 'Mở hàng đầu năm', weight: 4 },
    ],
  },
  {
    code: 'VIP', name: 'Doanh nhân VIP', emoji: '👑',
    tasks: [
      { code: 'VIP_FUND', name: 'Gọi vốn', weight: 5 },
      { code: 'VIP_MA', name: 'M&A', weight: 5 },
      { code: 'VIP_APPOINT', name: 'Bổ nhiệm nhân sự', weight: 5 },
      { code: 'VIP_LAUNCH', name: 'Ra mắt sản phẩm', weight: 5 },
    ],
  },
];

/** Tìm task + group theo code task. */
export function findTaskByCode(taskCode: string): { group: DayPickGroup; task: DayPickTask } | null {
  for (const g of DAY_PICK_GROUPS) {
    const t = g.tasks.find(x => x.code === taskCode);
    if (t) return { group: g, task: t };
  }
  return null;
}
