/**
 * FINANCIAL ADVISOR — box "Gợi ý Tài chính - Đầu tư" ở Home.
 *
 * KHÔNG tính điểm mới: chỉ đọc lại facts đã có từ 2 engine hiện hữu —
 *   - Hôm nay: scoreNhatVan (Nhật Vận — điểm ngày theo Bát Tự/lịch).
 *   - Tháng này: scoreNguyetVan (Nguyệt Vận — taiLoc/thachThuc theo tháng ÂM lịch).
 * và "ADN Tài Chính" (analyzeFinancialDNA) để chọn ĐÚNG chủ đề gợi ý (chiều
 * trội nhất: kiếm tiền/giữ tiền/dòng tiền/đầu tư/đòn bẩy/tích sản/kinh doanh).
 *
 * Nội dung tư vấn CỤ THỂ theo hình thức tài chính đời sống (vàng, tiết kiệm,
 * chứng khoán/quỹ mở, bất động sản, vay vốn, kinh doanh…) nhưng dừng ở mức
 * HÌNH THỨC/NHÓM TÀI SẢN, KHÔNG khuyến nghị mã/tài sản cụ thể — tránh phạm vi
 * tư vấn đầu tư cần giấy phép. "Hôm nay" là hành động ngắn — có thể làm ngay
 * trong ngày; "Tháng này" là định hướng rộng hơn cho cả tháng.
 *
 * Chọn 1 câu/kỳ bằng chỉ số xoay theo kỳ (ngày/tháng) — giống cách
 * `dailyGreeting.ts` chọn câu cố định trong ngày: ổn định trong cùng kỳ,
 * tự đổi khi sang kỳ mới, không cần lưu trạng thái.
 */
import type { AstrologyResult } from '../types';
import { scoreNhatVan } from './nhatVan';
import { scoreNguyetVan } from './nguyetVanScore';
import { analyzeFinancialDNA, type FinancialDNA } from './wealthAnalysis';
import { solarToLunar } from './lunarCalendar';
import { currentAgeOf } from './ageUtil';
import { genericDayScore, buildGenericMonthHeatmap } from './genericMonthHeatmap';

type Tier = 'good' | 'neutral' | 'caution';
type Dominant = 'earn' | 'retain' | 'cashflow' | 'invest' | 'leverage' | 'property' | 'business';

const TIER_LABEL: Record<Tier, string> = { good: 'Thuận', neutral: 'Bình hòa', caution: 'Thận trọng' };

