/**
 * OFFLINE LUẬN GIẢI TOÀN LÁ SỐ — không cần internet, không tốn xu.
 *
 * Sản phẩm dùng làm tab "Nâng cao" cho FullChartAIScreen (hoặc bất kỳ chỗ nào
 * cần phân tích đầy đủ mà chưa muốn gọi AI). Nút "🤖 Phân tích AI" giữ nguyên
 * cho người dùng nâng cấp lên AI khi muốn nội dung sâu/linh hoạt hơn.
 *
 * Bám sát phương pháp A-Z (tuvi.cohoc.net) gồm 5 bước:
 *   1) Tổng quan bố cục
 *   2) Xem 12 cung theo thứ tự ưu tiên (Nam/Nữ khác nhau)
 *   3) Ý nghĩa miếu hãm + cách cục
 *   4) Vận trình theo 3 yếu tố cụ Thiên Lương (scoreDaiVan)
 *   5) Kết luận tổng hợp + lời khuyên
 *
 * 100% rule-based, dùng dữ liệu lá số + KB sẵn có (KHAI_QUAT_12_CUNG,
 * CHINH_TINH_CORE, STAR_INFO, CACH_CUC, scoreDaiVan). Không bịa thêm sao.
 */

import type { AstrologyResult, TuViHouse, StarEntry } from '../types';
import { KHAI_QUAT_12_CUNG, CHINH_TINH_CORE } from '../data/lasoLuanGiaiGuide';
import { detectCachCucInPalace } from '../data/cachCuc';
import { getStarInfo } from '../data/starInfo';
import { scoreDaiVan } from '../core/daiVanScore';
import { scoreTieuVan } from '../core/tieuVanScore';
import { scoreNguyetVan, nguyetVanDetail } from '../core/nguyetVanScore';
import { careerSuggestion } from '../data/careerByStar';
import { luuStarsTamPhuong, luuStarsTamPhuongPos, yearVsTuoi, LUU_HUNG, type LuuStarPos } from '../core/luuStars';
import { computePhiHoa, summarizeYearHoa, aggregatePhiHoa, luuTuHoaPositions, monthStem } from './phiHoa';
import { generateCachCucOfflineSection, cachCucActivationBlock, detectAllCachCuc, CORE_PALACES } from './cachCucEngine';

// ---- helpers ----

const BRANCHES = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tị', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
const branchIdx = (b: string) => BRANCHES.indexOf(b);

const TAM_HOP: number[][] = [[8, 0, 4], [2, 6, 10], [5, 9, 1], [11, 3, 7]]; // Thủy, Hỏa, Kim, Mộc
const TAM_HOP_ELEMENT = ['Thủy', 'Hỏa', 'Kim', 'Mộc'];
const NHI_HOP: Record<number, number> = {
  0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6,
};

function tamHopOf(b: string): { group: number[]; element: string } {
  const i = branchIdx(b);
  for (let g = 0; g < 4; g++) {
    if (TAM_HOP[g].includes(i)) return { group: TAM_HOP[g], element: TAM_HOP_ELEMENT[g] };
  }
  return { group: [], element: '?' };
}

// Sinh khắc ngũ hành — true nếu a sinh b
const SINH: Record<string, string> = { Mộc: 'Hỏa', Hỏa: 'Thổ', Thổ: 'Kim', Kim: 'Thủy', Thủy: 'Mộc' };
const KHAC: Record<string, string> = { Mộc: 'Thổ', Thổ: 'Thủy', Thủy: 'Hỏa', Hỏa: 'Kim', Kim: 'Mộc' };

function relate(a: string, b: string): 'sinhNhap' | 'dongHanh' | 'khacXuat' | 'sinhXuat' | 'khacNhap' {
  if (a === b) return 'dongHanh';
  if (SINH[a] === b) return 'sinhXuat';   // a sinh b → a hao
  if (SINH[b] === a) return 'sinhNhap';   // b sinh a → a được nuôi
  if (KHAC[a] === b) return 'khacXuat';   // a khắc b → a chủ động
  if (KHAC[b] === a) return 'khacNhap';   // b khắc a → a bị
  return 'dongHanh';
}

const RELATE_TXT: Record<string, string> = {
  sinhNhap: 'sinh nhập (được nuôi)',
  dongHanh: 'đồng hành (hòa)',
  khacXuat: 'khắc xuất (chủ động vượt)',
  sinhXuat: 'sinh xuất (hao tổn)',
  khacNhap: 'khắc nhập (bị thiệt)',
};

// Các bộ chính tinh chuẩn
const BO_CHINH_TINH: Record<string, string[]> = {
  'Tử Phủ Vũ Tướng': ['Tử Vi', 'Thiên Phủ', 'Vũ Khúc', 'Thiên Tướng'],
  'Sát Phá Tham Liêm': ['Thất Sát', 'Phá Quân', 'Tham Lang', 'Liêm Trinh'],
  'Cơ Nguyệt Đồng Lương': ['Thiên Cơ', 'Thái Âm', 'Thiên Đồng', 'Thiên Lương'],
  'Cự Nhật': ['Cự Môn', 'Thái Dương'],
};

function detectBoChinhTinh(stars: string[]): string[] {
  const set = new Set(stars);
  const matched: string[] = [];
  for (const [name, members] of Object.entries(BO_CHINH_TINH)) {
    const hits = members.filter(m => set.has(m)).length;
    if (hits >= 2) matched.push(`${name} (${hits}/${members.length})`);
  }
  return matched;
}

function chinhTinhOf(h: TuViHouse): string[] {
  return h.stars.filter(s => s.type === 'chinh').map(s => s.name);
}

function chinhTinhFull(h: TuViHouse): string[] {
  return h.stars.filter(s => s.type === 'chinh')
    .map(s => `${s.name}${s.brightness ? ` (${miniBright(s.brightness)})` : ''}`);
}

function miniBright(b?: string): string {
  if (!b) return '';
  if (b === 'miếu') return 'Miếu';
  if (b === 'vượng') return 'Vượng';
  if (b === 'đắc') return 'Đắc';
  if (b === 'bình') return 'Bình';
  return 'Hãm';
}

function brightScore(b?: string): number {
  if (b === 'miếu') return 2;
  if (b === 'vượng') return 1.5;
  if (b === 'đắc') return 1;
  if (b === 'bình') return 0;
  if (b === 'hãm') return -1.5;
  return 0;
}

function phuTinhOf(h: TuViHouse, max = 10): string[] {
  return h.stars
    .filter(s => s.type !== 'chinh' && !s.name.startsWith('L. '))
    .slice(0, max)
    .map(s => s.name);
}

const CAT_TINH = new Set([
  'Lộc Tồn', 'Hóa Lộc', 'Hóa Quyền', 'Hóa Khoa',
  'Thiên Khôi', 'Thiên Việt', 'Tả Phù', 'Hữu Bật',
  'Văn Xương', 'Văn Khúc', 'Thiên Quan', 'Thiên Phúc',
  'Long Trì', 'Phượng Các', 'Thiên Đức', 'Nguyệt Đức',
  'Quang Quý', 'Ân Quang', 'Thiên Quý', 'Tam Thai', 'Bát Tọa',
  'Đào Hoa', 'Hồng Loan', 'Thiên Hỷ', 'Thiên Mã',
]);
const SAT_TINH = new Set([
  'Kình Dương', 'Đà La', 'Linh Tinh', 'Hỏa Tinh',
  'Địa Không', 'Địa Kiếp', 'Thiên Không', 'Hóa Kỵ',
  'Thiên Hình', 'Thiên Riêu', 'Kiếp Sát',
]);

/** Đếm cát/sát tinh ở tầng LÁ SỐ GỐC — KHÔNG tính sao lưu (sao lưu chỉ dùng cho tiểu vận/nhật vận). */
function countCatSat(h: TuViHouse): { cat: number; sat: number } {
  let cat = 0, sat = 0;
  for (const s of h.stars) {
    if (s.type === 'luu') continue;
    const n = s.name;
    if (CAT_TINH.has(n)) cat++;
    if (SAT_TINH.has(n)) sat++;
  }
  return { cat, sat };
}

function trimText(s: string | undefined, _n?: number): string {
  // Nội dung offline không tốn token → giữ đầy đủ, không cắt dấu "…".
  if (!s) return '';
  return s;
}

/** Đánh giá cung vốn tốt hay xấu (để luận Tuần/Triệt cụ thể). */
function palaceGoodness(h: TuViHouse): { good: boolean; vcd: boolean } {
  let score = 0;
  const chinh = h.stars.filter(s => s.type === 'chinh');
  for (const s of chinh) {
    if (s.brightness === 'miếu' || s.brightness === 'vượng') score += 2;
    else if (s.brightness === 'đắc') score += 1;
    else if (s.brightness === 'hãm') score -= 2;
  }
  const cs = countCatSat(h);
  score += cs.cat - cs.sat;
  if (chinh.length === 0) score -= 1;
  return { good: score > 0, vcd: chinh.length === 0 };
}

/** Câu luận Tuần/Triệt CỤ THỂ cho 1 cung (gặp tốt giảm tốt, gặp xấu che xấu). */
function tuanTrietVerdict(h: TuViHouse): string {
  if (!h.tuanAt && !h.trietAt) return '';
  const g = palaceGoodness(h);
  const which = h.trietAt && h.tuanAt ? 'cả Tuần Không và Triệt Lộ'
    : h.trietAt ? 'Triệt Lộ (cắt ngang, mạnh)' : 'Tuần Không (làm chậm, nhẹ hơn Triệt)';
  if (g.vcd) {
    return `Cung vô chính diệu lại bị ${which} án ngữ — nương sao xung chiếu, đôi khi thành cách "đắc Không" hậu phát, nhưng nửa đầu đời lận đận, định hướng muộn. `;
  }
  if (g.good) {
    return `Cung vốn TỐT nhưng bị ${which} án ngữ — cái hay bị GIẢM/HOÃN, thành tựu đến muộn, dễ gãy giữa chừng rồi mới ổn (mạnh nhất ở nửa đầu đời). `;
  }
  return `Cung vốn nhiều bất lợi, may có ${which} án ngữ CHE CHẮN bớt cái hung — tai họa, trắc trở được hóa giải đáng kể. `;
}

// ---- BƯỚC 1 — TỔNG QUAN BỐ CỤC ----

function step1_TongQuan(result: AstrologyResult): string {
  const c = result.tuViChart;
  const menh = c.houses.find(h => h.isManh)!;
  const than = c.houses.find(h => h.isThan)!;
  const out: string[] = ['# Tổng quan bố cục lá số', ''];

  // Âm Dương thuận/nghịch
  out.push(`• Âm Dương: lá số ${c.amDuongThuanLy === 'thuận' ? 'THUẬN LÝ' : 'NGHỊCH LÝ'} ` +
    `(Năm sinh và cung Mệnh ${c.amDuongThuanLy === 'thuận' ? 'cùng tính → hanh thông, ít trở ngại nội tại' : 'khác tính → cuộc đời thường có nhiều khúc quanh, dễ thay đổi'}).`);

  // Bản Mệnh vs Cục
  const cucEl = c.cucName.includes('Thủy') ? 'Thủy'
    : c.cucName.includes('Mộc') ? 'Mộc'
    : c.cucName.includes('Hỏa') ? 'Hỏa'
    : c.cucName.includes('Thổ') ? 'Thổ'
    : c.cucName.includes('Kim') ? 'Kim' : '?';
  const napEl = c.napAmMenh.split(' ').pop() || '?';
  const rel = relate(napEl, cucEl);
  out.push(`• Bản Mệnh (${c.napAmMenh}) vs Cục (${c.cucName}): ${RELATE_TXT[rel]}. ` +
    (rel === 'sinhNhap' || rel === 'dongHanh'
      ? 'Hai yếu tố tương trợ — căn cơ vững.'
      : rel === 'khacXuat'
      ? 'Mệnh khắc Cục — chủ động vượt được cục diện, nhưng vất vả.'
      : rel === 'sinhXuat'
      ? 'Mệnh phải nuôi Cục — dễ hao tổn căn lực.'
      : 'Cục khắc Mệnh — cần cẩn trọng, tích lũy âm đức để hóa giải.'));

  // Tam hợp Mệnh & Thân
  const thM = tamHopOf(menh.branch);
  const thT = tamHopOf(than.branch);
  out.push(`• Mệnh tại ${menh.branch} (tam hợp hành ${thM.element}); Thân tại ${than.branch} (tam hợp hành ${thT.element})` +
    (menh.branch === than.branch ? ' — MỆNH THÂN ĐỒNG CUNG, cá tính rõ rệt, đời tập trung quanh một trục.' : '.'));

  // Cung xung chiếu Mệnh = Thiên Di
  const tdIdx = (branchIdx(menh.branch) + 6) % 12;
  const td = c.houses.find(h => branchIdx(h.branch) === tdIdx);
  if (td) {
    const tdChinh = chinhTinhFull(td);
    out.push(`• Cung Thiên Di (xung chiếu Mệnh) — ${td.branch}: ${tdChinh.join(', ') || 'Vô chính diệu'}. ` +
      'Thiên Di là "đối phương" — ảnh hưởng mạnh đến cách Mệnh tương tác với xã hội bên ngoài.');
  }

  // Cung nhị hợp
  const nhIdx = NHI_HOP[branchIdx(menh.branch)];
  const nh = c.houses.find(h => branchIdx(h.branch) === nhIdx);
  if (nh) {
    out.push(`• Cung nhị hợp Mệnh — ${nh.palaceName} (${nh.branch}): bổ túc thêm cho cung Mệnh.`);
  }

  // Bộ chính tinh Mệnh
  const menhChinh = chinhTinhOf(menh);
  const bo = detectBoChinhTinh(menhChinh.concat(
    menh.stars.filter(s => s.type === 'chinh').map(s => s.name),
    // mở rộng sang tam hợp
    ...thM.group.map(i => c.houses.find(h => branchIdx(h.branch) === i)?.stars.filter(s => s.type === 'chinh').map(s => s.name) || []),
  ));
  if (bo.length) {
    out.push(`• BỘ CÁCH chính tinh hội Mệnh (tam phương): ${bo.join('; ')}.`);
  } else if (menhChinh.length === 0) {
    out.push('• Cung Mệnh VÔ CHÍNH DIỆU — cần xét sao Mượn từ xung chiếu (Thiên Di) và các phụ tinh đắc cách để định cốt cách.');
  }

  // Miếu/hãm sao thủ Mệnh
  for (const s of menh.stars.filter(x => x.type === 'chinh')) {
    if (s.brightness) {
      out.push(`• ${s.name} thủ Mệnh ở mức ${miniBright(s.brightness)}` +
        (s.brightness === 'miếu' || s.brightness === 'vượng' ? ' — phát huy tinh hoa, là điểm tựa của lá số.'
        : s.brightness === 'đắc' ? ' — đủ lực thể hiện tính chất.'
        : s.brightness === 'hãm' ? ' — bị hãm địa, cần các cát tinh khác cứu giải.'
        : ' — thường lực, tùy phụ tinh quanh đó.'));
    }
  }

  // Cân đo cát/sát Mệnh
  const cs = countCatSat(menh);
  out.push(`• Cân đo Mệnh: ${cs.cat} cát tinh / ${cs.sat} sát tinh. ` +
    (cs.cat > cs.sat * 1.5 ? 'Thiên về tốt — quý nhân phù trợ.'
    : cs.sat > cs.cat * 1.5 ? 'Thiên về sát — cần đề phòng, rèn ý chí.'
    : 'Tương đối cân bằng — đời lên xuống có thưởng có phạt.'));

  // Cách cục trong Mệnh
  const cachMenh = detectCachCucInPalace(menh.stars.filter(s => s.type !== 'luu').map(s => s.name), menh.branch, menh.palaceName);
  if (cachMenh.length) {
    out.push(`• CÁCH CỤC tại Mệnh: ${cachMenh.map(c => `${c.name} (${c.good ? 'cát' : 'hung'})`).join('; ')}.`);
  }

  // Tuần / Triệt cấp lá số — luôn nêu để người xem nắm ảnh hưởng.
  const tuanCung = c.houses.filter(h => h.tuanAt).map(h => h.palaceName);
  const trietCung = c.houses.filter(h => h.trietAt).map(h => h.palaceName);
  if (tuanCung.length || trietCung.length) {
    let tt = '• TUẦN – TRIỆT: ';
    if (trietCung.length) tt += `Triệt Lộ án ngữ tại ${trietCung.join(', ')}; `;
    if (tuanCung.length) tt += `Tuần Không án ngữ tại ${tuanCung.join(', ')}; `;
    tt += 'theo nguyên lý "gặp tốt thì giảm/hoãn, gặp xấu thì che chắn" — các cung này cần xét kỹ vì hiệu lực sao bị lệch, nhất là ở nửa đầu đời (Triệt mạnh hơn Tuần).';
    out.push(tt);
    if (menh.tuanAt || menh.trietAt) {
      out.push(`• Đáng lưu ý: chính cung MỆNH bị ${menh.trietAt ? 'Triệt Lộ' : ''}${menh.trietAt && menh.tuanAt ? ' và ' : ''}${menh.tuanAt ? 'Tuần Không' : ''} — cuộc đời thường khởi đầu chậm/trắc trở, công danh sự nghiệp phát muộn, qua trung niên mới dần ổn (Mệnh vô chính diệu gặp Tuần/Triệt đôi khi lại thành cách hậu phát).`);
    }
  } else {
    out.push('• TUẦN – TRIỆT: lá số không có cung nào bị Tuần/Triệt án ngữ — hiệu lực các sao phát huy trọn vẹn, ít bị "lệch".');
  }

  // ─── ĐOẠN PHÂN TÍCH TỔNG HÒA (không liệt kê) ───
  out.push('');
  out.push('**📖 Đọc tổng hòa các yếu tố trên:**');
  const synth: string[] = [];
  synth.push(`Lá số này thuộc kiểu ${c.amDuongThuanLy === 'thuận' ? '"thuận lý" — vận hành theo dòng tự nhiên, ít cú giật cục lớn' : '"nghịch lý" — cuộc đời có nhiều khúc quanh, không đi theo đường thẳng; chính những lần "đổi hướng" đó lại định hình nên bản lĩnh'}.`);
  if (rel === 'sinhNhap' || rel === 'dongHanh') {
    synth.push('Quan hệ Bản Mệnh và Cục hòa hợp — nội lực không bị tiêu hao đối kháng với cục diện, nên đường đời nói chung là thuận; cơ hội và thành quả đến tương xứng với năng lực bỏ ra, ít phải gắng sức quá mức.');
  } else if (rel === 'khacXuat') {
    synth.push('Mệnh khắc Cục — bạn thuộc kiểu phải CHỦ ĐỘNG vượt qua cục diện chứ không hưởng sẵn; vất vả hơn người nhưng cũng dễ hình thành nội lực và chiều sâu, thường thành đạt sau tuổi trung niên hơn là phát sớm.');
  } else if (rel === 'sinhXuat') {
    synth.push('Mệnh sinh Cục — bạn dễ "tốn sức nuôi hoàn cảnh"; cần học cách tiết chế, không gánh hộ người khác quá nhiều, dồn sức vào việc trọng yếu của riêng mình.');
  } else {
    synth.push('Cục khắc Mệnh — cục diện tạo áp lực ngược lên bản thân; cuộc đời cần đặc biệt thận trọng giai đoạn đầu, tích lũy âm đức và chọn môi trường có quý nhân thì sẽ chuyển hóa được.');
  }
  if (menh.branch === than.branch) {
    synth.push('Mệnh-Thân đồng cung — cá tính của bạn rất rõ rệt, đời tập trung quanh MỘT trục chính (không bị "chia hai"); nếu chọn đúng hướng thì đi sâu, đi xa, nhưng nếu chọn nhầm hướng thì khó đổi giữa đường.');
  } else {
    synth.push(`Mệnh ở ${menh.palaceName}(${menh.branch}) còn Thân ở ${than.palaceName}(${than.branch}) — nửa đầu đời (trước ~30 tuổi) sống theo chất Mệnh, nửa sau dần chuyển theo chất Thân. Đây là lá số có "2 chương" rõ rệt — chuẩn bị tốt thì cú chuyển này thành bệ phóng, ngược lại thì dễ chao đảo.`);
  }
  if (cs.cat + cs.sat > 0) {
    if (cs.cat > cs.sat * 1.5) synth.push('Mệnh cung thiên về cát — quý nhân nhiều, đời được nâng đỡ; cần lưu ý chính là KHÔNG ỷ lại vào may mắn, vẫn phải tự rèn năng lực thực.');
    else if (cs.sat > cs.cat * 1.5) synth.push('Mệnh cung thiên về sát — ý chí và bản lĩnh là tài sản chính của bạn; tuy thường phải vất vả nhưng cũng chính là cái lò tôi luyện cho thành tựu bền.');
    else synth.push('Cát-sát Mệnh cung khá cân bằng — đời lên xuống có nhịp, không quá rực rỡ cũng không quá u ám; thích hợp với lối sống "đi chắc, không vội".');
  }
  out.push(synth.join(' '));
  out.push('');
  return out.join('\n');
}

// ---- BƯỚC 2 — XEM 12 CUNG THEO THỨ TỰ ----

const ORDER_NAM = ['Mệnh', 'Thân', 'Phúc Đức', 'Quan Lộc', 'Tài Bạch', 'Thiên Di', 'Phu Thê'];
const ORDER_NU = ['Mệnh', 'Thân', 'Phúc Đức', 'Phu Thê', 'Tài Bạch', 'Tử Tức'];

// Phụ tinh đáng nêu khi liệt kê quan hệ tam hợp/nhị hợp/xung của một cung (lọc bớt sao lẻ).
const MAJOR_PHU_REL = new Set([
  'Tả Phù', 'Hữu Bật', 'Văn Xương', 'Văn Khúc', 'Thiên Khôi', 'Thiên Việt', 'Lộc Tồn', 'Thiên Mã',
  'Kình Dương', 'Đà La', 'Hỏa Tinh', 'Linh Tinh', 'Địa Không', 'Địa Kiếp', 'Thiên Hình',
  'Đào Hoa', 'Hồng Loan', 'Tang Môn', 'Bạch Hổ', 'Thiên Khốc', 'Thiên Hư', 'Thiên Riêu',
]);

/** Sao đáng chú ý của 1 cung: chính tinh (kèm miếu hãm) + Tứ Hóa + phụ tinh chính yếu. */
function notableStarsOf(hh: TuViHouse): string[] {
  const res: string[] = [];
  for (const s of hh.stars) {
    const nm = s.name.startsWith('L. ') ? s.name.slice(3) : s.name;
    if (s.type === 'chinh') res.push(`${nm}${s.brightness ? `(${s.brightness})` : ''}`);
    else if (/^Hóa (Lộc|Quyền|Khoa|Kỵ)$/.test(nm)) res.push(nm);
    else if (MAJOR_PHU_REL.has(nm)) res.push(nm);
  }
  return res;
}

/**
 * Liệt kê các sao ẢNH HƯỞNG tới một cung kèm VỊ TRÍ rõ ràng:
 * đồng cung / tam hợp (tại cung nào) / xung chiếu (từ cung nào) / nhị hợp (với cung nào).
 */
function palaceRelStars(result: AstrologyResult, h: TuViHouse): string {
  const houses = result.tuViChart.houses;
  const i = branchIdx(h.branch);
  const tamHopIdxs = tamHopOf(h.branch).group.filter(x => x !== i);
  const xungI = (i + 6) % 12;
  const nhiI = NHI_HOP[i];
  const at = (idx: number) => houses.find(x => branchIdx(x.branch) === idx);
  const parts: string[] = [];

  const same = notableStarsOf(h);
  parts.push(`  · **Đồng cung** (ngay tại ${h.palaceName}): ${same.length ? same.join(', ') : 'không có sao đáng kể'}.`);

  for (const idx of tamHopIdxs) {
    const hh = at(idx); if (!hh) continue;
    const ns = notableStarsOf(hh);
    if (ns.length) parts.push(`  · **Tam hợp** chiếu từ ${hh.palaceName} (${hh.branch}): ${ns.join(', ')}.`);
  }
  const hx = at(xungI);
  if (hx) { const ns = notableStarsOf(hx); if (ns.length) parts.push(`  · **Xung chiếu** từ ${hx.palaceName} (${hx.branch}): ${ns.join(', ')}.`); }
  if (nhiI !== i) {
    const hn = at(nhiI);
    if (hn) { const ns = notableStarsOf(hn); if (ns.length) parts.push(`  · **Nhị hợp** với ${hn.palaceName} (${hn.branch}): ${ns.join(', ')}.`); }
  }
  return ['Các sao ảnh hưởng tới cung này (theo vị trí):', ...parts].join('\n');
}

