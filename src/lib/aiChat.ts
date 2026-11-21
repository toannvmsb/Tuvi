/**
 * Client cho tính năng "Hỏi Tuzi" — icon Chat AI nổi toàn app.
 * Gọi Edge Function `ai-chat` (server giữ quota + prompt, không lộ logic ra client).
 *
 * Quota: FREE_DAILY_LIMIT lượt/ngày miễn phí (đếm ở server). Vượt quota →
 * `sendChatMessage` trả về status 'quota' — UI (AiChatBubble) tự quyết định
 * hỏi xác nhận hay tự động trả phí (nếu người dùng đã tích "không hỏi lại"),
 * rồi gọi `chargeAndSend`. MÁY CHỦ tự trừ xu (client chỉ báo "đồng ý trả phí" và nhận số dư mới) —
 * client KHÔNG tự trừ xu để tránh trừ hai lần và để không ai bỏ qua được việc trả phí.
 */
import { supabase } from './supabase';
import { PREMIUM, wallet, seedWallet } from '../constants/premium';

export const AI_CHAT_MAX_WORDS = 500;
// Chỉ gửi kèm N lượt hỏi-đáp GẦN NHẤT của phiên đang mở làm ngữ cảnh (khớp với
// MAX_HISTORY_TURNS phía server) — tránh payload phình to khi chat kéo dài.
const HISTORY_TURNS_SENT = 6;

export function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export type ChatTurn = { question: string; answer: string };

export type ChatSendResult =
  | { status: 'ok'; reply: string }
  | { status: 'quota'; freeLimit: number; cost: number }
  | { status: 'error'; message: string };

/**
 * Gửi 1 câu hỏi trong hạn mức miễn phí. Nếu hết quota, trả status 'quota' (không tự hỏi/trừ xu).
 * `history` (tùy chọn): các lượt hỏi-đáp TRƯỚC ĐÓ trong phiên chat đang mở (state trên máy, KHÔNG
 * lưu server) — gửi kèm để AI hiểu mạch hội thoại thay vì coi mỗi câu hỏi độc lập.
 * `chartFacts` (tùy chọn): khối facts GỌN của lá số đang gắn (xem `core/chatFacts.ts`) — gửi kèm
 * để AI trả lời đúng ngữ cảnh khi câu hỏi liên quan tới lá số; server chỉ dùng nếu phù hợp.
 */
export async function sendChatMessage(message: string, history?: ChatTurn[], chartFacts?: string): Promise<ChatSendResult> {
  const trimmed = message.trim();
  if (!trimmed) return { status: 'error', message: 'Bạn chưa nhập câu hỏi.' };
  if (countWords(trimmed) > AI_CHAT_MAX_WORDS) {
    return { status: 'error', message: `Câu hỏi đang vượt quá ${AI_CHAT_MAX_WORDS} từ, bạn rút gọn lại giúp nhé.` };
  }

  const first = await callChatFn(trimmed, false, history, chartFacts);
  if (first.kind === 'ok') return { status: 'ok', reply: first.reply };
  if (first.kind === 'quota') return { status: 'quota', freeLimit: first.freeLimit, cost: PREMIUM.COST.aiChat };
  if (first.kind === 'insufficient') return { status: 'error', message: `Số dư không đủ (cần ${first.cost} xu). Nạp thêm trong Menu → Nạp xu.` };
  return { status: 'error', message: first.message };
}

/** Gửi lại câu hỏi đã vượt quota với ý định TRẢ PHÍ (người dùng đã đồng ý hoặc đã tích "không hỏi lại"). Máy chủ tự trừ xu và trả số dư mới. */
export async function chargeAndSend(message: string, history?: ChatTurn[], chartFacts?: string): Promise<ChatSendResult> {
  const cost = PREMIUM.COST.aiChat;
  // Kiểm tra nhanh phía máy cho đỡ tốn một lượt gọi; nguồn sự thật là máy chủ (có thể báo không đủ xu dù số dư cục bộ chưa cập nhật).
  if (wallet.balance < cost) {
    return { status: 'error', message: `Số dư không đủ (cần ${cost} xu). Nạp thêm trong Menu → Nạp xu.` };
  }
  const second = await callChatFn(message.trim(), true, history, chartFacts);
  if (second.kind === 'ok') {
    if (typeof second.balance === 'number') seedWallet({ balance: second.balance });
    return { status: 'ok', reply: second.reply };
  }
  if (second.kind === 'insufficient') {
    seedWallet({ balance: second.balance });
    return { status: 'error', message: `Số dư không đủ (cần ${second.cost} xu). Nạp thêm trong Menu → Nạp xu.` };
  }
  return { status: 'error', message: second.kind === 'error' ? second.message : 'Có lỗi khi xác nhận lượt trả phí, thử lại nhé.' };
}

type ChatFnResult =
  | { kind: 'ok'; reply: string; balance?: number }
  | { kind: 'quota'; freeLimit: number }
  | { kind: 'insufficient'; balance: number; cost: number }
  | { kind: 'error'; message: string };

async function callChatFn(message: string, paid: boolean, history: ChatTurn[] | undefined, chartFacts?: string): Promise<ChatFnResult> {
  try {
    const trimmedHistory = history?.slice(-HISTORY_TURNS_SENT);
    const { data, error } = await supabase.functions.invoke('ai-chat', { body: { message, paid, history: trimmedHistory, chartFacts } });
    if (error) {
      const ctx = (error as any)?.context;
      if (ctx?.status === 402) {
        const body = await safeReadJson(ctx);
        if (body?.error === 'insufficient_xu') {
          return { kind: 'insufficient', balance: typeof body.balance === 'number' ? body.balance : 0, cost: typeof body.cost === 'number' ? body.cost : PREMIUM.COST.aiChat };
        }
        return { kind: 'quota', freeLimit: body?.freeLimit ?? 5 };
      }
      return { kind: 'error', message: 'Tuzi đang bận, bạn thử lại sau ít phút nhé.' };
    }
    const reply = (data as any)?.reply as string | undefined;
    if (!reply) return { kind: 'error', message: 'Không nhận được câu trả lời, bạn thử lại nhé.' };
    const balance = (data as any)?.balance;
    return { kind: 'ok', reply, ...(typeof balance === 'number' ? { balance } : {}) };
  } catch {
    return { kind: 'error', message: 'Không kết nối được, bạn kiểm tra mạng rồi thử lại nhé.' };
  }
}

async function safeReadJson(ctx: any): Promise<any> {
  try { return typeof ctx?.json === 'function' ? await ctx.json() : null; } catch { return null; }
}
