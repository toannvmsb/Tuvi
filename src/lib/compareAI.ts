/**
 * So sánh lá số — phân tích AI (30 xu).
 * 12 tầng được gọi SONG SONG → hiển thị dần khi từng tầng về.
 * Cache: JSON array 12 phần → ai_results.
 * Key ưu tiên: server (Supabase) → OpenAI → Claude → free.
 */
import type { AstrologyResult } from '../types';
import { supabase } from './supabase';
import { awaitPendingSpends } from './pendingSpends';
import { getAiResult, setAiResult } from './aiResults';
import { confirmAndUnlock, confirmReanalyze } from './confirmCharge';
import { serializeForAI, type CompareResult, type AnalysisLayer } from '../core/compareCharts';
import { PREMIUM } from '../constants/premium';

const TIMEOUT_MS = 90_000;

// ─── CACHE KEY ────────────────────────────────────────────────────────────────

function birthKey(r: AstrologyResult): string {
  const b = r.birthInfo;
  return `${b.year}${b.month}${b.day}${b.hour}${b.gender[0]}`;
}

export function compareAiCacheKey(a: AstrologyResult, b: AstrologyResult): string {
  return `compare_ai_v1_${birthKey(a)}_${birthKey(b)}`;
}

/** Serialize cache: mảng 12 string → 1 JSON string để lưu vào ai_results */
export function encodeLayers(layers: (string | null)[]): string {
  return JSON.stringify(layers);
}
export function decodeLayers(raw: string): (string | null)[] {
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr as (string | null)[];
  } catch {}
  return [];
}

// ─── SYSTEM PROMPT (ngắn, dùng chung cho mọi tầng) ───────────────────────────

const SYSTEM = `Bạn là chuyên gia tử vi và bát tự. Phân tích sự tương hợp giữa hai người dựa trên dữ liệu lá số thực tế. Viết HOÀN TOÀN bằng tiếng Việt có dấu, dùng markdown (##, **bold**, gạch đầu dòng, bảng). Cá nhân hóa: đề cập tên, sao, hành, cung cụ thể. KHÔNG lặp từ/cụm từ. KHÔNG viết lời chào hay giới thiệu.`;

// ─── CHART CONTEXT (ngắn gọn, dùng trong mỗi tầng) ────────────────────────────

function chartCtx(a: AstrologyResult, b: AstrologyResult, pro: CompareResult): string {
  return `Dữ liệu:\n\`\`\`json\n${serializeForAI(a, b, pro)}\n\`\`\``;
}

// ─── 12 LAYER PROMPTS ─────────────────────────────────────────────────────────

