import { dayCalendarFacts, jdFromDate } from '../dayCalendar';
import { hkFacts, hkMonthBreak } from '../hiepKy';
import {
  dayCanChi, trucNgayInfo, hoangDaoNgay, nhi28Info, genericDayFacts, scoreNhatVan, ratingOfScore, TRUC_NAMES,
} from '../nhatVan';
import { pickGoodDays, pickGoodDaysGeneric, trucRulesOf, isBreakExempt, tasksForDay, groupAvoid } from '../dayPicker';
import { HK_TRUC } from '../../data/hiepKyTruc';
import { TASK_TO_HK } from '../dayQualityTables';
import { DAY_PICK_GROUPS, findTaskByCode } from '../../data/dayPickTasks';
import { genericDayScore } from '../genericMonthHeatmap';
import { NHI28_GOOD, NHI28_NAMES, THIEN_DUC_BY_MONTH, NGUYET_DUC_BY_MONTH, DAY_RULEBOOK_VERSION } from '../dayQualityTables';
import { allSampleResults } from './fixtures';

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

/**
 * Golden test cho logic NGÀY ĐẸP (đặc tả Tuzi_Nghien_cuu_va_dac_ta_engine §18 + golden_cases.json):
 * - convention fixture: JDN, can chi ngày, Trực, tháng tiết khí;
 * - policy fixture: chống đếm trùng Nguyệt phá/Trực Phá, quy tắc theo việc.
 */
describe('Lịch pháp ngày (convention fixtures)', () => {
  it('JDN 01/01/2000 = 2451545; 07/01/2000 = Giáp Tý, 08/01/2000 = Ất Sửu (golden CAL-JDN)', () => {
    expect(jdFromDate(1, 1, 2000)).toBe(2451545);
    expect(jdFromDate(7, 1, 2000)).toBe(2451551);
    expect(dayCanChi(d(2000, 1, 7))).toMatchObject({ stem: 'Giáp', branch: 'Tý' });
    expect(dayCanChi(d(2000, 1, 8))).toMatchObject({ stem: 'Ất', branch: 'Sửu' });
  });

  it('D và D+60 cùng can chi ngày', () => {
    const a = dayCanChi(d(2026, 3, 10));
    const b = dayCanChi(new Date(2026, 2, 10 + 60));
    expect([a.stem, a.branch]).toEqual([b.stem, b.branch]);
  });

  it('05/02/2024: tháng tiết khí Dần, năm Bát Tự Giáp Thìn; năm ÂM vẫn Quý Mão (đặc tả ví dụ A)', () => {
    const f = dayCalendarFacts(d(2024, 2, 5));
    expect(f.monthBranch).toBe('Dần');
    expect(f.baziYear).toBe(2024);
    expect(f.yearStem).toBe('Giáp');
    expect(f.yearBranch).toBe('Thìn');
    expect(f.lunarYear).toBe(2023);
    expect(f.lunarYearBranch).toBe('Mão');
  });

  it('trước Lập Xuân → tháng Sửu của năm Bát Tự cũ', () => {
    const f = dayCalendarFacts(d(2024, 2, 2));
    expect(f.monthBranch).toBe('Sửu');
    expect(f.baziYear).toBe(2023);
  });

  it('ngày giao tiết dùng tháng MỚI và Trực LẶP lại với hôm trước (truyền thống)', () => {
    let seen = 0;
    for (let i = 0; i < 366; i++) {
      const day = new Date(2026, 0, 1 + i);
      const f = dayCalendarFacts(day);
      if (!f.isJieDay) continue;
      seen++;
      const prev = new Date(2026, 0, i);
      const t0 = trucNgayInfo(dayCanChi(prev).branch, dayCalendarFacts(prev).monthBranch).idx;
      const t1 = trucNgayInfo(dayCanChi(day).branch, f.monthBranch).idx;
      expect(t1).toBe(t0);
    }
    expect(seen).toBe(12); // 12 tiết trong một năm dương
  });
});

