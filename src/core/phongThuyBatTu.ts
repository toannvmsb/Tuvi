/**
 * PHONG THỦY THEO BÁT TỰ (trường phái dụng dụng thần điều hậu).
 *
 * Từ Nhật Chủ + dụng thần (favorableElements) + kỵ thần (unfavorableElements)
 * của lá Bát Tự, suy ra các gợi ý phong thủy thực hành:
 *  - Hướng nhà / hướng bàn làm việc / đầu giường nên chọn.
 *  - Màu sắc hợp (trang phục, xe, nội thất).
 *  - Vật phẩm & yếu tố ngũ hành nên TĂNG (bổ dụng thần) và nên GIẢM (kỵ thần).
 *  - Ngành nghề / lĩnh vực hợp.
 *  - Con số, mùa, vị trí có lợi.
 *
 * Logic rule-based, bám ngũ hành — tham khảo, không thay thế thầy phong thủy.
 */

import type { BatTuChart, FiveElement } from '../types';

interface ElementFengShui {
  huong: string;       // hướng nhà / bàn làm việc
  mau: string;         // màu sắc
  vatPham: string;     // vật phẩm phong thủy
  nganh: string;       // ngành nghề
  so: string;          // con số
  mua: string;         // mùa vượng
}

const FS: Record<FiveElement, ElementFengShui> = {
  Mộc: {
    huong: 'Đông và Đông Nam',
    mau: 'xanh lá, xanh ngọc',
    vatPham: 'cây xanh phong thủy (trúc, kim tiền), tranh rừng cây, đồ gỗ tự nhiên',
    nganh: 'giáo dục, xuất bản – sách báo, dệt may, nội thất gỗ, đông y – dược liệu, môi trường',
    so: '3, 4',
    mua: 'mùa Xuân',
  },
  Hỏa: {
    huong: 'chính Nam',
    mau: 'đỏ, hồng, cam, tím',
    vatPham: 'đèn ánh ấm, nến, đồ trang trí đỏ, vật dụng điện tử, ngựa/phượng đỏ',
    nganh: 'điện – năng lượng, ẩm thực – nấu nướng, mỹ phẩm – làm đẹp, quảng cáo – giải trí, ánh sáng',
    so: '9',
    mua: 'mùa Hạ',
  },
  Thổ: {
    huong: 'Tây Nam, Đông Bắc và trung cung (giữa nhà)',
    mau: 'vàng đất, nâu, be',
    vatPham: 'gốm sứ, đá phong thủy (thạch anh), pha lê, tượng đá, núi cảnh',
    nganh: 'bất động sản, xây dựng, nông nghiệp, bảo hiểm, tư vấn – môi giới, gốm sứ',
    so: '2, 5, 8',
    mua: 'cuối các mùa (tháng Thìn–Tuất–Sửu–Mùi)',
  },
  Kim: {
    huong: 'Tây và Tây Bắc',
    mau: 'trắng, ánh kim, xám bạc',
    vatPham: 'kim loại quý, chuông đồng, đồng hồ, tượng kim loại, hồ lô đồng',
    nganh: 'tài chính – ngân hàng, cơ khí – chế tạo, kim hoàn, ô tô, công nghệ phần cứng, quân – cảnh',
    so: '6, 7',
    mua: 'mùa Thu',
  },
  Thủy: {
    huong: 'chính Bắc',
    mau: 'đen, xanh dương đậm',
    vatPham: 'bể cá, đài phun nước, gương, tranh sông nước (đặt nơi hợp lý)',
    nganh: 'vận tải – logistics, du lịch, thủy sản, thương mại, truyền thông, xuất nhập khẩu',
    so: '1',
    mua: 'mùa Đông',
  },
};

