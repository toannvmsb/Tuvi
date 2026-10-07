/**
 * HIỆP KỶ 1.2 — bộ máy tra thần sát / sáu bậc / Nguyệt phá gia trọng cho MỘT NGÀY (port của `tuzi_supplement_reference.py`, gói Tuzi_Hiep_Ky_1_2).
 *
 * Phạm vi trung thực (đặc tả §7, §10):
 *  - Chỉ liệt kê những thần ĐÃ số hóa (35 khởi lệ theo tháng + 13 bảng theo mùa + Thiên Cẩu/Tam Hợp). Thần chưa có detector (Âm Dương Đại Hội,
 *    Tuế Bạc, Trục Trận, Tam Âm…) KHÔNG được coi là "không có" — `unresolved` ghi lại để UI/điểm không tuyên bố chắc chắn.
 *  - Bậc 0–5 là MÃ THỨ TỰ, không phải điểm. "balance" không phải "ngày bình thường".
 *  - Kết quả theo VIỆC (`hkActivityStatus`) là ứng viên kỵ theo Hiệp Kỷ; điểm/trần là chính sách Tuzi (dayPicker.ts).
 *  - Tháng = tháng TIẾT KHÍ (dayCalendar.monthBranch). Thiên Đức bốn tháng trọng là PHƯƠNG VỊ (Cấn/Khôn/Càn/Tốn) — không tự đổi thành chi.
 */
import type { EarthlyBranch, HeavenlyStem } from '../types';
import {
  HK_MONTHLY, HK_SEASONAL, HK_GRADE_CELLS, HK_GRADE_MODES, HK_REMEDIES, HK_BREAK, HK_MONTH_ORDER,
} from '../data/hiepKyThanSat';

const STEM_ZH: Record<HeavenlyStem, string> = {
  Giáp: '甲', Ất: '乙', Bính: '丙', Đinh: '丁', Mậu: '戊', Kỷ: '己', Canh: '庚', Tân: '辛', Nhâm: '壬', Quý: '癸',
};
const BRANCH_ZH: Record<EarthlyBranch, string> = {
  Tý: '子', Sửu: '丑', Dần: '寅', Mão: '卯', Thìn: '辰', Tị: '巳', Ngọ: '午', Mùi: '未', Thân: '申', Dậu: '酉', Tuất: '戌', Hợi: '亥',
};
const BRANCHES_ZH = '子丑寅卯辰巳午未申酉戌亥';
const OFFICERS = ['建日', '除日', '滿日', '平日', '定日', '執日', '破日', '危日', '成日', '收日', '開日', '閉日'];

/** Tên Việt của các thần/đối tượng hay hiện ra giao diện. */
export const HK_VI: Record<string, string> = {
  平日: 'Trực Bình', 收日: 'Trực Thu', 閉日: 'Trực Bế', 劫煞: 'Kiếp Sát', 災煞: 'Tai Sát', 月煞: 'Nguyệt Sát', 月刑: 'Nguyệt Hình',
  月害: 'Nguyệt Hại', 月厭: 'Nguyệt Yếm', 大時: 'Đại Thời', 天吏: 'Thiên Lại', 月破: 'Nguyệt phá', 四廢: 'Tứ Phế',
  月德: 'Nguyệt Đức', 天德: 'Thiên Đức', 月德合: 'Nguyệt Đức Hợp', 天德合: 'Thiên Đức Hợp', 天赦: 'Thiên Xá', 天願: 'Thiên Nguyện',
};
const viOf = (zh: string) => HK_VI[zh] ?? zh;

export interface HkFacts {
  /** Chi tháng tiết khí (chữ Hán) và can chi ngày (chữ Hán). */
  month: string;
  day: string;
  /** Mọi thần/quy tắc ĐÃ số hóa có mặt hôm nay (kể cả bí danh) + Trực (建日…閉日). */
  active: string[];
  /** Thần chỉ có phương vị (vd Thiên Đức tháng Mão) — không đánh giá thành chi ngày. */
  directional: { rule: string; direction: string }[];
}

/** Can chi ngày hợp lệ: cùng chẵn/lẻ (dương can đi với dương chi). */
export function isValidDayPillar(stem: HeavenlyStem, branch: EarthlyBranch): boolean {
  const si = '甲乙丙丁戊己庚辛壬癸'.indexOf(STEM_ZH[stem]);
  const bi = BRANCHES_ZH.indexOf(BRANCH_ZH[branch]);
  return si % 2 === bi % 2;
}

