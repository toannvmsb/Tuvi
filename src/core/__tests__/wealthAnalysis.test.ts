import { analyzeFinancialDNA, financialDNARadar } from '../wealthAnalysis';
import type { AstrologyResult } from '../../types';
import { star } from './fixtures';

const H = (palaceName: string, starNames: string[], extra: any = {}) => ({
  palaceName, branch: 'Tý', isManh: false, isThan: false,
  stars: starNames.map(n => star(n, 'chinh', 'miếu')), ...extra,
});

function chart(houses: any[]): AstrologyResult {
  return { tuViChart: { houses } } as any;
}

describe('Financial DNA (Phase 12)', () => {
  it('Thái Âm+Thiên Phủ cư Điền, Lộc Tồn → trội retain, rủi ro thấp', () => {
    const dna = analyzeFinancialDNA(chart([
      H('Mệnh', ['Vũ Khúc']),
      H('Tài Bạch', ['Lộc Tồn', 'Thiên Mã']),
      H('Quan Lộc', ['Thái Dương']),
      H('Điền Trạch', ['Thái Âm', 'Thiên Phủ']),
      H('Phúc Đức', ['Thiên Đồng']),
      H('Thiên Di', ['Hóa Lộc']),
    ]));
    expect(dna.dominant).toBe('retain');
    expect(dna.riskLevel).toBe('thấp');
    expect(dna.property).toBeGreaterThan(70);
    expect(dna.formulaVersion).toBe('2.0');
  });

  it('Phá Quân+Không/Kiếp+Hóa Kỵ+Triệt → rủi ro cao', () => {
    const dna = analyzeFinancialDNA(chart([
      H('Mệnh', ['Phá Quân']),
      H('Tài Bạch', ['Địa Không', 'Hóa Kỵ'], { trietAt: true }),
      H('Quan Lộc', ['Thất Sát']),
      H('Điền Trạch', ['Địa Kiếp', 'Phá Quân']),
      H('Phúc Đức', []),
      H('Thiên Di', []),
    ]));
    expect(dna.riskLevel).toBe('cao');
    expect(dna.risk).toBeGreaterThanOrEqual(60);
    expect(dna.retain).toBeLessThan(40);
  });

  it('radar trả về 8 trục', () => {
    const dna = analyzeFinancialDNA(chart([H('Mệnh', ['Vũ Khúc'])]));
    expect(financialDNARadar(dna)).toHaveLength(8);
  });
});
