/**
 * XEM THEO NGÀY (Nhật vận / Trạch nhật theo lá số).
 *
 * Với một NGÀY DƯƠNG LỊCH cụ thể, tính Can–Chi ngày rồi đối chiếu với DỤNG THẦN
 * / KỴ THẦN và TUỔI (chi năm sinh) của đương số để đánh giá ngày tốt/xấu và
 * tư vấn: nên làm gì, không nên làm gì, ăn gì, mặc màu gì, hướng nào, kiêng gì.
 *
 * Rule-based, tham khảo — không thay thế thầy chọn ngày.
 */

import type { AstrologyResult, FiveElement, HeavenlyStem, EarthlyBranch } from '../types';
import { elementPhongThuy } from './phongThuyBatTu';

const STEMS: HeavenlyStem[] = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const BRANCHES: EarthlyBranch[] = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tị', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
const STEM_ELEMENT: Record<HeavenlyStem, FiveElement> = {
  Giáp: 'Mộc', Ất: 'Mộc', Bính: 'Hỏa', Đinh: 'Hỏa', Mậu: 'Thổ', Kỷ: 'Thổ',
  Canh: 'Kim', Tân: 'Kim', Nhâm: 'Thủy', Quý: 'Thủy',
};
const BRANCH_ELEMENT: Record<EarthlyBranch, FiveElement> = {
  Tý: 'Thủy', Sửu: 'Thổ', Dần: 'Mộc', Mão: 'Mộc', Thìn: 'Thổ', Tị: 'Hỏa',
  Ngọ: 'Hỏa', Mùi: 'Thổ', Thân: 'Kim', Dậu: 'Kim', Tuất: 'Thổ', Hợi: 'Thủy',
};
// Tam hợp & lục xung theo chi
const TAM_HOP: EarthlyBranch[][] = [
  ['Thân', 'Tý', 'Thìn'], ['Dần', 'Ngọ', 'Tuất'], ['Tị', 'Dậu', 'Sửu'], ['Hợi', 'Mão', 'Mùi'],
];
const XUNG: Record<EarthlyBranch, EarthlyBranch> = {
  Tý: 'Ngọ', Ngọ: 'Tý', Sửu: 'Mùi', Mùi: 'Sửu', Dần: 'Thân', Thân: 'Dần',
  Mão: 'Dậu', Dậu: 'Mão', Thìn: 'Tuất', Tuất: 'Thìn', Tị: 'Hợi', Hợi: 'Tị',
};

