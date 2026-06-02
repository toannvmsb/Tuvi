/**
 * KIM CHỈ NAM LUẬN GIẢI LÁ SỐ TỬ VI TỪ A → Z
 * Trích & cô đọng từ bài "Cách Luận Giải Lá Số Tử Vi Hoàn Chỉnh Từ A - Z"
 * (tuvi.cohoc.net — nid 6704, dẫn theo tuvicaimenh.com).
 *
 * Mục đích: cung cấp nguồn tham chiếu CỐ ĐỊNH cho:
 *  - Prompt phân tích AI TOÀN BỘ lá số (`analyzeFullChartWithAI`).
 *  - Tham chiếu khi triển khai luận giải offline (template-based).
 *
 * LƯU Ý:
 *  - Đại Vận / Tiểu Vận VẪN giữ logic "3 yếu tố cụ Thiên Lương"
 *    (Thiên thời – Địa lợi – Nhân hòa) đã code trong daiVanScore/tieuVanScore;
 *    A-Z guide chỉ định khung TỔNG QUAN + thứ tự xem cung + cách phối hợp.
 */

export const LUAN_GIAI_A_Z_5_STEPS = [
  {
    step: 1,
    title: 'Quan sát & phân tích bố cục TỔNG QUAN của các cung và các sao',
    checklist: [
      'Xét sự THUẬN/NGHỊCH LÝ Âm Dương giữa Năm sinh và vị trí cung an Mệnh — biết tổng quát tốt/xấu.',
      'Xét sự SINH KHẮC NGŨ HÀNH của Can Chi năm sinh.',
      'Xét tương quan ngũ hành giữa BẢN MỆNH (nạp âm năm sinh) và CỤC (nạp âm cung Mệnh).',
      'Xem phối hợp 2 cung TAM HỢP với cung an Mệnh – Thân.',
      'Xem phối hợp cung NHỊ HỢP với cung an Mệnh – Thân.',
      'Xem phối hợp cung XUNG CHIẾU với cung an Mệnh – Thân.',
      'Xem vị trí của tam hợp Mệnh/Thân với vòng Thái Tuế trên lá số.',
      'Xem vị trí của tam hợp Mệnh/Thân với vòng Lộc Tồn trên lá số.',
      'Xem vị trí của tam hợp Mệnh/Thân với vòng Tràng Sinh trên lá số.',
      'Thế đứng của các chính tinh: cặp Âm Dương, Tử Phủ, Thất Sát; vị trí sao chủ Mệnh.',
      'Miếu/Vượng/Đắc/Bình/Hãm của các chính tinh.',
      'Thế đứng các cung Mệnh, Tài Bạch, Quan Lộc, …',
      'Bố cục Trung tinh & Phụ tinh: Khôi Việt – Tả Hữu – Tứ Hóa – Xương Khúc – Thanh Long – Quang Quý – Thiên Hình – Thái Tuế – Kiếp Sát – Lộc Tồn – Lục Sát (Kình Đà Linh Hỏa Không Kiếp) – Thiên Mã.',
      'Vòng Tràng Sinh, bộ Khốc Hư, Tang Hổ và các sao bộ phận cơ thể (Tật Ách).',
    ],
    output: [
      'ĐIỂM NỔI BẬT nhất của lá số (mấu chốt nằm ở cung nào, sao nào, cách cục nào).',
      'CHỖ TỐT ở đâu, CHỖ XẤU ở đâu.',
      'Các ƯU ĐIỂM và NHƯỢC ĐIỂM của lá số.',
      'MỨC ĐỘ tốt/xấu của từng yếu tố (sự nghiệp, gia đình, …).',
    ],
  },
  {
    step: 2,
    title: 'Xem & phân tích TỪNG CUNG theo thứ tự ưu tiên',
    orderMale: ['Mệnh', 'Thân', 'Phúc Đức', 'Quan Lộc', 'Tài Bạch', 'Thiên Di', 'Phu Thê'],
    orderFemale: ['Mệnh', 'Thân', 'Phúc Đức', 'Phu Thê', 'Tài Bạch', 'Tử Tức'],
    palaceGroups: {
      banThan: ['Quan Lộc', 'Tài Bạch', 'Tật Ách', 'Thiên Di', 'Điền Trạch', 'Nô Bộc'],
      lucThan: ['Phu Thê', 'Tử Tức', 'Phụ Mẫu', 'Huynh Đệ'],
    },
    perPalaceChecklist: [
      'Bộ cách của Chính tinh + Trung tinh tại tam cung Mệnh-Tài-Quan, cung Thân, cung Phúc Đức.',
      'Ý nghĩa & đặc tính của Chính tinh tọa thủ, hợp chiếu, nhị hợp tại Mệnh – Thân.',
      'Ý nghĩa & đặc tính Trung tinh / Phụ tinh tọa thủ, hợp chiếu, nhị hợp cung Mệnh – Thân.',
      'Ý nghĩa, đặc tính, vị trí, đắc/hãm của các HUNG SÁT TINH trên lá số.',
      'Ảnh hưởng các Hung Sát Bại tinh (nếu có) tại Mệnh – Tài – Quan – Thân – Phúc.',
      'Giá trị & ảnh hưởng biến đổi của các sao theo thời gian.',
      'Sự liên đới giữa các sao — nếu kết thành CÁCH CỤC sẽ mạnh hơn nhiều so với đứng đơn lẻ.',
    ],
    tamHopRules: {
      groups: {
        'Tỵ-Dậu-Sửu': 'KIM',
        'Thân-Tý-Thìn': 'THỦY',
        'Hợi-Mão-Mùi': 'MỘC',
        'Dần-Ngọ-Tuất': 'HỎA',
      },
      rules: [
        'Tam hợp Mệnh bị tam hợp Phu Thê khắc → sợ vợ / sợ chồng.',
        'Tam hợp Mệnh bị tam hợp Thiên Di khắc → ra ngoài thiệt thòi, thua thiệt.',
        'Tam hợp Mệnh KHẮC tam hợp Thiên Di → ra ngoài có lợi, vượt lên hoàn cảnh.',
        'Tam hợp Mệnh KHẮC tam hợp khác → TỐT NHẤT.',
        'Tam hợp Mệnh BÌNH HÒA với tam hợp khác → TỐT NHÌ.',
        'Tam hợp Mệnh BỊ KHẮC → XẤU, thường thua thiệt.',
        '(Theo cụ Việt Viêm Tử) Dương Nam / Âm Nữ khởi thuận → sao tam hợp ở cung TRƯỚC ảnh hưởng mạnh hơn. ' +
          'Âm Nam / Dương Nữ khởi nghịch → sao tam hợp ở cung SAU ảnh hưởng mạnh hơn.',
      ],
    },
    coordRule:
      'Khi xem một cung phải xem PHỐI HỢP 5 cung: cung chính + 2 cung tam hợp + cung xung chiếu + cung nhị hợp. ' +
      'Theo cụ Thiên Lương: cung chính + 2 cung tam hợp là chính yếu, nhị hợp bổ túc, xung chiếu là "đối phương".',
  },
  {
    step: 3,
    title: 'Phân tích ý nghĩa, vị trí MIẾU HÃM của Chính tinh, Trung tinh, Phụ tinh',
    note:
      '14 chính tinh chi phối mạnh mẽ; nắm bản chất 14 chính tinh là CHÌA KHÓA. ' +
      'Phân biệt cấp độ Miếu/Vượng/Đắc/Bình/Hãm khi đánh giá tác dụng.',
    phuTinhClassification: {
      tot: {
        quy: ['Lộc Tồn', 'Ân Quang', 'Thiên Khôi', 'Hóa Lộc', 'Thiên Quý', 'Thiên Việt', 'Long Trì', 'Tấu Thư', 'Phượng Các', 'Thiên Mã'],
        phu: ['Lộc Tồn', 'Hóa Lộc'],
        quyen: ['Hóa Quyền', 'Quốc Ấn', 'Quan Đới', 'Tướng Quân', 'Phong Cáo', 'Đường Phù'],
        phuc: ['Ân Quang', 'Hóa Khoa', 'Thiên Hỷ', 'Thiên Quý', 'Thiên Giải', 'Thiếu Dương', 'Thiên Quan', 'Địa Giải', 'Thiếu Âm', 'Thiên Phúc', 'Giải Thần', 'Hỷ Thần', 'Thiên Thọ', 'Thiên Đức', 'Bác Sỹ', 'Tràng Sinh', 'Nguyệt Đức', 'Đẩu Quân', 'Đế Vượng', 'Long Đức', 'Thiên Y', 'Thanh Long', 'Phúc Đức', 'Thiên Trù'],
        van: ['Thiên Khôi', 'Văn Xương', 'Phong Cáo', 'Thiên Việt', 'Văn Khúc', 'Quốc Ấn', 'Hóa Khoa', 'Lưu niên Văn tinh', 'Thai Phụ'],
        daiCac: ['Tam Thai', 'Bát Tọa', 'Lâm Quan', 'Hoa Cái', 'Đường Phù'],
        daoHoa: ['Đào Hoa', 'Hồng Loan'],
      },
      xau: {
        sat: ['Địa Kiếp', 'Thiên Không', 'Hỏa Tinh', 'Địa Không', 'Kiếp Sát', 'Linh Tinh', 'Kình Dương', 'Đà La'],
        bai: ['Đại Hao', 'Thiên Khốc', 'Suy', 'Tiểu Hao', 'Thiên Hư', 'Bệnh', 'Tang Môn', 'Lưu Hà', 'Tử', 'Bạch Hổ', 'Phá Toái', 'Mộ', 'Thiên La', 'Tử Phù', 'Tuyệt', 'Địa Võng', 'Bệnh Phù', 'Thiên Thương', 'Thiên Sứ', 'Quan Phù', 'Tuế Phá'],
        am: ['Hóa Kỵ', 'Thiên Riêu', 'Thiên Thương', 'Phục Binh', 'Thiên Sứ', 'Quan Phù', 'Cô Thần', 'Quả Tú', 'Quan Phủ'],
        dam: ['Thiên Riêu', 'Hoa Cái', 'Mộ', 'Mộc Dục', 'Thai'],
        hinh: ['Thiên Hình', 'Quan Phù', 'Thái Tuế'],
      },
      trungLap: ['Tả Phù', 'Dưỡng', 'Triệt', 'Hữu Bật', 'Tuần'],
    },
  },
  {
    step: 4,
    title: 'Phân tích chi tiết ĐẠI VẬN & TIỂU VẬN của lá số',
    note:
      'GIỮ NGUYÊN logic 3 yếu tố cụ Thiên Lương (đã code ở daiVanScore.ts / tieuVanScore.ts): ' +
      'THIÊN THỜI (tam hợp đại vận vs tam hợp tuổi), ĐỊA LỢI (hành cung đại vận vs hành Mệnh), ' +
      'NHÂN HÒA (bộ chính tinh đại vận vs bộ Mệnh). Quy tắc "Đại vận lấn áp Tiểu vận".',
    daiVanChecklist: [
      'Tương quan các SAO / CÁCH của Mệnh-Thân với các sao / cách của Đại Hạn (Mệnh nếu <30t, Thân nếu ≥30t).',
      'Tương quan NGŨ HÀNH bản Mệnh (hoặc Cục) với ngũ hành cung nhập Đại Hạn.',
      'Ảnh hưởng SỚM (5 năm đầu) của Bắc Đẩu tinh, TRỄ (5 năm sau) của Nam Đẩu tinh.',
      'Phối hợp cung PHÚC ĐỨC với Đại Hạn (Phúc như "cung Mệnh thứ nhì").',
      'Phối hợp cung liên hệ đến HOÀN CẢNH cần luận (Tử Tức cho con cái, Phu Thê cho hôn nhân…).',
      'Nguyên tắc đối kháng cách: bộ Mệnh Cơ Nguyệt Đồng Lương KỴ hạn Sát Phá Liêm Tham; bộ Tử Phủ Vũ Tướng kỵ Không Kiếp.',
    ],
    tieuVanChecklist: [
      'Tương quan giữa ĐẠI HẠN và TIỂU HẠN — Đại Hạn là gốc, Tiểu Hạn là người tài xế.',
      'Tương quan NGŨ HÀNH bản Mệnh với chính tinh & cung nhập Tiểu Hạn.',
      'Tương quan Lưu Đại Hạn, Địa Bàn, Thiên Bàn (chủ yếu Thiên Bàn là đủ).',
      'Ngũ hành của hàng CAN năm nhập hạn so với cung & sao nhập hạn.',
      'Các PHI TINH (Lưu Thái Tuế, Lưu Lộc Tồn, Lưu Kình Đà, Lưu Tang Môn…) — chỉ bổ trợ.',
      'Nguyên tắc "Tổn hữu dư, bổ bất túc": dư yếu tố hôn nhân thì Cô Quả – Tang Hổ giúp con thuyền có bến đậu.',
    ],
  },
  {
    step: 5,
    title: 'KIẾN THỨC TỔNG HỢP & KẾT LUẬN',
    points: [
      'Đúc kết cách cục chính, ưu nhược điểm, mức độ thành công ở từng lĩnh vực.',
      'Đưa ra LỜI KHUYÊN cụ thể: hướng nghề, hướng tình cảm, hướng đầu tư, các đại vận cần thận trọng / nên bứt phá.',
      'Luôn xem phối hợp 5 cung (chính + tam hợp + xung chiếu + nhị hợp) và quân bình số lượng sao tốt/xấu.',
    ],
  },
] as const;