const ADVICE_DAY: Record<Dominant, Record<Tier, string[]>> = {
  earn: {
    good: [
      'Hôm nay hợp đàm phán tăng lương, chốt hợp đồng freelance hoặc nhận thêm việc làm thêm — chủ động đề xuất ngay.',
      'Ngày thuận để gửi báo giá, chốt đơn hàng hoặc thương lượng thù lao — đừng ngại ra giá cao hơn thường lệ.',
    ],
    neutral: [
      'Ngày bình hòa cho thu nhập — cứ hoàn thành công việc thường ngày, chưa cần chủ động đề xuất gì lớn.',
      'Có thể nhận thêm việc nhỏ, nhưng chưa phải lúc đàm phán mức thù lao mới.',
    ],
    caution: [
      'Tránh gửi báo giá hay ký hợp đồng thu nhập quan trọng hôm nay — dễ bị ép giá hoặc hiểu lầm.',
      'Nên hoãn cuộc đàm phán lương/thưởng sang ngày khác, hôm nay dễ bất lợi.',
    ],
  },
  retain: {
    good: [
      'Hôm nay hợp gửi một khoản tiết kiệm kỳ hạn ngắn, hoặc mua vàng tích lũy nếu giá đang tốt.',
      'Ngày tốt để trích một phần thu nhập vào quỹ học tập cho con hoặc quỹ dự phòng gia đình.',
    ],
    neutral: [
      'Có thể xem lại số dư tiết kiệm/vàng đang có, nhưng chưa cần gửi thêm hay bán ra hôm nay.',
      'Ngày bình thường cho việc tích lũy — duy trì kế hoạch đã đặt, không cần thay đổi.',
    ],
    caution: [
      'Hạn chế rút tiết kiệm hoặc bán vàng hôm nay trừ khi thực sự cần thiết — dễ chịu thiệt.',
      'Tránh mua vàng hay tài sản tích trữ lớn hôm nay, giá dễ biến động bất lợi.',
    ],
  },
  cashflow: {
    good: [
      'Hôm nay hợp đòi/thu hồi công nợ, thanh toán hóa đơn hoặc chuyển tiền giữa các tài khoản cho gọn.',
      'Ngày thuận để tất toán một khoản vay ngắn hạn hoặc thu xếp lại dòng tiền kinh doanh.',
    ],
    neutral: [
      'Dòng tiền hôm nay không có gì đặc biệt — thu chi theo kế hoạch bình thường.',
      'Có thể kiểm tra lại các khoản phải thu/phải trả, chưa cần hành động gấp.',
    ],
    caution: [
      'Tránh cho vay, tạm ứng tiền hoặc đứng ra bảo lãnh tài chính cho người khác hôm nay.',
      'Hạn chế rút tiền mặt lớn hôm nay, dễ phát sinh chi phí không đáng có.',
    ],
  },
  invest: {
    good: [
      'Hôm nay hợp mua vàng nếu giá đang thuận, hoặc giải ngân thêm vào quỹ đầu tư đang theo dõi.',
      'Ngày tốt để chốt lời một phần danh mục chứng khoán/quỹ mở đang có lãi.',
    ],
    neutral: [
      'Có thể theo dõi thêm diễn biến giá vàng/chứng khoán, chưa cần vào lệnh mới hôm nay.',
      'Ngày bình hòa cho đầu tư — giữ nguyên vị thế hiện có, quan sát thêm.',
    ],
    caution: [
      'Tránh mua vào hoặc giải ngân thêm hôm nay — dễ vào sai thời điểm, nên chờ tín hiệu rõ hơn.',
      'Nếu đang có lãi, có thể cân nhắc chốt bớt để phòng thủ, tránh mua thêm hôm nay.',
    ],
  },
  leverage: {
    good: [
      'Hôm nay hợp làm hồ sơ vay vốn ngân hàng hoặc đàm phán hạn mức tín dụng để mở rộng kinh doanh.',
      'Ngày thuận để gặp đối tác góp vốn hoặc bàn chuyện huy động thêm nguồn lực.',
    ],
    neutral: [
      'Có thể tìm hiểu lãi suất vay, nhưng chưa cần ký hồ sơ vay vốn hôm nay.',
      'Ngày bình thường — giữ nguyên cơ cấu vốn, chưa cần vay thêm hay trả trước.',
    ],
    caution: [
      'Tránh ký hợp đồng vay vốn hoặc đứng ra bảo lãnh tài chính lớn hôm nay.',
      'Nên hoãn việc dùng đòn bẩy (vay, thế chấp) sang thời điểm khác.',
    ],
  },
  property: {
    good: [
      'Hôm nay hợp đi xem đất/nhà, đặt cọc hoặc đàm phán giá cho một giao dịch bất động sản đang theo đuổi.',
      'Ngày tốt để ký hợp đồng thuê/cho thuê hoặc hoàn tất thủ tục sang tên tài sản.',
    ],
    neutral: [
      'Có thể tìm hiểu thông tin dự án/giá đất khu vực quan tâm, chưa cần đặt cọc hôm nay.',
      'Ngày bình thường cho bất động sản — chưa có tín hiệu đặc biệt để hành động.',
    ],
    caution: [
      'Tránh đặt cọc hoặc ký hợp đồng mua bán bất động sản hôm nay.',
      'Nên hoãn các cuộc đàm phán giá nhà đất quan trọng sang ngày khác.',
    ],
  },
  business: {
    good: [
      'Hôm nay hợp ký hợp đồng hợp tác, chốt đơn hàng lớn hoặc ra mắt sản phẩm/dịch vụ mới.',
      'Ngày thuận để gặp đối tác/khách hàng quan trọng, đàm phán điều khoản hợp tác.',
    ],
    neutral: [
      'Vận hành kinh doanh bình thường hôm nay, chưa cần quyết định mở rộng hay ký kết mới.',
      'Có thể lên kế hoạch, nhưng chưa nên triển khai hoạt động kinh doanh mới hôm nay.',
    ],
    caution: [
      'Tránh ký hợp đồng hợp tác quan trọng hoặc ra mắt sản phẩm mới hôm nay.',
      'Nên hoãn các quyết định kinh doanh lớn, tập trung xử lý việc thường nhật.',
    ],
  },
};

