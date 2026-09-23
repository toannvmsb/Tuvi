/**
 * Sao "lưu" (phi lưu lại theo 1 Can/Chi bất kỳ) — dùng chung cho tầng ĐẠI VẬN/LƯU NIÊN/LƯU NGUYỆT.
 * Tái dùng core/starPlacer.ts (getLuuStarsForYear, đã export sẵn) cho phần lớn, chỉ tự tính thêm
 * 2 sao mà hàm đó KHÔNG trả về (Đại Hao, Quan Phù) bằng chính 2 hàm vòng đã export
 * (calculateVongLocTon, calculateVongThaiTue) — không đụng tới core/starPlacer.ts.
 */
import type { TuViHouse, HeavenlyStem, EarthlyBranch, Gender } from '../../types';
import { getLuuStarsForYear } from '../starPlacer';
import { calculateVongThaiTue } from '../vongThaiTue';
import { calculateVongLocTon } from '../vongLocTon';
import { locTonBranchOf, branchIndex } from './calendar';

export interface MovingStarHit { code: string; branchIdx: number }

const KEEP_FROM_LUU: Record<string, string> = {
  'Lộc Tồn': 'LOC_TON', 'Văn Xương': 'VAN_XUONG', 'Văn Khúc': 'VAN_KHUC',
  'Thiên Khôi': 'THIEN_KHOI', 'Thiên Việt': 'THIEN_VIET', 'Kình Dương': 'KINH_DUONG', 'Đà La': 'DA_LA',
  'Thiên Mã': 'THIEN_MA', 'Đào Hoa': 'DAO_HOA', 'Hồng Loan': 'HONG_LOAN',
  'Thiên Khốc': 'THIEN_KHOC', 'Thiên Hư': 'THIEN_HU',
  'Thái Tuế': 'THAI_TUE', 'Tang Môn': 'TANG_MON', 'Bạch Hổ': 'BACH_HO', 'Tiểu Hao': 'TIEU_HAO',
};

/** Nhóm "by-stem"/"by-branch"/vòng Thái Tuế (không gồm Đại Hao) — dùng cho ANNUAL và phần "trục tháng" của MONTHLY. */
export function movingStarsCore(
  houses: TuViHouse[], stem: HeavenlyStem, branch: EarthlyBranch, gender: Gender,
): MovingStarHit[] {
  const all = getLuuStarsForYear(houses, stem, branch, gender);
  const out: MovingStarHit[] = [];
  for (const s of all) {
    const code = KEEP_FROM_LUU[s.name];
    if (code) out.push({ code, branchIdx: s.branchIdx });
  }
  // Quan Phù (vòng Thái Tuế) — getLuuStarsForYear không trả về, tự lấy từ vòng đầy đủ.
  const vongTT = calculateVongThaiTue(branch);
  const qp = vongTT.find(v => v.starName === 'Quan Phù');
  if (qp) out.push({ code: 'QUAN_PHU', branchIdx: branchIndex(qp.branch) });
  return out;
}

/** Đại Hao (vòng Lộc Tồn) — tách riêng vì cần thêm `gender` + Can để suy ra chiều thuận/nghịch. */
export function daiHaoOf(stem: HeavenlyStem, gender: Gender): MovingStarHit | null {
  const ltBranch = locTonBranchOf(stem);
  const vong = calculateVongLocTon(ltBranch, stem, gender);
  const dh = vong.find(v => v.starName === 'Đại Hao');
  return dh ? { code: 'DAI_HAO', branchIdx: branchIndex(dh.branch) } : null;
}

/** Toàn bộ sao lưu tại 1 Can/Chi (dùng cho ĐẠI VẬN's own stem/branch và LƯU NIÊN). */
export function allMovingStars(
  houses: TuViHouse[], stem: HeavenlyStem, branch: EarthlyBranch, gender: Gender,
): MovingStarHit[] {
  const out = movingStarsCore(houses, stem, branch, gender);
  const dh = daiHaoOf(stem, gender);
  if (dh) out.push(dh);
  return out;
}
