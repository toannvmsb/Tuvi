/**
 * Cơ sở dữ liệu CÁCH CỤC Tử Vi — chạy offline, dùng tham chiếu cho người dùng.
 *
 * Tổng hợp ~130 cách cục theo 7 nhóm:
 *   I.   chinh   — Chính cách (bộ chính tinh cốt lõi)
 *   II.  phu     — Phú cách (giàu có, tài lộc)
 *   III. quy     — Quý cách (danh giá, công danh)
 *   IV.  hung    — Hung cách (tai họa, trắc trở)
 *   V.   bien    — Biến cách (chuyển hóa: xấu → tốt hoặc bị phá)
 *   VI.  nghe    — Cách theo nghề/lĩnh vực
 *   VII. phu_tinh — Cách phụ tinh đặc sắc
 *
 * Cơ chế nhận diện: một cách cục "ứng" khi TẤT CẢ sao trong `stars` cùng xuất
 * hiện ĐÚNG trong phạm vi quy định bởi `scope` — đây là điểm dễ sai nhất
 * (V2.1 đã sửa lỗi gộp lẫn "đồng cung" với "tam hợp/nhị hợp" thành một pool
 * chung, khiến ví dụ "Nhật Nguyệt đồng cung" bị báo dương tính giả khi Thái
 * Dương và Thái Âm chỉ ở CÙNG NHÓM tam hợp chứ không CÙNG MỘT cung):
 *   - scope 'same'  : TẤT CẢ sao phải nằm CHUNG một cung (đồng cung) — cung
 *                      đang xét, KHÔNG được tính sao ở tam hợp/xung/nhị hợp.
 *   - scope 'group' : sao được tính khi nằm ở cung đang xét HOẶC tam hợp HOẶC
 *                      xung chiếu HOẶC nhị hợp (hội chiếu — "tứ chính" mở rộng
 *                      thêm nhị hợp).
 *   - scope 'giap'  : cách "giáp cung" (kẹp) — sao trong `stars` phải nằm ở
 *                      HAI cung liền kề (trước + sau) cung đang xét, KHÔNG
 *                      tính cung đang xét lẫn tam hợp/xung/nhị hợp. Nếu cần
 *                      một sao "neo" bắt buộc phải có NGAY TẠI cung đang xét
 *                      (vd "Ấn" = Thiên Tướng trong "Tài Ấm giáp Ấn"), khai
 *                      báo ở `pivotStars` (tách khỏi `stars` vốn chỉ dùng cho
 *                      2 cung giáp).
 * `pivotPalace` giới hạn cách chỉ được xét khi cung đang quét có ĐÚNG tên này
 * (dùng cho cách gắn với 1 cung cụ thể như "giáp Mệnh" — chỉ có nghĩa khi
 * cung đang xét là Mệnh).
 * `branches` giới hạn cách chỉ ứng ở các địa chi nhất định (chỉ áp dụng cho
 * scope 'same'; bỏ qua với 'group'/'giap').
 * `baseScore` (0–100): điểm gốc trước khi engine điều chỉnh theo miếu/hãm/phụ tá.
 */

export type CachCucCategory = 'chinh' | 'phu' | 'quy' | 'hung' | 'bien' | 'nghe' | 'phu_tinh';

export interface CachCuc {
  name: string;
  category?: CachCucCategory;
  meaning: string;
  stars: string[];          // Sao BẮT BUỘC — phải đủ hết cách mới "thành" (xem quy tắc theo scope ở trên)
  optionalStars?: string[]; // Sao PHỤ TRỢ — có thì tăng strength/confidence, thiếu không phá cách
  pivotStars?: string[];    // (chỉ scope='giap') Sao "neo" bắt buộc phải có NGAY TẠI cung đang xét
  pivotPalace?: string[];   // Giới hạn cách chỉ xét khi cung đang quét có đúng tên này (vd ['Mệnh'])
  branches?: string[];
  scope: 'same' | 'group' | 'giap';
  good: boolean;
  baseScore?: number; // 0–100 điểm gốc
}

