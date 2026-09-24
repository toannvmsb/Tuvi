/**
 * Tầng CHUẨN HÓA TÍN HIỆU (Signal normalization) — dựng AstrologySignal[] từ lá số đã có
 * (KHÔNG tính lại Tử Vi, chỉ đọc từ core/* đã có sẵn của app, đúng nguyên tắc ENGINE_SPEC §4.1
 * "Chart calculation" phải xác định trước, engine chỉ chuẩn hóa dữ kiện).
 *
 *  - NATAL: mọi sao trong SIGNAL_CATALOG có mặt tại 12 cung gốc.
 *  - DA_HAN: sao đóng tại chính cung mà Đại Vận đang chạy tới (core/daiVanEngine.ts đã xác định
 *    cung đó qua daiVanStartAge) + Tứ Hóa theo CAN của Đại Vận đó (core/phiHoa.ts).
 *  - ANNUAL: Tứ Hóa theo can năm xem (core/phiHoa.ts) + toàn bộ sao lưu theo năm xem (movingStars.ts).
 */
import type { AstrologyResult, EarthlyBranch, HeavenlyStem } from '../../types';
import type { AstrologySignal, Palace } from './types';
import { luuTuHoaPositions } from '../phiHoa';
import { scoreDaiVan, type DaiVanScore } from '../daiVanScore';
import { currentAgeOf } from '../ageUtil';
import { PALACE_VN_TO_CODE, yearCanChi } from './calendar';
import { SIGNAL_CATALOG, STAR_NAME_TO_CODE, brightnessToIntensity } from './signalCatalog';
import { allMovingStars } from './movingStars';

function palaceOf(vn: string): Palace | null {
  return PALACE_VN_TO_CODE[vn] ?? null;
}

/** Tứ Hóa (Lộc/Quyền/Khoa/Kỵ) tại 1 Can bất kỳ → tín hiệu, LUÔN qua core/phiHoa.ts (nguồn chuẩn duy nhất). */
function fourTransformSignals(
  c: AstrologyResult['tuViChart'], stem: HeavenlyStem, source: AstrologySignal['source'],
): AstrologySignal[] {
  const positions = luuTuHoaPositions(c, stem);
  const out: AstrologySignal[] = [];
  for (const p of positions) {
    const palace = palaceOf(p.palace);
    if (!palace) continue;
    const code = p.hoa === 'Hóa Lộc' ? 'HOA_LOC' : p.hoa === 'Hóa Quyền' ? 'HOA_QUYEN' : p.hoa === 'Hóa Khoa' ? 'HOA_KHOA' : 'HOA_KY';
    const def = SIGNAL_CATALOG[code];
    out.push({
      source, family: 'FOUR_TRANSFORMATION', palace, signalType: code, starName: p.star,
      intensity: 88, polarity: def.polarity,
    });
  }
  return out;
}

/** Tín hiệu NATAL: quét 12 cung gốc, khớp mọi sao có trong SIGNAL_CATALOG. */
function natalSignals(c: AstrologyResult['tuViChart']): AstrologySignal[] {
  const out: AstrologySignal[] = [];
  for (const h of c.houses) {
    const palace = palaceOf(h.palaceName);
    if (!palace) continue;
    for (const s of h.stars) {
      const code = STAR_NAME_TO_CODE[s.name];
      if (!code) continue;
      const def = SIGNAL_CATALOG[code];
      out.push({
        source: 'NATAL', family: def.family, palace, signalType: code, starName: def.name,
        intensity: brightnessToIntensity(s.brightness), polarity: def.polarity,
      });
    }
  }
  out.push(...fourTransformSignals(c, c.lunarDate.yearStem, 'NATAL'));
  return out;
}

/** Tín hiệu ĐẠI VẬN: sao tại đúng cung Đại Vận đang chạy + Tứ Hóa theo Can của Đại Vận đó. */
function daHanSignals(result: AstrologyResult, dvBranch: EarthlyBranch): AstrologySignal[] {
  const c = result.tuViChart;
  const h = c.houses.find(x => x.branch === dvBranch);
  const out: AstrologySignal[] = [];
  if (h) {
    const palace = palaceOf(h.palaceName);
    if (palace) {
      for (const s of h.stars) {
        const code = STAR_NAME_TO_CODE[s.name];
        if (!code) continue;
        const def = SIGNAL_CATALOG[code];
        out.push({
          source: 'DA_HAN', family: def.family, palace, signalType: code, starName: def.name,
          intensity: brightnessToIntensity(s.brightness), polarity: def.polarity,
        });
      }
    }
    out.push(...fourTransformSignals(c, h.can, 'DA_HAN'));
  }
  return out;
}

/** Tín hiệu LƯU NIÊN (năm xem): Tứ Hóa theo can năm + toàn bộ sao lưu theo năm. */
function annualSignals(result: AstrologyResult, yearStem: HeavenlyStem, yearBranch: EarthlyBranch): AstrologySignal[] {
  const c = result.tuViChart;
  const out = fourTransformSignals(c, yearStem, 'ANNUAL');
  const moving = allMovingStars(c.houses, yearStem, yearBranch, result.birthInfo.gender);
  // houses không đảm bảo thứ tự theo branchIdx — tra theo branch thật.
  const BR: EarthlyBranch[] = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tị', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
  for (const m of moving) {
    const br = BR[m.branchIdx];
    const h = c.houses.find(x => x.branch === br);
    if (!h) continue;
    const palace = palaceOf(h.palaceName);
    if (!palace) continue;
    const def = SIGNAL_CATALOG[m.code];
    if (!def) continue;
    out.push({
      source: 'ANNUAL', family: def.family, palace, signalType: m.code, starName: def.name,
      intensity: 85, polarity: def.polarity,
    });
  }
  return out;
}

