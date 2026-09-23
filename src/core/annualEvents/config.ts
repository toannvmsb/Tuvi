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

/** Bảng Tứ Hóa theo Can — GIỐNG HỆT core/phiHoa.ts (HOA_BY_STEM), chỉ để đối chiếu/tài liệu.
 *  Engine KHÔNG dùng bảng này để tính — luôn gọi phiHoa.ts (nguồn chuẩn duy nhất, theo CLAUDE.md §2.3). */
export const FOUR_TRANSFORMATIONS_REFERENCE_NOTE =
  'Bảng Tứ Hóa theo can dùng trong engine LUÔN lấy từ core/phiHoa.ts (HOA_BY_STEM/luuTuHoaPositions) — ' +
  'không định nghĩa lại ở đây, tránh 2 nguồn lệch nhau (đã khớp với config/schools/nam_phai_tam_hop_v1.json).';
