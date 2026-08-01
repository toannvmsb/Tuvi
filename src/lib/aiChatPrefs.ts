/**
 * Tuỳ chọn cục bộ cho tính năng Chat AI nổi "Hỏi Tuzi":
 *  - "Không hỏi lại lần sau" khi vượt quota miễn phí — bỏ qua hộp thoại xác
 *    nhận trừ xu ở các lần sau (vì số tiền nhỏ, hỏi mỗi lần gây phiền).
 *  - Banner "miễn phí 5 lượt/ngày" — chỉ hiện 1 lần/ngày (lần đầu dùng hoặc
 *    ngày mới), không hiện lại trong cùng ngày.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const SKIP_CONFIRM_KEY = 'aichat_skip_charge_confirm';
const BANNER_DATE_KEY = 'aichat_last_banner_date';

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function getSkipChargeConfirm(): Promise<boolean> {
  try { return (await AsyncStorage.getItem(SKIP_CONFIRM_KEY)) === '1'; } catch { return false; }
}

export async function setSkipChargeConfirm(skip: boolean): Promise<void> {
  try { await AsyncStorage.setItem(SKIP_CONFIRM_KEY, skip ? '1' : '0'); } catch { /* bỏ qua */ }
}

/**
 * true nếu CHƯA thấy banner quota hôm nay (lần đầu dùng hoặc sang ngày mới) —
 * gọi 1 lần khi mở modal chat; tự đánh dấu "đã xem hôm nay" ngay khi gọi.
 */
export async function consumeDailyBannerFlag(): Promise<boolean> {
  try {
    const last = await AsyncStorage.getItem(BANNER_DATE_KEY);
    const today = todayISO();
    if (last === today) return false;
    await AsyncStorage.setItem(BANNER_DATE_KEY, today);
    return true;
  } catch { return false; }
}
