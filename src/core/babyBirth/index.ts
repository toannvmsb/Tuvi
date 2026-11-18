/**
 * CHỌN NGÀY GIỜ SINH CHO CON — thuần TS, tất định, KHÔNG dùng AI, KHÔNG hỏi giới tính thai nhi.
 *
 * Với MỖI (ngày trong khoảng người dùng nhập) × (12 canh giờ), lập lá số em bé rồi chấm:
 *   • Điểm lá số em bé (0–100): Mệnh · cách cục · các cung trọng yếu · Thân · Bát Tự (xem `scoreBabyChart`).
 *   • Độ hợp với lá số bố/mẹ (hoặc lá số được so sánh) qua `compareCharts` (nếu có).
 * Xếp hạng theo điểm tổng. Mọi trọng số TẠM (BABY_CONFIG), cần người thạo Tử Vi duyệt như các bộ máy khác.
 *
 * PHÁP LÝ / AN TOÀN (xem trao đổi 11/2026): (1) khoảng ngày do người dùng nhập, tối đa MAX_DAYS ngày, không bao giờ gợi ý ngày
 * ngoài khoảng đó; (2) KHÔNG nhận giới tính thai nhi — mỗi (ngày, giờ) được chấm trên cả lá số nam lẫn nữ rồi lấy trung bình
 * (xem `scoreBabyBothGenders`, có test khóa điều này) nên kết quả không đổi theo giới tính; (3) ngày sinh thực tế do bác sĩ quyết định theo
 * sức khỏe mẹ và bé — màn hình phải luôn hiện lời nhắc này.
 * Quy tắc luận giải (CLAUDE.md §2): Nam Phái, KHÔNG dùng "Mệnh chủ/Thân chủ"; Tuần/Triệt chỉ tính cho đúng cung bị Tuần/Triệt.
 */
import type { AstrologyResult, BirthInfo, TuViHouse } from '../../types';
import { buildResult } from '../buildResult';
import { compareCharts } from '../compareCharts';
import { buildPivotContext, detectAllCachCuc } from '../cachCucEngine';

export const BABY_RULEBOOK_VERSION = 'baby-0.1-tam';

/** Khoảng ngày tối đa được quét (chặn việc "chọn ngày" tùy ý xa ngày dự sinh; cũng giới hạn thời gian tính). */
export const MAX_DAYS = 30;

/** Mọi giá trị TẠM. */
export const BABY_CONFIG = {
  /** Trọng số 5 phần của điểm lá số em bé (tổng = 1). */
  weights: { menh: 0.28, cach: 0.22, palaces: 0.20, than: 0.08, bazi: 0.22 },
  /** Trọng số các cung trọng yếu trong phần `palaces` (tổng = 1). */
  palaceWeights: { 'Phúc Đức': 0.3, 'Tài Bạch': 0.2, 'Quan Lộc': 0.2, 'Tật Ách': 0.15, 'Phụ Mẫu': 0.15 } as Record<string, number>,
  /** Có lá số bố/mẹ: điểm tổng = babyShare × lá số bé + (1 − babyShare) × độ hợp. */
  babyShare: 0.6,
  /** Nhiều bố/mẹ: độ hợp = mean × (1 − minShare) + min × minShare (người hợp kém nhất kéo điểm xuống). */
  minShare: 0.3,
  /** Độ hợp bố/mẹ–con = friendship × friendshipShare + (100 − conflict_risk) × (1 − friendshipShare). */
  friendshipShare: 0.6,
  /** Số kết quả đầu bảng. */
  topN: 10,
} as const;

export const BIRTH_HOUR_SLOTS = [
  { branch: 'Tý', range: '0h–1h', hour: 0 }, { branch: 'Sửu', range: '1h–3h', hour: 2 }, { branch: 'Dần', range: '3h–5h', hour: 4 },
  { branch: 'Mão', range: '5h–7h', hour: 6 }, { branch: 'Thìn', range: '7h–9h', hour: 8 }, { branch: 'Tị', range: '9h–11h', hour: 10 },
  { branch: 'Ngọ', range: '11h–13h', hour: 12 }, { branch: 'Mùi', range: '13h–15h', hour: 14 }, { branch: 'Thân', range: '15h–17h', hour: 16 },
  { branch: 'Dậu', range: '17h–19h', hour: 18 }, { branch: 'Tuất', range: '19h–21h', hour: 20 }, { branch: 'Hợi', range: '21h–23h', hour: 22 },
] as const;

