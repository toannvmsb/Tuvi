import type { ResolvedEvent } from '../core/lifeEventEngine';

// Heavenly Stems (Thiên Can)
export type HeavenlyStem = 'Giáp' | 'Ất' | 'Bính' | 'Đinh' | 'Mậu' | 'Kỷ' | 'Canh' | 'Tân' | 'Nhâm' | 'Quý';

// Earthly Branches (Địa Chi)
export type EarthlyBranch = 'Tý' | 'Sửu' | 'Dần' | 'Mão' | 'Thìn' | 'Tị' | 'Ngọ' | 'Mùi' | 'Thân' | 'Dậu' | 'Tuất' | 'Hợi';

// Five Elements (Ngũ Hành)
export type FiveElement = 'Kim' | 'Mộc' | 'Thủy' | 'Hỏa' | 'Thổ';

// Cục số (Element number for Tử Vi)
export type CucSo = 2 | 3 | 4 | 5 | 6;

// Gender
export type Gender = 'nam' | 'nu';

// Date type (solar or lunar)
export type CalendarType = 'solar' | 'lunar';

// Birth information input
export interface BirthInfo {
  name: string;
  gender: Gender;
  birthplace: string;
  calendarType: CalendarType;
  year: number;
  month: number;
  day: number;
  hour: number;   // 0–23
  minute: number;
  isLeapMonth?: boolean;  // for lunar calendar
  language: 'vi' | 'en';
  anthropicApiKey?: string;
  openaiApiKey?: string;
  aiProvider?: 'auto' | 'claude' | 'openai'; // ưu tiên nhà cung cấp AI
  chartId?: string;       // id lá số trên server (nếu đã lưu) — để gắn unlock theo lá số
  viewingYear?: number;   // năm xem đã chọn
}

// Lunar date
export interface LunarDate {
  year: number;
  month: number;
  day: number;
  isLeapMonth: boolean;
  yearStem: HeavenlyStem;
  yearBranch: EarthlyBranch;
}

// Solar date
export interface SolarDate {
  year: number;
  month: number;
  day: number;
}

// A single Tử Vi house
export interface TuViHouse {
  branch: EarthlyBranch;       // Địa Chi of this cung (Tý, Sửu, ...)
  palaceName: string;           // Mệnh, Phụ Mẫu, Phúc Đức, ...
  isManh: boolean;              // true = Mệnh cung
  isThan: boolean;              // true = Thân cung
  stars: StarEntry[];
  can: HeavenlyStem;            // Can của cung
  element: FiveElement;         // Ngũ hành của cung
  vongTruongSinh?: string;      // Tràng sinh/Mộc dục/... (label tại cung)
  daiVanStartAge?: number;      // Tuổi khởi Đại Vận của cung (2, 12, 22, ...)
  daiVanIndex?: number;         // Index trong sequence T.1 → T.12 (hiển thị trên UI)
  tuanAt?: boolean;             // Cung có Tuần Không
  trietAt?: boolean;            // Cung có Triệt Lộ
  monthIndex?: number;          // Tháng tại cung (1-12) — T.1 khởi tại giờ sinh, thuận chiều
}

// A star placed in a house
export interface StarEntry {
  name: string;
  type: 'chinh' | 'cat' | 'hung' | 'trung' | 'luu';
  brightness?: 'miếu' | 'vượng' | 'đắc' | 'hãm' | 'bình';
}

// Full Tử Vi chart result
export interface TuViChart {
  lunarDate: LunarDate;
  cucSo: CucSo;
  cucName: string;
  menhCung: EarthlyBranch;
  thanCung: EarthlyBranch;
  menhCan: HeavenlyStem;
  menhElement: FiveElement;
  napAmMenh: string;                        // e.g. "Đại Hải Thủy"
  menhChu: string;                          // Sao chủ Mệnh
  thanChu: string;                          // Sao chủ Thân
  amDuongThuanLy: 'thuận' | 'nghịch';       // Âm dương thuận/nghịch lý
  viewingYear?: number;                     // Năm đang xem (vd 2026)
  viewingAge?: number;                      // Tuổi tại năm đang xem
  viewingYearStem?: HeavenlyStem;
  viewingYearBranch?: EarthlyBranch;
  monthStem?: HeavenlyStem;                 // Can tháng sinh
  monthBranch?: EarthlyBranch;              // Chi tháng sinh
  dayStem?: HeavenlyStem;                   // Can ngày sinh
  dayBranch?: EarthlyBranch;                // Chi ngày sinh
  hourStem?: HeavenlyStem;                  // Can giờ sinh
  hourBranch?: EarthlyBranch;               // Chi giờ sinh
  tuanAt?: [EarthlyBranch, EarthlyBranch];  // 2 cung bị Tuần (cạnh nhau)
  trietAt?: [EarthlyBranch, EarthlyBranch]; // 2 cung bị Triệt
  houses: TuViHouse[];   // 12 houses, indexed 0–11 (Tý=0...Hợi=11)
}