/** Sinh đoạn phân tích "hệ quả thực tế" cho 1 cung — tránh dạng liệt kê khô khan. */
function synthesizePalaceImpact(
  h: TuViHouse,
  chinhNames: string[],
  cs: { cat: number; sat: number },
  ca: { name: string; good: boolean }[],
): string {
  const pal = h.palaceName;
  const goodCach = ca.some(x => x.good);
  const badCach = ca.some(x => !x.good);
  const strong = cs.cat > cs.sat * 1.3 || goodCach;
  const weak = cs.sat > cs.cat * 1.3 || badCach;
  const stale = h.tuanAt || h.trietAt;
  const isVCD = chinhNames.length === 0;

  let tone: string;
  if (stale && strong) tone = `khí cung vốn vượng nhưng bị Tuần/Triệt tiết chế — tài năng sẵn có thường phát muộn, đến trung niên mới định hình rõ`;
  else if (stale && weak) tone = `khí cung vốn nhược lại bị Tuần/Triệt cản — vận hành cung này luôn chậm hơn người khác một nhịp, cần kiên nhẫn dài hơi`;
  else if (strong && goodCach) tone = `cung này là một trong những điểm tựa lớn của lá số — vận hành thuận lợi gần như tự nhiên`;
  else if (strong) tone = `cung có nội lực khá, đủ để chủ động xoay sở trong cung này`;
  else if (weak && badCach) tone = `cung này là một điểm yếu cần dụng công nhiều mới gỡ — không nên đặt kỳ vọng quá lớn vào việc phát đại trong cung này`;
  else if (weak) tone = `cung có sát khí trội — phải chủ động phòng bị, lấy ổn định bù cho thiếu hụt sao tốt`;
  else if (isVCD) tone = `cung vô chính diệu, vận hành phụ thuộc vào sao mượn từ xung chiếu — tính chất bị "vay mượn" nên dễ thay đổi theo hoàn cảnh`;
  else tone = `cung tương đối cân bằng — không có cú phát lớn nhưng cũng ít rủi ro trầm trọng`;

  const lifeAdvice: Record<string, [string, string]> = {
    'Mệnh': ['cốt cách của bạn vận hành theo lối', 'biết mình mạnh ở đâu, yếu ở đâu để chủ động chọn môi trường phát triển'],
    'Thân': ['nửa sau cuộc đời sẽ chuyển dần theo hướng', 'chú ý giai đoạn từ 30-35 trở đi khi Thân lên ngôi'],
    'Phúc Đức': ['phúc khí tổ tiên và lối sống tinh thần ở dạng', 'làm việc thiện đều đặn, giữ tâm an để dưỡng phúc'],
    'Quan Lộc': ['đường công danh, nghề nghiệp đi theo lối', 'chọn ngành nghề tận dụng được điểm mạnh của cung này'],
    'Tài Bạch': ['cách kiếm và giữ tiền của bạn ở dạng', 'lập chiến lược tài chính bám sát đặc tính cung — không bắt chước người khác'],
    'Phu Thê': ['đời sống hôn nhân vận hành theo lối', 'chọn bạn đời và cách ứng xử trong hôn nhân phù hợp với chất cung này'],
    'Tử Tức': ['quan hệ với con cái/thế hệ sau ở dạng', 'điều chỉnh kỳ vọng và cách nuôi dạy theo chất cung'],
    'Tài': ['', ''],
    'Điền Trạch': ['nhà cửa, tài sản cố định vận hành theo', 'việc mua bán bất động sản nên cân nhắc theo nhịp đại vận'],
    'Thiên Di': ['cách bạn bộc lộ ra ngoài và mối duyên với phương xa ở dạng', 'cân nhắc kỹ về việc xa quê và chọn môi trường ngoài'],
    'Nô Bộc': ['quan hệ bạn bè, cộng sự, thuộc cấp ở dạng', 'chọn lọc kỹ người đồng hành dài hạn'],
    'Phụ Mẫu': ['gốc gác, quan hệ với cha mẹ và bề trên ở dạng', 'biết ơn nguồn cội, ứng xử khéo với người trên'],
    'Huynh Đệ': ['tình anh em, bạn hữu cùng vai vế ở dạng', 'biết giữ khoảng cách hợp lý — không kỳ vọng quá ở quan hệ ngang vai'],
    'Tật Ách': ['nền tảng sức khỏe và những tật bệnh tiềm ẩn ở dạng', 'khám định kỳ và phòng bệnh hơn chữa bệnh, không chủ quan'],
  };
  const [intro, tip] = lifeAdvice[pal] || ['cung này chủ quản vận hành ở dạng', 'điều chỉnh kỳ vọng cho hợp với chất cung'];
  return `${intro ? intro + ' ' : ''}${tone}. Lời khuyên: ${tip}.`;
}

/** Bản phân tích 1 cung cho "Phân tích 12 cung" — nội dung mô tả như cũ + khối CHỐT (bullet). */
function describePalace(result: AstrologyResult, h: TuViHouse): string {
  const lines: string[] = [];
  const chinh = chinhTinhFull(h);
  const chinhNames = chinhTinhOf(h);
  const phu = phuTinhOf(h, 8);
  const tag = (h.isManh ? ' [Mệnh]' : '') + (h.isThan ? ' [Thân]' : '');
  const cs = countCatSat(h);
  const kb = KHAI_QUAT_12_CUNG[h.palaceName];
  const ca = detectCachCucInPalace(h.stars.filter(s => s.type !== 'luu').map(s => s.name), h.branch, h.palaceName);

  lines.push(`**▸ Cung ${h.palaceName}${tag} — ${h.can} ${h.branch}**`);

  // Câu mở: vai trò cung + chính tinh tọa thủ, viết liền mạch.
  let p1 = kb ? `${trimText(kb, 200)} ` : '';
  if (chinh.length) {
    p1 += `Tại đây, ${chinh.join(' và ')} tọa thủ — `;
    const core = chinhNames[0] ? CHINH_TINH_CORE[chinhNames[0]] : '';
    if (core) p1 += `${trimText(core, 180)} `;
  } else {
    p1 += 'Cung vô chính diệu, phải mượn sao từ cung xung chiếu và nương các phụ tinh quanh đó để định cốt cách. ';
  }
  lines.push(p1.trim());

  // Câu 2: phụ tinh + cát/sát + cách cục, diễn thành nhận định.
  let p2 = '';
  if (phu.length) p2 += `Hỗ trợ thêm có ${phu.join(', ')}. `;
  if (cs.cat + cs.sat > 0) {
    p2 += cs.cat > cs.sat
      ? `Cát tinh trội hơn (${cs.cat} cát / ${cs.sat} sát) nên cung này được nâng đỡ, phần thuận nhiều hơn phần nghịch. `
      : cs.sat > cs.cat
      ? `Sát tinh nhiều hơn (${cs.sat} sát / ${cs.cat} cát), báo hiệu cung này phải nỗ lực và đề phòng trắc trở. `
      : `Cát và sát tương đương (${cs.cat}/${cs.sat}), việc tốt xấu đan xen, lên xuống có chừng mực. `;
  }
  if (ca.length) {
    const tot = ca.filter(x => x.good).map(x => x.name);
    const hung = ca.filter(x => !x.good).map(x => x.name);
    if (tot.length) p2 += `Hội được cách ${tot.join(', ')} là điểm sáng đáng quý. `;
    if (hung.length) p2 += `Cần lưu ý cách ${hung.join(', ')} dễ sinh phiền toái. `;
  }
  if (h.tuanAt || h.trietAt) p2 += tuanTrietVerdict(h);
  if (p2) lines.push(p2.trim());

  // Liệt kê sao ảnh hưởng tới cung kèm VỊ TRÍ (đồng cung/tam hợp/nhị hợp/xung chiếu).
  lines.push(palaceRelStars(result, h));

  // PHÂN TÍCH HỆ QUẢ THỰC TẾ.
  const lifeImpact = synthesizePalaceImpact(h, chinhNames, cs, ca);
  if (lifeImpact) lines.push(`*${lifeImpact}*`);

  // ── KHỐI CHỐT (mới) — Mạnh / Cơ hội / Rủi ro / Nên, mỗi mục một dòng gạch đầu dòng.
  //    Lấy từ lõi tín hiệu dùng chung với bản Nâng cao; bỏ "điểm yếu" vì đã nêu ở phần mô tả trên.
  const idx = result.tuViChart.houses.indexOf(h);
  const sig = computePalaceSignals(result, idx);
  if (sig) {
    const join2 = (a: string[]) => a.slice(0, 2).join('; ');
    lines.push('');
    lines.push(`**Chốt cung ${h.palaceName} — khí số ${sig.khiSo}/10** (${KHISO_VERDICT(sig.khiSo)}):`);
    if (sig.manh.length) lines.push(`- **Mạnh:** ${join2(sig.manh)}.`);
    if (sig.coHoi.length) lines.push(`- **Cơ hội:** ${sig.coHoi[0]}.`);
    if (sig.ruiRo.length) lines.push(`- **Rủi ro:** ${sig.ruiRo[0]}.`);
    if (sig.hanhDong.length) lines.push(`- **Nên:** ${join2(sig.hanhDong)}.`);
  }

  lines.push('');
  return lines.join('\n');
}

function step2_TungCung(result: AstrologyResult): string {
  const gender = result.birthInfo.gender;
  const order = gender === 'nam' ? ORDER_NAM : ORDER_NU;
  const out: string[] = [
    `# Phân tích 12 cung (ưu tiên ${gender === 'nam' ? 'Nam' : 'Nữ'})`,
    '_Mỗi cung mô tả cốt cách (vai trò, chính tinh, phụ tinh, cách cục, sao ảnh hưởng theo vị trí) rồi CHỐT lại khí số, điểm mạnh, cơ hội, rủi ro và việc nên làm. Bấm vào từng cung trên lá số để xem bản Nâng cao đầy đủ._',
    '',
  ];
  // Luận TẤT CẢ 12 cung theo thứ tự ưu tiên giới tính rồi tới các cung còn lại.
  const ordered = [
    ...order,
    ...result.tuViChart.houses.map(h => h.palaceName).filter(n => !order.includes(n)),
  ];
  const seen = new Set<string>();
  for (const palName of ordered) {
    if (seen.has(palName)) continue;
    const h = result.tuViChart.houses.find(x => x.palaceName === palName);
    if (!h) continue;
    seen.add(palName);
    out.push(describePalace(result, h));
  }
  out.push('');

  // Quy tắc tam hợp Mệnh vs các tam hợp khác
  const menh = result.tuViChart.houses.find(h => h.isManh)!;
  const thM = tamHopOf(menh.branch);
  const compareGroups: [string, string][] = [
    ['Phu Thê', 'sợ vợ/chồng'],
    ['Thiên Di', 'ra ngoài thiệt thòi'],
    ['Tài Bạch', 'tiền bạc khó tích'],
    ['Quan Lộc', 'sự nghiệp gian nan'],
  ];
  out.push('• Quan hệ tam hợp Mệnh với các tam hợp khác:');
  for (const [palName, badNote] of compareGroups) {
    const ph = result.tuViChart.houses.find(h => h.palaceName === palName);
    if (!ph) continue;
    const thP = tamHopOf(ph.branch);
    const r = relate(thM.element, thP.element);
    const tag = r === 'khacXuat' ? '⤴ KHẮC XUẤT — TỐT, chủ động vượt'
      : r === 'dongHanh' ? '∼ ĐỒNG HÀNH — hòa hợp'
      : r === 'sinhNhap' ? '↘ SINH NHẬP — được nuôi'
      : r === 'sinhXuat' ? '↗ SINH XUẤT — hao tổn'
      : `⤵ BỊ KHẮC NHẬP — XẤU (${badNote})`;
    out.push(`    - tam hợp ${palName} (${thP.element}): ${tag}`);
  }
  out.push('');
  return out.join('\n');
}

// ---- BƯỚC 3 — MIẾU HÃM + CÁCH CỤC ----

function step3_MieuHam(result: AstrologyResult): string {
  const out: string[] = ['# Ý nghĩa Miếu Hãm chính tinh & cách cục', ''];
  // Liệt kê chính tinh theo cấp brightness
  const buckets: Record<string, string[]> = { 'miếu': [], 'vượng': [], 'đắc': [], 'bình': [], 'hãm': [] };
  for (const h of result.tuViChart.houses) {
    for (const s of h.stars.filter(x => x.type === 'chinh')) {
      const b = s.brightness || 'bình';
      buckets[b]?.push(`${s.name} tại ${h.palaceName} (${h.branch})`);
    }
  }
  for (const lvl of ['miếu', 'vượng', 'đắc', 'bình', 'hãm']) {
    if (buckets[lvl].length) out.push(`• ${miniBright(lvl)}: ${buckets[lvl].join('; ')}.`);
  }
  out.push('');

  // V2.0: Top 24 CÁCH CỤC ẢNH HƯỞNG LỚN NHẤT đến lá số (theo score, đã lọc cách nghề).
  // Format: "Tên cách (vị trí): với Sao A tại cung X, Sao B tại cung Y: Ý nghĩa"
  const detected = detectAllCachCuc(result);
  const houses = result.tuViChart.houses;
  const cleanNm = (n: string) => (n.startsWith('L. ') ? n.slice(3) : n);
  const locateStar = (name: string): string | null => {
    for (const h of houses) for (const s of h.stars) {
      if (s.type === 'luu') continue;
      if (cleanNm(s.name) === name) return h.palaceName;
    }
    return null;
  };
  const posOf = (d: typeof detected[number]): string =>
    d.cach.scope === 'same' ? `đồng cung tại ${d.palace}` :
    d.cach.scope === 'giap' ? `giáp (kẹp 2 cung kề) quanh ${d.palace}` :
    `tam hợp/xung chiếu ${d.palace}`;
  const evidenceOf = (d: typeof detected[number]): string => {
    const allStars = [...(d.cach.pivotStars ?? []), ...d.cach.stars];
    return allStars.map(sn => { const at = locateStar(sn); return at ? `${sn} tại cung ${at}` : sn; }).join(', ');
  };
  const fmt = (d: typeof detected[number]): string =>
    `**${d.cach.name}** (${posOf(d)}): với ${evidenceOf(d)}: ${trimText(d.cach.meaning, 220)}`;

  // Priority tổng hợp: cách cục CHÍNH (từ 4 cung trọng yếu Mệnh/Tài Bạch/Quan
  // Lộc/Thiên Di) luôn lên đầu, sau đó category (chính > quý > phú > biến > phụ
  // tinh) + cung then chốt khác + score. Đảm bảo chính cách như "Sát Phá Tham
  // Liêm" luôn lọt top 24 dù score bằng cách phụ tinh miếu vượng.
  const CORE_BONUS = 40;
  const CATEGORY_W: Record<string, number> = {
    chinh: 30, quy: 22, phu: 20, bien: 12, phu_tinh: 6, hung: 25,
  };
  const PALACE_W: Record<string, number> = {
    'Thân': 12, 'Phúc Đức': 8, 'Điền Trạch': 6,
    'Phu Thê': 6, 'Hôn Nhân': 6, 'Tật Ách': 5, 'Tử Tức': 4, 'Nô Bộc': 4, 'Phụ Mẫu': 4, 'Huynh Đệ': 3,
  };
  const priorityOf = (d: typeof detected[number]): number => {
    const cat = (d.cach.category ?? 'phu') as string;
    const coreBonus = CORE_PALACES.includes(d.palace) ? CORE_BONUS : 0;
    return coreBonus + (CATEGORY_W[cat] ?? 0) + (PALACE_W[d.palace] ?? 0) + d.score;
  };
  const cat = detected.filter(d => d.cach.good).sort((a, b) => priorityOf(b) - priorityOf(a));
  const hung = detected.filter(d => !d.cach.good).sort((a, b) => priorityOf(b) - priorityOf(a));
  const TOP_N = 24;
  const catQuota = Math.min(cat.length, Math.ceil(TOP_N * 0.65));
  const hungQuota = Math.min(hung.length, TOP_N - catQuota);
  const topCat = cat.slice(0, catQuota);
  const topHung = hung.slice(0, hungQuota);

  if (topCat.length || topHung.length) {
    out.push(`**Cách cục** là những "bộ sao" đặc biệt do nhiều sao hợp lại tạo thành (ví dụ Tử Phủ Vũ Tướng, Sát Phá Tham…). Một bộ sao đẹp có giá trị hơn nhiều so với từng sao lẻ — đây là tầng luận quan trọng bậc nhất.`);
    out.push(`_Danh sách bên dưới là ${topCat.length + topHung.length} cách cục ẢNH HƯỞNG LỚN NHẤT đến lá số (trên tổng số ${detected.length} cách phát hiện được)._`);
    out.push('');
  }
  if (topCat.length) {
    out.push('**Cách cục Cát** (các bộ sao TỐT — là "đòn bẩy" sẵn có: chỉ cần gặp đúng môi trường/đại vận kích hoạt là phát mạnh. Cách áp dụng: chủ động chọn nghề, chọn hướng, chọn thời điểm trùng với lĩnh vực mà cách cục này quản để tận dụng tối đa):');
    topCat.forEach(d => out.push(`- ${fmt(d)}`));
  }
  if (topHung.length) {
    out.push('');
    out.push('**Cách cục Hung (cần chú ý)** (các bộ sao XẤU — không phải "án phạt", mà là điểm dễ vấp sẽ phát tác mạnh khi đại vận/lưu niên đi qua đúng cung đó. Cách áp dụng: nhận diện trước để PHÒNG — giai đoạn liên quan thì giữ thế thủ, tránh quyết định lớn, tránh đúng kiểu rủi ro mà cách cục cảnh báo):');
    topHung.forEach(d => out.push(`- ${fmt(d)}`));
  }
  if (!topCat.length && !topHung.length) {
    out.push('- Không phát hiện cách cục đặc sắc nào hội tụ — lá số thiên về tính ổn định, ít cực đoan.');
  }

  // Giữ biến catCach/hungCach cho phần đọc tổng hòa độ sáng bên dưới
  const catCach = topCat;
  const hungCach = topHung;

  // ─── PHÂN TÍCH ĐỘ SÁNG TỔNG THỂ LÁ SỐ ───
  const bright = buckets['miếu'].length + buckets['vượng'].length;
  const dim = buckets['hãm'].length;
  const total = bright + dim + buckets['đắc'].length + buckets['bình'].length;
  out.push('');
  out.push('**📖 Đọc tổng hòa độ sáng lá số:**');
  let s = '';
  if (bright >= dim * 2 && bright >= 4) {
    s = `Lá số "sáng" — có ${bright} chính tinh ở thế Miếu/Vượng vượt trội (so với ${dim} ở thế Hãm). Đây là cấu trúc của những lá số dễ thành đạt: sao mạnh phát huy đúng đất, ít gặp lực cản từ chính bản thân các sao. Cốt cách quý, vận hành thuận; điểm cần lưu ý là biết tiết chế tham vọng và giữ phúc.`;
  } else if (dim >= bright * 2 && dim >= 4) {
    s = `Lá số "tối" — có tới ${dim} chính tinh ở thế Hãm trong khi chỉ ${bright} ở thế Miếu/Vượng. Cấu trúc này đặt nặng lên ý chí cá nhân: bạn phải dụng công nhiều hơn người khác để đạt cùng một kết quả. Bù lại, những gì gây dựng được thường có chiều sâu và bền hơn, vì phải tự rèn nội lực thay vì hưởng sẵn.`;
  } else if (bright > dim) {
    s = `Lá số nghiêng về "sáng" (${bright} Miếu-Vượng vs ${dim} Hãm) — phần lớn các sao chủ chốt được "đặt đúng đất". Vận hành tương đối thuận, ưu thế thuộc về các cung có chính tinh miếu vượng; nên ưu tiên dồn lực vào các cung đó.`;
  } else if (dim > bright) {
    s = `Lá số có hơi thiên "hãm" (${dim} Hãm vs ${bright} Miếu-Vượng) — một số sao bị đặt sai đất nên hiệu lực giảm. Cần biết cung nào hãm để tránh đặt kỳ vọng lớn vào cung đó, đồng thời tận dụng các cung sáng còn lại làm bệ phóng.`;
  } else if (total > 0) {
    s = `Độ sáng các chính tinh cân bằng (${bright}/${dim}) — lá số không có sao quá vượt trội nhưng cũng không có sao quá yếu. Đặc trưng của kiểu này: ổn định, không cực đoan, ít rủi ro lớn nhưng cũng ít cú phát thiên hạ — phù hợp với lối sống "đi từng bước, tích tiểu thành đại".`;
  }
  if (catCach.length > hungCach.length && catCach.length >= 2) {
    s += ` Đáng chú ý là lá số hội được ${catCach.length} cách CÁT — đây là điểm tựa lớn, cần tận dụng đúng giai đoạn đại vận để bùng nổ.`;
  } else if (hungCach.length > catCach.length && hungCach.length >= 2) {
    s += ` Tuy nhiên, ${hungCach.length} cách HUNG cũng hiện diện — cần đặc biệt cảnh giác trong các giai đoạn đại vận đi qua các cung này.`;
  }
  out.push(s);
  out.push('');
  return out.join('\n');
}

// ---- BƯỚC 4 — VẬN TRÌNH ----

const RATING_TONE: Record<string, string> = {
  'Rất tốt': '🌟 RỰC RỠ',
  'Tốt': '✦ TỐT',
  'Khá': '◆ KHÁ',
  'Trung bình': '∼ TRUNG BÌNH',
  'Nhiều thách thức': '⚠ THỬ THÁCH',
};

function step4_VanTrinh(result: AstrologyResult): string {
  const out: string[] = ['# Vận trình Đại Vận (3 yếu tố cụ Thiên Lương)', ''];
  out.push('Khung: THIÊN THỜI (tam hợp đại vận vs tuổi) · ĐỊA LỢI (hành cung đại vận vs hành Mệnh) · NHÂN HÒA (bộ chính tinh).');
  out.push('Quy tắc: "Đại vận lấn áp Tiểu vận" — đại vận tốt là gốc, năm tiểu vận thuận đó dễ khởi sắc; đại vận xấu thì năm tốt cũng khó bứt phá nổi.');
  out.push('');

  const scored = result.daiVans.slice(0, 10).map(dv => ({ dv, sc: scoreDaiVan(result, dv) }));
  for (const { dv, sc } of scored) {
    out.push(`**▸ ${dv.startAge}–${dv.endAge}t (${dv.stem} ${dv.branch}, cung ${sc.palaceName}) — ${RATING_TONE[sc.rating] || sc.rating}**`);
    out.push(`- Thiên thời: ${RELATE_TXT[sc.thienThoi]} · Địa lợi: ${RELATE_TXT[sc.diaLoi]} · Nhân hòa: ${sc.nhanHoa}.`);
    out.push(`- ${sc.summary}`);
    out.push('');
  }

  // Tổng kết: đại vận đẹp nhất / kém nhất
  const sorted = [...scored].sort((a, b) => (b.sc.taiLoc - b.sc.thachThuc) - (a.sc.taiLoc - a.sc.thachThuc));
  if (sorted.length >= 2) {
    const best = sorted[0], worst = sorted[sorted.length - 1];
    out.push(`• ĐẠI VẬN RỰC RỠ NHẤT: ${best.dv.startAge}–${best.dv.endAge}t (cung ${best.sc.palaceName}) — ${best.sc.rating}. Đây là giai đoạn nên DỒN LỰC: chuyển nghề lớn, đầu tư, mở rộng quan hệ.`);
    out.push(`• ĐẠI VẬN CẦN THẬN TRỌNG NHẤT: ${worst.dv.startAge}–${worst.dv.endAge}t (cung ${worst.sc.palaceName}) — ${worst.sc.rating}. Giai đoạn này nên THỦ: giữ tiền, hạn chế đầu tư mạo hiểm, chăm sức khỏe.`);
  }

  // ─── PHÂN TÍCH "BIỂU ĐỒ CUỘC ĐỜI" — đọc dòng vận từng giai đoạn ───
  out.push('');
  out.push('**📖 Đọc dòng vận cuộc đời:**');
  const periods = [
    { from: 0, to: 30, label: 'GIAI ĐOẠN ĐẦU (đến ~30 tuổi)', theme: 'gốc, học hành, định hình bản thân' },
    { from: 30, to: 60, label: 'GIAI ĐOẠN GIỮA (30–60 tuổi)', theme: 'lập nghiệp, gia đình, đỉnh cao sự nghiệp' },
    { from: 60, to: 100, label: 'GIAI ĐOẠN SAU (sau 60 tuổi)', theme: 'tổng kết, hưởng thụ, truyền thừa' },
  ];
  for (const p of periods) {
    const inPeriod = scored.filter(s => s.dv.startAge < p.to && s.dv.endAge >= p.from);
    if (!inPeriod.length) continue;
    const avgTL = inPeriod.reduce((a, b) => a + b.sc.taiLoc, 0) / inPeriod.length;
    const avgTT = inPeriod.reduce((a, b) => a + b.sc.thachThuc, 0) / inPeriod.length;
    // taiLoc/thachThuc theo thang 0–100; net dương lớn = rực rỡ, âm lớn = thử thách.
    const net = avgTL - avgTT;
    let mood = '';
    if (net > 30) mood = 'RỰC RỠ — giai đoạn vàng, nhiều cơ hội đến từ trời';
    else if (net > 10) mood = 'THUẬN LỢI — vận hành ổn, tích lũy tốt';
    else if (net > -10) mood = 'CÂN BẰNG — có lên có xuống, không quá bứt phá';
    else mood = 'NHIỀU THỬ THÁCH — vận vất vả, cần dụng công và bản lĩnh';
    out.push(`- **${p.label}** (${p.theme}): ${mood}. ` +
      `${inPeriod.length === 1 ? '1 đại vận' : inPeriod.length + ' đại vận'} trong giai đoạn, ` +
      `điểm trung bình tài lộc/thách thức ${avgTL.toFixed(0)}/${avgTT.toFixed(0)}.`);
  }
  // Nhận xét hình dáng cuộc đời.
  const firstHalf = scored.filter(s => s.dv.startAge < 40);
  const secondHalf = scored.filter(s => s.dv.startAge >= 40);
  if (firstHalf.length && secondHalf.length) {
    const fhNet = firstHalf.reduce((a, b) => a + (b.sc.taiLoc - b.sc.thachThuc), 0) / firstHalf.length;
    const shNet = secondHalf.reduce((a, b) => a + (b.sc.taiLoc - b.sc.thachThuc), 0) / secondHalf.length;
    out.push('');
    // Ngưỡng 12 điểm chênh trên thang 0–100 (đáng kể, không quá gắt)
    if (shNet - fhNet > 12) {
      out.push('▸ **Hình dáng cuộc đời:** kiểu "HẬU PHÁT" — nửa sau đời tốt hơn nửa đầu rõ rệt; thời trẻ vất vả nhưng càng về sau càng sáng. Đặc biệt phù hợp với lối sống "kiên nhẫn tích lũy, không vội thành công sớm".');
    } else if (fhNet - shNet > 12) {
      out.push('▸ **Hình dáng cuộc đời:** kiểu "TIỀN PHÁT" — đỉnh cao rơi vào nửa đầu đời; nên TRANH THỦ giai đoạn vàng để gây dựng và TÍCH LŨY cho nửa sau; tránh ỷ lại vào quá khứ huy hoàng.');
    } else {
      out.push('▸ **Hình dáng cuộc đời:** cân bằng giữa nửa đầu và nửa sau — không có giai đoạn nào quá bứt phá hay quá u ám; phù hợp với lối sống "đi đều, đi xa".');
    }
  }
  out.push('');
  return out.join('\n');
}

// ---- BƯỚC 5 — KẾT LUẬN ----