export function hkFacts(monthBranch: EarthlyBranch, dayStem: HeavenlyStem, dayBranch: EarthlyBranch): HkFacts {
  if (!isValidDayPillar(dayStem, dayBranch)) throw new Error('Can chi ngày không tồn tại trong vòng 60');
  const month = BRANCH_ZH[monthBranch];
  const ds = STEM_ZH[dayStem];
  const db = BRANCH_ZH[dayBranch];
  const day = ds + db;
  const active = new Set<string>();
  const directional: { rule: string; direction: string }[] = [];

  for (const r of HK_MONTHLY) {
    const value = r.values[month];
    let hit = false;
    if (value.startsWith('direction:')) { directional.push({ rule: r.id, direction: value.split(':')[1] }); continue; }
    if (r.kind === 'day_branch') hit = db === value;
    else if (r.kind === 'day_stem' || r.kind === 'day_stem_optional' || r.kind === 'stem_or_direction') hit = ds === value;
    else if (r.kind === 'day_pillar') hit = day === value;
    else if (r.kind === 'day_pillar_set') hit = value.split('/').includes(day);
    if (hit) { active.add(r.id); r.aliases.forEach(a => active.add(a)); }
  }
  const season = ['spring', 'summer', 'autumn', 'winter'][HK_MONTH_ORDER.indexOf(month) / 3 | 0];
  for (const [rule, byS] of Object.entries(HK_SEASONAL)) {
    const v = byS[season];
    let hit: boolean;
    if (rule === '四相') hit = v.includes(ds);
    else if (['王日', '官日', '相日', '民日', '守日', '時德', '四擊'].includes(rule)) hit = db === v;
    else hit = v.split('/').includes(day);
    if (hit) active.add(rule);
  }
  if (month === '申' && db === '戌') active.add('天狗');
  const off = (BRANCHES_ZH.indexOf(db) - BRANCHES_ZH.indexOf(month) + 12) % 12;
  if (off === 4 || off === 8) active.add('三合');
  active.add(OFFICERS[off]);
  return { month, day, active: [...active].sort(), directional };
}

export type HkBreakOutcome =
  | { status: 'not_applicable' }
  | { status: 'all_ji'; reason: string }
  | { status: 'scoped_ji'; notJi: string[] };

/** Nguyệt phá: cơ sở + gia trọng (Tý/Ngọ/Mùi/Thân cần Đức; Mão/Dậu; Âm Dương Giao Phá…). Chỉ là hạn chế theo phạm vi, không phải điểm. */
export function hkMonthBreak(f: HkFacts): HkBreakOutcome {
  if (!f.active.includes('月破')) return { status: 'not_applicable' };
  const act = new Set(f.active);
  for (const row of HK_BREAK.alwaysAllJi as { months?: string[]; month?: string; day?: string; also_active?: string; reason: string }[]) {
    const hit = (row.months?.includes(f.month)) || (row.month === f.month && row.day === f.day) || (row.also_active && act.has(row.also_active));
    if (hit) return { status: 'all_ji', reason: row.reason };
  }
  let allowed = [...HK_BREAK.baseNotJi];
  if (HK_BREAK.aggravatedMonths.includes(f.month)) {
    const virtues = HK_BREAK.aggravatedQualifying.filter(v => act.has(v));
    if (!virtues.length) return { status: 'all_ji', reason: 'gia trọng (Tai Sát/Nguyệt Hình) không gặp Đức' };
    allowed = allowed.filter(a => !HK_BREAK.aggravatedExtraJi.includes(a));
  }
  return { status: 'scoped_ji', notJi: allowed };
}

export interface HkGradeResult {
  trigger: string;
  chain: string[];
  /** Kết quả khi chuỗi chuyển quy tắc dừng ở Nguyệt phá. */
  breakOutcome?: HkBreakOutcome;
  grade?: number;
  virtues?: string[];
  mode?: string;
  residualJi?: string[];
}

/** Xử lý bảng sáu bậc cho các đối tượng CÓ MẶT hôm nay; phát hiện vòng lặp/thiếu điều khoản thì ném lỗi dữ liệu. */
export function hkGrades(f: HkFacts): HkGradeResult[] {
  const act = new Set(f.active);
  const out: HkGradeResult[] = [];
  for (const trigger of Object.keys(HK_GRADE_CELLS)) {
    if (!act.has(trigger)) continue;
    const chain: string[] = [];
    let cur = trigger;
    for (;;) {
      if (chain.includes(cur)) throw new Error('Vòng lặp chuyển quy tắc: ' + chain.join('→'));
      chain.push(cur);
      if (cur === '月破') { out.push({ trigger, chain, breakOutcome: hkMonthBreak(f) }); break; }
      if (!act.has(cur)) throw new Error('Quy tắc chuyển tới thần không có mặt: ' + cur);
      const rows = HK_REMEDIES.filter(r => r.trigger === cur && r.months.includes(f.month));
      if (rows.length !== 1) throw new Error('Thiếu hoặc trùng điều khoản: ' + cur + '/' + f.month);
      const r = rows[0];
      if (r.delegate) { cur = r.delegate; continue; }
      const grade = HK_GRADE_CELLS[cur][f.month];
      const virtues = r.qualifying.filter(v => act.has(v));
      const mode = HK_GRADE_MODES[grade][virtues.length ? 1 : 0];
      out.push({ trigger, chain, grade, virtues, mode, residualJi: mode === 'yi' ? r.residualJi : [] });
      break;
    }
  }
  return out;
}

