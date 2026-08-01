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
import { monthStem, luuTuHoaPositions } from './phiHoa';

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

// ════════════════════════════════════════════════════════════════
//  CHI TIẾT NGUYỆT VẬN — 10 chỉ số + 8 chủ đề (THAY ĐỔI THEO TỪNG THÁNG).
//  Mỗi tháng cung lưu nguyệt DI CHUYỂN 1 cung + can tháng đổi → Lưu Tứ Hóa đổi
//  → điểm từng mảng & trạng thái từng chủ đề khác nhau giữa 12 tháng.
//  Dùng chung cho cả Nâng cao (offline) và Phân tích AI.
// ════════════════════════════════════════════════════════════════

const TAM_HOP_IDX: number[][] = [[8, 0, 4], [2, 6, 10], [5, 9, 1], [11, 3, 7]];
const tamHopIdxOf = (i: number): number[] => (TAM_HOP_IDX.find(g => g.includes(i)) ?? [i]).filter(x => x !== i);

/** Chất lượng "tĩnh" của một cung gốc (0–100) — từ chính tinh + miếu hãm + cát/sát + hóa. */
export function palaceQuality(h?: TuViHouse): number {
  if (!h) return 45;
  let s = 50;
  const chinh = h.stars.filter(x => x.type === 'chinh');
  if (chinh.length === 0) s -= 6;
  for (const st of chinh) s += BRIGHT_PT[st.brightness ?? 'bình'] ?? 0;
  for (const st of h.stars) {
    const nm = st.name.startsWith('L. ') ? st.name.slice(3) : st.name;
    if (nm === 'Hóa Lộc') s += 7;
    else if (nm === 'Hóa Quyền') s += 6;
    else if (nm === 'Hóa Khoa') s += 5;
    else if (nm === 'Hóa Kỵ') s -= 8;
    else if (nm === 'Lộc Tồn') s += 5;
    else if (CAT_PHU.has(nm)) s += 2;
    else if (SAT_PHU.has(nm)) s -= 3;
  }
  return Math.max(5, Math.min(100, Math.round(s)));
}

export type NvActivation = 'đồng cung' | 'tam hợp' | 'xung chiếu' | '';
export type NvTier = 'good' | 'mid' | 'low';

export interface NvThemeStatus {
  key: string;
  label: string;
  palace: string;          // cung gốc chủ quản chủ đề
  score: number;           // 0–10 (đã tính tác động tháng — thang đồng nhất toàn app)
  status: string;          // 'Thuận lợi' | 'Khá' | 'Trung tính' | 'Cần thận trọng'
  activation: NvActivation;// tháng này kích hoạt cung đó theo dạng nào
  luuHoa: string;          // Lưu hóa rơi vào cung này (nếu có) — 'Hóa Lộc'…
  note: string;            // diễn giải động theo tháng
  action: string;          // 1 hành động cụ thể
}

export interface NguyetVanDetail {
  month: number;
  branch: EarthlyBranch;
  palaceName: string;
  monthCan: string;
  chinhTinh: string[];
  tamHopPalaces: string[];
  xungPalace: string;
  luuHoa: { hoa: string; star: string; palace: string; branch: string }[];
  scores: { key: string; label: string; value: number; isRisk?: boolean }[]; // 10 chỉ số, mỗi chỉ số thang 0–10
  themes: NvThemeStatus[];                                                    // 8 chủ đề
}

// 8 chủ đề (mục 4 khung Nam Phái) → cung gốc chủ quản.
export const THEME_DEFS: { key: string; label: string; palace: string }[] = [
  { key: 'congViec', label: 'Công việc', palace: 'Quan Lộc' },
  { key: 'taiChinh', label: 'Tài chính', palace: 'Tài Bạch' },
  { key: 'kinhDoanh', label: 'Kinh doanh / Đối tác', palace: 'Thiên Di' },
  { key: 'honNhan', label: 'Hôn nhân / Quan hệ', palace: 'Phu Thê' },
  { key: 'giaDinh', label: 'Gia đình', palace: 'Phụ Mẫu' },
  { key: 'taiSan', label: 'Tài sản / Nhà đất', palace: 'Điền Trạch' },
  { key: 'sucKhoe', label: 'Sức khỏe', palace: 'Tật Ách' },
  { key: 'hocTap', label: 'Học tập / Nâng cấp bản thân', palace: 'Phúc Đức' },
];

