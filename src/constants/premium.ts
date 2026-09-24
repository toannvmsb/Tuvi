import { VND_PER_XU } from './payment';

/**
 * Ví xu (credit) + tính phí theo từng tính năng.
 *
 * MÔ HÌNH KINH DOANH:
 *  - Mỗi lần MỞ một nội dung trả phí (Nâng cao / Phân tích AI) cho một mục cụ thể
 *    (1 cung, 1 đại vận, 1 năm, 1 tháng, toàn lá số, Bát Tự, xem theo ngày…) sẽ
 *    TRỪ XU một lần. Đọc lại CHÍNH mục đó trong phiên thì MIỄN PHÍ (đã "mở khóa").
 *  - Cơ bản (tóm tắt ngắn) luôn miễn phí.
 *
 * BẢN TEST: bật trừ phí; Admin có sẵn 100.000 xu và được RESET mỗi phiên chạy
 * (vì balance khởi tạo ở module — mỗi lần mở app lại là 100.000).
 *
 * KHI CÓ BACKEND: thay `wallet` bằng số dư thật đọc từ máy chủ sau khi đăng nhập;
 * lưu danh sách `unlocked` (mục đã trả phí) vào DB theo user để đọc lại miễn phí
 * kể cả khi đăng nhập lại trên thiết bị khác.
 */

export const PREMIUM = {
  /** true: mở hết miễn phí. false: trừ xu theo COST. */
  UNLOCKED: false,
  /**
   * Chi phí (xu) theo LOẠI nội dung. Quy đổi: 1 xu = 100đ (10.000đ = 100 xu).
   *  - advanced       : Nâng cao (offline) mục NHỎ        = 5 xu
   *  - advancedMajor  : Nâng cao Toàn lá số / Đại vận / Tiểu vận = 10 xu
   *  - ai             : Phân tích AI ~5.000 từ            = 50 xu
   *  - aiLarge        : Phân tích AI ~10.000 từ (toàn lá số / đại vận / tiểu vận) = 100 xu
   */
  COST: {
    advanced: 10,       // Nâng cao mục nhỏ (cung, bát tự, nguyệt vận, xem ngày)
    advancedMajor: 20,  // Nâng cao Toàn lá số / Đại vận / Tiểu vận
    ai: 30,             // AI nhỏ: cung / nguyệt vận / xem ngày
    aiMedium: 50,       // AI vừa: Bát Tự / Tài Lộc / mỗi năm Tiểu vận
    aiLarge: 100,       // AI lớn: Toàn lá số / mỗi Đại vận
    aiCompare: 30,      // AI So sánh lá số (12 tầng song song)
    portrait: 30,       // Vẽ chân dung người tương hợp (mỗi lần vẽ)
    annualEvents: 20,   // Nâng cao Luận sự kiện trong năm (bản offline, không AI)
    aiAnnualEvents: 20,  // Phân tích AI Luận sự kiện trong năm (85 sự kiện + thời điểm tháng)
    aiChat: 1,          // Chat AI nổi — 1 lượt hỏi vượt quota miễn phí/ngày
  },
};

/** Số lượt Chat AI nổi MIỄN PHÍ mỗi ngày trước khi tính xu (khớp FREE_DAILY_LIMIT ở Edge Function ai-chat). */
export const AI_CHAT_FREE_DAILY_LIMIT = 5;

/** Nhãn truyền tải giá trị Phân tích AI (hiển thị cạnh nút AI). */
export const AI_VALUE_NOTE =
  'Phân tích AI chuyên sâu, cá nhân hóa lá số của bạn theo biến động thời gian và thời cuộc.';

