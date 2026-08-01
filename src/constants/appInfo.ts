/** Thông tin phiên bản & bản quyền ứng dụng. */
import Constants from 'expo-constants';

export const APP_VERSION: string =
  (Constants?.expoConfig as any)?.version ||
  (Constants as any)?.manifest?.version ||
  '1.0.1';

export const COPYRIGHT = '© 2026 Tuzi.vn';
