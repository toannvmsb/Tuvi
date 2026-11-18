/**
 * DÁNG NGƯỜI / KHUÔN MẶT → gợi ý canh giờ sinh.
 *
 * Giờ sinh quyết định cung Mệnh, nên mỗi canh giờ cho một bộ chính tinh (và ngũ hành bản mệnh) khác nhau tại Mệnh.
 * Truyền thống Tử Vi gắn chính tinh tọa Mệnh với hình dáng/diện mạo. Ở đây chuyển các mô tả đó thành nhóm thô
 * (dáng: gầy / cân đối / đầy đặn · mặt: dài / vuông / tròn / trái xoan / góc cạnh) rồi chấm độ khớp với những gì người dùng tự nhận.
 *
 * NGUỒN & ĐỘ TIN: gốc là bảng `data/starAppearance.ts` đã có trong app (tướng cổ điển, vốn dùng để vẽ chân dung). Các sách/trường phái
 * mô tả KHÁC NHAU (vd Liêm Trinh có nguồn ghi cao lớn mặt dài, nguồn khác ghi cao vừa mặt xương), và người dùng tự đánh giá dáng mình
 * rất chủ quan → đây là tín hiệu YẾU, chỉ dùng như lực bổ trợ cho các mốc đời (trọng số `BT_LOOK.lambda` nhỏ). Mọi con số là TẠM.
 */
import type { AstrologyResult } from '../../types';

export type BuildKind = 'thin' | 'balanced' | 'full';
export type FaceKind = 'long' | 'square' | 'round' | 'oval' | 'angular';

export const BUILD_OPTIONS: { id: BuildKind; label: string }[] = [
  { id: 'thin', label: 'Gầy, mảnh' },
  { id: 'balanced', label: 'Cân đối' },
  { id: 'full', label: 'Đầy đặn, nở nang' },
];
export const FACE_OPTIONS: { id: FaceKind; label: string }[] = [
  { id: 'long', label: 'Mặt dài' },
  { id: 'square', label: 'Mặt vuông' },
  { id: 'round', label: 'Mặt tròn' },
  { id: 'oval', label: 'Mặt trái xoan' },
  { id: 'angular', label: 'Mặt góc cạnh, xương rõ' },
];

export interface LookAnswer { build?: BuildKind; face?: FaceKind }

/** Mọi giá trị TẠM. */
export const BT_LOOK = {
  /** Sức ảnh hưởng của dáng người lên xác suất (nhỏ vì tín hiệu yếu/chủ quan). */
  lambda: 0.7,
  /** Làm mượt phân phối dự đoán để một đáp án "lạc" không loại hẳn canh giờ. */
  smooth: 0.15,
  /** Sao hãm: biểu hiện nhẹ hơn. */
  dimFactor: 0.6,
  /** Mệnh vô chính diệu: mượn chính tinh cung Thiên Di (xung chiếu) với hệ số này. */
  borrowFactor: 0.5,
  /** Ngũ hành bản mệnh. */
  elementWeight: 0.5,
} as const;

type Dist<K extends string> = Partial<Record<K, number>>;
interface StarTags { build: Dist<BuildKind>; face: Dist<FaceKind> }

/** Nhóm thô từ mô tả trong data/starAppearance.ts (tổng mỗi chiều = 1). */
export const STAR_TAGS: Record<string, StarTags> = {
  'Tử Vi': { build: { full: 0.7, balanced: 0.3 }, face: { square: 0.6, round: 0.4 } },
  'Thiên Cơ': { build: { thin: 0.7, balanced: 0.3 }, face: { long: 0.8, oval: 0.2 } },
  'Thái Dương': { build: { balanced: 0.5, full: 0.5 }, face: { square: 0.5, round: 0.5 } },
  'Vũ Khúc': { build: { balanced: 0.6, thin: 0.4 }, face: { angular: 0.6, square: 0.4 } },
  'Thiên Đồng': { build: { full: 0.6, balanced: 0.4 }, face: { round: 0.8, oval: 0.2 } },
  'Liêm Trinh': { build: { balanced: 0.6, thin: 0.2, full: 0.2 }, face: { angular: 0.5, long: 0.5 } },
  'Thiên Phủ': { build: { full: 0.7, balanced: 0.3 }, face: { square: 0.7, round: 0.3 } },
  'Thái Âm': { build: { thin: 0.6, balanced: 0.4 }, face: { oval: 0.8, round: 0.2 } },
  'Tham Lang': { build: { full: 0.5, balanced: 0.5 }, face: { oval: 0.4, round: 0.3, long: 0.3 } },
  'Cự Môn': { build: { thin: 0.5, balanced: 0.5 }, face: { long: 0.7, angular: 0.3 } },
  'Thiên Tướng': { build: { balanced: 0.8, full: 0.2 }, face: { square: 0.5, round: 0.3, oval: 0.2 } },
  'Thiên Lương': { build: { balanced: 0.5, full: 0.5 }, face: { long: 0.8, square: 0.2 } },
  'Thất Sát': { build: { balanced: 0.5, full: 0.3, thin: 0.2 }, face: { angular: 0.7, long: 0.3 } },
  'Phá Quân': { build: { balanced: 0.6, full: 0.2, thin: 0.2 }, face: { angular: 0.8, square: 0.2 } },
};

