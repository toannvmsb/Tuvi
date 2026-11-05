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
  // expo-print đặt tên file ngẫu nhiên → SAO CHÉP sang tên mong muốn (giữ nguyên file gốc làm đường lùi).
  const named = fileName ? await renamePdfFile(uri, fileName) : undefined;
  if (!Sharing || !(await Sharing.isAvailableAsync())) return;
  // Thử lần lượt: file đã đặt tên → file gốc → file gốc sau một nhịp ngắn (iOS đôi khi từ chối "You don't
  // have access to the provided file" khi chia sẻ ngay sau lần chia sẻ trước hoặc khi file mới tạo chưa sẵn sàng).
  const attempts: { u: string; wait: number }[] = [];
  if (named) attempts.push({ u: named, wait: 0 });
  attempts.push({ u: uri, wait: 0 }, { u: uri, wait: 600 });
  let lastErr: unknown;
  for (const a of attempts) {
    try {
      if (a.wait) await new Promise(r => setTimeout(r, a.wait));
      await Sharing.shareAsync(a.u, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
      return;
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

/** Sao chép file PDF (expo-print tạo tên ngẫu nhiên) sang `${fileName}.pdf` trong thư mục cache.
 *  Hỗ trợ cả API mới (expo-file-system v19 — File/Paths) lẫn API cũ (cacheDirectory/moveAsync). */
async function renamePdfFile(uri: string, fileName: string): Promise<string | undefined> {
  const safe = fileName.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) || 'phan-tich';
  // Mỗi lần xuất vào MỘT THƯ MỤC MỚI (theo thời gian) → không bao giờ đè/xóa file cũ mà iOS còn đang giữ
  // (nguyên nhân lỗi "You don't have access to the provided file" lúc được lúc không khi xuất lại cùng tên).
  const stamp = `pdf-${Date.now()}`;
  try {
    const FS: any = require('expo-file-system');
    if (FS?.File && FS?.Directory && FS?.Paths?.cache) {
      const dir = new FS.Directory(FS.Paths.cache, stamp);
      dir.create();
      const dest = new FS.File(dir, `${safe}.pdf`);
      await new FS.File(uri).copy(dest);   // BẤT ĐỒNG BỘ (Promise) — phải chờ xong mới chia sẻ
      return dest.uri ?? undefined;
    }
  } catch { /* thử legacy bên dưới */ }
  try {
    const Legacy: any = require('expo-file-system/legacy');
    if (Legacy?.cacheDirectory && Legacy?.copyAsync && Legacy?.makeDirectoryAsync) {
      const dir = `${Legacy.cacheDirectory}${stamp}/`;
      await Legacy.makeDirectoryAsync(dir, { intermediates: true });
      // Đường dẫn dạng URI phải mã hóa dấu cách/tiếng Việt.
      const target = `${dir}${encodeURIComponent(safe)}.pdf`;
      await Legacy.copyAsync({ from: uri, to: target });
      return target;
    }
  } catch { /* giữ uri gốc */ }
  return undefined;
}

/** true nếu đang chạy trên Safari iOS/iPadOS (kể cả iPad báo UA "Macintosh" nhưng có cảm ứng) —
 *  trình duyệt này KHÔNG hỗ trợ thuộc tính `<a download>` (bug WebKit tồn tại nhiều năm), nên
 *  saveImageOrDownload() phải dùng đường khác (Web Share API, hoặc mở ảnh ở tab mới). */
function isIOSWebView(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && typeof document !== 'undefined' && 'ontouchend' in document);
}

/** true nếu là Safari THẬT (iOS hoặc macOS) — các trình duyệt khác trên iOS (Chrome/Firefox/Edge)
 *  cũng có "Safari" trong UA vì đều dùng WebKit, nên phải loại trừ riêng. Chỉ Safari mới ưu tiên
 *  Web Share API; các trình duyệt còn lại (kể cả trên máy tính) tải file trực tiếp bằng `<a download>`
 *  thay vì bật khay chia sẻ hệ thống ngoài ý muốn (Chrome/Edge trên Windows gần đây cũng hỗ trợ
 *  navigator.share với file, dễ nhầm là Safari nếu không loại trừ). */
function isSafariBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /Safari/.test(ua) && !/Chrome|CriOS|Chromium|Edg|EdgiOS|FxiOS|OPR|OPiOS/.test(ua);
}

