/**
 * Tử Vi Nam Phái calculation engine
 * Based on: Tử Vi Nam Phái - Lê Quang Lăng
 */

import type {
  BirthInfo, TuViChart, TuViHouse, LunarDate,
  HeavenlyStem, EarthlyBranch, FiveElement, CucSo,
} from '../types';
import { solarToLunar, getHourBranchIndex, getDayCanChi } from './lunarCalendar';
import {
  getCucSo, getNapAmName, getStemByIndex, getBranchByIndex,
  BRANCHES, STEMS, getStemIndex, getBranchIndex,
} from '../data/napAm';
import { placeAllStars, placeLuuStars, computeVongTruongSinhLabels } from './starPlacer';
import { isYangStem } from './vongTruongSinh';

// 12 cung — thứ tự chuẩn Tử Vi, đếm NGHỊCH chiều địa chi từ cung Mệnh:
// Mệnh → Huynh Đệ → Phu Thê → Tử Tức → Tài Bạch → Tật Ách → Thiên Di → Nô Bộc → Quan Lộc → Điền Trạch → Phúc Đức → Phụ Mẫu
const PALACE_NAMES_VI = [
  'Mệnh', 'Huynh Đệ', 'Phu Thê', 'Tử Tức', 'Tài Bạch', 'Tật Ách',
  'Thiên Di', 'Nô Bộc', 'Quan Lộc', 'Điền Trạch', 'Phúc Đức', 'Phụ Mẫu',
];

const BRANCH_ELEMENT: Record<EarthlyBranch, FiveElement> = {
  Tý: 'Thủy', Sửu: 'Thổ', Dần: 'Mộc', Mão: 'Mộc',
  Thìn: 'Thổ', Tị: 'Hỏa', Ngọ: 'Hỏa', Mùi: 'Thổ',
  Thân: 'Kim', Dậu: 'Kim', Tuất: 'Thổ', Hợi: 'Thủy',
};

// Parse element từ tên Nạp Âm (chữ cuối): "Đại Hải Thủy" → "Thủy"
function parseNapAmElement(napAm: string): FiveElement {
  const last = napAm.trim().split(/\s+/).pop() ?? '';
  if (last === 'Kim' || last === 'Mộc' || last === 'Thủy' || last === 'Hỏa' || last === 'Thổ') return last;
  return 'Thổ'; // fallback
}

// Mệnh chủ theo Mệnh branch (chuẩn altuvi)
const MENH_CHU_BY_BRANCH: Record<EarthlyBranch, string> = {
  Tý: 'Tham Lang',
  Sửu: 'Cự Môn', Hợi: 'Cự Môn',
  Dần: 'Liêm Trinh', Tuất: 'Liêm Trinh',
  Mão: 'Văn Khúc', Dậu: 'Văn Khúc',
  Thìn: 'Thiên Đồng', Thân: 'Thiên Đồng',
  Tị: 'Cự Môn', Mùi: 'Cự Môn',  // sửa từ Vũ Khúc → Cự Môn (per altuvi Giang Tỵ)
  Ngọ: 'Phá Quân',
};

// Thân chủ theo Chi năm sinh
const THAN_CHU_BY_YEAR_BRANCH: Record<EarthlyBranch, string> = {
  Tý: 'Hỏa Tinh', Ngọ: 'Hỏa Tinh',
  Sửu: 'Thiên Tướng', Mùi: 'Thiên Tướng',
  Dần: 'Thiên Lương', Thân: 'Thiên Lương',
  Mão: 'Thiên Đồng', Dậu: 'Thiên Đồng',
  Thìn: 'Văn Xương', Tuất: 'Văn Xương',
  Tị: 'Thiên Cơ', Hợi: 'Thiên Cơ',
};

// Can của cung Dần theo Can năm
function getDanCungCan(yearStem: HeavenlyStem): HeavenlyStem {
  const map: Record<HeavenlyStem, HeavenlyStem> = {
    Giáp: 'Bính', Kỷ: 'Bính',
    Ất: 'Mậu', Canh: 'Mậu',
    Bính: 'Canh', Tân: 'Canh',
    Đinh: 'Nhâm', Nhâm: 'Nhâm',
    Mậu: 'Giáp', Quý: 'Giáp',
  };
  return map[yearStem];
}

// Can của cung bất kỳ, dựa trên Can cung Dần
function getCungCanByBranch(yearStem: HeavenlyStem, branchIdx: number): HeavenlyStem {
  const danCan = getDanCungCan(yearStem);
  const danCanIdx = getStemIndex(danCan);
  // Dần là BRANCHES[2]. Từ Dần thuận 1 cung → Can +1
  // Thực tế: từ Dần thuận theo Mão, Thìn... mỗi cung Can +1
  const distFromDan = ((branchIdx - 2) % 12 + 12) % 12;
  return getStemByIndex((danCanIdx + distFromDan) % 10);
}

