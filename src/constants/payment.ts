/**
 * Cấu hình NẠP XU qua chuyển khoản VietQR.
 *
 * ⚠️ CHỦ APP CẦN ĐIỀN thông tin tài khoản nhận tiền thật vào `BANK` bên dưới.
 * Khi tích hợp dịch vụ đọc biến động số dư (SePay / Casso) + Edge Function webhook,
 * hệ thống sẽ tự khớp "nội dung chuyển khoản = mã đơn" để cộng xu.
 */

export interface BankInfo {
  bankId: string;       // mã ngân hàng theo VietQR (vd 'MB', 'VCB', 'TCB', 'ACB'…) hoặc BIN
  bankLabel: string;    // tên ngân hàng hiển thị cho người dùng (vd 'VPBank')
  accountNo: string;    // số tài khoản nhận tiền
  accountName: string;  // tên chủ tài khoản (IN HOA, không dấu càng tốt)
  template?: string;    // mẫu QR: 'compact2' | 'compact' | 'qr_only' | 'print'
}

// Tài khoản nhận tiền (đã liên kết SePay để tự cộng xu khi có biến động số dư).
export const BANK: BankInfo = {
  bankId: '970432',          // BIN VPBank (chuẩn VietQR, chắc chắn render được)
  bankLabel: 'VPBank',       // tên hiển thị
  accountNo: '3838386666',
  accountName: 'LE NHU QUYNH',
  template: 'compact2',
};

/** Tỉ giá quy đổi: 1 xu = 100đ (10.000đ = 100 xu). */
export const VND_PER_XU = 100;

/** Trang nạp xu qua chuyển khoản trên website (dùng cho gợi ý "cách nạp khác"). */
export const WEB_TOPUP_URL = 'https://tuzi.vn';

export interface XuPack {
  xu: number;
  vnd: number;
  label?: string;
  productId: string;     // Android Product ID (Google Play) — không đổi
  iosProductId: string;  // iOS Product ID (App Store Connect) — bộ mới
}

/**
 * Các gói nạp xu (1 xu = 100đ).
 * Android: productId  (xu_100 … xu_5000) — GIỮ NGUYÊN, đang chạy ổn.
 * iOS:     iosProductId (ios_xu_100 … ios_xu_5000) — bộ ID mới tạo lại trên App Store Connect.
 */
export const XU_PACKS: XuPack[] = [
  { vnd: 10000,  xu: 100,  productId: 'xu_100',  iosProductId: 'ios_xu_100' },
  { vnd: 20000,  xu: 200,  productId: 'xu_200',  iosProductId: 'ios_xu_200' },
  { vnd: 50000,  xu: 500,  productId: 'xu_500',  iosProductId: 'ios_xu_500',  label: 'Phổ biến' },
  { vnd: 100000, xu: 1000, productId: 'xu_1000', iosProductId: 'ios_xu_1000' },
  { vnd: 200000, xu: 2000, productId: 'xu_2000', iosProductId: 'ios_xu_2000' },
  { vnd: 500000, xu: 5000, productId: 'xu_5000', iosProductId: 'ios_xu_5000', label: 'Tiết kiệm' },
];

/** SKU cho từng platform (dùng cho IAP getProducts). */
export const XU_SKUS_ANDROID = XU_PACKS.map(p => p.productId);
export const XU_SKUS_IOS     = XU_PACKS.map(p => p.iosProductId);
/** @deprecated dùng XU_SKUS_ANDROID hoặc XU_SKUS_IOS */
export const XU_SKUS = XU_SKUS_ANDROID;

/** Sinh MÃ ĐƠN nạp (dùng làm nội dung chuyển khoản để hệ thống tự khớp). */
export function makeTopupCode(): string {
  // LUÔN đúng 6 ký tự [0-9A-Z] (khớp regex của webhook SePay và RPC create_topup_order). Cách cũ
  // Math.random().toString(36).slice(2, 8) có thể ra ít hơn 6 ký tự → mã không khớp → khách chuyển khoản mà không được cộng xu.
  const A = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const g = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto;
  let s = '';
  if (g?.getRandomValues) {
    const b = g.getRandomValues(new Uint8Array(6));
    for (let i = 0; i < 6; i++) s += A[b[i] % 36];
  } else {
    for (let i = 0; i < 6; i++) s += A[Math.floor(Math.random() * 36)];
  }
  return `TUVI${s}`;
}

/** Tạo URL ảnh QR VietQR cho 1 đơn nạp. */
export function vietQrImageUrl(amountVnd: number, addInfo: string): string {
  const { bankId, accountNo, accountName, template } = BANK;
  const q =
    `amount=${encodeURIComponent(amountVnd)}` +
    `&addInfo=${encodeURIComponent(addInfo)}` +
    `&accountName=${encodeURIComponent(accountName)}`;
  return `https://img.vietqr.io/image/${bankId}-${accountNo}-${template || 'compact2'}.png?${q}`;
}
