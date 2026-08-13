/**
 * Supabase Edge Function — AI PROXY dùng chung cho Phân tích lá số / So sánh lá số
 * (utils/aiAnalysis.ts, lib/compareAI.ts) — SỬA LỖI BẢO MẬT: client trước đây đọc thẳng
 * OpenAI/Anthropic key dùng chung của app (bảng app_secrets) rồi tự gọi thẳng API — bất kỳ
 * user nào đăng nhập cũng có thể lấy được key đó. Từ giờ: client CHỈ gửi prompt đã dựng sẵn
 * (không gửi dữ liệu lá số thô, không đổi nội dung phân tích), server đọc key bằng
 * service role (KHÔNG BAO GIỜ trả lại key cho client) rồi tự gọi OpenAI/Anthropic.
 *
 * Khác với ai-chat (giới hạn 500 từ/lượt, có quota miễn phí/ngày): ở đây bài luận có thể dài
 * tới ~7000 từ, và việc trừ xu đã được xử lý ở client (confirmAndUnlock) TRƯỚC khi gọi hàm
 * này — proxy chỉ xác thực người dùng đã đăng nhập, không tự trừ tiền/đếm quota.
 *
 * TRIỂN KHAI: supabase functions deploy ai-proxy
 * (không cần bảng mới — dùng chung app_secrets đã có từ supabase_phase2.sql.)
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
// Chặn prompt bất thường (lỗi client hoặc giả mạo request) — KHÔNG phải chặn prompt hợp lệ.
// Đo thực tế: context toàn lá số (buildChartContext) một mình đã tới ~27.200 ký tự với lá số
// nhiều cách cục/tam hợp, CHƯA cộng thêm FULLCHART_RULES (~2.400 ký tự) + hướng dẫn từng phần
// (tới ~1.300 ký tự) → tổng thực tế có thể chạm ~31.000 ký tự. Giới hạn cũ 24000 khiến TOÀN BỘ
// (không phải một vài) yêu cầu phân tích Toàn lá số bị proxy từ chối ngay ở bước validate
// (400 prompt_too_long) cho MỌI provider — client hiển thị "Phần này chưa lấy được kết quả"
// ở tất cả các phần. Model (gpt-4o-mini 128k token, claude-3-5-haiku 200k token) thừa sức xử lý
// prompt lớn hơn nhiều — nới rộng lên mức vẫn đủ chặn request giả mạo/bất thường thật sự.
const MAX_PROMPT_CHARS = 60000;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json' } });

const svc = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

const STYLE_SUFFIX =
  ' Viết HOÀN TOÀN bằng tiếng Việt có dấu (chữ Quốc ngữ Latin), KHÔNG dùng chữ Hán / tiếng Trung. ' +
  'Thuật ngữ Tử Vi giữ Hán-Việt phiên âm (vd: Thiên Phủ, Miếu, Vượng, Đắc, Bình, Hãm). ' +
  'TUYỆT ĐỐI KHÔNG lặp lại một từ/cụm từ liên tục.';

// Server giữ NGUYÊN VĂN system prompt hiện có ở client (KHÔNG nhận systemPrompt tùy ý từ
// client — tránh client tự ý ghi đè chỉ dẫn phong cách/an toàn) — chọn theo `promptKind`.
const SYSTEM_PROMPTS: Record<string, string> = {
  natal:
    'Bạn là một thầy Tử Vi Đẩu Số Nam Phái giàu kinh nghiệm, hành văn tiếng Việt chuẩn mực, ấm áp, có ' +
    'chiều sâu. NHIỆM VỤ CỐT LÕI: PHÂN TÍCH và LUẬN GIẢI, KHÔNG phải liệt kê dữ kiện. Hãy DIỄN GIẢI ý ' +
    'nghĩa: vì sao sao này đặt ở cung này lại sinh ra tính cách / vận sự đó; các sao TƯƠNG TÁC với nhau ' +
    'ra sao; điều đó dẫn tới HỆ QUẢ gì trong đời sống thực (công việc, tiền bạc, tình cảm, sức khỏe). Viết ' +
    'thành những đoạn văn liền mạch, có dẫn dắt nhân–quả, ví von gần gũi đời thường; TRÁNH kiểu gạch đầu ' +
    'dòng khô khan, tránh lặp lại tên sao như danh sách. Mỗi nhận định nên kèm "nên làm gì / nên tránh gì". ' +
    'Luận thuần văn bản; KHÔNG xuất JSON; KHÔNG ghi quá trình suy luận; KHÔNG dùng bảng markdown; viết ' +
    'đầy đủ, kết thúc trọn vẹn.' + STYLE_SUFFIX,
  compare:
    'Bạn là chuyên gia tử vi và bát tự. Phân tích sự tương hợp giữa hai người dựa trên dữ liệu lá số thực ' +
    'tế. Viết HOÀN TOÀN bằng tiếng Việt có dấu, dùng markdown (##, **bold**, gạch đầu dòng, bảng). Cá nhân ' +
    'hóa: đề cập tên, sao, hành, cung cụ thể. KHÔNG lặp từ/cụm từ. KHÔNG viết lời chào hay giới thiệu.',
};
const MAX_TOKENS: Record<string, Record<'openai' | 'claude', number>> = {
  natal: { openai: 16384, claude: 8192 },
  compare: { openai: 2048, claude: 2048 },
};

const OPENAI_MODELS = ['gpt-4o-mini', 'gpt-3.5-turbo'];
const ANTHROPIC_MODELS = ['claude-3-5-haiku-20241022', 'claude-3-haiku-20240307'];

async function callOpenAI(prompt: string, apiKey: string, systemPrompt: string, maxTokens: number): Promise<string> {
  let lastStatus = 0, lastMsg = '';
  for (const model of OPENAI_MODELS) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model, max_tokens: maxTokens, temperature: 0.7, top_p: 0.9,
        frequency_penalty: 0.4, presence_penalty: 0.2,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
      }),
    });
    if (res.ok) {
      const j = await res.json();
      const txt = (j?.choices?.[0]?.message?.content ?? '').trim();
      if (txt) return txt;
      continue;
    }
    lastStatus = res.status;
    try { lastMsg = (await res.text()).slice(0, 200); } catch { /* ignore */ }
    if (res.status !== 404 && res.status !== 400) break;
  }
  throw new Error(`OPENAI_${lastStatus || 'ERR'}${lastMsg ? ':' + lastMsg : ''}`);
}