// ───────────────────────── chấm lá số em bé ─────────────────────────
const clamp = (x: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));
const norm = (n: string) => (n.startsWith('L. ') ? n.slice(3) : n);

const BRIGHT: Record<string, number> = { miếu: 12, vượng: 9, đắc: 5, bình: 0, hãm: -9 };
const CAT = new Set(['Tả Phù', 'Hữu Bật', 'Thiên Khôi', 'Thiên Việt', 'Văn Xương', 'Văn Khúc', 'Lộc Tồn', 'Hóa Lộc', 'Hóa Quyền', 'Hóa Khoa']);
const SAT: Record<string, number> = {
  'Kình Dương': 5, 'Đà La': 5, 'Hỏa Tinh': 5, 'Linh Tinh': 5, 'Địa Không': 7, 'Địa Kiếp': 7, 'Hóa Kỵ': 7, 'Thiên Hình': 4,
};

interface PalaceEval { score: number; pos: string[]; neg: string[] }

/** Điểm một cung 0–100 từ sao đồng cung, sao tam hợp/xung/nhị hợp và Tuần/Triệt (chỉ đúng cung đó). */
function evalPalace(houses: TuViHouse[], h: TuViHouse, borrow?: TuViHouse): PalaceEval {
  const ctx = buildPivotContext(houses, h);
  let s = 50;
  const pos: string[] = [], neg: string[] = [];
  const chinh = h.stars.filter(x => x.type === 'chinh');
  const use = chinh.length ? chinh : (borrow?.stars.filter(x => x.type === 'chinh') ?? []);
  const factor = chinh.length ? 1 : 0.5;
  if (chinh.length === 0) s -= 3; // vô chính diệu
  for (const x of use) {
    const d = (BRIGHT[x.brightness ?? 'bình'] ?? 0) * factor;
    s += d;
    if (d >= 9 * factor) pos.push(`${x.name} ${x.brightness}`);
    else if (d <= -9 * factor) neg.push(`${x.name} hãm`);
  }
  let cat = 0, sat = 0;
  for (const x of h.stars) {
    if (x.type === 'luu') continue;
    const n = norm(x.name);
    if (CAT.has(n)) { cat += 4; pos.push(n); }
    if (SAT[n]) { sat += SAT[n]; neg.push(n); }
  }
  s += Math.min(16, cat) - Math.min(25, sat);
  let gc = 0, gs = 0;
  for (const n of ctx.groupStars) {
    if (CAT.has(n)) gc += 1.5;
    if (SAT[n]) gs += 2;
  }
  s += Math.min(8, gc) - Math.min(10, gs);
  if (h.tuanAt) { s -= 6; neg.push('Tuần'); }
  if (h.trietAt) { s -= 6; neg.push('Triệt'); }
  return { score: clamp(s), pos, neg };
}

export interface BabyChartScore {
  total: number;
  parts: { menh: number; cach: number; palaces: number; than: number; bazi: number };
  reasons: string[];
  cautions: string[];
}