export interface AnnualSignalContext {
  signals: AstrologySignal[];
  targetAge: number;
  yearStem: HeavenlyStem;
  yearBranch: EarthlyBranch;
  /** 0..100 — Thiên Thời/Địa Lợi/Nhân Hòa của Đại Vận đang chạy (core/daiVanScore.ts). Cộng đều cho MỌI sự kiện. */
  daHanStructuralScore: number;
  /** Cung Tiểu Hạn của năm xem (branch) — null nếu ngoài phạm vi đã tính (>100 tuổi). */
  tieuHanBranch: EarthlyBranch | null;
  /** 0..100 — quan hệ ngũ hành Tam Hợp năm xem với Tam Hợp Đại Vận đang chạy. Cộng đều cho MỌI sự kiện. */
  luuNienDaHanRelationScore: number;
  daiVanScore: DaiVanScore | null;
  /** Cung Đại Vận đang chạy (chi + can) — dùng cho tầng tháng (monthlyTiming.ts) so trùng/hình học. */
  daHanBranch: EarthlyBranch | null;
  daHanStem: HeavenlyStem | null;
}

const TAM_HOP_ELEMENT: Record<EarthlyBranch, string> = {
  Thân: 'Thủy', Tý: 'Thủy', Thìn: 'Thủy', Hợi: 'Mộc', Mão: 'Mộc', Mùi: 'Mộc',
  Dần: 'Hỏa', Ngọ: 'Hỏa', Tuất: 'Hỏa', Tị: 'Kim', Dậu: 'Kim', Sửu: 'Kim',
};
const SHENG: Record<string, string> = { Kim: 'Thủy', Thủy: 'Mộc', Mộc: 'Hỏa', Hỏa: 'Thổ', Thổ: 'Kim' };
const KHAC: Record<string, string> = { Kim: 'Mộc', Mộc: 'Thổ', Thổ: 'Thủy', Thủy: 'Hỏa', Hỏa: 'Kim' };

/** Quan hệ ngũ hành Tam Hợp NĂM XEM so với Tam Hợp ĐẠI VẬN đang chạy — "LuuNienDaHan" (7% baseScore). */
function luuNienVsDaHanScore(yearBranch: EarthlyBranch, dvBranch: EarthlyBranch): number {
  const y = TAM_HOP_ELEMENT[yearBranch], d = TAM_HOP_ELEMENT[dvBranch];
  if (y === d) return 78; // đồng hành
  if (SHENG[d] === y) return 92; // đại vận sinh năm — rất thuận
  if (SHENG[y] === d) return 46; // năm sinh đại vận — hao tổn nhẹ
  if (KHAC[d] === y) return 30; // đại vận khắc năm — kém
  return 55; // năm khắc đại vận — chật vật nhưng còn gắng được
}

/**
 * Dựng TOÀN BỘ tín hiệu NATAL + ĐẠI VẬN + LƯU NIÊN cho 1 lá số + năm xem.
 * Tín hiệu THÁNG (MONTHLY) tính riêng, chỉ khi cần (xem monthlySignals.ts) — đúng nguyên tắc
 * ENGINE_SPEC §15 "chỉ chạy monthly timing khi annualEventScore >= 55".
 */
export function buildAnnualContext(result: AstrologyResult, targetYear: number): AnnualSignalContext {
  const c = result.tuViChart;
  const targetAge = currentAgeOf(result, new Date(targetYear, 0, 1));
  const { stem: yearStem, branch: yearBranch } = yearCanChi(targetYear);

  const dv = result.daiVans.find(d => targetAge >= d.startAge && targetAge <= d.endAge) ?? null;
  const tv = result.tieuVans.find(t => t.year === targetYear);

  const signals: AstrologySignal[] = [...natalSignals(c)];
  let daHanStructuralScore = 50;
  let daiVanScore: DaiVanScore | null = null;
  let luuNienDaHanRelationScore = 55;
  let daHanStem: HeavenlyStem | null = null;
  if (dv) {
    signals.push(...daHanSignals(result, dv.branch));
    daiVanScore = scoreDaiVan(result, dv);
    daHanStructuralScore = Math.max(0, Math.min(100, Math.round(daiVanScore.taiLoc - daiVanScore.thachThuc * 0.3)));
    luuNienDaHanRelationScore = luuNienVsDaHanScore(yearBranch, dv.branch);
    daHanStem = c.houses.find(x => x.branch === dv.branch)?.can ?? null;
  }
  signals.push(...annualSignals(result, yearStem, yearBranch));

  return {
    signals, targetAge, yearStem, yearBranch,
    daHanStructuralScore,
    tieuHanBranch: tv?.branch ?? null,
    luuNienDaHanRelationScore,
    daiVanScore,
    daHanBranch: dv?.branch ?? null,
    daHanStem,
  };
}
