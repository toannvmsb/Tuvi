/**
 * NGUYỆT VẬN (Lưu Nguyệt — vận từng tháng trong một năm).
 *
 * CÁCH AN LƯU NGUYỆT (theo Vân Đằng Thái Thứ Lang — Tử Vi Đẩu Số Tân Biên):
 *  1. Lấy cung TIỂU HẠN của năm đang xem (tv.branch).
 *  2. Từ cung tiểu hạn, đi NGHỊCH (lùi) (tháng sinh âm − 1) cung → cung X.
 *  3. Từ cung X, đi THUẬN (tiến) theo GIỜ sinh (Tý = 0 bước, Sửu = 1 …) → cung
 *     an tháng GIÊNG (tháng 1 âm).
 *  4. Các tháng sau đi THUẬN 1 cung mỗi tháng.
 *
 * CHẤM ĐIỂM: cùng khung 3 yếu tố cụ THIÊN LƯƠNG như Đại/Tiểu Vận, áp ở quy mô
 * 1 THÁNG, kèm quy tắc "TIỂU VẬN (năm) LẤN ÁP NGUYỆT VẬN (tháng)" — năm là gốc,
 * tháng tốt/xấu vẫn nằm trong khuôn khổ của năm.
 */

import type { AstrologyResult, TuViHouse, StarEntry, FiveElement, EarthlyBranch } from '../types';
import { scoreTieuVan } from './tieuVanScore';

const BRANCHES: EarthlyBranch[] = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tị', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
const bIdx = (b: string) => BRANCHES.indexOf(b as EarthlyBranch);

const CAT_PHU = new Set([
  'Tả Phù', 'Hữu Bật', 'Văn Xương', 'Văn Khúc', 'Thiên Khôi', 'Thiên Việt',
  'Lộc Tồn', 'Thiên Mã', 'Long Trì', 'Phượng Các', 'Tam Thai', 'Bát Tọa',
  'Ân Quang', 'Thiên Quý', 'Thai Phụ', 'Phong Cáo', 'Quốc Ấn', 'Thiên Phúc',
  'Thiên Quan', 'Thiên Đức', 'Nguyệt Đức', 'Long Đức', 'Phúc Đức', 'Thiên Hỷ',
  'Hồng Loan', 'Đào Hoa', 'Thanh Long', 'Tấu Thư', 'Hỷ Thần', 'Giải Thần',
]);
const SAT_PHU = new Set([
  'Kình Dương', 'Đà La', 'Hỏa Tinh', 'Linh Tinh', 'Địa Không', 'Địa Kiếp',
  'Thiên Hình', 'Thiên Riêu', 'Kiếp Sát', 'Đại Hao', 'Tiểu Hao', 'Tang Môn',
  'Bạch Hổ', 'Tuế Phá', 'Điếu Khách', 'Quan Phù', 'Quan Phủ', 'Phục Binh',
  'Phi Liêm', 'Bệnh Phù', 'Thiên Khốc', 'Thiên Hư', 'Cô Thần', 'Quả Tú',
  'Phá Toái', 'Thiên Thương', 'Thiên Sứ',
]);
const BRIGHT_PT: Record<string, number> = { miếu: 14, vượng: 11, đắc: 7, bình: 3, hãm: -8 };
const TAM_HOP_ELEMENT: Record<string, FiveElement> = {
  Thân: 'Thủy', Tý: 'Thủy', Thìn: 'Thủy',
  Hợi: 'Mộc', Mão: 'Mộc', Mùi: 'Mộc',
  Dần: 'Hỏa', Ngọ: 'Hỏa', Tuất: 'Hỏa',
  Tị: 'Kim', Dậu: 'Kim', Sửu: 'Kim',
};
const BRANCH_ELEMENT: Record<EarthlyBranch, FiveElement> = {
  Tý: 'Thủy', Sửu: 'Thổ', Dần: 'Mộc', Mão: 'Mộc',
  Thìn: 'Thổ', Tị: 'Hỏa', Ngọ: 'Hỏa', Mùi: 'Thổ',
  Thân: 'Kim', Dậu: 'Kim', Tuất: 'Thổ', Hợi: 'Thủy',
};
const SHENG: Record<FiveElement, FiveElement> = { Kim: 'Thủy', Thủy: 'Mộc', Mộc: 'Hỏa', Hỏa: 'Thổ', Thổ: 'Kim' };
const KHAC: Record<FiveElement, FiveElement> = { Kim: 'Mộc', Mộc: 'Thổ', Thổ: 'Thủy', Thủy: 'Hỏa', Hỏa: 'Kim' };

export type Relation = 'sinhNhap' | 'dongHanh' | 'khacXuat' | 'sinhXuat' | 'khacNhap';
function relate(of: FiveElement, to: FiveElement): Relation {
  if (of === to) return 'dongHanh';
  if (SHENG[of] === to) return 'sinhXuat';
  if (SHENG[to] === of) return 'sinhNhap';
  if (KHAC[of] === to) return 'khacXuat';
  return 'khacNhap';
}

