/**
 * NGHIỆM QUÁ KHỨ — CẤU HÌNH. Mọi con số/ngưỡng/trọng số của tính năng nằm ở đây hoặc trong
 * `bazi/rules.ts`, KHÔNG viết cứng trong logic. Giá trị đánh dấu "TẠM" là giá trị khởi điểm do em
 * đặt, chờ anh duyệt và chỉnh sau đợt thử nội bộ (đặc tả "Chỉ số đo lường").
 *
 * Quy ước năm: Tử Vi dùng NĂM ÂM LỊCH (mùng 1 Tết). Bát Tự: xem BAZI_BASIS bên dưới (năm/tháng của LƯU NIÊN luôn gọi theo năm âm lịch
 * đang xét; BAZI_BASIS chỉ quyết định cách lập trụ NĂM và THÁNG của lá số gốc).
 */

import { EVENT_AGE_WINDOW } from '../annualEvents/applicability';

/** Tăng khi đổi bảng quy tắc/trọng số — điểm năm lưu kèm phiên bản này để biết mốc nào cần tính lại. */
export const RULEBOOK_VERSION = 'pr-0.4-tam';

/**
 * Cơ sở lập trụ NĂM/THÁNG Bát Tự: 'tiet' = đúng phép (trụ năm đổi ở Lập Xuân, trụ tháng đổi ở 12 tiết). Từ 06/10/2026 màn Bát Tự của app
 * (core/batTuEngine.ts) CŨNG lập theo tiết khí nên hai nơi luôn khớp; 'lunar' chỉ còn là công tắc dự phòng để so sánh/lùi lại.
 */
export const BAZI_BASIS: 'tiet' | 'lunar' = 'tiet';

export const AREAS = ['career', 'home', 'love', 'wealth', 'family'] as const;
export type AreaId = typeof AREAS[number];

export const AREA_LABEL: Record<AreaId, string> = {
  career: 'Sự nghiệp',
  home: 'Chỗ ở & di chuyển',
  love: 'Tình duyên',
  wealth: 'Tài lộc',
  family: 'Gia đạo',
};

/**
 * NGƯỠNG CỔNG RA MẮT (thử mù, xem blindTest.ts) — CHỐT TẠM ngày 05/10/2026 theo yêu cầu của anh Toàn để chạy thật trước; điều chỉnh lại khi
 * có đủ dữ liệu thử nghiệm. Tính năng vẫn mang nhãn "Thử nghiệm" cho tới khi ĐẠT cổng này.
 *  - passDiff: tỉ lệ khớp của mốc do bộ máy chọn phải hơn năm ngẫu nhiên cùng mảng ít nhất ngần này (0.15 = 15 điểm phần trăm);
 *  - minPersons: số người thử tối thiểu trả lời cả hai nhóm.
 */
export const LAUNCH_GATE = { passDiff: 0.15, minPersons: 50, provisional: true } as const;

/** LUẬN TƯƠNG LAI — các năm từ năm âm lịch hiện tại tới khi đủ `untilAge` tuổi (mọi giá trị TẠM, cùng RULEBOOK_VERSION). */
export const FUTURE_CONFIG = {
  untilAge: 100,
  /** Chặn cứng số năm tính (an toàn hiệu năng). */
  maxYears: 90,
  markersMax: 12,
  maxPerArea: 3,
  /** Mỗi đại hạn tối đa ngần này năm nổi bật. */
  maxPerDaiVan: 2,
  minMarkerStrength: 25,
} as const;

