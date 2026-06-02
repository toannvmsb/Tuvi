/**
 * PHI HÓA NAM PHÁI — kỹ thuật gốc của Tử Vi Nam Phái Việt Nam
 * (Lê Quang Lăng + Diệu Xuân).
 *
 * Với mỗi cung X có CAN = Y, 4 hóa tinh sinh ra từ Y "phi" tới cung chứa
 * sao tương ứng. Ý nghĩa: tài lộc / quyền uy / danh tiếng / vướng mắc của
 * lĩnh vực cung X chảy về lĩnh vực cung Z.
 *
 * Dùng chung cho cả Phân tích AI (`utils/aiAnalysis.ts`) và Phân tích
 * Nâng cao offline (`core/offlineLuanGiai.ts`) — bảo đảm 2 luồng cùng
 * công thức, không sai khác.
 */

import type { AstrologyResult } from '../types';

// Bảng Tứ Hóa theo Can — [Hóa Lộc, Hóa Quyền, Hóa Khoa, Hóa Kỵ]
export const HOA_BY_STEM: Record<string, [string, string, string, string]> = {
  Giáp: ['Liêm Trinh', 'Phá Quân',   'Vũ Khúc',  'Thái Dương'],
  Ất:   ['Thiên Cơ',   'Thiên Lương','Tử Vi',    'Thái Âm'],
  Bính: ['Thiên Đồng', 'Thiên Cơ',   'Văn Xương','Liêm Trinh'],
  Đinh: ['Thái Âm',    'Thiên Đồng', 'Thiên Cơ', 'Cự Môn'],
  Mậu:  ['Tham Lang',  'Thái Âm',    'Hữu Bật',  'Thiên Cơ'],
  Kỷ:   ['Vũ Khúc',    'Tham Lang',  'Thiên Lương','Văn Khúc'],
  Canh: ['Thái Dương', 'Vũ Khúc',    'Thái Âm',  'Thiên Đồng'],
  Tân:  ['Cự Môn',     'Thái Dương', 'Văn Khúc', 'Văn Xương'],
  Nhâm: ['Thiên Lương','Tử Vi',      'Tả Phù',   'Vũ Khúc'],
  Quý:  ['Phá Quân',   'Cự Môn',     'Thái Âm',  'Tham Lang'],
};

export const HOA_LABEL = ['Hóa Lộc', 'Hóa Quyền', 'Hóa Khoa', 'Hóa Kỵ'] as const;
export type HoaKind = typeof HOA_LABEL[number];

export interface PhiHoaPhat {
  hoa: HoaKind;
  viaStar: string;
  toPalace: string;
  toBranch: string;
}
export interface PhiHoaNhan {
  hoa: HoaKind;
  viaStar: string;
  fromPalace: string;
  fromBranch: string;
}

/** Phi Hóa từ một cung: phát đi cung nào, nhận từ cung nào. */
export function computePhiHoa(
  c: AstrologyResult['tuViChart'],
  branchIndex: number,
): { phat: PhiHoaPhat[]; nhan: PhiHoaNhan[] } {
  const h = c.houses[branchIndex];
  const phat: PhiHoaPhat[] = [];
  const stars = HOA_BY_STEM[h.can as string];
  if (stars) {
    for (let k = 0; k < 4; k++) {
      const sName = stars[k];
      const target = c.houses.find(hh => hh.stars.some(s => s.type === 'chinh' && s.name === sName));
      if (target) phat.push({ hoa: HOA_LABEL[k], viaStar: sName, toPalace: target.palaceName, toBranch: target.branch });
    }
  }
  const nhan: PhiHoaNhan[] = [];
  for (let i = 0; i < c.houses.length; i++) {
    if (i === branchIndex) continue;
    const hi = c.houses[i];
    const sList = HOA_BY_STEM[hi.can as string];
    if (!sList) continue;
    for (let k = 0; k < 4; k++) {
      const sName = sList[k];
      if (h.stars.some(s => s.type === 'chinh' && s.name === sName)) {
        nhan.push({ hoa: HOA_LABEL[k], viaStar: sName, fromPalace: hi.palaceName, fromBranch: hi.branch });
      }
    }
  }
  return { phat, nhan };
}

/** Tổng kết phi hóa của TẤT CẢ 12 cung dưới dạng text (dùng cho AI context). */
export function summarizeAllPhiHoa(c: AstrologyResult['tuViChart']): string {
  const lines: string[] = [];
  for (let i = 0; i < c.houses.length; i++) {
    const h = c.houses[i];
    const { phat } = computePhiHoa(c, i);
    if (!phat.length) continue;
    const detail = phat.map(p => `${p.hoa}→${p.toPalace}(qua ${p.viaStar})`).join(', ');
    lines.push(`- Cung ${h.palaceName} (can ${h.can}): phi ${detail}.`);
  }
  return lines.join('\n');
}