function jdFromDate(dd: number, mm: number, yy: number): number {
  const a = Math.floor((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  if (jd < 2299161) jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
  return jd;
}

export interface DayCanChi {
  stem: HeavenlyStem;
  branch: EarthlyBranch;
  stemEl: FiveElement;
  branchEl: FiveElement;
}

export function dayCanChi(date: Date): DayCanChi {
  const jd = jdFromDate(date.getDate(), date.getMonth() + 1, date.getFullYear());
  const stem = STEMS[((jd + 9) % 10 + 10) % 10];
  const branch = BRANCHES[((jd + 1) % 12 + 12) % 12];
  return { stem, branch, stemEl: STEM_ELEMENT[stem], branchEl: BRANCH_ELEMENT[branch] };
}

export interface NhatVanScore {
  date: Date;
  canChi: DayCanChi;
  rating: 'Rất tốt' | 'Tốt' | 'Bình thường' | 'Cần thận trọng' | 'Xấu';
  score: number;
  xungTuoi: boolean;
  hopTuoi: boolean;
  reasons: string[];
}

export function scoreNhatVan(result: AstrologyResult, date: Date): NhatVanScore {
  const cc = dayCanChi(date);
  const fav = result.batTuChart.favorableElements || [];
  const unfav = result.batTuChart.unfavorableElements || [];
  const yearBranch = result.tuViChart.lunarDate.yearBranch;

  let score = 0;
  const reasons: string[] = [];

  if (fav.includes(cc.stemEl)) { score += 2; reasons.push(`Can ngày hành ${cc.stemEl} thuộc DỤNG THẦN → được tiếp khí.`); }
  if (unfav.includes(cc.stemEl)) { score -= 2; reasons.push(`Can ngày hành ${cc.stemEl} thuộc KỴ THẦN → khí hơi nghịch.`); }
  if (fav.includes(cc.branchEl)) { score += 1; reasons.push(`Chi ngày hành ${cc.branchEl} hợp dụng thần.`); }
  if (unfav.includes(cc.branchEl)) { score -= 1; reasons.push(`Chi ngày hành ${cc.branchEl} thuộc kỵ thần.`); }

  const xungTuoi = XUNG[cc.branch] === yearBranch;
  const hopTuoi = TAM_HOP.some(g => g.includes(cc.branch) && g.includes(yearBranch) && cc.branch !== yearBranch);
  if (xungTuoi) { score -= 2; reasons.push(`Chi ngày ${cc.branch} XUNG tuổi (${yearBranch}) → kiêng việc trọng đại.`); }
  else if (hopTuoi) { score += 1; reasons.push(`Chi ngày ${cc.branch} tam hợp với tuổi (${yearBranch}) → thuận hòa.`); }

  const rating: NhatVanScore['rating'] =
    score >= 3 ? 'Rất tốt' : score >= 1 ? 'Tốt' : score === 0 ? 'Bình thường'
    : score <= -3 ? 'Xấu' : 'Cần thận trọng';

  return { date, canChi: cc, rating, score, xungTuoi, hopTuoi, reasons };
}

const WEEKDAY = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

// ----- KHUNG GIỜ TỐT / XẤU TRONG NGÀY -----
// 12 canh giờ theo Chi — mỗi canh 2 tiếng. Giờ Tý vắt đêm 23h–1h.
const HOUR_BRANCHES: { ch: EarthlyBranch; range: string; start: number; end: number }[] = [
  { ch: 'Tý',  range: '23h–1h',  start: 23, end: 1 },
  { ch: 'Sửu', range: '1h–3h',   start: 1,  end: 3 },
  { ch: 'Dần', range: '3h–5h',   start: 3,  end: 5 },
  { ch: 'Mão', range: '5h–7h',   start: 5,  end: 7 },
  { ch: 'Thìn',range: '7h–9h',   start: 7,  end: 9 },
  { ch: 'Tị',  range: '9h–11h',  start: 9,  end: 11 },
  { ch: 'Ngọ', range: '11h–13h', start: 11, end: 13 },
  { ch: 'Mùi', range: '13h–15h', start: 13, end: 15 },
  { ch: 'Thân',range: '15h–17h', start: 15, end: 17 },
  { ch: 'Dậu', range: '17h–19h', start: 17, end: 19 },
  { ch: 'Tuất',range: '19h–21h', start: 19, end: 21 },
  { ch: 'Hợi', range: '21h–23h', start: 21, end: 23 },
];

export interface HourWindow {
  branch: EarthlyBranch;
  range: string;       // "5h–7h"
  element: FiveElement;
  score: number;
  reason: string;
}

/**
 * Chấm điểm 12 khung giờ trong ngày theo dụng/kỵ thần + lục xung/tam hợp với
 * Chi NGÀY và Chi NĂM SINH (tuổi). Trả về danh sách giờ tốt và giờ xấu để hiển
 * thị ở Home (tóm tắt) và DailyScreen (chi tiết).
 */
export function goodBadHours(
  result: AstrologyResult,
  date: Date,
): { good: HourWindow[]; bad: HourWindow[] } {
  const cc = dayCanChi(date);
  const fav = result.batTuChart.favorableElements || [];
  const unfav = result.batTuChart.unfavorableElements || [];
  const yearBranch = result.tuViChart.lunarDate.yearBranch;

  const scored: HourWindow[] = HOUR_BRANCHES.map(({ ch, range }) => {
    const el = BRANCH_ELEMENT[ch];
    let s = 0;
    const parts: string[] = [];
    if (fav.includes(el)) { s += 2; parts.push(`giờ hành ${el} hợp dụng thần`); }
    if (unfav.includes(el)) { s -= 2; parts.push(`giờ hành ${el} thuộc kỵ thần`); }
    if (XUNG[ch] === cc.branch) { s -= 2; parts.push(`xung Chi ngày ${cc.branch}`); }
    else if (TAM_HOP.some(g => g.includes(ch) && g.includes(cc.branch) && ch !== cc.branch)) {
      s += 1; parts.push(`tam hợp Chi ngày ${cc.branch}`);
    }
    if (XUNG[ch] === yearBranch) { s -= 2; parts.push(`xung tuổi ${yearBranch}`); }
    else if (TAM_HOP.some(g => g.includes(ch) && g.includes(yearBranch) && ch !== yearBranch)) {
      s += 1; parts.push(`tam hợp tuổi ${yearBranch}`);
    }
    return { branch: ch, range, element: el, score: s, reason: parts.join('; ') || 'trung tính với lá số' };
  });

  // Tốt: score ≥ 2 (lấy tối đa 3, ưu tiên điểm cao); nếu không có, lấy 2 giờ điểm cao nhất.
  const sorted = [...scored].sort((a, b) => b.score - a.score);
  let good = sorted.filter(h => h.score >= 2).slice(0, 3);
  if (good.length < 3) {
    // Bù thêm cho đủ 3 khung từ các giờ điểm dương kế tiếp.
    const fallback = sorted.filter(h => h.score > 0 && !good.includes(h)).slice(0, 3 - good.length);
    good = good.concat(fallback);
  }
  if (good.length === 0) good = sorted.slice(0, 3).filter(h => h.score > 0);
  // Xấu: score ≤ -2 (lấy tối đa 2); nếu không có, lấy giờ thấp nhất nếu ≤ -1.
  const sortedAsc = [...scored].sort((a, b) => a.score - b.score);
  let bad = sortedAsc.filter(h => h.score <= -2).slice(0, 2);
  if (bad.length === 0) bad = sortedAsc.slice(0, 1).filter(h => h.score < 0);

  return { good, bad };
}

const fmtHourLine = (h: HourWindow) =>
  `Giờ ${h.branch} (${h.range}) — ${h.reason}`;


/** Báo cáo offline (Cơ bản) cho ngày — miễn phí. */
export function generateNhatVanOffline(result: AstrologyResult, date: Date): string {
  const sc = scoreNhatVan(result, date);
  const fav = (result.batTuChart.favorableElements || []).slice(0, 2);
  const dung = fav.length ? fav : [result.batTuChart.dayMasterElement];
  const out: string[] = [];

  out.push(`**${WEEKDAY[date.getDay()]}, ngày ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}**`);
  out.push(`Ngày **${sc.canChi.stem} ${sc.canChi.branch}** (Can hành ${sc.canChi.stemEl}, Chi hành ${sc.canChi.branchEl}).`);
  out.push(`Đánh giá với lá số của bạn: **${sc.rating}**.`);
  out.push('');

  out.push('# Vì sao');
  if (sc.reasons.length) sc.reasons.forEach(r => out.push(`- ${r}`));
  else out.push('- Ngày trung tính với lá số, không có yếu tố nổi bật.');
  out.push('');

  // Nên làm / không nên làm
  out.push('# Nên làm hôm nay');
  if (sc.rating === 'Rất tốt' || sc.rating === 'Tốt') {
    out.push('- Thuận để TIẾN HÀNH việc quan trọng: ký kết, khai trương, gặp gỡ đối tác, ra mắt, nộp hồ sơ, hẹn hò quan trọng.');
    out.push('- Chủ động đề xuất, mở rộng quan hệ, khởi sự kế hoạch mới.');
  } else if (sc.rating === 'Bình thường') {
    out.push('- Làm các việc thường ngày, hoàn thiện việc dang dở; chưa cần khởi sự lớn.');
    out.push('- Củng cố quan hệ, dọn dẹp – sắp xếp công việc.');
  } else {
    out.push('- Ưu tiên việc nội bộ, nhẹ nhàng; rà soát – kiểm tra hơn là khởi sự mới.');
    out.push('- Giữ sức khỏe, nghỉ ngơi điều độ, làm việc thiện cho nhẹ lòng.');
  }
  out.push('');

  out.push('# Không nên làm hôm nay');
  if (sc.xungTuoi) out.push('- ⚠ Ngày XUNG tuổi: TRÁNH việc trọng đại (cưới hỏi, khởi công, ký hợp đồng lớn, đi xa quan trọng).');
  if (sc.rating === 'Cần thận trọng' || sc.rating === 'Xấu') {
    out.push('- Hạn chế quyết định lớn, đầu tư mạo hiểm, tranh cãi, đứng ra bảo lãnh/cho vay.');
    out.push('- Cẩn trọng giấy tờ, đi lại, lời ăn tiếng nói.');
  } else if (!sc.xungTuoi) {
    out.push('- Không có điều đại kỵ; vẫn nên tránh nóng giận và quyết định vội vàng.');
  }
  out.push('');

  // Khung giờ tốt / xấu trong ngày
  const hr = goodBadHours(result, date);
  out.push('# Khung giờ tốt / xấu trong ngày');
  if (hr.good.length) {
    out.push('**▸ Khung giờ TỐT (ưu tiên việc quan trọng):**');
    hr.good.forEach(h => out.push(`- ✦ ${fmtHourLine(h)}.`));
  } else {
    out.push('- Không có khung giờ nổi bật; có thể chọn khung sáng (5h–11h) khi tinh thần tỉnh táo.');
  }
  if (hr.bad.length) {
    out.push('');
    out.push('**▸ Khung giờ XẤU (hạn chế việc trọng đại):**');
    hr.bad.forEach(h => out.push(`- ⚠ ${fmtHourLine(h)}.`));
  }
  out.push('');

  // Ăn / Mặc / Hướng theo dụng thần
  out.push('# Ăn – Mặc – Hướng (theo dụng thần của bạn)');
  for (const el of dung) {
    const g = elementPhongThuy(el);
    out.push(`**▸ Bổ hành ${el}**`);
    out.push(`- 🍚 Nên ăn: ${g.thucPham}.`);
    out.push(`- 👕 Nên mặc màu: ${g.mau}.`);
    out.push(`- 🧭 Hướng tốt khi ra ngoài/khởi sự: ${g.huong}.`);
    out.push('');
  }
  out.push(`- 🔢 Con số hợp: ${dung.map(e => elementPhongThuy(e).so).join(', ')}.`);
  out.push('');
  out.push('_Gợi ý tham khảo theo ngũ hành ngày kết hợp lá số; muốn luận sâu và cụ thể hơn, hãy dùng Phân tích AI._');
  return out.join('\n');
}
