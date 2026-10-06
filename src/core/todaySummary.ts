/**
 * Tóm tắt "NGÀY HÔM NAY" cho màn Home.
 *  - Có lá số (đã gắn): dùng dụng/kỵ thần + tuổi để đưa lời khuyên cá nhân hóa.
 *      Tuổi <25 → ưu tiên học hành; 25–60 → công việc; >60 → sức khỏe.
 *  - Chưa có lá số: đánh giá ngày tốt/xấu theo phong thủy chung + lời khuyên chung.
 */
import type { AstrologyResult } from '../types';
import { dayCanChi, scoreNhatVan, goodBadHours, genericDayFacts, type HourWindow } from './nhatVan';
import { elementPhongThuy } from './phongThuyBatTu';
import { currentAgeOf } from './ageUtil';

export interface TodaySummary {
  hasChart: boolean;
  weekday: string;
  dateLabel: string;
  canChiLabel: string;
  rating: string;       // Rất tốt | Tốt | Khá | Bình thường | Cần thận trọng | Xấu
  good: string[];       // các dòng "Nên"
  bad: string[];        // các dòng "Hạn chế"
  goodHours: string[];  // các khung giờ tốt — "Mão (5h–7h)"
  badHours: string[];   // các khung giờ xấu
  encourage?: string;   // câu động viên khi ngày không đẹp
}

const hrLabel = (h: HourWindow) => `${h.branch} (${h.range})`;

/** Câu động viên (random) khi ngày không đẹp — nhắc người dùng quyết định mới là điều quyết định. */
const ENCOURAGE: string[] = [
  'Ngày không đẹp theo phong thủy, nhưng một quyết định đúng của bạn mới là điều tốt đẹp nhất.',
  'Vận chỉ là gợi ý — chính sự bình tĩnh và lựa chọn sáng suốt của bạn làm nên ngày tốt.',
  'Ngày khó không có nghĩa việc khó; cẩn trọng một chút là bạn vẫn vượt qua nhẹ nhàng.',
  'Phong thủy chỉ vẽ thời tiết, còn tay lái vẫn ở trong tay bạn.',
  'Hôm nay hãy đi chậm mà chắc — sự kiên nhẫn của bạn sẽ được đền đáp.',
  'Ngày cần thận trọng là ngày để bạn thể hiện bản lĩnh giữ mình.',
  'Không có ngày nào toàn xấu nếu bạn giữ được tâm an và đầu óc tỉnh táo.',
  'Chậm lại một nhịp hôm nay để tiến nhanh hơn vào ngày mai.',
  'Điều tốt nhất bạn có thể làm hôm nay là tránh sai lầm không đáng có.',
  'Giữ thiện tâm và sự điềm tĩnh — đó là lá bùa hộ mệnh tốt nhất cho mọi ngày.',
];
const pickEncourage = () => ENCOURAGE[Math.floor(Math.random() * ENCOURAGE.length)];
/** Câu khuyên khi ngày thuận lợi — luôn kèm nhắc cân nhắc/chuẩn bị (không hứa chắc kết quả). */
const ENCOURAGE_GOOD: string[] = [
  'Ngày thuận lợi — hãy dành giờ tốt cho việc quan trọng nhất, và vẫn cân nhắc kỹ trước khi quyết.',
  'Nhịp ngày đang ủng hộ bạn: chủ động một chút, nhưng đừng bỏ qua bước kiểm tra lại.',
  'Thuận lợi chỉ là gợi ý, không phải bảo chứng — sự chuẩn bị chu đáo mới tạo nên kết quả.',
  'Hôm nay hợp để bắt đầu việc bạn đã suy nghĩ kỹ; chọn một việc và làm cho trọn.',
  'Ngày tốt để kết nối và hợp tác — một lời hỏi thăm chân thành có thể mở ra điều hay.',
  'Tận dụng đà thuận lợi để hoàn thành việc còn dang dở trước khi mở thêm việc mới.',
];

/** Câu khuyên khi ngày bình thường. */
const ENCOURAGE_NORMAL: string[] = [
  'Ngày bình ổn — hợp làm đều tay, hoàn thiện việc đang có và giữ nhịp đều.',
  'Không quá thuận cũng không trở ngại: chọn việc nhỏ, làm chắc từng bước.',
  'Một ngày để sắp xếp lại: dọn việc tồn đọng, chuẩn bị cho những ngày thuận lợi hơn.',
  'Ngày bình thường là dịp rèn thói quen tốt — sự đều đặn bền hơn những cú bứt phá.',
];

/**
 * Câu động viên/khuyên nhủ của NGÀY theo điểm vận khí (0–100), dùng cho lời chào ở Tổng quan.
 * Cố định theo ngày (không đổi mỗi lần vẽ lại); giọng theo rule của app: xu hướng + hành động, không phán tuyệt đối.
 */
export function dailyMessage(score100: number, date: Date = new Date()): string {
  const list = score100 >= 65 ? ENCOURAGE_GOOD : score100 >= 50 ? ENCOURAGE_NORMAL : ENCOURAGE;
  const dayOfYear = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 86400000);
  return list[dayOfYear % list.length];
}

const isRough = (rating: string) => rating === 'Cần thận trọng' || rating === 'Xấu';

const WEEKDAY = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

const firstPart = (s: string) => (s || '').split(';')[0].split(',').slice(0, 1).join('').trim();
const shortList = (s: string, n = 3) => (s || '').split(',').slice(0, n).map(x => x.trim()).join(', ');

