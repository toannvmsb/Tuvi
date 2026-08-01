/**
 * CÁCH CỤC ENGINE — Tầng 2-7 theo kiến trúc "Engine phân tích các cách cục".
 *
 * Tầng 2: Nhận diện tất cả cách cục trên toàn lá số (12 cung, group-scope).
 * Tầng 3: Chấm điểm 0–100 dựa trên baseScore + điều chỉnh theo miếu/hãm/phụ tá.
 * Tầng 4: Xếp hạng cách chủ / cách phụ / cách hỗ trợ / cách phá.
 * Tầng 5: Phân tích kích hoạt theo thời gian (Đại Vận / Tiểu Vận / Nguyệt Vận).
 * Tầng 6: Tổng hợp Meta Pattern — chân dung tổng thể của lá số.
 * Tầng 7: Sinh text context để inject vào AI prompt và offline luận giải.
 */

import type { AstrologyResult, TuViHouse } from '../types';
import {
  CACH_CUC, detectCachCucAt, detectNearCachCucAt, optionalCoverage,
  type CachCuc, type CachCucCategory, type NearCach, type PivotStarContext,
} from '../data/cachCuc';

/** Ngưỡng completeness tối thiểu để ENGINE "gọi tên" một cách (V2.0). */
export const MIN_COMPLETENESS_TO_NAME = 60;

/**
 * 4 cung TRỌNG YẾU quyết định "cách cục chính" của lá số — theo yêu cầu luận
 * giải: cách cục hình thành từ sao tại Mệnh/Tài Bạch/Quan Lộc/Thiên Di là
 * quan trọng nhất, LUÔN phải được đưa vào & đánh giá TRƯỚC TIÊN khi luận
 * (toàn lá số lẫn Đại Vận/Tiểu Vận), không bị giới hạn bởi ngưỡng điểm chủ/phụ.
 */
export const CORE_PALACES = ['Mệnh', 'Tài Bạch', 'Quan Lộc', 'Thiên Di'];

// ─── Helpers ────────────────────────────────────────────────────────────────

const BRANCHES = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tị', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
const branchIdx = (b: string) => BRANCHES.indexOf(b);
const TAM_HOP: number[][] = [[8, 0, 4], [2, 6, 10], [5, 9, 1], [11, 3, 7]];
const NHI_HOP: Record<number, number> = {
  0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6,
};

/** Sao tại 1 cung cụ thể (theo chỉ số chi 0-11). Mặc định LOẠI sao lưu. */
function starsAt(houses: TuViHouse[], idx: number, includeLuu = false): string[] {
  const h = houses.find(x => branchIdx(x.branch) === idx);
  if (!h) return [];
  const out: string[] = [];
  for (const s of h.stars) {
    if (!includeLuu && s.type === 'luu') continue;
    out.push(s.name.startsWith('L. ') ? s.name.slice(3) : s.name);
  }
  return out;
}

/** Sao NGAY TẠI cung pivot (đồng cung). */
function ownStarsOf(houses: TuViHouse[], pivotBranch: string, includeLuu = false): string[] {
  return starsAt(houses, branchIdx(pivotBranch), includeLuu);
}

/**
 * Sao tại TAM HỢP + XUNG CHIẾU + NHỊ HỢP của pivot — KHÔNG gồm pivot (V2.1:
 * tách khỏi "đồng cung" để tránh gộp lẫn 2 phạm vi khác nhau, đây là nguồn
 * gốc lỗi "Nhật Nguyệt đồng cung" bị báo dương tính giả khi 2 sao chỉ cùng
 * nhóm tam hợp chứ không cùng 1 cung).
 */
function groupStarsOf(houses: TuViHouse[], pivotBranch: string, includeLuu = false): string[] {
  const i = branchIdx(pivotBranch);
  const th = (TAM_HOP.find(g => g.includes(i)) ?? []).filter(idx => idx !== i);
  const xung = (i + 6) % 12;
  const nh = NHI_HOP[i];
  const idxs = [...new Set([...th, xung, ...(nh !== undefined ? [nh] : [])])].filter(idx => idx !== i);
  const names: string[] = [];
  for (const idx of idxs) names.push(...starsAt(houses, idx, includeLuu));
  return names;
}

/** Sao tại 2 cung GIÁP (kề trước + kề sau) của pivot — KHÔNG gồm pivot. */
function flankStarsOf(houses: TuViHouse[], pivotBranch: string, includeLuu = false): string[] {
  const i = branchIdx(pivotBranch);
  const before = (i + 11) % 12;
  const after = (i + 1) % 12;
  return [...starsAt(houses, before, includeLuu), ...starsAt(houses, after, includeLuu)];
}

/** Dựng đầy đủ bối cảnh sao quanh 1 cung (dùng cho detectCachCucAt/detectNearCachCucAt). */
function buildPivotContext(houses: TuViHouse[], h: TuViHouse): PivotStarContext {
  return {
    palaceName: h.palaceName,
    branch: h.branch,
    ownStars: ownStarsOf(houses, h.branch),
    groupStars: groupStarsOf(houses, h.branch),
    flankStars: flankStarsOf(houses, h.branch),
  };
}

/** Pool sao dùng để đánh giá optionalStars — nhất quán với phạm vi bắt buộc của từng scope. */
function poolFor(cc: CachCuc, ctx: PivotStarContext): string[] {
  if (cc.scope === 'same') return ctx.ownStars;
  if (cc.scope === 'giap') return ctx.flankStars;
  return [...ctx.ownStars, ...ctx.groupStars];
}

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface DetectedCach {
  cach: CachCuc;
  palace: string;       // Cung hội tụ (hoặc cung xét)
  branch: string;       // Địa chi cung hội tụ
  score: number;        // 0–100 sau điều chỉnh (= strength)
  rank: CachRank;
  activatedBy?: string; // "Đại Vận Tý" hoặc "Tiểu Vận Dần" v.v.
  // V2.0 Pattern Engine fields
  completeness: number; // 0–100: tỉ lệ sao BẮT BUỘC có mặt (full match = 100)
  confidence: number;   // 0–100: độ tin cậy nhận định (dữ liệu đủ/rõ tới đâu)
  status: 'đầy đủ' | 'gần thành' | 'khiếm khuyết';
  missingStars: string[];   // sao bắt buộc còn thiếu (rỗng nếu đầy đủ)
  optionalPresent: string[]; // sao phụ trợ có mặt (làm cách thêm mạnh)
}