export interface HkActivityStatus {
  /** 'all_ji': mọi việc kỵ · 'ji': việc này kỵ theo danh sách · 'balance': cát hung tương đương (không ghi nghi/kỵ) · 'none': không có kỵ nào được kích hoạt. */
  status: 'all_ji' | 'ji' | 'balance' | 'none';
  /** Nguyệt phá chi phối (để dayPicker áp trần riêng). */
  fromBreak: boolean;
  /** Việc này nằm trong danh sách "không kỵ" của Nguyệt phá cơ sở (cầu y, phá nhà, giải trừ…). */
  breakExempt: boolean;
  /** Lý do ngắn (tên Việt của thần gây kỵ). */
  note: string;
  /** Các đối tượng chưa giải được (lỗi dữ liệu / thiếu detector) — không coi là "không có". */
  unresolved: string[];
}

/**
 * Trạng thái kỵ của MỘT VIỆC trong ngày theo Hiệp Kỷ 1.2.
 * @param activityZh tên Hán của mục việc (HK_TRUC[n].zh) — dùng để đối chiếu danh sách "không kỵ"/residual.
 * @param jiRaw      chuỗi kỵ nguyên văn của mục việc (HK_TRUC[n].ji) — kỵ theo TÊN thần.
 */
export function hkActivityStatus(f: HkFacts, activityZh: string, jiRaw: string): HkActivityStatus {
  const res: HkActivityStatus = { status: 'none', fromBreak: false, breakExempt: false, note: '', unresolved: [] };
  const rank = { none: 0, balance: 1, ji: 2, all_ji: 3 } as const;
  const raise = (s: 'all_ji' | 'ji' | 'balance', note: string, fromBreak = false) => {
    if (rank[s] > rank[res.status]) { res.status = s; res.note = note; res.fromBreak = fromBreak; }
  };

  // Nguyệt phá luôn xét riêng (không nằm trong bảng bậc)
  const br = hkMonthBreak(f);
  if (br.status === 'all_ji') raise('all_ji', viOf('月破') + ' gia trọng', true);
  else if (br.status === 'scoped_ji') {
    if (br.notJi.includes(activityZh)) res.breakExempt = true;
    else raise('ji', viOf('月破'), true);
  }

  let grades: HkGradeResult[] = [];
  try { grades = hkGrades(f); } catch { res.unresolved.push('bảng bậc'); }
  for (const g of grades) {
    if (g.breakOutcome) continue; // đã xét ở trên
    const names = g.chain.concat(g.trigger);
    const mentioned = names.some(n => jiRaw.includes(n));
    const label = viOf(g.chain[g.chain.length - 1]);
    if (g.mode === 'all_ji') raise('all_ji', label + ' (hạ)');
    else if (g.mode === 'ji' && mentioned) raise('ji', label);
    else if (g.mode === 'balance' && mentioned) raise('balance', label);
    else if (g.mode === 'yi' && g.residualJi?.includes(activityZh)) raise('ji', label + ' (còn kỵ)');
  }
  return res;
}

/**
 * Ngày "MỌI VIỆC ĐỀU KỴ" theo Hiệp Kỷ (Nguyệt phá gia trọng, hoặc đối tượng bậc hạ/hạ hạ không gặp Đức) — không phụ thuộc việc cụ thể.
 * Dùng để màu/điểm ngày chung không báo "Tốt" trong khi mọi việc đều bị kỵ.
 */
export function hkDayAllJi(f: HkFacts): { allJi: boolean; note: string } {
  const br = hkMonthBreak(f);
  if (br.status === 'all_ji') return { allJi: true, note: `${viOf('月破')} gia trọng` };
  try {
    const g = hkGrades(f).find(x => !x.breakOutcome && x.mode === 'all_ji');
    if (g) return { allJi: true, note: viOf(g.chain[g.chain.length - 1]) + ' (hạ, không gặp Đức)' };
  } catch { /* dữ liệu không giải được → không kết luận */ }
  return { allJi: false, note: '' };
}

