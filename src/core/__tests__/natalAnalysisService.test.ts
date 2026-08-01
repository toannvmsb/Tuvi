import { analyzeNatal, natalFactsBlock } from '../natalAnalysisService';
import { allSampleResults, sampleResult } from './fixtures';

describe('Natal Analysis Service (Phase 7)', () => {
  const result = sampleResult();

  it('tổng hợp identity + 12 cung + meta-pattern', () => {
    const n = analyzeNatal(result);
    expect(n.palaces).toHaveLength(12);
    expect(n.identity.menhBranch).toBeTruthy();
    expect(n.metaPattern.tongDanh).toBeTruthy();
    expect(n.formulaVersion).toBe('2.0');
  });

  it('lực tổng thể 0–100, sắc thái hợp lệ, confidence 40–95', () => {
    const n = analyzeNatal(result);
    expect(n.overallStrength).toBeGreaterThanOrEqual(0);
    expect(n.overallStrength).toBeLessThanOrEqual(100);
    expect(['cát', 'trung tính', 'hung']).toContain(n.overallTone);
    expect(n.confidence).toBeGreaterThanOrEqual(40);
    expect(n.confidence).toBeLessThanOrEqual(95);
  });

  it('topFormations có ruleId truy vết (Phase 2 link)', () => {
    const n = analyzeNatal(result);
    for (const t of n.topFormations) {
      expect(t.ruleId?.startsWith('CC.')).toBe(true);
      expect(['chủ', 'phụ', 'hung']).toContain(t.rank);
    }
  });

  it('consistency check chạy trên cả 3 lá số, luôn trả issues[] (không throw)', () => {
    for (const r of allSampleResults()) {
      const n = analyzeNatal(r);
      expect(Array.isArray(n.consistency.issues)).toBe(true);
      expect(typeof n.consistency.ok).toBe('boolean');
      // ok === (không có issue)
      expect(n.consistency.ok).toBe(n.consistency.issues.length === 0);
    }
  });

  it('natalFactsBlock sinh block text có nhãn DỮ KIỆN LÁ SỐ + 24 cách', () => {
    const block = natalFactsBlock(result);
    expect(block).toContain('DỮ KIỆN LÁ SỐ');
    expect(block).toContain('Tổng danh');
    expect(block).toContain('24 CÁCH CỤC ẢNH HƯỞNG LỚN NHẤT');
  });
});
