/**
 * Lượng hóa Đại Vận theo phương pháp cụ THIÊN LƯƠNG (cohoc.net /
 * Trần Việt Sơn). Một cung đại vận xét theo 3 yếu tố chính:
 *
 *  1. THIÊN THỜI — hành của bộ TAM HỢP cung đại vận so với bộ
 *     TAM HỢP cung tuổi (năm sinh):
 *       • sinh nhập (đại vận sinh tuổi)  → tốt nhất
 *       • đồng hành                       → tốt (Thái Tuế / Quan Phù / Bạch Hổ)
 *       • khắc xuất (tuổi khắc đại vận)  → chật vật, gắng có thể thắng
 *       • sinh xuất (tuổi sinh đại vận)  → lao đao, hao tổn
 *       • khắc nhập (đại vận khắc tuổi)  → xấu nhất, thất bại
 *  2. ĐỊA LỢI — hành cung đại vận sinh / khắc Mệnh.
 *       • sinh Mệnh    → tốt
 *       • đồng hành    → ổn
 *       • Mệnh sinh đv → hao
 *       • Mệnh khắc đv → vất vả
 *       • đv khắc Mệnh → xấu
 *  3. NHÂN HÒA — bộ chính tinh ở cung đại vận có "hợp" với bộ chính
 *     tinh ở Mệnh không? 4 bộ: TỬ PHỦ VŨ TƯỚNG · SÁT PHÁ THAM ·
 *     CƠ NGUYỆT ĐỒNG LƯƠNG · CỰ NHẬT.
 *       • Cùng bộ                            → tốt
 *       • Tử Phủ Vũ Tướng ↔ Cơ Nguyệt Đồng Lương → khá (yên ổn)
 *       • Sát Phá Tham gặp Cơ Nguyệt Đồng Lương → động loạn, bất lợi
 *
 * Các yếu tố bổ trợ (cộng/trừ thêm):
 *  - Độ sáng chính tinh đại vận (M/V/Đ/B/H).
 *  - Tứ Hóa: Lộc/Quyền/Khoa (+), Kỵ (−).
 *  - Lộc Tồn / Thiên Mã (Lộc Mã giao trì).
 *  - Lục cát phụ tinh (Tả Hữu Xương Khúc Khôi Việt…) → tài lộc.
 *  - Lục sát + Hình Riêu Hao Tang Hổ → thách thức.
 *  - Tuần / Triệt → đại vận chững/biến.
 */

import type { AstrologyResult, DaiVan, TuViHouse, StarEntry, FiveElement, EarthlyBranch } from '../types';

const CAT_PHU = new Set([
  'Tả Phù', 'Hữu Bật', 'Văn Xương', 'Văn Khúc', 'Thiên Khôi', 'Thiên Việt',
  'Lộc Tồn', 'Thiên Mã', 'Long Trì', 'Phượng Các', 'Tam Thai', 'Bát Tọa',
  'Ân Quang', 'Thiên Quý', 'Thai Phụ', 'Phong Cáo', 'Quốc Ấn', 'Thiên Phúc',
  'Thiên Quan', 'Thiên Đức', 'Nguyệt Đức', 'Long Đức', 'Phúc Đức', 'Thiên Hỷ',
  'Hồng Loan', 'Đào Hoa', 'Thanh Long', 'Tấu Thư', 'Hỷ Thần', 'Giải Thần',
  'Thiên Giải', 'Địa Giải',
]);
const SAT_PHU = new Set([
  'Kình Dương', 'Đà La', 'Hỏa Tinh', 'Linh Tinh', 'Địa Không', 'Địa Kiếp',
  'Thiên Hình', 'Thiên Riêu', 'Kiếp Sát', 'Đại Hao', 'Tiểu Hao', 'Tang Môn',
  'Bạch Hổ', 'Tuế Phá', 'Điếu Khách', 'Quan Phù', 'Quan Phủ', 'Phục Binh',
  'Phi Liêm', 'Bệnh Phù', 'Thiên Khốc', 'Thiên Hư', 'Cô Thần', 'Quả Tú',
  'Phá Toái', 'Thiên Thương', 'Thiên Sứ',
]);
const BRIGHT_PT: Record<string, number> = {
  miếu: 18, vượng: 14, đắc: 9, bình: 4, hãm: -10,
};

