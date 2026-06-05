/**
 * Platform-aware wrappers cho các tính năng native-only.
 * Web fallback được xử lý tại đây — các màn hình dùng wrapper này thay vì
 * import trực tiếp expo-print / expo-sharing / expo-media-library.
 */
import { Platform, useWindowDimensions } from 'react-native';

export const isWeb = Platform.OS === 'web';

/**
 * Chiều rộng tối đa của cột nội dung trên web (desktop/tablet).
 * Dùng CHUNG cho CSS container (#root trong App.tsx) và useContentWidth() →
 * luôn khớp nhau. Điện thoại < giá trị này sẽ tự fill full chiều ngang.
 */
export const WEB_MAX_CONTENT_WIDTH = 600;

/**
 * Chiều rộng content thực tế:
 * - Mobile: full chiều ngang thiết bị.
 * - Web: co giãn theo màn hình nhưng cap ở WEB_MAX_CONTENT_WIDTH
 *   (điện thoại nhỏ hơn → full; tablet/desktop → cột rộng cố định, căn giữa).
 */
export function useContentWidth(): number {
  const { width } = useWindowDimensions();
  return isWeb ? Math.min(width, WEB_MAX_CONTENT_WIDTH) : width;
}

/**
 * Xuất PDF:
 * - Mobile: expo-print → expo-sharing (như cũ).
 * - Web: mở tab mới chứa HTML rồi trigger window.print().
 */
export async function printHtml(html: string): Promise<void> {
  if (isWeb) {
    const win = window.open('', '_blank');
    if (!win) {
      // Popup bị chặn → fallback: tạo iframe ẩn
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      iframe.contentDocument?.open();
      iframe.contentDocument?.write(html);
      iframe.contentDocument?.close();
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
    return;
  }
  // Mobile path
  let Print: any;
  let Sharing: any;
  try { Print = require('expo-print'); } catch {
    throw new Error('Thiếu package expo-print. Chạy: npx expo install expo-print');
  }
  try { Sharing = require('expo-sharing'); } catch {}
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  if (Sharing && (await Sharing.isAvailableAsync())) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  }
}

/**
 * Lưu ảnh:
 * - Mobile: expo-media-library.
 * - Web: tạo thẻ <a download> trigger download trình duyệt.
 */
export async function saveImageOrDownload(uri: string, fileName: string): Promise<void> {
  if (isWeb) {
    const a = document.createElement('a');
    a.href = uri;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }
  let MediaLibrary: any;
  try { MediaLibrary = require('expo-media-library'); } catch {
    throw new Error('Thiếu expo-media-library');
  }
  const perm = await MediaLibrary.requestPermissionsAsync();
  if (!(perm.granted || perm.status === 'granted')) {
    throw new Error('Cần cấp quyền truy cập Thư viện ảnh để lưu.');
  }
  await MediaLibrary.saveToLibraryAsync(uri);
}

/**
 * Chia sẻ file:
 * - Mobile: expo-sharing.
 * - Web: Web Share API (hoặc download nếu không hỗ trợ).
 */
export async function shareFile(uri: string, opts?: { mimeType?: string; title?: string }): Promise<void> {
  if (isWeb) {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        const res = await fetch(uri);
        const blob = await res.blob();
        const file = new File([blob], opts?.title || 'file', { type: opts?.mimeType || blob.type });
        await navigator.share({ files: [file] });
        return;
      } catch {}
    }
    // Fallback: download
    const a = document.createElement('a');
    a.href = uri;
    a.download = opts?.title || 'file';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }
  let Sharing: any;
  try { Sharing = require('expo-sharing'); } catch {
    throw new Error('Thiếu expo-sharing');
  }
  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error('Thiết bị không hỗ trợ chia sẻ.');
  await Sharing.shareAsync(uri, { mimeType: opts?.mimeType, dialogTitle: opts?.title });
}

/**
 * Tải ảnh từ URL về cache (mobile) hoặc trả thẳng URL (web — trình duyệt tự cache).
 */
export async function downloadToCache(url: string, fileName: string): Promise<string> {
  if (isWeb) return url;
  // Reuse logic từ exportChart.ts
  try {
    const FS: any = require('expo-file-system');
    if (FS?.File && FS?.Paths?.cache) {
      const dest = new FS.File(FS.Paths.cache, fileName);
      try { if (dest.exists) dest.delete(); } catch {}
      const out = await FS.File.downloadFileAsync(url, dest);
      return out?.uri ?? dest.uri;
    }
    if (FS?.downloadAsync && FS?.cacheDirectory) {
      const target = `${FS.cacheDirectory}${fileName}`;
      const r = await FS.downloadAsync(url, target);
      return r.uri;
    }
  } catch {}
  const Legacy: any = require('expo-file-system/legacy');
  const target = `${Legacy.cacheDirectory}${fileName}`;
  const r = await Legacy.downloadAsync(url, target);
  return r.uri;
}