export const CACH_CUC: CachCuc[] = [

  // ═══════════════════════════════════════════════════════
  // I. CHÍNH CÁCH — bộ chính tinh cốt lõi (group scope)
  // ═══════════════════════════════════════════════════════
  {
    name: 'Tử Phủ Vũ Tướng',
    category: 'chinh',
    meaning:
      'Bộ tứ chính tinh ổn định và phú quý: Tử Vi (lãnh đạo) – Thiên Phủ (tài khố) – Vũ Khúc (tài năng) – Thiên Tướng (ấn quyền). Hội đủ chủ người có tài quản trị, sự nghiệp vững, hậu vận sung túc; cần thêm Lộc và phụ tá để thành đại cách.',
    stars: ['Tử Vi', 'Thiên Phủ', 'Vũ Khúc', 'Thiên Tướng'],
    optionalStars: ['Tả Phù', 'Hữu Bật', 'Lộc Tồn', 'Hóa Lộc'],
    scope: 'group',
    good: true,
    baseScore: 85,
  },
  {
    name: 'Sát Phá Tham',
    category: 'chinh',
    meaning:
      'Bộ tam tinh biến động: Thất Sát – Phá Quân – Tham Lang. Chủ cuộc đời nhiều thăng trầm, dám phá cách khai sáng, hợp tự lập, kinh doanh, khai phá; ưa gặp Lộc và chính tinh chế hóa, kỵ Không Kiếp Kình Đà hội tụ.',
    stars: ['Thất Sát', 'Phá Quân', 'Tham Lang'],
    optionalStars: ['Hóa Lộc', 'Hóa Quyền', 'Lộc Tồn'],
    scope: 'group',
    good: true,
    baseScore: 75,
  },
  {
    name: 'Cơ Nguyệt Đồng Lương',
    category: 'chinh',
    meaning:
      'Bộ Thiên Cơ – Thái Âm – Thiên Đồng – Thiên Lương. Chủ người hợp làm công ăn lương, chuyên môn, hành chính, tư vấn, giáo dục, kỹ thuật ổn định; kỵ kinh doanh mạo hiểm. Tính ôn hòa, trí tuệ, cầu an.',
    stars: ['Thiên Cơ', 'Thái Âm', 'Thiên Đồng', 'Thiên Lương'],
    optionalStars: ['Văn Xương', 'Văn Khúc', 'Hóa Khoa'],
    scope: 'group',
    good: true,
    baseScore: 72,
  },
  {
    name: 'Sát Phá Tham Tam Hóa',
    category: 'chinh',
    meaning:
      'Sát Phá Tham hội đủ Hóa Lộc/Quyền/Khoa — đại cách khởi nghiệp: năng lực đột phá + vận tài lộc đồng thời kích hoạt. Người có cách này thường tạo ra sự nghiệp lớn từ con số không, không ngại rủi ro và thành công ngoạn mục.',
    stars: ['Thất Sát', 'Phá Quân', 'Tham Lang', 'Hóa Lộc'],
    scope: 'group',
    good: true,
    baseScore: 92,
  },
  {
    name: 'Tử Phủ Vũ Tướng Tả Hữu',
    category: 'chinh',
    meaning:
      'Tử Phủ Vũ Tướng được Tả Phù Hữu Bật hội chiếu — đại phú quý cách: sự nghiệp lớn, được quần thần phò tá, địa vị cao và có nền tảng tài chính vững bền. Cách này hiếm gặp và rất quý.',
    stars: ['Tử Vi', 'Thiên Phủ', 'Tả Phù', 'Hữu Bật'],
    scope: 'group',
    good: true,
    baseScore: 93,
  },
  {
    name: 'Sát Phá Tham Liêm',
    category: 'chinh',
    meaning:
      'Bộ tứ tinh biến động cực mạnh: Thất Sát – Phá Quân – Tham Lang – Liêm Trinh hội tam phương. Cách "khai sáng biến hóa" — chủ người có bản lĩnh dấn thân, khai phá cái mới, đảm đương trọng trách; sự nghiệp lên xuống nhưng lực bùng phát rất lớn. Hợp kinh doanh, quân đội, kỹ thuật chuyên môn, khai phá thị trường. Rất kỵ Không Kiếp Kỵ hội tụ (dễ đại phá đại thành nhiều lần); cần Lộc-Quyền chế hóa để thành đại cách.',
    stars: ['Thất Sát', 'Phá Quân', 'Tham Lang', 'Liêm Trinh'],
    optionalStars: ['Hóa Lộc', 'Hóa Quyền', 'Lộc Tồn', 'Tả Phù', 'Hữu Bật'],
    scope: 'group',
    good: true,
    baseScore: 88,
  },

  // ═══════════════════════════════════════════════════════
  // II. PHÚ CÁCH — tài lộc, giàu có
  // ═══════════════════════════════════════════════════════
  {
    name: 'Vũ Phủ đồng cung',
    category: 'phu',
    meaning: 'Vũ Khúc + Thiên Phủ (Tý/Ngọ): tài tinh gặp tài khố — phú cách, giỏi kiếm và giữ tiền.',
    stars: ['Vũ Khúc', 'Thiên Phủ'],
    scope: 'same',
    good: true,
    baseScore: 82,
  },
  {
    name: 'Song Lộc triều viên',
    category: 'phu',
    meaning:
      'Lộc Tồn và Hóa Lộc cùng hội về — cách đại phú: tài lộc dồi dào, hậu vận sung túc, kinh tế vững mạnh.',
    stars: ['Lộc Tồn', 'Hóa Lộc'],
    scope: 'group',
    good: true,
    baseScore: 88,
  },
  {
    name: 'Lộc Mã giao trì',
    category: 'phu',
    meaning:
      'Lộc Tồn (hoặc Hóa Lộc) gặp Thiên Mã — cách phát tài năng động: làm ăn xa, kinh doanh, thương mại phát đạt, tài lộc lưu thông.',
    stars: ['Lộc Tồn', 'Thiên Mã'],
    scope: 'group',
    good: true,
    baseScore: 83,
  },
  {
    name: 'Lộc Mã giao trì (Hóa Lộc)',
    category: 'phu',
    meaning: 'Hóa Lộc gặp Thiên Mã — phát tài tha hương, kinh doanh lưu động thuận lợi.',
    stars: ['Hóa Lộc', 'Thiên Mã'],
    scope: 'group',
    good: true,
    baseScore: 82,
  },
  {
    name: 'Nhật Nguyệt Tịnh Minh',
    category: 'phu',
    meaning:
      'Thái Dương miếu vượng và Thái Âm miếu vượng cùng chiếu sáng — đại cát cách: cả hai quang tinh đều đắc địa, lá số sáng rực, công danh tài lộc đều có, được nhiều người trọng vọng và quý mến.',
    stars: ['Thái Dương', 'Thái Âm'],
    scope: 'group',
    good: true,
    baseScore: 86,
  },
  {
    name: 'Minh Châu Xuất Hải',
    category: 'phu',
    meaning:
      'Thái Âm miếu vượng (Hợi/Tý) hội Hóa Lộc — "ngọc trai xuất biển": tài lộc trỗi dậy mạnh mẽ, phú quý từ trung niên, ẩn tài phát lộ; đặc biệt quý với người hoạt động trong lĩnh vực tài chính, địa ốc, nghệ thuật.',
    stars: ['Thái Âm', 'Hóa Lộc'],
    branches: ['Hợi', 'Tý'],
    scope: 'same',
    good: true,
    baseScore: 87,
  },
  {
    name: 'Phủ Tướng triều viên',
    category: 'phu',
    meaning:
      'Thiên Phủ và Thiên Tướng cùng chầu về Mệnh — cách phú quý ổn định, có tài quản trị, hậu vận sung túc, được tín nhiệm.',
    stars: ['Thiên Phủ', 'Thiên Tướng'],
    scope: 'group',
    good: true,
    baseScore: 80,
  },
  {
    name: 'Tài Ấm giáp Ấn',
    category: 'phu',
    meaning:
      'Thiên Tướng (Ấn) được Lộc Tồn (Tài) và Thiên Lương (Ấm) đóng ở HAI CUNG KẸP HAI BÊN — cát cách: được che chở, có tài lộc, sự nghiệp vững.',
    stars: ['Thiên Lương', 'Lộc Tồn'], // 2 sao PHẢI ở 2 cung giáp (kẹp) hai bên cung có Thiên Tướng
    pivotStars: ['Thiên Tướng'],       // "Ấn" — bắt buộc có NGAY TẠI cung đang xét
    scope: 'giap',
    good: true,
    baseScore: 78,
  },
  {
    name: 'Lộc Tồn thủ Mệnh',
    category: 'phu',
    meaning:
      'Lộc Tồn cư tại cung Mệnh — "phúc tinh nhập mệnh": tài lộc tự thân, ý chí độc lập, giỏi giữ tiền và tích lũy; nhược điểm là cẩn thận thái quá đôi khi bỏ lỡ cơ hội lớn.',
    stars: ['Lộc Tồn'],
    pivotPalace: ['Mệnh'],
    scope: 'same',
    good: true,
    baseScore: 76,
  },
  {
    name: 'Hóa Lộc nhập Mệnh',
    category: 'phu',
    meaning:
      'Hóa Lộc cư tại cung Mệnh — tài lộc tuôn vào bản thân, năm đó (hoặc đại vận đó) cơ hội kiếm tiền mở ra rộng, sự nghiệp thuận. Đây là hóa tinh tốt nhất khi vào Mệnh.',
    stars: ['Hóa Lộc'],
    pivotPalace: ['Mệnh'],
    scope: 'same',
    good: true,
    baseScore: 80,
  },
  {
    name: 'Hóa Lộc nhập Tài Bạch',
    category: 'phu',
    meaning:
      'Hóa Lộc đến cung Tài Bạch — tài lộc phát huy đúng cung quản tiền bạc: thu nhập tăng, làm ăn thuận lợi, tiền vào nhiều. Nếu không có sát tinh phá thì đây là vận tốt nhất về tài chính.',
    stars: ['Hóa Lộc'],
    pivotPalace: ['Tài Bạch'],
    scope: 'same',
    good: true,
    baseScore: 82,
  },
  {
    name: 'Hóa Lộc nhập Quan Lộc',
    category: 'phu',
    meaning:
      'Hóa Lộc đến cung Quan Lộc — sự nghiệp và công danh nở rộ, cơ hội thăng tiến, ký được hợp đồng tốt, kinh doanh có lộc. Kết hợp Hóa Quyền thì đại thăng tiến.',
    stars: ['Hóa Lộc'],
    pivotPalace: ['Quan Lộc'],
    scope: 'same',
    good: true,
    baseScore: 79,
  },
  {
    name: 'Nhật Nguyệt giáp Mệnh',
    category: 'phu',
    meaning:
      'Thái Dương và Thái Âm kẹp hai bên cung Mệnh — âm dương bảo bọc: được che chở toàn diện, cuộc sống đủ đầy ánh sáng, không thiếu thốn về vật chất lẫn tinh thần; hợp người hoạt động công khai, truyền thông, lãnh đạo.',
    stars: ['Thái Dương', 'Thái Âm'], // phải ở 2 cung GIÁP (kẹp) hai bên Mệnh, không phải đồng cung/tam hợp Mệnh
    pivotPalace: ['Mệnh'],
    scope: 'giap',
    good: true,
    baseScore: 84,
  },
  {
    name: 'Quần thần khánh hội',
    category: 'phu',
    meaning:
      'Tả Phù, Hữu Bật, Văn Xương, Văn Khúc, Thiên Khôi, Thiên Việt cùng hội về một cung — "quần thần triều chầu": được nhiều người hỗ trợ, xung quanh toàn người tài đức, sự nghiệp và tài lộc đều rực rỡ. Đây là cách cục hiếm và rất quý.',
    stars: ['Tả Phù', 'Hữu Bật', 'Văn Xương', 'Thiên Khôi'],
    scope: 'group',
    good: true,
    baseScore: 95,
  },
  {
    name: 'Vũ Tham đồng cung',
    category: 'phu',
    meaning:
      'Vũ Khúc + Tham Lang (Sửu/Mùi): "Vũ Tham bất phát thiếu niên" — phát muộn nhưng lớn; gặp Hỏa/Linh thành cách hoạnh phát đại tài.',
    stars: ['Vũ Khúc', 'Tham Lang'],
    scope: 'same',
    good: true,
    baseScore: 74,
  },
  {
    name: 'Đế tọa',
    category: 'phu',
    meaning:
      'Tử Vi tại Tý hoặc Ngọ (miếu địa) — "đế tinh lên ngai": uy quyền, công danh, lãnh đạo đỉnh cao; lá số có cách này thường có khí chất đế vương, dễ thành công trong môi trường đòi hỏi năng lực quyết đoán và lãnh đạo.',
    stars: ['Tử Vi'],
    branches: ['Tý', 'Ngọ'],
    scope: 'same',
    good: true,
    baseScore: 88,
  },
  {
    name: 'Thiên Phủ miếu địa',
    category: 'phu',
    meaning:
      'Thiên Phủ tại Tý hoặc Ngọ (miếu địa) — kho báu đúng đất: tài vật sung túc, giữ tiền giỏi, quản trị tài chính xuất sắc; nội tâm ổn định, không bị xáo trộn bởi biến cố.',
    stars: ['Thiên Phủ'],
    branches: ['Tý', 'Ngọ'],
    scope: 'same',
    good: true,
    baseScore: 80,
  },
  {
    name: 'Khoa Quyền Lộc (Tam Hóa liên châu)',
    category: 'phu',
    meaning:
      'Hội đủ Hóa Khoa – Hóa Quyền – Hóa Lộc — đại quý cách: danh lợi quyền song toàn, công danh hiển đạt, sự nghiệp lớn.',
    stars: ['Hóa Khoa', 'Hóa Quyền', 'Hóa Lộc'],
    scope: 'group',
    good: true,
    baseScore: 95,
  },
  {
    name: 'Quyền Lộc tuần phùng',
    category: 'phu',
    meaning: 'Hóa Quyền gặp Hóa Lộc — quyền lực đi đôi tài lộc, thăng tiến và sung túc.',
    stars: ['Hóa Quyền', 'Hóa Lộc'],
    scope: 'group',
    good: true,
    baseScore: 82,
  },
  {
    name: 'Hỏa Tham (hoạnh phát)',
    category: 'phu',
    meaning:
      'Tham Lang gặp Hỏa Tinh — cách hoạnh phát: giàu nhanh, nổi danh đột ngột, công danh tài lộc đến bất ngờ. Nếu kèm Kình Đà Hóa Kỵ thì "hoạnh phát hoạnh phá".',
    stars: ['Tham Lang', 'Hỏa Tinh'],
    scope: 'group',
    good: true,
    baseScore: 78,
  },
  {
    name: 'Linh Tham (hoạnh phát)',
    category: 'phu',
    meaning:
      'Tham Lang gặp Linh Tinh — cách hoạnh phát tương tự Hỏa Tham, phát bất ngờ; cần đắc địa và tránh Kình Đà Kỵ kèm.',
    stars: ['Tham Lang', 'Linh Tinh'],
    scope: 'group',
    good: true,
    baseScore: 77,
  },

  // ═══════════════════════════════════════════════════════
  // III. QUÝ CÁCH — danh giá, công danh, học vấn
  // ═══════════════════════════════════════════════════════
  {
    name: 'Nhật lệ trung thiên',
    category: 'quy',
    meaning: 'Thái Dương tại Ngọ (miếu địa) — mặt trời giữa trời: đại quý, công danh hiển hách, uy danh rạng rỡ (cần không bị Tuần Triệt Hóa Kỵ).',
    stars: ['Thái Dương'],
    branches: ['Ngọ'],
    scope: 'same',
    good: true,
    baseScore: 88,
  },
  {
    name: 'Nhật xuất phù tang',
    category: 'quy',
    meaning: 'Thái Dương tại Mão (mặt trời mọc) — quý cách, hợp công danh, được trọng vọng, thành đạt sớm.',
    stars: ['Thái Dương'],
    branches: ['Mão'],
    scope: 'same',
    good: true,
    baseScore: 82,
  },
  {
    name: 'Nguyệt lãng thiên môn',
    category: 'quy',
    meaning: 'Thái Âm tại Hợi (miếu địa) — trăng sáng cửa trời: phú quý, tài lộc dồi dào, dung mạo đẹp, văn tài.',
    stars: ['Thái Âm'],
    branches: ['Hợi'],
    scope: 'same',
    good: true,
    baseScore: 85,
  },
  {
    name: 'Nguyệt sinh thương hải',
    category: 'quy',
    meaning: 'Thái Âm tại Tý (miếu địa) — trăng lên biển khơi: phú cách điền tài, tâm hồn sâu sắc, hậu vận tốt.',
    stars: ['Thái Âm'],
    branches: ['Tý'],
    scope: 'same',
    good: true,
    baseScore: 83,
  },
  {
    name: 'Khôi Việt (quý nhân)',
    category: 'quy',
    meaning:
      'Thiên Khôi và Thiên Việt hội/giáp — cách quý nhân: được người trên đề bạt, thi cử hanh thông, gặp may, công danh thuận.',
    stars: ['Thiên Khôi', 'Thiên Việt'],
    scope: 'group',
    good: true,
    baseScore: 78,
  },
  {
    name: 'Khôi Việt giáp Mệnh',
    category: 'quy',
    meaning:
      'Thiên Khôi và Thiên Việt kẹp hai bên cung Mệnh — "quý nhân hộ vệ": suốt đời gặp quý nhân phù trợ đúng lúc, khó khăn luôn được giải quyết nhờ người hỗ trợ; đây là dấu hiệu của người có phúc khí quý nhân rất tốt.',
    stars: ['Thiên Khôi', 'Thiên Việt'],
    pivotPalace: ['Mệnh'],
    scope: 'giap',
    good: true,
    baseScore: 85,
  },
  {
    name: 'Xương Khúc (văn tài)',
    category: 'quy',
    meaning:
      'Văn Xương và Văn Khúc hội/đồng cung — cách văn tài, học vấn, khoa giáp, thông minh tài hoa; kỵ gặp Hóa Kỵ (văn thư thị phi).',
    stars: ['Văn Xương', 'Văn Khúc'],
    scope: 'group',
    good: true,
    baseScore: 76,
  },
  {
    name: 'Xương Khúc hội Mệnh',
    category: 'quy',
    meaning:
      'Văn Xương và Văn Khúc cùng hội về cung Mệnh — văn tinh song toàn: trí tuệ xuất chúng, học vấn tốt, diễn đạt giỏi cả viết lẫn nói; hợp nghề nghiên cứu, truyền thông, tư vấn, giảng dạy.',
    stars: ['Văn Xương', 'Văn Khúc'],
    scope: 'same',
    good: true,
    baseScore: 82,
  },
  {
    name: 'Tả Hữu (phụ bật)',
    category: 'quy',
    meaning:
      'Tả Phù và Hữu Bật hội/đồng cung — cách trợ lực: được quý nhân, cộng sự nâng đỡ, làm việc có người phò tá.',
    stars: ['Tả Phù', 'Hữu Bật'],
    scope: 'group',
    good: true,
    baseScore: 75,
  },
  {
    name: 'Tả Hữu Xương Khúc Mệnh',
    category: 'quy',
    meaning:
      'Tả Phù, Hữu Bật, Văn Xương hoặc Văn Khúc cùng chiếu về Mệnh — đại quý cách văn quan: tài năng và phù trợ song toàn; hợp sự nghiệp trí tuệ, lãnh đạo tổ chức.',
    stars: ['Tả Phù', 'Hữu Bật', 'Văn Xương'],
    scope: 'group',
    good: true,
    baseScore: 86,
  },
  {
    name: 'Hóa Quyền nhập Mệnh',
    category: 'quy',
    meaning:
      'Hóa Quyền cư tại cung Mệnh — uy quyền và sức quyết đoán tăng mạnh, dễ thành người chủ động; hợp lãnh đạo, tự kinh doanh, quản lý. Kết hợp Hóa Lộc thì vừa có quyền vừa có tiền.',
    stars: ['Hóa Quyền'],
    pivotPalace: ['Mệnh'],
    scope: 'same',
    good: true,
    baseScore: 78,
  },
  {
    name: 'Hóa Khoa nhập Mệnh',
    category: 'quy',
    meaning:
      'Hóa Khoa cư tại cung Mệnh — danh tiếng, học vấn, bằng cấp; hợp nghề đòi hỏi chuyên môn, khảo thi, nghiên cứu. Hóa Khoa không giàu nhanh nhưng giúp tên tuổi được trọng vọng.',
    stars: ['Hóa Khoa'],
    pivotPalace: ['Mệnh'],
    scope: 'same',
    good: true,
    baseScore: 72,
  },
  {
    name: 'Long Phượng (Long Trì Phượng Các)',
    category: 'quy',
    meaning:
      'Long Trì + Phượng Các hội/giáp — cách thanh quý, tăng vẻ tao nhã, khoa danh, hôn nhân tốt đẹp, hỗ trợ văn tinh.',
    stars: ['Long Trì', 'Phượng Các'],
    scope: 'group',
    good: true,
    baseScore: 70,
  },
  {
    name: 'Tam Thai Bát Tọa',
    category: 'quy',
    meaning:
      'Tam Thai + Bát Tọa hội/giáp — tăng quý hiển, địa vị, được tôn trọng; hỗ trợ Tử Vi, Nhật Nguyệt thêm rạng.',
    stars: ['Tam Thai', 'Bát Tọa'],
    scope: 'group',
    good: true,
    baseScore: 68,
  },
  {
    name: 'Ân Quang Thiên Quý',
    category: 'quy',
    meaning:
      'Ân Quang + Thiên Quý hội/giáp — cách được ban ơn, thi cử đỗ đạt, gặp quý nhân, danh dự, vinh hiển.',
    stars: ['Ân Quang', 'Thiên Quý'],
    scope: 'group',
    good: true,
    baseScore: 68,
  },
  {
    name: 'Thai Phụ Phong Cáo',
    category: 'quy',
    meaning:
      'Thai Phụ + Phong Cáo hội/giáp — tăng phẩm trật, quý hiển, công danh, hỗ trợ Xương Khúc trở thành khoa danh.',
    stars: ['Thai Phụ', 'Phong Cáo'],
    scope: 'group',
    good: true,
    baseScore: 65,
  },
  {
    name: 'Cự Nhật thăng điện',
    category: 'quy',
    meaning:
      'Cự Môn + Thái Dương (Dần/Thân) — "mặt trời chiếu sáng cửa khuyết": khẩu tài và công danh kết hợp; hợp diễn thuyết, pháp luật, chính trị, truyền thông. Đây là một trong những cách quý nhất cho người hoạt động ngôn từ.',
    stars: ['Cự Môn', 'Thái Dương'],
    branches: ['Dần', 'Thân'],
    scope: 'same',
    good: true,
    baseScore: 86,
  },
  {
    name: 'Thạch trung ẩn ngọc',
    category: 'quy',
    meaning: 'Cự Môn tại Tý hoặc Ngọ (miếu vượng) — ngọc trong đá: tài năng tiềm ẩn, phát về sau, hợp khảo cứu, học thuật, ngôn luận; cần gặp Lộc Quyền.',
    stars: ['Cự Môn'],
    branches: ['Tý', 'Ngọ'],
    scope: 'same',
    good: true,
    baseScore: 76,
  },
  {
    name: 'Tử Vi miếu địa (Tý/Ngọ)',
    category: 'quy',
    meaning:
      'Tử Vi một mình tại Tý hoặc Ngọ — đế tinh độc tọa: uy quyền tập trung vào một tâm, khí chất lãnh đạo mạnh nhưng cũng cô đơn; cần Tả Hữu Xương Khúc phụ tá để phát huy tối đa.',
    stars: ['Tử Vi'],
    branches: ['Tý', 'Ngọ'],
    scope: 'same',
    good: true,
    baseScore: 82,
  },
  {
    name: 'Hóa Quyền nhập Quan Lộc',
    category: 'quy',
    meaning:
      'Hóa Quyền đến cung Quan Lộc — sự nghiệp thăng tiến mạnh, uy quyền trong nghề nghiệp tăng; dễ lên chức, được trao trọng trách. Đây là hóa tinh quan trọng nhất cho sự nghiệp.',
    stars: ['Hóa Quyền'],
    pivotPalace: ['Quan Lộc'],
    scope: 'same',
    good: true,
    baseScore: 80,
  },

  // ═══════════════════════════════════════════════════════
  // IV. HUNG CÁCH — tai họa, trắc trở
  // ═══════════════════════════════════════════════════════
  {
    name: 'Không Kiếp (song sát)',
    category: 'hung',
    meaning:
      'Địa Không + Địa Kiếp hội/đồng cung — hao bại vật chất mạnh, làm ăn thất bại, tiền vào ra bất định; ngược lại hợp người tu hành, sáng tạo, nghiên cứu (thoát tục).',
    stars: ['Địa Không', 'Địa Kiếp'],
    scope: 'group',
    good: false,
    baseScore: 20,
  },
  {
    name: 'Kình Đà (giáp sát)',
    category: 'hung',
    meaning:
      'Kình Dương + Đà La hội — sát khí mạnh, dễ thị phi, thương tật, trắc trở; đắc địa (võ cách, biên cương) thì hóa thành uy dũng.',
    stars: ['Kình Dương', 'Đà La'],
    scope: 'group',
    good: false,
    baseScore: 25,
  },
  {
    name: 'Hỏa Linh (song hỏa)',
    category: 'hung',
    meaning:
      'Hỏa Tinh + Linh Tinh hội — nóng nảy, tai họa bất ngờ; chỉ hóa cát khi đi với Tham Lang đắc địa (Hỏa/Linh Tham).',
    stars: ['Hỏa Tinh', 'Linh Tinh'],
    scope: 'group',
    good: false,
    baseScore: 28,
  },
  {
    name: 'Hình Kỵ giáp Ấn',
    category: 'hung',
    meaning:
      'Thiên Tướng (Ấn) bị Thiên Hình và Hóa Kỵ đóng ở HAI CUNG KẸP HAI BÊN — đại kỵ: dễ tai họa, mất chức, kiện tụng, thị phi nặng.',
    stars: ['Thiên Hình', 'Hóa Kỵ'], // 2 sao PHẢI ở 2 cung giáp (kẹp) hai bên cung có Thiên Tướng
    pivotStars: ['Thiên Tướng'],     // "Ấn" — bắt buộc có NGAY TẠI cung đang xét
    scope: 'giap',
    good: false,
    baseScore: 18,
  },
  {
    name: 'Tang Hổ (tang chế)',
    category: 'hung',
    meaning:
      'Tang Môn + Bạch Hổ hội/xung — chủ tang chế, hiếu phục, buồn phiền về lục thân; lưu niên gặp cần đề phòng hiếu sự, kiện tụng.',
    stars: ['Tang Môn', 'Bạch Hổ'],
    scope: 'group',
    good: false,
    baseScore: 25,
  },
  {
    name: 'Cô Quả (cô đơn)',
    category: 'hung',
    meaning:
      'Cô Thần + Quả Tú hội/đồng cung — chủ cô độc, hình khắc lục thân, tình cảm lạnh nhạt; tại cung Mệnh/Phu Thê/Tử Tức cần đề phòng.',
    stars: ['Cô Thần', 'Quả Tú'],
    scope: 'group',
    good: false,
    baseScore: 30,
  },
  {
    name: 'Khốc Hư',
    category: 'hung',
    meaning:
      'Thiên Khốc + Thiên Hư hội/đồng cung — chủ ưu sầu, hao tổn; tại Tý/Ngọ lại thành cách "biện tài" (ăn nói có uy, hợp hùng biện).',
    stars: ['Thiên Khốc', 'Thiên Hư'],
    scope: 'group',
    good: false,
    baseScore: 32,
  },
  {
    name: 'Mã đầu đới kiếm',
    category: 'hung',
    meaning:
      'Kình Dương cư Ngọ — "đầu ngựa đeo kiếm": đắc cách thì uy dũng, lập công nơi biên ải/cương vực, hợp võ nghiệp; hãm thì thương tật, hung hiểm.',
    stars: ['Kình Dương'],
    branches: ['Ngọ'],
    scope: 'same',
    good: true,
    baseScore: 55,
  },
  {
    name: 'Liêm Sát đồng cung',
    category: 'hung',
    meaning:
      'Liêm Trinh + Thất Sát (Sửu/Mùi): quyết liệt, bản lĩnh; nếu gặp Hỏa Linh Kình Đà thì "Liêm Sát ngộ Hỏa" — dễ tai họa, tù tụng, đổ máu.',
    stars: ['Liêm Trinh', 'Thất Sát'],
    scope: 'same',
    good: false,
    baseScore: 32,
  },
  {
    name: 'Liêm Phá đồng cung',
    category: 'hung',
    meaning: 'Liêm Trinh + Phá Quân (Mão/Dậu): gian truân, dễ thị phi tai họa; cần Lộc và cát tinh hóa giải.',
    stars: ['Liêm Trinh', 'Phá Quân'],
    scope: 'same',
    good: false,
    baseScore: 35,
  },
  {
    name: 'Hóa Kỵ nhập Mệnh',
    category: 'hung',
    meaning:
      'Hóa Kỵ cư tại cung Mệnh — trở ngại nội tâm và hoàn cảnh; dễ bị cản trở ở đúng điểm mạnh của bản thân. Cần chú ý trong năm Hóa Kỵ đi vào Mệnh: tránh ký kết, chống tranh chấp, giữ sức khỏe.',
    stars: ['Hóa Kỵ'],
    pivotPalace: ['Mệnh'],
    scope: 'same',
    good: false,
    baseScore: 25,
  },
  {
    name: 'Hóa Kỵ nhập Quan Lộc',
    category: 'hung',
    meaning:
      'Hóa Kỵ đến cung Quan Lộc — sự nghiệp bị cản trở, dễ thất nghiệp, thị phi nghề nghiệp, hỏng việc; thời điểm nên thận trọng với các quyết định về sự nghiệp.',
    stars: ['Hóa Kỵ'],
    pivotPalace: ['Quan Lộc'],
    scope: 'same',
    good: false,
    baseScore: 22,
  },
  {
    name: 'Hóa Kỵ nhập Tài Bạch',
    category: 'hung',
    meaning:
      'Hóa Kỵ đến cung Tài Bạch — tài chính bị chặn, thu nhập giảm, dễ thua lỗ; không nên đầu tư lớn trong giai đoạn này. Nếu kèm Không Kiếp thì hao tán nặng.',
    stars: ['Hóa Kỵ'],
    pivotPalace: ['Tài Bạch'],
    scope: 'same',
    good: false,
    baseScore: 20,
  },
  {
    name: 'Kình Đà giáp Mệnh',
    category: 'hung',
    meaning:
      'Kình Dương và Đà La kẹp hai bên cung Mệnh — "lưỡi kiếm song phân": gần như cả đời đối mặt với trắc trở; ý chí sắt đá nhưng dễ bị tổn thương về thể chất và tinh thần. Biết rèn thì thành chí mạnh, không thì dễ bi quan.',
    stars: ['Kình Dương', 'Đà La'],
    pivotPalace: ['Mệnh'],
    scope: 'giap',
    good: false,
    baseScore: 22,
  },
  {
    name: 'Không Kiếp giáp Mệnh',
    category: 'hung',
    meaning:
      'Địa Không và Địa Kiếp kẹp hai bên cung Mệnh — "hư không kẹp mệnh": tài vật khó giữ, dễ hao tổn; nhưng nếu chuyển hướng theo đuổi tâm linh, nghệ thuật, sáng tạo thì lại thành đại cách.',
    stars: ['Địa Không', 'Địa Kiếp'],
    pivotPalace: ['Mệnh'],
    scope: 'giap',
    good: false,
    baseScore: 25,
  },
  {
    name: 'Vũ Khúc Hóa Kỵ',
    category: 'hung',
    meaning:
      'Vũ Khúc gặp Hóa Kỵ — "tài tinh bị phong tỏa": làm ăn thất bại, mất tiền, phá sản; đặc biệt nguy hiểm tại cung Tài Bạch. Cần kiên nhẫn qua giai đoạn, không nên đầu tư mạo hiểm.',
    stars: ['Vũ Khúc', 'Hóa Kỵ'],
    scope: 'group',
    good: false,
    baseScore: 20,
  },
  {
    name: 'Vũ Phá đồng cung',
    category: 'hung',
    meaning: 'Vũ Khúc + Phá Quân (Tị/Hợi): hao tài, làm ăn thăng trầm, "tán tài tinh"; nên làm kỹ thuật/lao động chuyên môn.',
    stars: ['Vũ Khúc', 'Phá Quân'],
    scope: 'same',
    good: false,
    baseScore: 35,
  },
  {
    name: 'Liêm Tham đồng cung',
    category: 'hung',
    meaning: 'Liêm Trinh + Tham Lang (Tị/Hợi): "phiếm thủy đào hoa" — đào hoa nặng, phong lưu, dễ sa đà tửu sắc nếu gặp đào hoa tinh.',
    stars: ['Liêm Trinh', 'Tham Lang'],
    scope: 'same',
    good: false,
    baseScore: 35,
  },
  {
    name: 'Đồng Cự đồng cung',
    category: 'hung',
    meaning: 'Thiên Đồng + Cự Môn (Sửu/Mùi): lao tâm khẩu thiệt, thị phi; cần cát tinh giải.',
    stars: ['Thiên Đồng', 'Cự Môn'],
    scope: 'same',
    good: false,
    baseScore: 38,
  },
  {
    name: 'Cơ Cự đồng cung',
    category: 'hung',
    meaning: 'Thiên Cơ + Cự Môn (Mão/Dậu): khẩu tài, khéo nói nhưng nhiều biến động thị phi.',
    stars: ['Thiên Cơ', 'Cự Môn'],
    scope: 'same',
    good: false,
    baseScore: 40,
  },
  {
    name: 'Phục Binh',
    category: 'hung',
    meaning:
      'Phục Binh tại cung quan trọng (Mệnh/Quan/Tài) — năng lượng bị phục trở, khó tiến, dễ bị chặn đứng bởi điều vô hình; trong vận hạn gặp cần tránh xuất đầu lộ diện, chờ thời cơ.',
    stars: ['Phục Binh'],
    pivotPalace: ['Mệnh', 'Quan Lộc', 'Tài Bạch'],
    scope: 'same',
    good: false,
    baseScore: 30,
  },

  // ═══════════════════════════════════════════════════════
  // V. BIẾN CÁCH — chuyển hóa âm-dương, đặc biệt
  // ═══════════════════════════════════════════════════════
  {
    name: 'Phản vi kỳ cách',
    category: 'bien',
    meaning:
      'Tham Lang hãm hoặc Liêm Trinh hãm gặp Hỏa Tinh/Linh Tinh đắc địa và Đại Vận Kim Cục — "xấu đổi thành kỳ lạ": nghịch cảnh thành đòn bẩy, phát đạt từ chỗ tưởng như thất bại; người có cách này thường trải qua giai đoạn khó khăn lớn rồi mới bùng phát.',
    stars: ['Tham Lang', 'Hỏa Tinh'],
    scope: 'group',
    good: true,
    baseScore: 72,
  },
  {
    name: 'Không Vong thành danh',
    category: 'bien',
    meaning:
      'Địa Không hoặc Địa Kiếp tại Mệnh nhưng gặp Tử Vi, Thiên Lương, hoặc Phúc Đức cung mạnh — "hư không thành đạo": bỏ qua được thế giới vật chất để thành công trong nghệ thuật, tâm linh, học thuật, sáng tạo; thường là những người nổi tiếng theo con đường phi truyền thống.',
    stars: ['Địa Không', 'Tử Vi'],
    scope: 'group',
    good: true,
    baseScore: 68,
  },
  {
    name: 'Sát tinh lập nghiệp',
    category: 'bien',
    meaning:
      'Thất Sát hoặc Phá Quân miếu vượng tại Mệnh/Quan Lộc, không bị Kình Đà giáp — "dùng sát lập nghiệp": bản lĩnh cứng, dám đương đầu; người khởi nghiệp từ hai bàn tay trắng, chịu đựng được gian khổ để xây dựng sự nghiệp lớn.',
    stars: ['Thất Sát'],
    branches: ['Mão', 'Dậu', 'Tý', 'Ngọ'],
    scope: 'same',
    good: true,
    baseScore: 73,
  },
  {
    name: 'Cách phá lại thành',
    category: 'bien',
    meaning:
      'Phá Quân miếu vượng (Tý/Ngọ) không bị Kình Đà Không Kiếp giáp — "phá rồi lại dựng lên": cuộc đời nhiều lần đổ vỡ nhưng mỗi lần đứng dậy lại mạnh hơn; phù hợp với người kinh doanh theo phong cách "liên tục đổi mới, không sợ thất bại".',
    stars: ['Phá Quân'],
    branches: ['Tý', 'Ngọ'],
    scope: 'same',
    good: true,
    baseScore: 70,
  },
  {
    name: 'Song Kỵ hóa cát',
    category: 'bien',
    meaning:
      'Hai Hóa Kỵ hội chiếu nhau tại cung quan trọng — "kỵ phùng kỵ hóa": khi cả hai trở lực cùng xuất hiện, chúng triệt tiêu nhau hoặc buộc người ta phải đổi hướng hoàn toàn; thường dẫn đến thay đổi lớn về nghề nghiệp hay lối sống, nhưng lại là bước ngoặt tích cực.',
    stars: ['Hóa Kỵ'],
    scope: 'group',
    good: true,
    baseScore: 55,
  },
  {
    name: 'Thiên Mã gặp Hóa Lộc',
    category: 'bien',
    meaning:
      'Thiên Mã hội Hóa Lộc (không bị Triệt Lộ) — "phi thiên mã": tài lộc và năng lượng như con ngựa bay, hợp làm ăn nhanh, kinh doanh lưu động, xuất ngoại phát tài. Khi gặp Triệt Lộ thì bị chặn lại (mã bất hành).',
    stars: ['Thiên Mã', 'Hóa Lộc'],
    scope: 'group',
    good: true,
    baseScore: 80,
  },

  // ═══════════════════════════════════════════════════════
  // VI. CÁCH THEO NGHỀ / LĨNH VỰC
  // ═══════════════════════════════════════════════════════
  {
    name: 'Đế Tọa Khôi Việt (lãnh đạo chính trị)',
    category: 'nghe',
    meaning:
      'Tử Vi + Thiên Phủ + Khôi Việt (hoặc Tả Hữu) hội về — tổ hợp lãnh đạo cốt lõi: uy quyền, được phụ tá, quản trị giỏi; hợp chính trị, quản lý nhà nước, lãnh đạo tổ chức lớn.',
    stars: ['Tử Vi', 'Thiên Phủ', 'Thiên Khôi'],
    scope: 'group',
    good: true,
    baseScore: 82,
  },
  {
    name: 'Vũ Tham Lộc Mã (doanh nhân)',
    category: 'nghe',
    meaning:
      'Vũ Khúc + Tham Lang + Lộc Mã (hoặc Song Lộc) hội chiếu — tổ hợp kinh doanh linh hoạt: giỏi kiếm tiền và mở rộng; hợp kinh doanh, đầu tư, thương mại, startup; đặc biệt trong lĩnh vực liên quan đến tài chính, hàng hóa, bất động sản.',
    stars: ['Vũ Khúc', 'Tham Lang', 'Thiên Mã'],
    scope: 'group',
    good: true,
    baseScore: 78,
  },
  {
    name: 'Vũ Phủ Song Lộc (tài chính)',
    category: 'nghe',
    meaning:
      'Vũ Khúc + Thiên Phủ + Song Lộc (hoặc Hóa Lộc) — tổ hợp quản trị tài chính: giỏi xử lý tiền bạc, phân tích, đầu tư; hợp ngân hàng, kế toán kiểm toán, đầu tư chứng khoán, bảo hiểm.',
    stars: ['Vũ Khúc', 'Thiên Phủ', 'Hóa Lộc'],
    scope: 'group',
    good: true,
    baseScore: 80,
  },
  {
    name: 'Cơ Nguyệt Xương Khúc (văn nghệ)',
    category: 'nghe',
    meaning:
      'Thiên Cơ + Thái Âm + Văn Xương + Văn Khúc hội chiếu — tổ hợp văn nghệ sĩ: nhạy cảm, sáng tạo, cảm thụ nghệ thuật tinh tế; hợp âm nhạc, mỹ thuật, viết lách, thiết kế, điện ảnh, nhiếp ảnh.',
    stars: ['Thiên Cơ', 'Thái Âm', 'Văn Xương'],
    scope: 'group',
    good: true,
    baseScore: 76,
  },
  {
    name: 'Cơ Vũ Xương (kỹ thuật)',
    category: 'nghe',
    meaning:
      'Thiên Cơ + Vũ Khúc (hoặc Thất Sát) + Văn Xương hội chiếu — tổ hợp kỹ thuật logic: tư duy phân tích, lập trình, kỹ nghệ; hợp công nghệ thông tin, kỹ thuật cơ khí, điện tử, nghiên cứu khoa học.',
    stars: ['Thiên Cơ', 'Vũ Khúc', 'Văn Xương'],
    scope: 'group',
    good: true,
    baseScore: 75,
  },
  {
    name: 'Đồng Lương phùng Phủ (y tế)',
    category: 'nghe',
    meaning:
      'Thiên Lương + Thiên Đồng + Thiên Phủ hội chiếu — tổ hợp từ bi phụng sự: đức độ, kiên nhẫn, chăm sóc người khác; hợp y bác sĩ, điều dưỡng, dược sĩ, tâm lý trị liệu, xã hội học.',
    stars: ['Thiên Lương', 'Thiên Đồng'],
    scope: 'group',
    good: true,
    baseScore: 74,
  },
  {
    name: 'Liêm Tướng Thiên Hình (pháp luật)',
    category: 'nghe',
    meaning:
      'Liêm Trinh + Thiên Tướng + Thiên Hình hội chiếu — tổ hợp công lý: nguyên tắc, phán xét, bảo vệ quyền lợi; hợp luật sư, thẩm phán, kiểm sát, cảnh sát, an ninh, thanh tra.',
    stars: ['Liêm Trinh', 'Thiên Tướng', 'Thiên Hình'],
    scope: 'group',
    good: true,
    baseScore: 73,
  },
  {
    name: 'Xương Khúc Thiên Lương (học thuật)',
    category: 'nghe',
    meaning:
      'Văn Xương + Văn Khúc + Thiên Lương + Hóa Khoa hội chiếu — tổ hợp học giả: chuyên môn sâu, ưa khảo cứu, giảng dạy, truyền bá tri thức; hợp giáo sư, nhà nghiên cứu, nhà báo, biên tập viên.',
    stars: ['Văn Xương', 'Văn Khúc', 'Thiên Lương'],
    scope: 'group',
    good: true,
    baseScore: 76,
  },
  {
    name: 'Thiên Lương gặp Không Kiếp (tâm linh)',
    category: 'nghe',
    meaning:
      'Thiên Lương + Địa Không (hoặc Địa Kiếp) + Thiên Đồng hội chiếu — tổ hợp thoát tục: siêu thoát vật chất, thiên về giác ngộ, phụng sự; hợp tu hành, tôn giáo, phong thủy, chiêm tinh, thiền định.',
    stars: ['Thiên Lương', 'Địa Không'],
    scope: 'group',
    good: true,
    baseScore: 68,
  },
  {
    name: 'Nhật Cự Xương Khúc (truyền thông)',
    category: 'nghe',
    meaning:
      'Thái Dương + Cự Môn + Văn Xương hội chiếu — tổ hợp ngôn truyền: khả năng ảnh hưởng đám đông, diễn đạt thu hút; hợp truyền thông, marketing, PR, quan hệ công chúng, đào tạo, MC.',
    stars: ['Thái Dương', 'Cự Môn', 'Văn Xương'],
    scope: 'group',
    good: true,
    baseScore: 75,
  },
  {
    name: 'Cơ Vũ Xương Khúc (dữ liệu, AI)',
    category: 'nghe',
    meaning:
      'Thiên Cơ + Văn Xương + Văn Khúc + Vũ Khúc hội chiếu — tổ hợp phân tích dữ liệu hiện đại: tư duy logic, xử lý thông tin, học hỏi nhanh; đặc biệt hợp với lĩnh vực trí tuệ nhân tạo, data science, tự động hóa.',
    stars: ['Thiên Cơ', 'Văn Xương', 'Văn Khúc', 'Vũ Khúc'],
    scope: 'group',
    good: true,
    baseScore: 78,
  },

  // ═══════════════════════════════════════════════════════
  // VII. PHỤ TINH ĐẶC SẮC — các cách phụ tinh quan trọng
  // ═══════════════════════════════════════════════════════
  {
    name: 'Đào Hồng (đào hoa)',
    category: 'phu_tinh',
    meaning:
      'Đào Hoa + Hồng Loan hội/đồng cung — duyên tình đậm, hấp dẫn khác phái, lợi nghệ thuật/giao tế; tại Phu Thê/Phúc cần xét sát tinh kẻo đa đoan.',
    stars: ['Đào Hoa', 'Hồng Loan'],
    scope: 'group',
    good: true,
    baseScore: 65,
  },
  {
    name: 'Thiên Mã thủ Mệnh',
    category: 'phu_tinh',
    meaning:
      'Thiên Mã cư tại cung Mệnh — cả đời năng động, ưa di chuyển, không ngồi yên; hợp làm ăn xa, xuất ngoại, công việc liên quan đi lại. Gặp Lộc thì phát, gặp Triệt thì bị chặn.',
    stars: ['Thiên Mã'],
    pivotPalace: ['Mệnh'],
    scope: 'same',
    good: true,
    baseScore: 65,
  },
  {
    name: 'Tả Hữu đồng cung Mệnh',
    category: 'phu_tinh',
    meaning:
      'Tả Phù hoặc Hữu Bật tọa tại cung Mệnh — quý nhân hộ vệ: được hỗ trợ từ cộng sự, bề trên; sự nghiệp thường có "cánh tay phải" tốt bên cạnh. Có cả hai Tả+Hữu tại Mệnh thì đại cát.',
    stars: ['Tả Phù', 'Hữu Bật'],
    scope: 'same',
    good: true,
    baseScore: 76,
  },
  {
    name: 'Hồng Loan Thiên Hỷ (hôn nhân)',
    category: 'phu_tinh',
    meaning:
      'Hồng Loan + Thiên Hỷ hội chiếu Phu Thê hoặc Mệnh — điềm hỷ sự, hôn nhân, thai sản; năm gặp hai sao này hội là năm dễ kết hôn, sinh con, hoặc có tin vui lớn trong cuộc sống tình cảm.',
    stars: ['Hồng Loan', 'Thiên Hỷ'],
    scope: 'group',
    good: true,
    baseScore: 70,
  },
  {
    name: 'Thiên Thọ thủ Mệnh',
    category: 'phu_tinh',
    meaning:
      'Thiên Thọ cư tại cung Mệnh — phúc thọ, sức khỏe tốt, ít bệnh nặng; hỗ trợ cung Tật Ách. Cùng với Thiên Đồng Thiên Lương thì thêm quý hiển.',
    stars: ['Thiên Thọ'],
    pivotPalace: ['Mệnh'],
    scope: 'same',
    good: true,
    baseScore: 62,
  },
  {
    name: 'Thiên Tướng hộ Mệnh',
    category: 'phu_tinh',
    meaning:
      'Thiên Tướng tại cung Mệnh — ấn tinh hộ Mệnh: bản thân có khả năng bảo vệ, nguyên tắc mạnh, ít bị người khác xâm phạm; hợp làm lãnh đạo tổ chức, quản lý. Kỵ gặp Hình Kỵ.',
    stars: ['Thiên Tướng'],
    pivotPalace: ['Mệnh'],
    scope: 'same',
    good: true,
    baseScore: 68,
  },
  {
    name: 'Thiên Lương thọ tinh',
    category: 'phu_tinh',
    meaning:
      'Thiên Lương miếu vượng (Mão/Dậu) — thọ tinh đắc địa: sức khỏe tốt, phúc thọ, ôn hòa; hợp làm tư vấn, y dược, giáo dục; cẩn thận hơi hay bảo thủ.',
    stars: ['Thiên Lương'],
    branches: ['Mão', 'Dậu'],
    scope: 'same',
    good: true,
    baseScore: 72,
  },
  {
    name: 'Phúc Đức cung cát tinh',
    category: 'phu_tinh',
    meaning:
      'Phúc Đức cung có nhiều cát tinh (Thiên Lương, Thiên Đồng, Hóa Lộc, Long Trì Phượng Các…) — căn phúc dày: đời sống tinh thần phong phú, sung sướng tâm hồn, hưởng thụ tốt; dù sự nghiệp thăng trầm vẫn có nền tảng hạnh phúc nội tâm.',
    stars: ['Thiên Lương', 'Thiên Đồng'],
    scope: 'same',
    good: true,
    baseScore: 72,
  },

  // ═══════════════════════════════════════════════════════
  // CÁC CÁCH ĐỒNG CUNG (tổ hợp trong cùng một cung)
  // ═══════════════════════════════════════════════════════
  {
    name: 'Tử Phủ đồng cung',
    category: 'chinh',
    meaning:
      'Tử Vi và Thiên Phủ cùng tọa thủ (tại Dần hoặc Thân): đế tinh gặp tài khố — cách phú quý ổn định, có uy lại có của; rất cần phụ tá (Tả Hữu Xương Khúc Khôi Việt) để thành đại quý.',
    stars: ['Tử Vi', 'Thiên Phủ'],
    branches: ['Dần', 'Thân'],
    scope: 'same',
    good: true,
    baseScore: 83,
  },
  {
    name: 'Tử Tướng đồng cung',
    category: 'chinh',
    meaning:
      'Tử Vi + Thiên Tướng (Thìn/Tuất): cách quản trị trung hậu, có quyền lại biết điều phối; hợp hành chính, lãnh đạo cấp trung – cao.',
    stars: ['Tử Vi', 'Thiên Tướng'],
    scope: 'same',
    good: true,
    baseScore: 78,
  },
  {
    name: 'Tử Phá đồng cung',
    category: 'chinh',
    meaning:
      'Tử Vi + Phá Quân (Sửu/Mùi): dám phá cách lập lại, có Tử Vi chế ngự Phá Quân thì thành cách khai sáng lớn; thiếu phụ tá thì lao tâm, biến động.',
    stars: ['Tử Vi', 'Phá Quân'],
    scope: 'same',
    good: true,
    baseScore: 72,
  },
  {
    name: 'Tử Tham đồng cung',
    category: 'chinh',
    meaning:
      'Tử Vi + Tham Lang (Mão/Dậu): "Đào hoa phạm chủ" — thiên hưởng thụ, đào hoa, cần Hỏa/Linh hoặc Không Kiếp tiết chế mới thành cách.',
    stars: ['Tử Vi', 'Tham Lang'],
    scope: 'same',
    good: true,
    baseScore: 65,
  },
  {
    name: 'Tử Sát đồng cung',
    category: 'chinh',
    meaning:
      'Tử Vi + Thất Sát (Tị/Hợi): "hóa sát vi quyền" — uy quyền lớn, quyết đoán, hợp lãnh đạo, võ nghiệp, kỹ thuật cứng.',
    stars: ['Tử Vi', 'Thất Sát'],
    scope: 'same',
    good: true,
    baseScore: 76,
  },
  {
    name: 'Liêm Phủ đồng cung',
    category: 'chinh',
    meaning: 'Liêm Trinh + Thiên Phủ (Thìn/Tuất): ổn định lại có mưu lược, hợp tài chính, quản trị.',
    stars: ['Liêm Trinh', 'Thiên Phủ'],
    scope: 'same',
    good: true,
    baseScore: 72,
  },
  {
    name: 'Liêm Tướng đồng cung',
    category: 'chinh',
    meaning: 'Liêm Trinh + Thiên Tướng (Tý/Ngọ): trung lương lại có quyền; hợp pháp luật, quản lý.',
    stars: ['Liêm Trinh', 'Thiên Tướng'],
    scope: 'same',
    good: true,
    baseScore: 70,
  },
  {
    name: 'Vũ Tướng đồng cung',
    category: 'chinh',
    meaning: 'Vũ Khúc + Thiên Tướng (Dần/Thân): cách quản trị tài chính, làm việc dứt khoát có nguyên tắc.',
    stars: ['Vũ Khúc', 'Thiên Tướng'],
    scope: 'same',
    good: true,
    baseScore: 74,
  },
  {
    name: 'Vũ Sát đồng cung',
    category: 'chinh',
    meaning: 'Vũ Khúc + Thất Sát (Mão/Dậu): cương quyết, hợp võ/kỹ thuật/tài chính cứng; gặp sát dễ thương tật.',
    stars: ['Vũ Khúc', 'Thất Sát'],
    scope: 'same',
    good: true,
    baseScore: 68,
  },
  {
    name: 'Đồng Âm đồng cung',
    category: 'chinh',
    meaning:
      'Thiên Đồng + Thái Âm (Tý/Ngọ): tại Tý là "Thủy trừng quế ngạc" — thanh nhã, đa cảm, văn nghệ, dễ thành danh nếu Âm sáng.',
    stars: ['Thiên Đồng', 'Thái Âm'],
    scope: 'same',
    good: true,
    baseScore: 72,
  },
  {
    name: 'Đồng Lương đồng cung',
    category: 'chinh',
    meaning:
      'Thiên Đồng + Thiên Lương (Dần/Thân): cách phúc thọ, hợp công chức, tư vấn, y dược; an ổn, có hậu.',
    stars: ['Thiên Đồng', 'Thiên Lương'],
    scope: 'same',
    good: true,
    baseScore: 70,
  },
  {
    name: 'Cơ Nguyệt đồng cung',
    category: 'chinh',
    meaning: 'Thiên Cơ + Thái Âm (Dần/Thân): thông tuệ, hợp văn chương, kế hoạch, tài chính mềm.',
    stars: ['Thiên Cơ', 'Thái Âm'],
    scope: 'same',
    good: true,
    baseScore: 72,
  },
  {
    name: 'Cơ Lương đồng cung',
    category: 'chinh',
    meaning: 'Thiên Cơ + Thiên Lương (Thìn/Tuất): cách quân sư/cố vấn, mưu trí thanh cao, hợp tôn giáo, tư vấn.',
    stars: ['Thiên Cơ', 'Thiên Lương'],
    scope: 'same',
    good: true,
    baseScore: 72,
  },
  {
    name: 'Nhật Nguyệt đồng cung',
    category: 'chinh',
    meaning:
      'Thái Dương + Thái Âm đồng cung (Sửu/Mùi): âm dương đồng lâm; tại Sửu/Mùi cần xét sáng tối — hội cát phụ tá thì quý hiển, hãm thì lao tâm.',
    stars: ['Thái Dương', 'Thái Âm'],
    scope: 'same',
    good: true,
    baseScore: 72,
  },
  {
    name: 'Cự Nhật đồng cung',
    category: 'chinh',
    meaning:
      'Cự Môn + Thái Dương (Dần/Thân): Nhật sáng chiếu Cự — "hóa ám vi minh", khẩu tài thành danh, hợp ngoại giao, pháp luật, truyền thông; rất quý nếu Nhật miếu vượng.',
    stars: ['Cự Môn', 'Thái Dương'],
    scope: 'same',
    good: true,
    baseScore: 74,
  },
];