function layerPrompts(a: AstrologyResult, b: AstrologyResult, pro: CompareResult): string[] {
  const ctx = chartCtx(a, b, pro);
  const aName = a.birthInfo.name || 'Người A';
  const bName = b.birthInfo.name || 'Người B';
  const sc = pro.scores;

  return [
    // L1 — Kết luận nhanh
    `${ctx}\n\nViết tầng 1 — KẾT LUẬN NHANH về mức độ tương hợp giữa ${aName} và ${bName}. Gồm: 1 đoạn tổng kết 5–7 câu nêu bức tranh tổng thể (điểm ${sc.overall}/100), 1 đoạn điểm mạnh cốt lõi, 1 đoạn rủi ro lớn nhất. Ngôn ngữ súc tích, đi thẳng vào vấn đề. Bắt đầu bằng ## ⚡ Kết luận nhanh`,

    // L2 — Bảng điểm
    `${ctx}\n\nViết tầng 2 — BẢNG ĐIỂM TƯƠNG HỢP. Tạo bảng markdown 6 hàng: Tổng (${sc.overall}), Tình yêu (${sc.love}), Hôn nhân (${sc.marriage}), Làm ăn (${sc.business}), Bạn bè (${sc.friendship}), Rủi ro xung đột (${sc.conflict_risk}). Mỗi hàng có: Khía cạnh | Điểm | Đánh giá | Ý nghĩa thực tế (1–2 câu cụ thể từ dữ liệu lá số). Lưu ý: điểm đã tính thiên can năm sinh (offline_analysis.can_chi_label), nạp âm Mệnh (offline_analysis.napam_label), và so cung chéo (Phu Thê A ↔ Mệnh B cho tình yêu/hôn nhân; Tài Bạch A ↔ Quan Lộc B cho làm ăn). Sau bảng: 2–3 câu nhận xét tổng hợp nêu điểm thiên can và nạp âm nổi bật nhất. Bắt đầu bằng ## 📊 Bảng điểm tương hợp`,

    // L3 — Chân dung A
    `${ctx}\n\nViết tầng 3 — CHÂN DUNG ${aName.toUpperCase()} trong mối quan hệ với ${bName}. Phân tích: tính cách từ mệnh chủ ${a.tuViChart.menhChu} và ngũ hành ${a.tuViChart.menhElement}, cách yêu/làm việc từ nhật chủ Bát Tự, điểm mạnh khi ở cạnh ${bName}, điểm dễ gây ma sát. Đề cập sao cụ thể trong cung Mệnh. Khoảng 200–250 từ. Bắt đầu bằng ## 👤 Chân dung ${aName}`,

    // L4 — Chân dung B
    `${ctx}\n\nViết tầng 4 — CHÂN DUNG ${bName.toUpperCase()} trong mối quan hệ với ${aName}. Tương tự tầng 3 nhưng cho ${bName}: tính cách từ mệnh chủ ${b.tuViChart.menhChu} và ngũ hành ${b.tuViChart.menhElement}, cách yêu/làm việc từ nhật chủ Bát Tự, điểm mạnh khi ở cạnh ${aName}, điểm dễ gây ma sát. Khoảng 200–250 từ. Bắt đầu bằng ## 👤 Chân dung ${bName}`,

    // L5 — Điểm hút
    `${ctx}\n\nViết tầng 5 — ĐIỂM HÚT NHAU giữa ${aName} và ${bName}. Phân tích sâu: sức hút từ ngũ hành Mệnh (${a.tuViChart.menhElement}–${b.tuViChart.menhElement}), từ thiên can năm sinh (xem offline_analysis.can_chi_label — nếu can hợp thì đây là điểm duyên đặc biệt), từ nạp âm Mệnh (offline_analysis.napam_label), từ địa chi năm sinh, từ tương đồng mệnh chủ, từ Bát Tự bổ trợ. Nếu có can hợp hoặc nạp âm tương sinh, hãy làm nổi bật điều này. Gạch đầu dòng cho từng điểm, mỗi điểm 2–3 câu. Bắt đầu bằng ## 🧲 Hai người hút nhau vì điều gì`,

    // L6 — Điểm xung
    `${ctx}\n\nViết tầng 6 — ĐIỂM DỄ XUNG giữa ${aName} và ${bName}. Phân tích cụ thể: xung từ ngũ hành Mệnh, từ thiên can năm sinh (offline_analysis.can_chi_label — nếu can tương khắc hãy phân tích tác động), từ nạp âm Mệnh (offline_analysis.napam_label — nếu tương khắc hãy giải thích năng lượng nền dễ xung), từ địa chi (${a.tuViChart.lunarDate.yearBranch}–${b.tuViChart.lunarDate.yearBranch}), từ khác biệt tính cách, từ Bát Tự không tương hợp. Nêu ví dụ thực tế về cách xung đột biểu hiện trong cuộc sống hàng ngày. Kết bằng 2–3 cách hóa giải thực tế. Bắt đầu bằng ## ⚡ Hai người dễ xung ở đâu`,

    // L7 — Yêu nhau
    `${ctx}\n\nViết tầng 7 — NẾU YÊU NHAU giữa ${aName} và ${bName}. Phân tích: phong cách yêu từng người (từ mệnh chủ và cung Phu Thê), lưu ý điểm tình yêu phản ánh so cung chéo (Phu Thê A chiếu Mệnh B và ngược lại — tức là đối phương "in" sâu vào cung Mệnh của mình không?), ai chủ động, ai cần được trấn an, xung đột tình cảm thường gặp và cách xử lý, làm gì để tình yêu bền. Điểm tình yêu: ${sc.love}/100. Khoảng 250–300 từ. Bắt đầu bằng ## ❤️ Nếu yêu nhau`,

    // L8 — Lấy nhau
    `${ctx}\n\nViết tầng 8 — NẾU LẤY NHAU giữa ${aName} và ${bName}. Phân tích: cuộc sống hôn nhân từ ngày, tài chính gia đình (ai quản lý tốt hơn), con cái và gia đạo từ cung Phúc Đức VÀ cung Tử Tức (hãy đề cập sao trong Tử Tức ảnh hưởng thế nào đến khả năng con cái và hòa thuận gia đình), quan hệ gia đình hai bên, lời khuyên thực tế để hôn nhân bền. Điểm hôn nhân: ${sc.marriage}/100. Khoảng 250–300 từ. Bắt đầu bằng ## 💍 Nếu lấy nhau`,

    // L9 — Làm ăn
    `${ctx}\n\nViết tầng 9 — NẾU LÀM ĂN CHUNG giữa ${aName} và ${bName}. Phân tích: lĩnh vực nên và không nên hợp tác, vai trò phù hợp cho từng người (${pro.business_roles.strategy} chiến lược, ${pro.business_roles.finance} tài chính, ${pro.business_roles.external} đối ngoại), hãy đề cập Hóa tinh trong cung Tài Bạch/Quan Lộc của từng người (xem houses trong JSON — Hóa Lộc/Quyền/Khoa = lợi thế, Hóa Kỵ = rủi ro), phân tích so cung chéo (Tài Bạch A ↔ Quan Lộc B nói lên điều gì về sự bổ trợ), rủi ro cần phòng ngừa, hình thức hợp tác phù hợp. Điểm làm ăn: ${sc.business}/100. Khoảng 250–300 từ. Bắt đầu bằng ## 💼 Nếu làm ăn/hợp tác`,

    // L10 — Bạn bè
    `${ctx}\n\nViết tầng 10 — NẾU LÀM BẠN giữa ${aName} và ${bName}. Phân tích: chất lượng tình bạn có thể đạt được, điểm dễ gắn kết, ranh giới cần giữ, những chủ đề/tình huống dễ gây căng thẳng trong quan hệ bạn bè, có nên thân sâu hay chỉ nên là "bạn tốt". Điểm bạn bè: ${sc.friendship}/100. Khoảng 200–250 từ. Bắt đầu bằng ## 🤝 Nếu làm bạn`,

    // L11 — Thời vận
    `${ctx}\n\nViết tầng 11 — THỜI VẬN 2026–2028. Cho từng người: đại vận hiện tại là gì, hành của đại vận ảnh hưởng thế nào đến mối quan hệ, tiểu vận 2026/2027/2028 có thuận không. Sau đó: thời điểm nào trong 3 năm tới phù hợp nhất để: bắt đầu tình yêu, tiến tới hôn nhân, khởi sự kinh doanh chung. Thời điểm nào cần thận trọng. Bắt đầu bằng ## 🕐 Thời vận 2026–2028`,

    // L12 — Lời khuyên
    `${ctx}\n\nViết tầng 12 — LỜI KHUYÊN CÁ NHÂN HÓA cho ${aName} và ${bName}. Cấu trúc: 1) Nếu yêu nhau — 3 lời khuyên cụ thể, 2) Nếu tiến tới hôn nhân — 3 lời khuyên, 3) Nếu làm ăn chung — 3 lời khuyên, 4) Nếu làm bạn — 2 lời khuyên, 5) Một câu thông điệp quan trọng nhất cho cặp đôi này (in nghiêng). Mỗi lời khuyên phải cụ thể, không chung chung. Bắt đầu bằng ## 💡 Lời khuyên cá nhân hóa`,
  ];
}

