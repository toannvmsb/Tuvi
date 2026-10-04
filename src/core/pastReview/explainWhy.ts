/**
 * PHẦN "VÌ SAO" — lập luận bốn tầng (Gốc · Nền · Ngòi · Kết) trên hai cột Tử Vi / Bát Tự + dòng đối chiếu.
 * Câu chữ được GHÉP TỪ ĐÚNG danh sách `PastSignal` đã dùng để chọn mốc (không AI, không thêm tín hiệu mới):
 *  - Mức NGƯỜI XEM: mỗi hệ 3–4 câu (một câu mỗi tầng), kèm ý nghĩa ngắn của sao/thập thần.
 *  - Mức NGƯỜI HỌC: liệt kê đủ từng tín hiệu — vị trí, mã & tên quy tắc, đóng góp điểm, cả tín hiệu NGƯỢC CHIỀU.
 * Không gượng đồng thuận: chỉ một hệ báo thì dòng đối chiếu nói rõ hệ kia không có tín hiệu.
 */
import { THAP_THAN_MEANING, type ThapThan } from '../thapThan';
import { EVENT_TITLE_VN } from '../annualEvents/eventTitles';
import { meaningOf } from '../annualEvents/signalMeaning';
import { AREA_LABEL } from './config';
import type { Layer, PastMarker, PastSignal, System } from './types';

export interface WhyColumn {
  system: System;
  title: string;
  /** Hệ này có tín hiệu ủng hộ ở tầng nền hoặc ngòi cho mảng này không. */
  reports: boolean;
  goc: string;
  nen: string;
  ngoi: string;
  ket: string;
}

export interface WhyViewer {
  tuvi: WhyColumn;
  bazi: WhyColumn;
  doiChieu: string;
}

export interface WhyLearnerRow {
  system: System;
  layerLabel: string;
  ruleId: string;
  ruleName: string;
  where: string;
  supports: boolean;
  weight: number;
  toneLabel: string;
  detail: string;
}

export interface WhyLearner {
  rows: WhyLearnerRow[];
  /** Ghi chú trường phái + chỗ xấp xỉ (hiện ở đầu mức người học). */
  notes: string[];
}

export interface MarkerWhy {
  viewer: WhyViewer;
  learner: WhyLearner;
}

