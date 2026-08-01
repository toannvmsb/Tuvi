/**
 * NATAL ANALYSIS SERVICE (Phase 7 — Luận toàn bộ lá số).
 *
 * Tổng hợp facts TOÀN LÁ SỐ thành một object có cấu trúc để offline luận & AI
 * DIỄN GIẢI bám vào (không tự sinh sao/cách cục). Gộp:
 *   - Identity (Mệnh/Thân/Cục/Âm Dương/Nạp Âm).
 *   - Meta-pattern + cách chủ/phụ/hung (Phase 3).
 *   - 12 cung facts (Phase 4 — analyzeAllPalaces).
 *   - Điểm mạnh / điểm yếu tổng thể.
 *   - KIỂM TRA MÂU THUẪN giữa TỔNG QUAN và LUẬN TỪNG CUNG (gap V2.0).
 */

import type { AstrologyResult } from '../types';
import { detectAllCachCuc, groupByRank, buildMetaPattern, CORE_PALACES, type MetaPattern, type DetectedCach } from './cachCucEngine';
import { analyzeAllPalaces, type PalaceFacts } from './palaceAnalysisService';
import { cachCucRuleId } from './knowledgeBase';

export interface NatalIdentity {
  menhBranch: string;
  menhElement: string;
  cuc: string;
  menhChu: string;
  thanChu: string;
  amDuong: string;
  napAm: string;
  gender: string;
  menhThanChung: boolean; // Mệnh & Thân đồng cung
}

export interface TopFormation {
  name: string;
  ruleId?: string;
  score: number;
  good: boolean;
  palace: string;
  completeness: number;
  rank: string;
}

export interface NatalConsistency {
  ok: boolean;
  issues: { code: string; message: string }[];
}

export interface NatalFacts {
  identity: NatalIdentity;
  metaPattern: MetaPattern;
  topFormations: TopFormation[];
  palaces: PalaceFacts[];
  overallStrength: number;              // 0–100 (trọng số cung then chốt)
  overallTone: 'cát' | 'trung tính' | 'hung';
  strengths: string[];
  weaknesses: string[];
  consistency: NatalConsistency;
  confidence: number;
  formulaVersion: '2.0';
}

// Trọng số cung then chốt khi tính lực tổng thể
const KEY_WEIGHT: Record<string, number> = {
  'Mệnh': 3, 'Thân': 2, 'Quan Lộc': 1.5, 'Tài Bạch': 1.5, 'Phúc Đức': 1.5,
};

function toTopFormations(detected: DetectedCach[]): TopFormation[] {
  const { chu, phu, pha } = groupByRank(detected);
  const pick = (arr: DetectedCach[], rank: string) => arr.map(d => ({
    name: d.cach.name,
    ruleId: cachCucRuleId(d.cach.name),
    score: d.score,
    good: d.cach.good,
    palace: d.palace,
    completeness: d.completeness,
    rank,
  }));
  return [...pick(chu, 'chủ'), ...pick(phu, 'phụ'), ...pick(pha, 'hung')];
}

