/**
 * Bát Tự (Four Pillars of Destiny) calculation engine
 */

import type { BirthInfo, BatTuChart, Pillar, HeavenlyStem, EarthlyBranch, FiveElement } from '../types';
import { solarToLunar } from './lunarCalendar';
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
export const HIDDEN_STEMS: Record<EarthlyBranch, HeavenlyStem[]> = {
  Tý: ['Quý'],
  Sửu: ['Kỷ', 'Quý', 'Tân'],
  Dần: ['Giáp', 'Bính', 'Mậu'],
  Mão: ['Ất'],
  Thìn: ['Mậu', 'Ất', 'Quý'],
  Tị: ['Bính', 'Mậu', 'Canh'],
  Ngọ: ['Đinh', 'Kỷ'],
  Mùi: ['Kỷ', 'Đinh', 'Ất'],
  Thân: ['Canh', 'Nhâm', 'Mậu'],
  Dậu: ['Tân'],
  Tuất: ['Mậu', 'Tân', 'Đinh'],
  Hợi: ['Nhâm', 'Giáp'],
};

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

  // --- Year Pillar ---
  // Use lunar year
  const lunar = solarToLunar(solarDay, solarMonth, solarYear);
  const yearStemIdx = (lunar.year + 6) % 10;
  const yearBranchIdx = (lunar.year + 8) % 12;
  const yearStem = STEMS[yearStemIdx];
  const yearBranch = BRANCHES[yearBranchIdx];
  const yearPillar = buildPillar(yearStem, yearBranch, 'Năm');

  // --- Month Pillar ---
  // Month branch: based on lunar month 1=Dần...12=Sửu
  const monthBranch = MONTH_BRANCH[lunar.month - 1];
  const monthStemStart = MONTH_STEM_START[yearStem];
  const monthStemStartIdx = getStemIndex(monthStemStart);
  const monthStemIdx = (monthStemStartIdx + lunar.month - 1) % 10;
  const monthStem = STEMS[monthStemIdx];
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
  // Determine favorable/unfavorable based on day master strength
  const dayMasterCount = elementCounts[dayMasterElement];
  const totalCount = Object.values(elementCounts).reduce((a, b) => a + b, 0);
  const isStrong = dayMasterCount / totalCount > 0.3;

  // Five element cycle: generates (tương sinh),克s (tương khắc)
  const GENERATES: Record<FiveElement, FiveElement> = { Mộc: 'Hỏa', Hỏa: 'Thổ', Thổ: 'Kim', Kim: 'Thủy', Thủy: 'Mộc' };
  const CONTROLS: Record<FiveElement, FiveElement> = { Mộc: 'Thổ', Hỏa: 'Kim', Thổ: 'Thủy', Kim: 'Mộc', Thủy: 'Hỏa' };
  const GEN_BY: Record<FiveElement, FiveElement> = { Hỏa: 'Mộc', Thổ: 'Hỏa', Kim: 'Thổ', Thủy: 'Kim', Mộc: 'Thủy' };

  let favorableElements: FiveElement[];
  let unfavorableElements: FiveElement[];
  if (isStrong) {
    // Strong day master → favor what drains or controls it
    favorableElements = [GENERATES[dayMasterElement], CONTROLS[dayMasterElement]];
    unfavorableElements = [GEN_BY[dayMasterElement], dayMasterElement];
  } else {
    // Weak day master → favor what generates or same element
    favorableElements = [GEN_BY[dayMasterElement], dayMasterElement];
    unfavorableElements = [CONTROLS[dayMasterElement]];
  }

  return {
    pillars: [yearPillar, monthPillar, dayPillar, hourPillar],
    dayMaster: dayStem,
    dayMasterElement,
    elementCounts,
    favorableElements,
    unfavorableElements,
  };
}
