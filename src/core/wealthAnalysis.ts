/**
 * WEALTH ANALYSIS SERVICE (Phase 12 — Tài Lộc / Financial DNA).
 *
 * Đọc "ADN tài chính" của lá số theo 8 chiều, tổng hợp từ 6 cung trọng yếu về
 * tiền bạc: MỆNH (năng lực gốc) – TÀI BẠCH (dòng tiền) – QUAN LỘC (sự nghiệp) –
 * ĐIỀN TRẠCH (tích sản) – PHÚC ĐỨC (hưởng thụ/nền tảng) – THIÊN DI (cơ hội ngoài).
 *
 * 8 chiều (mỗi chiều 0–100):
 *   earn      — Kiếm tiền: khả năng tạo thu nhập chủ động.
 *   retain    — Giữ tiền: khả năng tích lũy, không hao tán.
 *   cashflow  — Dòng tiền: sự luân chuyển, thanh khoản.
 *   invest    — Đầu tư: nhạy cơ hội, sinh lời từ vốn.
 *   leverage  — Đòn bẩy: dùng vốn vay / quan hệ / quy mô.
 *   property  — Tích sản: bất động sản, tài sản cố định.
 *   business  — Kinh doanh: tự chủ, thương mại, khởi nghiệp.
 *   risk      — Rủi ro: mức độ BẤT ỔN tài chính (CAO = nguy hiểm).
 *
 * V2.0: đây là facts pre-computed cho UI radar + AI diễn giải; KHÔNG tự sinh sao.
 */

import type { AstrologyResult, TuViHouse, StarEntry } from '../types';

const clean = (n: string) => (n.startsWith('L. ') ? n.slice(3) : n);

const BRIGHT: Record<string, number> = {
  'miếu': 1, 'vượng': 0.8, 'đắc': 0.5, 'bình': 0.2, 'hãm': -0.6,
};

interface PalaceStars {
  menh: Set<string>;
  tai: Set<string>;
  quan: Set<string>;
  dien: Set<string>;
  phuc: Set<string>;
  di: Set<string>;
  brightness: Map<string, number>; // tên sao → hệ số độ sáng (theo lần xuất hiện đầu)
}

function collectPalaces(result: AstrologyResult): PalaceStars {
  const houses = result.tuViChart.houses;
  const brightness = new Map<string, number>();
  const grab = (palaceName: string): Set<string> => {
    const h = houses.find(x => x.palaceName === palaceName);
    const set = new Set<string>();
    if (h) {
      for (const s of h.stars) {
        const nm = clean(s.name);
        set.add(nm);
        if (s.brightness && !brightness.has(nm)) brightness.set(nm, BRIGHT[s.brightness] ?? 0);
      }
    }
    return set;
  };
  return {
    menh: grab('Mệnh'),
    tai: grab('Tài Bạch'),
    quan: grab('Quan Lộc'),
    dien: grab('Điền Trạch'),
    phuc: grab('Phúc Đức'),
    di: grab('Thiên Di'),
    brightness,
  };
}

export interface FinancialDNA {
  earn: number;
  retain: number;
  cashflow: number;
  invest: number;
  leverage: number;
  property: number;
  business: number;
  risk: number;
  /** Chiều trội nhất (trừ risk). */
  dominant: keyof Omit<FinancialDNA, 'dominant' | 'archetype' | 'riskLevel' | 'confidence' | 'notes' | 'formulaVersion'>;
  archetype: string;   // Chân dung tài chính
  riskLevel: 'thấp' | 'vừa' | 'cao';
  confidence: number;  // độ tin cậy tổng thể
  notes: string[];     // ghi chú cơ chế (evidence cho AI/offline)
  formulaVersion: '2.0';
}

const DIM_LABEL: Record<string, string> = {
  earn: 'Kiếm tiền', retain: 'Giữ tiền', cashflow: 'Dòng tiền', invest: 'Đầu tư',
  leverage: 'Đòn bẩy', property: 'Tích sản', business: 'Kinh doanh', risk: 'Rủi ro',
};