/** Tứ Hóa CỐ ĐỊNH theo can NĂM SINH — vị trí 4 hóa tinh tọa thủ. */
export function summarizeYearHoa(c: AstrologyResult['tuViChart']): string {
  const stem = c.lunarDate.yearStem as string;
  const stars = HOA_BY_STEM[stem];
  if (!stars) return '';
  const out: string[] = [];
  for (let k = 0; k < 4; k++) {
    const sName = stars[k];
    const target = c.houses.find(hh => hh.stars.some(s => s.type === 'chinh' && s.name === sName));
    out.push(`${HOA_LABEL[k]} = ${sName}${target ? ` tại ${target.palaceName}(${target.branch})` : ''}`);
  }
  return `Tứ Hóa CỐ ĐỊNH (theo can năm sinh ${stem}): ${out.join(' · ')}.`;
}

// Bảng can tháng giêng theo can năm (Ngũ Hổ Độn). Mỗi tháng tiếp theo +1 stem.
const STEMS_LIST = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const MONTH1_STEM_BY_YEAR: Record<string, string> = {
  Giáp: 'Bính', Kỷ: 'Bính',
  Ất: 'Mậu', Canh: 'Mậu',
  Bính: 'Canh', Tân: 'Canh',
  Đinh: 'Nhâm', Nhâm: 'Nhâm',
  Mậu: 'Giáp', Quý: 'Giáp',
};
/** Can của tháng X (âm lịch 1-12) trong năm có can Y — Ngũ Hổ Độn.
 *  Tháng giêng = Dần; can tháng tăng theo bảng Ngũ Hổ. */
export function monthStem(yearStem: string, monthLunar: number): string {
  const base = MONTH1_STEM_BY_YEAR[yearStem];
  if (!base) return yearStem;
  const baseIdx = STEMS_LIST.indexOf(base);
  return STEMS_LIST[(baseIdx + monthLunar - 1) % 10];
}

/** Vị trí 4 Lưu Tứ Hóa của một NĂM (theo can năm xem) — 4 sao chính được hóa
 *  bởi can năm hiện đóng tại cung nào. Đây là dữ liệu cốt lõi để luận tiểu vận:
 *  Lưu Lộc cho biết "năm nay cơ hội đến từ đâu", Lưu Kỵ "năm nay điểm nghẽn ở đâu". */
export function luuTuHoaPositions(
  c: AstrologyResult['tuViChart'],
  yearStem: string,
): { hoa: HoaKind; star: string; palace: string; branch: string }[] {
  const stars = HOA_BY_STEM[yearStem];
  if (!stars) return [];
  const out: { hoa: HoaKind; star: string; palace: string; branch: string }[] = [];
  for (let k = 0; k < 4; k++) {
    const sName = stars[k];
    const h = c.houses.find(hh => hh.stars.some(s => s.type === 'chinh' && s.name === sName));
    if (h) out.push({ hoa: HOA_LABEL[k], star: sName, palace: h.palaceName, branch: h.branch });
  }
  return out;
}

/** Tổng hợp Phi Hóa toàn lá số — đếm xem cung nào TẬP TRUNG nhiều Lộc/Quyền/Khoa/Kỵ.
 *  Dùng cho "Nút thắt cuộc đời" (Kỵ lớn nhất) và "Nguồn lực lớn nhất" (Lộc+Quyền+Khoa). */
export function aggregatePhiHoa(c: AstrologyResult['tuViChart']) {
  const tally: Record<string, { loc: number; quyen: number; khoa: number; ky: number }> = {};
  for (let i = 0; i < c.houses.length; i++) {
    const { phat } = computePhiHoa(c, i);
    for (const p of phat) {
      const t = tally[p.toPalace] ||= { loc: 0, quyen: 0, khoa: 0, ky: 0 };
      if (p.hoa === 'Hóa Lộc') t.loc++;
      else if (p.hoa === 'Hóa Quyền') t.quyen++;
      else if (p.hoa === 'Hóa Khoa') t.khoa++;
      else if (p.hoa === 'Hóa Kỵ') t.ky++;
    }
  }
  const list = Object.entries(tally).map(([palace, v]) => ({
    palace, ...v,
    auspicious: v.loc + v.quyen + v.khoa, // tổng cát
  }));
  const nutThat = list.filter(x => x.ky > 0).sort((a, b) => b.ky - a.ky)[0]; // Kỵ nhiều nhất
  const nguonLuc = list.sort((a, b) => b.auspicious - a.auspicious)[0];      // cát nhiều nhất
  return { tally: list, nutThat, nguonLuc };
}
