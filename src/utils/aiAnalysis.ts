/**
 * Phân tích AI cho MỘT CUNG (chỉ các sao trong cung đó), miễn phí,
 * không cần API key. Dùng Pollinations OpenAI-compatible endpoint.
 *
 * Phân tích toàn bộ lá số sẽ là chức năng riêng ở màn hình khác.
 *
 * Lỗi mạng/timeout → ném Error('OFFLINE') để hiển thị thông báo.
 */

import type { AstrologyResult, TuViHouse } from '../types';
import { supabase } from '../lib/supabase';
import { getStarInfo } from '../data/starInfo';
import { detectCachCucInPalace } from '../data/cachCuc';
import { scoreDaiVan } from '../core/daiVanScore';
import { scoreTieuVan } from '../core/tieuVanScore';
import { scoreNguyetVan, nguyetVanBranch, nguyetVanDetail } from '../core/nguyetVanScore';
import { careerProfile } from '../data/careerByStar';
import { summarizeBatTuAdvanced, computeThapThan, hyThanOf } from '../core/thapThan';
import { analyzePhongThuyBatTu } from '../core/phongThuyBatTu';
import { scoreNhatVan, generateNhatVanOffline } from '../core/nhatVan';
import { DAY_PICK_GROUPS, NUMBER_GROUP_CODE } from '../data/dayPickTasks';
import { luuStarsTamPhuong, luuSummary, yearVsTuoi } from '../core/luuStars';
import { KHAI_QUAT_12_CUNG, CHINH_TINH_CORE } from '../data/lasoLuanGiaiGuide';
import { computePhiHoa, summarizeAllPhiHoa, summarizeYearHoa, luuTuHoaPositions, monthStem } from '../core/phiHoa';
import { buildCachCucContext, cachCucAtPalace } from '../core/cachCucEngine';

/**
 * Bản đồ 12 cung — nguồn chân lý về vị trí chính tinh dùng cho MỌI prompt AI
 * (natal + đại/tiểu/nguyệt vận). AI PHẢI bám khi luận cách cục để không bịa
 * (vd Tử Vi tại Tài Bạch, không phải Tật Ách).
 */
function palaceMapBlock(result: AstrologyResult): string {
  const houses = result.tuViChart.houses;
  const chinhOf = (h: typeof houses[number]) =>
    h.stars.filter(s => s.type === 'chinh').map(s => s.name).join(', ') || 'Vô chính diệu';
  const lines = houses.map(h =>
    `  · ${h.palaceName} (${h.branch}): ${chinhOf(h)}${h.isManh ? ' [Mệnh]' : ''}${h.isThan ? ' [Thân]' : ''}${h.tuanAt ? ' [Tuần]' : ''}${h.trietAt ? ' [Triệt]' : ''}`,
  );
  return [
    '★ BẢN ĐỒ 12 CUNG — NGUỒN CHÂN LÝ về vị trí chính tinh. AI TUYỆT ĐỐI phải bám khi luận sao/cách cục — KHÔNG được ghi sao X ở cung Y nếu bản đồ dưới không xác nhận:',
    ...lines,
  ].join('\n');
}
import { analyzeFinancialDNA, FINANCIAL_DIM_LABEL } from '../core/wealthAnalysis';
import { extractChartFacts, validateAINarrative, type ChartFacts } from '../core/aiResponseValidator';
import { personalizeEvent } from '../core/eventPersonalization';
import type { ResolvedEvent } from '../core/lifeEventEngine';
import { analyzePalace } from '../core/palaceAnalysisService';
import { natalFactsBlock } from '../core/natalAnalysisService';
import { computeSixDomainScores } from '../core/offlineLuanGiai';
import { STRUCTURED_INSTRUCTION, parseAndValidate, renderNarrative } from '../core/structuredAI';
import { lunarBirthYear, tuoiMuOfYear } from '../core/ageUtil';

const ENDPOINT = 'https://text.pollinations.ai/openai';
// Timeout 180s — bài luận Toàn lá số / Đại vận có thể tới ~7000 từ (~12K tokens),
// gpt-4o-mini sinh mất ~2-3 phút. Để rộng tránh AbortError giữa chừng.
const TIMEOUT_MS = 180000;

function trim(s: string | undefined, n: number): string {
  if (!s) return '';
  const t = s.trim();
  return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') + '…' : t;
}

/**
 * Giới hạn độ dài đầu ra theo SỐ TỪ, cắt tại ranh giới câu/đoạn gần nhất để
 * không bị cụt giữa câu. GIỮ NGUYÊN định dạng markdown (xuống dòng, tiêu đề…).
 */
function capWords(s: string, maxWords: number): string {
  if (!s) return '';
  const t = s.trim();
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  let count = 0;
  let endIdx = -1;
  while ((m = re.exec(t)) !== null) {
    count++;
    if (count === maxWords) { endIdx = m.index + m[0].length; break; }
  }
  if (endIdx < 0) return t;   // ít hơn maxWords từ → giữ nguyên
  let cut = t.slice(0, endIdx);
  const stop = Math.max(
    cut.lastIndexOf('\n'), cut.lastIndexOf('. '), cut.lastIndexOf('! '),
    cut.lastIndexOf('? '), cut.lastIndexOf('…'),
  );
  if (stop > cut.length * 0.6) cut = cut.slice(0, stop + 1);
  // Xóa số thứ tự treo (vd "5." hoặc "**5.**") cuối chuỗi không có nội dung — do cắt giữa chừng.
  cut = cut.replace(/\n\s*(\*{0,2})\d+[.)]\*{0,2}\s*$/, '');
  return cut.trim();
}

const BR = (h: TuViHouse) => `${h.can} ${h.branch}`;

/**
 * Đọc cụm AI keys + provider — CHỈ còn ý nghĩa cho BYOK (key riêng người dùng tự nhập trong Cài
 * đặt), dùng làm phương án dự phòng khi proxy (key dùng chung của app) lỗi. Key dùng chung KHÔNG
 * còn đọc ở client nữa (xem callAiProxy + supabase/functions/ai-proxy — SỬA LỖI BẢO MẬT: trước
 * đây đọc thẳng từ bảng app_secrets, lộ key cho mọi user đăng nhập).
 */
function aiKeysOf(bi: any): AIKeys {
  return {
    anthropicApiKey: bi?.anthropicApiKey,
    openaiApiKey: bi?.openaiApiKey,
    aiProvider: bi?.aiProvider || 'auto',
  };
}

function starsOf(h: TuViHouse) {
  const chinh = h.stars
    .filter(s => s.type === 'chinh')
    .map(s => `${s.name}${s.brightness ? `(${s.brightness})` : ''}`);
  const phu = h.stars
    .filter(s => s.type !== 'chinh' && !s.name.startsWith('L. '))
    .map(s => s.name);
  return { chinh, phu };
}

const TAM_HOP: number[][] = [[8, 0, 4], [2, 6, 10], [5, 9, 1], [11, 3, 7]];
const NHI_HOP: Record<number, number> = {
  0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6,
};

// Nhóm 12 chi theo Tứ Chính / Tứ Sinh / Tứ Mộ — dùng cho mục I.
const BRANCH_GROUP: Record<string, 'Tứ Chính' | 'Tứ Sinh' | 'Tứ Mộ'> = {
  Tý: 'Tứ Chính', Ngọ: 'Tứ Chính', Mão: 'Tứ Chính', Dậu: 'Tứ Chính',
  Dần: 'Tứ Sinh', Thân: 'Tứ Sinh', Tị: 'Tứ Sinh', Hợi: 'Tứ Sinh',
  Thìn: 'Tứ Mộ', Tuất: 'Tứ Mộ', Sửu: 'Tứ Mộ', Mùi: 'Tứ Mộ',
};
const BRANCH_ELEMENT_VN: Record<string, string> = {
  Tý: 'Thủy', Sửu: 'Thổ', Dần: 'Mộc', Mão: 'Mộc', Thìn: 'Thổ', Tị: 'Hỏa',
  Ngọ: 'Hỏa', Mùi: 'Thổ', Thân: 'Kim', Dậu: 'Kim', Tuất: 'Thổ', Hợi: 'Thủy',
};

/**
 * Build prompt phân tích MỘT cung — theo khung 12 phần "KHUNG LUẬN MỘT CUNG TỬ VI"
 * (Lê Quang Lăng + Diệu Xuân — Nam Phái Việt Nam):
 *   I.  Thông tin cơ bản       VII.  Tam hợp
 *   II. Chính tinh             VIII. Xung chiếu
 *   III.Cách cục               IX.   Liên hệ với Mệnh
 *   IV. Phụ tinh               X.    Đại vận
 *   V.  Tứ Hóa cố định         XI.   Lưu niên (sao lưu)
 *   VI. Phi Hóa Nam Phái       XII.  Kết luận (mạnh/yếu/rủi ro/cơ hội/hành động)
 */
export function buildPalacePrompt(result: AstrologyResult, branchIndex: number): string {
  const { birthInfo, tuViChart: c } = result;
  const h = c.houses[branchIndex];
  const { chinh, phu } = starsOf(h);
  const luuHere = h.stars.filter(s => s.type === 'luu').map(s => s.name.replace(/^L\.\s*/, ''));
  const viewYear = c.viewingYear;

  const group = TAM_HOP.find(g => g.includes(branchIndex)) ?? [];
  const tamHopHouses = group.filter(i => i !== branchIndex).map(i => c.houses[i]);
  const xung = c.houses[(branchIndex + 6) % 12];
  const nhiHopIdx = NHI_HOP[branchIndex];
  const nhiHop = nhiHopIdx !== undefined ? c.houses[nhiHopIdx] : undefined;

  const ctxFull = (hh?: TuViHouse) => {
    if (!hh) return '—';
    const { chinh: ch, phu: ph } = starsOf(hh);
    return `${hh.palaceName}(${hh.branch}) — chính tinh ${ch.join(', ') || 'Vô chính diệu'}` +
      (ph.length ? ` | phụ tinh ${ph.slice(0, 5).join(', ')}` : '');
  };

  // Tách phụ tinh thành cát/sát/hình/hao/không cho mục IV (đúng khung).
  const SAT = ['Kình Dương', 'Đà La', 'Hỏa Tinh', 'Linh Tinh'];
  const KHONG = ['Địa Không', 'Địa Kiếp', 'Thiên Không'];
  const HINH = ['Thiên Hình'];
  const HAO = ['Đại Hao', 'Tiểu Hao'];
  const QUY_NHAN = ['Tả Phù', 'Hữu Bật', 'Thiên Khôi', 'Thiên Việt'];
  const HOC_VAN = ['Văn Xương', 'Văn Khúc', 'Thai Phụ', 'Phong Cáo', 'Văn Tinh'];
  const DANH_VONG = ['Tam Thai', 'Bát Tọa', 'Ân Quang', 'Thiên Quý', 'Long Trì', 'Phượng Các'];
  const TAI_LOC = ['Lộc Tồn', 'Thiên Mã', 'Thiên Phúc', 'Thiên Trù'];
  const tinhPhanLoai = (s: string) => {
    if (SAT.includes(s)) return 'sát';
    if (KHONG.includes(s)) return 'không';
    if (HINH.includes(s)) return 'hình';
    if (HAO.includes(s)) return 'hao';
    if (QUY_NHAN.includes(s)) return 'quý nhân';
    if (HOC_VAN.includes(s)) return 'học vấn';
    if (DANH_VONG.includes(s)) return 'danh vọng';
    if (TAI_LOC.includes(s)) return 'tài lộc';
    return null;
  };
  const phanLoai: Record<string, string[]> = {};
  for (const p of phu) {
    const cat = tinhPhanLoai(p) || 'khác';
    (phanLoai[cat] ||= []).push(p);
  }
  const phanLoaiText = ['quý nhân', 'học vấn', 'danh vọng', 'tài lộc', 'sát', 'không', 'hình', 'hao', 'khác']
    .filter(k => phanLoai[k]?.length)
    .map(k => `   · ${k}: ${phanLoai[k].join(', ')}`)
    .join('\n') || '   · (không có)';

  // Tứ Hóa CỐ ĐỊNH tại cung này (theo can NĂM SINH).
  const hoaTaiCung = h.stars.filter(s => s.type === 'cat' || s.type === 'hung')
    .filter(s => s.name === 'Hóa Lộc' || s.name === 'Hóa Quyền' || s.name === 'Hóa Khoa' || s.name === 'Hóa Kỵ')
    .map(s => s.name);

  // Phi Hóa Nam Phái — từ can cung này phi đi đâu, nhận hóa từ cung nào.
  const phi = computePhiHoa(c, branchIndex);
  const phatText = phi.phat.length
    ? phi.phat.map(p => `• ${p.hoa} → cung ${p.toPalace}(${p.toBranch}) qua sao ${p.viaStar}`).join('\n')
    : '• (Can cung này không có hóa nào phi tới cung có chính tinh tương ứng)';
  const nhanText = phi.nhan.length
    ? phi.nhan.map(p => `• ${p.hoa} ← cung ${p.fromPalace}(${p.fromBranch}) qua sao ${p.viaStar}`).join('\n')
    : '• (Không có cung nào phi hóa tới cung này)';

  // Kiến thức chuẩn về từng sao.
  const kbLines: string[] = [];
  const seen = new Set<string>();
  for (const s of h.stars) {
    const nm = s.name.startsWith('L. ') ? s.name.slice(3) : s.name;
    if (seen.has(nm)) continue;
    seen.add(nm);
    const inf = getStarInfo(nm);
    if (!inf) continue;
    const brief = trim(inf.basic, 320);
    const atPalace = trim(inf.byPalace?.[h.palaceName], 240);
    kbLines.push(`• ${nm}: ${brief}` + (atPalace ? ` [Tại ${h.palaceName}: ${atPalace}]` : ''));
  }
  const cach = detectCachCucInPalace(h.stars.filter(s => s.type !== 'luu').map(s => s.name), h.branch, h.palaceName);
  const cachText = cach.length
    ? cach.map(c => `• ${c.name}: ${trim(c.meaning, 260)}`).join('\n')
    : '• (Các sao trong cung không tạo thành cách cục đặc biệt)';

  // Đại vận hiện tại.
  const ageNow = tuoiMuOfYear(birthInfo, c.viewingYear ?? new Date().getFullYear());
  const dvNow = result.daiVans.find(d => ageNow >= d.startAge && ageNow <= d.endAge);
  const dvText = dvNow
    ? `Đại vận hiện tại ${dvNow.startAge}-${dvNow.endAge}t (Can-Chi ${dvNow.stem} ${dvNow.branch}, đóng cung ${result.tuViChart.houses.find(x => x.branch === dvNow.branch)?.palaceName || '?'}). Đại vận này có "đi qua / kích hoạt" cung ${h.palaceName} không?`
    : '(Chưa xác định được đại vận hiện tại)';

  const menhHouse = c.houses.find(x => x.isManh);
  const menhInfo = menhHouse ? `Cung Mệnh ở ${menhHouse.palaceName}(${menhHouse.branch}) — chính tinh ${starsOf(menhHouse).chinh.join(', ') || 'Vô chính diệu'}` : '';

  // Gợi ý ngành nghề CỤ THỂ — chỉ chèn khi luận cung Quan Lộc hoặc cung Mệnh.
  const cpPalace = careerProfile(result);
  const careerHint = (cpPalace && (h.palaceName === 'Quan Lộc' || h.isManh))
    ? `[★ GỢI Ý NGÀNH NGHỀ CỤ THỂ] Theo chính tinh ${cpPalace.names.join(', ')} tại ${cpPalace.src}: hợp với ${cpPalace.fields.join('; ')}. ` +
      `Ở mục KẾT LUẬN, hãy nêu 4–8 NGÀNH/VỊ TRÍ CỤ THỂ (mở rộng từ gợi ý này, vd: tư vấn, cố vấn, marketing, tài chính, kỹ thuật, giáo dục…) kèm lý do ngắn — KHÔNG nói chung chung.`
    : '';

  // Giáp cung (Tầng 8 khung 10 tầng) — 2 cung liền kề tạo "môi trường xung quanh".
  const giapTruoc = c.houses[(branchIndex + 1) % 12];
  const giapSau = c.houses[(branchIndex + 11) % 12];
  const giapTxt = (hh?: TuViHouse) => hh ? `${hh.palaceName}(${hh.branch}) — ${starsOf(hh).chinh.join(', ') || 'VCD'}` : '—';

  return [
    'Bạn là chuyên gia Tử Vi Đẩu Số phái NAM PHÁI Việt Nam (theo hệ thống Lê Quang Lăng kết hợp phương pháp luận Diệu Xuân).',
    `Hãy luận giải CHỈ RIÊNG cung "${h.palaceName}" theo KHUNG LUẬN ở dưới. Mọi nhận định BẮT BUỘC theo cấu trúc: [Dữ kiện] → [Phân tích] → [Kết luận] → [Mức độ ảnh hưởng 1–10]. KHÔNG kết luận chỉ dựa vào 1 sao riêng lẻ — mỗi kết luận quan trọng phải dựa trên ÍT NHẤT 2 DỮ KIỆN tổ hợp (vd: "bộ Tử Phủ + tam hợp hỗ trợ + Lộc nhập → khả năng quản trị là thế mạnh", KHÔNG nói "có Tử Vi nên làm lãnh đạo"). Không dùng ngôn ngữ mê tín; ưu tiên khuyến nghị thực tiễn về sự nghiệp – tài chính – quan hệ – sức khỏe – quản trị rủi ro.`,
    '★ TRỌNG SỐ LUẬN (BẮT BUỘC phân bổ độ sâu phân tích theo tỷ lệ này): Chính tinh + cách cục 25% · Tứ Hóa 20% · Phi Hóa Nam Phái 20% · Tam hợp 15% · Xung chiếu 10% · Phụ tinh 5% · Giáp cung 5%. KHÔNG dành phần lớn bài để kể về sao — Tứ Hóa, Phi Hóa, Tam hợp và khí số cung mới quyết định cung vận hành ra sao trong thực tế.',
    '',
    `Người xem: ${birthInfo.gender === 'nam' ? 'Nam' : 'Nữ'}, sinh ${birthInfo.day}/${birthInfo.month}/${birthInfo.year} — Bản Mệnh ${c.napAmMenh}, Cục ${c.cucName}, Âm Dương ${c.amDuongThuanLy === 'thuận' ? 'Thuận Lý' : 'Nghịch Lý'}.`,
    menhInfo ? `(${menhInfo}.)` : '',
    '',
    '===== DỮ KIỆN CỐ ĐỊNH =====',
    '',
    (() => {
      const pf = analyzePalace(result, h.palaceName);
      if (!pf) return '';
      const pat = pf.patterns.length
        ? pf.patterns.map(p => `${p.name}(${p.score}đ, đủ ${p.completeness}%, tin cậy ${p.confidence}%, ${p.status})`).join('; ')
        : '(không có)';
      return [
        '[ENGINE FACTS — dữ kiện engine đã xác nhận, BẮT BUỘC bám sát, KHÔNG mâu thuẫn, KHÔNG bịa thêm cách cục ngoài đây]',
        `- Độ mạnh cung: ${pf.strength.value}/100 (${pf.strength.level})${pf.strength.chinhTinhVCD ? ' — Vô chính diệu' : ''}.`,
        `- Bộ chính tinh: ${pf.boSao}. Sắc thái cát/hung: ${pf.conflict.netTone} (cát ${pf.conflict.catScore} vs hung ${pf.conflict.hungScore}).`,
        `- Cách cục tại cung: ${pat}.`,
        pf.imbalances.length ? `- Mất cân bằng: ${pf.imbalances.join(' ')}` : '',
        '',
      ].filter(Boolean).join('\n');
    })(),
    `[I] THÔNG TIN CƠ BẢN`,
    `- Tên cung: ${h.palaceName}`,
    `- Vị trí: đặt tại ${h.branch} (can ${h.can}); hành Chi cung = ${BRANCH_ELEMENT_VN[h.branch] || '?'}; thuộc nhóm ${BRANCH_GROUP[h.branch] || '?'}.`,
    h.isManh ? `- Có Mệnh cư` : '',
    h.isThan ? `- Có Thân cư` : '',
    h.tuanAt ? `- BỊ TUẦN KHÔNG án ngữ` : '',
    h.trietAt ? `- BỊ TRIỆT LỘ án ngữ` : '',
    `- Tam hợp gồm: chính cung ${h.palaceName}(${h.branch}) + ${tamHopHouses.map(x => `${x.palaceName}(${x.branch})`).join(' + ') || '(không có)'}.`,
    `- Cung xung chiếu: ${xung.palaceName}(${xung.branch}); cung nhị hợp: ${nhiHop ? `${nhiHop.palaceName}(${nhiHop.branch})` : '—'}.`,
    `- GIÁP CUNG (môi trường 2 bên): giáp trước ${giapTxt(giapTruoc)}; giáp sau ${giapTxt(giapSau)}.`,
    '',
    `[II] CHÍNH TINH TỌA THỦ`,
    `- ${chinh.length ? chinh.join(', ') : 'Vô chính diệu (không có chính tinh) — phải mượn sao tam hợp/xung chiếu để luận.'}`,
    h.vongTruongSinh ? `- Vòng Tràng Sinh tại cung: ${h.vongTruongSinh}` : '',
    '',
    `[III] CÁCH CỤC NHẬN DIỆN ĐƯỢC`,
    cachText,
    '',
    `[IV] PHỤ TINH (phân loại):`,
    phanLoaiText,
    '',
    `[V] TỨ HÓA CỐ ĐỊNH (theo can năm sinh ${c.lunarDate.yearStem}) tọa thủ tại cung này: ${hoaTaiCung.length ? hoaTaiCung.join(', ') : '(không có)'}`,
    '',
    `[VI] PHI HÓA NAM PHÁI`,
    `★ Cung ${h.palaceName} (can ${h.can}) PHÁT đi:`,
    phatText,
    `★ Cung ${h.palaceName} NHẬN hóa từ các cung khác:`,
    nhanText,
    '',
    `[VII] TAM HỢP — chi tiết các cung tam hợp:`,
    tamHopHouses.map(hh => `   ${ctxFull(hh)}`).join('\n') || '   (không có)',
    '',
    `[VIII] XUNG CHIẾU — cung đối diện: ${ctxFull(xung)}`,
    `(Nhị hợp ${nhiHop ? ctxFull(nhiHop) : '—'})`,
    '',
    `[X] ĐẠI VẬN: ${dvText}`,
    '',
    luuHere.length
      ? `[XI] LƯU NIÊN năm ${viewYear ?? 'đang xem'}: cung này có lưu tinh ${luuHere.join(', ')}.`
      : `[XI] LƯU NIÊN năm ${viewYear ?? 'đang xem'}: không có lưu tinh nổi bật.`,
    '',
    careerHint,
    '===== KIẾN THỨC CHUẨN VỀ TỪNG SAO (BẮT BUỘC bám, không tự bịa) =====',
    kbLines.length ? kbLines.join('\n') : '• (Không có dữ liệu sao)',
    (h.tuanAt || h.trietAt)
      ? '\n[★ Tuần/Triệt tại cung] ' +
        (h.trietAt ? 'Triệt Lộ — cắt đứt/chặn ngang, mạnh và dứt khoát. ' : '') +
        (h.tuanAt ? 'Tuần Không — làm chậm/hoãn, nhẹ hơn Triệt. ' : '') +
        'Nguyên tắc: cung vốn TỐT bị GIẢM/HOÃN; cung vốn XẤU được CHE CHẮN; mạnh nửa đầu đời (<30t).'
      : '',
    '',
    '===== YÊU CẦU TRÌNH BÀY =====',
    '- Tiếng Việt mạch lạc, đúng thuật ngữ Tử Vi Nam Phái; KHÔNG dùng bảng (markdown table), KHÔNG ký hiệu | hay ---; KHÔNG dùng từ ngữ mê tín.',
    '- Viết 2500–4500 từ, SÂU và CỤ THỂ; KẾT THÚC trọn vẹn, KHÔNG bỏ dở.',
    '- Mỗi mục lớn phải kết bằng câu "Mức độ ảnh hưởng tới cung: x/10 — [lý do ngắn]" (x là số 1–10).',
    '- Chỉ dùng các sao ĐÃ NÊU; tuyệt đối không bịa thêm sao. KHÔNG nhắc khái niệm "Mệnh chủ"/"Thân chủ" (phái này không dùng). KHÔNG dự đoán sự kiện cụ thể vào ngày cụ thể; KHÔNG đưa lời khuyên y tế / tài chính cụ thể / pháp lý — luôn khuyến nghị tham vấn chuyên gia.',
    '',
    '===== CHỐNG NÓI CHUNG CHUNG (BẮT BUỘC TUÂN THỦ) =====',
    '- CẤM các câu sáo rỗng vô thưởng vô phạt kiểu "cần cân bằng cuộc sống", "nên cẩn thận hơn", "giữ thái độ tích cực", "tu tâm dưỡng tính" — nếu nói thì PHẢI gắn vào sao/cách cục cụ thể và nói RÕ cân bằng cái gì với cái gì, cẩn thận điều gì, vào việc gì.',
    '- Mỗi nhận định: nêu TÊN SAO/cách cục làm bằng chứng → diễn giải bản chất → suy ra biểu hiện THỰC TẾ trong đời sống người này. Ví dụ thay vì "Thiên Cơ giỏi tính toán" hãy viết "Thiên Cơ miếu + Hóa Khoa → tư duy phân tích, kế hoạch tốt; hợp việc cần mưu lược (lập kế hoạch, phân tích dữ liệu, tư vấn chiến lược) hơn là việc lặp đi lặp lại đơn điệu".',
    '- Khi luận tính cách: mô tả CỤ THỂ cách người này hành xử trong công việc, trong quan hệ, khi gặp áp lực — kèm cả MẶT MẠNH và MẶT YẾU/điểm dễ vấp.',
    '- Mọi lời khuyên phải THỰC THI ĐƯỢC: nói rõ NÊN làm hành động gì, TRÁNH điều gì, và (nếu suy ra được từ đại vận/lưu niên) thời điểm/giai đoạn nào nên đẩy mạnh — không khuyên chung chung.',
    '- Khi cung cho phép (Mệnh, Quan, Tài, Phu Thê, Tật Ách…): gợi ý NGÀNH NGHỀ / HƯỚNG TÀI CHÍNH / KIỂU người bạn đời / NHÓM sức khỏe cần lưu ý một cách cụ thể, có lý do từ sao — KHÔNG nói "hợp nhiều ngành".',
    '- Ưu tiên độ sâu cho 4 tầng quyết định (Chính tinh+cách cục, Tứ Hóa, Phi Hóa, Tam hợp + khí số); các mục phụ (Phụ tinh, Giáp cung) viết gọn nhưng vẫn phải cụ thể, tránh dàn đều hời hợt.',
    '',
    `Hãy viết theo cấu trúc 13 mục sau (giữ đúng tiêu đề mục):`,
    `1. THÔNG TIN CƠ BẢN — Vị trí, hành Chi, nhóm Tứ Chính/Sinh/Mộ; cung tam hợp/xung chiếu/nhị hợp. Ý nghĩa của thế đứng.`,
    `2. CHÍNH TINH — Phân tích từng chính tinh (Miếu/Vượng/Đắc/Bình/Hãm); âm/dương, động/tĩnh, văn/võ; năng lượng chủ đạo của cung. Nếu Vô chính diệu thì xét tam hợp/xung để mượn.`,
    `3. CÁCH CỤC — Bộ sao hình thành (Tử Phủ, Sát Phá Tham, Cơ Nguyệt Đồng Lương, Cự Nhật…); xếp Thượng/Trung/Hạ/Phá cách; điều kiện phát huy.`,
    `4. PHỤ TINH — Liệt kê theo nhóm: cát (quý nhân/học vấn/danh vọng/tài lộc) và hung (sát/không/hình/hao); đánh giá tăng giá trị / giảm giá trị / biến đổi tính chất.`,
    `5. TỨ HÓA TẠI CUNG — Hóa Lộc/Quyền/Khoa/Kỵ nào đóng tại cung và ý nghĩa cụ thể với cung này.`,
    `6. PHI HÓA NAM PHÁI — Cung này phát Lộc/Quyền/Khoa/Kỵ đi cung nào (ý nghĩa); cung này nhận hóa từ cung nào (ý nghĩa). Đây là điểm mấu chốt của Nam Phái — không được bỏ qua.`,
    `7. TAM HỢP — Đánh giá chính cung + 2 cung tam hợp; kết luận rõ: tam hợp đang NÂNG cung lên hay KÉO cung xuống.`,
    `8. XUNG CHIẾU — Sao chính cung đối; lực chiếu về mang tính HỖ TRỢ hay CẢN TRỞ; áp lực bên ngoài đến từ đâu.`,
    `9. GIÁP CUNG — 2 cung liền kề (đã cho ở mục [I]) tạo "môi trường xung quanh" thuận hay nghịch.`,
    `10. THỂ – DỤNG (phương pháp Diệu Xuân) — THỂ (bản chất cung: chính tinh + miếu hãm) tốt hay yếu? DỤNG (cách vận hành: phụ tinh + Hóa + Tuần Triệt) thuận hay nghịch? Kết hợp 4 trường hợp: Thể tốt + Dụng thuận / Thể tốt + Dụng nghịch (có tài khó phát huy) / Thể yếu + Dụng thuận / Thể yếu + Dụng nghịch.`,
    `11. LIÊN HỆ VỚI MỆNH & ĐẠI VẬN — Cung này CÓ LỢI / GÂY ÁP LỰC cho Mệnh đến đâu; đại vận hiện tại có kích hoạt cung này không.`,
    `12. LƯU NIÊN — Năm xét: ảnh hưởng của lưu Lộc/Quyền/Khoa/Kỵ và các sao lưu khác tại cung.`,
    `13. KHÍ SỐ CUNG & KẾT LUẬN — (a) CHẤM KHÍ SỐ CUNG x/10 (tổng hợp theo trọng số đã nêu) kèm 1 câu lý giải; (b) Điểm mạnh nhất (top 3); (c) Điểm yếu nhất (top 3); (d) Cơ hội lớn nhất (top 3); (e) Rủi ro lớn nhất (top 3); (f) Hành động nên làm (top 3): NÊN làm gì / TRÁNH điều gì / Thời điểm phù hợp; (g) Kết luận 10 dòng đúc kết toàn cung.`,
    'KHÔNG xuất JSON, KHÔNG ghi suy nghĩ nội bộ.',
  ].filter(Boolean).join('\n');
}

