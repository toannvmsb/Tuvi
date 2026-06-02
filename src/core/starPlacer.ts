/**
 * An sao (Star Placement) — Tử Vi Nam Phái
 * Theo Lê Quang Lăng, đầy đủ ~80 sao chính tinh + phụ tinh + lưu tinh.
 */

import type {
  TuViHouse, LunarDate, BirthInfo, CucSo, EarthlyBranch, HeavenlyStem, Gender,
} from '../types';
import { getBranchByIndex, getBranchIndex, getStemIndex, BRANCHES, STEMS } from '../data/napAm';
import { calculateVongTruongSinh, isYangStem } from './vongTruongSinh';
import { calculateVongThaiTue } from './vongThaiTue';
import { calculateVongLocTon } from './vongLocTon';
import { getBrightnessCode, getBrightnessCodeOrDefault, BRIGHTNESS_CODE_TO_LONG } from './starBrightness';

// ============================================================
// Helper
// ============================================================
function addStar(
  houses: TuViHouse[],
  branchIdx: number,
  name: string,
  type: 'chinh' | 'cat' | 'hung' | 'trung' | 'luu',
) {
  // Bảo vệ NaN / Infinity → bỏ qua sao đó để không crash app
  if (!Number.isFinite(branchIdx)) return;
  const idx = ((Math.floor(branchIdx) % 12) + 12) % 12;
  const branch = BRANCHES[idx];
  if (!houses[idx] || !branch) return;
  // CHỈ gán brightness cho sao có entry trong BRIGHTNESS_TABLE (chính tinh, lục cát/sát, tứ hóa, một số phụ tinh)
  // Các sao phụ khác không có brightness truyền thống → không hiển thị suffix
  const code = getBrightnessCode(name, branch);
  const brightness = code ? BRIGHTNESS_CODE_TO_LONG[code] : undefined;
  houses[idx].stars.push({ name, type, brightness });
}

function addStarByBranch(
  houses: TuViHouse[],
  branch: EarthlyBranch | undefined,
  name: string,
  type: 'chinh' | 'cat' | 'hung' | 'trung' | 'luu',
) {
  if (!branch) return;
  addStar(houses, getBranchIndex(branch), name, type);
}

// ============================================================
// 14 Chính Tinh
// ============================================================
const TU_VI_GROUP: Array<{ name: string; offset: number }> = [
  { name: 'Tử Vi', offset: 0 },
  { name: 'Thiên Cơ', offset: -1 },
  { name: 'Thái Dương', offset: -3 },
  { name: 'Vũ Khúc', offset: -4 },
  { name: 'Thiên Đồng', offset: -5 },
  { name: 'Liêm Trinh', offset: -8 },
];
const THIEN_PHU_GROUP: Array<{ name: string; offset: number }> = [
  { name: 'Thiên Phủ', offset: 0 },
  { name: 'Thái Âm', offset: 1 },
  { name: 'Tham Lang', offset: 2 },
  { name: 'Cự Môn', offset: 3 },
  { name: 'Thiên Tướng', offset: 4 },
  { name: 'Thiên Lương', offset: 5 },
  { name: 'Thất Sát', offset: 6 },
  { name: 'Phá Quân', offset: 10 },
];

// ============================================================
// Lookup tables — by Can năm
// ============================================================
const LOC_TON_BY_STEM: Record<HeavenlyStem, EarthlyBranch> = {
  Giáp: 'Dần', Ất: 'Mão', Bính: 'Tị', Đinh: 'Ngọ', Mậu: 'Tị',
  Kỷ: 'Ngọ', Canh: 'Thân', Tân: 'Dậu', Nhâm: 'Hợi', Quý: 'Tý',
};
const VAN_XUONG_BY_STEM: Record<HeavenlyStem, EarthlyBranch> = {
  Giáp: 'Tị', Ất: 'Ngọ', Bính: 'Thân', Đinh: 'Dậu', Mậu: 'Thân',
  Kỷ: 'Dậu', Canh: 'Hợi', Tân: 'Tý', Nhâm: 'Dần', Quý: 'Mão',
};
const VAN_KHUC_BY_STEM: Record<HeavenlyStem, EarthlyBranch> = {
  Giáp: 'Dậu', Ất: 'Thân', Bính: 'Ngọ', Đinh: 'Tị', Mậu: 'Ngọ',
  Kỷ: 'Tị', Canh: 'Mão', Tân: 'Dần', Nhâm: 'Tý', Quý: 'Hợi',
};
const THIEN_KHOI_BY_STEM: Record<HeavenlyStem, EarthlyBranch> = {
  Giáp: 'Sửu', Ất: 'Tý', Bính: 'Hợi', Đinh: 'Hợi', Mậu: 'Sửu',
  Kỷ: 'Tý', Canh: 'Sửu', Tân: 'Ngọ', Nhâm: 'Mão', Quý: 'Mão',
};
const THIEN_VIET_BY_STEM: Record<HeavenlyStem, EarthlyBranch> = {
  Giáp: 'Mùi', Ất: 'Thân', Bính: 'Dậu', Đinh: 'Dậu', Mậu: 'Mùi',
  Kỷ: 'Thân', Canh: 'Mùi', Tân: 'Dần', Nhâm: 'Tị', Quý: 'Tị',
};
const KINH_DUONG_BY_STEM: Record<HeavenlyStem, EarthlyBranch> = {
  Giáp: 'Mão', Ất: 'Thìn', Bính: 'Ngọ', Đinh: 'Mùi', Mậu: 'Ngọ',
  Kỷ: 'Mùi', Canh: 'Dậu', Tân: 'Tuất', Nhâm: 'Tý', Quý: 'Sửu',
};
const DA_LA_BY_STEM: Record<HeavenlyStem, EarthlyBranch> = {
  Giáp: 'Sửu', Ất: 'Dần', Bính: 'Thìn', Đinh: 'Tị', Mậu: 'Thìn',
  Kỷ: 'Tị', Canh: 'Mùi', Tân: 'Thân', Nhâm: 'Tuất', Quý: 'Hợi',
};
const THIEN_QUAN_BY_STEM: Record<HeavenlyStem, EarthlyBranch> = {
  Giáp: 'Mùi', Ất: 'Thìn', Bính: 'Tị', Đinh: 'Dần', Mậu: 'Mão',
  Kỷ: 'Dậu', Canh: 'Hợi', Tân: 'Dậu', Nhâm: 'Tuất', Quý: 'Ngọ',
};
const THIEN_PHUC_BY_STEM: Record<HeavenlyStem, EarthlyBranch> = {
  Giáp: 'Dậu', Ất: 'Thân', Bính: 'Tý', Đinh: 'Hợi', Mậu: 'Mão',
  Kỷ: 'Dần', Canh: 'Ngọ', Tân: 'Tị', Nhâm: 'Ngọ', Quý: 'Tị',
};
const LUU_HA_BY_STEM: Record<HeavenlyStem, EarthlyBranch> = {
  Giáp: 'Dậu', Ất: 'Tuất', Bính: 'Mùi', Đinh: 'Thân', Mậu: 'Tị',
  Kỷ: 'Ngọ', Canh: 'Thìn', Tân: 'Mão', Nhâm: 'Hợi', Quý: 'Dần',
};
const QUOC_AN_BY_STEM: Record<HeavenlyStem, EarthlyBranch> = {
  Giáp: 'Tuất', Ất: 'Hợi', Bính: 'Sửu', Đinh: 'Dần', Mậu: 'Sửu',
  Kỷ: 'Dần', Canh: 'Thìn', Tân: 'Tị', Nhâm: 'Mùi', Quý: 'Thân',
};
// Đường Phù — công thức: Lộc Tồn + 5 cung thuận chiều
const DUONG_PHU_BY_STEM: Record<HeavenlyStem, EarthlyBranch> = {
  Giáp: 'Mùi',   // Dần + 5
  Ất: 'Thân',    // Mão + 5
  Bính: 'Tuất',  // Tị + 5
  Đinh: 'Hợi',   // Ngọ + 5
  Mậu: 'Tuất',   // Tị + 5
  Kỷ: 'Hợi',     // Ngọ + 5
  Canh: 'Sửu',   // Thân + 5
  Tân: 'Dần',    // Dậu + 5
  Nhâm: 'Thìn',  // Hợi + 5
  Quý: 'Tị',     // Tý + 5
};
const THIEN_TRU_BY_STEM: Record<HeavenlyStem, EarthlyBranch> = {
  Giáp: 'Tị', Ất: 'Ngọ', Bính: 'Tý', Đinh: 'Tị', Mậu: 'Ngọ',
  Kỷ: 'Thân', Canh: 'Dần', Tân: 'Ngọ', Nhâm: 'Dậu', Quý: 'Tuất',
};

