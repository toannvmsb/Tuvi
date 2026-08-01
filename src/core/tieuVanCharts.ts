/**
 * TIỂU VẬN CHARTS (mục 5 tài liệu "Logic Tiểu Vận v2.0") — 3 biểu đồ:
 *   1. Cột đôi 12 THÁNG — nhìn tháng thuận/khó: wealth (tài lộc) / challenge
 *      (thách thức), lấy NGUYÊN VẸN từ Nguyệt Vận Engine (mục 3 pipeline:
 *      "Tính 12 tháng bằng Nguyệt vận Engine").
 *   2. Radar NĂM — cấu trúc lĩnh vực: 8 domain (8 chủ đề, dùng CHUNG khung
 *      THEME_DEFS với Nguyệt Vận nhưng chấm theo kích hoạt của CUNG NĂM +
 *      Lưu Tứ Hóa của NĂM thay vì của tháng).
 *   3. Đường 4 QUÝ — nhịp triển khai: overall/opportunity, suy ra bằng cách
 *      GỘP TRỰC TIẾP 12 tháng đã tính ở biểu đồ (1) theo từng quý (3 tháng/quý)
 *      — không phát sinh dữ kiện mới, không bịa.
 *
 * Quy tắc mục 7: "Dữ liệu năm trong biểu đồ Đại vận phải đúng output của
 * module này" — vì vậy 12-tháng ở đây dùng CHUNG `scoreAllNguyetVan`/
 * `nguyetVanDetail` với NguyetVanScreen, không tính lại theo công thức khác.
 */

import type { AstrologyResult, EarthlyBranch, TieuVan } from '../types';
import { scoreAllNguyetVan, nguyetVanDetail, palaceQuality, THEME_DEFS, type NguyetVanScore } from './nguyetVanScore';
import { luuTuHoaPositions } from './phiHoa';

const BRANCHES: EarthlyBranch[] = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tị', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
const bIdx = (b: string) => BRANCHES.indexOf(b as EarthlyBranch);
const TAM_HOP_IDX: number[][] = [[8, 0, 4], [2, 6, 10], [5, 9, 1], [11, 3, 7]];
const tamHopIdxOf = (i: number): number[] => (TAM_HOP_IDX.find(g => g.includes(i)) ?? [i]).filter(x => x !== i);
const HOA_BONUS: Record<string, number> = { 'Hóa Lộc': 10, 'Hóa Quyền': 7, 'Hóa Khoa': 6, 'Hóa Kỵ': -12 };

export interface TieuVanThemeAxis { key: string; label: string; value: number; } // 0–100

/** Radar 8 domain cho MỘT NĂM (tiểu vận) — cùng khung THEME_DEFS với Nguyệt Vận. */
export function tieuVanThemeRadar(result: AstrologyResult, tv: TieuVan): TieuVanThemeAxis[] {
  const houses = result.tuViChart.houses;
  const byBranchIdx = (i: number) => houses.find(h => bIdx(h.branch) === i);
  const byName = (name: string) => houses.find(h => h.palaceName === name);

  const yIdx = bIdx(tv.branch);
  const tamHopIdx = tamHopIdxOf(yIdx);
  const xungIdx = (yIdx + 6) % 12;
  const luuHoa = luuTuHoaPositions(result.tuViChart, tv.yearStem);

  const activationOf = (pIdx: number): 'đồng cung' | 'tam hợp' | 'xung chiếu' | '' =>
    pIdx === yIdx ? 'đồng cung' : tamHopIdx.includes(pIdx) ? 'tam hợp' : pIdx === xungIdx ? 'xung chiếu' : '';

  return THEME_DEFS.map(def => {
    const h = byName(def.palace);
    let s = palaceQuality(h);
    const act = h ? activationOf(bIdx(h.branch)) : '';
    if (act === 'đồng cung') s += 12;
    else if (act === 'tam hợp') s += 7;
    else if (act === 'xung chiếu') s += 2;
    for (const lh of luuHoa) {
      if (lh.palace === def.palace) s += HOA_BONUS[lh.hoa] ?? 0;
    }
    return { key: def.key, label: def.label, value: Math.max(5, Math.min(100, Math.round(s))) };
  });
}

export interface TieuVanQuarter {
  index: number;        // 1–4
  label: string;
  fromMonth: number;    // tháng âm bắt đầu quý
  toMonth: number;
  overall: number;      // 0–100 — TB (tài lộc − thách thức/2) quy đổi, gộp từ 12 tháng đã tính
  opportunity: number;  // 0–100 — TB "cơ hội" (nguyetVanDetail) của 3 tháng trong quý
}

const QUARTER_LABEL = ['Quý 1', 'Quý 2', 'Quý 3', 'Quý 4'];

export interface TieuVanChartData {
  age: number;
  months: NguyetVanScore[];     // 12 tháng — cột đôi (dùng chung Nguyệt Vận Engine)
  quarters: TieuVanQuarter[];   // 4 quý — đường nhịp triển khai
  radar: TieuVanThemeAxis[];    // 8 domain
  formulaVersion: '2.0';
}

/** Dựng dữ liệu 3 biểu đồ mục 5 cho 1 năm (tiểu vận). Tính LAZY khi màn hình cần. */
export function buildTieuVanCharts(result: AstrologyResult, age: number): TieuVanChartData | null {
  const tv = result.tieuVans.find(x => x.age === age);
  if (!tv) return null;

  const months = scoreAllNguyetVan(result, age);
  if (!months.length) return null;

  // 4 quý — gộp TRỰC TIẾP từ 12 tháng đã tính (không phát sinh dữ liệu mới).
  const quarters: TieuVanQuarter[] = [0, 1, 2, 3].map(qi => {
    const from = qi * 3 + 1, to = qi * 3 + 3;
    const slice = months.filter(m => m.month >= from && m.month <= to);
    const avgTai = slice.length ? slice.reduce((s, m) => s + m.taiLoc, 0) / slice.length : 50;
    const avgThach = slice.length ? slice.reduce((s, m) => s + m.thachThuc, 0) / slice.length : 50;
    const overall = Math.max(4, Math.min(100, Math.round(50 + (avgTai - avgThach) / 2)));
    const coHoiVals = slice.map(m => {
      const d = nguyetVanDetail(result, age, m.month);
      return (d?.scores.find(s => s.key === 'coHoi')?.value ?? 5) * 10;
    });
    const opportunity = coHoiVals.length
      ? Math.max(4, Math.min(100, Math.round(coHoiVals.reduce((s, v) => s + v, 0) / coHoiVals.length)))
      : 50;
    return { index: qi + 1, label: QUARTER_LABEL[qi], fromMonth: from, toMonth: to, overall, opportunity };
  });

  const radar = tieuVanThemeRadar(result, tv);

  return { age, months, quarters, radar, formulaVersion: '2.0' };
}