// Hành động cụ thể theo chủ đề × bậc (good/mid/low).
const THEME_ACTION: Record<string, Record<NvTier, string>> = {
  congViec: {
    good: 'Đẩy mạnh việc trọng tâm, xin phụ trách dự án, trình bày kế hoạch, chốt KPI quan trọng.',
    mid: 'Hoàn thiện việc dang dở, củng cố chuyên môn, chưa vội nhận thêm trách nhiệm lớn.',
    low: 'Giữ nhịp, tránh va chạm với cấp trên/đồng nghiệp, không quyết định nhân sự vội.',
  },
  taiChinh: {
    good: 'Thu hồi công nợ, chốt đơn, cân nhắc khoản đầu tư đã nghiên cứu kỹ.',
    mid: 'Lập ngân sách, theo dõi dòng tiền, ưu tiên tích lũy hơn chi lớn.',
    low: 'Siết chi tiêu, hoãn đầu tư/cho vay/bảo lãnh, kiểm tra hợp đồng tài chính kỹ.',
  },
  kinhDoanh: {
    good: 'Mở rộng quan hệ, gặp đối tác, đàm phán hợp tác, tìm khách hàng mới.',
    mid: 'Chăm sóc quan hệ sẵn có, thử nghiệm thị trường ở quy mô nhỏ.',
    low: 'Thận trọng khi ký kết, rà soát điều khoản, tránh hợp tác mới chưa kiểm chứng.',
  },
  honNhan: {
    good: 'Dành thời gian cho bạn đời, hâm nóng tình cảm, giải quyết khúc mắc bằng đối thoại.',
    mid: 'Lắng nghe nhiều hơn, duy trì sự quan tâm đều đặn, tránh để hiểu lầm tích tụ.',
    low: 'Giữ lời nói ôn hòa, tránh tranh cãi gay gắt, lùi một bước khi căng thẳng.',
  },
  giaDinh: {
    good: 'Quây quần gia đình, thăm hỏi cha mẹ, giải quyết việc nhà còn tồn đọng.',
    mid: 'Duy trì kết nối, san sẻ việc nhà, quan tâm sức khỏe người thân.',
    low: 'Nhẫn nhịn với người lớn tuổi, tránh để mâu thuẫn gia đình bùng phát.',
  },
  taiSan: {
    good: 'Xem xét mua/bán/sửa chữa nhà đất đã tính toán; củng cố tài sản tích lũy.',
    mid: 'Bảo trì, dọn dẹp, lên kế hoạch tài sản dài hạn, chưa vội giao dịch lớn.',
    low: 'Hoãn giao dịch bất động sản lớn, kiểm tra pháp lý giấy tờ thật kỹ.',
  },
  sucKhoe: {
    good: 'Duy trì vận động, dưỡng sinh, tận dụng năng lượng tốt để xây thói quen lành mạnh.',
    mid: 'Ngủ đủ, ăn điều độ, theo dõi các dấu hiệu nhỏ của cơ thể.',
    low: 'Khám sức khỏe, giảm thức khuya/rượu bia, tránh gắng sức và stress kéo dài.',
  },
  hocTap: {
    good: 'Đăng ký khóa học, đọc sách chuyên môn, học kỹ năng mới — tinh thần đang sắc bén.',
    mid: 'Ôn lại kiến thức, hệ thống hóa ghi chú, học đều mỗi ngày một chút.',
    low: 'Học nhẹ nhàng để giữ phong độ, tránh ôm đồm quá nhiều cùng lúc.',
  },
};

