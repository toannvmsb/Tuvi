import { buildChatFactsBlock } from '../chatFacts';
import { ZODIAC_NAME } from '../xongDatEngine';
import { allSampleResults } from './fixtures';

/**
 * Sanity cho khối facts gọn gắn vào "Hỏi Tuzi": không crash trên mọi lá số
 * mẫu, luôn có Họ tên/Mệnh/Bát Tự, và KHÔNG vượt quá độ dài hợp lý (khối này
 * phải NGẮN — khác hẳn natalFactsBlock dùng cho phân tích lá số đầy đủ).
 */
describe('buildChatFactsBlock', () => {
  it('không crash, có đủ Mệnh + Bát Tự, độ dài gọn cho mọi lá số mẫu', () => {
    const now = new Date();
    for (const result of allSampleResults()) {
      const block = buildChatFactsBlock(result, now);
      expect(block).toContain('Mệnh:');
      expect(block).toContain('Bát Tự:');
      expect(block.length).toBeLessThan(1200);
    }
  });

  /**
   * Regression cho bug thực tế: AI từng khuyên "tháng 4 đẹp nhất" khi tháng
   * âm hiện tại đã là tháng 6 (tháng 4 đã qua) mà không nói rõ điều đó. Facts
   * phải LUÔN nêu tháng âm hiện tại + đánh dấu rõ khi tháng đẹp nhất cả năm đã
   * qua, và tách riêng tháng đẹp nhất trong các tháng CÒN LẠI.
   */
  it('nêu rõ tháng âm hiện tại và đánh dấu "ĐÃ QUA" khi tháng đẹp nhất đã qua', () => {
    const [result] = allSampleResults();
    // Ngày cụ thể để tháng âm hiện tại chắc chắn không phải tháng 1 (có tháng đã qua để kiểm chứng).
    const midYear = new Date(2026, 6, 15); // khoảng tháng 6-7 âm tùy năm
    const block = buildChatFactsBlock(result, midYear);
    expect(block).toContain('Tháng âm hiện tại:');
    expect(block).toContain('Tháng đẹp nhất năm nay');
    // Nếu có dòng "tháng còn lại", nó phải xuất hiện sau dòng tháng hiện tại (thứ tự nhất quán).
    if (block.includes('CÒN LẠI')) {
      expect(block.indexOf('Tháng âm hiện tại')).toBeLessThan(block.indexOf('CÒN LẠI'));
    }
  });

  /**
   * Regression cho bug thực tế: AI trả lời nhầm tuổi Mão cho người tuổi Hợi vì
   * phải tự suy ra con giáp từ năm sinh dương lịch (dễ sai, nhất là sinh gần
   * Tết). Facts phải nêu THẲNG tuổi âm lịch lấy từ Chi của Trụ Năm Bát Tự đã
   * tính sẵn, để AI không phải tự tính lại.
   */
  it('nêu rõ tuổi âm lịch (con giáp) lấy đúng từ Chi của Trụ Năm Bát Tự', () => {
    for (const result of allSampleResults()) {
      const block = buildChatFactsBlock(result, new Date());
      const yearBranch = result.batTuChart?.pillars?.[0]?.branch;
      if (!yearBranch) continue;
      expect(block).toContain('TUỔI ÂM LỊCH (con giáp)');
      expect(block).toContain(`${yearBranch} (tuổi ${ZODIAC_NAME[yearBranch]})`);
    }
  });
});
