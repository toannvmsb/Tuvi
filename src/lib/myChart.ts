/**
 * Lưu "Lá số của tôi" (id) để màn Home lấy ra đưa lời khuyên Ngày hôm nay.
 * Lưu cục bộ bằng AsyncStorage (1 lá số chính).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'myChartId';

export async function getMyChartId(): Promise<string | null> {
  try { return await AsyncStorage.getItem(KEY); } catch { return null; }
}

export async function setMyChartId(id: string | null): Promise<void> {
  try {
    if (id) await AsyncStorage.setItem(KEY, id);
    else await AsyncStorage.removeItem(KEY);
  } catch { /* bỏ qua */ }
}
