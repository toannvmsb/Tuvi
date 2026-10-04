/**
 * THẬP THẦN + CÁCH CỤC + QUAN HỆ CHI (xung/hợp/hình/hại/phá) cho Bát Tự.
 *
 * Đây là phần "chuyển Bát Tự sang đời sống thực tế": Thập Thần cho biết người này
 * thiên về Quan/Sát, Tài, Ấn, Thực/Thương hay Tỷ/Kiếp; cách cục cho biết "mô hình
 * vận hành cuộc đời"; xung/hợp/hình/hại/phá cho biết mức độ biến động.
 *
 * Tính thuần từ Tứ Trụ (can + tàng can) so với Nhật Chủ — không phụ thuộc dữ liệu ngoài.
 */
import type { BatTuChart, HeavenlyStem, EarthlyBranch, FiveElement } from '../types';

const STEM_ELEMENT: Record<string, FiveElement> = {
  Giáp: 'Mộc', Ất: 'Mộc', Bính: 'Hỏa', Đinh: 'Hỏa', Mậu: 'Thổ',
  Kỷ: 'Thổ', Canh: 'Kim', Tân: 'Kim', Nhâm: 'Thủy', Quý: 'Thủy',
};
const STEM_YANG: Record<string, boolean> = {
  Giáp: true, Ất: false, Bính: true, Đinh: false, Mậu: true,
  Kỷ: false, Canh: true, Tân: false, Nhâm: true, Quý: false,
};
const SHENG: Record<FiveElement, FiveElement> = { Mộc: 'Hỏa', Hỏa: 'Thổ', Thổ: 'Kim', Kim: 'Thủy', Thủy: 'Mộc' };
const KHAC: Record<FiveElement, FiveElement> = { Mộc: 'Thổ', Thổ: 'Thủy', Thủy: 'Hỏa', Hỏa: 'Kim', Kim: 'Mộc' };

export type ThapThan =
  | 'Tỷ Kiên' | 'Kiếp Tài' | 'Thực Thần' | 'Thương Quan'
  | 'Chính Tài' | 'Thiên Tài' | 'Chính Quan' | 'Thất Sát'
  | 'Chính Ấn' | 'Thiên Ấn';

export type ThapThanGroup = 'Tỷ/Kiếp' | 'Thực/Thương' | 'Tài' | 'Quan/Sát' | 'Ấn';

const GROUP_OF: Record<ThapThan, ThapThanGroup> = {
  'Tỷ Kiên': 'Tỷ/Kiếp', 'Kiếp Tài': 'Tỷ/Kiếp',
  'Thực Thần': 'Thực/Thương', 'Thương Quan': 'Thực/Thương',
  'Chính Tài': 'Tài', 'Thiên Tài': 'Tài',
  'Chính Quan': 'Quan/Sát', 'Thất Sát': 'Quan/Sát',
  'Chính Ấn': 'Ấn', 'Thiên Ấn': 'Ấn',
};

/** Thập Thần của một can `other` so với Nhật Chủ `dm`. */
export function thapThanOf(dm: HeavenlyStem, other: HeavenlyStem): ThapThan {
  const dmEl = STEM_ELEMENT[dm], otEl = STEM_ELEMENT[other];
  const samePolarity = STEM_YANG[dm] === STEM_YANG[other];
  if (dmEl === otEl) return samePolarity ? 'Tỷ Kiên' : 'Kiếp Tài';
  if (SHENG[dmEl] === otEl) return samePolarity ? 'Thực Thần' : 'Thương Quan';   // DM sinh other
  if (SHENG[otEl] === dmEl) return samePolarity ? 'Thiên Ấn' : 'Chính Ấn';       // other sinh DM
  if (KHAC[dmEl] === otEl) return samePolarity ? 'Thiên Tài' : 'Chính Tài';      // DM khắc other (Tài)
  return samePolarity ? 'Thất Sát' : 'Chính Quan';                               // other khắc DM (Quan)
}

