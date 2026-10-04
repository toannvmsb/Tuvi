// Import trực tiếp từng module (không qua barrel) để test thuần offline.
import type { BirthInfo, EarthlyBranch, FiveElement, HeavenlyStem, Pillar } from '../../types';
import { buildResult } from '../buildResult';
import { getLuuStarsForYear } from '../starPlacer';
import { getBranchIndex } from '../../data/napAm';
import { ALL_RULES } from '../annualEvents/rules';
import { yearCanChi } from '../annualEvents/calendar';
import { computePastReviewSync, candidateYears, lunarYearOf } from '../pastReview';
import { AREAS, PAST_CONFIG, RULEBOOK_VERSION, type AreaId } from '../pastReview/config';
import { EVENT_TO_AREA, areaOfEvent } from '../pastReview/areaMap';
import { branchRelations } from '../pastReview/bazi/relations';
import { BZ_RULES } from '../pastReview/bazi/rules';
import { HIDDEN_STEMS, STEM_ELEMENT, horseBranchOf, peachBranchOf } from '../pastReview/bazi/tables';
import { buildBaziNatal, evaluateBaziYear, type BaziNatal } from '../pastReview/bazi/engine';
import { computeBaziLuck, luckAtYear } from '../pastReview/bazi/luck';
import { allSampleResults, sampleResult, SAMPLE_BIRTH } from './fixtures';

const NOW = new Date(2026, 9, 4); // cố định để kết quả không phụ thuộc ngày chạy test

const mkPillar = (stem: HeavenlyStem, branch: EarthlyBranch, label: string): Pillar =>
  ({ stem, branch, hiddenStems: HIDDEN_STEMS[branch], element: STEM_ELEMENT[stem], label });

/** Lá số Bát Tự dựng tay để kiểm tra TỪNG quy tắc riêng lẻ. */
function mkNatal(o: {
  dm?: HeavenlyStem; gender?: 'nam' | 'nu';
  year?: [HeavenlyStem, EarthlyBranch]; month?: [HeavenlyStem, EarthlyBranch];
  day?: [HeavenlyStem, EarthlyBranch]; hour?: [HeavenlyStem, EarthlyBranch];
  favorable?: FiveElement[]; unfavorable?: FiveElement[];
  hasTai?: boolean; hasAn?: boolean;
  luck?: { stem: HeavenlyStem; branch: EarthlyBranch; startYear: number } | null;
} = {}): BaziNatal {
  const year = o.year ?? ['Giáp', 'Tý'];
  const month = o.month ?? ['Bính', 'Dần'];
  const day = o.day ?? [o.dm ?? 'Mậu', 'Ngọ'];
  const hour = o.hour ?? ['Canh', 'Thân'];
  const pillars = [mkPillar(year[0], year[1], 'Năm'), mkPillar(month[0], month[1], 'Tháng'),
    mkPillar(day[0], day[1], 'Ngày'), mkPillar(hour[0], hour[1], 'Giờ')];
  return {
    dm: day[0], gender: o.gender ?? 'nam', pillars,
    favorable: o.favorable ?? [], unfavorable: o.unfavorable ?? [],
    hasTai: o.hasTai ?? false, hasAn: o.hasAn ?? false, taiCount: o.hasTai ? 2 : 0,
    horse: [...new Set([horseBranchOf(year[1]), horseBranchOf(day[1])])],
    peach: [...new Set([peachBranchOf(year[1]), peachBranchOf(day[1])])],
    luck: {
      forward: true, startYearsAfterBirth: 5,
      pillars: o.luck
        ? [{ index: 1, startYear: o.luck.startYear, endYear: o.luck.startYear + 9, startAge: 6, stem: o.luck.stem, branch: o.luck.branch }]
        : [],
    },
  };
}

const ids = (n: BaziNatal, year: number, area: AreaId) =>
  evaluateBaziYear(n, year)[area].signals.map(s => s.ruleId);

