/**
 * NGƯỜI XÔNG ĐẤT NĂM MỚI — gợi ý tuổi (Địa Chi/con giáp) phù hợp mời xông đất, cá nhân hóa theo
 * lá số gia chủ. CHỈ áp dụng cho sự kiện gắn với "năm mới" (Giao Thừa, Tết Nguyên Đán — tái dùng
 * đúng cờ `xuat_hanh_basis === 'year'` đã có ở directionGods.ts, không thêm cột DB mới vì 2 khái
 * niệm đều cùng gắn với "năm mới").
 *
 * PHƯƠNG PHÁP (dùng lại NGUYÊN VẸN các quan hệ Ngũ Hành/Địa Chi đã có sẵn và được duyệt trong
 * `compareCharts.ts` — tam hợp/lục hợp/lục xung/lục hại/tương hình + ngũ hành tương sinh/khắc —
 * KHÔNG bịa thêm bảng dân gian mới nào), áp trên tuổi (Chi năm sinh) + Mệnh ngũ hành + dụng
 * thần/kỵ thần Bát Tự của GIA CHỦ:
 *   1. Loại tuyệt đối tuổi LỤC XUNG với tuổi gia chủ — kiêng kỵ nặng nhất theo dân gian.
 *   2. Chấm 3 tiêu chí cho 12 Chi còn lại: (a) quan hệ Địa Chi với tuổi gia chủ (tam hợp/lục hợp
 *      tốt nhất), (b) quan hệ Ngũ Hành của Chi đó với Mệnh ngũ hành gia chủ, (c) Chi đó có thuộc
 *      hành dụng thần (tốt) hay kỵ thần (xấu) của gia chủ.
 *   3. Trộn 3 tiêu chí theo trọng số KHÁC NHAU cho từng mục đích (làm ăn ưu tiên dụng thần, sức
 *      khỏe ưu tiên ngũ hành sinh Mệnh, công việc ưu tiên quan hệ Địa Chi hòa hợp/quý nhân, "khác"
 *      lấy điểm cân bằng cả 3 — ưu tiên AN TOÀN hơn là điểm cao một tiêu chí).
 *
 * GIỚI HẠN CẦN NÓI RÕ VỚI NGƯỜI DÙNG: đây là gợi ý mang tính tham khảo dân gian dựa trên tương
 * hợp Chi/Mệnh với gia chủ — KHÔNG xét được vận riêng, tính cách, sức khỏe thực tế của người được
 * mời (không có lá số của họ). Không dùng làm căn cứ duy nhất cho quyết định quan trọng.
 */
import type { AstrologyResult, FiveElement, EarthlyBranch } from '../types';

const BRANCHES: EarthlyBranch[] = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tị', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
const BRANCH_ELEMENT: Record<EarthlyBranch, FiveElement> = {
  Tý: 'Thủy', Sửu: 'Thổ', Dần: 'Mộc', Mão: 'Mộc', Thìn: 'Thổ', Tị: 'Hỏa',
  Ngọ: 'Hỏa', Mùi: 'Thổ', Thân: 'Kim', Dậu: 'Kim', Tuất: 'Thổ', Hợi: 'Thủy',
};
export const ZODIAC_NAME: Record<EarthlyBranch, string> = {
  Tý: 'Chuột', Sửu: 'Trâu', Dần: 'Hổ', Mão: 'Mèo', Thìn: 'Rồng', Tị: 'Rắn',
  Ngọ: 'Ngựa', Mùi: 'Dê', Thân: 'Khỉ', Dậu: 'Gà', Tuất: 'Chó', Hợi: 'Lợn',
};

