/** Thông tin phiên bản & bản quyền ứng dụng. */
import Constants from 'expo-constants';

export const APP_VERSION: string =
  (Constants?.expoConfig as any)?.version ||
  (Constants as any)?.manifest?.version ||
  '1.0.0';

export const COPYRIGHT = 'Bản quyền phần mềm thuộc về Nguyễn Văn Toàn';