export function scoreBabyChart(result: AstrologyResult): BabyChartScore {
  const houses = result.tuViChart.houses;
  const byName = (n: string) => houses.find(h => h.palaceName === n);
  const menhH = houses.find(h => h.isManh) ?? houses[0];
  const thanH = houses.find(h => h.isThan);
  const reasons: string[] = [], cautions: string[] = [];

  const menh = evalPalace(houses, menhH, byName('Thiên Di'));
  if (menh.pos.length) reasons.push(`Cung Mệnh có ${[...new Set(menh.pos)].slice(0, 3).join(', ')}`);
  if (menh.neg.length) cautions.push(`Cung Mệnh có ${[...new Set(menh.neg)].slice(0, 3).join(', ')}`);

  // Cách cục: trung bình có trọng số 3 cách tốt mạnh nhất, trừ điểm cách hung.
  const detected = detectAllCachCuc(result);
  const good = detected.filter(d => d.cach.good).sort((a, b) => b.score - a.score);
  const bad = detected.filter(d => !d.cach.good);
  const w = [0.5, 0.3, 0.2];
  const goodVal = good.length ? good.slice(0, 3).reduce((s, d, i) => s + d.score * w[i], 0) / w.slice(0, Math.min(3, good.length)).reduce((a, b) => a + b, 0) : 45;
  const badPen = Math.min(30, bad.reduce((s, d) => s + d.score * 0.12, 0));
  const cach = clamp(goodVal - badPen);
  if (good[0]) reasons.push(`Có cách "${good[0].cach.name}" (tại cung ${good[0].palace})`);
  if (bad[0]) cautions.push(`Có cách hung "${bad[0].cach.name}" (tại cung ${bad[0].palace})`);

  let palaces = 0;
  for (const [name, wt] of Object.entries(BABY_CONFIG.palaceWeights)) {
    const h = byName(name);
    palaces += (h ? evalPalace(houses, h).score : 50) * wt;
  }
  const than = thanH ? evalPalace(houses, thanH).score : 50;

  // Bát Tự: cân bằng ngũ hành + chart "nâng đỡ" dụng thần.
  const bt = result.batTuChart;
  const counts = Object.values(bt.elementCounts);
  const tot = counts.reduce((a, b) => a + b, 0) || 1;
  const ideal = tot / 5;
  const dev = counts.reduce((s, c) => s + Math.abs(c - ideal), 0) / (1.6 * tot);
  const balance = 100 * (1 - dev);
  const fav = bt.favorableElements.reduce((s, e) => s + (bt.elementCounts[e] ?? 0), 0);
  const unfav = bt.unfavorableElements.reduce((s, e) => s + (bt.elementCounts[e] ?? 0), 0);
  const support = clamp(50 + 40 * ((fav - unfav) / tot));
  const bazi = clamp(0.5 * balance + 0.5 * support);
  if (balance >= 70) reasons.push('Ngũ hành Bát Tự khá cân bằng');
  if (balance < 40) cautions.push('Ngũ hành Bát Tự lệch nhiều về một phía');
  if (support >= 65) reasons.push('Bát Tự có nhiều hành thuộc dụng thần');
  if (support <= 35) cautions.push('Bát Tự thiên về hành kỵ thần');

  const W = BABY_CONFIG.weights;
  const total = clamp(menh.score * W.menh + cach * W.cach + palaces * W.palaces + than * W.than + bazi * W.bazi);
  return { total, parts: { menh: menh.score, cach, palaces, than, bazi }, reasons, cautions };
}

// ───────────────────────── độ hợp với bố/mẹ ─────────────────────────
export interface ParentFit { name: string; fit: number; strengths: string[]; risks: string[] }

const FORBIDDEN = /Mệnh chủ|Thân chủ/;

export function parentFits(baby: AstrologyResult, parents: AstrologyResult[]): ParentFit[] {
  return parents.map(p => {
    const c = compareCharts(baby, p);
    const fit = clamp(c.scores.friendship * BABY_CONFIG.friendshipShare + (100 - c.scores.conflict_risk) * (1 - BABY_CONFIG.friendshipShare));
    return {
      name: p.birthInfo.name || 'Không tên',
      fit,
      strengths: c.strength_signals.filter(t => !FORBIDDEN.test(t)),
      risks: c.risk_signals.filter(t => !FORBIDDEN.test(t)),
    };
  });
}

export function combineFits(fits: number[]): number | null {
  if (fits.length === 0) return null;
  const mean = fits.reduce((a, b) => a + b, 0) / fits.length;
  return mean * (1 - BABY_CONFIG.minShare) + Math.min(...fits) * BABY_CONFIG.minShare;
}

