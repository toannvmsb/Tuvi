import { validateChart } from '../chartValidator';
import type { AstrologyResult } from '../../types';
import { sampleResult, star } from './fixtures';

const BRANCHES = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tị', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
const PALACES = ['Mệnh', 'Phụ Mẫu', 'Phúc Đức', 'Điền Trạch', 'Quan Lộc', 'Nô Bộc', 'Thiên Di', 'Tật Ách', 'Tài Bạch', 'Tử Tức', 'Phu Thê', 'Huynh Đệ'];

describe('Chart Validator (Phase 1)', () => {
  it('lá số thật từ buildResult → hợp lệ (không có error)', () => {
    const v = validateChart(sampleResult());
    expect(v.ok).toBe(true);
    expect(v.errorCount).toBe(0);
    expect(v.schemaVersion).toBe('2.0');
  });

  it('lá số lỗi (11 cung, không Mệnh, thiếu menhElement) → ok=false', () => {
    const broken = {
      tuViChart: {
        houses: BRANCHES.slice(0, 11).map((b, i) => ({
          branch: b, palaceName: PALACES[i], isManh: false, isThan: false, stars: [],
        })),
      },
      batTuChart: {},
      daiVans: [],
      tieuVans: [{ age: 1, daiVanIndex: 5 }],
    } as unknown as AstrologyResult;
    const v = validateChart(broken);
    expect(v.ok).toBe(false);
    expect(v.errorCount).toBeGreaterThanOrEqual(3);
    expect(v.confidence).toBeLessThan(50);
    expect(v.issues.some(i => i.code === 'NO_MENH')).toBe(true);
  });

  it('trùng địa chi → error BRANCH_DUP', () => {
    const dup = {
      tuViChart: {
        menhElement: 'Kim',
        houses: BRANCHES.map((b, i) => ({
          branch: i === 5 ? 'Tý' : b, // ép trùng Tý
          palaceName: PALACES[i], isManh: i === 0, isThan: i === 0,
          stars: [star('Tử Vi', 'chinh', 'miếu')],
        })),
      },
      batTuChart: { favorableElements: ['Kim'], unfavorableElements: ['Hỏa'] },
      daiVans: [{ index: 0 }],
      tieuVans: [],
    } as unknown as AstrologyResult;
    const v = validateChart(dup);
    expect(v.issues.some(i => i.code === 'BRANCH_DUP')).toBe(true);
  });
});
