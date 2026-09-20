/**
 * Nạp font của ngôn ngữ thiết kế mới. Gọi 1 lần ở App.tsx; trong lúc chưa nạp xong
 * thì app dùng font hệ thống (KHÔNG chặn khởi động — xem `fontsReady` ở Boot).
 */
import { useFonts } from 'expo-font';
import {
  CormorantGaramond_600SemiBold,
  CormorantGaramond_700Bold,
  CormorantGaramond_500Medium_Italic,
} from '@expo-google-fonts/cormorant-garamond';
import {
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
} from '@expo-google-fonts/be-vietnam-pro';

export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    CormorantGaramond_600SemiBold,
    CormorantGaramond_700Bold,
    CormorantGaramond_500Medium_Italic,
    BeVietnamPro_400Regular,
    BeVietnamPro_500Medium,
    BeVietnamPro_600SemiBold,
    BeVietnamPro_700Bold,
  });
  // Lỗi nạp font → coi như xong (dùng font hệ thống), không kẹt màn khởi động.
  return loaded || !!error;
}
