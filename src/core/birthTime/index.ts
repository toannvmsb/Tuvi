/**
 * SUY ĐOÁN GIỜ SINH (hiệu chỉnh giờ sinh) — thuần TS, tất định, KHÔNG dùng AI.
 *
 * Ý tưởng: giờ sinh chỉ có 12 khả năng (12 canh giờ). Với MỖI canh giờ, lập một lá số, dùng đúng bộ máy của
 * "Nghiệm quá khứ" (Tử Vi qua engine annualEvents + Bát Tự) để xem các NĂM người dùng khai có "nổi" ở đúng
 * mảng đời đó không. Canh giờ nào lá số khớp các mốc đời tốt hơn thì điểm cao hơn.
 *
 *  1. Ước lượng ban đầu (prior): người dùng nhớ sinh buổi nào (sáng/trưa/…) → thu hẹp. Không nhớ → đều.
 *  2. Với mỗi sự kiện (loại + năm): độ khớp = phân vị của năm đó so với các năm khác CỦA CHÍNH lá số ấy
 *     (Tử Vi 65% + Bát Tự 35%); cho phép lệch ±1 năm (người dùng hay nhớ lệch, ranh giới năm âm lịch).
 *  3. Điểm canh giờ = Σ trọng số × (độ khớp − 0,5). Xác suất tương đối = prior × exp(β × điểm), chuẩn hóa.
 *  4. Kết luận có 3 mức: 'confident' / 'narrowed' / 'insufficient' — KHÔNG ép ra một đáp án khi dữ liệu yếu.
 *
 * LƯU Ý: "mức khớp" là xác suất TƯƠNG ĐỐI giữa 12 canh giờ theo bộ máy heuristic (mọi trọng số TẠM, xem BT_CONFIG),
 * không phải độ chính xác đã kiểm chứng. Giờ Tý (23h–1h) tính như một canh giờ (không tách Tý sớm/muộn).
 */
import type { BirthInfo, AstrologyResult } from '../../types';
import { buildResult } from '../buildResult';
import { computeAnnualPrediction } from '../annualEvents/engine';
import { currentAgeOf } from '../ageUtil';
import { solarToLunar } from '../lunarCalendar';
import { buildBaziNatal, evaluateBaziYear } from '../pastReview/bazi/engine';
import { EVENT_MAX_AGE, EVENT_MIN_AGE, type AreaId } from '../pastReview/config';
import { predictLook, lookLogit, lookAnswerCount, type LookAnswer, type LookPrediction } from './appearance';

export * from './appearance';

export const BT_RULEBOOK_VERSION = 'bt-0.2-tam';

/** Mọi giá trị TẠM — chỉnh sau khi thử trên người có giờ sinh biết chắc (xem test birthTimeGuess). */
export const BT_CONFIG = {
  /** Trọng số Tử Vi / Bát Tự trong độ khớp một sự kiện. */
  tuviShare: 0.65,
  /** Độ "nhọn" của xác suất: càng lớn càng dễ ép về một giờ. */
  beta: 3,
  /** Năm kề (±1) chỉ được tính ngần này độ khớp của năm gốc. */
  neighborFactor: 0.9,
  /** Cần ít nhất ngần này sự kiện mới dám kết luận. */
  minEvents: 3,
  /** Mức 'confident': giờ đầu ≥ p1 và ≥ ratio lần giờ thứ hai. */
  confidentP1: 0.3,
  confidentRatio: 1.6,
  /** Mức 'narrowed': 3 giờ đầu gộp ≥ ngần này. */
  narrowedTop3: 0.65,
  /** Canh giờ bị loại bởi "nhớ buổi nào" vẫn giữ trọng số nhỏ này (phòng nhớ nhầm). */
  priorOutside: 0.1,
  /** Tuổi (mụ) tối thiểu của năm được xét. */
  minAge: 15,
} as const;

