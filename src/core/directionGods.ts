/**
 * HƯỚNG XUẤT HÀNH DÂN GIAN — Hỷ Thần / Tài Thần / Hạc Thần theo Can Chi NGÀY.
 *
 * Nguồn dữ liệu: anh Toàn cung cấp trực tiếp (Tuzi_Bang_Hy_Than_Tai_Than_Hac_Than_v1.xlsx,
 * version `tuzi_direction_gods_v1.0_2026-08-05`), đối chiếu 2 nguồn dân gian Việt Nam + 1 cổ thư
 * Trung Hoa (Tam Tài Đồ Hội) — xem sheet `Nguon_Tham_Khao` trong file gốc để tra lại khi cần.
 *
 * QUAN TRỌNG — khác với "hướng hợp" ở mục Màu sắc·Khung giờ·Hướng (tính theo DỤNG THẦN Bát Tự
 * riêng từng người): Hỷ Thần/Tài Thần/Hạc Thần là hướng theo NGÀY DƯƠNG LỊCH, ÁP DỤNG CHUNG CHO
 * MỌI NGƯỜI trong cùng 1 ngày — không cá nhân hóa theo lá số. KHÔNG được trộn lẫn 2 khái niệm này
 * khi hiển thị.
 *
 * Đây là nội dung văn hóa – tín ngưỡng dân gian mang tính tham khảo/giải trí, KHÔNG dùng làm
 * khuyến nghị an toàn giao thông hay quyết định tài chính (đúng lưu ý trong file nguồn).
 */
import type { HeavenlyStem, EarthlyBranch, FiveElement } from '../types';
import { getYearCanChi } from './lunarCalendar';
import { dayCanChi } from './nhatVan';

export type CompassDirection = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW' | 'NONE';

/**
 * Cơ sở tính Can Chi cho hướng xuất hành — CẤU HÌNH THEO TỪNG SỰ KIỆN (không phải chuyển hẳn
 * toàn bộ sang 1 kiểu), theo đúng yêu cầu anh Toàn: "đối với từng event sẽ có các event lấy theo
 * năm, có event theo ngày/tháng. Ví dụ Giao thừa thì xuất hành lấy theo năm, Lập thu thì lấy
 * theo ngày." → `'year'` cho lễ gắn với "năm mới" (Giao Thừa, Tết Nguyên Đán), `'day'` cho tiết
 * khí và các lễ còn lại (giữ hành vi gốc).
 */
export type DirectionGodsBasis = 'day' | 'year';

/**
 * Can Chi dùng để tra Hỷ/Tài/Hạc Thần, theo cơ sở đã cấu hình cho sự kiện.
 * - `'year'`: dùng Can Chi NĂM DƯƠNG LỊCH chứa `occursOn` (đúng quy ước `getYearCanChi` đã dùng
 *   xuyên suốt app, vd cung Lá Số/Đại Vận — "năm 2026 là năm Bính Ngọ"). Với Giao Thừa (đêm 30
 *   Tết), ngày dương lịch của sự kiện luôn rơi vào CÙNG năm dương lịch với Tết Nguyên Đán sắp
 *   tới (Tết sớm nhất ~21/1 dương lịch) nên đây chính là Can Chi của "năm mới sắp đến", không
 *   phải năm âm lịch cũ vẫn đang chạy.
 * - `'day'`: dùng Can Chi NGÀY (hành vi gốc, không đổi) — hợp lý cho tiết khí (mỗi tiết khí là 1
 *   ngày cụ thể, không gắn với khái niệm "năm mới").
 */
export function canChiForBasis(basis: DirectionGodsBasis, occursOn: Date): { stem: HeavenlyStem; branch: EarthlyBranch } {
  if (basis === 'year') return getYearCanChi(occursOn.getFullYear());
  const cc = dayCanChi(occursOn);
  return { stem: cc.stem, branch: cc.branch };
}

export interface NamedDirection {
  name: string;
  code: CompassDirection;
}

