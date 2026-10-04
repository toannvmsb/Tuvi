/**
 * Chụp một View thành ảnh PNG (dùng cho thẻ chia sẻ).
 *  - Native: react-native-view-shot → file tạm.
 *  - Web: html2canvas → data URL (cùng cách TuViChartScreen xuất ảnh lá số).
 * Trả về uri dùng được với saveImageOrDownload / shareFile.
 */
import type { RefObject } from 'react';
import type { View } from 'react-native';
import { isWeb } from './platform';

export async function captureViewAsPng(ref: RefObject<View | null>, fileName: string): Promise<string> {
  if (!ref.current) throw new Error('Chưa dựng xong thẻ chia sẻ, vui lòng thử lại.');
  if (isWeb) {
    const html2canvas = (await import('html2canvas')).default;
    const node = ref.current as any;
    const dom: HTMLElement = node?._nativeTag ?? node;
    if (!dom || typeof dom.getBoundingClientRect !== 'function') throw new Error('Không xác định được vùng thẻ chia sẻ.');
    const canvas = await html2canvas(dom, { backgroundColor: '#12132B', scale: 2, useCORS: true, logging: false });
    return canvas.toDataURL('image/png');
  }
  let captureRef: any;
  try { captureRef = require('react-native-view-shot').captureRef; } catch {
    throw new Error('Thiếu react-native-view-shot.');
  }
  return captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile', fileName });
}
