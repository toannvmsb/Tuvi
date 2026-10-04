/**
 * DÒNG ĐỜI ĐÃ QUA (giai đoạn 3) — gom các năm đã chấm theo ĐẠI HẠN Tử Vi thành các "chặng" để vẽ thăng trầm
 * và viết 3 câu tóm tắt mỗi chặng bằng MẪU (không AI). Thuần tất định, dùng lại điểm của `PastReview`
 * (không chấm lại) nên con số ở biểu đồ, danh sách mốc và "Vì sao" luôn khớp nhau.
 *
 * Phạm vi trung thực:
 *  - Không có đường sức khỏe (đúng phạm vi "không luận bệnh/tai nạn"); chỗ ở chỉ nằm trong danh sách mốc.
 *  - Chỉ có điểm cho 30 năm gần nhất và từ 15 tuổi; chặng nằm ngoài khoảng đó được ghi "chưa xét".
 *  - Chặng kết thúc trước hoặc đúng 15 tuổi (tuổi thơ) chỉ nêu đại hạn, không nhận định sự kiện.
 */
import type { AstrologyResult, DaiVan } from '../../types';
import { currentAgeOf } from '../ageUtil';
import { AREA_LABEL, AREAS, CHART_AREAS, PAST_CONFIG, type AreaId } from './config';
import { tierOf } from './selectMarkers';
import { yearCanChi } from '../annualEvents/calendar';
import type { PastMarker, YearScore } from './types';
import type { PastReview } from './index';

export interface TimelineYear {
  year: number;
  age: number;
  daiVanIndex: number | null;
  /** Điểm vận có dấu tổng (−100..100) và theo từng mảng vẽ trên biểu đồ. */
  vanScore: number;
  signed: Record<AreaId, number>;
  strength: number;
  bestArea: AreaId;
  /** Có tín hiệu đủ rõ để Tuzi nói gì đó về năm này (≥ minMarkerStrength). */
  hasSignal: boolean;
  /** Mốc đã được chọn ở màn "Nghiệm quá khứ" (nếu có). */
  isMarker: boolean;
}

export type ChapterStatus = 'child' | 'unscored' | 'past' | 'current';

export interface TimelineChapter {
  key: string;
  index: number;
  startAge: number;
  endAge: number;
  stem: string;
  branch: string;
  palaceName: string | null;
  status: ChapterStatus;
  years: TimelineYear[];
  /** 3 câu tóm tắt chặng (hoặc 1–2 câu với chặng tuổi thơ / chưa xét). */
  summary: string[];
  /** Tối đa 2 năm nổi bật nhất của chặng. */
  highlights: number[];
  /** Chặng miễn phí: tuổi thơ và chặng hiện tại. */
  free: boolean;
}

export interface Timeline {
  chapters: TimelineChapter[];
  years: TimelineYear[];
  currentLunarYear: number;
  currentAge: number;
  rulebookVersion: string;
}

const TONE_FLAT = 8; // dưới ngưỡng này (|điểm trung bình|) coi là thuận–khó đan xen (TẠM)

function toYear(s: YearScore, markerYears: Set<number>): TimelineYear {
  const signed = {} as Record<AreaId, number>;
  for (const a of AREAS) signed[a] = s.areas[a].signed;
  return {
    year: s.year, age: s.age, daiVanIndex: s.daiVanIndex,
    vanScore: s.vanScore, signed, strength: s.strength, bestArea: s.bestArea,
    hasSignal: s.strength >= PAST_CONFIG.minMarkerStrength,
    isMarker: markerYears.has(s.year),
  };
}

function mean(xs: number[]): number { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0; }

function toneText(avgSigned: number): string {
  if (avgSigned > TONE_FLAT) return 'nghiêng về phía thuận lợi';
  if (avgSigned < -TONE_FLAT) return 'nghiêng về phía nhiều thử thách';
  return 'thuận lợi và thử thách đan xen';
}

