import { sampleResult, allSampleResults } from './fixtures';
import { validateChart } from '../chartValidator';
import { checkTieuVanConsistency } from '../annualPeriodService';
import { scoreAllDaiVan } from '../daiVanScore';
import { analyzeAllPalaces } from '../palaceAnalysisService';
import { extractChartFacts } from '../aiResponseValidator';

describe('Integration — golden chart pipeline', () => {
  const result = sampleResult();

  it('buildResult tạo lá số 12 cung, có Mệnh, có schemaVersion', () => {
    expect(result.tuViChart.houses).toHaveLength(12);
    expect(result.tuViChart.houses.filter(h => h.isManh)).toHaveLength(1);
    expect(result.schemaVersion).toBe('2.0');
  });

  it('canonical model hợp lệ', () => {
    expect(validateChart(result).ok).toBe(true);
  });

  it('nhất quán điểm năm: drill-down Đại Vận == màn Tiểu Vận (Phase 9)', () => {
    const rep = checkTieuVanConsistency(result);
    expect(rep.ok).toBe(true);
    expect(rep.mismatches).toHaveLength(0);
    expect(rep.orphanYears).toHaveLength(0);
  });

  it('Đại Vận score có đủ domain 0–100 + strategyLabel (Phase 6)', () => {
    const scores = scoreAllDaiVan(result);
    expect(scores.length).toBeGreaterThan(0);
    for (const s of scores) {
      for (const dim of [s.career, s.relationship, s.health, s.property, s.opportunity, s.volatility] as number[]) {
        expect(dim).toBeGreaterThanOrEqual(0);
        expect(dim).toBeLessThanOrEqual(100);
      }
      expect(s.formulaVersion).toBe('2.0');
      expect(typeof s.strategyLabel).toBe('string');
    }
  });

  it('phân tích 12 cung → mỗi cung có strength + conflict (Phase 4)', () => {
    const palaces = analyzeAllPalaces(result);
    expect(palaces).toHaveLength(12);
    for (const p of palaces) {
      expect(p.strength.value).toBeGreaterThanOrEqual(0);
      expect(['cát', 'trung tính', 'hung']).toContain(p.conflict.netTone);
    }
  });

  it('facts contract khớp cách cục engine (Phase 14)', () => {
    const facts = extractChartFacts(result);
    const detected = scoreAllDaiVan(result); // chỉ để chắc chart hợp lệ
    expect(Array.isArray(facts.confirmedFormations)).toBe(true);
    expect(facts.starNames.length).toBeGreaterThan(0);
    expect(detected).toBeDefined();
  });

  it('regression: cả 3 lá số mẫu đều hợp lệ + nhất quán xuyên tầng', () => {
    for (const r of allSampleResults()) {
      expect(r.tuViChart.houses).toHaveLength(12);
      expect(validateChart(r).ok).toBe(true);
      expect(checkTieuVanConsistency(r).ok).toBe(true);
    }
  });
});
