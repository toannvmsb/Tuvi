import { natalFactsBlock } from '../natalAnalysisService';
import { buildCachCucContext } from '../cachCucEngine';
import { sampleResult } from './fixtures';

describe('Prompt facts — chống bịa vị trí sao', () => {
  const result = sampleResult();

  it('natalFactsBlock chứa bản đồ 12 cung + vị trí thực từng sao trong 24 cách', () => {
    const block = natalFactsBlock(result);
    expect(block).toContain('BẢN ĐỒ 12 CUNG');
    expect(block).toContain('nguồn chân lý duy nhất');
    // Format 24 cách: "vị trí: ... — bằng chứng: SaoA tại cung X, SaoB tại cung Y"
    expect(block).toContain('bằng chứng:');
    expect(block).toContain('tại cung');
    expect(block).toContain('24 CÁCH CỤC ẢNH HƯỞNG LỚN NHẤT');
    expect(block).toContain('KHÔNG đổi vị trí sao');
  });

  it('buildCachCucContext ghi rõ vị trí thực của sao (SaoA@Cung1 + SaoB@Cung2)', () => {
    const ctx = buildCachCucContext(result);
    expect(ctx).toContain('RÀNG BUỘC');
    expect(ctx).toContain('Vị trí thực của sao');
    expect(ctx).toContain('@'); // format SaoA@Cung
    expect(ctx).toContain('Cách hội tụ về'); // phân biệt với vị trí sao
  });
});