function clean(s: string): string {
  let t = String(s ?? '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/\r/g, '');
  // Cắt đuôi JSON rò rỉ kiểu: ...nội dung","tool_calls":[]}  /  ..."}]}
  t = t.replace(/"?\s*,?\s*"(?:tool_calls|finish_reason|role|refusal|usage)"\s*:[\s\S]*$/i, '');
  // Đuôi chỉ còn dấu JSON ("}], ) → bỏ
  t = t.replace(/[\s"'`,}\]]+$/g, (m) => (/[}\]]/.test(m) ? '' : m));
  return t.trim();
}

function decodeJsonStr(escaped: string): string {
  try { return JSON.parse(`"${escaped}"`); } catch { return escaped.replace(/\\n/g, '\n'); }
}

function extractContent(raw: string): string {
  let txt = (raw ?? '').trim();
  if (!txt) return '';

  // 1) SSE dạng "data: {...}" — gộp các mảnh delta/message
  if (/^data:\s*/m.test(txt)) {
    const parts = txt
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.startsWith('data:'))
      .map(l => l.replace(/^data:\s*/, '').trim())
      .filter(l => l && l !== '[DONE]');
    let acc = '';
    for (const p of parts) {
      try {
        const j: any = JSON.parse(p);
        acc += j?.choices?.[0]?.delta?.content
          ?? j?.choices?.[0]?.message?.content ?? '';
      } catch { /* bỏ mảnh hỏng */ }
    }
    if (acc.trim()) return clean(acc);
    if (parts.length) txt = parts[parts.length - 1];
  }

  // 2) JSON hợp lệ — lấy đúng message.content (BỎ reasoning)
  try {
    const j: any = JSON.parse(txt);
    const c =
      j?.choices?.[0]?.message?.content ??
      j?.choices?.[0]?.delta?.content ??
      j?.choices?.[0]?.text ??
      j?.message?.content ??
      (typeof j?.content === 'string' ? j.content : '') ??
      (typeof j === 'string' ? j : '');
    if (c && String(c).trim()) return clean(String(c));
  } catch { /* không phải JSON nguyên khối */ }

  // 3) JSON bị cắt/không parse được: xóa hẳn khối "reasoning":"..."
  //    rồi bóc "content":"..." (chuỗi có thể chứa \" escaped)
  const noReason = txt.replace(/"reasoning"\s*:\s*"(?:[^"\\]|\\.)*"/g, '"reasoning":""');
  const m = noReason.match(/"content"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (m && m[1] && m[1].trim()) return clean(decodeJsonStr(m[1]));

  // 4) Không có content (vd model chỉ trả reasoning, hoặc trả thô)
  //    → coi như nội dung không hợp lệ, để màn hình báo lỗi.
  return '';
}

/**
 * Phân tích AI cho 1 cung. Ném Error('OFFLINE') nếu lỗi mạng/timeout.
 */
const SYSTEM =
  'Bạn là một thầy Tử Vi Đẩu Số Nam Phái giàu kinh nghiệm, hành văn tiếng Việt ' +
  'chuẩn mực, ấm áp, có chiều sâu. NHIỆM VỤ CỐT LÕI: PHÂN TÍCH và LUẬN GIẢI, ' +
  'KHÔNG phải liệt kê dữ kiện. Hãy DIỄN GIẢI ý nghĩa: vì sao sao này đặt ở cung ' +
  'này lại sinh ra tính cách / vận sự đó; các sao TƯƠNG TÁC với nhau ra sao; điều ' +
  'đó dẫn tới HỆ QUẢ gì trong đời sống thực (công việc, tiền bạc, tình cảm, sức ' +
  'khỏe). Viết thành những đoạn văn liền mạch, có dẫn dắt nhân–quả, ví von gần gũi ' +
  'đời thường; TRÁNH kiểu gạch đầu dòng khô khan, tránh lặp lại tên sao như danh ' +
  'sách. Mỗi nhận định nên kèm "nên làm gì / nên tránh gì". Luận thuần văn bản; ' +
  'KHÔNG xuất JSON; KHÔNG ghi quá trình suy luận; KHÔNG dùng bảng markdown; viết ' +
  'đầy đủ, kết thúc trọn vẹn.';

function isLikelyTruncated(t: string): boolean {
  const s = t.trim();
  if (!s) return true;
  const last = s[s.length - 1];
  const endsOk = '.!?…)”"›»'.includes(last);
  // Đã viết tới phần kết luận / lời khuyên chưa? (cả 4-mục, 5-mục, 5-bước A-Z, 6-mục đều bám "lời khuyên" / "kết luận" ở cuối)
  const hasEnd = /(^|\n)\s*[4-6][.)]|lời khuyên|kết luận|nhận định|tổng kết/i.test(s);
  return !endsOk || !hasEnd;
}

/** Phát hiện nội dung AI bị "thoái hóa" — lặp từ liên tục, lẫn chữ Hán,
 *  hoặc từ vựng nghèo nàn quá mức (dấu hiệu model lỗi / loop). */
export function looksDegenerate(t: string): boolean {
  const s = (t || '').trim();
  if (s.length < 80) return false;

  // 1) Nhiều từ CJK (Hán/Trung) → KHÔNG đạt yêu cầu tiếng Việt
  const cjk = (s.match(/[㐀-鿿]/g) || []).length;
  if (cjk / s.length > 0.04) return true;

  // 2) Một từ ngắn lặp liên tục >= 5 lần (vd "NGƯỜI NGƯỜI NGƯỜI…")
  const words = s.split(/\s+/).filter(Boolean);
  let cur = 1, maxRun = 1;
  for (let i = 1; i < words.length; i++) {
    const a = words[i].replace(/[^\p{L}]/gu, '').toLowerCase();
    const b = words[i - 1].replace(/[^\p{L}]/gu, '').toLowerCase();
    if (a && a === b) { cur++; if (cur > maxRun) maxRun = cur; }
    else cur = 1;
  }
  if (maxRun >= 5) return true;

  // 3) Từ vựng quá nghèo: tỷ lệ unique words / total < 0.18 với bài dài
  if (words.length > 200) {
    const uniq = new Set(words.map(w => w.replace(/[^\p{L}]/gu, '').toLowerCase()).filter(Boolean)).size;
    if (uniq / words.length < 0.18) return true;
  }

  // 4) Cùng 1 cụm 2-3 từ lặp >= 4 lần liên tiếp (vd "Mệnh tốt Mệnh tốt Mệnh tốt…")
  for (let n = 2; n <= 3; n++) {
    let run = 1;
    for (let i = n; i < words.length; i++) {
      const cur2 = words.slice(i - n, i).join(' ').toLowerCase();
      const prev = words.slice(i - 2 * n, i - n).join(' ').toLowerCase();
      if (cur2 && cur2 === prev) { run++; if (run >= 4) return true; }
      else run = 1;
    }
  }
  return false;
}

function looksLikeError(t: string): boolean {
  const s = t.trim();
  return /^\{[\s\S]*"error"\s*:/.test(s) || /Model not found|legacy API/i.test(s);
}

async function tryGet(prompt: string, signal: AbortSignal): Promise<string> {
  // GET trả về THUẦN VĂN BẢN (model reasoning tự xử lý, chỉ trả đáp án) —
  // tránh hẳn việc phải bóc JSON/“reasoning”.
  const full = `${SYSTEM}\n\n${prompt}`;
  const url =
    'https://text.pollinations.ai/' +
    encodeURIComponent(full) +
    '?model=openai-fast&private=true&referrer=tuviapp';
  const res = await fetch(url, {
    signal,
    headers: {
      'User-Agent': 'Mozilla/5.0 (TuViApp)',
      Referer: 'https://tuviapp.local/',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const raw = (await res.text()) ?? '';
  if (looksLikeError(raw)) throw new Error('SERVICE');
  // Phòng khi vẫn trả JSON → tận dụng bộ bóc
  return raw.trim().startsWith('{') ? extractContent(raw) : clean(raw);
}

async function tryPost(prompt: string, signal: AbortSignal): Promise<string> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'openai-fast',
      stream: false,
      private: true,
      temperature: 0.7,
      top_p: 0.9,
      frequency_penalty: 0.6,
      presence_penalty: 0.3,
      max_tokens: 8192,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: prompt },
      ],
    }),
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return extractContent(await res.text());
}

/**
 * Phân tích chất lượng cao bằng Claude (nếu người dùng có nhập API key
 * Anthropic trong phần Cài đặt). Cho kết quả tiếng Việt chuẩn, đầy đủ.
 */
const ANTHROPIC_MODELS = ['claude-3-5-haiku-20241022', 'claude-3-haiku-20240307'];

async function tryAnthropic(prompt: string, apiKey: string, signal: AbortSignal): Promise<string> {
  let lastStatus = 0;
  for (const model of ANTHROPIC_MODELS) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: 8192,
        temperature: 0.7,
        top_p: 0.9,
        system:
          SYSTEM +
          ' Viết HOÀN TOÀN bằng tiếng Việt có dấu (chữ Quốc ngữ Latin), KHÔNG dùng ' +
          'chữ Hán / tiếng Trung. Thuật ngữ Tử Vi giữ Hán-Việt phiên âm (vd: Thiên Phủ, ' +
          'Miếu, Vượng, Đắc, Bình, Hãm). TUYỆT ĐỐI KHÔNG lặp lại một từ/cụm từ liên tục.',
        messages: [{ role: 'user', content: prompt }],
      }),
      signal,
    });
    if (res.ok) {
      const j: any = await res.json();
      const txt = Array.isArray(j?.content)
        ? j.content.filter((b: any) => b?.type === 'text').map((b: any) => b.text).join('\n')
        : '';
      const c = clean(txt);
      if (c) return c;
      lastStatus = 0;
      continue;
    }
    lastStatus = res.status;
    // 404 = model không tồn tại → thử model kế; lỗi khác → dừng báo rõ
    if (res.status !== 404) break;
  }
  if (lastStatus === 401 || lastStatus === 403) {
    throw new Error('API key Claude không hợp lệ hoặc chưa được cấp quyền. Kiểm tra lại key.');
  }
  if (lastStatus === 429) {
    throw new Error('Tài khoản Claude hết định mức / quá tải. Vui lòng kiểm tra số dư.');
  }
  if (lastStatus === 400) {
    throw new Error('Yêu cầu tới Claude không hợp lệ (400).');
  }
  throw new Error(`ANTHROPIC_${lastStatus || 'ERR'}`);
}

/**
 * Gọi OpenAI ChatGPT API (https://api.openai.com/v1/chat/completions).
 * Hỗ trợ key bắt đầu bằng `sk-...`. Model mặc định: `gpt-4o-mini` (rẻ, nhanh,
 * tiếng Việt tốt). Có thể nâng lên `gpt-4o` nếu cần.
 */
const OPENAI_MODELS = ['gpt-4o-mini', 'gpt-3.5-turbo'];

async function tryOpenAI(prompt: string, apiKey: string, signal: AbortSignal): Promise<string> {
  let lastStatus = 0;
  let lastMsg = '';
  for (const model of OPENAI_MODELS) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 16384,   // đủ cho bài luận dài tới ~7000 từ tiếng Việt
        temperature: 0.7,
        top_p: 0.9,
        frequency_penalty: 0.4,
        presence_penalty: 0.2,
        messages: [
          {
            role: 'system',
            content:
              SYSTEM +
              ' Viết HOÀN TOÀN bằng tiếng Việt có dấu (chữ Quốc ngữ Latin), KHÔNG dùng ' +
              'chữ Hán / tiếng Trung. Thuật ngữ Tử Vi giữ Hán-Việt phiên âm (vd: Thiên Phủ, ' +
              'Miếu, Vượng, Đắc, Bình, Hãm). TUYỆT ĐỐI KHÔNG lặp lại một từ/cụm từ liên tục.',
          },
          { role: 'user', content: prompt },
        ],
      }),
      signal,
    });
    if (res.ok) {
      const j: any = await res.json();
      const txt = j?.choices?.[0]?.message?.content || '';
      const c = clean(typeof txt === 'string' ? txt : '');
      if (c) return c;
      continue;
    }
    lastStatus = res.status;
    try { lastMsg = (await res.text()).slice(0, 200); } catch {}
    // 404 / 400 → có thể do model alias không có với account → thử model kế.
    if (res.status !== 404 && res.status !== 400) break;
  }
  if (lastStatus === 401 || lastStatus === 403) {
    throw new Error('API key OpenAI không hợp lệ hoặc chưa được cấp quyền. Kiểm tra lại key.');
  }
  if (lastStatus === 429) {
    throw new Error('Tài khoản OpenAI hết định mức / quá tải. Kiểm tra số dư hoặc rate limit.');
  }
  if (lastStatus === 400) {
    throw new Error('Yêu cầu tới OpenAI không hợp lệ (400): ' + lastMsg);
  }
  throw new Error(`OPENAI_${lastStatus || 'ERR'}`);
}

/**
 * Tham số ưu tiên nhà cung cấp AI. Người dùng có thể chỉnh trong Cài đặt.
 *  - 'claude'  → ưu tiên Claude trước, lỗi mới sang OpenAI rồi free.
 *  - 'openai'  → ưu tiên OpenAI trước, lỗi mới sang Claude rồi free.
 *  - 'auto'    → có Claude key thì Claude trước (chất lượng tiếng Việt tốt),
 *                không thì sang OpenAI, cuối cùng free.
 */
export interface AIKeys {
  anthropicApiKey?: string;
  openaiApiKey?: string;
  aiProvider?: 'auto' | 'claude' | 'openai';
}

/**
 * SỬA LỖI BẢO MẬT: gọi key DÙNG CHUNG của app qua Edge Function `ai-proxy` thay vì đọc thẳng
 * OpenAI/Anthropic key về client rồi tự gọi (cách cũ để lộ key cho bất kỳ user đăng nhập nào —
 * xem supabase_security_fixes.sql FIX 1 + supabase/functions/ai-proxy/index.ts). Server tự đọc
 * key bằng service role, KHÔNG BAO GIỜ trả key về client — chỉ trả về đúng đoạn văn bản kết quả.
 */
async function callAiProxy(prompt: string, provider: 'openai' | 'claude', signal: AbortSignal): Promise<string> {
  const { data, error } = await supabase.functions.invoke('ai-proxy', {
    body: { prompt, provider, promptKind: 'natal' },
    signal,
  });
  if (error) {
    const ctx = (error as any)?.context;
    let code = '';
    try { const b = typeof ctx?.json === 'function' ? await ctx.json() : null; code = b?.error || ''; } catch { /* ignore */ }
    if (!code) code = `${provider.toUpperCase()}_${ctx?.status || 'ERR'}`;
    if (/_(401|403)$/.test(code)) {
      throw new Error(`API key ${provider === 'openai' ? 'OpenAI' : 'Claude'} không hợp lệ hoặc chưa được cấp quyền. Kiểm tra lại key.`);
    }
    if (/_429$/.test(code)) {
      throw new Error(`Tài khoản ${provider === 'openai' ? 'OpenAI' : 'Claude'} hết định mức / quá tải. Kiểm tra số dư hoặc rate limit.`);
    }
    throw new Error(code);
  }
  const text = (data as any)?.text as string | undefined;
  if (!text) throw new Error(`${provider.toUpperCase()}_EMPTY`);
  return clean(text);
}

/** Lõi gọi AI dùng chung cho phân tích 1 cung & toàn lá số. */
async function requestAI(prompt: string, keysOrLegacy?: string | AIKeys): Promise<string> {
  // Backward-compat: cho phép truyền thẳng anthropicApiKey (string).
  const keys: AIKeys = typeof keysOrLegacy === 'string'
    ? { anthropicApiKey: keysOrLegacy, aiProvider: 'auto' }
    : (keysOrLegacy || {});
  const claudeKey = keys.anthropicApiKey?.trim() || '';
  const openaiKey = keys.openaiApiKey?.trim() || '';
  const provider = keys.aiProvider || 'auto';

  // Xếp thứ tự thử các nguồn theo provider.
  type Source = 'claude' | 'openai';
  const order: Source[] = [];
  if (provider === 'openai') {
    if (openaiKey) order.push('openai');
    if (claudeKey) order.push('claude');
  } else if (provider === 'claude') {
    if (claudeKey) order.push('claude');
    if (openaiKey) order.push('openai');
  } else {
    // auto: ƯU TIÊN OpenAI (ChatGPT gpt-4o-mini — rẻ) trước; Claude chỉ là backup.
    if (openaiKey) order.push('openai');
    if (claudeKey) order.push('claude');
  }

  return requestAIWithOrder(prompt, order, claudeKey, openaiKey);
}

/**
 * Gọi AI với 1 prompt đã soạn sẵn ở NƠI KHÁC (hiện dùng cho Luận sự kiện trong năm —
 * core/annualEvents/narrativePrompt.ts). Chỉ là lối vào mỏng tới `requestAI` — không thêm/đổi
 * prompt nào có sẵn trong file này.
 */
export async function requestAnnualEventsNarrative(prompt: string, keys?: AIKeys): Promise<string> {
  return requestAI(prompt, keys);
}

/**
 * (Phase 14) Gọi AI rồi KIỂM CHỨNG chống bịa cách cục dựa trên facts engine.
 *  - Nếu phát hiện cách cục AI bịa: gắn ghi chú đính chính vào cuối (mặc định).
 *  - `allowRetry`: thử lại 1 lần với chỉ dẫn sửa (TỐN thêm 1 lượt gọi AI — mặc
 *    định TẮT để không phát sinh chi phí ngoài ý muốn); chỉ giữ bản retry nếu
 *    số cách bịa giảm.
 */
async function requestValidatedAI(
  prompt: string,
  keys: AIKeys,
  facts: ChartFacts,
  opts: { allowRetry?: boolean } = {},
): Promise<string> {
  let text = await requestAI(prompt, keys);
  let v = validateAINarrative(text, facts);

  if (!v.ok && opts.allowRetry) {
    const corrective = prompt +
      '\n\n[SỬA LỖI BẮT BUỘC] Bản nháp trước đã nhắc tới cách cục KHÔNG có trên lá số này: ' +
      v.hallucinatedFormations.join(', ') +
      '. TUYỆT ĐỐI KHÔNG nhắc lại các cách đó. CHỈ dùng cách cục engine đã xác nhận trong dữ liệu.';
    const retry = await requestAI(corrective, keys);
    const v2 = validateAINarrative(retry, facts);
    if (v2.hallucinatedFormations.length < v.hallucinatedFormations.length) {
      text = retry; v = v2;
    }
  }

  if (!v.ok) text += '\n\n' + v.note; // fallback đính chính, không tốn thêm lượt
  return text;
}

