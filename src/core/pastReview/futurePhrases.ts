/**
 * Lời văn cho LUẬN TƯƠNG LAI (mẫu, không AI). Ở thể XU HƯỚNG, không phán chắc:
 *  - năm thường: "Có thể bạn sẽ …" (dùng lại câu sự kiện của Nghiệm quá khứ, đổi "đã" → "sẽ");
 *  - năm thuộc nhóm nhạy cảm (tang sự, đổ vỡ, mất tiền…): KHÔNG gọi tên sự kiện, chỉ nói "năm cần để tâm hơn đến mảng …";
 *  - mỗi năm kèm MỘT gợi ý hành động cụ thể (cơ hội nếu điểm có dấu ≥ 0, chuẩn bị nếu < 0) — đúng khung "Dữ kiện → Kết luận → Khuyến nghị".
 */
import { AREA_LABEL, type AreaId } from './config';
import { describeMarker } from './phrases';
import type { FutureMarker } from './futureReview';

export interface FutureMarkerPhrase {
  text: string;
  sensitive: boolean;
  /** Gợi ý hành động. */
  advice: string;
}

const OPPORTUNITY: Record<AreaId, string> = {
  career: 'Nên chủ động đề xuất ý tưởng, cập nhật kỹ năng và nhận những việc giúp bạn được nhìn thấy.',
  home: 'Nếu có kế hoạch về chỗ ở hay đi lại, đây là lúc nên tìm hiểu kỹ và chuẩn bị giấy tờ để đi nhanh khi cơ hội đến.',
  love: 'Nên mở lòng với các mối quan hệ mới, dành thời gian chất lượng cho người thân thiết và nói rõ mong muốn của mình.',
  wealth: 'Nên đặt mục tiêu thu nhập cụ thể, thử một nguồn thu mới nhỏ và ghi lại chi tiêu để giữ được thành quả.',
  family: 'Nên sắp xếp thời gian sum họp, chia sẻ việc nhà và cùng người thân lên kế hoạch cho những việc chung.',
};

const PREPARE: Record<AreaId, string> = {
  career: 'Nên rà lại kế hoạch công việc, giữ liên lạc với người có thể hỗ trợ và tránh quyết định lớn khi đang căng thẳng.',
  home: 'Nên chuẩn bị sớm giấy tờ, chi phí và phương án dự phòng nếu có thay đổi về chỗ ở hay đi lại.',
  love: 'Nên trò chuyện thẳng thắn, giữ nhịp sống ổn định và tránh quyết định vội khi cảm xúc đang dâng.',
  wealth: 'Nên rà soát các khoản chi lớn, giữ quỹ dự phòng và cân nhắc kỹ trước khi đầu tư hay cho vay.',
  family: 'Nên chủ động hỏi thăm, dành thời gian cho người thân và chuẩn bị tinh thần cho những việc cần bàn bạc trong nhà.',
};

export function adviceFor(area: AreaId, signed: number): string {
  return signed >= 0 ? OPPORTUNITY[area] : PREPARE[area];
}

export function describeFutureMarker(m: Pick<FutureMarker, 'area' | 'topEventId' | 'signed'>): FutureMarkerPhrase {
  const p = describeMarker(m);
  const text = p.sensitive
    ? `Năm này cần để tâm hơn đến mảng ${AREA_LABEL[m.area].toLowerCase()}.`
    : p.text.replace(/^Có thể bạn đã /, 'Có thể bạn sẽ ');
  return { text, sensitive: p.sensitive, advice: adviceFor(m.area, m.signed) };
}
