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
 * Chạy hàng loạt cho nhiều người (mỗi dòng một người: `tên,NĂM-THÁNG-NGÀY-GIỜ-nam|nu`):
 *   PAST_REVIEW_EXPORT=1 PAST_REVIEW_BIRTHS_FILE=nguoi-thu.csv npx jest src/core/__tests__/pastReviewExport.test.ts
 *
 * Sau khi mọi người điền xong các file `*-blind.md`, CHẤM bộ thử mù (so tỉ lệ khớp của mốc do bộ máy chọn với năm ngẫu nhiên cùng mảng):
 *   PAST_REVIEW_SCORE=1 npx jest src/core/__tests__/pastReviewExport.test.ts   → exports/past-review-score.md
 *   (PAST_REVIEW_PASS_DIFF=0.15 ngưỡng chênh lệch; PAST_REVIEW_MIN_PERSONS=50 số người tối thiểu; PAST_REVIEW_DIR đổi thư mục)
 *
 * Gói cho người có nghề đánh giá phần "Vì sao" (đúng phép / gượng / sai phép):
 *   PAST_REVIEW_EXPERT=1 PAST_REVIEW_BIRTHS_FILE=nguoi-thu.csv npx jest src/core/__tests__/pastReviewExport.test.ts → exports/past-review-expert-pack.md
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
import { LAUNCH_GATE } from '../pastReview/config';
import { parseBlindSheet, tallyRows, summarize, type KeyRow, type PersonResult } from '../pastReview/blindTest';
import { describeMarker } from '../pastReview/phrases';
import { explainWhy } from '../pastReview/explainWhy';

const run = process.env.PAST_REVIEW_EXPORT ? test : test.skip;
const OUT = process.env.PAST_REVIEW_DIR ?? 'exports';

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