// ───────────────────────── quét khoảng ngày ─────────────────────────
export interface BabyCandidate {
  year: number; month: number; day: number;
  branch: string; range: string; hour: number;
  total: number;
  baby: number;
  parent: number | null;
  parts: BabyChartScore['parts'];
  reasons: string[];
  cautions: string[];
  parents: ParentFit[];
}

export interface BabyScanInput {
  /** Ngày đầu của khoảng (dương lịch). */
  start: { year: number; month: number; day: number };
  /** Số ngày trong khoảng (1..MAX_DAYS). */
  days: number;
  /** Lá số bố/mẹ hoặc lá số được so sánh (có thể rỗng). */
  parents?: AstrologyResult[];
  now?: Date;
}

export interface BabyScanResult {
  rulebookVersion: string;
  /** Tất cả (ngày, giờ), điểm giảm dần. */
  candidates: BabyCandidate[];
  /** `topN` đầu bảng. */
  top: BabyCandidate[];
  /** Giờ tốt nhất của MỖI ngày, theo thứ tự ngày. */
  bestPerDay: BabyCandidate[];
}

export function validateWindow(input: BabyScanInput): string | null {
  const now = input.now ?? new Date();
  const { year, month, day } = input.start;
  const d0 = new Date(year, month - 1, day);
  if (!Number.isFinite(d0.getTime()) || d0.getFullYear() !== year || d0.getMonth() !== month - 1 || d0.getDate() !== day) return 'Ngày bắt đầu không hợp lệ.';
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (d0 < today) return 'Chỉ chọn ngày từ hôm nay trở đi (khoảng ngày dự sinh).';
  if (!Number.isInteger(input.days) || input.days < 1 || input.days > MAX_DAYS) return `Khoảng ngày phải từ 1 đến ${MAX_DAYS} ngày.`;
  const far = new Date(today); far.setDate(far.getDate() + 300);
  if (d0 > far) return 'Ngày bắt đầu quá xa. Hãy nhập khoảng quanh ngày dự sinh.';
  return null;
}

const GENDERS: BirthInfo['gender'][] = ['nam', 'nu'];
const inBoth = (a: string[], b: string[]) => a.filter(x => b.includes(x));

/**
 * Lá số một số sao phụ thuộc giới tính (vòng Bác Sĩ/Thái Tuế, Hỏa–Linh, Đại/Tiểu Hao…), mà ta KHÔNG biết và KHÔNG hỏi giới tính
 * thai nhi. Nên mỗi (ngày, giờ) được chấm trên CẢ HAI lá số nam và nữ rồi lấy TRUNG BÌNH; lời giải thích chỉ giữ ý có ở cả hai.
 * Kết quả vì thế không đổi dù em bé là trai hay gái.
 */
export function scoreBabyBothGenders(
  y: number, m: number, d: number, hour: number, parents: AstrologyResult[] = [],
): { score: BabyChartScore; fits: ParentFit[] } {
  const charts = GENDERS.map(g => buildResult({
    name: 'Em bé', gender: g, birthplace: '', calendarType: 'solar', year: y, month: m, day: d, hour, minute: 0, language: 'vi',
  } as BirthInfo, undefined));
  const [a, b] = charts.map(scoreBabyChart);
  const avg = (x: number, y2: number) => (x + y2) / 2;
  const score: BabyChartScore = {
    total: avg(a.total, b.total),
    parts: {
      menh: avg(a.parts.menh, b.parts.menh), cach: avg(a.parts.cach, b.parts.cach), palaces: avg(a.parts.palaces, b.parts.palaces),
      than: avg(a.parts.than, b.parts.than), bazi: avg(a.parts.bazi, b.parts.bazi),
    },
    reasons: inBoth(a.reasons, b.reasons),
    cautions: inBoth(a.cautions, b.cautions),
  };
  const fa = parentFits(charts[0], parents), fb = parentFits(charts[1], parents);
  const fits: ParentFit[] = fa.map((p, i) => ({
    name: p.name, fit: avg(p.fit, fb[i].fit),
    strengths: inBoth(p.strengths, fb[i].strengths), risks: inBoth(p.risks, fb[i].risks),
  }));
  return { score, fits };
}

