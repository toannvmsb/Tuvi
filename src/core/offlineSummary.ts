/**
 * TÓM TẮT NÂNG CAO (offline) cho 4 loại phân tích: Toàn lá số · Đại vận · Tiểu vận · Nguyệt vận.
 *
 * Mỗi bản tóm tắt là 1 trang "nắm nhanh": nhãn đánh giá chung, điểm sáng / điểm cần lưu ý,
 * giai đoạn đang xét và vài việc nên làm — lấy từ CÙNG dữ liệu/điểm số với phần "Phân tích chi
 * tiết" (computeSixDomainScores, scoreDaiVan/TieuVan/NguyetVan, nguyetVanDetail, phiHoa) nên
 * không mâu thuẫn với bản chi tiết. Nam Phái: chỉ nói sao TỌA THỦ + tam hợp/xung chiếu; không
 * "Mệnh chủ/Thân chủ"; Tuần/Triệt chỉ nói cho đúng cung có ghi nhận (không lan qua tam hợp).
 * Không phán tuyệt đối — chỉ xu hướng, mức thuận lợi/rủi ro, hành động.
 */
import type { AstrologyResult, TuViHouse } from '../types';
import { computeSixDomainScores } from './offlineLuanGiai';
import { detectCachCucInPalace } from '../data/cachCuc';
import { getStarInfo } from '../data/starInfo';
import { aggregatePhiHoa, luuTuHoaPositions } from './phiHoa';
import { scoreDaiVan, type DaiVanScore } from './daiVanScore';
import { scoreTieuVan, type TieuVanScore } from './tieuVanScore';
import { scoreNguyetVan, scoreAllNguyetVan, nguyetVanDetail } from './nguyetVanScore';

type Relation = 'sinhNhap' | 'dongHanh' | 'khacXuat' | 'sinhXuat' | 'khacNhap';

const RELATE_SHORT: Record<Relation, string> = {
  sinhNhap: 'được môi trường nâng đỡ',
  dongHanh: 'hòa hợp, ổn định',
  khacXuat: 'phải vượt cản trở, vất vả nhưng làm chủ được',
  sinhXuat: 'tốn sức nuôi hoàn cảnh, cần tiết chế',
  khacNhap: 'hoàn cảnh chèn ép, nên thủ thế',
};
const NHAN_HOA_SHORT: Record<string, string> = {
  cao: 'rất hợp với bản mệnh',
  kha: 'khá hợp bản mệnh',
  binh: 'trung tính với bản mệnh',
  kem: 'dễ "trái tay" với bản mệnh',
};

const DOMAIN_LABEL: Record<string, string> = {
  career: 'Sự nghiệp', relationship: 'Quan hệ – tình cảm', health: 'Sức khỏe',
  property: 'Tài sản – nhà đất', opportunity: 'Cơ hội',
};

const chinhNames = (h?: TuViHouse) => (h ? h.stars.filter(s => s.type === 'chinh').map(s => s.name) : []);
const chinhWithBright = (h?: TuViHouse) =>
  (h ? h.stars.filter(s => s.type === 'chinh').map(s => (s.brightness ? `${s.name} (${s.brightness})` : s.name)) : []);
const firstSentence = (s: string, max = 140) => {
  const t = (s || '').replace(/\s+/g, ' ').trim();
  const cut = t.search(/[.;]/);
  const one = cut > 20 ? t.slice(0, cut + 1) : t;
  const clipped = one.length > max ? one.slice(0, max - 1).trimEnd() + '…' : one;
  return clipped.replace(/[;,]$/, '.');
};

/** Hai/ba mảng điểm cao nhất & thấp nhất trong bảng domain (career…opportunity). */
function topBottomDomains(d: Record<string, number>, topN = 2) {
  const keys = ['career', 'relationship', 'health', 'property', 'opportunity'].filter(k => typeof d[k] === 'number');
  const sorted = [...keys].sort((a, b) => d[b] - d[a]);
  return { top: sorted.slice(0, topN), low: sorted[sorted.length - 1] };
}

function ratingTone(rating: string): 'good' | 'mid' | 'low' {
  return rating === 'Rất tốt' || rating === 'Tốt' ? 'good' : rating === 'Nhiều thách thức' ? 'low' : 'mid';
}