function step5_KetLuan(result: AstrologyResult): string {
  const c = result.tuViChart;
  const menh = c.houses.find(h => h.isManh)!;
  const out: string[] = ['# Kết luận tổng hợp & lời khuyên', ''];

  // Cốt cách
  const menhChinh = chinhTinhOf(menh);
  if (menhChinh.length) {
    out.push(`• Cốt cách: ${menhChinh.join(' + ')} thủ Mệnh — ` +
      (menhChinh.some(n => ['Tử Vi', 'Thiên Phủ'].includes(n)) ? 'có khí chất lãnh đạo, hợp con đường danh phận.'
      : menhChinh.some(n => ['Thất Sát', 'Phá Quân', 'Tham Lang'].includes(n)) ? 'cương động, hợp con đường bứt phá, kinh doanh, kỹ thuật chuyên môn.'
      : menhChinh.some(n => ['Thiên Cơ', 'Thái Âm', 'Thiên Đồng', 'Thiên Lương'].includes(n)) ? 'mềm dẻo, văn — hợp công việc tham mưu, sáng tạo, chuyên môn nội bộ.'
      : menhChinh.some(n => ['Cự Môn', 'Thái Dương'].includes(n)) ? 'thiên về ngôn luận, truyền bá, giáo dục, pháp lý.'
      : 'cần xét kỹ phụ tinh để định hướng.'));
  } else {
    out.push('• Mệnh VÔ CHÍNH DIỆU — cốt cách linh hoạt, biến động theo môi trường; hợp người sống xa quê, dấn thân nhiều ngành.');
  }

  // Hướng nghề (đọc từ Quan Lộc)
  const quan = c.houses.find(h => h.palaceName === 'Quan Lộc');
  if (quan) {
    const qChinh = chinhTinhOf(quan);
    out.push(`• Sự nghiệp: ${qChinh.join(', ') || 'Vô chính diệu'} tại Quan Lộc — ` +
      (qChinh.includes('Tử Vi') || qChinh.includes('Thiên Phủ') ? 'hợp vị trí quản lý, lãnh đạo, làm cho cơ quan/doanh nghiệp lớn.'
      : qChinh.includes('Vũ Khúc') ? 'hợp tài chính, ngân hàng, quân đội, kỹ thuật.'
      : qChinh.includes('Thái Dương') ? 'hợp giáo dục, truyền thông, nghề có tính "tỏa sáng".'
      : qChinh.includes('Thái Âm') ? 'hợp tài chính kế toán, bất động sản, nội trợ thượng lưu.'
      : qChinh.some(n => ['Thất Sát', 'Phá Quân'].includes(n)) ? 'hợp nghề mạo hiểm, chuyên môn cao, khởi nghiệp.'
      : qChinh.includes('Thiên Cơ') ? 'hợp tham mưu, kế hoạch, IT, tư vấn.'
      : qChinh.includes('Cự Môn') ? 'hợp luật sư, truyền thông, diễn thuyết, giảng dạy.'
      : 'tùy theo phụ tinh hội về.'));
  }

  // Tài lộc
  const tai = c.houses.find(h => h.palaceName === 'Tài Bạch');
  if (tai) {
    const tChinh = chinhTinhOf(tai);
    out.push(`• Tài lộc: ${tChinh.join(', ') || 'Vô chính diệu'} tại Tài Bạch — ` +
      (tChinh.includes('Vũ Khúc') || tChinh.includes('Thái Âm') ? 'có tài tinh — khả năng kiếm và giữ tiền tốt.'
      : tChinh.includes('Thiên Phủ') ? 'có "kho tiền" — giỏi tích lũy, tránh đầu tư phiêu lưu.'
      : tChinh.includes('Tham Lang') ? 'kiếm tiền nhờ giao tiếp, sắc thái đa dạng; cần chế hóa kẻo phá tán.'
      : 'tiền tài thường vất vả hơn, dựa vào năng lực thực.'));
  }

  // Tình duyên
  const phu = c.houses.find(h => h.palaceName === 'Phu Thê');
  if (phu) {
    const pCs = countCatSat(phu);
    out.push(`• Tình duyên (Phu Thê — cát/sát ${pCs.cat}/${pCs.sat}): ` +
      (pCs.cat > pCs.sat ? 'duyên lành, người hôn phối có nét đẹp & hỗ trợ.'
      : pCs.sat > pCs.cat ? 'có sóng gió, cần chậm rãi trong hôn nhân, tránh quyết định nóng.'
      : 'tương đối ổn, tùy lứa tuổi & đại vận.'));
  }

  // Sức khỏe
  const tat = c.houses.find(h => h.palaceName === 'Tật Ách');
  if (tat) {
    const tCs = countCatSat(tat);
    out.push(`• Sức khỏe (Tật Ách): ${tCs.sat > 1 ? '⚠ có nhiều sát tinh, cần chú ý phòng bệnh, khám định kỳ.' : tCs.sat === 0 ? 'tốt — ít tai ách bẩm sinh.' : 'bình thường — chú ý sinh hoạt điều độ.'}`);
  }

  // Lời khuyên cuối
  out.push('');
  out.push('**💡 Lời khuyên chung:**');
  out.push('- Bám sát đại vận: dồn lực giai đoạn rực rỡ, thủ thế giai đoạn thử thách.');
  out.push('- Kết hợp với năng lực cá nhân — Tử Vi chỉ vẽ bản đồ, người đi vẫn là bạn.');
  out.push('- Để luận sâu, linh hoạt và cá nhân hóa hơn, các bạn dùng chức năng Phân tích AI nhé!');
  return out.join('\n');
}

// ════════════════════════════════════════════════════════════════
//  BƯỚC MỚI (đồng bộ với khung AI Lê Quang Lăng + Diệu Xuân)
// ════════════════════════════════════════════════════════════════

/** Phi Hóa Nam Phái — Tổng Lộc/Quyền/Khoa/Kỵ + Nút thắt + Nguồn lực. */
function step_PhiHoa(result: AstrologyResult): string {
  const c = result.tuViChart;
  const out: string[] = ['# Phi Hóa Nam Phái — Tổng Lộc/Quyền/Khoa/Kỵ & Nút thắt cuộc đời', ''];
  out.push('_**Phi Hóa** là điểm cốt lõi của Nam Phái: mỗi cung (theo can của cung) sẽ "bắn" 4 luồng năng lượng Lộc – Quyền – Khoa – Kỵ sang các cung khác. Đây chính là cách 12 cung KẾT NỐI và NUÔI NHAU: Lộc/Quyền/Khoa là nguồn lực tốt chảy tới, Kỵ là áp lực/nút thắt chảy tới. Nhờ vậy ta thấy được năng lượng cuộc đời ĐANG DỒN VỀ ĐÂU và VƯỚNG MẮC nằm ở đâu — điều mà luận từng sao đơn lẻ không chỉ ra được._');
  out.push('');
  out.push(summarizeYearHoa(c));
  out.push('');

  out.push('**▸ 12 cung phát Phi Hóa đi đâu** _(mỗi cung gửi năng lượng của mình tới cung nào — đọc theo chiều "cung này TÁC ĐỘNG / chi phối cung kia". Ví dụ Mệnh phát Lộc→Tài Bạch nghĩa là bản thân bạn là nguồn tạo ra tiền; phát Kỵ→Phu Thê nghĩa là cách sống của bạn dễ tạo áp lực lên hôn nhân):_');
  for (let i = 0; i < c.houses.length; i++) {
    const h = c.houses[i];
    const { phat } = computePhiHoa(c, i);
    if (!phat.length) continue;
    const detail = phat.map(p => `${p.hoa.replace('Hóa ', '')}→${p.toPalace}(${p.viaStar})`).join(', ');
    out.push(`- ${h.palaceName} (can ${h.can}): ${detail}.`);
  }
  out.push('');

  const { tally, nutThat, nguonLuc } = aggregatePhiHoa(c);
  out.push('**▸ Cung tập trung Phi Hóa (tích lũy từ nhiều cung phát về)** _(cung nào ĐƯỢC NHIỀU luồng năng lượng dồn về nhất — đây là "trọng tâm" mà cuộc đời xoay quanh. Nhiều Lộc/Quyền/Khoa dồn về → lĩnh vực đó là nơi đáng đầu tư công sức nhất vì dễ phát; nhiều Kỵ dồn về → đó là nơi tiêu hao, vướng mắc nhất, cần gỡ trước tiên):_');
  for (const t of tally.sort((a, b) => (b.loc + b.quyen + b.khoa + b.ky) - (a.loc + a.quyen + a.khoa + a.ky))) {
    const parts: string[] = [];
    if (t.loc) parts.push(`Lộc×${t.loc}`);
    if (t.quyen) parts.push(`Quyền×${t.quyen}`);
    if (t.khoa) parts.push(`Khoa×${t.khoa}`);
    if (t.ky) parts.push(`Kỵ×${t.ky}`);
    out.push(`- ${t.palace}: ${parts.join(' · ')}.`);
  }
  out.push('');

  if (nguonLuc && nguonLuc.auspicious > 0) {
    out.push(`★ **NGUỒN LỰC LỚN NHẤT:** cung ${nguonLuc.palace} — tụ ${nguonLuc.auspicious} hóa cát (Lộc/Quyền/Khoa). Đây là điểm tựa cốt lõi của cuộc đời; dồn năng lượng vào cung này chủ quản sẽ phát huy nhanh nhất.`);
  }
  if (nutThat && nutThat.ky > 0) {
    out.push(`⚠ **NÚT THẮT CUỘC ĐỜI:** cung ${nutThat.palace} — nhận ${nutThat.ky} Kỵ phi vào. Đây là chỗ vướng mắc dai dẳng; tháo gỡ được cung này thì toàn lá số khai thông.`);
  }

  // ─── PHÂN TÍCH "CHÂN DUNG PHI HÓA" — kết nối nguồn lực + nút thắt thành chiến lược sống ───
  if (nguonLuc || nutThat) {
    out.push('');
    out.push('**📖 Chiến lược sống đọc từ Phi Hóa:**');
    const PALACE_THEME: Record<string, string> = {
      'Mệnh': 'năng lượng dồn vào CHÍNH BẢN THÂN — phát triển cá nhân',
      'Phụ Mẫu': 'gốc gác gia đình, quan hệ với bề trên',
      'Phúc Đức': 'phúc khí, đời sống tinh thần, hậu vận',
      'Điền Trạch': 'bất động sản, tài sản cố định, gia đạo',
      'Quan Lộc': 'sự nghiệp, công danh, vị trí xã hội',
      'Nô Bộc': 'quan hệ bạn bè, cộng sự, thuộc cấp',
      'Thiên Di': 'phương xa, môi trường ngoài, xuất ngoại',
      'Tật Ách': 'sức khỏe, tật bệnh, biến cố thân thể',
      'Tài Bạch': 'tiền bạc, đầu tư, kinh doanh',
      'Tử Tức': 'con cái, thế hệ kế thừa, học trò',
      'Phu Thê': 'hôn nhân, người bạn đời',
      'Huynh Đệ': 'anh em ruột, đồng cấp',
    };
    let strategy = '';
    if (nguonLuc && nguonLuc.auspicious >= 2) {
      const theme = PALACE_THEME[nguonLuc.palace] || nguonLuc.palace.toLowerCase();
      strategy += `Lá số có "ĐIỂM SÁNG" tập trung ở cung ${nguonLuc.palace} (${theme}) — đây là nơi vũ trụ "ưu ái" bạn nhất. Chiến lược khôn ngoan là DỒN PHẦN LỚN NỖ LỰC vào cung này, vì đây là chỗ một nỗ lực bằng người khác lại đem về kết quả lớn hơn nhiều. Đừng cố phát ở lĩnh vực mình kém — hãy phát ở lĩnh vực mình "có duyên". `;
    }
    if (nutThat && nutThat.ky >= 2) {
      const themeN = PALACE_THEME[nutThat.palace] || nutThat.palace.toLowerCase();
      strategy += `Cùng lúc, "NÚT THẮT" nằm ở cung ${nutThat.palace} (${themeN}) — đây là chỗ luôn vướng mắc, càng cố càng rối. Không nên TRÁNH NÉ (vì né cũng không thoát), mà cần CHỦ ĐỘNG ĐỐI MẶT: học kỹ về cung này, tham vấn chuyên gia, làm việc thiện liên quan để hóa giải dần. Nút thắt này thường mở ra theo đại vận đi qua nó. `;
    } else if (nutThat && nutThat.ky === 1) {
      strategy += `Có một điểm vướng nhẹ ở cung ${nutThat.palace} — không phải vấn đề lớn nhưng cần để ý đừng để tích tụ. `;
    }
    if (nguonLuc && nutThat && nguonLuc.palace !== nutThat.palace) {
      strategy += `Mâu thuẫn nội tại: bạn được trời cho ở "${nguonLuc.palace}" nhưng cũng bị thử thách ở "${nutThat.palace}" — đây chính là "công án" cuộc đời. Giải được thì lá số mới thực sự khai mở.`;
    } else if (nguonLuc && nutThat && nguonLuc.palace === nutThat.palace) {
      strategy += `Đặc biệt: nguồn lực và nút thắt cùng nằm ở cung ${nguonLuc.palace} — đây là "cung trọng yếu" của cuộc đời, vừa là tài sản vừa là gánh nặng; càng phát triển càng vướng, càng vướng càng phải phát triển. Đây thường là kiểu lá số có cuộc đời "có ý nghĩa" rõ rệt.`;
    }
    if (!strategy) strategy = 'Phi hóa lá số phân tán đều, không tập trung rõ — ít có "siêu điểm tựa" cũng ít có "siêu vướng mắc"; cuộc đời tương đối quân bình, phát ổn nhưng không bùng nổ.';
    out.push(strategy);
  }
  out.push('');
  return out.join('\n');
}

/** Khí số 6 trục đối — cân bằng / lệch về bên nào, kèm phân tích hệ quả thực tế. */
function step_TrucKhiSo(result: AstrologyResult): string {
  const c = result.tuViChart;
  const out: string[] = ['# Khí số 6 trục đối của toàn lá số', ''];
  out.push('Luận theo "trục đối" — hai cung đối diện nhau luôn ảnh hưởng qua lại. Sao mạnh ở 1 bên sẽ kéo lệch hoặc bổ trợ cho cung đối diện; chính sự CÂN BẰNG hay LỆCH của từng trục mới quyết định lá số "đứng vững" hay "chông chênh" trong từng cung.');
  out.push('');
  // Phân tích hệ quả thực tế khi 1 bên trục mạnh hơn — giúp đoạn này thoát khỏi dạng liệt kê.
  const TRUC_IMPACT: Record<string, { aManh: string; bManh: string; canBang: string }> = {
    'Mệnh-Thiên Di': {
      aManh: 'Mệnh nội lực mạnh hơn môi trường ngoài → bạn là kiểu người "tự thân", tự quyết được số phận; không cần phụ thuộc môi trường, nhưng cũng dễ cứng đầu, ít chịu ảnh hưởng tốt từ ngoại cảnh.',
      bManh: 'Thiên Di mạnh hơn Mệnh → môi trường ngoài định hình bạn; ra ngoài có nhiều cơ hội/quý nhân nhưng ở nhà thì kém phát huy. Lá số "xuất ngoại lập nghiệp" — đi xa quê hợp hơn.',
      canBang: 'Cân bằng — biết cách dung hòa giữa nội lực và môi trường, ai cũng có thể hòa hợp.',
    },
    'Tài Bạch-Phúc Đức': {
      aManh: 'Tài Bạch mạnh hơn Phúc Đức → có khả năng kiếm tiền nhưng phúc khí mỏng; tiền đến rồi đi, hưởng thụ không sâu, dễ rơi vào tâm trạng "có của mà không sướng". Cần tích thiện để phúc theo kịp tài.',
      bManh: 'Phúc Đức mạnh hơn Tài Bạch → phúc dày, tâm thanh, hưởng thụ tinh thần tốt; tài lộc tuy không quá lớn nhưng đủ dùng và bền. Người có phúc thường tiền tự tới, không phải chạy theo tiền.',
      canBang: 'Cân bằng — tiền và phúc song hành, hiếm có; cuộc đời đủ đầy cả vật chất lẫn tinh thần.',
    },
    'Quan Lộc-Phu Thê': {
      aManh: 'Quan Lộc mạnh hơn Phu Thê → sự nghiệp lấn át hôn nhân; người này thường dành phần lớn năng lượng cho công việc, gia đình bị "trả giá". Cần chủ động cân bằng kẻo hôn nhân lạnh.',
      bManh: 'Phu Thê mạnh hơn Quan Lộc → hôn nhân là điểm tựa lớn, phối ngẫu có thể nâng đỡ sự nghiệp; nên trân trọng nửa kia, đừng vì cái nhỏ mà bỏ cái lớn.',
      canBang: 'Cân bằng — vừa có sự nghiệp vừa có gia đình êm ấm; chỉ cần biết quản lý thời gian là cuộc đời sung mãn.',
    },
    'Điền Trạch-Tử Tức': {
      aManh: 'Điền Trạch mạnh hơn Tử Tức → có nhiều của cải bất động sản nhưng con cái mỏng, hoặc duyên con thưa. Cần đầu tư cho con cái nhiều hơn chứ không chỉ chăm chỉ tích sản.',
      bManh: 'Tử Tức mạnh hơn Điền Trạch → đông con/con thành đạt là điểm sáng, nhưng tài sản tích lũy không nhiều. Phúc lộc dồn vào thế hệ sau.',
      canBang: 'Cân bằng — cả sản nghiệp và thế hệ sau đều ổn; lý tưởng nhất là biết truyền lại của cải cho con cháu đúng cách.',
    },
    'Phụ Mẫu-Tật Ách': {
      aManh: 'Phụ Mẫu mạnh hơn Tật Ách → gốc gác tốt, được hưởng nền tảng gia đình tốt; sức khỏe nói chung khá nhưng đôi khi chủ quan vì "trời cho". Đừng ỷ lại vào nền tảng.',
      bManh: 'Tật Ách nặng hơn Phụ Mẫu → sức khỏe là gánh nặng dù gốc gác bình thường; cần chăm sức khỏe như chăm tiền, khám định kỳ và không chủ quan.',
      canBang: 'Cân bằng — sức khỏe ổn, gốc gác ổn; tận hưởng phúc nhưng đừng quên dưỡng thân.',
    },
    'Huynh Đệ-Nô Bộc': {
      aManh: 'Huynh Đệ mạnh hơn Nô Bộc → anh em ruột là chỗ dựa chính, bạn bè ngoài ít người thực tâm. Quan hệ ruột thịt là tài sản lớn nhất, cần gìn giữ.',
      bManh: 'Nô Bộc mạnh hơn Huynh Đệ → bạn bè ngoài giúp được nhiều hơn anh em ruột; "bạn còn hơn họ" — biết chọn bạn mà chơi.',
      canBang: 'Cân bằng — cả ruột thịt và bạn bè đều có người tốt; mạng lưới hỗ trợ rộng.',
    },
  };
  const pairs: [string, string, string][] = [
    ['Mệnh', 'Thiên Di', 'bản thân vs môi trường ngoài'],
    ['Tài Bạch', 'Phúc Đức', 'tiền tài vs phúc khí'],
    ['Quan Lộc', 'Phu Thê', 'sự nghiệp vs hôn nhân'],
    ['Điền Trạch', 'Tử Tức', 'gia tài vs con cái'],
    ['Phụ Mẫu', 'Tật Ách', 'gốc gác vs sức khỏe'],
    ['Huynh Đệ', 'Nô Bộc', 'anh em ruột vs bạn bè ngoài'],
  ];
  for (const [aName, bName, theme] of pairs) {
    const a = c.houses.find(h => h.palaceName === aName);
    const b = c.houses.find(h => h.palaceName === bName);
    if (!a || !b) continue;
    const csA = countCatSat(a), csB = countCatSat(b);
    const scoreA = csA.cat - csA.sat;
    const scoreB = csB.cat - csB.sat;
    const diff = scoreA - scoreB;
    let verdict: string;
    if (Math.abs(diff) <= 1) verdict = `Hai bên CÂN BẰNG — trục ổn định.`;
    else if (diff > 0) verdict = `${aName} mạnh hơn (${csA.cat}/${csA.sat} vs ${csB.cat}/${csB.sat}) — sức kéo về phía ${aName}.`;
    else verdict = `${bName} mạnh hơn (${csB.cat}/${csB.sat} vs ${csA.cat}/${csA.sat}) — sức kéo về phía ${bName}.`;
    const impact = TRUC_IMPACT[`${aName}-${bName}`];
    let impactLine = '';
    if (impact) {
      if (Math.abs(diff) <= 1) impactLine = `\n*Hệ quả thực tế:* ${impact.canBang}`;
      else if (diff > 0) impactLine = `\n*Hệ quả thực tế:* ${impact.aManh}`;
      else impactLine = `\n*Hệ quả thực tế:* ${impact.bManh}`;
    }
    out.push(`**▸ Trục ${aName} ↔ ${bName}** (${theme}): ${verdict}${impactLine}`);
    out.push('');
  }
  return out.join('\n');
}

/** Tính điểm 6 mảng — API dùng chung cho offline & prompt AI để đồng bộ điểm. */
export function computeSixDomainScores(result: AstrologyResult): {
  phuc: number; tai: number; quan: number; dien: number; hon: number; skh: number;
  phucLyDo: string; taiLyDo: string; quanLyDo: string; dienLyDo: string; honLyDo: string; skhLyDo: string;
} {
  const c = result.tuViChart;
  const score = (palName: string): { pt: number; lyDo: string } => {
    const h = c.houses.find(x => x.palaceName === palName);
    if (!h) return { pt: 5, lyDo: '(không có cung)' };
    const cs = countCatSat(h);
    const cach = detectCachCucInPalace(h.stars.filter(s => s.type !== 'luu').map(s => s.name), h.branch, h.palaceName);
    const good = cach.filter(x => x.good).length;
    const bad = cach.filter(x => !x.good).length;
    const netCatSat = Math.max(-3, Math.min(3, cs.cat - cs.sat));
    let pt = 5 + netCatSat * 1.2 + Math.min(good, 3) * 1.0 - Math.min(bad, 3) * 1.5;
    if (h.tuanAt) pt -= 1;
    if (h.trietAt) pt -= 1.5;
    pt = Math.max(1, Math.min(10, Math.round(pt)));
    const lyDo = `cát/sát ${cs.cat}/${cs.sat}` +
      (good ? `, có ${good} cách tốt` : '') + (bad ? `, có ${bad} cách hung` : '') +
      (h.tuanAt ? ', bị Tuần' : '') + (h.trietAt ? ', bị Triệt' : '');
    return { pt, lyDo };
  };
  const phuc = score('Phúc Đức'), tai = score('Tài Bạch'), quan = score('Quan Lộc');
  const dien = score('Điền Trạch'), hon = score('Phu Thê'), skh = score('Tật Ách');
  return {
    phuc: phuc.pt, tai: tai.pt, quan: quan.pt, dien: dien.pt, hon: hon.pt, skh: skh.pt,
    phucLyDo: phuc.lyDo, taiLyDo: tai.lyDo, quanLyDo: quan.lyDo,
    dienLyDo: dien.lyDo, honLyDo: hon.lyDo, skhLyDo: skh.lyDo,
  };
}

/** Chấm điểm tổng khí số 6 mảng — Phúc/Tài/Quan/Điền/Hôn nhân/Sức khỏe. */
function step_ChamDiem(result: AstrologyResult): string {
  const c = result.tuViChart;
  const out: string[] = ['# Tổng khí số cuộc đời (chấm điểm) & Hành động khuyến nghị', ''];

  // Dùng helper computeSixDomainScores() để đồng bộ điểm giữa offline & AI prompt.
  const s = computeSixDomainScores(result);
  const phuc = { pt: s.phuc, lyDo: s.phucLyDo };
  const tai = { pt: s.tai, lyDo: s.taiLyDo };
  const quan = { pt: s.quan, lyDo: s.quanLyDo };
  const dien = { pt: s.dien, lyDo: s.dienLyDo };
  const hon = { pt: s.hon, lyDo: s.honLyDo };
  // Cung Tật Ách: nhiều CÁT (Tả/Hữu/Xương/Khúc/Khôi/Việt che chở) = sức khỏe tốt;
  // nhiều SÁT (Kình/Đà/Không/Kiếp/Hỏa/Linh) mới là dấu hiệu bệnh tật. Không đảo ngược.
  const skhInv = { pt: s.skh, lyDo: s.skhLyDo };

  out.push('**▸ Tổng khí số 6 mảng:**');
  out.push(`- 🌸 **Phúc khí:** ${phuc.pt}/10 — ${phuc.lyDo}.`);
  out.push(`- 💰 **Tài khí:** ${tai.pt}/10 — ${tai.lyDo}.`);
  out.push(`- 🎖️ **Quan khí:** ${quan.pt}/10 — ${quan.lyDo}.`);
  out.push(`- 🏠 **Điền khí:** ${dien.pt}/10 — ${dien.lyDo}.`);
  out.push(`- 💑 **Hôn nhân:** ${hon.pt}/10 — ${hon.lyDo}.`);
  out.push(`- 🩺 **Sức khỏe:** ${skhInv.pt}/10 — ${skhInv.lyDo} (Tật Ách càng nhiều sát thì sức khỏe càng cần lưu ý).`);
  out.push('');

  // ─── ĐỌC HÌNH DÁNG LÁ SỐ TỪ ĐIỂM SỐ ───
  const allScores = [phuc.pt, tai.pt, quan.pt, dien.pt, hon.pt, skhInv.pt];
  const avg = allScores.reduce((a, b) => a + b, 0) / allScores.length;
  const maxIdx = allScores.indexOf(Math.max(...allScores));
  const minIdx = allScores.indexOf(Math.min(...allScores));
  const labels = ['Phúc khí', 'Tài khí', 'Quan khí', 'Điền khí', 'Hôn nhân', 'Sức khỏe'];
  let portrait = '';
  if (avg >= 7) portrait = `Tổng điểm trung bình ${avg.toFixed(1)}/10 — lá số NẰM Ở TẦNG CAO, cuộc đời nói chung là phúc đầy. `;
  else if (avg >= 5.5) portrait = `Tổng điểm trung bình ${avg.toFixed(1)}/10 — lá số ở mức KHÁ ĐẦY ĐỦ, có lên có xuống nhưng không rơi đáy. `;
  else if (avg >= 4) portrait = `Tổng điểm trung bình ${avg.toFixed(1)}/10 — lá số ở mức TRUNG BÌNH, cần dụng công để cải thiện từng mảng. `;
  else portrait = `Tổng điểm trung bình ${avg.toFixed(1)}/10 — lá số THIÊN VỀ THỬ THÁCH; cuộc đời cần ý chí và bản lĩnh nhiều hơn người khác, nhưng chính đó cũng là cái lò tôi luyện. `;
  portrait += `Điểm SÁNG nhất là **${labels[maxIdx]}** (${allScores[maxIdx]}/10) — nên xem đây là ĐIỂM TỰA chiến lược, đầu tư mạnh vào cung này sẽ có lãi cao nhất. `;
  portrait += `Điểm YẾU nhất là **${labels[minIdx]}** (${allScores[minIdx]}/10) — không nên đặt kỳ vọng quá cao ở cung này, thay vào đó hãy quản lý rủi ro và tìm cách bù trừ từ các mảng mạnh khác.`;
  const gap = allScores[maxIdx] - allScores[minIdx];
  if (gap >= 5) portrait += ` Chênh lệch giữa mạnh-yếu khá lớn (${gap} điểm) — đây là kiểu lá số "CHUYÊN BIỆT", phát rất mạnh ở một mảng nhưng cũng có chỗ thực sự thiếu hụt; nên xác định sớm để xây cuộc đời quanh điểm mạnh thay vì cố san đều.`;
  else if (gap <= 2) portrait += ` Các mảng tương đối đồng đều — kiểu lá số "TOÀN DIỆN", phù hợp với lối sống cân bằng, không lao về cực đoan nào.`;
  out.push('**📖 Đọc hình dáng tổng thể lá số:**');
  out.push(portrait);
  out.push('');

  const career = careerSuggestion(result);
  out.push('**▸ 7 hành động khuyến nghị thực tiễn:**');
  out.push(`1. **Sự nghiệp:** ${quan.pt >= 7 ? 'cung Quan đẹp — DỒN LỰC cho công danh, hợp nhận trọng trách.' : quan.pt >= 5 ? 'cung Quan trung bình — phát triển từng bước, tích lũy kinh nghiệm.' : 'cung Quan yếu — chọn nghề ổn định, tránh khởi nghiệp mạo hiểm.'}${career ? ` ${career}` : ''}`);
  out.push(`2. **Tài chính:** ${tai.pt >= 7 ? 'cung Tài tốt — biết tiết kiệm và đầu tư có chiến lược thì giàu bền.' : tai.pt >= 5 ? 'cung Tài bình — nên có 2-3 nguồn thu, tránh đặt cược lớn.' : 'cung Tài kém — chỉ giữ tiền, KHÔNG vay nợ đầu tư, không bảo lãnh.'}`);
  out.push(`3. **Hôn nhân/Quan hệ:** ${hon.pt >= 7 ? 'cung Phu Thê đẹp — duyên lành, sớm yên bề gia thất là phúc.' : hon.pt >= 5 ? 'cung Phu Thê bình — chọn kỹ, không vội; nhường nhịn để giữ hòa khí.' : 'cung Phu Thê có sóng — kết hôn muộn, tránh "yêu nhanh cưới gấp"; coi trọng giao tiếp.'}`);
  out.push(`4. **Sức khỏe:** ${skhInv.pt >= 7 ? 'sức khỏe nền tốt — duy trì vận động đều, không chủ quan.' : skhInv.pt >= 5 ? 'cần khám định kỳ; chú ý gan/dạ dày/giấc ngủ.' : '⚠ sức khỏe là ưu tiên hàng đầu; KHÁM TỔNG QUÁT 6 tháng/lần, tránh thức khuya và rượu bia.'}`);
  out.push(`5. **Học hành/Phát triển bản thân:** đầu tư cho kỹ năng "tủ" theo đúng lĩnh vực hợp ở mục Sự nghiệp${career ? '' : ' (xét chính tinh Quan Lộc và cung tam hợp Mệnh)'} — học sâu một nghề rồi mở rộng dần sang nghề liên quan.`);
  out.push(`6. **Gia đình:** ${phuc.pt >= 6 ? 'phúc khí dày — giữ truyền thống, tích thiện để phúc lưu hậu vận.' : 'phúc khí cần bồi đắp — làm việc thiện đều đặn, kính trọng tổ tiên cha mẹ.'}`);
  const { nutThat } = aggregatePhiHoa(c);
  out.push(`7. **Quản trị rủi ro:** ${nutThat ? `chú ý nhất là cung ${nutThat.palace} (Kỵ phi vào nhiều) — đây là "nút thắt" — chủ động phòng ngừa, đừng tránh né.` : 'không có nút thắt lớn — duy trì bình ổn là tốt.'}`);
  out.push('');
  return out.join('\n');
}

