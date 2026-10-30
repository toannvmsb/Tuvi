import { useCallback, useRef, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent, ScrollView } from 'react-native';
import type { ScrollRef } from '../types/refs';

const SHOW_THRESHOLD = 400; // px đã cuộn xuống mới hiện nút "Lên đầu trang"

/**
 * Dùng cho các màn luận giải dài (lá số, Bát Tự, đại/tiểu/nguyệt vận, tài lộc,
 * nhật vận, phân tích toàn lá số, so sánh lá số…) — gắn `scrollRef` vào
 * `ScrollView`, `onScroll` để theo dõi vị trí cuộn, và `scrollToTop` cho nút
 * nổi `ScrollToTopButton`.
 */
export function useScrollToTop() {
  const scrollRef = useRef<ScrollRef>(null);
  const [showTop, setShowTop] = useState(false);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setShowTop(e.nativeEvent.contentOffset.y > SHOW_THRESHOLD);
  }, []);

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  return { scrollRef, showTop, onScroll, scrollToTop };
}
