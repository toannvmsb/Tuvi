import {
  knowledgeBase, getRule, rulesByType, rulesByCategory, rulesByPriority,
  cachCucRuleId, starRuleId, RULE_KB_VERSION,
} from '../knowledgeBase';
import { CACH_CUC } from '../../data/cachCuc';

describe('Knowledge Base / Rule Loader (Phase 2)', () => {
  const kb = knowledgeBase();

  it('nạp đủ rule cách cục + sao, ruleId DUY NHẤT', () => {
    const cachRules = rulesByType('cach_cuc');
    expect(cachRules.length).toBe(CACH_CUC.length);
    const ids = kb.rules.map(r => r.ruleId);
    expect(new Set(ids).size).toBe(ids.length); // không trùng id
  });

  it('mỗi rule có version + source + priority', () => {
    for (const r of kb.rules) {
      expect(r.version).toBe(RULE_KB_VERSION);
      expect(r.source.length).toBeGreaterThan(0);
      expect(r.priority).toBeGreaterThanOrEqual(0);
      expect(r.priority).toBeLessThanOrEqual(100);
    }
  });

  it('ruleId cách cục có prefix CC., sao có prefix ST.', () => {
    const id = cachCucRuleId('Tử Phủ Vũ Tướng');
    expect(id).toBeDefined();
    expect(id!.startsWith('CC.')).toBe(true);
    expect(getRule(id!)!.name).toBe('Tử Phủ Vũ Tướng');

    const sid = starRuleId('Tử Vi');
    expect(sid).toBeDefined();
    expect(sid!.startsWith('ST.')).toBe(true);
  });

  it('slug loại bỏ dấu tiếng Việt', () => {
    expect(cachCucRuleId('Tử Phủ Vũ Tướng')).toBe('CC.tu-phu-vu-tuong');
  });

  it('rulesByCategory + rulesByPriority hoạt động', () => {
    const chinh = rulesByCategory('chinh');
    expect(chinh.length).toBeGreaterThan(0);
    expect(chinh.every(r => r.category === 'chinh')).toBe(true);

    const sorted = rulesByPriority('cach_cuc');
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1].priority).toBeGreaterThanOrEqual(sorted[i].priority);
    }
  });

  it('rule không tồn tại → undefined', () => {
    expect(getRule('CC.khong-ton-tai')).toBeUndefined();
    expect(cachCucRuleId('Cách không có thật')).toBeUndefined();
  });
});