function workLineGood(age: number, goodDay: boolean): string {
  if (age > 0 && age < 25) {
    return goodDay
      ? 'Học hành – thi cử – nghiên cứu: thuận, nên nộp hồ sơ, đăng ký khóa học, ôn thi.'
      : 'Việc học: ưu tiên ôn tập, củng cố kiến thức nhẹ nhàng.';
  }
  if (age >= 25 && age <= 60) {
    return goodDay
      ? 'Công việc: thuận ký kết, gặp đối tác, khai trương, chốt việc quan trọng.'
      : 'Công việc: làm việc thường ngày, hoàn thiện việc dang dở.';
  }
  if (age > 60) {
    return goodDay
      ? 'Sức khỏe – an vui: hợp đi bộ, dưỡng sinh, gặp gỡ con cháu, du ngoạn nhẹ.'
      : 'Sức khỏe: nghỉ ngơi điều độ, vận động nhẹ, giữ tinh thần thư thái.';
  }
  return goodDay ? 'Thuận cho việc quan trọng, gặp gỡ, khởi sự.' : 'Làm việc thường ngày, chưa vội khởi sự lớn.';
}

function workLineBad(age: number, badDay: boolean): string {
  if (age > 0 && age < 25) return 'Tránh lơ là việc học, sa đà giải trí, thức khuya.';
  if (age >= 25 && age <= 60) return badDay
    ? 'Tránh ký kết / đầu tư lớn, đứng ra bảo lãnh, quyết định vội.'
    : 'Chưa nên khởi sự lớn nếu chưa chắc chắn.';
  if (age > 60) return 'Tránh gắng sức, đi xa mệt mỏi, xúc động mạnh.';
  return 'Tránh quyết định vội, tranh cãi nóng nảy.';
}

export function buildTodaySummary(result: AstrologyResult | null, date: Date = new Date()): TodaySummary {
  const cc = dayCanChi(date);
  const weekday = WEEKDAY[date.getDay()];
  const dateLabel = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  const canChiLabel = `Ngày ${cc.stem} ${cc.branch}`;

  // ----- CÓ LÁ SỐ: cá nhân hóa -----
  if (result) {
    const sc = scoreNhatVan(result, date);
    const fav = result.batTuChart.favorableElements || [];
    const unfav = result.batTuChart.unfavorableElements || [];
    const favEl = fav[0] || result.batTuChart.dayMasterElement;
    const unfavEl = unfav[0];
    const g = elementPhongThuy(favEl);
    const age = currentAgeOf(result, date);
    const goodDay = sc.rating === 'Rất tốt' || sc.rating === 'Tốt';
    const badDay = sc.rating === 'Cần thận trọng' || sc.rating === 'Xấu';

    const good: string[] = [
      `💼 ${workLineGood(age, goodDay)}`,
      `🧭 Hướng tốt: ${g.huong}`,
      `👕 Màu hợp: ${firstPart(g.mau)}`,
    ];

    const bad: string[] = [];
    if (sc.xungTuoi) bad.push('⚠ Ngày xung tuổi: tránh việc trọng đại (cưới hỏi, khởi công, đi xa lớn).');
    bad.push(`🚫 ${workLineBad(age, badDay)}`);
    if (unfavEl) {
      const b = elementPhongThuy(unfavEl);
      bad.push(`🧭 Hạn chế hướng: ${b.huong}`);
      bad.push(`👕 Tránh tông màu: ${firstPart(b.mau)}`);
    }
    bad.push('🧘 Giữ bình tĩnh, tránh quyết định vội vàng.');

    const hr = goodBadHours(result, date);
    return {
      hasChart: true, weekday, dateLabel, canChiLabel, rating: sc.rating, good, bad,
      goodHours: hr.good.map(hrLabel),
      badHours: hr.bad.map(hrLabel),
      encourage: isRough(sc.rating) ? pickEncourage() : undefined,
    };
  }

  // ----- CHƯA CÓ LÁ SỐ: phong thủy chung theo Can–Chi ngày -----
  const rating = genericDayFacts(date).rating; // cùng công thức lịch chung với heatmap/Xem ngày tốt cơ bản
  const g = elementPhongThuy(cc.stemEl);

  const good: string[] = [
    '💼 Ưu tiên việc quan trọng vào buổi sáng khi tinh thần tốt nhất.',
    '🤝 Thuận gặp gỡ, trao đổi, củng cố quan hệ.',
    `🧭 Hướng cát hôm nay: ${g.huong}`,
    `👕 Màu may mắn: ${firstPart(g.mau)}`,
  ];
  const bad: string[] = [
    '🚫 Tránh quyết định vội vàng, tranh cãi nóng nảy.',
    '🧾 Cẩn thận giấy tờ, tiền bạc, đi lại.',
    '🌙 Nghỉ ngơi điều độ, giữ sức khỏe.',
  ];

  // Chưa có lá số → khung giờ chung (buổi sáng tinh thần tốt nhất) — đã gộp liền nhau.
  const goodHours: string[] = ['Mão–Tị (5h–11h)'];
  const badHours: string[] = ['Dậu (17h–19h)'];

  return {
    hasChart: false, weekday, dateLabel, canChiLabel, rating, good, bad,
    goodHours, badHours,
    encourage: isRough(rating) ? pickEncourage() : undefined,
  };
}
