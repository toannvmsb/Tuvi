/**
 * Bát Tự (Four Pillars of Destiny) calculation engine
 */

import type { BirthInfo, BatTuChart, Pillar, HeavenlyStem, EarthlyBranch, FiveElement } from '../types';
import { HIDDEN_STEMS } from './baziTables';
import { truePillars } from './baziPillars';
import { assessDayMasterStrength } from './batTuStrength';
import { getStemByIndex, getBranchByIndex, getStemIndex, getBranchIndex } from '../data/napAm';

const STEMS: HeavenlyStem[] = ['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];
const BRANCHES: EarthlyBranch[] = ['Tý','Sửu','Dần','Mão','Thìn','Tị','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];

// Five element for each stem
const STEM_ELEMENT: Record<HeavenlyStem, FiveElement> = {
  Giáp: 'Mộc', Ất: 'Mộc', Bính: 'Hỏa', Đinh: 'Hỏa',
  Mậu: 'Thổ', Kỷ: 'Thổ', Canh: 'Kim', Tân: 'Kim',
  Nhâm: 'Thủy', Quý: 'Thủy',
};

// Yin/Yang for stems (0=Dương, 1=Âm — even index=Dương)
function isStemYang(stem: HeavenlyStem): boolean {
  return getStemIndex(stem) % 2 === 0;
}

// Hidden stems (Tàng Can) for each earthly branch
export { HIDDEN_STEMS };

// Month branch for each lunar month (1-12)
const MONTH_BRANCH: EarthlyBranch[] = [
  'Dần','Mão','Thìn','Tị','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi','Tý','Sửu'
];

// Month stem start by year stem (for month 1 Dần)
// Rule: Giáp/Kỷ→Bính, Ất/Canh→Mậu, Bính/Tân→Canh, Đinh/Nhâm→Nhâm, Mậu/Quý→Giáp
const MONTH_STEM_START: Record<HeavenlyStem, HeavenlyStem> = {
  Giáp: 'Bính', Kỷ: 'Bính',
  Ất: 'Mậu', Canh: 'Mậu',
  Bính: 'Canh', Tân: 'Canh',
  Đinh: 'Nhâm', Nhâm: 'Nhâm',
  Mậu: 'Giáp', Quý: 'Giáp',
};

// Hour stem start by day stem (for hour Tý)
const HOUR_STEM_START: Record<HeavenlyStem, HeavenlyStem> = {
  Giáp: 'Giáp', Kỷ: 'Giáp',
  Ất: 'Bính', Canh: 'Bính',
  Bính: 'Mậu', Tân: 'Mậu',
  Đinh: 'Canh', Nhâm: 'Canh',
  Mậu: 'Nhâm', Quý: 'Nhâm',
};

function jdFromDate(dd: number, mm: number, yy: number): number {
  const a = Math.floor((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  if (jd < 2299161) {
    jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
  }
  return jd;
}

function buildPillar(stem: HeavenlyStem, branch: EarthlyBranch, label: string): Pillar {
  return {
    stem,
    branch,
    hiddenStems: HIDDEN_STEMS[branch] || [],
    element: STEM_ELEMENT[stem],
    label,
  };
}

export function calculateBatTu(birthInfo: BirthInfo): BatTuChart {
  // Determine solar date
  let solarDay = birthInfo.day;
  let solarMonth = birthInfo.month;
  let solarYear = birthInfo.year;

  if (birthInfo.calendarType === 'lunar') {
    const { solarToLunar: _ignore, lunarToSolar } = require('./lunarCalendar');
    const solar = lunarToSolar(birthInfo.day, birthInfo.month, birthInfo.year, birthInfo.isLeapMonth ?? false);
    solarDay = solar.day;
    solarMonth = solar.month;
    solarYear = solar.year;
  }

  // --- Year + Month Pillar: THEO TIẾT KHÍ (đúng phép Bát Tự) ---
  // Trụ năm đổi ở Lập Xuân; trụ tháng đổi ở 12 tiết (Lập Xuân→Dần … Tiểu Hàn→Sửu). Trước 06/10/2026 file này lấy năm/tháng ÂM LỊCH
  // (sai trụ tháng ~17% người, trụ năm ~2% — xem core/baziPillars.ts).
  const tp = truePillars(new Date(solarYear, solarMonth - 1, solarDay));
  const yearStem = tp.yearStem;
  const yearBranch = tp.yearBranch;
  const yearPillar = buildPillar(yearStem, yearBranch, 'Năm');
  const monthStem = tp.monthStem;
  const monthBranch = tp.monthBranch;
  const monthPillar = buildPillar(monthStem, monthBranch, 'Tháng');

  // --- Day Pillar ---
  const jd = jdFromDate(solarDay, solarMonth, solarYear);
  const dayStemIdx = (jd + 9) % 10;
  const dayBranchIdx = (jd + 1) % 12;
  const dayStem = STEMS[((dayStemIdx % 10) + 10) % 10];
  const dayBranch = BRANCHES[((dayBranchIdx % 12) + 12) % 12];
  const dayPillar = buildPillar(dayStem, dayBranch, 'Ngày');

  // --- Hour Pillar ---
  const hourBranchIdx = Math.floor(((birthInfo.hour + 1) % 24) / 2);
  const hourBranch = BRANCHES[hourBranchIdx];
  const hourStemStart = HOUR_STEM_START[dayStem];
  const hourStemStartIdx = getStemIndex(hourStemStart);
  const hourStemIdx = (hourStemStartIdx + hourBranchIdx) % 10;
  const hourStem = STEMS[hourStemIdx];
  const hourPillar = buildPillar(hourStem, hourBranch, 'Giờ');

  // --- Five element analysis ---
  const allStems = [yearStem, monthStem, dayStem, hourStem];
  const allBranches = [yearBranch, monthBranch, dayBranch, hourBranch];
  const allHiddenStems = allBranches.flatMap(b => HIDDEN_STEMS[b] || []);

  const elementCounts: Record<FiveElement, number> = { Kim: 0, Mộc: 0, Thủy: 0, Hỏa: 0, Thổ: 0 };
  for (const s of allStems) elementCounts[STEM_ELEMENT[s]]++;
  for (const s of allHiddenStems) elementCounts[STEM_ELEMENT[s]] += 0.5;

  const dayMasterElement = STEM_ELEMENT[dayStem];
  // Dụng/kỵ thần: phép phù ức (thân vượng/nhược, tháng lệnh nặng nhất) — core/batTuStrength.ts, dùng chung với Nghiệm quá khứ/Luận tương lai.
  const pillarsArr = [yearPillar, monthPillar, dayPillar, hourPillar];
  const { favorable: favorableElements, unfavorable: unfavorableElements } = assessDayMasterStrength(dayStem, pillarsArr);

  return {
    pillars: [yearPillar, monthPillar, dayPillar, hourPillar],
    dayMaster: dayStem,
    dayMasterElement,
    elementCounts,
    favorableElements,
    unfavorableElements,
  };
}
