/**
 * Bản "Nâng cao" (offline, không cần AI) — trình bày trực tiếp JSON đã chấm điểm thành văn bản
 * Markdown đơn giản, không cần gọi AI. Dùng cùng SimpleMarkdown như các màn Nâng cao khác của app.
 */
import type { AnnualPrediction, ScoredEvent } from './types';
import { categoryTitleOf } from './eventTitles';

const DIRECTION_LABEL: Record<ScoredEvent['direction'], string> = {
  POSITIVE: 'Xu hướng thuận lợi', NEGATIVE: 'Xu hướng cần thận trọng', MIXED: 'Biến động hai chiều',
};

function eventBlock(e: ScoredEvent): string {
  const out: string[] = [];
  out.push(`## ${categoryTitleOf(e.category)} — ${e.title}`);
  out.push(`**${e.strength}/100 (${e.level})** · ${DIRECTION_LABEL[e.direction]} · Độ tin cậy ${e.confidence}${e.isMajorEvent ? ' · ⭐ Sự kiện lớn' : ''}`);
  if (e.reasoningChain.length) {
    out.push('**Dữ kiện:** ' + e.reasoningChain.join('; ') + '.');
  }
  out.push('**Kết luận:** ' + (
    e.direction === 'POSITIVE'
      ? `Năm nay ${categoryTitleOf(e.category).toLowerCase()} có nhiều dấu hiệu thuận lợi — nên chủ động tận dụng.`
      : e.direction === 'NEGATIVE'
        ? `Năm nay ${categoryTitleOf(e.category).toLowerCase()} có tín hiệu cần thận trọng — nên chuẩn bị phương án dự phòng.`
        : `Năm nay ${categoryTitleOf(e.category).toLowerCase()} có cả cơ hội lẫn áp lực — nên cân nhắc kỹ trước quyết định lớn.`
  ));
  if (e.peakMonths.length) {
    out.push('**Thời điểm mạnh trong năm:** ' + e.peakMonths.map(m =>
      (m.startLunarMonth === m.endLunarMonth ? `tháng ${m.startLunarMonth}` : `tháng ${m.startLunarMonth}–${m.endLunarMonth}`) + ` âm lịch (${m.strength})`,
    ).join('; ') + '.');
  } else {
    out.push('**Thời điểm mạnh trong năm:** chưa đủ dữ liệu để khoanh vùng tháng cụ thể.');
  }
  if (e.counterEvidence.length) {
    out.push(`**Lưu ý:** vẫn có ${e.counterEvidence.length} dữ kiện ngược chiều (${e.counterEvidence.slice(0, 3).map(c => c.starName).join(', ')}) — không nên chủ quan tuyệt đối theo một hướng.`);
  }
  return out.join('\n\n');
}

export function generateAnnualOfflineSummary(pred: AnnualPrediction): string {
  const out: string[] = [];
  out.push(`# Vận hạn năm ${pred.targetYear} (${pred.yearCanChi}) — tuổi ${pred.targetAge}`);
  out.push(`Độ sôi động chung của năm: **${pred.overallIntensity}**.`);
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