export type CachRank = 'chủ' | 'phụ' | 'hỗ trợ' | 'phá';

// Điều chỉnh điểm theo phụ tinh hiện diện trong lá số
const BONUS_STARS: { name: string; delta: number }[] = [
  { name: 'Hóa Lộc', delta: 8 },
  { name: 'Hóa Quyền', delta: 6 },
  { name: 'Hóa Khoa', delta: 4 },
  { name: 'Thiên Khôi', delta: 5 },
  { name: 'Thiên Việt', delta: 5 },
  { name: 'Tả Phù', delta: 4 },
  { name: 'Hữu Bật', delta: 4 },
  { name: 'Văn Xương', delta: 3 },
  { name: 'Văn Khúc', delta: 3 },
  { name: 'Lộc Tồn', delta: 5 },
  { name: 'Thiên Mã', delta: 3 },
];
const PENALTY_STARS: { name: string; delta: number }[] = [
  { name: 'Hóa Kỵ', delta: -10 },
  { name: 'Kình Dương', delta: -6 },
  { name: 'Đà La', delta: -5 },
  { name: 'Địa Không', delta: -8 },
  { name: 'Địa Kiếp', delta: -8 },
  { name: 'Hỏa Tinh', delta: -4 },
  { name: 'Linh Tinh', delta: -4 },
  { name: 'Thiên Hình', delta: -3 },
];

const BRIGHTNESS_DELTA: Record<string, number> = {
  'miếu': 15, 'vượng': 12, 'đắc': 6, 'bình': 0, 'hãm': -12,
};

// ─── Tầng 2: Nhận diện ───────────────────────────────────────────────────────

/**
 * Nhận diện TẤT CẢ cách cục trên 12 cung, dedup theo tên cách.
 * Trả về map cách → { palace, branch } để đảm bảo mỗi cách chỉ xuất hiện 1 lần
 * (tại cung ứng rõ nhất — dùng heuristic theo priority palaces).
 */
/**
 * Cách category "nghe" (gợi ý nghề) không phải cách cục Tử Vi chính thống —
 * chỉ tồn tại phục vụ tra cứu nghề nghiệp, KHÔNG dùng cho luận vận mệnh.
 */
const OMIT_CATEGORIES: Set<string> = new Set(['nghe']);

export function detectAllCachCuc(result: AstrologyResult): DetectedCach[] {
  const houses = result.tuViChart.houses;

  // Priority: mệnh → thân → các cung lớn → tất cả
  const PRIORITY_PALACES = [
    'Mệnh', 'Quan Lộc', 'Tài Bạch', 'Phúc Đức', 'Thiên Di',
    'Phu Thê', 'Tử Tức', 'Điền Trạch', 'Huynh Đệ', 'Nô Bộc', 'Phụ Mẫu', 'Tật Ách',
  ];

  const seen = new Map<string, DetectedCach>(); // key=cach.name

  for (const palName of PRIORITY_PALACES) {
    const h = houses.find(x => x.palaceName === palName);
    if (!h) continue;
    const ctx = buildPivotContext(houses, h);
    const list = detectCachCucAt(ctx);

    for (const cc of list) {
      if (seen.has(cc.name)) continue; // giữ lần xuất hiện đầu tiên (priority cao nhất)
      if (cc.category && OMIT_CATEGORIES.has(cc.category)) continue; // bỏ cách nghề nghiệp
      const score = scoreCachCuc(cc, h, houses);
      const opt = optionalCoverage(cc, poolFor(cc, ctx));
      seen.set(cc.name, {
        cach: cc,
        palace: palName,
        branch: h.branch,
        score,
        rank: rankFromScore(cc, score),
        completeness: 100, // detectCachCucAt chỉ trả cách đủ sao bắt buộc, đúng phạm vi scope
        confidence: computeConfidence(cc, h, houses, 100, opt.ratio),
        status: 'đầy đủ',
        missingStars: [],
        optionalPresent: opt.present,
      });
    }
  }

  // Sắp xếp: tốt trước, hung sau; trong cùng loại thì điểm cao trước
  return Array.from(seen.values()).sort((a, b) => {
    if (a.cach.good !== b.cach.good) return a.cach.good ? -1 : 1;
    return b.score - a.score;
  });
}

/**
 * Cách cục hình thành TẠI một cung cụ thể (lấy cung đó làm pivot riêng biệt,
 * KHÔNG qua bước dedup ưu tiên của detectAllCachCuc) — dùng để hiển thị cùng
 * sao của cung đó khi luận từng cung (natal AI, PalaceDetail…).
 */
export function cachCucAtPalace(result: AstrologyResult, palaceName: string): DetectedCach[] {
  const houses = result.tuViChart.houses;
  const h = houses.find(x => x.palaceName === palaceName);
  if (!h) return [];
  const ctx = buildPivotContext(houses, h);
  const list = detectCachCucAt(ctx).filter(cc => !(cc.category && OMIT_CATEGORIES.has(cc.category)));

  return list
    .map(cc => {
      const score = scoreCachCuc(cc, h, houses);
      const opt = optionalCoverage(cc, poolFor(cc, ctx));
      const dc: DetectedCach = {
        cach: cc,
        palace: palaceName,
        branch: h.branch,
        score,
        rank: rankFromScore(cc, score),
        completeness: 100,
        confidence: computeConfidence(cc, h, houses, 100, opt.ratio),
        status: 'đầy đủ',
        missingStars: [],
        optionalPresent: opt.present,
      };
      return dc;
    })
    .sort((a, b) => b.score - a.score);
}

