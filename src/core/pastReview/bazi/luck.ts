/**
 * ĐẠI VẬN BÁT TỰ (mới — app trước đây chỉ có Đại Hạn Tử Vi).
 *  - Chiều: nam Dương niên / nữ Âm niên đi THUẬN; nam Âm niên / nữ Dương niên đi NGHỊCH (theo can trụ năm của app).
 *  - Khởi vận: số ngày từ ngày sinh tới TIẾT (12 tiết, không tính khí) gần nhất theo chiều đi, chia 3 = số năm.
 *  - Bắt đầu từ trụ THÁNG của app, mỗi vận một bước can chi theo chiều.
 * XẤP XỈ có chủ đích: trụ tháng của app lập theo tháng ÂM LỊCH (không theo tiết khí) nên đại vận ở đây
 * cũng chỉ là xấp xỉ, nhất quán với trụ app đang hiển thị. Ghi chú này hiện ở mức người học.
 */
import type { AstrologyResult, EarthlyBranch, HeavenlyStem } from '../../../types';
import { lunarToSolar } from '../../lunarCalendar';
import { getSolarTermDate } from '../../solarTerms';
import { BRANCHES, STEMS, isYangStem } from './tables';

export interface BaziLuckPillar {
  index: number;       // 1..9
  startYear: number;   // năm dương lịch bắt đầu
  endYear: number;
  startAge: number;    // tuổi (năm − năm sinh + 1) lúc bắt đầu
  stem: HeavenlyStem;
  branch: EarthlyBranch;
}

export interface BaziLuck {
  forward: boolean;
  startYearsAfterBirth: number;
  pillars: BaziLuckPillar[];
}

const JIE_INDEXES = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]; // 12 "tiết" trong SOLAR_TERM_NAMES

function birthSolarDate(result: AstrologyResult): Date {
  const b = result.birthInfo;
  if (b.calendarType === 'lunar') {
    const s = lunarToSolar(b.day, b.month, b.year, b.isLeapMonth ?? false);
    return new Date(s.year, s.month - 1, s.day);
  }
  return new Date(b.year, b.month - 1, b.day);
}

const DAY_MS = 86400000;

export function computeBaziLuck(result: AstrologyResult): BaziLuck {
  const bt = result.batTuChart;
  const gender = result.birthInfo.gender;
  const yangYear = isYangStem(bt.pillars[0].stem);
  const forward = (gender === 'nam') === yangYear;

  const birth = birthSolarDate(result);
  const by = birth.getFullYear();
  const jie: Date[] = [];
  for (const y of [by - 1, by, by + 1]) {
    for (const idx of JIE_INDEXES) {
      const d = getSolarTermDate(idx, y);
      jie.push(new Date(d.year, d.month - 1, d.day));
    }
  }
  jie.sort((a, b) => a.getTime() - b.getTime());
  const t = birth.getTime();
  const target = forward
    ? jie.find(d => d.getTime() > t)
    : [...jie].reverse().find(d => d.getTime() <= t);
  const days = target ? Math.abs(Math.round((target.getTime() - t) / DAY_MS)) : 0;
  const startYearsAfterBirth = Math.max(1, Math.round(days / 3));

  const si = STEMS.indexOf(bt.pillars[1].stem);
  const bi = BRANCHES.indexOf(bt.pillars[1].branch);
  const dir = forward ? 1 : -1;
  const pillars: BaziLuckPillar[] = [];
  for (let k = 1; k <= 9; k++) {
    const startYear = by + startYearsAfterBirth + 10 * (k - 1);
    pillars.push({
      index: k,
      startYear,
      endYear: startYear + 9,
      startAge: startYear - result.birthInfo.year + 1,
      stem: STEMS[(((si + dir * k) % 10) + 10) % 10],
      branch: BRANCHES[(((bi + dir * k) % 12) + 12) % 12],
    });
  }
  return { forward, startYearsAfterBirth, pillars };
}

/** Vận đang đi của một năm (null nếu chưa vào vận đầu tiên hoặc đã quá vận thứ 9). */
export function luckAtYear(luck: BaziLuck, year: number): BaziLuckPillar | null {
  return luck.pillars.find(p => year >= p.startYear && year <= p.endYear) ?? null;
}