export const PAST_CONFIG = {
  /** Chỉ xét năm người dùng từ ngần này tuổi trở lên (tuổi theo cách app tính: năm − năm sinh + 1). */
  minAge: 15,
  /** Chấm tối đa ngần này năm gần nhất (không kể năm hiện tại). */
  scoreYears: 30,
  /** Ưu tiên ngần này năm gần nhất (dễ nhớ); năm xa hơn nhân hệ số `olderYearFactor`. */
  recentYears: 20,
  olderYearFactor: 0.85,

  /** Số mốc: 5–8; người dưới `under25Age` tuổi chỉ hiện `markersUnder25` mốc. */
  markersMin: 5,
  markersMax: 8,
  markersUnder25: 3,
  under25Age: 25,
  maxPerArea: 2,
  /** Cần ít nhất ngần này phản hồi (Đúng/Gần đúng/Sai) mới nhắc kiểm tra lại giờ sinh khi quá nửa là Sai. */
  birthHourHintMinAnswers: 3,
  /** Tối đa ngần này mốc trong cùng một đại hạn — tránh dồn cục vào một giai đoạn (TẠM). */
  maxPerDaiVan: 4,
  /** Các mốc phải trải trên ít nhất ngần này đại hạn (nếu lá số có đủ ứng viên). */
  minDaiVanSpan: 2,
  /** Dưới ngưỡng này không đưa vào danh sách dù chưa đủ số mốc (TẠM). */
  minMarkerStrength: 25,

  /** Ngưỡng 3 mức độ mạnh trên `strength` (TẠM). */
  tier: { strong: 60, medium: 40 },

  /** Tín hiệu lưu niên trùng mảng với đại vận đang đi → nhân hệ số này (TẠM). */
  daiVanSameAreaMult: 1.25,
  /** Hai hệ cùng báo một mảng trong cùng năm → cộng thưởng; mỗi hệ phải đạt ít nhất `agreeMinEach` (TẠM). */
  agreeBonus: 1.2,
  agreeMinEach: 30,
  /** Chỉ một hệ báo → vẫn giữ nhưng nhân hệ số này để xếp sau (TẠM). */
  singleSystemFactor: 0.6,

  /** Số sự kiện Tử Vi mạnh nhất của mỗi mảng được lấy làm tín hiệu để giải thích. */
  tuviTopEvents: 2,
  /** Tối đa tín hiệu Tử Vi giữ lại cho mỗi mảng/năm (tránh phình dữ liệu). */
  tuviMaxSignalsPerArea: 10,

  /**
   * Tuổi mà sự kiện của mảng đó rất phổ biến (ra trường đi làm ~22, lập gia đình ~27): mốc rơi đúng
   * các tuổi này bị loại vì "đúng với phần đông thì không nói được gì về lá số" (TẠM).
   */
  commonAges: {
    career: [21, 22, 23],
    home: [] as number[],
    love: [26, 27, 28],
    wealth: [] as number[],
    family: [] as number[],
  } as Record<AreaId, number[]>,
} as const;

/**
 * Tuổi tối thiểu để một sự kiện cụ thể có nghĩa — sự kiện dưới tuổi này bị bỏ khỏi điểm Tử Vi của năm đó
 * (vd không nói "kết hôn" hay "tranh chấp tiền bạc" ở tuổi 15). Sự kiện không có trong bảng: không giới hạn.
 * TẠM.
 */
export const EVENT_MIN_AGE: Record<string, number> = Object.fromEntries(Object.entries(EVENT_AGE_WINDOW).map(([k, w]) => [k, w[0]]));
/**
 * Tuổi TỐI ĐA hợp lý cho một số sự kiện (nguồn duy nhất: annualEvents/applicability.EVENT_AGE_WINDOW; chủ yếu để Luận tương lai không báo "được thăng chức" ở tuổi 90). Chỉ áp cho sự kiện có tên ở đây;
 * sự kiện không ghi thì không giới hạn (vd được ghi nhận, sum họp gia đình). Giá trị TẠM; chỉ ảnh hưởng người trên ~50 tuổi.
 */
export const EVENT_MAX_AGE: Record<string, number> = Object.fromEntries(Object.entries(EVENT_AGE_WINDOW).map(([k, w]) => [k, w[1]]));
/**
 * Chuẩn hóa điểm mỗi hệ về 0..100 THEO TỪNG LÁ SỐ: cả hai hệ đều cho điểm nền ở hầu hết các năm (khảo sát
 * 3 lá số mẫu: Bát Tự có tín hiệu ở 16–26/30 năm, Tử Vi mọi năm), nên điểm tuyệt đối không phân biệt được
 * năm "có biến động" với năm thường. Lấy điểm so với phân bố của chính lá số đó: ≤ phân vị `low` → 0,
 * ≥ phân vị `high` → 100. Vẫn tất định cho cùng một lá số. Hệ quả: "agree" nghĩa là CẢ HAI hệ cùng ở
 * nhóm năm nổi bật nhất của lá số đó, không phải chỉ cùng có tín hiệu.
 */
export const NORMALIZE = {
  lowPercentile: 0.5,
  highPercentile: 0.95,
} as const;

/** Các mảng có đường riêng trên biểu đồ thăng trầm (không có sức khỏe; "chỗ ở" chỉ nằm trong danh sách mốc). */
export const CHART_AREAS: AreaId[] = ['career', 'wealth', 'love', 'family'];