function clean(name: string): string {
  return name.startsWith('L. ') ? name.slice(3) : name;
}

/**
 * Bối cảnh sao quanh MỘT cung đang xét (pivot) — tách riêng theo phạm vi để
 * detection không còn gộp lẫn "đồng cung" với "tam hợp/nhị hợp" (V2.1 fix).
 */
export interface PivotStarContext {
  palaceName: string;   // tên cung đang xét (vd "Mệnh")
  branch: string;       // địa chi cung đang xét
  ownStars: string[];   // sao NGAY TẠI cung đang xét (đồng cung)
  groupStars: string[]; // sao tại tam hợp + xung chiếu + nhị hợp (KHÔNG gồm cung đang xét)
  flankStars: string[]; // sao tại 2 cung GIÁP (kề trước + kề sau, KHÔNG gồm cung đang xét)
}

function checkPivotGate(c: CachCuc, ctx: PivotStarContext, ownSet: Set<string>): boolean {
  if (c.pivotPalace && !c.pivotPalace.includes(ctx.palaceName)) return false;
  if (c.scope === 'giap' && c.pivotStars && !c.pivotStars.every(s => ownSet.has(s))) return false;
  return true;
}

/**
 * Nhận diện cách cục ngay tại một cung (scope 'same') — giữ cho các nơi chỉ
 * cần tra 1 cung độc lập (không cần build PivotStarContext đầy đủ).
 * @param palaceName tên cung (để áp `pivotPalace`, có thể bỏ trống nếu không cần)
 */