async function requestAIWithOrder(
  prompt: string,
  order: ('claude' | 'openai')[],
  claudeKey: string,
  openaiKey: string,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    // Cờ bị-lỗi cho mỗi nguồn, để các lượt sau bỏ qua nguồn đã hỏng.
    const proxyFailed: Record<string, boolean> = { claude: false, openai: false };
    const failed: Record<string, boolean> = { claude: false, openai: false };
    const lastErrors: string[] = [];
    // Luôn thử qua PROXY trước (key CHUNG của app, phía server — xem callAiProxy) dù client có
    // hay không có BYOK key riêng, vì proxy không phụ thuộc key ở phía client. `order` rỗng
    // (chưa cấu hình BYOK) vẫn cần 1 thứ tự để thử proxy → mặc định ưu tiên OpenAI trước.
    const proxyOrder: ('claude' | 'openai')[] = order.length ? order : ['openai', 'claude'];

    const fetchOnce = async (p: string): Promise<string> => {
      // 1) PROXY — đường CHÍNH cho hầu hết người dùng (không cần BYOK key).
      for (const src of proxyOrder) {
        if (proxyFailed[src]) continue;
        try {
          return await callAiProxy(p, src, controller.signal);
        } catch (e: any) {
          if (e?.name === 'AbortError') throw e;
          proxyFailed[src] = true;
          lastErrors.push(`PROXY_${src.toUpperCase()}: ${String(e?.message || 'err').slice(0, 140)}`);
        }
      }
      // 2) BYOK — key riêng người dùng tự nhập trong Cài đặt, chỉ dùng khi proxy lỗi hẳn.
      for (const src of order) {
        if (failed[src]) continue;
        try {
          if (src === 'claude' && claudeKey) return await tryAnthropic(p, claudeKey, controller.signal);
          if (src === 'openai' && openaiKey) return await tryOpenAI(p, openaiKey, controller.signal);
        } catch (e: any) {
          if (e?.name === 'AbortError') throw e;
          failed[src] = true;
          lastErrors.push(`${src.toUpperCase()}: ${String(e?.message || 'err').slice(0, 140)}`);
        }
      }
      // Hết nguồn trả phí → dùng free model.
      return freeRequest(p, controller.signal);
    };

    // Vòng lặp lấy nội dung hợp lệ:
    //   • Lượt 1: gọi nguồn ưu tiên (proxy trước, BYOK sau, ngược lại free).
    //   • Lượt 2: chỉ retry nếu lượt 1 thực sự rỗng/ngắn quá; KHÔNG retry khi
    //     output từ paid model bị flag degenerate (paid model RẤT hiếm khi rác,
    //     flag thường là false-positive và retry sẽ tốn thời gian dẫn đến timeout).
    //   • Lượt 3: dành cho trường hợp paid hỏng → đã fall sang free model.
    let content = '';
    let degenerateCount = 0;
    for (let attempt = 0; attempt < 3; attempt++) {
      const got = (await fetchOnce(prompt)).trim();
      if (!got || got.length < 40) {
        // Output rỗng / quá ngắn → nguồn hỏng → đánh fail rồi thử nguồn kế (proxy trước, BYOK sau).
        let marked = false;
        for (const src of proxyOrder) {
          if (!proxyFailed[src]) { proxyFailed[src] = true; marked = true; break; }
        }
        if (!marked) {
          for (const src of order) {
            if (!failed[src]) { failed[src] = true; break; }
          }
        }
        continue;
      }
      // Degenerate check: bỏ qua khi đang dùng paid model còn sống (proxy hoặc BYOK).
      // Chỉ áp cho free model — vì pollinations đôi khi thật sự ra rác.
      const stillUsingPaid = proxyOrder.some(s => !proxyFailed[s]) || order.some(s => !failed[s]);
      if (!stillUsingPaid && looksDegenerate(got)) {
        degenerateCount++;
        continue;
      }
      content = got;
      break;
    }
    if (!content) {
      clearTimeout(timer);
      throw new Error(
        'AI trả về nội dung không hợp lệ (lặp từ hoặc lẫn ngôn ngữ khác). ' +
        'Vui lòng thử lại sau, hoặc dùng API key Claude (Cài đặt) để có chất lượng ổn định.',
      );
    }

    // Nếu bị cắt → VIẾT TIẾP — nhưng CHỈ khi nội dung hiện tại lành mạnh.
    let guard = 0;
    // Ngưỡng tính theo SỐ KÝ TỰ (không phải số từ). Các phần dài nhất của Bát Tự/
    // Toàn lá số nhắm ~1900 từ (~11.000-12.000 ký tự tiếng Việt) — ngưỡng cũ 2000
    // ký tự quá nhỏ nên hầu như không bao giờ bắt được các phần dài bị cắt giữa
    // chừng (vd Bát Tự bị cắt ngay đầu mục "Chiến lược hành động").
    while (isLikelyTruncated(content) && guard < 2 && content.length < 13000) {
      guard++;
      const tail = content.slice(-320);
      const contPrompt =
        'Đây là một bài luận giải Tử Vi đang viết dở và BỊ CẮT. Hãy VIẾT TIẾP ' +
        'cho HOÀN CHỈNH các mục còn thiếu (nhất là phần Kết luận & lời khuyên), ' +
        'KHÔNG mở đầu lại, KHÔNG lặp lại nội dung đã có, và KẾT THÚC trọn vẹn.\n\n' +
        'Đoạn cuối đã có:\n"""' + tail + '"""';
      let more = '';
      try { more = (await fetchOnce(contPrompt)).trim(); } catch { break; }
      if (!more || more.length < 20) break;
      // Bỏ qua phần nối nếu nó bị thoái hóa
      if (looksDegenerate(more)) break;
      content = (content + '\n' + more.replace(tail.slice(-80), '')).trim();
    }

    clearTimeout(timer);
    return content;
  } catch (e: any) {
    clearTimeout(timer);
    const msg = String(e?.message || '');
    if (msg.startsWith('FREE_BUSY')) {
      throw new Error(
        'Dịch vụ AI miễn phí đang quá tải / giới hạn lượt (API công cộng legacy ' +
        'chỉ cho 1 lượt mỗi lần). Vui lòng thử lại sau ít phút, hoặc nhập API key ' +
        'Claude trong Cài đặt để phân tích ổn định, chất lượng cao.',
      );
    }
    if (e?.name === 'AbortError') {
      // Timeout — proxy (key dùng chung) luôn được thử trước cho MỌI người dùng nên luôn coi
      // như "có nguồn trả phí" khi báo lỗi timeout (khác trước đây khi còn phụ thuộc BYOK key).
      throw new Error(
        'AI mất hơn 2 phút chưa phản hồi xong. Có thể do prompt yêu cầu output dài ' +
        'hoặc dịch vụ AI đang chậm. Vui lòng thử lại sau ít phút.',
      );
    }
    if (e instanceof TypeError || /network|fetch|Failed/i.test(msg)) {
      throw new Error('OFFLINE');
    }
    throw e;
  }
}

/** Gọi model miễn phí: POST trước (ổn định, không giới hạn URL) rồi GET,
 *  thử lại 2 vòng có nghỉ giữa. Ném Error('FREE_BUSY:...') nếu hỏng hết. */
async function freeRequest(prompt: string, signal: AbortSignal): Promise<string> {
  let last = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const c = (await tryPost(prompt, signal)).trim();
      if (c.length >= 40) return c;
      last = 'empty';
    } catch (e: any) {
      if (e?.name === 'AbortError') throw e;
      last = String(e?.message || 'err');
    }
    try {
      const c = (await tryGet(prompt, signal)).trim();
      if (c.length >= 40) return c;
      last = 'empty';
    } catch (e: any) {
      if (e?.name === 'AbortError') throw e;
      last = String(e?.message || 'err');
    }
    if (attempt === 0) await new Promise(r => setTimeout(r, 2500));
  }
  throw new Error('FREE_BUSY:' + last);
}

/**
 * Phân tích AI cho 1 cung. Ném Error('OFFLINE') nếu lỗi mạng/timeout.
 */
export async function analyzePalaceWithAI(
  result: AstrologyResult,
  branchIndex: number,
): Promise<string> {
  const prompt = buildPalacePrompt(result, branchIndex);
  return capWords(await requestAI(prompt, aiKeysOf(result.birthInfo)), 5000);
}

/** Dữ liệu nền (context) dùng chung cho mọi PHẦN của bài luận toàn lá số. */
export function buildChartContext(result: AstrologyResult): { context: string; gender: string; orderTxt: string } {
  const { birthInfo, tuViChart: c } = result;
  const houses = [...c.houses].sort((a, b) => (a.isManh ? -1 : 0) - (b.isManh ? -1 : 0));
  // Helper: tóm tắt chính tinh + phụ tinh của 1 cung khác (dùng cho tam hợp/nhị hợp/xung).
  const briefStars = (hh: TuViHouse | undefined): string => {
    if (!hh) return '—';
    const { chinh, phu } = starsOf(hh);
    const core = chinh.join(', ') || 'Vô chính diệu';
    const extra = phu.slice(0, 4).join(', ');
    return `${hh.palaceName} (${hh.branch}) — ${core}${extra ? ` + ${extra}` : ''}`;
  };
  const lines = houses.map(h => {
    const { chinh, phu } = starsOf(h);
    const tt = (h.tuanAt ? ', TUẦN' : '') + (h.trietAt ? ', TRIỆT' : '');
    const idx = c.houses.indexOf(h);
    const group = TAM_HOP.find(g => g.includes(idx)) ?? [];
    const tamHopHouses = group.filter(i => i !== idx).map(i => c.houses[i]);
    const xungHouse = c.houses[(idx + 6) % 12];
    const nhIdx = NHI_HOP[idx];
    const nhiHopHouse = nhIdx !== undefined ? c.houses[nhIdx] : undefined;
    // Cách cục hình thành TẠI cung này — để AI luận cùng sao hiện có, không tách rời.
    const cachTaiCung = cachCucAtPalace(result, h.palaceName);
    const cachTxt = cachTaiCung.length
      ? cachTaiCung.slice(0, 4).map(d => `${d.cach.name} (${d.score}đ)`).join(', ')
      : '(không có)';
    return `- ${h.palaceName} (${BR(h)}${h.isManh ? ', MỆNH' : ''}${h.isThan ? ', THÂN' : ''}${tt}): `
      + `chính tinh ${chinh.join(', ') || 'Vô chính diệu'}`
      + (phu.length ? ` | phụ tinh ${phu.slice(0, 10).join(', ')}` : '')
      + `\n   · Cách cục tại cung này: ${cachTxt}`
      + `\n   · Tam hợp: ${tamHopHouses.map(briefStars).join(' ; ') || '—'}`
      + `\n   · Nhị hợp: ${briefStars(nhiHopHouse)}`
      + `\n   · Xung chiếu: ${briefStars(xungHouse)}`;
  });
  const tuanCung = houses.filter(h => h.tuanAt).map(h => h.palaceName);
  const trietCung = houses.filter(h => h.trietAt).map(h => h.palaceName);
  const TT_TXT: Record<string, string> = {
    sinhNhap: 'sinh nhập', dongHanh: 'đồng hành', khacXuat: 'khắc xuất', sinhXuat: 'sinh xuất', khacNhap: 'khắc nhập',
  };
  const dvLines = result.daiVans.slice(0, 10).map(dv => {
    const sc = scoreDaiVan(result, dv);
    return `- ${dv.startAge}-${dv.endAge}t (${dv.stem} ${dv.branch}, cung ${sc.palaceName}): ` +
      `Thiên thời ${TT_TXT[sc.thienThoi]} · Địa lợi ${TT_TXT[sc.diaLoi]} · Nhân hòa ${sc.nhanHoa} → ${sc.rating} (TL=${sc.taiLoc}, TT=${sc.thachThuc})`;
  });
  const palaceKb = Object.entries(KHAI_QUAT_12_CUNG).map(([k, v]) => `• ${k}: ${trim(v, 240)}`).join('\n');
  const chinhSet = new Set<string>();
  for (const h of houses) for (const s of h.stars.filter(x => x.type === 'chinh')) chinhSet.add(s.name);
  const chinhKb = Array.from(chinhSet).map(n => CHINH_TINH_CORE[n] ? `• ${n}: ${trim(CHINH_TINH_CORE[n], 220)}` : '').filter(Boolean).join('\n');

  const gender = birthInfo.gender === 'nam' ? 'Nam' : 'Nữ';
  const orderTxt = gender === 'Nam'
    ? 'Mệnh → Thân → Phúc Đức → Quan Lộc → Tài Bạch → Thiên Di → Phu Thê'
    : 'Mệnh → Thân → Phúc Đức → Phu Thê → Tài Bạch → Tử Tức';

  // ─── DỮ KIỆN CỐ ĐỊNH: ngũ hành Mệnh vs Cục (tự suy ra để AI không nhầm) ───
  const SINH: Record<string, string> = { Mộc: 'Hỏa', Hỏa: 'Thổ', Thổ: 'Kim', Kim: 'Thủy', Thủy: 'Mộc' };
  const KHAC: Record<string, string> = { Mộc: 'Thổ', Thổ: 'Thủy', Thủy: 'Hỏa', Hỏa: 'Kim', Kim: 'Mộc' };
  const napEl = (c.napAmMenh.split(' ').pop() || '?').trim();
  const cucEl = ['Thủy', 'Mộc', 'Hỏa', 'Thổ', 'Kim'].find(e => c.cucName.includes(e)) || '?';
  let mcRel = '';
  if (napEl === cucEl) mcRel = `${napEl} ĐỒNG HÀNH ${cucEl} — hai yếu tố hòa, căn cơ vững`;
  else if (SINH[napEl] === cucEl) mcRel = `${napEl} sinh ${cucEl} → MỆNH SINH XUẤT CỤC — Mệnh phải nuôi Cục, hao tổn căn lực`;
  else if (SINH[cucEl] === napEl) mcRel = `${cucEl} sinh ${napEl} → MỆNH ĐƯỢC SINH NHẬP — được nuôi dưỡng, đại cát`;
  else if (KHAC[napEl] === cucEl) mcRel = `${napEl} khắc ${cucEl} → MỆNH KHẮC XUẤT CỤC — chủ động vượt cục diện, hơi vất vả`;
  else if (KHAC[cucEl] === napEl) mcRel = `${cucEl} khắc ${napEl} → MỆNH BỊ KHẮC NHẬP — Cục khắc Mệnh, cần thận trọng tích đức để hóa giải`;
  else mcRel = 'không xác định';

  const context = [
    `LÁ SỐ — Người xem: ${gender}, sinh ${birthInfo.day}/${birthInfo.month}/${birthInfo.year} giờ ${birthInfo.hour}h. ` +
    `Bản Mệnh ${c.napAmMenh} (hành ${napEl}), Cục ${c.cucName} (hành ${cucEl}), Âm Dương ${c.amDuongThuanLy === 'thuận' ? 'Thuận Lý' : 'Nghịch Lý'}.`,
    `★ DỮ KIỆN CỐ ĐỊNH — NGŨ HÀNH MỆNH-CỤC (BẮT BUỘC dùng nguyên văn, KHÔNG được tự suy diễn quan hệ khác): ${mcRel}.`,
    '',
    palaceMapBlock(result),
    '',
    '12 CUNG (M=Miếu V=Vượng Đ=Đắc B=Bình H=Hãm):',
    lines.join('\n'),
    '',
    'KB 12 CUNG:', palaceKb,
    chinhKb ? '\nKB CHÍNH TINH:\n' + chinhKb : '',
    '',
    (tuanCung.length || trietCung.length)
      ? `★ DỮ KIỆN CỐ ĐỊNH — TUẦN/TRIỆT (BẮT BUỘC dùng ĐÚNG, KHÔNG suy diễn, KHÔNG đổi sang cung khác):\n` +
        `• Cung BỊ Tuần Không: ${tuanCung.join(', ') || '(không có)'}.\n` +
        `• Cung BỊ Triệt Lộ: ${trietCung.join(', ') || '(không có)'}.\n` +
        `• TẤT CẢ CÁC CUNG KHÁC: KHÔNG bị Tuần/Triệt — tuyệt đối không gán Tuần/Triệt cho chúng (kể cả khi xét tam hợp/nhị hợp, vì Tuần/Triệt KHÔNG lan qua tam hợp/nhị hợp).\n` +
        `(Ý nghĩa: gặp cung tốt → giảm/hoãn; gặp cung xấu → che chắn; mạnh nửa đầu đời.)`
      : '★ DỮ KIỆN CỐ ĐỊNH: lá số KHÔNG có cung nào bị Tuần/Triệt — TUYỆT ĐỐI không nhắc Tuần/Triệt ở bất kỳ cung nào.',
    '',
    '★ TỨ HÓA CỐ ĐỊNH:',
    summarizeYearHoa(c),
    '',
    buildCachCucContext(result),
    '',
    '★ PHI HÓA NAM PHÁI (4 hóa tinh phát đi từ CAN của mỗi cung — đây là KỸ THUẬT GỐC của Nam Phái, bắt buộc dùng trong phần "Phi Hóa & Khí số toàn lá số"):',
    summarizeAllPhiHoa(c) || '(không xác định được)',
    '',
    '★ DỮ KIỆN CỐ ĐỊNH — CHUỖI ĐẠI VẬN (BẮT BUỘC dùng ĐÚNG tên cung theo dữ liệu dưới đây, TUYỆT ĐỐI KHÔNG tự gán cung khác cho đại vận; vd đại vận 42-51t đóng cung gì thì ghi đúng cung đó, không được đổi sang Tật Ách / Tài Bạch / cung khác theo cảm tính):',
    dvLines.join('\n'),
    '',
    (() => {
      const cp = careerProfile(result);
      return cp
        ? `★ GỢI Ý NGÀNH NGHỀ CỤ THỂ (theo chính tinh ${cp.names.join(', ')} tại ${cp.src}) — DÙNG LÀM ĐIỂM TỰA, AI hãy nêu rõ và MỞ RỘNG cụ thể hơn, KHÔNG nói chung chung: ${cp.fields.join('; ')}.`
        : '';
    })(),
  ].filter(Boolean).join('\n');

  return { context, gender, orderTxt };
}

/**
 * SYSTEM PROMPT chuẩn cho AI Tử Vi — theo "PROMPT CHUẨN CHO AI TỬ VI"
 * (Lê Quang Lăng kết hợp phương pháp luận Diệu Xuân).
 *
 * Mọi nhận định phải dựa trên 9 yếu tố:
 *   1. Chính tinh                4. Tứ Hóa
 *   2. Miếu Vượng Đắc Hãm        5. Phi Hóa Nam Phái
 *   3. Bộ sao (cách cục)         6. Tam hợp
 *                                7. Xung chiếu
 *                                8. Khí số cung
 *                                9. Khí số toàn lá số
 */
const FULLCHART_RULES =
  'Bạn là chuyên gia Tử Vi Nam Phái theo hệ thống Lê Quang Lăng kết hợp phương pháp luận Diệu Xuân. ' +
  'Mọi nhận định BẮT BUỘC dựa trên 9 yếu tố: chính tinh, Miếu/Vượng/Đắc/Bình/Hãm, bộ sao (cách cục), Tứ Hóa cố định, ' +
  'Phi Hóa Nam Phái, tam hợp, xung chiếu, khí số cung, khí số toàn lá số. KHÔNG kết luận chỉ dựa vào 1 sao riêng lẻ. ' +
  '★ Mỗi nhận định quan trọng phải gồm đủ 4 lớp: [Dữ kiện] → [Phân tích] → [Kết luận] → [Mức độ ảnh hưởng 1–10]. ' +
  'KHÔNG dùng ngôn ngữ mê tín; ưu tiên khuyến nghị THỰC TIỄN về sự nghiệp – tài chính – quan hệ – sức khỏe – quản trị rủi ro. ' +
  'Tiếng Việt mạch lạc; tiêu đề dạng "# Tên phần" (KHÔNG ghi "Bước"/số thứ tự); KHÔNG dùng bảng markdown, KHÔNG ký hiệu | hay ---. ' +
  'KHÔNG mở đầu bằng lời chào, KHÔNG lặp dữ liệu — viết thẳng vào nội dung. ' +
  'VIẾT TRỌN VẸN trong giới hạn từ, ưu tiên đủ ý và kết thúc hoàn chỉnh hơn là viết dài. ' +
  '★ TUẦN/TRIỆT: chỉ áp dụng cho các cung có trong danh sách dữ liệu; TUYỆT ĐỐI KHÔNG suy diễn Tuần/Triệt ở cung khác (không lan qua tam hợp/nhị hợp). ' +
  '★ TUYỆT ĐỐI KHÔNG nhắc khái niệm "Mệnh chủ" / "Thân chủ" — phái Nam Phái không dùng. ' +
  '★ TUYỆT ĐỐI KHÔNG dự đoán SỰ KIỆN CỤ THỂ vào NGÀY CỤ THỂ (vd "tai nạn ngày 15/6", "kết hôn tháng 8 năm sau", "bị bệnh X vào năm Y") — chỉ nói XU HƯỚNG, MỨC ĐỘ thuận lợi/rủi ro và KHUYẾN NGHỊ hành động. KHÔNG được phán "chắc chắn xảy ra", "không thể tránh", "định mệnh là vậy". ' +
  '★ KHÔNG đưa ra lời khuyên Y TẾ (chẩn đoán bệnh, thuốc), TÀI CHÍNH cụ thể (mua mã cổ phiếu X, đầu tư khoản Y), hay PHÁP LÝ (kiện ai, ký hợp đồng nào). Khi đề cập các chủ đề này, luôn khuyến nghị tham vấn chuyên gia (bác sĩ / cố vấn tài chính / luật sư). ' +
  '★ NGŨ HÀNH MỆNH-CỤC: BẮT BUỘC dùng đúng quan hệ đã ghi trong dòng "DỮ KIỆN CỐ ĐỊNH — NGŨ HÀNH MỆNH-CỤC" — KHÔNG được tự tính lại hay suy ra quan hệ khác. ' +
  '★ ĐẠI VẬN: BẮT BUỘC ghi đúng tên CUNG mà đại vận đóng theo dữ liệu "CHUỖI ĐẠI VẬN" — KHÔNG được đổi sang cung khác (vd dữ liệu ghi 42-51t cung Tài Bạch thì PHẢI ghi Tài Bạch, không được nói là Tật Ách hay cung khác). ' +
  'Khi luận một cung, dựa vào: (a) chính tinh + phụ tinh tại CHÍNH CUNG ĐÓ; (b) "Cách cục tại cung này" (đã liệt kê dưới mỗi dòng cung) — LUẬN CÙNG với các sao hiện có, KHÔNG tách rời cách cục khỏi phân tích sao của cung; (c) các sao tại tam hợp/nhị hợp/xung chiếu (đã liệt kê dưới mỗi dòng cung); ' +
  '(d) Tứ Hóa cố định + Phi Hóa Nam Phái của cung. KHÔNG nhầm "sao tại cung Mệnh" với "sao Mệnh chủ". KHÔNG bịa cách cục ngoài danh sách "Cách cục tại cung này" hoặc "★ CÁCH CỤC ENGINE".';

/**
 * Danh sách các PHẦN của bài luận toàn lá số. Mỗi phần là 1 request 4o-mini
 * riêng (ngắn → có kết quả nhanh), tổng cộng ~9.000–10.000 từ. App lấy phần đầu
 * trước, vừa hiển thị (đánh máy) vừa tải các phần sau.
 */