// ─── Tầng 3: Chấm điểm ───────────────────────────────────────────────────────

/**
 * Tính điểm cụ thể cho một cách cục dựa trên:
 *   - baseScore (trong CACH_CUC)
 *   - Độ miếu/hãm của các chính tinh tham gia
 *   - Phụ tinh cát/hung hiện diện trong cung
 *   - Tuần/Triệt án ngữ
 */
export function scoreCachCuc(cc: CachCuc, pivot: TuViHouse, houses: TuViHouse[]): number {
  let score = cc.baseScore ?? 65;

  // Điều chỉnh theo miếu/hãm của các sao chính trong cách
  const allStars = houses.flatMap(h => h.stars);
  for (const starName of cc.stars) {
    const entry = allStars.find(
      s => (s.name.startsWith('L. ') ? s.name.slice(3) : s.name) === starName,
    );
    if (entry?.brightness) {
      score += BRIGHTNESS_DELTA[entry.brightness] ?? 0;
    }
  }

  // Điều chỉnh theo phụ tinh cát/hung trong môi trường quanh cung hội tụ
  // (đồng cung + tam hợp/xung/nhị hợp — phạm vi RỘNG cho yếu tố bổ trợ, khác
  // với phạm vi CHẶT của việc xác định cách có "thành" hay không).
  const envStars = [...ownStarsOf(houses, pivot.branch), ...groupStarsOf(houses, pivot.branch)];
  const groupNames = new Set(envStars);
  for (const b of BONUS_STARS) {
    if (groupNames.has(b.name)) score += b.delta;
  }
  for (const p of PENALTY_STARS) {
    if (groupNames.has(p.name)) score += p.delta;
  }

  // Sao phụ trợ (optionalStars) làm cách thêm mạnh
  const opt = optionalCoverage(cc, envStars);
  score += opt.present.length * 4;

  // Tuần/Triệt làm yếu cách
  if (pivot.tuanAt) score -= 8;
  if (pivot.trietAt) score -= 12;

  return Math.max(5, Math.min(100, Math.round(score)));
}

const clean = (n: string) => (n.startsWith('L. ') ? n.slice(3) : n);

/**
 * Độ tin cậy của nhận định về một cách cục (0–100). Cao khi:
 *   - completeness cao (đủ sao bắt buộc)
 *   - độ sáng các sao chính đã xác định rõ (miếu/vượng/…)
 *   - có sao phụ trợ củng cố
 * Thấp khi Tuần/Triệt án ngữ (biểu hiện bất định) hoặc dữ liệu độ sáng thiếu.
 */
export function computeConfidence(
  cc: CachCuc,
  pivot: TuViHouse,
  houses: TuViHouse[],
  completeness: number,
  optionalRatio: number,
): number {
  let conf = 62;
  // completeness đóng góp mạnh nhất
  conf += (completeness - 100) * 0.35; // đủ = 0 phạt; thiếu càng nhiều phạt càng nặng
  // Tỉ lệ sao chính có độ sáng đã biết
  const allStars = houses.flatMap(h => h.stars);
  let known = 0;
  for (const sn of cc.stars) {
    const e = allStars.find(s => clean(s.name) === sn);
    if (e?.brightness) known++;
  }
  conf += (cc.stars.length ? known / cc.stars.length : 0) * 18;
  // Sao phụ trợ củng cố nhận định
  conf += optionalRatio * 8;
  // Bất định do Tuần/Triệt
  if (pivot.tuanAt) conf -= 6;
  if (pivot.trietAt) conf -= 10;
  return Math.max(30, Math.min(96, Math.round(conf)));
}

// ─── Tầng 2b: Cách "gần thành" (near-formation) ───────────────────────────────

/**
 * Quét toàn lá số tìm các cách GẦN THÀNH (thiếu 1 vài sao bắt buộc) tại các cung
 * ưu tiên. Trả về DetectedCach với status='gần thành' và completeness < 100.
 * Dùng để engine cân nhắc "cách tiềm năng" mà KHÔNG khẳng định chắc chắn.
 */
export function detectNearFormations(result: AstrologyResult): DetectedCach[] {
  const houses = result.tuViChart.houses;
  const PRIORITY_PALACES = [
    'Mệnh', 'Quan Lộc', 'Tài Bạch', 'Phúc Đức', 'Thiên Di', 'Phu Thê',
  ];
  const seen = new Map<string, DetectedCach>();
  for (const palName of PRIORITY_PALACES) {
    const h = houses.find(x => x.palaceName === palName);
    if (!h) continue;
    const ctx = buildPivotContext(houses, h);
    const near = detectNearCachCucAt(ctx);
    for (const nc of near) {
      if (seen.has(nc.cach.name)) continue;
      // Không trùng với cách đã đủ (đủ sẽ do detectAllCachCuc phụ trách)
      const score = scoreCachCuc(nc.cach, h, houses);
      const opt = optionalCoverage(nc.cach, poolFor(nc.cach, ctx));
      seen.set(nc.cach.name, {
        cach: nc.cach,
        palace: palName,
        branch: h.branch,
        // strength của cách gần thành bị chiết khấu theo completeness
        score: Math.round(score * (nc.completeness / 100)),
        rank: nc.cach.good ? 'hỗ trợ' : 'phá',
        completeness: nc.completeness,
        confidence: computeConfidence(nc.cach, h, houses, nc.completeness, opt.ratio),
        status: nc.completeness >= MIN_COMPLETENESS_TO_NAME ? 'gần thành' : 'khiếm khuyết',
        missingStars: nc.missingStars,
        optionalPresent: opt.present,
      });
    }
  }
  return Array.from(seen.values()).sort((a, b) => b.completeness - a.completeness);
}