/** Ngũ hành bản mệnh (khớp data/starAppearance.ELEMENT_LOOK). */
export const ELEMENT_TAGS: Record<string, StarTags> = {
  Kim: { build: { balanced: 0.7, thin: 0.3 }, face: { square: 0.7, oval: 0.3 } },
  Mộc: { build: { thin: 0.7, balanced: 0.3 }, face: { long: 0.8, oval: 0.2 } },
  Thủy: { build: { full: 0.7, balanced: 0.3 }, face: { round: 0.8, oval: 0.2 } },
  Hỏa: { build: { balanced: 0.6, thin: 0.4 }, face: { angular: 0.5, oval: 0.5 } },
  Thổ: { build: { full: 0.6, balanced: 0.4 }, face: { square: 0.7, round: 0.3 } },
};

const BUILD_KEYS: BuildKind[] = ['thin', 'balanced', 'full'];
const FACE_KEYS: FaceKind[] = ['long', 'square', 'round', 'oval', 'angular'];

export interface LookPrediction { build: Record<BuildKind, number>; face: Record<FaceKind, number> }

function acc<K extends string>(into: Record<K, number>, d: Dist<K>, w: number) {
  for (const k in d) into[k as K] += (d[k as K] ?? 0) * w;
}
function normalize<K extends string>(r: Record<K, number>, keys: K[]) {
  const s = keys.reduce((a, k) => a + r[k], 0);
  const n = keys.length;
  for (const k of keys) r[k] = s > 0 ? (r[k] / s) * (1 - BT_LOOK.smooth) + BT_LOOK.smooth / n : 1 / n;
}

/** Dự đoán dáng/mặt từ lá số (cung Mệnh: chính tinh, nếu vô chính diệu thì mượn Thiên Di; cộng ngũ hành bản mệnh). */
export function predictLook(result: AstrologyResult): LookPrediction {
  const houses = result.tuViChart.houses;
  const menh = houses.find(h => h.isManh);
  const thienDi = houses.find(h => h.palaceName === 'Thiên Di');
  const build = { thin: 0, balanced: 0, full: 0 } as Record<BuildKind, number>;
  const face = { long: 0, square: 0, round: 0, oval: 0, angular: 0 } as Record<FaceKind, number>;

  const addStars = (stars: { name: string; type: string; brightness?: string }[] | undefined, factor: number): number => {
    let n = 0;
    for (const s of stars ?? []) {
      if (s.type !== 'chinh') continue;
      const t = STAR_TAGS[s.name];
      if (!t) continue;
      const w = factor * (s.brightness === 'hãm' ? BT_LOOK.dimFactor : 1);
      acc(build, t.build, w); acc(face, t.face, w);
      n++;
    }
    return n;
  };

  const own = addStars(menh?.stars, 1);
  if (own === 0) addStars(thienDi?.stars, BT_LOOK.borrowFactor);
  const el = ELEMENT_TAGS[result.tuViChart.menhElement];
  if (el) { acc(build, el.build, BT_LOOK.elementWeight); acc(face, el.face, BT_LOOK.elementWeight); }

  normalize(build, BUILD_KEYS);
  normalize(face, FACE_KEYS);
  return { build, face };
}

/** Logit cộng thêm cho một canh giờ: λ · Σ ln(P(đáp án) / P đều). 0 nếu người dùng không trả lời. */
export function lookLogit(pred: LookPrediction, ans: LookAnswer | undefined): number {
  if (!ans) return 0;
  let s = 0;
  if (ans.build) s += Math.log(pred.build[ans.build] * BUILD_KEYS.length);
  if (ans.face) s += Math.log(pred.face[ans.face] * FACE_KEYS.length);
  return BT_LOOK.lambda * s;
}

export function lookAnswerCount(ans: LookAnswer | undefined): number {
  return ans ? (ans.build ? 1 : 0) + (ans.face ? 1 : 0) : 0;
}
