/**
 * CÔNG CỤ NỘI BỘ (không chạy trong `npm test` thường — chỉ chạy khi có biến môi trường).
 * Xuất mốc "Nghiệm quá khứ" của một lá số + bộ thử mù (5 mốc do bộ máy chọn trộn với 5 năm ngẫu nhiên)
 * để đo xem bộ quy tắc có khớp hơn năm ngẫu nhiên không (đặc tả "Thử nội bộ trước khi ra mắt").
 *
 *   PAST_REVIEW_EXPORT=1 PAST_REVIEW_BIRTH=1990-06-15-10-nam npx jest src/core/__tests__/pastReviewExport.test.ts
 *   (định dạng: NĂM-THÁNG-NGÀY-GIỜ-nam|nu, ngày DƯƠNG lịch; bỏ PAST_REVIEW_BIRTH để chạy 3 lá số mẫu;
 *    PAST_REVIEW_NAME=TenGoi đặt tên file; PAST_REVIEW_NOW=2026-10-04 cố định ngày hiện tại)
 *
 * Ghi ra thư mục `exports/` (đã .gitignore vì chứa ngày giờ sinh):
 *   past-review-<tên>.md        — bảng mốc + từng tín hiệu (dành cho người duyệt quy tắc)
 *   past-review-<tên>-blind.md  — 10 mục TRỘN LẪN, không ghi nguồn, kèm cột để điền Đúng/Gần đúng/Sai/Không nhớ
 *   past-review-<tên>-key.json  — đáp án: mục nào do bộ máy chọn, mục nào ngẫu nhiên
 *
 * Tài liệu bảng quy tắc dễ đọc cho người duyệt (sinh từ chính cấu hình, luôn khớp code):
 *   PAST_REVIEW_RULEBOOK=1 npx jest src/core/__tests__/pastReviewExport.test.ts   → docs/past-review-rulebook.md
 */
import * as fs from 'fs';
import * as path from 'path';
import type { BirthInfo } from '../../types';
import { buildResult } from '../buildResult';
import { yearCanChi } from '../annualEvents/calendar';
import { allSampleResults } from './fixtures';
import { computePastReviewSync, lunarYearOf, AREAS, AREA_LABEL, PAST_CONFIG, EVENT_MIN_AGE, NORMALIZE, RULEBOOK_VERSION, type AreaId } from '../pastReview';
import { BZ_RULES, BZ_SCORE, type BzMatcher } from '../pastReview/bazi/rules';
import { EVENT_TO_AREA } from '../pastReview/areaMap';
import { EVENT_TITLE_VN } from '../annualEvents/eventTitles';

const run = process.env.PAST_REVIEW_EXPORT ? test : test.skip;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);
const canChi = (y: number) => { const c = yearCanChi(y); return `${c.stem} ${c.branch}`; };

function parseBirth(spec: string): BirthInfo {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})-(\d{1,2})-(nam|nu)$/.exec(spec);
  if (!m) throw new Error('PAST_REVIEW_BIRTH phải có dạng NĂM-THÁNG-NGÀY-GIỜ-nam|nu, vd 1990-06-15-10-nam');
  return {
    name: process.env.PAST_REVIEW_NAME ?? 'LaSo', gender: m[5] as 'nam' | 'nu', birthplace: '', calendarType: 'solar',
    year: +m[1], month: +m[2], day: +m[3], hour: +m[4], minute: 0, language: 'vi',
  };
}

