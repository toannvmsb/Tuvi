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
};

export const CONFIDENCE_WEIGHTS = {
  layerCoverage: 0.35,
  evidenceIndependence: 0.30,
  ruleConsistency: 0.20,
  timingConsistency: 0.15,
};

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

/** §14 — Đẩu Quân tương tác (cộng dồn rồi clamp theo MONTHLY_V3_CAPS.douJunStructure). */
export const DOU_JUN_SCORE = {
  onEventAxis: 8, overlapsAnnualEventPalace: 10, ownTransformHitsAxis: 8,
  annualMingHitsDouJun: 8, mutualInteraction: 12,
} as const;

/** §15 — sao lưu tháng, cộng dồn rồi clamp theo MONTHLY_V3_CAPS.monthlyMovingStars (mã sao khớp movingStars.ts/signalCatalog.ts). */
export const MONTHLY_MOVING_STAR_SCORE: Record<string, number> = {
  THIEN_MA: 6, LOC_TON: 5, KINH_DUONG: 4, DA_LA: 4, HONG_LOAN: 4, THIEN_HY: 4,
  THIEN_KHOI: 3, THIEN_VIET: 3,
};

/** §23 — hệ số hội tụ RIÊNG cho tầng tháng (nhỏ hơn hẳn tầng năm ×1.6 ở CONVERGENCE_MULTIPLIER_CAP). */
export const MONTHLY_CONVERGENCE_MULTIPLIER: Record<number, number> = { 1: 1.0, 2: 1.03, 3: 1.07, 4: 1.12 };
export const MONTHLY_CONVERGENCE_MULTIPLIER_5PLUS = 1.18;
export const MONTHLY_CONVERGENCE_CAP = 1.20;

/** §25 — dải cường độ THỜI ĐIỂM theo điểm tuyệt đối (khác dải INTENSITY_BANDS dùng cho cường độ SỰ KIỆN năm; v3 không còn ngưỡng chặn cứng theo điểm năm, nhưng vẫn giữ dải này để gắn nhãn "đáng chú ý/mạnh/rất mạnh" cho 1 tháng cụ thể). */
export const TIMING_INTENSITY_BANDS: { min: number; max: number; level: 'NOTABLE' | 'ACTIVITY' | 'STRONG' | 'VERY_STRONG' }[] = [
  { min: 0, max: 39, level: 'NOTABLE' },
  { min: 40, max: 59, level: 'ACTIVITY' },
  { min: 60, max: 79, level: 'STRONG' },
  { min: 80, max: 100, level: 'VERY_STRONG' },
];

/** §35 — Timing Confidence (KHÁC CONFIDENCE_WEIGHTS dùng cho confidence của SỰ KIỆN năm). */
export const TIMING_CONFIDENCE_WEIGHTS = {
  annualConfirmation: 0.25, axisMatching: 0.20, crossLayerTuHoa: 0.30,
  evidenceIndependence: 0.15, adjacentMonthCoherence: 0.10,
};

/**
 * TUZI_Tieu_Han_Annual_Event_Focus_Engine_v1.md §31-35 — MONTHLY TIMING v3, THAY THẾ HOÀN TOÀN
 * bộ MONTHLY_V2_* ở trên. Lý do đổi (anh Toàn phản hồi trực tiếp): (1) sự kiện <50-55 điểm năm
 * không có tháng nào cả — v3 bỏ hẳn việc gate theo điểm năm; (2) các tháng đưa ra "khá giống
 * nhau" — nguyên nhân chính là v2 cộng thẳng 25% điểm SỰ KIỆN NĂM vào mọi tháng (annualBaseline),
 * khiến 12 tháng cùng bị kéo về gần nhau quanh 1 mặt bằng chung; §34 nói rõ "Do not include
 * Annual Event score directly in the month-ranking formula" — v3 bỏ hẳn thành phần này, chỉ xếp
 * hạng THÁNG theo dữ kiện RIÊNG của tháng đó, nên các tháng tách biệt rõ hơn.
 */
export const MONTHLY_V3_CAPS = {
  eventPalaceMatch: 18, monthlyFourTransform: 18, annualMovingStarResonance: 12,
  monthlyMovingStars: 12, tieuHanResonance: 15, crossLayerEcho: 15,
  eventSpecificPattern: 7, douJunStructure: 3,
} as const;

