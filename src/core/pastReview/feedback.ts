/**
 * PHẢN HỒI của người xem về từng mốc/năm: Đúng · Gần đúng · Sai · Không nhớ — phần thuần (không Supabase) để test.
 *  - "Số mốc khớp" luôn hiện đúng như thật, kể cả khi thấp (đặc tả: gọi là "số mốc khớp", KHÔNG gọi là "độ chính xác của lá số").
 *  - "Không nhớ" không tính vào mẫu số (không phải khớp cũng không phải lệch).
 *  - Mốc Sai KHÔNG bị sửa lời luận; chỉ gắn nhãn (xem MISS_LABEL).
 *  - Quá nửa số mốc đã phản hồi là Sai → nhắc kiểm tra lại giờ sinh (không dò/sửa giờ sinh — ngoài phạm vi).
 */
import { PAST_CONFIG, type AreaId } from './config';
import { lunarToSolar } from '../lunarCalendar';

export type FeedbackValue = 'dung' | 'gan_dung' | 'sai' | 'khong_nho';

export const FEEDBACK_LABEL: Record<FeedbackValue, string> = {
  dung: 'Đúng', gan_dung: 'Gần đúng', sai: 'Sai', khong_nho: 'Không nhớ',
};
export const FEEDBACK_ORDER: FeedbackValue[] = ['dung', 'gan_dung', 'sai', 'khong_nho'];

/** Nhãn gắn vào mốc người xem báo Sai (lời Vì sao vẫn giữ nguyên). */
export const MISS_LABEL = 'Người xem báo không đúng';

export interface FeedbackSummary {
  /** Số mốc đã phản hồi Đúng/Gần đúng/Sai (không tính "Không nhớ"). */
  answered: number;
  /** Số mốc khớp = Đúng + Gần đúng. */
  hits: number;
  nearHits: number;
  wrong: number;
  unsure: number;
  /** Quá nửa số phản hồi là Sai (và đủ số phản hồi tối thiểu) → nhắc kiểm tra giờ sinh. */
  showBirthHourHint: boolean;
}

export function summarizeFeedback(values: FeedbackValue[]): FeedbackSummary {
  let dung = 0, near = 0, sai = 0, unsure = 0;
  for (const v of values) {
    if (v === 'dung') dung++;
    else if (v === 'gan_dung') near++;
    else if (v === 'sai') sai++;
    else unsure++;
  }
  const answered = dung + near + sai;
  return {
    answered, hits: dung + near, nearHits: near, wrong: sai, unsure,
    showBirthHourHint: answered >= PAST_CONFIG.birthHourHintMinAnswers && sai * 2 > answered,
  };
}

/** Câu tóm tắt: "Khớp 4 trên 6 mốc đã phản hồi (1 gần đúng)". Rỗng nếu chưa phản hồi mốc nào. */
export function summaryText(s: FeedbackSummary): string {
  if (s.answered === 0) return '';
  return `Khớp ${s.hits} trên ${s.answered} mốc đã phản hồi${s.nearHits ? ` (trong đó ${s.nearHits} gần đúng)` : ''}.`;
}

export const HINT_BIRTH_HOUR =
  'Quá nửa số mốc bạn phản hồi là Sai. Có thể giờ sinh đã nhập chưa đúng — bạn thử kiểm tra lại giờ sinh và sửa trong phần sửa lá số.';

/** Khoảng dương lịch của một NĂM ÂM LỊCH: từ mùng 1 Tết năm đó đến trước mùng 1 Tết năm sau. */
export function solarRangeOfLunarYear(year: number): { from: Date; to: Date } {
  const a = lunarToSolar(1, 1, year, false);
  const b = lunarToSolar(1, 1, year + 1, false);
  return { from: new Date(a.year, a.month - 1, a.day), to: new Date(b.year, b.month - 1, b.day - 1) };
}

/** "2/2019 đến 1/2020" — chỉ tháng/năm dương lịch để người xem không nhớ lệch năm. */
export function solarRangeLabel(year: number): string {
  const { from, to } = solarRangeOfLunarYear(year);
  return `${from.getMonth() + 1}/${from.getFullYear()} đến ${to.getMonth() + 1}/${to.getFullYear()}`;
}

export interface FeedbackRecord {
  year: number;
  value: FeedbackValue;
  area: AreaId;
}
