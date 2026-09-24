/**
 * Cấu hình school profile + trọng số chấm điểm — sao chép trực tiếp từ
 * tuzi_annual_event_engine_full/config/schools/nam_phai_tam_hop_v1.json và config/scoring_v1.json
 * (đóng gói vào TS để không phải bundle thêm file JSON ngoài src/, và để không ai vô tình
 * sửa nhầm cấu hình gốc khi sửa code chấm điểm). Đổi số liệu ở đây phải cập nhật version.
 */
export const SCHOOL_PROFILE_ID = 'NAM_PHAI_TAM_HOP_V1';
export const RULE_VERSION = 'annual_event_rules_v1';
export const ENGINE_VERSION = 'tuzi-annual-events-1.0.0';

/**
 * Trọng số baseScore theo §9 ENGINE_SPEC — 8 nhóm cộng lại = 100%.
 * DIỄN GIẢI (không có trong bộ rule gốc, engine tự bổ sung — xem README cuối file
 * ruleEngine.ts để biết lý do): 1343 rule chỉ tạo tín hiệu ở 2 nhóm NATAL/DA_HAN/ANNUAL
 * (theo family), KHÔNG có rule nào gắn family TIEU_HAN/LUU_NIEN_DAI_HAN/DA_HAN_STRUCTURE —
 * 2 nhóm "TieuHan" và "LuuNienDaHan" + phần cấu trúc Đại Vận trong "DaHanActivation" do
 * engine tự tính từ core/daiVanScore.ts (Thiên Thời/Địa Lợi/Nhân Hòa) và vị trí Tiểu Hạn,
 * KHÔNG lấy từ 1343 rule. "MovingStars" = riêng family MA_SYSTEM (Thiên Mã) ở tầng ANNUAL;
 * các family LOC_TON_SYSTEM/TAI_SUI/ADVERSITY_CLUSTER ở tầng ANNUAL gộp vào "AnnualAxisActivation".
 */
export const BASE_WEIGHTS = {
  natal: 0.15,
  daHan: 0.25,
  annualAxis: 0.20,
  annualFourTransform: 0.15,
  tieuHan: 0.08,
  luuNienDaHan: 0.07,
  movingStars: 0.05,
  structuralSupport: 0.05,
} as const;

export const CONVERGENCE_MULTIPLIER: Record<number, number> = { 1: 1.0, 2: 1.08, 3: 1.17, 4: 1.28, 5: 1.4 };
export const CONVERGENCE_MULTIPLIER_6PLUS = 1.55;
export const CONVERGENCE_MULTIPLIER_CAP = 1.6;

export const INTENSITY_BANDS: { min: number; max: number; level: import('./types').IntensityLevel }[] = [
  { min: 0, max: 19, level: 'VERY_LOW' },
  { min: 20, max: 39, level: 'LOW' },
  { min: 40, max: 59, level: 'MODERATE' },
  { min: 60, max: 79, level: 'HIGH' },
  { min: 80, max: 100, level: 'VERY_HIGH' },
];

export const DIRECTION_DELTA = 25;

export const SUPPRESSION = {
  daHanScoreLtCapFinal: { threshold: 25, cap: 59 },
  natalDaHanBlockMajor: { natalLt: 25, daHanLt: 30 },
  monthlyCap: [
    { annualEventScoreLt: 50, cap: 55 },
    { annualEventScoreLt: 35, cap: 45 },
  ],
};

export const MONTHLY_WEIGHTS = {
  annualEventBaseline: 0.40,
  monthlyAxisHit: 0.20,
  monthlyFourTransform: 0.25,
  douJunInteraction: 0.10,
  otherMonthlySignals: 0.05,
};

export const CONFIDENCE_WEIGHTS = {
  layerCoverage: 0.35,
  evidenceIndependence: 0.30,
  ruleConsistency: 0.20,
  timingConsistency: 0.15,
};