// ─── Tầng 4: Xếp hạng ────────────────────────────────────────────────────────

function rankFromScore(cc: CachCuc, score: number): CachRank {
  if (!cc.good) return score > 40 ? 'hỗ trợ' : 'phá';
  if (score >= 80) return 'chủ';
  if (score >= 60) return 'phụ';
  return 'hỗ trợ';
}

/** Tách nhóm từ danh sách detected. */
export function groupByRank(detected: DetectedCach[]): {
  chu: DetectedCach[];
  phu: DetectedCach[];
  hoTro: DetectedCach[];
  pha: DetectedCach[];
} {
  return {
    chu: detected.filter(d => d.rank === 'chủ'),
    phu: detected.filter(d => d.rank === 'phụ'),
    hoTro: detected.filter(d => d.rank === 'hỗ trợ' && d.cach.good),
    pha: detected.filter(d => d.rank === 'phá' || (d.rank === 'hỗ trợ' && !d.cach.good)),
  };
}

// ─── Tầng 5: Phân tích kích hoạt theo thời gian ──────────────────────────────

const CAT_ACTIVATOR = ['Hóa Lộc', 'Hóa Quyền', 'Hóa Khoa', 'Lộc Tồn'];
const HUNG_ACTIVATOR = ['Hóa Kỵ', 'Kình Dương', 'Đà La', 'Địa Không', 'Địa Kiếp'];

/**
 * Kiểm tra xem đại vận / tiểu vận có kích hoạt cách cục không.
 * Logic: cung đại vận hội thêm các sao cát/hung vào group của cung cách.
 */
export function checkActivation(
  d: DetectedCach,
  pivotHouse: TuViHouse,
  transitBranch: string,  // chi đại vận / tiểu vận
  transitStars: string[], // các sao tại cung transit
  label: string,          // "Đại Vận Tý" v.v.
): { activated: boolean; reason: string } {
  // Kiểm tra xem transit cung có rơi vào group của cách không
  const pivotIdx = branchIdx(pivotHouse.branch);
  const transitIdx = branchIdx(transitBranch);
  const th = TAM_HOP.find(g => g.includes(pivotIdx)) ?? [];
  const xung = (pivotIdx + 6) % 12;
  const nh = NHI_HOP[pivotIdx];
  const inGroup = th.includes(transitIdx) || transitIdx === xung || transitIdx === nh || transitIdx === pivotIdx;

  if (!inGroup) return { activated: false, reason: '' };

  // Kiểm tra sao transit có thêm năng lượng không
  const catCount = transitStars.filter(s => CAT_ACTIVATOR.includes(s)).length;
  const hungCount = transitStars.filter(s => HUNG_ACTIVATOR.includes(s)).length;

  if (d.cach.good && catCount > 0) {
    return { activated: true, reason: `${label} đưa cát tinh (${transitStars.filter(s => CAT_ACTIVATOR.includes(s)).join(', ')}) tới vùng ảnh hưởng của cách này → được kích hoạt, phát huy tốt` };
  }
  if (!d.cach.good && hungCount > 0) {
    return { activated: true, reason: `${label} đưa hung tinh (${transitStars.filter(s => HUNG_ACTIVATOR.includes(s)).join(', ')}) tới vùng ảnh hưởng của cách này → bị kích hoạt xấu` };
  }
  if (d.cach.good && hungCount > catCount) {
    return { activated: true, reason: `${label} đưa hung tinh tới vùng ảnh hưởng → cách tốt này tạm thời bị cản trở` };
  }

  return { activated: false, reason: '' };
}

// ─── Tầng 6: Meta Pattern ────────────────────────────────────────────────────

export interface MetaPattern {
  menhCach: string;   // Cốt cách bản thân (từ cung Mệnh/Thân)
  taiCach: string;    // Cách về tài lộc (từ Tài Bạch)
  quanCach: string;   // Cách về công danh (từ Quan Lộc)
  phucCach: string;   // Cách về phúc (từ Phúc Đức)
  honNhanCach: string; // Cách về hôn nhân (từ Phu Thê)
  tongDanh: string;   // Danh hiệu tổng thể của lá số
}

function palaceSummary(detected: DetectedCach[], palName: string): string {
  const hits = detected.filter(d => d.palace === palName && d.cach.good).slice(0, 2);
  if (!hits.length) return 'chưa rõ rệt';
  return hits.map(d => d.cach.name).join(' + ');
}

export function buildMetaPattern(detected: DetectedCach[]): MetaPattern {
  const { chu, phu } = groupByRank(detected);
  const topGood = [...chu, ...phu].filter(d => d.cach.good);

  // Tổng danh của lá số
  let tongDanh = 'Bình thường';
  if (chu.length >= 2 && chu.every(d => d.cach.good)) tongDanh = 'Đại quý cách';
  else if (chu.length >= 1 && chu[0].cach.good && chu[0].score >= 85) tongDanh = 'Quý cách';
  else if (topGood.length >= 3) tongDanh = 'Đa cách cát — nhiều chiều phát triển';
  else if (topGood.length >= 1) tongDanh = 'Cát cách rõ — có điểm mạnh nổi trội';
  else if (detected.filter(d => !d.cach.good).length >= 2) tongDanh = 'Hung cách nặng — cần chú trọng hóa giải';

  return {
    menhCach: palaceSummary(detected, 'Mệnh'),
    taiCach: palaceSummary(detected, 'Tài Bạch'),
    quanCach: palaceSummary(detected, 'Quan Lộc'),
    phucCach: palaceSummary(detected, 'Phúc Đức'),
    honNhanCach: palaceSummary(detected, 'Phu Thê'),
    tongDanh,
  };
}