// Can của tháng âm lịch — theo Ngũ Hổ Độn
function getMonthCanChi(yearStem: HeavenlyStem, lunarMonth: number): { stem: HeavenlyStem; branch: EarthlyBranch } {
  // Tháng 1 Âm lịch bắt đầu từ Dần; Can tháng 1 theo năm Can
  const danCan = getDanCungCan(yearStem);
  const danCanIdx = getStemIndex(danCan);
  const stem = getStemByIndex((danCanIdx + (lunarMonth - 1)) % 10);
  const branchIdx = (2 + (lunarMonth - 1)) % 12; // Dần(2) + (month-1)
  return { stem, branch: getBranchByIndex(branchIdx) };
}

// Can giờ theo Can ngày (Ngũ Thử Độn)
function getHourCanChi(dayStem: HeavenlyStem, hour: number): { stem: HeavenlyStem; branch: EarthlyBranch } {
  const hourBranchIdx = getHourBranchIndex(hour);
  // Giờ Tý đầu tiên mỗi ngày có Can theo Can ngày:
  // Giáp/Kỷ ngày → giờ Tý = Giáp
  // Ất/Canh → Bính; Bính/Tân → Mậu; Đinh/Nhâm → Canh; Mậu/Quý → Nhâm
  const map: Record<HeavenlyStem, HeavenlyStem> = {
    Giáp: 'Giáp', Kỷ: 'Giáp',
    Ất: 'Bính', Canh: 'Bính',
    Bính: 'Mậu', Tân: 'Mậu',
    Đinh: 'Canh', Nhâm: 'Canh',
    Mậu: 'Nhâm', Quý: 'Nhâm',
  };
  const hourTyCan = map[dayStem];
  const startIdx = getStemIndex(hourTyCan);
  const stem = getStemByIndex((startIdx + hourBranchIdx) % 10);
  return { stem, branch: getBranchByIndex(hourBranchIdx) };
}

// An Tử Vi — công thức cổ điển Tử Vi Đẩu Số (Tử Vi Hàm Số):
//   K = ceil(D/C), R = K*C - D   (D = ngày âm, C = Cục số)
//   Cung "thương" = Dần + (K-1)  → offset từ Dần = K-1
//   R = 0:        pos = K - 1                  (chính tại cung thương)
//   R chẵn (>0):  pos = (K-1) + R              (CỘNG thuận R cung)
//   R lẻ:         pos = (K-1) - R              (LÙI nghịch R cung)
// Verify (đối chiếu altuvi):
//   Kim Tứ Cục D=6 C=4 → K=2 R=2 (chẵn) → pos=3 → Tị ✓ (lá Test 1977)
//   Kim Tứ Cục D=1 → K=1 R=3 (lẻ) → pos=-3 → Hợi ✓
//   Kim Tứ Cục D=2 → K=1 R=2 (chẵn) → pos=2 → Thìn ✓
//   Kim Tứ Cục D=3 → K=1 R=1 (lẻ) → pos=-1 → Sửu ✓
//   Kim Tứ Cục D=4 → K=1 R=0 → pos=0 → Dần ✓
//   Thảo D=4 C=6 → K=1 R=2 (chẵn) → pos=2 → Thìn ✓
//   Mạnh D=29 C=3 → K=10 R=1 (lẻ) → pos=8 → Tuất ✓
function anTuVi(ngaySinh: number, cucSo: CucSo): number {
  if (!Number.isFinite(ngaySinh) || !Number.isFinite(cucSo) || cucSo <= 0) {
    return 0;
  }
  const K = Math.ceil(ngaySinh / cucSo);
  const R = K * cucSo - ngaySinh;
  let posFromDan: number;
  if (R === 0) {
    posFromDan = K - 1;
  } else if (R % 2 === 0) {
    posFromDan = (K - 1) + R;
  } else {
    posFromDan = (K - 1) - R;
  }
  posFromDan = ((Math.round(posFromDan) % 12) + 12) % 12;
  return (posFromDan + 2) % 12; // Dần idx = 2
}

