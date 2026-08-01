import { buildFinancialAdvice } from '../financialAdvisor';
import { allSampleResults } from './fixtures';

/**
 * Sanity cho box "Gợi ý Tài chính - Đầu tư": không crash trên mọi lá số mẫu,
 * luôn có đúng 1 gợi ý cho MỖI kỳ (ngày/tháng), ổn định trong cùng kỳ
 * (không đổi khi gọi lại với cùng ngày) và đổi periodKey khi sang ngày khác.
 */
describe('buildFinancialAdvice', () => {
  it('trả về đủ 2 kỳ, mỗi kỳ 1 câu gợi ý, cho mọi lá số mẫu', () => {
    const now = new Date();
    for (const result of allSampleResults()) {
      const bundle = buildFinancialAdvice(result, now);
      expect(bundle.day.text.length).toBeGreaterThan(0);
      expect(bundle.month?.text.length ?? 0).toBeGreaterThan(0);
      expect(['good', 'neutral', 'caution']).toContain(bundle.day.tier);
    }
  });

  it('ổn định trong cùng ngày (gọi lại không đổi), đổi periodKey khi sang ngày khác', () => {
    const [result] = allSampleResults();
    const d1 = new Date(2026, 5, 15);
    const d1b = new Date(2026, 5, 15, 23, 0);
    const d2 = new Date(2026, 5, 16);

    const a = buildFinancialAdvice(result, d1);
    const b = buildFinancialAdvice(result, d1b);
    const c = buildFinancialAdvice(result, d2);

    expect(a.day.text).toBe(b.day.text);
    expect(a.day.periodKey).toBe(b.day.periodKey);
    expect(a.day.periodKey).not.toBe(c.day.periodKey);
  });
});
