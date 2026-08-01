/**
 * Lưu lựa chọn nhân vật đại diện cục bộ trên máy (AsyncStorage) — cùng kiểu
 * "tuỳ chọn nhẹ" như aiChatPrefs.ts, không cần bảng riêng trên Supabase.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_AVATAR_ID } from '../core/avatarCatalog';

const KEY = 'selectedAvatarId';

export async function getSelectedAvatarId(): Promise<string> {
  try { return (await AsyncStorage.getItem(KEY)) || DEFAULT_AVATAR_ID; } catch { return DEFAULT_AVATAR_ID; }
}

export async function setSelectedAvatarId(id: string): Promise<void> {
  try { await AsyncStorage.setItem(KEY, id); } catch { /* bỏ qua */ }
}