const tierOf = (score: number): NvTier => (score >= 62 ? 'good' : score >= 46 ? 'mid' : 'low');
const statusOf = (score: number): string =>
  score >= 70 ? 'Thuận lợi' : score >= 55 ? 'Khá' : score >= 42 ? 'Trung tính' : 'Cần thận trọng';

const HOA_BONUS: Record<string, number> = { 'Hóa Lộc': 10, 'Hóa Quyền': 7, 'Hóa Khoa': 6, 'Hóa Kỵ': -12 };

/**
 * Chi tiết Nguyệt vận 1 tháng: 10 chỉ số + 8 chủ đề, biến thiên theo tháng.
 */
export function nguyetVanDetail(result: AstrologyResult, age: number, month: number): NguyetVanDetail | null {
  const sc = scoreNguyetVan(result, age, month);
  const branch = nguyetVanBranch(result, age, month);
  if (!sc || !branch) return null;

  const houses = result.tuViChart.houses;
  const byBranchIdx = (i: number) => houses.find(h => bIdx(h.branch) === i);
  const byName = (name: string) => houses.find(h => h.palaceName === name);

  const mIdx = bIdx(branch);
  const tamHopIdx = tamHopIdxOf(mIdx);
  const xungIdx = (mIdx + 6) % 12;
  const monthHouse = byBranchIdx(mIdx);

  const tamHopPalaces = tamHopIdx.map(i => byBranchIdx(i)?.palaceName).filter(Boolean) as string[];
  const xungPalace = byBranchIdx(xungIdx)?.palaceName ?? '';
  const chinhTinh = (monthHouse?.stars ?? []).filter(s => s.type === 'chinh')
    .map(s => `${s.name}${s.brightness ? `(${s.brightness})` : ''}`);

  const tv = result.tieuVans.find(x => x.age === age);
  const monthCan = tv ? monthStem(tv.yearStem, month) : '';
  const luuHoa = monthCan ? luuTuHoaPositions(result.tuViChart, monthCan) : [];

  const activationOf = (pIdx: number): NvActivation =>
    pIdx === mIdx ? 'đồng cung' : tamHopIdx.includes(pIdx) ? 'tam hợp' : pIdx === xungIdx ? 'xung chiếu' : '';

  // Điểm 1 cung gốc CÓ tính tác động của tháng (kích hoạt + lưu hóa rơi vào cung).
  const palaceMonthScore = (palaceName: string): { score: number; act: NvActivation; hoa: string } => {
    const h = byName(palaceName);
    let s = palaceQuality(h);
    const act = h ? activationOf(bIdx(h.branch)) : '';
    if (act === 'đồng cung') s += 12;
    else if (act === 'tam hợp') s += 7;
    else if (act === 'xung chiếu') s += 2;
    let hoa = '';
    for (const lh of luuHoa) {
      if (lh.palace === palaceName) { s += HOA_BONUS[lh.hoa] ?? 0; hoa = lh.hoa; }
    }
    return { score: Math.max(5, Math.min(100, Math.round(s))), act, hoa };
  };

  // Quy đổi thang 0–100 (nội bộ) → thang 0–10 (đồng nhất với các chức năng khác), làm tròn.
  const to10 = (v: number) => Math.max(1, Math.min(10, Math.round(v / 10)));

  // ── 8 CHỦ ĐỀ ──
  const themes: NvThemeStatus[] = THEME_DEFS.map(def => {
    const { score: score100, act, hoa } = palaceMonthScore(def.palace);
    const tier = tierOf(score100);
    const actTxt =
      act === 'đồng cung' ? `Tháng này lưu nguyệt ĐÓNG ngay tại cung ${def.palace} → chủ đề được kích hoạt MẠNH NHẤT.`
      : act === 'tam hợp' ? `Cung ${def.palace} nằm trong TAM HỢP với cung lưu nguyệt → được hỗ trợ/cộng hưởng tháng này.`
      : act === 'xung chiếu' ? `Cung ${def.palace} XUNG CHIẾU với cung lưu nguyệt → có tác động nhưng kèm lực đối nghịch, dễ căng.`
      : `Cung ${def.palace} không bị tháng này kích hoạt trực tiếp → giữ nhịp nền.`;
    const hoaTxt =
      hoa === 'Hóa Lộc' ? ' Có Lưu Lộc rơi vào → đây là CỬA CƠ HỘI rõ nhất của tháng.'
      : hoa === 'Hóa Quyền' ? ' Có Lưu Quyền → tăng quyền hành/trách nhiệm, nên chủ động đảm nhận.'
      : hoa === 'Hóa Khoa' ? ' Có Lưu Khoa → dễ gặp quý nhân, được công nhận.'
      : hoa === 'Hóa Kỵ' ? ' ⚠ Có Lưu Kỵ → ĐIỂM NGHẼN cần quản trị rủi ro ở mảng này.'
      : '';
    return {
      key: def.key, label: def.label, palace: def.palace, score: to10(score100),
      status: statusOf(score100), activation: act, luuHoa: hoa,
      note: actTxt + hoaTxt,
      action: THEME_ACTION[def.key][tier],
    };
  });

  // ── 10 CHỈ SỐ (mục 5 khung Nam Phái) ──
  const ps = (name: string) => palaceMonthScore(name).score;
  const tongKhi = Math.max(5, Math.min(100, Math.round(50 + (sc.taiLoc - sc.thachThuc) / 2)));
  const aus = luuHoa.filter(l => l.hoa !== 'Hóa Kỵ').length;          // số lưu cát
  const kyCount = luuHoa.filter(l => l.hoa === 'Hóa Kỵ').length;       // số lưu kỵ
  const monthCS = monthHouse
    ? { cat: monthHouse.stars.filter(s => CAT_PHU.has(s.name.replace(/^L\. /, ''))).length,
        sat: monthHouse.stars.filter(s => SAT_PHU.has(s.name.replace(/^L\. /, ''))).length }
    : { cat: 0, sat: 0 };
  const coHoi = Math.max(5, Math.min(100, Math.round(42 + aus * 11 + monthCS.cat * 4 + (sc.taiLoc - 50) * 0.3)));
  const ruiRo = Math.max(5, Math.min(100, Math.round(28 + kyCount * 16 + monthCS.sat * 6 + (sc.thachThuc - 50) * 0.4
    + ((monthHouse?.tuanAt || monthHouse?.trietAt) ? 6 : 0))));

  const scores: NguyetVanDetail['scores'] = [
    { key: 'tongKhi', label: 'Tổng khí tháng', value: to10(tongKhi) },
    { key: 'congViec', label: 'Công việc', value: to10(ps('Quan Lộc')) },
    { key: 'taiChinh', label: 'Tài chính', value: to10(ps('Tài Bạch')) },
    { key: 'kinhDoanh', label: 'Kinh doanh', value: to10(ps('Thiên Di')) },
    { key: 'quanHe', label: 'Quan hệ', value: to10(ps('Nô Bộc')) },
    { key: 'giaDao', label: 'Gia đạo', value: to10(ps('Phụ Mẫu')) },
    { key: 'honNhan', label: 'Hôn nhân', value: to10(ps('Phu Thê')) },
    { key: 'sucKhoe', label: 'Sức khỏe', value: to10(ps('Tật Ách')) },
    { key: 'coHoi', label: 'Cơ hội', value: to10(coHoi) },
    { key: 'ruiRo', label: 'Rủi ro', value: to10(ruiRo), isRisk: true },
  ];

  return {
    month, branch, palaceName: sc.palaceName, monthCan,
    chinhTinh, tamHopPalaces, xungPalace, luuHoa, scores, themes,
  };
}