// Tứ Hóa theo Can năm: [Lộc, Quyền, Khoa, Kỵ]
const HOA_TRANSFORMS: Record<HeavenlyStem, [string, string, string, string]> = {
  Giáp: ['Liêm Trinh', 'Phá Quân', 'Vũ Khúc', 'Thái Dương'],
  Ất: ['Thiên Cơ', 'Thiên Lương', 'Tử Vi', 'Thái Âm'],
  Bính: ['Thiên Đồng', 'Thiên Cơ', 'Văn Xương', 'Liêm Trinh'],
  Đinh: ['Thái Âm', 'Thiên Đồng', 'Thiên Cơ', 'Cự Môn'],
  Mậu: ['Tham Lang', 'Thái Âm', 'Hữu Bật', 'Thiên Cơ'],
  Kỷ: ['Vũ Khúc', 'Tham Lang', 'Thiên Lương', 'Văn Khúc'],
  Canh: ['Thái Dương', 'Vũ Khúc', 'Thái Âm', 'Thiên Đồng'],
  Tân: ['Cự Môn', 'Thái Dương', 'Văn Khúc', 'Văn Xương'],
  Nhâm: ['Thiên Lương', 'Tử Vi', 'Tả Phù', 'Vũ Khúc'],
  Quý: ['Phá Quân', 'Cự Môn', 'Thái Âm', 'Tham Lang'],
};