/** 3 việc nên làm theo mức vận + mảng nổi bật / yếu nhất (dùng chung cho đại/tiểu vận). */
function actionsByTone(tone: 'good' | 'mid' | 'low', topKeys: string[], lowKey: string, scope: 'giai đoạn' | 'năm' | 'tháng'): string[] {
  const top = topKeys.map(k => DOMAIN_LABEL[k] ?? k).join(' và ');
  const low = DOMAIN_LABEL[lowKey] ?? lowKey;
  if (tone === 'good') {
    return [
      `Chủ động nắm cơ hội ở ${top} — đây là mảng được vận ${scope} này nâng đỡ nhất.`,
      `Đặt mục tiêu cụ thể cho ${scope} và bắt tay làm sớm, đừng chờ "đủ điều kiện".`,
      `Giữ khiêm tốn, không đầu tư dàn trải; riêng ${low} cần theo dõi sát hơn.`,
    ];
  }
  if (tone === 'low') {
    return [
      `Thủ thế, củng cố nền tảng; tránh quyết định lớn, vay nợ hay đầu tư mạo hiểm trong ${scope} này.`,
      `Dồn sức vào ${top} — mảng còn giữ được thế tốt nhất — để giữ nhịp.`,
      `${low} là mảng yếu nhất: phòng ngừa chủ động, chuẩn bị phương án dự phòng.`,
    ];
  }
  return [
    `Tiến từng bước vững vàng, ưu tiên ${top}.`,
    `Cân nhắc kỹ trước các quyết định lớn; có thể làm nhưng nên chia nhỏ, kiểm tra từng bước.`,
    `${low} cần chú ý thêm — đừng để mảng này kéo chậm các mảng còn lại.`,
  ];
}

const headline = (label: string, rating: string, extra: string) => `**${label}:** ${rating}${extra ? ` — ${extra}` : ''}`;