/** Nội dung xem trước cho từng màn Phân tích AI — liệt kê các mục AI sẽ phân tích. */
export const AI_PREVIEW = {
  fullChart:
    'Phân tích tổng thể lá số bằng AI sẽ phân tích chi tiết và cung cấp thông tin đầy đủ cho 13 mục như nội dung bên dưới.\n' +
    '1. Tổng quan lá số\n2. Bản chất con người\n3. Điểm mạnh nổi bật\n4. Điểm yếu cần khắc phục\n' +
    '5. Sự nghiệp\n6. Tài chính\n7. Hôn nhân\n8. Gia đạo\n9. Sức khỏe\n' +
    '10. Vận hiện tại\n11. 3 cơ hội lớn nhất\n12. 3 rủi ro lớn nhất\n13. Hành động khuyến nghị',
  daiVan:
    'Phân tích chi tiết Đại Vận bằng AI sẽ phân tích chi tiết và cung cấp thông tin đầy đủ cho 14 mục như nội dung bên dưới.\n' +
    '1. Tổng quan đại vận\n2. Chủ đề chính\n3. Điểm thuận lợi\n4. Điểm bất lợi\n' +
    '5. Phân tích sự nghiệp\n6. Phân tích tài chính\n7. Phân tích quan hệ/hôn nhân\n8. Phân tích tài sản\n' +
    '9. Phân tích sức khỏe\n10. Bản đồ 10 năm\n11. Top 5 cơ hội\n12. Top 5 rủi ro\n' +
    '13. Chiến lược hành động\n14. Kết luận 5 dòng',
  tieuVan:
    'Phân tích chi tiết Tiểu Vận bằng AI sẽ phân tích chi tiết và cung cấp thông tin đầy đủ cho 13 mục như nội dung bên dưới.\n' +
    '1. Tổng quan Tiểu vận\n2. Chủ đề chính của năm\n3. Mức độ thuận lợi/rủi ro\n4. Tương tác với Đại vận hiện tại\n' +
    '5. Phân tích sao và cách cục\n6. Lưu tinh và Lưu Tứ Hóa\n7. Tam hợp/xung chiếu\n8. Phân tích theo 8 chủ đề\n' +
    '9. Bản đồ 4 quý\n10. Top 5 cơ hội\n11. Top 5 rủi ro\n12. Chiến lược hành động của năm\n13. Kết luận 5 dòng',
  nguyetVan:
    'Phân tích chi tiết Nguyệt Vận bằng AI sẽ phân tích chi tiết và cung cấp thông tin đầy đủ cho 12 mục như nội dung bên dưới.\n' +
    '1. Tổng quan tháng\n2. Chủ đề chính của tháng\n3. Tương tác với Bát Tự\n4. Tương tác với Đại vận và Tiểu vận\n' +
    '5. Phân tích cung Nguyệt vận\n6. Lưu nguyệt Tứ Hóa\n7. Phân tích theo 8 chủ đề\n8. Bản đồ 4 tuần\n' +
    '9. Top 5 cơ hội\n10. Top 5 rủi ro\n11. Việc nên làm / không nên làm\n12. Kết luận 5 dòng',
  palace:
    'Phân tích chi tiết Cung bằng AI sẽ phân tích chi tiết và cung cấp thông tin đầy đủ cho 10 mục như nội dung bên dưới.\n' +
    '1. Vai trò của cung\n2. Khí số cung\n3. Điểm mạnh\n4. Điểm yếu\n5. Nguồn lực hỗ trợ\n' +
    '6. Nút thắt cần vượt qua\n7. Cơ hội\n8. Rủi ro\n9. Chiến lược phát triển\n10. Kết luận 10 dòng',
  batTu:
    'Phân tích chi tiết Bát Tự bằng AI sẽ phân tích chi tiết và cung cấp thông tin đầy đủ cho 15 mục như nội dung bên dưới.\n' +
    '1. Tổng quan mệnh cục\n2. Nhật chủ và sức mạnh bản thân\n3. Ngũ hành thừa thiếu\n4. Dụng thần - Hỷ thần - Kỵ thần\n' +
    '5. Thập Thần nổi bật\n6. Cách cục chính\n7. Điểm mạnh\n8. Điểm yếu\n9. Sự nghiệp phù hợp\n' +
    '10. Tài chính và đầu tư\n11. Quan hệ và hôn nhân\n12. Sức khỏe và thói quen\n' +
    '13. Đại vận hiện tại\n14. Lưu niên hiện tại\n15. Khuyến nghị hành động',
};