// ============================================================
// Lookup tables — by Chi năm
// ============================================================
const THIEN_MA_BY_BRANCH: Record<EarthlyBranch, EarthlyBranch> = {
  Dần: 'Thân', Ngọ: 'Thân', Tuất: 'Thân',
  Thân: 'Dần', Tý: 'Dần', Thìn: 'Dần',
  Tị: 'Hợi', Dậu: 'Hợi', Sửu: 'Hợi',
  Hợi: 'Tị', Mão: 'Tị', Mùi: 'Tị',
};
const DAO_HOA_BY_BRANCH: Record<EarthlyBranch, EarthlyBranch> = {
  Dần: 'Mão', Ngọ: 'Mão', Tuất: 'Mão',
  Thân: 'Dậu', Tý: 'Dậu', Thìn: 'Dậu',
  Tị: 'Ngọ', Dậu: 'Ngọ', Sửu: 'Ngọ',
  Hợi: 'Tý', Mão: 'Tý', Mùi: 'Tý',
};
const HOA_CAI_BY_BRANCH: Record<EarthlyBranch, EarthlyBranch> = {
  Dần: 'Tuất', Ngọ: 'Tuất', Tuất: 'Tuất',
  Thân: 'Thìn', Tý: 'Thìn', Thìn: 'Thìn',
  Tị: 'Sửu', Dậu: 'Sửu', Sửu: 'Sửu',
  Hợi: 'Mùi', Mão: 'Mùi', Mùi: 'Mùi',
};
const KIEP_SAT_BY_BRANCH: Record<EarthlyBranch, EarthlyBranch> = {
  Dần: 'Hợi', Ngọ: 'Hợi', Tuất: 'Hợi',
  Thân: 'Tị', Tý: 'Tị', Thìn: 'Tị',
  Tị: 'Dần', Dậu: 'Dần', Sửu: 'Dần',
  Hợi: 'Thân', Mão: 'Thân', Mùi: 'Thân',
};
const PHA_TOAI_BY_BRANCH: Record<EarthlyBranch, EarthlyBranch> = {
  Tý: 'Tị', Ngọ: 'Tị', Mão: 'Tị', Dậu: 'Tị',
  Dần: 'Dậu', Thân: 'Dậu', Tị: 'Dậu', Hợi: 'Dậu',
  Thìn: 'Sửu', Tuất: 'Sửu', Sửu: 'Sửu', Mùi: 'Sửu',
};
const CO_THAN_BY_BRANCH: Record<EarthlyBranch, EarthlyBranch> = {
  Dần: 'Tị', Mão: 'Tị', Thìn: 'Tị',
  Tị: 'Thân', Ngọ: 'Thân', Mùi: 'Thân',
  Thân: 'Hợi', Dậu: 'Hợi', Tuất: 'Hợi',
  Hợi: 'Dần', Tý: 'Dần', Sửu: 'Dần',
};
const QUA_TU_BY_BRANCH: Record<EarthlyBranch, EarthlyBranch> = {
  Dần: 'Sửu', Mão: 'Sửu', Thìn: 'Sửu',
  Tị: 'Thìn', Ngọ: 'Thìn', Mùi: 'Thìn',
  Thân: 'Mùi', Dậu: 'Mùi', Tuất: 'Mùi',
  Hợi: 'Tuất', Tý: 'Tuất', Sửu: 'Tuất',
};
// Hồng Loan: khởi Mão cho năm Tý, nghịch 1 cung mỗi năm (Tý→Mão, Sửu→Dần, Dần→Sửu, ...)
function getHongLoanBranch(yearBranch: EarthlyBranch): EarthlyBranch {
  const yi = getBranchIndex(yearBranch);
  // Tý (0) → Mão (3); nghịch 1 mỗi bước
  const idx = ((3 - yi) % 12 + 12) % 12;
  return BRANCHES[idx];
}
// Thiên Hỷ = đối xung Hồng Loan (+6)
function getThienHyBranch(yearBranch: EarthlyBranch): EarthlyBranch {
  const hl = getHongLoanBranch(yearBranch);
  return BRANCHES[(getBranchIndex(hl) + 6) % 12];
}

const LONG_TRI_BY_BRANCH: Record<EarthlyBranch, EarthlyBranch> = {
  Tý: 'Thìn', Sửu: 'Tị', Dần: 'Ngọ', Mão: 'Mùi',
  Thìn: 'Thân', Tị: 'Dậu', Ngọ: 'Tuất', Mùi: 'Hợi',
  Thân: 'Tý', Dậu: 'Sửu', Tuất: 'Dần', Hợi: 'Mão',
};
const PHUONG_CAC_BY_BRANCH: Record<EarthlyBranch, EarthlyBranch> = {
  Tý: 'Tuất', Sửu: 'Dậu', Dần: 'Thân', Mão: 'Mùi',
  Thìn: 'Ngọ', Tị: 'Tị', Ngọ: 'Thìn', Mùi: 'Mão',
  Thân: 'Dần', Dậu: 'Sửu', Tuất: 'Tý', Hợi: 'Hợi',
};
const GIAI_THAN_BY_BRANCH: Record<EarthlyBranch, EarthlyBranch> = {
  Tý: 'Tuất', Sửu: 'Dậu', Dần: 'Thân', Mão: 'Mùi',
  Thìn: 'Ngọ', Tị: 'Tị', Ngọ: 'Thìn', Mùi: 'Mão',
  Thân: 'Dần', Dậu: 'Sửu', Tuất: 'Tý', Hợi: 'Hợi',
};
const THIEN_KHOC_BY_BRANCH: Record<EarthlyBranch, EarthlyBranch> = {
  Tý: 'Ngọ', Sửu: 'Tị', Dần: 'Thìn', Mão: 'Mão',
  Thìn: 'Dần', Tị: 'Sửu', Ngọ: 'Tý', Mùi: 'Hợi',
  Thân: 'Tuất', Dậu: 'Dậu', Tuất: 'Thân', Hợi: 'Mùi',
};
const THIEN_HU_BY_BRANCH: Record<EarthlyBranch, EarthlyBranch> = {
  Tý: 'Ngọ', Sửu: 'Mùi', Dần: 'Thân', Mão: 'Dậu',
  Thìn: 'Tuất', Tị: 'Hợi', Ngọ: 'Tý', Mùi: 'Sửu',
  Thân: 'Dần', Dậu: 'Mão', Tuất: 'Thìn', Hợi: 'Tị',
};
const THIEN_DUC_BY_BRANCH: Record<EarthlyBranch, EarthlyBranch> = {
  Tý: 'Dậu', Sửu: 'Tuất', Dần: 'Hợi', Mão: 'Tý',
  Thìn: 'Sửu', Tị: 'Dần', Ngọ: 'Mão', Mùi: 'Thìn',
  Thân: 'Tị', Dậu: 'Ngọ', Tuất: 'Mùi', Hợi: 'Thân',
};
const NGUYET_DUC_BY_BRANCH: Record<EarthlyBranch, EarthlyBranch> = {
  Tý: 'Tị', Sửu: 'Ngọ', Dần: 'Mùi', Mão: 'Thân',
  Thìn: 'Dậu', Tị: 'Tuất', Ngọ: 'Hợi', Mùi: 'Tý',
  Thân: 'Sửu', Dậu: 'Dần', Tuất: 'Mão', Hợi: 'Thìn',
};
const THIEN_TAI_BY_BRANCH: Record<EarthlyBranch, EarthlyBranch> = {
  // Khởi ở Mệnh, đi thuận theo Chi năm — đây là simplified fallback
  Tý: 'Dần', Sửu: 'Mão', Dần: 'Thìn', Mão: 'Tị',
  Thìn: 'Ngọ', Tị: 'Mùi', Ngọ: 'Thân', Mùi: 'Dậu',
  Thân: 'Tuất', Dậu: 'Hợi', Tuất: 'Tý', Hợi: 'Sửu',
};
const THIEN_THO_BY_BRANCH: Record<EarthlyBranch, EarthlyBranch> = {
  Tý: 'Dậu', Sửu: 'Tuất', Dần: 'Hợi', Mão: 'Tý',
  Thìn: 'Sửu', Tị: 'Dần', Ngọ: 'Mão', Mùi: 'Thìn',
  Thân: 'Tị', Dậu: 'Ngọ', Tuất: 'Mùi', Hợi: 'Thân',
};

