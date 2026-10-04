/**
 * Lần vẽ chân dung ĐẦU TIÊN của mỗi tài khoản là miễn phí (supabase_portrait_free.sql).
 * Mọi lỗi mạng đều coi như "không còn lượt miễn phí" (tính xu như thường) — không bao giờ chặn việc vẽ.
 */
import { supabase } from './supabase';

/** Tài khoản này còn lượt vẽ miễn phí không? */
export async function isFreePortraitAvailable(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('portrait_free_available');
    return !error && data === true;
  } catch { return false; }
}

/**
 * Ghi nhận đã dùng lượt miễn phí (gọi SAU KHI vẽ thành công).
 * true = đây đúng là lượt miễn phí → KHÔNG trừ xu · false = lượt miễn phí đã dùng trước đó → trừ xu bình thường.
 * Lỗi mạng khi ghi nhận: không trừ xu (người dùng đã được hứa miễn phí) — lượt có thể được dùng lại, chấp nhận.
 */
export async function claimFreePortrait(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('claim_free_portrait');
    if (error) return true;
    return data === true;
  } catch { return true; }
}