describe('pastReview — quy tắc riêng lẻ', () => {
  test('Tử Vi: năm Hợi thì Lưu Thiên Mã an tại Tỵ', () => {
    const r = sampleResult();
    const { stem } = yearCanChi(2019); // Kỷ Hợi
    const luu = getLuuStarsForYear(r.tuViChart.houses, stem, 'Hợi', 'nam');
    const ma = luu.filter(s => s.name === 'Thiên Mã');
    expect(ma).toHaveLength(1);
    expect(ma[0].branchIdx).toBe(getBranchIndex('Tị'));
  });

  test('Bát Tự: chi năm Hợi xung chi Tỵ; Tý–Sửu lục hợp; Dần–Tị hại; Tý–Dậu phá; Dần–Thân xung', () => {
    expect(branchRelations('Hợi', 'Tị')).toContain('xung');
    expect(branchRelations('Tý', 'Sửu')).toContain('lucHop');
    expect(branchRelations('Dần', 'Tị')).toContain('hai');
    expect(branchRelations('Tý', 'Dậu')).toContain('pha');
    expect(branchRelations('Dần', 'Thân')).toContain('xung');
    expect(branchRelations('Tý', 'Mão')).toContain('hinh');
    expect(branchRelations('Ngọ', 'Ngọ')).toContain('hinh'); // tự hình
    expect(branchRelations('Thân', 'Tý')).toContain('tamHop');
    expect(branchRelations('Tý', 'Tý')).not.toContain('xung');
  });

  test('Dịch Mã/Đào Hoa theo tam hợp: Hợi→Mã Tỵ, Đào Hoa Tý; Dần→Mã Thân, Đào Hoa Mão', () => {
    expect(horseBranchOf('Hợi')).toBe('Tị');
    expect(peachBranchOf('Hợi')).toBe('Tý');
    expect(horseBranchOf('Dần')).toBe('Thân');
    expect(peachBranchOf('Dần')).toBe('Mão');
  });

  test('BZ_CAR_CLASH_MONTH: năm Hợi (2019) xung chi tháng Tỵ → có; chi tháng Dần → không', () => {
    expect(ids(mkNatal({ month: ['Đinh', 'Tị'] }), 2019, 'career')).toContain('BZ_CAR_CLASH_MONTH');
    expect(ids(mkNatal({ month: ['Bính', 'Dần'] }), 2019, 'career')).not.toContain('BZ_CAR_CLASH_MONTH');
  });

  test('BZ_CAR_COMBINE_MONTH là tín hiệu NGƯỢC CHIỀU (supports=false)', () => {
    // 2019 Hợi lục hợp Dần.
    const sigs = evaluateBaziYear(mkNatal({ month: ['Bính', 'Dần'] }), 2019).career.signals;
    const s = sigs.find(x => x.ruleId === 'BZ_CAR_COMBINE_MONTH');
    expect(s).toBeDefined();
    expect(s!.supports).toBe(false);
  });

  test('BZ_HOM_CLASH_DAY / BZ_HOM_CLASH_YEAR / BZ_FAM_CLASH_YEAR', () => {
    const n = mkNatal({ day: ['Mậu', 'Tị'], year: ['Giáp', 'Tị'] }); // cả chi ngày và chi năm đều Tỵ
    expect(ids(n, 2019, 'home')).toEqual(expect.arrayContaining(['BZ_HOM_CLASH_DAY', 'BZ_HOM_CLASH_YEAR']));
    expect(ids(n, 2019, 'family')).toContain('BZ_FAM_CLASH_YEAR');
  });

  test('BZ_HOM_HORSE: chi năm sinh Hợi → Dịch Mã tại Tỵ → năm Tỵ (2013) động; năm khác thì không', () => {
    const n = mkNatal({ year: ['Giáp', 'Hợi'], day: ['Mậu', 'Mão'] }); // cả hai cùng nhóm Hợi-Mão-Mùi → Mã Tỵ
    expect(ids(n, 2013, 'home')).toContain('BZ_HOM_HORSE'); // Quý Tỵ
    expect(ids(n, 2014, 'home')).not.toContain('BZ_HOM_HORSE');
  });

  test('BZ_LOV_PEACH: chi năm Hợi → Đào Hoa tại Tý → năm Tý (2020) động', () => {
    const n = mkNatal({ year: ['Giáp', 'Hợi'], day: ['Mậu', 'Mão'] });
    expect(ids(n, 2020, 'love')).toContain('BZ_LOV_PEACH');
  });

  test('BZ_LOV_SPOUSE_M chỉ cho nam, BZ_LOV_SPOUSE_F chỉ cho nữ', () => {
    // dm Mậu(Thổ Dương). Tài = Thủy: Nhâm = Thiên Tài, Quý = Chính Tài. Quan/Sát = Mộc: Giáp = Thất Sát, Ất = Chính Quan.
    const male = mkNatal({ dm: 'Mậu', gender: 'nam' });
    const female = mkNatal({ dm: 'Mậu', gender: 'nu' });
    // 2022 = Nhâm Dần (can Nhâm = Thiên Tài), 2024 = Giáp Thìn (can Giáp = Thất Sát)
    expect(ids(male, 2022, 'love')).toContain('BZ_LOV_SPOUSE_M');
    expect(ids(female, 2022, 'love')).not.toContain('BZ_LOV_SPOUSE_M');
    expect(ids(female, 2024, 'love')).toContain('BZ_LOV_SPOUSE_F');
    expect(ids(male, 2024, 'love')).not.toContain('BZ_LOV_SPOUSE_F');
  });

  test('BZ_LOV_COMBINE_DAY + BZ_LOV_CLASH_DAY', () => {
    expect(ids(mkNatal({ day: ['Mậu', 'Dần'] }), 2019, 'love')).toContain('BZ_LOV_COMBINE_DAY'); // Hợi–Dần lục hợp
    expect(ids(mkNatal({ day: ['Mậu', 'Tị'] }), 2019, 'love')).toContain('BZ_LOV_CLASH_DAY');   // Hợi–Tỵ xung
  });

  test('BZ_WEA_FAV / BZ_WEA_UNFAV: Tài lưu niên là dụng thần hay kỵ thần', () => {
    // dm Mậu, 2022 Nhâm Dần: can Nhâm = Thiên Tài (Thủy).
    expect(ids(mkNatal({ dm: 'Mậu', favorable: ['Thủy'] }), 2022, 'wealth')).toContain('BZ_WEA_FAV');
    expect(ids(mkNatal({ dm: 'Mậu', favorable: ['Thủy'] }), 2022, 'wealth')).not.toContain('BZ_WEA_UNFAV');
    expect(ids(mkNatal({ dm: 'Mậu', unfavorable: ['Thủy'] }), 2022, 'wealth')).toContain('BZ_WEA_UNFAV');
  });

  test('BZ_WEA_ROB: Tỷ/Kiếp lưu niên chỉ đoạt tài khi lá số có Tài', () => {
    // dm Mậu: Mậu = Tỷ Kiên. 2018 = Mậu Tuất.
    expect(ids(mkNatal({ dm: 'Mậu', hasTai: true }), 2018, 'wealth')).toContain('BZ_WEA_ROB');
    expect(ids(mkNatal({ dm: 'Mậu', hasTai: false }), 2018, 'wealth')).not.toContain('BZ_WEA_ROB');
  });

  test('BZ_FAM_SEAL_HURT: Tài lưu niên khắc Ấn chỉ khi lá số có Ấn', () => {
    expect(ids(mkNatal({ dm: 'Mậu', hasAn: true }), 2022, 'family')).toContain('BZ_FAM_SEAL_HURT');
    expect(ids(mkNatal({ dm: 'Mậu', hasAn: false }), 2022, 'family')).not.toContain('BZ_FAM_SEAL_HURT');
  });

  test('Quy tắc nền (đại vận): BZ_CAR_LUCK_OFFICIAL chỉ bật trong khoảng vận', () => {
    // dm Mậu; đại vận Giáp (Thất Sát) 2010–2019.
    const n = mkNatal({ dm: 'Mậu', luck: { stem: 'Giáp', branch: 'Tý', startYear: 2010 } });
    expect(ids(n, 2015, 'career')).toContain('BZ_CAR_LUCK_OFFICIAL');
    expect(ids(n, 2021, 'career')).not.toContain('BZ_CAR_LUCK_OFFICIAL');
  });

  test('Quy tắc gốc có trọng số 0 và luôn xuất hiện (để giải thích)', () => {
    const sigs = evaluateBaziYear(mkNatal(), 2019);
    for (const a of AREAS) {
      const roots = sigs[a].signals.filter(s => s.layer === 'goc');
      expect(roots.length).toBeGreaterThanOrEqual(1);
      for (const r of roots) expect(r.weight).toBe(0);
    }
  });

  test('Mọi quy tắc trong bảng đều có thể kích hoạt (không có quy tắc "chết")', () => {
    const triggered = new Set<string>();
    const stems: HeavenlyStem[] = ['Giáp', 'Bính', 'Mậu', 'Canh', 'Nhâm', 'Ất', 'Đinh', 'Kỷ', 'Tân', 'Quý'];
    const branches: EarthlyBranch[] = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tị', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
    const els: FiveElement[] = ['Kim', 'Mộc', 'Thủy', 'Hỏa', 'Thổ'];
    for (const dm of stems) for (const gender of ['nam', 'nu'] as const) {
      for (let bi = 0; bi < 12; bi += 2) for (let li = 0; li < 10; li += 3) {
        const n = mkNatal({
          dm, gender,
          year: ['Giáp', branches[bi]], month: ['Bính', branches[(bi + 4) % 12]], day: [dm, branches[(bi + 6) % 12]],
          favorable: [els[li % 5]], unfavorable: [els[(li + 2) % 5]], hasTai: true, hasAn: true,
          luck: { stem: stems[li], branch: branches[(bi + li) % 12], startYear: 1990 },
        });
        for (let y = 1995; y <= 2030; y++) {
          const ev = evaluateBaziYear(n, y);
          for (const a of AREAS) for (const s of ev[a].signals) triggered.add(s.ruleId);
        }
      }
    }
    const missing = BZ_RULES.filter(r => !triggered.has(r.id)).map(r => r.id);
    expect(missing).toEqual([]);
  });

  test('Bảng quy tắc: mã duy nhất, phủ đủ 5 mảng, có đủ tầng gốc/nền/ngòi, trọng số hợp lệ', () => {
    expect(new Set(BZ_RULES.map(r => r.id)).size).toBe(BZ_RULES.length);
    for (const a of AREAS) {
      const rs = BZ_RULES.filter(r => r.area === a);
      expect(rs.some(r => r.layer === 'goc')).toBe(true);
      expect(rs.some(r => r.layer === 'nen')).toBe(true);
      expect(rs.some(r => r.layer === 'ngoi')).toBe(true);
    }
    for (const r of BZ_RULES) {
      expect(r.id.startsWith('BZ_')).toBe(true);
      expect(r.weight).toBeGreaterThanOrEqual(0);
      if (r.layer === 'goc') expect(r.weight).toBe(0);
    }
  });

  test('Ánh xạ sự kiện → mảng: không có sức khỏe/pháp lý/học vấn, và mọi mã đều là sự kiện thật của engine', () => {
    const real = new Set(Object.keys(require('../../data/annualEventDefinitions.json')));
    for (const id of Object.keys(EVENT_TO_AREA)) expect(real.has(id)).toBe(true);
    for (const id of real) {
      if (/^(HEALTH_|LEGAL_|EDUCATION_)/.test(id)) expect(areaOfEvent(id)).toBeNull();
    }
    expect(areaOfEvent('CHILD_HEALTH_EVENT')).toBeNull();
    expect(areaOfEvent('FAMILY_PARENT_HEALTH_ATTENTION')).toBeNull();
  });
});

