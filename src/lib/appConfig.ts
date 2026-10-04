/**
 * Fetch cấu hình giá từ Supabase (bảng app_config) và áp dụng vào
 * PREMIUM.COST + COMBOS để app dùng giá admin thiết lập, không hardcode.
 *
 * Gọi một lần khi khởi động app (cả khách lẫn user đã đăng nhập).
 * Nếu mạng lỗi hoặc Supabase chưa sẵn sàng → giữ nguyên giá mặc định.
 */
import { supabase } from './supabase';
import { SUPABASE_READY } from './supabaseConfig';
import { PREMIUM } from '../constants/premium';
import { COMBOS } from '../constants/combos';

let loaded = false; // chỉ fetch 1 lần mỗi phiên app

export async function loadAppConfig(): Promise<void> {
  if (!SUPABASE_READY || loaded) return;
  loaded = true;

  try {
    const { data, error } = await supabase.rpc('get_app_config');
    if (error || !data) return;

    const cfg = data as Record<string, number>;

    // ── Áp dụng vào PREMIUM.COST ──
    if (cfg.price_ai          > 0) PREMIUM.COST.ai            = cfg.price_ai;
    if (cfg.price_ai_medium   > 0) PREMIUM.COST.aiMedium      = cfg.price_ai_medium;
    if (cfg.price_ai_large    > 0) PREMIUM.COST.aiLarge       = cfg.price_ai_large;
    // price_ai_compare: dùng giá riêng nếu có, fallback về price_ai (cùng loại "AI nhỏ")
    if (cfg.price_ai_compare  > 0) PREMIUM.COST.aiCompare     = cfg.price_ai_compare;
    else if (cfg.price_ai     > 0) PREMIUM.COST.aiCompare     = cfg.price_ai;
    if (cfg.price_advanced    > 0) PREMIUM.COST.advanced      = cfg.price_advanced;
    if (cfg.price_advanced_major > 0) PREMIUM.COST.advancedMajor = cfg.price_advanced_major;
    if (cfg.price_past_life   > 0) PREMIUM.COST.pastLife     = cfg.price_past_life;
    if (cfg.price_future_life > 0) PREMIUM.COST.futureLife   = cfg.price_future_life;

    // ── Áp dụng vào COMBOS (cost + tính lại priceVnd theo tỉ giá) ──
    const rate = cfg.xu_topup_rate > 0 ? cfg.xu_topup_rate : 100;

    const basicCombo = COMBOS.find(c => c.id === 'lifetime_basic');
    if (basicCombo && cfg.price_bundle_basic > 0) {
      basicCombo.cost     = cfg.price_bundle_basic;
      basicCombo.priceVnd = cfg.price_bundle_basic * rate;
    }

    const fullCombo = COMBOS.find(c => c.id === 'lifetime_full');
    if (fullCombo && cfg.price_bundle_full > 0) {
      fullCombo.cost     = cfg.price_bundle_full;
      fullCombo.priceVnd = cfg.price_bundle_full * rate;
    }
  } catch {
    // Lỗi mạng → giữ nguyên giá hardcode trong premium.ts / combos.ts
  }
}

/** Reset cờ loaded (dùng khi test, hoặc muốn force reload). */
export function resetAppConfigCache(): void {
  loaded = false;
}
