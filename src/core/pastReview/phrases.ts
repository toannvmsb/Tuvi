/**
 * CÂU MÔ TẢ MỐC — "sự kiện có thể đã xảy ra". Bảng câu mẫu (không AI), theo quy tắc viết mốc của đặc tả:
 *  - Thể KHẢ NĂNG ("Có thể bạn đã …"), một năm – một mảng – một hướng, không gộp.
 *  - Không viết cảm xúc chung chung; không gọi tên sự kiện đau buồn: tang sự, đổ vỡ, mất tiền, mất việc,
 *    tranh chấp chỉ nói ở mức MẢNG ĐỜI bằng đúng các câu "Viết" trong bảng giọng văn (đánh dấu `sensitive`).
 *  - Xưng hô trung tính "bạn".
 * Mọi câu ở đây đều được `lint.ts` kiểm trong test (từ cấm, câu "Không viết").
 */
import type { AreaId } from './config';
import type { PastMarker } from './types';

interface Phrase { text: string; sensitive?: boolean }
const P = (text: string, sensitive = false): Phrase => ({ text, sensitive });

/** Phần sau "Có thể bạn đã …". */
export const EVENT_PHRASE: Record<string, Phrase> = {
  // ── Sự nghiệp ──
  CAREER_PROMOTION: P('được giao vị trí cao hơn hoặc thêm quyền hạn trong công việc'),
  CAREER_RESPONSIBILITY_INCREASE: P('gánh thêm trách nhiệm đáng kể trong công việc'),
  CAREER_JOB_CHANGE: P('đổi công việc hoặc chuyển sang nơi làm mới'),
  CAREER_JOB_LOSS: P('có giai đoạn công việc đứt quãng hoặc phải rời chỗ đang làm', true),
  CAREER_ROLE_CHANGE: P('đổi hẳn vai trò đang làm trong cùng nơi công tác'),
  CAREER_INTERNAL_TRANSFER: P('chuyển sang bộ phận hoặc mảng việc khác trong cùng nơi làm'),
  CAREER_NEW_PROJECT: P('bắt đầu một dự án hoặc một công việc hoàn toàn mới'),
  CAREER_LEADERSHIP: P('nhận vai trò dẫn dắt hoặc quản lý người khác'),
  CAREER_BUSINESS_START: P('bắt đầu việc kinh doanh hoặc làm riêng cho mình'),
  CAREER_BUSINESS_EXPANSION: P('mở rộng quy mô công việc kinh doanh đang làm'),
  CAREER_WORK_CONFLICT: P('va chạm đáng kể với người cùng làm việc'),
  CAREER_WORK_PRESSURE: P('thấy khối lượng và yêu cầu công việc tăng mạnh hơn trước'),
  CAREER_RECOGNITION: P('được ghi nhận rõ rệt về năng lực hoặc thành quả công việc'),
  REPUTATION_RECOGNITION: P('được ghi nhận rõ rệt về năng lực hoặc thành quả công việc'),
  CAREER_STAGNATION: P('thấy công việc chững lại, khó tiến thêm một bước'),
  // ── Chỗ ở & di chuyển ──
  MOBILITY_TRAVEL: P('có một chuyến đi xa đáng nhớ'),
  MOBILITY_FREQUENT_TRAVEL: P('đi lại, di chuyển nhiều nơi trong năm'),
  MOBILITY_RELOCATION: P('chuyển nơi ở hoặc nơi sinh sống'),
  PROPERTY_RELOCATION: P('chuyển nơi ở hoặc nơi sinh sống'),
  MOBILITY_OVERSEAS: P('đi nước ngoài hoặc có việc gắn với nước ngoài'),
  MOBILITY_WORK_TRAVEL: P('đi công tác xa hoặc làm việc ở một nơi khác'),
  MOBILITY_ENVIRONMENT_CHANGE: P('đổi hẳn môi trường sống hoặc môi trường làm việc'),
  PROPERTY_PURCHASE: P('mua nhà đất hoặc một tài sản lớn'),
  PROPERTY_SALE: P('bán nhà đất hoặc một tài sản lớn'),
  PROPERTY_RENOVATION: P('sửa chữa hoặc cải tạo nhà cửa'),
  FAMILY_HOME_EVENT: P('có một việc đáng kể liên quan đến nhà cửa hoặc chỗ ở của gia đình'),
  // ── Tình duyên ──
  RELATIONSHIP_NEW: P('quen một người mới theo hướng tình cảm'),
  RELATIONSHIP_DEEPENING: P('thấy một mối quan hệ tình cảm gắn bó hơn rõ rệt'),
  RELATIONSHIP_ENGAGEMENT: P('tiến tới đính hôn hoặc một cam kết tình cảm nghiêm túc'),
  RELATIONSHIP_MARRIAGE: P('kết hôn hoặc lập gia đình'),
  RELATIONSHIP_CONFLICT: P('có va chạm đáng kể trong chuyện tình cảm'),
  RELATIONSHIP_DISTANCE: P('thấy tình cảm xa cách hơn trước'),
  RELATIONSHIP_SEPARATION: P('trải qua thay đổi lớn trong chuyện tình cảm, khó giữ như cũ', true),
  RELATIONSHIP_RECONCILIATION: P('hàn gắn lại một mối quan hệ tình cảm'),
  RELATIONSHIP_SOCIAL_EXPANSION: P('mở rộng đáng kể vòng quan hệ, gặp thêm nhiều người mới'),
  // ── Tài lộc ──
  FINANCE_INCOME_GROWTH: P('thấy thu nhập tăng rõ rệt'),
  FINANCE_BONUS: P('có một khoản thu ngoài dự kiến'),
  FINANCE_WINDFALL: P('có một khoản tiền đến bất ngờ'),
  FINANCE_LARGE_INFLOW: P('có dòng tiền lớn đổ về'),
  FINANCE_LARGE_EXPENSE: P('phải chi một khoản lớn'),
  FINANCE_CASHFLOW_PRESSURE: P('thấy tiền ra vào căng hơn, phải tính toán chặt chẽ hơn'),
  FINANCE_INVESTMENT: P('bắt đầu hoặc đẩy mạnh một khoản đầu tư'),
  FINANCE_INVESTMENT_GAIN: P('có một khoản đầu tư sinh lời'),
  FINANCE_INVESTMENT_LOSS: P('thấy tài lộc hao hụt, dễ mất một khoản đáng kể', true),
  FINANCE_DEBT_INCREASE: P('phải vay mượn hoặc thấy khoản nợ tăng thêm'),
  FINANCE_DEBT_REDUCTION: P('trả bớt hoặc dứt được một khoản nợ'),
  FINANCE_ASSET_ACCUMULATION: P('tích lũy thêm được tài sản đáng kể'),
  FINANCE_FINANCIAL_DISPUTE: P('có vướng mắc tiền bạc với người khác', true),
  PROPERTY_INVESTMENT: P('đầu tư vào bất động sản'),
  PROPERTY_INHERITANCE: P('có một phần tài sản từ gia đình đến với mình'),
  PROPERTY_LARGE_EXPENSE: P('chi một khoản lớn cho nhà cửa hoặc tài sản'),
  // ── Gia đạo ──
  FAMILY_PARENT_EVENT: P('trải qua một năm nặng về gia đạo, phải gánh vác nhiều cho người thân', true),
  FAMILY_SIBLING_EVENT: P('có một việc đáng kể liên quan đến anh chị em'),
  FAMILY_CELEBRATION: P('có việc vui, họp mặt hoặc hiếu hỷ trong nhà'),
  FAMILY_CONFLICT: P('thấy gia đình có bất đồng đáng kể'),
  CHILD_PREGNANCY_SIGNAL: P('có tin vui liên quan đến con cái'),
  CHILD_BIRTH_SIGNAL: P('thấy trong nhà có thêm thành viên mới'),
  CHILD_EDUCATION_EVENT: P('thấy việc học hành của con có bước ngoặt'),
  CHILD_MAJOR_CHANGE: P('thấy cuộc sống của con cái có thay đổi lớn'),
  PROPERTY_FAMILY_ASSET: P('thấy tài sản chung của gia đình có biến động'),
  PROPERTY_DISPUTE: P('gặp chuyện tài sản trong nhà cần phân định cho rõ', true),
};

