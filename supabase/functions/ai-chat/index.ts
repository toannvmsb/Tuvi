/**
 * Supabase Edge Function — AI CHAT (icon nổi "Hỏi Tuzi")
 *
 * Trợ lý AI đời sống chung (Life Intelligence) — KHÔNG phải phân tích lá số
 * (các màn AI lá số vẫn dùng utils/aiAnalysis.ts riêng, có đủ facts lá số).
 * Giới hạn 500 từ CẢ câu hỏi lẫn câu trả lời.
 *
 * Quota: FREE_DAILY_LIMIT lượt/ngày MIỄN PHÍ, đếm qua bảng ai_chat_usage
 * (chỉ đếm số lượt — KHÔNG lưu nội dung chat). Vượt quota → trả 402, client
 * tự hỏi trừ xu rồi gọi lại kèm { paid: true }.
 *
 * TRIỂN KHAI: supabase functions deploy ai-chat
 * (cần đã chạy supabase_ai_chat.sql để tạo bảng ai_chat_usage.)
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FREE_DAILY_LIMIT = 5;
const MAX_WORDS = 500;
const MAX_CHART_FACTS_CHARS = 2000; // khối facts gọn, chặn giá trị bất thường từ client

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json' } });

const svc = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function truncateWords(s: string, maxWords: number): string {
  const words = s.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return s.trim();
  return words.slice(0, maxWords).join(' ') + '…';
}

const BASE_SYSTEM_PROMPT =
  'Bạn là Tuzi — trợ lý AI đồng hành đời sống (Life Intelligence) trong ứng dụng Tuzi.\n' +
  `Trả lời NGẮN GỌN, TỐI ĐA ${MAX_WORDS} từ, bằng tiếng Việt (trừ khi người dùng hỏi bằng ngôn ngữ khác).\n` +
  'Hỗ trợ các chủ đề đời sống chung: công việc, tài chính cá nhân, các mối quan hệ, sức khỏe tinh thần, ' +
  'thói quen, mục tiêu cá nhân — có thể liên hệ nhẹ tới góc nhìn Tử Vi/Bát Tự nếu người dùng hỏi tới.\n' +
  'KHÔNG đưa chẩn đoán y tế, khuyến nghị đầu tư tài chính cụ thể, hay tư vấn pháp lý mang tính quyết định — ' +
  'chỉ gợi ý hướng đi chung và khuyến khích tham khảo chuyên gia khi cần.\n' +
  'Giọng văn ấm áp, thực tế, đi thẳng vào trọng tâm, không sáo rỗng, không lặp lại câu hỏi của người dùng.';

/**
 * Ghép thêm khối facts GỌN của lá số (nếu client gửi kèm) vào system prompt.
 * CHỈ dùng khi câu hỏi thực sự liên quan tới lá số/vận mệnh cá nhân — nếu
 * không, bỏ qua khối này và trả lời như bình thường (không ép nhắc tới lá số).
 */
function buildSystemPrompt(chartFacts?: string): string {
  if (!chartFacts) {
    return BASE_SYSTEM_PROMPT +
      '\nBạn KHÔNG có dữ liệu lá số của người dùng trong cuộc trò chuyện này — nếu câu hỏi cần phân tích lá số ' +
      'thật, đừng bịa chi tiết, hãy gợi ý người dùng mở mục Tử Vi/Bát Tự trong app.';
  }
  return BASE_SYSTEM_PROMPT +
    '\n\nDữ liệu THẬT từ lá số Tử Vi/Bát Tự đã lưu của người dùng (lấy từ đúng lá số đang gắn trong app, không phải suy đoán):\n' +
    chartFacts +
    '\n\nCHỈ dùng khối dữ liệu trên khi câu hỏi của người dùng liên quan tới lá số, vận mệnh, tính cách, tài lộc, ' +
    'sự nghiệp, tình duyên hay thời điểm tốt/xấu của CHÍNH họ. Nếu câu hỏi không liên quan, bỏ qua hoàn toàn khối ' +
    'này và trả lời bình thường. KHÔNG bịa thêm chi tiết lá số nào ngoài dữ liệu đã cho ở trên.\n\n' +
    'QUAN TRỌNG khi tư vấn NGÀY/THÁNG đẹp để làm việc gì đó: PHẢI đối chiếu với "Tháng âm hiện tại" trong dữ liệu ' +
    'trên trước khi trả lời — KHÔNG được nêu một tháng đã qua như thể nó còn ở phía trước. Nếu tháng đẹp nhất cả ' +
    'năm đã qua (bị đánh dấu "ĐÃ QUA"), phải nói rõ điều đó rồi gợi ý tháng đẹp nhất trong các tháng CÒN LẠI thay ' +
    'thế — theo CÁCH DIỄN ĐẠT: "Tháng đẹp nhất của anh/chị là tháng [X] nhưng đã qua rồi, trong các tháng còn lại ' +
    'của năm thì tháng [Y] là phù hợp nhất để khởi sự việc này." [X] và [Y] CHỈ là ký hiệu minh họa cấu trúc câu — ' +
    'PHẢI thay bằng đúng số tháng lấy từ dữ liệu thực tế ở trên của NGƯỜI DÙNG NÀY (khác nhau tùy từng lá số), ' +
    'TUYỆT ĐỐI KHÔNG lặp lại số tháng trong câu ví dụ này cho mọi người. Áp dụng logic tương tự khi được hỏi về ' +
    'ngày đẹp trong tháng.';
}

