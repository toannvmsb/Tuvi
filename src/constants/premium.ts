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
  },
};

/** Nhãn truyền tải giá trị Phân tích AI (hiển thị cạnh nút AI). */
export const AI_VALUE_NOTE =
  'Phân tích AI chuyên sâu từ 5 đến 10 trang A4, cá nhân hóa lá số của bạn theo biến động thời gian và thời cuộc.';

export type FeatureKind = 'advanced' | 'ai';

/** Ví xu trong phiên. Admin 100.000 xu, reset mỗi lần chạy app. */
export const wallet = {
  isAdmin: true,
  userName: 'Admin',
  balance: 100000,
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