// ─── API CALLERS ──────────────────────────────────────────────────────────────

async function callOpenAI(prompt: string, apiKey: string, signal: AbortSignal): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 2048,
      temperature: 0.7,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: prompt },
      ],
    }),
    signal,
  });
  if (!res.ok) {
    const s = res.status;
    if (s === 401 || s === 403) throw new Error('OpenAI key không hợp lệ.');
    if (s === 429) throw new Error('OpenAI quá tải. Thử lại sau.');
    throw new Error(`OPENAI_${s}`);
  }
  const j: any = await res.json();
  return (j?.choices?.[0]?.message?.content ?? '').trim();
}

const CLAUDE_MODELS = ['claude-3-5-haiku-20241022', 'claude-3-haiku-20240307'];

async function callClaude(prompt: string, apiKey: string, signal: AbortSignal): Promise<string> {
  for (const model of CLAUDE_MODELS) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model, max_tokens: 2048, temperature: 0.7,
        system: SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal,
    });
    if (res.ok) {
      const j: any = await res.json();
      const t = Array.isArray(j?.content)
        ? j.content.filter((b: any) => b?.type === 'text').map((b: any) => b.text).join('\n')
        : '';
      if (t.trim()) return t.trim();
      continue;
    }
    const s = res.status;
    if (s === 401 || s === 403) throw new Error('Claude key không hợp lệ.');
    if (s === 429) throw new Error('Claude quá tải. Thử lại sau.');
    if (s !== 404) throw new Error(`ANTHROPIC_${s}`);
  }
  throw new Error('ANTHROPIC_NO_MODEL');
}

