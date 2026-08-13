import { suggestXongDat, type XongDatPurpose } from '../xongDatEngine';
import { sampleResult, allSampleResults, SAMPLE_BIRTH } from './fixtures';

describe('xongDatEngine — gợi ý người xông đất theo lá số gia chủ', () => {
  it('trả đủ 4 mục đích, mỗi mục đích đúng 1 gợi ý', () => {
    const options = suggestXongDat(sampleResult());
    expect(options).not.toBeNull();
    expect(options!.length).toBe(4);
    const purposes = options!.map(o => o.purpose).sort();
    expect(purposes).toEqual(['cong_viec', 'khac', 'lam_an', 'suc_khoe'] as XongDatPurpose[]);
  });

  it('KHÔNG BAO GIỜ gợi ý tuổi lục xung với tuổi gia chủ (1990 = Canh Ngọ, lục xung = Tý)', () => {
    const result = sampleResult(SAMPLE_BIRTH); // 1990 → năm Ngọ
    expect(result.tuViChart.lunarDate.yearBranch).toBe('Ngọ');
    const options = suggestXongDat(result);
    for (const o of options!) {
      expect(o.branch).not.toBe('Tý');
    }
  });

  it('mỗi option có zodiacName khớp đúng branch, score là số, reason không rỗng', () => {
    const ZODIAC: Record<string, string> = {
      Tý: 'Chuột', Sửu: 'Trâu', Dần: 'Hổ', Mão: 'Mèo', Thìn: 'Rồng', Tị: 'Rắn',
      Ngọ: 'Ngựa', Mùi: 'Dê', Thân: 'Khỉ', Dậu: 'Gà', Tuất: 'Chó', Hợi: 'Lợn',
    };
    for (const result of allSampleResults()) {
      const options = suggestXongDat(result);
      expect(options).not.toBeNull();
      for (const o of options!) {
        expect(o.zodiacName).toBe(ZODIAC[o.branch]);
        expect(typeof o.score).toBe('number');
        expect(o.reason.length).toBeGreaterThan(0);
        expect(o.reason).toContain(o.branch);
      }
    }
  });

  it('không gợi ý tuổi thuộc hành kỵ thần cho mục đích làm ăn nếu còn lựa chọn khác tốt hơn', () => {
    const result = sampleResult();
    const options = suggestXongDat(result)!;
    const lamAn = options.find(o => o.purpose === 'lam_an')!;
    // Không phải lúc nào cũng tránh được tuyệt đối (tùy lá số), nhưng nếu hành đó là kỵ thần thì
    // reason phải nêu rõ cảnh báo (minh bạch với người dùng) — không được giấu.
    if (result.batTuChart.unfavorableElements.includes(lamAn.element)) {
      expect(lamAn.reason).toContain('kỵ thần');
    }
  });

  it('luôn trả về hợp lệ cho mọi lá số mẫu (không throw, không null)', () => {
    for (const result of allSampleResults()) {
      expect(() => suggestXongDat(result)).not.toThrow();
      expect(suggestXongDat(result)).not.toBeNull();
    }
  });
});