const ADVICE_MONTH: Record<Dominant, Record<Tier, string[]>> = {
  earn: {
    good: [
      'Tháng thuận để chủ động xin tăng lương, chuyển việc hoặc nhận thêm dự án dài hạn tăng thu nhập.',
      'Tháng này phù hợp đàm phán lại mức thù lao hoặc tìm thêm nguồn thu nhập phụ.',
    ],
    neutral: [
      'Thu nhập tháng này ổn định — tập trung hoàn thành tốt công việc hiện có, chưa cần thay đổi lớn.',
      'Tháng bình hòa, phù hợp duy trì nhịp làm việc, để dành các quyết định lớn cho tháng sau.',
    ],
    caution: [
      'Tháng này không thuận để đàm phán thu nhập hay chuyển việc — nên chờ thêm.',
      'Nên thận trọng với các cam kết thu nhập dài hạn trong tháng này.',
    ],
  },
  retain: {
    good: [
      'Tháng thuận để mở thêm một sổ tiết kiệm kỳ hạn dài hoặc tăng tỷ lệ trích lập quỹ học tập cho con.',
      'Phù hợp rà soát và tối ưu lại toàn bộ quỹ dự phòng, tiết kiệm trong tháng này.',
    ],
    neutral: [
      'Duy trì kế hoạch tiết kiệm hiện tại, tháng này chưa cần điều chỉnh lớn.',
      'Có thể xem lại ngân sách chi tiêu tháng, chưa cần thay đổi tỷ lệ để dành.',
    ],
    caution: [
      'Tháng này nên hạn chế các khoản chi lớn, ưu tiên giữ tiền mặt và quỹ dự phòng.',
      'Tránh rút tiết kiệm dài hạn trong tháng này trừ khi thật cần thiết.',
    ],
  },
  cashflow: {
    good: [
      'Tháng thuận để tái cơ cấu dòng tiền: thu hồi công nợ, đảo nợ hoặc luân chuyển vốn giữa các khoản.',
      'Phù hợp rà soát lại toàn bộ thu-chi trong tháng, tối ưu dòng tiền cho tháng tới.',
    ],
    neutral: [
      'Dòng tiền tháng này ổn định, cứ theo kế hoạch thu chi đã định.',
      'Tháng bình hòa — chưa có tín hiệu cần điều chỉnh dòng tiền lớn.',
    ],
    caution: [
      'Tháng này nên giữ khoản dự phòng thanh khoản cao hơn bình thường, tránh dồn vốn vào một chỗ.',
      'Hạn chế cho vay hoặc đứng ra bảo lãnh tài chính lớn trong tháng này.',
    ],
  },
  invest: {
    good: [
      'Tháng thuận để giải ngân thêm vào kênh đầu tư đang theo dõi (vàng, chứng khoán, quỹ mở) hoặc tái cân bằng danh mục.',
      'Phù hợp tìm hiểu và mở vị thế mới cho một kênh đầu tư dài hạn trong tháng này.',
    ],
    neutral: [
      'Tháng này phù hợp tìm hiểu thông tin, chưa cần vào lệnh hay giải ngân lớn.',
      'Có thể theo dõi thêm biến động thị trường trong tháng, giữ nguyên danh mục hiện tại.',
    ],
    caution: [
      'Tháng này nên hạn chế giải ngân thêm — nếu đang có lãi, cân nhắc chốt bớt để phòng thủ.',
      'Chưa phải lúc mở vị thế đầu tư mới trong tháng này, nên chờ thêm.',
    ],
  },
  leverage: {
    good: [
      'Tháng thuận để làm hồ sơ vay vốn mở rộng kinh doanh hoặc đầu tư dài hạn.',
      'Phù hợp đàm phán với ngân hàng/đối tác để thu xếp nguồn vốn quy mô lớn hơn trong tháng.',
    ],
    neutral: [
      'Có thể tìm hiểu các gói vay, nhưng chưa cần ký kết ngay trong tháng này.',
      'Giữ nguyên cơ cấu vốn hiện tại trong tháng này là hợp lý.',
    ],
    caution: [
      'Tháng này nên hạn chế vay nợ hoặc dùng đòn bẩy tài chính lớn.',
      'Nên hoãn các khoản vay/thế chấp lớn sang tháng sau.',
    ],
  },
  property: {
    good: [
      'Tháng thuận để tìm hiểu kỹ và xuống tiền cho một giao dịch bất động sản đang cân nhắc.',
      'Phù hợp đi khảo sát nhiều dự án/khu vực, đàm phán giá trong tháng này.',
    ],
    neutral: [
      'Có thể tìm hiểu thêm thông tin bất động sản trong tháng, chưa cần chốt giao dịch.',
      'Tháng bình thường cho tài sản — rà soát lại danh mục hiện có là đủ.',
    ],
    caution: [
      'Tháng này nên hoãn các giao dịch bất động sản lớn, chờ thời điểm thuận hơn.',
      'Tránh đặt cọc hoặc ký hợp đồng mua bán nhà đất quan trọng trong tháng này.',
    ],
  },
  business: {
    good: [
      'Tháng thuận để triển khai kế hoạch kinh doanh mới, mở rộng quy mô hoặc ký hợp tác chiến lược.',
      'Phù hợp ra mắt sản phẩm/dịch vụ mới hoặc mở thêm kênh bán hàng trong tháng này.',
    ],
    neutral: [
      'Duy trì vận hành hiện tại trong tháng, có thể lên kế hoạch cho các bước tiếp theo.',
      'Tháng bình hòa cho kinh doanh — chưa cần quyết định mở rộng lớn.',
    ],
    caution: [
      'Tháng này nên tạm hoãn mở rộng kinh doanh, tập trung ổn định vận hành.',
      'Tránh ký kết hợp tác lớn hoặc đầu tư mở rộng trong tháng này.',
    ],
  },
};