export function analyzeNatal(result: AstrologyResult): NatalFacts {
  const c = result.tuViChart;
  const detected = detectAllCachCuc(result);
  const metaPattern = buildMetaPattern(detected);
  const palaces = analyzeAllPalaces(result);
  const topFormations = toTopFormations(detected);

  const menhHouse = c.houses.find(h => h.isManh);
  const identity: NatalIdentity = {
    menhBranch: menhHouse?.branch ?? c.menhCung ?? '?',
    menhElement: c.menhElement ?? '?',
    cuc: c.cucName ?? '?',
    menhChu: c.menhChu ?? '?',
    thanChu: c.thanChu ?? '?',
    amDuong: c.amDuongThuanLy ?? '?',
    napAm: c.napAmMenh ?? '?',
    gender: result.birthInfo.gender === 'nam' ? 'Nam' : 'Nữ',
    menhThanChung: c.menhCung === c.thanCung,
  };

  // Lực tổng thể — trung bình có trọng số các cung then chốt
  let wSum = 0, wTotal = 0;
  for (const p of palaces) {
    const w = KEY_WEIGHT[p.palace] ?? 0.4;
    wSum += p.strength.value * w;
    wTotal += w;
  }
  const overallStrength = wTotal ? Math.round(wSum / wTotal) : 0;

  // Sắc thái tổng thể — chủ yếu từ cung Mệnh, gia giảm bởi cách chủ tốt/xấu
  const menhFacts = palaces.find(p => p.palace === 'Mệnh');
  let toneScore = 0;
  if (menhFacts) toneScore += menhFacts.conflict.catScore - menhFacts.conflict.hungScore;
  toneScore += topFormations.filter(t => t.good && t.rank === 'chủ').length * 4;
  toneScore -= topFormations.filter(t => !t.good).length * 3;
  const overallTone: NatalFacts['overallTone'] = toneScore >= 6 ? 'cát' : toneScore <= -6 ? 'hung' : 'trung tính';

  // Điểm mạnh / yếu
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  for (const p of palaces) {
    if (p.strength.value >= 62 && p.conflict.netTone === 'cát') {
      strengths.push(`${p.palace} (${p.strength.value}đ, ${p.conflict.netTone})`);
    }
    if ((p.strength.level === 'yếu' || p.strength.level === 'rất yếu') || p.conflict.netTone === 'hung') {
      weaknesses.push(`${p.palace} (${p.strength.value}đ, ${p.conflict.netTone})`);
    }
  }
  for (const t of topFormations.filter(t => t.good && t.rank === 'chủ')) strengths.push(`Cách ${t.name} (${t.score}đ)`);
  for (const t of topFormations.filter(t => !t.good)) weaknesses.push(`Cách hung ${t.name}`);

  // KIỂM TRA MÂU THUẪN tổng quan ↔ từng cung
  const issues: NatalConsistency['issues'] = [];
  const isQuy = /quý|đại quý/i.test(metaPattern.tongDanh);
  const menhStrong = (menhFacts?.strength.value ?? 0) >= 45;
  if (isQuy && !menhStrong) {
    issues.push({
      code: 'QUY_BUT_WEAK_MENH',
      message: `Tổng danh "${metaPattern.tongDanh}" nhưng cung Mệnh chỉ ${menhFacts?.strength.value ?? '?'}đ — quý cách cần cung Mệnh đủ lực; lưu ý khi luận, tránh thổi phồng.`,
    });
  }
  if (menhFacts?.strength.chinhTinhVCD && isQuy) {
    issues.push({
      code: 'VCD_BUT_QUY',
      message: 'Mệnh Vô chính diệu nhưng tổng danh cao — cần dựa vào tinh hệ xung chiếu, không khẳng định chắc.',
    });
  }
  // Cách chủ TỐT nằm ở cung có sắc thái HUNG → căng thẳng nội tại
  for (const t of topFormations.filter(t => t.good && t.rank === 'chủ')) {
    const pf = palaces.find(p => p.palace === t.palace);
    if (pf && pf.conflict.netTone === 'hung') {
      issues.push({
        code: 'GOOD_FORMATION_IN_HUNG_PALACE',
        message: `Cách tốt "${t.name}" hội tại cung ${t.palace} đang mang sắc thái hung — cách hay nhưng dễ bị cản, cần điều kiện kích hoạt.`,
      });
    }
  }

  // Confidence: giảm nếu Mệnh VCD hoặc có mâu thuẫn
  let confidence = 80;
  if (menhFacts?.strength.chinhTinhVCD) confidence -= 10;
  confidence -= issues.length * 5;
  confidence = Math.max(40, Math.min(95, confidence));

  return {
    identity,
    metaPattern,
    topFormations,
    palaces,
    overallStrength,
    overallTone,
    strengths: strengths.slice(0, 8),
    weaknesses: weaknesses.slice(0, 8),
    consistency: { ok: issues.length === 0, issues },
    confidence,
    formulaVersion: '2.0',
  };
}

