/**
 * So sánh hai lá số — phân tích 12 tầng offline (Pro) + dữ liệu cho AI.
 */
import type { AstrologyResult, FiveElement, EarthlyBranch } from '../types';
import { currentAgeOf } from './ageUtil';

// ─── NGŨ HÀNH ────────────────────────────────────────────────────────────────

const ELEMENT_SINH: Record<FiveElement, FiveElement> = {
  Kim: 'Thủy', Thủy: 'Mộc', Mộc: 'Hỏa', Hỏa: 'Thổ', Thổ: 'Kim',
};
const ELEMENT_KHAC: Record<FiveElement, FiveElement> = {
  Kim: 'Mộc', Mộc: 'Thổ', Thổ: 'Thủy', Thủy: 'Hỏa', Hỏa: 'Kim',
};

// ─── THIÊN CAN ────────────────────────────────────────────────────────────────

const STEM_ELEMENT: Record<string, FiveElement> = {
  Giáp: 'Mộc', Ất: 'Mộc', Bính: 'Hỏa', Đinh: 'Hỏa',
  Mậu: 'Thổ', Kỷ: 'Thổ', Canh: 'Kim', Tân: 'Kim',
  Nhâm: 'Thủy', Quý: 'Thủy',
};
const CAN_HOP: [string, string][] = [
  ['Giáp', 'Kỷ'], ['Ất', 'Canh'], ['Bính', 'Tân'], ['Đinh', 'Nhâm'], ['Mậu', 'Quý'],
];

function canScore(stemA: string, stemB: string): number {
  for (const [x, y] of CAN_HOP) {
    if ((stemA === x && stemB === y) || (stemA === y && stemB === x)) return 88;
  }
  const elA = STEM_ELEMENT[stemA];
  const elB = STEM_ELEMENT[stemB];
  if (!elA || !elB) return 55;
  return elScore(elA, elB);
}

function canLabel(stemA: string, stemB: string): string {
  for (const [x, y] of CAN_HOP) {
    if ((stemA === x && stemB === y) || (stemA === y && stemB === x))
      return `Can hợp ${stemA}–${stemB} — tương hỗ tự nhiên`;
  }
  const elA = STEM_ELEMENT[stemA];
  const elB = STEM_ELEMENT[stemB];
  if (!elA || !elB) return `${stemA}–${stemB} (trung tính)`;
  return `${stemA}(${elA})–${stemB}(${elB}) — ${elRelLabel(elA, elB)}`;
}

type ElementRel = 'same' | 'sinh' | 'bi_sinh' | 'khac' | 'bi_khac';

function elementRel(a: FiveElement, b: FiveElement): ElementRel {
  if (a === b) return 'same';
  if (ELEMENT_SINH[a] === b) return 'sinh';
  if (ELEMENT_SINH[b] === a) return 'bi_sinh';
  if (ELEMENT_KHAC[a] === b) return 'khac';
  return 'bi_khac';
}

function elScore(a: FiveElement, b: FiveElement): number {
  switch (elementRel(a, b)) {
    case 'same': return 60; case 'bi_sinh': return 82; case 'sinh': return 72;
    case 'bi_khac': return 28; case 'khac': return 35;
  }
}

function elRelLabel(a: FiveElement, b: FiveElement): string {
  switch (elementRel(a, b)) {
    case 'same':    return 'đồng hành (cùng hành)';
    case 'bi_sinh': return 'tương sinh — bổ trợ lẫn nhau';
    case 'sinh':    return 'tương sinh — hỗ trợ đối phương';
    case 'khac':    return 'tương khắc — áp chế đối phương';
    case 'bi_khac': return 'tương khắc — bị đối phương áp chế';
  }
}

// ─── ĐỊA CHI ─────────────────────────────────────────────────────────────────

type BranchRel = 'tam_hop' | 'luc_hop' | 'luc_xung' | 'luc_hai' | 'tuong_hinh' | 'neutral';

const TAM_HOP: EarthlyBranch[][] = [
  ['Dần', 'Ngọ', 'Tuất'], ['Tị', 'Dậu', 'Sửu'],
  ['Thân', 'Tý', 'Thìn'], ['Hợi', 'Mão', 'Mùi'],
];
const LUC_HOP: [EarthlyBranch, EarthlyBranch][] = [
  ['Tý', 'Sửu'], ['Dần', 'Hợi'], ['Mão', 'Tuất'],
  ['Thìn', 'Dậu'], ['Tị', 'Thân'], ['Ngọ', 'Mùi'],
];
const LUC_XUNG: [EarthlyBranch, EarthlyBranch][] = [
  ['Tý', 'Ngọ'], ['Sửu', 'Mùi'], ['Dần', 'Thân'],
  ['Mão', 'Dậu'], ['Thìn', 'Tuất'], ['Tị', 'Hợi'],
];
const LUC_HAI: [EarthlyBranch, EarthlyBranch][] = [
  ['Tý', 'Mùi'], ['Sửu', 'Ngọ'], ['Dần', 'Tị'],
  ['Mão', 'Thìn'], ['Thân', 'Hợi'], ['Dậu', 'Tuất'],
];
const TUONG_HINH: EarthlyBranch[][] = [
  ['Dần', 'Tị', 'Thân'], ['Sửu', 'Tuất', 'Mùi'],
];

function branchRel(a: EarthlyBranch, b: EarthlyBranch): BranchRel {
  for (const g of TAM_HOP) { if (g.includes(a) && g.includes(b) && a !== b) return 'tam_hop'; }
  for (const [x, y] of LUC_HOP) { if ((a === x && b === y) || (a === y && b === x)) return 'luc_hop'; }
  for (const [x, y] of LUC_XUNG) { if ((a === x && b === y) || (a === y && b === x)) return 'luc_xung'; }
  for (const [x, y] of LUC_HAI) { if ((a === x && b === y) || (a === y && b === x)) return 'luc_hai'; }
  for (const g of TUONG_HINH) { if (g.includes(a) && g.includes(b) && a !== b) return 'tuong_hinh'; }
  return 'neutral';
}

function brScore(a: EarthlyBranch, b: EarthlyBranch): number {
  switch (branchRel(a, b)) {
    case 'tam_hop': return 90; case 'luc_hop': return 75; case 'neutral': return 55;
    case 'tuong_hinh': return 35; case 'luc_hai': return 30; case 'luc_xung': return 15;
  }
}

function brLabel(a: EarthlyBranch, b: EarthlyBranch): string {
  switch (branchRel(a, b)) {
    case 'tam_hop':    return `Tam hợp — ${a} hội ${b}, thiên duyên đã định`;
    case 'luc_hop':    return `Lục hợp — ${a}–${b}, dễ hòa hợp tự nhiên`;
    case 'neutral':    return `Trung tính — không xung không hợp đặc biệt`;
    case 'tuong_hinh': return `Tương hình — ${a}–${b}, dễ va chạm tính cách`;
    case 'luc_hai':    return `Lục hại — ${a}–${b}, có thể vô tình cản trở nhau`;
    case 'luc_xung':   return `Lục xung — ${a}–${b}, dễ xung đột quan điểm`;
  }
}

// ─── NẠP ÂM ──────────────────────────────────────────────────────────────────

function napAmElement(napAm: string): FiveElement | null {
  for (const el of ['Kim', 'Mộc', 'Thủy', 'Hỏa', 'Thổ'] as FiveElement[]) {
    if (napAm.includes(el)) return el;
  }
  return null;
}

function napAmScore(a: AstrologyResult, b: AstrologyResult): number {
  const elA = napAmElement(a.tuViChart.napAmMenh);
  const elB = napAmElement(b.tuViChart.napAmMenh);
  if (!elA || !elB) return 55;
  return elScore(elA, elB);
}

// ─── PERSONALITY GROUPS ───────────────────────────────────────────────────────

const PG: Record<string, number> = {
  'Tử Vi': 1, 'Thất Sát': 1,
  'Vũ Khúc': 2, 'Thiên Phủ': 2, 'Tham Lang': 2,
  'Thiên Cơ': 3, 'Thái Dương': 3, 'Thiên Đồng': 3, 'Thiên Lương': 3, 'Văn Khúc': 3,
  'Thái Âm': 4, 'Thiên Tướng': 4,
  'Liêm Trinh': 5, 'Phá Quân': 5,
  'Cự Môn': 6, 'Hỏa Tinh': 2,
};
const PC = [
  [65, 80, 75, 65, 50, 45],
  [80, 70, 85, 75, 50, 50],
  [75, 85, 85, 80, 60, 65],
  [65, 75, 80, 72, 50, 50],
  [50, 50, 60, 50, 42, 40],
  [45, 50, 65, 50, 40, 40],
];
// Vô chính diệu: linh hoạt và dễ thích nghi với đối phương
const VCD_COMPAT = [65, 72, 75, 68, 55, 58];