export function analyzeFinancialDNA(result: AstrologyResult): FinancialDNA {
  const p = collectPalaces(result);
  const notes: string[] = [];
  const b = (n: string) => p.brightness.get(n) ?? 0; // hệ số độ sáng

  const inAny = (n: string, ...sets: Set<string>[]) => sets.some(s => s.has(n));

  // ─── EARN — kiếm tiền (Mệnh + Quan + Tài) ───
  let earn = 40;
  if (inAny('Vũ Khúc', p.menh, p.tai, p.quan)) { earn += 14 + b('Vũ Khúc') * 8; notes.push('Vũ Khúc (chính tài tinh) → lực kiếm tiền chủ động mạnh.'); }
  if (inAny('Thái Dương', p.menh, p.quan)) earn += 10 + b('Thái Dương') * 6;
  if (inAny('Tham Lang', p.menh, p.tai, p.quan)) earn += 8;
  if (inAny('Thất Sát', p.menh, p.quan)) earn += 8;
  if (inAny('Hóa Lộc', p.menh, p.tai, p.quan)) { earn += 12; notes.push('Hóa Lộc nhập Mệnh/Tài/Quan → tài lộc tự nhiên tới.'); }
  if (inAny('Hóa Quyền', p.menh, p.quan)) earn += 8;
  if (inAny('Lộc Tồn', p.menh, p.tai)) earn += 8;

  // ─── RETAIN — giữ tiền (Tài + Điền + Phúc) ───
  let retain = 45;
  if (inAny('Thiên Phủ', p.tai, p.dien, p.menh)) { retain += 16 + b('Thiên Phủ') * 8; notes.push('Thiên Phủ (tài khố) → khả năng tích lũy, giữ của tốt.'); }
  if (inAny('Thái Âm', p.tai, p.dien)) retain += 12 + b('Thái Âm') * 6;
  if (inAny('Lộc Tồn', p.tai, p.dien)) retain += 12;
  if (inAny('Vũ Khúc', p.dien)) retain += 6;
  if (inAny('Phá Quân', p.tai, p.dien)) { retain -= 14; notes.push('Phá Quân tại Tài/Điền → tiền vào ra thất thường, khó giữ.'); }
  if (inAny('Đại Hao', p.tai, p.dien) || inAny('Tiểu Hao', p.tai, p.dien)) retain -= 10;
  if (inAny('Địa Kiếp', p.tai, p.dien) || inAny('Địa Không', p.tai, p.dien)) retain -= 12;

  // ─── CASHFLOW — dòng tiền (Tài + Di + Thiên Mã) ───
  let cashflow = 42;
  if (inAny('Thiên Mã', p.tai, p.di, p.menh)) { cashflow += 16; notes.push('Thiên Mã → dòng tiền động, luân chuyển nhanh.'); }
  if (inAny('Hóa Lộc', p.tai, p.di)) cashflow += 14;
  if (inAny('Lộc Tồn', p.tai, p.di)) cashflow += 10;
  if (inAny('Cự Môn', p.tai, p.quan)) cashflow += 6;
  if (inAny('Thái Dương', p.tai, p.di)) cashflow += 6;
  if (inAny('Địa Không', p.tai) || inAny('Địa Kiếp', p.tai)) cashflow -= 8;

  // ─── INVEST — đầu tư (Tham Lang, Cơ, Hóa Khoa) ───
  let invest = 40;
  if (inAny('Tham Lang', p.menh, p.tai, p.quan)) { invest += 14; notes.push('Tham Lang → khẩu vị đầu tư, nhạy cơ hội sinh lời.'); }
  if (inAny('Thiên Cơ', p.menh, p.tai, p.quan)) invest += 10 + b('Thiên Cơ') * 5;
  if (inAny('Hóa Khoa', p.tai, p.quan)) invest += 8;
  if (inAny('Vũ Khúc', p.tai)) invest += 8;
  if (inAny('Hóa Kỵ', p.tai)) invest -= 10;

  // ─── LEVERAGE — đòn bẩy (Sát Phá Tham, Kình, Quyền, Mã) ───
  let leverage = 35;
  if (inAny('Thất Sát', p.menh, p.quan)) leverage += 12;
  if (inAny('Phá Quân', p.menh, p.quan)) leverage += 12;
  if (inAny('Tham Lang', p.menh, p.quan)) leverage += 8;
  if (inAny('Hóa Quyền', p.menh, p.tai, p.quan)) { leverage += 12; notes.push('Hóa Quyền → sức bẩy, mở rộng quy mô, nắm quyền chi phối.'); }
  if (inAny('Kình Dương', p.menh, p.quan)) leverage += 8;
  if (inAny('Thiên Mã', p.menh, p.tai)) leverage += 6;

  // ─── PROPERTY — tích sản (Điền Trạch trọng tâm) ───
  let property = 40;
  if (inAny('Thái Âm', p.dien)) { property += 18 + b('Thái Âm') * 8; notes.push('Thái Âm cư Điền Trạch → chủ điền sản, nhà đất.'); }
  if (inAny('Thiên Phủ', p.dien)) property += 14;
  if (inAny('Lộc Tồn', p.dien)) property += 12;
  if (inAny('Vũ Khúc', p.dien)) property += 10;
  if (inAny('Hóa Lộc', p.dien)) property += 10;
  if (inAny('Phá Quân', p.dien)) property -= 12;
  if (inAny('Địa Không', p.dien) || inAny('Địa Kiếp', p.dien)) property -= 10;

  // ─── BUSINESS — kinh doanh (Vũ, Tham, Sát, Phá, Mã, Lộc) ───
  let business = 38;
  if (inAny('Vũ Khúc', p.menh, p.quan)) business += 12;
  if (inAny('Tham Lang', p.menh, p.quan)) business += 10;
  if (inAny('Thất Sát', p.menh, p.quan)) business += 10;
  if (inAny('Phá Quân', p.menh, p.quan)) business += 8;
  if (inAny('Thiên Mã', p.menh, p.tai, p.quan)) business += 8;
  if (inAny('Hóa Lộc', p.menh, p.quan)) business += 10;
  if (inAny('Cơ Nguyệt Đồng Lương giao hội', p.menh)) business -= 6;
  // Bộ Cơ Nguyệt Đồng Lương thiên làm công → giảm nhẹ business
  if (inAny('Thiên Đồng', p.menh) && inAny('Thiên Lương', p.menh)) business -= 6;

  // ─── RISK — rủi ro tài chính (CAO = nguy hiểm) ───
  let risk = 25;
  if (inAny('Phá Quân', p.tai, p.dien, p.menh)) risk += 14;
  if (inAny('Địa Không', p.tai, p.dien) || inAny('Địa Kiếp', p.tai, p.dien)) { risk += 16; notes.push('Không/Kiếp tại Tài/Điền → dễ phá tán, đầu tư hụt.'); }
  if (inAny('Hóa Kỵ', p.tai, p.dien)) risk += 12;
  if (inAny('Đại Hao', p.tai) || inAny('Tiểu Hao', p.tai)) risk += 10;
  if (inAny('Kình Dương', p.tai) || inAny('Đà La', p.tai)) risk += 8;
  const taiHouse = result.tuViChart.houses.find(h => h.palaceName === 'Tài Bạch');
  if (taiHouse?.tuanAt || taiHouse?.trietAt) { risk += 8; notes.push('Tuần/Triệt án ngữ cung Tài → tài vận bất định, dễ gãy.'); }
  if (inAny('Lộc Tồn', p.tai, p.dien)) risk -= 8; // Lộc Tồn có tính bảo thủ, giữ của

  const clamp = (v: number) => Math.max(5, Math.min(98, Math.round(v)));
  const dims = {
    earn: clamp(earn), retain: clamp(retain), cashflow: clamp(cashflow), invest: clamp(invest),
    leverage: clamp(leverage), property: clamp(property), business: clamp(business), risk: clamp(risk),
  };

  // Chiều trội nhất (không tính risk)
  const positiveDims = ['earn', 'retain', 'cashflow', 'invest', 'leverage', 'property', 'business'] as const;
  let dominant: typeof positiveDims[number] = 'earn';
  for (const k of positiveDims) if (dims[k] > dims[dominant]) dominant = k;

  // Chân dung tài chính
  const ARCHETYPE: Record<string, string> = {
    earn: 'Người kiếm tiền chủ động — thu nhập đến từ năng lực bản thân.',
    retain: 'Người tích lũy — mạnh về giữ và gom của, hậu vận sung túc.',
    cashflow: 'Người tạo dòng tiền — hợp thương mại, luân chuyển vốn linh hoạt.',
    invest: 'Người đầu tư — nhạy cơ hội, sinh lời từ vốn và tầm nhìn.',
    leverage: 'Người dùng đòn bẩy — mở rộng quy mô, dám vay để lớn.',
    property: 'Người tích sản — bền vững nhờ bất động sản, tài sản cố định.',
    business: 'Người kinh doanh — tự chủ, khởi nghiệp, làm chủ cuộc chơi.',
  };
  const archetype = ARCHETYPE[dominant];

  const riskLevel: FinancialDNA['riskLevel'] = dims.risk >= 60 ? 'cao' : dims.risk >= 40 ? 'vừa' : 'thấp';

  // Confidence: đủ dữ liệu 6 cung tới đâu
  const filledPalaces = [p.menh, p.tai, p.quan, p.dien, p.phuc, p.di].filter(s => s.size > 0).length;
  let confidence = 55 + filledPalaces * 6;
  if (p.tai.size === 0) confidence -= 12; // thiếu cung Tài là thiếu cốt lõi
  confidence = Math.max(35, Math.min(95, confidence));

  return {
    ...dims,
    dominant,
    archetype,
    riskLevel,
    confidence,
    notes: notes.slice(0, 6),
    formulaVersion: '2.0',
  };
}

/** Chuyển FinancialDNA sang dữ liệu radar 8 trục cho UI. */
export function financialDNARadar(dna: FinancialDNA): { label: string; value: number }[] {
  return [
    { label: DIM_LABEL.earn, value: dna.earn },
    { label: DIM_LABEL.business, value: dna.business },
    { label: DIM_LABEL.leverage, value: dna.leverage },
    { label: DIM_LABEL.invest, value: dna.invest },
    { label: DIM_LABEL.cashflow, value: dna.cashflow },
    { label: DIM_LABEL.property, value: dna.property },
    { label: DIM_LABEL.retain, value: dna.retain },
    { label: DIM_LABEL.risk, value: dna.risk },
  ];
}

export { DIM_LABEL as FINANCIAL_DIM_LABEL };
