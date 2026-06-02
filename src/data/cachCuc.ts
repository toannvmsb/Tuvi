/**
 * Cơ sở dữ liệu CÁCH CỤC Tử Vi — chạy offline, dùng tham chiếu cho người dùng.
 *
 * Tổng hợp các cách cục phổ biến (Tử Vi Đẩu Số Toàn Thư, Tử Vi Nam Phái,
 * các trang luận giải trực tuyến). Đây là kiến thức tham khảo; phần phân
 * tích lá số chuyên sâu sẽ do chức năng AI đảm nhiệm.
 *
 * Cơ chế nhận diện: một cách cục "ứng" khi TẤT CẢ sao trong `stars` cùng
 * xuất hiện trong phạm vi xét:
 *   - scope 'same'  : trong cùng một cung (tổ hợp ngay tại cung đang xem).
 *   - scope 'group' : trong cung + tam hợp + xung chiếu + nhị hợp.
 * `branches` (tùy chọn) giới hạn cách chỉ ứng khi cung thuộc các địa chi đó.
 */

export interface CachCuc {
  name: string;
  meaning: string;
  stars: string[];
  branches?: string[];
  scope: 'same' | 'group';
  good: boolean; // true = cát cách, false = hung cách
}

export const CACH_CUC: CachCuc[] = [
  // ───────── Bộ chính tinh có cấu trúc (xét trong cung + tam hợp/xung) ─────────
  {
    name: 'Tử Phủ Vũ Tướng',
    meaning:
      'Bộ tứ chính tinh ổn định và phú quý: Tử Vi (lãnh đạo) – Thiên Phủ (tài khố) – Vũ Khúc (tài năng) – Thiên Tướng (ấn quyền). Hội đủ trong cách cục chủ người có tài quản trị, sự nghiệp vững, hậu vận sung túc; cần thêm Lộc và phụ tá để thành đại cách.',
    stars: ['Tử Vi', 'Thiên Phủ', 'Vũ Khúc', 'Thiên Tướng'],
    scope: 'group',
    good: true,
  },
  {
    name: 'Sát Phá Tham',
    meaning:
      'Bộ tam tinh biến động: Thất Sát – Phá Quân – Tham Lang. Chủ cuộc đời nhiều thăng trầm, dám phá cách khai sáng, hợp tự lập, kinh doanh, khai phá; ưa gặp Lộc và chính tinh chế hóa, kỵ Không Kiếp Kình Đà hội tụ.',
    stars: ['Thất Sát', 'Phá Quân', 'Tham Lang'],
    scope: 'group',
    good: true,
  },
  {
    name: 'Cơ Nguyệt Đồng Lương',
    meaning:
      'Bộ Thiên Cơ – Thái Âm – Thiên Đồng – Thiên Lương. Chủ người hợp làm công ăn lương, chuyên môn, hành chính, tư vấn, giáo dục, kỹ thuật ổn định; kỵ kinh doanh mạo hiểm. Tính ôn hòa, trí tuệ, cầu an.',
    stars: ['Thiên Cơ', 'Thái Âm', 'Thiên Đồng', 'Thiên Lương'],
    scope: 'group',
    good: true,
  },

  // ───────── Cách cục theo tổ hợp đồng cung ─────────
  {
    name: 'Tử Phủ đồng cung',
    meaning:
      'Tử Vi và Thiên Phủ cùng tọa thủ (tại Dần hoặc Thân): đế tinh gặp tài khố — cách phú quý ổn định, có uy lại có của; rất cần phụ tá (Tả Hữu Xương Khúc Khôi Việt) để thành đại quý.',
    stars: ['Tử Vi', 'Thiên Phủ'],
    branches: ['Dần', 'Thân'],
    scope: 'same',
    good: true,
  },
  {
    name: 'Tử Tướng đồng cung',
    meaning:
      'Tử Vi + Thiên Tướng (Thìn/Tuất): cách quản trị trung hậu, có quyền lại biết điều phối; hợp hành chính, lãnh đạo cấp trung – cao.',
    stars: ['Tử Vi', 'Thiên Tướng'],
    scope: 'same',
    good: true,
  },
  {
    name: 'Tử Phá đồng cung',
    meaning:
      'Tử Vi + Phá Quân (Sửu/Mùi): dám phá cách lập lại, có Tử Vi chế ngự Phá Quân thì thành cách khai sáng lớn; thiếu phụ tá thì lao tâm, biến động.',
    stars: ['Tử Vi', 'Phá Quân'],
    scope: 'same',
    good: true,
  },
  {
    name: 'Tử Tham đồng cung',
    meaning:
      'Tử Vi + Tham Lang (Mão/Dậu): "Đào hoa phạm chủ" — thiên hưởng thụ, đào hoa, cần Hỏa/Linh hoặc Không Kiếp tiết chế mới thành cách.',
    stars: ['Tử Vi', 'Tham Lang'],
    scope: 'same',
    good: true,
  },
  {
    name: 'Tử Sát đồng cung',
    meaning:
      'Tử Vi + Thất Sát (Tị/Hợi): "hóa sát vi quyền" — uy quyền lớn, quyết đoán, hợp lãnh đạo, võ nghiệp, kỹ thuật cứng.',
    stars: ['Tử Vi', 'Thất Sát'],
    scope: 'same',
    good: true,
  },
  {
    name: 'Liêm Phủ đồng cung',
    meaning: 'Liêm Trinh + Thiên Phủ (Thìn/Tuất): ổn định lại có mưu lược, hợp tài chính, quản trị.',
    stars: ['Liêm Trinh', 'Thiên Phủ'],
    scope: 'same',
    good: true,
  },
  {
    name: 'Liêm Tướng đồng cung',
    meaning: 'Liêm Trinh + Thiên Tướng (Tý/Ngọ): trung lương lại có quyền; hợp pháp luật, quản lý.',
    stars: ['Liêm Trinh', 'Thiên Tướng'],
    scope: 'same',
    good: true,
  },
  {
    name: 'Liêm Sát đồng cung',
    meaning:
      'Liêm Trinh + Thất Sát (Sửu/Mùi): quyết liệt, bản lĩnh; nếu gặp Hỏa Linh Kình Đà thì "Liêm Sát ngộ Hỏa" — dễ tai họa, tù tụng, đổ máu.',
    stars: ['Liêm Trinh', 'Thất Sát'],
    scope: 'same',
    good: false,
  },
  {
    name: 'Liêm Phá đồng cung',
    meaning: 'Liêm Trinh + Phá Quân (Mão/Dậu): gian truân, dễ thị phi tai họa; cần Lộc và cát tinh hóa giải.',
    stars: ['Liêm Trinh', 'Phá Quân'],
    scope: 'same',
    good: false,
  },
  {
    name: 'Liêm Tham đồng cung',
    meaning: 'Liêm Trinh + Tham Lang (Tị/Hợi): "phiếm thủy đào hoa" — đào hoa nặng, phong lưu, dễ sa đà tửu sắc nếu gặp đào hoa tinh.',
    stars: ['Liêm Trinh', 'Tham Lang'],
    scope: 'same',
    good: false,
  },
  {
    name: 'Vũ Phủ đồng cung',
    meaning: 'Vũ Khúc + Thiên Phủ (Tý/Ngọ): tài tinh gặp tài khố — phú cách, giỏi kiếm và giữ tiền.',
    stars: ['Vũ Khúc', 'Thiên Phủ'],
    scope: 'same',
    good: true,
  },
  {
    name: 'Vũ Tướng đồng cung',
    meaning: 'Vũ Khúc + Thiên Tướng (Dần/Thân): cách quản trị tài chính, làm việc dứt khoát có nguyên tắc.',
    stars: ['Vũ Khúc', 'Thiên Tướng'],
    scope: 'same',
    good: true,
  },
  {
    name: 'Vũ Sát đồng cung',
    meaning: 'Vũ Khúc + Thất Sát (Mão/Dậu): cương quyết, hợp võ/kỹ thuật/tài chính cứng; gặp sát dễ thương tật.',
    stars: ['Vũ Khúc', 'Thất Sát'],
    scope: 'same',
    good: true,
  },
  {
    name: 'Vũ Phá đồng cung',
    meaning: 'Vũ Khúc + Phá Quân (Tị/Hợi): hao tài, làm ăn thăng trầm, "tán tài tinh"; nên làm kỹ thuật/lao động chuyên môn.',
    stars: ['Vũ Khúc', 'Phá Quân'],
    scope: 'same',
    good: false,
  },
  {
    name: 'Vũ Tham đồng cung',
    meaning:
      'Vũ Khúc + Tham Lang (Sửu/Mùi): "Vũ Tham bất phát thiếu niên" — phát muộn nhưng lớn; gặp Hỏa/Linh thành cách hoạnh phát đại tài.',
    stars: ['Vũ Khúc', 'Tham Lang'],
    scope: 'same',
    good: true,
  },
  {
    name: 'Đồng Âm đồng cung',
    meaning:
      'Thiên Đồng + Thái Âm (Tý/Ngọ): tại Tý là "Thủy trừng quế ngạc" — thanh nhã, đa cảm, văn nghệ, dễ thành danh nếu Âm sáng.',
    stars: ['Thiên Đồng', 'Thái Âm'],
    scope: 'same',
    good: true,
  },
  {
    name: 'Đồng Lương đồng cung',
    meaning:
      'Thiên Đồng + Thiên Lương (Dần/Thân): cách phúc thọ, hợp công chức, tư vấn, y dược; an ổn, có hậu.',
    stars: ['Thiên Đồng', 'Thiên Lương'],
    scope: 'same',
    good: true,
  },
  {
    name: 'Đồng Cự đồng cung',
    meaning: 'Thiên Đồng + Cự Môn (Sửu/Mùi): lao tâm khẩu thiệt, thị phi; cần cát tinh giải.',
    stars: ['Thiên Đồng', 'Cự Môn'],
    scope: 'same',
    good: false,
  },
  {
    name: 'Cơ Nguyệt đồng cung',
    meaning: 'Thiên Cơ + Thái Âm (Dần/Thân): thông tuệ, hợp văn chương, kế hoạch, tài chính mềm.',
    stars: ['Thiên Cơ', 'Thái Âm'],
    scope: 'same',
    good: true,
  },
  {
    name: 'Cơ Lương đồng cung',
    meaning: 'Thiên Cơ + Thiên Lương (Thìn/Tuất): cách quân sư/cố vấn, mưu trí thanh cao, hợp tôn giáo, tư vấn.',
    stars: ['Thiên Cơ', 'Thiên Lương'],
    scope: 'same',
    good: true,
  },
  {
    name: 'Cơ Cự đồng cung',
    meaning: 'Thiên Cơ + Cự Môn (Mão/Dậu): khẩu tài, khéo nói nhưng nhiều biến động thị phi.',
    stars: ['Thiên Cơ', 'Cự Môn'],
    scope: 'same',
    good: false,
  },
  {
    name: 'Cự Nhật đồng cung',
    meaning:
      'Cự Môn + Thái Dương (Dần/Thân): Nhật sáng chiếu Cự — "hóa ám vi minh", khẩu tài thành danh, hợp ngoại giao, pháp luật, truyền thông; rất quý nếu Nhật miếu vượng.',
    stars: ['Cự Môn', 'Thái Dương'],
    scope: 'same',
    good: true,
  },
  {
    name: 'Nhật Nguyệt đồng cung',
    meaning:
      'Thái Dương + Thái Âm đồng cung (Sửu/Mùi): âm dương đồng lâm; tại Sửu/Mùi cần xét sáng tối — hội cát phụ tá thì quý hiển, hãm thì lao tâm.',
    stars: ['Thái Dương', 'Thái Âm'],
    scope: 'same',
    good: true,
  },

  // ───────── Cách cục theo sao + vị trí ─────────
  {
    name: 'Nhật lệ trung thiên',
    meaning: 'Thái Dương tại Ngọ (miếu địa) — mặt trời giữa trời: đại quý, công danh hiển hách, uy danh rạng rỡ (cần không bị Tuần Triệt Hóa Kỵ).',
    stars: ['Thái Dương'],
    branches: ['Ngọ'],
    scope: 'same',
    good: true,
  },
  {
    name: 'Nhật xuất phù tang',
    meaning: 'Thái Dương tại Mão (mặt trời mọc) — quý cách, hợp công danh, được trọng vọng, thành đạt sớm.',
    stars: ['Thái Dương'],
    branches: ['Mão'],
    scope: 'same',
    good: true,
  },
  {
    name: 'Nguyệt lãng thiên môn',
    meaning: 'Thái Âm tại Hợi (miếu địa) — trăng sáng cửa trời: phú quý, tài lộc dồi dào, dung mạo đẹp, văn tài.',
    stars: ['Thái Âm'],
    branches: ['Hợi'],
    scope: 'same',
    good: true,
  },
  {
    name: 'Nguyệt sinh thương hải',
    meaning: 'Thái Âm tại Tý (miếu địa) — trăng lên biển khơi: phú cách điền tài, tâm hồn sâu sắc, hậu vận tốt.',
    stars: ['Thái Âm'],
    branches: ['Tý'],
    scope: 'same',
    good: true,
  },
  {
    name: 'Thạch trung ẩn ngọc',
    meaning: 'Cự Môn tại Tý hoặc Ngọ (miếu vượng) — ngọc trong đá: tài năng tiềm ẩn, phát về sau, hợp khảo cứu, học thuật, ngôn luận; cần gặp Lộc Quyền.',
    stars: ['Cự Môn'],
    branches: ['Tý', 'Ngọ'],
    scope: 'same',
    good: true,
  },

  // ───────── Cách cục phụ tinh / sát tinh ─────────
  {
    name: 'Hỏa Tham (hoạnh phát)',
    meaning:
      'Tham Lang gặp Hỏa Tinh — cách hoạnh phát: giàu nhanh, nổi danh đột ngột, công danh tài lộc đến bất ngờ. Nếu kèm Kình Đà Hóa Kỵ thì "hoạnh phát hoạnh phá".',
    stars: ['Tham Lang', 'Hỏa Tinh'],
    scope: 'group',
    good: true,
  },
  {
    name: 'Linh Tham (hoạnh phát)',
    meaning:
      'Tham Lang gặp Linh Tinh — cách hoạnh phát tương tự Hỏa Tham, phát bất ngờ; cần đắc địa và tránh Kình Đà Kỵ kèm.',
    stars: ['Tham Lang', 'Linh Tinh'],
    scope: 'group',
    good: true,
  },
  {
    name: 'Lộc Mã giao trì',
    meaning:
      'Lộc Tồn (hoặc Hóa Lộc) gặp Thiên Mã — cách phát tài năng động: làm ăn xa, kinh doanh, thương mại phát đạt, tài lộc lưu thông.',
    stars: ['Lộc Tồn', 'Thiên Mã'],
    scope: 'group',
    good: true,
  },
  {
    name: 'Lộc Mã giao trì (Hóa Lộc)',
    meaning: 'Hóa Lộc gặp Thiên Mã — phát tài tha hương, kinh doanh lưu động thuận lợi.',
    stars: ['Hóa Lộc', 'Thiên Mã'],
    scope: 'group',
    good: true,
  },
  {
    name: 'Song Lộc triều viên',
    meaning:
      'Lộc Tồn và Hóa Lộc cùng hội về — cách đại phú: tài lộc dồi dào, hậu vận sung túc, kinh tế vững mạnh.',
    stars: ['Lộc Tồn', 'Hóa Lộc'],
    scope: 'group',
    good: true,
  },
  {
    name: 'Khoa Quyền Lộc (Tam Hóa liên châu)',
    meaning:
      'Hội đủ Hóa Khoa – Hóa Quyền – Hóa Lộc — đại quý cách: danh lợi quyền song toàn, công danh hiển đạt, sự nghiệp lớn.',
    stars: ['Hóa Khoa', 'Hóa Quyền', 'Hóa Lộc'],
    scope: 'group',
    good: true,
  },
  {
    name: 'Quyền Lộc tuần phùng',
    meaning: 'Hóa Quyền gặp Hóa Lộc — quyền lực đi đôi tài lộc, thăng tiến và sung túc.',
    stars: ['Hóa Quyền', 'Hóa Lộc'],
    scope: 'group',
    good: true,
  },
  {
    name: 'Khôi Việt (quý nhân)',
    meaning:
      'Thiên Khôi và Thiên Việt hội/giáp — cách quý nhân: được người trên đề bạt, thi cử hanh thông, gặp may, công danh thuận.',
    stars: ['Thiên Khôi', 'Thiên Việt'],
    scope: 'group',
    good: true,
  },
  {
    name: 'Xương Khúc (văn tài)',
    meaning:
      'Văn Xương và Văn Khúc hội/đồng cung — cách văn tài, học vấn, khoa giáp, thông minh tài hoa; kỵ gặp Hóa Kỵ (văn thư thị phi).',
    stars: ['Văn Xương', 'Văn Khúc'],
    scope: 'group',
    good: true,
  },
  {
    name: 'Tả Hữu (phụ bật)',
    meaning:
      'Tả Phù và Hữu Bật hội/đồng cung — cách trợ lực: được quý nhân, cộng sự nâng đỡ, làm việc có người phò tá.',
    stars: ['Tả Phù', 'Hữu Bật'],
    scope: 'group',
    good: true,
  },
  {
    name: 'Long Phượng (Long Trì Phượng Các)',
    meaning:
      'Long Trì + Phượng Các hội/giáp — cách thanh quý, tăng vẻ tao nhã, khoa danh, hôn nhân tốt đẹp, hỗ trợ văn tinh.',
    stars: ['Long Trì', 'Phượng Các'],
    scope: 'group',
    good: true,
  },
  {
    name: 'Tam Thai Bát Tọa',
    meaning:
      'Tam Thai + Bát Tọa hội/giáp — tăng quý hiển, địa vị, được tôn trọng; hỗ trợ Tử Vi, Nhật Nguyệt thêm rạng.',
    stars: ['Tam Thai', 'Bát Tọa'],
    scope: 'group',
    good: true,
  },
  {
    name: 'Ân Quang Thiên Quý',
    meaning:
      'Ân Quang + Thiên Quý hội/giáp — cách được ban ơn, thi cử đỗ đạt, gặp quý nhân, danh dự, vinh hiển.',
    stars: ['Ân Quang', 'Thiên Quý'],
    scope: 'group',
    good: true,
  },
  {
    name: 'Thai Phụ Phong Cáo',
    meaning:
      'Thai Phụ + Phong Cáo hội/giáp — tăng phẩm trật, quý hiển, công danh, hỗ trợ Xương Khúc trở thành khoa danh.',
    stars: ['Thai Phụ', 'Phong Cáo'],
    scope: 'group',
    good: true,
  },
  {
    name: 'Khốc Hư',
    meaning:
      'Thiên Khốc + Thiên Hư hội/đồng cung — chủ ưu sầu, hao tổn; tại Tý/Ngọ lại thành cách "biện tài" (ăn nói có uy, hợp hùng biện).',
    stars: ['Thiên Khốc', 'Thiên Hư'],
    scope: 'group',
    good: false,
  },
  {
    name: 'Cô Quả (cô đơn)',
    meaning:
      'Cô Thần + Quả Tú hội/đồng cung — chủ cô độc, hình khắc lục thân, tình cảm lạnh nhạt; tại cung Mệnh/Phu Thê/Tử Tức cần đề phòng.',
    stars: ['Cô Thần', 'Quả Tú'],
    scope: 'group',
    good: false,
  },
  {
    name: 'Không Kiếp (song sát)',
    meaning:
      'Địa Không + Địa Kiếp hội/đồng cung — hao bại vật chất mạnh, làm ăn thất bại, tiền vào ra bất định; ngược lại hợp người tu hành, sáng tạo, nghiên cứu (thoát tục).',
    stars: ['Địa Không', 'Địa Kiếp'],
    scope: 'group',
    good: false,
  },
  {
    name: 'Kình Đà (giáp sát)',
    meaning:
      'Kình Dương + Đà La hội — sát khí mạnh, dễ thị phi, thương tật, trắc trở; đắc địa (võ cách, biên cương) thì hóa thành uy dũng.',
    stars: ['Kình Dương', 'Đà La'],
    scope: 'group',
    good: false,
  },
  {
    name: 'Hỏa Linh (song hỏa)',
    meaning:
      'Hỏa Tinh + Linh Tinh hội — nóng nảy, tai họa bất ngờ; chỉ hóa cát khi đi với Tham Lang đắc địa (Hỏa/Linh Tham).',
    stars: ['Hỏa Tinh', 'Linh Tinh'],
    scope: 'group',
    good: false,
  },
  {
    name: 'Mã đầu đới kiếm',
    meaning:
      'Kình Dương cư Ngọ — "đầu ngựa đeo kiếm": đắc cách thì uy dũng, lập công nơi biên ải/cương vực, hợp võ nghiệp; hãm thì thương tật, hung hiểm.',
    stars: ['Kình Dương'],
    branches: ['Ngọ'],
    scope: 'same',
    good: true,
  },
  {
    name: 'Tang Hổ (tang chế)',
    meaning:
      'Tang Môn + Bạch Hổ hội/xung — chủ tang chế, hiếu phục, buồn phiền về lục thân; lưu niên gặp cần đề phòng hiếu sự, kiện tụng.',
    stars: ['Tang Môn', 'Bạch Hổ'],
    scope: 'group',
    good: false,
  },
  {
    name: 'Hình Kỵ giáp Ấn',
    meaning:
      'Thiên Tướng (Ấn) bị Thiên Hình và Hóa Kỵ kẹp/hội — đại kỵ: dễ tai họa, mất chức, kiện tụng, thị phi nặng.',
    stars: ['Thiên Tướng', 'Thiên Hình', 'Hóa Kỵ'],
    scope: 'group',
    good: false,
  },
  {
    name: 'Tài Ấm giáp Ấn',
    meaning:
      'Thiên Tướng (Ấn) được Hóa Lộc/Lộc Tồn (Tài) và Thiên Lương (Ấm) kẹp/hội — cát cách: được che chở, có tài lộc, sự nghiệp vững.',
    stars: ['Thiên Tướng', 'Thiên Lương', 'Lộc Tồn'],
    scope: 'group',
    good: true,
  },
  {
    name: 'Phủ Tướng triều viên',
    meaning:
      'Thiên Phủ và Thiên Tướng cùng chầu về Mệnh — cách phú quý ổn định, có tài quản trị, hậu vận sung túc, được tín nhiệm.',
    stars: ['Thiên Phủ', 'Thiên Tướng'],
    scope: 'group',
    good: true,
  },
  {
    name: 'Đào Hồng (đào hoa)',
    meaning:
      'Đào Hoa + Hồng Loan hội/đồng cung — duyên tình đậm, hấp dẫn khác phái, lợi nghệ thuật/giao tế; tại Phu Thê/Phúc cần xét sát tinh kẻo đa đoan.',
    stars: ['Đào Hoa', 'Hồng Loan'],
    scope: 'group',
    good: true,
  },
];