// ============================================================
// Stars by birth month
// ============================================================
const TA_PHU_BY_MONTH: EarthlyBranch[] = [
  'Thìn', 'Tị', 'Ngọ', 'Mùi', 'Thân', 'Dậu',
  'Tuất', 'Hợi', 'Tý', 'Sửu', 'Dần', 'Mão',
];
const HUU_BAT_BY_MONTH: EarthlyBranch[] = [
  'Tuất', 'Dậu', 'Thân', 'Mùi', 'Ngọ', 'Tị',
  'Thìn', 'Mão', 'Dần', 'Sửu', 'Tý', 'Hợi',
];
// Thai Phụ: tháng 1 → Ngọ, thuận 1 mỗi tháng
const THAI_PHU_BY_MONTH: EarthlyBranch[] = [
  'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi',
  'Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tị',
];
// Phong Cáo: tháng 1 → Tý
const PHONG_CAO_BY_MONTH: EarthlyBranch[] = [
  'Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tị',
  'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi',
];
// Thiên Hình: tháng 1 → Dậu, thuận 1 mỗi tháng
const THIEN_HINH_BY_MONTH: EarthlyBranch[] = [
  'Dậu', 'Tuất', 'Hợi', 'Tý', 'Sửu', 'Dần',
  'Mão', 'Thìn', 'Tị', 'Ngọ', 'Mùi', 'Thân',
];
// Thiên Riêu: tháng 1 → Sửu, thuận 1 mỗi tháng
const THIEN_RIEU_BY_MONTH: EarthlyBranch[] = [
  'Sửu', 'Dần', 'Mão', 'Thìn', 'Tị', 'Ngọ',
  'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi', 'Tý',
];
// Thiên Y: tháng 1 → Sửu (giống Thiên Riêu trong nhiều bản — dùng công thức cải tiến)
const THIEN_Y_BY_MONTH: EarthlyBranch[] = [
  'Sửu', 'Dần', 'Mão', 'Thìn', 'Tị', 'Ngọ',
  'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi', 'Tý',
];

// ============================================================
// Tuần Không / Triệt Lộ
// ============================================================
// Tuần Không: 6 nhóm 60 năm theo Can Chi
//   Giáp Tý - Quý Dậu → Tuần tại Tuất-Hợi
//   Giáp Tuất - Quý Mùi → Tuần tại Thân-Dậu
//   Giáp Thân - Quý Tị → Tuần tại Ngọ-Mùi
//   Giáp Ngọ - Quý Mão → Tuần tại Thìn-Tị
//   Giáp Thìn - Quý Sửu → Tuần tại Dần-Mão
//   Giáp Dần - Quý Hợi → Tuần tại Tý-Sửu
function getTuanKhong(yearStem: HeavenlyStem, yearBranch: EarthlyBranch): [EarthlyBranch, EarthlyBranch] {
  const si = getStemIndex(yearStem);   // 0-9
  const bi = getBranchIndex(yearBranch); // 0-11
  // Mỗi nhóm 10 năm khởi từ Giáp (si=0). Trong cycle 60 năm, nếu năm hiện tại là Y
  // thì decade = số bước nhảy từ Giáp Tý đến Giáp khởi của decade này.
  // Năm Y có (si, bi) thoả: decade*10 + si ≡ bi (mod 12)
  //   ⇔ decade ≡ (bi - si)/2 * (-1) (mod 6)  vì 10 ≡ -2 (mod 12)
  //   ⇔ decade = ((si - bi)/2 mod 6)
  const diff = ((si - bi) % 12 + 12) % 12; // luôn chẵn vì si,bi cùng parity
  const decade = (diff / 2) % 6;
  // Decade 0 = Giáp Tý cycle, Tuần tại Tuất-Hợi (2 chi không có trong 10 năm Giáp Tý → Quý Dậu)
  // Decade 1 = Giáp Tuất cycle, Tuần tại Thân-Dậu, ...
  const tuanPairs: [EarthlyBranch, EarthlyBranch][] = [
    ['Tuất', 'Hợi'], ['Thân', 'Dậu'], ['Ngọ', 'Mùi'],
    ['Thìn', 'Tị'], ['Dần', 'Mão'], ['Tý', 'Sửu'],
  ];
  return tuanPairs[decade] ?? ['Tuất', 'Hợi'];
}

// Triệt Lộ: chỉ theo Can năm
//   Giáp/Kỷ → Thân-Dậu
//   Ất/Canh → Ngọ-Mùi
//   Bính/Tân → Thìn-Tị
//   Đinh/Nhâm → Dần-Mão
//   Mậu/Quý → Tý-Sửu
function getTrietLo(yearStem: HeavenlyStem): [EarthlyBranch, EarthlyBranch] {
  const map: Record<HeavenlyStem, [EarthlyBranch, EarthlyBranch]> = {
    Giáp: ['Thân', 'Dậu'], Kỷ: ['Thân', 'Dậu'],
    Ất: ['Ngọ', 'Mùi'], Canh: ['Ngọ', 'Mùi'],
    Bính: ['Thìn', 'Tị'], Tân: ['Thìn', 'Tị'],
    Đinh: ['Dần', 'Mão'], Nhâm: ['Dần', 'Mão'],
    Mậu: ['Tý', 'Sửu'], Quý: ['Tý', 'Sửu'],
  };
  return map[yearStem];
}

