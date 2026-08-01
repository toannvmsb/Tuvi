import { allSampleResults } from './fixtures';
import { generateOfflineFullChart } from '../offlineLuanGiai';

describe('Offline luận — chấm điểm 6 mảng (bug 3.2 fix)', () => {
  it('mảng nào cũng có điểm 1–10 và có "cát/sát a/b"', () => {
    for (const r of allSampleResults()) {
      const md = generateOfflineFullChart(r);
      // Regex điểm dạng "N/10 — cát/sát A/B"
      const matches = [...md.matchAll(/\*\*(Phúc khí|Tài khí|Quan khí|Điền khí|Hôn nhân|Sức khỏe):\*\*\s*(\d+)\/10\s+—\s+cát\/sát\s+(\d+)\/(\d+)/g)];
      expect(matches.length).toBe(6);

      const skh = matches.find(m => m[1] === 'Sức khỏe')!;
      const skhPt = Number(skh[2]);
      const cat = Number(skh[3]);
      const sat = Number(skh[4]);
      // Không được xảy ra: cát cao hơn sát nhiều mà điểm sức khỏe = 1
      if (cat - sat >= 2) {
        expect(skhPt).toBeGreaterThanOrEqual(5);
      }
      if (sat - cat >= 3) {
        expect(skhPt).toBeLessThanOrEqual(6);
      }
    }
  });

  it('3 giai đoạn cuộc đời không được đều "RỰC RỠ" trên lá số trung bình', () => {
    const results = allSampleResults();
    // Ít nhất 1 lá số phải có ≥1 giai đoạn KHÔNG rực rỡ (ngưỡng đã đúng scale 0-100)
    const anyMixed = results.some(r => {
      const md = generateOfflineFullChart(r);
      const rucCount = (md.match(/RỰC RỠ/g) ?? []).length;
      const totalMoods = (md.match(/RỰC RỠ|THUẬN LỢI|CÂN BẰNG|NHIỀU THỬ THÁCH/g) ?? []).length;
      return totalMoods > 0 && rucCount < totalMoods;
    });
    expect(anyMixed).toBe(true);
  });
});
