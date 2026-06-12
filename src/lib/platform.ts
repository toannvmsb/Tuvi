/**
 * Platform-aware wrappers cho các tính năng native-only.
 * Web fallback được xử lý tại đây — các màn hình dùng wrapper này thay vì
 * import trực tiếp expo-print / expo-sharing / expo-media-library.
 */
import { Platform, useWindowDimensions } from 'react-native';

export const isWeb = Platform.OS === 'web';

/**
 * Chiều rộng content thực tế = full chiều ngang thiết bị (cả web lẫn mobile).
 * Web: app fluid, tự fit khung màn hình thiết bị; lá số & biểu đồ fill trọn
 * chiều rộng cửa sổ, cỡ chữ lá số scale theo (xem HouseCell).
 */
export function useContentWidth(): number {
  const { width } = useWindowDimensions();
  return width;
}

/**
 * Xuất PDF:
 * - Mobile: expo-print → expo-sharing (như cũ).
 * - Web: mở tab mới chứa HTML rồi trigger window.print().
 */
export async function printHtml(html: string, fileName?: string): Promise<void> {
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
      if (fileName && iframe.contentDocument) iframe.contentDocument.title = fileName;
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    // Tên tab/tài liệu → tên file gợi ý khi người dùng "Lưu sang PDF".
    if (fileName) { try { win.document.title = fileName; } catch {} }
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
  // expo-print đặt tên file ngẫu nhiên → đổi sang fileName mong muốn trước khi chia sẻ.
  const shareUri = fileName ? (await renamePdfFile(uri, fileName)) ?? uri : uri;
  if (Sharing && (await Sharing.isAvailableAsync())) {
    await Sharing.shareAsync(shareUri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  }
}

/** Đổi tên file PDF (expo-print tạo tên ngẫu nhiên) sang `${fileName}.pdf` trong thư mục cache.
 *  Hỗ trợ cả API mới (expo-file-system v19 — File/Paths) lẫn API cũ (cacheDirectory/moveAsync). */
async function renamePdfFile(uri: string, fileName: string): Promise<string | undefined> {
  const safe = fileName.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) || 'phan-tich';
  try {
    const FS: any = require('expo-file-system');
    if (FS?.File && FS?.Paths?.cache) {
      const dest = new FS.File(FS.Paths.cache, `${safe}.pdf`);
      try { if (dest.exists) dest.delete(); } catch {}
      new FS.File(uri).move(dest);
      return dest.uri ?? uri;
    }
    if (FS?.cacheDirectory && FS?.moveAsync) {
      const target = `${FS.cacheDirectory}${safe}.pdf`;
      try { await FS.deleteAsync(target, { idempotent: true }); } catch {}
      await FS.moveAsync({ from: uri, to: target });
      return target;
    }
  } catch { /* thử legacy bên dưới */ }
  try {
    const Legacy: any = require('expo-file-system/legacy');
    if (Legacy?.cacheDirectory && Legacy?.moveAsync) {
      const target = `${Legacy.cacheDirectory}${safe}.pdf`;
      try { await Legacy.deleteAsync(target, { idempotent: true }); } catch {}
      await Legacy.moveAsync({ from: uri, to: target });
      return target;
    }
  } catch { /* giữ uri gốc */ }
  return undefined;
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