export const THAP_THAN_MEANING: Record<ThapThan, string> = {
  'Chính Quan': 'kỷ luật, chức vụ, pháp lý, tổ chức',
  'Thất Sát': 'áp lực, cạnh tranh, quyền lực, hành động mạnh',
  'Chính Tài': 'tiền ổn định, quản lý tài sản, thu nhập đều',
  'Thiên Tài': 'kinh doanh, đầu tư, cơ hội ngoài lương',
  'Chính Ấn': 'học vấn, bằng cấp, sự bảo trợ',
  'Thiên Ấn': 'trực giác, nghiên cứu, chuyên môn đặc biệt',
  'Thực Thần': 'sáng tạo, hưởng thụ, tạo sản phẩm',
  'Thương Quan': 'biểu đạt, phá cách, marketing, phản biện',
  'Tỷ Kiên': 'bản lĩnh, độc lập, cạnh tranh ngang hàng',
  'Kiếp Tài': 'bạn bè, đội nhóm, chia sẻ/giành tài nguyên',
};

export const GROUP_CAREER: Record<ThapThanGroup, string> = {
  'Quan/Sát': 'quản lý, tổ chức, luật lệ, môi trường áp lực/cạnh tranh',
  'Tài': 'kinh doanh, tài chính, thương mại, quản trị tài sản',
  'Ấn': 'học thuật, nghiên cứu, tư vấn, chuyên môn sâu',
  'Thực/Thương': 'sáng tạo, sản phẩm, nội dung, bán hàng, marketing',
  'Tỷ/Kiếp': 'tự chủ, khởi nghiệp, xây đội nhóm (cần quản trị cạnh tranh)',
};

export interface ThapThanTally {
  counts: Record<ThapThan, number>;
  groupScore: Record<ThapThanGroup, number>;
  topGroups: ThapThanGroup[];      // nhóm nổi bật (mạnh → yếu)
  cachCuc: string;                 // cách cục chính
  cachCucNote: string;             // tổ hợp đặc biệt (Thực Thương sinh Tài...)
  details: string[];               // mô tả từng trụ
}

const PILLAR_WEIGHT = [1, 2, 1, 1]; // Năm, THÁNG (đề cương ×2), Ngày, Giờ