const BO_TPV = new Set(['Tử Vi', 'Thiên Phủ', 'Vũ Khúc', 'Thiên Tướng', 'Liêm Trinh']);
const BO_SPT = new Set(['Thất Sát', 'Phá Quân', 'Tham Lang']);
const BO_CNDL = new Set(['Thiên Cơ', 'Thái Âm', 'Thiên Đồng', 'Thiên Lương']);
const BO_CN = new Set(['Cự Môn', 'Thái Dương']);
type Bo = 'TPV' | 'SPT' | 'CNDL' | 'CN' | 'VCD';
function boOf(stars: StarEntry[]): Bo {
  const c = stars.filter(s => s.type === 'chinh').map(s => s.name);
  if (c.length === 0) return 'VCD';
  const cnt: Record<Bo, number> = { TPV: 0, SPT: 0, CNDL: 0, CN: 0, VCD: 0 };
  for (const n of c) {
    if (BO_TPV.has(n)) cnt.TPV++;
    else if (BO_SPT.has(n)) cnt.SPT++;
    else if (BO_CNDL.has(n)) cnt.CNDL++;
    else if (BO_CN.has(n)) cnt.CN++;
  }
  let best: Bo = 'VCD', bn = 0;
  (['TPV', 'SPT', 'CNDL', 'CN'] as Bo[]).forEach(k => { if (cnt[k] > bn) { bn = cnt[k]; best = k; } });
  return best;
}
function nhanHoaOf(menhBo: Bo, mBo: Bo): { level: 'cao' | 'kha' | 'binh' | 'kem'; delta: [number, number] } {
  if (menhBo === 'VCD' || mBo === 'VCD') return { level: 'binh', delta: [0, 2] };
  if (menhBo === mBo) return { level: 'cao', delta: [8, 0] };
  if ((menhBo === 'TPV' && mBo === 'CNDL') || (menhBo === 'CNDL' && mBo === 'TPV')) return { level: 'kha', delta: [4, 0] };
  if ((menhBo === 'CNDL' && mBo === 'SPT') || (menhBo === 'TPV' && mBo === 'SPT')) return { level: 'kem', delta: [0, 8] };
  if (menhBo === 'SPT' && mBo === 'CNDL') return { level: 'kem', delta: [0, 6] };
  if (menhBo === 'CN' || mBo === 'CN') return { level: 'binh', delta: [2, 2] };
  return { level: 'binh', delta: [2, 2] };
}

function ratingOf(net: number): NguyetVanScore['rating'] {
  if (net >= 40) return 'Rất tốt';
  if (net >= 28) return 'Tốt';
  if (net >= 16) return 'Khá';
  if (net >= 6) return 'Trung bình';
  return 'Nhiều thách thức';
}

export interface NguyetVanScore {
  month: number;            // 1–12 (tháng âm lịch)
  branch: EarthlyBranch;    // chi cung lưu nguyệt
  palaceName: string;       // tên cung lưu nguyệt
  taiLoc: number;
  thachThuc: number;
  rating: 'Rất tốt' | 'Tốt' | 'Khá' | 'Trung bình' | 'Nhiều thách thức';
  summary: string;
  thienThoi: Relation;
  diaLoi: Relation;
  nhanHoa: 'cao' | 'kha' | 'binh' | 'kem';
}

/** Trả về chỉ số cung (0–11) an tháng GIÊNG của lưu nguyệt cho 1 năm. */
function januaryCungIndex(result: AstrologyResult, age: number): number | null {
  const tv = result.tieuVans.find(x => x.age === age);
  if (!tv) return null;
  const TH = bIdx(tv.branch);
  const monthLunar = result.tuViChart.lunarDate.month || 1;
  const hourBranch = result.tuViChart.hourBranch;
  const hourIndex = hourBranch ? bIdx(hourBranch) : 0;
  const posAfterMonth = (((TH - (monthLunar - 1)) % 12) + 12) % 12;
  return (posAfterMonth + hourIndex) % 12;
}

/** Chi cung lưu nguyệt của tháng m (1–12) trong năm tuổi `age`. */
export function nguyetVanBranch(result: AstrologyResult, age: number, month: number): EarthlyBranch | null {
  const jan = januaryCungIndex(result, age);
  if (jan == null) return null;
  return BRANCHES[(jan + (month - 1)) % 12];
}