export function fullChartSections(result: AstrologyResult): { title: string; run: () => Promise<string> }[] {
  const { context, gender, orderTxt } = buildChartContext(result);
  const keys = aiKeysOf(result.birthInfo);
  // maxWords: giới hạn SỐ TỪ mỗi phần; tổng các phần ≈ 10.000 từ.
  const make = (instruction: string, maxWords: number) => async () =>
    capWords(stripBuocHeadings(await requestAI(`${context}\n\n=== YÊU CẦU PHẦN NÀY ===\n${FULLCHART_RULES}\n${instruction}`, keys)), maxWords);

  // Cấu trúc 9 PHẦN — bám "KHUNG LUẬN TỔNG THỂ LÁ SỐ" + "CẤU TRÚC AI NÊN TRẢ VỀ"
  // (Lê Quang Lăng + Diệu Xuân — Nam Phái Việt Nam).
  return [
    {
      // Phần 1 (THỂ) + mục 1-2 trong AI output (Tổng quan + Bản chất con người).
      title: '1. Tổng quan lá số & bản chất con người (THỂ)',
      run: make(
        natalFactsBlock(result) + '\n\n' +
        'Viết phần "# Tổng quan lá số & Bản chất con người" (~1400 từ, kết thúc trọn vẹn). ' +
        'Phải bao quát PHẦN THỂ: (1) Mệnh — chính tinh tọa thủ + miếu hãm + tính cách gốc; ' +
        '(2) Thân — vị trí Thân, cung Thân cư, lực Thân đối với Mệnh; ' +
        '(3) Cục (Thủy/Mộc/Hỏa/Thổ/Kim Nhị/Tam/Tứ/Ngũ/Lục Cục) — sức bền cuộc đời; ' +
        '(4) Âm Dương Thuận Lý / Nghịch Lý; (5) Ngũ hành sinh khắc giữa Bản Mệnh nạp âm và Cục; ' +
        '(6) Mệnh-Thân đồng/dị cung. ' +
        'Đúc kết "bản chất con người" — 5-7 nét tính cách cốt lõi. ' +
        'KHÔNG nhắc "Mệnh chủ" / "Thân chủ".',
        1700,
      ),
    },
    {
      // Phần 1b — Cách cục & Cơ chế vận mệnh (Tầng 9 theo khung luận chuẩn).
      title: '2. Cách cục & Cơ chế vận mệnh',
      run: make(
        'Viết phần "# Cách cục & Cơ chế vận mệnh" (~1300 từ, kết thúc trọn vẹn). ' +
        'BẮT BUỘC dựa trên "★ CÁCH CỤC ENGINE". ★★ ƯU TIÊN LUẬN TRƯỚC TIÊN mục "CÁCH CỤC CHÍNH — từ 4 cung TRỌNG YẾU Mệnh/Tài Bạch/Quan Lộc/Thiên Di" — đây là các cách quan trọng nhất, quyết định cốt lõi vận mệnh, PHẢI phân tích đầy đủ TỪNG cách trong mục này trước khi sang các cách khác. Sau đó mới luận "CÁCH CHỦ KHÁC", "CÁCH PHỤ", "CÁCH HUNG KHÁC". ' +
        'PHÂN TÍCH TẤT CẢ cách có trong danh sách — KHÔNG thêm cách mới, KHÔNG bỏ sót bất kỳ cách nào trong danh sách (đặc biệt không được bỏ sót cách cục chính), KHÔNG liệt kê tên suốt. ' +
        '(1) CÁCH CỤC CHÍNH (Mệnh/Tài Bạch/Quan Lộc/Thiên Di): với MỖI cách — (a) bằng chứng: sao nào hội, cung nào, miếu/hãm; (b) cách phá/cứu hiện diện; (c) CƠ CHẾ VẬN HÀNH cụ thể — tiền đến theo con đường nào, quyền lực/danh vọng qua cơ chế gì; (d) tác động 5 chiều: sự nghiệp, tài chính, quan hệ, hôn nhân, sức khỏe. ' +
        '(2) CÁCH CHỦ/PHỤ KHÁC: vai trò bổ sung — hỗ trợ ở điểm nào, môi trường/thời điểm phát huy, điều kiện kích hoạt. ' +
        '(3) CÁCH HUNG: điểm nghẽn cụ thể và cơ chế gây ra — KHÔNG hù dọa, phân tích phương án quản trị thực tế. ' +
        '(4) CƠ CHẾ TỔNG HỢP: chốt "cơ chế vận mệnh" — lá số vận hành theo cơ chế gì, phát tài theo con đường nào, điểm dễ vấp ở đâu, chiến lược đời sống cốt lõi. ' +
        'NGUYÊN TẮC: mỗi kết luận cần ít nhất 2 dữ kiện; không dùng ngôn ngữ mê tín.',
        1600,
      ),
    },
    {
      // Phần 2 (DỤNG) — năng lực vận hành cuộc đời.
      title: '3. Sự nghiệp – Tài chính – Giao tiếp – Bất động sản (DỤNG)',
      run: make(
        'Viết phần "# Năng lực vận hành cuộc đời (Quan – Tài – Di – Nô – Điền)" (~1600 từ, kết thúc trọn vẹn). ' +
        `Thứ tự ưu tiên cho ${gender}: ${orderTxt}. Phân tích từng cung: chính tinh & miếu hãm, phụ tinh & cát/sát, cách cục, tam hợp/xung chiếu, ` +
        'Tứ Hóa cố định tại cung, Tuần/Triệt nếu có. Mỗi cung kết bằng "Mức độ ảnh hưởng: x/10". ' +
        '★ ĐỊNH HƯỚNG NGHỀ NGHIỆP — BẮT BUỘC CỤ THỂ: dựa trên chính tinh Quan Lộc (+ Mệnh, + Tài Bạch) và "GỢI Ý NGÀNH NGHỀ CỤ THỂ" trong dữ liệu, ' +
        'hãy nêu 5–8 NGÀNH/VỊ TRÍ CỤ THỂ người này hợp (ví dụ: tư vấn, cố vấn, marketing, tài chính – kế toán, kỹ thuật – công nghệ, giáo dục, pháp lý, kinh doanh…), ' +
        'kèm 1 câu lý do ngắn cho mỗi nhóm (bám sao/cách cục) và gợi ý NÊN LÀM CHỦ hay LÀM CÔNG, môi trường phù hợp. ' +
        'TUYỆT ĐỐI KHÔNG nói chung chung kiểu "nghề trí tuệ", "hợp kinh doanh" — phải gọi tên ngành/vị trí cụ thể để người dùng có định hướng hành động. ' +
        'Kết luận: bộc lộ rõ ĐIỂM MẠNH NỔI BẬT về sự nghiệp/tài chính + ĐIỂM YẾU cần khắc phục.',
        1900,
      ),
    },
    {
      // Phần 3 (PHÚC KHÍ) + Phần 4 (TÌNH CẢM) + Phần 5 (SỨC KHỎE).
      title: '4. Phúc khí, Gia đạo, Hôn nhân, Tử tức, Sức khỏe',
      run: make(
        'Viết phần "# Phúc khí – Gia đạo – Hôn nhân – Sức khỏe" (~1500 từ, kết thúc trọn vẹn). Bao gồm: ' +
        '(a) Phúc Đức — căn nguyên phúc khí, hưởng thụ tinh thần; ' +
        '(b) Phụ Mẫu — quan hệ cha mẹ, ấm/lạnh; ' +
        '(c) Huynh Đệ — tình anh em, bạn hữu thân; ' +
        '(d) Phu Thê — phối ngẫu, hôn nhân (cách cục bền/sóng gió); ' +
        '(e) Tử Tức — con cái, hoặc duyên với học trò/đệ tử; ' +
        '(f) Tật Ách — sức khỏe trọng yếu, bệnh tiềm ẩn. ' +
        'Mỗi cung: chính tinh + miếu hãm + phụ tinh + cách cục + tam hợp/xung + Mức độ ảnh hưởng x/10.',
        1800,
      ),
    },
    {
      // Phần 6 (KHÍ SỐ TOÀN LÁ SỐ) — 6 trục đối.
      title: '5. Khí số 6 trục đối của toàn lá số',
      run: make(
        'Viết phần "# Khí số 6 trục đối toàn lá số" (~900 từ, kết thúc trọn vẹn). Phân tích lực kéo–đẩy của 6 trục: ' +
        '(1) Mệnh ↔ Thiên Di — bản thân vs môi trường ngoài; ' +
        '(2) Tài Bạch ↔ Phúc Đức — tiền vs phúc; ' +
        '(3) Quan Lộc ↔ Phu Thê — sự nghiệp vs hôn nhân; ' +
        '(4) Điền Trạch ↔ Tử Tức — gia tài vs con cái; ' +
        '(5) Phụ Mẫu ↔ Tật Ách — gốc gác vs sức khỏe; ' +
        '(6) Huynh Đệ ↔ Nô Bộc — anh em ruột vs bạn bè ngoài. ' +
        'Mỗi trục: trục đó CÂN BẰNG hay LỆCH? Bên nào mạnh hơn? Hệ quả gì? Mức độ ảnh hưởng x/10.',
        1200,
      ),
    },
    {
      // Phần 7 (NAM PHÁI) — Phi Hóa, Kỵ lớn nhất, nút thắt, nguồn lực.
      title: '6. Phi Hóa Nam Phái — Nút thắt & Nguồn lực cuộc đời',
      run: make(
        'Viết phần "# Phi Hóa Nam Phái — Tổng Lộc/Quyền/Khoa/Kỵ & Nút thắt cuộc đời" (~1200 từ, kết thúc trọn vẹn). ' +
        'BẮT BUỘC dùng dữ liệu PHI HÓA NAM PHÁI đã liệt kê. Phân tích: ' +
        '(1) Tổng Lộc — các cung nhận Lộc phi vào, ý nghĩa tài lộc/cơ hội/nhân duyên đến từ đâu; ' +
        '(2) Tổng Quyền — quyền hành tập trung ở đâu; ' +
        '(3) Tổng Khoa — danh tiếng/quý nhân/học vấn từ đâu; ' +
        '(4) Tổng Kỵ — các cung bị Kỵ phi vào, vướng mắc/áp lực; ' +
        '(5) Kỵ LỚN NHẤT — cung nào nặng Kỵ nhất → NÚT THẮT cuộc đời cần tháo gỡ; ' +
        '(6) NGUỒN LỰC LỚN NHẤT — cung tụ nhiều Lộc/Quyền/Khoa → điểm tựa cốt lõi. ' +
        'Phần này thể hiện chiều sâu Nam Phái — KHÔNG được bỏ qua hoặc nói chung chung.',
        1600,
      ),
    },
    {
      // Phần 8 (ĐẠI VẬN).
      title: '7. Vận hiện tại & 3 đại vận mạnh nhất / 3 đại vận khó nhất',
      run: make(
        'Viết phần "# Vận trình các Đại vận" (~1100 từ, kết thúc trọn vẹn). ' +
        '(a) ĐẠI VẬN HIỆN TẠI — đang ở vận nào, cung gì, sao gì, tiên lượng 10 năm; ' +
        '(b) 3 ĐẠI VẬN MẠNH NHẤT — vì sao mạnh (Thiên thời/Địa lợi/Nhân hòa), thời điểm bứt phá; ' +
        '(c) 3 ĐẠI VẬN KHÓ NHẤT — vì sao khó, cần thận trọng những việc gì. ' +
        'Nguyên tắc: <30t lấy Mệnh chủ đạo, ≥30t lấy Thân chủ đạo. "Đại vận lấn áp Tiểu vận".',
        1400,
      ),
    },
    {
      // Mục 11-12-13 trong AI output — 3 cơ hội / 3 rủi ro / hành động.
      title: '8. 3 cơ hội lớn nhất & 3 rủi ro lớn nhất',
      run: make(
        'Viết phần "# 3 Cơ hội lớn nhất & 3 Rủi ro lớn nhất" (~700 từ, NGẮN GỌN, kết thúc trọn vẹn). ' +
        'Bám sát dữ liệu Phi Hóa (Lộc/Quyền/Khoa hội tụ) + đại vận sắp tới + các cách cục quý hiển: ' +
        '★ 3 cơ hội cụ thể (đặt tên ngắn, mỗi cơ hội 2-3 câu — tại đâu, khi nào, làm thế nào nắm bắt). ' +
        '★ 3 rủi ro cụ thể (đặt tên ngắn, mỗi rủi ro 2-3 câu — tại đâu, dấu hiệu cảnh báo, cách phòng tránh). ' +
        'KHÔNG nói chung chung, phải cụ thể "lĩnh vực gì - tuổi bao nhiêu - làm gì".',
        900,
      ),
    },
    {
      // Mục 13 + Phần 9 (KẾT LUẬN — chấm điểm).
      title: '9. Tổng khí số cuộc đời (chấm điểm) & Hành động khuyến nghị',
      run: make(
        (() => {
          const s = computeSixDomainScores(result);
          return '[ĐIỂM ENGINE ĐÃ TÍNH — BẮT BUỘC dùng chính xác các con số này, KHÔNG được tự thay đổi]:\n' +
            `- Phúc khí ${s.phuc}/10 (${s.phucLyDo})\n` +
            `- Tài khí ${s.tai}/10 (${s.taiLyDo})\n` +
            `- Quan khí ${s.quan}/10 (${s.quanLyDo})\n` +
            `- Điền khí ${s.dien}/10 (${s.dienLyDo})\n` +
            `- Hôn nhân ${s.hon}/10 (${s.honLyDo})\n` +
            `- Sức khỏe ${s.skh}/10 (${s.skhLyDo})\n\n`;
        })() +
        'Viết phần "# Tổng khí số cuộc đời & Hành động khuyến nghị" (~800 từ, BẮT BUỘC kết thúc trọn vẹn, không bỏ dở). ' +
        '★ Phần 1 — Tổng khí số: DÙNG LẠI ĐÚNG các số điểm ở trên, mỗi mảng kèm 1-2 câu diễn giải theo lý do đã cho. ' +
        '★ Phần 2 — 7 HÀNH ĐỘNG KHUYẾN NGHỊ cụ thể và thực tiễn (mỗi hành động 2-3 câu, có thể làm ngay): ' +
        'sự nghiệp, tài chính, quan hệ, sức khỏe, học hành/phát triển bản thân, gia đình, quản trị rủi ro.',
        1100,
      ),
    },
    {
      title: '10. Ngành nghề cụ thể & Định hướng phát triển',
      run: make(
        'Viết phần "# Ngành nghề cụ thể & Định hướng phát triển" (~900 từ, kết thúc trọn vẹn). ' +
        'Bám cung Mệnh + Quan Lộc + Tài Bạch + Thiên Di + cách cục chủ. ' +
        '(1) 5-8 NGÀNH/VỊ TRÍ CỤ THỂ hợp nhất (gọi tên rõ, kèm lý do dựa vào sao/cách cục). ' +
        '(2) 3-5 ngành/vị trí NÊN TRÁNH và lý do. ' +
        '(3) Chiến lược phát triển sự nghiệp theo 3 giai đoạn (dưới 30 / 30-45 / trên 45 tuổi). ' +
        '(4) Kỹ năng nên đầu tư sớm dựa vào bản chất sao chủ mệnh.',
        1200,
      ),
    },
    {
      title: '11. Quản trị rủi ro & Kế hoạch phòng thủ',
      run: make(
        'Viết phần "# Quản trị rủi ro & Kế hoạch phòng thủ" (~800 từ, kết thúc trọn vẹn). ' +
        '(1) 3-5 RỦI RO CỤ THỂ theo cách hung / cung yếu (không hù dọa, phân tích thực tế). ' +
        '(2) Với mỗi rủi ro: cơ chế phát tác + dấu hiệu nhận biết sớm + hành động phòng ngừa cụ thể. ' +
        '(3) Quản trị tài chính cá nhân (quỹ dự phòng bao nhiêu tháng, tránh loại đầu tư nào theo cách cục). ' +
        '(4) Quản trị sức khỏe (theo Tật Ách). ' +
        '(5) Quản trị quan hệ (theo cách chủ và cung Nô Bộc).',
        1100,
      ),
    },
  ];
}

/** Bỏ tiền tố "Bước N —/:" trong tiêu đề AI, chuyển thành tiêu đề markdown "# ...". */
function stripBuocHeadings(s: string): string {
  return s
    // **Bước 1 — Tiêu đề**  /  **Bước 1: Tiêu đề**
    .replace(/^\s*\*\*\s*Bước\s*\d+\s*[—:\-.)]*\s*(.+?)\*\*\s*$/gim, '# $1')
    // # Bước 1 — Tiêu đề
    .replace(/^\s*#{1,3}\s*Bước\s*\d+\s*[—:\-.)]*\s*(.+)$/gim, '# $1')
    // Bước 1 — Tiêu đề (dòng trần)
    .replace(/^\s*Bước\s*\d+\s*[—:\-.)]+\s*(.+)$/gim, '# $1');
}

/**
 * Phân tích AI TOÀN bộ lá số — chạy lần lượt các PHẦN rồi ghép (không streaming).
 * Màn hình nên dùng `fullChartSections` để hiển thị dần từng phần cho nhanh.
 */
export async function analyzeFullChartWithAI(result: AstrologyResult): Promise<string> {
  const sections = fullChartSections(result);
  const parts: string[] = [];
  for (const s of sections) parts.push(await s.run());
  return parts.join('\n\n');
}

/** Dữ liệu nền (context) dùng chung cho mọi PHẦN của bài luận MỘT đại vận. */
function buildDaiVanContext(result: AstrologyResult, dvIndex: number): { context: string; dv: any; h?: TuViHouse } {
  const { birthInfo, tuViChart: c } = result;
  const dv = result.daiVans[dvIndex];
  if (!dv) throw new Error('Không tìm thấy đại vận.');
  const h = c.houses.find(x => x.branch === dv.branch);
  const sv = h ? starsOf(h) : { chinh: [] as string[], phu: [] as string[] };
  const bIdx = c.houses.findIndex(x => x.branch === dv.branch);

  const TH: number[][] = [[8, 0, 4], [2, 6, 10], [5, 9, 1], [11, 3, 7]];
  const grp = bIdx >= 0 ? (TH.find(g => g.includes(bIdx)) ?? []) : [];
  const tamHop = grp.filter(i => i !== bIdx).map(i => c.houses[i]);
  const xung = bIdx >= 0 ? c.houses[(bIdx + 6) % 12] : undefined;
  const ctx = (hh?: TuViHouse) =>
    hh ? `${hh.palaceName} (${hh.branch}): ${starsOf(hh).chinh.join(', ') || 'Vô chính diệu'}` : '—';

  const kb: string[] = [];
  for (const nm of (h?.stars ?? []).map(s => (s.name.startsWith('L. ') ? s.name.slice(3) : s.name))) {
    const inf = getStarInfo(nm);
    if (inf && !kb.some(k => k.startsWith('• ' + nm))) kb.push(`• ${nm}: ${trim(inf.basic, 240)}`);
  }

  const startY = lunarBirthYear(birthInfo) + dv.startAge - 1;
  const endY = lunarBirthYear(birthInfo) + dv.endAge - 1;
  const sc = scoreDaiVan(result, dv);
  const TT_TXT: Record<string, string> = {
    sinhNhap: 'sinh nhập (rất tốt)', dongHanh: 'đồng hành (tốt)',
    khacXuat: 'khắc xuất (chật vật)', sinhXuat: 'sinh xuất (hao tổn)',
    khacNhap: 'khắc nhập (xấu)',
  };
  const DL_TXT: Record<string, string> = {
    sinhNhap: 'sinh Mệnh (tốt)', dongHanh: 'đồng hành (ổn)',
    khacXuat: 'Mệnh khắc đại vận (vất vả)', sinhXuat: 'Mệnh sinh đại vận (hao)',
    khacNhap: 'đại vận khắc Mệnh (kém)',
  };
  // Chuỗi 10 NĂM (tiểu vận) thuộc đại vận này — để AI luận từng năm.
  const yearLines = result.tieuVans
    .filter(t => t.daiVanIndex === dvIndex)
    .sort((a, b) => a.age - b.age)
    .map(t => {
      const ts = scoreTieuVan(result, t);
      const hh = c.houses.find(x => x.branch === t.branch);
      return `- ${t.age}t (năm ${t.year}, ${t.stem} ${t.branch}, cung ${ts?.palaceName ?? t.branch}): ` +
        `${ts?.rating ?? ''} (TL=${ts?.taiLoc ?? '-'}, TT=${ts?.thachThuc ?? '-'})` +
        (hh ? ` · ${starsOf(hh).chinh.join(', ') || 'VCD'}` : '');
    });
  // Các cung quan trọng để luận đầy đủ trong đại vận
  const importantPalaces = ['Mệnh', 'Quan Lộc', 'Tài Bạch', 'Phu Thê', 'Tử Tức', 'Điền Trạch', 'Phúc Đức', 'Thiên Di', 'Tật Ách']
    .map(pn => { const hh = c.houses.find(x => x.palaceName === pn); return hh ? `- ${pn} (${hh.branch}): ${starsOf(hh).chinh.join(', ') || 'VCD'}${hh.tuanAt ? ' [Tuần]' : ''}${hh.trietAt ? ' [Triệt]' : ''}` : ''; })
    .filter(Boolean);

  // ─── Tứ Hóa CỐ ĐỊNH tại cung đại vận + Phi Hóa của đại vận ───
  const hoaTaiCung = h
    ? h.stars.filter(s => s.name === 'Hóa Lộc' || s.name === 'Hóa Quyền' || s.name === 'Hóa Khoa' || s.name === 'Hóa Kỵ').map(s => s.name)
    : [];
  const phi = bIdx >= 0 ? computePhiHoa(c, bIdx) : { phat: [], nhan: [] };
  const phatTxt = phi.phat.length
    ? phi.phat.map(p => `${p.hoa}→${p.toPalace}(qua ${p.viaStar})`).join(', ')
    : '(không phát hóa nào tới cung có chính tinh tương ứng)';
  const nhanTxt = phi.nhan.length
    ? phi.nhan.map(p => `${p.hoa}←${p.fromPalace}(qua ${p.viaStar})`).join(', ')
    : '(không nhận hóa từ cung nào)';

  // Mệnh / Thân để so sánh.
  const menh = c.houses.find(x => x.isManh);
  const than = c.houses.find(x => x.isThan);

  // Chủ đề chính của vận — gợi ý dựa trên cung đại vận đóng.
  const PALACE_TOPIC: Record<string, string> = {
    'Mệnh': 'tự thân – định hình bản thân',
    'Phụ Mẫu': 'gốc gác – quan hệ với bậc trên',
    'Phúc Đức': 'phúc khí – đời sống tinh thần',
    'Điền Trạch': 'bất động sản – tài sản cố định – gia đạo',
    'Quan Lộc': 'sự nghiệp – công danh – vị trí',
    'Nô Bộc': 'mở rộng xã hội – quan hệ cộng sự',
    'Thiên Di': 'phương xa – môi trường ngoài – xuất ngoại',
    'Tật Ách': 'sức khỏe – tật bệnh – tái cấu trúc',
    'Tài Bạch': 'kiếm tiền – tích lũy – đầu tư',
    'Tử Tức': 'con cái – sáng tạo – kế thừa',
    'Phu Thê': 'hôn nhân – quan hệ bạn đời',
    'Huynh Đệ': 'anh em – đồng cấp – quan hệ ngang vai',
  };
  const palaceTopic = h ? (PALACE_TOPIC[h.palaceName] || h.palaceName) : '';

  // Đại vận đang ở quá khứ / hiện tại / tương lai (so với năm xem hoặc năm hiện tại).
  const ageNow = tuoiMuOfYear(birthInfo, c.viewingYear ?? new Date().getFullYear());
  const timeline = ageNow < dv.startAge ? 'TƯƠNG LAI' : ageNow > dv.endAge ? 'QUÁ KHỨ' : 'HIỆN TẠI';

  const context = [
    `Người xem: ${birthInfo.gender === 'nam' ? 'Nam' : 'Nữ'}, sinh ${birthInfo.year}. ` +
    `Đại vận ${dv.stem} ${dv.branch}, ${dv.startAge}-${dv.endAge} tuổi (năm ${startY}-${endY}), ` +
    `đóng tại cung ${h?.palaceName ?? dv.branch}. Đại vận này đang ở giai đoạn: ${timeline} (so với hiện tại của người xem).`,
    '',
    palaceMapBlock(result),
    `★ CHỦ ĐỀ CHÍNH gợi ý theo cung: ${palaceTopic} — AI cần gọi tên vận này thuộc loại nào (vận phát triển sự nghiệp / vận tích lũy tài chính / vận chuyển đổi / vận mở rộng xã hội / vận gia đạo–hôn nhân / vận sức khỏe – tái cấu trúc / vận học hỏi).`,
    '',
    '★ CUNG ĐẠI VẬN — đọc như cung độc lập:',
    `- Chính tinh: ${sv.chinh.join(', ') || 'Vô chính diệu (mượn sao xung chiếu)'}`,
    `- Phụ tinh: ${sv.phu.join(', ') || '(không)'}`,
    h?.tuanAt ? '- BỊ TUẦN KHÔNG án ngữ (làm chậm/hoãn; gặp tốt giảm tốt, gặp xấu đỡ xấu; mạnh nửa đầu đời)' : '',
    h?.trietAt ? '- BỊ TRIỆT LỘ án ngữ (cắt đứt/chặn ngang, mạnh hơn Tuần; gặp tốt cắt tốt, gặp xấu chặn xấu)' : '',
    `- Tứ Hóa CỐ ĐỊNH tọa thủ tại cung: ${hoaTaiCung.length ? hoaTaiCung.join(', ') : '(không có)'}`,
    `- Tam hợp: ${tamHop.map(ctx).join(' ; ') || '—'}`,
    `- Xung chiếu: ${ctx(xung)}`,
    '',
    '★ SO VỚI MỆNH GỐC (để biết vận này KÍCH HOẠT điểm mạnh hay điểm yếu, NÊN TIẾN CÔNG hay PHÒNG THỦ):',
    menh ? `- Cung Mệnh tại ${menh.branch}(${menh.palaceName}) — chính tinh ${starsOf(menh).chinh.join(', ') || 'Vô chính diệu'}.` : '- (không xác định được Mệnh)',
    '★ SO VỚI THÂN (để biết vận có TẠO CƠ HỘI HÀNH ĐỘNG THỰC TẾ không, hay chỉ tốt trên lý thuyết):',
    than ? `- Cung Thân tại ${than.branch}(${than.palaceName}) — chính tinh ${starsOf(than).chinh.join(', ') || 'Vô chính diệu'}.` : '- (không xác định được Thân)',
    '',
    '★ PHI HÓA NAM PHÁI CỦA ĐẠI VẬN (BẮT BUỘC dùng — đây là kỹ thuật gốc):',
    `- Cung đại vận (can ${h?.can || '?'}) PHÁT đi: ${phatTxt}.`,
    `- Cung đại vận NHẬN hóa từ: ${nhanTxt}.`,
    '(Dòng LỘC là đường mở cơ hội; dòng KỴ là điểm nghẽn cần quản trị.)',
    '',
    '3 YẾU TỐ luận đại vận (Thiên Lương):',
    `- THIÊN THỜI: tam hợp đại vận vs tam hợp tuổi → ${TT_TXT[sc.thienThoi]}`,
    `- ĐỊA LỢI : hành cung đại vận vs hành Mệnh → ${DL_TXT[sc.diaLoi]}`,
    `- NHÂN HÒA: bộ chính tinh đại vận vs bộ Mệnh → ${sc.nhanHoa}`,
    `→ Điểm Tài lộc ${sc.taiLoc} / Thách thức ${sc.thachThuc} → ${sc.rating}.`,
    '',
    buildCachCucContext(result, dv.branch, `Đại Vận ${dv.stem} ${dv.branch} (${dv.startAge}–${dv.endAge}t)`),
    '',
    '===== CÁC CUNG QUAN TRỌNG (luận đầy đủ trong đại vận) =====',
    importantPalaces.join('\n'),
    '',
    '===== CHUỖI 10 NĂM (TIỂU VẬN) TRONG ĐẠI VẬN NÀY =====',
    '★ AI BẮT BUỘC chia thành 3 GIAI ĐOẠN: 3 năm đầu (KHỞI ĐỘNG – nền tảng – thử thách), 4 năm giữa (BỨT PHÁ – biến động – chủ lực), 3 năm cuối (THU HOẠCH – ổn định – chuyển tiếp). Không nói cả 10 năm giống nhau.',
    yearLines.join('\n'),
    kb.length ? '\nKIẾN THỨC CHUẨN (bám theo, không bịa):\n' + kb.join('\n') : '',
  ].filter(Boolean).join('\n');

  return { context, dv, h };
}

/**
 * SYSTEM PROMPT cho phân tích Đại Vận — theo khung "AI Coach cá nhân":
 * không chỉ diễn giải sao, mà chuyển dữ liệu Tử Vi thành tư vấn HÀNH ĐỘNG
 * thực tế cho người dùng.
 */