// Tam hợp địa chi → hành
const TAM_HOP_ELEMENT: Record<string, FiveElement> = {
  Thân: 'Thủy', Tý: 'Thủy', Thìn: 'Thủy',
  Hợi: 'Mộc', Mão: 'Mộc', Mùi: 'Mộc',
  Dần: 'Hỏa', Ngọ: 'Hỏa', Tuất: 'Hỏa',
  Tị: 'Kim', Dậu: 'Kim', Sửu: 'Kim',
};
// Địa chi → hành (đơn lẻ)
const BRANCH_ELEMENT: Record<EarthlyBranch, FiveElement> = {
  Tý: 'Thủy', Sửu: 'Thổ', Dần: 'Mộc', Mão: 'Mộc',
  Thìn: 'Thổ', Tị: 'Hỏa', Ngọ: 'Hỏa', Mùi: 'Thổ',
  Thân: 'Kim', Dậu: 'Kim', Tuất: 'Thổ', Hợi: 'Thủy',
};
const SHENG: Record<FiveElement, FiveElement> = { Kim: 'Thủy', Thủy: 'Mộc', Mộc: 'Hỏa', Hỏa: 'Thổ', Thổ: 'Kim' };
const KHAC: Record<FiveElement, FiveElement> = { Kim: 'Mộc', Mộc: 'Thổ', Thổ: 'Thủy', Thủy: 'Hỏa', Hỏa: 'Kim' };

type Relation =
  | 'sinhNhap' | 'dongHanh' | 'khacXuat' | 'sinhXuat' | 'khacNhap';
function relate(of: FiveElement, to: FiveElement): Relation {
  if (of === to) return 'dongHanh';
  if (SHENG[of] === to) return 'sinhXuat';   // mình SINH cho người
  if (SHENG[to] === of) return 'sinhNhap';   // mình được người SINH
  if (KHAC[of] === to) return 'khacXuat';    // mình KHẮC người
  return 'khacNhap';                          // mình bị người KHẮC
}