// ════════════════════════════════════════════════════════════════
//  1. TOÀN LÁ SỐ
// ════════════════════════════════════════════════════════════════
export function summarizeOfflineFullChart(result: AstrologyResult): string {
  const c = result.tuViChart;
  const menh = c.houses.find(h => h.isManh);
  const than = c.houses.find(h => h.isThan);
  const out: string[] = [];

  out.push('# Tóm tắt lá số', '');
  out.push(
    `**Hồ sơ nhanh:** Bản Mệnh ${c.napAmMenh} · Cục ${c.cucName} · lá số ${c.amDuongThuanLy === 'thuận' ? 'Thuận Lý' : 'Nghịch Lý'}` +
    (menh ? ` · Mệnh tại ${menh.branch}` : '') + (than ? `, Thân tại ${than.branch}` : '') + '.',
  );
  out.push('');

  // ── Cốt cách (sao tọa thủ cung Mệnh) ──
  out.push('# Cốt cách & tính cách');
  const mNames = chinhNames(menh);
  if (mNames.length) {
    out.push(`- **Chính tinh tọa thủ cung Mệnh:** ${chinhWithBright(menh).join(', ')}.`);
    for (const n of mNames.slice(0, 2)) {
      const info = getStarInfo(n);
      const line = info?.byPalace?.['Mệnh'] || info?.basic;
      if (line) out.push(`- **${n} tại Mệnh:** ${firstSentence(line, 170)}`);
    }
  } else {
    out.push('- Cung Mệnh **vô chính diệu** — cốt cách linh hoạt, thay đổi theo môi trường; xét thêm sao từ cung xung chiếu (Thiên Di).');
  }
  if (menh && (menh.tuanAt || menh.trietAt)) {
    out.push(`- Cung Mệnh có ${[menh.tuanAt ? 'Tuần' : '', menh.trietAt ? 'Triệt' : ''].filter(Boolean).join(' và ')} — làm giảm bớt lực của các sao tại cung này.`);
  }
  if (menh) {
    const ca = detectCachCucInPalace(menh.stars.filter(s => s.type !== 'luu').map(s => s.name), menh.branch, menh.palaceName);
    const tot = ca.filter(x => x.good).map(x => x.name);
    if (tot.length) out.push(`- **Cách cục tốt hội Mệnh:** ${tot.slice(0, 3).join(', ')}.`);
  }
  out.push('');

  // ── Sáu mảng cuộc đời ──
  const s = computeSixDomainScores(result);
  const areas = [
    { k: 'Phúc khí', v: s.phuc, why: s.phucLyDo },
    { k: 'Tài khí', v: s.tai, why: s.taiLyDo },
    { k: 'Quan khí (sự nghiệp)', v: s.quan, why: s.quanLyDo },
    { k: 'Điền khí (nhà đất)', v: s.dien, why: s.dienLyDo },
    { k: 'Hôn nhân', v: s.hon, why: s.honLyDo },
    { k: 'Sức khỏe', v: s.skh, why: s.skhLyDo },
  ];
  out.push('# Sáu mảng cuộc đời (điểm /10)');
  for (const a of areas) out.push(`- **${a.k}:** ${a.v}/10 — ${a.why}.`);
  const best = areas.reduce((m, a) => (a.v > m.v ? a : m), areas[0]);
  const worst = areas.reduce((m, a) => (a.v < m.v ? a : m), areas[0]);
  const avg = areas.reduce((t, a) => t + a.v, 0) / areas.length;
  out.push('');
  out.push(`**Nhận định chung:** điểm trung bình ${avg.toFixed(1)}/10 — ` +
    (avg >= 7 ? 'nền lá số vững, nhiều thuận lợi.' : avg >= 5.5 ? 'khá đầy đủ, có lên có xuống nhưng không rơi đáy.' : avg >= 4 ? 'trung bình, cần dụng công cải thiện từng mảng.' : 'thiên về thử thách, cần ý chí và sự chuẩn bị kỹ hơn.'));
  out.push(`- ✅ **Điểm tựa:** ${best.k} (${best.v}/10) — nên đầu tư mạnh vào mảng này.`);
  out.push(`- ⚠ **Cần lưu ý nhất:** ${worst.k} (${worst.v}/10) — quản lý rủi ro, đừng kỳ vọng quá cao.`);
  const { nutThat } = aggregatePhiHoa(c);
  if (nutThat) out.push(`- 🔎 **Nút thắt (Phi Hóa):** cung ${nutThat.palace} nhận nhiều Hóa Kỵ — chủ động phòng ngừa thay vì né tránh.`);
  out.push('');

  // ── Giai đoạn hiện tại ──
  const viewingAge = c.viewingAge;
  const dv = result.daiVans.find(d => viewingAge != null && viewingAge >= d.startAge && viewingAge <= d.endAge);
  if (dv) {
    const sc = scoreDaiVan(result, dv);
    out.push('# Giai đoạn đang đi (Đại vận)');
    out.push(`- **Đại vận ${sc.label} tuổi (${dv.stem} ${dv.branch}), cung ${sc.palaceName}:** ${sc.rating} — Tài lộc ${sc.taiLoc}, Thách thức ${sc.thachThuc}.`);
      out.push('');
  }

  // ── Ưu tiên hành động ──
  out.push('# 3 ưu tiên hành động');
  out.push(`1. Xây cuộc đời quanh **${best.k}** — đó là chỗ lá số cho bạn nhiều lực nhất.`);
  out.push(`2. Với **${worst.k}**: ${worst.v <= 4 ? 'đặt thành ưu tiên phòng ngừa, có kế hoạch dự phòng rõ ràng' : 'theo dõi định kỳ, không để thành điểm nghẽn'}.`);
  out.push('3. Bám nhịp đại vận: dồn lực khi vận thuận, thủ thế khi vận nhiều thách thức; xem phần chi tiết bên dưới để biết từng cung.');
  out.push('', '_Tóm tắt mang tính tham khảo theo Nam Phái; chi tiết từng cung ở phần Phân tích chi tiết._');
  return out.join('\n');
}