const DAIVAN_RULES =
  'Bạn là chuyên gia Tử Vi Nam Phái theo hướng THỰC TIỄN — đóng vai AI COACH cá nhân tư vấn cho người dùng trong phần mềm thương mại (KHÔNG chỉ diễn giải sao). ' +
  '★ NGUYÊN TẮC BẮT BUỘC: ' +
  '(1) KHÔNG luận từng sao đơn lẻ — luôn xét trong tổ hợp (sao + miếu hãm + tam hợp + xung chiếu + Tứ Hóa + Phi Hóa). ' +
  '(2) KHÔNG phán đoán tuyệt đối ("chắc chắn giàu/nghèo/ly hôn/bệnh tật/tai nạn") — chỉ nói theo dạng XU HƯỚNG, mức độ thuận lợi/rủi ro, và hành động NÊN làm. ' +
  '(3) KHÔNG dùng ngôn ngữ mê tín, hù dọa. ' +
  '(4) Mỗi kết luận quan trọng PHẢI dựa trên ÍT NHẤT 2 DỮ KIỆN từ lá số. ' +
  '(5) Luôn phân biệt 4 lớp: [DỮ KIỆN lá số] → [PHÂN TÍCH] → [KẾT LUẬN] → [KHUYẾN NGHỊ hành động]. ' +
  '(6) Nếu dữ liệu thiếu, hãy nói rõ "chưa đủ dữ liệu để kết luận sâu" — KHÔNG bịa. ' +
  '(7) Ưu tiên tư vấn THỰC TẾ cho sự nghiệp – tài chính – quan hệ – hôn nhân – tài sản – sức khỏe. ' +
  '(8) Mỗi khuyến nghị phải CÓ THỂ HÀNH ĐỘNG ngay (cụ thể, không chung chung). ' +
  '★ Tiếng Việt mạch lạc; tiêu đề "# Tên mục" (KHÔNG ghi "Bước"/số); KHÔNG dùng bảng markdown; chỉ dùng dữ liệu đã cho, không bịa sao. ' +
  'KHÔNG mở đầu bằng lời chào, KHÔNG lặp dữ liệu. BÁM SÁT 3 yếu tố Thiên thời – Địa lợi – Nhân hòa + Phi Hóa Nam Phái. ' +
  'VIẾT TRỌN VẸN trong giới hạn số từ, KHÔNG bỏ dở. Tuần/Triệt CHỈ áp dụng cho cung được dữ liệu ghi là BỊ TUẦN/TRIỆT, không tự gán cho cung khác. ' +
  'TUYỆT ĐỐI KHÔNG nhắc "Mệnh chủ" / "Thân chủ" — phái Nam Phái không dùng. ' +
  '★ TUYỆT ĐỐI KHÔNG dự đoán SỰ KIỆN CỤ THỂ vào NGÀY/THỜI ĐIỂM CỤ THỂ (vd "tai nạn ngày 15/6", "kết hôn tháng X năm Y", "bệnh nặng năm Z") — chỉ nói XU HƯỚNG, mức độ thuận lợi/rủi ro, và KHUYẾN NGHỊ hành động. KHÔNG được phán "chắc chắn xảy ra", "không thể tránh", "định mệnh là vậy". ' +
  '★ KHÔNG đưa lời khuyên Y TẾ (chẩn đoán bệnh, kê thuốc), TÀI CHÍNH cụ thể (mã cổ phiếu, khoản đầu tư), PHÁP LÝ cụ thể — khi đề cập các chủ đề này luôn khuyến nghị tham vấn chuyên gia (bác sĩ / cố vấn tài chính / luật sư).';

/**
 * Danh sách các PHẦN của bài luận MỘT đại vận. Mỗi phần là 1 request 4o-mini
 * riêng (ngắn → có kết quả nhanh), tổng ~4.000–6.000 từ. Màn hình lấy phần đầu
 * trước, vừa hiển thị (đánh máy) vừa tải các phần sau.
 */
export function daiVanSections(result: AstrologyResult, dvIndex: number): { title: string; run: () => Promise<string> }[] {
  const { context, dv } = buildDaiVanContext(result, dvIndex);
  const keys = aiKeysOf(result.birthInfo);
  // maxWords: giới hạn SỐ TỪ mỗi phần; tổng các phần ≈ 10.000 từ.
  const make = (instruction: string, maxWords: number) => async () =>
    capWords(stripBuocHeadings(await requestAI(`${context}\n\n=== YÊU CẦU PHẦN NÀY ===\n${DAIVAN_RULES}\n${instruction}`, keys)), maxWords);

  // Cấu trúc 7 PHẦN gom 14 mục output (Tổng quan+Chủ đề / Thuận-Bất lợi / 5 chủ đề / Bản đồ 10 năm / Top cơ hội-rủi ro / Chiến lược 3 tầng / Kết luận).
  return [
    {
      // Mục 1-2 trong output: Tổng quan đại vận + Chủ đề chính.
      title: '1. Tổng quan & Chủ đề chính của vận',
      run: make(
        `Viết phần "# Tổng quan đại vận ${dv.startAge}–${dv.endAge} tuổi & Chủ đề chính" (~1300 từ, kết thúc trọn vẹn). ` +
        'Phải gồm: (a) GỌI TÊN vận này thuộc loại nào — "vận phát triển sự nghiệp" / "vận tích lũy tài chính" / "vận chuyển đổi" / "vận mở rộng xã hội" / "vận gia đạo–hôn nhân" / "vận sức khỏe – tái cấu trúc" / "vận học hỏi" — gọi tên cụ thể, không chung chung; ' +
        '(b) Phân tích theo BA YẾU TỐ (Thiên thời / Địa lợi / Nhân hòa); ' +
        '(c) Đánh giá cung đại vận như cung độc lập (chính tinh + miếu/hãm + Tứ Hóa + cát/sát); ' +
        '(d) Đại vận đang ở giai đoạn QUÁ KHỨ/HIỆN TẠI/TƯƠNG LAI (theo dữ liệu đã ghi); ' +
        '(e) So với MỆNH GỐC: vận này KÍCH HOẠT điểm mạnh hay điểm yếu? Người này nên TIẾN CÔNG hay PHÒNG THỦ? ' +
        '(f) So với THÂN: có tạo cơ hội HÀNH ĐỘNG THỰC TẾ hay chỉ tốt trên lý thuyết?',
        1600,
      ),
    },
    {
      // Mục 3-4: Điểm thuận lợi + Điểm bất lợi (tam hợp/xung chiếu/Tứ Hóa/Phi Hóa).
      title: '2. Điểm thuận lợi & Điểm bất lợi',
      run: make(
        'Viết phần "# Cách cục kích hoạt & Điểm thuận lợi–bất lợi" (~1300 từ, kết thúc trọn vẹn). ' +
        '★ PHẦN A — CÁCH CỤC ĐANG KÍCH HOẠT (BẮT BUỘC, bám "★ CÁCH CỤC ENGINE"): ' +
        'Danh sách đã được lọc — chỉ chứa cách ĐANG KÍCH HOẠT trong đại vận này (NGỦ đã loại bỏ). ★★ ƯU TIÊN LUẬN TRƯỚC mục "CÁCH CỤC CHÍNH — từ 4 cung TRỌNG YẾU Mệnh/Tài Bạch/Quan Lộc/Thiên Di" nếu có — đây là các cách quan trọng nhất của lá số. Sau đó mới đến các cách khác. Với MỖI cách trong danh sách: (a) xác nhận bằng chứng — sao vận + sao gốc tạo kích hoạt; (b) trạng thái cụ thể (TĂNG CƯỜNG / KÍCH HOẠT / BIẾN CHẤT / PHÁT TÁC) và ý nghĩa; (c) tác động thực tế lên sự nghiệp–tài chính–quan hệ–sức khỏe trong giai đoạn 10 năm; (d) chiến lược phát huy hoặc quản trị rủi ro cụ thể. PHÂN TÍCH TẤT CẢ cách được liệt kê — không bỏ sót, không thêm cách mới ngoài danh sách. ' +
        '★ PHẦN B — ĐIỂM THUẬN LỢI: tam hợp cung đại vận hỗ trợ thế nào, Hóa LỘC/QUYỀN/KHOA tọa thủ và phi tới, cát tinh trong cung. ' +
        '★ PHẦN C — ĐIỂM BẤT LỢI: xung chiếu áp lực từ đâu (vd "Quan xung Phu → công việc dễ ảnh hưởng hôn nhân"), Hóa KỴ phi tới/từ đâu, sát tinh/Tuần/Triệt. ' +
        'Mỗi điểm phải nêu rõ "DỰA TRÊN dữ kiện gì" và "Hệ quả thực tế là gì". Cách phá/cứu cần nêu phương án quản trị cụ thể.',
        1400,
      ),
    },
    {
      // Mục 5-9: 5 chủ đề (gộp quan hệ + hôn nhân thành 1 chủ đề "Hôn nhân/Quan hệ").
      title: '3. Sự nghiệp · Tài chính · Hôn nhân-Quan hệ · Tài sản · Sức khỏe',
      run: make(
        'Viết phần "# 5 chủ đề người dùng quan tâm" (~1800 từ, kết thúc trọn vẹn). ' +
        'BẮT BUỘC chia thành 5 mục con — mỗi mục có 4 lớp: (1) Xu hướng (2) Cơ hội (3) Rủi ro (4) Khuyến nghị HÀNH ĐỘNG cụ thể: ' +
        '## 1. Sự nghiệp (đọc qua Quan Lộc + tam hợp + Hóa Quyền + sát tinh); ' +
        '## 2. Tài chính (đọc qua Tài Bạch + Hóa Lộc/Kỵ + Không-Kiếp-Đại Hao); ' +
        '## 3. Hôn nhân & Quan hệ (đọc qua Phu Thê + Nô Bộc + Đào Hồng); ' +
        '## 4. Tài sản & Điền sản (đọc qua Điền Trạch + Tử Tức + Hóa Lộc phi về Điền); ' +
        '## 5. Sức khỏe & thói quen sống (đọc qua Tật Ách + sát tinh + Tuần/Triệt). ' +
        'Mỗi khuyến nghị phải CỤ THỂ và CÓ THỂ HÀNH ĐỘNG ngay.',
        2300,
      ),
    },
    {
      // Mục 10: Bản đồ 10 năm — chia 3 giai đoạn.
      title: '4. Bản đồ 10 năm (chia 3 giai đoạn)',
      run: make(
        'Viết phần "# Bản đồ 10 năm trong đại vận" (~1500 từ, kết thúc trọn vẹn). ' +
        'BẮT BUỘC chia rõ 3 GIAI ĐOẠN — không nói cả 10 năm giống nhau: ' +
        '## A. 3 năm ĐẦU (KHỞI ĐỘNG – nền tảng – thử thách): đánh giá chung và CHI TIẾT từng năm dựa trên dữ liệu CHUỖI 10 NĂM (tuổi/năm/cung/đánh giá/việc nổi bật/nên-không nên). ' +
        '## B. 4 năm GIỮA (BỨT PHÁ – biến động – chủ lực): đánh giá chung và chi tiết từng năm. ' +
        '## C. 3 năm CUỐI (THU HOẠCH – ổn định – chuyển tiếp): đánh giá chung và chi tiết từng năm. ' +
        'KHÔNG bỏ sót năm nào. Cuối mỗi giai đoạn nêu rõ "trọng tâm 3-4 năm này nên là gì".',
        1900,
      ),
    },
    {
      // Mục 11-12: Top 5 cơ hội + Top 5 rủi ro.
      title: '5. Top 5 cơ hội & Top 5 rủi ro',
      run: make(
        'Viết phần "# Top 5 cơ hội & Top 5 rủi ro lớn nhất" (~1100 từ, kết thúc trọn vẹn). ' +
        '★ 5 CƠ HỘI: đặt tên ngắn cho từng cơ hội + 2-3 câu mô tả (cụ thể: lĩnh vực gì, năm nào, dấu hiệu để nhận biết, cách tận dụng). Bám sát Phi Hóa Lộc/Quyền/Khoa + cát tinh + các năm điểm cao. ' +
        '★ 5 RỦI RO: đặt tên ngắn cho từng rủi ro + 2-3 câu mô tả (cụ thể: lĩnh vực gì, năm nào, dấu hiệu cảnh báo, cách phòng tránh). Bám sát Phi Hóa Kỵ + sát tinh + các năm điểm thấp + xung chiếu áp lực. ' +
        'KHÔNG nói chung chung — phải có "khi nào – lĩnh vực gì – làm gì".',
        1500,
      ),
    },
    {
      // Mục 13: Chiến lược hành động (12 tháng / 3 năm / toàn đại vận).
      title: '6. Chiến lược hành động (12 tháng / 3 năm / toàn vận)',
      run: make(
        'Viết phần "# Chiến lược hành động — AI Coach cá nhân" (~1000 từ, kết thúc trọn vẹn). ' +
        'Đóng vai AI COACH cá nhân (KHÔNG chỉ diễn giải sao). BẮT BUỘC chia 3 tầng: ' +
        '## A. CHIẾN LƯỢC 12 THÁNG TỚI: 3-5 việc cụ thể nên làm ngay (deadline trong 12 tháng). ' +
        '## B. CHIẾN LƯỢC 3 NĂM: 3-5 mục tiêu trung hạn (định hình trong giai đoạn đầu của đại vận). ' +
        '## C. CHIẾN LƯỢC TOÀN ĐẠI VẬN: chốt 1 câu định hướng tổng thể + phân loại chiến lược chính: TIẾN CÔNG / PHÒNG THỦ / TÍCH LŨY / CHUYỂN ĐỔI / TÁI CẤU TRÚC. ' +
        'Mỗi khuyến nghị có thể HÀNH ĐỘNG ngay, không trừu tượng. Đánh giá mục tiêu nào nên ƯU TIÊN, mục tiêu nào nên TRÌ HOÃN.',
        1300,
      ),
    },
    {
      // Mục 14: Kết luận 5 dòng.
      title: '7. Kết luận 5 dòng',
      run: make(
        'Viết phần "# Kết luận đại vận" (~250 từ, BẮT BUỘC ĐÚNG 5 DÒNG, kết thúc trọn vẹn): ' +
        'Dòng 1 — Tên vận và đánh giá tổng thể (1 câu). ' +
        'Dòng 2 — Điểm tựa lớn nhất của vận. ' +
        'Dòng 3 — Rủi ro lớn nhất cần quản trị. ' +
        'Dòng 4 — Hành động ƯU TIÊN trong 12 tháng tới. ' +
        'Dòng 5 — Câu chốt định hướng cho toàn đại vận. ' +
        'Mỗi dòng 1-2 câu cô đọng, sắc, có thể trích dẫn được.',
        400,
      ),
    },
  ];
}

/** Phân tích AI cho MỘT đại vận — chạy lần lượt các PHẦN rồi ghép (fallback không streaming). */
export async function analyzeDaiVanWithAI(
  result: AstrologyResult,
  dvIndex: number,
): Promise<string> {
  const sections = daiVanSections(result, dvIndex);
  const parts: string[] = [];
  for (const s of sections) parts.push(await s.run());
  return parts.join('\n\n');
}

/** Dữ liệu nền (context) dùng chung cho mọi PHẦN của bài luận MỘT năm tiểu vận. */
function buildTieuVanContext(result: AstrologyResult, age: number): { context: string; tv: any } {
  const { birthInfo, tuViChart: c } = result;
  const tv = result.tieuVans.find(x => x.age === age);
  if (!tv) throw new Error('Không tìm thấy tiểu vận.');
  const h = c.houses.find(x => x.branch === tv.branch);
  const sv = h ? starsOf(h) : { chinh: [] as string[], phu: [] as string[] };
  const kb: string[] = [];
  for (const nm of (h?.stars ?? []).map(s => (s.name.startsWith('L. ') ? s.name.slice(3) : s.name))) {
    const inf = getStarInfo(nm);
    if (inf && !kb.some(k => k.startsWith('• ' + nm))) kb.push(`• ${nm}: ${trim(inf.basic, 200)}`);
  }
  const sc = scoreTieuVan(result, tv);
  const dvObj = result.daiVans[tv.daiVanIndex];
  const dvSc = dvObj ? scoreDaiVan(result, dvObj) : null;
  const luuSet = luuStarsTamPhuong(result, tv.yearStem, tv.yearBranch, tv.branch);
  const yt = yearVsTuoi(result, tv.yearBranch);
  const TT_TXT: Record<string, string> = {
    sinhNhap: 'sinh nhập (rất tốt)', dongHanh: 'đồng hành (tốt)',
    khacXuat: 'khắc xuất (chật vật)', sinhXuat: 'sinh xuất (hao tổn)',
    khacNhap: 'khắc nhập (xấu)',
  };
  const DL_TXT: Record<string, string> = {
    sinhNhap: 'sinh Mệnh (tốt)', dongHanh: 'đồng hành (ổn)',
    khacXuat: 'Mệnh khắc TV (vất vả)', sinhXuat: 'Mệnh sinh TV (hao)',
    khacNhap: 'TV khắc Mệnh (kém)',
  };
  // ─── DỮ KIỆN BỔ SUNG cho khung phân tích 15 bước Nam Phái ───
  // Tứ Hóa CỐ ĐỊNH tại cung tiểu hạn + Lưu Tứ Hóa năm (vị trí 4 lưu hóa).
  const hoaTaiCungTV = h
    ? h.stars.filter(s => s.name === 'Hóa Lộc' || s.name === 'Hóa Quyền' || s.name === 'Hóa Khoa' || s.name === 'Hóa Kỵ').map(s => s.name)
    : [];
  const luuHoa = luuTuHoaPositions(c, tv.yearStem);
  const luuHoaTxt = luuHoa.length
    ? luuHoa.map(p => `${p.hoa}=${p.star}→${p.palace}(${p.branch})`).join(' · ')
    : '(không xác định)';

  // Chủ đề chính của năm theo cung tiểu hạn.
  const PALACE_TOPIC_YEAR: Record<string, string> = {
    'Mệnh': 'Năm tự thân – nhìn lại và điều chỉnh',
    'Phụ Mẫu': 'Năm gia đình – quan hệ với bậc trên',
    'Phúc Đức': 'Năm phúc khí – tu dưỡng tinh thần',
    'Điền Trạch': 'Năm tài sản – nhà cửa – tích lũy',
    'Quan Lộc': 'Năm sự nghiệp – công danh',
    'Nô Bộc': 'Năm quan hệ – mở rộng xã hội',
    'Thiên Di': 'Năm di chuyển – ra ngoài',
    'Tật Ách': 'Năm sức khỏe – tái cấu trúc thân thể',
    'Tài Bạch': 'Năm tài chính – dòng tiền',
    'Tử Tức': 'Năm con cái – sáng tạo',
    'Phu Thê': 'Năm hôn nhân – gia đạo',
    'Huynh Đệ': 'Năm anh em – đồng cấp',
  };
  const yearTopic = h ? PALACE_TOPIC_YEAR[h.palaceName] || h.palaceName : '';

  // So Tiểu vận với Đại vận: thuận / nghịch / bổ sung.
  let tvVsDv = '(chưa xác định)';
  if (dvObj && dvSc) {
    const tvIsGood = sc.rating === 'Rất tốt' || sc.rating === 'Tốt';
    const tvIsBad = sc.rating === 'Nhiều thách thức';
    const dvIsGood = dvSc.rating === 'Rất tốt' || dvSc.rating === 'Tốt';
    const dvIsBad = dvSc.rating === 'Nhiều thách thức';
    if (tvIsGood && dvIsGood) tvVsDv = 'THUẬN — tiểu vận và đại vận cùng tốt → năm KÍCH HOẠT MẠNH, hợp ra quyết định lớn';
    else if (tvIsBad && dvIsBad) tvVsDv = 'NGHỊCH KÉP — cả hai cùng xấu → đây là năm KHÓ NHẤT trong đại vận, phải đặc biệt thận trọng';
    else if (tvIsGood && dvIsBad) tvVsDv = 'TIỂU VẬN ĐẸP TRONG ĐẠI VẬN XẤU — năm có "tia sáng" nhưng vẫn bị bao trùm bởi đại vận xấu, không nên quá kỳ vọng';
    else if (tvIsBad && dvIsGood) tvVsDv = 'TIỂU VẬN XẤU TRONG ĐẠI VẬN TỐT — có thể chỉ là "khúc trầm" trong giai đoạn vàng, đại vận bù đắp; vẫn cần quản trị rủi ro năm này';
    else if (h && dvObj && h.palaceName === ['Quan Lộc', 'Tài Bạch'][0] && ['Quan Lộc', 'Tài Bạch'].includes(c.houses.find(x => x.branch === dvObj.branch)?.palaceName || '')) tvVsDv = 'BỔ SUNG — tiểu vận cùng chủ đề với đại vận (Quan/Tài) → năm có thể kích hoạt cơ hội đại vận';
    else tvVsDv = 'TRUNG TÍNH — tiểu vận và đại vận đan xen, không cộng hưởng mạnh';
  }

  // Cung tam hợp / xung chiếu tiểu vận.
  const bIdxTv = c.houses.findIndex(x => x.branch === tv.branch);
  const TH_TV: number[][] = [[8, 0, 4], [2, 6, 10], [5, 9, 1], [11, 3, 7]];
  const grpTV = bIdxTv >= 0 ? (TH_TV.find(g => g.includes(bIdxTv)) ?? []) : [];
  const tamHopTV = grpTV.filter(i => i !== bIdxTv).map(i => c.houses[i]);
  const xungTV = bIdxTv >= 0 ? c.houses[(bIdxTv + 6) % 12] : undefined;
  const ctxTV = (hh?: TuViHouse) =>
    hh ? `${hh.palaceName}(${hh.branch}): ${starsOf(hh).chinh.join(', ') || 'Vô chính diệu'}` : '—';

  // So với Mệnh & Thân.
  const menhTV = c.houses.find(x => x.isManh);
  const thanTV = c.houses.find(x => x.isThan);

  const context = [
    palaceMapBlock(result),
    '',
    buildCachCucContext(result, tv.branch, `Tiểu Vận ${tv.stem} ${tv.branch} (${tv.age} tuổi, năm ${tv.year})`),
    '',
    `Người xem: ${birthInfo.gender === 'nam' ? 'Nam' : 'Nữ'}. ` +
    `Năm ${tv.year} (Can–Chi năm: ${tv.yearStem} ${tv.yearBranch}) — ${tv.age} tuổi. ` +
    `Cung tiểu hạn: ${h?.palaceName ?? tv.branch} (${tv.branch}).`,
    yearTopic ? `★ CHỦ ĐỀ CHÍNH CỦA NĂM: ${yearTopic} — AI cần gọi tên năm này thuộc loại nào (vd "Năm sự nghiệp" / "Năm tài chính" / "Năm sức khỏe – tái cấu trúc" / "Năm học hỏi" / "Năm biến động – mở rộng").` : '',
    '',
    '★ CUNG TIỂU VẬN — đọc như "cung năm":',
    `- Chính tinh: ${sv.chinh.join(', ') || 'Vô chính diệu (mượn sao xung chiếu)'}`,
    `- Phụ tinh: ${sv.phu.join(', ') || '(không)'}`,
    h?.tuanAt ? '- BỊ TUẦN KHÔNG (làm chậm/hoãn; đầu năm chệch choạc; gặp tốt giảm tốt, gặp xấu đỡ xấu)' : '',
    h?.trietAt ? '- BỊ TRIỆT LỘ (cắt/chặn ngang, mạnh hơn Tuần; nửa đầu năm vất vả)' : '',
    `- Tứ Hóa CỐ ĐỊNH tọa thủ tại cung: ${hoaTaiCungTV.length ? hoaTaiCungTV.join(', ') : '(không có)'}`,
    `- Tam hợp tiểu vận: ${tamHopTV.map(ctxTV).join(' ; ') || '—'}`,
    `- Xung chiếu tiểu vận: ${ctxTV(xungTV)}`,
    '',
    '★ TƯƠNG TÁC TIỂU VẬN ↔ ĐẠI VẬN (Bước 2 khung Nam Phái):',
    `→ ${tvVsDv}.`,
    dvSc
      ? `Bối cảnh: đại vận ${dvObj?.startAge}-${dvObj?.endAge}t (${dvObj?.stem} ${dvObj?.branch}, cung ${dvSc.palaceName}) — ${dvSc.rating}.`
      : '',
    '(Quy tắc: "Đại vận lấn áp Tiểu vận" — đại vận tốt thì năm dù kém vẫn đỡ; đại vận xấu thì năm tốt cũng khó bứt phá hết.)',
    '',
    '★ SO VỚI MỆNH VÀ THÂN (Bước 8 khung Nam Phái):',
    menhTV ? `- Cung Mệnh tại ${menhTV.branch}(${menhTV.palaceName}) — chính tinh ${starsOf(menhTV).chinh.join(', ') || 'Vô chính diệu'}.` : '',
    thanTV ? `- Cung Thân tại ${thanTV.branch}(${thanTV.palaceName}) — chính tinh ${starsOf(thanTV).chinh.join(', ') || 'Vô chính diệu'}.` : '',
    '(AI phải trả lời: năm này có hợp bản chất người này không? Kích hoạt điểm mạnh hay làm lộ điểm yếu? Nên chủ động hay giữ nhịp?)',
    '',
    '3 YẾU TỐ luận theo cụ Thiên Lương (áp dụng cho năm này):',
    `- THIÊN THỜI: tam hợp năm tiểu hạn vs tam hợp năm sinh → ${TT_TXT[sc.thienThoi]}`,
    `- ĐỊA LỢI : hành cung tiểu hạn vs hành Mệnh → ${DL_TXT[sc.diaLoi]}`,
    `- NHÂN HÒA: bộ chính tinh cung tiểu hạn vs bộ Mệnh → ${sc.nhanHoa}`,
    `→ Điểm Tài lộc ${sc.taiLoc} / Thách thức ${sc.thachThuc} → ${sc.rating}.`,
    '',
    '===== SAO LƯU CỦA NĂM (lưu tinh — RẤT QUAN TRỌNG) =====',
    `An theo Can–Chi NĂM ${tv.yearStem} ${tv.yearBranch} (năm ${tv.year}), xét tại CUNG TIỂU HẠN (${tv.branch}) và tam phương: ${luuSummary(luuSet)}.`,
    yt.namTuoi ? '⚠ NĂM TUỔI (phạm Thái Tuế): năm nhiều biến động, "Thái Tuế đương đầu vô họa tất có hung" — phải luận kỹ và khuyên thận trọng.' : '',
    yt.xungTuoi ? '⚠ XUNG TUỔI (Tuế Phá): chi năm xung chi tuổi — dễ xáo trộn, hao tài, bất hòa; phải luận và nhắc giữ ổn định.' : '',
    '',
    '★ LƯU TỨ HÓA NĂM (Bước 5 khung Nam Phái — quyết định chất lượng luận tiểu vận):',
    `   ${luuHoaTxt}`,
    '(Lưu Lộc cho biết NƠI NĂM NAY CÓ CƠ HỘI — lĩnh vực cung đó là cửa lớn nhất; Lưu Quyền chỉ trách nhiệm/quyền lực; Lưu Khoa chỉ quý nhân/danh tiếng; Lưu Kỵ chỉ ĐIỂM NGHẼN cần quản trị. AI BẮT BUỘC nói cụ thể từng lưu hóa tại cung nào và ý nghĩa.)',
    '',
    'Sao lưu phản ánh SỰ VIỆC NỔI BẬT trong năm: Lưu Thái Tuế (chủ đề xã hội/va chạm), Lưu Lộc Tồn (dòng tiền), ' +
    'Lưu Kình–Đà (áp lực/cạnh tranh), Lưu Mã (dịch chuyển), Lưu Khốc–Hư (cảm xúc/hao tổn), Lưu Tang–Hổ (áp lực gia đạo/sức khỏe), ' +
    'Lưu Đào–Hồng (tình duyên/hỷ sự), Lưu Xương–Khúc (học hành/giấy tờ). Lưu trùng sao cố định cùng tên thì tác động nhân đôi.',
    kb.length ? '\nKIẾN THỨC CHUẨN (bám theo, không bịa):\n' + kb.join('\n') : '',
  ].filter(Boolean).join('\n');

  return { context, tv };
}