const SHENG: Record<FiveElement, FiveElement> = { Mộc: 'Hỏa', Hỏa: 'Thổ', Thổ: 'Kim', Kim: 'Thủy', Thủy: 'Mộc' };
const KHAC: Record<FiveElement, FiveElement> = { Mộc: 'Thổ', Thổ: 'Thủy', Thủy: 'Hỏa', Hỏa: 'Kim', Kim: 'Mộc' };
const ALL: FiveElement[] = ['Kim', 'Mộc', 'Thủy', 'Hỏa', 'Thổ'];

/** Chi tiết tính cách & cách bổ/tiết theo từng hành. */
interface ElementDetail {
  tang: string;       // bộ phận cơ thể liên quan
  balanced: string;   // tính cách khi cân
  deficient: string;  // tính cách / vấn đề khi THIẾU
  excess: string;     // tính cách / vấn đề khi THỪA
  an: string;         // ăn uống bổ hành này
  thucPham: string;   // thực phẩm cụ thể bổ hành
  mac: string;        // trang phục / màu
  noiLam: string;     // nơi làm việc
  noiO: string;       // nơi ở / nhà
  huong: string;      // hướng tốt (xuất hành / bàn / cửa)
  nguoiHop: string;   // nét người nên kết giao (mang hành này)
}