/**
 * Khái quát 12 cung (rút gọn từ phần "Khái quát 12 cung trong lá số tử vi").
 * Dùng làm KB cho AI prompt — để AI bám sát chuẩn, không bịa.
 */
export const KHAI_QUAT_12_CUNG: Record<string, string> = {
  'Mệnh':
    'Chủ thể cả lá số. Xét vị trí (Tí-Hợi), tam hợp, nhị hợp, xung chiếu, giáp; các sao tọa & chiếu (kèm miếu/hãm); ' +
    'tương tác sao-cung-bản Mệnh. Cho biết: cách cục chính, hình dáng/tính cách/tài năng, một phần thành công cuộc đời, ' +
    'tương quan với thân nhân & xã hội. Mệnh tốt = chi cung hòa với bản Mệnh + chính tinh thủ Mệnh Miếu Vượng + hội quý cách. ' +
    'Nam cần "chỉ huy" các cung khác; Nữ cần "nhu thuận" giúp cung Phu và cung Tử. Mệnh có Thất Sát thường khắc thân nhân.',
  'Phúc Đức':
    'Bộc lộ sự suôn sẻ, được che chở. Phúc tốt → gặp thuận tiện, an nhàn, quý nhân giúp. ' +
    'Phúc tam hợp Phu Thê nên ảnh hưởng quan trọng tới người hôn phối. Bổ trợ xem con cháu & thọ yểu của đương số. ' +
    'Đào Hồng sinh vượng ở Phúc → hạnh phúc tình duyên. Hóa Kỵ ở Phúc → lao tâm khổ tứ, trắc trở tình duyên.',
  'Tài Bạch':
    'Chủ tiền tài, năng lực, năng khiếu, việc làm. KHÔNG phải cung DUY NHẤT quyết định giàu nghèo. ' +
    'Cần tài tinh (Vũ Khúc, Thái Âm, Song Lộc, Trù, Riêu, Linh Hỏa hợp cách). ' +
    'Có hung tinh chưa hẳn xấu — chỉ là kiếm tiền vất vả hơn. Sao tích trữ/che giấu thường tốt hơn lộ ra dễ bị tranh cạnh. ' +
    'Tài Bạch toàn sao rực rỡ nhưng KHÔNG có tài tinh (hoặc tài tinh bị phá hãm) → chỉ giàu vẻ ngoài, ít của chìm.',
  'Phu Thê':
    'Chỉ người hôn phối & quan hệ với người khác phái. Phải kết hợp với Mệnh, Nhật Nguyệt, các sao tình duyên. ' +
    'Xấu chưa chắc bỏ nhau hay sát phu sát thê — có thể chỉ là phản đối khi kết hôn, đồng sàng dị mộng. ' +
    'Ý nghĩa cung Phu Thê biến chuyển linh hoạt tùy phối hợp.',
  'Tử Tức':
    'Chỉ con cái & năng lực sinh sản nói chung. Thiên Hình, Kiếp Sát → mẹ có thể phải phẫu thuật khi sinh. ' +
    'Tử Tức TỐT HƠN cung Mệnh được phép (con hơn cha là nhà có phúc). ' +
    'Cần Quý tinh (Nhật Nguyệt sáng, tam hóa, Long Phượng, Cái Mã, Khôi Việt) + Phúc tinh (Đồng Lương, Thiên Phủ, Tứ Đức, Quan Phúc, Quang Quý). ' +
    'Quyền/Sát tinh nhiều → có thể họa: khó nuôi con, con hư, con khắc cha mẹ.',
  'Điền Trạch':
    'Chỉ nhà cửa, gia tài lớn, sự nghiệp lớn. KHÔNG phải nhược cung. ' +
    'Quan to / giám đốc cần Điền rất tốt mới tạo dựng được. Tốt nhất có tài tinh + Long Phượng Thai Tọa + Tả Hữu Quan Phúc. ' +
    'Điền tốt → đầu tư lĩnh vực lớn (xe hơi, bất động sản). Điền suy → chỉ nên làm sản phẩm nhỏ.',
  'Quan Lộc':
    'Việc làm đương số CÓ DUYÊN làm, có thể làm; cấp trên, cơ quan. ' +
    'Quan tốt → việc làm thuận tiện; nhiều sao chủ quyền quý kỹ năng → có thể chỉ huy. ' +
    'Quan + Điền + Di + Mệnh + Nô phối hợp tốt → vị thế có thật. Quan tốt thường là công chức/nhà nước; Quan kém → tự do nhiều hơn nhưng vẫn có thể thành đạt.',
  'Thiên Di':
    'Khả năng thích ứng & hoạt động trong xã hội: kết giao, chỉ huy hoàn cảnh, di chuyển/di cư. ' +
    'Di tốt cần sao linh động: Khôi Việt, Nhật Nguyệt, Tấu Thư, Xương Khúc, Hóa Khoa. ' +
    'Di QUÁ tốt → khuyên LY HƯƠNG LẬP NGHIỆP. Mã – Khốc – Khách – Lộc – Tràng Sinh là cách đặc biệt tốt cho cung Di.',
  'Tật Ách':
    'Chỉ bệnh tật & tai ách. Không phải cường cung nhưng đáng xem kỹ. ' +
    'Quan trọng các sao biểu tượng bộ phận cơ thể + phúc thiện tinh. Cần sinh vượng, tránh sát tinh. ' +
    'Chính tinh vượng địa + Quang Quý Quan Phúc Tứ Đức được nghênh đón. Triệt Tuần ở Tật vô chính diệu là cách TỐT. ' +
    'Bổ trợ luận: nếu Mệnh là người che giấu, tính cách bản năng có thể suy từ cung Tật.',
  'Phụ Mẫu':
    'Vai trò của cha mẹ trong đời sống đương số (nhìn qua lăng kính đương số), không chắc đúng cuộc sống thật của cha mẹ. ' +
    'Phụ Mẫu đẹp → thường cha mẹ khá (kết hợp Nhật Nguyệt). Phụ Mẫu xấu → có thể chỉ là không được hỗ trợ, không hưởng lộc/tình yêu song thân; hoặc khắc phụ mẫu. ' +
    'Nằm trong tam hợp Tử-Phụ-Nô, xung chiếu Tật Ách.',
  'Huynh Đệ':
    'Chỉ số lượng anh em, sơ lược cuộc sống & quan hệ anh em với đương số. Cung không quan trọng lắm. ' +
    'Nhiều cát tinh ở đây có khi lại xấu vì làm mất tinh hoa cung khác.',
  'Nô Bộc':
    'Bạn hữu, người dưới quyền, vợ bé. HOÀN TOÀN KHÔNG có ý nghĩa "Nô vượng Mệnh suy = làm tôi tớ". ' +
    'Cần hòa thuận, tương hỗ — Tả Hữu hợp nhất; kỵ hung sát tinh, Hóa Kỵ, Phá Điếu. ' +
    'Nhiều sao tình duyên ở Nô → đời sống tình ái phong phú, nhiều chi nhánh, phóng túng.',
};