function candidateFor(
  y: number, m: number, d: number, slot: typeof BIRTH_HOUR_SLOTS[number], parents: AstrologyResult[],
): BabyCandidate {
  const { score: sc, fits: pf } = scoreBabyBothGenders(y, m, d, slot.hour, parents);
  const parent = combineFits(pf.map(p => p.fit));
  const total = parent === null ? sc.total : sc.total * BABY_CONFIG.babyShare + parent * (1 - BABY_CONFIG.babyShare);
  const cautions = [...sc.cautions];
  for (const p of pf) for (const r of p.risks.slice(0, 1)) cautions.push(`Với ${p.name}: ${r}`);
  const reasons = [...sc.reasons];
  for (const p of pf) for (const r of p.strengths.slice(0, 1)) reasons.push(`Với ${p.name}: ${r}`);
  return {
    year: y, month: m, day: d, branch: slot.branch, range: slot.range, hour: slot.hour,
    total: Math.round(total * 10) / 10, baby: Math.round(sc.total * 10) / 10, parent: parent === null ? null : Math.round(parent * 10) / 10,
    parts: sc.parts, reasons, cautions, parents: pf,
  };
}

const sortDesc = (a: BabyCandidate, b: BabyCandidate) =>
  b.total - a.total || a.year - b.year || a.month - b.month || a.day - b.day || a.hour - b.hour;

function finish(all: BabyCandidate[], daysOrder: string[]): BabyScanResult {
  const candidates = [...all].sort(sortDesc);
  const best = new Map<string, BabyCandidate>();
  for (const c of candidates) { const k = `${c.year}-${c.month}-${c.day}`; if (!best.has(k)) best.set(k, c); }
  return {
    rulebookVersion: BABY_RULEBOOK_VERSION,
    candidates,
    top: candidates.slice(0, BABY_CONFIG.topN),
    bestPerDay: daysOrder.map(k => best.get(k)!).filter(Boolean),
  };
}

function dayList(start: BabyScanInput['start'], days: number): { y: number; m: number; d: number }[] {
  const out = [];
  for (let i = 0; i < days; i++) {
    const dt = new Date(start.year, start.month - 1, start.day + i);
    out.push({ y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() });
  }
  return out;
}

export function scanBabyBirthSync(input: BabyScanInput): BabyScanResult {
  const err = validateWindow(input);
  if (err) throw new Error(err);
  const parents = input.parents ?? [];
  const days = dayList(input.start, input.days);
  const all: BabyCandidate[] = [];
  for (const { y, m, d } of days) for (const slot of BIRTH_HOUR_SLOTS) all.push(candidateFor(y, m, d, slot, parents));
  return finish(all, days.map(x => `${x.y}-${x.m}-${x.d}`));
}

/** Bản bất đồng bộ: nhường luồng giao diện sau mỗi ngày và báo tiến trình (ngày đã xong / tổng ngày). */
export async function scanBabyBirth(
  input: BabyScanInput, onProgress?: (done: number, total: number) => void,
): Promise<BabyScanResult> {
  const err = validateWindow(input);
  if (err) throw new Error(err);
  const parents = input.parents ?? [];
  const days = dayList(input.start, input.days);
  const all: BabyCandidate[] = [];
  for (let i = 0; i < days.length; i++) {
    const { y, m, d } = days[i];
    for (const slot of BIRTH_HOUR_SLOTS) all.push(candidateFor(y, m, d, slot, parents));
    onProgress?.(i + 1, days.length);
    await new Promise<void>(r => setTimeout(r, 0));
  }
  return finish(all, days.map(x => `${x.y}-${x.m}-${x.d}`));
}

/** Lời nhắc bắt buộc hiển thị cùng kết quả. */
export const BABY_DISCLAIMER =
  'Chỉ để tham khảo theo Tử Vi/Bát Tự. Ngày giờ sinh thực tế do bác sĩ quyết định theo sức khỏe của mẹ và bé; ' +
  'không nên yêu cầu mổ hay can thiệp sinh sớm chỉ để chọn ngày giờ.';
