/**
 * Đếm SỐ NHÓM ĐỘC LẬP (evidence family) có tham gia, không đếm số rule/sao — tránh "hội tụ giả"
 * khi 3 sao cùng 1 hệ (vd Lộc Tồn+Kình+Đà) được tính như 3 bằng chứng riêng (ENGINE_SPEC §5).
 * Dùng để xét major-event/very-high gate (event.majorEventGate/veryHighGate — "đủ điều kiện gọi
 * là sự kiện lớn"). KHÔNG còn dùng để NHÂN ĐIỂM nữa — từ TUZI_Tieu_Han_Annual_Event_Focus_Engine_v1.md
 * §26, hệ số nhân điểm hội tụ chuyển sang `axisConvergenceMultiplier` (tieuHanFocus.ts, đếm theo
 * tầng cấu trúc Đại Vận/Tiểu Hạn/Lưu Niên Đại Hạn/Lưu Thái Tuế/Tứ Hóa năm/Sao lưu năm — khác hẳn
 * cách đếm "họ bằng chứng" ở đây).
 */
import type { EvidenceFamily } from './types';

export function countIndependentFamilies(families: EvidenceFamily[]): EvidenceFamily[] {
  return Array.from(new Set(families));
}
