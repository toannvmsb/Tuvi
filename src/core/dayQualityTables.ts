/**
 * BẢNG VÀ CẤU HÌNH CỦA LOGIC "NGÀY ĐẸP" (nhatVan.ts / dayPicker.ts).
 * Mọi con số ở đây là THIẾT KẾ TUZI ("TẠM") — chưa hiệu chuẩn bằng dữ liệu thật (đặc tả §13: trọng số không phải tỷ lệ cổ truyền).
 * Đổi trọng số/ngưỡng/bảng ⇒ tăng DAY_RULEBOOK_VERSION.
 */
import type { EarthlyBranch, HeavenlyStem } from '../types';

export const DAY_RULEBOOK_VERSION = 'dq-1.0-tam';

/** Trọng số các tầng của điểm ngày (tổng = 1). Không có tầng Tử Vi: đặc tả §7.5 — chưa có rule pack được duyệt thì không chấm. */
export const DAY_WEIGHTS = {
  /** Lịch trạch nhật: Trực, Hoàng/Hắc đạo, Lục Diệu, Nhị thập bát tú, Đức. */
  calendar: 0.27,
  /** Tương tác Bát Tự: hành/thập thần của can-chi ngày, quan hệ chi ngày với 4 trụ. */
  bazi: 0.38,
  daiVan: 0.12,
  luuNien: 0.13,
  nguyetVan: 0.10,
} as const;

/** Ngưỡng nhãn — GIỮ NGUYÊN như bản cũ để màu lịch không đổi vì lý do ngưỡng. */
export const DAY_RATING_CUTS = { veryGood: 70, good: 55, normal: 40, caution: 25 } as const;

/** Mức phạt/trần cho quy tắc cứng ở cấp NGÀY (màu lịch chung). */
export const DAY_HARD = {
  xungTuoiCap: 40,
  /** Nguyệt phá (chi ngày xung chi tháng tiết khí) — trần điểm. */
  monthBreakCap: 42,
  /** Tuế phá (chi ngày xung Thái Tuế của năm Lập Xuân) — trần điểm. */
  tuePhaCap: 50,
  tamNuong: 20,
  nguyetKy: 15,
  /** Nghi/kỵ Đức: cộng vào điểm lịch nền (0..100) cho mỗi Đức trúng ngày. */
  ducBonus: 6,
} as const;

/** Việc từ mức trọng đại này trở lên (hoặc nhóm xuất hành) mới chịu Tam Nương / Nguyệt kỵ / Nguyệt phá / Tuế phá làm "loại". */
export const BIG_TASK_WEIGHT = 4;

// ─────────────────────────────────────────────
// NHỊ THẬP BÁT TÚ — bảng "二十八宿值日吉凶歌" của NGỌC HẠP KÝ (14 cát / 14 hung) — đúng nguồn anh Toàn bổ sung 07/10/2026
// (Hiep_Ky_Doi_chieu/ngochap_28_ban_chep.txt, nhãn đầu mỗi bài). Đây là trường phái `yu_xia_ji_mansions` (lịch Việt), KHÔNG phải Hiệp Kỷ:
// Hiệp Kỷ quyển 1 chỉ dùng phối tú vào ngày cho Phục Đoạn / Ám Kim. Nhãn tổng chưa nói thuận/kỵ từng việc (vd Sâm cát nhưng bất lợi hôn nhân;
// Khuê hung nhưng thuận xây dựng) — vì vậy tú chỉ là phần phụ (25% tầng lịch), không dùng làm nghi/kỵ theo việc.
// Mốc chu kỳ: 01/01/2000 dương lịch = Vị (khớp thứ trong tuần; đối chiếu xemlicham.com: 08/10/2026 = Tỉnh, 07/03/2033 = Nguy…).
// ─────────────────────────────────────────────
export const NHI28_NAMES = [
  'Giác', 'Cang', 'Đê', 'Phòng', 'Tâm', 'Vĩ', 'Cơ',
  'Đẩu', 'Ngưu', 'Nữ', 'Hư', 'Nguy', 'Thất', 'Bích',
  'Khuê', 'Lâu', 'Vị', 'Mão', 'Tất', 'Chủy', 'Sâm',
  'Tỉnh', 'Quỷ', 'Liễu', 'Tinh', 'Trương', 'Dực', 'Chẩn',
];
const CAT = new Set(['Giác', 'Phòng', 'Cơ', 'Vĩ', 'Đẩu', 'Thất', 'Bích', 'Lâu', 'Vị', 'Tất', 'Sâm', 'Tỉnh', 'Trương', 'Chẩn']);
/** Hung nặng hơn các tú hung còn lại (Quỷ, Liễu: các lịch Việt đều xếp đại hung). */
const DAI_HUNG = new Set(['Quỷ', 'Liễu']);
export const NHI28_GOOD: boolean[] = NHI28_NAMES.map(n => CAT.has(n));
export const NHI28_SCORES: number[] = NHI28_NAMES.map(n => (CAT.has(n) ? 80 : DAI_HUNG.has(n) ? 15 : 30));
export const NHI28_HINT: string[] = NHI28_NAMES.map(n =>
  CAT.has(n) ? 'tú cát — thuận khởi sự, giao dịch' : DAI_HUNG.has(n) ? 'đại hung — kỵ việc trọng đại' : 'tú hung — nên thận trọng việc lớn');
