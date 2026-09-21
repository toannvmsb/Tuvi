/**
 * Vẽ chân dung "người tương hợp" — gọi Edge Function `generate-portrait` (OpenAI soạn đặc điểm khuôn mặt
 * từ cung Phu Thê, Cloudflare Workers AI vẽ ảnh). Mọi API key nằm ở secret của function.
 */
import { supabase } from './supabase';
import type { AstrologyResult } from '../types';
import { describeLook } from '../data/starAppearance';

export interface PortraitParams {
  sessionId?: string;
  compatibilityContext: string;
  ageWanted: number;
  gender: 'male' | 'female' | 'other';
  hairLength: 'short' | 'medium' | 'long';
  note?: string;
}

/** Ngữ cảnh đưa cho AI: sao cung Phu Thê + sao Mệnh + dụng thần. Không có tên thật, không có "Mệnh chủ/Thân chủ". */
export function buildPortraitContext(r: AstrologyResult): string {
  const c = r.tuViChart;
  const fmt = (stars: { name: string; type: string; brightness?: string }[]) =>
    stars.map(s => (s.brightness ? `${s.name} (${s.brightness})` : s.name)).join(', ');
  const phuThe = c.houses.find(h => h.palaceName === 'Phu Thê');
  const menh = c.houses.find(h => h.isManh);
  const lines: string[] = [];
  if (phuThe) {
    const chinh = phuThe.stars.filter(s => s.type === 'chinh');
    const phu = phuThe.stars.filter(s => s.type === 'cat' || s.type === 'hung');
    lines.push(`Cung Phu Thê: chính tinh ${chinh.length ? fmt(chinh) : 'vô chính diệu'}${phu.length ? `; phụ tinh ${fmt(phu)}` : ''}.`);
  }
  if (menh) {
    const chinh = menh.stars.filter(s => s.type === 'chinh');
    lines.push(`Cung Mệnh của người xem: ${chinh.length ? fmt(chinh) : 'vô chính diệu'}; bản mệnh ${c.napAmMenh}.`);
  }
  // Diện mạo/hình dáng gợi từ sao (nguồn dữ liệu: data/starAppearance.ts) — giúp ảnh khác nhau theo từng lá số.
  if (phuThe) {
    const look = describeLook(phuThe.stars);
    if (look) lines.push(`Gợi ý diện mạo/hình dáng NGƯỜI TƯƠNG HỢP (suy từ sao cung Phu Thê): ${look}.`);
  }
  if (menh) {
    const look = describeLook(menh.stars, c.menhElement);
    if (look) lines.push(`Ngoại hình CHỦ LÁ SỐ (suy từ sao cung Mệnh + ngũ hành bản mệnh): ${look}.`);
  }
  const fav = r.batTuChart.favorableElements;
  if (fav.length) lines.push(`Ngũ hành dụng thần của người xem: ${fav.join(', ')}.`);
  return lines.join('\n');
}

export async function generatePortrait(params: PortraitParams): Promise<string> {
  const { data, error } = await supabase.functions.invoke('generate-portrait', { body: params });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    let detail: string | null = null;
    if (ctx && typeof ctx.text === 'function') {
      try {
        const bodyText = await ctx.text();
        detail = JSON.parse(bodyText).error || bodyText;
      } catch { /* dùng message mặc định */ }
    }
    throw new Error(detail || error.message || 'Không gọi được dịch vụ vẽ chân dung.');
  }
  const imageUrl = (data as { imageUrl?: string; error?: string } | null)?.imageUrl;
  if (!imageUrl) throw new Error((data as { error?: string } | null)?.error || 'Không nhận được ảnh từ dịch vụ vẽ chân dung.');
  return imageUrl;
}
