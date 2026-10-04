/**
 * PHẦN "VÌ SAO" — lập luận bốn tầng trên hai cột Tử Vi / Bát Tự + dòng đối chiếu. Tên tầng hiển thị cho người dùng:
 * Bẩm sinh (goc) · Giai đoạn 10 năm (nen) · Trong năm (ngoi) · Tóm lại (ket) — xem LAYER_FRIENDLY.
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

export interface WhyFact { label: string; value: string }

export interface WhyLearnerRow {
  system: System;
  /** Tên tầng thân thiện: Bẩm sinh / Giai đoạn 10 năm / Trong năm. */
  layerLabel: string;
  /** Tiêu đề ngắn của tín hiệu, vd "Quả Tú ở cung Phu Thê". */
  title: string;
  /** Mã quy tắc nội bộ — KHÔNG hiển thị cho người dùng, chỉ để đối chiếu/xuất dữ liệu. */
  ruleId: string;
  ruleName: string;
  where: string;
  supports: boolean;
  weight: number;
  toneLabel: string;
  /** Đoạn giải thích chi tiết bằng lời thường. */
  detail: string;
  /** Các dòng "nhãn: giá trị" thân thiện (liên quan đến, vị trí, tác động, mức ảnh hưởng…). */
  facts: WhyFact[];
}

export interface WhyLearner {
  rows: WhyLearnerRow[];
  /** Cách đọc 3 tầng + ghi chú trường phái/chỗ xấp xỉ (hiện ở đầu phần dành cho người học tử vi). */
  notes: string[];
}

export interface MarkerWhy {
  viewer: WhyViewer;
  learner: WhyLearner;
}