/** Danh sách người thử: một người từ PAST_REVIEW_BIRTH, nhiều người từ PAST_REVIEW_BIRTHS_FILE (`tên,spec`), hoặc 3 lá số mẫu. */
function loadPeople(ny: number): { key: string; result: ReturnType<typeof buildResult> }[] {
  const file = process.env.PAST_REVIEW_BIRTHS_FILE;
  if (file) {
    return fs.readFileSync(file, 'utf8').split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#')).map((l, i) => {
      const [name, spec] = l.includes(',') ? l.split(',').map(s => s.trim()) : [`nguoi${i + 1}`, l];
      const key = name.replace(/[^\p{L}\p{N}_-]+/gu, '_');
      return { key, result: buildResult({ ...parseBirth(spec), name: key }, ny) };
    });
  }
  const spec = process.env.PAST_REVIEW_BIRTH;
  return spec
    ? [{ key: process.env.PAST_REVIEW_NAME ?? spec, result: buildResult(parseBirth(spec), ny) }]
    : allSampleResults().map((r, i) => ({ key: `mau${i + 1}`, result: r }));
}

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
  const items = loadPeople(ny);

  fs.mkdirSync(OUT, { recursive: true });
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
    // Đối chứng KHỚP MẢNG: mỗi mốc trong 5 mốc đầu có đúng một năm ngẫu nhiên CÙNG MẢNG (không thì lấy mảng bất kỳ),
    // để chênh lệch phản ánh việc chọn ĐÚNG NĂM chứ không phải mảng nào dễ "đúng" hơn.
    const randoms: typeof pool = [];
    const randYears = new Set<number>();
    for (const mk of pr.markers.slice(0, 5)) {
      const sameArea = pool.filter(c => c.area === mk.area && !randYears.has(c.year));
      const cands = sameArea.length ? sameArea : pool.filter(c => !randYears.has(c.year));
      if (!cands.length) break;
      const c = cands[Math.floor(rnd() * cands.length)];
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
    fs.writeFileSync(path.join(OUT, `past-review-${key}.md`), md.join('\n'), 'utf8');

    // Bộ thử mù: 5 mốc chọn (top theo độ mạnh) + 5 năm ngẫu nhiên, trộn bằng seed cố định.
    const chosen = pr.markers.slice(0, 5).map(m => ({ year: m.year, age: m.age, area: m.area, source: 'engine' as const, tier: m.tier, agree: m.agree }));
    const rands = randoms.map(r => ({ year: r.year, age: r.age, area: r.area, source: 'random' as const }));
    const all = [...chosen, ...rands];
    for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
    const blind = ['# Bộ thử mù — điền Đúng / Gần đúng / Sai / Không nhớ', '',
      'Với mỗi dòng: năm đó, ở mảng đời này, có biến động đáng kể không?', '',
      '| # | Năm (âm lịch) | Tuổi | Mảng | Phản hồi |', '|---|---|---|---|---|',
      ...all.map((r, i) => `| ${i + 1} | ${r.year} ${canChi(r.year)} | ${r.age} | ${AREA_LABEL[r.area]} |  |`)];
    fs.writeFileSync(path.join(OUT, `past-review-${key}-blind.md`), blind.join('\n'), 'utf8');
    fs.writeFileSync(path.join(OUT, `past-review-${key}-key.json`),
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
    case 'flow_same_branch': return `chi lưu niên TRÙNG chi trụ ${PILLAR[m.pillar]} (năm trùng tuổi)`;
    case 'flow_fuyin': return `can và chi lưu niên trùng hệt can chi trụ ${PILLAR[m.pillar]} (Phục ngâm)`;
    case 'flow_fanyin': return `can lưu niên xung can trụ ${PILLAR[m.pillar]} và chi lưu niên xung chi trụ ${PILLAR[m.pillar]} (Phản ngâm)`;
    case 'flow_star': return `chi lưu niên trùng ${m.star === 'horse' ? 'Dịch Mã' : 'Đào Hoa'} (tính theo tam hợp của chi năm/chi ngày sinh)`;
    case 'flow_stem_combine': return `can lưu niên ngũ hợp can trụ ${PILLAR[m.pillar]}`;
    case 'flow_stem_clash': return `can lưu niên tương xung can trụ ${PILLAR[m.pillar]}`;
    case 'flow_birth_star': return `chi lưu niên trùng ${m.star === 'hongLoan' ? 'Hồng Loan' : 'Thiên Hỷ'} (tính theo chi năm sinh)`;
    case 'flow_noble': return 'chi lưu niên là chi Thiên Ất Quý Nhân của can ngày hoặc can năm sinh';
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
    '8. **Mốc đổi năm**: Tử Vi theo NĂM ÂM LỊCH (mùng 1 Tết). Bát Tự (từ pr-0.2): trụ năm đổi ở Lập Xuân, trụ tháng đổi ở 12 tiết khí (`BAZI_BASIS` = tiet); đặt lunar để quay về cách của màn Bát Tự (tháng âm lịch).',
    '9. **Sự kiện vô lý theo tuổi** bị loại (`EVENT_MAX_AGE`, vd thăng chức sau 62, mua nhà sau 80, sinh con sau ~50).', '',
    '*Thay đổi pr-0.3-tam (06/10/2026):* thêm 3 quy tắc năm trùng tuổi / Phục ngâm / Phản ngâm; Bát Tự của cả app nay lập theo tiết khí và dùng chung phép phù ức. *Thay đổi pr-0.2-tam:* dụng/kỵ thần tính theo phép phù ức (thân vượng/nhược, tháng lệnh nặng nhất); trụ năm/tháng theo tiết khí; đại vận Bát Tự khởi từ trụ tháng tiết khí và kéo tới 12 vận; thêm `EVENT_MAX_AGE`.', '');

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
    '- **Đại vận Bát Tự**: chiều thuận/nghịch theo giới × âm dương can năm; khởi vận = số ngày tới *tiết* gần nhất ÷ 3 (theo ngày, bỏ qua giờ giao tiết), bắt đầu từ trụ tháng theo tiết khí (pr-0.2). Màn Bát Tự của app vẫn lập tháng theo âm lịch nên trụ tháng ở đây có thể khác trụ ở màn đó (đo trên 1.500 ngày sinh giả lập: khác ở ~17% người; trụ năm khác ở ~2%).',
    '- **Dụng/kỵ thần** (pr-0.2): phép phù ức trong `bazi/strength.ts` — tổng 100 điểm: chi tháng 40, can tháng/can giờ/chi ngày 12, can năm/chi năm/chi giờ 8; ≥ 50 điểm đồng đảng (Tỷ Kiếp + Ấn) là thân vượng. Chưa xét tòng cách, điều hậu, thông quan, bệnh–dược. Kết quả có thể KHÁC danh sách dụng/kỵ hiển thị ở màn Bát Tự và phong thủy của app (vẫn dùng cách đếm hành cũ; đo trên 1.500 ngày sinh: hai cách ra cùng kết luận vượng/nhược ở ~69% người).',
    '- **Dịch Mã/Đào Hoa**: theo tam hợp của chi năm sinh và chi ngày sinh (bảng cổ điển).',
    '- **Chưa hỗ trợ giờ sinh không rõ** (app chưa có cờ này, mặc định giờ 12).',
    '- Tử Vi chấm bằng **toàn bộ engine annualEvents** (trọng số của engine, không phải bảng riêng), nên chỉnh trọng số Tử Vi là chỉnh `src/data/annualEventRules.generated.json`.', '');
  fs.mkdirSync('docs', { recursive: true });
  fs.writeFileSync(path.join('docs', 'past-review-rulebook.md'), out.join('\n'), 'utf8');
  expect(out.length).toBeGreaterThan(20);
});