/** Tính phân bố Thập Thần toàn cục + cách cục. */
export function computeThapThan(b: BatTuChart): ThapThanTally {
  const dm = b.dayMaster;
  const counts = {
    'Tỷ Kiên': 0, 'Kiếp Tài': 0, 'Thực Thần': 0, 'Thương Quan': 0,
    'Chính Tài': 0, 'Thiên Tài': 0, 'Chính Quan': 0, 'Thất Sát': 0,
    'Chính Ấn': 0, 'Thiên Ấn': 0,
  } as Record<ThapThan, number>;
  const details: string[] = [];

  b.pillars.forEach((p, i) => {
    const w = PILLAR_WEIGHT[i] ?? 1;
    const parts: string[] = [];
    // Thiên can (trừ trụ Ngày = Nhật Chủ, bản thân)
    if (i !== 2) {
      const tt = thapThanOf(dm, p.stem);
      counts[tt] += w;
      parts.push(`can ${p.stem}=${tt}`);
    } else {
      parts.push(`can ${p.stem}=Nhật Chủ`);
    }
    // Tàng can trong địa chi (trọng số nhẹ hơn)
    for (const hs of p.hiddenStems) {
      const tt = thapThanOf(dm, hs);
      counts[tt] += w * 0.5;
      parts.push(`${hs}=${tt}`);
    }
    details.push(`${p.label} (${p.stem} ${p.branch}): ${parts.join(', ')}`);
  });

  const groupScore = { 'Tỷ/Kiếp': 0, 'Thực/Thương': 0, 'Tài': 0, 'Quan/Sát': 0, 'Ấn': 0 } as Record<ThapThanGroup, number>;
  (Object.keys(counts) as ThapThan[]).forEach(k => { groupScore[GROUP_OF[k]] += counts[k]; });

  const topGroups = (Object.keys(groupScore) as ThapThanGroup[])
    .filter(g => groupScore[g] > 0)
    .sort((a, b2) => groupScore[b2] - groupScore[a]);

  // Cách cục chính = nhóm mạnh nhất (ngoài Tỷ/Kiếp nếu có nhóm khác đáng kể).
  const CACH_NAME: Record<ThapThanGroup, string> = {
    'Quan/Sát': 'Quan Sát cách', 'Tài': 'Tài cách', 'Ấn': 'Ấn cách',
    'Thực/Thương': 'Thực Thương cách', 'Tỷ/Kiếp': 'Tỷ Kiếp cách (vượng thân, thiên tự chủ)',
  };
  let main = topGroups[0] ?? 'Tỷ/Kiếp';
  if (main === 'Tỷ/Kiếp' && topGroups[1]) main = topGroups[1];
  const cachCuc = CACH_NAME[main];

  // Tổ hợp đặc biệt.
  const strong = (g: ThapThanGroup) => groupScore[g] >= 1.5;
  const notes: string[] = [];
  if (strong('Thực/Thương') && strong('Tài')) notes.push('Thực Thương sinh Tài — hợp tạo sản phẩm rồi bán/kinh doanh');
  if (strong('Quan/Sát') && strong('Ấn')) notes.push('Sát Ấn tương sinh — hợp kết hợp quyền lực + chuyên môn');
  if (strong('Tài') && strong('Quan/Sát')) notes.push('Tài Quan tương sinh — hợp quản trị tài chính/doanh nghiệp, có chức vụ');
  const cachCucNote = notes.join('; ');

  return { counts, groupScore, topGroups, cachCuc, cachCucNote, details };
}

// ─────────────────────────── QUAN HỆ CHI ───────────────────────────
export const BR: EarthlyBranch[] = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tị', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];

export const LUC_HOP: [EarthlyBranch, EarthlyBranch, string][] = [
  ['Tý', 'Sửu', 'Thổ'], ['Dần', 'Hợi', 'Mộc'], ['Mão', 'Tuất', 'Hỏa'],
  ['Thìn', 'Dậu', 'Kim'], ['Tị', 'Thân', 'Thủy'], ['Ngọ', 'Mùi', 'Thổ'],
];
export const LUC_XUNG: [EarthlyBranch, EarthlyBranch][] = [
  ['Tý', 'Ngọ'], ['Sửu', 'Mùi'], ['Dần', 'Thân'], ['Mão', 'Dậu'], ['Thìn', 'Tuất'], ['Tị', 'Hợi'],
];
export const LUC_HAI: [EarthlyBranch, EarthlyBranch][] = [
  ['Tý', 'Mùi'], ['Sửu', 'Ngọ'], ['Dần', 'Tị'], ['Mão', 'Thìn'], ['Thân', 'Hợi'], ['Dậu', 'Tuất'],
];
export const LUC_PHA: [EarthlyBranch, EarthlyBranch][] = [
  ['Tý', 'Dậu'], ['Ngọ', 'Mão'], ['Thân', 'Tị'], ['Dần', 'Hợi'], ['Thìn', 'Sửu'], ['Tuất', 'Mùi'],
];
export const TAM_HOP: [EarthlyBranch[], string][] = [
  [['Thân', 'Tý', 'Thìn'], 'Thủy'], [['Dần', 'Ngọ', 'Tuất'], 'Hỏa'],
  [['Tị', 'Dậu', 'Sửu'], 'Kim'], [['Hợi', 'Mão', 'Mùi'], 'Mộc'],
];
const TAM_HOI: [EarthlyBranch[], string][] = [
  [['Dần', 'Mão', 'Thìn'], 'Mộc (Đông)'], [['Tị', 'Ngọ', 'Mùi'], 'Hỏa (Nam)'],
  [['Thân', 'Dậu', 'Tuất'], 'Kim (Tây)'], [['Hợi', 'Tý', 'Sửu'], 'Thủy (Bắc)'],
];
export const HINH_TRIPLE: [EarthlyBranch[], string][] = [
  [['Dần', 'Tị', 'Thân'], 'vô ân chi hình'], [['Sửu', 'Tuất', 'Mùi'], 'trì thế chi hình'],
];
export const HINH_PAIR: [EarthlyBranch, EarthlyBranch, string][] = [
  ['Tý', 'Mão', 'vô lễ chi hình'],
];
export const TU_HINH: EarthlyBranch[] = ['Thìn', 'Ngọ', 'Dậu', 'Hợi']; // tự hình khi trùng

