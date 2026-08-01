/**
 * LUẬN SỐ HỢP MỆNH — phân tích một dãy số (điện thoại, biển xe, tài khoản, số nhà…)
 * theo 3 tầng: (1) số tự thân có đẹp không, (2) có hợp Bát Tự người dùng không,
 * (3) có hợp mục đích sử dụng không. Chấm điểm thang 100.
 *
 * Quy đổi ngũ hành của số (hệ cố định): 0,1→Thủy · 2,5,8→Thổ · 3,4→Mộc · 6,7→Kim · 9→Hỏa.
 * Âm/Dương: số chẵn = Âm, số lẻ = Dương.
 * Nguồn: tài liệu "Phân tích số đẹp" (anh Toàn).
 */
import type { AstrologyResult, FiveElement } from '../types';
import { hyThanOf } from './thapThan';

const DIGIT_EL: Record<string, FiveElement> = {
  '0': 'Thủy', '1': 'Thủy', '2': 'Thổ', '5': 'Thổ', '8': 'Thổ',
  '3': 'Mộc', '4': 'Mộc', '6': 'Kim', '7': 'Kim', '9': 'Hỏa',
};
const EL_DIGITS: Record<FiveElement, string> = { Thủy: '0,1', Thổ: '2,5,8', Mộc: '3,4', Kim: '6,7', Hỏa: '9' };
const SHENG: Record<FiveElement, FiveElement> = { Mộc: 'Hỏa', Hỏa: 'Thổ', Thổ: 'Kim', Kim: 'Thủy', Thủy: 'Mộc' };

// Loại số (việc cụ thể) — theo file Excel.
export const NUMBER_TYPES = [
  { code: 'PHONE', name: 'Xem số điện thoại' },
  { code: 'PLATE', name: 'Xem biển số xe' },
  { code: 'BANK', name: 'Xem số tài khoản ngân hàng' },
  { code: 'HOUSE', name: 'Xem số nhà / căn hộ' },
  { code: 'LUCKY', name: 'Xem số may mắn cá nhân' },
  { code: 'COMPANY', name: 'Xem mã số doanh nghiệp' },
  { code: 'ASSET', name: 'Xem số tài sản / hợp đồng' },
];

// Số chữ số TỐI THIỂU theo từng loại số (việc cụ thể). Số nhà/số may mắn có thể rất ngắn.
export const NUMBER_TYPE_MIN: Record<string, number> = {
  PHONE: 9,     // điện thoại
  PLATE: 4,     // biển số xe (phần số)
  BANK: 6,      // tài khoản ngân hàng
  HOUSE: 1,     // số nhà / căn hộ (có thể 1 chữ số)
  LUCKY: 1,     // số may mắn cá nhân
  COMPANY: 10,  // mã số doanh nghiệp (MST 10/13)
  ASSET: 2,     // số tài sản / hợp đồng
};
export const minDigitsFor = (typeCode: string): number => NUMBER_TYPE_MIN[typeCode] ?? 3;

// Mục đích xem số — theo file Excel.
export const NUMBER_PURPOSES = [
  { code: 'CA_NHAN', name: 'Dùng cá nhân' },
  { code: 'KINH_DOANH', name: 'Dùng kinh doanh' },
  { code: 'DI_LAI', name: 'Dùng đi lại' },
  { code: 'NHA_O', name: 'Dùng cho nhà ở' },
  { code: 'TAI_LOC', name: 'Dùng cho tài lộc' },
  { code: 'THUONG_HIEU', name: 'Dùng cho thương hiệu' },
  { code: 'BINH_AN', name: 'Dùng cho bình an' },
];

