/**
 * Bản "Nâng cao" (offline, không cần AI) — trình bày trực tiếp JSON đã chấm điểm thành văn bản
 * Markdown đơn giản, KHÔNG dùng nhãn kỹ thuật (level/confidence là nhãn nội bộ để xếp hạng, không
 * hiện cho người dùng — CLAUDE.md §2.4 "không dùng ngôn ngữ mê tín/kỹ thuật, chỉ nói xu hướng").
 */
import type { AnnualPrediction, ScoredEvent } from './types';
import { categoryTitleOf } from './eventTitles';
import { INTENSITY_VN, CONFIDENCE_VN } from './labels';
import { explainEvent, explainMonthWindow } from './explain';
import { groupEventsForExport } from './ranking';

const DIRECTION_LABEL: Record<ScoredEvent['direction'], string> = {
  POSITIVE: 'Xu hướng thuận lợi', NEGATIVE: 'Xu hướng cần thận trọng', MIXED: 'Biến động hai chiều',
};

/** `index` (tùy chọn): số thứ tự hiển thị trước tiêu đề — chỉ dùng ở bản "Xuất đầy đủ" để người
 *  đọc PDF dễ theo dõi/tham chiếu thứ tự (vd "Sự kiện #12"), bản tóm tắt Nâng cao không cần.
 *  Có `index` thì kèm luôn ĐIỂM của sự kiện (đúng số hiện ở vòng điểm trên app). */
function eventBlock(e: ScoredEvent, index?: number): string {
  const ex = explainEvent(e);
  const out: string[] = [];
  out.push(`## ${index != null ? `${index}. ` : ''}${categoryTitleOf(e.category)} — ${e.title}`);
  out.push(`${index != null ? `**Điểm: ${e.strength}/100** · ` : ''}**${DIRECTION_LABEL[e.direction]}**${e.isMajorEvent ? ' · ⭐ Đáng chú ý trong năm' : ''} (${CONFIDENCE_VN[e.confidence]})`);
  if (ex.facts.length) {
    out.push('**Dữ kiện:**');
    for (const f of ex.facts) out.push(`- ${f}`);
  }
  out.push('**Phân tích:** ' + ex.analysis);
  out.push('**Kết luận:** ' + ex.conclusion);
  if (e.peakMonths.length) {
    out.push('**Thời điểm cần lưu ý:**');
    for (const w of e.peakMonths) out.push(`- ${explainMonthWindow(w)}`);
  } else {
    out.push('**Thời điểm cần lưu ý:** chưa đủ dữ liệu để khoanh vùng tháng cụ thể cho sự kiện này.');
  }
  return out.join('\n\n');
}

export function generateAnnualOfflineSummary(pred: AnnualPrediction): string {
  const out: string[] = [];
  out.push(`# Vận hạn năm ${pred.targetYear} (${pred.yearCanChi}) — tuổi ${pred.targetAge}`);
  out.push(`Nhìn chung, năm nay có **${INTENSITY_VN[pred.overallIntensity]}**.`);
  out.push('');
  if (pred.events.length === 0) {
    out.push('Chưa ghi nhận sự kiện nào nổi bật đạt ngưỡng đáng chú ý trong năm này — có thể xem là một năm tương đối bình ổn theo các nhóm chủ đề đã xét (sự nghiệp, tài chính, tài sản, tình cảm, con cái, sức khỏe, di chuyển, học vấn/danh tiếng, gia đạo, pháp lý).');
  } else {
    out.push('# Các chủ đề nổi bật');
    for (const t of pred.annualTheme) out.push(`- ${t}`);
    out.push('');
    for (const e of pred.events) { out.push(eventBlock(e)); out.push(''); }
  }
  if (pred.composites.length) {
    out.push('# Liên hệ giữa các nhóm');
    for (const c of pred.composites) out.push(`- ${c.narrativeHint}`);
    out.push('');
  }
  out.push('_Đây là xu hướng và mức độ thuận lợi/rủi ro tham khảo theo lá số, không phải phán đoán tuyệt đối. Muốn có lời khuyên hành động chi tiết theo từng tháng, dùng mục Phân tích AI bên dưới._');
  return out.join('\n');
}

/**
 * Bản "Xuất đầy đủ các sự kiện" (nút PDF dưới mục Sự kiện nổi bật): TOÀN BỘ sự kiện đang hiện ở mục
 * Sự kiện nổi bật (`featuredGroups`, bất kể điểm) + mọi sự kiện khác đạt >= minStrength (mặc định 45),
 * nhóm theo 10 lĩnh vực lớn, đánh số thứ tự liên tục và ghi điểm từng sự kiện.
 */
export function generateFullAnnualEventsExport(pred: AnnualPrediction, minStrength = 45): string {
  const groups = groupEventsForExport(pred.allEvents, minStrength, pred.featuredGroups);
  const out: string[] = [];
  out.push(`# Toàn bộ sự kiện năm ${pred.targetYear} (${pred.yearCanChi}) — tuổi ${pred.targetAge}`);
  out.push(`Nhìn chung, năm nay có **${INTENSITY_VN[pred.overallIntensity]}**.`);
  out.push(`_Gồm toàn bộ sự kiện đang hiện ở mục Sự kiện nổi bật và các sự kiện khác đạt từ ${minStrength} điểm trở lên, nhóm theo từng lĩnh vực lớn của lá số; mỗi sự kiện được đánh số thứ tự và ghi điểm._`);
  out.push('');
  if (groups.length === 0) {
    out.push(`Không có sự kiện nào để xuất trong năm ${pred.targetYear} — năm tương đối bình ổn theo các lĩnh vực đã xét.`);
  } else {
    let idx = 0;
    for (const g of groups) {
      out.push(`# ${g.label}`);
      for (const e of g.events) { idx++; out.push(eventBlock(e, idx)); out.push(''); }
    }
  }
  if (pred.composites.length) {
    out.push('# Liên hệ giữa các nhóm');
    for (const c of pred.composites) out.push(`- ${c.narrativeHint}`);
    out.push('');
  }
  out.push('_Đây là xu hướng và mức độ thuận lợi/rủi ro tham khảo theo lá số, không phải phán đoán tuyệt đối hay lời khuyên y tế/pháp lý/tài chính chuyên môn._');
  return out.join('\n');
}
