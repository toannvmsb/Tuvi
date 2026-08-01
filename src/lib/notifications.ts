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
import AsyncStorage from '@react-native-async-storage/async-storage';
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

// ───────────── LÊN LỊCH THÔNG BÁO (hiện cả khi app ĐÃ ĐÓNG) ─────────────
const SCHED_IDS_KEY = 'scheduled_reminder_ids';

async function ensurePermission(): Promise<boolean> {
  const perm = await Notifications.getPermissionsAsync();
  if (perm.granted || perm.status === 'granted') return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted || req.status === 'granted';
}

/** Hủy toàn bộ thông báo đã lên lịch trước đó của app (trước khi lên lịch lại). */
export async function cancelAppReminders(): Promise<void> {
  if (!Notifications) return;
  ensureConfig();
  try {
    const raw = await AsyncStorage.getItem(SCHED_IDS_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    for (const id of ids) { try { await Notifications.cancelScheduledNotificationAsync(id); } catch {} }
    await AsyncStorage.removeItem(SCHED_IDS_KEY);
  } catch { /* bỏ qua */ }
}

/** Lên lịch 1 thông báo vào thời điểm `when` (tương lai). Lưu lại id để hủy sau. */
export async function scheduleReminderAt(when: Date, title: string, body: string): Promise<void> {
  if (!Notifications) return;
  ensureConfig();
  if (when.getTime() <= Date.now()) return;
  try {
    if (!(await ensurePermission())) return;
    const id: string = await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: { type: 'date', date: when },
    });
    const raw = await AsyncStorage.getItem(SCHED_IDS_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    ids.push(id);
    await AsyncStorage.setItem(SCHED_IDS_KEY, JSON.stringify(ids));
  } catch { /* Expo Go / không hỗ trợ → bỏ qua */ }
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