// ============================================================
// Hỏa Tinh / Linh Tinh by year-branch triad + birth hour
// ============================================================
function getHoaLinhTinh(
  yearBranch: EarthlyBranch,
  hourBranchIdx: number,
  isDaiVanThuan: boolean,
): { hoa: number; linh: number } {
  // Nhóm chi: Dần/Ngọ/Tuất, Thân/Tý/Thìn, Tị/Dậu/Sửu, Hợi/Mão/Mùi
  let hoaStart: number, linhStart: number;
  if (['Dần', 'Ngọ', 'Tuất'].includes(yearBranch)) { hoaStart = 1; linhStart = 3; }
  else if (['Thân', 'Tý', 'Thìn'].includes(yearBranch)) { hoaStart = 2; linhStart = 10; }
  else if (['Tị', 'Dậu', 'Sửu'].includes(yearBranch)) { hoaStart = 3; linhStart = 10; }
  else { hoaStart = 9; linhStart = 10; }
  // Quy tắc: chiều an Hỏa/Linh phụ thuộc Đại Vận direction (= Âm Dương Thuận Lý gốc):
  //   Đại Vận thuận (Dương Nam | Âm Nữ): Hỏa THUẬN, Linh NGHỊCH
  //   Đại Vận nghịch (Âm Nam | Dương Nữ): Hỏa NGHỊCH, Linh THUẬN
  if (isDaiVanThuan) {
    return {
      hoa: (hoaStart + hourBranchIdx) % 12,
      linh: ((linhStart - hourBranchIdx) % 12 + 12) % 12,
    };
  }
  return {
    hoa: ((hoaStart - hourBranchIdx) % 12 + 12) % 12,
    linh: (linhStart + hourBranchIdx) % 12,
  };
}

// ============================================================
// Main placement
// ============================================================
export interface PlaceStarsResult {
  tuanAt: [EarthlyBranch, EarthlyBranch];
  trietAt: [EarthlyBranch, EarthlyBranch];
}