// ─── Tầng 7: Context & Text ───────────────────────────────────────────────────

/**
 * Sinh block text để inject vào AI context — cung cấp dữ liệu pre-computed
 * cho AI PHÂN TÍCH cơ chế vận hành từng cách cục, KHÔNG chỉ liệt kê tên.
 *
 * V2.0: Lọc nghiêm ngặt trước khi gửi AI —
 *   - Khi có transitBranch: chỉ gửi cách ĐANG KÍCH HOẠT (trong group transit); loại NGỦ.
 *   - Khi natal (không transit): gửi chủ ≥80 + phụ 60–79 + hung đáng chú ý; bỏ hỗ trợ <60.
 *
 * @param transitBranch  Chi của vận đang xét (Đại Vận / Tiểu Vận / Nguyệt Vận)
 * @param transitLabel   Nhãn hiển thị, vd "Đại Vận Giáp Tý"
 */
export function buildCachCucContext(
  result: AstrologyResult,
  transitBranch?: string,
  transitLabel?: string,
): string {
  const detected = detectAllCachCuc(result);
  const houses = result.tuViChart.houses;

  if (!detected.length) {
    return '★ CÁCH CỤC ENGINE: Không phát hiện cách cục đặc sắc — lá số thiên về tính ổn định, ít cực đoan.';
  }

  const { chu, phu, hoTro, pha } = groupByRank(detected);
  const meta = buildMetaPattern(detected);

  // Kiểm tra xem cách có nằm trong group transit không (để lọc NGỦ)
  const cachInTransitGroup = (d: DetectedCach): boolean => {
    if (!transitBranch) return true;
    const pivot = houses.find(h => h.branch === d.branch);
    if (!pivot) return false;
    const pi = branchIdx(pivot.branch);
    const ti = branchIdx(transitBranch);
    const th = TAM_HOP.find(g => g.includes(pi)) ?? [];
    const xung = (pi + 6) % 12;
    const nh = NHI_HOP[pi];
    return th.includes(ti) || ti === xung || ti === nh || ti === pi;
  };

  // Helper: tra vị trí thực của sao trên lá số (loại sao lưu — natal/đại vận).
  const cleanNm = (n: string) => (n.startsWith('L. ') ? n.slice(3) : n);
  const locateStar = (name: string): string | null => {
    for (const h of houses) for (const s of h.stars) {
      if (s.type === 'luu') continue;
      if (cleanNm(s.name) === name) return h.palaceName;
    }
    return null;
  };

  // Helper: format từng cách với evidence VỊ TRÍ THỰC + activation state
  const fmtCach = (d: DetectedCach): string => {
    const pivot = houses.find(h => h.branch === d.branch);
    // BẮT BUỘC ghi rõ vị trí thực của từng sao để AI không bịa (vd Tử Vi tại Tài Bạch, không phải Tật Ách)
    const allEvidenceStars = [...(d.cach.pivotStars ?? []), ...d.cach.stars];
    const evidenceLoc = allEvidenceStars.map(sn => {
      const at = locateStar(sn);
      return at ? `${sn}@${at}` : `${sn}@(?)`;
    }).join(' + ');
    const tuanTriet = pivot?.tuanAt ? ' [Tuần −8đ]' : pivot?.trietAt ? ' [Triệt −12đ]' : '';
    const optTag = d.optionalPresent.length ? ` +phụ tá: ${d.optionalPresent.join(', ')}` : '';
    const meta = d.completeness < 100
      ? ` | ĐỦ ${d.completeness}% (thiếu: ${d.missingStars.join(', ')}) | tin cậy ${d.confidence}%`
      : ` | tin cậy ${d.confidence}%`;
    const relationTxt =
      d.cach.scope === 'same' ? `Cách ĐỒNG CUNG tại ${d.palace}(${d.branch})` :
      d.cach.scope === 'giap' ? `Cách GIÁP (kẹp 2 cung kề) quanh ${d.palace}(${d.branch})` :
      `Cách hội tụ về ${d.palace}(${d.branch}) (tam hợp/xung/nhị hợp)`;
    let line = `    • ${d.cach.name} | ${d.score}/100${meta} | ${relationTxt}${tuanTriet} | Vị trí thực của sao: ${evidenceLoc}${optTag}`;

    if (transitBranch && pivot) {
      const tvH = houses.find(h => h.branch === transitBranch);
      if (tvH) {
        const tvStars = tvH.stars.map(s => s.name.startsWith('L. ') ? s.name.slice(3) : s.name);
        const catFound = tvStars.filter(s => CAT_ACTIVATOR.includes(s));
        const hungFound = tvStars.filter(s => HUNG_ACTIVATOR.includes(s));
        let state: string;
        if (d.cach.good) {
          if (catFound.length > 0 && hungFound.length === 0) state = 'TĂNG CƯỜNG';
          else if (catFound.length > 0 && hungFound.length > 0) state = 'KÍCH HOẠT (xáo trộn)';
          else if (hungFound.length > catFound.length) state = 'BIẾN CHẤT (hung tinh áp đảo)';
          else state = 'KÍCH HOẠT (transit trong group)';
        } else {
          state = hungFound.length > 0 ? 'PHÁT TÁC — cần phòng' : 'KÍCH HOẠT nhẹ';
        }
        const detail = [...catFound.map(s => `+${s}`), ...hungFound.map(s => `-${s}`)].join(', ');
        line += ` | ${transitLabel ?? transitBranch}: ${state}${detail ? ` (${detail})` : ''}`;
      }
    }
    return line;
  };

  // Lọc theo transit (loại bỏ NGỦ khi có transit context)
  const chuFiltered = transitBranch ? chu.filter(cachInTransitGroup) : chu;
  const phuFiltered = transitBranch ? phu.filter(cachInTransitGroup) : phu;
  const phaFiltered = transitBranch ? pha.filter(cachInTransitGroup) : pha;

  // ★ CÁCH CỤC CHÍNH — hình thành từ 4 cung TRỌNG YẾU (Mệnh/Tài Bạch/Quan Lộc/
  // Thiên Di). Đây là các cách quan trọng nhất của lá số — LUÔN đưa vào & phải
  // được luận/đánh giá TRƯỚC TIÊN, không bị giới hạn bởi ngưỡng điểm chủ/phụ.
  const coreAll = detected.filter(d => CORE_PALACES.includes(d.palace));
  const coreShow = (transitBranch ? coreAll.filter(cachInTransitGroup) : coreAll)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
  const coreNames = new Set(coreShow.map(d => d.cach.name));

  // Bỏ trùng: cách đã hiện ở phần CHÍNH thì không lặp lại ở chủ/phụ/hung
  const chuShow = chuFiltered.filter(d => !coreNames.has(d.cach.name));
  const phuShow = phuFiltered.filter(d => !coreNames.has(d.cach.name));
  const phaShow = phaFiltered.filter(d => !coreNames.has(d.cach.name));

  const lines: string[] = [];
  lines.push('★ CÁCH CỤC ENGINE — dữ liệu pre-computed:');
  lines.push('  ⚠ RÀNG BUỘC: mỗi dòng cách ghi rõ "Vị trí thực của sao: SaoA@Cung1 + SaoB@Cung2 …" — AI TUYỆT ĐỐI phải bám đúng vị trí sao (vd Tử Vi tại Tài Bạch), KHÔNG được đổi cung của sao khi luận. "Cách hội tụ về X" chỉ là điểm hội, không phải vị trí sao.');
  lines.push(`  TỔNG DANH: ${meta.tongDanh}`);
  lines.push(`  Mệnh cách: ${meta.menhCach} | Tài cách: ${meta.taiCach} | Quan cách: ${meta.quanCach}`);

  if (transitBranch) {
    const label = transitLabel ?? transitBranch;
    if (coreShow.length === 0 && chuShow.length === 0 && phuShow.length === 0 && phaShow.length === 0) {
      lines.push(`  [${label}] Không có cách cục nào được kích hoạt — cách gốc đang NGỦ.`);
      if (chu.length) {
        lines.push(`  (Cách gốc tham khảo: ${chu.map(d => `${d.cach.name} ${d.score}đ`).join('; ')})`);
      }
      return lines.join('\n');
    }
    lines.push(`  [${label}] CHỈ hiển thị cách ĐANG KÍCH HOẠT. YÊU CẦU: phân tích từng cách — trạng thái + bằng chứng sao + ảnh hưởng thực tế (sự nghiệp/tài/quan hệ). KHÔNG thêm cách không có trong danh sách này.`);
  } else {
    lines.push('  [Lá số gốc] YÊU CẦU: mỗi cách phải phân tích đầy đủ — bằng chứng sao, cơ chế vận hành, ảnh hưởng 5 chiều (sự nghiệp/tài/hôn nhân/sức khỏe/xã hội). KHÔNG liệt kê tên suốt.');
  }

  if (coreShow.length) {
    lines.push(`  ★★ CÁCH CỤC CHÍNH — từ 4 cung TRỌNG YẾU Mệnh/Tài Bạch/Quan Lộc/Thiên Di${transitBranch ? ' (đang kích hoạt)' : ''}. LUẬN VÀ ĐÁNH GIÁ CÁC CÁCH NÀY TRƯỚC TIÊN:`);
    coreShow.forEach(d => lines.push(fmtCach(d)));
  }
  if (chuShow.length) {
    lines.push(`  ★ CÁCH CHỦ KHÁC${transitBranch ? ' — đang kích hoạt' : ' (≥80đ — cốt lõi lá số)'}:`);
    chuShow.forEach(d => lines.push(fmtCach(d)));
  }
  if (phuShow.length) {
    lines.push(`  CÁCH PHỤ${transitBranch ? ' — được kích hoạt' : ' (60–79đ — bổ trợ)'}:`);
    phuShow.forEach(d => lines.push(fmtCach(d)));
  }
  if (!transitBranch && hoTro.length) {
    // Chỉ mention tên, không yêu cầu phân tích sâu
    const hoTroShow = hoTro.filter(d => !coreNames.has(d.cach.name));
    if (hoTroShow.length) {
      lines.push(`  [Hỗ trợ yếu <60đ — không cần phân tích]: ${hoTroShow.slice(0, 3).map(d => `${d.cach.name}(${d.score}đ)`).join('; ')}`);
    }
  }
  if (phaShow.length) {
    lines.push(`  ★ CÁCH HUNG KHÁC${transitBranch ? ' — phát tác' : ' — cần phòng'}:`);
    phaShow.forEach(d => lines.push(fmtCach(d)));
  }

  // V2.0: cách "gần thành" — chỉ nêu ở lá số gốc, và CHỈ khi đạt ngưỡng completeness.
  if (!transitBranch) {
    const near = detectNearFormations(result)
      .filter(d => d.status === 'gần thành' && d.cach.good)
      .slice(0, 2);
    if (near.length) {
      lines.push('  ◇ CÁCH TIỀM NĂNG (gần thành — CHƯA đủ sao, nói ở dạng khả năng, KHÔNG khẳng định):');
      near.forEach(d => lines.push(
        `    ◦ ${d.cach.name} | đủ ${d.completeness}% | thiếu: ${d.missingStars.join(', ')} | tin cậy ${d.confidence}% | Cung ${d.palace}(${d.branch})`,
      ));
    }
  }

  return lines.join('\n');
}