export function detectCachCucInPalace(palaceStarNames: string[], branch: string, palaceName?: string): CachCuc[] {
  const set = new Set(palaceStarNames.map(clean));
  return CACH_CUC.filter(c =>
    c.scope === 'same' &&
    c.stars.every(s => set.has(s)) &&
    (!c.branches || c.branches.includes(branch)) &&
    (!c.pivotPalace || !palaceName || c.pivotPalace.includes(palaceName)),
  );
}

/**
 * Nhận diện TẤT CẢ cách cục ứng tại một pivot, tôn trọng ĐÚNG phạm vi của
 * từng scope (V2.1 — sửa lỗi gộp lẫn đồng cung/tam hợp/giáp cung):
 *   - 'same' : TẤT CẢ sao phải nằm CHUNG cung đang xét.
 *   - 'group': sao được tính khi ở cung đang xét HOẶC tam hợp/xung/nhị hợp.
 *   - 'giap' : sao trong `stars` phải nằm ở 2 cung GIÁP (kề) hai bên; nếu có
 *              `pivotStars`, sao đó phải có NGAY TẠI cung đang xét.
 */
export function detectCachCucAt(ctx: PivotStarContext): CachCuc[] {
  const own = new Set(ctx.ownStars.map(clean));
  const group = new Set([...ctx.ownStars, ...ctx.groupStars].map(clean));
  const flank = new Set(ctx.flankStars.map(clean));

  return CACH_CUC.filter(c => {
    if (!checkPivotGate(c, ctx, own)) return false;
    if (c.scope === 'same') {
      if (c.branches && !c.branches.includes(ctx.branch)) return false;
      return c.stars.every(s => own.has(s));
    }
    if (c.scope === 'giap') {
      return c.stars.every(s => flank.has(s));
    }
    return c.stars.every(s => group.has(s)); // 'group'
  });
}

