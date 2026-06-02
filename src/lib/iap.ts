/**
 * KHUNG IAP (In-App Purchase) nạp xu cho bản phát hành STORE (iOS/Android).
 *
 * Thiết kế "lazy": chỉ nạp `react-native-iap` nếu có (bản build store). Ở Expo Go
 * hoặc môi trường không có package → mọi hàm trả về an toàn, IAP coi như "không
 * khả dụng" và app vẫn chạy (dùng nạp VietQR như cũ).
 *
 * Luồng: initIap() → getXuProducts() để hiện giá → buyXuPack(productId) → khi
 * store xác nhận, listener verify (server) + cộng xu, rồi finishTransaction.
 *
 * ⚠ Trước khi phát hành:
 *   1) npx expo install react-native-iap  (và thêm config plugin nếu cần)
 *   2) Tạo sản phẩm CONSUMABLE trên App Store Connect / Play Console với ID
 *      khớp XU_PACKS.productId (xu_100, xu_200, …).
 *   3) Dựng Edge Function `iap-verify` để XÁC THỰC biên nhận phía server rồi
 *      cộng xu (tránh gian lận). Khung dưới đây sẽ tự gọi function đó.
 */
import { Platform } from 'react-native';
import { XU_PACKS, XU_SKUS, type XuPack } from '../constants/payment';
import { deposit, seedWallet, wallet } from '../constants/premium';
import { supabase } from './supabase';
import { isOnlineMode } from './auth';

let RNIap: any = null;
try { RNIap = require('react-native-iap'); } catch { RNIap = null; }

let purchaseUpdateSub: any = null;
let purchaseErrorSub: any = null;
let initialized = false;

/** IAP có khả dụng không (đã cài package + đang trên thiết bị thật). */
export function isIapAvailable(): boolean {
  return !!RNIap && (Platform.OS === 'ios' || Platform.OS === 'android');
}

const packOf = (productId: string): XuPack | undefined =>
  XU_PACKS.find(p => p.productId === productId);

/**
 * Cộng xu sau khi mua. ƯU TIÊN xác thực biên nhận phía SERVER (Edge Function
 * `iap-verify`); nếu chưa có server thì cộng cục bộ (chỉ để dev/test).
 */
async function creditPurchase(pack: XuPack, purchase: any): Promise<number> {
  if (isOnlineMode()) {
    try {
      const { data, error } = await supabase.functions.invoke('iap-verify', {
        body: {
          platform: Platform.OS,
          productId: pack.productId,
          // iOS: transactionReceipt; Android: purchaseToken + packageName
          receipt: purchase?.transactionReceipt,
          purchaseToken: purchase?.purchaseToken,
          transactionId: purchase?.transactionId,
        },
      });
      if (!error && typeof (data as any)?.balance === 'number') {
        seedWallet({ balance: (data as any).balance });
        return (data as any).balance;
      }
    } catch { /* chưa có function → fallback */ }
  }
  // Fallback (dev/test hoặc chưa dựng server): cộng cục bộ.
  return deposit(pack.xu);
}

/**
 * Khởi tạo IAP + đăng ký listener. `onCredited` gọi sau khi cộng xu thành công.
 * Trả về true nếu IAP sẵn sàng.
 */
export async function initIap(handlers?: {
  onCredited?: (pack: XuPack, balance: number) => void;
  onError?: (message: string) => void;
}): Promise<boolean> {
  if (!isIapAvailable()) return false;
  if (initialized) return true;
  try {
    await RNIap.initConnection();
  } catch (e: any) {
    handlers?.onError?.(e?.message || 'Không kết nối được cửa hàng.');
    return false;
  }
  initialized = true;

  purchaseUpdateSub = RNIap.purchaseUpdatedListener(async (purchase: any) => {
    const pack = packOf(purchase?.productId);
    try {
      if (pack) {
        const bal = await creditPurchase(pack, purchase);
        handlers?.onCredited?.(pack, bal);
      }
    } finally {
      // Đánh dấu giao dịch đã xử lý (consumable → cho mua lại lần sau).
      try { await RNIap.finishTransaction({ purchase, isConsumable: true }); } catch {}
    }
  });

  purchaseErrorSub = RNIap.purchaseErrorListener((err: any) => {
    if (err?.code === 'E_USER_CANCELLED') return;   // người dùng tự hủy → bỏ qua
    handlers?.onError?.(err?.message || 'Giao dịch không thành công.');
  });

  return true;
}

/** Lấy thông tin sản phẩm (giá localize từ store). Trả [] nếu không khả dụng. */
export async function getXuProducts(): Promise<any[]> {
  if (!isIapAvailable() || !initialized) return [];
  try { return (await RNIap.getProducts({ skus: XU_SKUS })) || []; }
  catch { return []; }
}

/** Mở hộp thoại mua 1 gói xu. */
export async function buyXuPack(productId: string): Promise<void> {
  if (!isIapAvailable()) throw new Error('Nạp qua cửa hàng chỉ dùng trên bản cài từ App Store / CH Play.');
  if (!initialized) await initIap();
  await RNIap.requestPurchase({ sku: productId, skus: [productId] });
}

/** Gỡ listener + đóng kết nối (gọi khi rời màn). */
export async function endIap(): Promise<void> {
  try { purchaseUpdateSub?.remove?.(); } catch {}
  try { purchaseErrorSub?.remove?.(); } catch {}
  purchaseUpdateSub = null; purchaseErrorSub = null;
  if (initialized) { try { await RNIap.endConnection(); } catch {} initialized = false; }
}

/** Lấy số dư hiện tại (tiện cho UI sau khi cộng). */
export function currentBalance(): number { return wallet.balance; }