const CAN_HOP: [HeavenlyStem, HeavenlyStem, string][] = [
  ['Giáp', 'Kỷ', 'Thổ'], ['Ất', 'Canh', 'Kim'], ['Bính', 'Tân', 'Thủy'], ['Đinh', 'Nhâm', 'Mộc'], ['Mậu', 'Quý', 'Hỏa'],
];
const CAN_XUNG: [HeavenlyStem, HeavenlyStem][] = [
  ['Giáp', 'Canh'], ['Ất', 'Tân'], ['Bính', 'Nhâm'], ['Đinh', 'Quý'],
];

export interface ChiRelations {
  canHop: string[]; canXung: string[];
  lucHop: string[]; lucXung: string[]; lucHai: string[]; lucPha: string[];
  tamHop: string[]; tamHoi: string[]; hinh: string[];
  bienDong: 'thấp' | 'trung bình' | 'cao'; // mức biến động tổng
}

/** Phát hiện quan hệ can/chi giữa 4 trụ. */
export function computeChiRelations(b: BatTuChart): ChiRelations {
  const branches = b.pillars.map(p => p.branch);
  const stems = b.pillars.map(p => p.stem);
  const labels = b.pillars.map(p => p.label);
  const has = (arr: string[], x: string) => arr.includes(x);
  const idxOf = (x: EarthlyBranch) => branches.indexOf(x);
  const lbl = (x: EarthlyBranch) => labels[idxOf(x)];

  const canHop: string[] = [], canXung: string[] = [];
  for (const [a, c, el] of CAN_HOP) if (has(stems, a) && has(stems, c)) canHop.push(`${a}–${c} hợp hóa ${el}`);
  for (const [a, c] of CAN_XUNG) if (has(stems, a) && has(stems, c)) canXung.push(`${a}–${c} tương xung`);

  const pairTxt = (a: EarthlyBranch, c: EarthlyBranch) => `${a}(${lbl(a)})–${c}(${lbl(c)})`;
  const lucHop: string[] = [], lucXung: string[] = [], lucHai: string[] = [], lucPha: string[] = [];
  for (const [a, c, el] of LUC_HOP) if (has(branches, a) && has(branches, c)) lucHop.push(`${pairTxt(a, c)} lục hợp (hóa ${el})`);
  for (const [a, c] of LUC_XUNG) if (has(branches, a) && has(branches, c)) lucXung.push(`${pairTxt(a, c)} lục xung`);
  for (const [a, c] of LUC_HAI) if (has(branches, a) && has(branches, c)) lucHai.push(`${pairTxt(a, c)} tương hại`);
  for (const [a, c] of LUC_PHA) if (has(branches, a) && has(branches, c)) lucPha.push(`${pairTxt(a, c)} tương phá`);

  const tamHop: string[] = [], tamHoi: string[] = [];
  for (const [grp, el] of TAM_HOP) {
    const present = grp.filter(x => has(branches, x));
    if (present.length === 3) tamHop.push(`${grp.join('-')} tam hợp (cục ${el})`);
    else if (present.length === 2) tamHop.push(`${present.join('-')} bán tam hợp (${el})`);
  }
  for (const [grp, el] of TAM_HOI) {
    const present = grp.filter(x => has(branches, x));
    if (present.length === 3) tamHoi.push(`${grp.join('-')} tam hội ${el}`);
  }

  const hinh: string[] = [];
  for (const [grp, name] of HINH_TRIPLE) {
    const present = grp.filter(x => has(branches, x));
    if (present.length >= 2) hinh.push(`${present.join('-')} ${name}`);
  }
  for (const [a, c, name] of HINH_PAIR) if (has(branches, a) && has(branches, c)) hinh.push(`${a}-${c} ${name}`);
  for (const tb of TU_HINH) if (branches.filter(x => x === tb).length >= 2) hinh.push(`${tb}-${tb} tự hình`);

  const heavy = lucXung.length + hinh.length + lucHai.length + lucPha.length + canXung.length;
  const bienDong = heavy >= 3 ? 'cao' : heavy >= 1 ? 'trung bình' : 'thấp';

  return { canHop, canXung, lucHop, lucXung, lucHai, lucPha, tamHop, tamHoi, hinh, bienDong };
}