// ════════════════════════════════════════════════════════════════
//  2. ĐẠI VẬN
// ════════════════════════════════════════════════════════════════
export function summarizeOfflineDaiVan(result: AstrologyResult, dvIndex: number): string {
  const dv = result.daiVans.find(d => d.index === dvIndex);
  if (!dv) return '_Không tìm thấy đại vận này._';
  const sc: DaiVanScore = scoreDaiVan(result, dv);
  const h = result.tuViChart.houses.find(x => x.branch === dv.branch);
  const tone = ratingTone(sc.rating);
  const { top, low } = topBottomDomains(sc as any);
  const out: string[] = [];

  out.push(`# Tóm tắt đại vận ${sc.label} tuổi (${dv.stem} ${dv.branch})`, '');
  out.push(headline('Đánh giá chung', sc.rating, `Tài lộc ${sc.taiLoc} · Thách thức ${sc.thachThuc}`));
  out.push(`**Đóng tại cung:** ${sc.palaceName} (${dv.branch})${chinhNames(h).length ? ` — chính tinh: ${chinhWithBright(h).join(', ')}` : ' — vô chính diệu'}.`);
  if (h && (h.tuanAt || h.trietAt)) out.push(`Cung này có ${[h.tuanAt ? 'Tuần' : '', h.trietAt ? 'Triệt' : ''].filter(Boolean).join(' và ')}.`);
  out.push('');

  out.push('# Ba yếu tố nền');
  out.push(`- **Thiên thời** (vận so với năm sinh): ${RELATE_SHORT[sc.thienThoi]}.`);
  out.push(`- **Địa lợi** (vận so với cung Mệnh): ${RELATE_SHORT[sc.diaLoi]}.`);
  out.push(`- **Nhân hòa** (bộ sao vận so với bộ Mệnh): ${NHAN_HOA_SHORT[sc.nhanHoa]}.`);
  out.push('');

  out.push('# Điểm cốt lõi của 10 năm này');
  out.push(`- ✅ **Mảng thuận nhất:** ${top.map(k => `${DOMAIN_LABEL[k]} ${(sc as any)[k]}`).join(' · ')}.`);
  out.push(`- ⚠ **Mảng cần lưu ý:** ${DOMAIN_LABEL[low]} ${(sc as any)[low]}${sc.volatility >= 65 ? ' · biến động cao, nhiều bước ngoặt' : ''}.`);
  out.push(`- ${tone === 'good' ? 'Nhìn chung vận này có lợi — có thể chủ động hơn bình thường.' : tone === 'low' ? 'Nhìn chung vận này nhiều thử thách — ưu tiên giữ vững và phòng ngừa.' : 'Nhìn chung vận này ở mức trung bình — tiến chắc, không vội.'}`);
  out.push('');

  out.push('# 3 việc nên làm trong đại vận này');
  actionsByTone(tone, top, low, 'giai đoạn').forEach((t, i) => out.push(`${i + 1}. ${t}`));
  out.push('', '_Tóm tắt mang tính tham khảo; xem phần Phân tích chi tiết để biết từng giai đoạn nhỏ trong đại vận._');
  return out.join('\n');
}

// ════════════════════════════════════════════════════════════════
//  3. TIỂU VẬN
// ════════════════════════════════════════════════════════════════
export function summarizeOfflineTieuVan(result: AstrologyResult, age: number): string {
  const tv = result.tieuVans.find(x => x.age === age);
  if (!tv) return '_Không tìm thấy tiểu vận này._';
  const sc: TieuVanScore = scoreTieuVan(result, tv);
  const h = result.tuViChart.houses.find(x => x.branch === tv.branch);
  const dv = result.daiVans[tv.daiVanIndex];
  const dvSc = dv ? scoreDaiVan(result, dv) : null;
  const tone = ratingTone(sc.rating);
  const { top, low } = topBottomDomains(sc as any);
  const out: string[] = [];

  out.push(`# Tóm tắt tiểu vận năm ${tv.year} (${tv.stem} ${tv.branch}, ${age} tuổi)`, '');
  out.push(headline('Đánh giá chung', sc.rating, `Tài lộc ${sc.taiLoc} · Thách thức ${sc.thachThuc}`));
  out.push(`**Cung tiểu hạn:** ${sc.palaceName} (${tv.branch})${chinhNames(h).length ? ` — chính tinh: ${chinhWithBright(h).join(', ')}` : ' — vô chính diệu'}.`);
  if (dvSc) out.push(`**Bối cảnh đại vận:** ${dvSc.label} tuổi (${dvSc.rating}) — ${dvSc.rating === 'Rất tốt' || dvSc.rating === 'Tốt' ? 'nền đại vận đỡ lưng cho năm này' : dvSc.rating === 'Nhiều thách thức' ? 'nền đại vận làm năm này khó phát huy, nên thận trọng' : 'nền đại vận ở mức trung bình'}.`);
  out.push('');

  out.push('# Ba yếu tố nền');
  out.push(`- **Thiên thời:** ${RELATE_SHORT[sc.thienThoi]}.`);
  out.push(`- **Địa lợi:** ${RELATE_SHORT[sc.diaLoi]}.`);
  out.push(`- **Nhân hòa:** ${NHAN_HOA_SHORT[sc.nhanHoa]}.`);
  out.push('');

  out.push('# Điểm cốt lõi của năm');
  out.push(`- ✅ **Mảng thuận nhất:** ${top.map(k => `${DOMAIN_LABEL[k]} ${(sc as any)[k]}`).join(' · ')}.`);
  out.push(`- ⚠ **Mảng cần lưu ý:** ${DOMAIN_LABEL[low]} ${(sc as any)[low]}${sc.volatility >= 65 ? ' · năm nhiều biến động' : ''}.`);
  const luuHoa = luuTuHoaPositions(result.tuViChart, tv.yearStem);
  if (luuHoa.length) out.push(`- **Lưu Tứ Hóa năm (can ${tv.yearStem}):** ${luuHoa.map(p => `${p.hoa} ${p.star}→${p.palace}`).join(' · ')}.`);
  out.push('');

  // Tháng thuận / cần thận trọng
  try {
    const months = scoreAllNguyetVan(result, age).map(m => ({ m: m.month, net: m.taiLoc - m.thachThuc }));
    if (months.length) {
      const sorted = [...months].sort((a, b) => b.net - a.net);
      out.push('# Nhịp các tháng (âm lịch)');
      out.push(`- ✅ **Thuận lợi hơn:** tháng ${sorted.slice(0, 3).map(x => x.m).sort((a, b) => a - b).join(', ')}.`);
      out.push(`- ⚠ **Nên thận trọng hơn:** tháng ${sorted.slice(-3).map(x => x.m).sort((a, b) => a - b).join(', ')}.`);
      out.push('');
    }
  } catch { /* thiếu dữ liệu tháng → bỏ qua phần này */ }

  out.push('# Kế hoạch hành động cho năm');
  actionsByTone(tone, top, low, 'năm').forEach((t, i) => out.push(`${i + 1}. ${t}`));
  out.push('', '_Tiểu vận là kế hoạch 1 năm, không phải định mệnh cố định. Xem Phân tích chi tiết để biết từng cung và từng tháng._');
  return out.join('\n');
}