function joinVn(xs: string[]): string {
  return xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} và ${xs[xs.length - 1]}`;
}

export function chapterSummary(ch: Pick<TimelineChapter, 'startAge' | 'endAge' | 'stem' | 'branch' | 'palaceName' | 'status' | 'years' | 'highlights'>): string[] {
  const head = `Đại hạn từ ${ch.startAge} đến ${ch.endAge} tuổi (${ch.stem} ${ch.branch}) đi qua cung ${ch.palaceName ?? 'chưa rõ'}.`;
  if (ch.status === 'child') {
    return [head, 'Tuzi không nhận định sự kiện cho các năm dưới 15 tuổi, nên chặng này chỉ nêu đại hạn.'];
  }
  if (ch.status === 'unscored' || ch.years.length === 0) {
    return [head, `Chặng này nằm ngoài ${PAST_CONFIG.scoreYears} năm gần nhất nên Tuzi chưa xét.`];
  }
  // Mảng nổi bật: độ mạnh trung bình cao nhất trong chặng.
  let top: AreaId = AREAS[0], topV = -1;
  for (const a of AREAS) {
    const v = mean(ch.years.map(y => (y.bestArea === a ? y.strength : 0)));
    if (v > topV) { topV = v; top = a; }
  }
  const avgSigned = mean(ch.years.map(y => y.signed[top]));
  const s2 = topV > 0
    ? `Mảng nổi bật hơn cả trong chặng này là ${AREA_LABEL[top].toLowerCase()}, ${toneText(avgSigned)}.`
    : 'Chặng này chưa có mảng nào nổi bật rõ.';
  const byYear = new Map(ch.years.map(y => [y.year, y]));
  const hl = ch.highlights.map(yr => {
    const y = byYear.get(yr)!;
    const cc = yearCanChi(yr);
    return `${cc.stem} ${cc.branch} ${yr} (${AREA_LABEL[y.bestArea].toLowerCase()})`;
  });
  const s3 = hl.length
    ? `Các năm đáng chú ý: ${joinVn(hl)}.`
    : 'Chặng này chưa có năm nào nổi lên rõ rệt.';
  return [head, s2, s3];
}

/** Dựng mốc cho một năm bất kỳ (dùng cho "Chi tiết năm" của Dòng đời, kể cả năm không nằm trong danh sách mốc). */
export function markerOfYear(score: YearScore, area: AreaId = score.bestArea): PastMarker {
  const as = score.areas[area];
  return {
    year: score.year, age: score.age, area,
    tier: tierOf(as.agree, as.strength),
    agree: as.agree, strength: as.strength,
    daiVanIndex: score.daiVanIndex, topEventId: as.topEventId, signals: as.signals,
  };
}

export function buildTimeline(result: AstrologyResult, review: PastReview, now: Date = new Date()): Timeline {
  const markerYears = new Set(review.markers.map(m => m.year));
  const years = review.scores.map(s => toYear(s, markerYears));
  const age = currentAgeOf(result, now);
  const houses = result.tuViChart.houses;

  const chapters: TimelineChapter[] = [];
  for (const dv of result.daiVans as DaiVan[]) {
    if (dv.startAge > age) continue; // chặng chưa tới — không thuộc "đã qua"
    const own = years.filter(y => y.daiVanIndex === dv.index);
    const isCurrent = age >= dv.startAge && age <= dv.endAge;
    const status: ChapterStatus = isCurrent ? 'current'
      : dv.endAge <= PAST_CONFIG.minAge ? 'child'
      : own.length ? 'past' : 'unscored';
    const highlights = [...own]
      .filter(y => y.hasSignal)
      .sort((a, b) => b.strength - a.strength || b.year - a.year)
      .slice(0, 2).map(y => y.year).sort((a, b) => a - b);
    const base = {
      key: `dv${dv.index}`, index: dv.index, startAge: dv.startAge, endAge: dv.endAge,
      stem: dv.stem, branch: dv.branch,
      palaceName: houses.find(h => h.daiVanStartAge === dv.startAge)?.palaceName ?? null,
      status, years: own, highlights,
    };
    chapters.push({ ...base, summary: chapterSummary(base), free: status === 'child' || status === 'current' });
  }
  return {
    chapters, years,
    currentLunarYear: review.currentLunarYear, currentAge: age, rulebookVersion: review.rulebookVersion,
  };
}

export { CHART_AREAS };