// ─── Offline Text: phần Cách Cục cho luận giải không cần AI ──────────────────

const CATEGORY_LABEL: Record<CachCucCategory, string> = {
  chinh: 'Chính cách',
  phu: 'Phú cách',
  quy: 'Quý cách',
  hung: 'Hung cách',
  bien: 'Biến cách',
  nghe: 'Cách theo nghề',
  phu_tinh: 'Cách phụ tinh',
};

/**
 * Sinh đoạn phân tích cách cục dạng offline markdown, dùng trong
 * luận giải nâng cao (không cần AI, không tốn xu).
 *
 * @param scope  'natal' | 'daivan' | 'tieuvanuguyet'
 * @param transitBranch  chi Đại Vận hoặc Tiểu Vận (để phân tích kích hoạt)
 * @param transitLabel   nhãn hiển thị, vd "Đại Vận Giáp Tý 35–44 tuổi"
 */
export function generateCachCucOfflineSection(
  result: AstrologyResult,
  scope: 'natal' | 'daivan' | 'tieuvanuguyet' = 'natal',
  transitBranch?: string,
  transitLabel?: string,
): string {
  const detected = detectAllCachCuc(result);
  const out: string[] = [];

  if (scope === 'natal') {
    out.push('# Phân tích Cách Cục — Bộ Sao Đặc Sắc của Lá Số');
    out.push('');
    out.push(
      '_**Cách cục** là những "bộ sao" đặc biệt do nhiều sao hội lại tạo thành. ' +
      'Một bộ sao tốt có giá trị hơn nhiều so với từng sao lẻ — nó định hình tầm vóc và hướng đi của cả lá số. ' +
      'Bộ sao xấu không phải "án phạt", mà là điểm dễ vấp cần nhận diện trước để phòng tránh._',
    );
    out.push('');
  } else if (scope === 'daivan') {
    out.push(`# Cách Cục Kích Hoạt${transitLabel ? ` — ${transitLabel}` : ''}`);
    out.push('');
    out.push('_Phần này cho thấy những cách cục nào của lá số gốc đang được VẬN TRÌNH kích hoạt hoặc phá vỡ trong giai đoạn này._');
    out.push('');
  } else {
    out.push(`# Cách Cục Theo Vận${transitLabel ? ` — ${transitLabel}` : ''}`);
    out.push('');
  }

  if (!detected.length) {
    out.push('- Không phát hiện cách cục đặc sắc — lá số thiên về tính ổn định, ít cực đoan.');
    return out.join('\n');
  }

  const { chu, phu, hoTro, pha } = groupByRank(detected);
  const meta = buildMetaPattern(detected);

  // V2.0 UX: gộp toàn bộ CÁCH CÓ TRONG LÁ SỐ, lấy 24 cách quan trọng nhất (theo score).
  // Format mới: "Tên cách (vị trí): với Sao A tại cung X, Sao B tại cung Y: Luận giải".
  const houses = result.tuViChart.houses;
  const cleanNm = (n: string) => (n.startsWith('L. ') ? n.slice(3) : n);
  const locateStar = (name: string): string | null => {
    for (const h of houses) {
      for (const s of h.stars) {
        if (s.type === 'luu') continue;
        if (cleanNm(s.name) === name) return h.palaceName;
      }
    }
    return null;
  };
  const positionOf = (d: DetectedCach): string => {
    if (d.cach.scope === 'same') return `đồng cung tại ${d.palace}`;
    if (d.cach.scope === 'giap') return `giáp (kẹp 2 cung kề) quanh ${d.palace}`;
    return `tam hợp/xung chiếu ${d.palace}`;
  };
  const evidenceOf = (d: DetectedCach): string => {
    const parts: string[] = [];
    for (const sn of [...(d.cach.pivotStars ?? []), ...d.cach.stars]) {
      const at = locateStar(sn);
      if (at) parts.push(`${sn} tại cung ${at}`);
      else parts.push(sn);
    }
    return parts.join(', ');
  };
  const impactHint = (d: DetectedCach): string => {
    if (!d.cach.good) return 'Tác động lên toàn cục: **cần phòng thủ**, dễ gây trắc trở nếu không hóa giải.';
    if (d.rank === 'chủ') return 'Tác động lên toàn cục: **cốt lõi định hình vận mệnh** — ảnh hưởng xuyên suốt sự nghiệp, tài lộc, phúc khí.';
    if (d.rank === 'phụ') return 'Tác động lên toàn cục: **bổ trợ cách chủ** — làm nổi bật thêm mặt tốt tương ứng.';
    return 'Tác động lên toàn cục: **hỗ trợ nhẹ** — góp thêm phần thuận lợi trong lĩnh vực tương ứng.';
  };

  // Chọn 24 cách quan trọng nhất theo score, ưu tiên cách tốt trước
  const TOP_N = 24;
  const good = [...chu, ...phu, ...hoTro].sort((a, b) => b.score - a.score);
  const bad = [...pha].sort((a, b) => b.score - a.score);
  // Chia hạn ngạch: ~2/3 cát, 1/3 hung (nhưng không vượt quá thực tế)
  const goodQuota = Math.min(good.length, Math.ceil(TOP_N * 0.65));
  const badQuota = Math.min(bad.length, TOP_N - goodQuota);
  const topGood = good.slice(0, goodQuota);
  const topBad = bad.slice(0, badQuota);

  out.push(`**Tổng quan lá số: ${meta.tongDanh}**`);
  out.push(`_Đây là danh sách cách cục HIỆN CÓ trong lá số (đã chọn ra ${topGood.length + topBad.length} cách quan trọng nhất trong tổng số ${detected.length} cách phát hiện được)._`);
  out.push('');

  const writeCach = (d: DetectedCach, mark: string) => {
    const evidence = evidenceOf(d);
    const pos = positionOf(d);
    const meaning = d.cach.meaning.trim();
    out.push(`${mark} **${d.cach.name}** _(${pos})_ — với ${evidence}: ${meaning}`);
    out.push(`   ${impactHint(d)}`);
    if (scope !== 'natal' && transitBranch) {
      const pivot = houses.find(h => h.branch === d.branch);
      const tvH = houses.find(h => h.branch === transitBranch);
      if (pivot && tvH) {
        const tvStars = tvH.stars.map(s => cleanNm(s.name));
        const act = checkActivation(d, pivot, transitBranch, tvStars, transitLabel ?? '');
        if (act.activated) out.push(`   > ${d.cach.good ? '⚡' : '⚠'} **${act.reason}**`);
      }
    }
    out.push('');
  };

  if (topGood.length) {
    out.push('## Cách cát trong lá số (tốt)');
    out.push('');
    for (const d of topGood) writeCach(d, '###');
  }
  if (topBad.length) {
    out.push('## Cách hung cần lưu ý');
    out.push('');
    for (const d of topBad) writeCach(d, '###');
  }

  // Meta pattern tóm tắt ở cuối phần natal
  if (scope === 'natal') {
    out.push('## Chân Dung Tổng Thể');
    out.push('');
    out.push(`| Khía cạnh | Cách cục chủ đạo |`);
    out.push(`|---|---|`);
    out.push(`| Bản thân (Mệnh cách) | ${meta.menhCach} |`);
    out.push(`| Tài lộc (Tài cách) | ${meta.taiCach} |`);
    out.push(`| Công danh (Quan cách) | ${meta.quanCach} |`);
    out.push(`| Phúc khí (Phúc cách) | ${meta.phucCach} |`);
    out.push(`| Hôn nhân (Hôn nhân cách) | ${meta.honNhanCach} |`);
    out.push('');
    out.push(
      '_Cách cục là "bản đồ tiềm năng" — tiềm năng chỉ phát huy khi gặp đúng đại vận kích hoạt. ' +
      'Kiểm tra mục "Kích hoạt theo vận" trong phần Đại Vận để biết giai đoạn nào lá số phát huy mạnh nhất._',
    );
  }

  return out.join('\n');
}

