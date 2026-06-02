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

// TODO(CHỦ APP): thay bằng tài khoản nhận tiền thật trước khi phát hành.
export const BANK: BankInfo = {
  bankId: '970432',          // BIN VPBank (chuẩn VietQR, chắc chắn render được)
  bankLabel: 'VPBank',       // tên hiển thị
  accountNo: '0913377666',
  accountName: 'NGUYEN VAN TOAN',
  template: 'compact2',
};

/** Tỉ giá quy đổi: 1 xu = 100đ (10.000đ = 100 xu). */
export const VND_PER_XU = 100;

export interface XuPack {
  xu: number;
  vnd: number;
  label?: string;     // nhãn khuyến mãi (vd "+10% tặng")
  productId: string;  // ID sản phẩm IAP (tạo trên App Store Connect / Play Console)
}

/**
 * Các gói nạp xu (1 xu = 100đ).
 * `productId` phải KHỚP với ID sản phẩm "consumable" đã tạo trên store.
 */
export const XU_PACKS: XuPack[] = [
  { vnd: 10000, xu: 100, productId: 'xu_100' },
  { vnd: 20000, xu: 200, productId: 'xu_200' },
  { vnd: 50000, xu: 500, label: 'Phổ biến', productId: 'xu_500' },
  { vnd: 100000, xu: 1000, productId: 'xu_1000' },
  { vnd: 200000, xu: 2000, productId: 'xu_2000' },
  { vnd: 500000, xu: 5000, label: 'Tiết kiệm', productId: 'xu_5000' },
];

/** Toàn bộ SKU xu (dùng cho IAP getProducts). */
export const XU_SKUS = XU_PACKS.map(p => p.productId);

/** Sinh MÃ ĐƠN nạp (dùng làm nội dung chuyển khoản để hệ thống tự khớp). */
export function makeTopupCode(): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `TUVI${rand}`;
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