export type FeatureKind = 'advanced' | 'ai';

/**
 * Ví xu trong phiên.
 * QUAN TRỌNG: mặc định là NGƯỜI DÙNG THƯỜNG (isAdmin=false), KHÔNG còn tự cấp Admin.
 *  - Online: quyền admin LẤY TỪ DB (profiles.is_admin) qua loadProfileIntoWallet → seedWallet.
 *  - Offline/khách: là người dùng thường, số dư 0 (chỉ dùng tính năng miễn phí).
 * Muốn tự cấp Admin để test cục bộ: tạm đặt isAdmin:true ở đây, NHỚ trả lại false trước khi phát hành.
 */
export const wallet = {
  isAdmin: false,
  userName: 'Khách',
  balance: 0,
};

/** Tập các mục ĐÃ MỞ KHÓA (đọc lại miễn phí). */
const unlocked = new Set<string>();

// ── Hook đồng bộ với backend (Supabase). walletSync.ts đăng ký các callback này;
//    premium.ts vẫn đồng bộ với UI, chỉ "bắn" sự kiện ra ngoài để đẩy lên server. ──
type SpendInfo = { key: string; kind: FeatureKind; cost: number; balance: number };
type BundleInfo = { keys: string[]; ref: string; cost: number; balance: number };
let onSpend: ((i: SpendInfo) => void) | null = null;
let onDeposit: ((amount: number, balance: number) => void) | null = null;
let onBundle: ((i: BundleInfo) => void) | null = null;
export function setWalletListeners(h: {
  onSpend?: (i: SpendInfo) => void;
  onDeposit?: (a: number, b: number) => void;
  onBundle?: (i: BundleInfo) => void;
}) {
  onSpend = h.onSpend ?? null;
  onDeposit = h.onDeposit ?? null;
  onBundle = h.onBundle ?? null;
}
/** Nạp số dư & danh sách đã mở khóa từ server sau khi đăng nhập. */
export function seedWallet(opts: { balance?: number; userName?: string; isAdmin?: boolean }) {
  if (typeof opts.balance === 'number') wallet.balance = opts.balance;
  if (opts.userName) wallet.userName = opts.userName;
  if (typeof opts.isAdmin === 'boolean') wallet.isAdmin = opts.isAdmin;
}
export function seedUnlocked(keys: string[]) {
  for (const k of keys) unlocked.add(k);
}

export function isUnlocked(key: string): boolean {
  return PREMIUM.UNLOCKED || unlocked.has(key);
}

export interface UseFeatureResult {
  ok: boolean;
  charged: number;
  alreadyUnlocked: boolean;
  balance: number;
  need?: number;
}

/**
 * Dùng (mở) một mục trả phí.
 *  - Đã mở khóa trước đó → miễn phí (alreadyUnlocked = true).
 *  - Chưa mở: nếu đủ xu thì trừ và đánh dấu đã mở; thiếu xu → ok=false.
 */
export function useFeature(key: string, kind: FeatureKind, cost: number = PREMIUM.COST[kind]): UseFeatureResult {
  if (PREMIUM.UNLOCKED || unlocked.has(key)) {
    unlocked.add(key);
    return { ok: true, charged: 0, alreadyUnlocked: true, balance: wallet.balance };
  }
  if (wallet.balance < cost) {
    return { ok: false, charged: 0, alreadyUnlocked: false, need: cost, balance: wallet.balance };
  }
  wallet.balance -= cost;
  unlocked.add(key);
  onSpend?.({ key, kind, cost, balance: wallet.balance });
  return { ok: true, charged: cost, alreadyUnlocked: false, balance: wallet.balance };
}

/**
 * TRỪ XU LẠI cho một mục ĐÃ mở khóa — dùng cho "Phân tích lại" (chạy AI mới).
 * Khác useFeature: KHÔNG miễn phí dù key đã mở; luôn trừ cost (trừ khi PREMIUM.UNLOCKED).
 */