function persScore(sA: string, sB: string): number {
  const gA = PG[sA];
  const gB = PG[sB];
  if (gA === undefined && gB === undefined) return 55;
  if (gA === undefined) return VCD_COMPAT[(gB ?? 3) - 1];
  if (gB === undefined) return VCD_COMPAT[(gA ?? 3) - 1];
  return PC[gA - 1][gB - 1];
}

// ─── BÁT TỰ ──────────────────────────────────────────────────────────────────

function batTuScore(a: AstrologyResult, b: AstrologyResult): number {
  const aEl = a.batTuChart.dayMasterElement;
  const bEl = b.batTuChart.dayMasterElement;
  let s = 50;
  if (b.batTuChart.favorableElements.includes(aEl)) s += 15;
  if (a.batTuChart.favorableElements.includes(bEl)) s += 15;
  if (b.batTuChart.unfavorableElements.includes(aEl)) s -= 12;
  if (a.batTuChart.unfavorableElements.includes(bEl)) s -= 12;
  const r = elementRel(aEl, bEl);
  if (r === 'sinh' || r === 'bi_sinh') s += 4;
  if (r === 'khac' || r === 'bi_khac') s -= 4;
  return Math.max(0, Math.min(100, s));
}

// ─── PALACE STARS ────────────────────────────────────────────────────────────

function palace(r: AstrologyResult, name: string) {
  return r.tuViChart.houses.find(h => h.palaceName === name);
}

function palaceStarScore(r: AstrologyResult, name: string): number {
  const p = palace(r, name);
  if (!p) return 50;
  const cat = p.stars.filter(s => s.type === 'cat').length;
  const hung = p.stars.filter(s => s.type === 'hung').length;
  const chinh = p.stars.filter(s => s.type === 'chinh').length;
  return Math.max(0, Math.min(100, 50 + chinh * 8 + cat * 7 - hung * 9));
}

function palaceStarNames(r: AstrologyResult, name: string): string {
  const p = palace(r, name);
  if (!p || !p.stars.length) return 'không có sao chính';
  return p.stars.map(s => s.name).join(', ');
}

function crossAvg(a: AstrologyResult, b: AstrologyResult, pa: string, pb: string): number {
  return (palaceStarScore(a, pa) + palaceStarScore(b, pb)) / 2;
}

// ─── CROSS-PALACE & HÓA TINH ─────────────────────────────────────────────────

function loveCompatScore(a: AstrologyResult, b: AstrologyResult): number {
  return (
    (palaceStarScore(a, 'Phu Thê') + palaceStarScore(b, 'Mệnh')) / 2 * 0.5 +
    (palaceStarScore(b, 'Phu Thê') + palaceStarScore(a, 'Mệnh')) / 2 * 0.5
  );
}

function businessCompatScore(a: AstrologyResult, b: AstrologyResult): number {
  return (
    (palaceStarScore(a, 'Tài Bạch') + palaceStarScore(b, 'Quan Lộc')) / 2 * 0.5 +
    (palaceStarScore(a, 'Quan Lộc') + palaceStarScore(b, 'Tài Bạch')) / 2 * 0.5
  );
}

function hoaTinhBusinessScore(r: AstrologyResult): number {
  let score = 50;
  for (const pName of ['Tài Bạch', 'Quan Lộc']) {
    const p = palace(r, pName);
    if (!p) continue;
    for (const s of p.stars) {
      if (s.name === 'Hóa Lộc' || s.name === 'Hóa Quyền') score += 8;
      else if (s.name === 'Hóa Khoa') score += 4;
      else if (s.name === 'Hóa Kỵ') score -= 10;
    }
  }
  return Math.max(0, Math.min(100, score));
}

// ─── PERSONALITY TEXT ─────────────────────────────────────────────────────────

const MENH_CHU_DESC: Record<string, { trait: string; love: string; work: string }> = {
  'Tham Lang': {
    trait: 'đa tài, nhiều đam mê, giỏi giao tiếp và có sức hút với người xung quanh. Thích học điều mới, không ngại thay đổi',
    love: 'đa cảm và lãng mạn, cần người đồng hành mang lại điều mới mẻ và không bao giờ nhàm chán',
    work: 'phát huy tốt ở môi trường đa dạng, liên quan đến giao tiếp, nghệ thuật hoặc kinh doanh linh hoạt',
  },
  'Cự Môn': {
    trait: 'khẩu tài vượt trội, nhạy cảm, hay phân tích và đặt câu hỏi. Đôi khi đa nghi nhưng rất tinh tế trong đánh giá người',
    love: 'thận trọng khi mở lòng, nhưng khi đã tin tưởng thì yêu rất sâu đậm và trung thành tuyệt đối',
    work: 'phù hợp với ngôn ngữ, giáo dục, báo chí, luật — những ngành cần tư duy phân tích và diễn đạt sắc sảo',
  },
  'Liêm Trinh': {
    trait: 'trọng nguyên tắc và đạo lý, kỷ luật cao, ý chí mạnh. Thẳng thắn đôi khi đến mức cứng nhắc',
    love: 'yêu thật lòng và đòi hỏi sự chung thủy tuyệt đối. Không tha thứ dễ dàng khi bị phản bội',
    work: 'phù hợp với quản lý, pháp lý, tổ chức — cần người có nguyên tắc và trách nhiệm rõ ràng',
  },
  'Văn Khúc': {
    trait: 'tài hoa và giàu cảm xúc, thiên về nghệ thuật, âm nhạc và văn chương. Nhạy cảm và lãng mạn',
    love: 'cần sự tinh tế và thấu hiểu cảm xúc. Dễ tổn thương nhưng cũng rất chung thủy khi đã gắn bó',
    work: 'tỏa sáng trong lĩnh vực sáng tạo, truyền thông, giảng dạy — nơi cần sự tinh tế và tài năng biểu đạt',
  },
  'Thiên Đồng': {
    trait: 'hiền lành, hòa nhã, yêu cuộc sống bình yên và có tâm hồn đẹp. Thích giúp đỡ và chia sẻ với người khác',
    love: 'chung thủy và biết quan tâm, yêu chậm nhưng bền. Cần người đồng hành ổn định, không ưa biến động',
    work: 'phù hợp với y tế, giáo dục, phúc lợi xã hội — những ngành mang lại ý nghĩa và giá trị cho cộng đồng',
  },
  'Phá Quân': {
    trait: 'dũng cảm, quyết liệt và không ngại thay đổi. Thích đột phá, vượt giới hạn và tạo ra điều mới',
    love: 'mãnh liệt và đôi khi khó đoán. Cần người đủ mạnh để song hành và không bị cuốn theo sự biến động',
    work: 'phù hợp với kinh doanh, khởi nghiệp, môi trường cạnh tranh — nơi cần sự quyết đoán và can đảm',
  },
};

const ELEMENT_DESC: Record<FiveElement, { trait: string; work: string; love: string }> = {
  Kim: {
    trait: 'Ngũ hành Kim mang lại tính cách quyết đoán, trọng nghĩa, cứng rắn và trực tiếp. Đáng tin cậy nhưng đôi khi thiếu linh hoạt',
    work: 'Làm việc có phương pháp, đòi hỏi cao về chất lượng và hiệu quả. Phù hợp với vai trò lãnh đạo hoặc chuyên môn kỹ thuật',
    love: 'Trong tình cảm trọng nghĩa trọng tình, không ưa sự vòng vo. Khi yêu là yêu thật, nhưng khó tha thứ khi bị tổn thương',
  },
  Mộc: {
    trait: 'Ngũ hành Mộc mang lại tính nhân từ, sáng tạo và thích tự do. Đề cao lý tưởng và giá trị hơn vật chất',
    work: 'Giỏi khởi đầu và lên ý tưởng. Phù hợp với nghề giáo dục, nghiên cứu, y tế và các lĩnh vực có mục đích xã hội',
    love: 'Lý tưởng hóa tình yêu, cần người đồng điệu về tư duy và giá trị sống. Trung thành và sâu sắc trong cảm xúc',
  },
  Thủy: {
    trait: 'Ngũ hành Thủy mang lại sự linh hoạt, thích nghi và nhạy cảm. Giỏi đọc cảm xúc và kết nối với người khác',
    work: 'Tài năng giao tiếp và networking. Phù hợp với kinh doanh, truyền thông, ngoại giao và các lĩnh vực cần sự biến đổi linh hoạt',
    love: 'Nhạy cảm và sâu sắc trong tình cảm. Cần được cảm thông và lắng nghe. Dễ bị tổn thương nhưng cũng rất bao dung',
  },
  Hỏa: {
    trait: 'Ngũ hành Hỏa mang lại nhiệt huyết, hào phóng và trực tiếp. Đầy sức sống và truyền cảm hứng cho người xung quanh',
    work: 'Nhanh nhẹn, nhiều sáng kiến, thích hành động ngay. Phù hợp với sales, marketing, nghệ thuật biểu diễn và lãnh đạo truyền cảm hứng',
    love: 'Yêu mãnh liệt và trực tiếp, không giỏi che giấu cảm xúc. Cần người có thể theo kịp nhịp sống năng động',
  },
  Thổ: {
    trait: 'Ngũ hành Thổ mang lại sự bền bỉ, thực tế và đáng tin cậy. Kiên nhẫn, ổn định và là chỗ dựa vững chắc',
    work: 'Làm việc chăm chỉ và kiên trì. Phù hợp với quản lý tài chính, bất động sản, nông nghiệp và các lĩnh vực cần sự ổn định lâu dài',
    love: 'Chung thủy và kiên định trong tình cảm. Yêu chậm nhưng bền, không ưa sự thay đổi đột ngột trong quan hệ',
  },
};

