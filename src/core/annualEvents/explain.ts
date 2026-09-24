/**
 * "Vì sao Tuzi luận như vậy?" — biến bằng chứng thô (rule id, sao, cung, tầng) thành câu phân
 * tích đọc được, theo khung DỮ KIỆN → PHÂN TÍCH → KẾT LUẬN của app (CLAUDE.md §2.4), KHÔNG dùng
 * nhãn kỹ thuật (level/confidence) — những nhãn đó chỉ dùng nội bộ để xếp hạng/quyết định hiển thị.
 */
import type { EvidenceItem, MonthWindow, ScoredEvent } from './types';
import { categoryTitleOf } from './eventTitles';
import { LAYER_VN, EVENT_PHASE_VN } from './labels';
import { meaningOf } from './signalMeaning';
import { PALACE_CODE_TO_VN } from './calendar';

/** 1 dòng DỮ KIỆN + Ý NGHĨA cho 1 bằng chứng — vd "Lưu Hóa Lộc tại cung Tài Bạch (lưu niên): mở ra cơ hội…". */
function evidenceLine(e: EvidenceItem): string {
  return `**${e.starName}** tại cung ${PALACE_CODE_TO_VN[e.palace] ?? e.palace} (${LAYER_VN[e.source]}) — ${meaningOf(e.signalType)}`;
}

export interface EventExplanation {
  facts: string[];       // DỮ KIỆN + ý nghĩa từng dữ kiện chính
  analysis: string;      // PHÂN TÍCH — tổng hợp các dữ kiện thành 1 mạch
  conclusion: string;    // KẾT LUẬN — bằng ngôn ngữ thường, không dùng nhãn kỹ thuật
  caution?: string;      // dữ kiện ngược chiều, nếu có
}

/** Cần ≥ 2 dữ kiện cho mỗi kết luận quan trọng (CLAUDE.md §2.4). */
export function explainEvent(e: ScoredEvent): EventExplanation {
  const top = [...e.evidence].sort((a, b) => b.contribution - a.contribution).slice(0, 5);
  const facts = top.map(evidenceLine);
  const cat = categoryTitleOf(e.category).toLowerCase();

  const layerSet = new Set(top.map(x => LAYER_VN[x.source]));
  const layerTxt = [...layerSet].join(', ');
  const analysis = facts.length >= 2
    ? `Nhiều dữ kiện ở các tầng ${layerTxt} cùng hội tụ vào trục ${cat} của lá số — không phải chỉ 1 sao đơn lẻ, nên xu hướng này có cơ sở để lưu ý trong năm.`
    : facts.length === 1
      ? `Hiện chỉ có 1 dữ kiện rõ rệt ở trục ${cat} — xu hướng còn nhẹ, chưa đủ để coi là chắc chắn.`
      : `Chưa ghi nhận dữ kiện nổi bật nào ở trục ${cat} trong năm này.`;

  const conclusion = e.direction === 'POSITIVE'
    ? `Xu hướng ${cat} nghiêng về thuận lợi — nên chủ động tận dụng giai đoạn này.`
    : e.direction === 'NEGATIVE'
      ? `Xu hướng ${cat} cần thận trọng hơn — nên chuẩn bị phương án dự phòng thay vì chủ quan.`
      : `Xu hướng ${cat} có cả mặt thuận lợi lẫn áp lực đi cùng nhau — nên cân nhắc kỹ trước quyết định lớn, không nên chỉ nhìn một chiều.`;

  const caution = e.counterEvidence.length
    ? `Vẫn có ${e.counterEvidence.length} dữ kiện đi ngược chiều kết luận trên (${e.counterEvidence.slice(0, 2).map(c => c.starName).join(', ')}) — không nên tuyệt đối hóa theo một hướng.`
    : undefined;

  return { facts, analysis, conclusion, caution };
}

/** Câu giải thích "vì sao đúng tháng này" cho 1 cửa sổ tháng — dựa trên sao lưu (lưu nguyệt) đã kích hoạt. */
export function explainMonthWindow(w: MonthWindow): string {
  const label = w.startLunarMonth === w.endLunarMonth || !w.isUniquePeak
    ? (w.startLunarMonth === w.endLunarMonth ? `Tháng ${w.startLunarMonth}` : `Khoảng tháng ${w.startLunarMonth}–${w.endLunarMonth}`)
    : `Tháng ${w.startLunarMonth}`;
  const phaseTxt = EVENT_PHASE_VN[w.phase] ? ` — ${EVENT_PHASE_VN[w.phase]}` : '';
  if (w.drivers.length === 0) {
    return `${label} âm lịch: điểm kích hoạt cao hơn mặt bằng chung của năm${phaseTxt}, nhưng chưa tách được rõ sao lưu nào là chính.`;
  }
  const names = w.drivers.map(d => `${d.starName}${d.palace ? ` (cung ${PALACE_CODE_TO_VN[d.palace] ?? d.palace})` : ''}`).join(', ');
  return `${label} âm lịch${phaseTxt}: vì có ${names} cùng hội tụ vào trục sự kiện trong lưu nguyệt tháng này.`;
}