export function placeAllStars(
  houses: TuViHouse[],
  tuViBranchIdx: number,
  lunar: LunarDate,
  birthInfo: BirthInfo,
  _cucSo: CucSo,
  menhBranchIdx: number,
  isDaiVanThuan: boolean = false,
): PlaceStarsResult {
  // Thiên Phủ đối xứng Tử Vi qua trục Dần-Thân: TP_idx = (4 - TV_idx) mod 12
  const thienPhuIdx = ((4 - tuViBranchIdx) % 12 + 12) % 12;
  const hourBranchIdx = Math.floor(((birthInfo.hour + 1) % 24) / 2);
  const month = lunar.month;

  // 1. 14 Chính Tinh
  for (const { name, offset } of TU_VI_GROUP) {
    addStar(houses, ((tuViBranchIdx + offset) % 12 + 12) % 12, name, 'chinh');
  }
  for (const { name, offset } of THIEN_PHU_GROUP) {
    addStar(houses, (thienPhuIdx + offset) % 12, name, 'chinh');
  }

  // 2. Lục Cát — Văn Xương, Văn Khúc, Tả Phù, Hữu Bật, Thiên Khôi, Thiên Việt
  // NAM PHÁI: VX/VK an theo GIỜ sinh (không phải Can năm như Bắc Phái)
  //   Văn Xương khởi tại Tuất(10), giờ Tý đếm NGHỊCH
  //   Văn Khúc  khởi tại Thìn(4), giờ Tý đếm THUẬN
  const vanXuongIdx = ((10 - hourBranchIdx) % 12 + 12) % 12;
  const vanKhucIdx  = ((4 + hourBranchIdx) % 12 + 12) % 12;
  addStar(houses, vanXuongIdx, 'Văn Xương', 'cat');
  addStar(houses, vanKhucIdx, 'Văn Khúc', 'cat');
  addStarByBranch(houses, TA_PHU_BY_MONTH[month - 1], 'Tả Phù', 'cat');
  addStarByBranch(houses, HUU_BAT_BY_MONTH[month - 1], 'Hữu Bật', 'cat');
  addStarByBranch(houses, THIEN_KHOI_BY_STEM[lunar.yearStem], 'Thiên Khôi', 'cat');
  addStarByBranch(houses, THIEN_VIET_BY_STEM[lunar.yearStem], 'Thiên Việt', 'cat');

  // 3. Lộc Tồn + Thiên Mã
  const locTonBranch = LOC_TON_BY_STEM[lunar.yearStem];
  addStarByBranch(houses, locTonBranch, 'Lộc Tồn', 'cat');
  addStarByBranch(houses, THIEN_MA_BY_BRANCH[lunar.yearBranch], 'Thiên Mã', 'cat');

  // 4. Lục Sát — Kình Dương, Đà La, Hỏa Tinh, Linh Tinh, Địa Kiếp, Địa Không
  addStarByBranch(houses, KINH_DUONG_BY_STEM[lunar.yearStem], 'Kình Dương', 'hung');
  addStarByBranch(houses, DA_LA_BY_STEM[lunar.yearStem], 'Đà La', 'hung');
  const { hoa, linh } = getHoaLinhTinh(lunar.yearBranch, hourBranchIdx, isDaiVanThuan);
  addStar(houses, hoa, 'Hỏa Tinh', 'hung');
  addStar(houses, linh, 'Linh Tinh', 'hung');
  // Địa Kiếp = Hợi (idx 11) + hour thuận; Địa Không = Hợi - hour nghịch
  const haiIdx = 11;
  addStar(houses, (haiIdx + hourBranchIdx) % 12, 'Địa Kiếp', 'hung');
  addStar(houses, ((haiIdx - hourBranchIdx) % 12 + 12) % 12, 'Địa Không', 'hung');

  // 5. Tứ Hóa — gắn brightness theo cung
  const [locStar, quyenStar, khoaStar, kyStar] = HOA_TRANSFORMS[lunar.yearStem];
  for (let hi = 0; hi < houses.length; hi++) {
    const house = houses[hi];
    const branch = BRANCHES[hi];
    const copy = [...house.stars];
    for (const star of copy) {
      const pushHoa = (name: string, type: 'cat' | 'hung') => {
        const code = getBrightnessCode(name, branch);
        const brightness = code ? BRIGHTNESS_CODE_TO_LONG[code] : undefined;
        house.stars.push({ name, type, brightness });
      };
      if (star.name === locStar) pushHoa('Hóa Lộc', 'cat');
      if (star.name === quyenStar) pushHoa('Hóa Quyền', 'cat');
      if (star.name === khoaStar) pushHoa('Hóa Khoa', 'cat');
      if (star.name === kyStar) pushHoa('Hóa Kỵ', 'hung');
    }
  }

  // 6. Sao theo Can năm
  addStarByBranch(houses, THIEN_QUAN_BY_STEM[lunar.yearStem], 'Thiên Quan', 'cat');
  addStarByBranch(houses, THIEN_PHUC_BY_STEM[lunar.yearStem], 'Thiên Phúc', 'cat');
  addStarByBranch(houses, LUU_HA_BY_STEM[lunar.yearStem], 'Lưu Hà', 'hung');
  addStarByBranch(houses, QUOC_AN_BY_STEM[lunar.yearStem], 'Quốc Ấn', 'cat');
  addStarByBranch(houses, DUONG_PHU_BY_STEM[lunar.yearStem], 'Đường Phù', 'cat');
  addStarByBranch(houses, THIEN_TRU_BY_STEM[lunar.yearStem], 'Thiên Trù', 'cat');

  // Ân Quang = Văn Xương + (day - 1) thuận, rồi lùi 1 cung (dùng VX hour-based ở trên)
  const anQuangIdx = ((vanXuongIdx + lunar.day - 1 - 1) % 12 + 12) % 12;
  addStar(houses, anQuangIdx, 'Ân Quang', 'cat');
  // Thiên Quý: an theo CAN NĂM (per altuvi convention)
  const THIEN_QUY_BY_STEM: Record<HeavenlyStem, EarthlyBranch> = {
    Giáp: 'Sửu',
    Ất: 'Tý',
    Bính: 'Mão',
    Đinh: 'Dần',
    Mậu: 'Hợi',
    Kỷ: 'Ngọ',   // confirmed Mạnh
    Canh: 'Dậu',
    Tân: 'Thân',
    Nhâm: 'Ngọ', // confirmed Chiến
    Quý: 'Tị',   // confirmed Thảo
  };
  addStarByBranch(houses, THIEN_QUY_BY_STEM[lunar.yearStem], 'Thiên Quý', 'cat');

  // 7. Sao theo Chi năm
  addStarByBranch(houses, DAO_HOA_BY_BRANCH[lunar.yearBranch], 'Đào Hoa', 'cat');
  addStarByBranch(houses, getHongLoanBranch(lunar.yearBranch), 'Hồng Loan', 'cat');
  addStarByBranch(houses, getThienHyBranch(lunar.yearBranch), 'Thiên Hỷ', 'cat');
  addStarByBranch(houses, CO_THAN_BY_BRANCH[lunar.yearBranch], 'Cô Thần', 'hung');
  addStarByBranch(houses, QUA_TU_BY_BRANCH[lunar.yearBranch], 'Quả Tú', 'hung');
  addStarByBranch(houses, HOA_CAI_BY_BRANCH[lunar.yearBranch], 'Hoa Cái', 'cat');
  addStarByBranch(houses, KIEP_SAT_BY_BRANCH[lunar.yearBranch], 'Kiếp Sát', 'hung');
  addStarByBranch(houses, PHA_TOAI_BY_BRANCH[lunar.yearBranch], 'Phá Toái', 'hung');
  addStarByBranch(houses, LONG_TRI_BY_BRANCH[lunar.yearBranch], 'Long Trì', 'cat');
  addStarByBranch(houses, PHUONG_CAC_BY_BRANCH[lunar.yearBranch], 'Phượng Các', 'cat');
  addStarByBranch(houses, GIAI_THAN_BY_BRANCH[lunar.yearBranch], 'Giải Thần', 'cat');
  addStarByBranch(houses, THIEN_KHOC_BY_BRANCH[lunar.yearBranch], 'Thiên Khốc', 'hung');
  addStarByBranch(houses, THIEN_HU_BY_BRANCH[lunar.yearBranch], 'Thiên Hư', 'hung');
  addStarByBranch(houses, THIEN_DUC_BY_BRANCH[lunar.yearBranch], 'Thiên Đức', 'cat');
  addStarByBranch(houses, NGUYET_DUC_BY_BRANCH[lunar.yearBranch], 'Nguyệt Đức', 'cat');
  // Thiên Không: an tại cung sau Thái Tuế (chi năm sinh + 1) — Nam Phái
  addStar(houses, (getBranchIndex(lunar.yearBranch) + 1) % 12, 'Thiên Không', 'hung');
  // Thiên Tài / Thiên Thọ: an theo Mệnh / Thân cung + chi năm (KHÔNG phải chỉ theo chi năm)
  //   Thiên Tài = từ Mệnh cung khởi giờ Tý/cung Tý đếm THUẬN theo chi năm sinh
  //   Thiên Thọ = từ Thân cung khởi tương tự
  const yearBranchIdxForTai = getBranchIndex(lunar.yearBranch);
  addStar(houses, (menhBranchIdx + yearBranchIdxForTai) % 12, 'Thiên Tài', 'cat');
  // Thân cung idx cần truyền vào — tạm tính dùng Mệnh + (cung Thân offset)
  // Thân cung = (2 + month - 1 + hourBranchIdx) % 12
  const thanBranchIdxLocal = ((2 + lunar.month - 1 + hourBranchIdx) % 12 + 12) % 12;
  addStar(houses, (thanBranchIdxLocal + yearBranchIdxForTai) % 12, 'Thiên Thọ', 'cat');

  // Thiên Giải: khởi tháng giêng tại cung Thân(8), thuận theo tháng sinh
  const thienGiaiIdx = (8 + (month - 1)) % 12;
  addStar(houses, thienGiaiIdx, 'Thiên Giải', 'cat');
  // Địa Giải: khởi tháng giêng tại cung Mùi(7), thuận theo tháng sinh (per tracuutuvi.com)
  const diaGiaiIdx = (7 + (month - 1)) % 12;
  addStar(houses, diaGiaiIdx, 'Địa Giải', 'cat');
  // Lưu Niên Văn Tinh: an theo Can năm như Lộc Tồn nhưng khởi Giáp tại Tị (Lộc Tồn khởi Dần)
  // Bảng = bảng Văn Xương Bắc Phái (Giáp:Tị, Ất:Ngọ, Bính:Thân, Đinh:Dậu, Mậu:Thân, Kỷ:Dậu, Canh:Hợi, Tân:Tý, Nhâm:Dần, Quý:Mão)
  addStarByBranch(houses, VAN_XUONG_BY_STEM[lunar.yearStem], 'LN Văn Tinh', 'cat');

  // 8. Sao theo tháng sinh
  // Tam Thai = Tả Phù + (lunarDay - 1) thuận chiều  (Nam Phái: theo NGÀY âm, không phải tháng)
  const taPhuIdx = getBranchIndex(TA_PHU_BY_MONTH[month - 1]);
  addStar(houses, (taPhuIdx + (lunar.day - 1)) % 12, 'Tam Thai', 'cat');
  // Bát Tọa = Hữu Bật - (lunarDay - 1) nghịch chiều
  const huuBatIdx = getBranchIndex(HUU_BAT_BY_MONTH[month - 1]);
  addStar(houses, ((huuBatIdx - (lunar.day - 1)) % 12 + 12) % 12, 'Bát Tọa', 'cat');
  // Thai Phụ = Văn Khúc + 2 cung thuận; Phong Cáo = Văn Khúc - 2 cung nghịch (Nam Phái)
  addStar(houses, (vanKhucIdx + 2) % 12, 'Thai Phụ', 'cat');
  addStar(houses, ((vanKhucIdx - 2) % 12 + 12) % 12, 'Phong Cáo', 'cat');
  addStarByBranch(houses, THIEN_HINH_BY_MONTH[month - 1], 'Thiên Hình', 'hung');
  addStarByBranch(houses, THIEN_RIEU_BY_MONTH[month - 1], 'Thiên Riêu', 'hung');
  addStarByBranch(houses, THIEN_Y_BY_MONTH[month - 1], 'Thiên Y', 'cat');

  // Đẩu Quân = Thái Tuế (yearBranch) − (month-1) nghịch + hourBranchIdx thuận
  const yearBranchIdx = getBranchIndex(lunar.yearBranch);
  const dauQuanIdx = (((yearBranchIdx - (month - 1)) % 12 + 12) % 12 + hourBranchIdx) % 12;
  // Đẩu Quân — xếp vào nhóm sát/hung (bên phải UI)
  addStar(houses, dauQuanIdx, 'Đẩu Quân', 'hung');

  // 9. Sao cố định theo CUNG (palace order: Mệnh=0, Huynh=1, Phu=2, Tử=3, Tài=4, Tật=5, Di=6, Nô=7, ...)
  // Cung an NGHỊCH chiều địa chi từ Mệnh, nên branch = (menhBranchIdx - palace_i + 12) % 12
  // Thiên Thương = cung Nô Bộc (palace 7) → menhBranchIdx - 7
  addStar(houses, ((menhBranchIdx - 7) % 12 + 12) % 12, 'Thiên Thương', 'hung');
  // Thiên Sứ = cung Tật Ách (palace 5) → menhBranchIdx - 5
  addStar(houses, ((menhBranchIdx - 5) % 12 + 12) % 12, 'Thiên Sứ', 'hung');
  // Thiên La = Thìn, Địa Võng = Tuất
  addStarByBranch(houses, 'Thìn', 'Thiên La', 'hung');
  addStarByBranch(houses, 'Tuất', 'Địa Võng', 'hung');

  // 10. Vòng Thái Tuế + Vòng Lộc Tồn (12 sao mỗi vòng)
  for (const { branch, starName } of calculateVongThaiTue(lunar.yearBranch)) {
    addStarByBranch(houses, branch, starName, 'trung');
  }
  if (locTonBranch) {
    for (const { branch, starName } of calculateVongLocTon(locTonBranch, lunar.yearStem, birthInfo.gender)) {
      addStarByBranch(houses, branch, starName, 'trung');
    }
  }

  // 11. Tuần Không / Triệt Lộ
  const tuanAt = getTuanKhong(lunar.yearStem, lunar.yearBranch);
  const trietAt = getTrietLo(lunar.yearStem);

  return { tuanAt, trietAt };
}

