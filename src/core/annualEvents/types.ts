/**
 * LUẬN SỰ KIỆN TRONG 1 NĂM — kiểu dữ liệu dùng chung cho toàn bộ engine.
 * Theo tuzi_annual_event_engine_full/ENGINE_SPEC.md — xem README.md trong thư mục engine.core
 * ở cuối module để biết những chỗ đã diễn giải/bổ sung so với spec gốc.
 */
import type { EarthlyBranch, HeavenlyStem } from '../../types';

/** 12 cung — khớp enum trong schemas/astrology_signal.schema.json. */
export type Palace =
  | 'MENH' | 'PHU_MAU' | 'PHUC_DUC' | 'DIEN_TRACH' | 'QUAN_LOC' | 'NO_BOC'
  | 'THIEN_DI' | 'TAT_ACH' | 'TAI_BACH' | 'TU_TUC' | 'PHU_THE' | 'HUYNH_DE';

export type TimeSource = 'NATAL' | 'DA_HAN' | 'ANNUAL' | 'MONTHLY';
export type Polarity = 'POSITIVE' | 'NEGATIVE' | 'ACTIVATING' | 'NEUTRAL';
export type EvidenceFamily =
  | 'NATAL_STRUCTURE' | 'DA_HAN_STRUCTURE' | 'FOUR_TRANSFORMATION' | 'TAI_SUI'
  | 'TIEU_HAN' | 'LUU_NIEN_DAI_HAN' | 'LOC_TON_SYSTEM' | 'MA_SYSTEM'
  | 'ADVERSITY_CLUSTER' | 'MAIN_STAR_PATTERN' | 'TAM_HOP_STRUCTURE' | 'SPECIAL_PATTERN';

/** 1 dữ kiện lá số đã CHUẨN HÓA — sinh ra từ chart calculation layer (core/* của app). */
export interface AstrologySignal {
  source: TimeSource;
  family: EvidenceFamily;
  palace: Palace;
  signalType: string;      // mã sao dùng để khớp rule, vd 'HOA_LOC', 'KINH_DUONG'
  starName: string;        // tên hiển thị tiếng Việt, vd 'Hóa Lộc', 'Kình Dương'
  intensity: number;       // 0..100
  polarity: Polarity;      // polarity NỘI TẠI của tín hiệu (chỉ để hiển thị/lọc — chấm điểm dùng polarity của RULE)
  monthLunar?: number;     // chỉ có khi source === 'MONTHLY'
  meta?: Record<string, unknown>;
}

export interface EventAxis { primary: Palace[]; secondary: Palace[]; weights: Record<string, number>; }
export interface EventGate { minNatal: number; minDaHan: number; minAnnual: number; minIndependentFamilies: number; }
export interface EventDefinition {
  id: string;
  category: string;
  axis: EventAxis;
  intent: Polarity;
  minAnnualScoreForMonthlyTiming: number;
  majorEventGate: EventGate;
  veryHighGate: { minIndependentFamilies: number; requiredLayers: TimeSource[] };
  notes: string[];
}

/** Điều kiện đồng nhất — 1338/1343 rule chỉ dùng dạng này. */
export interface UniformCondition { signal: string; axis: string; matchMode: 'PRIMARY_OR_SECONDARY_AXIS'; }
/** Điều kiện đặc biệt (5 rule "SP_*") — mọi điều kiện con trong `all` đều phải đúng. */
export interface SpecialSubCondition {
  anySignal?: string[]; axis?: string;
  minIndependentFamilies?: number; minDaHanScore?: number; minAnnualAxisScore?: number;
  annualCategoryDirection?: 'POSITIVE' | 'NEGATIVE' | 'MIXED';
  eventMin?: Record<string, number>; categoryMin?: Record<string, number>;
  propertyDirectionIn?: string[];
}
export interface SpecialCondition { all: SpecialSubCondition[]; }
export type RuleCondition = UniformCondition | SpecialCondition;

export interface EventRule {
  id: string;
  event: string;
  condition: RuleCondition;
  evidenceFamily: EvidenceFamily;
  polarity: Polarity;
  baseWeight: number;
  layerMultipliers?: Partial<Record<TimeSource, number>>;
  safety?: string;
  school?: string[];
}

export interface EvidenceItem {
  ruleId: string;
  source: TimeSource;
  palace: Palace;
  signalType: string;
  starName: string;
  contribution: number;
  evidenceFamily: EvidenceFamily;
  polarity: Polarity;
  monthLunar?: number;
}

export type IntensityLevel = 'VERY_LOW' | 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
export type ConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
export type Direction = 'POSITIVE' | 'NEGATIVE' | 'MIXED';

export interface MonthWindow {
  startLunarMonth: number;
  endLunarMonth: number;
  strength: IntensityLevel;
  score: number;
}

export interface ScoreBreakdown {
  natal: number; daHan: number; annualAxis: number; annualFourTransform: number;
  tieuHan: number; luuNienDaHan: number; movingStars: number; structuralSupport: number;
}

export interface ScoredEvent {
  eventId: string;
  category: string;
  title: string;
  strength: number;
  level: IntensityLevel;
  direction: Direction;
  positiveScore: number;
  negativeScore: number;
  confidence: ConfidenceLevel;
  isMajorEvent: boolean;
  isVeryHigh: boolean;
  independentEvidenceFamilies: EvidenceFamily[];
  evidence: EvidenceItem[];
  counterEvidence: EvidenceItem[];
  reasoningChain: string[];
  peakMonths: MonthWindow[];
  narrativeHints: string[];
  breakdown: ScoreBreakdown;
}

export interface CompositeEvent {
  id: string;
  result: string;
  narrativeHint: string;
  memberEventIds: string[];
}

export interface AnnualPrediction {
  targetYear: number;
  targetAge: number;
  yearStem: HeavenlyStem;
  yearBranch: EarthlyBranch;
  yearCanChi: string;
  annualTheme: string[];
  overallIntensity: IntensityLevel;
  events: ScoredEvent[];
  composites: CompositeEvent[];
  engineVersion: string;
  ruleVersion: string;
  schoolProfile: string;
  debugCandidateCount: number;
}