run('xuất mốc + bộ thử mù', () => {
  const nowStr = process.env.PAST_REVIEW_NOW ?? new Date().toISOString().slice(0, 10);
  const [ny, nm, nd] = nowStr.split('-').map(Number);
  const now = new Date(ny, nm - 1, nd);
  const spec = process.env.PAST_REVIEW_BIRTH;
  const items = spec
    ? [{ key: process.env.PAST_REVIEW_NAME ?? spec, result: buildResult(parseBirth(spec), ny) }]
    : allSampleResults().map((r, i) => ({ key: `mau${i + 1}`, result: r }));

  fs.mkdirSync('exports', { recursive: true });
  for (const { key, result } of items) {
    const pr = computePastReviewSync(result, { now });
    const rnd = mulberry32(hash(`${key}|${result.birthInfo.year}-${result.birthInfo.month}-${result.birthInfo.day}`));
    const cur = lunarYearOf(now);

    // 5 năm ngẫu nhiên: cùng điều kiện hợp lệ như mốc (đủ tuổi, không năm hiện tại, không trùng năm với mốc, không tuổi phổ biến).
    const used = new Set(pr.markers.map(m => m.year));
    const pool: { year: number; age: number; area: AreaId }[] = [];
    for (const y of pr.scores) {
      if (y.year >= cur || y.age < PAST_CONFIG.minAge || used.has(y.year)) continue;
      for (const a of AREAS) if (!PAST_CONFIG.commonAges[a].includes(y.age)) pool.push({ year: y.year, age: y.age, area: a });
    }
    const randoms: typeof pool = [];
    const randYears = new Set<number>();
    while (randoms.length < 5 && pool.length) {
      const c = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
      if (randYears.has(c.year)) continue;
      randYears.add(c.year);
      randoms.push(c);
    }

    const md: string[] = [];
    md.push(`# Nghiệm quá khứ — ${key}`, '', `Bảng quy tắc: **${pr.rulebookVersion}** · ngày xét: ${nowStr} (năm âm lịch hiện tại ${cur}, ${canChi(cur)}) · số năm đã chấm: ${pr.scores.length}`, '');
    md.push('## Các mốc do bộ máy chọn', '', '| # | Năm (âm lịch) | Tuổi | Mảng | Độ mạnh | Hai hệ đồng thuận | Điểm TV | Điểm BT |', '|---|---|---|---|---|---|---|---|');
    pr.markers.forEach((m, i) => {
      const as = pr.scores.find(s => s.year === m.year)!.areas[m.area];
      md.push(`| ${i + 1} | ${m.year} ${canChi(m.year)} | ${m.age} | ${AREA_LABEL[m.area]} | ${m.tier} (${m.strength.toFixed(0)}) | ${m.agree ? 'có' : 'không'} | ${as.tuvi.toFixed(0)} | ${as.bazi.toFixed(0)} |`);
    });
    md.push('', '## Tín hiệu từng mốc', '');
    for (const m of pr.markers) {
      md.push(`### ${m.year} ${canChi(m.year)} — ${AREA_LABEL[m.area]} (${m.tier})`, '');
      for (const layer of ['goc', 'nen', 'ngoi'] as const) {
        const ss = m.signals.filter(s => s.layer === layer);
        if (!ss.length) continue;
        md.push(`**${layer === 'goc' ? 'Gốc' : layer === 'nen' ? 'Nền' : 'Ngòi'}**`);
        for (const s of ss) md.push(`- [${s.system === 'tuvi' ? 'Tử Vi' : 'Bát Tự'}] \`${s.ruleId}\` ${s.supports ? '' : '(ngược chiều) '}— ${s.label} · ${s.where} · w=${s.weight.toFixed(1)}`);
        md.push('');
      }
    }
    fs.writeFileSync(path.join('exports', `past-review-${key}.md`), md.join('\n'), 'utf8');

    // Bộ thử mù: 5 mốc chọn (top theo độ mạnh) + 5 năm ngẫu nhiên, trộn bằng seed cố định.
    const chosen = pr.markers.slice(0, 5).map(m => ({ year: m.year, age: m.age, area: m.area, source: 'engine' as const }));
    const rands = randoms.map(r => ({ year: r.year, age: r.age, area: r.area, source: 'random' as const }));
    const all = [...chosen, ...rands];
    for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
    const blind = ['# Bộ thử mù — điền Đúng / Gần đúng / Sai / Không nhớ', '',
      'Với mỗi dòng: năm đó, ở mảng đời này, có biến động đáng kể không?', '',
      '| # | Năm (âm lịch) | Tuổi | Mảng | Phản hồi |', '|---|---|---|---|---|',
      ...all.map((r, i) => `| ${i + 1} | ${r.year} ${canChi(r.year)} | ${r.age} | ${AREA_LABEL[r.area]} |  |`)];
    fs.writeFileSync(path.join('exports', `past-review-${key}-blind.md`), blind.join('\n'), 'utf8');
    fs.writeFileSync(path.join('exports', `past-review-${key}-key.json`),
      JSON.stringify(all.map((r, i) => ({ stt: i + 1, ...r })), null, 2), 'utf8');

    expect(pr.markers.length).toBeGreaterThan(0);
  }
});

// ───────────────────────── Tài liệu bảng quy tắc ─────────────────────────
const runDoc = process.env.PAST_REVIEW_RULEBOOK ? test : test.skip;