export const NHI28_REF_JD = 2451545;
export const NHI28_REF_IDX = 16;

// ─────────────────────────────────────────────
// THIÊN ĐỨC / NGUYỆT ĐỨC (theo THÁNG TIẾT KHÍ). Giá trị là can (HeavenlyStem) hoặc chi (EarthlyBranch) của NGÀY.
// Thứ tự theo tháng Dần … Sửu. Chỉ nhận diện "ngày trúng Đức"; KHÔNG dùng để gỡ Nguyệt phá (Hiệp Kỷ: Phá không bị Đức giải).
// ─────────────────────────────────────────────
export const THIEN_DUC_BY_MONTH: (HeavenlyStem | EarthlyBranch)[] = [
  'Đinh', 'Thân', 'Nhâm', 'Tân', 'Hợi', 'Giáp', 'Quý', 'Dần', 'Bính', 'Ất', 'Tị', 'Canh',
];
export const NGUYET_DUC_BY_MONTH: HeavenlyStem[] = [
  'Bính', 'Giáp', 'Nhâm', 'Canh', 'Bính', 'Giáp', 'Nhâm', 'Canh', 'Bính', 'Giáp', 'Nhâm', 'Canh',
];

// ─────────────────────────────────────────────
// PHÂN VIỆC (đặc tả §8.4): việc nào chịu quy tắc nào. Theo mã nhóm + mức trọng đại, không hard-code từng việc rời rạc.
// ─────────────────────────────────────────────
/** Nhóm không bị loại bởi Nguyệt phá / Tuế phá dù trọng đại (khám chữa bệnh: Trực Phá thậm chí hợp "phá bệnh"). */
export const BREAK_EXEMPT_GROUPS = new Set(['HEALTH']);
/** Việc "xuất hành" luôn chịu Tam Nương / Nguyệt kỵ dù mức trọng đại thấp. */
export const TRAVEL_GROUPS = new Set(['TRAVEL']);
/** Việc chịu cảnh báo Kim Lâu (cưới gả, làm nhà). */
export const KIM_LAU_TASKS = new Set([
  'LOVE_ENGAGE', 'LOVE_REGISTER_MARRIAGE', 'LOVE_WEDDING',
  'PROP_GROUNDBREAK', 'PROP_BUILD', 'PROP_MOVE_IN',
]);

export function isBigTask(groupCode: string, weight: number): boolean {
  return weight >= BIG_TASK_WEIGHT || TRAVEL_GROUPS.has(groupCode);
}

