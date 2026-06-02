/**
 * Claude AI integration for Tử Vi analysis
 * Uses claude-sonnet-4-6 with prompt caching for efficiency
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AstrologyResult, TuViHouse, DaiVan } from '../types';
import { getCurrentLanguage } from '../i18n';

const MODEL = 'claude-sonnet-4-5';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

/**
 * Test API key connection — sends a minimal request to verify auth.
 */
export async function testApiConnection(apiKey: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    });
    const body = await res.text();
    if (!res.ok) {
      console.error('[Claude test]', res.status, body);
      let msg = body;
      try { msg = JSON.parse(body)?.error?.message ?? body; } catch {}
      return { ok: false, error: `HTTP ${res.status}: ${msg}` };
    }
    return { ok: true };
  } catch (e: any) {
    console.error('[Claude test]', e);
    return { ok: false, error: e?.message || String(e) };
  }
}

// System prompt with Tử Vi Nam Phái knowledge (cached for efficiency)
const SYSTEM_PROMPT = `Bạn là chuyên gia về Tử Vi Nam Phái theo phương pháp của thầy Lê Quang Lăng.
Bạn có kiến thức sâu về:
- 14 chính tinh và ý nghĩa: Tử Vi (quyền uy), Thiên Cơ (trí tuệ), Thái Dương (công danh), Vũ Khúc (tài chính), Thiên Đồng (phúc đức), Liêm Trinh (quan lộc), Thiên Phủ (tài lộc), Thái Âm (tình cảm), Tham Lang (đào hoa/thay đổi), Cự Môn (khẩu thiệt), Thiên Tướng (ấn thụ), Thiên Lương (ân đức), Thất Sát (sát phạt), Phá Quân (cải cách).
- 12 cung: Mệnh (bản thân), Phụ Mẫu (cha mẹ), Phúc Đức (phúc lộc), Điền Trạch (nhà đất), Quan Lộc (sự nghiệp), Nô Bộc (người giúp việc), Thiên Di (xuất ngoại), Tật Ách (sức khỏe), Tài Bạch (tiền bạc), Tử Tức (con cái), Phu Thê (hôn nhân), Huynh Đệ (anh em).
- Tứ hóa: Hóa Lộc (tài lộc tốt), Hóa Quyền (quyền uy), Hóa Khoa (danh tiếng), Hóa Kỵ (trở ngại).
- Cục số: Thủy Nhị, Mộc Tam, Kim Tứ, Thổ Ngũ, Hỏa Lục - ảnh hưởng đến cách đọc sao.
- Đại Vận 10 năm một cung, Tiểu Vận hàng năm.
- Các tam hợp, xung chiếu, hội tụ giữa các cung.
- Nguyên tắc Nam Phái: xem sức mạnh sao, hội chiếu, can chi của cung.

Khi phân tích hãy:
1. Nêu rõ sao chính trong cung và ý nghĩa cụ thể
2. Xét hội chiếu từ các cung đối/tam hợp
3. Nhận xét về Tứ Hóa nếu có
4. Đưa ra nhận định thực tế về cuộc sống, công việc, tình duyên, sức khỏe
5. Trả lời bằng tiếng Việt trừ khi được yêu cầu tiếng Anh
6. Giữ phong cách cụ thể, thực tế, không mơ hồ`;

function serializeChart(result: AstrologyResult): string {
  const { tuViChart: chart, batTuChart, daiVans, birthInfo } = result;
  const lang = getCurrentLanguage();

  const houseSummary = chart.houses.map(h => {
    const stars = h.stars.map(s => s.name).join(', ');
    return `${h.branch}(${h.palaceName}): ${stars || 'không có sao'}${h.isManh ? ' [MỆNH]' : ''}${h.isThan ? ' [THÂN]' : ''}`;
  }).join('\n');

  const daiVanSummary = daiVans.map(dv =>
    `${dv.startAge}-${dv.endAge}t: ${dv.stem}${dv.branch} (điểm tài lộc: ${dv.wealthScore}/10)`
  ).join(', ');

  const batTuSummary = batTuChart.pillars.map(p =>
    `${p.label}: ${p.stem}${p.branch}(${p.hiddenStems.join(',')})`
  ).join(' | ');

  return `
Thông tin:
- Tên: ${birthInfo.name} | Giới tính: ${birthInfo.gender === 'nam' ? 'Nam' : 'Nữ'}
- Sinh: ${birthInfo.day}/${birthInfo.month}/${birthInfo.year} giờ ${birthInfo.hour}:${String(birthInfo.minute).padStart(2,'0')}
- Nơi sinh: ${birthInfo.birthplace}

Lá số Tử Vi:
- Cục số: ${chart.cucName}
- Cung Mệnh: ${chart.menhCung} (${chart.menhCan} - ${chart.menhElement})
- Cung Thân: ${chart.thanCung}
- Âm lịch: ${chart.lunarDate.day}/${chart.lunarDate.month}/${chart.lunarDate.year} (${chart.lunarDate.yearStem}${chart.lunarDate.yearBranch})

12 Cung:
${houseSummary}

Bát Tự: ${batTuSummary}
Nhật chủ: ${batTuChart.dayMaster} (${batTuChart.dayMasterElement})
Dụng thần: ${batTuChart.favorableElements.join(', ')}

Đại Vận: ${daiVanSummary}
`.trim();
}