/** 12 canh giờ: `hour` là giá trị BirthInfo.hour dùng cho canh giờ đó (Tý = 0). */
export const BIRTH_HOURS = [
  { branch: 'Tý', range: '23h–01h', hour: 0 },
  { branch: 'Sửu', range: '01h–03h', hour: 2 },
  { branch: 'Dần', range: '03h–05h', hour: 4 },
  { branch: 'Mão', range: '05h–07h', hour: 6 },
  { branch: 'Thìn', range: '07h–09h', hour: 8 },
  { branch: 'Tị', range: '09h–11h', hour: 10 },
  { branch: 'Ngọ', range: '11h–13h', hour: 12 },
  { branch: 'Mùi', range: '13h–15h', hour: 14 },
  { branch: 'Thân', range: '15h–17h', hour: 16 },
  { branch: 'Dậu', range: '17h–19h', hour: 18 },
  { branch: 'Tuất', range: '19h–21h', hour: 20 },
  { branch: 'Hợi', range: '21h–23h', hour: 22 },
] as const;

/** "Nhớ sinh vào buổi nào" → các canh giờ (chỉ số trong BIRTH_HOURS). */
export const DAY_PARTS = [
  { id: 'night', label: 'Đêm khuya (23h–3h)', hours: [0, 1] },
  { id: 'dawn', label: 'Sáng sớm (3h–7h)', hours: [2, 3] },
  { id: 'morning', label: 'Buổi sáng (7h–11h)', hours: [4, 5] },
  { id: 'noon', label: 'Trưa – đầu giờ chiều (11h–15h)', hours: [6, 7] },
  { id: 'afternoon', label: 'Chiều (15h–19h)', hours: [8, 9] },
  { id: 'evening', label: 'Tối (19h–23h)', hours: [10, 11] },
] as const;
export type DayPartId = typeof DAY_PARTS[number]['id'];

/** Loại sự kiện người dùng có thể khai (đều là việc nhớ được NĂM; không hỏi bệnh tật/mất mát). */
export interface LifeEventKind {
  id: string;
  label: string;
  area: AreaId;
  /** Mã sự kiện của engine annualEvents tương ứng. */
  eventIds: string[];
  /** Độ tin cậy của loại sự kiện này khi suy đoán (đa số 1; việc nhiều nguyên nhân thì thấp hơn). */
  weight: number;
  /** Tuổi tối thiểu hợp lý (để gợi ý/kiểm tra khi nhập). */
  minAge?: number;
}

export const LIFE_EVENT_KINDS: LifeEventKind[] = [
  { id: 'marriage', label: 'Kết hôn', area: 'love', eventIds: ['RELATIONSHIP_MARRIAGE', 'RELATIONSHIP_ENGAGEMENT'], weight: 1, minAge: 16 },
  { id: 'separation', label: 'Chia tay / ly hôn', area: 'love', eventIds: ['RELATIONSHIP_SEPARATION', 'RELATIONSHIP_CONFLICT'], weight: 0.8, minAge: 16 },
  { id: 'child_birth', label: 'Sinh con', area: 'family', eventIds: ['CHILD_BIRTH_SIGNAL', 'CHILD_PREGNANCY_SIGNAL'], weight: 1, minAge: 16 },
  { id: 'job_change', label: 'Đổi việc / đổi nghề', area: 'career', eventIds: ['CAREER_JOB_CHANGE', 'CAREER_ROLE_CHANGE', 'CAREER_INTERNAL_TRANSFER'], weight: 0.8, minAge: 16 },
  { id: 'promotion', label: 'Thăng chức / tăng trách nhiệm', area: 'career', eventIds: ['CAREER_PROMOTION', 'CAREER_RESPONSIBILITY_INCREASE'], weight: 0.9, minAge: 18 },
  { id: 'business_start', label: 'Bắt đầu kinh doanh', area: 'career', eventIds: ['CAREER_BUSINESS_START', 'CAREER_BUSINESS_EXPANSION'], weight: 0.9, minAge: 18 },
  { id: 'home_buy', label: 'Mua nhà / đất', area: 'home', eventIds: ['PROPERTY_PURCHASE', 'PROPERTY_INVESTMENT'], weight: 1, minAge: 18 },
  { id: 'relocation', label: 'Chuyển chỗ ở / chuyển nơi sống', area: 'home', eventIds: ['PROPERTY_RELOCATION', 'MOBILITY_RELOCATION'], weight: 0.8, minAge: 15 },
  { id: 'overseas', label: 'Đi nước ngoài (học / làm / định cư)', area: 'home', eventIds: ['MOBILITY_OVERSEAS'], weight: 0.9, minAge: 15 },
];