/**
 * Vòng Trường Sinh — trả về label per branch.
 * Gọi riêng từ tuViEngine và gán vào house.vongTruongSinh.
 */
export function computeVongTruongSinhLabels(
  cucSo: CucSo,
  yearStem: HeavenlyStem,
  gender?: Gender,
): Record<EarthlyBranch, string> {
  return calculateVongTruongSinh(cucSo, yearStem, gender);
}

// ============================================================
// Lưu tinh cho năm xem (viewing year)
// ============================================================
export function placeLuuStars(
  houses: TuViHouse[],
  viewingStem: HeavenlyStem,
  viewingBranch: EarthlyBranch,
  gender: Gender,
): void {
  const addLuu = (branch: EarthlyBranch | undefined, name: string) => {
    if (!branch) return;
    addStar(houses, getBranchIndex(branch), `L. ${name}`, 'luu');
  };

  // Theo Can năm xem
  addLuu(LOC_TON_BY_STEM[viewingStem], 'Lộc Tồn');
  addLuu(VAN_XUONG_BY_STEM[viewingStem], 'Văn Xương');
  addLuu(VAN_KHUC_BY_STEM[viewingStem], 'Văn Khúc');
  addLuu(THIEN_KHOI_BY_STEM[viewingStem], 'Thiên Khôi');
  addLuu(THIEN_VIET_BY_STEM[viewingStem], 'Thiên Việt');
  addLuu(KINH_DUONG_BY_STEM[viewingStem], 'Kình Dương');
  addLuu(DA_LA_BY_STEM[viewingStem], 'Đà La');

  // Tứ Hóa lưu
  const [locS, quyS, khoaS, kyS] = HOA_TRANSFORMS[viewingStem];
  for (const house of houses) {
    const copy = [...house.stars];
    for (const star of copy) {
      if (star.name === locS) house.stars.push({ name: 'L. Hóa Lộc', type: 'luu' });
      if (star.name === quyS) house.stars.push({ name: 'L. Hóa Quyền', type: 'luu' });
      if (star.name === khoaS) house.stars.push({ name: 'L. Hóa Khoa', type: 'luu' });
      if (star.name === kyS) house.stars.push({ name: 'L. Hóa Kỵ', type: 'luu' });
    }
  }

  // Theo Chi năm xem
  addLuu(THIEN_MA_BY_BRANCH[viewingBranch], 'Thiên Mã');
  addLuu(DAO_HOA_BY_BRANCH[viewingBranch], 'Đào Hoa');
  addLuu(getHongLoanBranch(viewingBranch), 'Hồng Loan');
  addLuu(THIEN_KHOC_BY_BRANCH[viewingBranch], 'Thiên Khốc');
  addLuu(THIEN_HU_BY_BRANCH[viewingBranch], 'Thiên Hư');
  addLuu(KIEP_SAT_BY_BRANCH[viewingBranch], 'Kiếp Sát');

  // Lưu Thái Tuế, Tang Môn, Bạch Hổ từ vòng Thái Tuế lưu
  const luuThaiTue = calculateVongThaiTue(viewingBranch);
  const picks: Record<string, boolean> = {
    'Thái Tuế': true, 'Tang Môn': true, 'Bạch Hổ': true, 'Tiểu Hao': false, 'Bệnh Phù': false,
  };
  for (const { branch, starName } of luuThaiTue) {
    if (picks[starName]) addLuu(branch, starName);
  }

  // Lưu Tiểu Hao, Bệnh Phù từ vòng Lộc Tồn lưu (nếu có)
  const ltBranch = LOC_TON_BY_STEM[viewingStem];
  if (ltBranch) {
    const luuLocTon = calculateVongLocTon(ltBranch, viewingStem, gender);
    for (const { branch, starName } of luuLocTon) {
      if (starName === 'Tiểu Hao' || starName === 'Bệnh Phù') addLuu(branch, starName);
    }
  }
}