export const PEAK_MONTH_DELTA = 12;

/**
 * TUZI_Monthly_Event_Timing_Engine_v2.md — thay thế hoàn toàn MONTHLY_WEIGHTS/SUPPRESSION.monthlyCap
 * ở trên (giữ nguyên 2 hằng số cũ để không phá vỡ chỗ khác lỡ còn import, nhưng monthlyTiming.ts
 * từ nay CHỈ dùng bộ hằng số MONTHLY_V2_* này).
 */
export const MONTHLY_V2_WEIGHTS = {
  annualBaseline: 0.25,
  axisResonance: 0.20,
  monthlyFourTransform: 0.25,
  crossLayerEcho: 0.15,
  douJun: 0.05,
  movingStars: 0.05,
  structural: 0.05,
} as const;

/** §21 — cap riêng từng thành phần (điểm tuyệt đối 0..cap, ÁP DỤNG TRƯỚC khi nhân trọng số ở trên). */
export const MONTHLY_V2_CAPS = {
  annualBaseline: 25, axisResonance: 20, monthlyFourTransform: 25,
  crossLayerEcho: 15, douJun: 5, movingStars: 5, structural: 5,
} as const;

/** §8 — trọng số hình học giữa 2 chi (tháng ↔ cung tham chiếu). */
export const MONTHLY_GEOMETRY_WEIGHT: Record<'DIRECT' | 'OPPOSITION' | 'TRINE' | 'ADJACENT' | 'NONE', number> = {
  DIRECT: 1.0, OPPOSITION: 0.85, TRINE: 0.70, ADJACENT: 0.25, NONE: 0,
};
/** §8 — Hóa Kỵ nhấn mạnh xung chiếu hơn cả đồng cung (school-configurable, để mặc định theo spec). */
export const KY_OPPOSITION_MULTIPLIER = 1.05;

/** §36 MONTHLY_GENERIC_ECHO_001 — điểm gốc theo hình học cho "Tứ Hóa tháng có chạm trục sự kiện". */
export const MONTHLY_TU_HOA_GEOMETRY_BONUS: Record<'DIRECT' | 'OPPOSITION' | 'TRINE' | 'ADJACENT' | 'NONE', number> = {
  DIRECT: 15, OPPOSITION: 13, TRINE: 10, ADJACENT: 0, NONE: 0,
};

/** §6 — Same-Function Overlap: dùng pattern MẠNH NHẤT áp dụng được, không cộng dồn. */
export const MONTHLY_OVERLAP_SCORE = {
  natalOnly: 8, daHanOnly: 12, annualOnly: 16, annualPlusDaHan: 22, allThree: 28,
} as const;

/** §10 — Transformation Echo: cùng loại hóa cùng đích (Lộc/Quyền/Khoa/Kỵ theo thứ tự). */
export const ECHO_SAME_TRANSFORM: Record<string, number> = {
  'Hóa Lộc': 22, 'Hóa Quyền': 22, 'Hóa Khoa': 18, 'Hóa Kỵ': 25,
};
/** §10 — khác loại hóa nhưng trùng đích (khóa theo "annualHoa|monthlyHoa"); cặp không liệt kê dùng fallback. */
export const ECHO_CROSS_TRANSFORM: Record<string, number> = {
  'Hóa Lộc|Hóa Quyền': 16, 'Hóa Quyền|Hóa Khoa': 14, 'Hóa Lộc|Hóa Kỵ': 16,
  'Hóa Quyền|Hóa Kỵ': 17, 'Hóa Khoa|Hóa Quyền': 14,
};
export const ECHO_CROSS_TRANSFORM_FALLBACK = 10;
/** §11 — ưu tiên theo tầng khi so khớp Tứ Hóa tháng với tầng trên. */
export const ECHO_LAYER_PRIORITY = { ANNUAL: 1.0, DA_HAN: 0.85, NATAL: 0.70 } as const;

