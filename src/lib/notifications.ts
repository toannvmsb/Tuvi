/**
 * Thông báo (notification) cho app.
 *  - Thông báo CỤC BỘ (local): hiện ngay trên máy khi app phát hiện sự kiện
 *    (vd nạp xu thành công lúc đang mở app).
 *  - Đăng ký PUSH TOKEN (Expo): lưu token vào profiles.expo_push_token để máy
 *    chủ (Edge Function webhook) đẩy thông báo cả khi app đã đóng.
 *
 * Lưu ý: PUSH thật cần BẢN BUILD (dev build/standalone), không chạy đầy đủ trong
 * Expo Go. Thông báo CỤC BỘ thì chạy được khi app đang mở.
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';
import { isOnlineMode } from './auth';

let Notifications: any;
try { Notifications = require('expo-notifications'); } catch { Notifications = null; }

let configured = false;
function ensureConfig() {
  if (configured || !Notifications) return;
  configured = true;
  // Khi app đang mở (foreground) vẫn hiện banner + phát âm.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true, shouldShowList: true,
      shouldPlaySound: true, shouldSetBadge: false,
      // tương thích bản cũ
      shouldShowAlert: true,
    }),
  });
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'Thông báo', importance: Notifications.AndroidImportance?.DEFAULT ?? 3,
    }).catch(() => {});
  }
}

/** Hiện 1 thông báo cục bộ ngay lập tức. */
export async function notifyLocal(title: string, body: string): Promise<void> {
  if (!Notifications) return;
  ensureConfig();
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!(perm.granted || perm.status === 'granted')) {
      const req = await Notifications.requestPermissionsAsync();
      if (!(req.granted || req.status === 'granted')) return;
    }
    await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null });
  } catch { /* bỏ qua nếu môi trường không hỗ trợ */ }
}

/** Xin quyền + lấy Expo push token + lưu vào hồ sơ (để webhook đẩy push). */
export async function registerForPush(): Promise<void> {
  if (!Notifications || !isOnlineMode()) return;
  ensureConfig();
  try {
    const perm = await Notifications.getPermissionsAsync();
    let ok = perm.granted || perm.status === 'granted';
    if (!ok) {
      const req = await Notifications.requestPermissionsAsync();
      ok = req.granted || req.status === 'granted';
    }
    if (!ok) return;

    const projectId =
      (Constants?.expoConfig as any)?.extra?.eas?.projectId ||
      (Constants as any)?.easConfig?.projectId;
    const tokenRes = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    const token = tokenRes?.data;
    if (!token) return;

    const { data: ures } = await supabase.auth.getUser();
    const uid = ures.user?.id;
    if (uid) {
      await supabase.from('profiles').update({ expo_push_token: token }).eq('id', uid);
    }
  } catch { /* Expo Go / chưa có projectId → bỏ qua, vẫn dùng được local */ }
}