/** Lỗi DUY NHẤT ở saveImageOrDownload mà người dùng tự xử lý được (vào Cài đặt cấp quyền) — màn
 *  hình gọi hàm này nên hiện nguyên văn message này, còn lỗi khác (kỹ thuật/thư viện) thì không. */
export const PHOTO_PERMISSION_DENIED_MESSAGE = 'Cần cấp quyền truy cập Thư viện ảnh để lưu.';

/**
 * Lưu ảnh:
 * - Mobile: expo-media-library.
 * - Web: CHỈ Safari (iOS/macOS) mới ưu tiên Web Share API (mở khay chia sẻ có "Lưu vào Ảnh" — vì
 *   Safari không hỗ trợ thuộc tính `<a download>` đáng tin cậy). Trình duyệt khác (Chrome, Edge,
 *   Firefox...) tải trực tiếp bằng `<a download>`, kể cả khi trình duyệt đó CŨNG hỗ trợ
 *   navigator.share — tránh bật khay chia sẻ hệ thống ngoài ý muốn trên máy tính. Safari mà Share
 *   cũng không dùng được → mở ảnh ở tab mới để giữ tay lưu (Save Image).
 */
/** Trả về true khi ảnh đã được lưu/tải/chuyển đi; false khi người dùng tự hủy khay chia sẻ (Safari). */
export async function saveImageOrDownload(uri: string, fileName: string): Promise<boolean> {
  if (isWeb) {
    let blob: Blob | null = null;
    try {
      blob = await (await fetch(uri)).blob();
    } catch { /* fetch thất bại (vd CORS) → rơi xuống a[download] với uri gốc bên dưới */ }

    if (blob) {
      const nav: any = navigator;
      if (isSafariBrowser() && nav?.share && nav?.canShare) {
        try {
          const file = new File([blob], fileName, { type: blob.type || 'image/png' });
          if (nav.canShare({ files: [file] })) {
            await nav.share({ files: [file] });
            return true;
          }
        } catch (e: any) {
          if (e?.name === 'AbortError') return false; // người dùng tự hủy khay chia sẻ — không phải lỗi
          // các lỗi khác (vd không có app nhận) → thử cách tải xuống bên dưới
        }
      }

      const blobUrl = URL.createObjectURL(blob);
      if (isIOSWebView()) {
        // Safari iOS: không có API nào chắc chắn tải file — mở tab mới để người dùng giữ tay lưu ảnh.
        window.open(blobUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        return true;
      }
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
      return true;
    }

    // Không lấy được blob (vd fetch lỗi) → thử cách cũ với chính uri gốc.
    const a = document.createElement('a');
    a.href = uri;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  }
  let MediaLibrary: any;
  // SDK 57: export chính ("expo-media-library") đổi sang API class-based mới —
  // requestPermissionsAsync/saveToLibraryAsync dạng hàm giờ nằm ở "/legacy" (nếu gọi từ export
  // chính sẽ ném lỗi deprecated ngay khi chạy, không phải chỉ cảnh báo).
  try { MediaLibrary = require('expo-media-library/legacy'); } catch {
    throw new Error('Thiếu expo-media-library');
  }
  // writeOnly=true — chỉ xin quyền GHI vào thư viện ảnh, không xin quyền đọc
  // (app không cần duyệt/đọc ảnh có sẵn của người dùng, chỉ lưu ảnh mới tạo).
  const perm = await MediaLibrary.requestPermissionsAsync(true);
  if (!(perm.granted || perm.status === 'granted')) {
    throw new Error(PHOTO_PERMISSION_DENIED_MESSAGE);
  }
  await MediaLibrary.saveToLibraryAsync(uri);
  return true;
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
