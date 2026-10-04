/**
 * BỘ KIỂM TRA LỜI VĂN của "Nghiệm quá khứ". Chặn:
 *  1. TÍN HIỆU LẠ: sao, cung, can chi, thập thần, thần sát được nhắc trong lời văn mà KHÔNG có trong danh sách tín hiệu của mốc.
 *  2. TỪ CẤM: "Mệnh chủ/Thân chủ", phán tuyệt đối, "đo/chứng minh/chính xác 100%", bệnh tật/tuổi thọ/tai nạn/sảy thai/tự hại.
 *  3. CÂU "KHÔNG VIẾT" của bảng giọng văn (gọi tên chuyện đau buồn; quy trách nhiệm cho người dùng; cảm xúc chung chung).
 * Văn bản hiện tại do code ghép từ tín hiệu (không AI), nên bộ kiểm tra là LƯỚI AN TOÀN: chạy trong test trên mọi
 * câu mẫu + mọi lá số mẫu, và sẵn sàng làm cổng chặn nếu sau này có bản AI viết lại (đặc tả Phần 1).
 */
import { ALL_STAR_NAMES } from '../../data/starInfo';
import { SIGNAL_CATALOG } from '../annualEvents/signalCatalog';
import { PALACE_VN_TO_CODE } from '../annualEvents/calendar';
import { STEMS, BRANCHES } from './bazi/tables';
import type { PastSignal } from './types';

export type LintKind = 'forbidden' | 'unknown_term' | 'bad_sentence';
export interface LintIssue { kind: LintKind; detail: string }

const FORBIDDEN_WORDS: string[] = [
  'Mệnh chủ', 'Thân chủ', 'chắc chắn', 'nhất định', '100%', 'chính xác', 'chứng minh',
  'sẽ chết', 'tuổi thọ', 'bệnh', 'ung thư', 'tai nạn', 'sảy thai', 'tự tử', 'tự hại', 'phẫu thuật', 'qua đời',
];
/** Từ ngắn cần khớp nguyên từ (tránh khớp nhầm bên trong từ khác). */
const FORBIDDEN_WHOLE: string[] = ['đo'];

// Biên từ nhận biết chữ cái Unicode ( của JS chỉ hiểu ASCII nên sai với tiếng Việt).
const B = '(?<![\p{L}])';
const E = '(?![\p{L}])';
const re = (src: string) => new RegExp(src.replace(/<B>/g, B).replace(/<E>/g, E), 'iu');

/** Các câu ở cột "Không viết" của bảng giọng văn (đặc tả) + biến thể gọi tên. */
const BAD_SENTENCES: RegExp[] = [
  re('năm này (anh|bạn|em|chị)? ?mất (cha|mẹ|bố|ba|má)<E>'),
  re('năm này (anh|bạn|em|chị)? ?ly hôn<E>'),
  re('năm này (anh|bạn|em|chị)? ?bị lừa<E>'),
  re('<B>(anh|bạn|em|chị) phá sản<E>'),
  re('năm này (anh|bạn|em|chị)? ?bị đuổi việc<E>'),
  re('<B>(mất cha|mất mẹ|ly hôn|phá sản|bị lừa|bị đuổi việc|sảy thai)<E>'),
  // Quy trách nhiệm cho người dùng: "do anh nóng vội nên mất…"
  re('<B>do (anh|bạn|em|chị)<E>[^.]*<B>nên<E>'),
  re('<B>(lỗi|tại) (của )?(anh|bạn|em|chị)<E>'),
  // Cảm xúc chung chung kiểu "có giai đoạn anh thấy áp lực".
  re('có giai đoạn[^.]*<B>(áp lực|căng thẳng|buồn|mệt mỏi|lo lắng|chán nản)<E>'),
];

const TEN_GODS = ['Tỷ Kiên', 'Kiếp Tài', 'Thực Thần', 'Thương Quan', 'Chính Tài', 'Thiên Tài', 'Chính Quan', 'Thất Sát', 'Chính Ấn', 'Thiên Ấn'];
const SPIRITS = ['Dịch Mã', 'Đào Hoa', 'Hồng Loan', 'Thiên Hỷ', 'Thiên Mã'];
// "Tử Vi" vừa là tên hệ vừa là tên sao → xử lý riêng (chỉ tính là sao khi đứng trước "tại/ở cung").
const STAR_TERMS = [...new Set([...ALL_STAR_NAMES, ...Object.values(SIGNAL_CATALOG).map(s => s.name)])]
  .filter(n => (n.includes(' ') || n.length >= 4) && n !== 'Tử Vi');