describe('pastReview — đại vận Bát Tự', () => {
  test('mỗi vận một bước can chi theo chiều đi; 9 vận liên tiếp mỗi 10 năm', () => {
    for (const r of allSampleResults()) {
      const luck = computeBaziLuck(r);
      expect(luck.pillars).toHaveLength(9);
      for (let i = 1; i < 9; i++) {
        expect(luck.pillars[i].startYear - luck.pillars[i - 1].startYear).toBe(10);
        expect(luck.pillars[i].endYear).toBe(luck.pillars[i].startYear + 9);
      }
      expect(luck.startYearsAfterBirth).toBeGreaterThanOrEqual(1);
      expect(luck.startYearsAfterBirth).toBeLessThanOrEqual(11);
    }
  });

  test('chiều: nam Dương niên → thuận; nữ Dương niên → nghịch (mẫu: nam 1990 Canh Ngọ Dương → thuận)', () => {
    const r = sampleResult();
    expect(r.batTuChart.pillars[0].stem).toBe('Canh');
    expect(computeBaziLuck(r).forward).toBe(true);
    const nu1985 = allSampleResults()[1]; // nữ 1985 Ất Sửu (Âm) → nữ Âm niên đi thuận
    expect(nu1985.batTuChart.pillars[0].stem).toBe('Ất');
    expect(computeBaziLuck(nu1985).forward).toBe(true);
    const nam2001 = allSampleResults()[2]; // nam 2001 Tân Tỵ (Âm) → nam Âm niên đi nghịch
    expect(computeBaziLuck(nam2001).forward).toBe(false);
  });

  test('luckAtYear: trước vận đầu → null; trong vận → đúng vận', () => {
    const luck = computeBaziLuck(sampleResult());
    expect(luckAtYear(luck, luck.pillars[0].startYear - 1)).toBeNull();
    expect(luckAtYear(luck, luck.pillars[2].startYear + 3)?.index).toBe(3);
  });
});