function describeMatcher(m: BzMatcher): string {
  const PILLAR: Record<string, string> = { year: 'năm', month: 'tháng', day: 'ngày', hour: 'giờ' };
  const REL: Record<string, string> = { xung: 'xung', lucHop: 'lục hợp', hai: 'hại', pha: 'phá', hinh: 'hình', tamHop: 'tam hợp' };
  switch (m.kind) {
    case 'flow_god': return `can hoặc chi lưu niên là ${m.gods.join(' / ')}${m.gender ? ` (chỉ ${m.gender === 'nam' ? 'nam' : 'nữ'})` : ''}`;
    case 'flow_rel': return `chi lưu niên ${REL[m.rel]} chi trụ ${PILLAR[m.pillar]}`;
    case 'flow_star': return `chi lưu niên trùng ${m.star === 'horse' ? 'Dịch Mã' : 'Đào Hoa'} (tính theo tam hợp của chi năm/chi ngày sinh)`;
    case 'flow_wealth_el': return `can/chi lưu niên là Tài tinh và hành của nó là ${m.mode === 'fav' ? 'dụng thần' : 'kỵ thần'}`;
    case 'flow_rob': return 'can/chi lưu niên là Tỷ Kiên/Kiếp Tài, và lá số gốc có Tài';
    case 'flow_wealth_hurts_seal': return 'can/chi lưu niên là Tài tinh, và lá số gốc có Ấn';
    case 'luck_god': return `đại vận (can hoặc chi) là ${m.gods.join(' / ')}${m.gender ? ` (chỉ ${m.gender === 'nam' ? 'nam' : 'nữ'})` : ''}`;
    case 'luck_star': return 'chi đại vận trùng Dịch Mã';
    case 'root_pillar': return `mô tả trụ ${PILLAR[m.pillar]} của lá số (luôn có, chỉ để giải thích)`;
    case 'root_wealth': return 'mô tả số Tài tinh trong lá số + dụng/kỵ thần (luôn có, chỉ để giải thích)';
  }
}

