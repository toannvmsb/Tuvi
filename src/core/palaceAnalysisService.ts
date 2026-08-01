/**
 * PALACE ANALYSIS SERVICE (Phase 4).
 *
 * Biến logic "luận một cung" (vốn chỉ tồn tại dưới dạng prompt text trong
 * buildPalacePrompt) thành OBJECT có cấu trúc, testable — `PalaceFacts`. Đây là
 * facts pre-computed để offline luận & AI diễn giải bám vào, KHÔNG tự sinh sao.
 *
 * Kết hợp:
 *   - StrengthEngine / ConflictEngine (Phase 5) — độ mạnh & sắc thái cát/hung.
 *   - cachCucEngine (Phase 3) — cách cục tại cung + completeness/confidence.
 *   - Quan hệ tam hợp / xung chiếu / nhị hợp giữa các cung.
 */

import type { AstrologyResult, TuViHouse, StarEntry } from '../types';
import { computeStrength, resolveConflict, hasTuanTriet, type StrengthResult, type ConflictResult } from './strengthEngine';
import { detectAllCachCuc } from './cachCucEngine';
import { cachCucRuleId } from './knowledgeBase';

const clean = (n: string) => (n.startsWith('L. ') ? n.slice(3) : n);
const BRANCHES = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tị', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
const branchIdx = (b: string) => BRANCHES.indexOf(b);
const TAM_HOP: number[][] = [[8, 0, 4], [2, 6, 10], [5, 9, 1], [11, 3, 7]];
const NHI_HOP: Record<number, number> = {
  0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6,
};

// Bộ chính tinh
const BO_TPV = new Set(['Tử Vi', 'Thiên Phủ', 'Vũ Khúc', 'Thiên Tướng', 'Liêm Trinh']);
const BO_SPT = new Set(['Thất Sát', 'Phá Quân', 'Tham Lang']);
const BO_CNDL = new Set(['Thiên Cơ', 'Thái Âm', 'Thiên Đồng', 'Thiên Lương']);
const BO_CN = new Set(['Cự Môn', 'Thái Dương']);
function boOf(stars: StarEntry[]): string {
  const c = stars.filter(s => s.type === 'chinh').map(s => clean(s.name));
  if (c.length === 0) return 'Vô chính diệu';
  const cnt: Record<string, number> = { 'Tử Phủ Vũ Tướng': 0, 'Sát Phá Tham': 0, 'Cơ Nguyệt Đồng Lương': 0, 'Cự Nhật': 0 };
  for (const n of c) {
    if (BO_TPV.has(n)) cnt['Tử Phủ Vũ Tướng']++;
    else if (BO_SPT.has(n)) cnt['Sát Phá Tham']++;
    else if (BO_CNDL.has(n)) cnt['Cơ Nguyệt Đồng Lương']++;
    else if (BO_CN.has(n)) cnt['Cự Nhật']++;
  }
  let best = 'hỗn hợp', bn = 0;
  for (const k of Object.keys(cnt)) if (cnt[k] > bn) { bn = cnt[k]; best = k; }
  return bn > 0 ? best : 'hỗn hợp';
}

// Vai trò & trọng tâm luận từng cung (config)
const PALACE_ROLE: Record<string, string> = {
  'Mệnh': 'Bản chất, tính cách, vận mệnh cốt lõi — cung quan trọng nhất.',
  'Phụ Mẫu': 'Cha mẹ, cấp trên, phúc ấm gia đình, học vấn nền tảng.',
  'Phúc Đức': 'Phúc phần, hưởng thụ, tinh thần, tuổi thọ, gốc rễ vận may.',
  'Điền Trạch': 'Nhà đất, tài sản cố định, môi trường sống, gia sản tích lũy.',
  'Quan Lộc': 'Sự nghiệp, công danh, địa vị, năng lực làm việc.',
  'Nô Bộc': 'Bạn bè, đồng nghiệp, cấp dưới, các mối quan hệ xã hội.',
  'Thiên Di': 'Xuất ngoại, giao tế, cơ hội bên ngoài, quý nhân/tiểu nhân.',
  'Tật Ách': 'Sức khỏe, bệnh tật, tai ách, thể chất.',
  'Tài Bạch': 'Tiền bạc, dòng tiền, cách kiếm và giữ của.',
  'Tử Tức': 'Con cái, sáng tạo, đệ tử, khả năng sinh sản.',
  'Phu Thê': 'Hôn nhân, bạn đời, quan hệ tình cảm sâu sắc.',
  'Hôn Nhân': 'Hôn nhân, bạn đời, quan hệ tình cảm sâu sắc.',
  'Huynh Đệ': 'Anh chị em, bạn thân, hợp tác, hỗ trợ ngang hàng.',
};

export interface PalaceRelation { palace: string; branch: string; chinhTinh: string[]; }

export interface PalaceFacts {
  palace: string;
  branch: string;
  role: string;
  scope: 'natal';
  chinhTinh: { name: string; brightness?: string }[];
  phuTinh: string[];
  boSao: string;
  strength: StrengthResult;
  conflict: ConflictResult;
  patterns: { name: string; ruleId?: string; score: number; completeness: number; confidence: number; status: string; good: boolean }[];
  relations: { tamHop: PalaceRelation[]; xung: PalaceRelation | null; nhiHop: PalaceRelation | null };
  imbalances: string[];
  recommendations: string[];
  confidence: number;
  formulaVersion: '2.0';
}

