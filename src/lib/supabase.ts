/**
 * Khởi tạo Supabase client cho React Native (Expo) + Web.
 * - Native (iOS/Android): lưu phiên bằng expo-secure-store (mã hoá phần cứng),
 *   chunked vì SecureStore giới hạn 2048 bytes/key (tránh lỗi Android).
 * - Web: SecureStore KHÔNG hỗ trợ → dùng AsyncStorage (localStorage). Nếu dùng
 *   SecureStore trên web, việc đọc phiên sẽ treo → app kẹt ở màn loading 90%.
 */
import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseConfig';

const CHUNK = 1800;

const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const count = await SecureStore.getItemAsync(`${key}_n`);
    if (!count) return SecureStore.getItemAsync(key);
    const n = parseInt(count, 10);
    const parts: string[] = [];
    for (let i = 0; i < n; i++) {
      const chunk = await SecureStore.getItemAsync(`${key}_${i}`);
      if (chunk == null) return null;
      parts.push(chunk);
    }
    return parts.join('');
  },
  async setItem(key: string, value: string): Promise<void> {
    if (value.length <= CHUNK) {
      await SecureStore.setItemAsync(key, value);
      return;
    }
    const n = Math.ceil(value.length / CHUNK);
    await SecureStore.setItemAsync(`${key}_n`, String(n));
    for (let i = 0; i < n; i++) {
      await SecureStore.setItemAsync(`${key}_${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK));
    }
  },
  async removeItem(key: string): Promise<void> {
    const count = await SecureStore.getItemAsync(`${key}_n`);
    if (count) {
      const n = parseInt(count, 10);
      for (let i = 0; i < n; i++) await SecureStore.deleteItemAsync(`${key}_${i}`);
      await SecureStore.deleteItemAsync(`${key}_n`);
    }
    await SecureStore.deleteItemAsync(key);
  },
};

// Web → AsyncStorage (localStorage); Native → SecureStore chunked (mã hoá).
const authStorage = Platform.OS === 'web' ? (AsyncStorage as any) : secureStorage;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