const LAYER_LABEL: Record<Layer, string> = { goc: 'Gốc', nen: 'Nền', ngoi: 'Ngòi' };
const SYSTEM_TITLE: Record<System, string> = { tuvi: 'Tử Vi', bazi: 'Bát Tự' };
const BAZI_STAR_MEANING: Record<string, string> = {
  'Dịch Mã': 'chủ về di chuyển, thay đổi chỗ ở hoặc môi trường',
  'Đào Hoa': 'tăng sức hút, dễ có duyên mới',
};

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const upperFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const joinVn = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} và ${xs[xs.length - 1]}`);

/** Một câu mô tả cho 1 tín hiệu — dùng ĐÚNG các trường của tín hiệu. */
export function describeSignal(s: PastSignal): string {
  if (s.system === 'tuvi') {
    const star = String(s.param.sao ?? '');
    const code = String(s.param.maSao ?? '');
    const dot = s.layer === 'nen' ? ' (đại vận)' : s.layer === 'ngoi' ? ' (lưu niên)' : '';
    if (code === 'TIEU_HAN_FOCUS') return `${star} năm đó rơi vào cung ${s.where} — nên các dấu hiệu ở mảng này dễ thành việc cụ thể trong năm`;
    return `${star} tại cung ${s.where}${dot} — ${meaningOf(code)}`;
  }
  const god = s.param.thapThan ? String(s.param.thapThan) : '';
  const star = s.param.sao ? String(s.param.sao) : '';
  if (s.ruleId.endsWith('_ROOT')) {
    if (s.ruleId === 'BZ_WEA_ROOT') {
      return `lá số có ${s.param.soTaiTinh} Tài tinh; dụng thần là ${s.param.dungThan || 'chưa rõ'}, kỵ thần là ${s.param.kyThan || 'chưa rõ'}`;
    }
    const role = s.label.includes('—') ? s.label.split('—').slice(1).join('—').trim() : s.label;
    return `${s.where}${god ? `, ${god === 'Nhật Chủ' ? 'chính là bản thân (Nhật Chủ)' : `can là ${god}`}` : ''} — ${role}`;
  }
  const meaning = god ? THAP_THAN_MEANING[god as ThapThan] : star ? BAZI_STAR_MEANING[star] : undefined;
  return `${s.label} (${s.where}${god ? `; ${god}` : ''})${meaning ? ` — ${meaning}` : ''}`;
}

const supportive = (xs: PastSignal[]) => xs.filter(s => s.supports && s.weight > 0);

function sentence(label: string, parts: string[], empty: string): string {
  return parts.length ? `${label}: ${parts.join('; ')}.` : `${label}: ${empty}`;
}

function column(system: System, area: PastMarker['area'], signals: PastSignal[], sensitive: boolean): WhyColumn {
  const mine = signals.filter(s => s.system === system);
  const pick = (layer: Layer, n: number) => {
    const xs = mine.filter(s => s.layer === layer && (layer === 'goc' || (s.supports && s.weight > 0)));
    const seen = new Set<string>();
    const out: PastSignal[] = [];
    for (const s of xs) {
      const k = `${s.label}|${s.where}|${s.param.sao ?? ''}|${s.param.thapThan ?? ''}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(s);
      if (out.length >= n) break;
    }
    return out;
  };
  const goc = pick('goc', 2);
  const nen = pick('nen', 2);
  const ngoi = pick('ngoi', 3);
  const reports = nen.length + ngoi.length > 0;
  const areaTxt = AREA_LABEL[area].toLowerCase();

  const gocS = sentence('Gốc', goc.map(describeSignal), 'chưa ghi nhận dữ kiện gốc rõ rệt ở mảng này');
  const nenS = sentence('Nền', nen.map(describeSignal), 'mười năm này không có tín hiệu nền rõ rệt ở mảng này');
  const ngoiS = sentence('Ngòi', ngoi.map(describeSignal), 'năm đó không có tín hiệu lưu niên rõ rệt ở mảng này');

  let ket: string;
  const tail = sensitive
    ? `nên đây có thể là một năm nặng về mảng ${areaTxt}`
    : `nên mảng ${areaTxt} dễ có biến động trong năm đó`;
  if (nen.length && ngoi.length) ket = `Kết: nền đại vận đã hướng về mảng ${areaTxt}, lưu niên lại kích đúng mảng này, ${tail}.`;
  else if (ngoi.length) ket = `Kết: chủ yếu do tín hiệu của riêng năm đó (ngòi), phần nền đại vận không nhấn vào mảng này, ${tail} nhưng độ chắc thấp hơn.`;
  else if (nen.length) ket = `Kết: có nền đại vận hướng về mảng ${areaTxt} nhưng năm đó chưa có tín hiệu lưu niên kích động, nên chỉ là xu hướng nền.`;
  else ket = `Kết: ${SYSTEM_TITLE[system]} không có tín hiệu đủ rõ để kết luận cho mảng này ở năm đó.`;

  return { system, title: SYSTEM_TITLE[system], reports, goc: gocS, nen: nenS, ngoi: ngoiS, ket };
}

