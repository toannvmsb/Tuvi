/**
 * Prompt "Cá nhân hóa trải nghiệm" — dùng CHUNG cho mọi box/màn hình đang ở
 * chế độ mặc định (chưa gắn lá số): Box Thông báo ngày, Box gợi ý tài chính,
 * Box Nhịp tháng này, tên người dùng ở Home, và CTA trong DailyScreen khi
 * chưa có lá số. Luôn cùng 1 tiêu đề/nội dung/2 nút điều hướng đầu (Tạo mới /
 * Gắn đã lưu) — chỉ nút 3 ("Tiếp tục ở chế độ mặc định") khác nhau theo nơi gọi.
 *
 * Dùng `Alert.alert` thẳng (không cần gọi `webAlert` trực tiếp) — `WebAlertHost`
 * đã patch `Alert.alert` trên web từ App.tsx nên gọi giống hệt native.
 */
import { Alert } from 'react-native';

/** Kiểu tối giản — chỉ cần `navigate`, tránh phụ thuộc chặt vào Props cụ thể của từng screen. */
interface NavLike {
  navigate: (screen: string, params?: any) => void;
}

export function promptPersonalize(navigation: NavLike, onContinueDefault?: () => void): void {
  Alert.alert(
    'Cá nhân hóa trải nghiệm',
    'Bạn vẫn có thể sử dụng các tính năng cơ bản của Tuzi mà không cần tạo hoặc liên kết hồ sơ. Thêm hồ sơ giúp Tuzi cung cấp những gợi ý phù hợp hơn với bạn.',
    [
      { text: 'Tạo mới Hồ sơ', onPress: () => navigation.navigate('Input') },
      { text: 'Gắn Hồ sơ đã lưu', onPress: () => navigation.navigate('MyCharts') },
      { text: 'Tiếp tục ở chế độ cơ bản', style: 'cancel', onPress: onContinueDefault },
    ],
  );
}
