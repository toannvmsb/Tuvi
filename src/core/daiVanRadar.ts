/**
 * 12 trục "bản đồ tròn" (radar) cho một đại vận — chấm 0..100 dựa
 * trên các sao tại cung đại vận (logic tổng hợp lý thuyết, tham khảo).
 * Trục: Quý, Quyền, Tài, Văn, Hỷ, Thọ, Phúc, Hung, Bại, Ám, Hình, Đào hoa.
 */

import type { AstrologyResult, DaiVan, TuViHouse } from '../types';

export interface RadarAxis { label: string; value: number; }

const AXES = ['Quý', 'Quyền', 'Tài', 'Văn', 'Hỷ', 'Thọ', 'Phúc', 'Hung', 'Bại', 'Ám', 'Hình', 'Đào hoa'] as const;

// Bộ sao đóng góp cho từng trục (mỗi sao +12 điểm khi xuất hiện)
const GROUPS: Record<string, string[]> = {
  'Quý': ['Thiên Khôi', 'Thiên Việt', 'Tả Phù', 'Hữu Bật', 'Ân Quang', 'Thiên Quý', 'Quốc Ấn', 'Thiên Quan', 'Thiên Phúc', 'Hóa Khoa'],
  'Quyền': ['Hóa Quyền', 'Tướng Quân', 'Quốc Ấn', 'Tử Vi', 'Thất Sát', 'Phá Quân', 'Vũ Khúc', 'Lực Sĩ'],
  'Tài': ['Hóa Lộc', 'Lộc Tồn', 'Vũ Khúc', 'Thiên Phủ', 'Thái Âm', 'Thiên Mã', 'Thanh Long', 'Thiên Tài'],
  'Văn': ['Văn Xương', 'Văn Khúc', 'Hóa Khoa', 'Thiên Cơ', 'Long Trì', 'Phượng Các', 'Tam Thai', 'Bát Tọa', 'Thai Phụ', 'Phong Cáo', 'Văn Tinh', 'Tấu Thư'],
  'Hỷ': ['Hồng Loan', 'Thiên Hỷ', 'Hỷ Thần', 'Thiên Đồng', 'Long Đức', 'Thiên Đức', 'Nguyệt Đức', 'Thiên Phúc'],
  'Thọ': ['Thiên Lương', 'Thiên Đồng', 'Thiên Thọ', 'Thiên Phủ', 'Tràng Sinh', 'Đế Vượng', 'Lâm Quan', 'Quan Đới'],
  'Phúc': ['Thiên Phúc', 'Phúc Đức', 'Thiên Đức', 'Nguyệt Đức', 'Long Đức', 'Thiên Lương', 'Giải Thần', 'Thiên Giải', 'Địa Giải'],
  'Hung': ['Kình Dương', 'Đà La', 'Hỏa Tinh', 'Linh Tinh', 'Địa Không', 'Địa Kiếp', 'Bạch Hổ', 'Kiếp Sát', 'Thiên Hình'],
  'Bại': ['Đại Hao', 'Tiểu Hao', 'Hóa Kỵ', 'Phá Toái', 'Tuế Phá', 'Thiên Thương', 'Thiên Sứ'],
  'Ám': ['Cự Môn', 'Hóa Kỵ', 'Đà La', 'Thiên Riêu', 'Quan Phù', 'Quan Phủ', 'Phục Binh', 'Phi Liêm'],
  'Hình': ['Thiên Hình', 'Kình Dương', 'Bạch Hổ', 'Quan Phù', 'Kiếp Sát', 'Tang Môn'],
  'Đào hoa': ['Đào Hoa', 'Hồng Loan', 'Thiên Hỷ', 'Mộc Dục', 'Tham Lang', 'Liêm Trinh', 'Văn Khúc', 'Thiên Riêu'],
};
// Trục "tốt" có nền cao hơn; trục "xấu" nền thấp (chỉ lên khi có sao xấu)
const GOOD = new Set(['Quý', 'Quyền', 'Tài', 'Văn', 'Hỷ', 'Thọ', 'Phúc']);

export interface DaiVanRadar {
  axes: RadarAxis[];
  palaceName: string;
  branch: string;
  startAge: number;
  endAge: number;
}

export function computeDaiVanRadar(result: AstrologyResult, dv: DaiVan): DaiVanRadar {
  const h: TuViHouse | undefined = result.tuViChart.houses.find(x => x.branch === dv.branch);
  const names = new Set(
    (h?.stars ?? []).map(s => (s.name.startsWith('L. ') ? s.name.slice(3) : s.name)),
  );
  // Trục Quyền/Tài/Thọ... có thể tăng nhẹ theo độ sáng chính tinh
  const brightBonus = (h?.stars ?? [])
    .filter(s => s.type === 'chinh')
    .reduce((acc, s) => acc + (s.brightness === 'miếu' ? 10 : s.brightness === 'vượng' ? 7 : s.brightness === 'đắc' ? 4 : s.brightness === 'hãm' ? -6 : 1), 0);

  const axes: RadarAxis[] = AXES.map(label => {
    const good = GOOD.has(label);
    let v = good ? 26 : 12;
    for (const star of GROUPS[label]) if (names.has(star)) v += 12;
    if (good) v += Math.max(-8, Math.min(16, brightBonus));
    if (h?.tuanAt || h?.trietAt) v += good ? -6 : 8;
    return { label, value: Math.max(4, Math.min(100, Math.round(v))) };
  });

  return {
    axes,
    palaceName: h?.palaceName ?? dv.branch,
    branch: dv.branch,
    startAge: dv.startAge,
    endAge: dv.endAge,
  };
}
