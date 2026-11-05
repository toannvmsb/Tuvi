import { SAMPLE_BIRTHS } from './fixtures';
import { buildResult } from '../buildResult';
import {
  summarizeOfflineFullChart, summarizeOfflineDaiVan, summarizeOfflineTieuVan, summarizeOfflineNguyetVan,
} from '../offlineSummary';

const FORBIDDEN = /Mệnh chủ|Thân chủ|chắc chắn|nhất định|100%/i;

describe('Tóm tắt Nâng cao (offline)', () => {
  for (const b of SAMPLE_BIRTHS) {
    const r = buildResult(b);
    const age = r.tuViChart.viewingAge ?? 30;
    const dv = r.daiVans.find(d => age >= d.startAge && age <= d.endAge) ?? r.daiVans[0];
    const tv = r.tieuVans.find(t => t.age === age) ?? r.tieuVans[0];

    it(`${b.name}: 4 bản tóm tắt đủ nội dung, không từ cấm, không undefined/NaN`, () => {
      const texts = [
        summarizeOfflineFullChart(r),
        summarizeOfflineDaiVan(r, dv.index),
        summarizeOfflineTieuVan(r, tv.age),
        summarizeOfflineNguyetVan(r, tv.age, 3),
      ];
      for (const t of texts) {
        expect(t.length).toBeGreaterThan(200);
        expect(t).not.toMatch(FORBIDDEN);
        expect(t).not.toMatch(/undefined|NaN|\[object/);
      }
      if (process.env.SHOW_SUMMARY) console.log(texts.join('\n\n=========\n\n'));
    });
  }
});