const DETAIL: Record<FiveElement, ElementDetail> = {
  Mộc: {
    tang: 'Gan – mật, gân, mắt',
    balanced: 'nhân hậu, giàu lòng trắc ẩn, sáng tạo, có chí tiến thủ, ngay thẳng, thích vươn lên và phát triển.',
    deficient: 'thiếu quyết tâm vươn lên, dễ nản chí, ít kế hoạch dài hạn, thiếu lòng vị tha; gan – mật – mắt dễ yếu, hay mỏi mệt, cáu gắt ngầm.',
    excess: 'bướng bỉnh, cố chấp, ôm đồm, hay áp đặt, dễ căng thẳng – nóng gan; làm nhiều mà khó dứt điểm.',
    an: 'thực phẩm vị chua nhẹ và rau lá xanh để dưỡng can',
    thucPham: 'rau lá xanh (cải, rau muống, súp lơ), trái cây chua (chanh, khế, me, cam quýt), trà xanh, đậu xanh – đậu Hà Lan, rau mầm, dưa cải, dầu ô liu',
    mac: 'tông xanh lá, xanh ngọc; chất liệu cotton/vải sợi tự nhiên',
    noiLam: 'đặt cây xanh trên bàn, ngồi gần cửa sổ/ánh sáng tự nhiên, hướng bàn về Đông – Đông Nam, dùng đồ gỗ',
    noiO: 'nhiều cây cảnh, ban công xanh, nội thất gỗ, phòng thoáng sáng hướng Đông',
    huong: 'Đông, Đông Nam',
    nguoiHop: 'người tính Mộc — nhân hậu, sáng tạo, có chí cầu tiến, thẳng thắn (giúp khơi gợi động lực phát triển)',
  },
  Hỏa: {
    tang: 'Tim – mạch, ruột non, huyết áp',
    balanced: 'nhiệt tình, lễ độ, lạc quan, sáng sủa, giao tiếp tốt, biết truyền cảm hứng cho người khác.',
    deficient: 'lạnh nhạt, thiếu nhiệt huyết và tự tin, ngại thể hiện, dễ u sầu; tim mạch – tuần hoàn yếu, tay chân lạnh.',
    excess: 'nóng nảy, bốc đồng, mất kiên nhẫn, nói nhiều, dễ "bốc lên xẹp xuống"; dễ viêm, mất ngủ, huyết áp cao.',
    an: 'thực phẩm vị đắng nhẹ và ấm để dưỡng tâm',
    thucPham: 'rau đắng – mướp đắng, cà phê – cacao đen, gia vị cay ấm vừa phải (ớt chuông đỏ, nghệ, quế), thịt đỏ, đồ nướng/áp chảo, cà chua, táo đỏ',
    mac: 'tông đỏ, hồng, cam, tím; phụ kiện màu nóng điểm xuyết',
    noiLam: 'bàn đủ ánh sáng, đèn ánh ấm, vật trang trí đỏ/cam, thiết bị điện tử; hướng Nam',
    noiO: 'phòng sáng sủa, bếp ấm cúng, tránh nhà tối ẩm; thắp đèn ấm vào tối',
    huong: 'chính Nam',
    nguoiHop: 'người tính Hỏa — nhiệt tình, lạc quan, giỏi giao tiếp (giúp bạn cởi mở, tự tin và ấm áp hơn)',
  },
  Thổ: {
    tang: 'Tỳ – vị (lá lách – dạ dày), cơ bắp',
    balanced: 'trung hậu, đáng tin, kiên định, thực tế, bao dung, giữ chữ tín, biết tích lũy.',
    deficient: 'thiếu ổn định, hay lo nghĩ, khó kiên trì, dễ thay đổi chủ ý, thiếu cảm giác an toàn; tiêu hóa – dạ dày kém, hay đầy bụng.',
    excess: 'bảo thủ, chậm chạp, ù lì, cố chấp, ôm giữ quá mức (tích trữ); dễ trì trệ, nặng nề.',
    an: 'thực phẩm vị ngọt tự nhiên và ngũ cốc để kiện tỳ',
    thucPham: 'ngũ cốc (gạo lứt, yến mạch), khoai – bí đỏ – ngô, đậu nành, mật ong, táo đỏ – long nhãn, các loại hạt (óc chó, hạnh nhân), đồ ăn màu vàng',
    mac: 'tông vàng đất, nâu, be; chất liệu len/dạ ấm',
    noiLam: 'đặt đá thạch anh/pha lê, đồ gốm sứ, vị trí bàn ổn định ở trung tâm/Tây Nam, tông vàng nâu',
    noiO: 'nền nhà vững chãi, gốm sứ trang trí, tránh ẩm thấp; góc trung cung gọn sạch',
    huong: 'Tây Nam, Đông Bắc, trung cung',
    nguoiHop: 'người tính Thổ — chân thành, đáng tin, điềm đạm (giúp bạn vững vàng, có cảm giác an toàn)',
  },
  Kim: {
    tang: 'Phổi – đại tràng, da, hệ hô hấp',
    balanced: 'quyết đoán, kỷ luật, công bằng, trọng nghĩa khí, sắc bén, làm việc gọn gàng dứt khoát.',
    deficient: 'thiếu quyết đoán, ngại va chạm, dễ mềm lòng, kém kỷ luật; phổi – hô hấp – da dễ yếu, hay cảm, khô da.',
    excess: 'cứng nhắc, lạnh lùng, hiếu thắng, hay phán xét, dễ xung đột; nói thẳng đến mức tổn thương người.',
    an: 'thực phẩm vị cay nhẹ và màu trắng để dưỡng phế',
    thucPham: 'gừng – hành – tỏi – sả, củ cải trắng, lê, hạnh nhân – hạt sen, sữa, cá – hải sản vỏ (nghêu, sò), nấm trắng, củ cải',
    mac: 'tông trắng, ánh kim, xám bạc; phụ kiện kim loại',
    noiLam: 'đồ kim loại (chặn giấy, đồng hồ), bàn gọn gàng ngăn nắp, tông trắng – bạc; hướng Tây – Tây Bắc',
    noiO: 'nội thất kim loại điểm xuyết, màu trắng/xám, không gian gọn gàng tối giản',
    huong: 'Tây, Tây Bắc',
    nguoiHop: 'người tính Kim — kỷ luật, quyết đoán, trọng nghĩa (giúp bạn dứt khoát và có nguyên tắc hơn)',
  },
  Thủy: {
    tang: 'Thận – bàng quang, tai, hệ tiết niệu – sinh dục',
    balanced: 'thông minh, linh hoạt, mưu trí, giao tiếp khéo, thích nghi nhanh, giỏi xoay chuyển tình thế.',
    deficient: 'kém linh hoạt, ngại giao tiếp, thiếu mưu lược, dễ bế tắc ý tưởng; thận – tai – tiết niệu dễ yếu, hay mệt, sợ lạnh.',
    excess: 'đa mưu, bất định, hay lo xa thái quá, tâm trí "trôi nổi" khó tập trung; dễ ứ trệ, phù, thận làm việc quá tải.',
    an: 'thực phẩm vị mặn nhẹ và màu sẫm để bổ thận',
    thucPham: 'đậu đen – mè đen, rong biển – tảo, cá – hải sản, canh hầm xương, nấm hương đen, nho đen – việt quất; uống đủ nước ấm',
    mac: 'tông đen, xanh dương đậm; chất liệu mềm mại',
    noiLam: 'bể cá nhỏ hoặc tranh sông nước (đặt hợp lý), điểm xuyết xanh dương – đen; hướng Bắc',
    noiO: 'có yếu tố nước vừa phải (không quá nhiều), màu tối điểm xuyết, tránh để nước tù đọng',
    huong: 'chính Bắc',
    nguoiHop: 'người tính Thủy — thông minh, linh hoạt, khéo léo (giúp bạn cởi mở giao tiếp và nhạy bén hơn)',
  },
};

