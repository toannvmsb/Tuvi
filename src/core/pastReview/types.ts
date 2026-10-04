/**
 * NGHIỆM QUÁ KHỨ — kiểu dữ liệu dùng chung. Toàn bộ module này là code TẤT ĐỊNH, thuần TS:
 * không gọi AI, không phụ thuộc UI/Supabase (xem CLAUDE.md §11).
 */
import type { AreaId } from './config';

export type LifeArea = AreaId;
export type System = 'tuvi' | 'bazi';
/** Tầng lập luận: gốc = lá số vốn có · nền = đại hạn/đại vận 10 năm · ngòi = lưu niên (năm đó có gì kích). */
export type Layer = 'goc' | 'nen' | 'ngoi';

/** 1 tín hiệu — đơn vị nhỏ nhất của lập luận; "Vì sao" chỉ được viết từ danh sách này. */
export interface PastSignal {
  /** Mã quy tắc ổn định. Tử Vi: ruleId của engine annualEvents (vd 'R_…'); Bát Tự: 'BZ_…' (bazi/rules.ts). */
  ruleId: string;
  system: System;
  area: LifeArea;
  layer: Layer;
  /** true = ủng hộ khả năng có biến động ở mảng này; false = ngược chiều (làm yếu kết luận). */
  supports: boolean;
  /** Sắc thái tốt/xấu của tín hiệu (dùng cho điểm vận có dấu): +1 thuận · −1 nghịch · 0 trung tính. */
  tone: -1 | 0 | 1;
  /** Đóng góp đã áp vào điểm (0 với tín hiệu "gốc" chỉ để giải thích). */
  weight: number;
  /** Vị trí: cung (Tử Vi) hoặc trụ (Bát Tự), tiếng Việt. */
  where: string;
  /** Tham số thô: sao, can, chi, thập thần… — lint đối chiếu lời văn với đúng các giá trị này. */
  param: Record<string, string | number>;
  /** Tên ngắn dùng khi liệt kê (mức người học). */
  label: string;
}

export interface AreaScore {
  area: LifeArea;
  /** Điểm mỗi hệ, 0..100 (sau chuẩn hóa). */
  tuvi: number;
  bazi: number;
  /** Cả hai hệ đều báo (mỗi hệ ≥ agreeMinEach). */
  agree: boolean;
  /** Độ mạnh sau khi gộp hai hệ + hệ số đại vận, 0..100, không dấu — dùng để chọn mốc. */
  strength: number;
  /** Điểm vận có dấu tốt/xấu của mảng, −100..100 — dùng cho biểu đồ thăng trầm. */
  signed: number;
  /** Sự kiện Tử Vi mạnh nhất trong mảng (để chọn câu mô tả mốc). */
  topEventId: string | null;
  signals: PastSignal[];
}

export interface YearScore {
  year: number;
  age: number;
  /** Chỉ số đại hạn Tử Vi của năm đó (DaiVan.index), null nếu ngoài phạm vi. */
  daiVanIndex: number | null;
  areas: Record<LifeArea, AreaScore>;
  /** Mảng mạnh nhất của năm và độ mạnh (không dấu). */
  bestArea: LifeArea;
  strength: number;
  /** Điểm vận có dấu của cả năm (trung bình 4 mảng có tín hiệu), −100..100. */
  vanScore: number;
  rulebookVersion: string;
}

export type MarkerTier = 'manh' | 'vua' | 'nhe';

export interface PastMarker {
  year: number;
  age: number;
  area: LifeArea;
  tier: MarkerTier;
  agree: boolean;
  strength: number;
  daiVanIndex: number | null;
  topEventId: string | null;
  signals: PastSignal[];
}