function personProfile(r: AstrologyResult, name: string): string {
  const c = r.tuViChart;
  const b = r.batTuChart;
  const menhStar = c.menhChu;
  const menhEl = c.menhElement;
  const dayEl = b.dayMasterElement;
  const mDesc = MENH_CHU_DESC[menhStar] ?? MENH_CHU_DESC['Thiên Đồng'];
  const eDesc = ELEMENT_DESC[menhEl];
  const dDesc = ELEMENT_DESC[dayEl];
  const menhStars = palaceStarNames(r, 'Mệnh');
  const thanChu = c.thanChu;

  return `**Mệnh chủ: ${menhStar} · Ngũ hành Mệnh: ${menhEl} · Nhật chủ Bát Tự: ${b.dayMaster}(${dayEl})**

${name} là người ${mDesc.trait}.

${eDesc.trait}. Trong tình cảm, ${mDesc.love.toLowerCase()}.

**Phong cách làm việc:** ${dDesc.work}. ${mDesc.work}.

**Cung Mệnh** (${c.menhCung}) có sao: ${menhStars}. Cung Thân tại ${c.thanCung} — Thân chủ **${thanChu}**.

**Dụng thần Bát Tự** (hành hỗ trợ): ${b.favorableElements.join(', ')} · Kỵ thần: ${b.unfavorableElements.join(', ')} — cho thấy môi trường, con người và màu sắc mang hành ${b.favorableElements[0] ?? menhEl} sẽ mang lại nhiều thuận lợi hơn.

Nạp âm Mệnh: **${c.napAmMenh}** · Cục số: ${c.cucName}.`;
}

// ─── TIMING ANALYSIS ─────────────────────────────────────────────────────────

const CURRENT_YEAR = 2026;

function currentDaiVan(r: AstrologyResult) {
  const age = currentAgeOf(r, new Date(CURRENT_YEAR, 0, 1));
  return r.daiVans.find(dv => dv.startAge <= age && dv.endAge >= age) ?? r.daiVans[0];
}

function tieuVanForYear(r: AstrologyResult, year: number) {
  return r.tieuVans.find(tv => tv.year === year);
}

function timingText(r: AstrologyResult, name: string): string {
  const dv = currentDaiVan(r);
  const tv26 = tieuVanForYear(r, 2026);
  const tv27 = tieuVanForYear(r, 2027);
  const tv28 = tieuVanForYear(r, 2028);
  const dvLabel = dv ? `${dv.stem}${dv.branch} (${dv.startAge}–${dv.endAge} tuổi, hành ${dv.element})` : 'chưa rõ';

  let text = `**${name}** — Đại vận hiện tại: **${dvLabel}**`;
  if (dv) {
    text += `\nĐiểm tài lộc đại vận: ${dv.wealthScore}/10. Cung đại vận tương ứng với hành ${dv.element}.`;
  }
  if (tv26) text += `\n- **2026** (Tiểu vận ${tv26.stem}${tv26.branch} · cung ${tv26.branch}): năm của sự ${tv26.element === 'Hỏa' ? 'bứt phá và hành động' : tv26.element === 'Thủy' ? 'linh hoạt và thích nghi' : tv26.element === 'Mộc' ? 'phát triển và học hỏi' : tv26.element === 'Kim' ? 'cứng rắn và quyết đoán' : 'ổn định và tích lũy'}.`;
  if (tv27) text += `\n- **2027** (Tiểu vận ${tv27.stem}${tv27.branch} · cung ${tv27.branch}): hành ${tv27.element} — ${tv27.element === 'Hỏa' || tv27.element === 'Mộc' ? 'thuận cho phát triển và mở rộng' : 'cần thận trọng trong quyết định lớn'}.`;
  if (tv28) text += `\n- **2028** (Tiểu vận ${tv28.stem}${tv28.branch} · cung ${tv28.branch}): ${tv28.element === 'Kim' || tv28.element === 'Thổ' ? 'ổn định, phù hợp gây dựng nền tảng' : 'động, cơ hội và rủi ro đều cao hơn'}.`;
  if (!tv26 && !tv27) text += '\n_(Dữ liệu tiểu vận chưa đủ cho giai đoạn 3 năm tới.)_';

  return text;
}

// ─── 12-LAYER GENERATION ─────────────────────────────────────────────────────

export interface AnalysisLayer {
  title: string;
  icon: string;
  content: string; // markdown
}

function scoreLabel(s: number): string {
  return s >= 85 ? 'Rất tốt' : s >= 70 ? 'Khá tốt' : s >= 55 ? 'Trung bình' : s >= 40 ? 'Cần điều chỉnh' : 'Nhiều thách thức';
}