/** Tra cứu nhanh gợi ý phong thủy theo 1 hành (dùng cho xem theo ngày). */
export function elementPhongThuy(el: FiveElement): {
  mau: string; thucPham: string; huong: string; vatPham: string; nganh: string; so: string; nguoiHop: string;
} {
  return {
    mau: DETAIL[el].mac,
    thucPham: DETAIL[el].thucPham,
    huong: DETAIL[el].huong,
    vatPham: FS[el].vatPham,
    nganh: FS[el].nganh,
    so: FS[el].so,
    nguoiHop: DETAIL[el].nguoiHop,
  };
}

type Level = 'khuyet' | 'thieu' | 'du' | 'thua';
const LEVEL_LABEL: Record<Level, string> = {
  khuyet: 'KHUYẾT (không có)', thieu: 'THIẾU', du: 'ĐỦ – cân', thua: 'THỪA',
};

/** Phân loại mỗi hành thành khuyết / thiếu / đủ / thừa dựa trên elementCounts. */
function classifyElements(counts: Record<FiveElement, number>): Record<FiveElement, Level> {
  const total = ALL.reduce((s, e) => s + (counts[e] || 0), 0) || 1;
  const avg = total / 5;
  const res = {} as Record<FiveElement, Level>;
  for (const e of ALL) {
    const c = counts[e] || 0;
    if (c === 0) res[e] = 'khuyet';
    else if (c <= avg * 0.6) res[e] = 'thieu';
    else if (c >= avg * 1.7) res[e] = 'thua';
    else res[e] = 'du';
  }
  return res;
}

/** Đánh giá thân vượng / thân nhược dựa trên số lượng ngũ hành quanh Nhật Chủ. */
function thanStrength(chart: BatTuChart): { label: string; strong: boolean; note: string } {
  const dm = chart.dayMasterElement;
  const counts = chart.elementCounts;
  // "Phe ta" = đồng hành (chính dm) + sinh ra dm (ấn). "Phe khắc" = khắc dm + dm sinh + dm khắc.
  const sinhDM = (Object.keys(SHENG) as FiveElement[]).find(e => SHENG[e] === dm)!; // hành sinh dm
  const support = (counts[dm] || 0) + (counts[sinhDM] || 0);
  const total = ALL.reduce((s, e) => s + (counts[e] || 0), 0) || 1;
  const ratio = support / total;
  if (ratio >= 0.5) return { label: 'Thân VƯỢNG', strong: true, note: 'Nhật Chủ được nâng đỡ nhiều — nên TIẾT/KHẮC bớt (dùng hành mà Nhật Chủ sinh ra hoặc hành khắc Nhật Chủ) để cân bằng.' };
  if (ratio <= 0.3) return { label: 'Thân NHƯỢC', strong: false, note: 'Nhật Chủ yếu — nên SINH/PHÙ trợ (dùng hành sinh ra Nhật Chủ và hành đồng loại) để tăng lực.' };
  return { label: 'Thân TRUNG HÒA', strong: false, note: 'Nhật Chủ ở mức cân bằng tương đối — ưu tiên dụng thần điều hậu (theo mùa sinh) và giữ thế quân bình.' };
}