/** Block facts gọn để nhúng vào prompt AI toàn lá số (AI diễn giải, không bịa). */
export function natalFactsBlock(result: AstrologyResult): string {
  const n = analyzeNatal(result);
  const c = result.tuViChart;
  const houses = c.houses;
  const menhH = houses.find(h => h.isManh);
  const thanH = houses.find(h => h.isThan);
  const chinhTinhOf = (h?: typeof houses[number]) => h ? (h.stars.filter(s => s.type === 'chinh').map(s => s.name).join(', ') || 'Vô chính diệu') : '?';

  // Helper: tra vị trí THỰC của một sao trên lá số (loại sao lưu).
  const cleanNm = (n: string) => (n.startsWith('L. ') ? n.slice(3) : n);
  const locateStar = (name: string): string | null => {
    for (const h of houses) for (const s of h.stars) {
      if (s.type === 'luu') continue;
      if (cleanNm(s.name) === name) return h.palaceName;
    }
    return null;
  };

  // Sắp xếp top 24 theo PRIORITY TỔNG HỢP (thay vì thuần score):
  // - Cách cục CHÍNH (từ 4 cung trọng yếu Mệnh/Tài Bạch/Quan Lộc/Thiên Di — theo
  //   yêu cầu luận giải) LUÔN được ưu tiên cao nhất, bất kể category/score.
  // - Sau đó: Chính cách (chinh) > Quý cách (quy) > Phú cách (phu) > Biến cách (bien) > Cách phụ tinh (phu_tinh)
  // - Cách ở cung then chốt khác (Thân > Phúc Đức > Điền Trạch …) được ưu tiên tiếp theo.
  // - Sau đó mới đến score. Bảo đảm cách quan trọng như Sát Phá Tham Liêm luôn lọt top.
  const CORE_BONUS = 40; // vượt trội mọi category/palace weight khác — đảm bảo 4 cung trọng yếu luôn lên đầu
  const CATEGORY_W: Record<string, number> = {
    chinh: 30, quy: 22, phu: 20, bien: 12, phu_tinh: 6, hung: 25, /* hung được ưu tiên trong nhóm cần cảnh báo */
  };
  const PALACE_W: Record<string, number> = {
    'Thân': 12, 'Phúc Đức': 8, 'Điền Trạch': 6,
    'Phu Thê': 6, 'Hôn Nhân': 6, 'Tật Ách': 5, 'Tử Tức': 4, 'Nô Bộc': 4, 'Phụ Mẫu': 4, 'Huynh Đệ': 3,
  };
  const priorityOf = (d: typeof detected[number]): number => {
    const cat = (d.cach.category ?? 'phu') as string;
    const coreBonus = CORE_PALACES.includes(d.palace) ? CORE_BONUS : 0;
    return coreBonus + (CATEGORY_W[cat] ?? 0) + (PALACE_W[d.palace] ?? 0) + d.score;
  };
  const detected = detectAllCachCuc(result);
  const good = detected.filter(d => d.cach.good).sort((a, b) => priorityOf(b) - priorityOf(a));
  const bad = detected.filter(d => !d.cach.good).sort((a, b) => priorityOf(b) - priorityOf(a));
  const goodQ = Math.min(good.length, 16);
  const badQ = Math.min(bad.length, 24 - goodQ);
  const top24 = [...good.slice(0, goodQ), ...bad.slice(0, badQ)];

  const evidenceOf = (d: typeof detected[number]): string => {
    const allStars = [...(d.cach.pivotStars ?? []), ...d.cach.stars];
    return allStars.map(sn => { const at = locateStar(sn); return at ? `${sn} tại cung ${at}` : `${sn} (không tìm thấy trên lá số)`; }).join(', ');
  };
  const positionOf = (d: typeof detected[number]): string =>
    d.cach.scope === 'same' ? `đồng cung tại ${d.palace}` :
    d.cach.scope === 'giap' ? `giáp (kẹp 2 cung kề) quanh ${d.palace}` :
    `tam hợp/xung chiếu ${d.palace}`;

  const topLines = top24.map(d =>
    `  · ${d.cach.name} (${d.score}đ, ${d.cach.good ? 'cát' : 'hung'}) — vị trí: ${positionOf(d)} — bằng chứng: ${evidenceOf(d)}`,
  ).join('\n');

  const allFormations = n.topFormations;
  const chu = allFormations.filter(t => t.rank === 'chủ').map(t => `${t.name}(${t.score}đ)`).join(', ') || '(không)';
  const hung = allFormations.filter(t => t.rank === 'hung').map(t => t.name).join(', ') || '(không)';

  // Bản đồ 12 cung — chính tinh của TỪNG cung để AI biết chính xác sao nào ở đâu
  const palaceMap = houses.map(h =>
    `  · Cung ${h.palaceName} (${h.branch}): ${chinhTinhOf(h)}${h.isManh ? ' [Mệnh]' : ''}${h.isThan ? ' [Thân]' : ''}`,
  ).join('\n');

  const lines = [
    '[DỮ KIỆN LÁ SỐ — engine đã tính. TUYỆT ĐỐI KHÔNG BỊA. Mọi câu về vị trí sao/cách phải BÁM CHÍNH XÁC dữ liệu bên dưới, không được nói sao X ở cung Y nếu bản đồ dưới không xác nhận.]',
    `- Vị trí Mệnh: cung ${menhH?.palaceName ?? '?'}(${menhH?.branch ?? '?'}) — chính tinh: ${chinhTinhOf(menhH)}.`,
    `- Vị trí Thân: cung ${thanH?.palaceName ?? '?'}(${thanH?.branch ?? '?'}) — chính tinh: ${chinhTinhOf(thanH)}.`,
    `- Mệnh–Thân ${n.identity.menhThanChung ? 'ĐỒNG CUNG' : 'KHÁC CUNG (không được nói đồng cung)'}.`,
    `- Bản mệnh: ${n.identity.napAm}, Cục ${n.identity.cuc}, Âm Dương ${n.identity.amDuong}. Mệnh chủ: ${n.identity.menhChu}. Thân chủ: ${n.identity.thanChu}.`,
    `- Tổng danh lá số: ${n.metaPattern.tongDanh} | Lực tổng thể: ${n.overallStrength}/100 | Sắc thái: ${n.overallTone} | Độ tin cậy: ${n.confidence}%.`,
    '',
    '[BẢN ĐỒ 12 CUNG — nguồn chân lý duy nhất để tra vị trí chính tinh, KHÔNG được ghi khác]:',
    palaceMap,
    '',
    `- Cách chủ (đáng luận sâu): ${chu}. Cách hung (cần cảnh báo): ${hung}.`,
    '',
    `[24 CÁCH CỤC ẢNH HƯỞNG LỚN NHẤT — bám sát khi luận cơ chế vận mệnh, TUYỆT ĐỐI KHÔNG nêu cách ngoài danh sách này, KHÔNG đổi vị trí sao, KHÔNG bịa thêm sao vào cách]:`,
    topLines || '  (không có cách nào nổi bật)',
    '',
    `- Điểm mạnh nổi trội: ${n.strengths.slice(0, 4).join('; ') || '(chưa rõ)'}.`,
    `- Điểm cần lưu tâm: ${n.weaknesses.slice(0, 4).join('; ') || '(chưa rõ)'}.`,
  ];
  if (!n.consistency.ok) {
    lines.push(`- ⚠ Lưu ý tránh thổi phồng: ${n.consistency.issues.map(i => i.message).join(' ')}`);
  }
  return lines.join('\n');
}