/** Dự phòng khi mốc không có sự kiện Tử Vi tương ứng — vẫn một hướng cụ thể cho mỗi mảng. */
const AREA_FALLBACK: Record<AreaId, Phrase> = {
  career: P('đổi công việc hoặc vai trò đang làm'),
  home: P('chuyển chỗ ở hoặc đi xa một thời gian'),
  love: P('có một biến động đáng kể trong chuyện tình cảm'),
  wealth: P('thấy dòng tiền có biến động lớn'),
  family: P('có một việc đáng kể trong gia đình cần bạn lo liệu'),
};

export interface MarkerPhrase {
  /** Câu hoàn chỉnh: "Có thể bạn đã …". */
  text: string;
  /** Mốc thuộc nhóm chuyện nhạy cảm (đã viết ở mức mảng đời) — dùng để chỉnh giọng phần Vì sao. */
  sensitive: boolean;
  eventId: string | null;
}

export function describeMarker(m: Pick<PastMarker, 'area' | 'topEventId'>): MarkerPhrase {
  const p = (m.topEventId && EVENT_PHRASE[m.topEventId]) || AREA_FALLBACK[m.area];
  return {
    text: `Có thể bạn đã ${p.text}.`,
    sensitive: !!p.sensitive,
    eventId: m.topEventId && EVENT_PHRASE[m.topEventId] ? m.topEventId : null,
  };
}
