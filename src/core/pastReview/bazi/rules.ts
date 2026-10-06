/**
 * BẢNG QUY TẮC BÁT TỰ cho "Nghiệm quá khứ" — DỮ LIỆU CẤU HÌNH (mã ổn định `BZ_*`, mảng, tầng, chiều, trọng số).
 * Bộ đánh giá (engine.ts) chỉ biết các `kind` bên dưới; thêm/bớt/đổi trọng số quy tắc KHÔNG cần sửa logic.
 *
 * ⚠ Trọng số = TẠM (do em đặt theo bảng "Tín hiệu theo mảng đời" của đặc tả), chờ anh duyệt. Khi đổi
 * bất cứ thứ gì ở đây, tăng RULEBOOK_VERSION trong config.ts.
 *
 * Tầng: 'goc' = lá số vốn có (weight 0, chỉ để giải thích) · 'nen' = đại vận · 'ngoi' = lưu niên.
 * `supports:false` = tín hiệu NGƯỢC CHIỀU (làm yếu khả năng có biến động).
 * `tone`: sắc thái tốt/xấu cho điểm vận; 'flow' = lấy theo hỷ/kỵ của hành can–chi lưu niên.
 */
import type { AreaId } from '../config';
import type { Layer } from '../types';
import type { ThapThan } from '../../thapThan';
import type { BranchRel } from './relations';

export type PillarKey = 'year' | 'month' | 'day' | 'hour';

export type BzMatcher =
  | { kind: 'flow_god'; gods: ThapThan[]; gender?: 'nam' | 'nu' }
  | { kind: 'flow_rel'; rel: BranchRel; pillar: PillarKey }
  | { kind: 'flow_star'; star: 'horse' | 'peach' }
  /** Năm trùng tuổi / Thái Tuế trực: chi lưu niên TRÙNG chi trụ. */
  | { kind: 'flow_same_branch'; pillar: PillarKey }
  /** Phục ngâm: can VÀ chi lưu niên trùng hệt can chi của trụ. */
  | { kind: 'flow_fuyin'; pillar: PillarKey }
  /** Phản ngâm (thiên khắc địa xung): can lưu niên xung can trụ và chi lưu niên xung chi trụ. */
  | { kind: 'flow_fanyin'; pillar: PillarKey }
  | { kind: 'flow_wealth_el'; mode: 'fav' | 'unfav' }
  | { kind: 'flow_rob' }
  | { kind: 'flow_wealth_hurts_seal' }
  | { kind: 'luck_god'; gods: ThapThan[]; gender?: 'nam' | 'nu' }
  | { kind: 'luck_star'; star: 'horse' }
  | { kind: 'root_pillar'; pillar: PillarKey }
  | { kind: 'root_wealth' };

export interface BzRule {
  id: string;
  label: string;
  area: AreaId;
  layer: Layer;
  supports: boolean;
  tone: -1 | 0 | 1 | 'flow';
  weight: number;
  match: BzMatcher;
}

const QUAN_SAT: ThapThan[] = ['Chính Quan', 'Thất Sát'];
const TAI: ThapThan[] = ['Chính Tài', 'Thiên Tài'];
const AN: ThapThan[] = ['Chính Ấn', 'Thiên Ấn'];

