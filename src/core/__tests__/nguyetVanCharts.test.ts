import { buildNguyetVanCharts } from '../nguyetVanCharts';
import { allSampleResults, sampleResult } from './fixtures';

describe('Nguyệt Vận Charts (mục 5 — Logic Nguyệt Vận v2.0)', () => {
  it('trả về đủ 3 khối dữ liệu cho các tháng 1..12 trên cả 3 lá số mẫu', () => {
    for (const result of allSampleResults()) {
      for (let m = 1; m <= 12; m++) {
        const data = buildNguyetVanCharts(result, 1, m);
        expect(data).not.toBeNull();
        if (!data) continue;
        expect(data.totalDays).toBeGreaterThanOrEqual(29);
        expect(data.totalDays).toBeLessThanOrEqual(30);
        expect(data.days).toHaveLength(data.totalDays);
        expect(data.weeks).toHaveLength(4);
        expect(data.radar).toHaveLength(8);
      }
    }
  });

  it('4 tuần cộng lại đúng bằng tổng số ngày trong tháng, không trùng/không hở', () => {
    const result = sampleResult();
    for (let m = 1; m <= 12; m++) {
      const data = buildNguyetVanCharts(result, 1, m)!;
      const totalFromWeeks = data.weeks.reduce((s, w) => s + (w.toDay - w.fromDay + 1), 0);
      expect(totalFromWeeks).toBe(data.totalDays);
      expect(data.weeks[0].fromDay).toBe(1);
      expect(data.weeks[3].toDay).toBe(data.totalDays);
      // liên tục, không hở/không đè
      for (let i = 1; i < 4; i++) {
        expect(data.weeks[i].fromDay).toBe(data.weeks[i - 1].toDay + 1);
      }
    }
  });

  it('wealth/challenge/opportunity mỗi tuần nằm trong [0,100]', () => {
    const result = sampleResult();
    const data = buildNguyetVanCharts(result, 1, 6)!;
    for (const w of data.weeks) {
      expect(w.wealth).toBeGreaterThanOrEqual(0);
      expect(w.wealth).toBeLessThanOrEqual(100);
      expect(w.challenge).toBeGreaterThanOrEqual(0);
      expect(w.challenge).toBeLessThanOrEqual(100);
      expect(w.opportunity).toBeGreaterThanOrEqual(0);
      expect(w.opportunity).toBeLessThanOrEqual(100);
    }
  });

  it('mỗi ngày có score 0–100 và tone hợp lệ, ngày liên tiếp không trùng lunarDay', () => {
    const result = sampleResult();
    const data = buildNguyetVanCharts(result, 1, 3)!;
    const seen = new Set<number>();
    for (const d of data.days) {
      expect(d.score).toBeGreaterThanOrEqual(0);
      expect(d.score).toBeLessThanOrEqual(100);
      expect(['tốt', 'khá', 'trung bình', 'thận trọng', 'xấu']).toContain(d.tone);
      expect(seen.has(d.lunarDay)).toBe(false);
      seen.add(d.lunarDay);
    }
    expect(data.days[0].lunarDay).toBe(1);
    expect(data.days[data.days.length - 1].lunarDay).toBe(data.totalDays);
  });

  it('radar 8 domain khớp đúng 8 chủ đề đã định nghĩa (Công việc, Tài chính, …)', () => {
    const result = sampleResult();
    const data = buildNguyetVanCharts(result, 1, 1)!;
    const labels = data.radar.map(a => a.label);
    expect(labels).toEqual(expect.arrayContaining([
      'Công việc', 'Tài chính', 'Kinh doanh / Đối tác', 'Hôn nhân / Quan hệ',
      'Gia đình', 'Tài sản / Nhà đất', 'Sức khỏe', 'Học tập / Nâng cấp bản thân',
    ]));
    for (const a of data.radar) {
      expect(a.value).toBeGreaterThanOrEqual(0);
      expect(a.value).toBeLessThanOrEqual(100);
    }
  });

  it('tuổi không tồn tại → trả về null (không throw)', () => {
    const result = sampleResult();
    expect(() => buildNguyetVanCharts(result, 999, 1)).not.toThrow();
    expect(buildNguyetVanCharts(result, 999, 1)).toBeNull();
  });
});
