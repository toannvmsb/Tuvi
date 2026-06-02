/**
 * Web-compatible alert/confirm system.
 * Trên web, Alert.alert() dùng window.confirm() — bị block trong iframe.
 * Module này cung cấp API giống Alert nhưng dùng React modal thực sự.
 *
 * Cách dùng:
 *   import { webAlert } from '../lib/webAlert';
 *   webAlert.alert('Tiêu đề', 'Nội dung', [...buttons]);
 *
 * App.tsx phải mount <WebAlertHost /> ở root để nhận dialog.
 */
import { Platform, Alert } from 'react-native';

export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export interface AlertRequest {
  id: number;
  title: string;
  message?: string;
  buttons: AlertButton[];
}

type Listener = (req: AlertRequest | null) => void;

let _id = 0;
let _listener: Listener | null = null;
let _pendingResolve: (() => void) | null = null;

export const webAlert = {
  /** Đăng ký listener từ WebAlertHost component. */
  setListener(fn: Listener) {
    _listener = fn;
    // Khi WebAlertHost mount, patch Alert.alert để tất cả Alert trong app đi qua đây.
    if (Platform.OS === 'web') {
      (Alert as any).alert = (title: string, message?: string, buttons?: AlertButton[], _opts?: any) => {
        webAlert.alert(title, message, buttons);
      };
    }
  },

  /** Hiện dialog. Tương đương Alert.alert(). */
  alert(
    title: string,
    message?: string,
    buttons: AlertButton[] = [{ text: 'OK' }],
    _options?: { onDismiss?: () => void },
  ): void {
    if (Platform.OS !== 'web' || !_listener) {
      Alert.alert(title, message || '', buttons as any);
      return;
    }
    _id += 1;
    _listener({ id: _id, title, message, buttons });
  },

  /** Đóng dialog hiện tại (gọi từ WebAlertHost sau khi user chọn). */
  dismiss() { _listener?.(null); },
};