async function callFree(prompt: string, signal: AbortSignal): Promise<string> {
  const res = await fetch('https://text.pollinations.ai/openai', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: prompt }],
    }),
    signal,
  });
  if (!res.ok) throw new Error(`FREE_${res.status}`);
  const j: any = await res.json();
  return (j?.choices?.[0]?.message?.content ?? '').trim();
}

/**
 * SỬA LỖI BẢO MẬT: gọi key DÙNG CHUNG của app qua Edge Function `ai-proxy` (promptKind='compare')
 * thay vì đọc thẳng OpenAI/Anthropic key về client — xem cùng cơ chế ở utils/aiAnalysis.ts.
 */
async function callAiProxy(prompt: string, provider: 'openai' | 'claude', signal: AbortSignal): Promise<string> {
  await awaitPendingSpends();   // chờ lệnh trừ xu ghi xong (xem lib/pendingSpends.ts)
  const { data, error } = await supabase.functions.invoke('ai-proxy', {
    body: { prompt, provider, promptKind: 'compare' },
    signal,
  });
  if (error) {
    const ctx = (error as any)?.context;
    let code = '';
    try { const b = typeof ctx?.json === 'function' ? await ctx.json() : null; code = b?.error || ''; } catch { /* ignore */ }
    throw new Error(code || `${provider.toUpperCase()}_${ctx?.status || 'ERR'}`);
  }
  const text = (data as any)?.text as string | undefined;
  if (!text) throw new Error(`${provider.toUpperCase()}_EMPTY`);
  return text.trim();
}

// ─── KEY RESOLUTION ────────────────────────────────────────────────────────────
// Chỉ còn ý nghĩa cho BYOK (key riêng người dùng tự nhập) — dùng làm phương án dự phòng khi
// proxy (key dùng chung của app) lỗi. KHÔNG dùng SecureStore (không hoạt động trên web).

function resolveKeys(a: AstrologyResult): { openai: string; claude: string; provider: string } {
  const bi = a.birthInfo as any;
  return {
    openai: (bi?.openaiApiKey ?? '').trim(),
    claude: (bi?.anthropicApiKey ?? '').trim(),
    provider: bi?.aiProvider ?? 'auto',
  };
}

// ─── SINGLE LAYER CALLER ─────────────────────────────────────────────────────

async function runOneLayer(prompt: string, a: AstrologyResult): Promise<string> {
  const { openai, claude, provider } = resolveKeys(a);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    // Thứ tự ưu tiên nhà cung cấp (áp dụng cho cả proxy lẫn BYOK dự phòng).
    const order: ('openai' | 'claude')[] = provider === 'claude' ? ['claude', 'openai'] : ['openai', 'claude'];

    const sources: Array<() => Promise<string>> = [];
    // 1) PROXY trước — đường CHÍNH, không cần BYOK key.
    for (const src of order) sources.push(() => callAiProxy(prompt, src, controller.signal));
    // 2) BYOK dự phòng — chỉ khi user có tự nhập key riêng.
    if (provider === 'claude') {
      if (claude) sources.push(() => callClaude(prompt, claude, controller.signal));
      if (openai) sources.push(() => callOpenAI(prompt, openai, controller.signal));
    } else {
      if (openai) sources.push(() => callOpenAI(prompt, openai, controller.signal));
      if (claude) sources.push(() => callClaude(prompt, claude, controller.signal));
    }
    // 3) Free — phương án cuối cùng.
    sources.push(() => callFree(prompt, controller.signal));

    for (const src of sources) {
      try {
        const text = await src();
        if (text && text.length > 50) return text;
      } catch (e: any) {
        if (e?.name === 'AbortError') throw e;
        // thử nguồn tiếp theo
      }
    }
    throw new Error('Không nhận được kết quả từ AI sau tất cả các nguồn.');
  } finally {
    clearTimeout(timer);
  }
}

