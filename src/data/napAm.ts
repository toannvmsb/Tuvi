import type { HeavenlyStem, EarthlyBranch, FiveElement, CucSo } from '../types';

// Nạp Âm table: [stem, branch] → { element, cucSo, napAmName }
// The 60-year cycle pairs, each pair shares the same Nạp Âm
interface NapAmEntry {
  element: FiveElement;
  cucSo: CucSo;
  name: string;
}

const STEMS: HeavenlyStem[] = ['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];
const BRANCHES: EarthlyBranch[] = ['Tý','Sửu','Dần','Mão','Thìn','Tị','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];

// The 30 Nạp Âm entries (each covers 2 consecutive years)
const NAP_AM_TABLE: NapAmEntry[] = [
  { element: 'Kim', cucSo: 4, name: 'Hải Trung Kim' },    // 0: Giáp Tý, Ất Sửu
  { element: 'Hỏa', cucSo: 6, name: 'Lô Trung Hỏa' },    // 1: Bính Dần, Đinh Mão
  { element: 'Mộc', cucSo: 3, name: 'Đại Lâm Mộc' },     // 2: Mậu Thìn, Kỷ Tị
  { element: 'Thổ', cucSo: 5, name: 'Lộ Bàng Thổ' },     // 3: Canh Ngọ, Tân Mùi
  { element: 'Kim', cucSo: 4, name: 'Kiếm Phong Kim' },   // 4: Nhâm Thân, Quý Dậu
  { element: 'Hỏa', cucSo: 6, name: 'Sơn Đầu Hỏa' },    // 5: Giáp Tuất, Ất Hợi
  { element: 'Thủy', cucSo: 2, name: 'Giản Hạ Thủy' },   // 6: Bính Tý, Đinh Sửu
  { element: 'Thổ', cucSo: 5, name: 'Thành Đầu Thổ' },   // 7: Mậu Dần, Kỷ Mão
  { element: 'Kim', cucSo: 4, name: 'Bạch Lạp Kim' },    // 8: Canh Thìn, Tân Tị
  { element: 'Mộc', cucSo: 3, name: 'Dương Liễu Mộc' },  // 9: Nhâm Ngọ, Quý Mùi
  { element: 'Thủy', cucSo: 2, name: 'Tuyền Trung Thủy' },// 10: Giáp Thân, Ất Dậu
  { element: 'Thổ', cucSo: 5, name: 'Ốc Thượng Thổ' },  // 11: Bính Tuất, Đinh Hợi
  { element: 'Hỏa', cucSo: 6, name: 'Tích Lịch Hỏa' },  // 12: Mậu Tý, Kỷ Sửu
  { element: 'Mộc', cucSo: 3, name: 'Tùng Bách Mộc' },   // 13: Canh Dần, Tân Mão
  { element: 'Thủy', cucSo: 2, name: 'Trường Lưu Thủy' },// 14: Nhâm Thìn, Quý Tị
  { element: 'Kim', cucSo: 4, name: 'Sa Trung Kim' },     // 15: Giáp Ngọ, Ất Mùi
  { element: 'Hỏa', cucSo: 6, name: 'Sơn Hạ Hỏa' },     // 16: Bính Thân, Đinh Dậu
  { element: 'Mộc', cucSo: 3, name: 'Bình Địa Mộc' },    // 17: Mậu Tuất, Kỷ Hợi
  { element: 'Thổ', cucSo: 5, name: 'Bích Thượng Thổ' }, // 18: Canh Tý, Tân Sửu
  { element: 'Kim', cucSo: 4, name: 'Kim Bạch Kim' },     // 19: Nhâm Dần, Quý Mão
  { element: 'Hỏa', cucSo: 6, name: 'Phúc Đăng Hỏa' },  // 20: Giáp Thìn, Ất Tị
  { element: 'Thủy', cucSo: 2, name: 'Thiên Hà Thủy' },  // 21: Bính Ngọ, Đinh Mùi
  { element: 'Thổ', cucSo: 5, name: 'Đại Dịch Thổ' },    // 22: Mậu Thân, Kỷ Dậu
  { element: 'Kim', cucSo: 4, name: 'Thoa Xuyến Kim' },   // 23: Canh Tuất, Tân Hợi
  { element: 'Mộc', cucSo: 3, name: 'Tang Đố Mộc' },     // 24: Nhâm Tý, Quý Sửu
  { element: 'Thủy', cucSo: 2, name: 'Đại Khê Thủy' },   // 25: Giáp Dần, Ất Mão
  { element: 'Thổ', cucSo: 5, name: 'Sa Trung Thổ' },    // 26: Bính Thìn, Đinh Tị
  { element: 'Hỏa', cucSo: 6, name: 'Thiên Thượng Hỏa' },// 27: Mậu Ngọ, Kỷ Mùi
  { element: 'Mộc', cucSo: 3, name: 'Thạch Lựu Mộc' },   // 28: Canh Thân, Tân Dậu
  { element: 'Thủy', cucSo: 2, name: 'Đại Hải Thủy' },   // 29: Nhâm Tuất, Quý Hợi
];

export function getStemIndex(stem: HeavenlyStem): number {
  return STEMS.indexOf(stem);
}

export function getBranchIndex(branch: EarthlyBranch): number {
  return BRANCHES.indexOf(branch);
}

export function getStemByIndex(i: number): HeavenlyStem {
  return STEMS[((i % 10) + 10) % 10];
}

export function getBranchByIndex(i: number): EarthlyBranch {
  return BRANCHES[((i % 12) + 12) % 12];
}

// Get Nạp Âm entry for a given (stem, branch) pair.
// 60-year cycle: year N (0-59) has stem N%10 and branch N%12.
// Each consecutive pair of years shares the same Nạp Âm (30 entries total).
// Given (stem, branch), find N s.t. N%10=si AND N%12=bi (CRT — exists when si-bi even).
export function getNapAm(stem: HeavenlyStem, branch: EarthlyBranch): NapAmEntry {
  const si = getStemIndex(stem);
  const bi = getBranchIndex(branch);
  let N = -1;
  for (let n = si; n < 60; n += 10) {
    if (n % 12 === bi) { N = n; break; }
  }
  if (N < 0) {
    // Cặp Can-Chi không hợp lệ (khác parity) — fallback safe
    return NAP_AM_TABLE[0];
  }
  const pairIdx = Math.floor(N / 2);
  return NAP_AM_TABLE[pairIdx];
}

export function getCucSo(stem: HeavenlyStem, branch: EarthlyBranch): CucSo {
  return getNapAm(stem, branch).cucSo;
}

export function getNapAmName(stem: HeavenlyStem, branch: EarthlyBranch): string {
  return getNapAm(stem, branch).name;
}

export { STEMS, BRANCHES };
export type { NapAmEntry };