function buildLayers(
  a: AstrologyResult,
  b: AstrologyResult,
  sc: { overall: number; love: number; marriage: number; business: number; friendship: number; conflict_risk: number },
  strengths: string[],
  risks: string[],
  br: BranchRel,
  elRel: ElementRel,
  btSc: number,
  perSc: number,
  roles: { strategy: string; finance: string; external: string; operations: string },
): AnalysisLayer[] {
  const aName = a.birthInfo.name || 'Người A';
  const bName = b.birthInfo.name || 'Người B';
  const aC = a.tuViChart;
  const bC = b.tuViChart;

  const bestRel = Object.entries({ love: sc.love, marriage: sc.marriage, business: sc.business, friendship: sc.friendship })
    .sort((x, y) => y[1] - x[1])[0];
  const bestRelLabel = { love: 'tình yêu', marriage: 'hôn nhân', business: 'hợp tác làm ăn', friendship: 'bạn bè/đồng hành' }[bestRel[0]] ?? 'đồng hành';

  const overallLabel = sc.overall >= 80 ? 'rất tương hợp' : sc.overall >= 65 ? 'khá hòa hợp' : sc.overall >= 50 ? 'tương đối hợp' : 'cần nhiều điều chỉnh';

  // L1
  const l1: AnalysisLayer = {
    title: 'Kết luận nhanh', icon: '⚡',
    content: `**${aName}** và **${bName}** có mức độ tương hợp tổng thể **${sc.overall}/100** — ${overallLabel}.

Trong 4 khía cạnh phân tích, cặp này **hợp nhất ở lĩnh vực ${bestRelLabel}** (${bestRel[1]}/100). Mức rủi ro xung đột: ${sc.conflict_risk}/100 — ${sc.conflict_risk >= 65 ? 'cần lưu ý kỹ' : sc.conflict_risk >= 45 ? 'ở mức trung bình' : 'thấp, có thể quản lý tốt'}.

**Điểm mạnh cốt lõi:** ${strengths[0] ?? 'Hai người có thể bổ trợ nhau nếu hiểu rõ vai trò'}

**Rủi ro lớn nhất:** ${risks[0] ?? 'Cần thời gian để thực sự hiểu nhau'}

${sc.overall >= 75
  ? `Đây là cặp đôi có nền tảng khá vững. Nếu cả hai hiểu rõ điểm mạnh và điểm cần điều chỉnh, mối quan hệ này có thể phát triển lâu bền và bổ trợ tốt cho nhau.`
  : sc.overall >= 55
  ? `Mối quan hệ này có tiềm năng nhưng cần cả hai nỗ lực. Sự khác biệt giữa hai người không phải rào cản — chính điểm bổ sung cho nhau sẽ là sức mạnh nếu biết khai thác.`
  : `Mối quan hệ này đòi hỏi nỗ lực và hiểu biết sâu từ cả hai phía. Điều quan trọng là tìm cách dung hòa thay vì cố thay đổi đối phương.`}`,
  };

  // L2
  const l2: AnalysisLayer = {
    title: 'Bảng điểm tương hợp', icon: '📊',
    content: `| Khía cạnh | Điểm | Đánh giá |
|-----------|------|----------|
| **Tổng hợp** | **${sc.overall}/100** | ${scoreLabel(sc.overall)} |
| Tình yêu | ${sc.love}/100 | ${scoreLabel(sc.love)} |
| Hôn nhân | ${sc.marriage}/100 | ${scoreLabel(sc.marriage)} |
| Làm ăn/hợp tác | ${sc.business}/100 | ${scoreLabel(sc.business)} |
| Bạn bè/đồng hành | ${sc.friendship}/100 | ${scoreLabel(sc.friendship)} |
| Rủi ro xung đột | ${sc.conflict_risk}/100 | ${sc.conflict_risk < 40 ? 'Thấp ✅' : sc.conflict_risk < 65 ? 'Trung bình ⚠️' : 'Cao ❗'} |

**Ngũ hành Mệnh:** ${aC.menhElement} & ${bC.menhElement} — ${elRelLabel(aC.menhElement, bC.menhElement)}
**Thiên can năm sinh:** ${canLabel(aC.lunarDate.yearStem, bC.lunarDate.yearStem)}
**Nạp âm Mệnh:** ${aC.napAmMenh} & ${bC.napAmMenh}
**Địa chi năm sinh:** ${brLabel(aC.lunarDate.yearBranch, bC.lunarDate.yearBranch)}
**Bát Tự tương hỗ:** ${btSc}/100 · **Tính cách tương hợp:** ${perSc}/100

${sc.overall >= 70 ? '✅ Tổng thể tích cực — cả hai có cơ sở để xây dựng quan hệ vững chắc.' : sc.overall >= 50 ? '⚠️ Có tiềm năng nhưng cần điều chỉnh — tập trung vào lĩnh vực hợp nhất và quản lý lĩnh vực yếu.' : '❗ Cần nhiều nỗ lực — nên tìm hiểu kỹ trước khi đưa ra quyết định lớn.'}`,
  };

  // L3
  const l3: AnalysisLayer = {
    title: `Chân dung ${aName} trong quan hệ này`, icon: '👤',
    content: personProfile(a, aName) + `\n\n**Điểm mạnh khi ở cạnh ${bName}:** ${
      elScore(aC.menhElement, bC.menhElement) >= 70
        ? `Ngũ hành ${aC.menhElement} của ${aName} và ${bC.menhElement} của ${bName} tương hỗ tốt — ${aName} sẽ thấy được hỗ trợ và bổ năng lượng.`
        : `${aName} có thể mang đến sự ổn định và điểm tựa cho ${bName} trong những lúc khó khăn.`
    }

**Điểm ${aName} dễ gây áp lực cho ${bName}:** ${
      perSc < 55 ? `Phong cách và nhịp sống của hai người khác biệt khá rõ — ${aName} nên chú ý không áp đặt cách tiếp cận của mình lên ${bName}.` : `Khi ${aName} quá tập trung vào bản thân, ${bName} có thể cảm thấy không được chú ý đủ.`
    }`,
  };

  // L4
  const l4: AnalysisLayer = {
    title: `Chân dung ${bName} trong quan hệ này`, icon: '👤',
    content: personProfile(b, bName) + `\n\n**Điểm mạnh khi ở cạnh ${aName}:** ${
      elScore(bC.menhElement, aC.menhElement) >= 70
        ? `Ngũ hành ${bC.menhElement} của ${bName} tương hỗ với ${aC.menhElement} của ${aName} — ${bName} sẽ thấy được hỗ trợ khi có ${aName} bên cạnh.`
        : `${bName} có thể mang lại góc nhìn mới và sự bổ sung cần thiết cho ${aName}.`
    }

**Điểm ${bName} dễ gây áp lực cho ${aName}:** ${
      perSc < 55 ? `Phong cách phản ứng của ${bName} đôi khi có thể khiến ${aName} khó hiểu hoặc cảm thấy bị phán xét.` : `Khi ${bName} có xu hướng thủ thế hoặc không rõ ràng trong giao tiếp, ${aName} dễ sinh hiểu lầm.`
    }`,
  };

  // L5
  const l5: AnalysisLayer = {
    title: 'Hai người hút nhau vì điều gì', icon: '🧲',
    content: `${strengths.length > 0 ? strengths.map(s => `- ${s}`).join('\n') : '- Hai người có điểm bổ sung tiềm ẩn cần thời gian để nhận ra'}

**Phân tích sức hút:**

${elScore(aC.menhElement, bC.menhElement) >= 70
  ? `**Ngũ hành tương sinh:** ${aC.menhElement} và ${bC.menhElement} hỗ trợ lẫn nhau — khi ở cạnh nhau, hai người thường cảm thấy được tiếp thêm năng lượng và được hiểu đúng hơn.`
  : `**Ngũ hành:** Dù ${aC.menhElement} và ${bC.menhElement} không hỗ trợ trực tiếp, sự khác biệt này đôi khi lại tạo ra sức hút "khác biệt thu hút".`}

${br === 'tam_hop' ? `**Địa chi tam hợp:** Năm sinh của hai người hợp nhau theo tam hợp cục ${aC.lunarDate.yearBranch}–${bC.lunarDate.yearBranch} — đây là dấu hiệu của duyên tiền định, hai người dễ cảm thấy "đã quen nhau từ lâu" ngay lần đầu gặp.` :
 br === 'luc_hop' ? `**Lục hợp:** Hai người dễ tự nhiên hòa hợp trong giao tiếp và tư duy, không cần cố gắng nhiều để hiểu nhau.` :
 `**Sức hút từ sự khác biệt:** Hai người có phong cách và cách nhìn nhận vấn đề khác nhau — điều này tạo ra sự tò mò và muốn khám phá nhau hơn.`}

${btSc >= 68 ? `**Bát Tự:** Ngũ hành nhật chủ của hai người bổ trợ nhau tốt — khi ở cạnh nhau, cả hai đều có xu hướng phát huy điểm mạnh và kiềm chế điểm yếu của bản thân.` : ''}

${perSc >= 70 ? `**Tính cách:** Mệnh chủ của hai người thuộc nhóm tương hợp — dễ đồng điệu trong cách tiếp cận cuộc sống, chia sẻ quan điểm và giá trị cốt lõi.` : ''}`,
  };

  // L6
  const l6: AnalysisLayer = {
    title: 'Hai người dễ xung ở đâu', icon: '⚡',
    content: `${risks.length > 0 ? risks.map(r => `- ${r}`).join('\n') : '- Không có dấu hiệu xung đột nghiêm trọng nổi bật'}

**Phân tích điểm dễ xung:**

${br === 'luc_xung' ? `**Địa chi lục xung (${aC.lunarDate.yearBranch}–${bC.lunarDate.yearBranch}):** Đây là điểm cần lưu ý nhất. Hai người có xu hướng xung đột quan điểm, cách tiếp cận và giá trị sống. Cần rèn kỹ năng lắng nghe và tôn trọng sự khác biệt.` :
 br === 'luc_hai' ? `**Địa chi lục hại:** Hai người có thể vô tình cản trở lẫn nhau ngay cả khi có ý tốt. Cần thẳng thắn về ý định để tránh hiểu nhầm.` :
 br === 'tuong_hinh' ? `**Tương hình:** Hai người dễ va chạm về cái tôi và quyền quyết định. Cần phân vai rõ ràng để tránh tranh giành vô ích.` :
 `**Nhìn chung không có xung địa chi nghiêm trọng** — xung đột nếu có chủ yếu xuất phát từ sự khác biệt tính cách và thói quen hàng ngày.`}

${elScore(aC.menhElement, bC.menhElement) < 45 ? `**Ngũ hành tương khắc (${aC.menhElement}–${bC.menhElement}):** Hai người dễ vô tình gây áp lực cho nhau ngay cả trong lúc không muốn. Áp lực thường xuất hiện ở quyết định lớn: tài chính, kế hoạch tương lai, cách dạy con.` : ''}

${btSc < 45 ? `**Bát Tự không tương hợp:** Ngũ hành ngày sinh của hai người có khả năng kích hoạt điểm yếu của nhau — một người mang hành kỵ thần của người kia. Biểu hiện thực tế: dễ làm nhau mất tập trung, tăng lo âu hoặc kéo vận xuống khi ở gần nhau quá lâu trong thời điểm vận kém.` : ''}

${perSc < 50 ? `**Khác biệt tính cách:** Mệnh chủ ${aC.menhChu} và ${bC.menhChu} thuộc nhóm tính cách ít tương đồng — có thể thường xuyên không hiểu cách nhau phản ứng, dễ cảm thấy bị phán xét hoặc không được tôn trọng.` : ''}

**Cách hóa giải chung:** Thiết lập quy tắc giao tiếp rõ ràng, phân định ranh giới công việc và cảm xúc, và tránh đưa ra quyết định quan trọng khi đang có xung đột chưa được giải quyết.`,
  };

  // L7 Love
  const phuTheSc = crossAvg(a, b, 'Phu Thê', 'Phu Thê');
  const l7: AnalysisLayer = {
    title: 'Nếu yêu nhau', icon: '❤️',
    content: `**Mức độ hợp yêu nhau: ${sc.love}/100** — ${scoreLabel(sc.love)}

**Cung Phu Thê:**
- ${aName} (cung Phu Thê ${palace(a, 'Phu Thê')?.branch ?? '?'}): ${palaceStarNames(a, 'Phu Thê')}
- ${bName} (cung Phu Thê ${palace(b, 'Phu Thê')?.branch ?? '?'}): ${palaceStarNames(b, 'Phu Thê')}

**Sức hút và kiểu yêu:**
${sc.love >= 75 ? `Hai người có sự hòa hợp tình cảm tự nhiên. ${aName} và ${bName} dễ cảm thấy được hiểu và được chấp nhận khi ở cạnh nhau — đây là nền tảng quan trọng cho một mối tình bền vững.` :
 sc.love >= 55 ? `Tình cảm giữa hai người cần thời gian để phát triển. Ban đầu có thể có những hiểu lầm nhỏ, nhưng nếu kiên nhẫn tìm hiểu, cả hai sẽ khám phá được điểm đồng điệu sâu hơn.` :
 `Mối quan hệ tình cảm này đòi hỏi nỗ lực nhiều hơn từ cả hai phía. Hãy trung thực về kỳ vọng từ sớm để tránh thất vọng về sau.`}

**Ai có xu hướng yêu sâu hơn?**
${aC.menhChu === 'Thái Âm' || aC.menhChu === 'Thiên Đồng' || aC.menhChu === 'Văn Khúc' ? `${aName} (Mệnh chủ ${aC.menhChu}) thường có xu hướng yêu sâu hơn và cảm xúc hóa nhiều hơn trong quan hệ.` :
 bC.menhChu === 'Thái Âm' || bC.menhChu === 'Thiên Đồng' || bC.menhChu === 'Văn Khúc' ? `${bName} (Mệnh chủ ${bC.menhChu}) có xu hướng gắn bó cảm xúc sâu hơn và dễ tổn thương hơn trong tình yêu.` :
 `Cả hai đều có bản năng tự bảo vệ khá mạnh — người nào mở lòng trước sẽ có phần dễ bị tổn thương hơn.`}

**Xung đột tình cảm thường gặp:**
${elScore(aC.menhElement, bC.menhElement) < 50 ? `Do ngũ hành tương khắc, hai người dễ có phong cách thể hiện tình yêu rất khác nhau — một người cần lời nói, người kia cần hành động thực tế.` : `Xung đột thường xuất phát từ kỳ vọng không được nói ra và cách biểu đạt tình yêu khác nhau.`}

**Lời khuyên:** ${sc.love >= 68 ? 'Hãy nói rõ kỳ vọng và nhu cầu của mình ngay từ sớm. Đừng để sự ngại ngùng tạo ra khoảng cách không đáng có.' : 'Hãy tìm hiểu "ngôn ngữ tình yêu" của đối phương — cách họ muốn được yêu thương và thể hiện yêu thương. Tránh tranh luận khi cả hai đang nóng.'}`,
  };

  // L8 Marriage
  const dienTrachSc = crossAvg(a, b, 'Điền Trạch', 'Điền Trạch');
  const phucDucSc = crossAvg(a, b, 'Phúc Đức', 'Phúc Đức');
  const tuTucSc = crossAvg(a, b, 'Tử Tức', 'Tử Tức');
  const l8: AnalysisLayer = {
    title: 'Nếu lấy nhau', icon: '💍',
    content: `**Mức độ hợp sống chung: ${sc.marriage}/100** — ${scoreLabel(sc.marriage)}

**Cung Phúc Đức:** ${aName}: ${palaceStarNames(a, 'Phúc Đức')} · ${bName}: ${palaceStarNames(b, 'Phúc Đức')}
**Cung Tử Tức (con cái):** ${aName}: ${palaceStarNames(a, 'Tử Tức')} · ${bName}: ${palaceStarNames(b, 'Tử Tức')}
**Cung Điền Trạch (nhà ở):** ${aName}: ${palaceStarNames(a, 'Điền Trạch')} · ${bName}: ${palaceStarNames(b, 'Điền Trạch')}

**Khả năng sống chung:**
${sc.marriage >= 72 ? `Hai người có khả năng sống chung khá tốt. Phúc Đức và Điền Trạch của cả hai đều cho tín hiệu tích cực về gia đạo và nơi ở.` :
 sc.marriage >= 55 ? `Sống chung sẽ cần giai đoạn thích nghi. Hai người có cách quản lý không gian sống và thời gian cá nhân khác nhau — cần thỏa thuận rõ ràng từ sớm.` :
 `Trước khi tiến tới hôn nhân, nên có thời gian dài tìm hiểu thực tế về cách sống và thói quen của nhau. Những điểm nhỏ trong cuộc sống hàng ngày đôi khi tạo ra ma sát lớn hơn dự kiến.`}

**Tài chính gia đình:**
${a.batTuChart.dayMasterElement === 'Kim' || a.batTuChart.dayMasterElement === 'Thổ' ? `${aName} (nhật chủ ${a.batTuChart.dayMasterElement}) phù hợp quản lý tài chính gia đình — thực tế và bền vững.` : `${bName} (nhật chủ ${b.batTuChart.dayMasterElement}) có xu hướng ổn định hơn về tài chính, nên cân nhắc để ${bName} giữ ngân sách chính.`}

**Gia đạo và con cái:**
${(phucDucSc >= 65 || tuTucSc >= 65) ? `Cung Phúc Đức và Tử Tức đều cho tín hiệu thuận — con cái thường mang lại niềm vui và kết nối sâu hơn cho gia đình này.` : `Cần đầu tư nhiều thời gian và năng lượng để xây dựng môi trường gia đình tích cực, đặc biệt trong những năm đầu.`}

**Gia đình hai bên:**
${sc.conflict_risk >= 65 ? `Sự khác biệt giữa hai gia đình có thể trở thành nguồn gây áp lực. Cần thỏa thuận rõ về ranh giới giữa gia đình gốc và gia đình mới từ sớm.` : `Hai gia đình có khả năng hòa hợp tốt nếu có sự tôn trọng và giao tiếp thường xuyên.`}

**Lời khuyên:** ${sc.marriage >= 65 ? 'Hãy xây dựng "nguyên tắc gia đình" rõ ràng từ trước khi cưới — về tài chính, không gian riêng, gia đình hai bên và nuôi dạy con. Đừng để những điều tưởng hiển nhiên trở thành nguồn gây xung đột sau này.' : 'Nên trải qua các giai đoạn thực tế cùng nhau (ở gần, đi du lịch dài ngày, xử lý tình huống khó) trước khi quyết định kết hôn. Hôn nhân tốt cần nền tảng, không chỉ cảm xúc.'}`,
  };

  // L9 Business
  const taiBachSc = crossAvg(a, b, 'Tài Bạch', 'Tài Bạch');
  const quanLocSc = crossAvg(a, b, 'Quan Lộc', 'Quan Lộc');
  const noBocSc = crossAvg(a, b, 'Nô Bộc', 'Nô Bộc');
  const hoaTinhNames = (r: AstrologyResult) => ['Hóa Lộc', 'Hóa Quyền', 'Hóa Khoa', 'Hóa Kỵ'].filter(s =>
    palace(r, 'Tài Bạch')?.stars.some(st => st.name === s) ||
    palace(r, 'Quan Lộc')?.stars.some(st => st.name === s)
  ).join(', ') || 'không có';
  const l9: AnalysisLayer = {
    title: 'Nếu làm ăn/hợp tác', icon: '💼',
    content: `**Mức độ hợp làm ăn: ${sc.business}/100** — ${scoreLabel(sc.business)}

**Cung Tài Bạch:** ${aName}: ${palaceStarNames(a, 'Tài Bạch')} · ${bName}: ${palaceStarNames(b, 'Tài Bạch')}
**Cung Quan Lộc:** ${aName}: ${palaceStarNames(a, 'Quan Lộc')} · ${bName}: ${palaceStarNames(b, 'Quan Lộc')}
**Cung Nô Bộc:** ${aName}: ${palaceStarNames(a, 'Nô Bộc')} · ${bName}: ${palaceStarNames(b, 'Nô Bộc')}
**Hóa tinh (Tài Bạch/Quan Lộc):** ${aName}: ${hoaTinhNames(a)} · ${bName}: ${hoaTinhNames(b)}

**Đánh giá khả năng hợp tác:**
${sc.business >= 75 ? `Hai người có tiềm năng hợp tác kinh doanh rõ rệt. Phân tích so cung chéo (Tài Bạch A ↔ Quan Lộc B) cho tín hiệu bổ trợ lẫn nhau tốt. Nếu phân vai rõ ràng và có thỏa thuận văn bản từ đầu, đây là một cặp đối tác tiềm năng.` :
 sc.business >= 58 ? `Hợp tác được, nhưng cần cơ cấu rõ ràng. Không nên để "nghĩa tình" che khuất thực tế kinh doanh.` :
 `Thận trọng khi góp vốn sâu. Nên bắt đầu bằng hợp tác dự án nhỏ để kiểm tra khả năng phối hợp trước.`}

**Phân vai khuyến nghị:**
| Vai trò | Người phù hợp |
|---------|--------------|
| Chiến lược & tầm nhìn | ${roles.strategy} |
| Tài chính & kiểm soát chi phí | ${roles.finance} |
| Đối ngoại & bán hàng | ${roles.external} |
| Vận hành & thực thi | ${roles.operations} |

**Mô hình hợp tác phù hợp:**
${sc.business >= 75 ? 'Có thể góp vốn ngang bằng hoặc theo tỷ lệ thỏa thuận — tiềm năng bền vững nếu phân quyền rõ.' :
 sc.business >= 58 ? 'Nên bắt đầu bằng mô hình "một người chính, một người hỗ trợ" — giảm rủi ro tranh quyền trong giai đoạn đầu.' :
 'Hợp tác dự án cụ thể hoặc tư vấn lẫn nhau — không nên góp vốn trực tiếp vào giai đoạn đầu.'}

**Rủi ro kinh doanh cần lưu ý:**
- ${sc.conflict_risk >= 60 ? `Tranh chấp quyền quyết định — cả hai đều có chính kiến mạnh, dễ dẫn đến bế tắc` : `Phong cách làm việc khác nhau đôi khi gây hiểu nhầm về tiến độ và ưu tiên`}
- Tránh để tình cảm cá nhân ảnh hưởng quyết định tài chính
- Cần điều khoản rõ ràng về trường hợp muốn rút lui

**Lời khuyên:** Ký thỏa thuận hợp tác chi tiết từ trước khi bắt đầu — bao gồm phân chia lợi nhuận, trách nhiệm, và điều khoản thoát khi cần.`,
  };

  // L10 Friendship
  const l10: AnalysisLayer = {
    title: 'Nếu làm bạn/đồng hành', icon: '🤝',
    content: `**Mức độ hợp bạn bè: ${sc.friendship}/100** — ${scoreLabel(sc.friendship)}

**Cung Nô Bộc:** ${aName}: ${palaceStarNames(a, 'Nô Bộc')} · ${bName}: ${palaceStarNames(b, 'Nô Bộc')}

**Khả năng gắn bó:**
${sc.friendship >= 75 ? `Hai người có khả năng làm bạn rất tốt — dễ tìm thấy điểm chung, thoải mái khi ở cạnh nhau và có thể xây dựng tình bạn bền lâu. Cung Nô Bộc của cả hai đều hỗ trợ cho quan hệ này.` :
 sc.friendship >= 58 ? `Tình bạn ở mức ổn — không quá khó để kết nối nhưng cũng không tự nhiên đặc biệt. Cần điểm chung về sở thích hoặc mục tiêu để tình bạn phát triển sâu hơn.` :
 `Quan hệ này hợp nhất khi giữ ở mức xã giao hay đồng nghiệp hơn là bạn thân sâu. Không phải ai cũng cần làm bạn thân — đôi khi quan hệ tốt nhất là "người quen tốt bụng".`}

${perSc >= 70 ? `**Điểm đồng điệu:** Tính cách Mệnh chủ tương đồng giúp hai người dễ hiểu cách nhau suy nghĩ và phản ứng — nền tảng của một tình bạn thực sự.` : `**Điểm khác biệt:** Hai người có cách tiếp cận và phản ứng khác nhau — điều này không phải rào cản, nhưng cần chủ động tìm điểm chung để kết nối.`}

**Ranh giới cần giữ:**
- ${sc.conflict_risk >= 55 ? 'Tránh dính líu tài chính — kể cả vay mượn nhỏ cũng có thể trở thành nguồn căng thẳng' : 'Hạn chế chia sẻ quá nhiều thông tin cá nhân nhạy cảm trong giai đoạn đầu'}
- Tôn trọng không gian riêng của nhau — không phải lúc nào cũng cần phải có mặt cho nhau
- ${br === 'luc_xung' || br === 'luc_hai' ? 'Tránh tranh luận về quan điểm sống và giá trị — đây là vùng dễ xung đột nhất của hai người' : 'Duy trì ranh giới rõ ràng nếu có người thứ ba hoặc cảm xúc phức tạp xuất hiện'}

**Có nên thân sâu không?** ${sc.friendship >= 70 ? `Có — tình bạn này có tiềm năng trở thành mối quan hệ đồng hành lâu dài và ý nghĩa.` : `Thận trọng — nên để tình bạn phát triển tự nhiên theo thời gian thay vì cố thúc đẩy nhanh.`}`,
  };

  // L11 Timing
  const l11: AnalysisLayer = {
    title: 'Thời vận hiện tại và 3 năm tới', icon: '🕐',
    content: `**Phân tích dựa trên Đại Vận và Tiểu Vận ${CURRENT_YEAR}–${CURRENT_YEAR + 2}**

${timingText(a, aName)}

---

${timingText(b, bName)}

---

**Thời điểm thuận cho từng loại quan hệ:**
- **Tình yêu/Hôn nhân:** ${(tieuVanForYear(a, CURRENT_YEAR)?.element === 'Hỏa' || tieuVanForYear(b, CURRENT_YEAR)?.element === 'Hỏa') ? `Năm ${CURRENT_YEAR} có Hỏa khí — thời điểm khá thuận cho việc phát triển tình cảm` : `Nên chú ý giai đoạn có hành Hỏa hoặc Mộc trong tiểu vận của cả hai để tiến thêm một bước`}.
- **Hợp tác kinh doanh:** ${(tieuVanForYear(a, CURRENT_YEAR + 1)?.element === 'Mộc' || tieuVanForYear(b, CURRENT_YEAR + 1)?.element === 'Mộc') ? `Năm ${CURRENT_YEAR + 1} có Mộc khí — thuận cho mở rộng và phát triển dự án chung` : `Thời điểm Kim hoặc Thổ trong tiểu vận phù hợp hơn cho việc ký kết và gây dựng hợp tác`}.
- **Thận trọng:** Tránh đưa ra quyết định lớn (kết hôn, góp vốn, mua bất động sản chung) khi cả hai đều đang ở tiểu vận xung hoặc hành kỵ thần.

_Lưu ý: Phân tích thời vận mang tính định hướng. Độ chính xác phụ thuộc vào dữ liệu giờ sinh đầy đủ của cả hai người._`,
  };

  // L12 Advice
  const l12: AnalysisLayer = {
    title: 'Lời khuyên cá nhân hóa', icon: '💡',
    content: `**Lời khuyên theo từng bối cảnh:**

${sc.love >= 55 ? `**Nếu yêu nhau:**
- Xác định rõ "ngôn ngữ tình yêu" của đối phương và thực hành nó mỗi ngày
- Nói chuyện thẳng thắn về kỳ vọng hơn là để đối phương đoán mò
- ${sc.love >= 70 ? 'Đây là mối tình có tiềm năng — hãy đầu tư thời gian và sự chú ý đúng mức' : 'Yêu nhau cần điều chỉnh và học hỏi — hãy kiên nhẫn với sự khác biệt'}` :
 `**Về tình cảm:**
- Hãy tìm hiểu kỹ thêm trước khi phát triển tình cảm — không phải mọi sự thu hút đều dẫn đến quan hệ bền vững
- Nên trải qua các tình huống thực tế cùng nhau trước khi quyết định`}

${sc.marriage >= 55 ? `**Nếu tiến tới hôn nhân:**
- Thảo luận thẳng thắn về tài chính, kế hoạch sống và nuôi dạy con trước khi cưới
- ${dienTrachSc < 55 ? 'Đặc biệt chú ý thỏa thuận về nơi ở và chia sẻ không gian — đây là điểm dễ phát sinh xung đột' : 'Điền trạch của cả hai có dấu hiệu tốt — nền tảng gia đình có khả năng ổn định'}
- Kết nối gia đình hai bên sớm để tránh áp lực từ bên ngoài sau khi cưới` : ''}

${sc.business >= 55 ? `**Nếu hợp tác kinh doanh:**
- Ký thỏa thuận văn bản chi tiết TRƯỚC khi bắt đầu — bao gồm phân chia lợi nhuận, quyết định và điều khoản thoát
- Phân công vai trò theo điểm mạnh: ${aName} phụ trách ${roles.strategy === aName ? 'chiến lược' : roles.finance === aName ? 'tài chính' : 'đối ngoại'}, ${bName} phụ trách ${roles.strategy === bName ? 'chiến lược' : roles.finance === bName ? 'tài chính' : 'đối ngoại'}
- Không để tình cảm cá nhân (nếu có) ảnh hưởng đến quyết định kinh doanh` : ''}

**Nếu làm bạn:**
- ${sc.friendship >= 68 ? 'Tình bạn này đáng đầu tư — hãy duy trì liên lạc và tìm hoạt động chung phù hợp' : 'Giữ ở mức bạn bè thoải mái — không cần phải ép thành bạn thân nếu không tự nhiên'}
- ${br === 'luc_xung' || br === 'luc_hai' ? 'Tránh tranh luận về quan điểm sống và tiền bạc — đây là vùng nhạy cảm nhất của hai người' : 'Tôn trọng không gian riêng và ranh giới cá nhân của nhau'}

---

**Một lời khuyên quan trọng nhất cho cặp này:**

${sc.overall >= 72
  ? `_"Hai người có nền tảng tốt để xây dựng bất kỳ loại quan hệ nào — điều duy nhất cần làm là nói thẳng và nghe thật, thay vì đoán mò hoặc giả định."_`
  : sc.overall >= 55
  ? `_"Mối quan hệ tốt nhất không phải là mối quan hệ không có xung đột — mà là mối quan hệ mà cả hai biết cách vượt qua xung đột một cách trưởng thành."_`
  : `_"Hãy tôn trọng thực tế hơn là kỳ vọng. Quan hệ tốt nhất đôi khi không phải là quan hệ sâu nhất — đôi khi, biết giữ khoảng cách phù hợp mới là khôn ngoan."_`}`,
  };

  return [l1, l2, l3, l4, l5, l6, l7, l8, l9, l10, l11, l12];
}