/** Hỷ thần (hỗ trợ dụng thần) = hành SINH RA dụng thần chính. */
export function hyThanOf(dungThan: FiveElement[]): FiveElement | null {
  const primary = dungThan[0];
  if (!primary) return null;
  const gen = (Object.keys(SHENG) as FiveElement[]).find(e => SHENG[e] === primary);
  return gen ?? null;
}

/** Bản NÂNG CAO (offline) — markdown có diễn giải, hiển thị cho người dùng. */
export function batTuThapThanMarkdown(b: BatTuChart): string {
  const tt = computeThapThan(b);
  const rel = computeChiRelations(b);
  const out: string[] = [];

  out.push('# Thập Thần & Cách cục');
  out.push('_Thập Thần chuyển Bát Tự thành đời sống thực tế: cho biết bạn thiên về quản trị, kinh doanh, chuyên môn hay sáng tạo._');
  const topTT = (Object.entries(tt.counts) as [ThapThan, number][])
    .filter(([, v]) => v > 0).sort((a, c) => c[1] - a[1]).slice(0, 5);
  for (const [k, v] of topTT) out.push(`- **${k}** (${String(v).replace('.0', '')}): ${THAP_THAN_MEANING[k]}.`);
  out.push('');
  out.push(`▸ **Nhóm nổi bật:** ${tt.topGroups.join(' > ') || '—'}.`);
  out.push(`▸ **Cách cục chính:** ${tt.cachCuc}.`);
  if (tt.cachCucNote) out.push(`▸ **Tổ hợp đặc biệt:** ${tt.cachCucNote}.`);
  const mainGroup = tt.topGroups[0];
  if (mainGroup) out.push(`▸ **Con đường nên đi:** thiên về ${GROUP_CAREER[mainGroup]}.`);
  out.push('');

  out.push('# Biến động cuộc đời (xung – hợp – hình – hại – phá)');
  const lines = [
    rel.canHop.length ? `- **Can hợp:** ${rel.canHop.join('; ')} — dễ kết duyên/hợp tác về các hành tương ứng.` : '',
    rel.canXung.length ? `- **Can xung:** ${rel.canXung.join('; ')} — nội tâm dễ giằng co, cần dứt khoát.` : '',
    rel.tamHop.length ? `- **Tam hợp:** ${rel.tamHop.join('; ')} — có lực hội tụ, hợp làm việc nhóm/dài hạn.` : '',
    rel.tamHoi.length ? `- **Tam hội:** ${rel.tamHoi.join('; ')} — một hành rất vượng, định hình rõ chất người.` : '',
    rel.lucHop.length ? `- **Lục hợp:** ${rel.lucHop.join('; ')} — quan hệ gắn kết, dễ thỏa hiệp.` : '',
    rel.lucXung.length ? `- **Lục xung:** ${rel.lucXung.join('; ')} — dễ thay đổi (việc/nơi ở), cần quản trị quyết định lớn.` : '',
    rel.hinh.length ? `- **Hình:** ${rel.hinh.join('; ')} — dễ vướng thị phi/áp lực nội tâm, giữ kỷ luật và pháp lý rõ ràng.` : '',
    rel.lucHai.length ? `- **Hại:** ${rel.lucHai.join('; ')} — đề phòng tiểu nhân, hiểu lầm trong quan hệ.` : '',
    rel.lucPha.length ? `- **Phá:** ${rel.lucPha.join('; ')} — dễ dang dở giữa chừng, nên làm chắc từng bước.` : '',
  ].filter(Boolean);
  if (lines.length) {
    out.push(`▸ Mức biến động tổng: **${rel.bienDong}**.`);
    out.push(...lines);
    out.push('_Mệnh nhiều xung-hình thường hợp môi trường biến đổi, nhưng cần thận trọng với quyết định lớn và hành động nóng._');
  } else {
    out.push('▸ Bốn trụ KHÔNG có xung/hợp/hình/hại/phá đáng kể — mệnh thiên về **ổn định**, ít xáo trộn lớn.');
  }
  return out.join('\n');
}

