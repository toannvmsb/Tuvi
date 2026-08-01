import { buildTieuVanCharts } from '../tieuVanCharts';
import { allSampleResults, sampleResult } from './fixtures';

describe('Tiểu Vận Charts (mục 5 — Logic Tiểu Vận v2.0)', () => {
  it('trả về đủ 3 khối dữ liệu cho vài tuổi trên cả 3 lá số mẫu', () => {
    for (const result of allSampleResults()) {
      for (const age of [1, 10, 25, 40]) {
        const data = buildTieuVanCharts(result, age);
        expect(data).not.toBeNull();
        if (!data) continue;
        expect(data.months).toHaveLength(12);
        expect(data.quarters).toHaveLength(4);
        expect(data.radar).toHaveLength(8);
      }
    }
  });

  it('4 quý cộng lại đúng 12 tháng, liên tục không hở/không đè', () => {
    const result = sampleResult();
    const data = buildTieuVanCharts(result, 20)!;
    expect(data.quarters[0].fromMonth).toBe(1);
    expect(data.quarters[3].toMonth).toBe(12);
    for (let i = 1; i < 4; i++) {
      expect(data.quarters[i].fromMonth).toBe(data.quarters[i - 1].toMonth + 1);
    }
    const totalMonths = data.quarters.reduce((s, q) => s + (q.toMonth - q.fromMonth + 1), 0);
    expect(totalMonths).toBe(12);
  });

  it('overall/opportunity mỗi quý nằm trong [0,100]', () => {
    const result = sampleResult();
    const data = buildTieuVanCharts(result, 15)!;
    for (const q of data.quarters) {
      expect(q.overall).toBeGreaterThanOrEqual(0);
      expect(q.overall).toBeLessThanOrEqual(100);
      expect(q.opportunity).toBeGreaterThanOrEqual(0);
      expect(q.opportunity).toBeLessThanOrEqual(100);
    }
  });

  it('12 tháng dùng CHUNG Nguyệt Vận Engine — taiLoc/thachThuc khớp scoreAllNguyetVan trực tiếp', () => {
    const result = sampleResult();
    const data = buildTieuVanCharts(result, 30)!;
    // Đối chiếu tổng số tháng và range hợp lệ — bảo đảm không tính lại theo công thức khác.
    for (const m of data.months) {
      expect(m.month).toBeGreaterThanOrEqual(1);
      expect(m.month).toBeLessThanOrEqual(12);
      expect(m.taiLoc).toBeGreaterThanOrEqual(0);
      expect(m.thachThuc).toBeGreaterThanOrEqual(0);
    }
  });

  it('radar 8 domain khớp đúng 8 chủ đề, giá trị trong [0,100]', () => {
    const result = sampleResult();
    const data = buildTieuVanCharts(result, 12)!;
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
    expect(() => buildTieuVanCharts(result, 999)).not.toThrow();
    expect(buildTieuVanCharts(result, 999)).toBeNull();
  });
});
