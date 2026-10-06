/**
 * TRỤ NĂM / TRỤ THÁNG THEO TIẾT KHÍ (đúng phép Bát Tự) — dùng cho phần Bát Tự của Nghiệm quá khứ & Luận tương lai.
 *
 * Phép Bát Tự chuẩn: trụ NĂM đổi tại LẬP XUÂN; trụ THÁNG đổi tại 12 "tiết" (Lập Xuân → Dần, Kinh Trập → Mão, Thanh Minh → Thìn,
 * Lập Hạ → Tị, Mang Chủng → Ngọ, Tiểu Thử → Mùi, Lập Thu → Thân, Bạch Lộ → Dậu, Hàn Lộ → Tuất, Lập Đông → Hợi,
 * Đại Tuyết → Tý, Tiểu Hàn → Sửu). Màn Bát Tự của app (core/batTuEngine.ts) hiện lấy tháng/năm ÂM LỊCH (tháng 1 = Dần…),
 * nên với khoảng một nửa số người trụ tháng khác nhau — xem config `BAZI_BASIS` để chọn cách dùng.
 *
 * Độ phân giải: theo NGÀY (bỏ qua giờ phút giao tiết) — người sinh đúng ngày giao tiết có thể lệch một tháng.
 */
import type { EarthlyBranch, FiveElement, HeavenlyStem, Pillar } from '../types';
import { getSolarTermDate } from './solarTerms';

const STEMS: HeavenlyStem[] = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const BRANCHES: EarthlyBranch[] = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tị', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
import { HIDDEN_STEMS, STEM_ELEMENT } from './baziTables';

/** 12 "tiết" theo thứ tự tháng Bát Tự (Dần … Sửu): chỉ số trong SOLAR_TERM_NAMES. */
const TIET_INDEX = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
/** Chi của tháng thứ k (0 = Dần … 11 = Sửu). */
const MONTH_BRANCH_BY_K: EarthlyBranch[] = ['Dần', 'Mão', 'Thìn', 'Tị', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi', 'Tý', 'Sửu'];
/** Can của tháng Dần theo can năm (Ngũ Hổ Độn): Giáp/Kỷ → Bính, Ất/Canh → Mậu, Bính/Tân → Canh, Đinh/Nhâm → Nhâm, Mậu/Quý → Giáp. */
const DAN_STEM_START = [2, 4, 6, 8, 0];

const ymd = (d: Date) => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();

export interface TruePillars {
  /** Năm Bát Tự (theo Lập Xuân) — có thể nhỏ hơn năm dương lịch của ngày sinh 1 đơn vị. */
  baziYear: number;
  yearStem: HeavenlyStem;
  yearBranch: EarthlyBranch;
  monthStem: HeavenlyStem;
  monthBranch: EarthlyBranch;
  /** 0 = tháng Dần … 11 = tháng Sửu. */
  monthIndex: number;
}

export function truePillars(solar: Date): TruePillars {
  const y = solar.getFullYear();
  // Mọi tiết của năm trước, năm này, năm sau; chọn tiết gần nhất không sau ngày sinh.
  const marks: { key: number; k: number; year: number }[] = [];
  for (const yy of [y - 1, y, y + 1]) {
    TIET_INDEX.forEach((idx, k) => {
      const d = getSolarTermDate(idx, yy);
      marks.push({ key: d.year * 10000 + d.month * 100 + d.day, k, year: yy });
    });
  }
  marks.sort((a, b) => a.key - b.key);
  const t = ymd(solar);
  let cur = marks[0];
  for (const m of marks) { if (m.key <= t) cur = m; else break; }

  // Năm Bát Tự: đổi ở Lập Xuân (k=0). Tiết Tiểu Hàn (k=11) của năm yy rơi vào tháng 1 năm yy nhưng thuộc năm Bát Tự yy-1.
  const lapXuan = getSolarTermDate(0, y);
  const baziYear = t < lapXuan.year * 10000 + lapXuan.month * 100 + lapXuan.day ? y - 1 : y;

  const yearStemIdx = (((baziYear + 6) % 10) + 10) % 10;
  const yearBranchIdx = (((baziYear + 8) % 12) + 12) % 12;
  const monthStemIdx = (DAN_STEM_START[yearStemIdx % 5] + cur.k) % 10;
  return {
    baziYear,
    yearStem: STEMS[yearStemIdx], yearBranch: BRANCHES[yearBranchIdx],
    monthStem: STEMS[monthStemIdx], monthBranch: MONTH_BRANCH_BY_K[cur.k], monthIndex: cur.k,
  };
}

const mk = (stem: HeavenlyStem, branch: EarthlyBranch, label: string): Pillar => ({
  stem, branch, hiddenStems: [...HIDDEN_STEMS[branch]], element: STEM_ELEMENT[stem] as FiveElement, label,
});

/** Thay trụ năm + trụ tháng của lá số bằng trụ theo tiết khí; trụ ngày/giờ giữ nguyên. */
export function withTruePillars(pillars: [Pillar, Pillar, Pillar, Pillar], solar: Date): [Pillar, Pillar, Pillar, Pillar] {
  const tp = truePillars(solar);
  return [mk(tp.yearStem, tp.yearBranch, 'Năm'), mk(tp.monthStem, tp.monthBranch, 'Tháng'), pillars[2], pillars[3]];
}
