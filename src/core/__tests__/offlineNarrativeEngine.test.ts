import { OfflineNarrativeEngine, composeNatalNarrative, generateNatalNarrativeV2 } from '../offlineNarrativeEngine';
import { analyzeNatal } from '../natalAnalysisService';
import { sampleResult, allSampleResults } from './fixtures';

describe('OfflineNarrativeEngine (Phase 13)', () => {
  it('dedup: cùng key chỉ giữ 1 (bản priority cao)', () => {
    const eng = new OfflineNarrativeEngine();
    eng.add({ key: 'k1', section: 'meta', text: 'thấp', priority: 1 });
    eng.add({ key: 'k1', section: 'meta', text: 'cao', priority: 5 });
    const frags = eng.fragments();
    expect(frags).toHaveLength(1);
    expect(frags[0].text).toBe('cao');
  });

  it('A/B wording ổn định theo seed', () => {
    const variants = ['A', 'B', 'C'];
    expect(new OfflineNarrativeEngine(0).pick(variants)).toBe('A');
    expect(new OfflineNarrativeEngine(1).pick(variants)).toBe('B');
    expect(new OfflineNarrativeEngine(4).pick(variants)).toBe('B'); // 4 % 3 = 1
    // Cùng seed → luôn cùng kết quả
    expect(new OfflineNarrativeEngine(2).pick(variants)).toBe(new OfflineNarrativeEngine(2).pick(variants));
  });

  it('render sắp theo thứ tự section', () => {
    const eng = new OfflineNarrativeEngine();
    eng.add({ key: 'w', section: 'weakness', text: 'yếu', priority: 1 });
    eng.add({ key: 'i', section: 'identity', text: 'gốc', priority: 1 });
    const md = eng.render();
    expect(md.indexOf('gốc')).toBeLessThan(md.indexOf('yếu'));
  });

  it('cite=true gắn [rule:id]', () => {
    const eng = new OfflineNarrativeEngine();
    eng.add({ key: 'k', section: 'meta', text: 'cách', priority: 1, knowledgeId: 'CC.abc' });
    expect(eng.render({ cite: true })).toContain('[rule:CC.abc]');
    expect(eng.render({ cite: false })).not.toContain('rule:');
  });

  it('composeNatalNarrative sinh fragments từ facts thật', () => {
    const natal = analyzeNatal(sampleResult());
    const eng = composeNatalNarrative(natal, 0);
    expect(eng.fragments().length).toBeGreaterThan(0);
    expect(eng.render()).toContain('Bản chất');
  });

  it('generateNatalNarrativeV2 chạy trên cả 3 lá số, deterministic', () => {
    for (const r of allSampleResults()) {
      const a = generateNatalNarrativeV2(r);
      const b = generateNatalNarrativeV2(r);
      expect(a).toBe(b); // cùng lá số → cùng output (A/B ổn định)
      expect(a).toContain('Bản chất');
    }
  });

  it('không lộ ngôn ngữ kỹ thuật (offline V2, Meta-pattern, rule:CC) trong bản mặc định', () => {
    const md = generateNatalNarrativeV2(allSampleResults()[0]);
    expect(md).not.toContain('offline V2');
    expect(md).not.toContain('Meta-pattern');
    expect(md).not.toContain('[rule:');
  });
});