runDoc('sinh docs/past-review-rulebook.md', () => {
  const L = (layer: string) => (layer === 'goc' ? 'Gốc' : layer === 'nen' ? 'Nền' : 'Ngòi');
  const out: string[] = [];
  out.push('# Nghiệm quá khứ — Bảng quy tắc để duyệt', '');
  out.push(`Phiên bản bảng: **${RULEBOOK_VERSION}** — mọi trọng số/ngưỡng dưới đây là **TẠM**, do Claude đặt theo bảng "Tín hiệu theo mảng đời" của đặc tả, **chờ anh Toàn duyệt/chỉnh**.`);
  out.push('File này sinh tự động từ code (`PAST_REVIEW_RULEBOOK=1 npx jest src/core/__tests__/pastReviewExport.test.ts`); cấu hình thật nằm ở `src/core/pastReview/config.ts` và `src/core/pastReview/bazi/rules.ts`. Đổi gì thì tăng `RULEBOOK_VERSION` và cập nhật golden test.', '');
  out.push('## 1. Cách chấm một năm', '',
    '1. **Tử Vi** — dùng nguyên engine `annualEvents` (Nam Phái; 85 sự kiện, bằng chứng gốc/nền/ngòi). Gộp các sự kiện vào 5 mảng theo mục 2. Điểm thô mảng = 60% sự kiện mạnh nhất + 30% thứ hai + 10% thứ ba, cộng 0,5 × phần bằng chứng riêng của năm (tối đa +30).',
    `2. **Bát Tự** — áp bảng quy tắc mục 3. Điểm thô mảng = (Σ trọng số ủng hộ − ${BZ_SCORE.againstFactor} × Σ trọng số ngược chiều) × ${BZ_SCORE.scale}, trần 100.`,
    `3. **Chuẩn hóa theo từng lá số**: điểm mỗi hệ so với phân bố của chính lá số đó — ≤ phân vị ${NORMALIZE.lowPercentile * 100} → 0, ≥ phân vị ${NORMALIZE.highPercentile * 100} → 100 (vì cả hai hệ đều cho điểm nền ở hầu hết các năm).`,
    `4. **Gộp**: hai hệ cùng ≥ ${PAST_CONFIG.agreeMinEach} → trung bình × ${PAST_CONFIG.agreeBonus}; chỉ một hệ → điểm hệ đó × ${PAST_CONFIG.singleSystemFactor}. Có tín hiệu nền (đại hạn/đại vận) cùng mảng với tín hiệu lưu niên → × ${PAST_CONFIG.daiVanSameAreaMult}.`,
    `5. **Độ mạnh 3 mức**: Mạnh = đồng thuận và ≥ ${PAST_CONFIG.tier.strong}; Vừa = đồng thuận hoặc ≥ ${PAST_CONFIG.tier.medium}; còn lại Nhẹ.`,
    `6. **Chọn mốc**: tối đa ${PAST_CONFIG.markersMax} mốc (${PAST_CONFIG.markersUnder25} nếu dưới ${PAST_CONFIG.under25Age} tuổi); mỗi năm một mốc; ≤ ${PAST_CONFIG.maxPerArea}/mảng; ≤ ${PAST_CONFIG.maxPerDaiVan}/đại hạn; trải ≥ ${PAST_CONFIG.minDaiVanSpan} đại hạn; từ ${PAST_CONFIG.minAge} tuổi; ưu tiên ${PAST_CONFIG.recentYears} năm gần nhất (năm xa × ${PAST_CONFIG.olderYearFactor}); bỏ năm hiện tại; mốc thứ ${PAST_CONFIG.markersMin + 1} trở đi cần độ mạnh ≥ ${PAST_CONFIG.minMarkerStrength}.`,
    `7. **Tuổi phổ biến bị loại**: ${AREAS.filter(a => PAST_CONFIG.commonAges[a].length).map(a => `${AREA_LABEL[a]} ${PAST_CONFIG.commonAges[a].join('/')}`).join('; ')}.`,
    '8. **Mốc đổi năm**: năm ÂM LỊCH (mùng 1 Tết) cho cả hai hệ — đúng cách app đang lập trụ năm/tháng Bát Tự (không dùng Lập Xuân).', '');

  out.push('## 2. Ánh xạ sự kiện Tử Vi → 5 mảng đời', '');
  for (const a of AREAS) {
    const ids = Object.keys(EVENT_TO_AREA).filter(id => EVENT_TO_AREA[id] === a);
    out.push(`**${AREA_LABEL[a]}** (${ids.length}): ${ids.map(id => `${EVENT_TITLE_VN[id] ?? id}${EVENT_MIN_AGE[id] ? ` (≥${EVENT_MIN_AGE[id]} tuổi)` : ''}`).join(' · ')}`, '');
  }
  out.push('**Loại khỏi tính năng** (cố ý): toàn bộ Sức khỏe, Giấy tờ & Pháp lý, Học vấn; Sức khỏe con cái; Sức khỏe cha mẹ; Danh tiếng bị thử thách / xuất hiện công chúng.', '');

  out.push('## 3. Bảng quy tắc Bát Tự', '',
    'Chiều: **ủng hộ** = làm tăng khả năng có biến động ở mảng đó; **ngược** = làm yếu. Sắc thái dùng cho điểm tốt/xấu của biểu đồ (`theo hỷ/kỵ` = theo hành can–chi lưu niên là dụng hay kỵ thần).', '',
    '| Mã | Mảng | Tầng | Chiều | Sắc thái | Trọng số | Điều kiện | Duyệt |', '|---|---|---|---|---|---|---|---|');
  for (const r of BZ_RULES) {
    out.push(`| \`${r.id}\` | ${AREA_LABEL[r.area]} | ${L(r.layer)} | ${r.supports ? 'ủng hộ' : 'ngược'} | ${r.tone === 'flow' ? 'theo hỷ/kỵ' : r.tone > 0 ? 'thuận' : r.tone < 0 ? 'nghịch' : 'trung tính'} | ${r.weight} | ${describeMatcher(r.match)} — ${r.label} |  |`);
  }
  out.push('', '## 4. Chỗ xấp xỉ cần anh biết', '',
    '- **Đại vận Bát Tự** (mới): chiều thuận/nghịch theo giới × âm dương can năm; khởi vận = số ngày tới *tiết* gần nhất ÷ 3. Nhưng trụ tháng của app lập theo tháng âm lịch (không theo tiết khí) nên đại vận chỉ là xấp xỉ, nhất quán với trụ app đang hiển thị.',
    '- **Dụng/kỵ thần**: lấy từ `batTuChart.favorableElements/unfavorableElements` của app (công thức đơn giản theo tỷ lệ hành nhật chủ), chưa xét tháng lệnh; lệch với `phongThuyBatTu`.',
    '- **Dịch Mã/Đào Hoa**: theo tam hợp của chi năm sinh và chi ngày sinh (bảng cổ điển).',
    '- **Chưa hỗ trợ giờ sinh không rõ** (app chưa có cờ này, mặc định giờ 12).',
    '- Tử Vi chấm bằng **toàn bộ engine annualEvents** (trọng số của engine, không phải bảng riêng), nên chỉnh trọng số Tử Vi là chỉnh `src/data/annualEventRules.generated.json`.', '');
  fs.mkdirSync('docs', { recursive: true });
  fs.writeFileSync(path.join('docs', 'past-review-rulebook.md'), out.join('\n'), 'utf8');
  expect(out.length).toBeGreaterThan(20);
});