// ---- API CHÍNH ----

/**
 * Sinh báo cáo offline đầy đủ — đồng bộ với khung 8 phần của Phân tích AI
 * (Lê Quang Lăng + Diệu Xuân — Nam Phái Việt Nam):
 *   1. Tổng quan & Bản chất (THỂ)
 *   2. DỤNG: Quan/Tài/Di/Nô/Điền
 *   3. Phúc khí + Gia đạo + Hôn nhân + Tử tức + Sức khỏe
 *   4. Khí số 6 trục đối                ⭐ MỚI
 *   5. Phi Hóa Nam Phái + Nút thắt     ⭐ MỚI
 *   6. Vận trình đại vận
 *   7. (gộp vào kết luận)
 *   8. Chấm điểm 6 mảng + 7 hành động  ⭐ MỚI
 *
 * Dùng cho tab "Nâng cao" của FullChartAIScreen, hoặc fallback khi không có mạng.
 */

/**
 * Cắt nội dung markdown đến hết phần có tiêu đề khớp (# Title) — dùng cho preview nâng cao.
 * Trả về tất cả nội dung từ đầu đến hết section đó (không bao gồm section kế tiếp).
 */
export function cutAtSection(text: string, sectionTitle: string): string {
  const escaped = sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const idx = text.search(new RegExp(`^# ${escaped}\\s*$`, 'm'));
  if (idx < 0) return text;
  const next = text.indexOf('\n# ', idx + 1);
  return (next > 0 ? text.slice(0, next) : text).trimEnd();
}

export function generateOfflineFullChart(result: AstrologyResult): string {
  const c = result.tuViChart;
  const header = [
    `**Người xem:** ${result.birthInfo.gender === 'nam' ? 'Nam' : 'Nữ'}, sinh ${result.birthInfo.day}/${result.birthInfo.month}/${result.birthInfo.year} giờ ${result.birthInfo.hour}h.`,
    `**Bản Mệnh:** ${c.napAmMenh} · **Cục:** ${c.cucName} · **Âm Dương:** ${c.amDuongThuanLy === 'thuận' ? 'Thuận Lý' : 'Nghịch Lý'}`,
    '',
    '_Phân tích theo Nam Phái Việt Nam (hệ thống Lê Quang Lăng + phương pháp luận Diệu Xuân)._',
    '',
  ].join('\n');

  return [
    header,
    step1_TongQuan(result),       // 1. THỂ (Mệnh/Thân/Cục/Âm Dương)
    step2_TungCung(result),       // 2-3. DỤNG + PHÚC KHÍ + TÌNH CẢM + SỨC KHỎE
    step3_MieuHam(result),        //    Miếu hãm + Cách cục tổng hợp (12 cung, top-24)
    step_TrucKhiSo(result),       // 4. ⭐ Khí số 6 trục đối
    step_PhiHoa(result),          // 5. ⭐ Phi Hóa Nam Phái
    step4_VanTrinh(result),       // 6. Đại vận
    step5_KetLuan(result),        // 7. Kết luận đúc kết
    step_ChamDiem(result),        // 8. ⭐ Chấm điểm + Hành động khuyến nghị
  ].join('\n');
}

// ════════════════════════════════════════════════════════════════
//  OFFLINE LUẬN ĐẠI VẬN — chi tiết 1 đại vận theo 3 yếu tố cụ Thiên Lương.
//  Logic GIỮ NGUYÊN với scoreDaiVan: Thiên thời · Địa lợi · Nhân hòa
//  + bổ trợ Miếu/Hãm, Tứ Hóa, Cát/Sát, Tuần Triệt.
// ════════════════════════════════════════════════════════════════

const RELATE_ADVICE: Record<string, string> = {
  sinhNhap: 'môi trường thuận lợi nuôi dưỡng — dễ phát triển không phải gắng sức.',
  dongHanh: 'hòa hợp tự nhiên — đời sống ổn định, không cực đoan.',
  khacXuat: 'phải chủ động vượt qua cản trở — vất vả nhưng nếu kiên trì sẽ thắng.',
  sinhXuat: 'phải bỏ sức nuôi hoàn cảnh — hao tổn năng lượng, cần tiết chế đầu tư.',
  khacNhap: 'hoàn cảnh chèn ép — nên thủ thế, tránh quyết định lớn.',
};

const NH_TXT: Record<string, string> = {
  cao: 'cao — bộ chính tinh đại vận và bộ Mệnh tương hợp tốt',
  kha: 'khá — có giao thoa nhưng chưa thật sự cộng hưởng',
  binh: 'trung bình — hai bộ trung lập với nhau',
  kem: 'kém — bộ chính tinh đại vận xung khắc với bộ Mệnh, dễ "trái tay"',
};

/**
 * Kết luận cát tinh trội — mỗi cung có câu riêng phản ánh lĩnh vực của nó.
 * "tương đối" khi vẫn còn sát tinh (chưa hoàn toàn thuận), bỏ qua khi sat === 0.
 */
function palaceCatPhrase(palaceName: string, cat: number, sat: number): string {
  const q = sat === 0 ? '' : 'tương đối ';
  const map: Record<string, string> = {
    'Mệnh':      `bản mệnh ${q}vững, cuộc đời thiên về thuận lợi và được nhiều yếu tố phù trợ`,
    'Phụ Mẫu':   `quan hệ bề trên ${q}thuận hòa, dễ hưởng phúc ấm và sự hỗ trợ từ cha mẹ, người lớn`,
    'Phúc Đức':  `phúc đức ${q}dày, nội tâm bình an và thường gặp may mắn`,
    'Điền Trạch': `điền trạch ${q}ổn định, nhà ở và tài sản cố định được bảo trợ`,
    'Quan Lộc':  `quan lộc ${q}thuận lợi và được các nguồn lực bổ trợ để phát triển`,
    'Nô Bộc':    `duyên cộng sự – thuộc cấp ${q}tốt, dễ tìm được người phụ giúp đáng tin`,
    'Thiên Di':  `vận di chuyển và giao tiếp xã hội ${q}hanh thông, dễ được quý nhân hỗ trợ nơi xa`,
    'Tật Ách':   `sức khỏe ${q}ổn định, ít bị bệnh tật nặng và cơ thể được bảo trợ`,
    'Tài Bạch':  `tài lộc ${q}hanh thông, tiền tài được hỗ trợ và dễ tích lũy`,
    'Tử Tức':    `duyên con cái ${q}thuận, con được phù trợ; sáng tạo và đầu tư cũng có chiều hướng tốt`,
    'Phu Thê':   `tình duyên – hôn nhân ${q}hòa thuận, phối ngẫu và tình cảm được bảo trợ`,
    'Huynh Đệ':  `tình anh em – bằng hữu ${q}tốt, dễ có người thân – cộng sự sát cánh`,
  };
  return map[palaceName] ?? `cung này ${q}được nhiều cát tinh phù trợ, phần thuận trội hơn phần nghịch`;
}

/** Mô tả NGẮN GỌN một cung (chính/phụ/cát–sát/cách/Tuần–Triệt) thành 1 đoạn prose. */
function palaceProse(result: AstrologyResult, palaceName: string): string {
  const h = result.tuViChart.houses.find(x => x.palaceName === palaceName);
  if (!h) return '';
  const chinh = chinhTinhFull(h);
  const chinhNames = chinhTinhOf(h);
  const phu = phuTinhOf(h, 6);
  const cs = countCatSat(h);
  const ca = detectCachCucInPalace(h.stars.filter(s => s.type !== 'luu').map(s => s.name), h.branch, h.palaceName);
  const core = chinhNames[0] ? CHINH_TINH_CORE[chinhNames[0]] : '';
  let s = `**▸ ${palaceName} (${h.branch}):** `;
  s += chinh.length ? `${chinh.join(', ')} tọa thủ. ` : 'Vô chính diệu — mượn sao từ cung xung chiếu. ';
  if (core) s += `${trimText(core, 150)} `;
  if (phu.length) s += `Phụ tinh: ${phu.join(', ')}. `;
  if (cs.cat + cs.sat > 0) {
    s += cs.cat > cs.sat
      ? `Cát tinh trội (${cs.cat}/${cs.sat}) — ${palaceCatPhrase(palaceName, cs.cat, cs.sat)}. `
      : cs.sat > cs.cat ? `Sát tinh nhiều (${cs.sat}/${cs.cat}) — cần đề phòng. `
      : `Cát–sát cân bằng (${cs.cat}/${cs.sat}). `;
  }
  if (ca.length) {
    const tot = ca.filter(x => x.good).map(x => x.name);
    const hung = ca.filter(x => !x.good).map(x => x.name);
    if (tot.length) s += `Hội cách tốt: ${tot.join(', ')}. `;
    if (hung.length) s += `Lưu ý cách: ${hung.join(', ')}. `;
  }
  if (h.tuanAt || h.trietAt) s += tuanTrietVerdict(h);
  return s.trim();
}

// Bảng chủ đề chính của vận theo cung đại vận đóng — Bước 3 khung 12 bước.
const DV_TOPIC: Record<string, { name: string; theme: string }> = {
  'Mệnh': { name: 'Vận tự thân – tái định hình bản thân', theme: 'phát triển cá nhân, định lại lý tưởng sống, hoàn thiện cốt cách' },
  'Phụ Mẫu': { name: 'Vận gốc gác – quan hệ với bậc trên', theme: 'gia đình, cha mẹ, người dìu dắt, học hỏi từ tiền bối' },
  'Phúc Đức': { name: 'Vận phúc khí – đời sống tinh thần', theme: 'tu dưỡng nội tâm, tích đức, hưởng thụ tinh thần, hậu vận' },
  'Điền Trạch': { name: 'Vận bất động sản – tích lũy sản nghiệp', theme: 'nhà cửa, đất đai, tài sản cố định, gia đạo ổn định' },
  'Quan Lộc': { name: 'Vận phát triển sự nghiệp – công danh', theme: 'sự nghiệp, thăng tiến, vị trí xã hội, vai trò và trách nhiệm' },
  'Nô Bộc': { name: 'Vận mở rộng xã hội – quan hệ cộng sự', theme: 'bạn bè, đối tác, thuộc cấp, mạng lưới quan hệ' },
  'Thiên Di': { name: 'Vận xuất ngoại – di chuyển', theme: 'đi xa, lập nghiệp nơi khác, mở rộng môi trường sống' },
  'Tật Ách': { name: 'Vận sức khỏe – tái cấu trúc thân thể', theme: 'sức khỏe, tật bệnh tiềm ẩn, thanh lọc và xây lại nền tảng thân thể' },
  'Tài Bạch': { name: 'Vận kiếm tiền – tích lũy tài chính', theme: 'thu nhập, đầu tư, tích lũy, quản lý dòng tiền' },
  'Tử Tức': { name: 'Vận con cái – sáng tạo – kế thừa', theme: 'con cái, học trò, sáng tạo, đầu tư cho thế hệ sau' },
  'Phu Thê': { name: 'Vận hôn nhân – gia đạo', theme: 'hôn nhân, quan hệ bạn đời, hạnh phúc gia đình' },
  'Huynh Đệ': { name: 'Vận đồng cấp – anh em', theme: 'quan hệ anh em ruột, bạn cùng vai vế, cộng tác ngang hàng' },
};

/** Sinh báo cáo offline cho 1 đại vận theo index trong result.daiVans.
 *  Đồng bộ khung 12 bước: gọi tên chủ đề + so sánh Mệnh/Thân + Phi Hóa + 3 giai đoạn + chiến lược 3 tầng. */
export function generateOfflineDaiVan(result: AstrologyResult, dvIndex: number): string {
  const dv = result.daiVans.find(d => d.index === dvIndex);
  if (!dv) return '_Không tìm thấy đại vận này._';
  const sc = scoreDaiVan(result, dv);
  const h = result.tuViChart.houses.find(x => x.branch === dv.branch);
  const birthYear = result.birthInfo.year;
  const out: string[] = [];

  const thM = tamHopOf(dv.branch);
  const tuoiTh = tamHopOf(result.tuViChart.lunarDate.yearBranch);

  // Bước 1 — Đại vận đang ở quá khứ / hiện tại / tương lai.
  const ageNow = (result.tuViChart.viewingYear ?? new Date().getFullYear()) - birthYear + 1;
  const timeline = ageNow < dv.startAge ? 'TƯƠNG LAI' : ageNow > dv.endAge ? 'QUÁ KHỨ' : 'HIỆN TẠI';

  out.push(`**Đại vận ${dv.startAge}–${dv.endAge} tuổi (${dv.stem} ${dv.branch}) — cung ${sc.palaceName}** · giai đoạn ${timeline}`);
  out.push(`Tương ứng các năm ${birthYear + dv.startAge - 1}–${birthYear + dv.endAge - 1}. Đánh giá tổng quát: **${sc.rating}** (Tài lộc ${sc.taiLoc} / Thách thức ${sc.thachThuc}).`);
  out.push('');

  // ─── Bước 3 — CHỦ ĐỀ CHÍNH CỦA VẬN ───
  const topic = DV_TOPIC[sc.palaceName];
  if (topic) {
    out.push('# Chủ đề chính của vận');
    out.push(`▸ Đây là **${topic.name}** — trọng tâm 10 năm tới xoay quanh: ${topic.theme}.`);
    out.push(`Hãy đọc tất cả các phần tiếp theo qua "lăng kính" chủ đề này — bởi vận này chính là 1 chương của cuộc đời, và chương ấy mang chủ đề ấy.`);
    out.push('');
  }

  // Đoạn 1 — luận 3 yếu tố thành văn liền mạch.
  out.push('# Cục diện chung của đại vận');
  let p1 = `Xét theo phương pháp cụ Thiên Lương, đại vận này được soi qua ba yếu tố. Về **Thiên thời**, tam hợp đại vận (hành ${thM.element}) so với tam hợp năm sinh (hành ${tuoiTh.element}) ở thế ${RELATE_TXT[sc.thienThoi]}, nghĩa là ${RELATE_ADVICE[sc.thienThoi]} `;
  p1 += `Về **Địa lợi**, hành của cung đại vận đối với hành bản Mệnh ở thế ${RELATE_TXT[sc.diaLoi]} — ${RELATE_ADVICE[sc.diaLoi]} `;
  p1 += `Về **Nhân hòa**, mức độ tương hợp giữa bộ chính tinh đại vận và bộ Mệnh ở mức ${NH_TXT[sc.nhanHoa]}. `;
  p1 += sc.rating === 'Rất tốt' || sc.rating === 'Tốt'
    ? 'Cả ba yếu tố cộng hưởng thuận chiều, đây là một chặng đời đáng để dấn thân và bứt phá.'
    : sc.rating === 'Nhiều thách thức'
    ? 'Ba yếu tố phần nhiều nghịch nhau, báo hiệu một chặng đường gập ghềnh, cần giữ mình hơn là tiến công.'
    : 'Các yếu tố đan xen tốt – xấu, nên cục diện ở mức vừa phải, tiến lui đều cần cân nhắc.';
  out.push(p1.trim());
  out.push('');

  // Đoạn 2 — sao tại cung, viết thành nhận định.
  if (h) {
    out.push('# Tinh đẩu chủ đạo trong vận');
    const chinhNames = chinhTinhOf(h);
    let p2 = '';
    if (chinhNames.length) {
      const bo = detectBoChinhTinh(chinhNames);
      p2 += `Cung đại vận có ${chinhTinhFull(h).join(', ')} dẫn dắt`;
      p2 += bo.length ? `, hợp thành ${bo.join(', ')} — ` : '. ';
      const core = CHINH_TINH_CORE[chinhNames[0]];
      if (core) p2 += `${trimText(core, 220)} `;
    } else {
      p2 += 'Cung đại vận vô chính diệu, sắc thái giai đoạn chủ yếu do sao xung chiếu và các phụ tinh quyết định. ';
    }
    const tuHoa = h.stars.map(s => s.name.startsWith('L. ') ? s.name.slice(3) : s.name)
      .filter(n => /^Hóa (Lộc|Quyền|Khoa|Kỵ)$/.test(n));
    if (tuHoa.length) p2 += `Trong vận có ${tuHoa.join(', ')} dẫn động, làm nổi bật chuyện ${tuHoa.includes('Hóa Kỵ') ? 'vướng mắc, thị phi cần hóa giải' : 'tài lộc, quyền lực và danh tiếng'}. `;
    const cs = countCatSat(h);
    if (cs.cat + cs.sat > 0) {
      p2 += cs.cat > cs.sat
        ? `Cát tinh vây quanh nhiều hơn sát tinh (${cs.cat}/${cs.sat}) nên phần nâng đỡ trội hơn phần cản trở. `
        : cs.sat > cs.cat
        ? `Sát tinh nhỉnh hơn cát tinh (${cs.sat}/${cs.cat}), nhắc ta giai đoạn này phải bền chí và cẩn trọng. `
        : `Cát – sát cân bằng (${cs.cat}/${cs.sat}), thành bại đan xen. `;
    }
    if (h.tuanAt || h.trietAt) p2 += tuanTrietVerdict(h);
    out.push(p2.trim());
    out.push('');
  }

  // Đoạn 3 — TÁC ĐỘNG LÊN CÁC CUNG QUAN TRỌNG trong đại vận.
  out.push('# Tác động lên các cung trong đại vận');
  out.push('Trong giai đoạn này, các cung trọng yếu của lá số (xét trên nền tảng sao gốc và quan hệ tam hợp – xung chiếu với cung đại vận) biểu hiện như sau:');
  for (const pn of ['Mệnh', 'Quan Lộc', 'Tài Bạch', 'Phu Thê', 'Tử Tức', 'Điền Trạch', 'Phúc Đức', 'Thiên Di', 'Tật Ách']) {
    const line = palaceProse(result, pn);
    if (line) out.push(line);
  }
  out.push('');

  // Đoạn 4 — SỰ NGHIỆP & TÀI LỘC.
  out.push('# Sự nghiệp & tài lộc trong vận');
  {
    let p = '';
    const quan = palaceProse(result, 'Quan Lộc');
    const tai = palaceProse(result, 'Tài Bạch');
    const dien = palaceProse(result, 'Điền Trạch');
    if (quan) p += quan + '\n';
    if (tai) p += tai + '\n';
    if (dien) p += dien + '\n';
    out.push(p.trim());
    out.push(
      sc.taiLoc >= 65
        ? 'Tổng hợp lại, đây là chặng đường công danh – tài lộc nhiều cơ hội: thuận để thăng tiến, mở rộng nguồn thu, đầu tư có tính toán hoặc khởi sự việc lớn. Nên chủ động nắm bắt thời cơ.'
        : sc.thachThuc >= 60
        ? 'Tổng hợp lại, công danh – tài lộc giai đoạn này nhiều trắc trở: dễ hao tài vì người khác, đầu tư khó sinh lời nhanh. Nên giữ tiền, tránh vay nợ lớn và đứng ra bảo lãnh.'
        : 'Tổng hợp lại, công danh – tài lộc ở mức vừa phải: nên đi từng bước chắc, tích lũy vốn liếng và kinh nghiệm, chờ đại vận sáng hơn để bứt phá.'
    );
    out.push('');
  }

  // Đoạn 5 — TÌNH CẢM – GIA ĐẠO – SỨC KHỎE.
  out.push('# Tình cảm – gia đạo – sức khỏe trong vận');
  for (const pn of ['Phu Thê', 'Tử Tức', 'Phụ Mẫu', 'Phúc Đức', 'Tật Ách']) {
    const line = palaceProse(result, pn);
    if (line) out.push(line);
  }
  out.push('');

  // Đoạn 6 — DIỄN TIẾN QUA TỪNG NĂM (chuỗi 10 tiểu vận).
  const yearsInDv = result.tieuVans
    .filter(t => t.daiVanIndex === dvIndex)
    .sort((a, b) => a.age - b.age);
  if (yearsInDv.length) {
    out.push('# Diễn tiến qua từng năm');
    out.push('Quy tắc "Đại vận lấn áp Tiểu vận": gốc đại vận đã định ở trên, từng năm chỉ làm đậm/nhạt thêm. Kết luận từng năm dưới đây lấy đúng theo phần Tiểu vận của năm đó:');
    out.push('');
    for (const t of yearsInDv) {
      const ts = scoreTieuVan(result, t);
      const hh = result.tuViChart.houses.find(x => x.branch === t.branch);
      const chinh = hh ? chinhTinhFull(hh).join(', ') || 'Vô chính diệu' : t.branch;
      out.push(`▸ **${t.age} tuổi (năm ${t.year}, ${t.stem} ${t.branch})** — nhập cung ${ts?.palaceName ?? t.branch} (${chinh}): **${ts?.rating ?? ''}** (Tài lộc ${ts?.taiLoc ?? '-'} / Thách thức ${ts?.thachThuc ?? '-'}).`);
      if (ts?.rating) out.push(tieuVanConclusion(ts.rating));
    }
    out.push('');
  }

  // ─── Bước 6-7 — SO VỚI MỆNH GỐC & THÂN ───
  out.push('# So sánh với Mệnh gốc và Thân');
  const menh = result.tuViChart.houses.find(x => x.isManh);
  const than = result.tuViChart.houses.find(x => x.isThan);
  if (menh) {
    const menhChinh = chinhTinhOf(menh).join(', ') || 'Vô chính diệu';
    let cmpMenh = `▸ **So với Mệnh gốc** (cung Mệnh tại ${menh.branch}, chính tinh ${menhChinh}): `;
    if (sc.diaLoi === 'sinhNhap' || sc.diaLoi === 'dongHanh') {
      cmpMenh += 'đại vận này KÍCH HOẠT ĐIỂM MẠNH của Mệnh — hợp để TIẾN CÔNG, dấn thân vào lĩnh vực mình vốn có sở trường. Đây là chặng đời "đúng người, đúng thời".';
    } else if (sc.diaLoi === 'khacXuat') {
      cmpMenh += 'Mệnh phải CHỦ ĐỘNG vượt qua cục diện của đại vận — nỗ lực sẽ được đền đáp nhưng cần dụng công gấp đôi. Phù hợp với chiến lược TIẾN CÔNG có chuẩn bị.';
    } else {
      cmpMenh += 'đại vận này tạo ÁP LỰC NGƯỢC lên Mệnh — không hợp khởi sự lớn, nên PHÒNG THỦ, củng cố nội lực và chờ đại vận sau khi điều kiện thuận hơn.';
    }
    out.push(cmpMenh);
  }
  if (than) {
    const thanChinh = chinhTinhOf(than).join(', ') || 'Vô chính diệu';
    let cmpThan = `▸ **So với Thân** (cung Thân tại ${than.branch}, chính tinh ${thanChinh}): `;
    // Thân vs đại vận — dùng cung Thân có hợp thế tam hợp/xung với đại vận không.
    const thanIdx = than ? branchIdx(than.branch) : -1;
    const dvIdx2 = branchIdx(dv.branch);
    const inTamHop = thM.group.includes(thanIdx);
    const isXung = (thanIdx + 6) % 12 === dvIdx2;
    if (thanIdx === dvIdx2) {
      cmpThan += 'Đại vận và Thân ĐỒNG CUNG — vận này tác động trực tiếp đến cách bạn hành xử ngoài đời thực, rất đậm; có cơ hội thực thi mạnh mẽ.';
    } else if (inTamHop) {
      cmpThan += 'Đại vận hội tam hợp với Thân — vận TẠO CƠ HỘI HÀNH ĐỘNG THỰC TẾ; những gì lý thuyết đề ra dễ chuyển thành kết quả cụ thể.';
    } else if (isXung) {
      cmpThan += 'Đại vận XUNG CHIẾU Thân — vận này tạo ÁP LỰC THAY ĐỔI cách hành xử; có thể tốt trên lý thuyết nhưng khi triển khai sẽ gặp lực cản từ chính thói quen cũ.';
    } else {
      cmpThan += 'Đại vận và Thân không có quan hệ trực tiếp — tác động lên hành động thực tế là vừa phải; cần ý thức chủ động mới chuyển hóa được vận thành kết quả.';
    }
    out.push(cmpThan);
  }
  out.push('');

  // ─── Bước 9 — PHI HÓA ĐẠI VẬN (NAM PHÁI) ───
  if (h) {
    const bIdxDv = result.tuViChart.houses.indexOf(h);
    const phi = computePhiHoa(result.tuViChart, bIdxDv);
    out.push('# Phi Hóa đại vận (Nam Phái)');
    out.push(`_**Phi Hóa đại vận** là điểm cốt lõi của Nam Phái khi xét vận: cung đại vận (theo can ${h.can} của nó) sẽ "bắn" 4 luồng năng lượng Lộc – Quyền – Khoa – Kỵ sang các cung khác trên lá số. Nhờ đó ta thấy được trong 10 năm này, vận đang DỒN cơ hội/áp lực vào những mảng nào — chứ không chỉ xem riêng cung đại vận. Logic đọc: cung đại vận PHÁT hóa tới cung nào thì mảng do cung đó quản chính là nơi vận tác động mạnh nhất (Lộc = mở cơ hội, Quyền = trao trách nhiệm/quyền, Khoa = mở danh tiếng/quý nhân, Kỵ = điểm nghẽn cần quản trị); ngược lại, cung đại vận NHẬN hóa từ cung nào thì nguồn lực (hoặc áp lực) của vận có gốc từ mảng đó._`);
    if (phi.phat.length) {
      out.push(`▸ **Cung đại vận (can ${h.can}) PHÁT đi:**`);
      for (const p of phi.phat) {
        const symbol = p.hoa === 'Hóa Kỵ' ? '⚠' : '★';
        out.push(`- ${symbol} ${p.hoa} → cung **${p.toPalace}** (qua sao ${p.viaStar}): ` +
          (p.hoa === 'Hóa Lộc' ? `đại vận MỞ CƠ HỘI ở ${p.toPalace.toLowerCase()} — đây là cửa lớn nhất của vận, nên dồn lực vào đây.`
          : p.hoa === 'Hóa Quyền' ? `đại vận trao QUYỀN HÀNH/TRÁCH NHIỆM ở ${p.toPalace.toLowerCase()} — phải chủ động đảm nhận, không né tránh.`
          : p.hoa === 'Hóa Khoa' ? `đại vận mở DANH TIẾNG/QUÝ NHÂN ở ${p.toPalace.toLowerCase()} — đây là chỗ dễ được công nhận và có người đỡ.`
          : `đại vận tạo ĐIỂM NGHẼN ở ${p.toPalace.toLowerCase()} — cần đặc biệt quản trị rủi ro tại đây, không cố lao vào.`));
      }
    }
    if (phi.nhan.length) {
      out.push(`▸ **Cung đại vận NHẬN hóa từ các cung khác:**`);
      for (const p of phi.nhan) {
        out.push(`- ${p.hoa} ← cung ${p.fromPalace} (qua sao ${p.viaStar}): năng lượng/${p.hoa === 'Hóa Kỵ' ? 'áp lực' : 'cơ hội'} từ ${p.fromPalace.toLowerCase()} chảy ngược vào đại vận này.`);
      }
    }
    if (!phi.phat.length && !phi.nhan.length) {
      out.push('_Không có dòng phi hóa nổi bật trong đại vận này — vận hành theo Tứ Hóa cố định tại cung._');
    }
    out.push('');
    out.push('*Quy luật Nam Phái: dòng LỘC là đường mở cơ hội, dòng KỴ là điểm nghẽn cần quản trị. Tập trung khai thác chỗ Lộc tới, đồng thời chủ động chuẩn bị cho chỗ Kỵ tới.*');
    out.push('');
  }

  // ─── Cách cục kích hoạt theo đại vận ───
  const cachActBlock = cachCucActivationBlock(
    result,
    dv.branch,
    `Đại Vận ${dv.stem} ${dv.branch} ${dv.startAge}–${dv.endAge} tuổi`,
  );
  if (cachActBlock) {
    out.push('# Cách cục kích hoạt trong đại vận này');
    out.push(cachActBlock);
  }

  // ─── Bước 10 — CHIA 10 NĂM THÀNH 3 GIAI ĐOẠN ───
  const yearsList = result.tieuVans
    .filter(t => t.daiVanIndex === dvIndex)
    .sort((a, b) => a.age - b.age);
  if (yearsList.length === 10) {
    out.push('# 10 năm chia thành 3 giai đoạn');
    const phases = [
      { name: '3 năm ĐẦU (KHỞI ĐỘNG – nền tảng – thử thách)', years: yearsList.slice(0, 3),
        guide: 'Đây là 3 năm "thăm dò" — chưa nên dồn lực, ưu tiên QUAN SÁT, HỌC HỎI, dựng nền móng. Đừng nóng vội với các quyết định lớn ngay từ năm đầu.' },
      { name: '4 năm GIỮA (BỨT PHÁ – biến động – chủ lực)', years: yearsList.slice(3, 7),
        guide: 'Đây là 4 năm CHỦ LỰC — biến động lớn nhất nhưng cũng nhiều cơ hội nhất. Phải sẵn sàng đưa ra quyết định khó. Đây là phần "đo lường" thực sự của đại vận.' },
      { name: '3 năm CUỐI (THU HOẠCH – ổn định – chuyển tiếp)', years: yearsList.slice(7, 10),
        guide: 'Đây là 3 năm "đóng gói" — thu hoạch thành quả, ổn định lại, và CHUẨN BỊ cho đại vận tiếp theo. Đừng cố khởi sự lớn vào cuối vận; thay vào đó chốt sổ và chuyển giao.' },
    ];
    for (const p of phases) {
      const avgTL = p.years.reduce((a, t) => a + (scoreTieuVan(result, t)?.taiLoc || 0), 0) / p.years.length;
      const avgTT = p.years.reduce((a, t) => a + (scoreTieuVan(result, t)?.thachThuc || 0), 0) / p.years.length;
      const mood = (avgTL - avgTT) > 5 ? 'CHIỀU CƠ HỘI' : (avgTT - avgTL) > 5 ? 'CHIỀU THỬ THÁCH' : 'ĐAN XEN';
      out.push(`▸ **${p.name}** — khí trung bình thiên ${mood} (TL ${avgTL.toFixed(0)} / TT ${avgTT.toFixed(0)}). ${p.guide}`);
    }
    out.push('');
  }

  // ─── Bước 11 — LUẬN 6 CHỦ ĐỀ (bổ sung Tài sản/Điền sản nếu chưa có) ───
  // (Sự nghiệp, Tài chính, Quan hệ, Hôn nhân/Gia đạo, Tài sản/Điền sản, Sức khỏe — 6 chủ đề đã được phủ qua các đoạn trên.)

  // ─── Bước 12 — CHIẾN LƯỢC HÀNH ĐỘNG 3 TẦNG (AI Coach) ───
  out.push('# Chiến lược hành động (12 tháng / 3 năm / toàn đại vận)');
  const isStrong = sc.rating === 'Rất tốt' || sc.rating === 'Tốt';
  const isWeak = sc.rating === 'Nhiều thách thức';
  const strategyName = isStrong ? 'TIẾN CÔNG' : isWeak ? 'PHÒNG THỦ' : sc.rating === 'Khá' ? 'TÍCH LŨY' : 'TÁI CẤU TRÚC';

  out.push(`▸ **Chiến lược chính:** ${strategyName}.`);
  out.push('');

  out.push('**A. 12 tháng tới — việc nên làm NGAY:**');
  if (isStrong) {
    out.push('- Lên danh sách 3 cơ hội lớn nhất trong vận và bắt đầu hành động cụ thể cho ít nhất 1 cơ hội.');
    out.push('- Mở rộng mạng lưới quan hệ chiến lược — gặp gỡ 5-10 người có thể giúp đỡ trong đại vận.');
    out.push('- Hoàn tất các "việc tồn đọng" cản trở bứt phá — không mang nợ cũ vào giai đoạn vàng.');
  } else if (isWeak) {
    out.push('- Tổng kiểm tra sức khỏe và tài chính cá nhân — biết rõ điểm yếu để bảo vệ.');
    out.push('- Tạm hoãn các quyết định lớn (đầu tư mạo hiểm, vay nợ, đứng ra bảo lãnh) — chờ tín hiệu rõ ràng hơn.');
    out.push('- Tích thiện và giữ hòa khí với người thân — phúc đức là tấm khiên tốt nhất giai đoạn này.');
  } else {
    out.push('- Lên kế hoạch trung hạn — không vội nhưng cũng không buông xuôi; mỗi quý xem lại 1 lần.');
    out.push('- Tích lũy chuyên môn và vốn liếng đều đặn — "đại vận sau sẽ thưởng cho ai tích vốn ở đại vận trước".');
    out.push('- Củng cố sức khỏe và quan hệ gia đình — nền vững thì lúc cơ hội tới mới có sức nắm.');
  }
  out.push('');

  out.push('**B. 3 năm tới — mục tiêu trung hạn:**');
  if (topic) {
    out.push(`- Định hình rõ vai trò mới trong lĩnh vực **${topic.theme}** — đây là chương đời của bạn, cần "có tên có tuổi" sau 3 năm.`);
  }
  out.push(`- Hoàn thành 1-2 dự án/cột mốc quan trọng có thể đo lường được (không phải mơ hồ "thành công hơn").`);
  out.push(`- Xác định ai là quý nhân, ai là gánh nặng — chủ động đầu tư cho quý nhân, giảm tiếp xúc với gánh nặng.`);
  out.push('');

  out.push('**C. Toàn đại vận — định hướng tổng thể:**');
  if (isStrong) {
    out.push(`▸ Đây là **giai đoạn vàng** của cuộc đời cho chủ đề "${topic?.theme || sc.palaceName}". Đầu tư mạnh mẽ và đừng tiếc công. Sau 10 năm, lá số sẽ chuyển sang đại vận khác — không phải cơ hội nào cũng quay lại.`);
  } else if (isWeak) {
    out.push(`▸ Đây là **giai đoạn rèn luyện** chứ không phải giai đoạn gặt hái. Mục tiêu là QUA ĐƯỢC, không hỏng nặng; rèn được bản lĩnh đủ để đại vận sau khi thuận sẽ bứt phá. Đừng tự trách bản thân vì chậm — đây là phần "khó" của hành trình.`);
  } else {
    out.push(`▸ Đây là **giai đoạn xây nền**. Không có cú phát ngoạn mục nhưng cũng không vực sâu — phần thưởng nằm ở việc TÍCH LŨY ĐỀU ĐẶN. 10 năm bình ổn này là vốn cho đại vận sau.`);
  }
  out.push('');

  // ─── Bước 7 — lời khuyên kết (giữ logic cũ, nhưng đã có chiến lược chi tiết phía trên) ───
  out.push('# Lời khuyên đúc kết');
  out.push(
    isStrong
      ? 'Đây là giai đoạn nên **dồn lực bứt phá**: mạnh dạn khởi sự lớn, chuyển hướng nghề nghiệp, đầu tư mở rộng và vun đắp các mối quan hệ then chốt. Hãy tận dụng tối đa Tứ Hóa, Lộc Tồn cùng các cát tinh hội về để biến cơ hội thành thành quả thực, đừng để thời vận trôi qua một cách thụ động.'
      : sc.rating === 'Khá'
      ? 'Đây là giai đoạn nên **tiến từng bước chắc chắn**: làm việc theo kế hoạch rõ ràng, tránh những canh bạc quá sức. Hãy dành thời gian củng cố quan hệ và trau dồi thêm kỹ năng, xem đây là bước đệm để chặng đời kế tiếp cất cánh thuận lợi hơn.'
      : sc.rating === 'Trung bình'
      ? 'Đây là giai đoạn nên **củng cố nội lực**: ưu tiên giữ tiền, học hỏi và bồi dưỡng bản thân thay vì gồng sức làm việc lớn. Chăm chút sức khỏe và gia đạo lúc này chính là cách tạo nền vững cho vận sau đi lên dễ dàng.'
      : 'Đây là giai đoạn nên **thủ thế**: hạn chế đầu tư mạo hiểm, thận trọng khi ký kết hợp đồng lớn và đặc biệt lưu tâm sức khỏe. Tích đức, làm việc thiện và giữ hòa khí với người thân sẽ giúp hóa giải bớt phần hung của vận này.'
  );
  out.push('');
  out.push('_Để luận sâu, linh hoạt và cá nhân hóa hơn, các bạn dùng chức năng Phân tích AI nhé!_');
  return out.join('\n');
}