// 4 bộ chính tinh
const BO_TPV = new Set(['Tử Vi', 'Thiên Phủ', 'Vũ Khúc', 'Thiên Tướng', 'Liêm Trinh']);
const BO_SPT = new Set(['Thất Sát', 'Phá Quân', 'Tham Lang']);
const BO_CNDL = new Set(['Thiên Cơ', 'Thái Âm', 'Thiên Đồng', 'Thiên Lương']);
const BO_CN = new Set(['Cự Môn', 'Thái Dương']);
type Bo = 'TPV' | 'SPT' | 'CNDL' | 'CN' | 'VCD';
function boOf(stars: StarEntry[]): Bo {
  const c = stars.filter(s => s.type === 'chinh').map(s => s.name);
  if (c.length === 0) return 'VCD';
  // bộ nào có nhiều sao trùng nhất
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

export interface DaiVanScore {
  index: number;
  startAge: number;
  endAge: number;
  label: string;
  yearLabel: string;
  stem: string;
  branch: string;
  palaceName: string;
  taiLoc: number;
  thachThuc: number;
  rating: 'Rất tốt' | 'Tốt' | 'Khá' | 'Trung bình' | 'Nhiều thách thức';
  summary: string;
  // Phân rã 3 yếu tố để hiển thị/debug
  thienThoi: Relation;
  diaLoi: Relation;
  nhanHoa: 'cao' | 'kha' | 'binh' | 'kem';
}

function ratingOf(net: number): DaiVanScore['rating'] {
  if (net >= 55) return 'Rất tốt';
  if (net >= 42) return 'Tốt';
  if (net >= 30) return 'Khá';
  if (net >= 20) return 'Trung bình';
  return 'Nhiều thách thức';
}

// Nhân hòa: bộ đại vận vs bộ Mệnh
function nhanHoaOf(menhBo: Bo, dvBo: Bo): { level: 'cao' | 'kha' | 'binh' | 'kem'; delta: [number, number] } {
  if (menhBo === 'VCD' || dvBo === 'VCD') return { level: 'binh', delta: [0, 4] };
  if (menhBo === dvBo) return { level: 'cao', delta: [12, 0] };
  if ((menhBo === 'TPV' && dvBo === 'CNDL') || (menhBo === 'CNDL' && dvBo === 'TPV')) {
    return { level: 'kha', delta: [6, 0] };
  }
  if ((menhBo === 'CNDL' && dvBo === 'SPT') || (menhBo === 'TPV' && dvBo === 'SPT')) {
    return { level: 'kem', delta: [0, 12] };
  }
  if (menhBo === 'SPT' && dvBo === 'CNDL') return { level: 'kem', delta: [0, 8] };
  if (menhBo === 'CN' || dvBo === 'CN') return { level: 'binh', delta: [3, 3] };
  return { level: 'binh', delta: [2, 2] };
}

export function scoreDaiVan(result: AstrologyResult, dv: DaiVan): DaiVanScore {
  const birthYear = result.birthInfo.year;
  const h = result.tuViChart.houses.find(x => x.branch === dv.branch);
  const stars: StarEntry[] = h?.stars ?? [];
  const chinh = stars.filter(s => s.type === 'chinh');
  const menh = result.tuViChart.houses.find(x => x.isManh);

  // Hành của 2 bộ tam hợp
  const dvTH = TAM_HOP_ELEMENT[dv.branch];
  const tuoiTH = TAM_HOP_ELEMENT[result.tuViChart.lunarDate.yearBranch];

  // 1) THIÊN THỜI
  const thienThoi = relate(dvTH, tuoiTH); // hành đại-vận-tam-hợp tác động lên tuổi
  const TT_PT: Record<Relation, [number, number]> = {
    sinhNhap: [18, 0],
    dongHanh: [14, 0],
    khacXuat: [4, 6],
    sinhXuat: [0, 10],
    khacNhap: [0, 18],
  };

  // 2) ĐỊA LỢI: hành cung đại vận vs hành Mệnh
  const menhEl = result.tuViChart.menhElement;
  const dvEl = BRANCH_ELEMENT[dv.branch];
  const diaLoi = relate(dvEl, menhEl);
  const DL_PT: Record<Relation, [number, number]> = {
    sinhNhap: [14, 0],
    dongHanh: [8, 0],
    khacXuat: [2, 6],
    sinhXuat: [0, 6],
    khacNhap: [0, 14],
  };

  // 3) NHÂN HÒA
  const menhBo = menh ? boOf(menh.stars) : 'VCD';
  const dvBo = boOf(stars);
  const nh = nhanHoaOf(menhBo, dvBo);

  let taiLoc = 16 + TT_PT[thienThoi][0] + DL_PT[diaLoi][0] + nh.delta[0];
  let thachThuc = 8 + TT_PT[thienThoi][1] + DL_PT[diaLoi][1] + nh.delta[1];

  // Bổ trợ: độ sáng chính tinh
  if (chinh.length === 0) { taiLoc += 0; thachThuc += 10; }
  for (const s of chinh) {
    const pt = BRIGHT_PT[s.brightness ?? 'bình'] ?? 0;
    if (pt >= 0) taiLoc += pt; else thachThuc += -pt;
  }
  // Bổ trợ: phụ tinh & Tứ Hóa
  let hasLoc = false, hasMa = false;
  for (const s of stars) {
    const nm = s.name.startsWith('L. ') ? s.name.slice(3) : s.name;
    if (nm === 'Hóa Lộc') { taiLoc += 14; hasLoc = true; }
    else if (nm === 'Hóa Quyền') taiLoc += 10;
    else if (nm === 'Hóa Khoa') taiLoc += 8;
    else if (nm === 'Hóa Kỵ') thachThuc += 14;
    else if (nm === 'Lộc Tồn') { taiLoc += 10; hasLoc = true; }
    else if (nm === 'Thiên Mã') hasMa = true;
    else if (CAT_PHU.has(nm)) taiLoc += 3;
    else if (SAT_PHU.has(nm)) thachThuc += 4;
  }
  if (hasLoc && hasMa) taiLoc += 6; // Lộc Mã giao trì
  if (h?.isManh) taiLoc += 3;

  // TUẦN / TRIỆT — theo Tử Vi Hàm Số: "gặp tốt thì giảm/hoãn tốt, gặp xấu thì
  // chặn/đỡ xấu" → KHÔNG cộng thẳng vào thách thức nữa mà LÀM DỊU (dampen) yếu tố
  // đang trội. Triệt mạnh hơn Tuần; đồng cung thì cộng dồn.
  const damp = (h?.trietAt ? 0.28 : 0) + (h?.tuanAt ? 0.18 : 0);
  if (damp > 0) {
    if (taiLoc >= thachThuc) {
      // Cung đang thiên TỐT → Tuần/Triệt cắt bớt cái tốt (hoãn, gãy giữa chừng).
      taiLoc -= taiLoc * damp;
      thachThuc += 4; // vẫn thêm chút trắc trở do đình trệ
    } else {
      // Cung đang thiên XẤU → Tuần/Triệt chặn bớt cái xấu (che chắn).
      thachThuc -= thachThuc * damp;
    }
  }

  taiLoc = Math.max(4, Math.min(100, Math.round(taiLoc)));
  thachThuc = Math.max(4, Math.min(100, Math.round(thachThuc)));
  const net = taiLoc - thachThuc * 0.5;
  const rating = ratingOf(net);

  // Diễn giải ngắn
  const chinhTxt = chinh.length
    ? chinh.map(s => `${s.name}${s.brightness ? `(${s.brightness})` : ''}`).join(', ')
    : 'Vô chính diệu';
  const ttTxt: Record<Relation, string> = {
    sinhNhap: 'Thiên thời sinh nhập (rất tốt)',
    dongHanh: 'Thiên thời đồng hành (tốt)',
    khacXuat: 'Thiên thời khắc xuất (chật vật)',
    sinhXuat: 'Thiên thời sinh xuất (hao tổn)',
    khacNhap: 'Thiên thời khắc nhập (xấu)',
  };
  const dlTxt: Record<Relation, string> = {
    sinhNhap: 'Địa lợi sinh Mệnh (tốt)',
    dongHanh: 'Địa lợi đồng hành (ổn)',
    khacXuat: 'Mệnh khắc Địa lợi (vất vả)',
    sinhXuat: 'Mệnh sinh Địa lợi (hao)',
    khacNhap: 'Địa lợi khắc Mệnh (kém)',
  };
  const nhTxt = { cao: 'Nhân hòa cao', kha: 'Nhân hòa khá', binh: 'Nhân hòa trung bình', kem: 'Nhân hòa kém' }[nh.level];
  const adviceTxt =
    rating === 'Rất tốt' || rating === 'Tốt'
      ? 'Giai đoạn hanh thông — nên chủ động nắm bắt cơ hội.'
      : rating === 'Khá'
      ? 'Giai đoạn ổn định vừa phải, tiến chắc, tránh mạo hiểm lớn.'
      : rating === 'Trung bình'
      ? 'Giai đoạn cần thận trọng, củng cố nội lực.'
      : 'Giai đoạn nhiều trở ngại — nên thủ, giữ sức khỏe & tài chính.';

  const summary =
    `Đại vận tại cung ${h?.palaceName ?? dv.branch} (${dv.stem} ${dv.branch}); chính tinh: ${chinhTxt}. ` +
    `${ttTxt[thienThoi]}; ${dlTxt[diaLoi]}; ${nhTxt}. ${adviceTxt}`;

  return {
    index: dv.index,
    startAge: dv.startAge,
    endAge: dv.endAge,
    label: `${dv.startAge}-${dv.endAge}`,
    yearLabel: `${birthYear + dv.startAge - 1}-${birthYear + dv.endAge - 1}`,
    stem: dv.stem,
    branch: dv.branch,
    palaceName: h?.palaceName ?? '',
    taiLoc,
    thachThuc,
    rating,
    summary,
    thienThoi,
    diaLoi,
    nhanHoa: nh.level,
  };
}

export function scoreAllDaiVan(result: AstrologyResult): DaiVanScore[] {
  return result.daiVans.map(dv => scoreDaiVan(result, dv));
}