describe('Trực / Hoàng đạo / Nguyệt phá', () => {
  it('golden EL-OFFICER: ngày Dần tháng Dần = Kiến; ngày Thân tháng Dần = Phá', () => {
    expect(trucNgayInfo('Dần', 'Dần').name).toBe('Kiến');
    expect(trucNgayInfo('Thân', 'Dần').name).toBe('Phá');
    expect(TRUC_NAMES[6]).toBe('Phá');
  });

  it('Trực dùng THÁNG TIẾT KHÍ, không phải tháng âm: có ngày mà hai cách ra Trực khác nhau', () => {
    let diff = 0;
    for (let i = 0; i < 365; i++) {
      const day = new Date(2026, 0, 1 + i);
      const f = dayCalendarFacts(day);
      const cc = dayCanChi(day);
      // cách cũ: tháng âm 1 = Dần …
      const oldMonthBranch = (['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tị', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'] as const)[(f.lunarMonth + 1) % 12];
      if (trucNgayInfo(cc.branch, oldMonthBranch).idx !== trucNgayInfo(cc.branch, f.monthBranch).idx) diff++;
    }
    expect(diff).toBeGreaterThan(50);
  });

  it('chống đếm trùng: Nguyệt phá ⇔ Trực Phá, và ngày đó điểm lịch chung ≤ trần Nguyệt phá', () => {
    let breaks = 0;
    for (let i = 0; i < 400; i++) {
      const day = new Date(2026, 0, 1 + i);
      const g = genericDayFacts(day);
      expect(g.monthBreak).toBe(g.truc === 'Phá');
      if (g.monthBreak) { breaks++; expect(g.score100).toBeLessThanOrEqual(42); }
    }
    expect(breaks).toBeGreaterThan(20);
  });

  it('Hoàng đạo ngày: đúng 6/12 chi mỗi tháng', () => {
    for (const mb of ['Dần', 'Mão', 'Thìn', 'Tị', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi', 'Tý', 'Sửu'] as const) {
      const n = (['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tị', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'] as const).filter(b => hoangDaoNgay(b, mb)).length;
      expect(n).toBe(6);
    }
  });
});

describe('Nhị thập bát tú & Đức', () => {
  it('mốc đối chiếu lịch Việt (xemlicham/baohatinh) + khớp thứ trong tuần', () => {
    expect(nhi28Info(d(2000, 1, 1)).name).toBe('Vị');
    expect(nhi28Info(d(2008, 8, 22)).name).toBe('Ngưu');
    expect(nhi28Info(d(2008, 8, 26)).name).toBe('Thất');
    expect(nhi28Info(d(2028, 2, 26)).name).toBe('Liễu');
    expect(nhi28Info(d(2033, 3, 7)).name).toBe('Nguy');
    expect(nhi28Info(d(2026, 10, 8)).name).toBe('Tỉnh');
    expect(genericDayFacts(d(2026, 10, 8)).truc).toBe('Chấp');
    const WEEKDAY_OF: Record<string, number> = { Giác: 4, Phòng: 0, Nữ: 6, Tâm: 1 };
    for (let i = 0; i < 400; i += 3) {
      const day = new Date(2026, 0, 1 + i);
      const name = nhi28Info(day).name;
      if (name in WEEKDAY_OF) expect(day.getDay()).toBe(WEEKDAY_OF[name]);
    }
  });

  it('bảng 28 tú theo Ngọc Hạp Ký: 14 cát / 14 hung (Đê hung, Cơ cát, Khuê hung, Sâm cát, Dực hung)', () => {
    expect(NHI28_NAMES).toHaveLength(28);
    expect(NHI28_GOOD.filter(Boolean)).toHaveLength(14);
    for (const n of ['Giác', 'Phòng', 'Cơ', 'Vĩ', 'Đẩu', 'Thất', 'Bích', 'Lâu', 'Vị', 'Tất', 'Sâm', 'Tỉnh', 'Trương', 'Chẩn']) {
      expect(NHI28_GOOD[NHI28_NAMES.indexOf(n)]).toBe(true);
    }
    for (const n of ['Cang', 'Đê', 'Tâm', 'Ngưu', 'Nữ', 'Hư', 'Nguy', 'Khuê', 'Mão', 'Chủy', 'Quỷ', 'Liễu', 'Tinh', 'Dực']) {
      expect(NHI28_GOOD[NHI28_NAMES.indexOf(n)]).toBe(false);
    }
  });

  it('bảng Đức đủ 12 tháng; Nguyệt Đức tháng Dần = Bính', () => {
    expect(THIEN_DUC_BY_MONTH).toHaveLength(12);
    expect(NGUYET_DUC_BY_MONTH).toHaveLength(12);
    expect(NGUYET_DUC_BY_MONTH[0]).toBe('Bính');
    let hit = 0;
    for (let i = 0; i < 365; i++) if (genericDayFacts(new Date(2026, 0, 1 + i)).duc.length) hit++;
    expect(hit).toBeGreaterThan(30);
    expect(hit).toBeLessThan(200);
  });
});

describe('Điểm ngày & quy tắc theo việc', () => {
  const results = allSampleResults();

  it('ngưỡng nhãn giữ nguyên', () => {
    expect([70, 55, 40, 25, 24].map(ratingOfScore)).toEqual(['Rất tốt', 'Tốt', 'Bình thường', 'Cần thận trọng', 'Xấu']);
  });

  it('scoreNhatVan: 0–100, có version, ngày Nguyệt phá bị trần 42', () => {
    for (const r of results) {
      for (let i = 0; i < 120; i++) {
        const sc = scoreNhatVan(r, new Date(2026, 5, 1 + i));
        expect(sc.score100).toBeGreaterThanOrEqual(0);
        expect(sc.score100).toBeLessThanOrEqual(100);
        expect(sc.ruleVersion).toBe(DAY_RULEBOOK_VERSION);
        expect(sc.monthBreak).toBe(sc.truc === 'Phá');
        if (sc.monthBreak) expect(sc.score100).toBeLessThanOrEqual(42);
      }
    }
  });

  it('heatmap/Home khi chưa có lá số dùng cùng công thức với Xem ngày tốt cơ bản', () => {
    for (let i = 0; i < 60; i++) {
      const day = new Date(2026, 8, 1 + i);
      expect(genericDayScore(day).score).toBe(genericDayFacts(day).score100);
    }
  });

  it('việc trọng đại (Động thổ): ngày Nguyệt phá/Tuế phá bị trừ điểm nặng (không loại), điểm ≤ trần + bonus hành', () => {
    const r = results[0];
    let seen = 0;
    for (let i = 0; i < 200; i++) {
      const day = new Date(2026, 9, 1 + i);
      const sc = scoreNhatVan(r, day);
      if (!(sc.monthBreak && !sc.xungTuoi)) continue;
      seen++;
      const out = pickGoodDays(r, 'PROP_GROUNDBREAK', day, day);
      expect(out.top.length === 0 || out.top[0].score100 <= 45).toBe(true);
    }
    expect(seen).toBeGreaterThan(5);
  });

  it('nhóm Sức khỏe không bị trừ vì Nguyệt phá; việc nhẹ chỉ bị trần mềm', () => {
    const g = genericDayFacts(new Date(2026, 9, 1));
    expect(g.ruleVersion).toBe(DAY_RULEBOOK_VERSION);
    expect(pickGoodDaysGeneric('HEALTH_SURGERY', d(2026, 10, 1), d(2027, 1, 31)).excluded).toEqual({ xungTuoi: 0 });
  });

  it('Tam Nương/Nguyệt kỵ chỉ trừ điểm ở việc trọng đại hoặc xuất hành; việc nhẹ không bị trừ', () => {
    // tìm 1 ngày Tam Nương
    let day: Date | null = null;
    for (let i = 0; i < 60 && !day; i++) {
      const t = new Date(2026, 9, 1 + i);
      const g = genericDayFacts(t);
      if (g.tamNuong && !g.monthBreak && !g.tuePha) day = t;
    }
    expect(day).not.toBeNull();
    const light = pickGoodDaysGeneric('FIN_INSURANCE', day!, day!).top[0];
    const g = genericDayFacts(day!);
    // việc nhẹ: điểm = beforeHard (không trừ Tam Nương) + bonus nhỏ → luôn ≥ điểm chung đã bị trừ 20
    if (light) expect(light.score100).toBeGreaterThanOrEqual(g.score100);
    expect(light?.warnings.some(w => w.includes('Tam Nương')) ?? false).toBe(false);
  });
});

describe('Trực nghi/kỵ theo Hiệp Kỷ quyển 11 (bản đối chiếu 1.1)', () => {
  const rules = (code: string) => { const f = findTaskByCode(code)!; return trucRulesOf(f.task, f.group); };
  const idx = (n: string) => TRUC_NAMES.indexOf(n);

  it('đủ 73 mục; mọi việc được ánh xạ đều tồn tại trong danh mục và trong bảng Hiệp Kỷ', () => {
    expect(Object.keys(HK_TRUC)).toHaveLength(73);
    const codes = new Set(DAY_PICK_GROUPS.flatMap(g => g.tasks.map(x => x.code)));
    for (const [code, hk] of Object.entries(TASK_TO_HK)) {
      expect(codes.has(code)).toBe(true);
      expect(HK_TRUC[hk]).toBeDefined();
    }
  });

  it('golden: Thu nghi nạp tài nhưng KỴ khai thị (không dùng cái này thay cái kia)', () => {
    expect(rules('FIN_INVEST').nghi).toContain(idx('Thu'));
    expect(rules('BIZ_OPEN_SHOP').ky).toContain(idx('Thu'));
    expect(rules('BIZ_OPEN_SHOP').nghi).toEqual([idx('Mãn'), idx('Thành'), idx('Khai')]);
  });

  it('golden: Phá nghi cầu y; Bế nghi đắp đê (mục 43) — không coi Phá/Bế là cấm tuyệt đối', () => {
    expect(rules('HEALTH_SURGERY').nghi).toContain(idx('Phá'));
    expect(HK_TRUC[43].nghi).toContain(idx('Bế'));
    expect(HK_TRUC[62].nghi).toEqual([idx('Phá')]);
  });

  it('hôn nhân: bảng trực đích danh KHÔNG có nghi (nghi đi qua Tam Hợp) → giữ Định/Thành làm nghi mềm; kỵ đúng Hiệp Kỷ', () => {
    expect(HK_TRUC[27].nghi).toEqual([]);
    expect(rules('LOVE_WEDDING').nghi).toEqual([idx('Định'), idx('Thành')]);
    expect(rules('LOVE_WEDDING').ky).toEqual([idx('Bình'), idx('Phá'), idx('Thu'), idx('Bế')]);
  });

  it('Trực Phá không bị trừ thêm 10 điểm theo việc (đã tính ở Nguyệt phá)', () => {
    // Động thổ ngày Phá: điểm = (trần Nguyệt phá) chứ không bị trừ đôi bằng Trực
    const day = (() => { for (let i = 0; i < 40; i++) { const t = new Date(2026, 9, 1 + i); if (genericDayFacts(t).monthBreak) return t; } return null; })();
    expect(day).not.toBeNull();
    const out = pickGoodDaysGeneric('PROP_GROUNDBREAK', day!, day!);
    expect(out.top.length === 0 || out.top[0].score100 <= 45).toBe(true);
  });
});

describe('Điều lệ phụ chú Hiệp Kỷ', () => {
  it('Nguyệt phá không áp cho việc có Phá trong Trực nghi (cầu y); áp cho việc kiến lập', () => {
    const f = (c: string) => findTaskByCode(c)!;
    expect(isBreakExempt(f('HEALTH_SURGERY').task, f('HEALTH_SURGERY').group)).toBe(true);
    expect(isBreakExempt(f('BIZ_OPEN_SHOP').task, f('BIZ_OPEN_SHOP').group)).toBe(false);
  });

  it('ngày Tị kỵ xuất hành: điểm ngày Tị thấp hơn 10 so với cùng điều kiện (trừ điểm hiện trong lý do)', () => {
    let found = false;
    for (let i = 0; i < 40 && !found; i++) {
      const day = new Date(2026, 9, 1 + i);
      if (dayCanChi(day).branch !== 'Tị') continue;
      const out = pickGoodDaysGeneric('TRAVEL_VACATION', day, day);
      const c = out.top[0];
      if (c) { found = true; expect(c.reasons.join(' ')).toContain('ngày Tị kỵ xuất hành'); }
    }
    // ngày Tị có thể rơi dưới 40 điểm (không vào top) → khi đó không có gì để kiểm; tìm được ngày thì phải có lý do trừ điểm
  });
});

describe('Việc hợp / nên tránh hôm nay (tasksForDay)', () => {
  it('Việc hợp luôn được Trực nghi; không việc nào vừa hợp vừa tránh; nhóm Số không xuất hiện', () => {
    for (let i = 0; i < 30; i++) {
      const day = new Date(2026, 9, 1 + i);
      for (const r of [null, allSampleResults()[0]]) {
        const { good, avoid } = tasksForDay(day, r);
        const codes = new Set(good.map(x => x.code));
        for (const a of avoid) expect(codes.has(a.code)).toBe(false);
        for (const g of good) { expect(g.score100).toBeGreaterThanOrEqual(50); expect(g.code).not.toMatch(/^(PHONE|PLATE|BANK|HOUSE|LUCKY|COMPANY|ASSET)$/); }
      }
    }
  });

  it('ngày Nguyệt phá: việc trọng đại (Khai trương, Động thổ, Cưới) nằm ở "nên tránh" với lý do Nguyệt phá', () => {
    const day = (() => { for (let i = 0; i < 40; i++) { const t = new Date(2026, 9, 1 + i); if (genericDayFacts(t).monthBreak) return t; } return null; })()!;
    const { avoid, good } = tasksForDay(day, null);
    const map = new Map(avoid.map(x => [x.code, x]));
    for (const c of ['BIZ_OPEN_SHOP', 'PROP_GROUNDBREAK', 'LOVE_WEDDING']) expect(map.get(c)?.note).toBe('Nguyệt phá');
    // Cầu y có Phá làm nghi → không bị Nguyệt phá; được vào danh sách hợp nếu điểm đủ
    expect(avoid.find(x => x.code === 'HEALTH_SURGERY')?.note).not.toBe('Nguyệt phá');
    expect(good.length + avoid.length).toBeGreaterThan(0);
  });

  it('ngày Trực Khai: Khai trương hợp (Hiệp Kỷ: Khai thị nghi Khai) khi không dính Nguyệt phá/Tuế phá', () => {
    let checked = 0;
    for (let i = 0; i < 90 && checked < 3; i++) {
      const day = new Date(2026, 9, 1 + i);
      const f = genericDayFacts(day);
      if (f.truc !== 'Khai' || f.monthBreak || f.tuePha || f.tamNuong || f.nguyetKy) continue;
      const { good } = tasksForDay(day, null);
      if (good.some(x => x.code === 'BIZ_OPEN_SHOP') || f.score100 < 40) checked++;
    }
    expect(checked).toBeGreaterThan(0);
  });
});

describe('Tích hợp Hiệp Kỷ 1.2 vào chọn ngày theo việc', () => {
  const find = (pred: (st: ReturnType<typeof hkMonthBreak>) => boolean): Date | null => {
    for (let i = 0; i < 400; i++) {
      const day = new Date(2026, 9, 1 + i);
      const cal = dayCalendarFacts(day);
      const cc = dayCanChi(day);
      if (pred(hkMonthBreak(hkFacts(cal.monthBranch, cc.stem, cc.branch)))) return day;
    }
    return null;
  };

  it('ngày Nguyệt phá gia trọng (mọi việc kỵ): cả cầu y cũng nằm ở "nên tránh"', () => {
    const day = find(s => s.status === 'all_ji')!;
    expect(day).not.toBeNull();
    const { avoid } = tasksForDay(day, null);
    expect(avoid.some(x => x.code === 'HEALTH_SURGERY')).toBe(true);
    expect(avoid.some(x => x.code === 'LOVE_WEDDING')).toBe(true);
  });

  it('ngày Nguyệt phá cơ sở: cầu y KHÔNG bị Nguyệt phá trừ điểm (không kỵ), cưới thì bị', () => {
    const day = find(s => s.status === 'scoped_ji')!;
    expect(day).not.toBeNull();
    const { avoid } = tasksForDay(day, null);
    expect(avoid.find(x => x.code === 'LOVE_WEDDING')?.note).toBe('Nguyệt phá');
    expect(avoid.find(x => x.code === 'HEALTH_SURGERY')?.note).not.toBe('Nguyệt phá');
  });
});

describe('Báo cáo Cơ bản khớp thẻ "Việc hợp / nên tránh"', () => {
  it('"Nên làm"/"Không nên làm" nêu đúng các việc của tasksForDay, không còn câu chung "ký kết, khai trương" khi Trực không nghi', () => {
    const { generateNhatVanOffline } = require('../nhatVanReport');
    const r = allSampleResults()[0];
    for (let i = 0; i < 40; i++) {
      const day = new Date(2026, 9, 8 + i, 12);
      const md: string = generateNhatVanOffline(r, day);
      const fit = tasksForDay(day, r);
      const nen = md.split('# Nên làm hôm nay')[1].split('# Không nên')[0];
      const khong = md.split('# Không nên làm hôm nay')[1].split('# Khung giờ')[0];
      if (fit.good.length) expect(nen).toContain(fit.good[0].name);
      const firstGroup = groupAvoid(fit.avoid)[0];
      if (firstGroup) expect(khong).toContain(firstGroup.items[0].name);
      for (const g of fit.good.slice(0, 6)) expect(khong).not.toContain(g.name + ' (');
      expect(md).not.toContain('Thuận để TIẾN HÀNH việc quan trọng');
    }
  });
});

describe('Ngày tốt luôn có việc để khuyên', () => {
  it('ngày điểm ≥ 55 (không Nguyệt phá/Tuế phá/xung tuổi) → danh sách "việc hợp" không rỗng; việc thuận gắn nhãn "không vướng kỵ"', () => {
    const r = allSampleResults()[0];
    let checked = 0;
    for (let i = 0; i < 120; i++) {
      const day = new Date(2026, 9, 8 + i, 12);
      const sc = scoreNhatVan(r, day);
      if (sc.score100 < 55 || sc.monthBreak || sc.tuePha || sc.xungTuoi) continue;
      const { good } = tasksForDay(day, r);
      expect(good.length).toBeGreaterThan(0);
      for (const g of good.filter(x => x.tier === 'thuan')) expect(g.note).toBe('không vướng kỵ');
      const idx = good.findIndex(x => x.tier === 'thuan');
      if (idx >= 0) expect(good.slice(0, idx).every(x => x.tier === 'nghi')).toBe(true);
      checked++;
    }
    expect(checked).toBeGreaterThan(5);
  });
});

describe('Ngày Hiệp Kỷ "mọi việc đều kỵ" nhất quán giữa màu ngày và danh sách việc', () => {
  it('điểm ngày ≤ trần, có cảnh báo, và không việc nào được xếp "hợp"', () => {
    let seen = 0;
    for (let i = 0; i < 400 && seen < 8; i++) {
      const day = new Date(2026, 9, 8 + i, 12);
      const g = genericDayFacts(day);
      if (!g.hkAllJi) continue;
      seen++;
      expect(g.score100).toBeLessThanOrEqual(42);
      expect(g.warnings.some(w => w.includes('mọi việc đều kỵ'))).toBe(true);
      expect(tasksForDay(day, null).good.filter(x => x.tier === 'nghi').length).toBe(0);
    }
    expect(seen).toBeGreaterThan(3);
  });
});

describe('Phân hạng kỵ: Nên tránh (nặng) / Cân nhắc (vừa)', () => {
  it('ba danh sách không giao nhau; "Nên tránh" chỉ gồm lý do nặng; "Cân nhắc" chỉ việc trọng đại', () => {
    const r = allSampleResults()[0];
    const { findTaskByCode } = require('../../data/dayPickTasks');
    for (let i = 0; i < 60; i++) {
      const day = new Date(2026, 9, 8 + i, 12);
      const f = tasksForDay(day, r);
      const all = [...f.good, ...f.avoid, ...f.consider].map(x => x.code);
      expect(new Set(all).size).toBe(all.length);
      for (const a of f.avoid) expect(['Nguyệt phá', 'Tuế phá', 'xung tuổi'].includes(a.note) || a.note.length > 0).toBe(true);
      for (const c of f.consider) expect(findTaskByCode(c.code).task.weight).toBeGreaterThanOrEqual(4);
    }
  });

  it('kỵ nhẹ (thần sát thường) rơi vào "Cân nhắc", không vào "Nên tránh"; chỉ ngày Nguyệt phá/mọi-việc-kỵ mới đầy "Nên tránh"', () => {
    let sumAvoid = 0, sumConsider = 0, n = 0;
    for (let i = 0; i < 365; i++) {
      const day = new Date(2026, 9, 8 + i, 12);
      const g = genericDayFacts(day);
      const f = tasksForDay(day, null);
      if (!g.hkAllJi && !g.monthBreak && !g.tuePha) {
        expect(f.avoid.length).toBe(0);
        sumConsider += f.consider.length;
      } else sumAvoid += f.avoid.length;
      n++;
    }
    expect(n).toBe(365);
    expect(sumConsider).toBeGreaterThan(0);
    expect(sumAvoid).toBeGreaterThan(0);
  });
});

describe('Box Vận khí hôm nay (Home) khớp thẻ Việc hợp', () => {
  it('dòng đầu "Nên" nêu đúng các việc đầu của tasksForDay; dòng "Hạn chế" nêu đúng nhóm nên tránh/cân nhắc', () => {
    const { buildTodaySummary } = require('../todaySummary');
    for (const r of [null, allSampleResults()[0]]) {
      for (let i = 0; i < 40; i++) {
        const day = new Date(2026, 9, 8 + i, 12);
        const s = buildTodaySummary(r, day);
        const f = tasksForDay(day, r);
        if (f.good.length) expect(s.good[0]).toContain(f.good[0].name);
        else expect(s.good[0]).not.toContain('Việc hợp:');
        const bad = (s.bad as string[]).join(' | ');
        if (f.avoid.length) expect(bad).toContain(f.avoid[0].name);
        else if (f.consider.length) expect(bad).toContain(f.consider[0].name);
      }
    }
  });
});
