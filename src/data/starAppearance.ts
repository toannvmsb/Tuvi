/**
 * Đặc điểm HÌNH DÁNG / DIỆN MẠO gắn với sao theo Tử Vi Đẩu Số cổ điển (nguồn cho việc vẽ chân dung).
 * Chỉ mang tính gợi ý hình ảnh, không phải phán đoán số mệnh. Viết ngắn, thiên về mô tả nhìn thấy được.
 */

export interface StarLook { build: string; face: string }

/** 14 chính tinh. */
export const CHINH_TINH_LOOK: Record<string, StarLook> = {
  'Tử Vi': { build: 'dáng đầy đặn, uy nghi, đứng vững chãi', face: 'mặt vuông tròn đầy đặn, da hồng hào, ánh nhìn trầm ổn' },
  'Thiên Cơ': { build: 'cao gầy thanh nhã, dáng nhanh nhẹn', face: 'mặt dài thanh, trán cao, mắt sáng tinh anh' },
  'Thái Dương': { build: 'dáng cao ráo, khoáng đạt', face: 'mặt đầy đặn sáng sủa, da sáng, thần thái rạng rỡ' },
  'Vũ Khúc': { build: 'thân hình gọn rắn rỏi, vai vững', face: 'mặt vuông góc cạnh, xương rõ, da hơi ngăm, nét dứt khoát' },
  'Thiên Đồng': { build: 'nhỏ nhắn tròn trịa, trẻ trung', face: 'mặt tròn hiền, da trắng mịn, nụ cười dễ mến' },
  'Liêm Trinh': { build: 'dáng cao vừa, cân đối, khí chất sắc', face: 'mặt xương nét sắc, mắt sắc sảo, da hơi đỏ hoặc ngăm' },
  'Thiên Phủ': { build: 'dáng đầy đặn cân đối, phúc hậu', face: 'mặt vuông đầy đặn, trán rộng, da sáng, nét ôn hòa' },
  'Thái Âm': { build: 'thanh mảnh mềm mại, dáng nhẹ nhàng', face: 'mặt trái xoan, da trắng mịn, mắt dịu, nét thanh tú' },
  'Tham Lang': { build: 'thân hình nở nang cuốn hút, năng động', face: 'mắt long lanh có duyên, môi đầy, nét quyến rũ' },
  'Cự Môn': { build: 'cao vừa hơi gầy, dáng thẳng', face: 'mặt dài, mày rậm, nét sắc sảo, môi rõ' },
  'Thiên Tướng': { build: 'cân đối, chỉn chu, gọn gàng', face: 'mặt vuông tròn đoan chính, nét hài hòa, da sáng' },
  'Thiên Lương': { build: 'dáng cao, đầy đặn, phong thái điềm đạm', face: 'mặt dài đứng đắn, mày dài, ánh nhìn từng trải' },
  'Thất Sát': { build: 'cao vạm vỡ hoặc gọn mạnh, dáng cương nghị', face: 'mặt góc cạnh, mày rậm, mắt sắc, thần thái mạnh' },
  'Phá Quân': { build: 'thân hình rắn, vai rộng, dáng phóng khoáng', face: 'mặt xương, nét cương nghị, thần thái quyết liệt' },
};

/** Một số phụ tinh có ảnh hưởng rõ tới diện mạo. */
export const PHU_TINH_LOOK: Record<string, string> = {
  'Văn Xương': 'nét thanh tú, da sáng, phong thái nho nhã',
  'Văn Khúc': 'nét mềm, mắt dịu, dáng thanh lịch',
  'Tả Phụ': 'dáng cân đối, ánh nhìn thân thiện',
  'Hữu Bật': 'dáng cân đối, nét hiền hòa',
  'Thiên Khôi': 'trán cao sáng, thần thái sáng sủa',
  'Thiên Việt': 'trán cao sáng, nét thanh',
  'Lộc Tồn': 'thân hình đầy đặn, vẻ phúc hậu',
  'Hồng Loan': 'nét duyên dáng, nụ cười cuốn hút',
  'Thiên Hỉ': 'gương mặt tươi tắn, vui vẻ',
  'Kình Dương': 'đường nét sắc, hàm rõ, dáng săn',
  'Đà La': 'dáng chắc nặng, nét trầm',
  'Hỏa Tinh': 'thần thái nhanh, da hơi đỏ, dáng săn',
  'Linh Tinh': 'thần thái nhanh nhạy, ánh mắt sắc',
  'Thiên Mã': 'dáng nhanh nhẹn, hoạt bát',
};

/** Hình dáng cơ thể theo ngũ hành bản mệnh (tướng ngũ hành cổ điển). */
export const ELEMENT_LOOK: Record<string, string> = {
  Kim: 'khuôn mặt vuông gọn, da sáng, dáng thẳng và chắc',
  Mộc: 'dáng cao thanh, khuôn mặt dài, tay chân thon',
  Thủy: 'dáng tròn đầy mềm mại, da mịn, mắt long lanh',
  Hỏa: 'khuôn mặt nhọn cằm, da hồng, thần thái sáng, dáng gọn',
  Thổ: 'dáng dày dặn vững chãi, mặt vuông rộng, vẻ trầm ổn',
};

/** Ghép mô tả ngoại hình cho 1 cung từ danh sách sao tọa thủ. Trả '' nếu không có dữ kiện. */
export function describeLook(stars: { name: string; type: string; brightness?: string }[], element?: string): string {
  const bits: string[] = [];
  const chinh = stars.filter(s => s.type === 'chinh');
  for (const s of chinh) {
    const look = CHINH_TINH_LOOK[s.name];
    if (!look) continue;
    const dim = s.brightness === 'hãm' ? ' (sao hãm: biểu hiện nhẹ, kín đáo hơn)' : '';
    bits.push(`${s.name}${dim}: ${look.build}; ${look.face}`);
  }
  for (const s of stars) {
    const l = PHU_TINH_LOOK[s.name];
    if (l) bits.push(`${s.name}: ${l}`);
  }
  if (element && ELEMENT_LOOK[element]) bits.push(`Ngũ hành ${element}: ${ELEMENT_LOOK[element]}`);
  return bits.join(' | ');
}