// Four Pillars pillar
export interface Pillar {
  stem: HeavenlyStem;
  branch: EarthlyBranch;
  hiddenStems: HeavenlyStem[];
  element: FiveElement;
  label: string;   // 'Năm' | 'Tháng' | 'Ngày' | 'Giờ'
}

// Bát Tự result
export interface BatTuChart {
  pillars: [Pillar, Pillar, Pillar, Pillar]; // Năm, Tháng, Ngày, Giờ
  dayMaster: HeavenlyStem;
  dayMasterElement: FiveElement;
  elementCounts: Record<FiveElement, number>;
  favorableElements: FiveElement[];
  unfavorableElements: FiveElement[];
}

// One Đại Vận cycle
export interface DaiVan {
  index: number;
  startAge: number;
  endAge: number;
  stem: HeavenlyStem;
  branch: EarthlyBranch;
  element: FiveElement;
  /** @deprecated (V2.0) Dùng `scoreDaiVan(result, dv).taiLoc` (0–100) thay cho thang 1–10 này. Giữ lại cho WealthChart cũ. */
  wealthScore: number;  // 1–10 for chart
}

// One Tiểu Vận year
export interface TieuVan {
  age: number;
  year: number;
  stem: HeavenlyStem;          // Can của CUNG tiểu hạn
  branch: EarthlyBranch;        // Địa chi CUNG tiểu hạn
  element: FiveElement;
  daiVanIndex: number;
  yearStem: HeavenlyStem;       // Can của NĂM (để an sao lưu)
  yearBranch: EarthlyBranch;    // Địa chi của NĂM (để an sao lưu)
}

// Full astrology result
export interface AstrologyResult {
  birthInfo: BirthInfo;
  tuViChart: TuViChart;
  batTuChart: BatTuChart;
  daiVans: DaiVan[];
  tieuVans: TieuVan[];
  /** (V2.0) Phiên bản schema của canonical model — optional để tương thích ngược. */
  schemaVersion?: string;
}

/** Phiên bản canonical data model hiện tại (V2.0). */
export const SCHEMA_VERSION = '2.0';

// Navigation param list
export type RootStackParamList = {
  Home: undefined;
  Input: undefined;
  Settings: undefined;
  Account: { focus?: 'upgrade' } | undefined;
  MainTabs: { result: AstrologyResult };
  PalaceDetail: { result: AstrologyResult; branchIndex: number };
  FullChartAI: { result: AstrologyResult };
  WealthChart: { result: AstrologyResult };
  // `result` optional — Home dùng "chế độ mặc định" (chưa gắn lá số) điều
  // hướng sang đây không kèm lá số, DailyScreen tự render nhánh chung.
  DailyView: { result?: AstrologyResult };
  // `result` optional — chế độ cơ bản (chưa gắn lá số) vẫn xem ngày tốt được,
  // chỉ không cá nhân hóa theo Bát Tự/tuổi (xem pickGoodDaysGeneric).
  DayPicker: { result?: AstrologyResult };
  // Không còn nhận `result` qua route — Tasks tự nạp lá số "của tôi" (nếu có)
  // giống hệt Notes, vì Việc & Mục tiêu gắn theo NGƯỜI DÙNG chứ không theo lá số.
  Tasks: undefined;
  Notes: undefined;
  MyCharts: undefined;
  CompareCharts: { preSelectedResult?: AstrologyResult };
  Portrait: { result?: AstrologyResult } | undefined;
  EditChart: { row: import('../lib/charts').SavedChartRow };
  AnnualEvents: { result: AstrologyResult; year?: number };
  PastReview: { result?: AstrologyResult };
  PastLife: { result?: AstrologyResult };
  FutureReview: { result?: AstrologyResult };
  BabyBirth: { result?: AstrologyResult } | undefined;
  MonthEvents: { result: AstrologyResult; year: number; month: number };
  EventContext: { result: AstrologyResult };
  Wallet: undefined;
  Privacy: undefined;
  Terms: undefined;
  About: undefined;
  Notifications: undefined;
  Promotions: undefined;
  EventDetail: { event: ResolvedEvent; result?: AstrologyResult };
};

/** 5 tab chính của thiết kế mới (chứa trong route Home của Stack). */
export type TabParamList = {
  Overview: undefined;
  ChartHub: undefined;
  VanHub: undefined;
  DayView: { result?: AstrologyResult } | undefined;
  Menu: undefined;
};

export type MainTabParamList = {
  TuViChart: { result: AstrologyResult };
  BatTu: { result: AstrologyResult };
  Analysis: { result: AstrologyResult };
  DaiVan: { result: AstrologyResult };
  TieuVan: { result: AstrologyResult };
  NguyetVan: { result: AstrologyResult };
  NhatVan: { result: AstrologyResult };
};