function crossCheck(m: PastMarker, tv: WhyColumn, bz: WhyColumn): string {
  const area = AREA_LABEL[m.area].toLowerCase();
  if (tv.reports && bz.reports) {
    return m.agree
      ? `Đối chiếu: cả Tử Vi và Bát Tự cùng báo động ở mảng ${area} trong cùng một năm, nên mốc được xếp mức ${m.tier === 'manh' ? 'Mạnh' : m.tier === 'vua' ? 'Vừa' : 'Nhẹ'}.`
      : `Đối chiếu: cả hai hệ đều có tín hiệu ở mảng ${area} nhưng chưa cùng nổi bật, nên mốc xếp mức ${m.tier === 'manh' ? 'Mạnh' : m.tier === 'vua' ? 'Vừa' : 'Nhẹ'}.`;
  }
  if (tv.reports) return `Đối chiếu: chỉ Tử Vi báo ở mảng ${area}; Bát Tự không thấy tín hiệu đáng kể, nên mốc chỉ ở mức ${m.tier === 'nhe' ? 'Nhẹ' : 'Vừa'} và độ chắc thấp hơn.`;
  if (bz.reports) return `Đối chiếu: chỉ Bát Tự báo ở mảng ${area}; Tử Vi không thấy tín hiệu đáng kể, nên mốc chỉ ở mức ${m.tier === 'nhe' ? 'Nhẹ' : 'Vừa'} và độ chắc thấp hơn.`;
  return 'Đối chiếu: không hệ nào có tín hiệu đủ rõ ở tầng nền hoặc ngòi cho mảng này.';
}

const TONE_LABEL: Record<number, string> = { 1: 'thuận', 0: 'trung tính', [-1]: 'nghịch' };

export function explainWhy(m: PastMarker, opts: { sensitive?: boolean } = {}): MarkerWhy {
  const sensitive = !!opts.sensitive;
  const tuvi = column('tuvi', m.area, m.signals, sensitive);
  const bazi = column('bazi', m.area, m.signals, sensitive);

  const rows: WhyLearnerRow[] = [...m.signals]
    .sort((a, b) => {
      const o = { goc: 0, nen: 1, ngoi: 2 } as const;
      return o[a.layer] - o[b.layer] || (a.system === b.system ? 0 : a.system === 'tuvi' ? -1 : 1) || Math.abs(b.weight) - Math.abs(a.weight);
    })
    .map(s => ({
      system: s.system,
      layerLabel: LAYER_LABEL[s.layer],
      ruleId: s.ruleId,
      ruleName: s.system === 'tuvi'
        ? (EVENT_TITLE_VN[String(s.param.suKien ?? '')] ?? s.label)
        : s.label,
      where: s.where,
      supports: s.supports,
      weight: s.weight,
      toneLabel: TONE_LABEL[s.tone],
      detail: describeSignal(s),
    }));

  return {
    viewer: { tuvi, bazi, doiChieu: crossCheck(m, tuvi, bazi) },
    learner: {
      rows,
      notes: [
        'Tử Vi: chấm bằng engine "Luận sự kiện năm" của Tuzi (Nam Phái, theo hệ thống Lê Quang Lăng kết hợp phương pháp luận Diệu Xuân); mã quy tắc là mã trong engine đó.',
        'Bát Tự: quy tắc riêng của Tuzi (mã BZ_…), trọng số đang là giá trị thử nghiệm. Quy ước mốc năm là năm ÂM LỊCH, giống cách app lập trụ năm/tháng — phái dùng Lập Xuân có thể ra lưu niên khác ở những năm sát Tết.',
        'Đại vận Bát Tự là xấp xỉ: chiều đi theo giới × âm dương can năm, khởi vận theo số ngày tới tiết gần nhất ÷ 3, tính từ trụ tháng của app.',
        'Dụng/kỵ thần lấy từ cách tính hiện có của app (theo tỷ lệ hành của nhật chủ), chưa xét tháng lệnh — phái khác có thể xác định khác.',
        'Tín hiệu "ngược chiều" làm yếu kết luận và được liệt kê đầy đủ ở đây, không chỉ những gì ủng hộ.',
      ],
    },
  };
}

/** Toàn bộ văn bản phần Vì sao (mức người xem) — để bộ kiểm tra lời văn duyệt trong một lần. */
export function viewerTexts(w: WhyViewer): string[] {
  return [w.tuvi.goc, w.tuvi.nen, w.tuvi.ngoi, w.tuvi.ket, w.bazi.goc, w.bazi.nen, w.bazi.ngoi, w.bazi.ket, w.doiChieu];
}

export { lowerFirst, upperFirst, joinVn };