// ════════════════════════════════════════════════════════════════
//  4. NGUYỆT VẬN
// ════════════════════════════════════════════════════════════════
export function summarizeOfflineNguyetVan(result: AstrologyResult, age: number, month: number): string {
  const sc = scoreNguyetVan(result, age, month);
  const dt = nguyetVanDetail(result, age, month);
  if (!sc || !dt) return '_Chưa đủ dữ liệu để tóm tắt tháng này._';
  const tv = result.tieuVans.find(x => x.age === age);
  const out: string[] = [];

  out.push(`# Tóm tắt nguyệt vận tháng ${month} (${dt.monthCan ? `${dt.monthCan} ` : ''}${dt.branch})`, '');
  out.push(headline('Đánh giá chung', sc.rating, `Tài lộc ${sc.taiLoc} · Thách thức ${sc.thachThuc}`));
  out.push(`**Cung lưu nguyệt:** ${dt.palaceName} (${dt.branch})${dt.chinhTinh.length ? ` — chính tinh: ${dt.chinhTinh.join(', ')}` : ' — vô chính diệu'}.`);
  if (tv) out.push(`**Thuộc:** tiểu vận năm ${tv.year} — tháng này chỉ là lớp kích hoạt thêm cho đại vận và tiểu vận, không phải dự đoán số mệnh trong tháng.`);
  out.push('');

  const themes = [...dt.themes].sort((a, b) => b.score - a.score);
  const strong = themes.slice(0, 2);
  const weak = themes.slice(-2).reverse();
  out.push('# Điểm cốt lõi của tháng');
  out.push(`- ✅ **Thuận nhất:** ${strong.map(t => `${t.label} ${t.score}/10 (${t.status})`).join(' · ')}.`);
  const weakShow = weak.filter(t => t.score <= 6);
  out.push(weakShow.length
    ? `- ⚠ **Cần để ý:** ${weakShow.map(t => `${t.label} ${t.score}/10 (${t.status})`).join(' · ')}.`
    : '- ⚠ **Cần để ý:** không mảng nào thấp rõ rệt — giữ nhịp ổn định.');
  const kich = themes.filter(t => t.activation).slice(0, 2);
  if (kich.length) out.push(`- 🎯 **Cung được kích hoạt:** ${kich.map(t => `${t.palace} (${t.activation})`).join(', ')}.`);
  if (dt.luuHoa.length) {
    out.push(`- **Lưu Tứ Hóa tháng:** ${dt.luuHoa.map(p => `${p.hoa} ${p.star}→${p.palace}`).join(' · ')}.`);
  }
  out.push('');

  out.push('# 3 việc nên làm trong tháng');
  const acts = [strong[0]?.action, strong[1]?.action, (weak[0]?.score ?? 10) <= 6 ? weak[0]?.action : undefined].filter((x): x is string => !!x);
  acts.forEach((t, i) => out.push(`${i + 1}. ${t}`));
  if (!acts.length) out.push('1. Giữ nhịp sinh hoạt ổn định; tập trung việc đang dở trước khi mở việc mới.');
  out.push('', '_Tóm tắt mang tính tham khảo; chi tiết từng chủ đề và từng tuần ở phần Phân tích chi tiết._');
  return out.join('\n');
}
