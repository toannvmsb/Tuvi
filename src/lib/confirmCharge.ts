/**
 * Hỏi xác nhận trước khi TRỪ XU để mở một mục trả phí.
 *  - Đã mở khóa trước đó → trả 'free' ngay (không hỏi, không trừ).
 *  - Chưa mở → hiện hộp thoại: cần bao nhiêu xu, số dư hiện tại, hỏi đồng ý.
 *      • Đồng ý + đủ xu → trừ, trả 'ok'.
 *      • Đồng ý + thiếu xu → trả 'nofund'.
 *      • Từ chối → trả 'cancel'.
 */
import { Alert } from 'react-native';
import { isUnlocked, useFeature, chargeAgain, PREMIUM, wallet, type FeatureKind } from '../constants/premium';

export type ChargeResult = 'free' | 'ok' | 'cancel' | 'nofund';

export function confirmAndUnlock(key: string, kind: FeatureKind, cost: number = PREMIUM.COST[kind]): Promise<ChargeResult> {
  return new Promise((resolve) => {
    if (isUnlocked(key)) { resolve('free'); return; }
    const kindLabel = kind === 'ai' ? 'Phân tích AI' : 'Nâng cao';
    Alert.alert(
      `Mở ${kindLabel}`,
      `Mục này cần ${cost.toLocaleString('vi-VN')} xu để mở.\n` +
      `Số dư hiện tại: ${wallet.balance.toLocaleString('vi-VN')} xu.\n\n` +
      `Bạn có đồng ý trừ ${cost.toLocaleString('vi-VN')} xu để mở và xem nội dung này không? ` +
      `(Mở rồi thì đọc lại miễn phí)`,
      [
        { text: 'Để sau', style: 'cancel', onPress: () => resolve('cancel') },
        {
          text: `Đồng ý (${cost.toLocaleString('vi-VN')} xu)`,
          onPress: () => {
            const r = useFeature(key, kind, cost);
            resolve(r.ok ? 'ok' : 'nofund');
          },
        },
      ],
      { cancelable: true, onDismiss: () => resolve('cancel') },
    );
  });
}

/**
 * Xác nhận TRỪ XU khi PHÂN TÍCH LẠI (chạy AI mới đè kết quả cũ).
 * Luôn hỏi (kể cả mục đã mở), và luôn trừ xu nếu đồng ý.
 */
export function confirmReanalyze(key: string, kind: FeatureKind, cost: number = PREMIUM.COST[kind]): Promise<ChargeResult> {
  return new Promise((resolve) => {
    if (PREMIUM.UNLOCKED) { resolve('free'); return; }   // chế độ mở miễn phí
    const kindLabel = kind === 'ai' ? 'Phân tích AI' : 'Nâng cao';
    Alert.alert(
      `Phân tích lại (${kindLabel})`,
      `Phân tích lại sẽ chạy AI mới và TRỪ THÊM ${cost.toLocaleString('vi-VN')} xu.\n` +
      `Số dư hiện tại: ${wallet.balance.toLocaleString('vi-VN')} xu.\n\n` +
      `Bạn có chắc muốn phân tích lại và trừ ${cost.toLocaleString('vi-VN')} xu không?`,
      [
        { text: 'Để sau', style: 'cancel', onPress: () => resolve('cancel') },
        {
          text: `Đồng ý (${cost.toLocaleString('vi-VN')} xu)`,
          onPress: () => {
            const r = chargeAgain(key, kind, cost);
            resolve(r.ok ? 'ok' : 'nofund');
          },
        },
      ],
      { cancelable: true, onDismiss: () => resolve('cancel') },
    );
  });
}
