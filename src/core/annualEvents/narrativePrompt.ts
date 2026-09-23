/**
 * Soạn prompt cho Claude từ JSON đã chấm điểm — Claude CHỈ diễn giải, KHÔNG được tính lại
 * (đúng prompts/claude_narrative_prompt.md + ranh giới ENGINE_SPEC §24), và phải theo đúng
 * khung luận Nam Phái của app (CLAUDE.md §2 — 4 lớp DỮ KIỆN→PHÂN TÍCH→KẾT LUẬN→KHUYẾN NGHỊ,
 * KHÔNG dùng "Mệnh chủ/Thân chủ", không phán tuyệt đối, ngôn ngữ y tế/pháp lý thận trọng).
 */
import type { AnnualPrediction, ScoredEvent } from './types';
import { categoryTitleOf } from './eventTitles';

function fmtEvent(e: ScoredEvent): string {
  const dirLabel = e.direction === 'POSITIVE' ? 'thuận lợi' : e.direction === 'NEGATIVE' ? 'cần thận trọng' : 'hai chiều (có cả thuận lợi và áp lực)';
  const monthsTxt = e.peakMonths.length
    ? e.peakMonths.map(m => (m.startLunarMonth === m.endLunarMonth ? `tháng ${m.startLunarMonth}` : `tháng ${m.startLunarMonth}–${m.endLunarMonth}`) + ` (${m.strength})`).join('; ')
    : 'chưa đủ dữ liệu để khoanh vùng tháng cụ thể';
  const evidenceTxt = e.reasoningChain.slice(0, 5).join('; ');
  const counterTxt = e.counterEvidence.length ? e.counterEvidence.slice(0, 3).map(c => c.starName).join(', ') : 'không có';
  return [
    `- ${categoryTitleOf(e.category)} · ${e.title} [${e.eventId}]`,
    `  Cường độ: ${e.strength}/100 (${e.level}) · Hướng: ${dirLabel} · Độ tin cậy: ${e.confidence}`,
    `  Sự kiện lớn: ${e.isMajorEvent ? (e.isVeryHigh ? 'CÓ, mức rất cao' : 'CÓ') : 'chưa đạt ngưỡng'}`,
    `  Dữ kiện chính: ${evidenceTxt || 'không có dữ kiện nổi bật'}`,
    `  Dữ kiện ngược chiều: ${counterTxt}`,
    `  Cửa sổ tháng mạnh: ${monthsTxt}`,
    e.narrativeHints.length ? `  Ghi chú kỹ thuật: ${e.narrativeHints.join(' | ')}` : '',
  ].filter(Boolean).join('\n');
}

export function buildAnnualNarrativePrompt(pred: AnnualPrediction, name?: string): string {
  const eventsTxt = pred.events.map(fmtEvent).join('\n\n');
  const compositesTxt = pred.composites.length
    ? pred.composites.map(c => `- ${c.result}: ${c.narrativeHint}`).join('\n')
    : '(không có chủ đề tổng hợp nào đạt ngưỡng)';

  return [
    'Bạn là AI COACH của Tuzi — luận theo TỬ VI NAM PHÁI VIỆT NAM. Toàn bộ tính toán chiêm tinh',
    '(sao, cung, Tứ Hóa, Đại Vận, Tiểu Hạn, Lưu Niên, Lưu Nguyệt, thời điểm tháng) ĐÃ ĐƯỢC TÍNH XONG',
    'ở dưới — bạn CHỈ diễn giải đúng dữ liệu này, KHÔNG tự tính lại, KHÔNG thêm sao/cung không có,',
    'KHÔNG đổi cường độ/hướng/thời điểm, KHÔNG bịa sự kiện ngoài danh sách.',
    '',
    'QUY TẮC BẮT BUỘC CỦA APP (Nam Phái):',
    '- TUYỆT ĐỐI không dùng "Mệnh chủ"/"Thân chủ".',
    '- Mỗi nhận định quan trọng viết theo 4 lớp: DỮ KIỆN lá số → PHÂN TÍCH → KẾT LUẬN → KHUYẾN NGHỊ hành động cụ thể.',
    '- Không phán tuyệt đối ("chắc chắn", "nhất định", "100%") — chỉ nói xu hướng, mức độ, và hành động.',
    '- Sức khỏe: KHÔNG chẩn đoán bệnh, KHÔNG nói "sẽ chết"/"ung thư"/"đột quỵ" — chỉ "cần chú ý sức khỏe", "nên kiểm tra y tế nếu có triệu chứng".',
    '- Pháp lý/tài chính: mô tả tín hiệu chiêm tinh, không đưa lời khuyên chuyên môn thay luật sư/chuyên gia tài chính.',
    '- Thời điểm tháng là CỬA SỔ kích hoạt mạnh hơn, không phải ngày chắc chắn xảy ra.',
    '- Nếu 2 sự kiện có điểm gần nhau, gọi rõ là "biến động hai chiều"/"hỗn hợp" thay vì chọn 1 chiều.',
    '- Không dùng ngôn ngữ mê tín.',
    '',
    `Người xem: ${name || 'bạn'} · Năm luận: ${pred.targetYear} (${pred.yearCanChi}) · Tuổi (âm): ${pred.targetAge}.`,
    `Độ sôi động chung của năm: ${pred.overallIntensity}.`,
    '',
    '===== SỰ KIỆN ĐÃ CHẤM ĐIỂM (dữ kiện cố định, dùng nguyên) =====',
    eventsTxt || '(không có sự kiện nào nổi bật trong năm này — nói rõ là năm bình ổn, không có biến động lớn được ghi nhận)',
    '',
    '===== CHỦ ĐỀ TỔNG HỢP (gợi ý liên hệ, không thay thế sự kiện riêng) =====',
    compositesTxt,
    '=====',
    '',
    'Viết bằng tiếng Việt, giọng ấm áp như người đồng hành, theo đúng thứ tự:',
    '# Tổng quan năm',
    '# 3–5 chủ đề nổi bật',
    '# Biến cố đáng chú ý (áp dụng đúng khung 4 lớp DỮ KIỆN→PHÂN TÍCH→KẾT LUẬN→KHUYẾN NGHỊ cho MỖI sự kiện có strength ≥ 55)',
    '# Thời điểm cần lưu ý trong năm (dựa đúng cửa sổ tháng đã cho)',
    '# Cơ hội',
    '# Rủi ro / cần lưu ý',
    '# Lời khuyên thực tế cho từng tháng gần nhất (không mang tính tuyệt đối)',
  ].join('\n');
}