// JD từ năm/tháng/ngày dương
function jdFromSolar(dd: number, mm: number, yy: number): number {
  const a = Math.floor((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  if (jd < 2299161) {
    jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
  }
  return jd;
}

export function calculateTuViChart(birthInfo: BirthInfo, viewingYear?: number): TuViChart {
  // Step 1: Lunar date
  let lunar: LunarDate;
  let solarYear = birthInfo.year, solarMonth = birthInfo.month, solarDay = birthInfo.day;
  if (birthInfo.calendarType === 'solar') {
    lunar = solarToLunar(birthInfo.day, birthInfo.month, birthInfo.year);
  } else {
    lunar = {
      year: birthInfo.year,
      month: birthInfo.month,
      day: birthInfo.day,
      isLeapMonth: birthInfo.isLeapMonth ?? false,
      yearStem: getStemByIndex((birthInfo.year + 6) % 10),
      yearBranch: getBranchByIndex((birthInfo.year + 8) % 12),
    };
    // Convert lunar → solar (best-effort for day/month CanChi)
    // For now keep solar fields as passed-in; users who input lunar usually don't need solar display
  }

  // Step 2: (placeholder — Cục số tính sau khi có Mệnh cung)
  const cucName_placeholder = '';

  // Step 3: Mệnh cung + Thân cung
  const hourBranchIdx = getHourBranchIndex(birthInfo.hour);
  // An Mệnh: từ Dần khởi tháng Giêng thuận, đến tháng sinh rồi nghịch theo giờ sinh
  // Mệnh = (Dần + month - 1) - hour = BRANCHES[(2 + month - 1 - hour + 12) % 12]
  const menhBranchIdx = ((2 + lunar.month - 1 - hourBranchIdx) % 12 + 12) % 12;
  // Thân = (Dần + month - 1) + hour
  const thanBranchIdx = ((2 + lunar.month - 1 + hourBranchIdx) % 12) % 12;
  const menhBranch = getBranchByIndex(menhBranchIdx);
  const thanBranch = getBranchByIndex(thanBranchIdx);

  // Step 5: Can Mệnh cung (cần trước khi tính Cục số)
  const menhCan = getCungCanByBranch(lunar.yearStem, menhBranchIdx);

  // Step 2 (revised): Cục số — dựa NẠP ÂM CỦA CUNG MỆNH (chính xác per Tử Vi)
  const cucSo = getCucSo(menhCan, menhBranch);
  const cucName = ({ 2: 'Thủy Nhị Cục', 3: 'Mộc Tam Cục', 4: 'Kim Tứ Cục', 5: 'Thổ Ngũ Cục', 6: 'Hỏa Lục Cục' } as const)[cucSo];

  // Step 4: An Tử Vi (giờ mới đúng cuc)
  const tuViBranchIdx = anTuVi(lunar.day, cucSo);

  // Step 6: Bản Mệnh = Nạp Âm năm sinh (không phải nạp âm cung Mệnh!)
  const napAmMenh = getNapAmName(lunar.yearStem, lunar.yearBranch);

  // Step 7: Mệnh chủ, Thân chủ
  const menhChu = MENH_CHU_BY_BRANCH[menhBranch];
  const thanChu = THAN_CHU_BY_YEAR_BRANCH[lunar.yearBranch];

  // Step 8: Âm Dương Thuận / Nghịch Lý
  //   - Direction for Đại Vận / Vòng Trường Sinh (gender + can year):
  //       Dương Nam | Âm Nữ → Đại Vận thuận
  //       Âm Nam   | Dương Nữ → Đại Vận nghịch
  //   - "Âm Dương Thuận / Nghịch Lý" hiển thị:
  //       Năm yin/yang KHỚP Mệnh chi yin/yang → Thuận
  //       Khác nhau → Nghịch
  const yang = isYangStem(lunar.yearStem);
  const isThuan = (birthInfo.gender === 'nam' && yang) || (birthInfo.gender === 'nu' && !yang);
  const YIN_BRANCHES = new Set<EarthlyBranch>(['Sửu', 'Mão', 'Tị', 'Mùi', 'Dậu', 'Hợi']);
  const menhBranchYang = !YIN_BRANCHES.has(menhBranch);
  const amDuongThuanLy: 'thuận' | 'nghịch' = (yang === menhBranchYang) ? 'thuận' : 'nghịch';

  // Step 9: 12 houses
  const houses: TuViHouse[] = [];
  for (let i = 0; i < 12; i++) {
    const branch = getBranchByIndex(i);
    // Cung an nghịch chiều từ Mệnh: palace 0 = Mệnh tại menhBranchIdx,
    // palace 1 (Phụ Mẫu) ở menhBranchIdx - 1, ...
    const palaceOffset = ((menhBranchIdx - i) % 12 + 12) % 12;
    const palaceName = PALACE_NAMES_VI[palaceOffset];
    const can = getCungCanByBranch(lunar.yearStem, i);
    houses.push({
      branch,
      palaceName,
      isManh: i === menhBranchIdx,
      isThan: i === thanBranchIdx,
      stars: [],
      can,
      element: BRANCH_ELEMENT[branch],
    });
  }

  // Step 10: Đặt sao
  const { tuanAt, trietAt } = placeAllStars(houses, tuViBranchIdx, lunar, birthInfo, cucSo, menhBranchIdx, isThuan);

  // Step 11: Vòng Trường Sinh labels
  const vongTSLabels = computeVongTruongSinhLabels(cucSo, lunar.yearStem, birthInfo.gender);
  for (const h of houses) {
    h.vongTruongSinh = vongTSLabels[h.branch];
  }

  // Step 12: Đại Vận start ages (theo Cục)
  // Cực số = tuổi khởi Đại Vận tại cung Mệnh
  // Nam Dương/Nữ Âm → thuận (Đại Vận đi thuận từ Mệnh); else nghịch
  const direction = isThuan ? 1 : -1;
  for (let step = 0; step < 12; step++) {
    const branchIdx = ((menhBranchIdx + direction * step) % 12 + 12) % 12;
    houses[branchIdx].daiVanStartAge = cucSo + step * 10;
    houses[branchIdx].daiVanIndex = step + 1;
  }

  // Step 13: Tuần / Triệt flags
  for (const h of houses) {
    if (tuanAt.includes(h.branch)) h.tuanAt = true;
    if (trietAt.includes(h.branch)) h.trietAt = true;
  }

  // Step 13b: Tháng tại mỗi cung — Quy tắc Tử Vi Nam Phái.
  //   yangCount = 0 (Yin năm + Yin Mệnh), 1 (1 yang), 2 (cả 2 yang)
  //   Nam: offset = yangCount × (yangCount + 1)  → 0, 2, 6 (thuận chi từ Mệnh)
  //   Nữ: offset = -2 × (1 + yangCount)          → -2, -4, -6 (nghịch chi)
  //   T.1 = (menh + offset) % 12, sau đó tất cả đếm THUẬN chiều địa chi.
  const yangCount = (yang ? 1 : 0) + (menhBranchYang ? 1 : 0);
  const monthOffset = birthInfo.gender === 'nam'
    ? yangCount * (yangCount + 1)
    : -2 * (1 + yangCount);
  const monthAnchorIdx = ((menhBranchIdx + monthOffset) % 12 + 12) % 12;
  for (let i = 0; i < 12; i++) {
    houses[i].monthIndex = ((i - monthAnchorIdx) % 12 + 12) % 12 + 1;
  }

  // Step 14: Năm xem + Lưu tinh
  const vy = viewingYear ?? new Date().getFullYear();
  const viewingYearStem = getStemByIndex((vy + 6) % 10);
  const viewingYearBranch = getBranchByIndex((vy + 8) % 12);
  const viewingAge = vy - solarYear + 1; // Tính theo tuổi mụ

  placeLuuStars(houses, viewingYearStem, viewingYearBranch, birthInfo.gender);

  // Step 15: Can Chi tháng/ngày/giờ (cho header)
  const { stem: monthStem, branch: monthBranch } = getMonthCanChi(lunar.yearStem, lunar.month);
  let dayStem: HeavenlyStem = 'Giáp';
  let dayBranch: EarthlyBranch = 'Tý';
  let hourStem: HeavenlyStem = 'Giáp';
  let hourBranch: EarthlyBranch = 'Tý';
  try {
    const jd = jdFromSolar(solarDay, solarMonth, solarYear);
    const dc = getDayCanChi(jd);
    dayStem = dc.stem; dayBranch = dc.branch;
    const hc = getHourCanChi(dayStem, birthInfo.hour);
    hourStem = hc.stem; hourBranch = hc.branch;
  } catch {}

  return {
    lunarDate: lunar,
    cucSo,
    cucName,
    menhCung: menhBranch,
    thanCung: thanBranch,
    menhCan,
    // Mệnh element = element of Bản Mệnh (Nạp Âm năm sinh) — parse từ napAmMenh string
    // VD: "Đại Hải Thủy" → "Thủy", "Thiên Thượng Hỏa" → "Hỏa"
    menhElement: parseNapAmElement(napAmMenh),
    napAmMenh,
    menhChu,
    thanChu,
    amDuongThuanLy,
    viewingYear: vy,
    viewingAge,
    viewingYearStem,
    viewingYearBranch,
    monthStem,
    monthBranch,
    dayStem,
    dayBranch,
    hourStem,
    hourBranch,
    tuanAt,
    trietAt,
    houses,
  };
}