// ════════════════════════════════════════════════════════════════
//  OFFLINE LUẬN TIỂU VẬN — chi tiết 1 năm trong 1 đại vận.
//  Logic GIỮ NGUYÊN với scoreTieuVan + quy tắc "Đại vận lấn áp Tiểu vận".
// ════════════════════════════════════════════════════════════════

/** Sinh báo cáo offline cho 1 tiểu vận theo tuổi (age). */
// Bảng chủ đề CHÍNH CỦA NĂM theo cung tiểu vận (Bước 3 khung Nam Phái).
const TV_TOPIC: Record<string, { name: string; theme: string }> = {
  'Mệnh': { name: 'Năm tự thân – nhìn lại và điều chỉnh', theme: 'soi xét lại bản thân, định lại hướng đi, điều chỉnh thói quen' },
  'Phụ Mẫu': { name: 'Năm gia đình – quan hệ với bậc trên', theme: 'gia đình, cha mẹ, người dìu dắt' },
  'Phúc Đức': { name: 'Năm phúc khí – tu dưỡng tinh thần', theme: 'tích đức, sống chậm, dưỡng tâm' },
  'Điền Trạch': { name: 'Năm tài sản – nhà cửa – tích lũy', theme: 'bất động sản, nhà cửa, sản nghiệp' },
  'Quan Lộc': { name: 'Năm sự nghiệp – công danh', theme: 'thăng tiến, đổi vai trò, định hướng nghề' },
  'Nô Bộc': { name: 'Năm quan hệ – mở rộng xã hội', theme: 'bạn bè, đối tác, mạng lưới quan hệ' },
  'Thiên Di': { name: 'Năm di chuyển – ra ngoài', theme: 'đi xa, thay đổi môi trường, công tác' },
  'Tật Ách': { name: 'Năm sức khỏe – tái cấu trúc thân thể', theme: 'sức khỏe, tật bệnh, dưỡng sinh' },
  'Tài Bạch': { name: 'Năm tài chính – dòng tiền', theme: 'thu nhập, đầu tư, quản lý tiền' },
  'Tử Tức': { name: 'Năm con cái – sáng tạo', theme: 'con cái, học trò, dự án sáng tạo' },
  'Phu Thê': { name: 'Năm hôn nhân – gia đạo', theme: 'hôn nhân, người bạn đời, tình cảm lứa đôi' },
  'Huynh Đệ': { name: 'Năm anh em – đồng cấp', theme: 'anh em, bạn cùng vai vế, cộng tác ngang hàng' },
};