function clean(name: string): string {
  return name.startsWith('L. ') ? name.slice(3) : name;
}

/**
 * Nhận diện cách cục ngay tại một cung (scope 'same').
 * @param palaceStarNames danh sách tên sao trong cung
 * @param branch địa chi của cung
 */
export function detectCachCucInPalace(palaceStarNames: string[], branch: string): CachCuc[] {
  const set = new Set(palaceStarNames.map(clean));
  return CACH_CUC.filter(c =>
    c.scope === 'same' &&
    c.stars.every(s => set.has(s)) &&
    (!c.branches || c.branches.includes(branch)),
  );
}

/**
 * Nhận diện cách cục theo phạm vi rộng: cung + tam hợp + xung chiếu + nhị hợp
 * (scope 'group'). Cũng gồm các cách 'same' của chính cung đang xem.
 * @param groupStarNames hợp các sao trong cung và các cung ảnh hưởng
 * @param branch địa chi cung đang xem
 */
export function detectCachCucInGroup(groupStarNames: string[], branch: string): CachCuc[] {
  const set = new Set(groupStarNames.map(clean));
  return CACH_CUC.filter(c =>
    c.stars.every(s => set.has(s)) &&
    (!c.branches || c.scope === 'group' || c.branches.includes(branch)),
  );
}