/** §14 — Đẩu Quân tương tác (cộng dồn rồi clamp theo MONTHLY_V2_CAPS.douJun). */
export const DOU_JUN_SCORE = {
  onEventAxis: 8, overlapsAnnualEventPalace: 10, ownTransformHitsAxis: 8,
  annualMingHitsDouJun: 8, mutualInteraction: 12,
} as const;

/** §15 — sao lưu tháng, cộng dồn rồi clamp theo MONTHLY_V2_CAPS.movingStars (mã sao khớp movingStars.ts/signalCatalog.ts). */
export const MONTHLY_MOVING_STAR_SCORE: Record<string, number> = {
  THIEN_MA: 6, LOC_TON: 5, KINH_DUONG: 4, DA_LA: 4, HONG_LOAN: 4, THIEN_HY: 4,
  THIEN_KHOI: 3, THIEN_VIET: 3,
};

/** §23 — hệ số hội tụ RIÊNG cho tầng tháng (nhỏ hơn hẳn tầng năm ×1.6 ở CONVERGENCE_MULTIPLIER_CAP). */
export const MONTHLY_CONVERGENCE_MULTIPLIER: Record<number, number> = { 1: 1.0, 2: 1.03, 3: 1.07, 4: 1.12 };
export const MONTHLY_CONVERGENCE_MULTIPLIER_5PLUS = 1.18;
export const MONTHLY_CONVERGENCE_CAP = 1.20;

/** §24 — thay SUPPRESSION.monthlyCap cũ. */
export const MONTHLY_V2_SUPPRESSION = {
  blockBelowAnnual: 50,
  capAt60BelowAnnual: 55,
  capAt45BelowAnnual: 40,
};

/** §25 — dải cường độ THỜI ĐIỂM (khác dải INTENSITY_BANDS dùng cho cường độ SỰ KIỆN). */
export const TIMING_INTENSITY_BANDS: { min: number; max: number; level: 'NOTABLE' | 'ACTIVITY' | 'STRONG' | 'VERY_STRONG' }[] = [
  { min: 55, max: 64, level: 'NOTABLE' },
  { min: 65, max: 74, level: 'ACTIVITY' },
  { min: 75, max: 84, level: 'STRONG' },
  { min: 85, max: 100, level: 'VERY_STRONG' },
];

/** §27/§28 — gộp cửa sổ tháng liền kề + quy tắc "1 tháng đỉnh duy nhất". */
export const TIMING_WINDOW_MERGE = { minScore: 70, maxDelta: 10, maxWindowMonths: 3 };
export const UNIQUE_PEAK_MIN_SCORE = 75;
export const UNIQUE_PEAK_MIN_DELTA = 12;

/** §35 — Timing Confidence (KHÁC CONFIDENCE_WEIGHTS dùng cho confidence của SỰ KIỆN năm). */
export const TIMING_CONFIDENCE_WEIGHTS = {
  annualConfirmation: 0.25, axisMatching: 0.20, crossLayerTuHoa: 0.30,
  evidenceIndependence: 0.15, adjacentMonthCoherence: 0.10,
};

/** Bảng Tứ Hóa theo Can — GIỐNG HỆT core/phiHoa.ts (HOA_BY_STEM), chỉ để đối chiếu/tài liệu.
 *  Engine KHÔNG dùng bảng này để tính — luôn gọi phiHoa.ts (nguồn chuẩn duy nhất, theo CLAUDE.md §2.3). */
export const FOUR_TRANSFORMATIONS_REFERENCE_NOTE =
  'Bảng Tứ Hóa theo can dùng trong engine LUÔN lấy từ core/phiHoa.ts (HOA_BY_STEM/luuTuHoaPositions) — ' +
  'không định nghĩa lại ở đây, tránh 2 nguồn lệch nhau (đã khớp với config/schools/nam_phai_tam_hop_v1.json).';
