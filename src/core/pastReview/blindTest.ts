/**
 * ĐO CỔNG RA MẮT (đặc tả "Chỉ số đo lường → Thử nội bộ trước khi ra mắt") — phần THUẦN để test.
 * Mỗi người thử nhận 10 dòng trộn lẫn: 5 năm do bộ máy chọn + 5 năm NGẪU NHIÊN cùng mảng đời (đối chứng khớp mảng, để chênh lệch
 * chỉ phản ánh việc chọn ĐÚNG NĂM, không phải do mảng nào dễ "đúng" hơn). Người đó điền Đúng / Gần đúng / Sai / Không nhớ.
 * So tỉ lệ khớp của hai nhóm = thước đo thật của bộ quy tắc.
 *
 *  - "Khớp" = Đúng + Gần đúng, trên số dòng ĐÃ trả lời (Không nhớ / bỏ trống không tính).
 *  - Chênh lệch tính theo từng người (ghép cặp) vì mỗi người có cả hai nhóm → khử khác biệt giữa người dễ tính/khó tính.
 *  - Ngưỡng đạt là cấu hình TẠM (anh Toàn quyết): mặc định chênh ≥ 15 điểm % và khoảng tin cậy 95% nằm hẳn trên 0, ≥ 50 người.
 */
export type Reply = 'dung' | 'gan_dung' | 'sai' | 'khong_nho' | null;

const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();

/** Hiểu cách điền tự do: "Đúng", "dung", "Gần đúng", "gan dung", "Sai", "Không nhớ"… Trống/lạ → null. */
export function parseReply(cell: string): Reply {
  const c = strip(cell).replace(/[*_`]/g, '').trim();
  if (!c) return null;
  if (/^(gan dung|gan|g)$/.test(c)) return 'gan_dung';
  if (/^(khong nho|k nho|kn|k)$/.test(c)) return 'khong_nho';
  if (/^(dung|d)$/.test(c)) return 'dung';
  if (/^(sai|s)$/.test(c)) return 'sai';
  return null;
}

/** Đọc bảng markdown của file `*-blind.md` đã điền: trả về stt → phản hồi (ô cuối của mỗi dòng bảng). */
export function parseBlindSheet(md: string): Map<number, Reply> {
  const out = new Map<number, Reply>();
  for (const line of md.split(/\r?\n/)) {
    const m = /^\|\s*(\d+)\s*\|(.*)\|\s*$/.exec(line);
    if (!m) continue;
    const cells = m[2].split('|');
    out.set(Number(m[1]), parseReply(cells[cells.length - 1] ?? ''));
  }
  return out;
}

export interface KeyRow { stt: number; year: number; age: number; area: string; source: 'engine' | 'random'; tier?: string; agree?: boolean }

export interface Tally { rows: number; answered: number; hits: number; strictHits: number; unsure: number }
export const emptyTally = (): Tally => ({ rows: 0, answered: 0, hits: 0, strictHits: 0, unsure: 0 });

export function tallyRows(keys: KeyRow[], replies: Map<number, Reply>, source: 'engine' | 'random', filter: (k: KeyRow) => boolean = () => true): Tally {
  const t = emptyTally();
  for (const k of keys) {
    if (k.source !== source || !filter(k)) continue;
    t.rows++;
    const r = replies.get(k.stt) ?? null;
    if (r === 'khong_nho') t.unsure++;
    if (r === 'dung' || r === 'gan_dung' || r === 'sai') {
      t.answered++;
      if (r !== 'sai') t.hits++;
      if (r === 'dung') t.strictHits++;
    }
  }
  return t;
}

export interface PersonResult { id: string; engine: Tally; random: Tally }

export interface BlindSummary {
  persons: number;              // số người có ít nhất 1 dòng trả lời ở CẢ HAI nhóm
  engine: { answered: number; hits: number; rate: number; strictRate: number };
  random: { answered: number; hits: number; rate: number; strictRate: number };
  /** Chênh lệch tỉ lệ khớp (engine − random), điểm tỉ lệ 0..1: gộp và trung bình theo từng người. */
  diffPooled: number;
  diffPaired: number;
  ci95: [number, number];
  /** z của kiểm định hai tỉ lệ (gộp; lưu ý dòng của cùng một người không hoàn toàn độc lập). */
  z: number;
  passDiff: number;
  minPersons: number;
  verdict: 'DAT' | 'CHUA_DAT' | 'CHUA_DU_NGUOI';
  reasons: string[];
}

const rate = (h: number, n: number) => (n > 0 ? h / n : 0);

export function summarize(persons: PersonResult[], opts: { passDiff?: number; minPersons?: number } = {}): BlindSummary {
  const passDiff = opts.passDiff ?? 0.15;
  const minPersons = opts.minPersons ?? 50;
  const used = persons.filter(p => p.engine.answered > 0 && p.random.answered > 0);

  const agg = (key: 'engine' | 'random') => {
    let answered = 0, hits = 0, strict = 0;
    for (const p of used) { answered += p[key].answered; hits += p[key].hits; strict += p[key].strictHits; }
    return { answered, hits, rate: rate(hits, answered), strictRate: rate(strict, answered) };
  };
  const e = agg('engine'), r = agg('random');

  const diffs = used.map(p => rate(p.engine.hits, p.engine.answered) - rate(p.random.hits, p.random.answered));
  const n = diffs.length;
  const mean = n ? diffs.reduce((a, b) => a + b, 0) / n : 0;
  const sd = n > 1 ? Math.sqrt(diffs.reduce((a, d) => a + (d - mean) ** 2, 0) / (n - 1)) : 0;
  const se = n > 1 ? sd / Math.sqrt(n) : 0;
  const ci95: [number, number] = [mean - 1.96 * se, mean + 1.96 * se];

  const pPool = rate(e.hits + r.hits, e.answered + r.answered);
  const seZ = Math.sqrt(pPool * (1 - pPool) * (1 / Math.max(1, e.answered) + 1 / Math.max(1, r.answered)));
  const z = seZ > 0 ? (e.rate - r.rate) / seZ : 0;

  const reasons: string[] = [];
  let verdict: BlindSummary['verdict'];
  if (n < minPersons) {
    verdict = 'CHUA_DU_NGUOI';
    reasons.push(`Mới có ${n} người trả lời ở cả hai nhóm, cần ít nhất ${minPersons}.`);
  } else {
    const okDiff = mean >= passDiff;
    const okCi = ci95[0] > 0;
    if (!okDiff) reasons.push(`Chênh lệch ${(mean * 100).toFixed(1)} điểm % chưa tới ngưỡng ${(passDiff * 100).toFixed(0)}.`);
    if (!okCi) reasons.push('Khoảng tin cậy 95% của chênh lệch chưa nằm hẳn trên 0 (chưa loại được may rủi).');
    verdict = okDiff && okCi ? 'DAT' : 'CHUA_DAT';
  }
  return { persons: n, engine: e, random: r, diffPooled: e.rate - r.rate, diffPaired: mean, ci95, z, passDiff, minPersons, verdict, reasons };
}