/**
 * Sinh đoạn phân tích kích hoạt cách cục riêng cho một Đại Vận / Tiểu Vận / Nguyệt Vận.
 * V2.0: giới hạn TOP 12 cách kích hoạt (tránh dài), format nhất quán với natal
 * "Tên cách (vị trí) — với Sao A tại cung X: Luận + Tác động".
 */
export function cachCucActivationBlock(
  result: AstrologyResult,
  transitBranch: string,
  label: string,
): string {
  const detected = detectAllCachCuc(result);
  const houses = result.tuViChart.houses;
  const transitH = houses.find(h => h.branch === transitBranch);
  if (!transitH) return '';

  const transitStars = transitH.stars.map(s => s.name.startsWith('L. ') ? s.name.slice(3) : s.name);
  const cleanNm = (n: string) => (n.startsWith('L. ') ? n.slice(3) : n);
  const locateStar = (name: string): string | null => {
    for (const h of houses) for (const s of h.stars) {
      if (s.type === 'luu') continue;
      if (cleanNm(s.name) === name) return h.palaceName;
    }
    return null;
  };
  const evidenceOf = (d: DetectedCach): string =>
    [...(d.cach.pivotStars ?? []), ...d.cach.stars]
      .map(sn => { const at = locateStar(sn); return at ? `${sn} tại cung ${at}` : sn; }).join(', ');
  const positionOf = (d: DetectedCach): string =>
    d.cach.scope === 'same' ? `đồng cung tại ${d.palace}` :
    d.cach.scope === 'giap' ? `giáp (kẹp 2 cung kề) quanh ${d.palace}` :
    `tam hợp/xung chiếu ${d.palace}`;

  interface ActItem { d: DetectedCach; reason: string; kind: 'good' | 'bad' | 'broken'; }
  const items: ActItem[] = [];

  for (const d of detected) {
    const pivot = houses.find(h => h.branch === d.branch);
    if (!pivot) continue;
    const act = checkActivation(d, pivot, transitBranch, transitStars, label);
    if (!act.activated) continue;
    let kind: ActItem['kind'];
    if (d.cach.good) {
      if (act.reason.includes('PHÁ tạm thời')) kind = 'broken';
      else kind = 'good';
    } else {
      kind = 'bad';
    }
    items.push({ d, reason: act.reason, kind });
  }
  if (items.length === 0) return '';

  // Sắp theo score giảm dần, giữ top 12
  items.sort((a, b) => b.d.score - a.d.score);
  const TOP = 12;
  const top = items.slice(0, TOP);

  const activatedGood: string[] = [];
  const activatedBad: string[] = [];
  const broken: string[] = [];
  for (const it of top) {
    const { d, reason, kind } = it;
    const line = `**${d.cach.name}** _(${positionOf(d)})_ — với ${evidenceOf(d)}: ${d.cach.meaning.slice(0, 180)}${d.cach.meaning.length > 180 ? '…' : ''} _${reason}_`;
    if (kind === 'good') activatedGood.push(line);
    else if (kind === 'bad') activatedBad.push(line);
    else broken.push(line);
  }

  const out: string[] = ['', '**Cách cục kích hoạt trong vận này:**', ''];
  if (activatedGood.length) {
    out.push('_Cách cục CÁT đang phát huy:_');
    activatedGood.forEach(l => out.push(`- ${l}`));
    out.push('');
  }
  if (activatedBad.length) {
    out.push('_Cách cục HUNG đang phát tác — cần đề phòng:_');
    activatedBad.forEach(l => out.push(`- ${l}`));
    out.push('');
  }
  if (broken.length) {
    out.push('_Cách tốt bị PHÁ tạm thời:_');
    broken.forEach(l => out.push(`- ${l}`));
    out.push('');
  }
  return out.join('\n');
}