export interface DirectionGodsResult {
  hyThan: NamedDirection;   // hướng đón niềm vui/hỷ sự
  taiThan: NamedDirection;  // hướng đón tài lộc
  hacThan: NamedDirection & { restricted: boolean }; // hướng NÊN TRÁNH; restricted=false = "trên trời", không kiêng ngày đó
  warning: string | null;   // cảnh báo khi Hỷ Thần hoặc Tài Thần trùng đúng hướng Hạc Thần cần tránh
}

// ── Bảng 10 Thiên Can → Hỷ Thần / Tài Thần (tra theo Can của NGÀY) ──
const HY_TAI_THAN_BY_STEM: Record<HeavenlyStem, { hy: NamedDirection; tai: NamedDirection }> = {
  Giáp: { hy: { name: 'Đông Bắc', code: 'NE' }, tai: { name: 'Đông Nam', code: 'SE' } },
  Ất:   { hy: { name: 'Tây Bắc', code: 'NW' }, tai: { name: 'Đông Nam', code: 'SE' } },
  Bính: { hy: { name: 'Tây Nam', code: 'SW' }, tai: { name: 'Đông', code: 'E' } },
  Đinh: { hy: { name: 'Nam', code: 'S' }, tai: { name: 'Đông', code: 'E' } },
  Mậu:  { hy: { name: 'Đông Nam', code: 'SE' }, tai: { name: 'Bắc', code: 'N' } },
  Kỷ:   { hy: { name: 'Đông Bắc', code: 'NE' }, tai: { name: 'Nam', code: 'S' } },
  Canh: { hy: { name: 'Tây Bắc', code: 'NW' }, tai: { name: 'Tây Nam', code: 'SW' } },
  Tân:  { hy: { name: 'Tây Nam', code: 'SW' }, tai: { name: 'Tây Nam', code: 'SW' } },
  Nhâm: { hy: { name: 'Nam', code: 'S' }, tai: { name: 'Tây', code: 'W' } },
  Quý:  { hy: { name: 'Đông Nam', code: 'SE' }, tai: { name: 'Tây Bắc', code: 'NW' } },
};

