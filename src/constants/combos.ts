/**
 * Gói COMBO "Luận Trọn Đời" — mua 1 lần, mở khóa nhiều mục AI cùng lúc.
 * Giá tính bằng XU (1 xu = 100đ). Khi build store, xu được nạp qua IAP.
 */
import type { AstrologyResult } from '../types';
import { fkey } from '../lib/featureKey';

export interface Combo {
  id: string;
  name: string;
  desc: string;
  cost: number;     // xu
  priceVnd: number; // hiển thị tham khảo
}

export const COMBOS: Combo[] = [
  {
    id: 'lifetime_basic',
    name: 'Trọn đời Cơ bản',
    desc: 'Toàn lá số + Bát Tự + Tài Lộc + 5 Đại vận (giai đoạn đang sống) — mở khóa AI vĩnh viễn.',
    cost: 490,
    priceVnd: 49000,
  },
  {
    id: 'lifetime_full',
    name: 'Trọn đời Đầy đủ',
    desc: 'Toàn lá số + Bát Tự + Tài Lộc + đủ 10 Đại vận — luận AI trọn vẹn cả đời.',
    cost: 990,
    priceVnd: 99000,
  },
];

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Tính danh sách unlock key (AI) mà 1 combo mở cho lá số `result`. */
export function comboUnlockKeys(result: AstrologyResult, comboId: string): string[] {
  const yearKey = result.tuViChart.viewingYear ?? 'na';
  const keys = [
    fkey(result, `chart:ai:${yearKey}`),  // toàn lá số (theo năm xem của lá số)
    fkey(result, 'battu:ai'),             // bát tự
    fkey(result, 'wealth:ai'),            // tài lộc
  ];
  const dvCount = clamp(result.daiVans?.length ?? 0, 0, 10);

  if (comboId === 'lifetime_full') {
    for (let i = 0; i < dvCount; i++) keys.push(fkey(result, `dv:${i}:ai`));
  } else {
    // 5 đại vận quanh tuổi đang xem (giai đoạn đang sống).
    const age = result.tuViChart.viewingAge ?? 0;
    let cur = result.daiVans.findIndex(d => age >= d.startAge && age <= d.endAge);
    if (cur < 0) cur = 0;
    const start = clamp(cur, 0, Math.max(0, dvCount - 5));
    for (let i = start; i < Math.min(dvCount, start + 5); i++) keys.push(fkey(result, `dv:${i}:ai`));
  }
  return keys;
}