const PALACES = Object.keys(PALACE_VN_TO_CODE);

const L = '\\p{L}';
const wholeRe = (term: string) => new RegExp(`(^|[^${L}])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^${L}])`, 'iu');
const hasWhole = (text: string, term: string) => wholeRe(term).test(text);

/** Gom mọi chuỗi của danh sách tín hiệu thành một "kho từ được phép". */
function allowedBlob(signals: PastSignal[]): string {
  const parts: string[] = [];
  for (const s of signals) {
    parts.push(s.label, s.where, ...Object.values(s.param).map(String));
    // Sao mang Tứ Hóa được viết thành "X hóa Lộc/Quyền/Khoa/Kỵ" (explainWhy.tuviStarName) → cho phép đúng tên hóa đó.
    const hoa = ({ HOA_LOC: 'Lộc', HOA_QUYEN: 'Quyền', HOA_KHOA: 'Khoa', HOA_KY: 'Kỵ' } as Record<string, string>)[String(s.param.maSao ?? '')];
    if (hoa) parts.push(`Hóa ${hoa}`);
  }
  return parts.join(' | ');
}

export function lintText(text: string, signals: PastSignal[]): LintIssue[] {
  const issues: LintIssue[] = [];
  const blob = allowedBlob(signals);

  for (const w of FORBIDDEN_WORDS) {
    if (text.toLowerCase().includes(w.toLowerCase())) issues.push({ kind: 'forbidden', detail: w });
  }
  for (const w of FORBIDDEN_WHOLE) {
    if (hasWhole(text, w)) issues.push({ kind: 'forbidden', detail: w });
  }
  for (const re of BAD_SENTENCES) {
    const m = re.exec(text);
    if (m) issues.push({ kind: 'bad_sentence', detail: m[0] });
  }

  const check = (term: string) => {
    if (hasWhole(text, term) && !hasWhole(blob, term)) issues.push({ kind: 'unknown_term', detail: term });
  };
  for (const t of STAR_TERMS) check(t);
  if (/Tử Vi (tại|ở) cung/u.test(text) && !hasWhole(blob, 'Tử Vi')) issues.push({ kind: 'unknown_term', detail: 'Tử Vi (sao)' });
  for (const t of TEN_GODS) check(t);
  for (const t of SPIRITS) check(t);
  for (const p of PALACES) {
    if (new RegExp(`cung ${p}`, 'iu').test(text) && !hasWhole(blob, p)) issues.push({ kind: 'unknown_term', detail: `cung ${p}` });
  }
  // Can / chi: "can Giáp", "chi Tý", và cặp "Giáp Tý".
  for (const st of STEMS) {
    if (new RegExp(`[Cc]an ${st}(?![${L}])`, 'u').test(text) && !hasWhole(blob, st)) issues.push({ kind: 'unknown_term', detail: `can ${st}` });
  }
  for (const br of BRANCHES) {
    if (new RegExp(`[Cc]hi ${br}(?![${L}])`, 'u').test(text) && !hasWhole(blob, br)) issues.push({ kind: 'unknown_term', detail: `chi ${br}` });
  }
  const pair = new RegExp(`(${STEMS.join('|')}) (${BRANCHES.join('|')})(?![${L}])`, 'gu');
  for (const m of text.matchAll(pair)) {
    if (!blob.includes(`${m[1]} ${m[2]}`)) issues.push({ kind: 'unknown_term', detail: m[0] });
  }
  return issues;
}

/** Duyệt nhiều đoạn một lúc; trả về các vi phạm kèm đoạn gốc. */
export function lintAll(texts: string[], signals: PastSignal[]): { text: string; issues: LintIssue[] }[] {
  return texts.map(t => ({ text: t, issues: lintText(t, signals) })).filter(r => r.issues.length > 0);
}