// ── Bảng 60 Can Chi ngày → Hạc Thần (hướng NÊN TRÁNH) — tra theo `${Can} ${Chi}` ──
// null = "Trên trời / không kiêng hướng" (16/60 ngày trong chu kỳ, theo đúng nguồn đối chiếu).
const HAC_THAN_BY_DAY: Record<string, NamedDirection | null> = {
  'Giáp Tý': { name: 'Đông Nam', code: 'SE' },
  'Ất Sửu': { name: 'Đông Nam', code: 'SE' },
  'Bính Dần': { name: 'Nam', code: 'S' },
  'Đinh Mão': { name: 'Nam', code: 'S' },
  'Mậu Thìn': { name: 'Nam', code: 'S' },
  'Kỷ Tị': { name: 'Nam', code: 'S' },
  'Canh Ngọ': { name: 'Nam', code: 'S' },
  'Tân Mùi': { name: 'Tây Nam', code: 'SW' },
  'Nhâm Thân': { name: 'Tây Nam', code: 'SW' },
  'Quý Dậu': { name: 'Tây Nam', code: 'SW' },
  'Giáp Tuất': { name: 'Tây Nam', code: 'SW' },
  'Ất Hợi': { name: 'Tây Nam', code: 'SW' },
  'Bính Tý': { name: 'Tây Nam', code: 'SW' },
  'Đinh Sửu': { name: 'Tây', code: 'W' },
  'Mậu Dần': { name: 'Tây', code: 'W' },
  'Kỷ Mão': { name: 'Tây', code: 'W' },
  'Canh Thìn': { name: 'Tây', code: 'W' },
  'Tân Tị': { name: 'Tây', code: 'W' },
  'Nhâm Ngọ': { name: 'Tây Bắc', code: 'NW' },
  'Quý Mùi': { name: 'Tây Bắc', code: 'NW' },
  'Giáp Thân': { name: 'Tây Bắc', code: 'NW' },
  'Ất Dậu': { name: 'Tây Bắc', code: 'NW' },
  'Bính Tuất': { name: 'Tây Bắc', code: 'NW' },
  'Đinh Hợi': { name: 'Tây Bắc', code: 'NW' },
  'Mậu Tý': { name: 'Bắc', code: 'N' },
  'Kỷ Sửu': { name: 'Bắc', code: 'N' },
  'Canh Dần': { name: 'Bắc', code: 'N' },
  'Tân Mão': { name: 'Bắc', code: 'N' },
  'Nhâm Thìn': { name: 'Bắc', code: 'N' },
  'Quý Tị': null,
  'Giáp Ngọ': null,
  'Ất Mùi': null,
  'Bính Thân': null,
  'Đinh Dậu': null,
  'Mậu Tuất': null,
  'Kỷ Hợi': null,
  'Canh Tý': null,
  'Tân Sửu': null,
  'Nhâm Dần': null,
  'Quý Mão': null,
  'Giáp Thìn': null,
  'Ất Tị': null,
  'Bính Ngọ': null,
  'Đinh Mùi': null,
  'Mậu Thân': null,
  'Kỷ Dậu': { name: 'Đông Bắc', code: 'NE' },
  'Canh Tuất': { name: 'Đông Bắc', code: 'NE' },
  'Tân Hợi': { name: 'Đông Bắc', code: 'NE' },
  'Nhâm Tý': { name: 'Đông Bắc', code: 'NE' },
  'Quý Sửu': { name: 'Đông Bắc', code: 'NE' },
  'Giáp Dần': { name: 'Đông Bắc', code: 'NE' },
  'Ất Mão': { name: 'Đông', code: 'E' },
  'Bính Thìn': { name: 'Đông', code: 'E' },
  'Đinh Tị': { name: 'Đông', code: 'E' },
  'Mậu Ngọ': { name: 'Đông', code: 'E' },
  'Kỷ Mùi': { name: 'Đông', code: 'E' },
  'Canh Thân': { name: 'Đông Nam', code: 'SE' },
  'Tân Dậu': { name: 'Đông Nam', code: 'SE' },
  'Nhâm Tuất': { name: 'Đông Nam', code: 'SE' },
  'Quý Hợi': { name: 'Đông Nam', code: 'SE' },
};

/**
 * Hỷ Thần / Tài Thần / Hạc Thần theo 1 cặp Can Chi cụ thể — nhận Can Chi NGÀY hoặc Can Chi NĂM
 * tùy `canChiForBasis` đã chọn cơ sở nào cho sự kiện (2 bảng tra cứu vốn key theo Can/Can-Chi bất
 * kỳ, không có ý nghĩa "phải là ngày" — tên hàm giữ nguyên để không phá import cũ, chỉ nới ý nghĩa).
 */
export function directionGodsForDay(stem: HeavenlyStem, branch: EarthlyBranch): DirectionGodsResult {
  const byStem = HY_TAI_THAN_BY_STEM[stem];
  const hac = HAC_THAN_BY_DAY[`${stem} ${branch}`] ?? null;
  const hacThan = hac
    ? { ...hac, restricted: true as const }
    : { name: 'Trên trời / không kiêng hướng', code: 'NONE' as const, restricted: false as const };

  let warning: string | null = null;
  if (hac) {
    if (hac.code === byStem.hy.code) {
      warning = `Hướng Hỷ Thần (${byStem.hy.name}) trùng đúng hướng Hạc Thần cần tránh hôm nay — cân nhắc dùng hướng Tài Thần (${byStem.tai.name}) thay thế.`;
    } else if (hac.code === byStem.tai.code) {
      warning = `Hướng Tài Thần (${byStem.tai.name}) trùng đúng hướng Hạc Thần cần tránh hôm nay — cân nhắc dùng hướng Hỷ Thần (${byStem.hy.name}) thay thế.`;
    }
  }

  return { hyThan: byStem.hy, taiThan: byStem.tai, hacThan, warning };
}