/** Chấm điểm 1 tháng lưu nguyệt. */
export function scoreNguyetVan(result: AstrologyResult, age: number, month: number): NguyetVanScore | null {
  const branch = nguyetVanBranch(result, age, month);
  if (!branch) return null;
  const h: TuViHouse | undefined = result.tuViChart.houses.find(x => x.branch === branch);
  const stars: StarEntry[] = h?.stars ?? [];
  const chinh = stars.filter(s => s.type === 'chinh');
  const menh = result.tuViChart.houses.find(x => x.isManh);

  // 1) THIÊN THỜI — tam hợp cung nguyệt vs tam hợp năm sinh
  const mTH = TAM_HOP_ELEMENT[branch];
  const tuoiTH = TAM_HOP_ELEMENT[result.tuViChart.lunarDate.yearBranch];
  const thienThoi = relate(mTH, tuoiTH);
  const TT_PT: Record<Relation, [number, number]> = {
    sinhNhap: [13, 0], dongHanh: [10, 0], khacXuat: [3, 4], sinhXuat: [0, 7], khacNhap: [0, 13],
  };

  // 2) ĐỊA LỢI — hành cung nguyệt vs hành Mệnh
  const menhEl = result.tuViChart.menhElement;
  const mEl = BRANCH_ELEMENT[branch];
  const diaLoi = relate(mEl, menhEl);
  const DL_PT: Record<Relation, [number, number]> = {
    sinhNhap: [10, 0], dongHanh: [6, 0], khacXuat: [2, 4], sinhXuat: [0, 4], khacNhap: [0, 10],
  };

  // 3) NHÂN HÒA
  const menhBo = menh ? boOf(menh.stars) : 'VCD';
  const mBo = boOf(stars);
  const nh = nhanHoaOf(menhBo, mBo);

  let taiLoc = 14 + TT_PT[thienThoi][0] + DL_PT[diaLoi][0] + nh.delta[0];
  let thachThuc = 8 + TT_PT[thienThoi][1] + DL_PT[diaLoi][1] + nh.delta[1];

  if (chinh.length === 0) thachThuc += 7;
  for (const s of chinh) {
    const pt = BRIGHT_PT[s.brightness ?? 'bình'] ?? 0;
    if (pt >= 0) taiLoc += pt; else thachThuc += -pt;
  }
  let hasLoc = false, hasMa = false;
  for (const s of stars) {
    const nm = s.name.startsWith('L. ') ? s.name.slice(3) : s.name;
    if (nm === 'Hóa Lộc') { taiLoc += 10; hasLoc = true; }
    else if (nm === 'Hóa Quyền') taiLoc += 8;
    else if (nm === 'Hóa Khoa') taiLoc += 6;
    else if (nm === 'Hóa Kỵ') thachThuc += 10;
    else if (nm === 'Lộc Tồn') { taiLoc += 7; hasLoc = true; }
    else if (nm === 'Thiên Mã') hasMa = true;
    else if (CAT_PHU.has(nm)) taiLoc += 2;
    else if (SAT_PHU.has(nm)) thachThuc += 3;
  }
  if (hasLoc && hasMa) taiLoc += 4;

  // Tuần / Triệt — làm dịu yếu tố trội (gặp tốt giảm tốt, gặp xấu đỡ xấu).
  const damp = (h?.trietAt ? 0.22 : 0) + (h?.tuanAt ? 0.14 : 0);
  if (damp > 0) {
    if (taiLoc >= thachThuc) { taiLoc -= taiLoc * damp; thachThuc += 3; }
    else { thachThuc -= thachThuc * damp; }
  }

  // ===== QUY TẮC "TIỂU VẬN (NĂM) LẤN ÁP NGUYỆT VẬN (THÁNG)" =====
  const tvSc = scoreTieuVan(result, result.tieuVans.find(x => x.age === age)!);
  if (tvSc) {
    const yNet = tvSc.taiLoc - tvSc.thachThuc; // -100..100
    const shift = Math.max(-9, Math.min(9, Math.round(yNet * 0.11)));
    if (shift >= 0) taiLoc += shift; else thachThuc += -shift;
  }

  taiLoc = Math.max(4, Math.min(100, Math.round(taiLoc)));
  thachThuc = Math.max(4, Math.min(100, Math.round(thachThuc)));
  const rating = ratingOf(taiLoc - thachThuc * 0.5);

  const chinhTxt = chinh.length
    ? chinh.map(s => `${s.name}${s.brightness ? `(${s.brightness})` : ''}`).join(', ')
    : 'Vô chính diệu';
  const advice =
    rating === 'Rất tốt' || rating === 'Tốt' ? 'Tháng hanh thông, nên chủ động làm việc quan trọng.'
    : rating === 'Khá' ? 'Tháng ổn, tiến chắc, tránh phiêu lưu.'
    : rating === 'Trung bình' ? 'Tháng bình, giữ nhịp, lo việc nhỏ.'
    : 'Tháng nhiều trở ngại — thận trọng tiền bạc, sức khỏe, lời nói.';
  const summary =
    `Tháng ${month} âm, lưu nguyệt nhập cung ${h?.palaceName ?? branch} (${branch}); ` +
    `chính tinh: ${chinhTxt}. ${advice}`;

  return {
    month, branch, palaceName: h?.palaceName ?? branch,
    taiLoc, thachThuc, rating, summary, thienThoi, diaLoi, nhanHoa: nh.level,
  };
}

/** Chấm 12 tháng của 1 năm. */
export function scoreAllNguyetVan(result: AstrologyResult, age: number): NguyetVanScore[] {
  const out: NguyetVanScore[] = [];
  for (let m = 1; m <= 12; m++) {
    const sc = scoreNguyetVan(result, age, m);
    if (sc) out.push(sc);
  }
  return out;
}