/**
 * SYSTEM PROMPT cho Tiểu Vận — đóng vai AI Coach: chuyển dữ liệu Tử Vi
 * thành KẾ HOẠCH HÀNH ĐỘNG 1 NĂM, không chỉ mô tả "năm tốt/xấu".
 */
const TIEUVAN_RULES =
  'Bạn là chuyên gia Tử Vi Nam Phái theo hướng THỰC TIỄN — đóng vai AI COACH cá nhân tư vấn 1 NĂM cho người dùng. ' +
  'Mục tiêu: chuyển dữ liệu Tiểu vận thành KẾ HOẠCH HÀNH ĐỘNG 1 NĂM (không chỉ mô tả "năm tốt/xấu"). ' +
  '★ NGUYÊN TẮC BẮT BUỘC: ' +
  '(1) KHÔNG luận từng sao đơn lẻ — phải xét tổ hợp (sao + miếu hãm + tam hợp + xung chiếu + Tứ Hóa + Lưu Tứ Hóa). ' +
  '(2) KHÔNG phán đoán tuyệt đối ("chắc chắn giàu/nghèo/ly hôn/bệnh tật/tai nạn") — chỉ nói theo XU HƯỚNG, mức độ thuận lợi/rủi ro, và hành động NÊN làm. ' +
  '(3) KHÔNG dùng ngôn ngữ mê tín, hù dọa. ' +
  '(4) Mỗi kết luận quan trọng PHẢI dựa trên ÍT NHẤT 2 DỮ KIỆN từ lá số. ' +
  '(5) Luôn phân biệt 4 lớp: [DỮ KIỆN lá số] → [PHÂN TÍCH] → [KẾT LUẬN] → [KHUYẾN NGHỊ hành động]. ' +
  '(6) Nếu dữ liệu thiếu, hãy nói rõ "chưa đủ dữ liệu để kết luận sâu" — KHÔNG bịa. ' +
  '(7) Ưu tiên tư vấn THỰC TẾ cho 8 chủ đề: sự nghiệp, tài chính, kinh doanh/đối tác, hôn nhân/gia đạo, tài sản, sức khỏe, học tập, tâm lý/cảm xúc. ' +
  '(8) Mỗi khuyến nghị phải CÓ THỂ HÀNH ĐỘNG ngay (cụ thể, không trừu tượng). ' +
  '(9) ★ Tiểu vận là KẾ HOẠCH HÀNH ĐỘNG 1 NĂM — không phải định mệnh cố định; AI viết theo tinh thần "đề xuất chiến lược", không "phán xét tương lai". ' +
  '★ Tiếng Việt mạch lạc; tiêu đề "# Tên mục" (KHÔNG ghi "Bước"/số); KHÔNG dùng bảng markdown. ' +
  'KHÔNG mở đầu bằng lời chào, KHÔNG lặp dữ liệu. BÁM SÁT 3 yếu tố Thiên thời – Địa lợi – Nhân hòa + "Đại vận lấn áp Tiểu vận" + Lưu Tứ Hóa + Lưu tinh. ' +
  'VIẾT TRỌN VẸN trong giới hạn số từ, KHÔNG bỏ dở. Tuần/Triệt CHỈ nói khi cung được dữ liệu ghi là BỊ TUẦN/TRIỆT. ' +
  'TUYỆT ĐỐI KHÔNG nhắc "Mệnh chủ" / "Thân chủ" — phái Nam Phái không dùng. ' +
  '★ TUYỆT ĐỐI KHÔNG dự đoán SỰ KIỆN CỤ THỂ vào NGÀY/THỜI ĐIỂM CỤ THỂ (vd "tai nạn ngày 15/6", "kết hôn tháng X năm Y", "bệnh nặng năm Z") — chỉ nói XU HƯỚNG, mức độ thuận lợi/rủi ro, và KHUYẾN NGHỊ hành động. KHÔNG được phán "chắc chắn xảy ra", "không thể tránh", "định mệnh là vậy". ' +
  '★ KHÔNG đưa lời khuyên Y TẾ (chẩn đoán bệnh, kê thuốc), TÀI CHÍNH cụ thể (mã cổ phiếu, khoản đầu tư), PHÁP LÝ cụ thể — khi đề cập các chủ đề này luôn khuyến nghị tham vấn chuyên gia (bác sĩ / cố vấn tài chính / luật sư).';

/**
 * Danh sách các PHẦN của bài luận MỘT năm tiểu vận. Mỗi phần là 1 request 4o-mini
 * riêng (ngắn → nhanh), tổng ~8.000–10.000 từ. Màn hình lấy phần đầu trước, vừa
 * hiển thị (đánh máy) vừa tải các phần sau.
 */
export function tieuVanSections(result: AstrologyResult, age: number): { title: string; run: () => Promise<string> }[] {
  const { context, tv } = buildTieuVanContext(result, age);
  const keys = aiKeysOf(result.birthInfo);
  // maxWords: giới hạn SỐ TỪ mỗi phần; tổng các phần ≈ 10.000 từ.
  const make = (instruction: string, maxWords: number) => async () =>
    capWords(stripBuocHeadings(await requestAI(`${context}\n\n=== YÊU CẦU PHẦN NÀY ===\n${TIEUVAN_RULES}\n${instruction}`, keys)), maxWords);

  // Cấu trúc 7 PHẦN gom 13 mục output (Tổng quan-Chủ đề-Thuận lợi-Bất lợi / Tương tác Đại vận / Sao và lưu tinh / 8 chủ đề / 4 quý / Top cơ hội-rủi ro / Chiến lược + Kết luận).
  return [
    {
      // Mục 1-3: Tổng quan + Chủ đề chính + Mức độ thuận lợi/rủi ro.
      title: '1. Tổng quan – Chủ đề chính – Thuận lợi/Rủi ro',
      run: make(
        `Viết phần "# Tổng quan năm ${tv.year} (${tv.age} tuổi)" (~1300 từ, kết thúc trọn vẹn). ` +
        'Phải gồm: (a) GỌI TÊN năm này thuộc loại nào — "Năm sự nghiệp" / "Năm tài chính" / "Năm sức khỏe – tái cấu trúc" / "Năm học hỏi" / "Năm biến động – mở rộng" / v.v. — gọi tên cụ thể, không chung chung; ' +
        '(b) Mức độ THUẬN LỢI và RỦI RO chính của năm (chỉ nói theo xu hướng, không phán tuyệt đối); ' +
        '(c) 3 yếu tố Thiên thời/Địa lợi/Nhân hòa của riêng năm; ' +
        '(d) Chính tinh + miếu hãm + cát/sát + Tứ Hóa tại cung tiểu hạn — luận chất "khí năm".',
        1600,
      ),
    },
    {
      // Mục 4 + 8: Tương tác với Đại vận + So Mệnh/Thân (mục 8 khung Nam Phái).
      title: '2. Tương tác Tiểu vận với Đại vận + So với Mệnh-Thân',
      run: make(
        'Viết phần "# Tương tác với Đại vận hiện tại và Mệnh-Thân" (~900 từ, kết thúc trọn vẹn). ' +
        '★ PHẦN A — Tương tác với ĐẠI VẬN: bám sát tag THUẬN/NGHỊCH KÉP/TIỂU TỐT TRONG ĐẠI XẤU/TIỂU XẤU TRONG ĐẠI TỐT/BỔ SUNG đã ghi trong context; phân tích hệ quả thực tế. ' +
        '★ PHẦN B — So với MỆNH GỐC: năm này hợp bản chất người này không? Kích hoạt điểm mạnh hay làm lộ điểm yếu? Nên CHỦ ĐỘNG hay GIỮ NHỊP? ' +
        '★ PHẦN C — So với THÂN: năm này có tạo cơ hội HÀNH ĐỘNG THỰC TẾ không, hay chỉ tốt trên lý thuyết?',
        1200,
      ),
    },
    {
      // Mục 5-7: Sao, cách cục, Lưu tinh, Lưu Tứ Hóa, Tam hợp/Xung chiếu.
      title: '3. Lưu tinh & Lưu Tứ Hóa – Tam hợp/Xung chiếu',
      run: make(
        'Viết phần "# Cách cục năm & Lưu tinh–Lưu Tứ Hóa" (~1700 từ, kết thúc trọn vẹn). ' +
        '★ PHẦN A — CÁCH CỤC NĂM (bám "★ CÁCH CỤC ENGINE"): ' +
        'Danh sách đã lọc — chỉ chứa cách ĐANG KÍCH HOẠT trong tiểu vận này. ★★ ƯU TIÊN LUẬN TRƯỚC mục "CÁCH CỤC CHÍNH — từ 4 cung TRỌNG YẾU Mệnh/Tài Bạch/Quan Lộc/Thiên Di" nếu có — đây là các cách quan trọng nhất của lá số. PHÂN TÍCH TẤT CẢ cách trong danh sách: (a) trạng thái cụ thể (TĂNG CƯỜNG/KÍCH HOẠT/BIẾN CHẤT) + bằng chứng; (b) phân biệt cách gốc được năm kích hoạt vs cách chỉ xuất hiện do lưu Tứ Hóa (tạm thời, độ tin cậy thấp hơn); (c) tác động theo chủ đề (sự nghiệp/tài/quan hệ/sức khỏe); (d) chiến lược phát huy hoặc quản trị. ' +
        'Quy tắc ưu tiên: Lá số gốc = KHẢ NĂNG → Đại vận = SÂN CHƠI → Tiểu vận = NHIỆM VỤ NĂM. KHÔNG thêm cách ngoài danh sách; KHÔNG bỏ sót cách có trong danh sách. ' +
        '★ PHẦN B — LƯU TỨ HÓA NĂM (quan trọng nhất): nói cụ thể từng lưu hóa tại CUNG NÀO — Lưu Lộc=cơ hội ở đâu, Lưu Quyền=trách nhiệm ở đâu, Lưu Khoa=quý nhân ở đâu, Lưu Kỵ=ĐIỂM NGHẼN ở đâu. ' +
        '★ PHẦN C — Các lưu tinh khác: Lưu Thái Tuế, Lưu Lộc Tồn, Lưu Kình-Đà, Lưu Mã, Lưu Khốc-Hư, Lưu Tang-Hổ, Lưu Đào-Hồng, Lưu Xương-Khúc. ' +
        '★ PHẦN D — Tam hợp/Xung chiếu tiểu vận.',
        1900,
      ),
    },
    {
      // Mục 8: Phân tích 8 chủ đề.
      title: '4. Phân tích 8 chủ đề năm',
      run: make(
        'Viết phần "# 8 chủ đề người dùng quan tâm" (~2000 từ, kết thúc trọn vẹn). ' +
        'BẮT BUỘC chia 8 mục con — mỗi mục 4 lớp Xu hướng/Cơ hội/Rủi ro/Khuyến nghị (CÓ THỂ HÀNH ĐỘNG ngay): ' +
        '## 1. Sự nghiệp (cơ hội thăng tiến/áp lực, mở rộng hay củng cố, thay đổi vai trò); ' +
        '## 2. Tài chính (dòng tiền vào/ra, tích lũy, đầu tư nên chủ động hay thận trọng); ' +
        '## 3. Kinh doanh & đối tác (quý nhân/xung đột, kiểu hợp tác nên/tránh); ' +
        '## 4. Hôn nhân & gia đạo (hòa hợp hay căng thẳng, nguyên nhân từ đâu, cách giao tiếp); ' +
        '## 5. Tài sản & nhà cửa (mua bán/sửa chữa/tích lũy, hao tốn vì nhà); ' +
        '## 6. Sức khỏe (áp lực chính, thói quen cần điều chỉnh — KHÔNG phán bệnh, chỉ cảnh báo xu hướng); ' +
        '## 7. Học tập & nâng cấp bản thân (nên học gì, nâng kỹ năng nào, đổi hướng được không); ' +
        '## 8. Tâm lý & cảm xúc (tự tin hay dao động, nóng vội hay trì hoãn, cách giữ cân bằng).',
        2500,
      ),
    },
    {
      // Mục 9: Bản đồ 4 quý.
      title: '5. Bản đồ 4 quý trong năm',
      run: make(
        'Viết phần "# Bản đồ 4 quý" (~1200 từ, kết thúc trọn vẹn). BẮT BUỘC chia 4 quý: ' +
        '## Quý 1 (tháng 1-3) — KHỞI ĐỘNG: chuẩn bị, xác lập mục tiêu, dọn dẹp việc tồn đọng. ' +
        '## Quý 2 (tháng 4-6) — THỬ NGHIỆM: mở rộng, xử lý vấn đề mới phát sinh. ' +
        '## Quý 3 (tháng 7-9) — TĂNG TỐC: ra quyết định lớn, chốt việc quan trọng. ' +
        '## Quý 4 (tháng 10-12) — THU HOẠCH: tổng kết, ổn định, chuẩn bị chuyển sang năm sau. ' +
        'Mỗi quý: chủ đề chính + 2-3 việc cụ thể nên làm. Nếu cung tiểu vận có Tuần/Triệt, đầu năm sẽ chệch choạc, cần ghi rõ.',
        1500,
      ),
    },
    {
      // Mục 10-11: Top 5 cơ hội + Top 5 rủi ro.
      title: '6. Top 5 cơ hội & Top 5 rủi ro',
      run: make(
        'Viết phần "# Top 5 cơ hội & Top 5 rủi ro trong năm" (~1200 từ, kết thúc trọn vẹn). ' +
        '★ 5 CƠ HỘI — mỗi cơ hội 5 trường: Tên ngắn / Lĩnh vực / Mức độ thuận / Điều kiện tận dụng / Hành động nên làm. Bám sát Lưu Lộc-Quyền-Khoa + cát tinh + thời điểm trong năm. ' +
        '★ 5 RỦI RO — mỗi rủi ro 5 trường: Tên ngắn / Lĩnh vực / Mức độ ảnh hưởng / Dấu hiệu sớm / Cách phòng ngừa + nếu xảy ra thì làm gì. Bám sát Lưu Kỵ + sát tinh + Tang-Hổ + Năm tuổi/Xung tuổi.',
        1500,
      ),
    },
    {
      // Mục 12-13: Chiến lược năm + Kết luận 5 dòng.
      title: '7. Chiến lược năm & Kết luận 5 dòng',
      run: make(
        'Viết phần "# Chiến lược năm & Kết luận" (~900 từ, BẮT BUỘC kết thúc trọn vẹn). ' +
        '## A. CHIẾN LƯỢC NĂM — chọn 1-2 từ trong danh sách: TIẾN CÔNG / PHÒNG THỦ / TÍCH LŨY / TÁI CẤU TRÚC / MỞ RỘNG / CHUYỂN ĐỔI / CHỜ THỜI / THU HOẠCH. ' +
        'Giải thích vì sao chọn từ đó (≥2 dữ kiện), kèm chiến thuật cụ thể từng tháng quan trọng. ' +
        '## B. KẾT LUẬN 5 DÒNG: ' +
        'Dòng 1 — Tên năm + đánh giá tổng thể. ' +
        'Dòng 2 — Cơ hội lớn nhất cần nắm. ' +
        'Dòng 3 — Rủi ro lớn nhất cần quản trị. ' +
        'Dòng 4 — Hành động ƯU TIÊN trong quý 1. ' +
        'Dòng 5 — Câu chốt định hướng cả năm. ' +
        'Mỗi dòng 1-2 câu cô đọng, sắc nét.',
        1200,
      ),
    },
  ];
}

/** Phân tích AI cho MỘT năm tiểu vận — chạy lần lượt các PHẦN rồi ghép (fallback không streaming). */
export async function analyzeTieuVanWithAI(
  result: AstrologyResult,
  age: number,
): Promise<string> {
  const sections = tieuVanSections(result, age);
  const parts: string[] = [];
  for (const s of sections) parts.push(await s.run());
  return parts.join('\n\n');
}

/**
 * Phân tích AI cho MỘT tháng (Nguyệt Vận) của năm tuổi `age`.
 *
 * Tinh thần (theo prompt mẫu): "Nguyệt vận KHÔNG phải để dự đoán số mệnh trong
 * tháng. Hãy phân tích tháng này đang KÍCH HOẠT phần nào của Đại vận và Tiểu vận,
 * từ đó xác định cơ hội, rủi ro và kế hoạch hành động phù hợp cho người dùng
 * trong 30 ngày tới." — bám sát khung 19 mục output Nam Phái.
 */
