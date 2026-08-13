/**
 * CHAT FACTS — khối facts GỌN cho "Hỏi Tuzi" (chat AI đời sống, model rẻ,
 * hạn mức 500 từ). KHÁC với `natalFactsBlock` (dùng cho phân tích lá số đầy
 * đủ, rất dài — không phù hợp gắn vào MỌI tin nhắn chat).
 *
 * Chỉ tái dùng facts đã tính sẵn (không bịa, không tính điểm mới):
 *   - Danh tính + Mệnh/Thân: từ tuViChart (giống chartHeaderLines dùng cho PDF).
 *   - Tuổi âm lịch (con giáp): lấy THẲNG từ Chi của Trụ Năm (batTuChart.pillars[0]) — KHÔNG để
 *     AI tự suy ra từ năm sinh dương lịch (bug thực tế: AI từng trả lời nhầm tuổi Mão thay vì
 *     đúng phải là tuổi Hợi, do tự tính sai từ năm sinh).
 *   - Bát Tự: Nhật chủ + Dụng thần/Kỵ thần (batTuChart, đã có).
 *   - Vận hiện tại: Đại Vận (scoreDaiVan), Tiểu Vận năm nay (scoreTieuVan),
 *     Hôm nay (scoreNhatVan) — cùng nguồn điểm dùng ở các màn Đại/Tiểu/Nhật Vận.
 *   - Tháng đẹp trong năm (scoreAllNguyetVan): kèm THÁNG ÂM HIỆN TẠI rõ ràng và
 *     tách riêng "đẹp nhất cả năm" vs "đẹp nhất trong các tháng CÒN LẠI" — để
 *     AI không tư vấn nhầm một tháng đã qua như thể nó còn ở phía trước (bug
 *     thực tế: tháng hiện tại là tháng 6 âm nhưng AI khuyên "tháng 4 đẹp nhất"
 *     mà không nói rõ tháng 4 đã qua).
 *
 * Khối này LUÔN gửi kèm (nếu người dùng có lá số gắn) — nhẹ, vài dòng — và để
 * chính AI tự quyết định dùng hay bỏ qua tùy câu hỏi có liên quan lá số hay
 * không (chỉ dẫn ở system prompt phía Edge Function), thay vì đoán "liên
 * quan" bằng từ khóa phía client (dễ sai, dễ bỏ sót cách hỏi diễn đạt khác).
 */
import type { AstrologyResult } from '../types';
import { currentAgeOf } from './ageUtil';
import { scoreDaiVan } from './daiVanScore';
import { scoreTieuVan } from './tieuVanScore';
import { scoreNhatVan } from './nhatVan';
import { scoreAllNguyetVan } from './nguyetVanScore';
import { solarToLunar } from './lunarCalendar';
import { ZODIAC_NAME } from './xongDatEngine';

export function buildChatFactsBlock(result: AstrologyResult, date: Date = new Date()): string {
  const b = result.birthInfo;
  const c = result.tuViChart;
  const bt = result.batTuChart;
  const gender = b.gender === 'nam' ? 'Nam' : 'Nữ';
  const age = currentAgeOf(result, date);

  const lines: string[] = [];
  lines.push(`Họ tên: ${b.name || '(không tên)'} · ${gender} · Sinh ${b.day}/${b.month}/${b.year} · Tuổi hiện tại: ${age}`);
  // ★ DỮ KIỆN CỐ ĐỊNH — bắt buộc nêu rõ tuổi âm lịch (con giáp) lấy từ Trụ Năm Bát Tự đã tính
  // sẵn, KHÔNG để AI tự suy ra từ năm sinh dương lịch (dễ sai — nhất là sinh gần Tết, và thực tế
  // đã có lần AI trả lời nhầm tuổi Mão thay vì đúng phải là tuổi Hợi).
  const yearBranch = bt?.pillars?.[0]?.branch;
  if (yearBranch) {
    lines.push(
      `★ DỮ KIỆN CỐ ĐỊNH — TUỔI ÂM LỊCH (con giáp) CỦA NGƯỜI NÀY: ${yearBranch} (tuổi ${ZODIAC_NAME[yearBranch]}). ` +
      'BẮT BUỘC dùng ĐÚNG tuổi này trong mọi câu trả lời liên quan tới tuổi/con giáp/hợp-khắc theo năm — ' +
      'TUYỆT ĐỐI KHÔNG tự suy đoán con giáp khác từ năm sinh dương lịch.',
    );
  }
  lines.push(`Mệnh: cung ${c.menhCung}, chủ tinh ${c.menhChu} · Bản Mệnh ${c.napAmMenh} (Cục ${c.cucName})`);
  if (c.thanCung !== c.menhCung) lines.push(`Thân: cung ${c.thanCung}, chủ tinh ${c.thanChu}`);

  if (bt) {
    const fav = bt.favorableElements?.join(', ') || '?';
    const unfav = bt.unfavorableElements?.join(', ') || '?';
    lines.push(`Bát Tự: Nhật chủ ${bt.dayMaster} (${bt.dayMasterElement}) · Dụng thần: ${fav} · Kỵ thần: ${unfav}`);
  }

  const curDV = result.daiVans?.find(dv => age >= dv.startAge && age <= dv.endAge);
  if (curDV) {
    const sc = scoreDaiVan(result, curDV);
    lines.push(`Đại Vận hiện tại: ${curDV.stem} ${curDV.branch} (${curDV.startAge}-${curDV.endAge} tuổi) — ${sc.rating}`);
  }

  const curTV = result.tieuVans?.find(tv => tv.age === age);
  if (curTV) {
    const sc = scoreTieuVan(result, curTV);
    lines.push(`Tiểu Vận năm nay (${curTV.year}): ${sc.rating}`);
  }

  // Tháng đẹp trong năm — LUÔN nêu rõ tháng ÂM hiện tại + tách "đẹp nhất cả
  // năm" (có thể đã qua) khỏi "đẹp nhất trong các tháng CÒN LẠI", để AI không
  // tư vấn nhầm một tháng đã trôi qua như thể còn ở phía trước.
  try {
    const ld = solarToLunar(date.getDate(), date.getMonth() + 1, date.getFullYear());
    const months = scoreAllNguyetVan(result, age);
    if (months.length) {
      const net = (m: (typeof months)[number]) => m.taiLoc - m.thachThuc * 0.5;
      const best = months.reduce((a, b) => (net(b) > net(a) ? b : a));
      const remaining = months.filter(m => m.month >= ld.month);
      const bestRemaining = remaining.length ? remaining.reduce((a, b) => (net(b) > net(a) ? b : a)) : null;
      lines.push(`Tháng âm hiện tại: tháng ${ld.month} (các tháng 1–${ld.month - 1} âm lịch năm nay ĐÃ QUA)`);
      lines.push(`Tháng đẹp nhất năm nay (Nguyệt Vận): tháng ${best.month} (${best.rating})${best.month < ld.month ? ' — ĐÃ QUA' : ''}`);
      if (bestRemaining) {
        lines.push(`Tháng đẹp nhất trong các tháng CÒN LẠI (từ tháng ${ld.month} đến tháng 12 âm lịch năm nay): tháng ${bestRemaining.month} (${bestRemaining.rating})`);
      }
    }
  } catch { /* thiếu dữ liệu tháng — bỏ qua khối này */ }

  try {
    const nv = scoreNhatVan(result, date);
    lines.push(`Hôm nay: ${nv.rating}`);
  } catch { /* thiếu dữ liệu ngày — bỏ qua dòng này */ }

  return lines.join('\n');
}
