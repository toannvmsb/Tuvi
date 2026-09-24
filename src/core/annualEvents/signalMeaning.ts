/**
 * Ý NGHĨA từng loại tín hiệu — dùng để giải thích "vì sao" ra kết luận (không phải chỉ liệt kê
 * tên sao). Theo đúng tinh thần Tứ Hóa của ENGINE_SPEC §8 (Lộc=cơ hội, Quyền=hành động/áp lực,
 * Khoa=ổn định/danh tiếng, Kỵ=vướng mắc) và §12 (Thái Tuế=kích hoạt, Thiên Mã=biến động di
 * chuyển, Lộc Tồn/Kình/Đà=nguồn lực/cọ xát, Tang Hổ Khốc Hư=áp lực/xáo trộn — KHÔNG quy thành
 * tai họa), cùng ý nghĩa cổ điển các chính tinh đã dùng nhất quán ở nơi khác trong app
 * (vd core/daiVanScore.ts — CAREER_BOOST/REL_BOOST/PROPERTY_BOOST/HAO_SAO/VOLATILITY_SAT).
 */
export const SIGNAL_MEANING: Record<string, string> = {
  HOA_LOC: 'mở ra cơ hội, nguồn lực hoặc sự thu hút mới',
  HOA_QUYEN: 'thúc đẩy hành động, tăng quyền quyết định nhưng cũng thêm áp lực trách nhiệm',
  HOA_KHOA: 'mang tính ổn định, hỗ trợ danh tiếng và kế hoạch dài hơi',
  HOA_KY: 'tạo vướng mắc, dễ chần chừ hoặc phát sinh việc chưa giải quyết dứt điểm',

  LOC_TON: 'tăng khả năng tích lũy, có nguồn lực hỗ trợ',
  KINH_DUONG: 'tạo cọ xát, dễ nóng vội hoặc va chạm khi quyết định',
  DA_LA: 'tạo trở ngại âm ỉ, việc dễ chậm hoặc vòng vo hơn dự tính',

  THIEN_MA: 'kích hoạt sự di chuyển, thay đổi hoặc biến động',
  THAI_TUE: 'là điểm được "chiếu" trong năm — được chú ý nhiều hơn, có thể là dịp tốt hoặc thử thách tùy bối cảnh',

  BACH_HO: 'thêm áp lực, dễ căng thẳng hoặc va vấp bất ngờ',
  TANG_MON: 'thêm xáo trộn nhẹ, dễ có việc không vui liên quan người thân/nội bộ',
  THIEN_KHOC: 'dễ có chuyện phải bận tâm, cảm xúc dễ dao động',
  THIEN_HU: 'dễ hao tổn tinh thần/sức lực, cảm giác trống trải',

  VAN_XUONG: 'hỗ trợ trí tuệ, giấy tờ, học hành, uy tín văn phòng',
  VAN_KHUC: 'hỗ trợ khéo léo trong giao tiếp, đàm phán, văn bản',
  THIEN_KHOI: 'có quý nhân giúp đỡ, thuận lợi hơn khi cần hỗ trợ',
  THIEN_VIET: 'có quý nhân giúp đỡ, thuận lợi hơn khi cần hỗ trợ',
  DAO_HOA: 'tăng sức hút, dễ có duyên mới trong giao tiếp/tình cảm',
  HONG_LOAN: 'tăng duyên tình cảm, dễ có tin vui đôi lứa',
  TIEU_HAO: 'dễ hao tốn nhỏ, chi tiêu lặt vặt tăng',
  DAI_HAO: 'dễ hao tốn lớn hơn, cần kiểm soát chi tiêu',
  QUAN_PHU: 'dễ vướng giấy tờ, thủ tục hoặc tranh luận pháp lý',

  CO_THAN: 'dễ cảm thấy đơn độc trong quyết định, ít người đồng hành',
  CU_MON: 'dễ có tranh luận, thị phi hoặc phải giải thích nhiều',
  DIA_KHONG: 'dễ có việc phát sinh bất ngờ, kế hoạch hay bị xáo trộn',
  DIA_KIEP: 'dễ có hao hụt bất ngờ, cần dự phòng phương án khác',
  HOA_TINH: 'dễ nóng vội, quyết định nhanh nhưng thiếu chắc chắn',
  LINH_TINH: 'dễ nóng vội, quyết định nhanh nhưng thiếu chắc chắn',
  HUU_BAT: 'có thêm sự hỗ trợ, hợp tác thuận lợi',
  TA_PHU: 'có thêm sự hỗ trợ, hợp tác thuận lợi',
  PHA_QUAN: 'thúc đẩy thay đổi mạnh, phá thế cũ để mở hướng mới',
  QUA_TU: 'dễ cảm thấy đơn độc trong quyết định, ít người đồng hành',
  THAM_LANG: 'tăng ham muốn mở rộng, dễ bị cuốn vào nhiều việc cùng lúc',
  THAT_SAT: 'thúc đẩy hành động quyết liệt, dứt khoát nhưng dễ căng thẳng',
  THIEN_HY: 'tăng niềm vui, dễ có tin mừng',
  THIEN_PHU: 'mang tính ổn định, có của để dành, ít biến động',
  THIEN_TUONG: 'có sự hỗ trợ, che chở, giảm bớt rủi ro',
  VU_KHUC: 'thúc đẩy quyết đoán trong chuyện tiền bạc, dứt khoát hơn',

  TIEU_HAN_FOCUS: 'Tiểu Hạn năm nay đang tập trung đúng vào lĩnh vực này — nên các dấu hiệu liên quan dễ trở thành việc CỤ THỂ trong năm, thay vì chỉ là tiềm năng chung chung',
};

export function meaningOf(code: string): string {
  return SIGNAL_MEANING[code] ?? 'góp phần vào xu hướng chung của giai đoạn này';
}
