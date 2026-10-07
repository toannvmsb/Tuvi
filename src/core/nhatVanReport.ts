/**
 * BÁO CÁO "XEM THEO NGÀY" BẢN CƠ BẢN (offline, miễn phí) — dùng ở DailyScreen, NhatVanScreen và làm dữ liệu nền cho prompt AI.
 * Tách khỏi nhatVan.ts để "Nên/Không nên" lấy được từ dayPicker.tasksForDay (nhatVan.ts không được import dayPicker — vòng import).
 */
import type { AstrologyResult } from '../types';
import { scoreNhatVan, goodBadHours, auspiciousHours, type HourWindow } from './nhatVan';
import { tasksForDay, groupAvoid } from './dayPicker';
import { elementPhongThuy } from './phongThuyBatTu';
import { solarToLunar } from './lunarCalendar';

const WEEKDAY = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const fmtHourLine = (h: HourWindow) => `Giờ ${h.branch} (${h.range}) — ${h.reason}`;

// ─────────────────────────────────────────────
// BÁO CÁO OFFLINE (Cơ bản)
// ─────────────────────────────────────────────
export function generateNhatVanOffline(result: AstrologyResult, date: Date): string {
  const sc = scoreNhatVan(result, date);
  const ld = solarToLunar(date.getDate(), date.getMonth()+1, date.getFullYear());
  const fav = (result.batTuChart.favorableElements || []).slice(0, 2);
  const dung = fav.length ? fav : [result.batTuChart.dayMasterElement];
  const out: string[] = [];

  out.push(`**${WEEKDAY[date.getDay()]}, ngày ${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()}**`);
  out.push(`Âm lịch: ${ld.day}/${ld.month}${ld.isLeapMonth ? ' nhuận' : ''}/${ld.year}`);
  out.push(`Ngày **${sc.canChi.stem} ${sc.canChi.branch}** · Can ${sc.canChi.stemEl} · Chi ${sc.canChi.branchEl}`);
  out.push('');

  // Dòng tổng quan ngày
  const hdLabel = sc.hoangDao ? '☀ Hoàng Đạo' : '🌑 Hắc Đạo';
  out.push(`# Tổng quan ngày`);
  out.push(`- Trực: **${sc.truc}** · Lục Diệu: **${sc.lucDieu}** · ${hdLabel} · Tú **${sc.nhi28Tu}**`);
  out.push(`- Điểm tổng hợp: **${sc.score100}/100** — **${sc.rating}**`);
  out.push('');

  if (sc.warnings.length) {
    out.push('# ⚠ Cảnh báo quan trọng');
    sc.warnings.forEach(w => out.push(`- ${w}`));
    out.push('');
  }

  out.push('# Phân tích chi tiết');
  sc.reasons.forEach(r => out.push(`- ${r}`));
  out.push('');

  // Nên / không nên — CÙNG nguồn với thẻ "Việc hợp / nên tránh hôm nay" (dayPicker.tasksForDay) để hai nơi không mâu thuẫn.
  const fit = tasksForDay(date, result);
  const top = (xs: { name: string; note: string }[], n = 6) => xs.slice(0, n).map(x => (x.note ? `${x.name} (${x.note})` : x.name)).join('; ');
  const goodDay = sc.rating === 'Rất tốt' || sc.rating === 'Tốt';
  const roughDay = sc.rating === 'Cần thận trọng' || sc.rating === 'Xấu';

  out.push('# Nên làm hôm nay');
  const nghi = fit.good.filter(x => x.tier === 'nghi');
  const thuan = fit.good.filter(x => x.tier !== 'nghi');
  if (nghi.length) out.push(`- Việc hợp theo Trực ${sc.truc} (Hiệp Kỷ): ${top(nghi)}${nghi.length > 6 ? ` … (còn ${nghi.length - 6} việc)` : ''}.`);
  if (thuan.length) out.push(`- Việc thuận (không vướng kỵ, điểm ngày cao): ${top(thuan.map(x => ({ name: x.name, note: '' })), 8)}${thuan.length > 8 ? ` … (còn ${thuan.length - 8} việc)` : ''}.`);
  if (!fit.good.length) out.push(`- Trực ${sc.truc} không nghi rõ việc trọng đại nào — nên làm việc thường ngày, hoàn thiện việc dang dở.`);
  if (goodDay) out.push('- Điểm ngày tốt: chủ động tiếp cận cơ hội phù hợp với các việc hợp ở trên, tránh dàn trải.');
  else if (!roughDay) out.push('- Củng cố quan hệ, dọn dẹp, sắp xếp công việc.');
  else out.push('- Ưu tiên việc nội bộ, nhẹ nhàng; giữ sức khỏe, nghỉ ngơi điều độ, làm việc thiện.');
  out.push('');

  out.push('# Không nên làm hôm nay');
  if (sc.xungTuoi) out.push('- ⚠ XUNG TUỔI: tuyệt đối tránh cưới hỏi, khởi công, ký hợp đồng lớn, đi xa.');
  if (sc.monthBreak) out.push('- ⚠ NGUYỆT PHÁ: tránh khai trương, cưới hỏi, động thổ, nhập trạch, ký kết lớn (cầu y, giải trừ, phá nhà… không kỵ).');
  if (sc.tuePha) out.push('- ⚠ TUẾ PHÁ: tránh việc lớn, động thổ, tu tạo.');
  if (sc.tamNuong) out.push('- ⚠ Tam Nương: tránh cưới hỏi, khai trương, xuất hành quan trọng.');
  if (sc.nguyetKy) out.push('- ⚠ Nguyệt Kỵ: tránh ký kết, xuất hành, ra quyết định lớn.');
  const sect = (label: string, xs: typeof fit.avoid) => {
    if (!xs.length) return;
    const gs = groupAvoid(xs);
    gs.slice(0, 3).forEach(gr => out.push(`- ${label} — ${gr.note} (${gr.items.length} việc): ${gr.items.slice(0, 4).map(x => x.name).join('; ')}${gr.items.length > 4 ? '…' : ''}.`));
    if (gs.length > 3) out.push(`- … và ${gs.length - 3} nhóm lý do khác (xem đủ ở thẻ "Việc hợp / nên tránh hôm nay").`);
  };
  sect('Nên tránh', fit.avoid);
  sect('Cân nhắc / hạn chế', fit.consider);
  if (roughDay) out.push('- Hạn chế đầu tư mạo hiểm, tranh cãi, đứng ra bảo lãnh; cẩn trọng giấy tờ, đi lại, lời ăn tiếng nói.');
  else if (!fit.avoid.length && !fit.consider.length && !sc.xungTuoi && !sc.tamNuong && !sc.nguyetKy && !sc.monthBreak && !sc.tuePha) {
    out.push('- Không có điều đại kỵ; vẫn nên tránh nóng giận và quyết định vội vàng.');
  }
  out.push('');

  // Khung giờ
  const hr = goodBadHours(result, date);
  const general = auspiciousHours(date);
  out.push('# Khung giờ tốt / xấu');

  out.push('**▸ Khung giờ tốt CHO LÁ SỐ:**');
  if (hr.good.length) hr.good.forEach(h => out.push(`- ✦ ${fmtHourLine(h)}.`));
  else out.push('- Không có khung giờ nổi bật riêng cho lá số.');
  out.push('');

  out.push('**▸ Khung giờ tốt NÓI CHUNG (Giờ Hoàng Đạo):**');
  if (general.length) {
    general.forEach(h => out.push(`- ✧ Giờ ${h.branch} (${h.range}).`));
    out.push('  _(Dùng khi giờ hợp lá số rơi vào lúc bất tiện.)_');
  }
  out.push('');

  if (hr.bad.length) {
    out.push('**▸ Khung giờ XẤU (hạn chế việc trọng đại):**');
    hr.bad.forEach(h => out.push(`- ⚠ ${fmtHourLine(h)}.`));
    out.push('');
  }

  // Ăn / Mặc / Hướng
  out.push('# Ăn – Mặc – Hướng (theo Dụng thần)');
  for (const el of dung) {
    const g = elementPhongThuy(el);
    out.push(`**▸ Bổ hành ${el}**`);
    out.push(`- 🍚 Nên ăn: ${g.thucPham}.`);
    out.push(`- 👕 Nên mặc màu: ${g.mau}.`);
    out.push(`- 🧭 Hướng tốt: ${g.huong}.`);
    out.push('');
  }
  out.push(`- 🔢 Con số hợp: ${dung.map(e => elementPhongThuy(e).so).join(', ')}.`);
  out.push('');
  out.push('_Gợi ý tham khảo theo ngũ hành kết hợp lá số. Muốn luận sâu hơn, dùng Phân tích AI._');
  return out.join('\n');
}