const GOOD_PAIRS: Record<string, string> = {
  '68': 'lộc phát', '86': 'phát lộc', '39': 'thần tài nhỏ', '79': 'thần tài lớn',
  '38': 'ông địa nhỏ', '78': 'ông địa lớn', '88': 'phát phát', '99': 'trường cửu',
};
const WARN_PAIRS: Record<string, string> = {
  '49': 'dân gian xem là hạn', '53': 'dân gian xem là hạn', '44': 'cách đọc kém may',
  '13': 'một số nơi kiêng', '04': 'dễ hiểu tiêu cực',
};
const THE_SO: Record<string, string> = {
  '6868': 'lộc phát lặp lại', '8686': 'phát lộc tuần hoàn', '8888': 'phát mạnh',
  '9999': 'trường cửu', '6666': 'tứ Kim vượng', '1234': 'tiến lên', '5678': 'sinh lộc phát triển',
  '6789': 'đi lên mở rộng', '1368': 'sinh tài lộc phát', '3456': 'thuận tiến',
};

export interface NumberAnalysis {
  digits: string;
  typeName: string;
  purposeName: string;
  total: number;
  rating: string;          // Rất hợp | Khá hợp | Trung bình | Cần cân nhắc | Không nên ưu tiên
  chuDao: FiveElement;
  duoiEl: FiveElement;
  amCount: number; duongCount: number;
  tongNut: number;
  elementCounts: Record<FiveElement, number>;
  goodPairs: string[]; warnPairs: string[]; thes: string[];
  breakdown: { batTu: number; canBang: number; yNghia: number; mucDich: number };
  ketLuan: string;
  diemManh: string[];
  diemLuuY: string[];
  goiY: string;
}