export interface UserLifeEvent {
  kind: string;
  /** Năm DƯƠNG LỊCH người dùng nhớ. */
  year: number;
}

export interface HourCandidate {
  /** Chỉ số trong BIRTH_HOURS. */
  index: number;
  branch: string;
  range: string;
  /** Giá trị BirthInfo.hour. */
  hour: number;
  /** Xác suất tương đối 0..1 giữa 12 canh giờ (tổng = 1). */
  probability: number;
  /** Điểm thô (Σ w × (khớp − 0,5)), để xem/chỉnh. */
  rawScore: number;
  /** Độ khớp từng sự kiện 0..1 (cùng thứ tự `events` đầu vào đã lọc). */
  fits: number[];
}

export type GuessStatus = 'confident' | 'narrowed' | 'insufficient' | 'insufficient_data';

export interface HourGuess {
  rulebookVersion: string;
  status: GuessStatus;
  /** Sắp giảm dần theo probability. */
  candidates: HourCandidate[];
  /** Sự kiện thực sự được dùng (đã bỏ loại không hợp lệ / năm ngoài phạm vi). */
  usedEvents: UserLifeEvent[];
  /** Sự kiện bị bỏ và lý do (hiện cho người dùng). */
  skippedEvents: { event: UserLifeEvent; reason: string }[];
}

const KIND_BY_ID: Record<string, LifeEventKind> = Object.fromEntries(LIFE_EVENT_KINDS.map(k => [k.id, k]));

/** Xác suất prior cho 12 canh giờ theo buổi người dùng nhớ (rỗng = không nhớ = đều). */
export function priorFromDayParts(parts: DayPartId[]): number[] {
  if (parts.length === 0) return Array(12).fill(1 / 12);
  const inside = new Set<number>();
  for (const p of DAY_PARTS) if (parts.includes(p.id)) p.hours.forEach(h => inside.add(h));
  const w = BIRTH_HOURS.map((_, i) => (inside.has(i) ? 1 : BT_CONFIG.priorOutside));
  const s = w.reduce((a, b) => a + b, 0);
  return w.map(x => x / s);
}

/** Phân vị (giữa) của `val` trong `all`: tỉ lệ giá trị < val + nửa tỉ lệ bằng val. Mọi năm bằng nhau → 0,5. */
export function midRank(val: number, all: number[]): number {
  if (all.length === 0) return 0.5;
  let less = 0, eq = 0;
  for (const x of all) { if (x < val) less++; else if (x === val) eq++; }
  return (less + eq / 2) / all.length;
}

interface HourEval {
  /** Năm DƯƠNG LỊCH ↔ điểm thô mỗi sự kiện: tvByYear[year][eventId]. */
  years: number[];
  tv: Map<number, Map<string, number>>;
  bz: Map<number, Record<AreaId, number>>;
  /** Dáng/mặt dự đoán từ cung Mệnh của canh giờ này. */
  look: LookPrediction;
}

function lunarYearNow(now: Date): number {
  return solarToLunar(now.getDate(), now.getMonth() + 1, now.getFullYear()).year;
}

function evalHour(result: AstrologyResult, years: number[]): HourEval {
  const natal = buildBaziNatal(result);
  const tv = new Map<number, Map<string, number>>();
  const bz = new Map<number, Record<AreaId, number>>();
  for (const y of years) {
    const age = currentAgeOf(result, new Date(y, 0, 1));
    const pred = computeAnnualPrediction(result, y, { skipMonthly: true });
    const m = new Map<string, number>();
    for (const e of pred.allEvents) {
      if (age < (EVENT_MIN_AGE[e.eventId] ?? 0) || age > (EVENT_MAX_AGE[e.eventId] ?? 999)) continue;
      m.set(e.eventId, e.strength);
    }
    tv.set(y, m);
    const b = evaluateBaziYear(natal, y);
    bz.set(y, { career: b.career.score, home: b.home.score, love: b.love.score, wealth: b.wealth.score, family: b.family.score });
  }
  return { years, tv, bz, look: predictLook(result) };
}

