/**
 * Lượng hóa Tiểu Vận theo cùng khung 3 yếu tố cụ THIÊN LƯƠNG
 * (giống Đại Vận), áp dụng ở quy mô 1 NĂM:
 *
 *  1. THIÊN THỜI — hành TAM HỢP cung tiểu hạn so với hành TAM HỢP
 *     năm sinh: sinh nhập / đồng hành (tốt); sinh xuất / khắc nhập
 *     (xấu); khắc xuất (chật vật).
 *  2. ĐỊA LỢI — hành cung tiểu hạn vs hành Mệnh.
 *  3. NHÂN HÒA — bộ chính tinh tại cung tiểu hạn vs bộ Mệnh.
 *  + Yếu tố BỔ TRỢ: chính tinh miếu/hãm, Tứ Hóa, Lộc Tồn, cát/sát
 *    phụ tinh, Tuần/Triệt.
 *
 * QUY TẮC "ĐẠI VẬN LẤN ÁP TIỂU VẬN": điểm tiểu vận được điều chỉnh
 * theo điểm đại vận chứa nó:
 *  • Đại vận tốt → cộng thêm cho tiểu vận (gốc khá thì cành dễ tốt).
 *  • Đại vận xấu → trừ bớt (tiểu vận tốt cũng khó phát huy).
 */

import type { AstrologyResult, TieuVan, TuViHouse, StarEntry, FiveElement, EarthlyBranch } from '../types';
import { scoreDaiVan } from './daiVanScore';
import { luuStarsTamPhuong, LUU_CAT, LUU_HUNG } from './luuStars';

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
const BRIGHT_PT: Record<string, number> = {
  miếu: 16, vượng: 12, đắc: 8, bình: 4, hãm: -9,
};
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

type Relation = 'sinhNhap' | 'dongHanh' | 'khacXuat' | 'sinhXuat' | 'khacNhap';
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
function nhanHoaOf(menhBo: Bo, dvBo: Bo): { level: 'cao' | 'kha' | 'binh' | 'kem'; delta: [number, number] } {
  if (menhBo === 'VCD' || dvBo === 'VCD') return { level: 'binh', delta: [0, 3] };
  if (menhBo === dvBo) return { level: 'cao', delta: [10, 0] };
  if ((menhBo === 'TPV' && dvBo === 'CNDL') || (menhBo === 'CNDL' && dvBo === 'TPV')) {
    return { level: 'kha', delta: [5, 0] };
  }
  if ((menhBo === 'CNDL' && dvBo === 'SPT') || (menhBo === 'TPV' && dvBo === 'SPT')) {
    return { level: 'kem', delta: [0, 10] };
  }
  if (menhBo === 'SPT' && dvBo === 'CNDL') return { level: 'kem', delta: [0, 7] };
  if (menhBo === 'CN' || dvBo === 'CN') return { level: 'binh', delta: [3, 3] };
  return { level: 'binh', delta: [2, 2] };
}

export interface TieuVanScore {
  age: number;
  year: number;
  stem: string;
  branch: string;
  daiVanIndex: number;
  palaceName: string;
  taiLoc: number;
  thachThuc: number;
  rating: 'Rất tốt' | 'Tốt' | 'Khá' | 'Trung bình' | 'Nhiều thách thức';
  summary: string;
  thienThoi: Relation;
  diaLoi: Relation;
  nhanHoa: 'cao' | 'kha' | 'binh' | 'kem';
}

function ratingOf(net: number): TieuVanScore['rating'] {
  if (net >= 52) return 'Rất tốt';
  if (net >= 40) return 'Tốt';
  if (net >= 29) return 'Khá';
  if (net >= 19) return 'Trung bình';
  return 'Nhiều thách thức';
}

