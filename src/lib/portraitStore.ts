/**
 * Kho chân dung đã vẽ — lưu OFFLINE trên chính máy đã tạo ảnh.
 *  - Mobile: tải ảnh về thư mục tài liệu của app (expo-file-system) + ghi danh sách vào AsyncStorage.
 *    Đổi máy / xóa dữ liệu app thì mất ảnh (đúng chủ ý).
 *  - Web: không có thư mục riêng → chỉ nhớ đường dẫn ảnh (đã lưu ở kho ảnh công khai của Tuzi) trong localStorage.
 * Danh sách tách RIÊNG theo từng lá số (chartId): đổi "lá số của tôi" sang lá số khác thì hiện kho ảnh
 * của lá số đó; kho ảnh của lá số cũ vẫn được giữ nguyên, quay lại lá số cũ là xem lại được.
 * Chưa có chartId thì dùng nhóm 'guest'.
 *
 * Độ bền của ảnh trên mobile (tránh "mất ảnh" dù danh sách còn):
 *  - Chỉ nhớ TÊN FILE (`file`) rồi ghép lại với thư mục tài liệu HIỆN TẠI mỗi lần đọc — không phụ thuộc
 *    đường dẫn tuyệt đối cũ (iOS có thể đổi đường dẫn thư mục dữ liệu app sau khi cập nhật/cài lại).
 *  - Nhớ cả đường dẫn gốc trên server (`remote`) để màn hình tự dùng lại khi file cục bộ không còn mở được.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isWeb } from './platform';

export interface SavedPortrait {
  id: string;
  /** Đường dẫn dùng để hiển thị: file cục bộ (mobile) hoặc URL ảnh (web). Luôn được tính lại lúc đọc. */
  uri: string;
  createdAt: number;
  /** URL ảnh gốc trên server — dự phòng khi file cục bộ không còn. */
  remote?: string;
  /** Tên file đã tải về thư mục tài liệu (chỉ mobile). */
  file?: string;
}

const key = (chartKey: string) => `portraitGallery:${chartKey}`;
export const galleryKeyOf = (chartId?: string | null) => chartId || 'guest';

/** Thư mục tài liệu hiện tại của app (kết thúc bằng "/"), null nếu không lấy được. */
function documentsDirUri(): string | null {
  try {
    const FS: any = require('expo-file-system');
    const u: string | undefined = FS?.Paths?.document?.uri;
    if (u) return u.endsWith('/') ? u : `${u}/`;
  } catch { /* thử API cũ */ }
  try {
    const Legacy: any = require('expo-file-system/legacy');
    if (Legacy?.documentDirectory) return Legacy.documentDirectory;
  } catch { /* bỏ qua */ }
  return null;
}

/** Ghép lại đường dẫn hiển thị từ tên file + thư mục tài liệu hiện tại (mục cũ chưa có `file` giữ nguyên `uri`). */
function withResolvedUri(it: SavedPortrait): SavedPortrait {
  if (isWeb || !it.file) return it;
  const dir = documentsDirUri();
  return dir ? { ...it, uri: `${dir}${it.file}` } : it;
}

export async function listPortraits(chartKey: string): Promise<SavedPortrait[]> {
  try {
    const raw = await AsyncStorage.getItem(key(chartKey));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? (arr as SavedPortrait[]).map(withResolvedUri) : [];
  } catch {
    return [];
  }
}

/** Tải ảnh về thư mục tài liệu của app (bền, không bị dọn như cache). */
async function downloadToDocuments(url: string, fileName: string): Promise<string> {
  try {
    const FS: any = require('expo-file-system');
    if (FS?.File && FS?.Paths?.document) {
      const dest = new FS.File(FS.Paths.document, fileName);
      try { if (dest.exists) dest.delete(); } catch { /* bỏ qua */ }
      const out = await FS.File.downloadFileAsync(url, dest);
      return out?.uri ?? dest.uri;
    }
  } catch { /* thử API cũ */ }
  const Legacy: any = require('expo-file-system/legacy');
  const target = `${Legacy.documentDirectory}${fileName}`;
  const r = await Legacy.downloadAsync(url, target);
  return r.uri;
}

/** Lưu 1 ảnh vừa vẽ vào kho của lá số; trả về mục đã lưu (uri cục bộ trên mobile). */
export async function addPortrait(chartKey: string, remoteUrl: string): Promise<SavedPortrait> {
  const id = `${Date.now()}`;
  let uri = remoteUrl;
  let file: string | undefined;
  if (!isWeb) {
    const fileName = `tuzi-portrait-${id}.png`;
    try { uri = await downloadToDocuments(remoteUrl, fileName); file = fileName; } catch { uri = remoteUrl; }
  }
  const item: SavedPortrait = { id, uri, createdAt: Date.now(), remote: remoteUrl, ...(file ? { file } : {}) };
  // Đọc danh sách GỐC (chưa ghép lại đường dẫn) để không ghi đè `uri` đã tính lại vào kho.
  let stored: SavedPortrait[] = [];
  try {
    const raw = await AsyncStorage.getItem(key(chartKey));
    const arr = raw ? JSON.parse(raw) : [];
    if (Array.isArray(arr)) stored = arr;
  } catch { /* bỏ qua */ }
  try { await AsyncStorage.setItem(key(chartKey), JSON.stringify([item, ...stored])); } catch { /* bỏ qua */ }
  return item;
}