async function tryOpenAI(message: string, apiKey: string, systemPrompt: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 1400,
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OPENAI_${res.status}`);
  const j = await res.json();
  return (j?.choices?.[0]?.message?.content ?? '').trim();
}

async function tryClaude(message: string, apiKey: string, systemPrompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1400,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }],
    }),
  });
  if (!res.ok) throw new Error(`ANTHROPIC_${res.status}`);
  const j = await res.json();
  const blocks = Array.isArray(j?.content) ? j.content : [];
  return blocks.filter((b: any) => b?.type === 'text').map((b: any) => b.text).join('\n').trim();
}

async function tryFreePollinations(message: string, systemPrompt: string): Promise<string> {
  const res = await fetch('https://text.pollinations.ai/openai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'openai-fast',
      stream: false,
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 1400,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
    }),
  });
  if (!res.ok) throw new Error(`POLLINATIONS_${res.status}`);
  const j = await res.json();
  return (j?.choices?.[0]?.message?.content ?? '').trim();
}

async function verifyUser(req: Request): Promise<string | null> {
  const auth = req.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const { data, error } = await svc.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const uid = await verifyUser(req);
  if (!uid) return json({ error: 'unauthorized' }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'bad_request' }, 400); }
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!message) return json({ error: 'empty_message' }, 400);
  if (message.length > 2000) return json({ error: 'message_too_long' }, 400);
  const wc = countWords(message);
  if (wc > MAX_WORDS) return json({ error: 'too_many_words', wordCount: wc, maxWords: MAX_WORDS }, 400);

  // Facts GỌN của lá số đang gắn (nếu có) — client tự tính từ core/chatFacts.ts,
  // server CHỈ giới hạn độ dài (chặn giá trị bất thường), không xác thực nội dung.
  const chartFactsRaw = typeof body?.chartFacts === 'string' ? body.chartFacts.trim() : '';
  const chartFacts = chartFactsRaw ? chartFactsRaw.slice(0, MAX_CHART_FACTS_CHARS) : undefined;
  const systemPrompt = buildSystemPrompt(chartFacts);

  const today = new Date().toISOString().slice(0, 10);
  const { data: usageRow } = await svc
    .from('ai_chat_usage').select('msg_count').eq('user_id', uid).eq('usage_date', today).maybeSingle();
  const currentCount = usageRow?.msg_count ?? 0;
  const isFree = currentCount < FREE_DAILY_LIMIT;

  if (!isFree && !body?.paid) {
    return json({ error: 'quota_exceeded', freeLimit: FREE_DAILY_LIMIT, used: currentCount }, 402);
  }

  // Dùng key dùng chung của app (bảng app_secrets) — GIỐNG utils/aiAnalysis.ts:
  // ưu tiên key trả phí thật (ổn định), free pollinations chỉ là backup cuối
  // cùng (endpoint free hiện hay trả 402 "budget too low", không đáng tin cậy).
  const { data: secrets } = await svc.from('app_secrets').select('openai_key, claude_key').eq('id', 'ai').maybeSingle();
  const openaiKey = (secrets?.openai_key as string | undefined)?.trim();
  const claudeKey = (secrets?.claude_key as string | undefined)?.trim();

  let reply = '';
  try {
    if (openaiKey) reply = await tryOpenAI(message, openaiKey, systemPrompt);
    else if (claudeKey) reply = await tryClaude(message, claudeKey, systemPrompt);
    else reply = await tryFreePollinations(message, systemPrompt);
  } catch (e) {
    // Key trả phí lỗi (hết hạn/hết quota) → thử free trước khi báo lỗi hẳn.
    try { reply = await tryFreePollinations(message, systemPrompt); }
    catch { return json({ error: 'ai_error', detail: String((e as any)?.message || e).slice(0, 200) }, 502); }
  }
  if (!reply) return json({ error: 'ai_empty' }, 502);
  reply = truncateWords(reply, MAX_WORDS);

  // Cập nhật quota SAU khi có câu trả lời thành công (lỗi AI không tính vào quota).
  await svc.from('ai_chat_usage').upsert(
    { user_id: uid, usage_date: today, msg_count: currentCount + 1, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,usage_date' },
  );

  return json({ reply, isFree, usedToday: currentCount + 1, freeLimit: FREE_DAILY_LIMIT });
});