function dayTierOf(rating: string): Tier {
  if (rating === 'Rất tốt' || rating === 'Tốt') return 'good';
  if (rating === 'Bình thường') return 'neutral';
  return 'caution'; // Cần thận trọng | Xấu
}

function monthTierOf(rating: string): Tier {
  if (rating === 'Rất tốt' || rating === 'Tốt' || rating === 'Khá') return 'good';
  if (rating === 'Trung bình') return 'neutral';
  return 'caution'; // Nhiều thách thức
}

function dominantSeed(d: Dominant): number {
  let h = 0;
  for (let i = 0; i < d.length; i++) h += d.charCodeAt(i);
  return h;
}

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86400000);
}

function pick(list: string[], seed: number): string {
  return list[((seed % list.length) + list.length) % list.length];
}

function withRiskNote(text: string, dna: FinancialDNA): string {
  if (dna.riskLevel !== 'cao') return text;
  return `${text} Lưu ý: rủi ro tài chính của bạn hiện ở mức cao — nên có quỹ dự phòng trước khi hành động.`;
}

export interface FinancialAdviceItem {
  label: string;
  periodKey: string;   // khóa đổi kỳ (ngày ISO / tháng âm) — để UI biết khi nào sang kỳ mới
  rating: string;
  tier: Tier;
  tierLabel: string;
  text: string;
}

