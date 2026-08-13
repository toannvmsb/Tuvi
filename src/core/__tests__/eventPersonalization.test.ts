import { personalizeEvent } from '../eventPersonalization';
import { sampleResult } from './fixtures';

const sampleChart = sampleResult();

describe('eventPersonalization', () => {
  it('trả null khi chưa có lá số', () => {
    expect(personalizeEvent(null, 'Hỏa', new Date(2026, 4, 5))).toBeNull();
  });

  it('trả đủ các trường khi có lá số', () => {
    const advice = personalizeEvent(sampleChart, 'Hỏa', new Date(2026, 4, 5));
    expect(advice).not.toBeNull();
    expect(advice!.dayScore).toBeDefined();
    expect(Array.isArray(advice!.goodHours)).toBe(true);
    expect(Array.isArray(advice!.badHours)).toBe(true);
    expect(typeof advice!.luckyColor).toBe('string');
    expect(typeof advice!.luckyDirection).toBe('string');
    expect(advice!.elementNote.length).toBeGreaterThan(0);
  });

  it('elementNote nêu đúng hành của sự kiện', () => {
    const advice = personalizeEvent(sampleChart, 'Thủy', new Date(2026, 0, 20));
    expect(advice!.elementNote).toContain('Thủy');
  });
});