// ─── SECTION BUILDER (12 song song) ──────────────────────────────────────────

export interface CompareSection {
  icon: string;
  title: string;
  run: () => Promise<string>;
}

const LAYER_META: Array<{ icon: string; title: string }> = [
  { icon: '⚡', title: 'Kết luận nhanh' },
  { icon: '📊', title: 'Bảng điểm tương hợp' },
  { icon: '👤', title: 'Chân dung người A' },
  { icon: '👤', title: 'Chân dung người B' },
  { icon: '🧲', title: 'Hai người hút nhau vì điều gì' },
  { icon: '⚡', title: 'Hai người dễ xung ở đâu' },
  { icon: '❤️', title: 'Nếu yêu nhau' },
  { icon: '💍', title: 'Nếu lấy nhau' },
  { icon: '💼', title: 'Nếu làm ăn/hợp tác' },
  { icon: '🤝', title: 'Nếu làm bạn' },
  { icon: '🕐', title: 'Thời vận 2026–2028' },
  { icon: '💡', title: 'Lời khuyên cá nhân hóa' },
];

export function buildCompareSections(
  a: AstrologyResult,
  b: AstrologyResult,
  pro: CompareResult,
): CompareSection[] {
  const prompts = layerPrompts(a, b, pro);
  return LAYER_META.map((meta, i) => ({
    ...meta,
    run: () => runOneLayer(prompts[i], a),
  }));
}

// ─── MAIN EXPORTS ─────────────────────────────────────────────────────────────

export type CompareAiStatus =
  | { status: 'cached'; layers: (string | null)[] }
  | { status: 'started' }
  | { status: 'cancel' }
  | { status: 'nofund' }
  | { status: 'error'; message: string };

/**
 * Khởi động phân tích AI (trừ phí nếu chưa mua, skip nếu đã cache).
 * Trả 'cached' nếu đã có cache → screen tự load; trả 'started' nếu vừa charge xong.
 */
export async function startCompareAI(
  a: AstrologyResult,
  b: AstrologyResult,
  pro: CompareResult,
): Promise<CompareAiStatus> {
  const key = compareAiCacheKey(a, b);
  const cached = getAiResult(key);
  if (cached) {
    const layers = decodeLayers(cached);
    if (layers.length === 12) return { status: 'cached', layers };
  }
  const r = await confirmAndUnlock(key, 'ai', PREMIUM.COST.aiCompare);
  if (r === 'cancel') return { status: 'cancel' };
  if (r === 'nofund') return { status: 'nofund' };
  return { status: 'started' };
}

/**
 * Phân tích lại (luôn trừ phí).
 */
export async function restartCompareAI(
  a: AstrologyResult,
  b: AstrologyResult,
): Promise<CompareAiStatus> {
  const key = compareAiCacheKey(a, b);
  const r = await confirmReanalyze(key, 'ai', PREMIUM.COST.aiCompare);
  if (r === 'cancel') return { status: 'cancel' };
  if (r === 'nofund') return { status: 'nofund' };
  return { status: 'started' };
}

/**
 * Lưu 12 kết quả vào cache (gọi sau khi tất cả hoặc đủ tầng đã xong).
 */
export async function saveCompareAILayers(
  a: AstrologyResult,
  b: AstrologyResult,
  layers: (string | null)[],
): Promise<void> {
  const key = compareAiCacheKey(a, b);
  await setAiResult(key, encodeLayers(layers));
}
