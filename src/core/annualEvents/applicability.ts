/**
 * ÁP DỤNG ĐƯỢC HAY KHÔNG — lọc sự kiện theo hoàn cảnh người xem (học từ cổng hoàn cảnh của đặc tả Tuzi 2.1, 08/10/2026).
 *
 * Engine chấm điểm 85 sự kiện chỉ từ lá số; nó không biết người xem có đang đi làm, có con, đang có đôi… nên từng đưa ra
 * "Sinh con", "Thăng chức" cho người không có hoàn cảnh đó. Lớp này KHÔNG đổi điểm sự kiện — chỉ quyết định sự kiện nào
 * được PHÉP hiển thị/xếp hạng:
 *  1. Cờ hoàn cảnh = `false` (người dùng khai rõ "không") → sự kiện đó không áp dụng, ẩn đi.
 *     Cờ chưa khai (thiếu/null) → KHÔNG ẩn (khác 2.1: ở đây thiếu thông tin thì vẫn hiện, để kết quả không bị thưa).
 *  2. Tuổi (tuổi mụ) ngoài khoảng hợp lý của sự kiện → không áp dụng, kể cả khi chưa khai hoàn cảnh.
 * Các cờ là 28 cờ của `lib/eventContext` (nhãn ở `data/eventContextLabels`).
 */
import type { ScoredEvent } from './types';

export type EventContextFlags = Record<string, boolean | null | undefined>;

/** Khoảng tuổi mụ hợp lý [min, max] của từng sự kiện (mặc định: không giới hạn). Con số TẠM, chỉ chặn trường hợp vô lý. */
export const EVENT_AGE_WINDOW: Record<string, [number, number]> = {
  CAREER_PROMOTION: [18, 62], CAREER_RESPONSIBILITY_INCREASE: [18, 70], CAREER_JOB_CHANGE: [17, 65], CAREER_JOB_LOSS: [17, 65],
  CAREER_ROLE_CHANGE: [18, 65], CAREER_INTERNAL_TRANSFER: [18, 62], CAREER_NEW_PROJECT: [17, 75], CAREER_LEADERSHIP: [22, 68],
  CAREER_BUSINESS_START: [18, 70], CAREER_BUSINESS_EXPANSION: [20, 70], CAREER_WORK_CONFLICT: [17, 70], CAREER_WORK_PRESSURE: [17, 70],
  CAREER_RECOGNITION: [17, 85], CAREER_STAGNATION: [18, 70], REPUTATION_RECOGNITION: [16, 100],
  FINANCE_INCOME_GROWTH: [16, 80], FINANCE_BONUS: [17, 70], FINANCE_INVESTMENT: [18, 85], FINANCE_INVESTMENT_GAIN: [18, 85],
  FINANCE_INVESTMENT_LOSS: [18, 85], FINANCE_DEBT_INCREASE: [18, 85], FINANCE_DEBT_REDUCTION: [18, 90], FINANCE_ASSET_ACCUMULATION: [18, 100],
  FINANCE_FINANCIAL_DISPUTE: [18, 100], FINANCE_LARGE_EXPENSE: [17, 100], FINANCE_CASHFLOW_PRESSURE: [17, 100],
  PROPERTY_PURCHASE: [20, 80], PROPERTY_SALE: [20, 95], PROPERTY_RELOCATION: [16, 95], PROPERTY_RENOVATION: [20, 95],
  PROPERTY_INVESTMENT: [20, 80], PROPERTY_LARGE_EXPENSE: [20, 100], PROPERTY_FAMILY_ASSET: [18, 100], PROPERTY_INHERITANCE: [18, 100],
  PROPERTY_DISPUTE: [18, 100],
  RELATIONSHIP_NEW: [15, 85], RELATIONSHIP_DEEPENING: [15, 100], RELATIONSHIP_ENGAGEMENT: [18, 65], RELATIONSHIP_MARRIAGE: [18, 70],
  RELATIONSHIP_SEPARATION: [16, 100], RELATIONSHIP_RECONCILIATION: [16, 100],
  CHILD_PREGNANCY_SIGNAL: [20, 50], CHILD_BIRTH_SIGNAL: [20, 52], CHILD_EDUCATION_EVENT: [22, 65], CHILD_HEALTH_EVENT: [20, 100],
  CHILD_MAJOR_CHANGE: [22, 100],
  MOBILITY_OVERSEAS: [16, 100], MOBILITY_WORK_TRAVEL: [18, 72],
  EDUCATION_STUDY: [6, 70], EDUCATION_EXAM: [8, 60], EDUCATION_CERTIFICATION: [14, 70], EDUCATION_RESEARCH: [18, 80], EDUCATION_ADVANCED_LEARNING: [18, 75],
  REPUTATION_PUBLIC_VISIBILITY: [15, 100],
  LEGAL_CONTRACT: [18, 100], LEGAL_CONTRACT_PROBLEM: [18, 100], LEGAL_DISPUTE: [18, 100], LEGAL_LITIGATION_SIGNAL: [18, 100],
  LEGAL_REGULATORY_ISSUE: [18, 100], LEGAL_DOCUMENT_ERROR: [16, 100],
};