export const BZ_RULES: BzRule[] = [
  // ───────────── Sự nghiệp ─────────────
  { id: 'BZ_CAR_ROOT', label: 'Trụ tháng — môi trường làm việc', area: 'career', layer: 'goc', supports: true, tone: 0, weight: 0, match: { kind: 'root_pillar', pillar: 'month' } },
  { id: 'BZ_CAR_OFFICIAL', label: 'Lưu niên gặp Quan/Sát', area: 'career', layer: 'ngoi', supports: true, tone: 'flow', weight: 24, match: { kind: 'flow_god', gods: QUAN_SAT } },
  { id: 'BZ_CAR_HURT', label: 'Lưu niên gặp Thương Quan', area: 'career', layer: 'ngoi', supports: true, tone: 'flow', weight: 20, match: { kind: 'flow_god', gods: ['Thương Quan'] } },
  { id: 'BZ_CAR_CLASH_MONTH', label: 'Chi lưu niên xung chi tháng', area: 'career', layer: 'ngoi', supports: true, tone: -1, weight: 30, match: { kind: 'flow_rel', rel: 'xung', pillar: 'month' } },
  { id: 'BZ_CAR_PUNISH_MONTH', label: 'Chi lưu niên hình chi tháng', area: 'career', layer: 'ngoi', supports: true, tone: -1, weight: 15, match: { kind: 'flow_rel', rel: 'hinh', pillar: 'month' } },
  { id: 'BZ_CAR_COMBINE_MONTH', label: 'Chi lưu niên lục hợp chi tháng', area: 'career', layer: 'ngoi', supports: false, tone: 1, weight: 15, match: { kind: 'flow_rel', rel: 'lucHop', pillar: 'month' } },
  { id: 'BZ_CAR_LUCK_OFFICIAL', label: 'Đại vận mang Quan/Sát/Thương Quan', area: 'career', layer: 'nen', supports: true, tone: 0, weight: 12, match: { kind: 'luck_god', gods: [...QUAN_SAT, 'Thương Quan'] } },

  // ───────────── Chỗ ở, di chuyển ─────────────
  { id: 'BZ_HOM_ROOT', label: 'Trụ ngày — nơi an cư, bản thân', area: 'home', layer: 'goc', supports: true, tone: 0, weight: 0, match: { kind: 'root_pillar', pillar: 'day' } },
  { id: 'BZ_HOM_CLASH_DAY', label: 'Chi lưu niên xung chi ngày', area: 'home', layer: 'ngoi', supports: true, tone: -1, weight: 28, match: { kind: 'flow_rel', rel: 'xung', pillar: 'day' } },
  { id: 'BZ_HOM_CLASH_YEAR', label: 'Chi lưu niên xung chi năm', area: 'home', layer: 'ngoi', supports: true, tone: -1, weight: 22, match: { kind: 'flow_rel', rel: 'xung', pillar: 'year' } },
  { id: 'BZ_HOM_HORSE', label: 'Dịch Mã động', area: 'home', layer: 'ngoi', supports: true, tone: 0, weight: 25, match: { kind: 'flow_star', star: 'horse' } },
  { id: 'BZ_HOM_LUCK_HORSE', label: 'Đại vận đúng Dịch Mã', area: 'home', layer: 'nen', supports: true, tone: 0, weight: 10, match: { kind: 'luck_star', star: 'horse' } },
  { id: 'BZ_HOM_COMBINE_DAY', label: 'Chi lưu niên lục hợp chi ngày', area: 'home', layer: 'ngoi', supports: false, tone: 1, weight: 12, match: { kind: 'flow_rel', rel: 'lucHop', pillar: 'day' } },

  // ───────────── Tình duyên ─────────────
  { id: 'BZ_LOV_ROOT', label: 'Chi ngày — cung phối ngẫu', area: 'love', layer: 'goc', supports: true, tone: 0, weight: 0, match: { kind: 'root_pillar', pillar: 'day' } },
  { id: 'BZ_LOV_SPOUSE_M', label: 'Lưu niên gặp Tài tinh (vợ)', area: 'love', layer: 'ngoi', supports: true, tone: 'flow', weight: 25, match: { kind: 'flow_god', gods: TAI, gender: 'nam' } },
  { id: 'BZ_LOV_SPOUSE_F', label: 'Lưu niên gặp Quan tinh (chồng)', area: 'love', layer: 'ngoi', supports: true, tone: 'flow', weight: 25, match: { kind: 'flow_god', gods: QUAN_SAT, gender: 'nu' } },
  { id: 'BZ_LOV_COMBINE_DAY', label: 'Chi lưu niên lục hợp chi ngày', area: 'love', layer: 'ngoi', supports: true, tone: 1, weight: 22, match: { kind: 'flow_rel', rel: 'lucHop', pillar: 'day' } },
  { id: 'BZ_LOV_TAMHOP_DAY', label: 'Chi lưu niên tam hợp chi ngày', area: 'love', layer: 'ngoi', supports: true, tone: 1, weight: 15, match: { kind: 'flow_rel', rel: 'tamHop', pillar: 'day' } },
  { id: 'BZ_LOV_CLASH_DAY', label: 'Chi lưu niên xung chi ngày', area: 'love', layer: 'ngoi', supports: true, tone: -1, weight: 22, match: { kind: 'flow_rel', rel: 'xung', pillar: 'day' } },
  { id: 'BZ_LOV_PEACH', label: 'Đào Hoa động', area: 'love', layer: 'ngoi', supports: true, tone: 0, weight: 18, match: { kind: 'flow_star', star: 'peach' } },
  { id: 'BZ_LOV_LUCK_SPOUSE_M', label: 'Đại vận mang Tài tinh (nam)', area: 'love', layer: 'nen', supports: true, tone: 0, weight: 10, match: { kind: 'luck_god', gods: TAI, gender: 'nam' } },
  { id: 'BZ_LOV_LUCK_SPOUSE_F', label: 'Đại vận mang Quan tinh (nữ)', area: 'love', layer: 'nen', supports: true, tone: 0, weight: 10, match: { kind: 'luck_god', gods: QUAN_SAT, gender: 'nu' } },

  // ───────────── Tài lộc ─────────────
  { id: 'BZ_WEA_ROOT', label: 'Tài tinh trong lá số và hỷ/kỵ thần', area: 'wealth', layer: 'goc', supports: true, tone: 0, weight: 0, match: { kind: 'root_wealth' } },
  { id: 'BZ_WEA_FAV', label: 'Lưu niên gặp Tài tinh là dụng thần', area: 'wealth', layer: 'ngoi', supports: true, tone: 1, weight: 28, match: { kind: 'flow_wealth_el', mode: 'fav' } },
  { id: 'BZ_WEA_UNFAV', label: 'Lưu niên gặp Tài tinh là kỵ thần', area: 'wealth', layer: 'ngoi', supports: true, tone: -1, weight: 24, match: { kind: 'flow_wealth_el', mode: 'unfav' } },
  { id: 'BZ_WEA_ROB', label: 'Tỷ/Kiếp đoạt tài', area: 'wealth', layer: 'ngoi', supports: true, tone: -1, weight: 20, match: { kind: 'flow_rob' } },
  { id: 'BZ_WEA_LUCK_STAR', label: 'Đại vận mang Tài tinh', area: 'wealth', layer: 'nen', supports: true, tone: 0, weight: 10, match: { kind: 'luck_god', gods: TAI } },

  // ───────────── Bổ sung pr-0.3 (06/10/2026): năm trùng tuổi · Phục ngâm · Phản ngâm ─────────────
  { id: 'BZ_FAM_TAISUI', label: 'Năm trùng tuổi (chi lưu niên = chi năm sinh)', area: 'family', layer: 'ngoi', supports: true, tone: 0, weight: 15, match: { kind: 'flow_same_branch', pillar: 'year' } },
  { id: 'BZ_LOV_FUYIN_DAY', label: 'Phục ngâm trụ ngày (can chi lưu niên trùng can chi ngày)', area: 'love', layer: 'ngoi', supports: true, tone: -1, weight: 20, match: { kind: 'flow_fuyin', pillar: 'day' } },
  { id: 'BZ_HOM_FANYIN_DAY', label: 'Phản ngâm trụ ngày (thiên khắc địa xung)', area: 'home', layer: 'ngoi', supports: true, tone: -1, weight: 28, match: { kind: 'flow_fanyin', pillar: 'day' } },

  // ───────────── Gia đạo ─────────────
  { id: 'BZ_FAM_ROOT', label: 'Trụ năm — gốc gia đình, cha mẹ', area: 'family', layer: 'goc', supports: true, tone: 0, weight: 0, match: { kind: 'root_pillar', pillar: 'year' } },
  { id: 'BZ_FAM_CLASH_YEAR', label: 'Chi lưu niên xung chi năm', area: 'family', layer: 'ngoi', supports: true, tone: -1, weight: 25, match: { kind: 'flow_rel', rel: 'xung', pillar: 'year' } },
  { id: 'BZ_FAM_HARM_YEAR', label: 'Chi lưu niên hại chi năm', area: 'family', layer: 'ngoi', supports: true, tone: -1, weight: 15, match: { kind: 'flow_rel', rel: 'hai', pillar: 'year' } },
  { id: 'BZ_FAM_PUNISH_MONTH', label: 'Chi lưu niên hình chi tháng', area: 'family', layer: 'ngoi', supports: true, tone: -1, weight: 12, match: { kind: 'flow_rel', rel: 'hinh', pillar: 'month' } },
  { id: 'BZ_FAM_COMBINE_YEAR', label: 'Chi lưu niên lục hợp chi năm', area: 'family', layer: 'ngoi', supports: true, tone: 1, weight: 12, match: { kind: 'flow_rel', rel: 'lucHop', pillar: 'year' } },
  { id: 'BZ_FAM_SEAL_HURT', label: 'Tài lưu niên khắc Ấn', area: 'family', layer: 'ngoi', supports: true, tone: -1, weight: 20, match: { kind: 'flow_wealth_hurts_seal' } },
  { id: 'BZ_FAM_LUCK_SEAL', label: 'Đại vận mang Ấn tinh', area: 'family', layer: 'nen', supports: true, tone: 1, weight: 8, match: { kind: 'luck_god', gods: AN } },
];

/** Quy đổi tổng trọng số → điểm 0..100 của hệ Bát Tự (TẠM). */
export const BZ_SCORE = {
  scale: 2.0,          // 1 quy tắc ngòi ~25 → 50 điểm; 2 quy tắc → 100
  againstFactor: 0.5,  // tín hiệu ngược chiều trừ bằng 50% trọng số
} as const;