// ───────────────────────── Chấm bộ thử mù ─────────────────────────
const runScore = process.env.PAST_REVIEW_SCORE ? test : test.skip;

runScore('chấm bộ thử mù: tỉ lệ khớp của mốc do bộ máy chọn so với năm ngẫu nhiên cùng mảng', () => {
  const files = fs.readdirSync(OUT).filter(f => f.endsWith('-blind.md')).sort();
  expect(files.length).toBeGreaterThan(0);
  const persons: PersonResult[] = [];
  const agreeRows: PersonResult[] = [];
  const ageBands: Record<string, PersonResult[]> = { '15-24': [], '25-39': [], '40-59': [], '60+': [] };
  for (const f of files) {
    const keyFile = path.join(OUT, f.replace('-blind.md', '-key.json'));
    if (!fs.existsSync(keyFile)) continue;
    const keys: KeyRow[] = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
    const replies = parseBlindSheet(fs.readFileSync(path.join(OUT, f), 'utf8'));
    const id = f.replace(/^past-review-/, '').replace(/-blind\.md$/, '');
    persons.push({ id, engine: tallyRows(keys, replies, 'engine'), random: tallyRows(keys, replies, 'random') });
    agreeRows.push({ id, engine: tallyRows(keys, replies, 'engine', k => !!k.agree), random: tallyRows(keys, replies, 'random') });
    const age = Math.max(...keys.map(k => k.age));
    const band = age < 25 ? '15-24' : age < 40 ? '25-39' : age < 60 ? '40-59' : '60+';
    ageBands[band].push(persons[persons.length - 1]);
  }
  const opts = {
    passDiff: process.env.PAST_REVIEW_PASS_DIFF ? Number(process.env.PAST_REVIEW_PASS_DIFF) : LAUNCH_GATE.passDiff,
    minPersons: process.env.PAST_REVIEW_MIN_PERSONS ? Number(process.env.PAST_REVIEW_MIN_PERSONS) : LAUNCH_GATE.minPersons,
  };
  const S = summarize(persons, opts);
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  const md: string[] = [
    '# Kết quả thử mù — Nghiệm quá khứ', '',
    `Bảng quy tắc: **${RULEBOOK_VERSION}** · số file: ${files.length} · số người có trả lời ở cả hai nhóm: **${S.persons}**`, '',
    `## Kết luận: ${S.verdict === 'DAT' ? '✅ ĐẠT' : S.verdict === 'CHUA_DAT' ? '❌ CHƯA ĐẠT' : '⏳ CHƯA ĐỦ NGƯỜI'}`,
    ...S.reasons.map(r => `- ${r}`), '',
    '| Nhóm | Dòng đã trả lời | Khớp (Đúng + Gần đúng) | Tỉ lệ khớp | Chỉ tính "Đúng" |', '|---|---|---|---|---|',
    `| Mốc do bộ máy chọn | ${S.engine.answered} | ${S.engine.hits} | **${pct(S.engine.rate)}** | ${pct(S.engine.strictRate)} |`,
    `| Năm ngẫu nhiên cùng mảng | ${S.random.answered} | ${S.random.hits} | **${pct(S.random.rate)}** | ${pct(S.random.strictRate)} |`, '',
    `- Chênh lệch gộp: **${(S.diffPooled * 100).toFixed(1)} điểm %** (z = ${S.z.toFixed(2)})`,
    `- Chênh lệch ghép cặp theo từng người: **${(S.diffPaired * 100).toFixed(1)} điểm %**, khoảng tin cậy 95%: [${(S.ci95[0] * 100).toFixed(1)}; ${(S.ci95[1] * 100).toFixed(1)}]`,
    `- Ngưỡng đạt (TẠM, chốt 05/10/2026 — chỉnh sau khi có dữ liệu): chênh ≥ ${(S.passDiff * 100).toFixed(0)} điểm %, khoảng tin cậy nằm hẳn trên 0, ≥ ${S.minPersons} người`, '',
    '## Chia theo độ tuổi', '', '| Nhóm tuổi (lớn nhất trong 10 dòng) | Số người | Khớp mốc bộ máy | Khớp ngẫu nhiên | Chênh |', '|---|---|---|---|---|',
    ...Object.entries(ageBands).map(([b, ps]) => { const s = summarize(ps, opts); return `| ${b} | ${s.persons} | ${pct(s.engine.rate)} | ${pct(s.random.rate)} | ${(s.diffPooled * 100).toFixed(1)} |`; }), '',
  ];
  const sa = summarize(agreeRows, opts);
  md.push('## Riêng các mốc "cả hai hệ cùng báo"', '', `Khớp ${pct(sa.engine.rate)} (${sa.engine.hits}/${sa.engine.answered}) so với ngẫu nhiên ${pct(sa.random.rate)} — chênh ${(sa.diffPooled * 100).toFixed(1)} điểm %.`, '');
  fs.writeFileSync(path.join(OUT, 'past-review-score.md'), md.join('\n'), 'utf8');
  expect(S.persons).toBeGreaterThanOrEqual(0);
});