/** Tên tầng hiển thị cho người dùng (thay cho Gốc / Nền / Ngòi / Kết). */
export const LAYER_FRIENDLY: Record<Layer | 'ket', string> = {
  goc: 'Bẩm sinh', nen: 'Giai đoạn 10 năm', ngoi: 'Trong năm', ket: 'Tóm lại',
};
const LAYER_HINT: Record<Layer, string> = {
  goc: 'những gì vốn có trong lá số từ khi sinh',
  nen: 'ảnh hưởng của đại vận đang đi qua (khoảng 10 năm)',
  ngoi: 'những yếu tố chỉ xuất hiện riêng trong năm đó',
};
const PALACE_NOTE: Record<string, string> = {
  'Mệnh': 'bản thân, tính cách và hướng đi chung của đời người',
  'Phụ Mẫu': 'cha mẹ, bề trên và sự che chở từ gia đình',
  'Phúc Đức': 'phúc phần, sự thanh thản và nền tảng tinh thần của dòng họ',
  'Điền Trạch': 'nhà cửa, đất đai và tài sản gắn với chỗ ở',
  'Quan Lộc': 'công việc, sự nghiệp và vị thế xã hội',
  'Nô Bộc': 'bạn bè, đồng nghiệp, cấp dưới và các mối quan hệ xã hội',
  'Thiên Di': 'việc đi lại, môi trường bên ngoài và cách người khác nhìn bạn',
  'Tật Ách': 'thể trạng chung và những trở ngại trong cuộc sống',
  'Tài Bạch': 'tiền bạc, thu nhập và cách kiếm – giữ tiền',
  'Tử Tức': 'con cái, người nhỏ tuổi và sự sáng tạo',
  'Phu Thê': 'chuyện vợ chồng, người bạn đời và tình cảm đôi lứa',
  'Huynh Đệ': 'anh chị em, bạn bè thân và người đồng hành ngang hàng',
};
const PILLAR_NOTE: Record<string, string> = {
  'Năm': 'gốc gia đình, ông bà cha mẹ và những năm đầu đời',
  'Tháng': 'môi trường làm việc, nghề nghiệp và cha mẹ',
  'Ngày': 'bản thân bạn và người bạn đời (chi ngày là cung hôn nhân)',
  'Giờ': 'con cái, thành quả về sau và tuổi trung niên trở đi',
};
const REL_NOTE: Record<string, string> = {
  'xung': 'Xung là hai yếu tố đối đầu trực diện, thường gắn với xáo trộn, thay đổi hoặc di chuyển',
  'lục hợp': 'Lục hợp là sự kết nối, hòa hợp, thường gắn với duyên mới hoặc sự hỗ trợ',
  'tam hợp': 'Tam hợp là ba yếu tố cùng hướng, thường gắn với cơ hội gặp gỡ và hợp tác',
  'hình': 'Hình là sự giằng co, ma sát ngầm, thường gắn với áp lực kéo dài',
  'hại': 'Hại là hiềm khích hoặc hao tổn âm thầm, thường gắn với những vướng mắc nhỏ nhưng dai dẳng',
  'phá': 'Phá là sự làm rạn nứt, thường gắn với việc phải sắp xếp lại',
};
const HOA_NAME: Record<string, string> = { HOA_LOC: 'Lộc', HOA_QUYEN: 'Quyền', HOA_KHOA: 'Khoa', HOA_KY: 'Kỵ' };
const NGUON_NOTE: Record<string, string> = {
  NATAL: 'Đây là dấu hiệu có sẵn trong lá số từ khi sinh, nên là nền tính cách và hoàn cảnh chung',
  DA_HAN: 'Đây là dấu hiệu của đại vận, tức ảnh hưởng nền kéo dài suốt khoảng 10 năm của giai đoạn này',
  ANNUAL: 'Đây là dấu hiệu lưu của riêng năm này, chỉ tác động trong phạm vi một năm',
};
const TONE_PLAIN: Record<number, string> = { 1: 'thuận lợi', 0: 'trung tính (không nghiêng hẳn về tốt hay khó)', [-1]: 'nhiều thử thách' };
const SYSTEM_TITLE: Record<System, string> = { tuvi: 'Tử Vi', bazi: 'Bát Tự' };
const BAZI_STAR_MEANING: Record<string, string> = {
  'Dịch Mã': 'chủ về di chuyển, thay đổi chỗ ở hoặc môi trường',
  'Đào Hoa': 'tăng sức hút, dễ có duyên mới',
};

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const upperFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const joinVn = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} và ${xs[xs.length - 1]}`);

/** Tên sao hiển thị: sao mang Tứ Hóa thì ghi rõ "Thái Dương hóa Kỵ" (dữ liệu chỉ lưu tên sao + mã hóa). */
function tuviStarName(s: PastSignal): string {
  const star = String(s.param.sao ?? '');
  const hoa = HOA_NAME[String(s.param.maSao ?? '')];
  return hoa && !star.startsWith('Hóa') ? `${star} hóa ${hoa}` : star;
}

/** Một câu mô tả cho 1 tín hiệu — dùng ĐÚNG các trường của tín hiệu. */
export function describeSignal(s: PastSignal): string {
  if (s.system === 'tuvi') {
    const star = String(s.param.sao ?? '');
    const code = String(s.param.maSao ?? '');
    const dot = s.layer === 'nen' ? ' (giai đoạn 10 năm)' : s.layer === 'ngoi' ? ' (riêng năm đó)' : '';
    if (code === 'TIEU_HAN_FOCUS') return `${star} năm đó rơi vào cung ${s.where} — nên các dấu hiệu ở mảng này dễ thành việc cụ thể trong năm`;
    return `${tuviStarName(s)} tại cung ${s.where}${dot} — ${meaningOf(code)}`;
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
  return parts.length ? `${label}: ${parts.join('; ')}.` : `${label}: ${empty}.`;
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

  const gocS = sentence(LAYER_FRIENDLY.goc, goc.map(describeSignal), 'chưa ghi nhận dấu hiệu bẩm sinh rõ rệt ở mảng này');
  const nenS = sentence(LAYER_FRIENDLY.nen, nen.map(describeSignal), 'giai đoạn 10 năm này không có dấu hiệu rõ rệt ở mảng này');
  const ngoiS = sentence(LAYER_FRIENDLY.ngoi, ngoi.map(describeSignal), 'riêng năm đó không có dấu hiệu rõ rệt ở mảng này');

  let ket: string;
  const tail = sensitive
    ? `nên đây có thể là một năm nặng về mảng ${areaTxt}`
    : `nên mảng ${areaTxt} dễ có biến động trong năm đó`;
  const K = LAYER_FRIENDLY.ket;
  if (nen.length && ngoi.length) ket = `${K}: giai đoạn 10 năm này đã hướng về mảng ${areaTxt}, riêng năm đó lại có thêm dấu hiệu đúng mảng này, ${tail}.`;
  else if (ngoi.length) ket = `${K}: chủ yếu do dấu hiệu riêng của năm đó, còn giai đoạn 10 năm không nhấn vào mảng này, ${tail} nhưng độ chắc thấp hơn.`;
  else if (nen.length) ket = `${K}: giai đoạn 10 năm này có hướng về mảng ${areaTxt} nhưng riêng năm đó chưa có dấu hiệu kích động, nên chỉ là xu hướng nền.`;
  else ket = `${K}: ${SYSTEM_TITLE[system]} không có dấu hiệu đủ rõ để kết luận cho mảng này ở năm đó.`;

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
  return 'Đối chiếu: không hệ nào có dấu hiệu đủ rõ (giai đoạn 10 năm hoặc riêng trong năm) cho mảng này.';
}

const lowerPillar = (s: unknown) => String(s ?? '').toLowerCase();

/** Đoạn giải thích Bát Tự bằng lời thường — mỗi quy tắc BZ_* một mẫu, ghép từ đúng tham số của tín hiệu. */
function baziDetail(s: PastSignal): string {
  const p = s.param;
  const id = s.ruleId;
  const god = p.thapThan ? String(p.thapThan) : '';
  const said = god && THAP_THAN_MEANING[god as ThapThan] ? THAP_THAN_MEANING[god as ThapThan] : '';
  const yr = s.where.replace(/^lưu niên /, 'năm ').split(' ↔ ')[0];
  const luck = s.where;
  // "Năm Ất Tị có can Ất là Thiên Tài — nhóm sao nói về …"
  const flowGod = `${upperFirst(yr)} có ${p.nguon ? `${String(p.nguon)} của năm` : 'năm'} là ${god}${said ? ` — nhóm sao nói về ${said}` : ''}.`;
  const luckGod = `${upperFirst(luck)} mang ${god}${said ? ` — nhóm sao nói về ${said}` : ''}.`;

  if (id === 'BZ_WEA_ROOT') {
    return `Trong tứ trụ của bạn có ${p.soTaiTinh} Tài tinh (nguồn tiền bạc). Hành có lợi cho bạn (dụng thần) là ${p.dungThan || 'chưa rõ'}, hành bất lợi (kỵ thần) là ${p.kyThan || 'chưa rõ'}. Đây là cơ sở để xem một năm thuận hay bất lợi cho tiền bạc; bản thân dòng này không cộng điểm.`;
  }
  if (id.endsWith('_ROOT')) {
    const tru = lowerPillar(p.tru);
    const who = god === 'Nhật Chủ' ? 'đây chính là bản thân bạn (Nhật Chủ)' : god ? `can của trụ là ${god}` : '';
    return `Trụ ${tru} của bạn là ${p.can} ${p.chi}${who ? ` — ${who}` : ''}. Trụ ${tru} đại diện cho ${PILLAR_NOTE[String(p.tru)] ?? 'một phần đời sống của bạn'}. Tuzi dùng trụ này làm điểm tựa để so với năm đang xét; bản thân nó không cộng điểm.`;
  }
  if (p.quanHe) {
    const tru = lowerPillar(p.tru);
    const rel = String(p.quanHe);
    return `Chi ${p.chiLuuNien} của ${yr} ${rel} với chi ${p.chiTru} ở trụ ${tru} của bạn. Trụ ${tru} đại diện cho ${PILLAR_NOTE[String(p.tru)] ?? 'một phần đời sống của bạn'}. ${REL_NOTE[rel] ?? ''}.`.replace(/\.\.$/, '.');
  }
  switch (id) {
    case 'BZ_CAR_OFFICIAL':
      return `${flowGod} Nhóm Quan/Sát gắn với công việc, cấp trên và áp lực trách nhiệm, nên năm này dễ có thay đổi về vai trò hoặc môi trường làm việc.`;
    case 'BZ_CAR_HURT':
      return `${flowGod} Thương Quan gắn với sự phá cách và phản biện, nên năm này dễ nảy ý muốn thay đổi hoặc có va chạm trong công việc.`;
    case 'BZ_LOV_SPOUSE_M':
      return `${flowGod} Với nam giới, Tài tinh còn tượng trưng cho người vợ hoặc người bạn gái, nên năm này chuyện tình cảm dễ có điều đáng chú ý.`;
    case 'BZ_LOV_SPOUSE_F':
      return `${flowGod} Với nữ giới, Quan tinh còn tượng trưng cho người chồng hoặc người bạn trai, nên năm này chuyện tình cảm dễ có điều đáng chú ý.`;
    case 'BZ_HOM_HORSE': case 'BZ_LOV_PEACH': {
      const star = String(p.sao);
      return `Chi ${p.chi} của ${yr} trùng vị trí ${star} trong lá số của bạn. ${star} ${BAZI_STAR_MEANING[star] ?? 'là một sao phụ đáng chú ý'}.`;
    }
    case 'BZ_WEA_FAV':
      return `${upperFirst(yr)} có Tài tinh là ${god}${said ? ` (nhóm sao nói về ${said})` : ''}, thuộc hành ${p.hanh}. Hành này là ${p.vai} của bạn nên thuận cho tiền bạc, dễ có cơ hội tăng thu nhập hoặc tích lũy.`;
    case 'BZ_WEA_UNFAV':
      return `${upperFirst(yr)} có Tài tinh là ${god}${said ? ` (nhóm sao nói về ${said})` : ''}, thuộc hành ${p.hanh}. Hành này là ${p.vai} của bạn nên chuyện tiền bạc dễ nhiều áp lực hơn, cần thận trọng chi tiêu và đầu tư.`;
    case 'BZ_WEA_ROB':
      return `${upperFirst(yr)} có ${god}${said ? ` (nhóm sao nói về ${said})` : ''}. Đây là nhóm "anh em" dễ chia phần hoặc tranh phần tài lộc; vì lá số của bạn có Tài tinh nên tiền bạc có thể bị san sẻ hoặc cạnh tranh.`;
    case 'BZ_FAM_SEAL_HURT':
      return `${upperFirst(yr)} có Tài tinh là ${god}. Tài khắc Ấn mà Ấn tượng trưng cho mẹ và sự bảo bọc, nên chuyện gia đình và người lớn tuổi trong nhà dễ cần để tâm hơn.`;
    case 'BZ_CAR_LUCK_OFFICIAL':
      return `${luckGod} Nhóm Quan/Sát/Thương Quan gắn với công việc, nên cả giai đoạn dễ nhiều thay đổi về sự nghiệp.`;
    case 'BZ_LOV_LUCK_SPOUSE_M': case 'BZ_LOV_LUCK_SPOUSE_F':
      return `${luckGod} Đây còn là sao tượng trưng cho người bạn đời, nên cả giai đoạn dễ có nhiều chuyện tình cảm.`;
    case 'BZ_WEA_LUCK_STAR':
      return `${luckGod} Tài tinh gắn với tiền bạc, nên cả giai đoạn tiền bạc là một chủ đề lớn.`;
    case 'BZ_FAM_LUCK_SEAL':
      return `${luckGod} Ấn tinh là sự bảo bọc, che chở, nên nền gia đình có phần vững hơn.`;
    case 'BZ_HOM_LUCK_HORSE':
      return `Chi ${p.chi} của ${luck} trùng vị trí Dịch Mã, ${BAZI_STAR_MEANING['Dịch Mã']}; cả giai đoạn 10 năm này dễ có di chuyển hoặc thay đổi.`;
    default:
      return `${describeSignal(s)}.`;
  }
}

/** Đoạn giải thích Tử Vi bằng lời thường. */
function tuviDetail(s: PastSignal): string {
  const code = String(s.param.maSao ?? '');
  const palace = s.where;
  const note = PALACE_NOTE[palace];
  const loc = note ? `cung ${palace} (cung nói về ${note})` : `cung ${palace}`;
  if (code === 'TIEU_HAN_FOCUS') {
    return `Tiểu Hạn (cung hạn của riêng năm đó) rơi vào ${loc}. Vì vậy các chủ đề của cung này được kích hoạt trong năm, nên những dấu hiệu khác ở cùng mảng dễ trở thành việc cụ thể.`;
  }
  const nguon = NGUON_NOTE[String(s.param.nguon ?? '')];
  return `${tuviStarName(s)} nằm ở ${loc}. ${nguon ? `${nguon}. ` : ''}Ý nghĩa của dấu hiệu này: ${meaningOf(code)}.`;
}

export function friendlyLabel(label: string): string {
  return label
    .replace(/ chi (năm|tháng|ngày)$/, ' chi trụ $1')
    .replace(/^Lưu niên/, 'Năm này')
    .replace(/^Chi lưu niên/, 'Chi của năm')
    .replace(/^Đại vận/, 'Giai đoạn 10 năm (đại vận)')
    .replace(/^Tài lưu niên/, 'Tài tinh của năm');
}

function influenceLevel(weight: number, maxW: number): string {
  if (weight <= 0) return 'chỉ để giải thích bối cảnh, không cộng điểm';
  const r = maxW > 0 ? weight / maxW : 0;
  return r >= 0.67 ? 'lớn trong mốc này' : r >= 0.34 ? 'vừa' : 'nhỏ';
}

interface SignalGroup { main: PastSignal; topics: string[] }

/** Một sao/quy tắc có thể phục vụ nhiều sự kiện cùng mảng → gộp thành MỘT dòng, nối các chủ đề liên quan. */
function mergeSameSignal(sorted: PastSignal[]): SignalGroup[] {
  const out: SignalGroup[] = [];
  const idx = new Map<string, SignalGroup>();
  for (const s of sorted) {
    const topic = s.system === 'tuvi' ? (EVENT_TITLE_VN[String(s.param.suKien ?? '')] ?? s.label) : friendlyLabel(s.label);
    const key = s.system === 'tuvi'
      ? `tv|${s.layer}|${s.param.maSao}|${s.param.sao}|${s.where}|${s.param.nguon}|${s.supports}`
      : `bz|${s.ruleId}|${s.where}|${s.supports}`;
    const hit = idx.get(key);
    if (hit) {
      if (!hit.topics.includes(topic)) hit.topics.push(topic);
      if (Math.abs(s.weight) > Math.abs(hit.main.weight)) hit.main = s;
    } else {
      const g = { main: s, topics: [topic] };
      idx.set(key, g);
      out.push(g);
    }
  }
  return out;
}

function learnerRow(s: PastSignal, maxW: number, topics: string[]): WhyLearnerRow {
  const tuvi = s.system === 'tuvi';
  const ruleName = topics.join(', ');
  const isTieuHan = String(s.param.maSao ?? '') === 'TIEU_HAN_FOCUS';
  const title = tuvi
    ? (isTieuHan ? `Tiểu Hạn năm đó ở cung ${s.where}` : `${tuviStarName(s)} ở cung ${s.where}`)
    : ruleName;
  const position = tuvi
    ? `cung ${s.where}${PALACE_NOTE[s.where] ? ` (${PALACE_NOTE[s.where]})` : ''}`
    : s.where.replace(/^lưu niên /, 'năm ').replace(/^đại vận /, 'đại vận ');
  const facts: WhyFact[] = [
    { label: 'Thuộc tầng', value: `${LAYER_FRIENDLY[s.layer]} — ${LAYER_HINT[s.layer]}` },
    { label: topics.length > 1 ? 'Liên quan đến các việc' : 'Liên quan đến', value: ruleName },
    { label: 'Vị trí', value: position },
  ];
  if (s.weight > 0) {
    facts.push({ label: 'Tác động', value: TONE_PLAIN[s.tone] });
    facts.push({
      label: 'Hướng',
      value: s.supports ? 'góp phần cho thấy năm này có thể có biến động ở mảng này' : 'ngược chiều — làm giảm khả năng đó',
    });
  }
  facts.push({ label: 'Mức ảnh hưởng', value: influenceLevel(s.weight, maxW) });

  return {
    system: s.system,
    layerLabel: LAYER_FRIENDLY[s.layer],
    title,
    ruleId: s.ruleId,
    ruleName,
    where: position,
    supports: s.supports,
    weight: s.weight,
    toneLabel: TONE_PLAIN[s.tone],
    detail: tuvi ? tuviDetail(s) : baziDetail(s),
    facts,
  };
}

export function explainWhy(m: PastMarker, opts: { sensitive?: boolean } = {}): MarkerWhy {
  const sensitive = !!opts.sensitive;
  const tuvi = column('tuvi', m.area, m.signals, sensitive);
  const bazi = column('bazi', m.area, m.signals, sensitive);

  const maxW = m.signals.reduce((a, s) => Math.max(a, Math.abs(s.weight)), 0);
  const rows: WhyLearnerRow[] = mergeSameSignal([...m.signals]
    .sort((a, b) => {
      const o = { goc: 0, nen: 1, ngoi: 2 } as const;
      return o[a.layer] - o[b.layer] || (a.system === b.system ? 0 : a.system === 'tuvi' ? -1 : 1) || Math.abs(b.weight) - Math.abs(a.weight);
    }),
  ).map(g => learnerRow(g.main, maxW, g.topics));

  return {
    viewer: { tuvi, bazi, doiChieu: crossCheck(m, tuvi, bazi) },
    learner: {
      rows,
      notes: [
        `Cách đọc: "${LAYER_FRIENDLY.goc}" là ${LAYER_HINT.goc}; "${LAYER_FRIENDLY.nen}" là ${LAYER_HINT.nen}; "${LAYER_FRIENDLY.ngoi}" là ${LAYER_HINT.ngoi}.`,
        'Tử Vi: Tuzi luận theo Nam Phái (hệ thống Lê Quang Lăng kết hợp phương pháp Diệu Xuân), dựa trên các sao, cung và Tứ Hóa liên quan đến năm này.',
        'Bát Tự: Tuzi dùng bộ quy tắc riêng; mức điểm hiện đang ở giai đoạn thử nghiệm và sẽ được tinh chỉnh dần.',
        'Năm trong Bát Tự được tính theo năm âm lịch (từ mùng 1 Tết), giống cách app lập lá số. Một số trường phái tính theo tiết Lập Xuân nên ở những năm sát Tết có thể ra kết quả khác.',
        'Đại vận Bát Tự là cách tính xấp xỉ: chiều đi theo giới tính và âm dương của năm sinh, tuổi khởi vận tính theo số ngày đến tiết khí gần nhất.',
        'Dụng thần / kỵ thần lấy theo cách tính hiện có của app (theo tỷ lệ ngũ hành của nhật chủ), chưa xét tháng sinh nên trường phái khác có thể xác định khác.',
        'Dấu hiệu ghi "ngược chiều" là những điều làm giảm khả năng có biến động; Tuzi liệt kê đầy đủ để bạn tự cân nhắc.',
      ],
    },
  };
}

/** Toàn bộ văn bản phần Vì sao (mức người xem) — để bộ kiểm tra lời văn duyệt trong một lần. */
export function viewerTexts(w: WhyViewer): string[] {
  return [w.tuvi.goc, w.tuvi.nen, w.tuvi.ngoi, w.tuvi.ket, w.bazi.goc, w.bazi.nen, w.bazi.ngoi, w.bazi.ket, w.doiChieu];
}

export { lowerFirst, upperFirst, joinVn };
