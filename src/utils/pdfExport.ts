/**
 * Xuất nội dung phân tích (Nâng cao / AI) ra file PDF có định dạng đẹp để
 * người dùng in hoặc lưu lại. Dùng expo-print (HTML → PDF) + expo-sharing.
 *
 * Với phân tích TOÀN LÁ SỐ và ĐẠI VẬN, có thể kèm ảnh lá số (chartDataUri).
 */
import type { RefObject } from 'react';
import type { View } from 'react-native';
import { STAR_NAME_REGEX, getElementOfStar } from '../data/starElements';
import type { FiveElement } from '../types';

export interface PdfOptions {
  title: string;            // Tiêu đề lớn (vd "Phân tích Đại Vận 24–33 tuổi")
  subtitle?: string;        // Dòng phụ dưới tiêu đề
  headerLines?: string[];   // Các dòng thông tin lá số (tên, ngày sinh…)
  markdown: string;         // Nội dung chính (markdown rút gọn của app)
  chartDataUri?: string;    // Ảnh lá số (data URI PNG) — nếu có sẽ chèn vào đầu
  badge?: string;           // Nhãn nguồn: "NÂNG CAO" / "PHÂN TÍCH AI"
  fileName?: string;        // Tên file PDF mong muốn (không cần đuôi .pdf)
}

