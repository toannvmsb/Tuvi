/**
 * TÓM TẮT cho kết quả Phân tích AI (Toàn lá số / Đại vận / Tiểu vận / Nguyệt vận).
 *
 * Tóm tắt được rút ra TỪ CHÍNH bản phân tích chi tiết đã có (không tính lại lá số) nên luôn
 * khớp với phần chi tiết bên dưới. Gọi AI qua cùng lối vào chung của app (proxy / BYOK / dự phòng)
 * mà không sửa prompt phân tích nào trong utils/aiAnalysis.ts.
 */
import type { AstrologyResult } from '../types';
import type { AIKeys } from './aiAnalysis';
import { requestAnnualEventsNarrative } from './aiAnalysis';

export type SummaryKind = 'chart' | 'dv' | 'tv' | 'nv';

const MAX_DETAIL_CHARS = 42000;

const COMMON_RULES =
  'Bạn là chuyên gia Tử Vi Nam Phái (hệ thống Lê Quang Lăng kết hợp phương pháp luận Diệu Xuân). ' +
  'Nhiệm vụ: viết bản TÓM TẮT cô đọng từ bản phân tích chi tiết được cung cấp bên dưới. ' +
  '★ CHỈ dùng thông tin có trong bản phân tích; KHÔNG thêm sao, cách cục, điểm số hay sự kiện mới; thiếu dữ liệu thì bỏ qua mục đó hoặc ghi "chưa đủ dữ liệu". ' +
  '★ TUYỆT ĐỐI KHÔNG nhắc "Mệnh chủ" / "Thân chủ". Tuần/Triệt chỉ nói đúng cung mà bản phân tích ghi nhận, không lan sang tam hợp/nhị hợp. ' +
  '★ KHÔNG phán đoán tuyệt đối ("chắc chắn", "định mệnh"); chỉ nói xu hướng, mức thuận lợi/rủi ro và khuyến nghị hành động cụ thể, làm được ngay. ' +
  '★ KHÔNG dự đoán sự kiện cụ thể vào ngày cụ thể; KHÔNG lời khuyên y tế/tài chính/pháp lý cụ thể. KHÔNG ngôn ngữ mê tín. ' +
  'Định dạng: tiếng Việt mạch lạc; tiêu đề dạng "# Tên mục"; ý dạng gạch đầu dòng "- " ngắn gọn (mỗi ý 1–2 câu); KHÔNG bảng markdown, KHÔNG ký hiệu | hay ---; ' +
  'KHÔNG chào hỏi mở đầu; tổng độ dài khoảng 300–450 từ, viết TRỌN VẸN và kết thúc hoàn chỉnh.';

const TEMPLATE: Record<SummaryKind, string> = {
  chart:
    'Cấu trúc bắt buộc, theo đúng thứ tự: ' +
    '"# Tóm tắt lá số" (1–2 câu: Bản Mệnh, Cục, chính tinh tọa thủ cung Mệnh/Thân); ' +
    '"# Cốt cách & tính cách" (2–3 ý); ' +
    '"# Điểm mạnh nổi bật" (3 ý, mỗi ý nêu rõ dựa trên cung/sao nào); ' +
    '"# Điểm cần lưu ý" (3 ý); ' +
    '"# Bức tranh các mảng đời" (4 ý: Sự nghiệp, Tài lộc, Tình duyên – hôn nhân, Sức khỏe — mỗi mảng 1 câu xu hướng); ' +
    '"# Giai đoạn đang đi" (1–2 ý về đại vận hiện tại nếu bản phân tích có nói); ' +
    '"# 3 khuyến nghị hành động" (đánh số 1–3).',
  dv:
    'Cấu trúc bắt buộc, theo đúng thứ tự: ' +
    '"# Tóm tắt đại vận" (1–2 câu: khoảng tuổi, Can Chi, cung đóng, tính chất chung tốt/xấu); ' +
    '"# Chủ đề chính của 10 năm" (2–3 ý); ' +
    '"# Cơ hội nổi bật" (3 ý); ' +
    '"# Rủi ro cần phòng" (3 ý); ' +
    '"# Nhịp các giai đoạn trong đại vận" (2–3 ý nếu bản phân tích có chia giai đoạn); ' +
    '"# 3 việc nên làm" (đánh số 1–3, cụ thể, hành động được ngay).',
  tv:
    'Cấu trúc bắt buộc, theo đúng thứ tự: ' +
    '"# Tóm tắt tiểu vận" (1–2 câu: năm, cung tiểu hạn, sắc thái chung của năm); ' +
    '"# Trọng tâm của năm" (2–3 ý, gắn với đại vận đang đi); ' +
    '"# Cơ hội nên nắm" (3 ý); ' +
    '"# Điều cần thận trọng" (3 ý); ' +
    '"# Các tháng đáng chú ý" (1–2 ý nếu bản phân tích có nêu tháng); ' +
    '"# Kế hoạch hành động cho năm" (đánh số 1–3).',
  nv:
    'Cấu trúc bắt buộc, theo đúng thứ tự: ' +
    '"# Tóm tắt nguyệt vận" (1–2 câu: tháng, cung lưu nguyệt, sắc thái chung; nhắc tháng này KÍCH HOẠT phần nào của đại vận và tiểu vận, không phải dự đoán số mệnh); ' +
    '"# Nên đẩy mạnh" (2–3 ý); ' +
    '"# Nên thận trọng" (2–3 ý); ' +
    '"# 3 việc nên làm trong tháng" (đánh số 1–3, cụ thể).',
};

/** Dấu vân tay nhẹ của bản chi tiết — để biết tóm tắt đã lưu còn khớp bản chi tiết hiện tại không. */
export function detailSignature(detail: string): string {
  const t = detail || '';
  let h = 0;
  for (let i = 0; i < t.length; i += 7) h = (h * 31 + t.charCodeAt(i)) | 0;
  return `${t.length}:${(h >>> 0).toString(36)}`;
}

export async function summarizeAnalysisWithAI(kind: SummaryKind, detail: string, result: AstrologyResult): Promise<string> {
  const body = (detail || '').trim();
  if (!body) throw new Error('Chưa có bản phân tích để tóm tắt.');
  const clipped = body.length > MAX_DETAIL_CHARS ? body.slice(0, MAX_DETAIL_CHARS) + '\n…' : body;
  const prompt =
    `${COMMON_RULES}\n\n${TEMPLATE[kind]}\n\n` +
    `===== BẢN PHÂN TÍCH CHI TIẾT (nguồn duy nhất để tóm tắt) =====\n${clipped}\n===== HẾT =====`;
  const keys: AIKeys = {
    anthropicApiKey: result.birthInfo.anthropicApiKey,
    openaiApiKey: result.birthInfo.openaiApiKey,
    aiProvider: result.birthInfo.aiProvider,
  };
  const text = (await requestAnnualEventsNarrative(prompt, keys)).trim();
  if (!text) throw new Error('AI chưa trả về nội dung tóm tắt.');
  return text;
}