// ───────────────────────── Gói cho người có nghề đánh giá "Vì sao" ─────────────────────────
const runExpert = process.env.PAST_REVIEW_EXPERT ? test : test.skip;

runExpert('xuất gói đánh giá phần Vì sao cho người luận Tử Vi / Bát Tự', () => {
  const nowStr = process.env.PAST_REVIEW_NOW ?? new Date().toISOString().slice(0, 10);
  const [ny, nm, nd] = nowStr.split('-').map(Number);
  const now = new Date(ny, nm - 1, nd);
  const perPerson = Number(process.env.PAST_REVIEW_EXPERT_PER_PERSON ?? 3);
  const md: string[] = [
    '# Gói đánh giá phần "Vì sao" — Nghiệm quá khứ', '',
    'Với mỗi mốc bên dưới, xin anh/chị đọc lập luận của Tuzi và đánh dấu MỘT ô: **Đúng phép** · **Gượng** (có lý nhưng nhấn sai trọng tâm) · **Sai phép** (luận trái quy tắc Tử Vi / Bát Tự), rồi ghi ngắn chỗ sai nếu có.', '',
    'Lưu ý: đây là bản đọc cho người có nghề, không hiển thị ngày giờ sinh. Tử Vi luận theo Nam Phái; Bát Tự dùng năm theo âm lịch, đại vận xấp xỉ.', '',
  ];
  let n = 0;
  for (const { key, result } of loadPeople(ny)) {
    const pr = computePastReviewSync(result, { now });
    for (const m of pr.markers.slice(0, perPerson)) {
      n++;
      const ph = describeMarker(m);
      const why = explainWhy(m, { sensitive: ph.sensitive });
      md.push(`## Mốc ${n} — ${m.year} ${canChi(m.year)} · tuổi ${m.age} · ${AREA_LABEL[m.area]} (${m.tier})`, '', `*Câu mô tả:* ${ph.text}`, '',
        `**Tử Vi** — ${why.viewer.tuvi.goc} ${why.viewer.tuvi.nen} ${why.viewer.tuvi.ngoi} ${why.viewer.tuvi.ket}`, '',
        `**Bát Tự** — ${why.viewer.bazi.goc} ${why.viewer.bazi.nen} ${why.viewer.bazi.ngoi} ${why.viewer.bazi.ket}`, '',
        why.viewer.doiChieu, '',
        'Chi tiết từng tín hiệu:');
      for (const r of why.learner.rows) md.push(`- [${r.system === 'tuvi' ? 'Tử Vi' : 'Bát Tự'} · ${r.layerLabel}] ${r.title} — ${r.detail}`);
      md.push('', '**Đánh giá:** ☐ Đúng phép  ☐ Gượng  ☐ Sai phép', '**Ghi chú:** ', '');
    }
  }
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'past-review-expert-pack.md'), md.join('\n'), 'utf8');
  expect(n).toBeGreaterThan(0);
});