// ── Quan hệ Địa Chi — chép lại nguyên vẹn từ compareCharts.ts (không sửa file gốc). ──
type BranchRel = 'tam_hop' | 'luc_hop' | 'luc_xung' | 'luc_hai' | 'tuong_hinh' | 'neutral';
const TAM_HOP: EarthlyBranch[][] = [
  ['Dần', 'Ngọ', 'Tuất'], ['Tị', 'Dậu', 'Sửu'], ['Thân', 'Tý', 'Thìn'], ['Hợi', 'Mão', 'Mùi'],
];
const LUC_HOP: [EarthlyBranch, EarthlyBranch][] = [
  ['Tý', 'Sửu'], ['Dần', 'Hợi'], ['Mão', 'Tuất'], ['Thìn', 'Dậu'], ['Tị', 'Thân'], ['Ngọ', 'Mùi'],
];
const LUC_XUNG: [EarthlyBranch, EarthlyBranch][] = [
  ['Tý', 'Ngọ'], ['Sửu', 'Mùi'], ['Dần', 'Thân'], ['Mão', 'Dậu'], ['Thìn', 'Tuất'], ['Tị', 'Hợi'],
];
const LUC_HAI: [EarthlyBranch, EarthlyBranch][] = [
  ['Tý', 'Mùi'], ['Sửu', 'Ngọ'], ['Dần', 'Tị'], ['Mão', 'Thìn'], ['Thân', 'Hợi'], ['Dậu', 'Tuất'],
];
const TUONG_HINH: EarthlyBranch[][] = [['Dần', 'Tị', 'Thân'], ['Sửu', 'Tuất', 'Mùi']];

function branchRel(a: EarthlyBranch, b: EarthlyBranch): BranchRel {
  if (a === b) return 'neutral';
  for (const g of TAM_HOP) if (g.includes(a) && g.includes(b)) return 'tam_hop';
  for (const [x, y] of LUC_HOP) if ((a === x && b === y) || (a === y && b === x)) return 'luc_hop';
  for (const [x, y] of LUC_XUNG) if ((a === x && b === y) || (a === y && b === x)) return 'luc_xung';
  for (const [x, y] of LUC_HAI) if ((a === x && b === y) || (a === y && b === x)) return 'luc_hai';
  for (const g of TUONG_HINH) if (g.includes(a) && g.includes(b)) return 'tuong_hinh';
  return 'neutral';
}
function branchScore(a: EarthlyBranch, b: EarthlyBranch): number {
  switch (branchRel(a, b)) {
    case 'tam_hop': return 90; case 'luc_hop': return 78; case 'neutral': return 55;
    case 'tuong_hinh': return 35; case 'luc_hai': return 30; case 'luc_xung': return 10;
  }
}
function branchRelLabel(rel: BranchRel): string {
  switch (rel) {
    case 'tam_hop': return 'tam hợp';
    case 'luc_hop': return 'lục hợp';
    case 'tuong_hinh': return 'tương hình';
    case 'luc_hai': return 'lục hại';
    case 'luc_xung': return 'lục xung';
    case 'neutral': return 'trung tính';
  }
}

// ── Ngũ hành tương sinh/khắc — chép lại nguyên vẹn từ compareCharts.ts. ──
const ELEMENT_SINH: Record<FiveElement, FiveElement> = { Kim: 'Thủy', Thủy: 'Mộc', Mộc: 'Hỏa', Hỏa: 'Thổ', Thổ: 'Kim' };
const ELEMENT_KHAC: Record<FiveElement, FiveElement> = { Kim: 'Mộc', Mộc: 'Thổ', Thổ: 'Thủy', Thủy: 'Hỏa', Hỏa: 'Kim' };
type ElementRel = 'same' | 'sinh_cho_menh' | 'menh_sinh' | 'khac_menh' | 'menh_khac';
function elementRel(candidate: FiveElement, menh: FiveElement): ElementRel {
  if (candidate === menh) return 'same';
  if (ELEMENT_SINH[candidate] === menh) return 'sinh_cho_menh';
  if (ELEMENT_SINH[menh] === candidate) return 'menh_sinh';
  if (ELEMENT_KHAC[candidate] === menh) return 'khac_menh';
  return 'menh_khac';
}
function elementScore(candidate: FiveElement, menh: FiveElement): number {
  switch (elementRel(candidate, menh)) {
    case 'sinh_cho_menh': return 85; case 'same': return 65; case 'menh_sinh': return 50;
    case 'menh_khac': return 40; case 'khac_menh': return 20;
  }
}

export type XongDatPurpose = 'lam_an' | 'suc_khoe' | 'cong_viec' | 'khac';

