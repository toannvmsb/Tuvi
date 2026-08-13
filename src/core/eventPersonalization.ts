/**
 * CÁ NHÂN HÓA "Sự kiện sắp tới" — KHÔNG dùng AI ở v1. Chỉ ghép lại kết quả của các engine đã
 * có sẵn (Nhật Vận, giờ tốt/xấu, phong thủy theo dụng thần) theo NGÀY xảy ra sự kiện, cho lá số
 * của người dùng. Nếu chưa gắn lá số → `personalizeEvent` trả `null`, UI tự hiện bản chung.
 */
import type { AstrologyResult, FiveElement } from '../types';
import { scoreNhatVan, goodBadHours, type NhatVanScore, type HourWindow } from './nhatVan';
import { elementPhongThuy } from './phongThuyBatTu';

// Vòng ngũ hành cục bộ — theo đúng quy ước hiện có của codebase (mỗi file tự định nghĩa lại,
// xem batTuEngine.ts/phongThuyBatTu.ts), không có helper dùng chung nên không phải nợ kỹ thuật mới.
const SHENG: Record<FiveElement, FiveElement> = { Mộc: 'Hỏa', Hỏa: 'Thổ', Thổ: 'Kim', Kim: 'Thủy', Thủy: 'Mộc' };
const KHAC: Record<FiveElement, FiveElement> = { Mộc: 'Thổ', Thổ: 'Thủy', Thủy: 'Hỏa', Hỏa: 'Kim', Kim: 'Mộc' };

/** Câu mô tả quan hệ ngũ hành giữa hành của sự kiện và dụng thần chính của người dùng. */
function describeElementRelation(eventElement: FiveElement, dungThan: FiveElement): string {
  if (eventElement === dungThan) {
    return `Sự kiện thuộc hành ${eventElement} — trùng dụng thần của bạn, thời điểm thuận lợi, nên tận dụng.`;
  }
  if (SHENG[eventElement] === dungThan) {
    return `Hành ${eventElement} sinh ${dungThan} (dụng thần của bạn) — thời điểm hỗ trợ tốt cho bạn.`;
  }
  if (SHENG[dungThan] === eventElement) {
    return `Dụng thần ${dungThan} của bạn sinh hành ${eventElement} — có hao tổn nhẹ nhưng không đáng ngại.`;
  }
  if (KHAC[eventElement] === dungThan) {
    return `Hành ${eventElement} khắc ${dungThan} (dụng thần của bạn) — nên thận trọng hơn bình thường.`;
  }
  if (KHAC[dungThan] === eventElement) {
    return `Dụng thần ${dungThan} của bạn khắc chế hành ${eventElement} — bạn chủ động kiểm soát tình huống tốt.`;
  }
  return `Hành ${eventElement} và dụng thần ${dungThan} của bạn trung tính, không xung khắc rõ rệt.`;
}

export interface PersonalizedEventAdvice {
  dayScore: NhatVanScore;
  goodHours: HourWindow[];
  badHours: HourWindow[];
  luckyColor: string;
  luckyDirection: string;
  elementNote: string;
}

/**
 * Cá nhân hóa 1 sự kiện đã biết ngày xảy ra (`occursOn`) và hành đại diện (`eventElement`),
 * theo lá số `result`. Trả `null` nếu chưa có lá số — UI hiện bản chung không cá nhân hóa.
 */
export function personalizeEvent(
  result: AstrologyResult | null,
  eventElement: FiveElement,
  occursOn: Date,
): PersonalizedEventAdvice | null {
  if (!result) return null;
  const dayScore = scoreNhatVan(result, occursOn);
  const { good, bad } = goodBadHours(result, occursOn);
  const dungThan = result.batTuChart.favorableElements?.[0];
  const fs = elementPhongThuy(dungThan ?? eventElement);
  return {
    dayScore,
    goodHours: good,
    badHours: bad,
    luckyColor: fs.mau,
    luckyDirection: fs.huong,
    elementNote: dungThan
      ? describeElementRelation(eventElement, dungThan)
      : `Sự kiện thuộc hành ${eventElement}.`,
  };
}
