/**
 * NGHIỆM QUÁ KHỨ — CẤU HÌNH. Mọi con số/ngưỡng/trọng số của tính năng nằm ở đây hoặc trong
 * `bazi/rules.ts`, KHÔNG viết cứng trong logic. Giá trị đánh dấu "TẠM" là giá trị khởi điểm do em
 * đặt, chờ anh duyệt và chỉnh sau đợt thử nội bộ (đặc tả "Chỉ số đo lường").
 *
 * Quy ước mốc đổi năm: dùng NĂM ÂM LỊCH (mùng 1 Tết) cho cả Tử Vi lẫn Bát Tự — đúng cách app đang
 * lập trụ năm/tháng Bát Tự (xem core/batTuEngine.ts). Chưa dùng Lập Xuân; nếu sau này đổi thì chỉ
 * đổi ở `bazi/flow.ts`.
 */

/** Tăng khi đổi bảng quy tắc/trọng số — điểm năm lưu kèm phiên bản này để biết mốc nào cần tính lại. */
export const RULEBOOK_VERSION = 'pr-0.1-tam';

export const AREAS = ['career', 'home', 'love', 'wealth', 'family'] as const;
export type AreaId = typeof AREAS[number];

export const AREA_LABEL: Record<AreaId, string> = {
  career: 'Sự nghiệp',
  home: 'Chỗ ở & di chuyển',
  love: 'Tình duyên',
  wealth: 'Tài lộc',
  family: 'Gia đạo',
};

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
export const EVENT_MIN_AGE: Record<string, number> = {
  RELATIONSHIP_ENGAGEMENT: 18, RELATIONSHIP_MARRIAGE: 18,
  CAREER_PROMOTION: 18, CAREER_JOB_CHANGE: 17, CAREER_JOB_LOSS: 17, CAREER_ROLE_CHANGE: 18,
  CAREER_INTERNAL_TRANSFER: 18, CAREER_LEADERSHIP: 22, CAREER_BUSINESS_START: 18, CAREER_BUSINESS_EXPANSION: 20,
  CAREER_RESPONSIBILITY_INCREASE: 18, CAREER_WORK_CONFLICT: 17, CAREER_WORK_PRESSURE: 17,
  CAREER_RECOGNITION: 17, CAREER_STAGNATION: 18, REPUTATION_RECOGNITION: 16,
  FINANCE_INVESTMENT: 18, FINANCE_INVESTMENT_GAIN: 18, FINANCE_INVESTMENT_LOSS: 18, FINANCE_DEBT_INCREASE: 18,
  FINANCE_DEBT_REDUCTION: 18, FINANCE_FINANCIAL_DISPUTE: 18, FINANCE_ASSET_ACCUMULATION: 18,
  FINANCE_LARGE_EXPENSE: 17, FINANCE_CASHFLOW_PRESSURE: 17,
  PROPERTY_PURCHASE: 20, PROPERTY_SALE: 20, PROPERTY_INVESTMENT: 20, PROPERTY_LARGE_EXPENSE: 20,
  PROPERTY_RENOVATION: 20, PROPERTY_FAMILY_ASSET: 18, PROPERTY_DISPUTE: 18,
  CHILD_PREGNANCY_SIGNAL: 20, CHILD_BIRTH_SIGNAL: 20, CHILD_EDUCATION_EVENT: 22, CHILD_MAJOR_CHANGE: 22,
};

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
