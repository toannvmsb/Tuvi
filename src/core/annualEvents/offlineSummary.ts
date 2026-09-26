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

function eventBlock(e: ScoredEvent): string {
  const ex = explainEvent(e);
  const out: string[] = [];
  out.push(`## ${categoryTitleOf(e.category)} — ${e.title}`);
  out.push(`**${DIRECTION_LABEL[e.direction]}**${e.isMajorEvent ? ' · ⭐ Đáng chú ý trong năm' : ''} (${CONFIDENCE_VN[e.confidence]})`);
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
 * Bản "Xuất đầy đủ các sự kiện" (nút PDF dưới mục Sự kiện nổi bật) — KHÔNG hiện trên app vì có
 * thể rất nhiều sự kiện: toàn bộ sự kiện đạt >= minStrength, nhóm theo 10 lĩnh vực lớn, không
 * giới hạn số lượng/nhóm (khác `featuredGroups` trên app — luôn đúng 3/nhóm, không chặn điểm).
 */
export function generateFullAnnualEventsExport(pred: AnnualPrediction, minStrength = 40): string {
  const groups = groupEventsForExport(pred.allEvents, minStrength);
  const out: string[] = [];
  out.push(`# Toàn bộ sự kiện năm ${pred.targetYear} (${pred.yearCanChi}) — tuổi ${pred.targetAge}`);
  out.push(`Nhìn chung, năm nay có **${INTENSITY_VN[pred.overallIntensity]}**.`);
  out.push(`_Danh sách đầy đủ các sự kiện đạt từ ${minStrength} điểm trở lên, nhóm theo từng lĩnh vực lớn của lá số — bản đầy đủ, không giới hạn số lượng mỗi nhóm._`);
  out.push('');
  if (groups.length === 0) {
    out.push(`Không có sự kiện nào đạt từ ${minStrength} điểm trở lên trong năm ${pred.targetYear} — năm tương đối bình ổn theo các lĩnh vực đã xét.`);
  } else {
    for (const g of groups) {
      out.push(`# ${g.label}`);
      for (const e of g.events) { out.push(eventBlock(e)); out.push(''); }
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
