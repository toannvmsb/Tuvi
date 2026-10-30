import type { RefObject } from 'react';
import { findNodeHandle } from 'react-native';
import type { ScrollRef, TextInputRef } from '../types/refs';

/**
 * Cuộn ScrollView để đưa TextInput đang focus lên TRÊN bàn phím.
 *
 * Vì sao cần: `ScrollView` KHÔNG tự cuộn ô nhập vào khung nhìn khi bàn phím mở, nhất
 * là trên Android — nếu ô nhập nằm giữa/cuối một trang dài (vd "Ghi chú nhanh" ở Home,
 * "Nhật ký" ở Sự kiện sắp tới), bàn phím sẽ che mất ô nhập hoặc nội dung xung quanh mà
 * không có gì tự đẩy nó lên. Dùng `scrollResponderScrollNativeHandleToKeyboard` — API
 * nội bộ của React Native (không có trong type definition công khai, nhưng ổn định và
 * chính là cơ chế RN dùng ngầm cho hành vi tự cuộn của TextInput trên iOS) để đo và
 * cuộn chính xác, không cần biết trước vị trí ô nhập nằm ở đâu trong trang.
 *
 * Gọi trong `onFocus` của TextInput — có delay nhỏ để chờ bàn phím bắt đầu hiện ra thì
 * phép đo mới chính xác (gọi ngay lúc focus, bàn phím chưa kịp chiếm chỗ).
 */
export function scrollInputAboveKeyboard(
  scrollRef: RefObject<ScrollRef | null>,
  inputRef: RefObject<TextInputRef | null>,
  extraOffset = 24,
) {
  setTimeout(() => {
    const node = findNodeHandle(inputRef.current);
    const responder = (scrollRef.current as any)?.getScrollResponder?.();
    if (!node || !responder) return;
    (responder as any).scrollResponderScrollNativeHandleToKeyboard?.(node, extraOffset, true);
  }, 120);
}