export interface PhongThuyAdvice {
  dungThan: FiveElement[];
  kyThan: FiveElement[];
  than: { label: string; note: string };
  khuyet: FiveElement[];
  thieu: FiveElement[];
  thua: FiveElement[];
  /** Văn bản markdown đầy đủ để render. */
  markdown: string;
}

export function analyzePhongThuyBatTu(chart: BatTuChart): PhongThuyAdvice {
  const dung = chart.favorableElements?.length ? chart.favorableElements : [chart.dayMasterElement];
  const ky = chart.unfavorableElements ?? [];
  const than = thanStrength(chart);

  const cls = classifyElements(chart.elementCounts);
  const khuyet = ALL.filter(e => cls[e] === 'khuyet');
  const thieu = ALL.filter(e => cls[e] === 'thieu');
  const thua = ALL.filter(e => cls[e] === 'thua');
  // NEO theo dụng/kỵ thần để không mâu thuẫn:
  //  - Chỉ BỔ hành thiếu/khuyết NẾU không phải kỵ thần (thiếu mà là kỵ → KHÔNG bổ).
  //  - Chỉ TIẾT GIẢM hành thừa NẾU không phải dụng thần (thừa mà là dụng → vẫn dùng).
  const canBoSung = [...khuyet, ...thieu].filter(e => !ky.includes(e));
  const boSungButKy = [...khuyet, ...thieu].filter(e => ky.includes(e));
  const canTietGiam = thua.filter(e => !dung.includes(e));
  const thuaButDung = thua.filter(e => dung.includes(e));

  const lines: string[] = [];
  lines.push('# Phong Thủy theo Bát Tự');
  lines.push(`**Nhật Chủ:** ${chart.dayMaster} (${chart.dayMasterElement}) · **${than.label}**`);
  lines.push(than.note);
  lines.push('');
  lines.push(`**Dụng thần (nên bổ trợ):** ${dung.join(', ')}`);
  if (ky.length) lines.push(`**Kỵ thần (nên hạn chế):** ${ky.join(', ')}`);
  lines.push('');

  // ===== CÂN BẰNG NGŨ HÀNH & TÍNH CÁCH =====
  lines.push('# Cân bằng ngũ hành & ảnh hưởng tính cách');
  lines.push('Phân bổ ngũ hành trong tứ trụ (tính cả tàng can):');
  for (const e of ALL) {
    const c = chart.elementCounts[e] || 0;
    lines.push(`- **${e}**: ${c.toFixed(1).replace('.0', '')} điểm — ${LEVEL_LABEL[cls[e]]}`);
  }
  lines.push('');
  // Luận tính cách theo hành thiếu/thừa
  for (const e of [...khuyet, ...thieu]) {
    lines.push(`**▸ Hành ${e} ${cls[e] === 'khuyet' ? 'khuyết' : 'thiếu'}** (tạng: ${DETAIL[e].tang})`);
    lines.push(`- Ảnh hưởng: ${DETAIL[e].deficient}`);
    lines.push('');
  }
  for (const e of thua) {
    lines.push(`**▸ Hành ${e} thừa** (tạng: ${DETAIL[e].tang})`);
    lines.push(`- Ảnh hưởng: ${DETAIL[e].excess}`);
    lines.push('');
  }
  if (!khuyet.length && !thieu.length && !thua.length) {
    lines.push('Ngũ hành tương đối quân bình — tính cách hài hòa, ít cực đoan; chỉ cần giữ nhịp và ưu tiên dụng thần.');
    lines.push('');
  }

  // ===== BỔ SUNG CHO HÀNH THIẾU (chỉ hành KHÔNG phải kỵ thần) =====
  if (canBoSung.length) {
    lines.push('# Bổ sung cho ngũ hành thiếu/khuyết');
    lines.push(`Các hành thiếu/khuyết VÀ có lợi (không phải kỵ thần) nên bồi đắp: **${canBoSung.join(', ')}**. Bổ theo 4 hướng — Ăn / Mặc / Nơi làm việc / Nơi ở:`);
    lines.push('');
    for (const e of canBoSung) {
      const d = DETAIL[e];
      lines.push(`**▸ Bổ hành ${e}**`);
      lines.push(`- 🍚 Ăn uống (${d.an}): ${d.thucPham}.`);
      lines.push(`- 👕 Trang phục: ${d.mac}.`);
      lines.push(`- 💼 Nơi làm việc: ${d.noiLam}.`);
      lines.push(`- 🏠 Nơi ở: ${d.noiO}.`);
      lines.push(`- 🧭 Hướng xuất hành tốt: ${d.huong}.`);
      lines.push(`- 🤝 Nên kết giao: ${d.nguoiHop}.`);
      lines.push('');
    }
  }
  // Hành tuy thiếu nhưng là KỴ THẦN → KHÔNG bổ (tránh mâu thuẫn).
  if (boSungButKy.length) {
    lines.push(`> ⚠️ Lưu ý: hành **${boSungButKy.join(', ')}** tuy ÍT trong tứ trụ nhưng lại là KỴ THẦN, nên KHÔNG cố bổ thêm — thiếu là điều có lợi, cứ để tự nhiên.`);
    lines.push('');
  }

  // ===== TIẾT GIẢM CHO HÀNH THỪA (chỉ hành KHÔNG phải dụng thần) =====
  if (canTietGiam.length) {
    lines.push('# Tiết giảm cho ngũ hành thừa');
    for (const e of canTietGiam) {
      const xa = SHENG[e];        // hành mà e sinh ra (xả bớt)
      const khac = KHAC[e];       // hành khắc e
      lines.push(`**▸ Hành ${e} thừa** — nên giảm và "xả" sang hành ${xa} (hành ${e} sinh ${xa}); ` +
        `hoặc dùng hành ${khac} để chế bớt.`);
      lines.push(`- Hạn chế: bớt màu/đồ thuộc hành ${e} (${DETAIL[e].mac.split(';')[0].trim()}); ` +
        `tăng yếu tố hành ${xa} (vd màu ${DETAIL[xa].mac.split(';')[0].trim()}) để dòng khí lưu thông.`);
      lines.push('');
    }
  }
  // Hành tuy thừa nhưng là DỤNG THẦN → vẫn dùng (tránh mâu thuẫn với mục "nên tăng").
  if (thuaButDung.length) {
    lines.push(`> ✅ Lưu ý: hành **${thuaButDung.join(', ')}** tuy NHIỀU trong tứ trụ nhưng là DỤNG THẦN, nên vẫn GIỮ và sử dụng (không cần tiết giảm) — đây là điểm tựa có lợi cho lá số.`);
    lines.push('');
  }

  // Chi tiết cho từng dụng thần
  lines.push('# Nên TĂNG cường (theo dụng thần)');
  for (const el of dung) {
    const f = FS[el];
    if (!f) continue;
    lines.push(`**▸ Hành ${el}**`);
    lines.push(`- Hướng tốt: ${f.huong}.`);
    lines.push(`- Màu hợp: ${f.mau}.`);
    lines.push(`- Vật phẩm nên dùng: ${f.vatPham}.`);
    lines.push(`- Ngành nghề hợp: ${f.nganh}.`);
    lines.push(`- Con số may mắn: ${f.so}; mùa vượng: ${f.mua}.`);
    lines.push('');
  }

  // Kỵ thần — nên giảm
  if (ky.length) {
    lines.push('# Nên HẠN CHẾ (theo kỵ thần)');
    for (const el of ky) {
      const f = FS[el];
      if (!f) continue;
      lines.push(`- Hạn chế hành **${el}**: bớt màu ${f.mau}; tránh đặt nặng hướng ${f.huong}; cân nhắc khi theo ngành ${f.nganh.split(',')[0].trim()}…`);
    }
    lines.push('');
  }

  // Gợi ý bố trí tổng hợp
  lines.push('# Gợi ý bố trí & ứng dụng');
  const mau = dung.map(e => FS[e]?.mau).filter(Boolean).join('; ');
  const huong = dung.map(e => FS[e]?.huong).filter(Boolean).join(' / ');
  lines.push(`- **Hướng** bàn làm việc, đầu giường, cửa chính: ưu tiên ${huong}.`);
  lines.push(`- **Màu sắc** trang phục, xe, ví, nội thất chủ đạo: ${mau}.`);
  lines.push(`- **Trang sức / vật mang theo:** chọn chất liệu thuộc hành dụng thần (vd ${dung.map(e => FS[e]?.vatPham.split(',')[0].trim()).filter(Boolean).join(', ')}).`);
  if (than.strong) {
    lines.push('- Vì thân vượng: nên ưu tiên hành mà Nhật Chủ SINH RA hoặc hành KHẮC Nhật Chủ để xả bớt năng lượng dư, tránh bồi thêm hành đồng loại.');
  } else {
    lines.push('- Vì thân nhược/trung hòa: nên ưu tiên hành SINH và ĐỒNG LOẠI với Nhật Chủ để được tiếp sức.');
  }
  lines.push('');

  // ===== GIAO TIẾP, BẠN BÈ & XUẤT HÀNH =====
  lines.push('# Giao tiếp, bạn bè & xuất hành');
  const banBe = dung.map(e => DETAIL[e]?.nguoiHop).filter(Boolean);
  lines.push(`- 🤝 **Bạn bè / đối tác nên gần:** ${banBe.join('; ')}. Những người này thuộc dụng thần của bạn, ở gần họ giúp vận khí hanh thông, dễ được nâng đỡ.`);
  if (ky.length) {
    const tranhNguoi = ky.map(e => `người tính ${e} (${(DETAIL[e]?.excess || '').split(',')[0].trim()})`).filter(Boolean);
    lines.push(`- ⚠️ **Nên giữ khoảng cách vừa phải với:** ${tranhNguoi.join('; ')} — không tuyệt giao, nhưng tránh lệ thuộc hay hợp tác lớn vì dễ bị "hao khí".`);
  }
  const huongXuat = dung.map(e => DETAIL[e]?.huong).filter(Boolean).join(' / ');
  lines.push(`- 🧭 **Hướng xuất hành / đi xa / cầu việc:** ưu tiên ${huongXuat}. Khi khởi sự quan trọng (ký kết, khai trương, phỏng vấn) nên chọn hướng và màu thuộc dụng thần.`);
  if (ky.length) {
    const huongTranh = ky.map(e => DETAIL[e]?.huong).filter(Boolean).join(' / ');
    if (huongTranh) lines.push(`- Hạn chế chọn hướng ${huongTranh} cho việc trọng đại (hướng của kỵ thần).`);
  }
  lines.push('');
  lines.push('_Đây là gợi ý phong thủy tham khảo dựa trên ngũ hành Bát Tự; nên kết hợp thực tế nhà ở và tư vấn chuyên gia khi bố trí lớn._');

  return {
    dungThan: dung,
    kyThan: ky,
    than: { label: than.label, note: than.note },
    khuyet, thieu, thua,
    markdown: lines.join('\n'),
  };
}