async function callClaude(apiKey: string, messages: Array<{role: string; content: string}>, maxTokens = 1500): Promise<string> {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'prompt-caching-2024-07-31',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        }
      ],
      messages,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('[Claude API]', response.status, err);
    let msg = err;
    try { msg = JSON.parse(err)?.error?.message ?? err; } catch {}
    throw new Error(`Claude API ${response.status}: ${msg}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text ?? '';
}

function cacheKey(type: string, result: AstrologyResult): string {
  const { birthInfo } = result;
  return `analysis_${type}_${birthInfo.name}_${birthInfo.year}${birthInfo.month}${birthInfo.day}_${birthInfo.hour}_${getCurrentLanguage()}`;
}

async function getCached(key: string): Promise<string | null> {
  try {
    const item = await AsyncStorage.getItem(key);
    if (!item) return null;
    const { text, ts } = JSON.parse(item);
    // Cache for 7 days
    if (Date.now() - ts < 7 * 24 * 3600 * 1000) return text;
    await AsyncStorage.removeItem(key);
  } catch {}
  return null;
}

async function setCached(key: string, text: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ text, ts: Date.now() }));
  } catch {}
}

export async function analyzeOverview(apiKey: string, result: AstrologyResult): Promise<string> {
  const key = cacheKey('overview', result);
  const cached = await getCached(key);
  if (cached) return cached;

  const chartData = serializeChart(result);
  const lang = getCurrentLanguage();
  const prompt = lang === 'vi'
    ? `Dựa trên lá số sau, hãy viết bình giải tổng quan về cuộc đời và vận mệnh của người này (khoảng 400-500 chữ). Tập trung vào: bản chất tính cách, sự nghiệp chung, tình duyên hôn nhân, tài lộc tổng quát, và những điểm đặc biệt nổi bật của lá số:\n\n${chartData}`
    : `Based on this chart, write a comprehensive overview of this person's life and destiny (about 400-500 words). Focus on: personality traits, career outlook, love/marriage, overall wealth, and notable chart features:\n\n${chartData}`;

  const text = await callClaude(apiKey, [{ role: 'user', content: prompt }], 1500);
  await setCached(key, text);
  return text;
}

export async function analyzeHouse(apiKey: string, result: AstrologyResult, houseIndex: number): Promise<string> {
  const key = cacheKey(`house_${houseIndex}`, result);
  const cached = await getCached(key);
  if (cached) return cached;

  const chartData = serializeChart(result);
  const house = result.tuViChart.houses[houseIndex];
  const lang = getCurrentLanguage();
  const stars = house.stars.map(s => s.name).join(', ') || 'không có sao chính';

  const prompt = lang === 'vi'
    ? `Trong lá số này, hãy phân tích chi tiết cung ${house.palaceName} (${house.branch}). Sao trong cung: ${stars}. Phân tích về hội chiếu tam hợp/đối cung, tứ hóa nếu có, và ý nghĩa cụ thể với cuộc sống của người này (khoảng 300 chữ):\n\n${chartData}`
    : `In this chart, analyze the ${house.palaceName} palace (${house.branch}) in detail. Stars in palace: ${stars}. Discuss aspects from trine/opposite palaces, any transforms present, and specific life implications (about 300 words):\n\n${chartData}`;

  const text = await callClaude(apiKey, [{ role: 'user', content: prompt }], 1000);
  await setCached(key, text);
  return text;
}

export async function analyzeDaiVan(apiKey: string, result: AstrologyResult, daiVanIndex: number): Promise<string> {
  const key = cacheKey(`daivan_${daiVanIndex}`, result);
  const cached = await getCached(key);
  if (cached) return cached;

  const chartData = serializeChart(result);
  const dv = result.daiVans[daiVanIndex];
  const lang = getCurrentLanguage();

  const prompt = lang === 'vi'
    ? `Hãy phân tích chi tiết về Đại Vận ${dv.stem}${dv.branch} (tuổi ${dv.startAge}-${dv.endAge}) trong lá số này. Phân tích: can chi đại vận tác động thế nào đến các cung chính, cơ hội và thách thức trong giai đoạn này, những sự kiện có thể xảy ra về sự nghiệp, tài chính, tình duyên, sức khỏe (khoảng 350 chữ):\n\n${chartData}`
    : `Analyze the Major Cycle ${dv.stem}${dv.branch} (ages ${dv.startAge}-${dv.endAge}) in this chart. Cover: how the stem/branch affects main palaces, opportunities and challenges in this period, likely events for career, finances, relationships, health (about 350 words):\n\n${chartData}`;

  const text = await callClaude(apiKey, [{ role: 'user', content: prompt }], 1200);
  await setCached(key, text);
  return text;
}

export async function analyzeWealth(apiKey: string, result: AstrologyResult): Promise<string> {
  const key = cacheKey('wealth', result);
  const cached = await getCached(key);
  if (cached) return cached;

  const chartData = serializeChart(result);
  const lang = getCurrentLanguage();

  const prompt = lang === 'vi'
    ? `Hãy phân tích tổng quan về tài lộc và vật chất trong lá số này qua các Đại Vận. Giai đoạn nào phát tài, giai đoạn nào cần cẩn thận, cách kiếm tiền phù hợp nhất, và lời khuyên về tài chính (khoảng 400 chữ):\n\n${chartData}`
    : `Analyze the wealth and material fortune through Major Cycles in this chart. Which periods bring prosperity, which need caution, most suitable ways to earn money, and financial advice (about 400 words):\n\n${chartData}`;

  const text = await callClaude(apiKey, [{ role: 'user', content: prompt }], 1500);
  await setCached(key, text);
  return text;
}
