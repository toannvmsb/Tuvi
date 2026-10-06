import type { EarthlyBranch, HeavenlyStem, Pillar } from '../../types';
import { truePillars, withTruePillars } from '../pastReview/bazi/truePillars';
import { assessDayMasterStrength, elementsFor, STRENGTH_WEIGHTS } from '../pastReview/bazi/strength';
import { HIDDEN_STEMS, STEM_ELEMENT } from '../pastReview/bazi/tables';
import { buildBaziNatal } from '../pastReview/bazi/engine';
import { computeBaziLuck } from '../pastReview/bazi/luck';
import { BAZI_BASIS } from '../pastReview/config';
import { allSampleResults } from './fixtures';

const P = (stem: HeavenlyStem, branch: EarthlyBranch, label: string): Pillar =>
  ({ stem, branch, hiddenStems: [...HIDDEN_STEMS[branch]], element: STEM_ELEMENT[stem], label });
const date = (y: number, m: number, d: number) => new Date(y, m - 1, d);

describe('Bát Tự đúng phép — trụ năm/tháng theo tiết khí', () => {
  test('trụ năm đổi ở Lập Xuân, không ở mùng 1 Tết / 1 tháng 1', () => {
    // Lập Xuân 2000 rơi ngày 4/2.
    expect(truePillars(date(2000, 2, 4))).toMatchObject({ baziYear: 2000, yearStem: 'Canh', yearBranch: 'Thìn' });
    expect(truePillars(date(2000, 2, 3))).toMatchObject({ baziYear: 1999, yearStem: 'Kỷ', yearBranch: 'Mão' });
    expect(truePillars(date(2000, 1, 20))).toMatchObject({ baziYear: 1999 });
  });

  test('trụ tháng: Ngũ Hổ Độn + đổi ở tiết (Kỷ niên: tháng Dần Bính Dần, tháng Sửu Đinh Sửu)', () => {
    expect(truePillars(date(2000, 2, 3))).toMatchObject({ monthStem: 'Đinh', monthBranch: 'Sửu' });   // Kỷ Mão niên, tháng Sửu
    expect(truePillars(date(2000, 2, 4))).toMatchObject({ monthStem: 'Mậu', monthBranch: 'Dần' });   // Canh Thìn niên, tháng Dần = Mậu Dần
    expect(truePillars(date(1990, 6, 15))).toMatchObject({ monthStem: 'Nhâm', monthBranch: 'Ngọ' }); // Canh Ngọ niên, sau Mang Chủng 6/6
    expect(truePillars(date(1990, 7, 10))).toMatchObject({ monthStem: 'Quý', monthBranch: 'Mùi' });  // Canh niên: Mậu Dần, Kỷ Mão, Canh Thìn, Tân Tị, Nhâm Ngọ, Quý Mùi — sau Tiểu Thử 7/7 (app theo tháng âm còn là tháng 5 = Ngọ)
    expect(truePillars(date(1990, 12, 25))).toMatchObject({ monthBranch: 'Tý' });                    // sau Đại Tuyết 7/12
    expect(truePillars(date(1991, 1, 10))).toMatchObject({ baziYear: 1990, monthBranch: 'Sửu' });    // sau Tiểu Hàn 5/1
  });

  test('chuỗi tháng trong một năm Bát Tự đi đủ 12 chi liên tiếp Dần → Sửu', () => {
    const seen: string[] = [];
    for (let m = 0; m < 366; m += 1) {
      const d = new Date(2001, 1, 4 + m);
      if (d.getFullYear() > 2002 || (d.getFullYear() === 2002 && d.getMonth() > 1)) break;
      const b = truePillars(d).monthBranch;
      if (seen[seen.length - 1] !== b) seen.push(b);
    }
    expect(seen.slice(0, 12)).toEqual(['Dần', 'Mão', 'Thìn', 'Tị', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi', 'Tý', 'Sửu']);
  });

  test('withTruePillars chỉ thay trụ năm + tháng, giữ nguyên trụ ngày/giờ', () => {
    const r = allSampleResults()[0];
    const [y, m, d, h] = withTruePillars(r.batTuChart.pillars, date(1990, 7, 10));
    expect(m.branch).toBe('Mùi');
    expect(d).toBe(r.batTuChart.pillars[2]);
    expect(h).toBe(r.batTuChart.pillars[3]);
    expect(y.label).toBe('Năm');
  });

  test('cấu hình mặc định dùng tiết khí và đại vận khởi từ trụ tháng tiết khí', () => {
    expect(BAZI_BASIS).toBe('tiet');
    for (const r of allSampleResults()) {
      const natal = buildBaziNatal(r);
      expect(natal.basis).toBe('tiet');
      const luck = computeBaziLuck(r, { yearStem: natal.pillars[0].stem, monthStem: natal.pillars[1].stem, monthBranch: natal.pillars[1].branch });
      expect(natal.luck.pillars.map(p => `${p.stem}${p.branch}`)).toEqual(luck.pillars.map(p => `${p.stem}${p.branch}`));
    }
  });
});

describe('Thân vượng / nhược và dụng kỵ thần (phù ức)', () => {
  test('tổng trọng số vị trí = 100', () => {
    const W = STRENGTH_WEIGHTS;
    expect(W.monthBranch + W.monthStem + W.hourStem + W.dayBranch + W.yearStem + W.yearBranch + W.hourBranch).toBe(100);
  });

  test('Giáp mộc sinh tháng Dần (đắc lệnh), có Ấn Thủy và Tỷ Kiếp → thân VƯỢNG', () => {
    const s = assessDayMasterStrength('Giáp', [P('Nhâm', 'Tý', 'Năm'), P('Giáp', 'Dần', 'Tháng'), P('Giáp', 'Tý', 'Ngày'), P('Ất', 'Hợi', 'Giờ')]);
    expect(s.verdict).toBe('vuong');
    expect(s.dacLenh).toBe(true);
    expect(s.score).toBeGreaterThan(70);
    expect(s.favorable.sort()).toEqual(['Hỏa', 'Kim', 'Thổ']);   // tiết (Hỏa), tài (Thổ), quan sát (Kim)
    expect(s.unfavorable.sort()).toEqual(['Mộc', 'Thủy']);       // tỷ kiếp (Mộc), ấn (Thủy)
  });

  test('Giáp mộc sinh tháng Thân (thất lệnh), bị Kim Thổ vây → thân NHƯỢC; dụng Ấn Tỷ, kỵ Thực Tài Quan', () => {
    const s = assessDayMasterStrength('Giáp', [P('Canh', 'Thân', 'Năm'), P('Mậu', 'Thân', 'Tháng'), P('Giáp', 'Ngọ', 'Ngày'), P('Mậu', 'Thìn', 'Giờ')]);
    expect(s.verdict).toBe('nhuoc');
    expect(s.dacLenh).toBe(false);
    expect(s.favorable.sort()).toEqual(['Mộc', 'Thủy']);
    expect(s.unfavorable.sort()).toEqual(['Hỏa', 'Kim', 'Thổ']);
  });

  test('tháng lệnh quyết định: cùng bố cục, đổi chi tháng từ Thân (có Ấn Nhâm tàng) sang Dần (bản khí Giáp) làm điểm tăng', () => {
    const base = [P('Canh', 'Thân', 'Năm'), P('Mậu', 'Thân', 'Tháng'), P('Giáp', 'Ngọ', 'Ngày'), P('Mậu', 'Thìn', 'Giờ')];
    const lenh = [base[0], P('Mậu', 'Dần', 'Tháng'), base[2], base[3]];
    expect(assessDayMasterStrength('Giáp', lenh).score - assessDayMasterStrength('Giáp', base).score).toBeGreaterThan(10);
  });

  test('bất biến: dụng và kỵ không giao nhau, đủ 5 hành; vượng ⇔ điểm ≥ ngưỡng', () => {
    for (const dm of ['Giáp', 'Bính', 'Mậu', 'Canh', 'Nhâm', 'Ất', 'Đinh', 'Kỷ', 'Tân', 'Quý'] as HeavenlyStem[]) {
      for (const strong of [true, false]) {
        const e = elementsFor(dm, strong);
        expect(e.favorable.filter(x => e.unfavorable.includes(x))).toEqual([]);
        expect(e.favorable.length + e.unfavorable.length).toBe(5);
        // Nhật Chủ cùng phe với Ấn/Tỷ: nhược thì dụng gồm chính hành Nhật Chủ
        expect(e.favorable.includes(STEM_ELEMENT[dm]) || e.unfavorable.includes(STEM_ELEMENT[dm])).toBe(true);
        expect(e.favorable.includes(STEM_ELEMENT[dm])).toBe(!strong);
      }
    }
    for (const r of allSampleResults()) {
      const s = buildBaziNatal(r).strength;
      expect(s.verdict === 'vuong').toBe(s.score >= STRENGTH_WEIGHTS.strongAt);
      expect(s.score).toBeGreaterThanOrEqual(0);
      expect(s.score).toBeLessThanOrEqual(100.0001);
    }
  });
});