// ── Hậu Thiên Bát Quái → Ngũ Hành theo 8 hướng — nguồn: cột "Cung Bát Quái" trong chính file
// Tuzi_Bang_Hy_Than_Tai_Than_Hac_Than_v1.xlsx anh Toàn cung cấp (Khảm/Bắc=Thủy, Cấn/Đông Bắc=Thổ,
// Chấn/Đông=Mộc, Tốn/Đông Nam=Mộc, Ly/Nam=Hỏa, Khôn/Tây Nam=Thổ, Đoài/Tây=Kim, Càn/Tây Bắc=Kim).
const DIRECTION_ELEMENT: Record<Exclude<CompassDirection, 'NONE'>, FiveElement> = {
  N: 'Thủy', NE: 'Thổ', E: 'Mộc', SE: 'Mộc', S: 'Hỏa', SW: 'Thổ', W: 'Kim', NW: 'Kim',
};

export interface DirectionPersonalization {
  priority: 'hyThan' | 'taiThan' | 'both' | 'neither';
  note: string;
}

/**
 * Cá nhân hóa lựa chọn giữa hướng Hỷ Thần và Tài Thần theo dụng thần/kỵ thần Bát Tự của người
 * xem (bước đã được anh Toàn duyệt đúng ý — KHÔNG đổi Hạc Thần, Hạc Thần vẫn dùng chung cho mọi
 * người). `eventLabel` (tên sự kiện, vd "Lập Thu") được chèn vào cuối câu để rõ gợi ý này CHỈ áp
 * dụng cho đúng sự kiện/ngày đang xem — tránh nhầm với "Hướng hợp" ở mục khác (tính theo mệnh cố
 * định cả năm, không đổi theo ngày). Trả `null` nếu chưa có lá số.
 */
export function personalizeDirectionGods(
  gods: DirectionGodsResult,
  favorableElements: FiveElement[],
  unfavorableElements: FiveElement[],
  eventLabel: string,
): DirectionPersonalization | null {
  if (!favorableElements?.length && !unfavorableElements?.length) return null;
  const hyEl = DIRECTION_ELEMENT[gods.hyThan.code as Exclude<CompassDirection, 'NONE'>];
  const taiEl = DIRECTION_ELEMENT[gods.taiThan.code as Exclude<CompassDirection, 'NONE'>];
  const hyGood = favorableElements.includes(hyEl);
  const taiGood = favorableElements.includes(taiEl);
  const hyBad = unfavorableElements.includes(hyEl);
  const taiBad = unfavorableElements.includes(taiEl);

  if (hyGood && !taiGood) {
    return { priority: 'hyThan', note: `Hướng Hỷ Thần (${gods.hyThan.name}) thuộc hành ${hyEl} — hợp dụng thần của bạn hơn, nên ưu tiên theo hướng này cho ngày ${eventLabel}.` };
  }
  if (taiGood && !hyGood) {
    return { priority: 'taiThan', note: `Hướng Tài Thần (${gods.taiThan.name}) thuộc hành ${taiEl} — hợp dụng thần của bạn hơn, nên ưu tiên theo hướng này cho ngày ${eventLabel}.` };
  }
  if (hyGood && taiGood) {
    return { priority: 'both', note: `Cả 2 hướng Hỷ Thần và Tài Thần đều thuộc hành hợp dụng thần của bạn — chọn hướng nào cũng thuận lợi cho ngày ${eventLabel}.` };
  }
  if (hyBad && !taiBad) {
    return { priority: 'taiThan', note: `Hướng Hỷ Thần (${gods.hyThan.name}) thuộc hành ${hyEl} — trùng kỵ thần của bạn, nên ưu tiên theo hướng Tài Thần thay thế cho ngày ${eventLabel}.` };
  }
  if (taiBad && !hyBad) {
    return { priority: 'hyThan', note: `Hướng Tài Thần (${gods.taiThan.name}) thuộc hành ${taiEl} — trùng kỵ thần của bạn, nên ưu tiên theo hướng Hỷ Thần thay thế cho ngày ${eventLabel}.` };
  }
  return { priority: 'neither', note: `Cả 2 hướng đều trung tính với dụng thần/kỵ thần của bạn — chọn theo ý thích cho ngày ${eventLabel}.` };
}