// ─── MAIN EXPORTS ─────────────────────────────────────────────────────────────

export interface CompareScore {
  overall: number;
  love: number;
  marriage: number;
  business: number;
  friendship: number;
  conflict_risk: number;
}

export interface CompareResult {
  scores: CompareScore;
  element_label: string;
  branch_label: string;
  can_chi_label: string;
  napam_label: string;
  strength_signals: string[];
  risk_signals: string[];
  advice: Record<'love' | 'marriage' | 'business' | 'friendship', { label: string; tips: string[] }>;
  business_roles: { strategy: string; finance: string; external: string; operations: string };
  layers: AnalysisLayer[];
}

export function compareCharts(a: AstrologyResult, b: AstrologyResult): CompareResult {
  const aC = a.tuViChart;
  const bC = b.tuViChart;

  // Ngũ hành: Mệnh + Bát Tự nhật chủ + Nạp âm
  const elMenh  = elScore(aC.menhElement, bC.menhElement);
  const elBt    = elScore(a.batTuChart.dayMasterElement, b.batTuChart.dayMasterElement);
  const napSc   = napAmScore(a, b);
  const elAvg   = elMenh * 0.40 + elBt * 0.35 + napSc * 0.25;

  // Địa chi + Thiên can năm sinh
  const brYear  = brScore(aC.lunarDate.yearBranch, bC.lunarDate.yearBranch);
  const brMenh  = brScore(aC.menhCung, bC.menhCung);
  const canSc   = canScore(aC.lunarDate.yearStem, bC.lunarDate.yearStem);
  const brAvg   = brYear * 0.55 + brMenh * 0.30 + canSc * 0.15;

  const btSc    = batTuScore(a, b);
  const perSc   = persScore(aC.menhChu, bC.menhChu);

  // Cross-palace (Phu Thê A ↔ Mệnh B; Tài Bạch A ↔ Quan Lộc B)
  const phuTheCross = loveCompatScore(a, b);
  const phucDucAvg  = crossAvg(a, b, 'Phúc Đức', 'Phúc Đức');
  const dienTrach   = crossAvg(a, b, 'Điền Trạch', 'Điền Trạch');
  const tuTucAvg    = crossAvg(a, b, 'Tử Tức', 'Tử Tức');
  const bizCross    = businessCompatScore(a, b);
  const noBocAvg    = crossAvg(a, b, 'Nô Bộc', 'Nô Bộc');
  const hoaTinhSc   = (hoaTinhBusinessScore(a) + hoaTinhBusinessScore(b)) / 2;

  const love       = Math.round(phuTheCross*0.28 + elAvg*0.18 + brAvg*0.17 + btSc*0.22 + perSc*0.15);
  const marriage   = Math.round(phuTheCross*0.20 + phucDucAvg*0.12 + dienTrach*0.09 + tuTucAvg*0.07 + elAvg*0.17 + btSc*0.20 + perSc*0.15);
  const business   = Math.round(bizCross*0.22 + noBocAvg*0.14 + hoaTinhSc*0.10 + btSc*0.24 + perSc*0.15 + elAvg*0.15);
  const friendship = Math.round(noBocAvg*0.22 + perSc*0.25 + elAvg*0.22 + brAvg*0.16 + btSc*0.15);
  const overall    = Math.round((love + marriage + business + friendship) / 4);

  const brRel = branchRel(aC.lunarDate.yearBranch, bC.lunarDate.yearBranch);
  const elRel = elementRel(aC.menhElement, bC.menhElement);
  let conflictBase = 100 - overall;
  if (brRel === 'luc_xung') conflictBase += 15;
  if (brRel === 'luc_hai') conflictBase += 8;
  if (elRel === 'khac' || elRel === 'bi_khac') conflictBase += 10;
  if (btSc < 40) conflictBase += 8;
  if (canSc < 40) conflictBase += 5;
  const conflict_risk = Math.max(0, Math.min(100, Math.round(conflictBase)));

  const napElA = napAmElement(aC.napAmMenh);
  const napElB = napAmElement(bC.napAmMenh);
  const isCanHop = CAN_HOP.some(([x, y]) =>
    (aC.lunarDate.yearStem === x && bC.lunarDate.yearStem === y) ||
    (aC.lunarDate.yearStem === y && bC.lunarDate.yearStem === x)
  );

  const strengths: string[] = [];
  const risks: string[] = [];

  if (elMenh >= 70) strengths.push(`Ngũ hành Mệnh tương sinh (${aC.menhElement} & ${bC.menhElement}) — nền tảng bền vững`);
  if (brRel === 'tam_hop') strengths.push(`Địa chi tam hợp (${aC.lunarDate.yearBranch}–${bC.lunarDate.yearBranch}) — thiên duyên đã định`);
  if (brRel === 'luc_hop') strengths.push(`Địa chi lục hợp (${aC.lunarDate.yearBranch}–${bC.lunarDate.yearBranch}) — dễ hòa hợp tự nhiên`);
  if (btSc >= 70) strengths.push('Ngũ hành Bát Tự bổ trợ nhau — hai người cân bằng ngũ hành tốt');
  if (phuTheCross >= 68) strengths.push('Cung Phu Thê tương chiếu cung Mệnh đối phương tốt — dễ hiểu nhau trong tình cảm');
  if (perSc >= 78) strengths.push(`Mệnh chủ ${aC.menhChu} & ${bC.menhChu} tương đồng — dễ đồng điệu tư duy`);
  if (noBocAvg >= 68) strengths.push('Cung Nô Bộc hỗ trợ — tiềm năng hợp tác và kết nghĩa tốt');
  if (bizCross >= 68) strengths.push('Tài Bạch–Quan Lộc tương chiếu tốt — tiềm năng làm ăn chung khả quan');
  if (isCanHop) strengths.push(`Thiên can ${aC.lunarDate.yearStem}–${bC.lunarDate.yearStem} can hợp — có duyên gặp nhau, dễ hòa hợp tự nhiên`);
  if (napElA && napElB && elScore(napElA, napElB) >= 72) strengths.push(`Nạp âm Mệnh tương sinh (${aC.napAmMenh} & ${bC.napAmMenh}) — nền năng lượng bổ trợ`);

  if (elMenh < 40) risks.push(`Ngũ hành Mệnh tương khắc (${aC.menhElement} & ${bC.menhElement}) — dễ gây áp lực vô ý`);
  if (brRel === 'luc_xung') risks.push(`Địa chi lục xung (${aC.lunarDate.yearBranch}–${bC.lunarDate.yearBranch}) — dễ xung đột quan điểm`);
  if (brRel === 'luc_hai') risks.push(`Địa chi lục hại — có thể vô tình cản trở nhau`);
  if (brRel === 'tuong_hinh') risks.push('Địa chi tương hình — dễ va chạm về cái tôi');
  if (btSc < 40) risks.push('Ngũ hành Bát Tự không tương hợp — dễ kích hoạt điểm yếu của nhau');
  if (perSc < 50) risks.push(`Mệnh chủ (${aC.menhChu} & ${bC.menhChu}) khác nhóm tính cách — cần thời gian thích nghi`);
  if (canSc < 40) risks.push(`Thiên can ${aC.lunarDate.yearStem}–${bC.lunarDate.yearStem} tương khắc — dễ vô tình tạo áp lực`);
  if (napElA && napElB && elScore(napElA, napElB) < 40) risks.push(`Nạp âm Mệnh tương khắc (${aC.napAmMenh} & ${bC.napAmMenh}) — nền năng lượng dễ xung`);
  if (strengths.length === 0) strengths.push('Hai người có thể bổ trợ nhau nếu hiểu rõ vai trò của mỗi người');

  const aName = a.birthInfo.name || 'Người A';
  const bName = b.birthInfo.name || 'Người B';
  const gA = (PG[aC.menhChu] ?? 3);
  const gB = (PG[bC.menhChu] ?? 3);
  const roles = {
    strategy: gA === 1 ? aName : gB === 1 ? bName : (a.batTuChart.dayMasterElement === 'Hỏa' || a.batTuChart.dayMasterElement === 'Mộc') ? aName : bName,
    finance:  gA === 2 ? aName : gB === 2 ? bName : a.batTuChart.dayMasterElement === 'Kim' ? aName : bName,
    external: gA === 3 ? aName : gB === 3 ? bName : gA < gB ? aName : bName,
    operations: gA === 4 ? aName : gB === 4 ? bName : gA > gB ? aName : bName,
  };

  const advice = {
    love: {
      label: love >= 80 ? 'Rất hợp yêu nhau' : love >= 65 ? 'Hợp khá' : love >= 50 ? 'Có thể phát triển' : 'Cần điều chỉnh nhiều',
      tips: love >= 68
        ? ['Nói rõ kỳ vọng thay vì để đối phương tự hiểu.', 'Tìm hiểu "ngôn ngữ tình yêu" của nhau và thực hành mỗi ngày.', 'Tránh tranh luận khi cả hai đang nóng — hẹn giải quyết sau.']
        : ['Kiên nhẫn tìm hiểu sâu về tính cách và nhu cầu của nhau.', 'Tập trung vào điểm tương đồng thay vì điểm khác biệt.', 'Khi xung đột, hãy lắng nghe trước khi phản ứng.'],
    },
    marriage: {
      label: marriage >= 80 ? 'Rất hợp sống chung' : marriage >= 65 ? 'Có thể tiến xa' : marriage >= 50 ? 'Cần thỏa thuận rõ' : 'Khó bền nếu không điều chỉnh',
      tips: marriage >= 65
        ? ['Thảo luận tài chính gia đình và nuôi dạy con từ trước khi cưới.', 'Phân công vai trò gia đình rõ ràng từ sớm.', 'Kết nối gia đình hai bên để giảm áp lực từ bên ngoài.']
        : ['Trải qua các tình huống thực tế cùng nhau trước khi quyết định.', 'Thỏa thuận về nơi ở và không gian riêng.', 'Tìm sự tư vấn từ người thứ ba khi có xung đột lớn.'],
    },
    business: {
      label: business >= 80 ? 'Rất hợp làm ăn' : business >= 65 ? 'Khá hợp làm ăn' : business >= 50 ? 'Có thể hợp tác từng phần' : 'Thận trọng khi góp vốn sâu',
      tips: business >= 65
        ? ['Ký thỏa thuận hợp tác văn bản chi tiết từ trước.', 'Phân vai rõ ràng theo điểm mạnh từng người.', 'Không để tình cảm ảnh hưởng quyết định tài chính.']
        : ['Bắt đầu bằng hợp tác dự án nhỏ trước.', 'Phân tách hoàn toàn tài chính cá nhân và kinh doanh.', 'Có điều khoản rõ ràng về trường hợp muốn thoát.'],
    },
    friendship: {
      label: friendship >= 80 ? 'Dễ chơi và bền' : friendship >= 65 ? 'Hợp bạn bè' : friendship >= 50 ? 'Có thể gắn bó' : 'Nên giữ khoảng cách vừa phải',
      tips: friendship >= 65
        ? ['Tình bạn này dễ bền nếu không để tiền bạc chen vào.', 'Duy trì liên lạc đều đặn và tìm hoạt động chung.', 'Tôn trọng không gian riêng của nhau.']
        : ['Hạn chế liên quan tài chính trong quan hệ bạn bè.', 'Giữ ranh giới rõ giữa bạn bè và công việc.', 'Không kỳ vọng quá nhiều từ nhau trong giai đoạn đầu.'],
    },
  };

  const layers = buildLayers(a, b, { overall, love, marriage, business, friendship, conflict_risk }, strengths, risks, brRel, elRel, btSc, perSc, roles);

  return {
    scores: { overall, love, marriage, business, friendship, conflict_risk },
    element_label: `${aC.menhElement} & ${bC.menhElement} — ${elRelLabel(aC.menhElement, bC.menhElement)}`,
    branch_label: brLabel(aC.lunarDate.yearBranch, bC.lunarDate.yearBranch),
    can_chi_label: canLabel(aC.lunarDate.yearStem, bC.lunarDate.yearStem),
    napam_label: `${aC.napAmMenh} & ${bC.napAmMenh}`,
    strength_signals: strengths.slice(0, 4),
    risk_signals: risks.slice(0, 4),
    advice,
    business_roles: roles,
    layers,
  };
}