export interface XongDatOption {
  purpose: XongDatPurpose;
  purposeLabel: string;
  branch: EarthlyBranch;
  zodiacName: string;
  element: FiveElement;
  score: number;
  reason: string;
}

const PURPOSE_LABEL: Record<XongDatPurpose, string> = {
  lam_an: '💰 Tốt cho làm ăn, tài lộc',
  suc_khoe: '🌿 Tốt cho sức khỏe',
  cong_viec: '💼 Tốt cho công việc, sự nghiệp',
  khac: '🏡 An toàn, hợp chung cho gia đạo',
};

/**
 * Gợi ý tối đa 4 tuổi xông đất (mỗi mục đích 1 tuổi phù hợp nhất), cá nhân hóa theo lá số gia
 * chủ. Trả `null` nếu chưa có lá số. Loại hẳn tuổi LỤC XUNG với tuổi gia chủ khỏi mọi gợi ý.
 */
export function suggestXongDat(result: AstrologyResult): XongDatOption[] | null {
  const ownerBranch = result.tuViChart.lunarDate.yearBranch;
  const menhEl = result.tuViChart.menhElement;
  const dungThan = result.batTuChart.favorableElements ?? [];
  const kyThan = result.batTuChart.unfavorableElements ?? [];
  if (!ownerBranch || !menhEl) return null;

  const candidates = BRANCHES
    .filter(b => branchRel(ownerBranch, b) !== 'luc_xung')
    .map(b => {
      const rel = branchRel(ownerBranch, b);
      const bEl = BRANCH_ELEMENT[b];
      const bs = branchScore(ownerBranch, b);
      const es = elementScore(bEl, menhEl);
      const dtBonus = dungThan.includes(bEl) ? 15 : kyThan.includes(bEl) ? -20 : 0;
      return { branch: b, element: bEl, rel, branchScoreVal: bs, elementScoreVal: es, dtBonus };
    });

  const reasonFor = (c: typeof candidates[number], mainSignal: string): string => {
    const parts: string[] = [`Tuổi ${c.branch} (${ZODIAC_NAME[c.branch]}), ngũ hành ${c.element}`];
    if (c.rel !== 'neutral') parts.push(`${branchRelLabel(c.rel)} với tuổi của bạn`);
    if (dungThan.includes(c.element)) parts.push(`thuộc hành dụng thần (${c.element}) của bạn`);
    else if (kyThan.includes(c.element)) parts.push(`lưu ý thuộc hành kỵ thần (${c.element}) của bạn`);
    parts.push(mainSignal);
    return parts.join(' — ') + '.';
  };

  const pick = (
    purpose: XongDatPurpose,
    weights: { branchW: number; elementW: number; dtW: number },
    mainSignal: string,
  ): XongDatOption => {
    const scored = candidates.map(c => ({
      c,
      total: c.branchScoreVal * weights.branchW + c.elementScoreVal * weights.elementW + c.dtBonus * weights.dtW,
    })).sort((a, b) => b.total - a.total);
    const best = scored[0];
    return {
      purpose, purposeLabel: PURPOSE_LABEL[purpose],
      branch: best.c.branch, zodiacName: ZODIAC_NAME[best.c.branch], element: best.c.element,
      score: Math.round(best.total),
      reason: reasonFor(best.c, mainSignal),
    };
  };

  return [
    pick('lam_an', { branchW: 0.2, elementW: 0.3, dtW: 1 }, 'ưu tiên hành hợp dụng thần giúp tài lộc hanh thông'),
    pick('suc_khoe', { branchW: 0.3, elementW: 0.6, dtW: 0.3 }, 'ngũ hành hài hòa/sinh cho Mệnh giúp tăng cường sức khỏe'),
    pick('cong_viec', { branchW: 0.6, elementW: 0.2, dtW: 0.3 }, 'quan hệ tuổi hòa hợp, dễ được quý nhân giúp đỡ trong công việc'),
    pick('khac', { branchW: 0.4, elementW: 0.4, dtW: 0.4 }, 'điểm cân bằng cả 3 yếu tố, an toàn cho gia đạo nói chung'),
  ];
}