export function scoreTieuVan(result: AstrologyResult, tv: TieuVan): TieuVanScore {
  const h: TuViHouse | undefined = result.tuViChart.houses.find(x => x.branch === tv.branch);
  const stars: StarEntry[] = h?.stars ?? [];
  const chinh = stars.filter(s => s.type === 'chinh');
  const menh = result.tuViChart.houses.find(x => x.isManh);

  // 1) THIÊN THỜI — tam hợp năm xem (chính là chi tiểu vận) vs tam hợp năm sinh
  const tvTH = TAM_HOP_ELEMENT[tv.branch];
  const tuoiTH = TAM_HOP_ELEMENT[result.tuViChart.lunarDate.yearBranch];
  const thienThoi = relate(tvTH, tuoiTH);
  const TT_PT: Record<Relation, [number, number]> = {
    sinhNhap: [15, 0], dongHanh: [12, 0],
    khacXuat: [3, 5], sinhXuat: [0, 8], khacNhap: [0, 15],
  };

  // 2) ĐỊA LỢI — hành cung tiểu vận vs hành Mệnh
  const menhEl = result.tuViChart.menhElement;
  const tvEl = BRANCH_ELEMENT[tv.branch as EarthlyBranch];
  const diaLoi = relate(tvEl, menhEl);
  const DL_PT: Record<Relation, [number, number]> = {
    sinhNhap: [12, 0], dongHanh: [7, 0],
    khacXuat: [2, 5], sinhXuat: [0, 5], khacNhap: [0, 12],
  };

  // 3) NHÂN HÒA — bộ chính tinh cung tiểu vận vs bộ Mệnh
  const menhBo = menh ? boOf(menh.stars) : 'VCD';
  const tvBo = boOf(stars);
  const nh = nhanHoaOf(menhBo, tvBo);

  let taiLoc = 18 + TT_PT[thienThoi][0] + DL_PT[diaLoi][0] + nh.delta[0];
  let thachThuc = 10 + TT_PT[thienThoi][1] + DL_PT[diaLoi][1] + nh.delta[1];

  // Bổ trợ
  if (chinh.length === 0) { thachThuc += 8; }
  for (const s of chinh) {
    const pt = BRIGHT_PT[s.brightness ?? 'bình'] ?? 0;
    if (pt >= 0) taiLoc += pt; else thachThuc += -pt;
  }
  let hasLoc = false, hasMa = false;
  for (const s of stars) {
    const nm = s.name.startsWith('L. ') ? s.name.slice(3) : s.name;
    if (nm === 'Hóa Lộc') { taiLoc += 12; hasLoc = true; }
    else if (nm === 'Hóa Quyền') taiLoc += 9;
    else if (nm === 'Hóa Khoa') taiLoc += 7;
    else if (nm === 'Hóa Kỵ') thachThuc += 12;
    else if (nm === 'Lộc Tồn') { taiLoc += 8; hasLoc = true; }
    else if (nm === 'Thiên Mã') hasMa = true;
    else if (CAT_PHU.has(nm)) taiLoc += 2;
    else if (SAT_PHU.has(nm)) thachThuc += 3;
  }
  if (hasLoc && hasMa) taiLoc += 5;

  // ===== SAO LƯU CỦA NĂM (lưu tinh theo Can/Chi NĂM, không phải can-chi cung) =====
  // Sao lưu đại diện cho động lực của riêng NĂM đó — xét tại cung tiểu hạn & tam phương.
  const luu = luuStarsTamPhuong(result, tv.yearStem, tv.yearBranch, tv.branch);
  const applyLuu = (names: string[], weight: number) => {
    for (const nm of names) {
      if (nm === 'Hóa Lộc') taiLoc += 8 * weight;
      else if (nm === 'Hóa Quyền') taiLoc += 6 * weight;
      else if (nm === 'Hóa Khoa') taiLoc += 5 * weight;
      else if (nm === 'Hóa Kỵ') thachThuc += 9 * weight;
      else if (LUU_CAT.has(nm)) taiLoc += 2 * weight;
      else if (LUU_HUNG.has(nm)) thachThuc += 3 * weight;
    }
  };
  applyLuu(luu.same, 1);      // tại cung: tác động mạnh nhất
  applyLuu(luu.tamHop, 0.5);  // tam hợp chiếu
  applyLuu(luu.xung, 0.5);    // xung chiếu

  // TUẦN / TRIỆT — làm dịu yếu tố đang trội (gặp tốt giảm tốt, gặp xấu đỡ xấu).
  const damp = (h?.trietAt ? 0.24 : 0) + (h?.tuanAt ? 0.15 : 0);
  if (damp > 0) {
    if (taiLoc >= thachThuc) { taiLoc -= taiLoc * damp; thachThuc += 3; }
    else { thachThuc -= thachThuc * damp; }
  }

  // ===== QUY TẮC "ĐẠI VẬN LẤN ÁP TIỂU VẬN" =====
  // Cộng/trừ điều chỉnh dựa trên đại vận chứa năm này.
  const dvObj = result.daiVans[tv.daiVanIndex];
  if (dvObj) {
    const dvSc = scoreDaiVan(result, dvObj);
    // Delta = (taiLoc - thachThuc) của đại vận, chuẩn hóa và đưa vào ~ ±10 điểm
    const dvNet = dvSc.taiLoc - dvSc.thachThuc; // ~ -100..+100
    const shift = Math.max(-10, Math.min(10, Math.round(dvNet * 0.12)));
    if (shift >= 0) taiLoc += shift; else thachThuc += -shift;
  }

  taiLoc = Math.max(4, Math.min(100, Math.round(taiLoc)));
  thachThuc = Math.max(4, Math.min(100, Math.round(thachThuc)));
  const rating = ratingOf(taiLoc - thachThuc * 0.5);

  const chinhTxt = chinh.length
    ? chinh.map(s => `${s.name}${s.brightness ? `(${s.brightness})` : ''}`).join(', ')
    : 'Vô chính diệu';
  const ttTxt: Record<Relation, string> = {
    sinhNhap: 'Thiên thời sinh nhập', dongHanh: 'Thiên thời đồng hành',
    khacXuat: 'Thiên thời khắc xuất', sinhXuat: 'Thiên thời sinh xuất', khacNhap: 'Thiên thời khắc nhập',
  };
  const dlTxt: Record<Relation, string> = {
    sinhNhap: 'Địa lợi sinh Mệnh', dongHanh: 'Địa lợi đồng hành',
    khacXuat: 'Mệnh khắc đv', sinhXuat: 'Mệnh sinh đv', khacNhap: 'đv khắc Mệnh',
  };
  const advice =
    rating === 'Rất tốt' || rating === 'Tốt'
      ? 'Năm hanh thông, nắm bắt cơ hội.'
      : rating === 'Khá'
      ? 'Năm ổn định, tiến chắc, tránh phiêu lưu.'
      : rating === 'Trung bình'
      ? 'Năm cần thận trọng, giữ vững.'
      : 'Năm nhiều trở ngại — đề phòng hao tài, sức khỏe, thị phi.';

  const summary =
    `Năm ${tv.year} (${tv.age} tuổi), tiểu hạn ${tv.stem} ${tv.branch} nhập cung ${h?.palaceName ?? tv.branch} ` +
    `— ${chinhTxt}. ${ttTxt[thienThoi]} · ${dlTxt[diaLoi]} · nhân hòa ${nh.level}. ` +
    `(Đại vận lấn áp tiểu vận — đã tính theo cụ Thiên Lương.) ${advice}`;

  return {
    age: tv.age, year: tv.year, stem: tv.stem, branch: tv.branch,
    daiVanIndex: tv.daiVanIndex, palaceName: h?.palaceName ?? '',
    taiLoc, thachThuc, rating, summary,
    thienThoi, diaLoi, nhanHoa: nh.level,
  };
}

export function scoreAllTieuVan(result: AstrologyResult): TieuVanScore[] {
  return result.tieuVans.map(tv => scoreTieuVan(result, tv));
}