// ─────────────────────────────────────────────
// VIỆC (54 việc của "Xem ngày tốt") → MỤC VIỆC trong Hiệp Kỷ quyển 11 (src/data/hiepKyTruc.ts, số thứ tự 1..73).
// Là bước DIỄN GIẢI của Tuzi (activityMapping, đặc tả §8.2) — chờ anh Toàn duyệt. Việc không có mục tương ứng → dùng nhóm (TRUC_GOOD_FALLBACK).
// ─────────────────────────────────────────────
export const TASK_TO_HK: Record<string, number> = {
  WORK_IMPORTANT: 16, WORK_MEET_LEADER: 16, WORK_INTERVIEW: 16, WORK_NEW_JOB: 23, WORK_CHANGE_JOB: 23, WORK_PROMOTION: 23,
  WORK_LABOR_CONTRACT: 52, WORK_NEGOTIATE: 52, WORK_BIG_DECISION: 13,
  BIZ_OPEN_SHOP: 51, BIZ_OPEN_COMPANY: 51, BIZ_OPEN_BRANCH: 51, BIZ_LAUNCH: 51, BIZ_CONTRACT: 52, BIZ_PARTNER: 16, BIZ_HIRE: 28,
  BIZ_COOP: 52, BIZ_EXPAND: 51, BIZ_BIGDEAL: 52,
  FIN_INVEST: 53, FIN_LOAN: 52, FIN_COLLECT: 53, FIN_INSURANCE: 52,
  PROP_BUY_HOUSE: 52, PROP_SELL_HOUSE: 52, PROP_DEPOSIT_HOUSE: 52, PROP_GROUNDBREAK: 44, PROP_BUILD: 44, PROP_MOVE_IN: 29,
  PROP_BUY_LAND: 52, PROP_BUY_CAR: 52,
  LOVE_CONFESS: 16, LOVE_ENGAGE: 26, LOVE_REGISTER_MARRIAGE: 25, LOVE_WEDDING: 27,
  CHILD_CSECTION: 36, CHILD_EXAM: 17,
  EDU_CERT: 17, EDU_START: 17,
  TRAVEL_BUSINESS: 19, TRAVEL_VACATION: 19, TRAVEL_ABROAD: 19,
  HEALTH_CHECKUP: 36, HEALTH_SURGERY: 36,
  LEGAL_NOTARIZE: 52, LEGAL_PROPERTY_DOC: 52, LEGAL_OPEN_BIZ: 51,
  SPIRIT_RITUAL: 1, SPIRIT_FIRST_SALE: 51,
  VIP_FUND: 53, VIP_MA: 52, VIP_APPOINT: 8, VIP_LAUNCH: 51,
};
/** Hôn nhân: Hiệp Kỷ KHÔNG ghi Trực nghi đích danh — nghi đi qua Tam Hợp (liên hệ Thành/Định, quyển 10). Giữ Định/Thành làm nghi mềm. */
export const TASK_SOFT_NGHI: Record<string, number[]> = {
  LOVE_ENGAGE: [4, 8], LOVE_REGISTER_MARRIAGE: [4, 8], LOVE_WEDDING: [4, 8],
};

/**
 * Ngày theo CHI kỵ một mục việc (Hiệp Kỷ quyển 10, "Phô chú điều lệ": 凡巳日忌出行 / 凡酉日忌宴會 / 凡天狗寅日忌祭祀).
 * Khóa = số mục Hiệp Kỷ (xem TASK_TO_HK). Việc không có mục tương ứng (đào giếng, cắt tóc…) chưa nằm trong danh mục việc của app.
 */
export const HK_DAY_BRANCH_KY: Record<number, { branch: EarthlyBranch; why: string }> = {
  19: { branch: 'Tị', why: 'ngày Tị kỵ xuất hành' },
  16: { branch: 'Dậu', why: 'ngày Dậu kỵ yến hội, gặp gỡ' },
  1: { branch: 'Dần', why: 'ngày Dần (Thiên Cẩu) kỵ tế tự' },
};
export const HK_DAY_BRANCH_PENALTY = 10;