export function generateOfflineTieuVan(result: AstrologyResult, age: number): string {
  const tv = result.tieuVans.find(x => x.age === age);
  if (!tv) return '_Không tìm thấy tiểu vận tuổi này._';
  const sc = scoreTieuVan(result, tv);
  const dv = result.daiVans.find(d => d.index === tv.daiVanIndex);
  const h = result.tuViChart.houses.find(x => x.branch === tv.branch);
  const out: string[] = [];

  out.push(`**Tiểu vận ${age} tuổi — năm ${tv.year} (${tv.stem} ${tv.branch}) — cung ${sc.palaceName}**`);
  out.push(`Đánh giá: **${sc.rating}** (Tài lộc ${sc.taiLoc} / Thách thức ${sc.thachThuc}).`);
  out.push('');

  // ─── Bước 3 — CHỦ ĐỀ CHÍNH CỦA NĂM ───
  const yearTopic = TV_TOPIC[sc.palaceName];
  if (yearTopic) {
    out.push('# Chủ đề chính của năm');
    out.push(`▸ Đây là **${yearTopic.name}** — trọng tâm 12 tháng tới xoay quanh: ${yearTopic.theme}.`);
    out.push('Mọi quyết định lớn trong năm nên được soi qua "lăng kính" chủ đề này — chính nó định hướng cho cả năm.');
    out.push('');
  }

  // 1) ĐẠI VẬN ĐANG BAO TRÙM — "đại vận lấn áp tiểu vận"
  if (dv) {
    const dvSc = scoreDaiVan(result, dv);
    out.push('# Đại vận đang bao trùm');
    out.push(`- ${dv.startAge}–${dv.endAge} tuổi (${dv.stem} ${dv.branch}), cung ${dvSc.palaceName} — **${dvSc.rating}**.`);
    out.push(`- Quy tắc *"Đại vận lấn áp Tiểu vận"*: ` +
      (dvSc.rating === 'Rất tốt' || dvSc.rating === 'Tốt'
        ? 'đại vận TỐT → năm tiểu vận xấu cũng đỡ thiệt; năm tốt thì rực rỡ rõ rệt.'
        : dvSc.rating === 'Nhiều thách thức'
        ? 'đại vận XẤU → năm tốt cũng khó bứt phá; năm xấu cần đặc biệt cẩn trọng.'
        : 'đại vận TRUNG TÍNH → tiểu vận là yếu tố quyết định sắc thái năm này.'));
    out.push('');
  }

  // 2) 3 YẾU TỐ
  out.push('# Sắc thái của năm');
  let p = `Năm này, về **Thiên thời** đang ở thế ${RELATE_TXT[sc.thienThoi]} — ${RELATE_ADVICE[sc.thienThoi]} `;
  p += `Về **Địa lợi**, cung tiểu hạn so với bản Mệnh ở thế ${RELATE_TXT[sc.diaLoi]} — ${RELATE_ADVICE[sc.diaLoi]} `;
  p += `**Nhân hòa** ở mức ${NH_TXT[sc.nhanHoa]}. `;
  if (h) {
    const chinh = chinhTinhFull(h);
    p += chinh.length
      ? `Cung tiểu hạn có ${chinh.join(', ')} chủ sự`
      : 'Cung tiểu hạn vô chính diệu, sắc thái năm chủ yếu do sao chiếu và phụ tinh';
    const cs = countCatSat(h);
    if (cs.cat + cs.sat > 0) {
      p += cs.cat > cs.sat ? `, lại được nhiều cát tinh nâng đỡ (${cs.cat}/${cs.sat}) nên phần thuận trội hơn. `
        : cs.sat > cs.cat ? `, song sát tinh hơi nhiều (${cs.sat}/${cs.cat}) nên cần thận trọng. `
        : `, cát sát cân bằng (${cs.cat}/${cs.sat}). `;
    } else p += '. ';
    if (h.tuanAt) p += 'Cung bị Tuần Không nên đầu năm dễ chệch choạc, cuối năm mới bù lại. ';
    if (h.trietAt) p += 'Cung bị Triệt Lộ nên nửa đầu năm khá vất vả. ';
  }
  out.push(p.trim());
  out.push('');

  // Sao lưu của năm — an theo Can–Chi NĂM (vd 2026 = Bính Ngọ), xét tại cung tiểu hạn.
  const luu = luuStarsTamPhuong(result, tv.yearStem, tv.yearBranch, tv.branch);
  out.push('# Sao lưu của năm (lưu tinh)');
  out.push(`Sao lưu an theo Can–Chi năm **${tv.yearStem} ${tv.yearBranch}** (${tv.year}) — mỗi sao lưu "chạy" tới đóng ở một cung; lấy ý nghĩa của chính sao đó NGAY TẠI CUNG nó đóng để biết năm nay nó động vào mảng đời sống nào. Xét tại cung tiểu hạn và tam phương (tam hợp chiếu + xung chiếu):`);
  out.push('');
  // Lấy sao lưu KÈM VỊ TRÍ cung → luận ý nghĩa từng sao tại đúng cung đó (byPalace).
  const luuPos = luuStarsTamPhuongPos(result, tv.yearStem, tv.yearBranch, tv.branch);
  const tieuHanName = h?.palaceName ?? tv.branch;
  const renderLuu = (stars: LuuStarPos[], pos: 'same' | 'tamHop' | 'xung') => {
    for (const sp of stars) {
      const hung = LUU_HUNG.has(sp.name);
      const inf = getStarInfo(sp.name);
      // Ưu tiên ý nghĩa SAO TẠI ĐÚNG CUNG nó đóng; thiếu thì dùng nghĩa lưu/cơ bản.
      const atPalace = inf?.byPalace?.[sp.palaceName];
      const core = atPalace ? trimText(atPalace, 220)
        : STAR_LUU_MEANING[sp.name] ? STAR_LUU_MEANING[sp.name]
        : inf?.basic ? trimText(inf.basic, 130) : 'tác động tới sắc thái của năm';
      const label = pos === 'same' ? `đóng tại cung tiểu hạn ${tieuHanName}`
        : pos === 'tamHop' ? `đóng ở cung ${sp.palaceName} — tam hợp chiếu về`
        : `đóng ở cung ${sp.palaceName} — xung chiếu`;
      const intensity = pos === 'same' ? 'tác động trực tiếp, rõ nhất trong năm'
        : pos === 'tamHop' ? 'hỗ trợ/chi phối gián tiếp'
        : 'tạo lực đối nghịch cần dung hòa';
      out.push(`- ${hung ? '⚠ ' : '✦ '}**${sp.name}** (${label} · ${intensity}): ${core}`);
    }
  };
  if (luuPos.same.length) renderLuu(luuPos.same, 'same');
  if (luuPos.tamHop.length) renderLuu(luuPos.tamHop, 'tamHop');
  if (luuPos.xung.length) renderLuu(luuPos.xung, 'xung');
  if (!luuPos.same.length && !luuPos.tamHop.length && !luuPos.xung.length) out.push('- Năm này không có sao lưu đáng kể hội về cung tiểu hạn và tam phương.');
  const yt = yearVsTuoi(result, tv.yearBranch);
  if (yt.namTuoi) out.push('- ⚠ **NĂM TUỔI (phạm Thái Tuế)**: "Thái Tuế đương đầu, vô họa tất có hung" — năm tuổi thường nhiều biến động, nên cẩn trọng, làm việc thiện, tránh việc trọng đại nếu cung xấu.');
  if (yt.xungTuoi) out.push('- ⚠ **XUNG TUỔI (Tuế Phá)**: chi năm xung chi tuổi — dễ xáo trộn, hao tài, bất hòa; nên giữ ổn định, tránh thay đổi lớn.');
  const allLuu = [...luu.same, ...luu.tamHop, ...luu.xung];
  out.push('');

  // SỰ NGHIỆP & TÀI LỘC trong năm.
  out.push('# Sự nghiệp & tài lộc năm nay');
  {
    const quan = palaceProse(result, 'Quan Lộc');
    const tai = palaceProse(result, 'Tài Bạch');
    if (quan) out.push(quan);
    if (tai) out.push(tai);
    const hasLoc = allLuu.includes('Hóa Lộc') || allLuu.includes('Hóa Quyền');
    const hasKy = allLuu.includes('Hóa Kỵ');
    out.push(
      (sc.rating === 'Rất tốt' || sc.rating === 'Tốt')
        ? `Năm nay công việc – tiền bạc khá thuận${hasLoc ? ', lại có lưu Hóa Lộc/Quyền trợ lực nên dễ có tin vui về thu nhập, thăng tiến' : ''}. Có thể tính chuyện khởi sự, chuyển việc hoặc đầu tư vừa sức.`
        : (sc.thachThuc >= 60 || hasKy)
        ? `Năm nay công việc – tiền bạc nhiều trắc trở${hasKy ? ', đặc biệt lưu Hóa Kỵ dễ gây hao tài, thị phi, vướng giấy tờ' : ''}. Nên giữ ổn định, hạn chế đầu tư lớn, cẩn trọng hợp đồng và chuyện vay mượn.`
        : 'Năm nay công việc – tiền bạc ở mức bình hòa: nên hoàn thành cho tốt việc đang làm, tích lũy dần, chưa vội mạo hiểm.'
    );
    out.push('');
  }

  // TÌNH CẢM – GIA ĐẠO trong năm.
  out.push('# Tình cảm – gia đạo năm nay');
  {
    const phu = palaceProse(result, 'Phu Thê');
    if (phu) out.push(phu);
    const hasDaoHong = allLuu.includes('Đào Hoa') || allLuu.includes('Hồng Loan');
    out.push(
      hasDaoHong
        ? 'Có lưu Đào Hoa/Hồng Loan hội về — năm dễ có duyên tình, hỷ sự (gặp người mới, đính hôn, cưới hỏi). Người đang độc thân nên mở lòng giao tiếp; người đã có đôi cần giữ chừng mực để tránh thị phi tình cảm.'
        : (allLuu.includes('Hóa Kỵ'))
        ? 'Lưu Hóa Kỵ dễ gây hiểu lầm, lục đục trong quan hệ — nên nhường nhịn, tránh nói lời nặng, dành thời gian cho gia đình để giữ hòa khí.'
        : 'Chuyện tình cảm – gia đạo năm nay tương đối bình ổn; cứ vun đắp đều đặn, lắng nghe người thân là đủ.'
    );
    out.push('');
  }

  // SỨC KHỎE trong năm.
  out.push('# Sức khỏe năm nay');
  {
    const tat = palaceProse(result, 'Tật Ách');
    if (tat) out.push(tat);
    const hasTangHo = allLuu.includes('Tang Môn') || allLuu.includes('Bạch Hổ');
    const hasSat = allLuu.includes('Kình Dương') || allLuu.includes('Đà La') || allLuu.includes('Hỏa Tinh') || allLuu.includes('Linh Tinh');
    out.push(
      (hasTangHo || hasSat)
        ? `Năm có ${hasTangHo ? 'lưu Tang Môn/Bạch Hổ' : 'lưu sát tinh (Kình/Đà/Hỏa/Linh)'} hội về — nên chú ý sức khỏe, đi lại cẩn thận, tránh va chạm và làm việc nặng quá sức; nên khám sức khỏe định kỳ trong năm.`
        : 'Sức khỏe năm nay không có dấu hiệu xấu nổi bật; vẫn nên duy trì sinh hoạt điều độ, ăn ngủ đúng giờ và vận động đều.'
    );
    out.push('');
  }

  // DIỄN TIẾN TRONG NĂM (đầu/giữa/cuối).
  out.push('# Diễn tiến trong năm');
  {
    let dt = '';
    if (h?.trietAt) dt += 'Cung tiểu hạn bị Triệt Lộ nên **nửa đầu năm** thường vất vả, trắc trở rõ; qua giữa năm mọi việc mới hanh thông dần. ';
    else if (h?.tuanAt) dt += 'Cung tiểu hạn bị Tuần Không nên **đầu năm** dễ chệch choạc, chậm trễ; càng về cuối năm càng bù lại. ';
    else dt += 'Sắc thái năm tương đối đều; ';
    dt += (sc.rating === 'Rất tốt' || sc.rating === 'Tốt')
      ? 'nhìn chung cả năm thuận, nên chọn thời điểm thuận lợi (đầu/giữa năm khi vận khí lên) để tiến hành việc trọng đại.'
      : sc.rating === 'Nhiều thách thức'
      ? 'cả năm cần giữ mình; tránh dồn việc lớn vào những tháng xung với tuổi, ưu tiên ổn định.'
      : 'cứ tiến từng bước, không nên nóng vội dồn việc vào một thời điểm.';
    out.push(dt.trim());
    out.push('');
  }

  // ─── Bước 5 — LƯU TỨ HÓA NĂM (ở đâu năm nay) ───
  const luuHoa = luuTuHoaPositions(result.tuViChart, tv.yearStem);
  if (luuHoa.length) {
    out.push('# Lưu Tứ Hóa năm — Cơ hội và điểm nghẽn ở đâu');
    out.push(`_Mỗi năm có một can riêng (can năm ${tv.yearStem}), can đó "rải" lại 4 hóa Lộc – Quyền – Khoa – Kỵ lên lá số gốc — gọi là **Lưu Tứ Hóa năm**. Đây là yếu tố làm mỗi năm một khác: nó chỉ ra NĂM NAY cơ hội (Lộc), việc phải gánh/quyền hành (Quyền), quý nhân – danh tiếng (Khoa) và điểm nghẽn dễ vướng (Kỵ) đang RƠI VÀO CUNG NÀO. Logic đọc: hóa rơi vào cung nào thì mảng đời sống do cung đó quản sẽ bị kích hoạt mạnh trong năm — nên dồn sức vào nơi có Lộc/Quyền/Khoa và phòng thủ ở nơi có Kỵ._`);
    for (const lh of luuHoa) {
      const symbol = lh.hoa === 'Hóa Kỵ' ? '⚠' : '★';
      const meaning = lh.hoa === 'Hóa Lộc'
        ? `**CƠ HỘI** năm nay đến từ ${lh.palace.toLowerCase()} — đây là cửa lớn nhất, nên ưu tiên dồn công sức vào đây`
        : lh.hoa === 'Hóa Quyền'
        ? `**TRÁCH NHIỆM/QUYỀN HÀNH** năm nay tập trung ở ${lh.palace.toLowerCase()} — chủ động đảm nhận, không né tránh`
        : lh.hoa === 'Hóa Khoa'
        ? `**QUÝ NHÂN/DANH TIẾNG** năm nay đến từ ${lh.palace.toLowerCase()} — đây là chỗ dễ được công nhận và có người đỡ`
        : `**ĐIỂM NGHẼN** năm nay ở ${lh.palace.toLowerCase()} — cần đặc biệt quản trị rủi ro tại đây, đừng cố lao vào`;
      out.push(`- ${symbol} **${lh.hoa}** (qua sao ${lh.star}) → cung ${lh.palace}: ${meaning}.`);
    }
    out.push('');
    out.push('*Quy luật Nam Phái: Lưu Lộc chỉ nơi năm nay CÓ CƠ HỘI. Lưu Kỵ chỉ nơi dễ phát sinh VẤN ĐỀ cần quản trị.*');
    out.push('');
  }

  // ─── Bước 6 — TƯƠNG TÁC TIỂU VẬN ↔ ĐẠI VẬN ───
  if (dv) {
    const dvSc = scoreDaiVan(result, dv);
    const tvIsGood = sc.rating === 'Rất tốt' || sc.rating === 'Tốt';
    const tvIsBad = sc.rating === 'Nhiều thách thức';
    const dvIsGood = dvSc.rating === 'Rất tốt' || dvSc.rating === 'Tốt';
    const dvIsBad = dvSc.rating === 'Nhiều thách thức';
    out.push('# Tương tác Tiểu vận với Đại vận');
    let interact = '';
    if (tvIsGood && dvIsGood) interact = '▸ **THUẬN**: tiểu vận và đại vận CÙNG TỐT → đây là năm KÍCH HOẠT MẠNH trong giai đoạn vàng. Hợp ra các quyết định lớn, mở rộng, đầu tư. Không có lý do gì để do dự.';
    else if (tvIsBad && dvIsBad) interact = '⚠ **NGHỊCH KÉP**: cả tiểu vận và đại vận đều xấu → đây là năm KHÓ NHẤT trong đại vận, phải đặc biệt thận trọng. Tạm hoãn quyết định lớn, ưu tiên giữ sức khỏe và tài chính.';
    else if (tvIsGood && dvIsBad) interact = '▸ **TIỂU TỐT TRONG ĐẠI XẤU**: năm có "tia sáng" nhưng vẫn bị bao trùm bởi đại vận xấu. Tận dụng các cơ hội nhỏ nhưng không quá kỳ vọng vào kết quả lớn — đại vận xấu sẽ kéo lại.';
    else if (tvIsBad && dvIsGood) interact = '▸ **TIỂU XẤU TRONG ĐẠI TỐT**: chỉ là "khúc trầm" trong giai đoạn vàng. Đại vận sẽ bù đắp, nhưng vẫn cần quản trị rủi ro năm này. Hãy xem đây là năm "nghỉ giữa hiệp" để chuẩn bị cho năm sau.';
    else interact = '▸ **TRUNG TÍNH**: tiểu vận và đại vận đan xen, không cộng hưởng mạnh. Năm này phụ thuộc nhiều vào quyết định và hành động cá nhân.';
    out.push(interact);
    out.push('');
  }

  // ─── Cách cục kích hoạt theo tiểu vận ───
  const tvCachAct = cachCucActivationBlock(
    result,
    tv.branch,
    `Tiểu Vận ${tv.stem} ${tv.branch} (${tv.age} tuổi, năm ${tv.year})`,
  );
  if (tvCachAct) {
    out.push('# Cách cục kích hoạt trong năm này');
    out.push(tvCachAct);
  }

  // ─── Bước 8 — SO SÁNH VỚI MỆNH VÀ THÂN ───
  out.push('# So sánh với Mệnh và Thân');
  const menhSo = result.tuViChart.houses.find(x => x.isManh);
  const thanSo = result.tuViChart.houses.find(x => x.isThan);
  if (menhSo) {
    const menhChinh = chinhTinhOf(menhSo).join(', ') || 'Vô chính diệu';
    let cmpMenh = `▸ **So với Mệnh gốc** (cung Mệnh tại ${menhSo.branch}, chính tinh ${menhChinh}): `;
    if (sc.diaLoi === 'sinhNhap' || sc.diaLoi === 'dongHanh') {
      cmpMenh += 'năm này KÍCH HOẠT ĐIỂM MẠNH của Mệnh — hợp để CHỦ ĐỘNG dấn thân, biểu hiện sở trường.';
    } else if (sc.diaLoi === 'khacXuat') {
      cmpMenh += 'Mệnh phải chủ động vượt qua thế năm — nỗ lực sẽ được đền nhưng cần dụng công.';
    } else {
      cmpMenh += 'năm này tạo ÁP LỰC NGƯỢC lên Mệnh — nên GIỮ NHỊP, củng cố nội lực, không khởi sự lớn.';
    }
    out.push(cmpMenh);
  }
  if (thanSo) {
    const thanChinh = chinhTinhOf(thanSo).join(', ') || 'Vô chính diệu';
    const thanIdx2 = branchIdx(thanSo.branch);
    const tvIdx2 = branchIdx(tv.branch);
    const inTHTV = tamHopOf(tv.branch).group.includes(thanIdx2);
    const isXungTV = (thanIdx2 + 6) % 12 === tvIdx2;
    let cmpThan = `▸ **So với Thân** (cung Thân tại ${thanSo.branch}, chính tinh ${thanChinh}): `;
    if (thanIdx2 === tvIdx2) cmpThan += 'năm này TRỰC TIẾP tác động lên cách bạn hành xử — biến chuyển có thể rất đậm.';
    else if (inTHTV) cmpThan += 'năm này TẠO CƠ HỘI HÀNH ĐỘNG THỰC TẾ — kế hoạch dễ chuyển thành kết quả.';
    else if (isXungTV) cmpThan += 'năm này XUNG CHIẾU Thân — tốt trên giấy nhưng khi triển khai sẽ gặp lực cản từ thói quen cũ.';
    else cmpThan += 'tác động lên hành động thực tế là vừa phải; cần chủ động mới chuyển hóa được vận thành kết quả.';
    out.push(cmpThan);
  }
  out.push('');

  // ─── Bước 11 — BẢN ĐỒ 4 QUÝ ───
  out.push('# Bản đồ 4 quý trong năm');
  const isHard = h?.tuanAt || h?.trietAt;
  const q1 = isHard
    ? '**Quý 1 (Jan–Mar) — KHỞI ĐỘNG CHẬM:** cung tiểu vận bị Tuần/Triệt nên đầu năm chệch choạc, kế hoạch khó triển khai. Ưu tiên dọn dẹp việc tồn đọng, xác lập mục tiêu mà KHÔNG vội khởi sự lớn.'
    : '**Quý 1 (Jan–Mar) — KHỞI ĐỘNG:** đặt mục tiêu năm, lên kế hoạch chi tiết, dọn dẹp việc tồn đọng từ năm trước. Đây là quý "gieo hạt" — chuẩn bị kỹ sẽ thu hoạch tốt cuối năm.';
  out.push(q1);
  out.push('**Quý 2 (Apr–Jun) — THỬ NGHIỆM:** triển khai kế hoạch theo từng bước nhỏ, mở rộng có kiểm soát. Quý này thường xuất hiện những vấn đề mới — coi đó là "tín hiệu" để điều chỉnh.');
  out.push(
    sc.rating === 'Rất tốt' || sc.rating === 'Tốt'
      ? '**Quý 3 (Jul–Sep) — TĂNG TỐC:** đây là quý vàng — ra các quyết định lớn, chốt việc quan trọng (kết hôn, đầu tư lớn, đổi việc nếu cần). Năng lượng năm dồn vào quý này.'
      : sc.rating === 'Nhiều thách thức'
      ? '**Quý 3 (Jul–Sep) — TĂNG TỐC THẬN TRỌNG:** dù áp lực dồn vào quý này, vẫn cần CHẬM RÃI ra quyết định, không bị cuốn theo nhịp. Đây là quý dễ phạm sai lầm nếu vội.'
      : '**Quý 3 (Jul–Sep) — TĂNG TỐC TỪNG BƯỚC:** ra quyết định ở những việc đã chuẩn bị kỹ, tránh quyết định ngẫu hứng.'
  );
  out.push('**Quý 4 (Oct–Dec) — THU HOẠCH & CHUYỂN TIẾP:** tổng kết những gì đã đạt được, ổn định, đóng gói các dự án dang dở. Đây là quý "đếm hạt" — chuẩn bị bàn giao cho năm sau.');
  out.push('');

  // ─── Bước 12-13 — TOP 5 CƠ HỘI & TOP 5 RỦI RO ───
  out.push('# Top cơ hội & rủi ro trong năm');
  const opps: string[] = [];
  const risks: string[] = [];
  for (const lh of luuHoa) {
    if (lh.hoa === 'Hóa Lộc') opps.push(`✦ **Cơ hội Tài/Lộc tại ${lh.palace}** — năm nay là cửa lớn cho ${lh.palace.toLowerCase()}; chủ động tìm kiếm và đầu tư công sức.`);
    if (lh.hoa === 'Hóa Quyền') opps.push(`✦ **Cơ hội thăng tiến/nắm quyền tại ${lh.palace}** — sẵn sàng nhận trách nhiệm lớn hơn ở cung này.`);
    if (lh.hoa === 'Hóa Khoa') opps.push(`✦ **Cơ hội quý nhân/danh tiếng tại ${lh.palace}** — chủ động giao tiếp, thể hiện năng lực ở cung này.`);
    if (lh.hoa === 'Hóa Kỵ') risks.push(`⚠ **Rủi ro lớn tại ${lh.palace}** — Lưu Kỵ phi vào đây; cần quản trị rủi ro chặt chẽ, không tham lam.`);
  }
  if (allLuu.includes('Tang Môn') || allLuu.includes('Bạch Hổ')) risks.push('⚠ **Rủi ro Tang/Hổ** — đề phòng hiếu sự, bệnh tật, kiện tụng trong gia tộc; nên tích đức.');
  if (allLuu.includes('Kình Dương') || allLuu.includes('Đà La')) risks.push('⚠ **Rủi ro va chạm** — Lưu Kình/Đà; cẩn thận giao thông, tranh cãi, đầu tư có yếu tố kiện tụng.');
  if (allLuu.includes('Đại Hao') || allLuu.includes('Tiểu Hao')) risks.push('⚠ **Rủi ro hao tài** — chi tiêu khó kiểm soát; nên lập ngân sách rõ ràng và bám sát.');
  if (allLuu.includes('Đào Hoa') || allLuu.includes('Hồng Loan')) opps.push('✦ **Cơ hội tình duyên/hỷ sự** — Lưu Đào/Hồng hội về; người độc thân nên mở lòng giao tiếp.');
  if (allLuu.includes('Thiên Mã')) opps.push('✦ **Cơ hội di chuyển/mở rộng** — Lưu Mã chiếu; cân nhắc đi xa, công tác, chuyển vùng làm việc.');
  if (allLuu.includes('Văn Xương') || allLuu.includes('Văn Khúc')) opps.push('✦ **Cơ hội học hành/giấy tờ** — Lưu Xương/Khúc; thi cử, học thêm, hợp đồng thuận lợi.');
  if (yt.namTuoi) risks.push('⚠ **Năm tuổi (phạm Thái Tuế)** — biến động lớn; làm việc thiện, tránh việc trọng đại không cần thiết.');
  if (yt.xungTuoi) risks.push('⚠ **Xung tuổi (Tuế Phá)** — xáo trộn, hao tài, bất hòa; giữ ổn định, tránh thay đổi lớn.');

  if (opps.length) {
    out.push('**▸ Top cơ hội:**');
    opps.slice(0, 5).forEach(o => out.push(o));
  }
  if (risks.length) {
    out.push('');
    out.push('**▸ Top rủi ro cần quản trị:**');
    risks.slice(0, 5).forEach(r => out.push(r));
  }
  if (!opps.length && !risks.length) {
    out.push('_Năm tương đối bình ổn, không có cơ hội/rủi ro nổi bật. Tập trung củng cố nền tảng._');
  }
  out.push('');

  // ─── Bước 14 — CHIẾN LƯỢC NĂM ───
  const hasLoc = allLuu.includes('Hóa Lộc');
  const hasKy = allLuu.includes('Hóa Kỵ');
  let strategyTV: string;
  let strategyDesc: string;
  if (sc.rating === 'Rất tốt' || sc.rating === 'Tốt') {
    if (hasLoc) { strategyTV = 'TIẾN CÔNG'; strategyDesc = 'Năm thuận + có Lưu Lộc → CHỦ ĐỘNG khởi sự, đầu tư, mở rộng. Đừng chần chừ — cơ hội đến rồi đi, năm sau chưa chắc lại có.'; }
    else { strategyTV = 'MỞ RỘNG'; strategyDesc = 'Năm thuận → mở rộng quan hệ, học hỏi, thử nghiệm cái mới. Không cần dấn lớn nhưng cũng không nên đứng yên.'; }
  } else if (sc.rating === 'Khá') {
    strategyTV = 'TÍCH LŨY';
    strategyDesc = 'Năm khá → tích lũy vốn liếng, chuyên môn, quan hệ. Đây là năm "đặt nền" cho bứt phá của năm/đại vận sau.';
  } else if (sc.rating === 'Trung bình') {
    strategyTV = hasKy ? 'TÁI CẤU TRÚC' : 'CHỜ THỜI';
    strategyDesc = hasKy
      ? 'Năm trung bình + có Lưu Kỵ → TÁI CẤU TRÚC: dọn dẹp các vướng mắc cũ, không khởi sự mới. Năm này là "vệ sinh nhà cửa" để năm sau có không gian phát.'
      : 'Năm trung bình → CHỜ THỜI: giữ những gì đang có, không khởi sự lớn, dùng thời gian để học và quan sát.';
  } else {
    strategyTV = 'PHÒNG THỦ';
    strategyDesc = 'Năm nhiều thử thách → PHÒNG THỦ tuyệt đối: giữ sức khỏe, giữ tiền, giữ hòa khí; tích đức để hóa giải. Đây là năm "qua được là thắng".';
  }
  out.push('# Chiến lược năm');
  out.push(`▸ **Chiến lược chính: ${strategyTV}**.`);
  out.push(strategyDesc);
  out.push('');

  // ─── Lời khuyên đúc kết ───
  out.push('# Lời khuyên đúc kết');
  out.push(tieuVanConclusion(sc.rating));
  out.push('');
  out.push('_Để luận sâu hơn cho đúng năm này, các bạn dùng chức năng Phân tích AI nhé!_');
  return out.join('\n');
}

/** Kết luận đúc kết cho một năm Tiểu vận theo xếp hạng — dùng chung cho phần
 *  "Lời khuyên đúc kết" của Tiểu vận và "Diễn tiến qua từng năm" trong Đại vận. */
function tieuVanConclusion(rating: string): string {
  return rating === 'Rất tốt' || rating === 'Tốt'
    ? 'Đây là một năm **hanh thông**, thuận để chủ động khởi sự và ra những quyết định trọng đại như kết hôn, mua nhà hay chuyển việc — nhất là khi đại vận bao trùm cũng tốt. Hãy tích cực mở rộng quan hệ, song giữ sự khiêm tốn để tránh chủ quan làm hỏng vận may.'
    : rating === 'Khá'
    ? 'Đây là một năm nên **tiến từng bước**: hoàn thiện những việc đang dang dở, tránh thay đổi đột ngột. Tích lũy vốn liếng và kinh nghiệm trong năm nay sẽ giúp bạn bứt phá ở năm sau.'
    : rating === 'Trung bình'
    ? 'Đây là một năm cần **giữ cân bằng**: ưu tiên sức khỏe, gia đình và tiết kiệm. Nếu có đầu tư thì nên nhỏ và chia nhỏ rủi ro, đừng dồn hết vào một thương vụ duy nhất.'
    : 'Đây là một năm **nhiều thử thách**: hạn chế các quyết định lớn, tránh đứng ra bảo lãnh hay cho vay. Hãy đặc biệt chú trọng sức khỏe, đi lại cẩn thận và giữ lời ăn tiếng nói để tránh thị phi, kiện tụng.';
}

/** Diễn giải nhanh ý nghĩa một nhóm sao lưu (dùng chung cho tiểu vận & chi tiết cung). */
function luuStarNotes(allLuu: string[]): string[] {
  const notes: string[] = [];
  if (allLuu.includes('Hóa Lộc')) notes.push('Lưu Hóa Lộc → cơ hội tài lộc, hanh thông bất ngờ trong năm.');
  if (allLuu.includes('Hóa Quyền')) notes.push('Lưu Hóa Quyền → thăng tiến, nắm thêm quyền/việc.');
  if (allLuu.includes('Hóa Khoa')) notes.push('Lưu Hóa Khoa → thi cử, danh tiếng, được quý nhân.');
  if (allLuu.includes('Hóa Kỵ')) notes.push('⚠ Lưu Hóa Kỵ → vướng mắc, thị phi, hao tổn — điểm cần đề phòng nhất trong năm.');
  if (allLuu.includes('Kình Dương') || allLuu.includes('Đà La')) notes.push('Lưu Kình/Đà → dễ va chạm, thương tích, trắc trở (nhất là khi trùng Kình/Đà cố định).');
  if (allLuu.includes('Tang Môn') || allLuu.includes('Bạch Hổ')) notes.push('Lưu Tang/Hổ → đề phòng hiếu sự, bệnh tật, kiện tụng trong năm.');
  if (allLuu.includes('Đào Hoa') || allLuu.includes('Hồng Loan')) notes.push('Lưu Đào/Hồng → năm có duyên tình, hỷ sự, cưới hỏi.');
  if (allLuu.includes('Văn Xương') || allLuu.includes('Văn Khúc')) notes.push('Lưu Xương/Khúc → lợi học hành, thi cử, giấy tờ.');
  if (allLuu.includes('Thiên Mã')) notes.push('Lưu Thiên Mã → năm di chuyển, đi xa, thay đổi.');
  if (allLuu.includes('Thái Tuế')) notes.push('Lưu Thái Tuế → tiếng nói có trọng lượng, song dễ vướng thị phi/kiện tụng.');
  return notes;
}

/** Ý nghĩa cô đọng của từng sao lưu (để luận tác động, không chỉ liệt kê). */
const STAR_LUU_MEANING: Record<string, string> = {
  'Hóa Lộc': 'mở ra cơ hội tài lộc, tin vui, công việc hanh thông',
  'Hóa Quyền': 'tăng quyền lực, được giao trọng trách, dễ thăng tiến',
  'Hóa Khoa': 'lợi danh tiếng, thi cử, giấy tờ, gặp quý nhân nâng đỡ',
  'Hóa Kỵ': 'gây vướng mắc, thị phi, hao tổn — điểm cần đề phòng nhất',
  'Lộc Tồn': 'mang tài lộc ổn định, được hậu thuẫn về tiền bạc',
  'Kình Dương': 'dễ va chạm, nóng vội, thương tích, tranh chấp',
  'Đà La': 'trì trệ, dây dưa, phiền muộn ngấm ngầm kéo dài',
  'Thiên Khôi': 'có quý nhân (nam/bậc trên) ra tay giúp đỡ',
  'Thiên Việt': 'có quý nhân giúp đỡ bất ngờ, cơ may đột xuất',
  'Văn Xương': 'lợi học hành, văn bản, hợp đồng, giấy tờ',
  'Văn Khúc': 'lợi thi cử, tài lẻ, khéo ăn nói, nghệ thuật',
  'Đào Hoa': 'tăng sức hút, duyên tình, thuận giao tế',
  'Hồng Loan': 'báo hỷ sự, cưới hỏi, tin vui tình cảm',
  'Thiên Hỷ': 'tin vui, hỷ sự, có thể thêm thành viên trong nhà',
  'Thiên Mã': 'năm di chuyển, đi xa, thay đổi môi trường',
  'Tang Môn': 'đề phòng tang chế, buồn phiền, hao người thân',
  'Bạch Hổ': 'đề phòng bệnh tật, tai nạn, kiện tụng',
  'Thái Tuế': 'tiếng nói có trọng lượng nhưng dễ vướng thị phi/kiện tụng',
  'Tuế Phá': 'dễ xáo trộn, phá tán, bất hòa, hao tài',
  'Thiên Khốc': 'tâm trạng ưu tư, dễ buồn lo',
  'Thiên Hư': 'hao hụt, trống vắng, sức khỏe dễ sa sút',
  'Kiếp Sát': 'đề phòng mất mát, hao của bất ngờ',
  'Tiểu Hao': 'hao tốn nhỏ, chi tiêu vặt, dễ thất thoát lặt vặt',
  'Đại Hao': 'hao tốn lớn, dễ mất mát tiền của hoặc công sức',
  'Bệnh Phù': 'sức khỏe dễ uể oải, bệnh vặt, tinh thần mỏi mệt',
  'Quan Phù': 'dễ vướng giấy tờ, kiện tụng, thị phi pháp lý',
  'Điếu Khách': 'dễ gặp chuyện phiền từ bên ngoài, lời ra tiếng vào',
  'Phục Binh': 'đề phòng tiểu nhân ngấm ngầm, bị cản trở sau lưng',
  'Phi Liêm': 'dễ thị phi, hao tán, lời đồn không hay',
  'Long Trì': 'thêm cát khí, dễ có tin vui, được nâng đỡ',
  'Phượng Các': 'tăng vẻ vang, danh tiếng, chuyện hỷ',
  'Hỷ Thần': 'mang tin vui, hỷ sự nhỏ',
  'Thiên Đức': 'có phúc đức che chở, hóa giải bớt hung',
  'Nguyệt Đức': 'được quý nhân âm thầm phù trợ, bớt tai ách',
};

/**
 * Luận OFFLINE các SAO LƯU của NĂM XEM ảnh hưởng tới MỘT cung — dùng cho phần
 * "Nâng cao" trong màn chi tiết cung. Trả về '' nếu chưa chọn năm xem.
 */
export function generateOfflinePalaceLuu(result: AstrologyResult, branchIndex: number): string {
  const c = result.tuViChart;
  const ys = c.viewingYearStem, yb = c.viewingYearBranch;
  if (!ys || !yb) return '';
  const h = c.houses[branchIndex];
  if (!h) return '';

  const luu = luuStarsTamPhuongPos(result, ys, yb, h.branch);
  const allLuu = [...luu.same, ...luu.tamHop, ...luu.xung];
  const yt = yearVsTuoi(result, yb);
  const yLabel = `**${ys} ${yb}**${c.viewingYear ? ` (${c.viewingYear})` : ''}`;

  if (!allLuu.length && !yt.namTuoi && !yt.xungTuoi) {
    return `Năm ${yLabel} không có sao lưu đáng kể hội về cung ${h.palaceName}; trong năm này, cung **${h.palaceName}** chủ quản vận hành tương đối bình thường, ít biến động lớn.`;
  }

  const out: string[] = [];
  out.push(`Sao lưu an theo Can–Chi năm ${yLabel}, phản ánh những sự việc nổi bật trong năm tại **cung ${h.palaceName}**. Dưới đây là từng sao lưu và ý nghĩa tác động tới cung này:`);
  out.push('');

  // Luận TỪNG sao lưu = Ý NGHĨA CỦA CHÍNH SAO ĐÓ TẠI CUNG ĐANG XÉT (dữ liệu byPalace),
  // vì sao lưu bản chất là sao thường nhưng "chạy" theo năm. Mỗi sao có nội dung RIÊNG,
  // không lặp. Vị trí (đồng cung/tam hợp/xung) thể hiện ở nhãn + cường độ ngắn gọn.
  const renderStars = (stars: LuuStarPos[], pos: 'same' | 'tamHop' | 'xung') => {
    for (const sp of stars) {
      const s = sp.name;
      const posLabel = pos === 'same' ? `tại cung ${h.palaceName}`
        : pos === 'tamHop' ? `tam hợp tại ${sp.palaceName} chiếu về`
        : `xung chiếu từ ${sp.palaceName}`;
      const hung = LUU_HUNG.has(s);
      const inf = getStarInfo(s);
      // Ưu tiên ý nghĩa SAO TẠI ĐÚNG CUNG này; nếu thiếu thì dùng nghĩa lưu/cơ bản.
      const atPalace = inf?.byPalace?.[h.palaceName];
      const core = atPalace
        ? trimText(atPalace, 240)
        : STAR_LUU_MEANING[s]
        ? STAR_LUU_MEANING[s]
        : inf?.basic ? trimText(inf.basic, 140) : 'tác động tới sắc thái của năm';
      // Cường độ theo vị trí — 1 cụm ngắn, KHÔNG lặp câu domain dài.
      const intensity = pos === 'same' ? 'tác động rõ trong năm'
        : pos === 'tamHop' ? 'hội chiếu, ảnh hưởng gián tiếp'
        : 'xung chiếu, tạo lực đối nghịch';
      out.push(`- ${hung ? '⚠ ' : '✦ '}**${s}** (${posLabel} · ${intensity}): ${core}`);
    }
  };
  if (luu.same.length) renderStars(luu.same, 'same');
  if (luu.tamHop.length) renderStars(luu.tamHop, 'tamHop');
  if (luu.xung.length) renderStars(luu.xung, 'xung');

  if (yt.namTuoi) out.push('- ⚠ **NĂM TUỔI (phạm Thái Tuế)**: "Thái Tuế đương đầu, vô họa tất có hung" — năm nhiều biến động; người xem nên cẩn trọng, làm việc thiện, hạn chế việc trọng đại nếu cung xấu.');
  if (yt.xungTuoi) out.push('- ⚠ **XUNG TUỔI (Tuế Phá)**: chi năm xung chi tuổi — dễ xáo trộn, hao tài, bất hòa; nên giữ ổn định, tránh thay đổi lớn.');

  out.push('');
  out.push(`**Tổng kết:** ${
    luu.same.some(s => LUU_HUNG.has(s.name)) || luu.xung.some(s => LUU_HUNG.has(s.name))
      ? `năm nay cung ${h.palaceName} có yếu tố cần đề phòng — người xem nên chủ động phòng ngừa, giữ chừng mực để hóa giải.`
      : allLuu.length
      ? `năm nay cung ${h.palaceName} có nhiều yếu tố thuận lợi — người xem nên tận dụng để tiến tới.`
      : `năm nay cung ${h.palaceName} vận hành bình thường, ít biến động.`
  }`);
  out.push('_Sao lưu trùng đúng sao cố định cùng tên tại cung thì tác động nhân đôi. Để luận sâu và cá nhân hóa hơn, dùng chức năng Phân tích AI._');
  return out.join('\n');
}