const ratingOf = (t: number): NumberAnalysis['rating'] =>
  t >= 85 ? 'Rất hợp' : t >= 70 ? 'Khá hợp' : t >= 55 ? 'Trung bình' : t >= 40 ? 'Cần cân nhắc' : 'Không nên ưu tiên';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function analyzeNumber(
  result: AstrologyResult,
  rawDigits: string,
  typeCode: string,
  purposeCode: string,
): NumberAnalysis | null {
  const digits = (rawDigits.match(/\d/g) || []).join('');
  if (digits.length < minDigitsFor(typeCode)) return null;
  const typeName = NUMBER_TYPES.find(t => t.code === typeCode)?.name || 'Dãy số';
  const purposeName = NUMBER_PURPOSES.find(p => p.code === purposeCode)?.name || 'Dùng cá nhân';

  // ── Quy đổi ngũ hành + âm dương + tổng nút ──
  const elementCounts: Record<FiveElement, number> = { Kim: 0, Mộc: 0, Thủy: 0, Hỏa: 0, Thổ: 0 };
  let am = 0, duong = 0, sum = 0;
  for (const ch of digits) {
    elementCounts[DIGIT_EL[ch]]++;
    const n = Number(ch);
    sum += n;
    if (n % 2 === 0) am++; else duong++;
  }
  const tongNut = sum % 10;
  const chuDao = (Object.keys(elementCounts) as FiveElement[]).reduce((a, b) => elementCounts[b] > elementCounts[a] ? b : a);
  const duoiEl = DIGIT_EL[digits[digits.length - 1]];

  // ── Cặp số / thế số ──
  const goodPairs: string[] = [], warnPairs: string[] = [];
  const seenG = new Set<string>(), seenW = new Set<string>();
  for (let i = 0; i < digits.length - 1; i++) {
    const p = digits.slice(i, i + 2);
    if (GOOD_PAIRS[p] && !seenG.has(p)) { goodPairs.push(`${p} (${GOOD_PAIRS[p]})`); seenG.add(p); }
    if (WARN_PAIRS[p] && !seenW.has(p)) { warnPairs.push(`${p} (${WARN_PAIRS[p]})`); seenW.add(p); }
  }
  const thes: string[] = [];
  for (const [k, v] of Object.entries(THE_SO)) if (digits.includes(k)) thes.push(`${k} (${v})`);

  // ── Bát Tự ──
  const fav = (result.batTuChart.favorableElements || []) as FiveElement[];
  const unfav = (result.batTuChart.unfavorableElements || []) as FiveElement[];
  const hy = hyThanOf(fav);
  const thieu = (Object.keys(elementCounts) as FiveElement[])
    .reduce((a, b) => (result.batTuChart.elementCounts?.[b] ?? 0) < (result.batTuChart.elementCounts?.[a] ?? 0) ? b : a);

  // ===== 1) Hợp Bát Tự (40đ) =====
  let batTu = 10;
  if (fav.includes(chuDao)) batTu += 20;
  else if (hy && chuDao === hy) batTu += 12;
  if (fav.includes(duoiEl) || (hy && duoiEl === hy)) batTu += 10;
  if ((fav.includes(thieu) || (hy && hy === thieu)) && elementCounts[thieu] > 0) batTu += 5;   // bổ sung hành thiếu là dụng/hỷ
  const touchesKy = (Object.keys(elementCounts) as FiveElement[]).some(e => unfav.includes(e) && elementCounts[e] >= digits.length * 0.35);
  if (!touchesKy) batTu += 5;
  if (unfav.includes(chuDao)) batTu -= 15;
  if (unfav.includes(duoiEl)) batTu -= 10;
  batTu = Math.round(clamp(batTu, 0, 40));

  // ===== 2) Cân bằng âm dương + ngũ hành (20đ) =====
  const amRatio = am / digits.length;
  let canBang = clamp(10 - Math.abs(amRatio - 0.5) * 32, 0, 10);     // 50/50 → 10đ
  const distinct = (Object.values(elementCounts) as number[]).filter(v => v > 0).length;
  canBang += distinct >= 4 ? 10 : distinct === 3 ? 7 : distinct === 2 ? 4 : 1;
  const maxShare = Math.max(...Object.values(elementCounts)) / digits.length;
  if (maxShare > 0.6) canBang -= 5;
  canBang = Math.round(clamp(canBang, 0, 20));   // làm tròn để không hiện số thập phân dài

  // ===== 3) Ý nghĩa số (20đ) =====
  let yNghia = 8;
  yNghia += clamp(goodPairs.length * 3, 0, 8);
  yNghia += clamp(thes.length * 3, 0, 6);
  yNghia += tongNut >= 8 ? 5 : tongNut >= 6 ? 3 : tongNut >= 4 ? 1 : 0;
  yNghia -= clamp(warnPairs.length * 3, 0, 8);
  yNghia = Math.round(clamp(yNghia, 0, 20));

  // ===== 4) Hợp mục đích sử dụng (20đ) =====
  let mucDich = 10;
  const wantTai = ['KINH_DOANH', 'TAI_LOC', 'THUONG_HIEU'].includes(purposeCode);
  const wantOnDinh = ['DI_LAI', 'NHA_O', 'BINH_AN'].includes(purposeCode);
  if (wantTai) {
    if (goodPairs.length) mucDich += 5;
    if (['Kim', 'Thổ', 'Hỏa'].includes(duoiEl)) mucDich += 3;
    if (tongNut >= 6) mucDich += 2;
    if (!goodPairs.length && !thes.length) mucDich -= 3;
  } else if (wantOnDinh) {
    if (amRatio >= 0.4 && amRatio <= 0.6) mucDich += 6;        // cân bằng → bình an
    if (warnPairs.length) mucDich -= 4;
    if (duong > am * 1.6) mucDich -= 3;                         // quá dương → động, kém bình an
  } else { // CA_NHAN
    if (fav.includes(chuDao) || (hy && chuDao === hy)) mucDich += 6;
    if (distinct >= 4) mucDich += 2;
  }
  mucDich = Math.round(clamp(mucDich, 0, 20));

  const total = clamp(batTu + canBang + yNghia + mucDich, 0, 100);
  const rating = ratingOf(total);

  // ── Điểm mạnh / lưu ý / gợi ý ──
  const diemManh: string[] = [];
  if (fav.includes(chuDao)) diemManh.push(`Hành chủ đạo của dãy số là ${chuDao} — đúng DỤNG THẦN của bạn, bổ trợ tốt cho mệnh cục.`);
  else if (hy && chuDao === hy) diemManh.push(`Hành chủ đạo ${chuDao} là HỶ THẦN — hỗ trợ dụng thần, khá có lợi.`);
  if (fav.includes(duoiEl) || (hy && duoiEl === hy)) diemManh.push(`Đuôi số thuộc hành ${duoiEl} (dụng/hỷ thần) — phần "ấn tượng cuối" hợp mệnh.`);
  if (goodPairs.length) diemManh.push(`Có cặp số tài lộc: ${goodPairs.join(', ')}.`);
  if (thes.length) diemManh.push(`Có thế số đẹp: ${thes.join(', ')}.`);
  if (amRatio >= 0.4 && amRatio <= 0.6) diemManh.push(`Âm dương cân bằng (${am} chẵn / ${duong} lẻ) — trường số hài hòa.`);
  if (tongNut >= 6) diemManh.push(`Tổng nút = ${tongNut} — trường số ${tongNut >= 8 ? 'mạnh, nổi bật, dễ nhớ' : 'khá ổn'}.`);
  if (!diemManh.length) diemManh.push('Dãy số ở mức trung tính, không có điểm cộng nổi bật.');

  const diemLuuY: string[] = [];
  if (unfav.includes(chuDao)) diemLuuY.push(`⚠ Hành chủ đạo ${chuDao} đang là KỴ THẦN — dễ làm lệch thêm cục diện, cần cân nhắc.`);
  if (unfav.includes(duoiEl)) diemLuuY.push(`⚠ Đuôi số thuộc hành ${duoiEl} (kỵ thần) — phần ấn tượng cuối chưa thuận mệnh.`);
  if (maxShare > 0.6) diemLuuY.push(`Dãy số quá thiên về một hành (${chuDao} chiếm ${Math.round(maxShare * 100)}%) — kém cân bằng.`);
  if (amRatio < 0.35) diemLuuY.push('Thiên DƯƠNG (nhiều số lẻ) — trường số dễ động, gấp, nóng.');
  if (amRatio > 0.65) diemLuuY.push('Thiên ÂM (nhiều số chẵn) — trường số dễ trầm, chậm.');
  if (warnPairs.length) diemLuuY.push(`Có cặp số dân gian dễ gây cảm giác chưa đẹp: ${warnPairs.join(', ')} (chỉ là một phần, không quyết định cả dãy).`);
  if (wantTai && !goodPairs.length) diemLuuY.push('Dùng cho tài lộc/kinh doanh nhưng thiếu cặp số lộc — sức "tài khí" chưa nổi.');
  if (!diemLuuY.length) diemLuuY.push('Không có điểm trừ đáng kể.');

  const favTxt = fav.length ? `${fav.join('/')}` : '(dụng thần)';
  const favDigits = fav.map(e => EL_DIGITS[e]).filter(Boolean).join(', ');
  const goiY = favDigits
    ? `Lá số của bạn hợp nhóm hành ${favTxt} — nên ưu tiên các số ${favDigits} (nhất là ở phần đuôi) để tăng độ hợp mệnh${wantOnDinh ? ', đồng thời giữ âm dương cân bằng để thêm bình an' : ''}.`
    : 'Nên ưu tiên dãy số bổ trợ đúng dụng thần và giữ âm dương cân bằng.';

  const ketLuan =
    `Dãy số đạt ${total}/100 — ${rating.toUpperCase()} để ${purposeName.toLowerCase()}. ` +
    `Năng lượng số thiên về ${chuDao}${duoiEl !== chuDao ? `, đuôi số hành ${duoiEl}` : ''}; ` +
    (fav.includes(chuDao) ? 'hợp dụng thần nên bổ trợ tốt cho mệnh. '
      : unfav.includes(chuDao) ? 'trùng kỵ thần nên cần cân nhắc kỹ. '
      : 'trung hòa với lá số. ') +
    (goodPairs.length ? `Có yếu tố tài lộc dân gian (${goodPairs[0]}). ` : '') +
    `Phù hợp nhất khi dùng cho mục đích đã chọn ở mức "${rating}".`;

  return {
    digits, typeName, purposeName, total, rating, chuDao, duoiEl,
    amCount: am, duongCount: duong, tongNut, elementCounts,
    goodPairs, warnPairs, thes,
    breakdown: { batTu, canBang, yNghia, mucDich },
    ketLuan, diemManh, diemLuuY, goiY,
  };
}