export async function analyzeNguyetVanWithAI(
  result: AstrologyResult,
  age: number,
  month: number,
): Promise<string> {
  const { birthInfo, tuViChart: c, batTuChart: b } = result;
  const sc = scoreNguyetVan(result, age, month);
  if (!sc) throw new Error('Không tính được nguyệt vận tháng này.');
  const branch = nguyetVanBranch(result, age, month);
  const h = c.houses.find(x => x.branch === branch);
  const sv = h ? starsOf(h) : { chinh: [] as string[], phu: [] as string[] };
  const tv = result.tieuVans.find(x => x.age === age);
  const tvSc = tv ? scoreTieuVan(result, tv) : null;
  const dv = tv ? result.daiVans[tv.daiVanIndex] : null;
  const dvSc = dv ? scoreDaiVan(result, dv) : null;

  // ─── Can-Chi tháng + Lưu Tứ Hóa tháng (theo can tháng — Ngũ Hổ Độn) ───
  const monthCan = tv ? monthStem(tv.yearStem, month) : '';
  const luuHoaThang = monthCan ? luuTuHoaPositions(c, monthCan) : [];
  const luuHoaTxt = luuHoaThang.length
    ? luuHoaThang.map(p => `${p.hoa}=${p.star}→${p.palace}(${p.branch})`).join(' · ')
    : '(không xác định)';

  // ─── Chủ đề tháng theo cung lưu nguyệt ───
  const PALACE_TOPIC_MONTH: Record<string, string> = {
    'Mệnh': 'Tháng tự thân – điều chỉnh hướng đi cá nhân',
    'Phụ Mẫu': 'Tháng gia đình – quan hệ với bậc trên',
    'Phúc Đức': 'Tháng phúc khí – tu dưỡng tinh thần',
    'Điền Trạch': 'Tháng nhà cửa – tài sản',
    'Quan Lộc': 'Tháng sự nghiệp – công danh',
    'Nô Bộc': 'Tháng quan hệ – đối tác',
    'Thiên Di': 'Tháng di chuyển – ra ngoài – đàm phán',
    'Tật Ách': 'Tháng sức khỏe – nghỉ ngơi',
    'Tài Bạch': 'Tháng tài chính – dòng tiền',
    'Tử Tức': 'Tháng con cái – sáng tạo',
    'Phu Thê': 'Tháng hôn nhân – gia đạo',
    'Huynh Đệ': 'Tháng anh em – đồng cấp',
  };
  const monthTopic = h ? PALACE_TOPIC_MONTH[h.palaceName] || h.palaceName : '';

  // ─── Tương tác Bát Tự — Dụng/Hỷ/Kỵ thần vs hành Chi tháng ───
  const BRANCH_ELEMENT: Record<string, string> = {
    Tý: 'Thủy', Sửu: 'Thổ', Dần: 'Mộc', Mão: 'Mộc', Thìn: 'Thổ', Tị: 'Hỏa',
    Ngọ: 'Hỏa', Mùi: 'Thổ', Thân: 'Kim', Dậu: 'Kim', Tuất: 'Thổ', Hợi: 'Thủy',
  };
  const branchEl = BRANCH_ELEMENT[branch || ''] || '?';
  const fav = b.favorableElements || [];
  const unfav = b.unfavorableElements || [];
  const batTuInteract = fav.includes(branchEl as any)
    ? `Hành Chi tháng (${branchEl}) thuộc DỤNG THẦN — tháng này TIẾP KHÍ tốt cho bản mệnh, khí lực dồi dào.`
    : unfav.includes(branchEl as any)
    ? `Hành Chi tháng (${branchEl}) thuộc KỴ THẦN — tháng này khí hơi NGHỊCH bản mệnh, dễ mệt mỏi, cần dưỡng sinh.`
    : `Hành Chi tháng (${branchEl}) trung tính với bản mệnh — không tiếp khí mạnh cũng không nghịch.`;

  // ─── Tương tác Đại vận / Tiểu vận ───
  let dvInteract = '';
  if (dvSc) {
    const inDvTam = dv && tv && (h?.branch === dv.branch);
    dvInteract = `Đại vận hiện tại: ${dv?.startAge}-${dv?.endAge}t cung ${dvSc.palaceName} — ${dvSc.rating}. ` +
      (inDvTam ? 'Lưu nguyệt ĐỒNG CUNG đại vận → tháng kích hoạt mạnh chủ đề đại vận.' : 'Lưu nguyệt khác cung đại vận → tháng có chủ đề riêng, không trực tiếp đại vận.');
  }
  let tvInteract = '';
  if (tvSc) {
    const inTvSame = tv && (h?.branch === tv.branch);
    tvInteract = `Tiểu vận năm: cung ${tvSc.palaceName} — ${tvSc.rating}. ` +
      (inTvSame ? '⭐ Lưu nguyệt ĐỒNG CUNG tiểu vận → tháng KÍCH HOẠT MẠNH NHẤT chủ đề năm — đây là tháng then chốt của năm.' : 'Tháng không trùng cung tiểu vận → kích hoạt chủ đề khác trong năm.');
  }

  const kb: string[] = [];
  for (const nm of (h?.stars ?? []).map(s => (s.name.startsWith('L. ') ? s.name.slice(3) : s.name))) {
    const inf = getStarInfo(nm);
    if (inf && !kb.some(k => k.startsWith('• ' + nm))) kb.push(`• ${nm}: ${trim(inf.basic, 180)}`);
  }
  const TT_TXT: Record<string, string> = {
    sinhNhap: 'sinh nhập (rất tốt)', dongHanh: 'đồng hành (tốt)',
    khacXuat: 'khắc xuất (chật vật)', sinhXuat: 'sinh xuất (hao tổn)', khacNhap: 'khắc nhập (xấu)',
  };

  // ─── Bảng điểm 10 mảng + 8 chủ đề (số liệu cụ thể THAY ĐỔI theo tháng → ép AI luận khác nhau) ───
  const detail = nguyetVanDetail(result, age, month);
  const scoreboardTxt = detail
    ? detail.scores.map(s => `${s.label} ${s.value}/10${s.isRisk ? ' (rủi ro: cao=cần thận trọng)' : ''}`).join(' · ')
    : '(không tính được)';
  const themesTxt = detail
    ? detail.themes.map(t =>
        `• ${t.label} [${t.score}/10 – ${t.status}${t.activation ? `, ${t.activation}` : ''}${t.luuHoa ? `, ${t.luuHoa}` : ''}]: cung ${t.palace}`
      ).join('\n')
    : '(không tính được)';
  const tamHopXungTxt = detail
    ? `Cung lưu nguyệt TAM HỢP với: ${detail.tamHopPalaces.join(', ') || '—'}; XUNG CHIẾU với: ${detail.xungPalace || '—'}.`
    : '';

  const prompt = [
    'Bạn là chuyên gia Tử Vi Nam Phái theo hướng THỰC TIỄN — đóng vai AI COACH cá nhân tư vấn 30 NGÀY cho người dùng. ' +
    '★ TINH THẦN CỐT LÕI: "NGUYỆT VẬN KHÔNG PHẢI để dự đoán số mệnh trong tháng. Hãy phân tích tháng này đang KÍCH HOẠT phần nào của ĐẠI VẬN và TIỂU VẬN, từ đó xác định cơ hội, rủi ro và KẾ HOẠCH HÀNH ĐỘNG cho người dùng trong 30 ngày tới." ' +
    '★ Nguyên tắc: (1) Không luận sao đơn lẻ — phải tổ hợp; (2) Không phán tuyệt đối, chỉ nói xu hướng; (3) Không mê tín; (4) Mỗi kết luận quan trọng ≥ 2 dữ kiện; (5) Dữ kiện→Phân tích→Kết luận→Khuyến nghị; (6) Thiếu dữ liệu thì nói rõ; (7) Mỗi khuyến nghị PHẢI có thể hành động ngay; (8) KHÔNG nhắc "Mệnh chủ"/"Thân chủ"; (9) TUYỆT ĐỐI KHÔNG dự đoán SỰ KIỆN CỤ THỂ vào NGÀY/THỜI ĐIỂM CỤ THỂ (vd "tai nạn ngày X", "kết hôn tháng Y") — chỉ nói xu hướng + khuyến nghị; (10) KHÔNG đưa lời khuyên Y TẾ / TÀI CHÍNH cụ thể / PHÁP LÝ cụ thể — luôn khuyến nghị tham vấn chuyên gia. ' +
    'Tiếng Việt mạch lạc, KHÔNG bảng/markdown, KHÔNG mở đầu lại bằng chào hỏi.',
    '',
    `Người xem: ${birthInfo.gender === 'nam' ? 'Nam' : 'Nữ'}. ` +
    `THÁNG ${month} (âm lịch), trong năm ${tv?.year ?? ''} (${age} tuổi). ` +
    `Lưu nguyệt nhập cung ${h?.palaceName ?? branch} (${branch}, can tháng ${monthCan || '?'}, hành Chi tháng ${branchEl}).`,
    monthTopic ? `★ CHỦ ĐỀ THÁNG: ${monthTopic} — gọi tên tháng này thuộc loại nào (Tháng sự nghiệp / Tháng tiền bạc / Tháng mở rộng / Tháng đàm phán / Tháng tích lũy / Tháng gia đạo / Tháng sức khỏe / Tháng chuyển đổi).` : '',
    '',
    palaceMapBlock(result),
    '',
    buildCachCucContext(result, branch || undefined, branch ? `Nguyệt Vận ${branch} (tháng ${month})` : undefined),
    '',
    '★ CUNG LƯU NGUYỆT — đọc như cung tháng:',
    `- Chính tinh: ${sv.chinh.join(', ') || 'Vô chính diệu'}`,
    `- Phụ tinh: ${sv.phu.join(', ') || '(không)'}`,
    h?.tuanAt ? '- BỊ TUẦN KHÔNG (đầu tháng chệch choạc; gặp tốt giảm tốt, gặp xấu đỡ xấu)' : '',
    h?.trietAt ? '- BỊ TRIỆT LỘ (nửa đầu tháng vất vả; cắt/chặn mạnh hơn Tuần)' : '',
    '',
    '★ TƯƠNG TÁC VỚI BÁT TỰ (DỤNG/KỴ THẦN):',
    `Dụng thần: ${fav.join(', ') || '(không rõ)'} · Kỵ thần: ${unfav.join(', ') || '(không rõ)'}.`,
    `→ ${batTuInteract}`,
    '',
    '★ TƯƠNG TÁC VỚI ĐẠI VẬN:',
    dvInteract || '(không xác định)',
    '',
    '★ TƯƠNG TÁC VỚI TIỂU VẬN (Bước 4 — QUAN TRỌNG NHẤT — tháng này kích hoạt gì trong năm):',
    tvInteract || '(không xác định)',
    '',
    '★ LƯU TỨ HÓA THÁNG (theo can tháng — Ngũ Hổ Độn):',
    `   ${luuHoaTxt}`,
    '(Lưu Lộc chỉ NƠI THÁNG NÀY CÓ CƠ HỘI; Lưu Quyền chỉ trách nhiệm/quyền lực; Lưu Khoa chỉ quý nhân/danh tiếng; Lưu Kỵ chỉ ĐIỂM NGHẼN tháng. AI BẮT BUỘC nói cụ thể từng lưu hóa tại cung nào.)',
    '',
    '★ TAM HỢP & XUNG CHIẾU CUNG LƯU NGUYỆT (Bước 8 — tháng này "động" tới mảng nào):',
    `   ${tamHopXungTxt}`,
    '',
    '★ BẢNG ĐIỂM 10 MẢNG THÁNG NÀY (thang 0–10, số liệu riêng của tháng — BÁM SÁT, KHÔNG nói chung chung):',
    `   ${scoreboardTxt}`,
    '',
    '★ TRẠNG THÁI 8 CHỦ ĐỀ THÁNG NÀY (đã tính kích hoạt cung + Lưu Tứ Hóa — diễn giải ĐÚNG theo từng con số, mảng điểm cao thì khích lệ, mảng điểm thấp/có Lưu Kỵ thì cảnh báo):',
    themesTxt,
    '⚠ BẮT BUỘC: ở mục "8 chủ đề" phải phản ánh ĐÚNG điểm số & trạng thái ở trên — KHÔNG được cho mọi mảng cùng một sắc thái; mảng "đồng cung"/điểm cao là trọng tâm tháng, mảng có "Hóa Kỵ" là rủi ro chính.',
    '',
    '3 YẾU TỐ cụ Thiên Lương (áp cho tháng này):',
    `- THIÊN THỜI: tam hợp cung lưu nguyệt vs tam hợp năm sinh → ${TT_TXT[sc.thienThoi]}`,
    `- ĐỊA LỢI : hành cung lưu nguyệt vs hành Mệnh → ${TT_TXT[sc.diaLoi]}`,
    `- NHÂN HÒA: bộ chính tinh cung lưu nguyệt vs bộ Mệnh → ${sc.nhanHoa}`,
    `→ Điểm Tài lộc ${sc.taiLoc} / Thách thức ${sc.thachThuc} → ${sc.rating}.`,
    kb.length ? '\nKIẾN THỨC CHUẨN (bám theo, không bịa):\n' + kb.join('\n') : '',
    '',
    'Trình bày KHOẢNG 2500–3500 TỪ, phân tích thay vì liệt kê, KẾT THÚC TRỌN VẸN, theo cấu trúc 12 mục có tiêu đề "# Tên mục":',
    `# 1. Tổng quan tháng & Chủ đề chính — gọi tên tháng (vd "Tháng sự nghiệp"), điểm khí tháng, mức thuận lợi/rủi ro tổng quát.`,
    `# 2. Tương tác với Đại vận — tháng này KÍCH HOẠT gì trong đại vận?`,
    `# 3. Tương tác với Tiểu vận (NĂM) — tháng có phải tháng then chốt của năm không? Đây là phần quan trọng nhất.`,
    `# 4. Tương tác với Bát Tự — Chi tháng có tăng Dụng thần / kích hoạt Kỵ thần không?`,
    `# 5. Cách cục kích hoạt & Sao tháng — bám "★ CÁCH CỤC ENGINE": Danh sách đã lọc, chỉ chứa cách ĐANG KÍCH HOẠT trong tháng này. Ưu tiên luận trước mục "CÁCH CỤC CHÍNH — từ 4 cung TRỌNG YẾU Mệnh/Tài Bạch/Quan Lộc/Thiên Di" nếu có. PHÂN TÍCH TẤT CẢ cách trong danh sách: (a) trạng thái (TĂNG CƯỜNG/KÍCH HOẠT/BIẾN CHẤT/PHÁT TÁC) + bằng chứng sao; (b) ảnh hưởng thực tế trong 30 ngày; (c) micro-pattern chỉ gọi khi có ≥2–3 tín hiệu đồng thuận. KHÔNG thêm cách ngoài danh sách; KHÔNG bỏ sót cách có trong danh sách. Sau đó: phân tích chính tinh + phụ tinh + Tuần/Triệt tại cung lưu nguyệt; Lưu Tứ Hóa tháng.`,
    `# 6. Phân tích 8 chủ đề (mỗi mục 2-3 câu): Công việc / Tài chính / Kinh doanh / Đối tác / Hôn nhân / Gia đình / Sức khỏe / Học tập. Mỗi mục có Cơ hội + Rủi ro + Hành động.`,
    `# 7. Bản đồ 4 TUẦN trong tháng: Tuần 1 (Khởi động), Tuần 2 (Tăng tốc), Tuần 3 (Điểm nhấn), Tuần 4 (Tổng kết); tuần nào thuận nhất / tuần nào cần thận trọng.`,
    `# 8. Top 5 cơ hội tháng — mỗi cơ hội: Tên / Lĩnh vực / Điều kiện / Hành động.`,
    `# 9. Top 5 rủi ro tháng — mỗi rủi ro: Tên / Lĩnh vực / Dấu hiệu sớm / Cách phòng tránh.`,
    `# 10. Chiến lược tháng — chọn 1 từ trong danh sách: TIẾN CÔNG / TÍCH LŨY / MỞ RỘNG / TÁI CẤU TRÚC / PHÒNG THỦ / CHUYỂN ĐỔI / ĐÀM PHÁN / CHỜ THỜI — và giải thích vì sao.`,
    `# 11. Việc NÊN làm / Việc NÊN TRÁNH trong 30 ngày — danh sách cụ thể có thể hành động ngay.`,
    `# 12. Kết luận 5 dòng — Dòng 1: tên tháng + đánh giá tổng. Dòng 2: cơ hội lớn nhất. Dòng 3: rủi ro lớn nhất. Dòng 4: việc ƯU TIÊN tuần này. Dòng 5: câu chốt định hướng cả tháng.`,
    '★ CÂU KHÓA (định hướng toàn bài): KHÔNG chỉ nói tháng này tốt hay xấu. Hãy CHUYỂN dữ liệu Nguyệt vận ' +
    'thành KẾ HOẠCH HÀNH ĐỘNG THỰC TẾ trong 30 ngày: nên tập trung GÌ, tránh GÌ, cơ hội nào nên tận dụng, ' +
    'rủi ro nào cần quản trị. Mỗi tháng PHẢI có sắc thái RIÊNG (bám cung lưu nguyệt + bảng điểm + Lưu Tứ Hóa của ĐÚNG tháng này), ' +
    'TUYỆT ĐỐI tránh viết chung chung có thể áp cho tháng nào cũng đúng.',
    'Chỉ dùng dữ liệu đã cho, không bịa thêm sao. TUYỆT ĐỐI KHÔNG nói "chắc chắn xảy ra X" — chỉ nói xu hướng.',
  ].filter(Boolean).join('\n');
  return capWords(await requestAI(prompt, aiKeysOf(birthInfo)), 5000);
}

/** Dữ liệu nền dùng chung cho mọi PHẦN của bài luận Bát Tự + Phong Thủy. */
function buildBatTuContext(result: AstrologyResult): string {
  const { birthInfo, batTuChart: b } = result;
  const pt = analyzePhongThuyBatTu(b);
  const pillars = b.pillars
    .map(p => `${p.label}: ${p.stem} ${p.branch} (${p.element})`)
    .join(' · ');
  const counts = (['Kim', 'Mộc', 'Thủy', 'Hỏa', 'Thổ'] as const)
    .map(e => `${e} ${(b.elementCounts[e] || 0).toFixed(1).replace('.0', '')}`)
    .join(', ');
  return [
    `Người xem: ${birthInfo.gender === 'nam' ? 'Nam' : 'Nữ'}, sinh ${birthInfo.day}/${birthInfo.month}/${birthInfo.year} giờ ${birthInfo.hour}h.`,
    `Tứ trụ: ${pillars}.`,
    `Nhật Chủ: ${b.dayMaster} (${b.dayMasterElement}) — ${pt.than.label}.`,
    `Phân bổ ngũ hành (tính cả tàng can): ${counts}.`,
    `Hành KHUYẾT: ${pt.khuyet.join(', ') || 'không'}; THIẾU: ${pt.thieu.join(', ') || 'không'}; THỪA: ${pt.thua.join(', ') || 'không'}.`,
    `Dụng thần (nên bổ): ${pt.dungThan.join(', ')}; Hỷ thần (hỗ trợ dụng thần): ${hyThanOf(pt.dungThan as any) || '—'}; Kỵ thần (nên hạn chế): ${pt.kyThan.join(', ') || 'không rõ'}.`,
    '⚠ QUY TẮC NHẤT QUÁN: mọi lời khuyên TĂNG/GIẢM hành phải bám theo DỤNG THẦN (tăng) và KỴ THẦN (giảm). ' +
    'TUYỆT ĐỐI không khuyên bổ một hành là kỵ thần (dù nó ít), cũng không khuyên giảm một hành là dụng thần (dù nó nhiều).',
    '',
    // ★ Dữ liệu MỚI: Thập Thần + cách cục + quan hệ can-chi (xung/hợp/hình/hại/phá) — cốt lõi để chuyển Bát Tự thành tư vấn thực tế.
    summarizeBatTuAdvanced(b),
    '',
    '===== DỮ LIỆU NỀN (bản Nâng cao — DỰA VÀO và mở rộng sâu hơn, KHÔNG sơ sài hơn, KHÔNG mâu thuẫn) =====',
    pt.markdown,
    '=====',
  ].join('\n');
}

const BATTU_RULES =
  'Bạn là chuyên gia BÁT TỰ (Tứ Trụ) theo hướng TƯ VẤN THỰC TIỄN cho phần mềm thương mại, kiêm chuyên gia PHONG THỦY ngũ hành, tư vấn tiếng Việt ấm áp, có chiều sâu. ' +
  'PHÂN TÍCH và TƯ VẤN CỤ THỂ, mỗi nhận định kèm hành động thực tế; có ví dụ đời thường; KHÔNG liệt kê khô khan; ' +
  'KHÔNG bảng/markdown; tiêu đề dạng "# Tên mục"; KHÔNG mở đầu lại bằng lời chào; viết thẳng vào phần được yêu cầu; ' +
  'chỉ dùng dữ liệu đã cho, không bịa; bám DỤNG THẦN/KỴ THẦN, không mâu thuẫn. ' +
  '★ NGUYÊN TẮC LUẬN (BẮT BUỘC): (1) KHÔNG phán đoán tuyệt đối; (2) KHÔNG ngôn ngữ mê tín/hù dọa; ' +
  '(3) KHÔNG chỉ mô tả Can-Chi mà phải CHUYỂN thành tư vấn thực tế; (4) mỗi kết luận quan trọng dựa trên ÍT NHẤT 2 DỮ KIỆN; ' +
  '(5) luôn theo mạch DỮ KIỆN → PHÂN TÍCH → KẾT LUẬN → KHUYẾN NGHỊ; (6) nếu thiếu dữ liệu thì nói rõ chưa đủ cơ sở; ' +
  '(7) KHÔNG nói chắc chắn giàu/nghèo, bệnh tật, ly hôn, tai họa — chỉ nói XU HƯỚNG, mức độ thuận lợi/rủi ro và chiến lược nên làm. ' +
  '★ CÂU KHÓA: KHÔNG chỉ luận "mệnh tốt hay xấu"; hãy biến Bát Tự thành BẢN ĐỒ ỨNG DỤNG THỰC TẾ — nên chọn môi trường nào, ' +
  'nghề gì, cách kiếm tiền nào, cách quản trị rủi ro nào và thời điểm nào nên hành động.';

/**
 * Các PHẦN của bài luận Bát Tự + Phong Thủy. Mỗi phần 1 request riêng (ngắn,
 * nhanh), tổng ~5.000 từ. Màn hình lấy phần đầu trước, vừa hiển thị vừa tải tiếp.
 */
export function batTuSections(result: AstrologyResult): { title: string; run: () => Promise<string> }[] {
  const context = buildBatTuContext(result);
  const keys = aiKeysOf(result.birthInfo);
  const make = (instruction: string, maxWords: number) => async () =>
    capWords(stripBuocHeadings(await requestAI(`${context}\n\n=== YÊU CẦU PHẦN NÀY ===\n${BATTU_RULES}\n${instruction}`, keys)), maxWords);

  return [
    {
      title: 'Tổng quan Nhật Chủ',
      run: make('Viết phần "# 1. Tổng quan Nhật Chủ & thế cục ngũ hành" (~750 từ): hình tượng Nhật Chủ (vd Giáp Mộc = cây lớn/nguyên tắc; Quý Thủy = mưa sương/nhạy bén…); ' +
        'thân VƯỢNG hay NHƯỢC và VÌ SAO (mùa sinh/tháng lệnh, có căn/Ấn sinh/Tỷ Kiếp trợ hay bị Tài-Quan-Thực Thương làm hao); ' +
        'nêu rõ DỤNG THẦN – HỶ THẦN – KỴ THẦN và ý nghĩa thực tế (thân vượng nên tiết khí tạo giá trị; thân nhược cần nương Ấn/Tỷ, hệ thống, cộng sự). Theo mạch dữ kiện→phân tích→kết luận.', 800),
    },
    {
      title: 'Thập Thần & cách cục',
      run: make('Viết phần "# 2. Thập Thần nổi bật & Cách cục" (~850 từ). BÁM SÁT dữ liệu "THẬP THẦN" và "Cách cục" đã cho: ' +
        'phân tích các Thập Thần NỔI BẬT (Quan/Sát, Tài, Ấn, Thực/Thương, Tỷ/Kiếp) nói lên điều gì về con người và cách họ vận hành; ' +
        'gọi tên CÁCH CỤC chính (Tài cách / Quan Sát cách / Ấn cách / Thực Thương cách / Tỷ Kiếp cách) và tổ hợp đặc biệt nếu có (Thực Thương sinh Tài, Sát Ấn tương sinh, Tài Quan tương sinh). ' +
        'KẾT LUẬN rõ: "người này nên THÀNH CÔNG bằng CON ĐƯỜNG NÀO" (con đường tổ chức/chức vụ, kinh doanh/tài chính, chuyên môn/học thuật, hay sáng tạo/sản phẩm) — cụ thể, có thể hành động.', 850),
    },
    {
      title: 'Tính cách & tâm lý',
      run: make('Viết phần "# 3. Tính cách & tâm lý" (~750 từ): kết hợp hành thiếu/thừa VÀ Thập Thần nổi bật để vẽ tính cách; động lực cốt lõi; 5 điểm mạnh nên phát huy và 5 điểm yếu cần khắc phục (kèm cách rèn).', 800),
    },
    {
      title: 'Biến động (xung/hợp/hình/hại)',
      run: make('Viết phần "# 4. Biến động cuộc đời (xung – hợp – hình – hại – phá)" (~650 từ). BÁM SÁT dữ liệu "QUAN HỆ CAN–CHI" đã cho và mức biến động: ' +
        'giải thích các quan hệ HIỆN CÓ giữa 4 trụ nói lên điều gì về xu hướng đời sống (dễ đổi việc/đổi nơi ở? dễ mâu thuẫn quan hệ? dễ biến động tài chính? dễ hành động nóng?); ' +
        'người mệnh nhiều xung-hình hợp môi trường biến đổi nhưng cần QUẢN TRỊ quyết định lớn. Kết bằng 3–5 lời khuyên quản trị biến động. Nếu ít biến động thì nói rõ là mệnh ổn định.', 700),
    },
    {
      title: 'Sự nghiệp – tài lộc',
      run: make('Viết phần "# 5. Sự nghiệp – Tài chính – Đầu tư" (~900 từ). Bám Thập Thần (Quan/Sát→tổ chức; Tài→kinh doanh/tài chính; Ấn→chuyên môn; Thực/Thương→sáng tạo/bán hàng) + DỤNG THẦN. ' +
        '★ BẮT BUỘC nêu 5–8 NGÀNH/VỊ TRÍ CỤ THỂ hợp (gọi tên rõ, vd theo hành: Mộc → giáo dục, xuất bản, gỗ – nội thất, thời trang; Hỏa → marketing, truyền thông, F&B, điện – năng lượng, công nghệ; ' +
        'Thổ → bất động sản, xây dựng, nông nghiệp, bảo hiểm, quản trị; Kim → tài chính – ngân hàng, cơ khí, luật, kiểm toán; Thủy → vận tải – logistics, du lịch, thương mại, dịch vụ, môi giới), mỗi nhóm 1 câu lý do; ' +
        'nên LÀM CHỦ hay LÀM CÔNG; CÁCH KIẾM TIỀN nổi trội (lương/kinh doanh/đầu tư) và CÁCH GIỮ TIỀN; rủi ro tiền bạc cần tránh. TUYỆT ĐỐI KHÔNG nói chung chung kiểu "nghề hợp mệnh".', 950),
    },
    {
      title: 'Tình cảm – hôn nhân – bạn bè',
      run: make('Viết phần "# 6. Tình cảm – hôn nhân – bạn bè" (~700 từ): tính cách trong tình cảm; nên kết giao/kết hợp người mang hành nào (theo dụng thần) và vì sao; điểm dễ xung đột; kiểu người nên thận trọng; lời khuyên giữ quan hệ.', 700),
    },
    {
      title: 'Sức khỏe & thói quen',
      run: make('Viết phần "# 7. Sức khỏe & thói quen" (~600 từ): KHÔNG phán bệnh — chỉ nói nhóm áp lực và tạng phủ cần lưu ý (gan/tim/tỳ/phế/thận theo Mộc/Hỏa/Thổ/Kim/Thủy, hành thừa-thiếu), lối sống cần cân bằng và thói quen nên điều chỉnh.', 650),
    },
    {
      title: 'Phong thủy ứng dụng',
      run: make('Viết phần "# 8. Phong thủy ứng dụng chi tiết" (~900 từ), chia rõ: (a) Ăn uống, (b) Trang phục – màu sắc – phụ kiện, (c) Nơi ở – bố trí nhà, (d) Nơi làm việc – bàn ghế, (e) Hướng xuất hành & thời điểm khởi sự, (f) vật phẩm – con số may mắn. Bám dụng thần, không gợi ý theo kỵ thần.', 900),
    },
    {
      title: 'Chấm điểm & Chiến lược hành động',
      run: make('Viết phần "# 9. Chấm điểm 10 chỉ số & Chiến lược hành động" (~750 từ). ' +
        'Chấm điểm THANG 1–10 (làm tròn) cho 10 chỉ số, mỗi chỉ số 1 câu lý do bám dữ kiện: ' +
        'Cân bằng ngũ hành, Năng lượng bản thân (thân vượng/nhược), Sự nghiệp (Quan/Sát/Ấn/Thực Thương), Tài chính (Chính/Thiên Tài), Kinh doanh (Thiên Tài/Thực Thương), ' +
        'Quản trị (Quan/Sát/Ấn), Sáng tạo (Thực/Thương), Quan hệ (Tài/Quan/Tỷ Kiếp tùy nam nữ), Ổn định (Ấn/Quan), Biến động (xung/hình/hại — điểm CÀNG CAO càng cần thận trọng). ' +
        'Sau đó CHỐT CHIẾN LƯỢC HÀNH ĐỘNG: nên làm gì / không nên làm gì / nên chọn môi trường nào / nên hợp tác với kiểu người nào / nên học gì / quản trị rủi ro gì / giai đoạn nào nên chủ động – giai đoạn nào nên chậm lại. Kết thúc trọn vẹn.', 800),
    },
  ];
}

/** Phân tích AI Bát Tự — chạy lần lượt các PHẦN rồi ghép (fallback không streaming). */
export async function analyzeBatTuWithAI(result: AstrologyResult): Promise<string> {
  const sections = batTuSections(result);
  const parts: string[] = [];
  for (const s of sections) parts.push(await s.run());
  return parts.join('\n\n');
}