async function callAnthropic(prompt: string, apiKey: string, systemPrompt: string, maxTokens: number): Promise<string> {
  let lastStatus = 0;
  for (const model of ANTHROPIC_MODELS) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model, max_tokens: maxTokens, temperature: 0.7, top_p: 0.9,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (res.ok) {
      const j = await res.json();
      const blocks = Array.isArray(j?.content) ? j.content : [];
      const txt = blocks.filter((b: any) => b?.type === 'text').map((b: any) => b.text).join('\n').trim();
      if (txt) return txt;
      continue;
    }
    lastStatus = res.status;
    if (res.status !== 404) break;
  }
  throw new Error(`ANTHROPIC_${lastStatus || 'ERR'}`);
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
  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
  const provider: 'openai' | 'claude' = body?.provider === 'claude' ? 'claude' : 'openai';
  const promptKind: 'natal' | 'compare' = body?.promptKind === 'compare' ? 'compare' : 'natal';
  if (!prompt) return json({ error: 'empty_prompt' }, 400);
  if (prompt.length > MAX_PROMPT_CHARS) return json({ error: 'prompt_too_long' }, 400);

  const { data: secrets } = await svc.from('app_secrets').select('openai_key, claude_key').eq('id', 'ai').maybeSingle();
  const openaiKey = (secrets?.openai_key as string | undefined)?.trim();
  const claudeKey = (secrets?.claude_key as string | undefined)?.trim();
  const apiKey = provider === 'claude' ? claudeKey : openaiKey;
  if (!apiKey) return json({ error: 'no_key_configured' }, 503);

  const systemPrompt = SYSTEM_PROMPTS[promptKind];
  const maxTokens = MAX_TOKENS[promptKind][provider];

  try {
    const text = provider === 'claude'
      ? await callAnthropic(prompt, apiKey, systemPrompt, maxTokens)
      : await callOpenAI(prompt, apiKey, systemPrompt, maxTokens);
    if (!text) return json({ error: 'ai_empty' }, 502);
    return json({ text });
  } catch (e) {
    return json({ error: String((e as any)?.message || e).slice(0, 200) }, 502);
  }
});