/** Các thần HUNG đã số hóa đang có mặt (để hiển thị một dòng thông tin) và các Đức đang có mặt. */
export function hkSummary(f: HkFacts): { hung: string[]; duc: string[] } {
  const act = new Set(f.active);
  const hungKeys = ['月破', '劫煞', '災煞', '月煞', '月刑', '月害', '月厭', '大時', '天吏', '四廢'];
  const ducKeys = ['月德', '天德', '月德合', '天德合', '天赦', '天願'];
  return { hung: hungKeys.filter(k => act.has(k)).map(viOf), duc: ducKeys.filter(k => act.has(k)).map(viOf) };
}

// ───────────────────────── Tổng hợp nhiều kịch bản (khi KHÔNG RÕ GIỜ SINH) ─────────────────────────
export interface HkScenario { lower?: number | null; upper?: number | null; veto?: boolean }
export interface HkAggregate {
  status: 'resolved' | 'indeterminate' | 'insufficient_data' | 'excluded_by_policy' | 'eligibility_uncertain';
  label: 'bad' | 'normal' | 'good' | null;
  scoreRange: { min: number; max: number } | null;
  observedRange?: { min: number; max: number } | null;
  rangeScope?: 'eligible_scenarios_only';
  probability: null;
}

/** Port `aggregate` của gói 1.2: min lower / max upper các kịch bản hợp lệ; KHÔNG trung bình, KHÔNG xác suất; kịch bản bị veto không tính 0. */
export function aggregateScenarios(scenarios: HkScenario[], complete = true, evidenceCoverage = 1): HkAggregate {
  if (!(evidenceCoverage >= 0 && evidenceCoverage <= 1)) throw new Error('Coverage không hợp lệ');
  if (!scenarios.length) return { status: 'insufficient_data', label: null, scoreRange: null, probability: null };
  const eligible: [number, number][] = [];
  let excluded = 0;
  for (const s of scenarios) {
    if (s.veto) {
      if (s.lower != null || s.upper != null) throw new Error('Kịch bản bị loại không được có điểm số');
      excluded++;
      continue;
    }
    const l = s.lower, u = s.upper;
    if (l == null || u == null || !Number.isFinite(l) || !Number.isFinite(u) || l < 0 || u > 100 || l > u) throw new Error('Cận không hợp lệ');
    eligible.push([l, u]);
  }
  const observed = eligible.length
    ? { min: Math.min(...eligible.map(x => x[0])), max: Math.max(...eligible.map(x => x[1])) } : null;
  if (!complete || evidenceCoverage < 0.85) return { status: 'insufficient_data', label: null, scoreRange: null, observedRange: observed, probability: null };
  if (!eligible.length) return { status: 'excluded_by_policy', label: null, scoreRange: null, probability: null };
  const range = observed!;
  if (excluded) return { status: 'eligibility_uncertain', label: null, scoreRange: range, rangeScope: 'eligible_scenarios_only', probability: null };
  const label = range.max <= 35 ? 'bad' : range.min >= 65 ? 'good' : range.min > 35 && range.max < 65 ? 'normal' : null;
  return { status: label ? 'resolved' : 'indeterminate', label, scoreRange: range, probability: null };
}

/** Hợp đồng giờ sinh v2 (gói 1.2 §8): exact | approximate | unknown. Không bao giờ gán giờ mặc định cho unknown. */
export interface BirthTimeV2 {
  status: 'exact' | 'approximate' | 'unknown';
  localTime: string | null;
  intervals?: { start: string; end: string; endDayOffset?: 0 | 1 }[];
}
export function validateBirthTime(t: BirthTimeV2): true {
  const ok = (v: string | null | undefined) => {
    if (typeof v !== 'string') return false;
    const m = /^(\d{2}):(\d{2})$/.exec(v);
    return !!m && +m[1] < 24 && +m[2] < 60;
  };
  const iv = t.intervals ?? [];
  if (t.status === 'exact') {
    if (!ok(t.localTime) || iv.length) throw new Error('exact cần đúng một giờ hợp lệ, không kèm khoảng');
  } else if (t.status === 'unknown') {
    if (t.localTime !== null || iv.length) throw new Error('unknown không được mang giờ/khoảng giả định');
  } else if (t.status === 'approximate') {
    if (t.localTime !== null || !iv.length) throw new Error('approximate chỉ có khoảng giờ');
    for (const i of iv) {
      if (!ok(i.start) || !ok(i.end)) throw new Error('Khoảng giờ không hợp lệ');
      const off = i.endDayOffset ?? 0;
      if ((off !== 0 && off !== 1) || (off === 0 && i.start >= i.end)) throw new Error('Thứ tự khoảng giờ không hợp lệ');
    }
  } else throw new Error('Thiếu trạng thái giờ sinh');
  return true;
}