/** Làm sạch tên file: bỏ ký tự không hợp lệ, gộp khoảng trắng. */
function sanitizeFileName(name: string): string {
  return (name || 'phan-tich')
    .replace(/[\\/:*?"<>|]+/g, ' ')   // ký tự cấm trên hệ thống file
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'phan-tich';
}

/** Màu in cho tên sao theo ngũ hành — tối hơn bản trên app để đọc rõ trên nền trắng. */
const PRINT_ELEMENT_COLOR: Record<FiveElement, string> = {
  Kim: '#6b7280',  // xám
  Mộc: '#15803d',  // xanh lá đậm
  Thủy: '#1d4ed8', // xanh dương đậm
  Hỏa: '#dc2626',  // đỏ
  Thổ: '#b45309',  // nâu vàng
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Tô màu tên sao trong 1 đoạn HTML (đã escape) theo ngũ hành. */
function colorizeStarsHtml(t: string): string {
  STAR_NAME_REGEX.lastIndex = 0;
  return t.replace(STAR_NAME_REGEX, (m) => {
    const el = getElementOfStar(m);
    const color = el ? PRINT_ELEMENT_COLOR[el] : undefined;
    return color ? `<span style="color:${color};font-weight:600">${m}</span>` : m;
  });
}

/** Xử lý định dạng inline: **đậm**, _nghiêng_, tô màu sao. */
function inlineHtml(text: string): string {
  let t = escapeHtml(text);
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[\s(])_([^_]+)_/g, '$1<em>$2</em>');
  t = t.replace(/`{1,3}([^`]+)`{1,3}/g, '$1');
  t = colorizeStarsHtml(t);
  return t;
}

/** Chuyển markdown rút gọn của app → HTML. */
function markdownToHtml(md: string): string {
  const lines = md.replace(/\r/g, '').split('\n');
  const out: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const closeList = () => {
    if (listType) { out.push(`</${listType}>`); listType = null; }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (line === '') { closeList(); continue; }

    // Đường kẻ ngang
    if (/^([-*_])\1{2,}$/.test(line.replace(/\s/g, ''))) { closeList(); out.push('<hr/>'); continue; }

    // Tiêu đề
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      closeList();
      const lvl = Math.min(3, h[1].length);
      out.push(`<h${lvl}>${inlineHtml(h[2].replace(/\*\*/g, ''))}</h${lvl}>`);
      continue;
    }

    // Dòng toàn đậm → coi như tiêu đề phụ
    if (/^\*\*[^*]+\*\*:?\s*$/.test(line)) {
      closeList();
      out.push(`<h3>${inlineHtml(line).replace(/:$/, '')}</h3>`);
      continue;
    }

    // Gạch đầu dòng
    const b = line.match(/^[-*•]\s+(.*)$/);
    if (b) {
      if (listType !== 'ul') { closeList(); out.push('<ul>'); listType = 'ul'; }
      out.push(`<li>${inlineHtml(b[1])}</li>`);
      continue;
    }

    // Danh sách đánh số
    const n = line.match(/^(\d+)[.)]\s+(.*)$/);
    if (n) {
      if (listType !== 'ol') { closeList(); out.push('<ol>'); listType = 'ol'; }
      out.push(`<li>${inlineHtml(n[2])}</li>`);
      continue;
    }

    closeList();
    out.push(`<p>${inlineHtml(line)}</p>`);
  }
  closeList();
  return out.join('\n');
}

function buildHtml(opts: PdfOptions): string {
  const { title, subtitle, headerLines = [], markdown, chartDataUri, badge } = opts;
  const today = new Date();
  const dateStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
  const body = markdownToHtml(markdown);
  const headerHtml = headerLines.length
    ? `<div class="info">${headerLines.map(l => `<div>${escapeHtml(l)}</div>`).join('')}</div>`
    : '';
  const chartHtml = chartDataUri
    ? `<div class="chart"><img src="${chartDataUri}" /><div class="chart-cap">Lá số Tử Vi</div></div>`
    : '';

  return `<!DOCTYPE html>
<html lang="vi"><head><meta charset="utf-8"/>
<style>
  @page { margin: 20px 30px; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Helvetica Neue", "Segoe UI", Roboto, Arial, sans-serif;
         color: #1f2430; font-size: 13px; line-height: 1.55; }
  .head { text-align: center; border-bottom: 2.5px solid #b8860b; padding-bottom: 8px; margin-bottom: 8px; }
  .badge { display: inline-block; background: #b8860b; color: #fff; font-size: 9.5px; font-weight: 800;
           letter-spacing: .5px; padding: 2px 9px; border-radius: 10px; margin-bottom: 5px; }
  h1.title { color: #8a5a00; font-size: 19px; margin: 3px 0 1px; }
  .subtitle { color: #6b7280; font-size: 12px; margin: 0; }
  .info { background: #faf6ec; border: 1px solid #e7d9b5; border-radius: 8px;
          padding: 7px 12px; margin: 8px 0; font-size: 11.5px; color: #4b4636; }
  .info div { margin: 1px 0; }
  .chart { text-align: center; margin: 8px 0 10px; page-break-inside: avoid; }
  .chart img { width: 56%; max-width: 330px; border: 1px solid #e7d9b5; border-radius: 8px; }
  .chart-cap { color: #8a5a00; font-size: 10.5px; font-style: italic; margin-top: 3px; }
  h1, h2, h3 { color: #8a5a00; page-break-after: avoid; }
  h1 { font-size: 17px; border-bottom: 1.5px solid #e7d9b5; padding-bottom: 4px; margin: 18px 0 8px; }
  h2 { font-size: 15px; margin: 14px 0 6px; }
  h3 { font-size: 13.5px; color: #a06a10; margin: 12px 0 4px; }
  p { margin: 6px 0; text-align: justify; }
  ul, ol { margin: 6px 0 6px 4px; padding-left: 20px; }
  li { margin: 3px 0; text-align: justify; }
  strong { color: #6b4a00; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 12px 0; }
  .footer { margin-top: 22px; padding-top: 10px; border-top: 1px solid #e5e7eb;
            color: #9ca3af; font-size: 10.5px; text-align: center; }
</style></head>
<body>
  <div class="head">
    ${badge ? `<div class="badge">${escapeHtml(badge)}</div><br/>` : ''}
    <h1 class="title">${escapeHtml(title)}</h1>
    ${subtitle ? `<p class="subtitle">${escapeHtml(subtitle)}</p>` : ''}
  </div>
  ${headerHtml}
  ${chartHtml}
  ${body}
  <div class="footer">Xuất ngày ${dateStr} từ ứng dụng Tử Vi · Bát Tự — Nội dung mang tính tham khảo.</div>
</body></html>`;
}

/**
 * Tạo file PDF rồi mở hộp thoại chia sẻ/lưu của hệ thống.
 * Web: mở tab mới rồi trigger window.print().
 * Mobile: expo-print → expo-sharing.
 */
export async function exportAnalysisToPdf(opts: PdfOptions): Promise<void> {
  const { printHtml } = await import('../lib/platform');
  const html = buildHtml(opts);
  await printHtml(html);
}

/**
 * Đổi tên file PDF (expo-print tạo tên ngẫu nhiên) sang `fileName`.
 * Hỗ trợ cả API mới (expo-file-system v19 — File/Paths) lẫn API cũ (cacheDirectory/moveAsync).
 * Trả về uri mới, hoặc undefined nếu không đổi được (giữ uri gốc).
 */
async function renamePdf(uri: string, fileName: string): Promise<string | undefined> {
  const safe = sanitizeFileName(fileName);

  // 1) API mới: expo-file-system v19 (SDK 54) — File / Paths
  try {
    const FS: any = require('expo-file-system');
    if (FS?.File && FS?.Paths?.cache) {
      const dest = new FS.File(FS.Paths.cache, `${safe}.pdf`);
      try { if (dest.exists) dest.delete(); } catch {}
      const src = new FS.File(uri);
      src.move(dest);
      return dest.uri ?? uri;
    }
    // API cũ nằm ngay trong entry mặc định (phiên bản cũ hơn)
    if (FS?.cacheDirectory && FS?.moveAsync) {
      const target = `${FS.cacheDirectory}${safe}.pdf`;
      try { await FS.deleteAsync(target, { idempotent: true }); } catch {}
      await FS.moveAsync({ from: uri, to: target });
      return target;
    }
  } catch { /* thử legacy bên dưới */ }

  // 2) Entry legacy: expo-file-system/legacy
  try {
    const Legacy: any = require('expo-file-system/legacy');
    if (Legacy?.cacheDirectory && Legacy?.moveAsync) {
      const target = `${Legacy.cacheDirectory}${safe}.pdf`;
      try { await Legacy.deleteAsync(target, { idempotent: true }); } catch {}
      await Legacy.moveAsync({ from: uri, to: target });
      return target;
    }
  } catch { /* bỏ qua → giữ tên gốc */ }

  return undefined;
}

/** Chụp lá số thành data URI PNG để nhúng vào PDF. */
export async function captureChartDataUri(chartRef: RefObject<View | null>): Promise<string | undefined> {
  let captureRef: any;
  try { captureRef = require('react-native-view-shot').captureRef; }
  catch { return undefined; }
  if (!chartRef.current) return undefined;
  try {
    const data: string = await captureRef(chartRef, {
      format: 'png', quality: 1, result: 'data-uri',
    });
    return data; // đã ở dạng "data:image/png;base64,...."
  } catch { return undefined; }
}

/** Dòng thông tin lá số chuẩn cho phần đầu PDF. */
export function chartHeaderLines(result: { birthInfo: any; tuViChart: any }): string[] {
  const b = result.birthInfo;
  const c = result.tuViChart;
  const gender = b.gender === 'nam' ? 'Nam' : 'Nữ';
  const lines = [
    `Họ tên: ${b.name || '(không tên)'} · Giới tính: ${gender}`,
    `Ngày sinh: ${b.day}/${b.month}/${b.year} · Giờ: ${b.hour}h` +
      (c?.lunarDate ? ` · Âm lịch: ${c.lunarDate.day}/${c.lunarDate.month}/${c.lunarDate.year}` : ''),
  ];
  if (c?.napAmMenh) lines.push(`Bản Mệnh: ${c.napAmMenh} · Cục: ${c.cucName}`);
  if (c?.viewingYear) lines.push(`Năm xem: ${c.viewingYear}${c.viewingYearStem ? ` (${c.viewingYearStem} ${c.viewingYearBranch})` : ''}`);
  return lines;
}
