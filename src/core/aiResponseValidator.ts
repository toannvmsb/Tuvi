/**
 * AI RESPONSE VALIDATOR (Phase 14 — giai đoạn trung gian).
 *
 * V2.0 nguyên tắc: "OpenAI chỉ diễn giải dữ kiện đã được engine xác nhận; không
 * được tạo thêm sao, cách cục, điểm số hoặc sự kiện." Migration hoàn toàn sang
 * Structured Output (JSON schema) là thay đổi lớn (R4). Bước trung gian AN TOÀN:
 * giữ nguyên luồng text/markdown nhưng KIỂM CHỨNG output — nếu AI "bịa" một cách
 * cục KHÔNG có trên lá số, phát hiện được để retry hoặc gắn cảnh báo.
 *
 * Đây cũng là nền tảng cho facts-contract: `extractChartFacts()` xuất tập dữ kiện
 * engine-confirmed mà mọi lời luận PHẢI bám vào.
 */

import type { AstrologyResult } from '../types';
import { CACH_CUC } from '../data/cachCuc';
import { detectAllCachCuc, detectNearFormations } from './cachCucEngine';

const clean = (n: string) => (n.startsWith('L. ') ? n.slice(3) : n);

/** Tập dữ kiện engine đã xác nhận — "hợp đồng facts" cho lời luận. */
export interface ChartFacts {
  starNames: string[];           // sao thực sự có mặt trên lá số
  confirmedFormations: string[]; // cách cục engine XÁC NHẬN (đủ sao)
  potentialFormations: string[]; // cách "gần thành" (được phép nói ở dạng khả năng)
  palaceNames: string[];
  formulaVersion: '2.0';
}

export function extractChartFacts(result: AstrologyResult): ChartFacts {
  const houses = result.tuViChart.houses;
  const starNames = new Set<string>();
  for (const h of houses) for (const s of h.stars) starNames.add(clean(s.name));

  const confirmed = detectAllCachCuc(result).map(d => d.cach.name);
  const potential = detectNearFormations(result)
    .filter(d => d.status === 'gần thành')
    .map(d => d.cach.name);

  return {
    starNames: [...starNames],
    confirmedFormations: [...new Set(confirmed)],
    potentialFormations: [...new Set(potential)],
    palaceNames: houses.map(h => h.palaceName),
    formulaVersion: '2.0',
  };
}

export interface ValidationResult {
  ok: boolean;
  /** Cách cục xuất hiện trong text nhưng engine KHÔNG xác nhận (nghi bịa). */
  hallucinatedFormations: string[];
  /** Ghi chú engine để gắn vào cuối output khi cần đính chính. */
  note: string;
}

/**
 * Kiểm chứng một đoạn luận giải (markdown/text). Quét toàn bộ danh mục cách cục
 * (~130 cách) — cách nào được NHẮC TÊN trong text mà KHÔNG thuộc tập engine xác
 * nhận (đủ sao) và cũng KHÔNG phải cách "gần thành" đã liệt kê → nghi ngờ AI bịa.
 *
 * Đây là kiểm tra "mềm": kết quả dùng để retry hoặc gắn cảnh báo, không chặn cứng.
 */
export function validateAINarrative(text: string, facts: ChartFacts): ValidationResult {
  const allowed = new Set([...facts.confirmedFormations, ...facts.potentialFormations]);
  const found = new Set<string>();

  // Xét cách có tên đủ đặc trưng (≥ 4 ký tự, có dấu cách) để tránh khớp nhầm.
  for (const c of CACH_CUC) {
    const name = c.name;
    if (allowed.has(name)) continue;
    if (name.length < 4) continue;
    if (text.includes(name)) found.add(name);
  }

  // Loại tên là hậu tố/tiền tố của một cách hợp lệ (tránh dương tính giả:
  // "Lộc Mã giao trì" khớp trong "Lộc Mã giao trì (Hóa Lộc)" đã hợp lệ).
  const hallucinated = [...found].filter(n =>
    ![...allowed].some(a => a.includes(n) || n.includes(a)),
  );

  const note = hallucinated.length
    ? `> ⚠ _Lưu ý hệ thống: các cách cục sau được nhắc trong phần luận nhưng KHÔNG được engine xác nhận trên lá số này — hãy xem là kiến thức tham khảo chung, không phải đặc điểm lá số của bạn: ${hallucinated.join(', ')}._`
    : '';

  return { ok: hallucinated.length === 0, hallucinatedFormations: hallucinated, note };
}