function kindValueTv(ev: HourEval, y: number, kind: LifeEventKind): number {
  const m = ev.tv.get(y);
  if (!m) return 0;
  let best = 0;
  for (const id of kind.eventIds) best = Math.max(best, m.get(id) ?? 0);
  return best;
}

function fitOfEvent(ev: HourEval, e: UserLifeEvent, kind: LifeEventKind): number {
  const tvAll = ev.years.map(y => kindValueTv(ev, y, kind));
  const bzAll = ev.years.map(y => ev.bz.get(y)![kind.area]);
  const at = (y: number) => {
    const i = ev.years.indexOf(y);
    if (i < 0) return null;
    return BT_CONFIG.tuviShare * midRank(tvAll[i], tvAll) + (1 - BT_CONFIG.tuviShare) * midRank(bzAll[i], bzAll);
  };
  let best = at(e.year) ?? 0.5;
  for (const d of [-1, 1]) {
    const f = at(e.year + d);
    if (f !== null) best = Math.max(best, f * BT_CONFIG.neighborFactor);
  }
  return best;
}

export interface GuessInput {
  /** Thông tin sinh KHÔNG kèm giờ (giờ sẽ được thay lần lượt). */
  base: Omit<BirthInfo, 'hour' | 'minute'>;
  events: UserLifeEvent[];
  dayParts?: DayPartId[];
  /** Dáng người / khuôn mặt người dùng tự nhận (không bắt buộc; tín hiệu yếu, chỉ bổ trợ). */
  look?: LookAnswer;
  now?: Date;
}

/** Lọc sự kiện hợp lệ; trả về danh sách dùng được + danh sách bị bỏ kèm lý do. */
export function prepareEvents(
  base: GuessInput['base'], events: UserLifeEvent[], now: Date,
): { used: UserLifeEvent[]; skipped: HourGuess['skippedEvents'] } {
  const used: UserLifeEvent[] = [];
  const skipped: HourGuess['skippedEvents'] = [];
  const probe = buildResult({ ...base, hour: 12, minute: 0 } as BirthInfo, undefined);
  const curLunar = lunarYearNow(now);
  for (const e of events) {
    const kind = KIND_BY_ID[e.kind];
    if (!kind) { skipped.push({ event: e, reason: 'Loại sự kiện không hợp lệ' }); continue; }
    const age = currentAgeOf(probe, new Date(e.year, 0, 1));
    if (!Number.isFinite(e.year) || e.year > curLunar) { skipped.push({ event: e, reason: 'Năm chưa xảy ra' }); continue; }
    if (age < Math.max(BT_CONFIG.minAge, kind.minAge ?? 0)) { skipped.push({ event: e, reason: 'Năm này chưa đủ tuổi cho sự kiện này' }); continue; }
    used.push(e);
  }
  return { used, skipped };
}

function finish(
  used: UserLifeEvent[], skipped: HourGuess['skippedEvents'], evals: HourEval[], prior: number[], look?: LookAnswer,
): HourGuess {
  const scores = evals.map(ev => {
    const fits = used.map(e => fitOfEvent(ev, e, KIND_BY_ID[e.kind]));
    const raw = used.reduce((s, e, i) => s + KIND_BY_ID[e.kind].weight * (fits[i] - 0.5), 0);
    return { fits, raw };
  });
  const logits = scores.map((s, i) => Math.log(prior[i]) + BT_CONFIG.beta * s.raw + lookLogit(evals[i].look, look));
  const mx = Math.max(...logits);
  const ex = logits.map(l => Math.exp(l - mx));
  const sum = ex.reduce((a, b) => a + b, 0);

  const candidates: HourCandidate[] = BIRTH_HOURS.map((h, i) => ({
    index: i, branch: h.branch, range: h.range, hour: h.hour,
    probability: ex[i] / sum, rawScore: scores[i].raw, fits: scores[i].fits,
  })).sort((a, b) => b.probability - a.probability || a.index - b.index);

  let status: GuessStatus;
  // Dáng người trả lời đủ cả hai (dáng + mặt) được tính như thêm 1 bằng chứng, để người ít nhớ mốc đời vẫn thu hẹp được phần nào.
  const evidence = used.length + (lookAnswerCount(look) >= 2 ? 1 : 0);
  if (evidence < BT_CONFIG.minEvents) status = 'insufficient_data';
  else if (candidates[0].probability >= BT_CONFIG.confidentP1
    && candidates[0].probability >= BT_CONFIG.confidentRatio * candidates[1].probability) status = 'confident';
  else if (candidates[0].probability + candidates[1].probability + candidates[2].probability >= BT_CONFIG.narrowedTop3) status = 'narrowed';
  else status = 'insufficient';

  return { rulebookVersion: BT_RULEBOOK_VERSION, status, candidates, usedEvents: used, skippedEvents: skipped };
}

