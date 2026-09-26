/**
 * Export TuViChart View as PNG image.
 * Primary: save to device gallery via expo-media-library.
 * Fallback: open system share sheet via expo-sharing.
 */

import type { RefObject } from 'react';
import type { View } from 'react-native';

export interface ExportResult {
  saved: boolean;   // true if saved to gallery
  uri: string;      // local file URI of the PNG
}

export async function exportChartAsImage(
  chartRef: RefObject<View | null>,
  fileName: string = 'la-so-tu-vi.png',
): Promise<ExportResult> {
  // Lazy-require so app still builds if modules aren't installed yet
  let captureRef: any;
  let MediaLibrary: any;
  let Sharing: any;
  try {
    captureRef = require('react-native-view-shot').captureRef;
  } catch {
    throw new Error('Thiếu package react-native-view-shot. Chạy: npx expo install react-native-view-shot');
  }
  try { MediaLibrary = require('expo-media-library'); } catch {}
  try { Sharing = require('expo-sharing'); } catch {}

  if (!chartRef.current) {
    throw new Error('Không tìm thấy tham chiếu lá số. Vui lòng thử lại.');
  }

  // CHỈ chụp ảnh, KHÔNG tự lưu — người dùng chủ động bấm "Lưu ảnh".
  const uri: string = await captureRef(chartRef, {
    format: 'png',
    quality: 1,
    result: 'tmpfile',
    fileName,
  });
  return { saved: false, uri };
}

/** Lưu 1 ảnh đã chụp vào Thư viện ảnh (gọi khi người dùng bấm "Lưu ảnh"). */
export async function saveImageToGallery(uri: string): Promise<void> {
  let MediaLibrary: any;
  // SDK 57: export chính đổi sang API class-based mới — requestPermissionsAsync/saveToLibraryAsync
  // dạng hàm giờ nằm ở "/legacy" (gọi từ export chính sẽ ném lỗi deprecated ngay khi chạy).
  try { MediaLibrary = require('expo-media-library/legacy'); } catch {
    throw new Error('Thiếu package expo-media-library. Chạy: npx expo install expo-media-library');
  }
  // writeOnly=true — chỉ xin quyền GHI vào thư viện ảnh, không xin quyền đọc
  // (app không cần duyệt/đọc ảnh có sẵn của người dùng, chỉ lưu ảnh lá số vừa xuất).
  const perm = await MediaLibrary.requestPermissionsAsync(true);
  if (!(perm.granted || perm.status === 'granted')) {
    throw new Error('Cần cấp quyền truy cập Thư viện ảnh để lưu.');
  }
  await MediaLibrary.saveToLibraryAsync(uri);
}

/**
 * Tải 1 ảnh từ URL (vd QR VietQR) về cache, trả về file URI cục bộ.
 * Hỗ trợ cả API mới (expo-file-system v19: File/Paths) lẫn legacy (downloadAsync).
 */
export async function downloadImageToCache(url: string, fileName: string): Promise<string> {
  // 1) API mới v19
  try {
    const FS: any = require('expo-file-system');
    if (FS?.File && FS?.Paths?.cache) {
      const dest = new FS.File(FS.Paths.cache, fileName);
      try { if (dest.exists) dest.delete(); } catch {}
      const out = await FS.File.downloadFileAsync(url, dest);
      return (out?.uri ?? dest.uri);
    }
    if (FS?.downloadAsync && FS?.cacheDirectory) {
      const target = `${FS.cacheDirectory}${fileName}`;
      const r = await FS.downloadAsync(url, target);
      return r.uri;
    }
  } catch { /* thử legacy */ }
  // 2) Entry legacy
  const Legacy: any = require('expo-file-system/legacy');
  const target = `${Legacy.cacheDirectory}${fileName}`;
  const r = await Legacy.downloadAsync(url, target);
  return r.uri;
}

/** Mở hộp thoại chia sẻ hệ thống cho 1 file ảnh đã có sẵn. */
export async function shareImageFile(uri: string): Promise<void> {
  let Sharing: any;
  try { Sharing = require('expo-sharing'); } catch {
    throw new Error('Thiếu package expo-sharing. Chạy: npx expo install expo-sharing');
  }
  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error('Thiết bị không hỗ trợ chia sẻ.');
  await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Chia sẻ lá số Tử Vi' });
}