/**
 * §35 gốc đo "Top - Second" (tháng đứng đầu trừ tháng NHÌ). Thử trên dữ liệu thật thấy công thức
 * này RẤT DỄ ra LOW một cách giả tạo: 1 lá số có phổ điểm 12 tháng trải dài 70-100 (khác biệt rõ
 * rệt so với phần còn lại của năm) vẫn bị chấm LOW chỉ vì 2 tháng cao nhất tình cờ sát nhau (vd
 * 99 và 100). §34 lại tự định nghĩa `relativeTimingIndex = primaryMonth.score - median` — đúng
 * hơn cho câu hỏi anh Toàn quan tâm ("tháng này có thực sự nổi bật hơn PHẦN CÒN LẠI của năm hay
 * không", không phải "có nổi bật hơn đúng 1 tháng đứng nhì hay không") — nên engine dùng công
 * thức §34 (Top so với TRUNG VỊ 12 tháng) để xếp `timingConfidence`, ngưỡng hiệu chỉnh lại cho
 * phù hợp thang đo mới (gap so với trung vị thường lớn hơn gap giữa 2 tháng liền hạng).
 */
export const TIMING_CONFIDENCE_GAP = { high: 20, medium: 10 };

/** Gộp cửa sổ tháng liền kề quanh tháng đỉnh — giữ nguyên cơ chế cũ, chỉ bỏ ngưỡng tuyệt đối (§27 v2), thay bằng so với tháng đỉnh + trung vị. */
export const MONTHLY_V3_WINDOW = { maxDelta: 10, maxWindowMonths: 3, secondaryMinGapAboveMedian: 5 };

/** §30 — hóa tinh "hợp cơ chế" / "gây áp lực" theo từng nhóm sự kiện — dùng cho "Event-Specific Pattern" (7%).
 *  Nhóm KHÔNG có trong §30 gốc (CHILDREN/FAMILY/MOBILITY/EDUCATION_REPUTATION) suy diễn hợp lý theo đúng
 *  tinh thần §9 (Lộc=mở ra/khởi đầu, Khoa=chính thức hóa/công nhận, Quyền=hành động, Kỵ=vướng mắc). */
export const CATEGORY_PREFERRED_HOA: Record<string, import('../phiHoa').HoaKind[]> = {
  CAREER: ['Hóa Quyền', 'Hóa Lộc', 'Hóa Khoa'],
  FINANCE: ['Hóa Lộc'],
  PROPERTY: ['Hóa Lộc', 'Hóa Quyền'],
  RELATIONSHIP: ['Hóa Lộc', 'Hóa Khoa'],
  CHILDREN: ['Hóa Lộc', 'Hóa Khoa'],
  HEALTH: ['Hóa Khoa'],
  MOBILITY: ['Hóa Quyền', 'Hóa Lộc'],
  EDUCATION_REPUTATION: ['Hóa Khoa'],
  FAMILY: ['Hóa Lộc', 'Hóa Khoa'],
  LEGAL: ['Hóa Khoa'],
};
export const CATEGORY_ADVERSE_HOA: Record<string, import('../phiHoa').HoaKind[]> = {
  FINANCE: ['Hóa Kỵ'],
  HEALTH: ['Hóa Kỵ'],
  LEGAL: ['Hóa Kỵ'],
  RELATIONSHIP: ['Hóa Kỵ'],
  FAMILY: ['Hóa Kỵ'],
  PROPERTY: ['Hóa Kỵ'],
};

/** Bảng Tứ Hóa theo Can — GIỐNG HỆT core/phiHoa.ts (HOA_BY_STEM), chỉ để đối chiếu/tài liệu.
 *  Engine KHÔNG dùng bảng này để tính — luôn gọi phiHoa.ts (nguồn chuẩn duy nhất, theo CLAUDE.md §2.3). */
export const FOUR_TRANSFORMATIONS_REFERENCE_NOTE =
  'Bảng Tứ Hóa theo can dùng trong engine LUÔN lấy từ core/phiHoa.ts (HOA_BY_STEM/luuTuHoaPositions) — ' +
  'không định nghĩa lại ở đây, tránh 2 nguồn lệch nhau (đã khớp với config/schools/nam_phai_tam_hop_v1.json).';