export interface FinancialAdviceBundle {
  day: FinancialAdviceItem;
  month: FinancialAdviceItem | null;
}

export function buildFinancialAdvice(result: AstrologyResult, date: Date = new Date()): FinancialAdviceBundle {
  const dna = analyzeFinancialDNA(result);
  const dominant = dna.dominant as Dominant;
  const age = currentAgeOf(result, date);
  const ld = solarToLunar(date.getDate(), date.getMonth() + 1, date.getFullYear());
  const seedBase = dominantSeed(dominant);

  // 1) Hôm nay — Nhật Vận.
  const dayScore = scoreNhatVan(result, date);
  const dTier = dayTierOf(dayScore.rating);
  const isoDay = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  const day: FinancialAdviceItem = {
    label: 'Hôm nay',
    periodKey: isoDay,
    rating: dayScore.rating,
    tier: dTier,
    tierLabel: TIER_LABEL[dTier],
    text: withRiskNote(pick(ADVICE_DAY[dominant][dTier], dayOfYear(date) + seedBase), dna),
  };

  // 2) Tháng này — Nguyệt Vận (theo tháng ÂM lịch hiện tại).
  let month: FinancialAdviceItem | null = null;
  const monthSc = scoreNguyetVan(result, age, ld.month);
  if (monthSc) {
    const mTier = monthTierOf(monthSc.rating);
    month = {
      label: 'Tháng này',
      periodKey: `${date.getFullYear()}-m${ld.month}`,
      rating: monthSc.rating,
      tier: mTier,
      tierLabel: TIER_LABEL[mTier],
      text: withRiskNote(pick(ADVICE_MONTH[dominant][mTier], ld.month * 7 + seedBase), dna),
    };
  }

  return { day, month };
}

/**
 * Bản KHÔNG cá nhân hóa của `buildFinancialAdvice` — dùng cho box "Gợi ý tài
 * chính" ở Home khi người dùng CHƯA gắn lá số nào. Không có Bát Tự/ADN Tài
 * Chính để chọn "dominant" (kiếm tiền/giữ tiền/dòng tiền/...) nên cố định
 * dùng nhóm 'cashflow' (quản lý dòng tiền) — chủ đề trung lập, phù hợp với
 * mọi người, không thiên về cá nhân nào. Rating NGÀY dùng chung công thức
 * quan hệ Can-Chi đã có ở `genericMonthHeatmap.ts` (không tính lại); rating
 * THÁNG suy từ điểm trung bình heatmap tháng dương hiện tại.
 */
export function buildGenericFinancialAdvice(date: Date = new Date()): FinancialAdviceBundle {
  const dominant: Dominant = 'cashflow';
  const seedBase = dominantSeed(dominant);

  const { rating: dayRating } = genericDayScore(date);
  const dTier = dayTierOf(dayRating);
  const isoDay = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  const day: FinancialAdviceItem = {
    label: 'Hôm nay',
    periodKey: isoDay,
    rating: dayRating,
    tier: dTier,
    tierLabel: TIER_LABEL[dTier],
    text: pick(ADVICE_DAY[dominant][dTier], dayOfYear(date) + seedBase),
  };

  const genMonth = buildGenericMonthHeatmap(date);
  const mTier: Tier = genMonth.stats.avgScore >= 60 ? 'good' : genMonth.stats.avgScore >= 45 ? 'neutral' : 'caution';
  const mRating = mTier === 'good' ? 'Khá' : mTier === 'neutral' ? 'Bình thường' : 'Cần thận trọng';
  const month: FinancialAdviceItem = {
    label: 'Tháng này',
    periodKey: `${genMonth.year}-m${genMonth.month}`,
    rating: mRating,
    tier: mTier,
    tierLabel: TIER_LABEL[mTier],
    text: pick(ADVICE_MONTH[dominant][mTier], genMonth.month * 7 + seedBase),
  };

  return { day, month };
}