// ════════════════════════════════════════════════════════════════
//  OFFLINE LUẬN NGUYỆT VẬN — chi tiết 1 tháng âm trong 1 năm.
//  Logic: scoreNguyetVan + quy tắc "Tiểu vận (năm) lấn áp Nguyệt vận (tháng)".
// ════════════════════════════════════════════════════════════════

const RELATE_TXT_NV: Record<string, string> = {
  sinhNhap: 'sinh nhập', dongHanh: 'đồng hành',
  khacXuat: 'khắc xuất', sinhXuat: 'sinh xuất', khacNhap: 'khắc nhập',
};

/** Sinh báo cáo offline cho 1 tháng (Nguyệt Vận) của năm tuổi `age`. */
// Bảng CHỦ ĐỀ THÁNG theo cung lưu nguyệt — Bước 5 khung Nam Phái.
const NV_TOPIC: Record<string, { name: string; theme: string }> = {
  'Mệnh': { name: 'Tháng tự thân – điều chỉnh', theme: 'soi lại bản thân, định lại nhịp sống' },
  'Phụ Mẫu': { name: 'Tháng gia đình', theme: 'quan hệ cha mẹ, bậc trên, người dẫn dắt' },
  'Phúc Đức': { name: 'Tháng tu dưỡng', theme: 'tích đức, dưỡng tâm, sống chậm' },
  'Điền Trạch': { name: 'Tháng nhà cửa', theme: 'nhà cửa, đất đai, tài sản cố định' },
  'Quan Lộc': { name: 'Tháng sự nghiệp', theme: 'công danh, vai trò, vị trí' },
  'Nô Bộc': { name: 'Tháng quan hệ – đối tác', theme: 'cộng sự, bạn bè, đối tác' },
  'Thiên Di': { name: 'Tháng di chuyển – đàm phán', theme: 'đi xa, mở rộng, đàm phán' },
  'Tật Ách': { name: 'Tháng sức khỏe', theme: 'nghỉ ngơi, khám sức khỏe, dưỡng sinh' },
  'Tài Bạch': { name: 'Tháng tài chính', theme: 'dòng tiền, đầu tư, thu chi' },
  'Tử Tức': { name: 'Tháng con cái – sáng tạo', theme: 'con cái, dự án mới, sáng tạo' },
  'Phu Thê': { name: 'Tháng hôn nhân', theme: 'tình cảm, vợ chồng, gia đạo' },
  'Huynh Đệ': { name: 'Tháng anh em – đồng cấp', theme: 'anh em, bạn cùng vai vế' },
};

const BRANCH_EL_NV: Record<string, string> = {
  Tý: 'Thủy', Sửu: 'Thổ', Dần: 'Mộc', Mão: 'Mộc', Thìn: 'Thổ', Tị: 'Hỏa',
  Ngọ: 'Hỏa', Mùi: 'Thổ', Thân: 'Kim', Dậu: 'Kim', Tuất: 'Thổ', Hợi: 'Thủy',
};

export function generateOfflineNguyetVan(result: AstrologyResult, age: number, month: number): string {
  const sc = scoreNguyetVan(result, age, month);
  if (!sc) return '_Không tính được nguyệt vận tháng này._';
  const tv = result.tieuVans.find(x => x.age === age);
  const dv = tv ? result.daiVans[tv.daiVanIndex] : null;
  const h = result.tuViChart.houses.find(x => x.branch === sc.branch);
  const out: string[] = [];

  out.push(`**Tháng ${month} (âm lịch) — lưu nguyệt nhập cung ${sc.palaceName} (${sc.branch})**`);
  out.push(`Đánh giá: **${sc.rating}** (Tài lộc ${sc.taiLoc} / Thách thức ${sc.thachThuc}).`);
  out.push('');

  // ─── Bước 5 — CHỦ ĐỀ THÁNG ───
  const monthTopic = NV_TOPIC[sc.palaceName];
  if (monthTopic) {
    out.push('# Chủ đề chính của tháng');
    out.push(`▸ Đây là **${monthTopic.name}** — trọng tâm 30 ngày tới xoay quanh: ${monthTopic.theme}.`);
    out.push('Mọi quyết định trong tháng nên được soi qua "lăng kính" chủ đề này — đây là nhịp KÍCH HOẠT chính của tháng.');
    out.push('');
  }

  // ─── Sắc thái tháng (giữ) ───
  out.push('# Sắc thái của tháng');
  let p = `Trong tháng này, về **Thiên thời** đang ở thế ${RELATE_TXT_NV[sc.thienThoi]}, về **Địa lợi** ở thế ${RELATE_TXT_NV[sc.diaLoi]}, **Nhân hòa** mức ${sc.nhanHoa}. `;
  if (h) {
    const chinh = chinhTinhFull(h);
    p += chinh.length
      ? `Cung lưu nguyệt có ${chinh.join(', ')} chủ sự`
      : 'Cung lưu nguyệt vô chính diệu, sắc thái tháng chủ yếu do sao chiếu và phụ tinh';
    const cs = countCatSat(h);
    if (cs.cat + cs.sat > 0) {
      p += cs.cat > cs.sat ? `, được nhiều cát tinh nâng đỡ (${cs.cat}/${cs.sat}) nên phần thuận trội hơn. `
        : cs.sat > cs.cat ? `, song sát tinh hơi nhiều (${cs.sat}/${cs.cat}) nên cần thận trọng. `
        : `, cát sát cân bằng (${cs.cat}/${cs.sat}). `;
    } else p += '. ';
    if (h.tuanAt) p += 'Cung bị Tuần Không nên đầu tháng dễ chệch choạc, cuối tháng mới bù lại. ';
    if (h.trietAt) p += 'Cung bị Triệt Lộ nên nửa đầu tháng khá vất vả. ';
  }
  out.push(p.trim());
  out.push('');

  // ─── Bước 2 — TƯƠNG TÁC VỚI BÁT TỰ (Dụng/Kỵ thần) ───
  const branchEl = BRANCH_EL_NV[sc.branch] || '?';
  const fav = result.batTuChart.favorableElements || [];
  const unfav = result.batTuChart.unfavorableElements || [];
  out.push('# Tương tác với Bát Tự (Dụng/Kỵ thần)');
  if (fav.includes(branchEl as any)) {
    out.push(`▸ Hành Chi tháng là **${branchEl}** — thuộc DỤNG THẦN của bạn → tháng này TIẾP KHÍ tốt cho bản mệnh: tinh thần dồi dào, dễ ra quyết định sáng suốt, vận thuận từ "bên trong".`);
  } else if (unfav.includes(branchEl as any)) {
    out.push(`▸ Hành Chi tháng là **${branchEl}** — thuộc KỴ THẦN của bạn → tháng này khí hơi NGHỊCH bản mệnh: dễ mệt mỏi, cảm xúc dao động, không nên dồn việc quan trọng vào tháng này. Cần dưỡng sinh và bổ hành ${fav.join('/') || '(dụng thần)'} qua màu sắc/thực phẩm/hướng.`);
  } else {
    out.push(`▸ Hành Chi tháng là **${branchEl}** — trung tính với bản mệnh, không tiếp khí mạnh cũng không nghịch.`);
  }
  out.push('');

  // ─── Bước 3-4 — TƯƠNG TÁC VỚI ĐẠI VẬN + TIỂU VẬN ───
  out.push('# Tương tác với Đại vận và Tiểu vận');
  if (dv) {
    const dvSc = scoreDaiVan(result, dv);
    const inDv = h?.branch === dv.branch;
    out.push(`▸ **Đại vận** ${dv.startAge}-${dv.endAge}t (cung ${dvSc.palaceName}, ${dvSc.rating}): ` +
      (inDv ? '⭐ tháng ĐỒNG CUNG đại vận → kích hoạt mạnh chủ đề đại vận. Đây là tháng "đậm khí đại vận", việc thuộc chủ đề đại vận nên đẩy mạnh.'
        : 'tháng KHÔNG đồng cung đại vận → tháng có chủ đề riêng, kích hoạt một khía cạnh khác của lá số.'));
  }
  if (tv) {
    const tvSc = scoreTieuVan(result, tv);
    if (tvSc) {
      const inTv = h?.branch === tv.branch;
      out.push(`▸ **Tiểu vận** năm ${tv.year} (cung ${tvSc.palaceName}, ${tvSc.rating}): ` +
        (inTv
          ? '⭐ **THÁNG THEN CHỐT** — tháng ĐỒNG CUNG tiểu vận → đây là tháng KÍCH HOẠT MẠNH NHẤT chủ đề năm. Mọi cơ hội/rủi ro của năm hội tụ về tháng này.'
          : 'tháng không đồng cung tiểu vận → tháng làm việc theo nhịp riêng, không phải tháng "cao điểm" của năm.'));
      out.push('Quy tắc "Tiểu vận lấn áp Nguyệt vận": ' +
        (tvSc.rating === 'Rất tốt' || tvSc.rating === 'Tốt'
          ? 'năm thuận → tháng xấu cũng đỡ thiệt, tháng tốt càng rực rỡ.'
          : tvSc.rating === 'Nhiều thách thức'
          ? 'năm khó → tháng tốt cũng khó bứt phá, tháng xấu cần đặc biệt cẩn trọng.'
          : 'năm trung tính → sắc thái tháng do chính nguyệt vận quyết định.'));
    }
  }
  out.push('');

  // ─── Bước 5 (sao Nguyệt vận) — LƯU TỨ HÓA THÁNG (theo can tháng — Ngũ Hổ Độn) ───
  if (tv) {
    const monthCan = monthStem(tv.yearStem, month);
    const luuHoaMonth = luuTuHoaPositions(result.tuViChart, monthCan);
    if (luuHoaMonth.length) {
      out.push(`# Lưu Tứ Hóa tháng (can tháng ${monthCan})`);
      out.push('_Mỗi tháng có một can riêng (can tháng), can đó "rải" lại 4 hóa Lộc – Quyền – Khoa – Kỵ lên lá số gốc — gọi là **Lưu Tứ Hóa tháng**. Đây chính là yếu tố làm mỗi tháng một khác: nó chỉ ra THÁNG NÀY cơ hội (Lộc), quyền hành/việc phải gánh (Quyền), quý nhân – danh tiếng (Khoa) và điểm nghẽn dễ vướng (Kỵ) đang RƠI VÀO CUNG NÀO. Đọc theo logic: hóa rơi vào cung nào thì mảng đời sống do cung đó quản sẽ được kích hoạt mạnh trong tháng — nên dồn sức vào nơi có Lộc/Quyền/Khoa và phòng thủ ở nơi có Kỵ._');
      for (const lh of luuHoaMonth) {
        const sym = lh.hoa === 'Hóa Kỵ' ? '⚠' : '★';
        const m = lh.hoa === 'Hóa Lộc'
          ? `**CƠ HỘI tháng** đến từ ${lh.palace.toLowerCase()} — đây là cửa lớn nhất tháng này`
          : lh.hoa === 'Hóa Quyền'
          ? `**TRÁCH NHIỆM/QUYỀN HÀNH** tập trung ở ${lh.palace.toLowerCase()} — nên chủ động đảm nhận`
          : lh.hoa === 'Hóa Khoa'
          ? `**QUÝ NHÂN/DANH TIẾNG** ở ${lh.palace.toLowerCase()} — dễ được công nhận`
          : `**ĐIỂM NGHẼN** tháng ở ${lh.palace.toLowerCase()} — cần đặc biệt cẩn trọng tại đây`;
        out.push(`- ${sym} **${lh.hoa}** (qua sao ${lh.star}) → cung ${lh.palace}: ${m}.`);
      }
      out.push('');
    }
  }

  // ─── CHẤM ĐIỂM 10 MẢNG + PHÂN TÍCH 8 CHỦ ĐỀ (biến thiên theo tháng) ───
  const detail = nguyetVanDetail(result, age, month);
  if (detail) {
    // Thanh điểm dạng text (mỗi mảng 1 dòng, có thanh ▰ trực quan) — thang 0–10.
    const bar = (v: number) => {
      const n = Math.max(0, Math.min(10, Math.round(v)));
      return '▰'.repeat(n) + '▱'.repeat(10 - n);
    };
    out.push('# Chấm điểm 10 mảng trong tháng');
    out.push('_Thang điểm 0–10. Riêng "Rủi ro": điểm CÀNG CAO nghĩa là CÀNG cần thận trọng (không phải tốt)._');
    out.push('');
    for (const s of detail.scores) {
      const tag = s.isRisk
        ? (s.value >= 6 ? ' ⚠ cao' : s.value >= 4 ? ' • vừa' : ' ✓ thấp')
        : (s.value >= 7 ? ' ✓ tốt' : s.value >= 6 ? ' • khá' : s.value >= 4 ? ' • trung bình' : ' ⚠ yếu');
      out.push(`- **${s.label}:** ${s.value}/10  ${bar(s.value)}${tag}`);
    }
    out.push('');

    // Tam hợp / xung của cung lưu nguyệt — cho biết tháng này "động" tới mảng nào.
    if (detail.tamHopPalaces.length || detail.xungPalace) {
      out.push('# Cung lưu nguyệt liên kết với mảng nào');
      out.push('_Cung tháng (lưu nguyệt) không đứng một mình: nó nối với 2 cung tam hợp (cùng "phe" → cộng hưởng, tiếp sức) và 1 cung xung chiếu (đối diện → vừa thúc ép vừa bổ khuyết). Nên việc tháng này thường liên đới tới đúng các mảng dưới đây._');
      const domainOf = (p: string) => (PALACE_ROLE[p] || '').split(',')[0].split('—')[0].trim();
      if (detail.tamHopPalaces.length) {
        out.push('▸ **Tam hợp chiếu (cộng hưởng – hỗ trợ):**');
        for (const p of detail.tamHopPalaces) {
          const d = domainOf(p);
          out.push(`  - **${p}**${d ? ` (${d})` : ''}: tháng này mảng này tiếp sức cho việc của bạn — thuận để dựa vào${d ? ` ${d.toLowerCase()}` : ' mảng này'} mà đẩy việc chính lên; cũng là nơi nên tìm trợ giúp khi cần.`);
        }
      }
      if (detail.xungPalace) {
        const d = domainOf(detail.xungPalace);
        out.push(`▸ **Xung chiếu (đối nghịch – cần dung hòa):** **${detail.xungPalace}**${d ? ` (${d})` : ''} — tháng này bị "động" tới từ phía đối diện: ${d ? `${d.toLowerCase()} ` : 'mảng này '}dễ tạo áp lực hoặc giằng co với trọng tâm tháng. Không né tránh mà chủ động cân bằng hai bên, tránh dồn toàn lực một phía.`);
      }
      out.push('');
    }

    out.push('# Phân tích 8 chủ đề trong tháng');
    out.push('_Mỗi chủ đề được soi qua cung gốc của nó so với cung lưu nguyệt tháng này + Lưu Tứ Hóa tháng._');
    out.push('');
    // Sắp xếp: chủ đề được kích hoạt mạnh lên trước để người dùng thấy trọng tâm.
    const order: Record<string, number> = { 'đồng cung': 0, 'tam hợp': 1, 'xung chiếu': 2, '': 3 };
    const sortedThemes = [...detail.themes].sort((a, b) =>
      (order[a.activation] - order[b.activation]) || (b.score - a.score));
    for (const th of sortedThemes) {
      const icon = th.status === 'Thuận lợi' ? '🟢' : th.status === 'Khá' ? '🟡'
        : th.status === 'Trung tính' ? '⚪' : '🟠';
      out.push(`**${icon} ${th.label} — ${th.status} (${th.score}/10)**`);
      out.push(th.note);
      out.push(`→ _Nên làm:_ ${th.action}`);
      out.push('');
    }
  }

  // ─── Bước 6 — BẢN ĐỒ 4 TUẦN TRONG THÁNG ───
  const hardStart = h?.tuanAt || h?.trietAt;
  const isStrongMonth = sc.rating === 'Rất tốt' || sc.rating === 'Tốt';
  const isWeakMonth = sc.rating === 'Nhiều thách thức';
  out.push('# Bản đồ 4 tuần trong tháng');
  out.push(hardStart
    ? '▸ **Tuần 1 — KHỞI ĐỘNG CHẬM:** cung lưu nguyệt bị Tuần/Triệt → đầu tháng chệch choạc, kế hoạch khó triển khai. Dùng tuần 1 để xác lập mục tiêu, dọn dẹp việc tồn đọng — chưa khởi sự lớn.'
    : '▸ **Tuần 1 — KHỞI ĐỘNG:** đặt mục tiêu tháng, lên kế hoạch chi tiết, dọn dẹp việc tồn đọng. Đây là tuần "gieo hạt".');
  out.push('▸ **Tuần 2 — TĂNG TỐC:** triển khai kế hoạch theo từng bước nhỏ, mở rộng có kiểm soát. Bắt đầu thấy vấn đề mới — coi đó là tín hiệu để điều chỉnh.');
  out.push(isStrongMonth
    ? '▸ **Tuần 3 — ĐIỂM NHẤN:** đây là tuần vàng của tháng — ra quyết định lớn, chốt việc quan trọng, đẩy mạnh giao tiếp. Năng lượng tháng dồn vào tuần này.'
    : isWeakMonth
    ? '▸ **Tuần 3 — ĐIỂM NHẤN THẬN TRỌNG:** dù tuần này dồn áp lực, vẫn cần CHẬM RÃI; tuần dễ phạm sai lầm nếu vội.'
    : '▸ **Tuần 3 — ĐIỂM NHẤN:** ra quyết định ở những việc đã chuẩn bị kỹ; tránh quyết định ngẫu hứng.');
  out.push('▸ **Tuần 4 — TỔNG KẾT:** đóng gói các việc dang dở, tổng kết tháng, chuyển giao việc, chuẩn bị cho tháng sau.');
  out.push('');

  // ─── Bước 7-8 — TOP CƠ HỘI + RỦI RO ───
  const monthCan = tv ? monthStem(tv.yearStem, month) : '';
  const luuHoaMonth = monthCan ? luuTuHoaPositions(result.tuViChart, monthCan) : [];
  const opps: string[] = [];
  const risks: string[] = [];
  for (const lh of luuHoaMonth) {
    if (lh.hoa === 'Hóa Lộc') opps.push(`✦ **Cơ hội tài/lộc tại ${lh.palace}** — chủ động tìm và tận dụng, đây là cửa lớn tháng này.`);
    if (lh.hoa === 'Hóa Quyền') opps.push(`✦ **Cơ hội thăng tiến tại ${lh.palace}** — sẵn sàng nhận trách nhiệm.`);
    if (lh.hoa === 'Hóa Khoa') opps.push(`✦ **Cơ hội quý nhân/danh tiếng tại ${lh.palace}** — chủ động giao tiếp, thể hiện năng lực.`);
    if (lh.hoa === 'Hóa Kỵ') risks.push(`⚠ **Điểm nghẽn lớn tại ${lh.palace}** — không tham, cẩn trọng quyết định ở cung này.`);
  }
  if (h) {
    const cs = countCatSat(h);
    if (cs.sat > cs.cat) risks.push(`⚠ **Áp lực từ sát tinh tại cung lưu nguyệt** (${cs.sat} sát/${cs.cat} cát) — đề phòng va chạm, mất kiểm soát cảm xúc.`);
  }
  if (unfav.includes(branchEl as any)) risks.push(`⚠ **Khí tháng nghịch bản mệnh** — dễ mệt mỏi, đề phòng ốm vặt; bổ hành ${fav.join('/') || 'dụng thần'}.`);
  if (fav.includes(branchEl as any)) opps.push('✦ **Khí tháng tiếp dụng thần** — tinh thần dồi dào, nên dồn việc cần năng lượng vào tháng này.');

  if (opps.length || risks.length) {
    out.push('# Top cơ hội & rủi ro trong tháng');
    if (opps.length) {
      out.push('**▸ Cơ hội tháng:**');
      opps.slice(0, 5).forEach(o => out.push(o));
    }
    if (risks.length) {
      out.push('');
      out.push('**▸ Rủi ro cần quản trị:**');
      risks.slice(0, 5).forEach(r => out.push(r));
    }
    out.push('');
  }

  // ─── Cách cục kích hoạt theo nguyệt vận ───
  const nvCachAct = cachCucActivationBlock(
    result,
    sc.branch,
    `Nguyệt Vận tháng ${month} âm lịch (${sc.branch}, ${sc.palaceName})`,
  );
  if (nvCachAct) {
    out.push('# Cách cục kích hoạt trong tháng này');
    out.push(nvCachAct);
  }

  // ─── Bước 9 — CHIẾN LƯỢC THÁNG ───
  const hasLoc = luuHoaMonth.some(x => x.hoa === 'Hóa Lộc');
  const hasKy = luuHoaMonth.some(x => x.hoa === 'Hóa Kỵ');
  let strategyMon: string;
  let strategyDesc: string;
  if (isStrongMonth && hasLoc) {
    strategyMon = 'TIẾN CÔNG'; strategyDesc = 'Tháng thuận + có Lưu Lộc → DỒN VIỆC LỚN vào tháng này (ký kết, đàm phán, mở rộng).';
  } else if (isStrongMonth) {
    strategyMon = 'MỞ RỘNG'; strategyDesc = 'Tháng thuận → mở rộng quan hệ, thử nghiệm cái mới.';
  } else if (sc.rating === 'Khá') {
    strategyMon = 'TÍCH LŨY'; strategyDesc = 'Tháng khá → tích lũy chuyên môn, vốn liếng, quan hệ.';
  } else if (sc.rating === 'Trung bình') {
    strategyMon = hasKy ? 'TÁI CẤU TRÚC' : 'CHỜ THỜI';
    strategyDesc = hasKy ? 'Có Lưu Kỵ → dọn dẹp vướng mắc cũ, không khởi việc mới.' : 'Giữ những gì đang có, không khởi sự lớn.';
  } else {
    strategyMon = 'PHÒNG THỦ'; strategyDesc = 'Tháng nhiều trở ngại → giữ sức khỏe, giữ tiền, giữ hòa khí; tích đức hóa giải.';
  }
  out.push('# Chiến lược tháng');
  out.push(`▸ **Chiến lược chính: ${strategyMon}**.`);
  out.push(strategyDesc);
  out.push('');

  // ─── Lời khuyên đúc kết ───
  out.push('# Lời khuyên đúc kết');
  out.push(
    isStrongMonth
      ? 'Tháng hanh thông — nên dồn việc quan trọng (ký kết, ra mắt, gặp gỡ đối tác, quyết định lớn) vào tháng này, chủ động nắm cơ hội.'
      : sc.rating === 'Khá'
      ? 'Tháng tương đối thuận — tiến hành công việc theo kế hoạch, hoàn thiện việc dang dở, tránh thay đổi đột ngột.'
      : sc.rating === 'Trung bình'
      ? 'Tháng bình hòa — giữ nhịp ổn định, ưu tiên việc nhỏ chắc chắn, chăm sóc sức khỏe và gia đình.'
      : 'Tháng nhiều trở ngại — hoãn việc lớn, thận trọng tiền bạc và lời ăn tiếng nói, chú ý sức khỏe và đi lại.'
  );
  out.push('');
  out.push('_Để luận sâu hơn cho đúng tháng này, các bạn dùng chức năng Phân tích AI nhé!_');
  return out.join('\n');
}

// ════════════════════════════════════════════════════════════════
//  PHÂN TÍCH NÂNG CAO MỘT CUNG — khung 10 TẦNG (Nam Phái + Diệu Xuân).
//  Trọng số luận: Chính tinh+cách cục 25% · Tứ Hóa 20% · Phi Hóa 20% ·
//  Tam hợp 15% · Xung chiếu 10% · Phụ tinh 5% · Giáp cung 5%.
//  Khí số cung → Cấu trúc → Dòng năng lượng → Tác động → Hành động thực tế.
// ════════════════════════════════════════════════════════════════

// Nhóm địa chi (Tầng 1).
const BRANCH_NHOM: Record<string, string> = {
  Tý: 'Tứ Chính', Ngọ: 'Tứ Chính', Mão: 'Tứ Chính', Dậu: 'Tứ Chính',
  Dần: 'Tứ Sinh', Thân: 'Tứ Sinh', Tị: 'Tứ Sinh', Hợi: 'Tứ Sinh',
  Thìn: 'Tứ Mộ', Tuất: 'Tứ Mộ', Sửu: 'Tứ Mộ', Mùi: 'Tứ Mộ',
};
const NHOM_TINH: Record<string, string> = {
  'Tứ Chính': 'vượng khí, dứt khoát — tính ỔN ĐỊNH mà mạnh, hợp giữ vai trò trụ cột',
  'Tứ Sinh': 'khí mới sinh, chủ ĐỘNG — nhiều khởi đầu, di chuyển, biến hóa',
  'Tứ Mộ': 'khí thu tàng, chủ TĨNH — tích lũy, bền bỉ, chậm mà chắc',
};

