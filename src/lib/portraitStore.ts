/**
 * Kho chân dung đã vẽ — lưu OFFLINE trên chính máy đã tạo ảnh.
 *  - Mobile: tải ảnh về thư mục tài liệu của app (expo-file-system) + ghi danh sách vào AsyncStorage.
 *    Đổi máy / xóa dữ liệu app thì mất ảnh (đúng chủ ý).
 *  - Web: không có thư mục riêng → chỉ nhớ đường dẫn ảnh (đã lưu ở kho ảnh công khai của Tuzi) trong localStorage.
 * Danh sách tách theo lá số (chartId); chưa có chartId thì dùng nhóm 'guest'.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isWeb } from './platform';

export interface SavedPortrait { id: string; uri: string; createdAt: number }

const key = (chartKey: string) => `portraitGallery:${chartKey}`;
export const galleryKeyOf = (chartId?: string | null) => chartId || 'guest';

export async function listPortraits(chartKey: string): Promise<SavedPortrait[]> {
  try {
    const raw = await AsyncStorage.getItem(key(chartKey));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
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
  if (!isWeb) {
    try { uri = await downloadToDocuments(remoteUrl, `tuzi-portrait-${id}.png`); } catch { uri = remoteUrl; }
  }
  const item: SavedPortrait = { id, uri, createdAt: Date.now() };
  const list = await listPortraits(chartKey);
  const next = [item, ...list];
  try { await AsyncStorage.setItem(key(chartKey), JSON.stringify(next)); } catch { /* bỏ qua */ }
  return item;
}