/** Phân tích AI XEM THEO NGÀY (nhật vận) cho 1 ngày dương lịch cụ thể. */
export async function analyzeNhatVanWithAI(result: AstrologyResult, dateMs: number): Promise<string> {
  const { birthInfo, batTuChart: b } = result;
  const date = new Date(dateMs);
  const sc = scoreNhatVan(result, date);
  const base = generateNhatVanOffline(result, date);
  const fav = (b.favorableElements || []).join(', ');
  const unfav = (b.unfavorableElements || []).join(', ');

  // ── Đại Vận hiện tại ──
  const age = Math.max(0, tuoiMuOfYear(birthInfo, date.getFullYear()));
  const curDV = result.daiVans?.find(dv => age >= dv.startAge && age <= dv.endAge);
  const dvContext = curDV
    ? (() => {
        const dvSc = scoreDaiVan(result, curDV);
        return `Đại Vận hiện tại: ${curDV.stem} ${curDV.branch} (tuổi ${curDV.startAge}–${curDV.endAge}) — ` +
          `${dvSc.rating} (Tài lộc ${dvSc.taiLoc}/100, Thách thức ${dvSc.thachThuc}/100). ` +
          `Thiên thời: ${dvSc.thienThoi}; Địa lợi: ${dvSc.diaLoi}; Nhân hòa: ${dvSc.nhanHoa}. ` +
          `Tóm tắt: ${dvSc.summary.split('.')[0].trim()}.`;
      })()
    : 'Đại Vận hiện tại: chưa xác định (ngoài các giai đoạn đã tính).';

  // ── Danh mục nhóm việc — AI hướng NÊN/KHÔNG NÊN vào đúng các nhóm này ──
  const taskGroups = DAY_PICK_GROUPS
    .filter(g => g.code !== NUMBER_GROUP_CODE)
    .map(g => `  • ${g.name}: ${g.tasks.map(t => t.name).join(', ')}.`)
    .join('\n');

  const prompt = [
    'Bạn là một thầy tư vấn Mệnh lý kiêm chọn ngày (trạch nhật) giàu kinh nghiệm. Tư vấn cho thân chủ về ' +
    'MỘT NGÀY cụ thể dựa trên lá số của họ, bằng tiếng Việt ấm áp, CỤ THỂ và thực tế. KHÔNG bảng/markdown.',
    '',
    `Người xem: ${birthInfo.gender === 'nam' ? 'Nam' : 'Nữ'}, tuổi (chi năm) ${result.tuViChart.lunarDate.yearBranch}. ` +
    `Nhật Chủ ${b.dayMaster} (${b.dayMasterElement}). Dụng thần: ${fav || 'không rõ'}; Kỵ thần: ${unfav || 'không rõ'}.`,
    '',
    `Ngày xem: ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} — ngày ${sc.canChi.stem} ${sc.canChi.branch} ` +
    `(Can hành ${sc.canChi.stemEl}, Chi hành ${sc.canChi.branchEl}).` +
    `${sc.xungTuoi ? ' ⚠ XUNG TUỔI.' : sc.hopTuoi ? ' Hợp tuổi.' : ''}`,
    '',
    '===== ĐIỂM NGÀY TỔNG HỢP (6 CẤP — bắt buộc bám khi luận) =====',
    `Điểm tổng: ${sc.score100}/100 — ${sc.rating}.`,
    `Cấp 1 – Điểm nền (10%): Trực ${sc.truc} · Lục Diệu ${sc.lucDieu} · ${sc.hoangDao ? 'Hoàng Đạo' : 'Hắc Đạo'} · Tú ${sc.nhi28Tu}.`,
    `  (Tú ${sc.nhi28Tu}: xem mô tả trong dữ liệu nền; ảnh hưởng 25% điểm Cấp 1.)`,
    `Cấp 2 – Bát Tự (35%): Can Chi ngày vs Dụng/Kỵ thần — xem chi tiết dữ liệu nền.`,
    dvContext ? `Cấp 3 – Đại Vận (15%): ${dvContext}` : '',
    `Cấp 4 – Lưu Niên (20%): hành năm ${date.getFullYear()} so Dụng/Kỵ thần — xem dữ liệu nền.`,
    `Cấp 5 – Nguyệt Vận (10%): hành ngày trong tháng âm lịch — xem dữ liệu nền.`,
    `Cấp 6 – Theo việc cụ thể (10%): Trực ${sc.truc} và hành ngày có lợi/bất lợi tùy từng loại công việc.`,
    sc.warnings.length ? `Hard Rules: ${sc.warnings.join(' ')}` : '',
    '=====',
    '',
    '===== DỮ LIỆU NỀN (bản Cơ bản — hãy DỰA VÀO và MỞ RỘNG SÂU, KHÔNG sơ sài hơn) =====',
    base,
    '=====',
    '',
    '===== DANH MỤC NHÓM VIỆC — mục NÊN LÀM / KHÔNG NÊN PHẢI bám vào các nhóm/việc này =====',
    taskGroups,
    '=====',
    '',
    'Viết một bản tư vấn cho NGÀY này (1200–1800 từ), 6 mục có tiêu đề, KẾT THÚC trọn vẹn, CỤ THỂ và đời thường. ' +
    'Mỗi khuyến nghị PHẢI gắn với dữ kiện (can chi ngày / dụng–kỵ thần / trực ngày / tú / đại vận / hợp–xung tuổi / khung giờ), KHÔNG nói chung chung:',
    '1. TỔNG QUAN NGÀY: diễn giải điểm ${sc.score100}/100 từ GÓC NHÌN 6 CẤP — Cấp 1 (trực, lục diệu, hoàng/hắc đạo, tú bát tú có thuận không), Cấp 2 (can chi ngày hợp/khắc dụng–kỵ thần), Cấp 3 (đại vận hiện tại đang thuận hay nghịch — nêu rõ đang vận gì, rating, ảnh hưởng tổng thể), Cấp 4–5 (năm tháng có tiếp khí hay tiêu hao), Hard Rules (có xung tuổi / Tam Nương / Nguyệt Kỵ không). Kết luận mức độ "đẹp" thực sự của ngày.',
    '2. NÊN LÀM: DỰA VÀO DANH MỤC NHÓM VIỆC, chọn ra 3–5 NHÓM/VIỆC CỤ THỂ hợp nhất với ngày (gọi đúng tên việc). Với MỖI việc nêu rõ: (a) VÌ SAO hợp — liên hệ cụ thể với trực/tú/can chi ngày/dụng thần/đại vận; (b) KHUNG GIỜ nào tốt nhất (bám khung giờ trong dữ liệu nền). Việc trọng đại (cưới hỏi, động thổ, nhập trạch, khai trương…) chỉ khuyên khi ngày THẬT ĐẸP và không có hard rule nào.',
    '3. KHÔNG NÊN / KIÊNG: DỰA VÀO DANH MỤC, chỉ rõ 3–5 NHÓM/VIỆC nên HOÃN; nêu VÌ SAO (kỵ thần vượng, xung tuổi, trực xấu, tú hung, đại vận nghịch…). Nếu BẮT BUỘC phải làm, hướng dẫn né khung giờ xấu và chọn giờ đỡ hơn. Khi xung tuổi, nhấn mạnh tránh mọi việc trọng đại.',
    '4. ĂN UỐNG & SỨC KHỎE: gợi ý CỤ THỂ nhóm thực phẩm / món / vị / màu bổ theo DỤNG THẦN; món nên hạn chế theo kỵ thần; bộ phận cơ thể cần lưu ý hôm nay (liên hệ hành ngày / tú); 1–2 thói quen sức khỏe nên làm.',
    '5. TRANG PHỤC – MÀU – HƯỚNG – SỐ: màu NÊN mặc (dụng thần) và TRÁNH (kỵ thần) kèm lý do; phụ kiện/đá hợp; HƯỚNG tốt xuất hành – khởi sự; con số may mắn của ngày.',
    '6. TÌNH CẢM – GIAO TIẾP: thuận/không thuận cho việc gì trong đời sống tình cảm; nên gặp / hợp tác với người mang HÀNH nào và vì sao; chủ đề nên nói – nên tránh; khung giờ thuận cho cuộc trò chuyện quan trọng.',
    'Tư vấn như đang dặn dò trực tiếp, dễ áp dụng. Chỉ dùng dữ liệu đã cho, không bịa thêm.',
  ].filter(Boolean).join('\n');
  return capWords(await requestAI(prompt, aiKeysOf(birthInfo)), 5000);
}

/**
 * Phân tích AI cá nhân hóa cho 1 "Sự kiện sắp tới" (lễ Tết/tiết khí/sự kiện cá nhân) — cùng khung
 * giá "AI nhỏ" và độ dài với `analyzeNhatVanWithAI`. Nhúng nguyên DỮ KIỆN của sự kiện + kết quả
 * cá nhân hóa offline đã có (`personalizeEvent`) làm DỮ KIỆN CỐ ĐỊNH — AI chỉ diễn giải/mở rộng,
 * không tự bịa thêm. Theo đúng khung Nam Phái (KHÔNG Mệnh chủ/Thân chủ) + 4 lớp
 * DỮ KIỆN→PHÂN TÍCH→KẾT LUẬN→KHUYẾN NGHỊ (CLAUDE.md mục 2.4).
 */
export async function analyzeEventWithAI(result: AstrologyResult, event: ResolvedEvent): Promise<string> {
  const { birthInfo, batTuChart: b } = result;
  const advice = personalizeEvent(result, event.element, event.occursOn);
  const fav = (b.favorableElements || []).join(', ');
  const unfav = (b.unfavorableElements || []).join(', ');
  const doItems = (event.doText ?? '').split('\n').map(s => s.trim()).filter(Boolean);
  const avoidItems = (event.avoidText ?? '').split('\n').map(s => s.trim()).filter(Boolean);

  const prompt = [
    'Bạn là một thầy tư vấn Mệnh lý (Tử Vi Nam Phái) giàu kinh nghiệm. Tư vấn cho thân chủ về MỘT ' +
    'SỰ KIỆN/NGÀY cụ thể sắp diễn ra, dựa trên lá số của họ, bằng tiếng Việt ấm áp, CỤ THỂ và thực tế. ' +
    'TUYỆT ĐỐI KHÔNG dùng khái niệm "Mệnh chủ"/"Thân chủ" (phái Nam Phái không dùng). KHÔNG bảng/markdown. ' +
    'KHÔNG phán đoán tuyệt đối (không nói "chắc chắn tốt/xấu") — chỉ nói xu hướng, mức độ thuận lợi/rủi ro, và hành động cụ thể.',
    '',
    `Người xem: ${birthInfo.gender === 'nam' ? 'Nam' : 'Nữ'}, tuổi (chi năm) ${result.tuViChart.lunarDate.yearBranch}. ` +
    `Nhật Chủ ${b.dayMaster} (${b.dayMasterElement}). Dụng thần: ${fav || 'không rõ'}; Kỵ thần: ${unfav || 'không rõ'}.`,
    '',
    `Sự kiện: ${event.displayName} (hành ${event.element}) — ngày ${event.occursOn.getDate()}/${event.occursOn.getMonth() + 1}/${event.occursOn.getFullYear()}, ` +
    `${event.daysUntil === 0 ? 'diễn ra HÔM NAY' : event.daysUntil > 0 ? `còn ${event.daysUntil} ngày nữa` : `đã qua ${-event.daysUntil} ngày`}.`,
    '',
    '===== DỮ KIỆN CỐ ĐỊNH (bắt buộc dùng nguyên, không được bịa thêm hay đổi khác) =====',
    `Ý nghĩa sự kiện: ${event.meaning}`,
    doItems.length ? `Nên làm (theo phong tục): ${doItems.join('; ')}.` : '',
    avoidItems.length ? `Nên tránh (theo phong tục): ${avoidItems.join('; ')}.` : '',
    advice ? `Chất lượng ngày này với riêng thân chủ: ${advice.dayScore.rating} (${advice.dayScore.score100}/100).` : '',
    advice && advice.dayScore.reasons.length ? `Căn cứ: ${advice.dayScore.reasons.join('; ')}.` : '',
    advice && advice.dayScore.warnings.length ? `Cảnh báo cứng: ${advice.dayScore.warnings.join(' ')}` : '',
    advice ? `Quan hệ ngũ hành sự kiện với dụng thần: ${advice.elementNote}` : '',
    advice ? `Màu hợp: ${advice.luckyColor}. Hướng hợp: ${advice.luckyDirection}.` : '',
    advice && advice.goodHours.length ? `Khung giờ tốt trong ngày: ${advice.goodHours.map(h => `${h.branch} (${h.range})`).join(', ')}.` : '',
    advice && advice.badHours.length ? `Khung giờ nên tránh: ${advice.badHours.map(h => `${h.branch} (${h.range})`).join(', ')}.` : '',
    !advice ? 'Chưa có đủ dữ liệu cá nhân hóa sâu — chỉ luận theo ý nghĩa chung của sự kiện, nói rõ "chưa đủ dữ liệu để kết luận sâu" ở phần liên quan.' : '',
    '=====',
    '',
    // Hướng dẫn THÊM riêng cho sự kiện này, do admin nhập qua CMS (TUZI_M04 mục 4 "AI Prompt
    // Template") — CHÈN THÊM chứ KHÔNG thay thế khung 4 lớp/quy tắc Nam Phái bên dưới, để không
    // thể vô tình phá vỡ CLAUDE.md 2.4 qua nội dung admin tự nhập.
    event.promptTemplate?.trim()
      ? `Hướng dẫn thêm riêng cho sự kiện này (do admin cấu hình — PHẢI tuân theo cùng các quy tắc và khung 4 lớp bên dưới, KHÔNG được vì hướng dẫn này mà bỏ qua bất kỳ quy tắc nào): ${event.promptTemplate.trim()}\n`
      : '',
    'Viết một bản tư vấn cho SỰ KIỆN này (800–1200 từ), 4 mục có tiêu đề, KẾT THÚC trọn vẹn. ' +
    'MỖI nhận định quan trọng phải theo đúng 4 lớp: [DỮ KIỆN từ lá số/sự kiện] → [PHÂN TÍCH] → [KẾT LUẬN] → ' +
    '[KHUYẾN NGHỊ hành động CỤ THỂ, làm được ngay], và dựa trên ÍT NHẤT 2 dữ kiện đã cho:',
    '1. TỔNG QUAN: sự kiện này có ý nghĩa gì, và với RIÊNG thân chủ (dựa trên chất lượng ngày + quan hệ ngũ hành) thì thuận lợi hay cần thận trọng ở mức nào.',
    '2. NÊN LÀM & CHUẨN BỊ: cụ thể hóa danh sách "nên làm" ở trên theo đúng lá số thân chủ (vd giờ nào trong ngày nên thực hiện, nên nhấn mạnh việc gì hơn).',
    '3. CẦN LƯU Ý / NÊN TRÁNH: cụ thể hóa "nên tránh" + mọi cảnh báo cứng (nếu có) theo lá số; nếu không có gì đặc biệt thì nói rõ.',
    '4. GỢI Ý THỰC TẾ: màu sắc/hướng/khung giờ nên ưu tiên trong chính ngày này, và 1 hành động cụ thể nên làm ngay để tận dụng hoặc hoá giải.',
    'Chỉ dùng dữ liệu đã cho, không bịa thêm sao/cách cục/dữ kiện khác.',
  ].filter(Boolean).join('\n');
  return capWords(await requestAI(prompt, aiKeysOf(birthInfo)), 5000);
}

/** Phân tích AI tổng thể TÀI LỘC cả đời (theo chuỗi đại vận). */
export async function analyzeWealthWithAI(result: AstrologyResult): Promise<string> {
  const { birthInfo, tuViChart: c } = result;
  const taiBach = c.houses.find(h => h.palaceName === 'Tài Bạch');
  const svTB = taiBach ? starsOf(taiBach) : { chinh: [] as string[], phu: [] as string[] };
  const TT_TXT_W: Record<string, string> = {
    sinhNhap: 'sinh nhập', dongHanh: 'đồng hành',
    khacXuat: 'khắc xuất', sinhXuat: 'sinh xuất', khacNhap: 'khắc nhập',
  };
  const dvLines = result.daiVans.slice(0, 10).map(dv => {
    const sc = scoreDaiVan(result, dv);
    return `- ${dv.startAge}-${dv.endAge}t (${dv.stem} ${dv.branch}, cung ${sc.palaceName}): ` +
      `Thiên thời ${TT_TXT_W[sc.thienThoi]} · Địa lợi ${TT_TXT_W[sc.diaLoi]} · Nhân hòa ${sc.nhanHoa} ` +
      `→ ${sc.rating} (TL=${sc.taiLoc}, TT=${sc.thachThuc})`;
  });
  const prompt = [
    'Bạn là chuyên gia Tử Vi Đẩu Số phái NAM PHÁI, luận giải theo PHƯƠNG PHÁP CỤ THIÊN LƯƠNG. ' +
    'Luận riêng về TÀI LỘC cả đời, bằng tiếng Việt mạch lạc, KHÔNG bảng/markdown.',
    '',
    `Người xem: ${birthInfo.gender === 'nam' ? 'Nam' : 'Nữ'}, ${birthInfo.year}. ` +
    `Cung Tài Bạch tại ${taiBach?.branch}: chính tinh ${svTB.chinh.join(', ') || 'Vô chính diệu'}` +
    (svTB.phu.length ? `; phụ tinh ${svTB.phu.slice(0, 8).join(', ')}` : '') + '.',
    '',
    '===== CHUỖI ĐẠI VẬN — chấm theo 3 YẾU TỐ cụ Thiên Lương =====',
    'Khung: THIÊN THỜI · ĐỊA LỢI · NHÂN HÒA. "Đại vận lấn áp Tiểu vận" — gốc khá thì cành dễ tốt.',
    dvLines.join('\n'),
    '',
    (() => {
      const dna = analyzeFinancialDNA(result);
      const dims = (['earn', 'retain', 'cashflow', 'invest', 'leverage', 'property', 'business', 'risk'] as const)
        .map(k => `${FINANCIAL_DIM_LABEL[k]}=${dna[k]}`).join(' · ');
      return [
        '===== ADN TÀI CHÍNH (Financial DNA — 8 chiều, engine pre-computed) =====',
        `Điểm 8 chiều: ${dims} (mỗi chiều 0–100; "Rủi ro" CAO = dễ biến động).`,
        `Chiều trội nhất: ${FINANCIAL_DIM_LABEL[dna.dominant]}. Chân dung: ${dna.archetype} Mức rủi ro: ${dna.riskLevel}. Độ tin cậy engine: ${dna.confidence}%.`,
        dna.notes.length ? `Cơ chế (bằng chứng): ${dna.notes.join(' ')}` : '',
        'BẮT BUỘC bám 8 chiều này khi luận — DIỄN GIẢI ý nghĩa từng chiều, KHÔNG đưa ra con số khác với engine, KHÔNG bịa thêm chiều mới.',
      ].filter(Boolean).join('\n');
    })(),
    '',
    'Trình bày SÚC TÍCH mà đủ ý (TỐI ĐA khoảng 5000 từ), 6 mục có tiêu đề rõ, KẾT THÚC trọn vẹn, BÁM SÁT khung 3 yếu tố + ADN tài chính khi luận:',
    '1. ĐẶC ĐIỂM TÀI LỘC CƠ BẢN: phân tích cung Tài Bạch (chính tinh + phụ tinh + miếu hãm); cách kiếm tiền NỔI TRỘI (lương / kinh doanh / đầu tư / nghệ thuật…); cách giữ tiền (Thiên Phủ → khéo cất; Vũ Khúc + Lộc → ổn định; Tham Lang → dễ phá tán nếu thiếu chế hóa); ★ nêu 4–6 NGÀNH/LĨNH VỰC CỤ THỂ hợp để kiếm tiền (gọi tên rõ ràng, vd: tài chính – ngân hàng, bất động sản, kỹ thuật, tư vấn, marketing, ẩm thực…) và ngành KỴ — KHÔNG nói chung chung.',
    '2. CUNG ĐIỀN TRẠCH BỔ TRỢ: nhà cửa, bất động sản, gia tài lớn — có Long Phượng Thai Tọa, Tả Hữu Quan Phúc không; có thể đầu tư BĐS / xe lớn không.',
    '3. GIAI ĐOẠN TÀI LỘC THỊNH NHẤT (1-2 đại vận): chỉ rõ đại vận nào (tuổi) + Can Chi + cung; GIẢI THÍCH chi tiết theo Thiên thời / Địa lợi / Nhân hòa; nêu các sao tài (Lộc, Vũ, Âm, Trù, Riêu, Hỏa Linh hợp cách); lời khuyên dồn lực thời kỳ này.',
    '4. GIAI ĐOẠN THẬN TRỌNG về tiền bạc (1-2 đại vận): chỉ rõ đại vận + lý do CỤ THỂ (Hóa Kỵ về Tài, Không Kiếp Đại Hao chiếu, Thiên thời bị khắc nhập…); rủi ro chính (bị lừa, đầu tư hỏng, hao tổn vì người thân…); cách phòng tránh.',
    '5. CHIẾN LƯỢC TÀI CHÍNH TỪNG CHẶNG ĐỜI: chia 3-4 chặng (tuổi <30 / 30-50 / 50-70 / sau 70) — mỗi chặng nên ưu tiên tích lũy / mở rộng / bảo toàn / chia sẻ.',
    '6. KẾT LUẬN & 5-7 LỜI KHUYÊN HÀNH ĐỘNG cụ thể về quản lý tài chính cá nhân (nên có quỹ dự phòng bao nhiêu tháng, có nên vay nợ kinh doanh không, có nên đầu tư chứng khoán / vàng / BĐS không…).',
    'Chỉ dùng dữ liệu đã cho, không bịa thêm sao.',
  ].join('\n');
  const facts = extractChartFacts(result);
  return capWords(await requestValidatedAI(prompt, aiKeysOf(birthInfo), facts), 5000);
}

/**
 * (Phase 14-full — adoption) Tóm tắt toàn lá số bằng STRUCTURED OUTPUT: yêu cầu AI
 * trả JSON có evidence_ids, parse + kiểm chứng theo facts; nếu JSON hỏng/bịa evidence
 * thì FALLBACK về text thường (an toàn tuyệt đối — luôn trả markdown hiển thị được).
 */
export async function analyzeNatalStructured(result: AstrologyResult): Promise<string> {
  const prompt = [
    'Bạn là chuyên gia Tử Vi Đẩu Số phái NAM PHÁI. Tóm tắt SÚC TÍCH toàn lá số theo dữ kiện engine bên dưới.',
    '',
    natalFactsBlock(result),
    '',
    'Viết 3–5 mục (Bản chất · Cơ chế vận mệnh · Điểm mạnh · Điểm cần lưu tâm), mỗi mục 3–5 câu tiếng Việt.',
    STRUCTURED_INSTRUCTION,
  ].join('\n');
  const raw = await requestAI(prompt, aiKeysOf(result.birthInfo));
  const parsed = parseAndValidate(raw, result);
  return parsed.ok && parsed.data ? renderNarrative(parsed.data) : (parsed.fallbackText ?? raw);
}

/** Tóm tắt nhanh 1 Đại Vận — structured, có evidence gating + fallback text. */
export async function analyzeDaiVanStructured(result: AstrologyResult, dvIndex: number): Promise<string> {
  const dv = result.daiVans[dvIndex];
  if (!dv) return '⚠ Không tìm thấy đại vận.';
  const sc = scoreDaiVan(result, dv);
  const facts = [
    '[ENGINE FACTS — đại vận]',
    `- Đại vận ${dv.startAge}-${dv.endAge} tuổi, Can-Chi ${dv.stem} ${dv.branch}, cung ${sc.palaceName}.`,
    `- Tài lộc: ${sc.taiLoc}/100 · Thách thức: ${sc.thachThuc}/100 · Xếp hạng: ${sc.rating}.`,
    `- Sự nghiệp ${sc.career}/100 · Quan hệ ${sc.relationship}/100 · Sức khỏe ${sc.health}/100 · Tài sản ${sc.property}/100 · Cơ hội ${sc.opportunity}/100 · Biến động ${sc.volatility}/100.`,
    `- Chiến lược: ${sc.strategyLabel}. Độ tin cậy: ${sc.confidence}%.`,
    `- Tóm tắt engine: ${sc.summary}`,
  ].join('\n');
  const prompt = [
    'Tóm tắt SÚC TÍCH đại vận này theo dữ kiện engine bên dưới. TIẾNG VIỆT tự nhiên.',
    '',
    facts,
    '',
    'Viết 3–4 mục (Chủ đề chính · Điểm thuận lợi · Điểm bất lợi · Khuyến nghị hành động), mỗi mục 3–5 câu.',
    STRUCTURED_INSTRUCTION,
  ].join('\n');
  const raw = await requestAI(prompt, aiKeysOf(result.birthInfo));
  const parsed = parseAndValidate(raw, result);
  return parsed.ok && parsed.data ? renderNarrative(parsed.data) : (parsed.fallbackText ?? raw);
}

/** Tóm tắt nhanh 1 năm Tiểu Vận — structured. */
export async function analyzeTieuVanStructured(result: AstrologyResult, age: number): Promise<string> {
  const tv = result.tieuVans.find(t => t.age === age);
  if (!tv) return '⚠ Không tìm thấy tiểu vận.';
  const sc = scoreTieuVan(result, tv);
  const facts = [
    '[ENGINE FACTS — tiểu vận (năm)]',
    `- Năm ${tv.year} (${tv.age} tuổi), Can-Chi năm ${tv.yearStem} ${tv.yearBranch}, cung tiểu hạn ${sc.palaceName} (${tv.branch}).`,
    `- Tài lộc: ${sc.taiLoc}/100 · Thách thức: ${sc.thachThuc}/100 · Xếp hạng: ${sc.rating}.`,
    `- Sự nghiệp ${sc.career}/100 · Quan hệ ${sc.relationship}/100 · Sức khỏe ${sc.health}/100 · Cơ hội ${sc.opportunity}/100 · Biến động ${sc.volatility}/100.`,
    `- Tóm tắt engine: ${sc.summary}`,
  ].join('\n');
  const prompt = [
    'Tóm tắt SÚC TÍCH năm này theo dữ kiện engine bên dưới. TIẾNG VIỆT tự nhiên.',
    '',
    facts,
    '',
    'Viết 3–4 mục (Chủ đề năm · Điểm thuận lợi · Điểm bất lợi · Khuyến nghị hành động 12 tháng), mỗi mục 3–5 câu.',
    STRUCTURED_INSTRUCTION,
  ].join('\n');
  const raw = await requestAI(prompt, aiKeysOf(result.birthInfo));
  const parsed = parseAndValidate(raw, result);
  return parsed.ok && parsed.data ? renderNarrative(parsed.data) : (parsed.fallbackText ?? raw);
}

/** Tóm tắt nhanh 1 tháng Nguyệt Vận — structured. */
export async function analyzeNguyetVanStructured(result: AstrologyResult, age: number, month: number): Promise<string> {
  const sc = scoreNguyetVan(result, age, month);
  if (!sc) return '⚠ Không tính được nguyệt vận.';
  const facts = [
    '[ENGINE FACTS — nguyệt vận (tháng)]',
    `- Tháng ${sc.month} âm lịch, lưu tại cung ${sc.palaceName} (${sc.branch}).`,
    `- Tài lộc: ${sc.taiLoc}/100 · Thách thức: ${sc.thachThuc}/100 · Xếp hạng: ${sc.rating}.`,
    `- Tóm tắt engine: ${sc.summary}`,
  ].join('\n');
  const prompt = [
    'Tóm tắt SÚC TÍCH tháng này theo dữ kiện engine bên dưới. TIẾNG VIỆT tự nhiên.',
    '',
    facts,
    '',
    'Viết 3 mục (Chủ đề tháng · Nên làm · Nên tránh), mỗi mục 2–3 câu.',
    STRUCTURED_INSTRUCTION,
  ].join('\n');
  const raw = await requestAI(prompt, aiKeysOf(result.birthInfo));
  const parsed = parseAndValidate(raw, result);
  return parsed.ok && parsed.data ? renderNarrative(parsed.data) : (parsed.fallbackText ?? raw);
}