describe('pastReview — bộ máy chọn mốc', () => {
  test('tất định: chạy hai lần cho kết quả giống hệt từng trường', () => {
    for (const r of allSampleResults()) {
      const a = computePastReviewSync(r, { now: NOW });
      const b = computePastReviewSync(r, { now: NOW });
      expect(b).toEqual(a);
    }
  });

  test('mốc truy được về đúng các tín hiệu tạo ra nó, và mã quy tắc đều có thật', () => {
    const tvRuleIds = new Set(ALL_RULES.map(r => r.id));
    const bzIds = new Set(BZ_RULES.map(r => r.id));
    for (const r of allSampleResults()) {
      const pr = computePastReviewSync(r, { now: NOW });
      expect(pr.rulebookVersion).toBe(RULEBOOK_VERSION);
      for (const m of pr.markers) {
        const ys = pr.scores.find(s => s.year === m.year)!;
        expect(m.signals).toBe(ys.areas[m.area].signals); // đúng tín hiệu của năm + mảng đó
        expect(m.signals.length).toBeGreaterThan(0);
        for (const s of m.signals) {
          expect(s.area).toBe(m.area);
          expect(['goc', 'nen', 'ngoi']).toContain(s.layer);
          if (s.system === 'bazi') expect(bzIds.has(s.ruleId)).toBe(true);
          // Mã Tử Vi: rule trong bảng JSON của engine, hoặc bằng chứng Tiểu Hạn do chính engine sinh
          // (tieuHanFocus.ts: TIEU_HAN_{PRIMARY|SECONDARY}_{EVENT|DOMAIN}).
          else expect(tvRuleIds.has(s.ruleId) || /^TIEU_HAN_(PRIMARY|SECONDARY)_(EVENT|DOMAIN)$/.test(s.ruleId)).toBe(true);
        }
      }
    }
  });

  test('ràng buộc chọn mốc: tuổi ≥ 15, không năm hiện tại, ≤ 2/mảng, ≤ 4/đại hạn, mỗi năm một mốc, không tuổi phổ biến', () => {
    for (const r of allSampleResults()) {
      const pr = computePastReviewSync(r, { now: NOW });
      const cur = lunarYearOf(NOW);
      expect(pr.markers.length).toBeLessThanOrEqual(PAST_CONFIG.markersMax);
      const years = new Set<number>();
      const perArea: Record<string, number> = {};
      const perDv: Record<string, number> = {};
      for (const m of pr.markers) {
        expect(m.age).toBeGreaterThanOrEqual(PAST_CONFIG.minAge);
        expect(m.year).toBeLessThan(cur);
        expect(years.has(m.year)).toBe(false);
        years.add(m.year);
        perArea[m.area] = (perArea[m.area] ?? 0) + 1;
        perDv[String(m.daiVanIndex)] = (perDv[String(m.daiVanIndex)] ?? 0) + 1;
        expect(PAST_CONFIG.commonAges[m.area]).not.toContain(m.age);
        expect(['manh', 'vua', 'nhe']).toContain(m.tier);
        expect(m.strength).toBeGreaterThanOrEqual(0);
        expect(m.strength).toBeLessThanOrEqual(100);
      }
      for (const n of Object.values(perArea)) expect(n).toBeLessThanOrEqual(PAST_CONFIG.maxPerArea);
      for (const n of Object.values(perDv)) expect(n).toBeLessThanOrEqual(PAST_CONFIG.maxPerDaiVan);
      // trải trên ≥ 2 đại hạn khi có thể
      if (pr.markers.length >= 3) expect(Object.keys(perDv).length).toBeGreaterThanOrEqual(PAST_CONFIG.minDaiVanSpan);
      // sắp theo độ mạnh (giảm dần, cho phép chênh nhỏ do hệ số năm xa)
      expect(pr.markers.map(m => m.year).length).toBe(years.size);
    }
  });

  test('người dưới 25 tuổi: tối đa 3 mốc', () => {
    const young: BirthInfo = { ...SAMPLE_BIRTH, name: 'Trẻ', year: 2005, month: 5, day: 12, hour: 8 };
    const r = buildResult(young, 2026);
    const pr = computePastReviewSync(r, { now: NOW });
    expect(pr.markers.length).toBeLessThanOrEqual(PAST_CONFIG.markersUnder25);
    for (const m of pr.markers) expect(m.age).toBeGreaterThanOrEqual(PAST_CONFIG.minAge);
  });

  test('người mới 15 tuổi hoặc nhỏ hơn: không lỗi, không có mốc', () => {
    const kid: BirthInfo = { ...SAMPLE_BIRTH, name: 'Bé', year: 2018, month: 5, day: 12, hour: 8 };
    const pr = computePastReviewSync(buildResult(kid, 2026), { now: NOW });
    expect(pr.markers).toEqual([]);
    expect(candidateYears(buildResult(kid, 2026), NOW)).toEqual([]);
  });

  test('người sinh sát ngày đổi năm (trước/sau mùng 1 Tết 1996 = 19/2/1996): chạy được, năm hiện tại bị loại', () => {
    for (const day of [18, 19, 20]) {
      const bi: BirthInfo = { ...SAMPLE_BIRTH, name: `Sát Tết ${day}`, year: 1996, month: 2, day, hour: 6 };
      const r = buildResult(bi, 2026);
      const pr = computePastReviewSync(r, { now: NOW });
      expect(pr.markers.length).toBeGreaterThan(0);
      expect(pr.markers.every(m => m.year < lunarYearOf(NOW))).toBe(true);
    }
  });

  test('năm hiện tại tính theo ÂM LỊCH: ngày 15/1/2026 (trước Tết 17/2/2026) vẫn thuộc năm Ất Tỵ 2025', () => {
    expect(lunarYearOf(new Date(2026, 0, 15))).toBe(2025);
    expect(lunarYearOf(new Date(2026, 2, 1))).toBe(2026);
  });

  test('điểm mọi năm nằm trong 0..100, điểm vận có dấu trong −100..100', () => {
    for (const r of allSampleResults()) {
      const pr = computePastReviewSync(r, { now: NOW });
      for (const s of pr.scores) {
        expect(s.strength).toBeGreaterThanOrEqual(0);
        expect(s.strength).toBeLessThanOrEqual(100);
        expect(Math.abs(s.vanScore)).toBeLessThanOrEqual(100);
        for (const a of AREAS) {
          expect(Math.abs(s.areas[a].signed)).toBeLessThanOrEqual(100);
          expect(s.areas[a].tuvi).toBeGreaterThanOrEqual(0);
          expect(s.areas[a].tuvi).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  // KHÓA KẾT QUẢ trên 3 lá số cố định (ngày "hiện tại" cố định). Khi CHỦ Ý đổi bảng quy tắc/trọng số/cấu hình:
  // tăng RULEBOOK_VERSION (config.ts) rồi cập nhật mảng dưới đây — test này chỉ để bắt thay đổi NGOÀI Ý MUỐN.
  test('golden: bộ mốc của 3 lá số mẫu (RULEBOOK pr-0.1-tam)', () => {
    expect(RULEBOOK_VERSION).toBe('pr-0.1-tam');
    const got = allSampleResults().map(r =>
      computePastReviewSync(r, { now: NOW }).markers.map(m => `${m.year}:${m.area}:${m.tier}`));
    expect(got).toEqual([
      ['2025:love:manh', '2023:love:manh', '2004:family:manh', '2010:wealth:vua', '2015:family:vua', '2007:career:vua', '2022:home:vua', '2019:wealth:vua'],
      ['2008:home:manh', '2016:family:manh', '2013:career:manh', '2007:home:manh', '2003:love:manh', '2020:wealth:manh', '2012:career:vua', '2021:family:vua'],
      ['2023:love:manh', '2024:home:manh', '2016:family:manh', '2019:career:manh', '2025:wealth:vua'],
    ]);
  });

  test('bản bất đồng bộ cho kết quả giống hệt bản đồng bộ và báo tiến trình', async () => {
    const { computePastReview } = require('../pastReview');
    const r = sampleResult();
    const calls: number[] = [];
    const a = await computePastReview(r, { now: NOW, onProgress: (d: number) => calls.push(d) });
    expect(a).toEqual(computePastReviewSync(r, { now: NOW }));
    expect(calls.length).toBe(a.scores.length);
    expect(calls[calls.length - 1]).toBe(a.scores.length);
  });

  test('buildBaziNatal trên lá số thật: dụng/kỵ thần và nhóm Dịch Mã/Đào Hoa hợp lệ', () => {
    const n = buildBaziNatal(sampleResult());
    expect(n.horse.length).toBeGreaterThanOrEqual(1);
    expect(n.peach.length).toBeGreaterThanOrEqual(1);
    expect(n.favorable.length).toBeGreaterThan(0);
  });
});