/** Vai trò đời sống của 12 cung (Tầng 1 — "cung này nói về điều gì"). */
const PALACE_ROLE: Record<string, string> = {
  'Mệnh': 'bản thân — tính cách, cốt cách, vận hạn chung của cả cuộc đời',
  'Phụ Mẫu': 'cha mẹ, bậc trên, người dẫn dắt và nền tảng gia tộc',
  'Phúc Đức': 'phúc khí, đời sống tinh thần, âm đức tổ tiên',
  'Điền Trạch': 'nhà cửa, đất đai, tài sản cố định, tổ nghiệp',
  'Quan Lộc': 'sự nghiệp, công danh, vị trí xã hội',
  'Nô Bộc': 'bạn bè, cộng sự, người dưới quyền, mạng lưới quan hệ',
  'Thiên Di': 'đi lại, ra ngoài, giao tiếp xã hội, lập nghiệp xa',
  'Tật Ách': 'sức khỏe, bệnh tật tiềm ẩn, tai ách',
  'Tài Bạch': 'tiền bạc, cách kiếm tiền và giữ tiền',
  'Tử Tức': 'con cái, học trò, dự án sáng tạo, thế hệ kế thừa',
  'Phu Thê': 'hôn nhân, bạn đời, đối tác gần',
  'Huynh Đệ': 'anh em, bạn đồng vai, cộng tác ngang hàng',
};

// ───── LÕI TÍNH TOÁN TÍN HIỆU 1 CUNG (dùng CHUNG cho bản Nâng cao đầy đủ
//       và bản tổng hợp 12 cung trong toàn lá số → đảm bảo ĐỒNG NHẤT cách luận).
interface PalaceSignals {
  h: TuViHouse; role: string;
  chinhNames: string[]; chinhFull: string[]; bo: string[];
  cs: { cat: number; sat: number };
  cach: { name: string; good: boolean; meaning: string }[];
  nhom: string; hanhChi: string; amDuong: string;
  phu: string[]; hoaList: string[];
  phi: ReturnType<typeof computePhiHoa>;
  grpElement: string; tamHopHs: TuViHouse[]; thNames: string[]; thScore: number;
  xungH: TuViHouse | undefined; xungNet: number;
  left: TuViHouse | undefined; right: TuViHouse | undefined; giapNet: number;
  theGood: boolean; dungGood: boolean; khiSo: number;
  manh: string[]; yeu: string[]; coHoi: string[]; ruiRo: string[]; hanhDong: string[];
}

const HOA_MEAN_ADV: Record<string, [string, string]> = {
  'Hóa Lộc': ['NGUỒN LỢI — cung có khả năng SINH LỢI: tiền bạc/cơ hội tự tìm đến lĩnh vực này', 'sinh lợi'],
  'Hóa Quyền': ['QUYỀN LỰC — cung có khả năng SINH QUYỀN: dễ nắm vai trò chủ động, ra quyết định', 'sinh quyền'],
  'Hóa Khoa': ['GIẢI PHÁP — cung có khả năng SINH DANH: được công nhận, gặp khó có người gỡ', 'sinh danh'],
  'Hóa Kỵ': ['NÚT THẮT — cung tích ÁP LỰC: dễ vướng mắc, thị phi, càng tham càng rối', 'sinh áp lực'],
};

function computePalaceSignals(result: AstrologyResult, branchIndex: number): PalaceSignals | null {
  const c = result.tuViChart;
  const h = c.houses[branchIndex];
  if (!h) return null;

  const chinhNames = chinhTinhOf(h);
  const chinhFull = chinhTinhFull(h);
  const cs = countCatSat(h);
  const cach = detectCachCucInPalace(h.stars.filter(s => s.type !== 'luu').map(s => s.name), h.branch, h.palaceName) as PalaceSignals['cach'];
  const bo = detectBoChinhTinh(chinhNames);
  const role = PALACE_ROLE[h.palaceName] || h.palaceName;
  const nhom = BRANCH_NHOM[h.branch] || '?';
  const hanhChi = BRANCH_EL_NV[h.branch] || '?';
  const amDuong = branchIdx(h.branch) % 2 === 0 ? 'Dương' : 'Âm';

  const manh: string[] = [], yeu: string[] = [], coHoi: string[] = [], ruiRo: string[] = [], hanhDong: string[] = [];

  // Tầng 2 — chính tinh & cách cục
  if (chinhNames.length) {
    const brightScore = h.stars.filter(s => s.type === 'chinh').reduce((sum, s) => {
      const b = s.brightness;
      return sum + (b === 'miếu' ? 2 : b === 'vượng' ? 1.5 : b === 'đắc' ? 1 : b === 'hãm' ? -1.5 : 0);
    }, 0);
    if (brightScore >= 1.5) manh.push(`Chính tinh đắc địa (${chinhFull.join(', ')}) — khí chất cung mạnh, phát huy tự nhiên`);
    else if (brightScore < 0) { yeu.push('Chính tinh lạc hãm — hiệu lực giảm, phải dụng công hơn người'); ruiRo.push('Kỳ vọng quá cao vào cung có sao hãm dễ dẫn tới hụt hẫng'); }
  } else {
    yeu.push('Vô chính diệu — thiếu "chủ nhà", khí cung dễ dao động theo môi trường');
  }
  for (const x of cach.filter(x => x.good)) { manh.push(`Hội cách ${x.name}`); coHoi.push(`Tận dụng cách ${x.name} — đây là "đòn bẩy" sẵn có của cung`); }
  for (const x of cach.filter(x => !x.good)) { yeu.push(`Phạm cách ${x.name}`); ruiRo.push(`Cách ${x.name} dễ phát tác khi vận xấu đi qua cung`); }
  if (h.tuanAt || h.trietAt) {
    yeu.push(`Bị ${h.trietAt ? 'Triệt' : ''}${h.trietAt && h.tuanAt ? ' + ' : ''}${h.tuanAt ? 'Tuần' : ''} án ngữ — hiệu lực bị giảm/hoãn nửa đầu đời`);
    hanhDong.push('Việc lớn thuộc cung này nên dồn về sau tuổi 30–35, khi Tuần/Triệt nhạt dần');
  }

  // Tầng 3 — phụ tinh
  const phu = phuTinhOf(h, 12);
  if (cs.sat > cs.cat) ruiRo.push('Sát tinh trội tại cung — dễ va vấp, thị phi khi hành sự vội vàng');
  if (cs.cat > cs.sat) manh.push('Nhiều cát tinh nâng đỡ — có quý nhân/duyên may ở lĩnh vực này');

  // Tầng 4 — Tứ Hóa tại cung
  const hoaList = h.stars.map(s => (s.name.startsWith('L. ') ? '' : s.name)).filter(n => /^Hóa (Lộc|Quyền|Khoa|Kỵ)$/.test(n));
  for (const hoa of hoaList) {
    if (hoa === 'Hóa Kỵ') {
      yeu.push('Hóa Kỵ đóng tại cung — nút thắt thường trực');
      ruiRo.push('Hóa Kỵ tại cung: tham lam/vội vàng ở lĩnh vực này là rủi ro lớn nhất');
      hanhDong.push(`Với việc thuộc cung ${h.palaceName}: đi từng bước có kiểm soát, không "tất tay"`);
    } else {
      manh.push(`${hoa} đóng tại cung`);
      coHoi.push(`${hoa} tại cung — ${HOA_MEAN_ADV[hoa][1]} là cửa sáng nên chủ động khai thác`);
    }
  }

  // Tầng 5 — Phi Hóa Nam Phái
  const phi = computePhiHoa(c, branchIndex);
  for (const p of phi.nhan) {
    if (p.hoa === 'Hóa Kỵ') ruiRo.push(`Kỵ nhập từ ${p.fromPalace} — vướng mắc cung này thường có gốc từ ${p.fromPalace.toLowerCase()}`);
    else { manh.push(`Nhận ${p.hoa} từ ${p.fromPalace} — có nguồn lực tiếp tế`); coHoi.push(`Khai thác hậu thuẫn từ ${p.fromPalace} (${p.hoa} nhập)`); }
  }

  // Tầng 6 — tam hợp
  const grp = tamHopOf(h.branch);
  const tamHopHs = grp.group.filter(i => i !== branchIndex).map(i => c.houses[i]).filter(Boolean) as TuViHouse[];
  const thNames = tamHopHs.map(x => x.palaceName);
  let thScore = 0;
  for (const th of tamHopHs) { const thCs = countCatSat(th); thScore += (thCs.cat - thCs.sat); }
  if (thScore > 1) manh.push(`Tam hợp ${thNames.join('–')} nâng đỡ`);
  if (thScore < -1) yeu.push(`Tam hợp ${thNames.join('–')} kéo xuống — thiếu cộng hưởng`);

  // Tầng 7 — xung chiếu
  const xungH = c.houses[(branchIndex + 6) % 12];
  let xungNet = 0;
  if (xungH) {
    const xCs = countCatSat(xungH);
    xungNet = xCs.cat - xCs.sat;
    if (xCs.sat > xCs.cat) ruiRo.push(`Xung chiếu từ ${xungH.palaceName} nhiều sát — áp lực ngoài cần dung hòa`);
  }

  // Tầng 8 — giáp cung
  const left = c.houses[(branchIndex + 11) % 12];
  const right = c.houses[(branchIndex + 1) % 12];
  const lCs = left ? countCatSat(left) : { cat: 0, sat: 0 };
  const rCs = right ? countCatSat(right) : { cat: 0, sat: 0 };
  const giapNet = (lCs.cat - lCs.sat) + (rCs.cat - rCs.sat);

  // Tầng 9 — Thể · Dụng
  const theGood = chinhNames.length > 0 && h.stars.filter(s => s.type === 'chinh').some(s => s.brightness === 'miếu' || s.brightness === 'vượng' || s.brightness === 'đắc');
  const dungGood = (cs.cat >= cs.sat) && !hoaList.includes('Hóa Kỵ') && !h.tuanAt && !h.trietAt;
  if (theGood && !dungGood) hanhDong.push('Gỡ "Dụng" trước khi bung "Thể": chọn đúng thời điểm và người đồng hành rồi mới dấn');

  // Tầng 10 — khí số (trọng số: chính tinh 25 + tứ hóa 20 + phi hóa 20 + tam hợp 15 + xung 10 + phụ 5 + giáp 5)
  let kq = 0;
  {
    let s = 12;
    for (const st of h.stars.filter(x => x.type === 'chinh')) s += st.brightness === 'miếu' ? 5 : st.brightness === 'vượng' ? 4 : st.brightness === 'đắc' ? 2.5 : st.brightness === 'hãm' ? -4 : 0;
    if (!chinhNames.length) s -= 3;
    s += cach.filter(x => x.good).length * 3 - cach.filter(x => !x.good).length * 3;
    if (h.tuanAt) s -= 2;
    if (h.trietAt) s -= 3;
    kq += Math.max(0, Math.min(25, s));
  }
  { let s = 10; for (const hoa of hoaList) s += hoa === 'Hóa Kỵ' ? -7 : hoa === 'Hóa Lộc' ? 7 : 5; kq += Math.max(0, Math.min(20, s)); }
  { let s = 10; for (const p of phi.nhan) s += p.hoa === 'Hóa Kỵ' ? -4 : 3; for (const p of phi.phat) s += p.hoa === 'Hóa Kỵ' ? -2 : 1; kq += Math.max(0, Math.min(20, s)); }
  kq += Math.max(0, Math.min(15, 7.5 + thScore * 1.5));
  kq += Math.max(0, Math.min(10, 5 + xungNet * 1.2));
  kq += Math.max(0, Math.min(5, 2.5 + (cs.cat - cs.sat) * 0.5));
  kq += Math.max(0, Math.min(5, 2.5 + giapNet * 0.8));
  const khiSo = Math.max(1, Math.min(10, Math.round(kq / 10)));

  // Hành động mặc định nếu chưa có tín hiệu mạnh.
  if (!hanhDong.length) {
    hanhDong.push(khiSo >= 6 ? `Chủ động dồn lực cho việc thuộc ${role.split(',')[0]} — cung đủ mạnh để tiến` : `Với việc thuộc ${role.split(',')[0]}: đi chắc từng bước, ưu tiên tích lũy hơn bứt phá`);
    hanhDong.push('Tận dụng cung được Phi Hóa/tam hợp tiếp lực làm "hậu phương" khi hành sự');
  }

  return { h, role, chinhNames, chinhFull, bo, cs, cach, nhom, hanhChi, amDuong, phu, hoaList, phi, grpElement: grp.element, tamHopHs, thNames, thScore, xungH, xungNet, left, right, giapNet, theGood, dungGood, khiSo, manh, yeu, coHoi, ruiRo, hanhDong };
}

const KHISO_VERDICT = (k: number) =>
  k >= 8 ? 'cung MẠNH, là điểm tựa của lá số' : k >= 6 ? 'cung KHÁ, đủ lực để chủ động'
  : k >= 4 ? 'cung TRUNG BÌNH, cần dụng công đúng cách' : 'cung YẾU, ưu tiên phòng thủ và bù trừ từ cung khác';

const THE_DUNG_VERDICT = (theGood: boolean, dungGood: boolean) =>
  theGood && dungGood ? 'Thể tốt + Dụng thuận: cung "danh xứng với thực" — có nền và phát huy được, cứ mạnh dạn dấn.'
  : theGood && !dungGood ? 'Thể tốt nhưng Dụng nghịch: **có tài nhưng khó phát huy** — vấn đề không ở năng lực mà ở cách triển khai; cần gỡ vật cản (chọn thời điểm, người đồng hành) trước khi bung sức.'
  : !theGood && dungGood ? 'Thể yếu nhưng Dụng thuận: nền mỏng mà đường thoáng — đi chậm, tích lũy dần thì vẫn tới đích.'
  : 'Thể yếu + Dụng nghịch: cung vất vả nhất lá số ở giai đoạn hiện tại — nên phòng thủ, lấy việc nhỏ nuôi việc lớn.';

export function generateOfflinePalaceAdvanced(result: AstrologyResult, branchIndex: number): string {
  const sig = computePalaceSignals(result, branchIndex);
  if (!sig) return '_Không tìm thấy cung._';
  const { h, role, chinhNames, chinhFull, bo, cs, cach, nhom, hanhChi, amDuong, phu, hoaList, phi, grpElement, tamHopHs, thNames, thScore, xungH, xungNet, left, right, giapNet, theGood, dungGood, khiSo, manh, yeu, coHoi, ruiRo, hanhDong } = sig;
  const out: string[] = [];

  out.push(`**Phân tích nâng cao cung ${h.palaceName}** — luận theo khung 10 tầng Nam Phái (trọng số: chính tinh & cách cục, Tứ Hóa, Phi Hóa là lõi quyết định).`);
  out.push('');

  out.push('# 1. Bản thể cung');
  out.push(`Cung **${h.palaceName}** chủ về **${role}**. Đặt tại **${h.branch}** (can ${h.can}) — hành Chi **${hanhChi}**, tính **${amDuong}**, thuộc nhóm **${nhom}**: ${NHOM_TINH[nhom] || ''}.`);
  if (h.isManh) out.push('Cung có **Mệnh cư** — đây là cung trung tâm của cả lá số.');
  if (h.isThan) out.push('Cung có **Thân cư** — nửa sau cuộc đời, trọng tâm sống dồn về cung này.');
  out.push('');

  out.push('# 2. Chính tinh & cách cục');
  if (chinhNames.length) {
    let p = `Tọa thủ: **${chinhFull.join(', ')}**`;
    p += bo.length ? `, hợp thành bộ **${bo.join(', ')}**. ` : '. ';
    const core = CHINH_TINH_CORE[chinhNames[0]];
    if (core) p += trimText(core, 260);
    out.push(p);
  } else {
    out.push('Cung **VÔ CHÍNH DIỆU** — phải mượn sao cung xung chiếu để định khí chất; tính chất "vay mượn" nên dễ đổi theo hoàn cảnh, hợp lối sống linh hoạt.');
  }
  for (const x of cach.filter(x => x.good)) out.push(`✦ **Cách ${x.name}** (cách tốt): ${trimText(x.meaning, 180)}`);
  for (const x of cach.filter(x => !x.good)) out.push(`⚠ **Cách ${x.name}** (cách hung): ${trimText(x.meaning, 180)}`);
  if (h.tuanAt || h.trietAt) out.push(`⚠ ${tuanTrietVerdict(h)}`);
  out.push('');

  out.push('# 3. Phụ tinh — trợ lực hay phá lực');
  if (phu.length) out.push(`Phụ tinh hội: ${phu.join(', ')}.`);
  out.push(cs.cat > cs.sat
    ? `Cát tinh trội (${cs.cat} cát / ${cs.sat} sát) → cung được **trợ lực**: làm việc thuộc cung này thường có người giúp, có duyên may nhỏ.`
    : cs.sat > cs.cat
    ? `Sát tinh trội (${cs.sat} sát / ${cs.cat} cát) → cung bị **phá lực**: tiến hành việc thuộc cung này cần dự phòng, tránh chủ quan.`
    : `Cát – sát cân bằng (${cs.cat}/${cs.sat}) → trợ và phá đan xen, kết quả phụ thuộc cách dụng tâm.`);
  out.push('');

  out.push('# 4. Tứ Hóa tại cung');
  out.push('_**Tứ Hóa** là 4 luồng năng lượng Lộc – Quyền – Khoa – Kỵ do can năm sinh tạo ra, gắn vào 4 sao và "đóng" tại cung mà sao đó tọa thủ. Đây là tầng quyết định cung này SINH RA kết quả gì trong thực tế: Lộc = sinh lợi (tiền/cơ hội tự tìm tới), Quyền = sinh quyền (nắm vai trò, ra quyết định), Khoa = sinh danh (được công nhận, có người gỡ khó), Kỵ = nút thắt (vướng mắc, càng tham càng rối). Logic đọc: cung có hóa nào đóng thì đó là "chất" nổi trội nhất của cung — ưu tiên khai thác Lộc/Quyền/Khoa, và quản trị cẩn trọng nơi có Kỵ._');
  if (hoaList.length) {
    for (const hoa of hoaList) out.push(`${hoa === 'Hóa Kỵ' ? '⚠' : '★'} **${hoa}** đóng tại cung: ${HOA_MEAN_ADV[hoa][0]}.`);
  } else {
    out.push('Không có Tứ Hóa cố định đóng tại cung — cung vận hành "trung tính", sức bật đến từ Phi Hóa và tam hợp bên dưới.');
  }
  out.push('');

  out.push('# 5. Phi Hóa Nam Phái — nguồn lực đến từ đâu, nút thắt nằm ở đâu');
  out.push('_**Phi Hóa** là điểm cốt lõi của Nam Phái: ngoài Tứ Hóa cố định, mỗi cung còn theo CAN CỦA CHÍNH CUNG mà "bắn" tiếp 4 hóa sang các cung khác — tức 12 cung kết nối và nuôi/ép lẫn nhau. Logic đọc theo 2 chiều: cung này **PHÁT đi** (xuất) tới cung nào = nó tác động/chi phối mảng đó (Lộc/Quyền/Khoa = tiếp sức, Kỵ = dồn áp lực); cung này **NHẬN về** (nhập) từ cung nào = nguồn lực hoặc nút thắt của nó có GỐC từ mảng đó. Nhờ vậy biết được muốn cải thiện cung này thì nên tác động vào cung nào, và vướng mắc của nó thực ra bắt nguồn từ đâu — điều mà luận một sao đơn lẻ không chỉ ra được._');
  if (phi.phat.length) {
    out.push('**▸ Cung PHÁT đi (xuất):**');
    for (const p of phi.phat) {
      const isKy = p.hoa === 'Hóa Kỵ';
      out.push(`- ${isKy ? '⚠' : '★'} ${p.hoa} → cung **${p.toPalace}** (qua sao ${p.viaStar}): ${isKy ? `năng lượng cung này dồn ÁP LỰC sang ${p.toPalace.toLowerCase()} — xử lý việc cung ${h.palaceName} kém sẽ lan hệ lụy sang đó` : `cung này NUÔI DƯỠNG ${p.toPalace.toLowerCase()} — làm tốt việc cung ${h.palaceName} sẽ kéo ${p.toPalace} đi lên`}.`);
    }
  }
  if (phi.nhan.length) {
    out.push('**▸ Cung NHẬN về (nhập):**');
    for (const p of phi.nhan) {
      const isKy = p.hoa === 'Hóa Kỵ';
      out.push(`- ${isKy ? '⚠' : '★'} ${p.hoa} ← cung **${p.fromPalace}** (qua sao ${p.viaStar}): ${isKy ? `áp lực từ ${p.fromPalace.toLowerCase()} chảy VÀO cung này — nút thắt có gốc từ ${p.fromPalace}` : `nguồn lực từ ${p.fromPalace.toLowerCase()} chảy VÀO — đây là "hậu phương" của cung ${h.palaceName}`}.`);
    }
  }
  if (!phi.phat.length && !phi.nhan.length) out.push('Cung không có dòng Phi Hóa đáng kể — vận hành tương đối độc lập.');
  out.push('');

  out.push('# 6. Tam hợp — cung lấy năng lượng từ đâu');
  out.push(`Tam hợp **${h.palaceName} – ${thNames.join(' – ')}** (hành ${grpElement}). Hai cung hội về:`);
  for (const th of tamHopHs) {
    const thCs = countCatSat(th);
    out.push(`- **${th.palaceName}** (${th.branch}): ${chinhTinhFull(th).join(', ') || 'Vô chính diệu'} — cát/sát ${thCs.cat}/${thCs.sat}.`);
  }
  out.push(thScore > 1
    ? '→ Tam hợp đang **NÂNG** cung lên: hai cung hội về nhiều cát khí, hành sự thuộc cung này được cộng hưởng thuận.'
    : thScore < -1
    ? '→ Tam hợp đang **KÉO** cung xuống: hai cung hội về nhiều sát khí, cần tự lực nhiều hơn, bớt trông chờ cộng hưởng.'
    : '→ Tam hợp trung tính: cộng hưởng có nhưng không quá mạnh, tự thân cung quyết định là chính.');
  out.push('');

  out.push('# 7. Xung chiếu — áp lực bên ngoài');
  if (xungH) {
    const xCs = countCatSat(xungH);
    out.push(`Đối cung: **${xungH.palaceName}** (${xungH.branch}) — ${chinhTinhFull(xungH).join(', ') || 'Vô chính diệu'}, cát/sát ${xCs.cat}/${xCs.sat}.`);
    out.push(xCs.cat > xCs.sat
      ? `→ Đối cung sáng đẹp, lực chiếu về mang tính **HỖ TRỢ** — áp lực bên ngoài lành, thậm chí "mượn" được sao tốt từ ${xungH.palaceName}.`
      : xCs.sat > xCs.cat
      ? `→ Đối cung nhiều sát, lực chiếu về mang tính **CẢN TRỞ** — áp lực bên ngoài đến từ ${xungH.palaceName.toLowerCase()}, cần dung hòa, tránh đối đầu trực diện.`
      : '→ Đối cung cân bằng — lực chiếu về vừa đẩy vừa đỡ, áp lực bên ngoài ở mức quản được.');
  }
  out.push('');

  out.push('# 8. Giáp cung — môi trường xung quanh');
  for (const pair of [['trước', right], ['sau', left]] as const) {
    const g = pair[1];
    if (!g) continue;
    const gCs = countCatSat(g);
    out.push(`- Giáp ${pair[0]}: **${g.palaceName}** (${g.branch}) — ${chinhTinhOf(g).join(', ') || 'VCD'}, cát/sát ${gCs.cat}/${gCs.sat}.`);
  }
  out.push(giapNet > 1
    ? '→ Hai cung giáp tươi sáng — "hàng xóm tốt", môi trường quanh cung thuận, được che chắn hai bên.'
    : giapNet < -1
    ? '→ Hai cung giáp nhiều sát — cung như "đi giữa hai làn gió ngược", hành sự nên kín đáo, chắc chắn.'
    : '→ Môi trường giáp cung trung tính.');
  out.push('');

  out.push('# 9. Thể – Dụng (phương pháp Diệu Xuân)');
  out.push('_**Thể** là BẢN CHẤT/nội lực sẵn có của cung (chính tinh sáng hay tối, miếu hay hãm); **Dụng** là CÁCH cung đó vận hành ra thực tế (phụ tinh, Hóa, Tuần/Triệt làm nó thuận hay nghịch). Logic: phải xét cả hai mới đúng — Thể tốt mà Dụng nghịch thì "có tài nhưng khó phát huy" (vấn đề ở cách triển khai, không phải năng lực); Thể yếu mà Dụng thuận thì đi chậm vẫn tới; Thể tốt + Dụng thuận mới là phát mạnh; Thể yếu + Dụng nghịch thì nên phòng thủ. Đây là cách tránh kết luận vội kiểu "có sao tốt là chắc chắn tốt"._');
  out.push(`**Thể** (bản chất cung): ${theGood ? 'TỐT — chính tinh có lực, nền tảng cung vững' : chinhNames.length ? 'YẾU — chính tinh thiếu lực, nền tảng mỏng' : 'RỖNG — vô chính diệu, bản thể phụ thuộc bên ngoài'}.`);
  out.push(`**Dụng** (cách vận hành): ${dungGood ? 'THUẬN — ít vật cản, vận hành trơn tru' : 'NGHỊCH — có vật cản (sát tinh/Kỵ/Tuần Triệt), vận hành phải khéo léo'}.`);
  out.push('→ ' + THE_DUNG_VERDICT(theGood, dungGood));
  out.push('');

  out.push('# 10. Khí số cung & chiến lược hành động');
  out.push(`**Khí số cung ${h.palaceName}: ${khiSo}/10** — ${KHISO_VERDICT(khiSo)}.`);
  out.push('');
  const top3 = (a: string[], fallback: string) => (a.length ? a.slice(0, 3).map(x => `- ${x}.`) : [`- ${fallback}.`]);
  out.push('**▸ Điểm mạnh nổi bật:**');
  out.push(...top3(manh, 'Không có điểm mạnh vượt trội — thế cung trung hòa'));
  out.push('**▸ Điểm yếu cần biết:**');
  out.push(...top3(yeu, 'Không có điểm yếu nghiêm trọng'));
  out.push('**▸ Cơ hội lớn nhất:**');
  out.push(...top3(coHoi, 'Cơ hội đến từ nỗ lực tự thân và thời vận (xem đại vận đi qua cung)'));
  out.push('**▸ Rủi ro lớn nhất:**');
  out.push(...top3(ruiRo, 'Rủi ro chính là chủ quan khi mọi thứ đang thuận'));
  out.push('**▸ Hành động nên làm:**');
  out.push(...top3(hanhDong, 'Giữ nhịp ổn định'));
  out.push('');
  out.push(`**Kết luận:** cung ${h.palaceName} (${role.split(',')[0]}) có khí số ${khiSo}/10 — ${theGood && dungGood ? 'nền vững và đường thoáng, đáng để đặt trọng tâm' : theGood ? 'có nền nhưng cần gỡ cách vận hành' : dungGood ? 'đường thoáng nhưng nền mỏng, đi chậm mà chắc' : 'giai đoạn này nên phòng thủ và nương vào các cung mạnh hơn'}. Mọi nhận định trên dựa trên TỔ HỢP nhiều dữ kiện (chính tinh + Tứ Hóa + Phi Hóa + tam hợp), không luận một sao đơn lẻ.`);
  out.push('');
  out.push('_Để luận sâu, cá nhân hóa và kết nối với đại vận hiện tại, dùng nút "Phân tích AI" bên cạnh._');
  return out.join('\n');
}