/** Sự kiện bị ẨN khi MỘT trong các cờ liệt kê được khai rõ là `false`. */
export const EVENT_HIDDEN_IF_FALSE: Record<string, string[]> = {
  // Công việc
  CAREER_PROMOTION: ['employed'], CAREER_RESPONSIBILITY_INCREASE: ['employed'], CAREER_LEADERSHIP: ['employed'],
  CAREER_ROLE_CHANGE: ['employed'], CAREER_INTERNAL_TRANSFER: ['employed'], CAREER_WORK_CONFLICT: ['employed'],
  CAREER_WORK_PRESSURE: ['employed'], CAREER_RECOGNITION: ['employed'], CAREER_JOB_LOSS: ['employed'], CAREER_STAGNATION: ['employed'],
  CAREER_JOB_CHANGE: ['workingOrSeeking'], CAREER_NEW_PROJECT: ['workingOrSeeking'],
  // Tiền bạc
  FINANCE_INCOME_GROWTH: ['hasIncome'], FINANCE_BONUS: ['hasIncome'],
  FINANCE_DEBT_REDUCTION: ['hasDebt'],
  FINANCE_INVESTMENT_GAIN: ['hasAssets'], FINANCE_INVESTMENT_LOSS: ['hasAssets'], FINANCE_ASSET_ACCUMULATION: ['hasAssets'],
  FINANCE_FINANCIAL_DISPUTE: ['hasDispute'],
  // Nhà đất / chuyển chỗ ở
  PROPERTY_PURCHASE: ['planningAssetTransaction'], PROPERTY_SALE: ['planningAssetTransaction'],
  PROPERTY_RELOCATION: ['planningMove'], MOBILITY_RELOCATION: ['planningMove'],
  PROPERTY_DISPUTE: ['hasDispute'],
  // Tình cảm
  RELATIONSHIP_NEW: ['openToRelationship'],
  RELATIONSHIP_DEEPENING: ['partnered'], RELATIONSHIP_ENGAGEMENT: ['partnered'], RELATIONSHIP_MARRIAGE: ['partnered'],
  RELATIONSHIP_CONFLICT: ['partnered'], RELATIONSHIP_DISTANCE: ['partnered'], RELATIONSHIP_SEPARATION: ['partnered'],
  RELATIONSHIP_RECONCILIATION: ['partnered'],
  // Con cái
  CHILD_PREGNANCY_SIGNAL: ['planningParenthood'], CHILD_BIRTH_SIGNAL: ['planningParenthood'],
  CHILD_EDUCATION_EVENT: ['hasChildren'], CHILD_HEALTH_EVENT: ['hasChildren'], CHILD_MAJOR_CHANGE: ['hasChildren'],
  // Sức khỏe
  HEALTH_TREATMENT: ['hasCarePlan'], HEALTH_RECOVERY: ['hasCarePlan'],
  // Di chuyển
  MOBILITY_TRAVEL: ['planningTravel'], MOBILITY_FREQUENT_TRAVEL: ['planningTravel'], MOBILITY_OVERSEAS: ['planningTravel'],
  MOBILITY_WORK_TRAVEL: ['planningTravel'], MOBILITY_ENVIRONMENT_CHANGE: ['inTransition'],
  // Học tập, danh tiếng
  EDUCATION_STUDY: ['learning'], EDUCATION_CERTIFICATION: ['learning'], EDUCATION_RESEARCH: ['learning'],
  EDUCATION_ADVANCED_LEARNING: ['learning'], EDUCATION_EXAM: ['hasExam'],
  REPUTATION_PUBLIC_VISIBILITY: ['hasPublicWork'],
  // Gia đình
  FAMILY_PARENT_EVENT: ['hasFamilyContact'], FAMILY_SIBLING_EVENT: ['hasFamilyContact'], FAMILY_CONFLICT: ['hasFamilyContact'],
  FAMILY_HOME_EVENT: ['sharedHousehold'], FAMILY_PARENT_HEALTH_ATTENTION: ['hasElderCare'],
  // Pháp lý
  LEGAL_CONTRACT: ['hasContract'], LEGAL_CONTRACT_PROBLEM: ['hasContract'],
  LEGAL_DISPUTE: ['hasDispute'], LEGAL_LITIGATION_SIGNAL: ['hasDispute'],
  LEGAL_REGULATORY_ISSUE: ['hasFormalProcedure'], LEGAL_DOCUMENT_ERROR: ['hasFormalProcedure'],
};

export type HiddenReason = 'age' | 'context';

/** Sự kiện `eventId` có bị ẩn với người ở tuổi mụ `age` và hoàn cảnh `ctx` không? Trả lý do ẩn, hoặc null nếu áp dụng được. */
export function hiddenReasonOf(eventId: string, age: number, ctx?: EventContextFlags): HiddenReason | null {
  const w = EVENT_AGE_WINDOW[eventId];
  if (w && (age < w[0] || age > w[1])) return 'age';
  const flags = EVENT_HIDDEN_IF_FALSE[eventId];
  if (ctx && flags && flags.some(f => ctx[f] === false)) return 'context';
  return null;
}

/** Lọc các sự kiện áp dụng được; sự kiện bị ẩn trả riêng (để chẩn đoán/ghi chú trên màn hình). */
export function splitByApplicability(
  events: ScoredEvent[], age: number, ctx?: EventContextFlags,
): { applicable: ScoredEvent[]; hidden: { event: ScoredEvent; reason: HiddenReason }[] } {
  const applicable: ScoredEvent[] = [];
  const hidden: { event: ScoredEvent; reason: HiddenReason }[] = [];
  for (const e of events) {
    const reason = hiddenReasonOf(e.eventId, age, ctx);
    if (reason) hidden.push({ event: e, reason }); else applicable.push(e);
  }
  return { applicable, hidden };
}