export function chargeAgain(key: string, kind: FeatureKind, cost: number = PREMIUM.COST[kind]): UseFeatureResult {
  if (PREMIUM.UNLOCKED) {
    return { ok: true, charged: 0, alreadyUnlocked: true, balance: wallet.balance };
  }
  if (wallet.balance < cost) {
    return { ok: false, charged: 0, alreadyUnlocked: false, need: cost, balance: wallet.balance };
  }
  wallet.balance -= cost;
  unlocked.add(key);
  onSpend?.({ key, kind, cost, balance: wallet.balance });
  return { ok: true, charged: cost, alreadyUnlocked: false, balance: wallet.balance };
}

/**
 * Mua GÓI COMBO: trừ xu MỘT lần (cost) rồi mở khóa NHIỀU mục cùng lúc.
 * `ref` = mã gói (vd 'lifetime_full') để ghi log. `keys` = các unlock key được mở.
 */
export function buyBundle(keys: string[], cost: number, ref: string): UseFeatureResult {
  if (PREMIUM.UNLOCKED) {
    keys.forEach(k => unlocked.add(k));
    return { ok: true, charged: 0, alreadyUnlocked: true, balance: wallet.balance };
  }
  if (wallet.balance < cost) {
    return { ok: false, charged: 0, alreadyUnlocked: false, need: cost, balance: wallet.balance };
  }
  wallet.balance -= cost;
  keys.forEach(k => unlocked.add(k));
  onBundle?.({ keys, ref, cost, balance: wallet.balance });
  return { ok: true, charged: cost, alreadyUnlocked: false, balance: wallet.balance };
}

/** Nạp xu vào ví (bản test: cộng trực tiếp). */
export function deposit(amount: number): number {
  const amt = Math.max(0, Math.round(amount));
  wallet.balance += amt;
  onDeposit?.(amt, wallet.balance);
  return wallet.balance;
}

/** Reset ví về mặc định Admin (test). */
export function resetWallet(): number {
  wallet.balance = 100000;
  unlocked.clear();
  return wallet.balance;
}

/** Nhãn trạng thái ngắn. */
export function premiumBadgeNote(): string {
  if (PREMIUM.UNLOCKED) return 'Đang mở miễn phí';
  return `Số dư ${wallet.balance.toLocaleString('vi-VN')} xu`;
}

/** "20 xu - 2.000đ" — số xu kèm quy đổi tiền VNĐ (1 xu = 100đ). */
export const xuVnd = (xu: number): string =>
  `${xu.toLocaleString('vi-VN')} xu - ${(xu * VND_PER_XU).toLocaleString('vi-VN')}đ`;

/** Nhãn chi phí cho NÚT MỞ: "miễn phí" nếu đang mở free, ngược lại "20 xu - 2.000đ". */
export const costNote = (xu: number): string => (PREMIUM.UNLOCKED ? 'miễn phí' : xuVnd(xu));

// ───────────── Tương thích ngược (các màn cũ còn dùng spendCredit) ─────────────
export type PremiumFeature = 'advanced' | 'aiPalace' | 'aiChart';
const LEGACY_KIND: Record<PremiumFeature, FeatureKind> = {
  advanced: 'advanced', aiPalace: 'ai', aiChart: 'ai',
};
/** @deprecated dùng useFeature(key, kind). Giữ cho màn chưa nâng cấp. */
export function spendCredit(feature: PremiumFeature): { ok: boolean; charged: number; need?: number; balance: number } {
  const kind = LEGACY_KIND[feature];
  const cost = PREMIUM.COST[kind];
  if (PREMIUM.UNLOCKED) return { ok: true, charged: 0, balance: wallet.balance };
  if (wallet.balance < cost) return { ok: false, charged: 0, need: cost, balance: wallet.balance };
  wallet.balance -= cost;
  return { ok: true, charged: cost, balance: wallet.balance };
}
