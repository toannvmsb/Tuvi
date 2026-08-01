/**
 * Client cho tính năng "Hỏi Tuzi" — icon Chat AI nổi toàn app.
 * Gọi Edge Function `ai-chat` (server giữ quota + prompt, không lộ logic ra client).
 *
 * Quota: FREE_DAILY_LIMIT lượt/ngày miễn phí (đếm ở server). Vượt quota →
 * `sendChatMessage` trả về status 'quota' — UI (AiChatBubble) tự quyết định
 * hỏi xác nhận hay tự động trừ xu (nếu người dùng đã tích "không hỏi lại"),
 * rồi gọi `chargeAndSend` để trừ xu + gửi lại.
 */
import { supabase } from './supabase';
import { chargeAgain, PREMIUM } from '../constants/premium';

export const AI_CHAT_MAX_WORDS = 500;

export function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export type ChatSendResult =
  | { status: 'ok'; reply: string }
  | { status: 'quota'; freeLimit: number; cost: number }
  | { status: 'error'; message: string };

/**
 * Gửi 1 câu hỏi trong hạn mức miễn phí. Nếu hết quota, trả status 'quota' (không tự hỏi/trừ xu).
 * `chartFacts` (tùy chọn): khối facts GỌN của lá số đang gắn (xem `core/chatFacts.ts`) — gửi kèm
 * để AI trả lời đúng ngữ cảnh khi câu hỏi liên quan tới lá số; server chỉ dùng nếu phù hợp.
 */
export async function sendChatMessage(message: string, chartFacts?: string): Promise<ChatSendResult> {
  const trimmed = message.trim();
  if (!trimmed) return { status: 'error', message: 'Bạn chưa nhập câu hỏi.' };
  if (countWords(trimmed) > AI_CHAT_MAX_WORDS) {
    return { status: 'error', message: `Câu hỏi đang vượt quá ${AI_CHAT_MAX_WORDS} từ, bạn rút gọn lại giúp nhé.` };
  }

  const first = await callChatFn(trimmed, false, chartFacts);
  if (first.kind === 'ok') return { status: 'ok', reply: first.reply };
  if (first.kind === 'quota') return { status: 'quota', freeLimit: first.freeLimit, cost: PREMIUM.COST.aiChat };
  return { status: 'error', message: first.message };
}

/** Trừ xu (1 lượt) rồi gửi lại câu hỏi đã vượt quota. Gọi sau khi người dùng đồng ý (hoặc đã tích "không hỏi lại"). */
export async function chargeAndSend(message: string, chartFacts?: string): Promise<ChatSendResult> {
  const cost = PREMIUM.COST.aiChat;
  const chargeKey = `aichat:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  const charge = chargeAgain(chargeKey, 'ai', cost);
  if (!charge.ok) {
    return { status: 'error', message: `Số dư không đủ (cần ${cost} xu). Nạp thêm trong Menu → Nạp xu.` };
  }
  const second = await callChatFn(message.trim(), true, chartFacts);
  if (second.kind === 'ok') return { status: 'ok', reply: second.reply };
  return { status: 'error', message: second.kind === 'error' ? second.message : 'Có lỗi khi xác nhận lượt trả phí, thử lại nhé.' };
}

type ChatFnResult =
  | { kind: 'ok'; reply: string }
  | { kind: 'quota'; freeLimit: number }
  | { kind: 'error'; message: string };

async function callChatFn(message: string, paid: boolean, chartFacts?: string): Promise<ChatFnResult> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-chat', { body: { message, paid, chartFacts } });
    if (error) {
      const ctx = (error as any)?.context;
      if (ctx?.status === 402) {
        const body = await safeReadJson(ctx);
        return { kind: 'quota', freeLimit: body?.freeLimit ?? 5 };
      }
      return { kind: 'error', message: 'Tuzi đang bận, bạn thử lại sau ít phút nhé.' };
    }
    const reply = (data as any)?.reply as string | undefined;
    if (!reply) return { kind: 'error', message: 'Không nhận được câu trả lời, bạn thử lại nhé.' };
    return { kind: 'ok', reply };
  } catch {
    return { kind: 'error', message: 'Không kết nối được, bạn kiểm tra mạng rồi thử lại nhé.' };
  }
}

async function safeReadJson(ctx: any): Promise<any> {
  try { return typeof ctx?.json === 'function' ? await ctx.json() : null; } catch { return null; }
}