function relOf(h: TuViHouse | undefined): PalaceRelation | null {
  if (!h) return null;
  return {
    palace: h.palaceName,
    branch: h.branch,
    chinhTinh: h.stars.filter(s => s.type === 'chinh').map(s => clean(s.name)),
  };
}

/**
 * Phân tích một cung → PalaceFacts. `palaceName` là tên cung (vd "Mệnh", "Tài Bạch").
 */
export function analyzePalace(result: AstrologyResult, palaceName: string): PalaceFacts | null {
  const houses = result.tuViChart.houses;
  const h = houses.find(x => x.palaceName === palaceName);
  if (!h) return null;

  const i = branchIdx(h.branch);
  const stars = h.stars;
  const tt = hasTuanTriet(h);

  const strength = computeStrength(stars, tt);
  const conflict = resolveConflict(stars);

  // Cách cục tại cung (từ Phase 3 engine, lọc theo palace)
  const patterns = detectAllCachCuc(result)
    .filter(d => d.palace === palaceName)
    .map(d => ({
      name: d.cach.name, ruleId: cachCucRuleId(d.cach.name),
      score: d.score, completeness: d.completeness,
      confidence: d.confidence, status: d.status, good: d.cach.good,
    }));

  // Quan hệ tam hợp / xung / nhị hợp
  const thGroup = (TAM_HOP.find(g => g.includes(i)) ?? []).filter(x => x !== i);
  const tamHop = thGroup.map(idx => relOf(houses.find(hh => branchIdx(hh.branch) === idx))).filter(Boolean) as PalaceRelation[];
  const xung = relOf(houses.find(hh => branchIdx(hh.branch) === (i + 6) % 12));
  const nhIdx = NHI_HOP[i];
  const nhiHop = nhIdx !== undefined ? relOf(houses.find(hh => branchIdx(hh.branch) === nhIdx)) : null;

  // Mất cân bằng
  const imbalances: string[] = [];
  if (strength.chinhTinhVCD) imbalances.push('Vô chính diệu — thiếu chủ khí, dễ thiếu định hướng, phụ thuộc tinh hệ xung chiếu.');
  if (strength.level === 'yếu' || strength.level === 'rất yếu') imbalances.push(`Cung suy nhược (${strength.value}đ) — mặt luận của cung này khó phát huy trọn vẹn.`);
  if (conflict.netTone === 'hung') imbalances.push('Hung tinh áp đảo — nhiều trắc trở, cần chủ động hóa giải/phòng thủ.');
  if (tt) imbalances.push('Tuần/Triệt án ngữ — việc của cung dễ chững lại, đến muộn hoặc biến hóa bất ngờ.');
  const hasKy = stars.some(s => clean(s.name) === 'Hóa Kỵ');
  if (hasKy) imbalances.push('Hóa Kỵ tọa thủ — vướng mắc, thị phi hoặc chấp niệm ở lĩnh vực cung này.');

  // Khuyến nghị theo sắc thái + vai trò
  const role = PALACE_ROLE[palaceName] ?? 'Một phương diện của lá số.';
  const recommendations: string[] = [];
  if (conflict.netTone === 'cát' && strength.value >= 62) {
    recommendations.push(`Đây là điểm MẠNH của lá số — nên dồn lực khai thác về mặt "${palaceName}".`);
  } else if (conflict.netTone === 'hung' || strength.level === 'yếu' || strength.level === 'rất yếu') {
    recommendations.push(`Cần phòng thủ/hóa giải ở phương diện "${palaceName}"; tránh kỳ vọng đột phá tại đây.`);
  } else {
    recommendations.push(`Phương diện "${palaceName}" ở mức ổn định — tiến chắc, tùy vận kích hoạt để bung.`);
  }
  if (patterns.some(p => p.good && p.status === 'đầy đủ')) {
    recommendations.push(`Có cách cục tốt hội tụ (${patterns.filter(p => p.good).map(p => p.name).join(', ')}) — lợi thế đáng tận dụng.`);
  }

  // Độ tin cậy: dữ liệu đủ + không quá bất định
  let confidence = 78;
  if (strength.chinhTinhVCD) confidence -= 12;
  if (tt) confidence -= 8;
  confidence = Math.max(40, Math.min(95, confidence));

  return {
    palace: palaceName,
    branch: h.branch,
    role,
    scope: 'natal',
    chinhTinh: stars.filter(s => s.type === 'chinh').map(s => ({ name: clean(s.name), brightness: s.brightness })),
    phuTinh: stars.filter(s => s.type !== 'chinh' && s.type !== 'luu').map(s => clean(s.name)),
    boSao: boOf(stars),
    strength,
    conflict,
    patterns,
    relations: { tamHop, xung, nhiHop },
    imbalances,
    recommendations,
    confidence,
    formulaVersion: '2.0',
  };
}

/** Phân tích toàn bộ 12 cung. */
export function analyzeAllPalaces(result: AstrologyResult): PalaceFacts[] {
  return result.tuViChart.houses
    .map(h => analyzePalace(result, h.palaceName))
    .filter(Boolean) as PalaceFacts[];
}