function yearsToScore(probe: AstrologyResult, used: UserLifeEvent[], now: Date): number[] {
  const curLunar = lunarYearNow(now);
  const firstYear = probe.birthInfo.calendarType === 'solar'
    ? probe.birthInfo.year + BT_CONFIG.minAge - 1
    : probe.tuViChart.lunarDate.year + BT_CONFIG.minAge - 1;
  const from = Math.min(firstYear, ...used.map(e => e.year - 1));
  const out: number[] = [];
  for (let y = from; y < curLunar; y++) out.push(y);
  return out;
}

export function guessBirthHourSync(input: GuessInput): HourGuess {
  const now = input.now ?? new Date();
  const { used, skipped } = prepareEvents(input.base, input.events, now);
  const probe = buildResult({ ...input.base, hour: 12, minute: 0 } as BirthInfo, undefined);
  const years = yearsToScore(probe, used, now);
  const evals = BIRTH_HOURS.map(h => evalHour(buildResult({ ...input.base, hour: h.hour, minute: 0 } as BirthInfo, undefined), years));
  return finish(used, skipped, evals, priorFromDayParts(input.dayParts ?? []), input.look);
}

/** Bản bất đồng bộ: nhường luồng giao diện sau mỗi canh giờ và báo tiến trình (0..12). */
export async function guessBirthHour(
  input: GuessInput, onProgress?: (done: number, total: number) => void,
): Promise<HourGuess> {
  const now = input.now ?? new Date();
  const { used, skipped } = prepareEvents(input.base, input.events, now);
  const probe = buildResult({ ...input.base, hour: 12, minute: 0 } as BirthInfo, undefined);
  const years = yearsToScore(probe, used, now);
  const evals: HourEval[] = [];
  for (let i = 0; i < BIRTH_HOURS.length; i++) {
    evals.push(evalHour(buildResult({ ...input.base, hour: BIRTH_HOURS[i].hour, minute: 0 } as BirthInfo, undefined), years));
    onProgress?.(i + 1, BIRTH_HOURS.length);
    await new Promise<void>(r => setTimeout(r, 0));
  }
  return finish(used, skipped, evals, priorFromDayParts(input.dayParts ?? []), input.look);
}

/** Lời diễn giải ngắn cho mức kết luận (không phán tuyệt đối — CLAUDE.md §2.4). */
export function statusMessage(status: GuessStatus): string {
  switch (status) {
    case 'confident': return 'Có một canh giờ nổi trội hơn hẳn. Đây là xu hướng suy ra từ các mốc bạn khai, chưa phải kết luận tuyệt đối.';
    case 'narrowed': return 'Đã thu hẹp được vài canh giờ có khả năng cao nhất, nhưng chưa đủ để chốt một giờ. Bạn nên chọn theo cảm nhận hoặc bổ sung thêm mốc đời.';
    case 'insufficient': return 'Các mốc đã khai chưa đủ để phân biệt các canh giờ. Hãy thêm sự kiện bạn nhớ rõ năm, hoặc thu hẹp buổi sinh.';
    default: return `Cần ít nhất ${BT_CONFIG.minEvents} sự kiện có năm cụ thể (hoặc 2 sự kiện kèm dáng người và khuôn mặt) thì mới có thể suy đoán.`;
  }
}