/** Kết quả một cách "gần thành" — thiếu 1 vài sao bắt buộc. */
export interface NearCach {
  cach: CachCuc;
  completeness: number;   // 0–100 = số sao bắt buộc có mặt / tổng
  presentStars: string[];
  missingStars: string[];
}

/**
 * Nhận diện cách cục "GẦN THÀNH" tại một pivot: các cách có ≥ MIN_RATIO số
 * sao bắt buộc (trong ĐÚNG phạm vi theo scope, xem detectCachCucAt) nhưng
 * CHƯA đủ hết. Chỉ xét cách ≥ 3 sao bắt buộc (cách 2 sao thiếu 1 coi như
 * vắng mặt, không phải "gần thành"). Với scope='giap' có `pivotStars`, sao
 * neo phải đủ trước — nếu thiếu neo thì KHÔNG tính completeness (cách này
 * chưa có cơ sở để nói "gần thành" tại pivot đó).
 *
 * V2.0: dữ liệu này để engine quyết định có "gọi tên" cách hay không theo
 * ngưỡng completeness — tránh nói chắc về cách chưa hội đủ.
 */
export function detectNearCachCucAt(ctx: PivotStarContext, minRatio = 0.6): NearCach[] {
  const own = new Set(ctx.ownStars.map(clean));
  const group = new Set([...ctx.ownStars, ...ctx.groupStars].map(clean));
  const flank = new Set(ctx.flankStars.map(clean));
  const out: NearCach[] = [];

  for (const c of CACH_CUC) {
    if (c.stars.length < 3) continue;
    if (!checkPivotGate(c, ctx, own)) continue;

    let pool: Set<string>;
    if (c.scope === 'same') {
      if (c.branches && !c.branches.includes(ctx.branch)) continue;
      pool = own;
    } else if (c.scope === 'giap') {
      pool = flank;
    } else {
      pool = group;
    }

    const present = c.stars.filter(s => pool.has(s));
    const missing = c.stars.filter(s => !pool.has(s));
    if (missing.length === 0) continue; // đã đủ → không phải "gần thành"
    const completeness = Math.round((present.length / c.stars.length) * 100);
    if (present.length / c.stars.length >= minRatio) {
      out.push({ cach: c, completeness, presentStars: present, missingStars: missing });
    }
  }
  return out.sort((a, b) => b.completeness - a.completeness);
}

/**
 * Tỉ lệ sao PHỤ TRỢ (optionalStars) có mặt — dùng nâng strength/confidence.
 * Nhận trực tiếp danh sách tên sao trong phạm vi cần xét (own+group hoặc
 * flank tùy nơi gọi).
 */
export function optionalCoverage(c: CachCuc, starPool: string[]): { present: string[]; ratio: number } {
  if (!c.optionalStars || c.optionalStars.length === 0) return { present: [], ratio: 0 };
  const set = new Set(starPool.map(clean));
  const present = c.optionalStars.filter(s => set.has(s));
  return { present, ratio: present.length / c.optionalStars.length };
}
