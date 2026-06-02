/**
 * Tải API KEY DÙNG CHUNG (của chủ app) từ Supabase (bảng app_secrets).
 * Ưu tiên OpenAI (ChatGPT) trước, lỗi mới sang Claude.
 */
import { supabase } from './supabase';
import { isOnlineMode } from './auth';

let serverKeys: { openaiApiKey?: string; anthropicApiKey?: string } | null = null;

/** Gọi sau khi đăng nhập để nạp key vào bộ nhớ. */
export async function loadAiKeys(): Promise<void> {
  if (!isOnlineMode()) return;
  try {
    const { data } = await supabase.from('app_secrets').select('openai_key, claude_key').eq('id', 'ai').single();
    if (data) {
      serverKeys = {
        openaiApiKey: (data as any).openai_key || undefined,
        anthropicApiKey: (data as any).claude_key || undefined,
      };
    }
  } catch { /* không có quyền / chưa cấu hình → bỏ qua, dùng key nhập tay */ }
}

/** Trả key dùng chung (provider luôn ưu tiên OpenAI → Claude). null nếu chưa có. */
export function getServerAiKeys(): { openaiApiKey?: string; anthropicApiKey?: string; aiProvider: 'openai' } | null {
  if (!serverKeys || (!serverKeys.openaiApiKey && !serverKeys.anthropicApiKey)) return null;
  return { ...serverKeys, aiProvider: 'openai' };
}
