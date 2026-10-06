/**
 * Đại Vận & Tiểu Vận theo TỬ VI (không phải Bát Tự).
 *
 * - Đại Vận: mỗi cung là 1 đại vận, tuổi khởi = Cục số, mỗi vận 10 năm,
 *   đi thuận/nghịch từ cung Mệnh (đã tính sẵn trong tuViEngine →
 *   houses[].daiVanStartAge / daiVanIndex). Can–Chi của đại vận lấy
 *   theo Can–Chi của chính cung đó.
 * - Tiểu Vận (tiểu hạn): khởi theo TAM HỢP tuổi (năm sinh):
 *     Thân–Tý–Thìn → khởi Tuất
 *     Dần–Ngọ–Tuất → khởi Thìn
 *     Tị–Dậu–Sửu  → khởi Mùi
 *     Hợi–Mão–Mùi → khởi Sửu
 *   Tuổi 1 tại cung khởi; Nam đi THUẬN, Nữ đi NGHỊCH, mỗi tuổi 1 cung.
 */

import type {
  BirthInfo, DaiVan, TieuVan, TuViChart, HeavenlyStem, EarthlyBranch, FiveElement,
} from '../types';
import { solarToLunar } from './lunarCalendar';
import { lunarBirthYear } from './ageUtil';
import { getBranchIndex } from '../data/napAm';

const STEM_ELEMENT: Record<HeavenlyStem, FiveElement> = {
  Giáp: 'Mộc', Ất: 'Mộc', Bính: 'Hỏa', Đinh: 'Hỏa',
  Mậu: 'Thổ', Kỷ: 'Thổ', Canh: 'Kim', Tân: 'Kim',
  Nhâm: 'Thủy', Quý: 'Thủy',
};
const STEMS: HeavenlyStem[] = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const BRANCHES: EarthlyBranch[] = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tị', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
/** Can–Chi của một năm âm lịch (vd 1984 → Giáp Tý). */
function yearCanChi(year: number): { stem: HeavenlyStem; branch: EarthlyBranch } {
  return { stem: STEMS[((year + 6) % 10 + 10) % 10], branch: BRANCHES[((year + 8) % 12 + 12) % 12] };
}

// Cung khởi tiểu hạn (tuổi 1) theo tam hợp địa chi NĂM SINH
function tieuHanStartBranchIdx(yearBranch: EarthlyBranch): number {
  const b = getBranchIndex(yearBranch); // Tý=0..Hợi=11
  // Thân(8) Tý(0) Thìn(4) → Tuất(10)
  if (b === 8 || b === 0 || b === 4) return 10;
  // Dần(2) Ngọ(6) Tuất(10) → Thìn(4)
  if (b === 2 || b === 6 || b === 10) return 4;
  // Tị(5) Dậu(9) Sửu(1) → Mùi(7)
  if (b === 5 || b === 9 || b === 1) return 7;
  // Hợi(11) Mão(3) Mùi(7) → Sửu(1)
  return 1;
}

function wealthOf(el: FiveElement, favorable: FiveElement[]): number {
  let s = 5;
  if (favorable.includes(el)) s += 3; else s -= 1;
  return Math.max(1, Math.min(10, s));
}

/**
 * Đại Vận theo Tử Vi: đọc từ chart.houses (đã có daiVanStartAge,
 * daiVanIndex tính theo Cục số + chiều từ Mệnh).
 */
export function calculateDaiVan(
  _birthInfo: BirthInfo,
  chart: TuViChart,
  favorableElements: FiveElement[],
): DaiVan[] {
  const list = chart.houses
    .filter(h => typeof h.daiVanStartAge === 'number')
    .slice()
    .sort((a, b) => (a.daiVanStartAge! - b.daiVanStartAge!));

  return list.map((h, i) => {
    const el = STEM_ELEMENT[h.can];
    return {
      index: i,
      startAge: h.daiVanStartAge!,
      endAge: h.daiVanStartAge! + 9,
      stem: h.can,
      branch: h.branch,
      element: el,
      wealthScore: wealthOf(el, favorableElements),
    };
  });
}

/**
 * Tiểu Vận theo Tử Vi (tiểu hạn): cung tiểu hạn từng tuổi.
 * branch = địa chi cung tiểu hạn; stem = Can của chính cung đó.
 */
export function calculateTieuVan(
  birthInfo: BirthInfo,
  chart: TuViChart,
  daiVans: DaiVan[],
): TieuVan[] {
  // Lá số nhập theo ÂM lịch: ngày/tháng/năm đã là âm lịch → KHÔNG đổi dương→âm lần nữa (trước đây đổi nhầm nên chi năm sinh,
  // và do đó cung khởi tiểu hạn, bị lệch với những người sinh gần Tết). Cách lấy chi năm khớp tuViEngine.calculateTuViChart.
  const isSolar = birthInfo.calendarType === 'solar';
  const yearBranch: EarthlyBranch = isSolar
    ? solarToLunar(birthInfo.day, birthInfo.month, birthInfo.year).yearBranch
    : BRANCHES[(birthInfo.year + 8) % 12];
  const solarYear = lunarBirthYear(birthInfo); // (tên cũ) = năm âm lịch sinh → tiểu vận tuổi n rơi đúng năm âm lịch n+năm sinh−1
  const startIdx = tieuHanStartBranchIdx(yearBranch);
  const dir = birthInfo.gender === 'nam' ? 1 : -1; // Nam thuận, Nữ nghịch

  // map nhanh branchIdx → house (lấy Can của cung)
  const byBranchIdx: Record<number, { stem: HeavenlyStem; branch: EarthlyBranch }> = {};
  for (const h of chart.houses) byBranchIdx[getBranchIndex(h.branch)] = { stem: h.can, branch: h.branch };

  const tieuVans: TieuVan[] = [];
  for (let age = 1; age <= 120; age++) {
    const bIdx = ((startIdx + dir * (age - 1)) % 12 + 12) % 12;
    const cung = byBranchIdx[bIdx];
    const dvIndex = daiVans.findIndex(dv => age >= dv.startAge && age <= dv.endAge);
    const stem = cung?.stem ?? 'Giáp';
    const yr = solarYear + age - 1;
    const yc = yearCanChi(yr);
    tieuVans.push({
      age,
      year: yr,
      stem,
      branch: cung?.branch ?? 'Tý',
      element: STEM_ELEMENT[stem],
      daiVanIndex: dvIndex >= 0 ? dvIndex : 0,
      yearStem: yc.stem,
      yearBranch: yc.branch,
    });
  }
  return tieuVans;
}