/** Serialize chart data for VIP AI prompt */
export function serializeForAI(a: AstrologyResult, b: AstrologyResult, proResult: CompareResult): string {
  const serChart = (r: AstrologyResult) => {
    const c = r.tuViChart;
    const bt = r.batTuChart;
    const houses = c.houses.map(h =>
      `${h.branch}(${h.palaceName}): ${h.stars.map(s => s.name).join(', ') || 'trống'}${h.isManh ? '[MỆNH]' : ''}${h.isThan ? '[THÂN]' : ''}`
    ).join(' | ');
    const dv = r.daiVans.map(d => `${d.startAge}-${d.endAge}t: ${d.stem}${d.branch}(${d.element})`).join(', ');
    return {
      name: r.birthInfo.name || 'Không tên',
      gender: r.birthInfo.gender,
      birth: `${r.birthInfo.day}/${r.birthInfo.month}/${r.birthInfo.year} giờ ${r.birthInfo.hour}h`,
      napAmMenh: c.napAmMenh,
      cucSo: c.cucName,
      menhCung: c.menhCung,
      menhElement: c.menhElement,
      menhChu: c.menhChu,
      thanChu: c.thanChu,
      lunarYear: `${c.lunarDate.yearStem}${c.lunarDate.yearBranch}`,
      dayMaster: `${bt.dayMaster}(${bt.dayMasterElement})`,
      dungsKi: `Dụng: ${bt.favorableElements.join(',')} | Kỵ: ${bt.unfavorableElements.join(',')}`,
      batTuPillars: bt.pillars.map(p => `${p.label}: ${p.stem}${p.branch}`).join(' '),
      houses,
      daiVans: dv,
    };
  };

  return JSON.stringify({
    relationship_purpose: 'general',
    current_year: 2026,
    person_a: serChart(a),
    person_b: serChart(b),
    offline_analysis: {
      scores: proResult.scores,
      strength_signals: proResult.strength_signals,
      risk_signals: proResult.risk_signals,
      business_roles: proResult.business_roles,
      element_label: proResult.element_label,
      branch_label: proResult.branch_label,
      can_chi_label: proResult.can_chi_label,
      napam_label: proResult.napam_label,
    },
  }, null, 2);
}