/**
 * Cốt lõi 14 chính tinh (trích từ bài, rút gọn để dùng làm KB trong prompt AI).
 */
export const CHINH_TINH_CORE: Record<string, string> = {
  'Tử Vi':
    'Âm Thổ, Chủ tinh Bắc Đẩu, hóa Đế Quân. CẦN "quần thần củng chiếu" (Phủ Tướng, Phụ Bật, Xương Khúc, Khôi Việt) mới thượng cách. ' +
    'Cô quân (xa quần thần) → chủ quan, cao ngạo, mừng giận thất thường. Gặp Không vong/Hoa Cái → tư tưởng độc tài; gia Tứ Sát → vua vô đạo.',
  'Thiên Cơ':
    'Âm Mộc, sao đầu Nam Đẩu, "mưu thần", khi thiện khi ác. Hợp Xương Khúc, Long Phượng, Hóa Khoa → mưu trí tuyệt. ' +
    'Gặp Hóa Kỵ/sát tinh + sao vô lương → gian trá. Hóa Quyền tăng ổn định; Hóa Lộc → chỉ thích kiếm tiền; Hóa Kỵ → mưu lợi, đi ngang về tắt. Thiện biến, rất nhạy với sát tinh.',
  'Thái Dương':
    'Dương Hỏa, chủ Quan Lộc, chủ Quý. Miếu Vượng ở Dần Mão Thìn Tỵ Ngọ Mùi; hợp người sinh ban ngày. ' +
    'Hóa Quyền/Khoa tăng quý hiển; cần Hóa Lộc/Lộc Tồn mới Phú Quý song toàn. Ngọ = Nhật Lệ Trung Thiên — danh lớn hơn lợi. Chủ Động, "cho mà không nhận".',
  'Vũ Khúc':
    'Âm Kim, tài tinh, kiếm tiền là chính, cương liệt quyết đoán. Hợp Quan Lộc, Tài Bạch; vào Mệnh / Lục Thân ngại vì cương khắc. ' +
    'Hóa Lộc rất tốt (giảm cương khắc). Hóa Quyền/Kỵ tăng cương khắc → Vũ-Kỵ thường Bại cục. Sợ Hỏa Linh; đôi khi sợ Văn Khúc (Linh Xương Đà Vũ = bại cục). Hợp Khôi Việt + Thiên Cơ.',
  'Thiên Đồng':
    'Dương Thủy, Phúc tinh chòm Nam Đẩu, chủ HƯỞNG THỤ và Ý CHÍ. Hóa Lộc + cát tinh → tốt nhưng dễ mềm yếu vì tham hưởng. ' +
    'Cần một chút sát tinh kích động mới thành tựu lớn. Sợ Hóa Kỵ. Thường "vãn vận" (vận muộn).',
  'Liêm Trinh':
    'Âm Hỏa, hóa Tù tinh, "Thứ Đào Hoa", chủ tình cảm & lý trí. Gặp thiện thành thiện, gặp ác thành ác — biến hóa lớn. ' +
    'Hóa Lộc → tình cảm hòa hợp; Hóa Kỵ → tan vỡ, tai họa máu huyết. Hợp Thiên Phủ + Xương Khúc + Lộc, hoặc Thiên Tướng, hoặc Tử Vi + Thiên Phủ → "gặp thiện theo thiện".',
  'Thiên Phủ':
    'Dương Thổ, chủ tinh Nam Đẩu, "kho tiền". Cần "quần thần đồng hội"; bảo thủ hơn Tử Vi, dễ đối xử hơn. ' +
    'Hợp Tài Bạch / Quan Lộc tuyệt vời. Vào Mệnh dễ phát triển thành gian trá/phù thịnh. Chủ cất giấu, chủ phú, giữ gìn cơ nghiệp.',
  'Thái Âm':
    'Âm Thủy, chủ tinh người sinh đêm. Miếu Vượng Dậu Tuất Hợi Tý Sửu. Tài tinh nhưng thuộc kế hoạch / phụ tá (khác Vũ Khúc là hành vi). ' +
    'Có thể nắm quyền lực tiền tài. Hợp Tả Hữu Khúc Xương Lộc Quyền. Chủ Tĩnh, thu nhận, chủ Phú; thu nhận quá thịnh → nhiều tâm kế.',
  'Tham Lang':
    'Dương Mộc khí Thủy, Tình Dục & Vật Dục, "Chính Đào Hoa". Cần chế hóa. Tử Tham + Tả Hữu Xương Khúc, Vũ Tham + Hỏa Linh là được chế hóa. ' +
    'Liêm Tham + Không/Thiên Hình/Hóa Kỵ → thiên về văn nghệ. Không chế hóa + Kình Đà → vì sắc rước họa. Hóa Lộc tăng vật dục, Hóa Kỵ giảm dục.',
  'Cự Môn':
    'Âm Thổ khí Âm Kim, sao thứ 2 Bắc Đẩu, ÁM TINH. Cần Thái Dương miếu vượng chiếu, hoặc Lộc/Quyền hội mới giải tính ám. ' +
    'Tài ăn nói: cát → giỏi biện; hung → giảo hoạt. Gặp Thái Dương hãm + Hình Kỵ → khẩu thiệt, kiện cáo. ' +
    'Yếu kháng sát tinh — kỵ sát tinh, cần Hóa Lộc/Quyền + Xương Khúc → có thể làm luật sư, diễn thuyết gia.',
  'Thiên Tướng':
    'Dương Thủy, Ấn tinh chòm Nam Đẩu. Gặp Cát thì Thiện, gặp Hung thì Ác — chịu hoàn cảnh bên ngoài mà biến. ' +
    'Sợ Hỏa Linh ("Thiên Tướng Hỏa Linh trùng Phá, tàn chướng"). RẤT coi trọng LÂN CUNG (giáp): Hình Kỵ giáp Ấn (xấu), Tài Ấm giáp Tướng (đẹp).',
  'Thiên Lương':
    'Dương Thổ, Ấm tinh chòm Nam Đẩu, đồng thời hóa Hình tinh (cương khắc cô kỵ). ' +
    'Hợp Hóa Lộc/Khoa; Phụ Bật Xương Khúc → phát huy chữ "Ấm" càng về sau càng mạnh. Tiêu tai giải khó nhưng "tiên phá hậu lập". ' +
    'Cư Tị-Hợi không tốt. Cách Thiên Lương – Hình Kỵ: nhờ Thái Dương miếu vượng + Khoa Quyền mới tỏa sáng.',
  'Thất Sát':
    'Âm Kim, ngôi 5 Nam Đẩu, "chiến tướng", cương khắc. Kỵ Hình Kỵ + sát tinh → đời người khó khăn. ' +
    'Chế cương khắc: cần Lộc (Hóa Lộc/Lộc Tồn) → thành chuyên nghiệp, công nghệ, giàu có. ' +
    'Thất Sát + Tử Vi cùng / đối cung + quần thần + tránh sát = "hóa sát vi quyền" — đại tướng.',
  'Phá Quân':
    'Dương Thủy, ngôi 7 Bắc Đẩu, "tiên phong", hóa Hao. "Năng công bất năng thủ" — thiên về tiến công. ' +
    'Tử Vi không "hóa Phá vi quyền" được; ngược lại tính động của Phá còn ảnh hưởng đến ổn định của Tử. ' +
    'Tốt nhất bản thân Hóa Lộc, nhì là hội Lộc. Không Lộc → chiến tướng bị hao tổn, cần tập trung tâm lực vào 1 việc.',
};

/** Bộ chính tinh chuẩn (theo cụ Thiên Lương — đã code trong daiVanScore). */
export const BO_CHINH_TINH = [
  'Tử Phủ Vũ Tướng',          // ổn định, giữ cơ nghiệp
  'Sát Phá Tham (Liêm)',      // động, bứt phá, biến cách
  'Cơ Nguyệt Đồng Lương',     // mềm, an nhàn, văn — phụ tá
  'Cự Nhật',                  // ngôn luận, quý hiển
] as const;