/**
 * Tính DANH SÁCH SAO LƯU cho MỘT NĂM cụ thể (theo Can/Chi năm đó) — KHÔNG mutate
 * lá số gốc. Trả về [{ branchIdx, name }] để luận tiểu vận từng năm chính xác.
 * `natalHouses` dùng để định vị Tứ Hóa lưu (theo chính tinh trên lá số).
 */
export function getLuuStarsForYear(
  natalHouses: TuViHouse[],
  yearStem: HeavenlyStem,
  yearBranch: EarthlyBranch,
  gender: Gender,
): Array<{ branchIdx: number; name: string }> {
  const out: Array<{ branchIdx: number; name: string }> = [];
  const add = (b: EarthlyBranch | undefined, name: string) => {
    if (b) out.push({ branchIdx: getBranchIndex(b), name });
  };
  // Theo Can năm
  add(LOC_TON_BY_STEM[yearStem], 'Lộc Tồn');
  add(VAN_XUONG_BY_STEM[yearStem], 'Văn Xương');
  add(VAN_KHUC_BY_STEM[yearStem], 'Văn Khúc');
  add(THIEN_KHOI_BY_STEM[yearStem], 'Thiên Khôi');
  add(THIEN_VIET_BY_STEM[yearStem], 'Thiên Việt');
  add(KINH_DUONG_BY_STEM[yearStem], 'Kình Dương');
  add(DA_LA_BY_STEM[yearStem], 'Đà La');
  // Tứ Hóa lưu — theo vị trí chính tinh trên lá số
  const [locS, quyS, khoaS, kyS] = HOA_TRANSFORMS[yearStem];
  natalHouses.forEach(h => {
    for (const s of h.stars) {
      if (s.name === locS) out.push({ branchIdx: getBranchIndex(h.branch), name: 'Hóa Lộc' });
      if (s.name === quyS) out.push({ branchIdx: getBranchIndex(h.branch), name: 'Hóa Quyền' });
      if (s.name === khoaS) out.push({ branchIdx: getBranchIndex(h.branch), name: 'Hóa Khoa' });
      if (s.name === kyS) out.push({ branchIdx: getBranchIndex(h.branch), name: 'Hóa Kỵ' });
    }
  });
  // Theo Chi năm
  add(THIEN_MA_BY_BRANCH[yearBranch], 'Thiên Mã');
  add(DAO_HOA_BY_BRANCH[yearBranch], 'Đào Hoa');
  add(getHongLoanBranch(yearBranch), 'Hồng Loan');
  add(THIEN_KHOC_BY_BRANCH[yearBranch], 'Thiên Khốc');
  add(THIEN_HU_BY_BRANCH[yearBranch], 'Thiên Hư');
  add(KIEP_SAT_BY_BRANCH[yearBranch], 'Kiếp Sát');
  // Vòng Thái Tuế lưu: Thái Tuế, Tang Môn, Bạch Hổ
  const luuThaiTue = calculateVongThaiTue(yearBranch);
  const picks: Record<string, boolean> = { 'Thái Tuế': true, 'Tang Môn': true, 'Bạch Hổ': true };
  for (const { branch, starName } of luuThaiTue) if (picks[starName]) add(branch, starName);
  return out;
}

// Backward compat exports
export function placeLuuTieuVan(houses: TuViHouse[], age: number, menhBranchIdx: number): void {
  const tieuVanIdx = ((menhBranchIdx + age - 1) % 12 + 12) % 12;
  addStar(houses, tieuVanIdx, 'L. Tiểu Vận', 'luu');
}
export function placeLuuDaiVan(houses: TuViHouse[], daiVanBranchIdx: number): void {
  addStar(houses, daiVanBranchIdx, 'L. Đại Vận', 'luu');
}