/** Tóm tắt Thập Thần + quan hệ chi thành text cho prompt AI / hiển thị. */
export function summarizeBatTuAdvanced(b: BatTuChart): string {
  const tt = computeThapThan(b);
  const rel = computeChiRelations(b);
  const topTT = (Object.entries(tt.counts) as [ThapThan, number][])
    .filter(([, v]) => v > 0).sort((a, c) => c[1] - a[1]).slice(0, 4)
    .map(([k, v]) => `${k} (${v}) — ${THAP_THAN_MEANING[k]}`);
  const relLines = [
    rel.canHop.length ? `Can hợp: ${rel.canHop.join('; ')}` : '',
    rel.canXung.length ? `Can xung: ${rel.canXung.join('; ')}` : '',
    rel.tamHop.length ? `Tam hợp: ${rel.tamHop.join('; ')}` : '',
    rel.tamHoi.length ? `Tam hội: ${rel.tamHoi.join('; ')}` : '',
    rel.lucHop.length ? `Lục hợp: ${rel.lucHop.join('; ')}` : '',
    rel.lucXung.length ? `Lục xung: ${rel.lucXung.join('; ')}` : '',
    rel.hinh.length ? `Hình: ${rel.hinh.join('; ')}` : '',
    rel.lucHai.length ? `Hại: ${rel.lucHai.join('; ')}` : '',
    rel.lucPha.length ? `Phá: ${rel.lucPha.join('; ')}` : '',
  ].filter(Boolean);

  return [
    '★ THẬP THẦN (so với Nhật Chủ ' + b.dayMaster + '):',
    ...tt.details.map(d => '  - ' + d),
    `→ Nhóm nổi bật: ${tt.topGroups.map(g => `${g} (${tt.groupScore[g].toFixed(1).replace('.0', '')})`).join(' > ') || '—'}.`,
    `→ Cách cục: ${tt.cachCuc}${tt.cachCucNote ? ` · ${tt.cachCucNote}` : ''}.`,
    'Thập Thần nổi bật & ý nghĩa: ' + (topTT.join(' | ') || '—'),
    '',
    `★ QUAN HỆ CAN–CHI (mức biến động: ${rel.bienDong}):`,
    ...(relLines.length ? relLines.map(l => '  - ' + l) : ['  - Không có xung/hợp/hình/hại/phá đáng kể giữa 4 trụ.']),
  ].join('\n');
}
