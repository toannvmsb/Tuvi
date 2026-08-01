/**
 * Cơ sở dữ liệu ý nghĩa các sao Tử Vi — tra cứu trực tiếp trong app.
 *
 * - basic:           Ý nghĩa chung của sao trong Tử Vi (miễn phí).
 * - byPalace:        Ý nghĩa của sao khi tọa thủ tại từng cung (Nâng cao).
 * - combos:          Sao đi cùng các sao khác trong cùng một cung (Nâng cao).
 * - advancedGeneral: Các cách cục nổi bật, lưu ý tam hợp/nhị hợp/xung chiếu (Nâng cao).
 *
 * Dữ liệu tổng hợp từ các tài liệu Tử Vi phổ biến (Tử Vi Đẩu Số Toàn Thư,
 * Tử Vi Nam Phái, các trang luận giải trực tuyến). Dùng tham khảo.
 */

export interface StarInfo {
  name: string;
  basic: string;
  byPalace?: Partial<Record<string, string>>;
  combos?: string;
  advancedGeneral?: string;
}

// Danh sách tên 12 cung dùng làm key của byPalace
export const PALACE_KEYS = [
  'Mệnh', 'Huynh Đệ', 'Phu Thê', 'Tử Tức', 'Tài Bạch', 'Tật Ách',
  'Thiên Di', 'Nô Bộc', 'Quan Lộc', 'Điền Trạch', 'Phúc Đức', 'Phụ Mẫu',
] as const;

export const STAR_INFO: Record<string, StarInfo> = {
  // ─────────────────────────── 14 CHÍNH TINH ───────────────────────────
  'Tử Vi': {
    name: 'Tử Vi',
    basic:
      'Tử Vi thuộc hành Thổ, là Đế tinh — ngôi sao tôn quý đứng đầu các sao; lập số trước hết phải căn cứ vị trí Tử Vi. Sao chủ về quyền uy, sự tôn quý, lãnh đạo, đức độ và khả năng "giáng phúc tiêu tai" — hóa giải hung khí cho các cung, chế phục được Hỏa Tinh – Linh Tinh, trấn được Thất Sát. Miếu tại Dần – Ngọ; vượng tại Thân, Hợi, Thìn, Tị, Tý, Sửu, Mùi; bình thường tại Mão – Dậu; sao này không có hãm địa vì tự giải cứu được. Người Tử Vi khí chất đường hoàng, tự trọng cao, ưa được kính nể, có tài chỉ huy. Rất cần Tả Phụ – Hữu Bật, Văn Xương – Văn Khúc, Thiên Khôi – Thiên Việt, Phủ – Tướng, Lộc Tồn, Nhật – Nguyệt chầu về thì mới thành đại quý ("bách quan triều củng"); thiếu Tả Hữu phụ tá thì như vua mất triều thần — gọi là "cô quân", tốt đẹp giảm nhiều, dễ bảo thủ, sĩ diện, cô độc. Hội toàn sao hung như tiểu nhân lấn quyền, dễ thành người gian trá; hội Đào Hoa thì nữ mệnh phiêu lãng phong trần. Nên tọa Mệnh – Thân – Quan Lộc – Phúc Đức; rơi vào Tật Ách – Nô Bộc thì sái, giảm uy quyền.',
    byPalace: {
      'Mệnh': 'Mệnh Tử Vi: bản tính cao quý, có tài lãnh đạo, tự trọng cao, được người kính nể. Gặp Tả Hữu Xương Khúc là quý cách; gặp Không Kiếp Kình Đà thì khí phách giảm, dễ độc đoán hoặc hư danh.',
      'Huynh Đệ': 'Anh chị em có người thành đạt, có địa vị; bản thân thường là chỗ dựa hoặc được anh em nể trọng. Gặp sát tinh thì anh em ít, hoặc xa cách.',
      'Phu Thê': 'Phối ngẫu có cốt cách, năng lực, hơi gia trưởng/khó chiều. Nên lấy người hơn tuổi hoặc có bản lĩnh. Gặp Tham Lang dễ đa tình; gặp Phá Quân hôn nhân nhiều sóng gió.',
      'Tử Tức': 'Con cái thông minh, có chí, dễ thành đạt nhưng có khoảng cách tình cảm, con thường độc lập sớm. Hiếm con nếu gặp Không Kiếp.',
      'Tài Bạch': 'Tiền bạc đến từ vị thế, quản lý, danh tiếng; tài lộc ổn định, biết điều phối. Gặp Lộc Tồn/Hóa Lộc thì giàu sang vững.',
      'Tật Ách': 'Ít bệnh nặng, thường liên quan tỳ vị, huyết áp; tự phục hồi tốt. Tử Vi giải hung nên tai ách thường được hóa giải.',
      'Thiên Di': 'Ra ngoài được quý nhân nâng đỡ, có uy tín nơi xa, hợp công tác xã hội, chính trị. Đắc cách thì xuất ngoại hiển đạt.',
      'Nô Bộc': 'Có thuộc hạ/bạn bè giỏi, trung thành nếu được sao phụ tốt; gặp sát tinh thì bị phản hoặc lấn quyền.',
      'Quan Lộc': 'Quý cách về sự nghiệp: hợp làm quản lý, lãnh đạo, công quyền. Tử Vi tại Quan gặp Tả Hữu Khôi Việt là cách làm lớn.',
      'Điền Trạch': 'Nhà cửa, bất động sản khang trang, dễ có cơ ngơi tốt, gia tăng theo địa vị. Thừa kế hoặc tự tạo cơ nghiệp.',
      'Phúc Đức': 'Phúc dày, hưởng thụ tinh thần cao, tự tại, sống thọ; ưa thanh nhàn, có khí chất bề trên.',
      'Phụ Mẫu': 'Cha mẹ có địa vị, nề nếp, được hưởng phúc ấm; quan hệ tôn ti nhưng có thể thiếu gần gũi.',
    },
    combos:
      'Tử Vi + Thiên Phủ: đế vương gặp khố, giàu sang ổn định. + Thiên Tướng: cách "Tử Tướng" trung hậu, hợp quản trị. + Phá Quân: "Tử Phá" biến động, dám phá cách làm lại. + Tham Lang: dễ thiên về vật chất, đào hoa, cần Hỏa/Linh tiết chế. + Tả Hữu Xương Khúc Khôi Việt: "bách quan triều củng" — đại quý.',
    advancedGeneral:
      'Quý cách khi đủ phụ tá (Tả Phụ Hữu Bật, Văn Xương Văn Khúc, Thiên Khôi Thiên Việt) chầu về từ tam hợp/xung chiếu. Tử Vi gặp Không Kiếp gọi là "đế ngộ hung đồ", quyền uy hư hao. Cô quân (Tử Vi không phụ tá) thì chỉ hư vị.',
  },

  'Thiên Cơ': {
    name: 'Thiên Cơ',
    basic:
      'Thiên Cơ thuộc hành Mộc, là Nam Đẩu tinh, hóa khí là Thiện — sao của trí tuệ, mưu cơ và nhân nghĩa; còn gọi là "ích thọ chi tinh" (sao thêm tuổi thọ). Đắc địa thì có thể điều chỉnh được lẽ thuận – nghịch cho số mệnh: thông minh, đa mưu túc trí, cơ biến nhanh nhạy, tâm địa thiện lương, không ưa điều bất nhân bất nghĩa. Khi bất đắc chí thường ưa ở ẩn chốn lâm tuyền và dễ say mùi đạo (tôn giáo, huyền học). Hội cùng Thiên Lương, Tả Hữu, Văn Xương – Văn Khúc thì làm quan văn thanh hiền, làm võ chức trung lương. Ở hãm địa gặp Tứ Sát (Kình, Đà, Hỏa, Linh) xung phá là hạ cách; ngộ Thiên Lương – Thất Sát nên tìm cảnh thanh nhàn tăng đạo. Đại tiểu hạn gặp Thiên Cơ thường thay đổi công việc, lập cơ sáng nghiệp. Nữ mệnh Thiên Cơ nhiều cát tinh củng chiếu thì vượng phu ích tử; gặp Kình Đà – Hóa Kỵ xung phá thành đàn bà hạ tiện, khắc phu hại tử.',
    byPalace: {
      'Mệnh': 'Thông minh, đa tài, giỏi mưu tính, tay nghề khéo; tính hay thay đổi, suy nghĩ nhiều, dễ căng thẳng. Đắc địa thì là quân sư, chuyên gia.',
      'Huynh Đệ': 'Anh em thông minh nhưng tụ tán thất thường, ít nương tựa lâu dài.',
      'Phu Thê': 'Vợ/chồng nhanh trí, hoạt bát; tình cảm dễ biến động, nên kết hôn muộn cho bền. Gặp Thái Âm thì phối ngẫu hiền nhưng đa cảm.',
      'Tử Tức': 'Con thông minh lanh lợi, ít con hoặc con sống xa; quan hệ thay đổi theo hoàn cảnh.',
      'Tài Bạch': 'Kiếm tiền bằng trí óc, môi giới, kỹ thuật; tài lộc lên xuống, nên tránh đầu cơ.',
      'Tật Ách': 'Bệnh về thần kinh, gan mật, mất ngủ, hay lo. Bệnh dễ tái phát, biến chuyển.',
      'Thiên Di': 'Ra ngoài nhiều mưu sự, hợp đi xa, di chuyển, nghề tư vấn/môi giới; quý nhân là người có học.',
      'Nô Bộc': 'Bạn bè trí thức nhưng quan hệ dễ thay đổi, ít người gắn bó lâu.',
      'Quan Lộc': 'Hợp nghề trí tuệ: kế hoạch, kỹ thuật, giáo dục, tư vấn, tôn giáo; nghề nghiệp hay thay đổi.',
      'Điền Trạch': 'Nhà cửa thay đổi nhiều lần, dễ chuyển chỗ ở; nên thuê/đầu tư linh hoạt.',
      'Phúc Đức': 'Tâm trí năng động, thích suy ngẫm, ưa tôn giáo triết học; hưởng phúc về tinh thần hơn vật chất.',
      'Phụ Mẫu': 'Cha mẹ trí thức, hiền; có thể sống xa hoặc quan hệ thay đổi theo thời.',
    },
    combos:
      'Thiên Cơ + Thái Âm (tại Dần/Thân): "Cơ Nguyệt" thông tuệ, hợp văn chương kế hoạch. + Thiên Lương (Thìn/Tuất): "Cơ Lương" cách thầy/cố vấn, thanh cao. + Cự Môn (Mão/Dậu): "Cơ Cự" khẩu tài, hợp ăn nói nhưng thị phi. + Hóa Kỵ: lo nghĩ rối, mưu bất thành.',
    advancedGeneral:
      'Nằm trong bộ "Cơ Nguyệt Đồng Lương" — hợp công chức, chuyên môn, làm công ăn lương, kỵ kinh doanh mạo hiểm. Thiên Cơ rất sợ Hóa Kỵ và Cự Môn xung chiếu (thị phi, tính toán hỏng). Gặp Tả Hữu Khôi Việt thì mưu trí thành đại dụng.',
  },

  'Thái Dương': {
    name: 'Thái Dương',
    basic:
      'Thái Dương thuộc hành Hỏa, là chủ tinh tượng trưng mặt trời — theo truyền thuyết là thần Tỉ Can, thần của quang minh và bác ái. Chủ về quý hiển, công danh, danh tiếng, sự sáng sủa quang minh chính đại, lòng nhân ái rộng rãi; đồng thời tượng trưng cho người nam trong nhà (cha, chồng, con trai). Người Thái Dương tính cương trực, hào phóng, nhiệt thành, trọng danh dự, ưa hoạt động và thi ân — nhưng dễ phô trương, nóng vội, làm nhiều hưởng ít. Phải xét sáng – tối theo cung: từ Dần đến Ngọ là miếu vượng (mặt trời ban ngày) chủ quý hiển; từ Thân đến Tý là hãm địa (mặt trời lặn) chủ lao tâm, hữu danh vô thực, dễ đau mắt, hao tổn vì người. "Nhật xuất phù tang" (Thái Dương tại Mão) và "Nhật lệ trung thiên" (tại Ngọ) là quý cách. Đàn ông Nhật hãm dễ khắc/xa cha và con trai; đàn bà Nhật hãm vất vả vì chồng con.',
    byPalace: {
      'Mệnh': 'Tính cương trực, rộng lượng, ưa hoạt động xã hội, trọng danh dự. Miếu vượng thì quý hiển; hãm địa thì vất vả, dễ đau mắt, hao tâm vì người.',
      'Huynh Đệ': 'Anh em (đặc biệt em trai) có người thành đạt, được nhờ vả nếu Nhật sáng.',
      'Phu Thê': 'Với nữ: chồng giỏi giang, có danh; Nhật hãm thì chồng vất vả. Với nam: vợ tháo vát, đảm.',
      'Tử Tức': 'Quý con trai, con có chí khí, hiếu động; Nhật hãm thì con cái lao đao hoặc xa cách.',
      'Tài Bạch': 'Tiền đến từ danh tiếng, nghề công khai; thích thí xả, không giữ tiền chặt. Hãm thì làm nhiều hưởng ít.',
      'Tật Ách': 'Liên quan tim, mắt, huyết áp, đầu. Nhật hãm dễ bệnh về mắt và tuần hoàn.',
      'Thiên Di': 'Ra ngoài rạng danh, được trọng vọng, hợp hoạt động xã hội, đối ngoại. Nhật miếu tại Di rất tốt.',
      'Nô Bộc': 'Nhiều bạn rộng rãi, được người ngưỡng mộ; nhưng thi ân khó mong báo đáp.',
      'Quan Lộc': 'Quý cách công danh: hợp chính trị, giáo dục, truyền thông, nghề công khai. Nhật miếu tại Quan là quan lộc hiển hách.',
      'Điền Trạch': 'Nhà hướng sáng, dương trạch tốt; sản nghiệp do tự lập, dễ tán nếu Nhật hãm.',
      'Phúc Đức': 'Tâm sáng, lạc quan, thích làm việc thiện; hưởng phúc nhờ uy danh. Hãm thì lao tâm vì người khác.',
      'Phụ Mẫu': 'Tượng người cha — cha có uy, có danh; Nhật hãm hoặc gặp sát thì cha vất vả, sớm xa cách cha.',
    },
    combos:
      'Thái Dương + Thái Âm (Sửu/Mùi "Nhật Nguyệt đồng cung", hoặc đối chiếu): âm dương điều hòa, quý hiển nếu sáng. + Thiên Lương (Mão/Dậu): "Nhật Lương" thanh quý, hợp giáo dục pháp luật. + Cự Môn (Dần/Thân): "Cự Nhật" khẩu tài, hợp ngoại giao, ăn nói. + Hóa Lộc/Hóa Quyền: danh lợi song toàn.',
    advancedGeneral:
      'Xét miếu hãm theo giờ/cung (Dần→Ngọ là sáng, Thân→Tý là tối) cực quan trọng. "Nhật xuất phù tang" (Thái Dương tại Mão) rất quý. Nhật hãm cần Hóa Lộc/Quyền hoặc Khôi Việt cứu. Đàn ông Nhật hãm khắc cha/con trai; đàn bà Nhật hãm vất vả vì chồng con.',
  },

  'Vũ Khúc': {
    name: 'Vũ Khúc',
    basic:
      'Vũ Khúc thuộc hành Kim, là Bắc Đẩu tinh — theo truyền thuyết là Vũ Vương, thần của vũ dũng và đại phú; trên trời coi về tuổi thọ, vào số mệnh là chính tài tinh chủ quản tiền bạc của cải. Người Vũ Khúc cương cường, quả đoán, thực tế, làm nhiều hơn nói, giỏi tài chính và quyết đoán — nhưng là "cô quả tinh", tính cứng, ít mềm mỏng, dễ cô đơn trong tình cảm. Sao này rất sợ bị kiềm chế hoặc lạc hãm; rất cần Lộc Tồn và ưa gặp Thái Âm, lấy hai sao Thiên Phủ – Thiên Lương làm trợ lực. Gặp Lộc Tồn/Hóa Lộc + Thiên Mã thì phát tài lớn ("Lộc Mã giao trì"); hội Tham Lang thì thiếu niên bất lợi (phát muộn); đồng cung Thất Sát – Hỏa Tinh thì vì tiền bạc mà bị hại; ngộ Kình Dương – Đà La thì cô khắc; gặp Phá Quân khó bề hiển đạt. Tuổi Giáp, tuổi Kỷ thì phúc hậu, xuất tướng nhập tướng. Nữ mệnh nhiều cát tinh là mệnh phụ; bị xung phá tất cô khắc, muộn chồng con.',
    byPalace: {
      'Mệnh': 'Quả cảm, thực tế, giỏi tài chính, làm nhiều hơn nói; tính cương, ít lãng mạn, dễ cô độc. Hợp võ, kinh tài, kỹ thuật.',
      'Huynh Đệ': 'Anh em ít, mỗi người một phương, tình cảm nhạt nhưng có người giỏi tiền bạc.',
      'Phu Thê': 'Cô khắc — kết hôn muộn tốt hơn; phối ngẫu cứng cỏi, thực tế. Gặp sát tinh dễ hình khắc, ly tán.',
      'Tử Tức': 'Con ít, con cứng cỏi tự lập; quan hệ thiên về lý hơn tình.',
      'Tài Bạch': 'Cách tài tinh đắc địa: giỏi kiếm và giữ tiền, hợp tài chính, kinh doanh. Gặp Lộc là phú cách.',
      'Tật Ách': 'Bệnh về phổi, hô hấp, răng xương, vết thương do kim khí/phẫu thuật.',
      'Thiên Di': 'Ra ngoài làm ăn về tiền bạc thuận, hợp tha hương lập nghiệp; cương trực nên dễ va chạm.',
      'Nô Bộc': 'Bạn bè ít nhưng thực chất; quan hệ dựa trên lợi ích/công việc.',
      'Quan Lộc': 'Hợp tài chính, ngân hàng, quân đội, kỹ thuật, kinh doanh; sự nghiệp do quyết đoán mà thành.',
      'Điền Trạch': 'Có khả năng tích lũy bất động sản, két sắt; sản nghiệp do tự lập.',
      'Phúc Đức': 'Thực tế, ít hưởng nhàn, hay lo việc tiền bạc; phúc đến từ lao động.',
      'Phụ Mẫu': 'Cha mẹ nghiêm, cương; tình cảm thiên lý, dễ thiếu sự dịu dàng.',
    },
    combos:
      'Vũ Khúc + Thiên Phủ: tài khố song toàn, phú cách. + Thiên Tướng: "Vũ Tướng" cách quản trị tài chính. + Thất Sát: "Vũ Sát" quyết liệt, hợp võ/kỹ thuật, dễ thương tật nếu gặp sát. + Phá Quân: hao tán, làm ăn thăng trầm. + Tham Lang (Sửu/Mùi): "Vũ Tham" — hoạnh phát hoạnh phá, gặp Hỏa/Linh thành cách phát tài lớn.',
    advancedGeneral:
      'Vũ Khúc gặp Hóa Lộc/Lộc Tồn là phú cách; gặp Hóa Kỵ thì khó khăn tiền bạc, kiện tụng. Vũ Tham + Hỏa Tinh (Linh Tinh) = "Hỏa Tham/Hỏa Vũ" hoạnh phát. Cô khắc tinh nên cung Phu Thê/Tử Tức cần thêm cát tinh điều hòa.',
  },

  'Thiên Đồng': {
    name: 'Thiên Đồng',
    basic:
      'Thiên Đồng thuộc hành Thủy, là Nam Đẩu tinh đứng hàng thứ tư, chủ tể của cung Phúc Đức nên hóa khí là Phúc; là Văn Vương — thần của dung hòa, ôn thuận. Người Thiên Đồng nhiều khiêm tốn, bẩm tính ôn hòa hiền lành, văn mặc tinh thông, lạc quan giàu cảm xúc, nhiều ý chí nhưng không hung bạo; có hậu phúc nhưng dễ ỷ lại, an phận, thiếu động lực phấn đấu. Là phúc tinh nên cần gặp một chút sát tinh (Kình, Đà, Hỏa, Linh) để "kích phát" mới có chí tiến thủ; hoàn toàn không sát thì an nhàn kém phấn đấu. Cần các sao tốt trợ lực thì phúc mới thêm đẹp; gặp Tả Hữu, Văn Xương, Thiên Lương thì quý hiển (rất tốt cho người tuổi Nhâm, Ất). Hãm địa có Tứ Sát xung phá thì nữ mệnh hình phu khắc tử; hội Thiên Lương có Thái Âm chiếu dễ làm lẽ hoặc đi tu. Thuộc bộ "Cơ Nguyệt Đồng Lương" — hợp làm công, chuyên môn ổn định.',
    byPalace: {
      'Mệnh': 'Tính ôn hòa, vui vẻ, nhân hậu, có phúc; nhưng thiếu quyết đoán, dễ an phận. Cần sát tinh kích thích mới có động lực thành công ("ngộ sát xung khởi").',
      'Huynh Đệ': 'Anh em hòa thuận, tình cảm tốt, biết nương nhau.',
      'Phu Thê': 'Phối ngẫu hiền hòa, tình cảm, dễ chiều; hôn nhân êm ấm nếu không gặp sát tinh.',
      'Tử Tức': 'Con cái hiền, tình cảm, có phúc; quan hệ cha mẹ - con cái gần gũi.',
      'Tài Bạch': 'Tiền đến nhẹ nhàng, hưởng thụ phúc tài; ít có chí làm giàu lớn, dễ tiêu xài an nhàn.',
      'Tật Ách': 'Bệnh nhẹ, liên quan bàng quang, thận, khí huyết, béo phì; phục hồi tốt nhờ phúc tinh.',
      'Thiên Di': 'Ra ngoài được người thương, sống thoải mái, có quý nhân giúp nhẹ nhàng.',
      'Nô Bộc': 'Bạn bè tốt, hòa nhã, vui vẻ; được giúp đỡ chân tình.',
      'Quan Lộc': 'Hợp nghề nhàn, dịch vụ, nghệ thuật, phúc lợi; ít tranh đua, cần sao kích mới thăng tiến.',
      'Điền Trạch': 'Nhà cửa yên ấm, hưởng phúc gia trạch; sản nghiệp đến tự nhiên.',
      'Phúc Đức': 'Đại lợi — phúc tinh nhập phúc cung: an nhàn, lạc quan, sống thọ, hưởng thụ tinh thần.',
      'Phụ Mẫu': 'Cha mẹ hiền từ, thương con; quan hệ gia đình ấm áp.',
    },
    combos:
      'Thiên Đồng + Thái Âm (Tý/Ngọ): "Đồng Âm" cách thanh nhã, đa cảm, hợp văn nghệ; Tý là "Thủy trừng quế ngạc" rất đẹp. + Thiên Lương (Dần/Thân): "Đồng Lương" cách phúc thọ, hợp tư vấn, y dược, công chức. + Cự Môn (Sửu/Mùi): "Đồng Cự" thị phi, lao tâm.',
    advancedGeneral:
      'Phúc tinh ưa gặp một chút sát tinh (Kình/Đà/Hỏa/Linh) để "kích phát" ý chí — gọi là "Đồng ngộ sát phương vi kỳ". Hoàn toàn không sát thì an phận, kém phấn đấu. Thuộc bộ "Cơ Nguyệt Đồng Lương", hợp làm công, chuyên môn ổn định.',
  },

  'Liêm Trinh': {
    name: 'Liêm Trinh',
    basic:
      'Liêm Trinh thuộc hành Mộc (khí Hỏa), là Bắc Đẩu đệ ngũ tinh, ở số coi về quyền lệnh — theo truyền thuyết là Phí Trọng, thần của những việc lắt léo, không ngay thẳng. Nếu không được miếu vượng địa lại phạm Quan Phù thì hóa khí thành Tù: tính lang độc, không học lễ nghĩa, dễ thị phi quan tụng. Ở Thân – Mệnh là sao Đào Hoa thứ hai: ham đánh bạc, mê sắc mà mang tai tiếng; cá tính mạnh, bản lĩnh, đa tài đa tình, lúc cương lúc nhu. Đắc địa gặp Lộc Tồn thì phú quý; gặp Văn Xương thì bặt thiệp; gặp Thất Sát hiển đạt về võ chức; tại cung Quan Lộc có uy quyền. Giao hội Cự Môn nơi hãm địa thường can dự thị phi; ngộ tài tinh hãm địa thì phá hao tổ nghiệp; gặp Thiên Hình – Hóa Kỵ hay bị chứng xuất huyết; gặp Bạch Hổ thường tù tội; gặp Hỏa Tinh hãm vào đất Không Vong thì dễ tự ải. ("Liêm Tham Tị Hợi ngộ cát phúc doanh phong, ưng quá tam tuần hậu — tu phòng bất thiện chung.")',
    byPalace: {
      'Mệnh': 'Cá tính mạnh, bản lĩnh, đa tài đa tình, lúc cương lúc nhu. Đắc cách thì chính trực có quyền; gặp sát Kỵ thì thị phi, quan tụng, tù ngục.',
      'Huynh Đệ': 'Anh em cá tính, dễ bất hòa nếu gặp sát; có người tài nhưng khó hợp.',
      'Phu Thê': 'Phối ngẫu cá tính, đa tình; tình duyên nhiều trắc trở, cần kết hôn muộn và chọn người chín chắn.',
      'Tử Tức': 'Con cá tính, thông minh, bướng; quan hệ thăng trầm.',
      'Tài Bạch': 'Kiếm tiền bằng tài năng, giao thiệp; tài lộc bất định, kỵ Hóa Kỵ (phá tài, kiện tụng vì tiền).',
      'Tật Ách': 'Bệnh về huyết, tim, kinh nguyệt, thần kinh; gặp sát dễ tai nạn, mổ xẻ, đổ máu.',
      'Thiên Di': 'Ra ngoài giao thiệp rộng, dễ thành công nhờ quan hệ nhưng cũng dễ vướng thị phi, kiện tụng.',
      'Nô Bộc': 'Bạn bè phức tạp, có người vì lợi; cần chọn lọc quan hệ.',
      'Quan Lộc': 'Hợp nghề kỷ luật (quân, cảnh, pháp luật), kỹ thuật, kinh doanh giao tế. Đắc cách là quyền uy; hãm thì hoạn lộ trắc trở.',
      'Điền Trạch': 'Sản nghiệp biến động, dễ mua đi bán lại; gặp sát hao tài về nhà đất.',
      'Phúc Đức': 'Tâm tư phức tạp, nhiều suy nghĩ, hưởng thụ thiên về cảm xúc; gặp sát dễ phiền muộn.',
      'Phụ Mẫu': 'Quan hệ cha mẹ có khoảng cách hoặc nghiêm khắc; gặp sát thì xa cách hoặc bất hòa.',
    },
    combos:
      'Liêm Trinh + Thiên Phủ (Thìn/Tuất): cách "Liêm Phủ" ổn định, hợp tài quản trị. + Thiên Tướng (Tý/Ngọ): "Liêm Tướng" trung lương, có quyền. + Thất Sát (Sửu/Mùi): "Liêm Sát" quyết liệt, dễ tai họa nếu gặp sát. + Tham Lang (Tị/Hợi): đào hoa nặng, phong lưu. + Phá Quân (Mão/Dậu): "Liêm Phá" gian nan, dễ thị phi.',
    advancedGeneral:
      'Liêm Trinh đắc cách (gặp Lộc, Tả Hữu, Khôi Việt) thì là người chính trực có quyền uy. Tối kỵ Hóa Kỵ + Sát tinh = "Liêm Trinh hãm địa ngộ Kỵ": quan tụng, tù ngục, tai họa máu. Liêm Trinh + Văn Xương/Khúc dễ vướng văn thư kiện tụng.',
  },

  'Thiên Phủ': {
    name: 'Thiên Phủ',
    basic:
      'Thiên Phủ thuộc hành Thổ, là Nam Đẩu đệ nhất tinh, chủ đế của cung Tài Bạch, coi về quyền và phúc — là "giải tai ách chi tinh", trên số mệnh làm thần của y lộc, tài bạch, điền trạch. Là kho tài (tài khố, lộc khố), thường đứng phụ tá cho Tử Vi, có khả năng chế phục Kình Dương – Đà La, cải hóa Hỏa Tinh – Linh Tinh. Người Thiên Phủ tướng mạo thanh kỳ, bẩm tính ôn lương đoan nhã, điềm đạm thực tế, độ lượng, biết lo xa và tích lũy, có tài quản lý — nhưng thận trọng quá hóa bảo thủ, thủ cựu, thiếu xông pha. Hội cùng Thái Dương, Văn Xương – Văn Khúc thì dễ công danh khoa bảng; gặp Lộc Tồn – Vũ Khúc thì giàu to. Rơi vào Không Vong, Tứ Sát thì kho rỗng ("lộ khố / không khố") trở thành kẻ bị cô lập, giảm phú. Nữ mệnh Thiên Phủ vẻ người thanh thoát, vượng phu ích tử, tháo vát thông minh, dù gặp xung phá cũng không đến nỗi trôi giạt.',
    byPalace: {
      'Mệnh': 'Tính ôn hòa, độ lượng, thực tế, biết lo xa, có tài quản lý tiền của; nhưng thận trọng quá hóa bảo thủ. Đắc cách là phú quý ổn định.',
      'Huynh Đệ': 'Anh em hòa thuận, có người khá giả, biết nương nhau.',
      'Phu Thê': 'Phối ngẫu đảm đang, biết lo kinh tế, gia đình ổn định; hôn nhân bền nếu không gặp Không Kiếp.',
      'Tử Tức': 'Con cái hiền, biết lo, có hậu; quan hệ gia đình êm.',
      'Tài Bạch': 'Tài khố nhập tài cung — rất tốt: biết kiếm và tích lũy, của cải dồi dào ổn định.',
      'Tật Ách': 'Ít bệnh nặng, liên quan tỳ vị, tiêu hóa; sức khỏe nhìn chung bền.',
      'Thiên Di': 'Ra ngoài gặp may về tài, được người tin cậy, hợp buôn bán quản lý nơi xa.',
      'Nô Bộc': 'Bạn bè, thuộc hạ đáng tin, biết giúp về kinh tế.',
      'Quan Lộc': 'Hợp tài chính, hành chính, quản trị, kho quỹ; sự nghiệp ổn định, ít sóng gió.',
      'Điền Trạch': 'Rất tốt — dễ có nhiều nhà đất, sản nghiệp tích lũy vững, có của để dành.',
      'Phúc Đức': 'Phúc dày, sống ung dung, biết hưởng thụ điều độ, thọ.',
      'Phụ Mẫu': 'Cha mẹ hiền hậu, có của; được hưởng phúc ấm gia đình.',
    },
    combos:
      'Thiên Phủ + Tử Vi: đế gặp khố, đại phú quý ổn định. + Vũ Khúc: tài khố song mỹ, giỏi tài chính. + Liêm Trinh: ổn định có mưu. Thiên Phủ "lộ khố" (gặp Tuần/Triệt hoặc Không Kiếp đồng cung) thì kho trống — giảm phú; cần Lộc Tồn/Hóa Lộc làm đầy kho.',
    advancedGeneral:
      'Thiên Phủ kỵ "không khố/lộ khố": gặp Địa Không, Địa Kiếp, Tuần, Triệt đồng cung thì kho rỗng, giảm cát. Ưa Lộc Tồn/Hóa Lộc/Tả Hữu chầu về (kho đầy). Thiên Phủ luôn đối xung Thất Sát — cần xét tam hợp Sát Phá Tham để biết động tĩnh.',
  },

  'Thái Âm': {
    name: 'Thái Âm',
    basic:
      'Thái Âm là tinh hoa của hành Thủy, chủ cung Điền Trạch nên hóa khí thành Phú; cùng với Thái Dương tượng trưng cho nghi biểu của trời, chủ người nữ trong nhà (mẹ, vợ, con gái). Người Thái Âm đắc địa thì thông minh, tuấn tú, bẩm tính đoan nhã thuần lương, ôn nhu tế nhị, lãng mạn, giàu trực giác và mỹ cảm. Phải xét sáng – tối: Mão, Thìn, Tị, Ngọ là hãm địa (đa sầu vất vả); Dậu, Tuất, Hợi, Tý, Sửu là đắc địa, miếu nhất tại Hợi ("Nguyệt lãng thiên môn") và rất đẹp tại Tý ("Nguyệt sinh thương hải") — phú quý, dung mạo đẹp, văn tài. Rất sợ Kình Dương – Đà La đồng cung; sợ Liêm Trinh phạm Thất Sát xung phá dễ bị tàn tật. Có ánh sáng (miếu vượng) mới có phúc, thất hãm thì hung. Hãm ở Tật Ách gặp Kình Đà có mục tật (bệnh mắt), gặp Hỏa Linh hay tai nạn, gặp Tham Sát hại mắt; hãm ở Phu Thê hội Tang Môn – Bạch Hổ phải thận trọng với vợ. Đàn ông Nguyệt hãm dễ khắc/xa mẹ; đàn bà thì đa đoan.',
    byPalace: {
      'Mệnh': 'Tính tình ôn hòa, nhạy cảm, thẩm mỹ cao, giàu tình cảm; Nguyệt sáng thì tài lộc tốt, dung mạo đẹp; hãm thì đa sầu, vất vả.',
      'Huynh Đệ': 'Chị em gái thân thiết; anh em hòa thuận nếu Nguyệt sáng.',
      'Phu Thê': 'Với nam: vợ đẹp, dịu dàng, đảm; với nữ: chồng tâm lý. Nguyệt hãm thì tình duyên đa đoan.',
      'Tử Tức': 'Quý con gái; con cái tình cảm, hiền. Nguyệt hãm thì hiếm muộn hoặc con vất vả.',
      'Tài Bạch': 'Giỏi tích lũy, tiền của tăng dần; hợp tài sản, bất động sản. Nguyệt sáng là phú.',
      'Tật Ách': 'Liên quan thận, mắt, nội tiết, khí huyết (nữ: kinh nguyệt). Nguyệt hãm dễ suy nhược, âm hư.',
      'Thiên Di': 'Ra ngoài (nhất là ban đêm/xứ lạnh) gặp quý nhân nữ, hợp tha hương cầu tài.',
      'Nô Bộc': 'Bạn bè tình cảm, có quý nhân nữ giúp đỡ.',
      'Quan Lộc': 'Hợp nghề liên quan tài sản, văn hóa nghệ thuật, làm đẹp, nữ giới; Nguyệt sáng tại Quan rất tốt.',
      'Điền Trạch': 'Cực tốt — Thái Âm chủ điền trạch: nhiều nhà đất, sản nghiệp dồi dào nếu Nguyệt sáng.',
      'Phúc Đức': 'Tâm hồn lãng mạn, ưa thanh tịnh, hưởng phúc tinh thần; Nguyệt sáng thì an vui, thọ.',
      'Phụ Mẫu': 'Tượng người mẹ — mẹ hiền, đảm; Nguyệt hãm hoặc gặp sát thì sớm xa mẹ hoặc mẹ vất vả.',
    },
    combos:
      'Thái Âm + Thái Dương: nhật nguyệt điều hòa (xem sáng/tối). + Thiên Cơ (Dần/Thân): "Cơ Nguyệt" thông tuệ. + Thiên Đồng (Tý/Ngọ): "Đồng Âm" thanh nhã đa cảm. + Văn Xương/Văn Khúc: "Nguyệt Lãng thiên môn" văn tài, nổi danh. + Lộc Tồn/Hóa Lộc: phú cách điền tài.',
    advancedGeneral:
      'Phải xét sáng/tối: Thái Âm tại Dậu→Sửu (đêm) là miếu vượng — rất quý; tại Mão→Ngọ (ngày) là hãm — đa cảm vất vả. "Nguyệt sinh thương hải" (Âm tại Tý) và "Nguyệt lãng thiên môn" (Âm tại Hợi) là quý cách. Đàn ông Nguyệt hãm dễ khắc/xa mẹ vợ; đàn bà thì đa đoan.',
  },

  'Tham Lang': {
    name: 'Tham Lang',
    basic:
      'Tham Lang khí thuộc Mộc, thể thuộc Thủy, là Bắc Đẩu tinh, "giải ách chi thần", hóa khí là Đào Hoa — chủ thần của họa và phúc; theo truyền thuyết là Đát Kỷ, thần của dục vọng và vật chất. Người Tham Lang ưa phóng đãng, thích cao ngâm phiêu lãng, đa tài đa nghệ, giao tế giỏi, tính cương mãnh có mưu cơ, bồng bềnh chìm nổi, yêu ghét khó lường; "khôn khéo thật khôn khéo mà vụng dại cũng thật vụng dại". Ở miếu địa vừa có thể tạo phúc vừa có thể gây họa. Đặc biệt cư miếu địa ngộ Hỏa Tinh – Linh Tinh thì vũ chức quyền quý (cách hoạnh phát nổi tiếng), tuổi Mậu – Kỷ hợp cục. Hội Phá Quân thì mê hoa mến rượu mà tổn mạng; cùng Lộc Tồn thì tốt lành; hội Song Hao mọi việc hư hoa; gặp Liêm Trinh hãm địa tù tội; gặp Thất Sát dễ tai nạn quan tụng; Kình Đà xung phá có bệnh trĩ; Hình Kỵ xung phá nhiều vết thương sẹo. Thủ Thân – Mệnh thì trai đa tình, gái lẳng lơ, nữ thường bất khiết trinh. Duy ngộ Không Vong – Hoa Cái thì kết quả ngược lại: đoan chính, hợp tu hành huyền học.',
    byPalace: {
      'Mệnh': 'Đa tài, hoạt bát, giỏi giao tế, ham muốn nhiều, đào hoa; dễ ham vui sa đà. Gặp Hỏa/Linh thành cách hoạnh phát; gặp Không Kiếp lại hợp tu hành, huyền học.',
      'Huynh Đệ': 'Anh em đông, quan hệ xã giao rộng nhưng dễ vì lợi.',
      'Phu Thê': 'Đào hoa — tình duyên phong phú, dễ đa tình/ngoại tình; nên kết hôn muộn, chọn người chín chắn.',
      'Tử Tức': 'Con cái thông minh hiếu động, đào hoa; quan hệ vui nhưng cần dạy dỗ.',
      'Tài Bạch': 'Tiền từ giao tế, đầu cơ, nghề thời vận; gặp Hỏa/Linh thì hoạnh tài, nhưng cũng dễ hoạnh phá.',
      'Tật Ách': 'Bệnh về gan, thận, sinh dục, do tửu sắc; gặp sát dễ bệnh do phóng túng.',
      'Thiên Di': 'Ra ngoài giao du rộng, nhiều cơ hội và cám dỗ, hợp nghề xã giao.',
      'Nô Bộc': 'Bạn bè đông, vui nhưng tạp; cần chọn lọc kẻo bị lợi dụng.',
      'Quan Lộc': 'Hợp nghề giao tế, ngoại giao, kinh doanh, giải trí, nghệ thuật; thăng trầm theo thời vận.',
      'Điền Trạch': 'Sản nghiệp biến động; gặp Hỏa/Linh dễ hoạnh phát về nhà đất.',
      'Phúc Đức': 'Ham hưởng thụ, thích vui chơi, đa dục; gặp Không Kiếp lại quay về tâm linh, tu tập.',
      'Phụ Mẫu': 'Quan hệ cha mẹ xã giao, có khoảng cách tình cảm.',
    },
    combos:
      'Tham Lang + Hỏa Tinh / Linh Tinh: "Hỏa Tham / Linh Tham" — hoạnh phát công danh tài lộc bất ngờ (cách phú quý nổi tiếng). + Vũ Khúc (Sửu/Mùi): "Vũ Tham" phát muộn nhưng lớn. + Tử Vi (Mão/Dậu): thiên hưởng thụ, cần tiết chế. + Liêm Trinh (Tị/Hợi): "phiếm thủy đào hoa" — đào hoa nặng. + Không Kiếp: giảm dục, hợp tu hành, nghiên cứu huyền học.',
    advancedGeneral:
      'Tham Lang + Hỏa/Linh đồng cung hoặc hội chiếu là cách "hoạnh phát" nổi tiếng (giàu nhanh, nổi danh nhanh) nhưng dễ "hoạnh phá" nếu thêm Kình Đà Kỵ. Tham Lang gặp Không Kiếp/Hoa Cái/Thiên Hình thì chuyển hướng tâm linh, tôn giáo. Nằm trong bộ "Sát Phá Tham" — chủ biến động lớn.',
  },

  'Cự Môn': {
    name: 'Cự Môn',
    basic:
      'Cự Môn thuộc hành Thủy (kiêm Thổ), là Bắc Đẩu đệ nhị tinh, hóa khí thành Ám (che tối) — theo truyền thuyết là Mã Thiên Kim, thần của thị phi và nghi hoặc. Sao này coi phẩm chất vạn vật, chủ về thị phi, ám muội, đa nghi, dối trá, tiến thoái lưỡng nan; tính tình ngoài mặt thế này trong thế khác, ít hợp với người thân, giao du trước tốt sau xấu. Mặt khác Cự Môn cho khẩu tài, óc phân tích lý luận, khảo cứu sâu — hợp nghề "lấy miệng làm nghề" (luật sư, giáo dục, truyền thông, ngoại giao, buôn bán). Đóng tại 12 cung nếu không vào miếu địa thường bôn ba lao bác. Rất cần Thái Dương miếu vượng hội chiếu để "hóa ám vi minh" (biến thị phi thành danh tiếng); gặp Thái Dương thì hung cát tương bán. Đi với Kình Dương – Đà La thì "trai ăn trộm, gái ăn sương"; có Hỏa Linh xung chiếu thêm Bạch Hổ hay tam hợp Sát tinh tụ thì bị hỏa ách (cháy nhà, bị bỏng). Đại tiểu hạn ngộ Cự Môn hãm địa tai nạn không nhỏ.',
    byPalace: {
      'Mệnh': 'Khẩu tài, lý luận giỏi, óc phân tích, khảo cứu; nhưng đa nghi, hay tranh biện, dễ vướng thị phi. Đắc cách thì nổi danh nhờ tài ăn nói.',
      'Huynh Đệ': 'Anh em dễ bất hòa, lắm lời qua tiếng lại; ít nương tựa.',
      'Phu Thê': 'Hôn nhân lắm khẩu thiệt, cãi vã, hiểu lầm; nên kết hôn muộn, chọn người bao dung.',
      'Tử Tức': 'Con cái bướng, hay cãi; quan hệ cha mẹ - con nhiều va chạm lời nói.',
      'Tài Bạch': 'Kiếm tiền bằng miệng (môi giới, buôn bán, tư vấn); dễ tranh chấp tiền bạc.',
      'Tật Ách': 'Bệnh về miệng, họng, dạ dày, tiêu hóa; gặp sát dễ bệnh ngầm khó phát hiện.',
      'Thiên Di': 'Ra ngoài hợp nghề ăn nói, nhưng dễ vướng tranh cãi, thị phi nơi xa.',
      'Nô Bộc': 'Bạn bè hay thị phi, dễ bị nói xấu, phản bội bằng lời.',
      'Quan Lộc': 'Hợp luật sư, giáo dục, truyền thông, ngoại giao, kinh doanh; thành công nhờ tài ngôn luận.',
      'Điền Trạch': 'Nhà cửa dễ tranh chấp (kiện tụng đất đai); hay đổi chỗ ở.',
      'Phúc Đức': 'Hay suy nghĩ, lo lắng, nghi ngờ; tâm bất an nếu Cự hãm gặp sát.',
      'Phụ Mẫu': 'Quan hệ cha mẹ nhiều khẩu thiệt, hiểu lầm; dễ xa cách.',
    },
    combos:
      'Cự Môn + Thái Dương (Dần/Thân "Cự Nhật"): Nhật sáng chiếu Cự — khẩu tài thành danh, hợp ngoại giao, pháp luật, rất quý. + Thiên Cơ (Mão/Dậu "Cơ Cự"): khéo nói nhưng nhiều biến động thị phi. + Thiên Đồng (Sửu/Mùi "Đồng Cự"): lao tâm khẩu thiệt. + Hóa Lộc/Quyền: lời nói có giá trị, sinh tài; + Hóa Kỵ: thị phi, kiện tụng nặng.',
    advancedGeneral:
      'Cự Môn rất cần Thái Dương miếu vượng hội chiếu để "hóa ám vi minh" (biến thị phi thành danh tiếng). Cự Môn + Hóa Kỵ hoặc gặp Kình Đà = thị phi, kiện tụng, tai tiếng nặng. Cự + Hỏa/Linh dễ tai họa lời nói. Đắc cách hợp các nghề "lấy miệng làm nghề".',
  },

  'Thiên Tướng': {
    name: 'Thiên Tướng',
    basic:
      'Thiên Tướng thuộc hành Thủy, là Nam Đẩu tinh, chủ về quyền tước, rất phúc thiện; hóa khí là Ấn (ấn tín, quan ấn), chuyên trợ giúp cho Tử Vi — theo truyền thuyết là Văn Thái Sư, thần của từ ái và trung trinh. Người Thiên Tướng ăn nói thành thực, chắc chắn, đoan chính, có trách nhiệm; thấy ai hoạn nạn dễ động lòng trắc ẩn, thấy việc ác dễ nổi khí bất bình; trọng lễ nghi, hợp vai trò phụ tá – tham mưu – điều phối. Đóng đâu phúc lộc đó, chí không vì hung sát mà đổi; ở cung Quan Lộc thì hiển vinh. Hội Tả Hữu – Văn Xương – Văn Khúc thì vị chí công khanh; ở hãm địa gặp Liêm – Tham – Vũ – Phá – Kình Đà xung phá thì phải dùng tài thao vát để an thân; có Hỏa Linh xung phá e tàn tật. Luận theo cách bị "giáp": "Hình Kỵ giáp Ấn" (Thiên Hình/Hóa Kỵ kẹp) là đại kỵ — dễ tai họa, tù ngục; "Tài Ấm giáp Ấn" (Lộc + Thiên Lương kẹp) là quý. Nữ mệnh Thiên Tướng thông minh, đoan trang, chí cao; gặp xung phá thì thành thân phận tì thiếp.',
    byPalace: {
      'Mệnh': 'Trung hậu, công chính, có trách nhiệm, ưa giúp người, trọng lễ nghi; hợp vai trò phụ tá, quản trị. Cần Lộc/Tả Hữu để đắc dụng.',
      'Huynh Đệ': 'Anh em tương trợ, có nghĩa khí; được anh em giúp.',
      'Phu Thê': 'Phối ngẫu đoan chính, biết chăm lo, có trách nhiệm; hôn nhân ổn nếu không bị "Hình Kỵ giáp Ấn".',
      'Tử Tức': 'Con cái ngoan, có nghĩa, biết vâng lời; quan hệ tốt.',
      'Tài Bạch': 'Tiền từ công việc ổn định, quản lý, phục vụ; tài lộc đều đặn không đột biến.',
      'Tật Ách': 'Liên quan da, bài tiết, tiết niệu; sức khỏe trung bình ổn.',
      'Thiên Di': 'Ra ngoài được quý nhân tin dùng, hợp vai trò trợ lý, đại diện.',
      'Nô Bộc': 'Bạn bè, cấp dưới trung thành, biết hỗ trợ.',
      'Quan Lộc': 'Hợp hành chính, quản trị, tư pháp, dịch vụ công, vai trò tham mưu/phó; ổn định và được tín nhiệm.',
      'Điền Trạch': 'Nhà cửa ổn định, có thể quản lý tài sản cho người khác; sản nghiệp đều.',
      'Phúc Đức': 'Tâm chính trực, sống có nguyên tắc, hưởng phúc nhờ uy tín và sự tử tế.',
      'Phụ Mẫu': 'Cha mẹ đoan chính, có trách nhiệm; được dạy dỗ nề nếp.',
    },
    combos:
      'Thiên Tướng + Tử Vi: "Tử Tướng" quản trị trung hậu. + Vũ Khúc: "Vũ Tướng" tài quản. + Liêm Trinh: "Liêm Tướng" có quyền lại trung. Thiên Tướng kỵ bị Cự Môn (Hóa Kỵ) và Thiên Lương kẹp hai bên = "Hình Kỵ giáp Ấn" — đại kỵ, dễ tai họa, mất chức; ưa "Tài Ấm giáp Ấn" (Lộc + Lương kẹp) là quý.',
    advancedGeneral:
      'Thiên Tướng luận theo cách bị "giáp" (hai cung kề): "Hình Kỵ giáp Ấn" (Thiên Hình/Hóa Kỵ kẹp) là hung; "Tài Ấm giáp Ấn" (Hóa Lộc/Lộc Tồn + Thiên Lương kẹp) là cát. Luôn đối xung Phá Quân — cần xét tổng thể Tử Phủ Vũ Tướng.',
  },

  'Thiên Lương': {
    name: 'Thiên Lương',
    basic:
      'Thiên Lương thuộc hành Thổ, là Nam Đẩu tinh cai quản việc thọ – yểu, hóa khí là Ấm (bóng che chở) và Phúc, chủ về phụ mẫu — theo truyền thuyết là Lý Thiên Vương, thần của quản trị, tổ chức, xếp đặt. Vào số mệnh thì tính tình lỗi lạc, vẻ người đầy đặn, có lòng chính trực vô tư, vào việc quả quyết; sinh nhàn thanh tú, ôn hòa, hình thần ẩn trọng, giỏi nói binh pháp — nhưng dễ cô độc, cao ngạo, thích làm "bề trên". Là "giải ách ấm tinh": gặp hung thường hóa giải được, không sợ Thái Tuế xung và Bạch Hổ phá, không bị Liêm Trinh – Hình Kỵ khắc hại, cũng không sợ Hỏa Linh gây can qua. Hội Văn Xương – Văn Khúc – Tả Hữu thì quyền vị lớn; ở cung Phúc Đức hội Thái Dương là cực phẩm chi quý (tuổi Mậu, Kỷ). Gặp Tấu Thư nổi danh kỳ lạ; gặp Đại – Tiểu Hao mưu việc khó thành; ngộ Thanh Long có hỉ tín; gặp Hao – Thiên Cơ – Sát tinh nên đi tu là hơn. Nữ mệnh Thiên Lương miếu địa vượng phu ích tử; rất kỵ Kình Đà xung phá gây tiếng xấu. Thuộc bộ "Cơ Nguyệt Đồng Lương".',
    byPalace: {
      'Mệnh': 'Chính trực, có nguyên tắc, thông tuệ, thích che chở người khác; hợp y dược, giáo dục, pháp luật, tư vấn. Có tài giải nạn ("ngộ nạn trình tường") nhưng dễ cô cao.',
      'Huynh Đệ': 'Có anh/chị như trưởng thượng che chở; được người lớn nâng đỡ.',
      'Phu Thê': 'Phối ngẫu hơn tuổi hoặc chín chắn, có tính trưởng thượng; nên lấy người lớn hơn cho bền.',
      'Tử Tức': 'Con cái có nề nếp, hiểu chuyện sớm; ít con hoặc con sống xa.',
      'Tài Bạch': 'Tiền đến từ chuyên môn, danh tiếng, được người tin cậy giao phó; không hợp đầu cơ.',
      'Tật Ách': 'Có "ấm" giải bệnh — bệnh nặng hóa nhẹ; liên quan tỳ vị, ngực. Hợp người làm y dược.',
      'Thiên Di': 'Ra ngoài gặp quý nhân lớn tuổi giúp đỡ, được kính trọng; hợp tha hương lập danh.',
      'Nô Bộc': 'Có bạn/quý nhân là bậc trưởng thượng, đáng tin.',
      'Quan Lộc': 'Hợp y, giáo, pháp luật, giám sát, tư vấn, hành chính; thành danh nhờ uy tín và chuyên môn.',
      'Điền Trạch': 'Được thừa kế hoặc có quý nhân cho/giúp về nhà đất; sản nghiệp ổn.',
      'Phúc Đức': 'Phúc thọ, tâm thanh cao, ưa tĩnh, có tín ngưỡng; được hưởng ấm phúc.',
      'Phụ Mẫu': 'Cha mẹ đức độ, che chở; được hưởng phúc ấm, dạy dỗ tử tế.',
    },
    combos:
      'Thiên Lương + Thái Dương (Mão/Dậu "Nhật Lương"): thanh quý, hợp giáo dục pháp luật, nổi danh nếu Nhật sáng (Mão). + Thiên Cơ (Thìn/Tuất "Cơ Lương"): mưu trí, hợp cố vấn, tôn giáo. + Thiên Đồng (Dần/Thân "Đồng Lương"): phúc thọ, hợp công chức, y dược. + Lộc Tồn: "Lương ngộ Lộc" thọ và sung túc.',
    advancedGeneral:
      'Thiên Lương là "giải ách ấm tinh" — gặp hung tinh thường hóa giải được ("phùng hung hóa cát"), nhưng bản thân ưa tĩnh, gặp Thiên Mã thì "Lương Mã phiêu đãng" dễ bôn ba bất định. Thuộc bộ "Cơ Nguyệt Đồng Lương". Cô khắc nhẹ — cung tình cảm cần thêm cát tinh.',
  },

  'Thất Sát': {
    name: 'Thất Sát',
    basic:
      'Thất Sát là Nam Đẩu tinh, thuộc Hỏa – Kim, là thượng tướng của tinh đẩu, làm "cô thần" cho sự thành bại — theo truyền thuyết là Hoàng Phi Hổ, thần của uy nghiêm và quyết liệt. Uy như thép của lưỡi kiếm, tính tình thanh lương; người Thất Sát cương nghị, dũng cảm, độc lập, dám nghĩ dám làm, chịu được gian khổ — nhưng cuộc đời thường kinh lịch gian nan tân khổ, tính nóng, cô độc, nhiều thăng trầm lớn. Ở Mệnh cung mà vận hạn xấu dễ thành yểu chiết; đóng cung Quan Lộc thì cực tốt, biến họa ra phúc; tọa Tử Tức con cái cô đơn, cư Phu Thê chăn đơn gối chiếc. Gặp Tử Vi thì biến thành quyền mà giáng phúc; gặp Hỏa Tinh thì thành sát tinh làm lớn uy thế; gặp sao hung ở Sinh hương thì hành nghề đồ tể; hội Liêm Trinh hãm địa tại Thân – Mệnh mắc bệnh lao; ngộ Không Vong – Thiên Hình mắc họa lớn. Cung Thân – Mệnh có Thất Sát thường bị tai ương phá bại, chỉ nhờ Tử Vi – Lộc Tồn mới giải cứu được. Miếu địa Dần, Thân, Tý, Ngọ — "Thất Sát triêu đẩu" suốt đời tước lộc; nữ mệnh nơi vượng địa tiền bạc vô kể, có oai quyền, chí cao hơn con trai, bị tứ hung xung phá thì phiêu đãng.',
    byPalace: {
      'Mệnh': 'Quyết đoán, độc lập, có uy, dám xông pha; thích làm chủ, không thích lệ thuộc. Đắc cách (gặp Lộc Tướng) là tướng cách; gặp sát nặng thì lao đao, thương tật.',
      'Huynh Đệ': 'Anh em ít, mỗi người một ngả, tính độc lập, ít nương tựa.',
      'Phu Thê': 'Cô khắc — phối ngẫu cá tính mạnh; nên kết hôn muộn, dễ tụ ít tan nhiều nếu gặp sát.',
      'Tử Tức': 'Con ít, con cứng cỏi tự lập sớm; quan hệ thiên về tôn trọng hơn gần gũi.',
      'Tài Bạch': 'Tiền do tự lập, làm lớn ăn lớn, thăng trầm mạnh; hợp khai phá, kinh doanh mạo hiểm.',
      'Tật Ách': 'Dễ tai nạn, thương tích, mổ xẻ (gặp Kình Đà Hỏa Linh); bệnh về phổi, gan, ngoại thương.',
      'Thiên Di': 'Ra ngoài bôn ba, lập nghiệp xa, gặp cạnh tranh; hợp tha hương khai phá, có uy nơi xa.',
      'Nô Bộc': 'Bạn bè ít nhưng nghĩa khí; quan hệ dựa vào năng lực.',
      'Quan Lộc': 'Hợp quân đội, công an, kỹ thuật, kinh doanh khai phá, thể thao; sự nghiệp lớn nhưng nhiều sóng gió.',
      'Điền Trạch': 'Sản nghiệp tự tạo, biến động lớn; dễ "phá rồi lập".',
      'Phúc Đức': 'Tâm bận rộn, ít an nhàn, lao tâm lao lực; phúc đến từ tự thân phấn đấu.',
      'Phụ Mẫu': 'Quan hệ cha mẹ có khoảng cách hoặc xa sớm; cha mẹ nghiêm hoặc vất vả.',
    },
    combos:
      'Thất Sát + Tử Vi (Tị/Hợi): "Tử Sát hóa quyền" — uy quyền lớn, hợp lãnh đạo. + Vũ Khúc (Mão/Dậu): "Vũ Sát" quyết liệt, hợp võ/kỹ thuật/tài chính cứng. + Liêm Trinh (Sửu/Mùi): "Liêm Sát" — dễ tai họa, "Liêm Sát ngộ Hỏa" rất hung. Thất Sát luôn đối xung Thiên Phủ.',
    advancedGeneral:
      'Thuộc bộ "Sát Phá Tham" chủ đại biến động. Thất Sát ưa gặp Lộc (Hóa Lộc/Lộc Tồn) và Tử Vi (chế ngự) thì thành tướng cách phú quý; tối kỵ Kình Đà Hỏa Linh Không Kiếp hội tụ — chủ thương tật, tai họa, yểu. "Thất Sát triêu đẩu" (cư Dần/Thân Tý Ngọ đắc cách) là quý.',
  },

  'Phá Quân': {
    name: 'Phá Quân',
    basic:
      'Phá Quân thuộc hành Thủy, là Bắc Đẩu tinh, làm thần coi các việc Nô Bộc – Phu Thê – Tử Tức — theo truyền thuyết là Trụ Vương, thần của phá hoại và tiêu hao; trên trời là sát khí, vào số là Hao. Tý – Ngọ là miếu địa. Chủ về sự hung bạo, xảo trá, tính tình gian hoạt khó hợp với ai, hành động thường gây hại cho người hơn làm lợi, coi lục thân như kẻ thù — nhưng cũng là sao của tiên phong, dám phá cũ lập mới, sáng tạo, không theo lối mòn. Người tuổi Giáp, tuổi Quý hợp cách thì phú quý; hãm địa gặp Tứ Sát xung phá thì phá nghiệp ly hương, tàn tật. Đứng cạnh Tử Vi sẽ làm Tử Vi mất uy quyền; cùng Liêm Trinh – Hỏa Linh đồng độ vất vả bôn ba; cùng Hình Kỵ đồng độ suốt đời tai nạn; đi cặp Vũ Khúc ở Tài Bạch thì "Đông thành Tây bại"; đi với Văn tinh thủ Mệnh làm kẻ bần sĩ. Chỉ có Thiên Lương chế được tính ác và Lộc Tồn giải được tính "điên" của Phá Quân. Nam mệnh Phá Quân thủ Thân – Mệnh tại Tý – Ngọ có Tham Lang – Thất Sát củng chiếu cũng làm nên chức lớn (tuổi Canh, Quý); nữ mệnh bị xung phá thường đa đoan, phong lưu. Thuộc bộ "Sát Phá Tham".',
    byPalace: {
      'Mệnh': 'Cá tính mạnh, thích đổi mới, dám phá cách, tiên phong; bất chấp khuôn phép, hao tâm hao lực. Đắc cách (Tử Vi chế, gặp Lộc) thì khai sáng lập nghiệp lớn.',
      'Huynh Đệ': 'Anh em bất đồng, dễ tan hợp; mỗi người một chí hướng.',
      'Phu Thê': 'Hôn nhân nhiều biến động, dễ tụ tán, tái hôn; nên kết hôn muộn và chọn người bản lĩnh.',
      'Tử Tức': 'Con cái cá tính, ngỗ nghịch, tự lập; quan hệ thăng trầm.',
      'Tài Bạch': 'Tiền vào ra lớn, hao tán mạnh, làm ăn kiểu "phá rồi lập"; kỵ đầu cơ liều.',
      'Tật Ách': 'Dễ tai nạn, mổ xẻ, bệnh cấp; liên quan máu huyết, sinh dục, tiêu hóa.',
      'Thiên Di': 'Ra ngoài bôn ba biến động, thay đổi môi trường liên tục; hợp khai phá nơi mới.',
      'Nô Bộc': 'Bạn bè tụ tán thất thường, dễ bị hao tổn vì người, phản phúc.',
      'Quan Lộc': 'Hợp nghề khai phá, cải cách, kỹ thuật, quân sự, kinh doanh mạo hiểm; sự nghiệp lên xuống mạnh.',
      'Điền Trạch': 'Nhà đất hao tán, hay thay đổi nơi ở; "phá tổ" rồi gây dựng lại.',
      'Phúc Đức': 'Tâm bất an, lao tâm, ưa thay đổi, khó hưởng nhàn; phúc bạc nếu gặp sát nặng.',
      'Phụ Mẫu': 'Sớm xa cách cha mẹ hoặc quan hệ trắc trở; ít hưởng phúc ấm.',
    },
    combos:
      'Phá Quân + Tử Vi (Sửu/Mùi "Tử Phá"): dám phá cách lập nghiệp, có Tử Vi chế thì thành đại cách. + Vũ Khúc (Tị/Hợi): "Vũ Phá" hao tài, làm ăn thăng trầm. + Liêm Trinh (Mão/Dậu "Liêm Phá"): gian truân, dễ thị phi tai họa. Phá Quân luôn đối xung Thiên Tướng.',
    advancedGeneral:
      'Thuộc bộ "Sát Phá Tham" — chủ biến động lớn nhất. Phá Quân ưa Tử Vi đồng cung (được chế ngự) + Hóa Lộc/Lộc Tồn thì hóa hao thành lập; tối kỵ gặp Kình Đà Hỏa Linh Không Kiếp (hao tán, tai họa, cô khắc). "Phá Quân ám diệu" nơi Thủy cung (Tý/Hợi) cần xét kỹ.',
  },

  // ─────────────────────── LỤC CÁT TINH ───────────────────────
  'Tả Phù': {
    name: 'Tả Phù',
    basic:
      'Phụ tá cát tinh (Thổ), đi cặp với Hữu Bật — chủ về sự trợ giúp, quý nhân, được nâng đỡ, tăng cường cát khí cho chính tinh. Người có Tả Phù thường được người khác hỗ trợ, có lòng nhân, làm việc có người phụ giúp.',
    byPalace: {
      'Mệnh': 'Được quý nhân nâng đỡ, có tài phụ tá, tính nhân hậu trung hậu; tăng cát cho Mệnh.',
      'Quan Lộc': 'Có người giúp việc, dễ thăng tiến nhờ trợ lực; hợp vai trò có cấp phó/ê-kíp.',
      'Phu Thê': 'Có trợ lực trong hôn nhân nhưng đơn thủ một Tả/Hữu dễ có "người thứ ba" trợ duyên — cần xét kỹ.',
      'Tài Bạch': 'Có người giúp về tiền bạc, làm ăn có cộng sự.',
    },
    combos: 'Tả Phù + Hữu Bật giáp hoặc đồng cung Mệnh/Quan = "Tả Hữu đồng cung" đại quý, trợ lực mạnh. Đi với Tử Vi/Thiên Phủ thành "bách quan triều củng".',
    advancedGeneral: 'Tả Hữu nên đi đủ cặp và phù trợ chính tinh đắc địa. Đơn thủ tại cung phối ngẫu đôi khi chủ tình duyên có người chen vào.',
  },
  'Hữu Bật': {
    name: 'Hữu Bật',
    basic:
      'Phụ tá cát tinh (Thủy), đi cặp với Tả Phù — chủ về trợ giúp, quý nhân ngầm, gia tăng phúc lực và khả năng được người khác đỡ đần. Người có Hữu Bật khéo léo, được lòng người, có quý nhân.',
    byPalace: {
      'Mệnh': 'Được trợ giúp âm thầm, tính khéo, nhân hậu; tăng cát khí.',
      'Quan Lộc': 'Có quý nhân/cộng sự hỗ trợ sự nghiệp.',
      'Phu Thê': 'Đơn thủ dễ có người trợ duyên xen vào; đủ cặp Tả Hữu thì tốt.',
      'Phúc Đức': 'Phúc dày, được người giúp, tâm an.',
    },
    combos: 'Hữu Bật + Tả Phù = cặp trợ tinh mạnh nhất, rất quý khi chầu Tử Vi/Thiên Phủ/Mệnh.',
    advancedGeneral: 'Cùng luận như Tả Phù — quý khi đủ cặp và phụ chính tinh sáng.',
  },
  'Văn Xương': {
    name: 'Văn Xương',
    basic:
      'Văn tinh (Kim), Nam Đẩu — chủ về văn chương, học vấn, khoa bảng, văn thư, sự tinh tế và tài viết lách chính quy. Người Văn Xương thông minh, học giỏi, văn hay chữ tốt, ưa thẩm mỹ; hợp thi cử, học thuật.',
    byPalace: {
      'Mệnh': 'Thông minh, có tài văn học, học hành đỗ đạt, phong thái nho nhã.',
      'Quan Lộc': 'Hợp khoa cử, học thuật, văn phòng, giáo dục; thành danh nhờ chữ nghĩa.',
      'Phúc Đức': 'Tâm hồn tao nhã, ưa văn chương nghệ thuật.',
      'Phu Thê': 'Phối ngẫu có học, nho nhã; nhưng Xương Khúc tại Thê đôi khi chủ đa tình văn vẻ.',
    },
    combos: 'Văn Xương + Văn Khúc giáp/hội Mệnh = "Xương Khúc" tài hoa, khoa giáp. + Thái Âm "Nguyệt lãng": văn tài nổi danh. Kỵ Hóa Kỵ (văn thư trắc trở, kiện tụng giấy tờ).',
    advancedGeneral: 'Văn Xương trọng văn chính quy/khoa cử; gặp Hóa Kỵ chủ sai sót văn thư, hợp đồng, thi cử trục trặc. Hội Khôi Việt + Xương Khúc là "ngọc đường" quý hiển.',
  },
  'Văn Khúc': {
    name: 'Văn Khúc',
    basic:
      'Văn tinh (Thủy), Bắc Đẩu — chủ về tài hoa, khẩu tài, nghệ thuật, mỹ cảm, ứng đối linh hoạt. Khác Văn Xương ở chỗ thiên về tài lẻ, ăn nói, nghệ thuật, ứng biến. Người Văn Khúc khéo nói, đa tài, lãng mạn.',
    byPalace: {
      'Mệnh': 'Đa tài, khéo ăn nói, có khiếu nghệ thuật, lanh lợi.',
      'Quan Lộc': 'Hợp nghệ thuật, truyền thông, ngoại giao, nghề dùng tài ăn nói.',
      'Phu Thê': 'Phối ngẫu tài hoa, lãng mạn; đôi khi đa tình.',
      'Phúc Đức': 'Ưa nghệ thuật, đời sống tinh thần phong phú.',
    },
    combos: 'Văn Khúc + Văn Xương = cặp văn tinh tài hoa. + Tham Lang dễ thiên đào hoa nghệ thuật. + Hóa Kỵ: lời nói/giấy tờ thị phi.',
    advancedGeneral: 'Văn Khúc thiên tài lẻ và khẩu tài; hội Xương Khúc Khôi Việt là khoa danh. Tại cung tình cảm dễ thêm đào hoa văn nghệ.',
  },
  'Thiên Khôi': {
    name: 'Thiên Khôi',
    basic:
      'Quý nhân tinh (Hỏa) — "Thiên Ất quý nhân". Theo Tử Vi Hàm Số, Khôi tượng cho ĐẦU (cơ thể); Khôi + ' +
      'Thiên Hình = bị thương tích trên đầu / có thẹo. Trong gia đình: Mệnh có Khôi Việt thường là CON ' +
      'TRƯỞNG; nếu không phải con trưởng thì sau cũng đoạt trưởng, hoặc được cha mẹ thương yêu nhất, ' +
      'là rường cột gia đình. Trong quan trường: được giao việc quan trọng, gần gũi nguyên thủ/trưởng cơ quan.\n' +
      'Tính: thông minh xuất chúng; học hành xuất sắc, thi đỗ dễ; có tài về văn chương và võ nghệ; mưu cơ, ' +
      'quyền biến, tài tổ chức; có ÓC LÃNH TỤ, làm gì cũng muốn hơn người; tính tình cao thượng khoáng đạt.',
    byPalace: {
      'Mệnh': 'Quý nhân nâng đỡ, phong thái đường hoàng, có óc lãnh tụ; là con trưởng/được thương nhất.',
      'Huynh Đệ (Bào)': 'Anh chị em tài ba, danh giá, tạo nên sự nghiệp.',
      'Phu Thê': 'Phối ngẫu tài ba danh giá, hỗ trợ sự nghiệp.',
      'Tử Tức': 'Con cái tài năng, danh giá, lập nên sự nghiệp.',
      'Tật Ách': 'Ốm đau có thầy giỏi thuốc hay; tai nạn được cứu giải.',
      'Thiên Di': 'Ra ngoài gặp quý nhân (công khai) giúp đỡ.',
      'Nô Bộc': 'Có thuộc hạ đắc lực, quản gia mẫn cán, lương tướng tài ba, học trò xuất sắc.',
      'Quan Lộc': 'Công danh lừng lẫy, thịnh và bền, được tín nhiệm trọng dụng.',
      'Phúc Đức': 'Có thần linh yểm trợ, cứu độ (như Quang Quý).',
    },
    combos:
      'Khôi + Việt = cặp QUÝ NHÂN mạnh nhất; rất quý khi hội Mệnh – Quan. ' +
      '+ Xương Khúc + Quang Quý = thi đỗ cao, văn bằng cao nhất (Trạng Nguyên, Tiến Sĩ, Thạc Sĩ). ' +
      '"TỌA KHÔI HƯỚNG VIỆT" (Khôi Việt hợp chiếu) = đỗ cao lúc tuổi còn trẻ. ' +
      '+ Nhật Nguyệt hãm = Khôi Việt PHỤC HỒI SỨC SÁNG cho Nhật Nguyệt hãm (hóa giải mạnh). ' +
      '+ Đà La + Hóa Kỵ = kẻ sĩ ẩn dật. ' +
      'Khôi Việt KỴ Tuần Triệt, Hóa Kỵ, Thiên Hình, sát tinh — bị xâm phạm thì mất nhiều lợi điểm.',
    advancedGeneral:
      'Ý nghĩa Khôi Việt MẠNH HƠN Xương Khúc: Xương Khúc chỉ tài giỏi thông thường, Khôi Việt chỉ sự ' +
      'XUẤT CHÚNG và quyền uy quan trọng. Hội đủ 4 sao Khôi – Việt – Xương – Khúc + Nhật Nguyệt + Hóa Khoa ' +
      'sáng → bậc nhân tài thế giới (bác học, chính trị gia tầm cỡ, có thể được giải thưởng quốc tế). ' +
      'Khôi Việt giáp Mệnh không đẹp bằng tọa thủ nhưng vẫn được đắc thời, nhiều người kính trọng che chở.',
  },
  'Thiên Việt': {
    name: 'Thiên Việt',
    basic:
      'Quý nhân tinh (Hỏa) — "Ngọc Đường quý nhân". Theo Tử Vi Hàm Số, Việt tượng cho HAI VAI (cơ thể); ' +
      'Việt + Hao = vai cao vai thấp. Trong gia đình: cùng Khôi → là con trưởng / đoạt trưởng / rường cột ' +
      'gia đình; trong xã hội → được giao việc quan trọng, lui tới gần nguyên thủ. Tính: thông minh xuất ' +
      'chúng, học hành xuất sắc, có tài văn võ, mưu cơ quyền biến, óc lãnh tụ, tính cao thượng khoáng đạt. ' +
      'Việt thiên về QUÝ NHÂN ÂM TRỢ / BẤT NGỜ (khác Khôi là dương trợ công khai).',
    byPalace: {
      'Mệnh': 'Quý nhân ngầm trợ giúp, gặp may bất ngờ, có óc lãnh tụ.',
      'Huynh Đệ (Bào)': 'Anh chị em tài năng, có sự nghiệp.',
      'Phu Thê': 'Phối ngẫu danh giá, hỗ trợ ngầm.',
      'Tử Tức': 'Con cái tài năng, lập nghiệp.',
      'Tật Ách': 'Ốm đau có thầy giỏi thuốc hay, gặp tai nạn được cứu.',
      'Thiên Di': 'Xuất ngoại gặp quý nhân giúp kín đáo (âm trợ).',
      'Nô Bộc': 'Có cộng sự, học trò xuất sắc.',
      'Quan Lộc': 'Cơ hội thăng tiến đến bất ngờ; công danh bền.',
      'Phúc Đức': 'Có thần linh yểm trợ.',
    },
    combos:
      'Việt + Khôi = cặp QUÝ NHÂN mạnh nhất. + Xương Khúc + Quang Quý = thi đỗ cao. ' +
      '+ Nhật Nguyệt hãm = phục hồi sức sáng. Hội đủ Khôi – Việt – Xương – Khúc = bộ quán thế.',
    advancedGeneral:
      'Luận chung với Thiên Khôi — đôi sao quý nhân hàng đầu. Việt thiên về CƠ HỘI BẤT NGỜ / ÂM TRỢ; ' +
      'Khôi thiên về QUÝ NHÂN CÔNG KHAI / DƯƠNG TRỢ. Gặp Tuần/Triệt/Hóa Kỵ/Thiên Hình thì mất nhiều lợi điểm.',
  },

  // ─────────────────── LỘC, QUYỀN, KHOA, KỴ + LỘC TỒN, MÃ ───────────────────
  'Lộc Tồn': {
    name: 'Lộc Tồn',
    basic:
      'Tài lộc tinh (Thổ), Bắc Đẩu — chủ về tài lộc, tích lũy, sự bảo toàn, phúc thực và trường thọ. Người có Lộc Tồn biết kiếm và giữ của, thận trọng, có hậu vận; nhưng luôn bị Kình Dương và Đà La kẹp hai bên nên cần cát tinh giải. ' +
      'Theo Tử Vi Hàm Số (Nguyễn Phát Lộc): Lộc Tồn an theo CAN năm sinh, đứng giữa thế "Kình – Đà giáp Lộc"; bản chất là quý nhân, tước lộc, ăn lộc trời. Lộc Tồn thủ Mệnh thì cần kiệm, biết lo xa, có của ăn của để nhưng TÍNH HƠI CÔ ĐỘC, ích kỷ giữ của, ngại chia sẻ (vì bị hai sát tinh kẹp). Rất cần Tả Phụ – Hữu Bật đồng cung hoặc Thiên Khôi – Thiên Việt hội chiếu để bớt cô và thành phú quý; gặp Tử Vi – Thiên Phủ – Vũ Khúc thì là chân phú cách.',
    byPalace: {
      'Mệnh': 'Có tài lộc, biết tích cóp, thận trọng, hậu vận sung túc; tính hơi bảo thủ, dè dặt, đôi khi cô độc và giữ của. Cần Tả Hữu/Khôi Việt giải cô.',
      'Tài Bạch': 'Rất tốt — tiền của dồi dào, biết giữ, tích lũy vững (phú cách). Lộc Tồn cư Tài/Điền là "tích ngọc đôi kim".',
      'Quan Lộc': 'Sự nghiệp có lộc, ổn định, được đãi ngộ tốt, ăn lương nhà nước/tổ chức lớn bền vững.',
      'Điền Trạch': 'Có của để dành, nhà đất bền vững; thừa hưởng hoặc tự tạo điền sản.',
      'Phúc Đức': 'Hưởng phúc lộc, sống thọ, an nhàn về vật chất; song hơi tính toán so đo.',
    },
    combos: 'Lộc Tồn + Hóa Lộc = "song Lộc" đại phú. + Thiên Mã = "Lộc Mã giao trì" — phát tài tha hương, kinh doanh lớn. + Tả Hữu/Khôi Việt = giải được tính cô độc, thành phú quý. Bị Kình Đà giáp — luôn cần cát tinh giải.',
    advancedGeneral: '"Lộc Mã giao trì" (Lộc Tồn hoặc Hóa Lộc gặp Thiên Mã) là cách phát tài năng động, hợp tha hương lập nghiệp. Lộc Tồn đơn thủ gặp Không Kiếp/Triệt Tuần thì lộc bị hao ("Lộc nhập Không vong" — Hàm Số gọi là tài lộc hư ảo, có mà không giữ được). Lộc Tồn gặp Hóa Kỵ đồng cung là "Lộc phùng Kỵ" — của cải bị quấy nhiễu, tranh chấp.',
  },
  'Thiên Mã': {
    name: 'Thiên Mã',
    basic:
      'Dịch mã tinh (Hỏa) — chủ về di chuyển, đi xa, thay đổi, năng động, xuất ngoại, bôn ba. Người có Thiên Mã thích hoạt động, đi lại nhiều, không chịu ngồi yên; hợp nghề di chuyển, ngoại giao, thương mại. ' +
      'Theo Tử Vi Hàm Số: Thiên Mã chỉ an tại tứ SINH (Dần – Thân – Tị – Hợi), tượng cho CON NGỰA — sự dời đổi, chân đi. Mã cần "yên cương" (gặp Lộc) mới quý; Mã đơn độc thì chỉ là ngựa hoang chạy nhọc. Các cách Hàm Số nêu: "Lộc Mã giao trì" (gặp Lộc — phát đạt tha hương), "Tử Mã/Chiết Túc Mã" (Mã gặp Tuần Triệt Không Kiếp — ngựa gãy chân, đi mà vô ích), "Chiến Mã" (Mã + Hỏa Tinh — bôn ba chinh chiến vất vả), "Phù Thi Mã" (Mã gặp Tử – Tuyệt — hung).',
    byPalace: {
      'Mệnh': 'Năng động, ưa đi lại, thay đổi; hợp tha hương lập nghiệp.',
      'Thiên Di': 'Xuất ngoại, đi xa thuận lợi, hợp công tác lưu động, thương mại quốc tế.',
      'Tài Bạch': 'Tiền từ di chuyển, kinh doanh xa; "Lộc Mã" thì phát tài lớn.',
      'Quan Lộc': 'Nghề nghiệp lưu động, hay thuyên chuyển, đi công tác.',
    },
    combos: 'Thiên Mã + Lộc Tồn/Hóa Lộc = "Lộc Mã giao trì" phát tài. + Hỏa Tinh = "Chiến Mã" bôn ba vất vả. + Tuần/Triệt/Không Kiếp = "Mã ngộ Không" (tử mã/chiết túc mã) — bôn ba vô ích.',
    advancedGeneral: 'Mã cần gặp Lộc mới quý; Mã gặp Không Kiếp/Tuần Triệt là "chiết túc mã" chạy nhọc công. Thiên Mã + Thiên Lương = "Lương Mã" phiêu đãng bất định.',
  },
  'Hóa Lộc': {
    name: 'Hóa Lộc',
    basic:
      'Một trong Tứ Hóa (Thổ) — chủ về tài lộc, cơ hội, sự hanh thông, tăng phúc và duyên. Hóa Lộc làm chính tinh nó bám vào trở nên sinh tài, thuận lợi, có duyên may.',
    byPalace: {
      'Mệnh': 'Có phúc lộc, duyên may, dễ kiếm tiền, được yêu mến.',
      'Tử Tức': 'Con cái có phúc, dễ nuôi, hợp con; con sau này phát về tài lộc, mang may mắn cho cha mẹ.',
      'Tài Bạch': 'Tài lộc hanh thông, nguồn thu tốt.',
      'Quan Lộc': 'Sự nghiệp thuận, có lợi lộc, dễ thăng tiến.',
      'Phu Thê': 'Tình duyên có duyên lộc, phối ngẫu mang tới tài.',
    },
    combos: 'Hóa Lộc + Lộc Tồn = song Lộc đại phú. + Thiên Mã = Lộc Mã phát tài. Kỵ gặp Tuần/Triệt/Không Kiếp (lộc bị triệt tiêu).',
    advancedGeneral: 'Hóa Lộc theo Can năm sinh, gắn vào 1 chính tinh cụ thể. Quý khi đắc địa và không bị Không vong; hội đủ "Lộc Quyền Khoa" là tam hóa liên châu — đại quý.',
  },
  'Hóa Quyền': {
    name: 'Hóa Quyền',
    basic:
      'Một trong Tứ Hóa (Mộc) — chủ về quyền lực, năng lực, sự chủ động, thăng tiến và uy thế. Hóa Quyền khiến chính tinh có thêm quyền uy, khả năng nắm việc, lãnh đạo.',
    byPalace: {
      'Mệnh': 'Có chí, có năng lực và uy quyền, thích nắm quyền chủ động.',
      'Tử Tức': 'Con cái có chí, cứng cỏi, sớm tự lập và có thể đạt địa vị; đôi khi bướng bỉnh, khó bảo.',
      'Quan Lộc': 'Thăng tiến, có chức quyền, nắm việc lớn.',
      'Tài Bạch': 'Chủ động về tài chính, quản lý tiền giỏi.',
    },
    combos: 'Hóa Quyền + Hóa Lộc/Hóa Khoa hội chiếu = tam hóa quý cách. Quyền + sát tinh đắc chế = uy quyền thực sự; gặp Không Kiếp thì quyền hư.',
    advancedGeneral: 'Hóa Quyền cần đi với Lộc/Khoa và chính tinh đắc địa mới thành quyền thực. "Quyền Lộc tuần phùng" rất quý.',
  },
  'Hóa Khoa': {
    name: 'Hóa Khoa',
    basic:
      'Một trong Tứ Hóa (Thủy) — chủ về khoa danh, học vấn, tiếng tăm tốt, quý nhân và sự che chở. Hóa Khoa làm sáng danh, thêm uy tín, giải hung nhẹ.',
    byPalace: {
      'Mệnh': 'Có tiếng tăm tốt, học hành thuận, được quý nhân giúp, danh dự.',
      'Tử Tức': 'Con cái thông minh, hiếu học, có tiếng trong học hành thi cử; quan hệ cha mẹ – con nề nếp.',
      'Quan Lộc': 'Khoa danh hiển đạt, hợp học thuật thi cử công danh.',
      'Tật Ách': 'Khoa giải bệnh — bệnh có quý nhân/thầy giỏi, hóa nhẹ.',
    },
    combos: 'Hóa Khoa + Hóa Lộc + Hóa Quyền = "Khoa Quyền Lộc" tam hóa liên châu đại quý. + Khôi Việt Xương Khúc = khoa bảng hiển vinh.',
    advancedGeneral: 'Hóa Khoa chủ danh hơn lợi, có tính giải cứu hung tinh. Quý khi hội Lộc Quyền và văn tinh.',
  },
  'Hóa Kỵ': {
    name: 'Hóa Kỵ',
    basic:
      'Một trong Tứ Hóa (Thủy) — chủ về trở ngại, thị phi, vướng mắc, hao tổn, chấp niệm và phiền não. Hóa Kỵ làm chính tinh nó bám vào sinh trắc trở; tuy nhiên Kỵ tại một số cung/cách lại chủ sự bền bỉ, chuyên sâu.',
    byPalace: {
      'Mệnh': 'Hay lo nghĩ, chấp niệm, gặp trắc trở; nhưng cũng kiên trì, chuyên tâm một việc.',
      'Tử Tức': 'Vướng mắc về con cái: dễ hiếm muộn, lo lắng cho con hoặc khoảng cách tình cảm; cần quan tâm sức khỏe của con.',
      'Tài Bạch': 'Tiền bạc trắc trở, dễ hao, tranh chấp tài chính.',
      'Phu Thê': 'Tình duyên vướng mắc, hiểu lầm, khó dứt; dễ vương vấn dai dẳng.',
      'Tật Ách': 'Bệnh dai dẳng, khó dứt điểm; cần phòng bệnh mạn tính.',
    },
    combos: 'Hóa Kỵ + Cự Môn/Liêm Trinh = thị phi kiện tụng nặng. + Lộc Tồn/Hóa Lộc đồng cung = "Lộc phùng Kỵ" lộc bị quấy. Kỵ xung chiếu Mệnh/Tài cần đề phòng theo năm.',
    advancedGeneral: 'Hóa Kỵ theo Can năm sinh. "Song Kỵ" (Kỵ sinh năm trùng Kỵ đại/lưu vận) là điểm hạn nặng. Kỵ tại Tật/ Điền đôi khi lại "thủ" được của/sức bền; cần luận theo chính tinh và cách cục.',
  },

  // ─────────────────── LỤC SÁT TINH ───────────────────
  'Kình Dương': {
    name: 'Kình Dương',
    basic:
      'Sát tinh (Kim), bại tinh — chủ về cương mãnh, quyết liệt, tranh đấu, thương tích và sự sắc bén. Người bị Kình Dương dễ nóng nảy, hiếu thắng, gặp tai thương; nhưng đắc cách (võ nghiệp, biên cương) lại thành uy dũng. ' +
      'Theo Tử Vi Hàm Số: Kình Dương (Dương Nhận) hóa khí là HÌNH, tượng cho LƯỠI DAO/THANH KIẾM sắc — chủ thương tích, mổ xẻ, vết chém; an theo Lộc Tồn (đứng trước Lộc Tồn 1 cung). Tính người: hung hãn, quả cảm, thẳng thừng, ưa quyền lực, không sợ hiểm nguy; nếu chính tinh sáng chế ngự thì thành tướng tài, hãm địa thì thành kẻ liều lĩnh thô bạo. Chủ bộ phận: ĐẦU – MẶT – RĂNG, dễ thương tích nơi đó.',
    byPalace: {
      'Mệnh': 'Cương cường, hiếu thắng, quyết liệt; dễ thương tật, thị phi. Đắc địa (Thìn Tuất Sửu Mùi) hợp võ/kỹ thuật/y khoa; hãm thì liều lĩnh, hay rước họa.',
      'Tử Tức': 'Con cái khó sinh hoặc dễ hao (sảy/khó nuôi), tính con cương ngạnh, hay va chạm; nên sinh con muộn cho yên, chú ý an toàn cho con.',
      'Tật Ách': 'Dễ mổ xẻ, tai nạn dao kéo, thương tích đầu mặt răng; bệnh cấp, viêm.',
      'Phu Thê': 'Hôn nhân dễ xung khắc, cãi vã, "cơm chẳng lành"; cần kết hôn muộn, lấy người cương để chế.',
      'Quan Lộc': 'Đắc địa hợp võ nghiệp, quân cảnh, ngoại khoa, cơ khí; quyền uy nhờ sự quyết đoán sắc bén.',
    },
    combos: 'Kình Dương + Hỏa/Linh = tai họa thương tật nặng. + Thái Dương miếu hoặc Thất Sát đắc địa = uy dũng (võ cách). "MÃ ĐẦU ĐỚI KIẾM" (Kình Dương cư Ngọ, gặp Thiên Đồng/người tuổi Bính Mậu) — Hàm Số xếp là cách võ tướng biên cương lập công danh. "Linh Xương Đà Vũ" (Linh + Xương + Đà + Vũ Khúc) là bại cục.',
    advancedGeneral: 'Kình Dương luôn cách Lộc Tồn 1 cung (đứng ngay trước). Đắc địa (Thìn Tuất Sửu Mùi) hoặc theo võ cách thì hóa hung thành uy; hãm địa gặp sát thì hung họa, thương tật, yểu chiết. Theo Hàm Số, Kình tại tứ Mộ (Thìn Tuất Sửu Mùi) là đắc thế nhất; tại Tý Ngọ Mão Dậu là hãm — gặp sát tinh dễ tai nạn lưu huyết.',
  },
  'Đà La': {
    name: 'Đà La',
    basic:
      'Sát tinh (Kim), kỵ tinh — chủ về trì trệ, vướng mắc kéo dài, phiền muộn ngấm ngầm, dây dưa. Khác Kình (nhanh, sắc), Đà La chủ chậm, âm ỉ, khó dứt. ' +
      'Theo Tử Vi Hàm Số: Đà La hóa khí là KỴ, tượng cho sợi DÂY THỪNG/cái bánh xe lăn chậm — chủ sự kéo lê, ràng buộc, trì hoãn, "đâm lao phải theo lao"; an sau Lộc Tồn (đứng sau Lộc Tồn 1 cung, đối lại với Kình Dương). Tính người: thâm trầm, bền bỉ chịu đựng nhưng hay ôm hận ngầm, chậm chạp, đa nghi, làm việc lòng vòng. Chủ bộ phận: GÂN CỐT, lưng, các bệnh ngấm ngầm lâu khỏi.',
    byPalace: {
      'Mệnh': 'Hay phiền muộn ngầm, làm việc dây dưa, tâm sự khó tỏ; dễ vướng mắc kéo dài; bền chí nhưng đa nghi, cố chấp.',
      'Tử Tức': 'Muộn con hoặc con cái lục đục, dây dưa; tình cảm cha mẹ – con dễ trục trặc ngấm ngầm, cần kiên nhẫn vun đắp.',
      'Tật Ách': 'Bệnh mạn tính, âm ỉ khó dứt; tai nạn ngầm, bệnh gân cốt, phong thấp.',
      'Phu Thê': 'Tình duyên dây dưa, trắc trở kéo dài, khó dứt điểm; dễ vương vấn người cũ.',
      'Quan Lộc': 'Sự nghiệp trì trệ, thăng tiến chậm, hay bị cản; hợp nghề cần kiên nhẫn, tỉ mỉ.',
    },
    combos: 'Đà La + Hỏa/Linh/Kỵ = trì trệ tai họa kéo dài. + Lộc Tồn (luôn kề) cần cát giải. "PHONG LƯU THẢI TRƯỢNG" (Đà La + Đào Hoa/Mộc Dục/Tham Lang) — Hàm Số luận là sa đà tửu sắc, đam mê phong tình.',
    advancedGeneral: 'Đà La luôn kề Lộc Tồn ở phía đối diện với Kình Dương (Kình trước – Đà sau Lộc Tồn). Hãm gặp sát thì hao trệ, ôm bệnh ngầm, sự nghiệp lận đận; cần Tả Hữu Khôi Việt hoặc chính tinh miếu vượng hóa giải. Theo Hàm Số, Đà La đắc tại tứ Mộ (Thìn Tuất Sửu Mùi), hãm tại Dần Thân Tị Hợi.',
  },
  'Hỏa Tinh': {
    name: 'Hỏa Tinh',
    basic:
      'Sát tinh (Hỏa), Nam Đẩu — chủ về nóng nảy, bộc phát, tai họa do lửa/đột ngột, nhưng cũng là sao tạo "hoạnh phát" khi gặp Tham Lang/Vũ Khúc. Người bị Hỏa Tinh tính nóng, gấp gáp, dễ tai nạn bất ngờ.',
    byPalace: {
      'Mệnh': 'Tính nóng, bộc trực, hành động nhanh; dễ tai nạn đột ngột nếu hãm.',
      'Tử Tức': 'Con cá tính nóng, hiếu động, khó bảo; dễ hiếm con hoặc có khoảng cách; cần chú ý an toàn cho con.',
      'Tật Ách': 'Bệnh cấp, sốt, viêm, tai nạn lửa/điện; thương tích bất ngờ.',
      'Tài Bạch': 'Tiền bạc bộc phát bộc tán; "Hỏa Tham" thì hoạnh tài.',
    },
    combos: 'Hỏa Tinh + Tham Lang = "Hỏa Tham" hoạnh phát đại tài/đại danh bất ngờ. + Linh Tinh/Kình Đà = tai họa nặng. + Thất Sát/Phá = dễ thương vong.',
    advancedGeneral: '"Hỏa Tham/Linh Tham" là cách phát bất ngờ nổi tiếng — nhưng có Kình Đà Kỵ kèm thì hoạnh phát hoạnh phá. Hỏa Tinh đắc địa (cung Hỏa, miếu) thì uy; hãm thì hung họa.',
  },
  'Linh Tinh': {
    name: 'Linh Tinh',
    basic:
      'Sát tinh (Hỏa), Nam Đẩu — tương tự Hỏa Tinh nhưng âm hiểm, ngấm ngầm hơn; chủ tai họa bất ngờ ngầm, tính khí thất thường, lo âu. Cũng tạo "Linh Tham" hoạnh phát.',
    byPalace: {
      'Mệnh': 'Tính thất thường, hay lo ngầm, dễ bốc đồng; tai họa đến bất ngờ.',
      'Tử Tức': 'Con cá tính thất thường, dễ xa cách; con cái ít hoặc muộn; cần kiên nhẫn nuôi dạy.',
      'Tật Ách': 'Bệnh ngầm phát đột ngột, thần kinh, viêm.',
      'Tài Bạch': '"Linh Tham" hoạnh tài; nếu không thì hao tán bất ngờ.',
    },
    combos: 'Linh Tinh + Tham Lang = "Linh Tham" hoạnh phát. + Hỏa Tinh/Kình Đà = hung họa. Cần chính tinh miếu vượng hoặc cát tinh chế.',
    advancedGeneral: 'Luận như Hỏa Tinh nhưng âm trầm hơn. Linh Tham/Hỏa Tham cần đắc địa và tránh Kình Đà Kỵ kèm.',
  },
  'Địa Không': {
    name: 'Địa Không',
    basic:
      'Sát/không tinh (Hỏa) — chủ về sự trống rỗng, hao hụt, ý tưởng phi thực tế, nhưng cũng chủ tâm linh, sáng tạo, siêu thoát. "Thành cũng Không, bại cũng Không".',
    byPalace: {
      'Mệnh': 'Suy nghĩ khác người, sáng tạo, không thực tế, dễ hao bại vật chất; hợp tâm linh, nghiên cứu.',
      'Tử Tức': 'Hiếm con hoặc con cái phải xa cha mẹ; con thiên về tinh thần/nghệ thuật, ít gần gũi.',
      'Tài Bạch': 'Tiền bạc hư hao, khó giữ, dễ "tiền vào tay trái ra tay phải".',
      'Phúc Đức': 'Tâm hướng nội, ưa triết lý/tôn giáo, ít màng vật chất.',
    },
    combos: 'Địa Không + Địa Kiếp = "Không Kiếp" song sát hao bại mạnh (đặc biệt tại Tài/Mệnh). + Tham Lang = giảm dục, hợp tu hành. + chính tinh sáng + Khoa = sáng tạo thành tựu.',
    advancedGeneral: '"Không Kiếp giáp Mệnh" hoặc đồng cung Tài chủ phá tán, làm ăn hư không; nhưng với người tu hành/sáng tạo/nghiên cứu lại là cách thoát tục, đột phá tư duy.',
  },
  'Địa Kiếp': {
    name: 'Địa Kiếp',
    basic:
      'Sát/kiếp tinh (Hỏa) — chủ về hao tán, mất mát, tai kiếp, suy nghĩ lệch thực tế; phá hoại vật chất mạnh hơn Địa Không. Cũng có khía cạnh tâm linh, đột phá.',
    byPalace: {
      'Mệnh': 'Cách nghĩ khác thường, dễ gặp hao tổn, thăng trầm; cần hướng tới chuyên môn/tâm linh.',
      'Tử Tức': 'Hiếm con, khó nuôi, hoặc con cái hao tổn/xa cách; nên sinh con muộn và quan tâm sát sao sức khỏe của con.',
      'Tài Bạch': 'Hao tài, dễ thất thoát, đầu tư thua lỗ; kỵ mạo hiểm.',
      'Tật Ách': 'Dễ tai kiếp bất ngờ, hao tổn sức khỏe.',
    },
    combos: 'Địa Kiếp + Địa Không = "Không Kiếp" hao bại. + Sát Phá Tham = biến động lớn, dễ tai họa. Cần Lộc/cát tinh và chính tinh miếu chế.',
    advancedGeneral: 'Không Kiếp tối kỵ ở Mệnh/Tài/Quan với người cầu danh lợi; ngược lại hợp người tu, sáng tạo, kỹ thuật đột phá. Luận cùng cặp với Địa Không.',
  },
  'Thiên Hình': {
    name: 'Thiên Hình',
    basic:
      'Hình sát tinh (Hỏa) — theo Tử Vi Hàm Số, Thiên Hình tượng cho VẾT THẸO; đi với sao cơ thể nào ' +
      'thì nơi đó có thể có thẹo / mổ xẻ. Hình ví như con DAO MỔ (bistouri), chủ mổ xẻ, châm cứu. ' +
      'Tính: ngay thẳng, nóng nảy trực tính, bất nhẫn trước bất công; có năng khiếu PHÁN XÉT tinh vi, ' +
      'phân xử tỉ mỉ công bình (thẩm phán có Hình có thể là một "Bao Công"). Đặc biệt với nữ: Hình ' +
      'làm người NGAY THẲNG, không lẳng lơ, dù có Đào – Riêu — đồng nghĩa với Tử Phủ, Nhật đắc địa, ' +
      'Quang Quý, dập tắt được tính hoa nguyệt của Đào – Hồng.',
    byPalace: {
      'Mệnh': 'Cương trực, kỷ luật, có khí tiết; đoan chính. Hợp pháp luật, quân sự, y học, tu hành. ' +
              'Nữ mệnh có Hình → ngay thẳng, dập tắt tính đào hoa.',
      'Tật Ách': 'Bệnh có mổ xẻ / châm cứu. Hình + Nhật/Nguyệt: đau mắt có thể chà xát. ' +
                 'Hình + Kiếp + Hỷ Thần: bệnh trĩ phải cắt.',
      'Quan Lộc': 'Hợp tư pháp, quân cảnh (thẩm phán quân đội/Tòa Án Binh khi Hình ở Dần đắc địa), y học ' +
                  '(bác sĩ giải phẫu hay châm cứu khi đi với Tướng Y / Cơ Nguyệt / Đồng Lương). ' +
                  '"BINH HÌNH TƯỚNG ẤN" = bộ uy dũng, lãnh đạo quân sự.',
      'Phu Thê': 'Phối ngẫu cá tính cương trực, có thể hơi cô khắc, nguyên tắc; kết hôn muộn cho bền.',
      'Tử Tức': 'Con cái cương trực; là một trong các sao chủ HIẾM MUỘN (lưu ý cùng Vũ Khúc, Thái Âm hãm…).',
      'Phúc Đức': 'Tâm chính trực, có nguyên tắc; nếu thiên hướng tâm linh thì hợp tu hành.',
      'Thiên Di': 'Ra ngoài có uy, dễ vướng việc pháp lý / phán xét.',
    },
    combos:
      'Bộ "BINH HÌNH TƯỚNG ẤN" (Lực Sĩ – Hình – Tướng Quân – Quốc Ấn) = uy dũng, lãnh đạo quân sự, sát phạt. ' +
      '+ Thiên Tướng / Tướng Quân = quyền cao; gặp Tuần/Triệt = "thanh kiếm gãy" → tai họa hiểm nghèo. ' +
      '+ Thiên Mã = họa nhanh chóng. + Liêm Trinh + Hóa Kỵ = kiện tụng, lao lý. ' +
      '+ Thái Dương / Thiên Lương đắc địa = uy nghiêm chính trực, hợp pháp luật. ' +
      '+ Sát tinh = HÌNH PHẠT phải gánh chịu (nặng hơn tù tội: đâm chém, súng đạn). ' +
      '"HÌNH KỴ GIÁP ẤN" (Hình + Hóa Kỵ kẹp Thiên Tướng) đại kỵ — dễ tai họa, mất chức, kiện tụng.',
    advancedGeneral:
      'Thiên Hình "tác họa mau" như mọi sao Hỏa: vận hạn gặp xảy ra rất nhanh. HỢP người làm pháp luật, ' +
      'y khoa (bác sĩ giải phẫu / châm cứu), tu hành ("Hình tinh nhập miếu"); KỴ với người thường (thị ' +
      'phi, thương tật, quan tụng). Đắc địa Dần Thân Mão Dậu (nhất là Dần) → anh hùng võ nghiệp, công ' +
      'trạng lớn, nổi danh.',
  },
  'Đào Hoa': {
    name: 'Đào Hoa',
    basic:
      'Đào hoa tinh (Mộc) — chủ về sắc đẹp, sức hút, duyên tình cảm, nghệ thuật và quan hệ xã giao. Người có Đào Hoa duyên dáng, hấp dẫn, được yêu mến; quá vượng thì đa tình, phong lưu. ' +
      'Theo Tử Vi Hàm Số: Đào Hoa là sao SẮC DỤC và DUYÊN nợ, an theo chi năm sinh (tứ Chính Tý-Ngọ-Mão-Dậu). Đào Hoa khiến người có nhan sắc, lẳng lơ duyên dáng, dễ được người khác phái say mê. Đào đi với cát tinh + chính tinh sáng → duyên lành, sắc đẹp giúp thành công; đi với sát/dâm tinh (Riêu, Thai, Mộc Dục, Tham hãm) → sa đà tình ái, phong tình lụy thân. Đào Hoa cư Tý-Ngọ-Mão-Dậu là "biến Đào hoa" (đào hoa lộ liễu).',
    byPalace: {
      'Mệnh': 'Có duyên, hấp dẫn, được lòng người khác phái; khéo giao tế, có khiếu nghệ thuật. Nữ mệnh Đào Hoa nhan sắc nhưng cần cát tinh giữ cho đoan chính.',
      'Phu Thê': 'Tình duyên phong phú, có sức hút; cần đề phòng đa tình, người thứ ba, hôn nhân nhiều ngả rẽ.',
      'Tử Tức': 'Con cái xinh xắn, có duyên; nhưng gặp dâm tinh thì con đa tình sớm.',
      'Phúc Đức': 'Ưa cái đẹp, nghệ thuật, hưởng thụ tình cảm.',
      'Thiên Di': 'Ra ngoài được mến mộ, nhiều cơ duyên giao tế, dễ có quý nhân khác phái.',
      'Tật Ách': 'Gặp dâm/sát tinh đề phòng bệnh hoa liễu, bệnh đường sinh dục.',
    },
    combos: 'Đào Hoa + Hồng Loan/Thiên Hỷ = duyên tình đậm. + Tham Lang/Liêm Trinh = đào hoa nặng, phong lưu. + Văn Khúc = tài hoa lãng mạn. + Mộc Dục = "Đào hoa phạm Mộc Dục" — đa tình, dễ lụy. + Thiên Riêu = sắc dục nặng, dễ ngoại tình. + Kình Đà = "Đào hoa ngộ sát" tình duyên trắc trở, vì tình rước họa.',
    advancedGeneral: 'Đào Hoa hỗ trợ nghề nghệ thuật/giao tế/thẩm mỹ. Tại cung phối ngẫu/Phúc cần xét sát tinh để biết là duyên tốt hay phiền lụy tình ái. Theo Hàm Số, Đào ở Mệnh/Thân + Thiên Hình hoặc Tử Phủ Nhật đắc địa thì tiết chế được tính phong tình; ngược lại Đào + Riêu + Thai + Mộc Dục là bộ đa dâm nặng.',
  },
  'Hồng Loan': {
    name: 'Hồng Loan',
    basic:
      'Hỷ tinh đào hoa (Thủy) — chủ về hôn nhân, hỷ sự, sắc đẹp, duyên tình và niềm vui. Ứng mạnh việc cưới hỏi, tình duyên; tuổi trẻ chủ hôn nhân, về già gặp lại có thể chủ hiếu sự. ' +
      'Theo Tử Vi Hàm Số: Hồng Loan thiên về DUYÊN HÔN NHÂN CHÍNH THỐNG và sắc đẹp đoan trang (khác Đào Hoa thiên sắc dục, giao tế). Hồng Loan tượng cho gương mặt thanh tú, nét đẹp dịu dàng; nữ mệnh có Hồng Loan thường xinh đẹp, e lệ, đa cảm. Hồng Loan ứng "năm có hỷ sự" — cưới hỏi, sinh con, gặp người tâm đầu ý hợp. Về già (sau 50) Hồng Loan gặp Tang Môn – Bạch Hổ – Khốc Hư lại có thể chuyển thành tin buồn (hiếu sự), cần xét bối cảnh.',
    byPalace: {
      'Mệnh': 'Dung mạo ưa nhìn, thanh tú, có duyên, tính tình vui vẻ đa cảm; nữ mệnh đẹp dịu dàng.',
      'Phu Thê': 'Cách tốt cho hôn nhân — duyên tình đến, dễ thành gia thất; phối ngẫu có nhan sắc; xét đại/lưu vận để định tuổi kết hôn.',
      'Tử Tức': 'Con cái xinh đẹp, hiền; có tin mừng sinh nở khi lưu vận gặp.',
      'Phúc Đức': 'Tâm vui, ưa hưởng thụ tình cảm, đời sống tình cảm phong phú.',
      'Thiên Di': 'Ra ngoài gặp duyên lành, dễ có hỷ sự nơi xa.',
    },
    combos: 'Hồng Loan + Thiên Hỷ = "Song Hỷ" — hôn nhân hỷ sự, con cái đề huề. + Đào Hoa = "Đào Hồng" duyên tình đậm, nhan sắc nổi bật. + Thái Âm = mỹ lệ đa tình. + Thiên Riêu/Mộc Dục = đẹp nhưng đa tình, dễ lụy. Gặp sát/Kỵ tại Thê thì hỷ sự trắc trở, hôn nhân muộn hoặc dang dở.',
    advancedGeneral: 'Hồng Loan ứng tuổi kết hôn (đại/lưu vận gặp Hồng Loan, nhất là cùng Thiên Hỷ/Đào Hoa). Theo Hàm Số, "Đào Hồng" tại Mệnh/Thê là cách đẹp duyên nhưng cần cát tinh giữ bền; gặp Tang Hổ Khốc Hư lúc lớn tuổi thì chuyển nghĩa hiếu hỷ — phải xét tổng thể bối cảnh tuổi và sao đi kèm.',
  },

  // ─────────────────── SÁT / KHÔNG TINH BỔ SUNG ───────────────────
  'Thiên Không': {
    name: 'Thiên Không',
    basic:
      'Hung tinh (Hỏa) — chủ sự hư không, mưu sự bất thành, ý tưởng viển vông, dễ vỡ kế hoạch. Khác Địa Không/Địa Kiếp ở chỗ thiên về "trống rỗng tinh thần", lý tưởng không thành. Đứng ngay trước Thái Tuế.',
    byPalace: {
      'Mệnh': 'Hay mơ mộng, kế hoạch dễ hỏng, cần thực tế hơn; hợp tư duy sáng tạo, tâm linh.',
      'Tài Bạch': 'Tính toán tài chính dễ hụt, kỵ đầu cơ phiêu lưu.',
      'Quan Lộc': 'Dự định công danh hay dang dở, cần kiên trì và người trợ lực.',
    },
    combos: 'Thiên Không + Địa Kiếp/Địa Không = tăng tính hư hao. + chính tinh miếu + Khoa = ý tưởng lớn thành tựu.',
    advancedGeneral: 'Thiên Không hợp người nghiên cứu, sáng tạo, tu hành; với người cầu danh lợi thì chủ "công dã tràng" nếu không có cát tinh chế.',
  },
  'Thiên Khốc': {
    name: 'Thiên Khốc',
    basic:
      'Bại tinh kiêm "ưu sầu tinh" (Thủy) — theo Tử Vi Hàm Số, Khốc tượng trưng cho NƯỚC MẮT, lo buồn, ' +
      'xui xẻo. Người Mệnh có Khốc: da xanh, mắt có quầng đen, diện mạo buồn tẻ, mắt kém thần, hay ' +
      'trông xuống. Tính: u buồn, ủy mị, hay phiền muộn, đa sầu; bi quan yếm thế; lãng trí, hay quên; ' +
      'hốt hoảng hoang mang; ăn nói sai ngoa.\n' +
      'NGOẠI LỆ QUAN TRỌNG: tại TÝ và NGỌ thì hóa cát: CÓ CHÍ LỚN; có VĂN TÀI lỗi lạc, đặc biệt tài ' +
      'HÙNG BIỆN, nói năng đanh thép, hùng hồn; có khiếu hoạt động chính trị (rõ rệt hơn khi đi cùng cát tinh).',
    byPalace: {
      'Mệnh': 'Hãm địa: đa sầu đa cảm, hay ưu tư, bi quan. Tại Tý/Ngọ: hùng biện, có chí lớn, hợp chính trị – pháp luật.',
      'Phu Thê': 'Nhân duyên trắc trở buổi đầu — phải XA NHAU rồi mới lấy được nhau; vợ chồng ăn ở có nước mắt; thêm Kình/Đà thì xung khắc.',
      'Tử Tức': 'Sinh con khó nuôi, sinh nhiều nuôi ít, sát con (đặc biệt khi hãm).',
      'Tài Bạch': 'Khó kiếm tiền, hay lo âu vì tiền, hao tài. Tại Tý/Ngọ → trước nghèo sau giàu.',
      'Tật Ách': 'Dễ suy nhược do lo nghĩ, bệnh liên quan tâm lý; có thể đau cuống họng/thịt dư/bể tiếng (gặp Phá Toái).',
      'Phúc Đức': 'Hãm địa: tổn thọ, "có âm hồn báo oán". Đắc địa Tý/Ngọ: mã phát, hiển đạt.',
      'Phụ Mẫu': 'Lo lắng vì cha mẹ, hoặc xa cách buồn phiền.',
    },
    combos:
      'Khốc + Hư = bộ "KHỐC HƯ"; ở Tý/Ngọ đắc địa = cách BIỆN TÀI (ngôn ngữ, pháp lý, hùng biện). ' +
      '+ Hình + Mã = rất hiển đạt về võ nghiệp; đồng cung ở Dần càng uy danh. ' +
      '+ Sát/Phá đắc địa đồng cung = quyền cao chức trọng, uy danh lừng lẫy. ' +
      '+ Hóa Quyền = có tiếng tăm. + Kình + Tuế + Khách = TANG TÓC liên miên từ lúc lọt lòng. ' +
      '+ Kiếp + Phù + Khách + Cự + Nhật = suốt đời đau khổ, than khóc. ' +
      '+ Tang Môn = buồn về tang chế.',
    advancedGeneral:
      'Khốc Hư là BẠI TINH — ở đâu làm xấu cung đó, TRỪ PHI đắc địa Tý/Ngọ thì lại thành cách biện tài. ' +
      'Tại Thìn/Tuất hay "mắc cạn và vắn số". Lưu hạn gặp Khốc + Tang = có tang chế hoặc chuyện buồn tình phụ. ' +
      'Đại hạn đắc địa chỉ thịnh trong 5 năm sau, tiểu hạn chỉ nửa năm sau.',
  },
  'Thiên Hư': {
    name: 'Thiên Hư',
    basic:
      'Bại tinh kiêm "ưu sầu tinh" (Thủy) — theo Tử Vi Hàm Số, Hư đi cặp Khốc thành bộ KHỐC HƯ tượng ' +
      'trưng cho nước mắt, lo buồn, xui xẻo. Hư thiên về HAO TỔN VẬT CHẤT/SỨC KHỎE (Khốc thiên về tình cảm). ' +
      'Tính: u buồn, hay phiền muộn, bi quan, hoang mang. Tại Tý/Ngọ cũng hóa cát như Khốc — có chí, ' +
      'tài hùng biện, hợp chính trị.',
    byPalace: {
      'Mệnh': 'Hãm: tinh thần và thể chất hư hao, hay cảm thấy thiếu thốn, bi quan. Tý/Ngọ: có chí, biện tài.',
      'Tài Bạch': 'Tiền của hao hụt, dễ phá tài, không tụ; tại Tý/Ngọ → trước nghèo sau giàu.',
      'Tật Ách': 'Thể trạng hư nhược, khí huyết kém; có thể đau răng/hư răng nếu cùng Tuế Phá.',
      'Phu Thê': 'Nhân duyên trắc trở, vợ chồng có nước mắt.',
      'Tử Tức': 'Sinh con khó nuôi.',
      'Phúc Đức': 'Hãm: tổn thọ. Tý/Ngọ đắc: hiển đạt.',
    },
    combos:
      'Khốc Hư đồng cung Tý/Ngọ = BIỆN TÀI. + Đại Hao / Tiểu Hao = hao tán mạnh. + Hình + Mã = võ nghiệp hiển đạt. ' +
      '+ Tuế Phá = đau răng/hư răng. + Kiếp + Phù + Khách + Cự + Nhật = suốt đời ai oán đau buồn.',
    advancedGeneral:
      'Luận cùng Thiên Khốc — đôi sao tương sinh ý nghĩa: Khốc = nước mắt tình cảm; Hư = trống rỗng hao tổn. ' +
      'Cả hai chỉ thực sự cát khi đắc địa Tý/Ngọ và phối cát tinh.',
  },
  'Thiên Đức': {
    name: 'Thiên Đức',
    basic:
      'Cát tinh giải nạn (Hỏa) — chủ phúc đức, lòng nhân, hóa giải tai ương, được trời che. Tăng tính từ thiện, may mắn ngầm.',
    byPalace: {
      'Mệnh': 'Tính nhân hậu, có phúc, gặp hung hóa cát, được quý nhân ngầm giúp.',
      'Tật Ách': 'Bệnh tật dễ qua, gặp thầy gặp thuốc.',
      'Phúc Đức': 'Phúc dày, tâm thiện, hậu vận an.',
    },
    combos: 'Thiên Đức + Nguyệt Đức + Giải Thần = bộ giải hung mạnh. Đi với hung tinh thì giảm hung.',
    advancedGeneral: 'Thiên Đức là sao giải cứu nhẹ — phát huy khi cung gặp sát tinh; bản thân không tạo phú quý lớn.',
  },
  'Nguyệt Đức': {
    name: 'Nguyệt Đức',
    basic:
      'Cát tinh giải nạn (Thổ) — tương tự Thiên Đức, chủ đức hạnh, nhân từ, hóa giải tai ách, được phù trợ âm thầm (thiên về nữ/âm trợ).',
    byPalace: {
      'Mệnh': 'Hiền lành, có đức, gặp nạn có người giúp, tai qua nạn khỏi.',
      'Phu Thê': 'Phối ngẫu hiền đức, biết nhường nhịn.',
      'Tật Ách': 'Bệnh dễ hóa giải, có quý nhân/thầy thuốc.',
    },
    combos: 'Nguyệt Đức + Thiên Đức + Giải Thần = giải hung. + Thiên Lương = ấm phúc giải nạn mạnh.',
    advancedGeneral: 'Sao giải cứu, ý nghĩa rõ khi cung có hung sát; phối với Thiên Lương/Thiên Đức tăng lực hóa giải.',
  },
  'Thiên Hỷ': {
    name: 'Thiên Hỷ',
    basic:
      'Hỷ tinh đào hoa (Thủy) — theo Tử Vi Hàm Số, là cát tinh chủ:\n' +
      '• VUI VẺ, vui tính, thích cảnh vui, có ÓC HÀI HƯỚC, biết thưởng thức và pha trò (như Hỷ Thần).\n' +
      '• Đem lại những may mắn đáng mừng (chance).\n' +
      '• LỢI ÍCH cho việc cưới hỏi và sinh nở.\n' +
      'Hỷ luôn xung chiếu Hồng Loan; phối Hỷ Thần thì người ấy vui tính dễ cười, tạo hỷ khí với mọi người.',
    byPalace: {
      'Mệnh': 'Tính vui vẻ, lạc quan, có duyên, gương mặt tươi. Hỷ + Thiên Riêu = hay gây tai họa quái dị. ' +
              'Hỷ + Hồng Loan = sớm có nhân duyên. Hỷ + Đào Hoa = lả lơi, hoa nguyệt, ham vui ái tình; ' +
              'nữ mệnh dễ hư thân, lang chạ.',
      'Huynh Đệ (Bào)': 'Hỷ + Riêu + Đào + Phá Tướng chiếu: chị em có người theo trai, chửa hoang. ' +
                        'Hỷ + Thai + Đào + Hồng: có người ngoại dâm.',
      'Phu Thê': 'Hỷ + Đào + Hồng: sánh duyên cùng người đẹp dễ dàng; nhưng vợ/chồng có tính lả lơi, ong bướm. ' +
                 'Thêm Thiên Riêu, Thai → chắc chắn có ngoại tình.',
      'Quan Lộc': 'Hỷ + Đào + Hồng: làm nên lúc trẻ, nhờ phái nữ mà thăng tiến. ' +
                  'Hỷ + Đào + Hồng + Tấu + Vũ: nghề CA XƯỚNG (nghệ sĩ, ca sĩ, kịch sĩ có tiếng).',
      'Phúc Đức': '"Song Hỷ" (Hỷ + Hỷ Thần) tại Phúc = mã phát, hậu vận tốt, gia đạo nhiều niềm vui.',
      'Tử Tức': 'Lợi sinh nở, con cái mang niềm vui; Song Hỷ + Đào Hồng + Khôi Việt = sinh quý tử.',
      'Hạn (lưu niên)': 'Hỷ + Hồng + Đào: có tình duyên, bồ bịch. Hỷ + Hồng + Tả Hữu + Long Phượng + Riêu: có hỷ sự thành gia thất.',
    },
    combos:
      'Thiên Hỷ + Hồng Loan = SONG HỶ (luôn xung chiếu) — hôn nhân hỷ sự. ' +
      '+ Hỷ Thần = vui tính, hài hước, hợp diễn xuất; + Tấu Thư + Vũ Khúc + Đào + Hồng = cách hài kịch, ' +
      'diễn viên hài (kiểu Molière, Phi Thoàn). ' +
      '+ Đào Hoa = duyên tình đậm, lả lơi. + Thiên Riêu = tai họa quái dị (nếu hãm). ' +
      '+ Tang Môn / Thiên Khốc (người lớn tuổi) = có thể chuyển nghĩa HIẾU HỶ (tang chế), cần xét bối cảnh.',
    advancedGeneral:
      'Ứng mạnh các sự kiện CƯỚI HỎI / SINH CON / TIN VUI khi đại – tiểu vận gặp. Người trẻ: tốt cho tình ' +
      'duyên và sinh nở; người lớn tuổi cần xét Hỷ + Tang Khốc kẻo chuyển sang "hiếu hỷ" (việc hiếu). ' +
      'Cách Song Hỷ + Đào Hồng + Khôi Việt rất quý cho hôn nhân và con cái.',
  },
  'Cô Thần': {
    name: 'Cô Thần',
    basic:
      'Cô khắc tinh (Hỏa) — chủ cô đơn, lẻ loi, hình khắc lục thân, tình cảm lạnh nhạt (ứng mạnh cho nam).',
    byPalace: {
      'Mệnh': 'Tính hướng nội, cô độc, ít gần gũi người thân; hợp tu hành, nghiên cứu.',
      'Phu Thê': 'Hôn nhân lạnh nhạt, dễ chia ly hoặc kết hôn muộn.',
      'Tử Tức': 'Hiếm con hoặc xa cách con cái.',
    },
    combos: 'Cô Thần + Quả Tú = bộ "Cô Quả" cô đơn. + Thiên Mã = "Cô Thần ngộ Mã" tha hương cô độc.',
    advancedGeneral: 'Cô Quả tại Mệnh/Phu Thê/Tử Tức cần cát tinh điều hòa; hợp người tu hành, sống độc lập.',
  },
  'Quả Tú': {
    name: 'Quả Tú',
    basic:
      'Cô khắc tinh (Hỏa) — chủ cô quả, góa bụa, lẻ loi, tình duyên trắc trở (ứng mạnh cho nữ).',
    byPalace: {
      'Mệnh': 'Tính độc lập, lạnh, ít biểu lộ tình cảm; dễ cô đơn.',
      'Phu Thê': 'Hôn nhân trắc trở, dễ muộn màng hoặc xa cách.',
      'Phúc Đức': 'Tâm cô tịch, ưa một mình, hợp tín ngưỡng.',
    },
    combos: 'Quả Tú + Cô Thần = "Cô Quả". + Tang Môn/Thiên Khốc = cô sầu.',
    advancedGeneral: 'Như Cô Thần — luận theo giới (nữ ứng Quả Tú rõ hơn); cần cát tinh giải tại cung lục thân.',
  },
  'Hoa Cái': {
    name: 'Hoa Cái',
    basic:
      'Quý tinh "Đài Các tinh" (Kim) — theo Tử Vi Hàm Số: chủ sự CHƯNG DIỆN, xa hoa lộng lẫy, ưa vẻ ngoài ' +
      'đài các sang trọng quyến rũ; làm dáng, ham phô trương vẻ đẹp, thu hút sự yêu mến; kiểu cách trong ' +
      'bộ điệu – lời ăn tiếng nói – cách ăn mặc; ham chuộng thời trang, "snobisme", khao khát tình ái lãng ' +
      'mạn với những nhân vật danh tiếng. Mặt trái: dễ có ý nghĩa đa tình, đào hoa ngầm.',
    byPalace: {
      'Mệnh': 'Có khí chất đài các, ưa sang trọng và phô trương vẻ đẹp; hợp nghệ thuật, biểu diễn, ngoại giao; ' +
              'tính kiêu, dễ cô khi sa đà ham hư danh.',
      'Phúc Đức': 'Tâm hướng cái đẹp, đời sống tinh thần phong phú; ưa thanh cao, có thể nghiêng tâm linh, nghệ thuật.',
      'Phu Thê': 'Phối ngẫu thích chưng diện, lãng mạn; có nguy cơ đa tình nếu thêm Mộc Dục / Thiên Riêu / Đào Hoa.',
      'Quan Lộc': 'Hợp nghề trình diễn, thẩm mỹ, ngoại giao, văn hóa; được ngưỡng mộ, trọng vọng.',
      'Thiên Di': 'Ra ngoài được người để ý, ngưỡng mộ; hợp giao tế thượng lưu.',
      'Tử Tức': 'Con cái dung mạo đẹp, sang; cần giáo dưỡng tránh quá ham hư vinh.',
    },
    combos:
      'Hoa Cái + Long Trì + Phượng Các + Bạch Hổ = bộ "TỨ LINH" — chủ công danh, chức vị, uy quyền, ' +
      'sự ngưỡng mộ trọng vọng. + Mộc Dục + Thiên Riêu = se sua chưng diện, đào hoa nặng. + Thiên Tướng + ' +
      'Văn Khúc + Mộc + Đào = đàn bà đa tình theo lối sang cả, mê các mối tình "vương giả". + Tấu Thư = ' +
      'thanh cao lịch lãm, có gout về ăn mặc, có năng khiếu trình diễn. ' +
      '"Tiền Cái Hậu Mã" (Mệnh được Hoa Cái phía trước + Thiên Mã phía sau giáp) = phú quý sang cả. ' +
      '+ Tham Lang / Không Kiếp = thiên về tu hành, huyền học (dập tắt đào hoa).',
    advancedGeneral:
      'Hoa Cái vừa là quý tinh (cách Tứ Linh) vừa là đào hoa ngầm: ở cung Mệnh / Phúc Đức / Quan Lộc đắc ' +
      'cách thì sang trọng, được trọng vọng; ở cung Phu Thê / Tử Tức gặp đào hoa tinh (Mộc, Riêu, Đào, Hồng) ' +
      'thì cần đề phòng quá ham hư danh, sa đà tình ái. Cặp với Thiên Mã giáp Mệnh là cách phú quý đặc biệt.',
  },
  'Kiếp Sát': {
    name: 'Kiếp Sát',
    basic:
      'Hung sát tinh (Hỏa) — chủ tai kiếp bất ngờ, mất mát, trộm cướp, hao tổn đột ngột, tranh đoạt.',
    byPalace: {
      'Mệnh': 'Dễ gặp chuyện bất ngờ, hao tổn; cần đề phòng tai nạn, mất của.',
      'Tài Bạch': 'Dễ bị hao tài đột ngột, lừa gạt, trộm cắp.',
      'Tật Ách': 'Đề phòng tai nạn, thương tích bất ngờ.',
    },
    combos: 'Kiếp Sát + Hỏa Linh/Kình Đà = tai họa nặng. + Thiên Mã = tai nạn khi đi xa ("Mã ngộ Kiếp Sát").',
    advancedGeneral: 'Hung khi hội sát tinh tại Mệnh/Tài/Tật/Di; cần chính tinh miếu vượng và cát tinh hóa giải.',
  },
  'Phá Toái': {
    name: 'Phá Toái',
    basic:
      'Hung tinh (Hỏa) — theo Tử Vi Hàm Số, Phá Toái chủ về CUỐNG HỌNG, YẾT HẦU. Tính: ương ngạnh, ' +
      'cứng cổ, ngoan cố, ngang ngược, táo bạo; mặt tài lộc thì phá tán hao hụt, gây trở ngại cho mọi ' +
      'công việc; chóng chán, thiếu bền bỉ. Là sao "phá tán" — vào cung nào làm hao tán cung đó.',
    byPalace: {
      'Mệnh': 'Tính ngang ngược, cứng cổ, hay gặp trục trặc; lời nói dễ mất lòng, việc dễ dở dang.',
      'Tài Bạch': 'Hao tài lặt vặt, chi tiêu vụn, khó tích lũy.',
      'Phu Thê': 'Hay xích mích, dễ rạn nứt do chuyện vặt; cần nhẫn nhịn.',
      'Quan Lộc': 'Công việc hay trục trặc, dở dang, cấp trên dễ chê.',
      'Tật Ách': 'Lưu ý cuống họng/yết hầu; gặp Thiên Hình + Địa Kiếp + Bạch Hổ có thể chỉ ung thư cuống ' +
                 'họng phải mổ (ý nghĩa cổ điển — tham khảo). Tuy nhiên Phá Toái chủ "hao tán" nên đôi ' +
                 'khi ngược lại ÍT bệnh khi vào Tật Ách (như Đại/Tiểu Hao).',
      'Nô Bộc': 'Bạn bè đồng nghiệp hay đụng chạm, thị phi vặt.',
    },
    combos:
      'Lưu Hà + Phá Toái + Phá Quân đồng cung tại Mệnh = "TOÁI QUÂN LƯỠNG PHÁ" — rất uy hùng, hiển đạt ' +
      'về võ nghiệp, có nhiều chiến tích. ' +
      '+ Hóa Khoa / Hóa Quyền = tốt (chế bớt tính phá). ' +
      '+ Kình Dương + Hóa Kỵ + Phá Quân = có tật (có thể là nói ngọng). ' +
      '+ Hỏa Tinh (hoặc Linh Tinh) + Kình Dương = chết vì ác tật, ác bệnh.',
    advancedGeneral:
      'Phá Toái là tiểu hung tinh, ý nghĩa rõ nhất khi cùng các sát/Hao/Kỵ; đơn thủ ảnh hưởng nhẹ. ' +
      'Cách "Toái Quân Lưỡng Phá" (Lưu Hà + Phá Toái + Phá Quân) là cách võ tướng oai hùng. Tại cung ' +
      'Tật Ách lại nghịch lý: vì chủ hao tán nên có khi giảm bệnh, không nặng nề.',
  },
  'Long Trì': {
    name: 'Long Trì',
    basic:
      'Khoa danh quý tinh (Thủy) — theo Tử Vi Hàm Số, Long Trì chủ về MŨI (cơ thể) và là sao thanh quý: thông minh, tuấn dật, có văn chất, ôn hòa nhân hậu, điềm đạm, đoan trang, tướng mạo đẹp đẽ thanh tú, đặc biệt với nữ giới (da mặt hồng hào). Đi cặp Phượng Các thành bộ "Long Phượng" trọn vẹn về nhan sắc – tính hạnh – tài lộc – gia đạo.',
    byPalace: {
      'Mệnh': 'Phong thái thanh nhã, dung mạo đẹp, thông minh hiếu học; lợi hành chính, văn hóa, ngoại giao.',
      'Quan Lộc': 'Hỗ trợ khoa giáp, thi đỗ cao (đặc biệt tại Mão/Dậu); công danh hanh thông.',
      'Tài Bạch': 'Làm tăng tài lộc, điền sản (Long Trì còn chỉ nhà cửa, ao hồ).',
      'Phu Thê': 'May mắn trong hôn nhân — dễ yêu dễ cưới, vợ chồng tương đắc, đẹp đôi.',
      'Tử Tức': 'Dễ sinh con, sinh quý tử thông minh tuấn dật, dễ nuôi.',
      'Điền Trạch': 'Nhà cửa đẹp đẽ, có ao hồ; gặp Mộ → có di sản, nhà đất rộng rãi.',
      'Phúc Đức': 'Phú quý, dòng họ khá giả.',
    },
    combos:
      'Long Trì + Phượng Các = bộ "Long Phượng" thanh quý (nhan sắc + tài lộc + gia đạo). ' +
      '+ Thai Phụ = thăng quan, thi đỗ. + Thiên Riêu / Thiên Hỷ / Phi Liêm = đắc thời, hỷ sự đến nhanh ' +
      '(tình duyên, thi cử, quan lộ). + Thiên Lương (nữ mệnh) = có chồng danh giá, hiền. ' +
      '+ Xương Khúc, Khôi Việt, Tả Hữu = bộ "Hiền thần" phò tá Tử Phủ — đắc quan mau lẹ, cao quý.',
    advancedGeneral:
      'Long Phượng giáp/hội Mệnh là cách quý hiển. Lưu hạn: Long + Riêu/Hỷ = có dạm hỏi đưa đến hôn nhân; ' +
      'Long + Phượng + Cáo + Ấn = thi đỗ; Long + Mã = có dời nhà cửa. Long Trì gặp Kình = mũi sống trâu; ' +
      'Long + Khốc Hư + Hình = đau mũi cần mổ.',
  },
  'Phượng Các': {
    name: 'Phượng Các',
    basic:
      'Khoa danh quý tinh (Thổ) — theo Tử Vi Hàm Số, Phượng Các chủ về TAI (cơ thể) và là sao thanh quý: ' +
      'thông minh tuấn dật, ôn hòa nhân hậu, điềm đạm, đoan trang; dung mạo đẹp thanh tú; đi cặp Long Trì ' +
      'thành bộ "Long Phượng" — trọn vẹn nhan sắc, tính hạnh, tài lộc, gia đạo.',
    byPalace: {
      'Mệnh': 'Ưa cái đẹp, có khiếu thẩm mỹ, phong thái thanh cao, tai thính, nghe hiểu nhanh.',
      'Quan Lộc': 'Lợi khoa cử, danh tiếng; hợp nghề thẩm mỹ, văn hóa, ngoại giao.',
      'Tài Bạch': 'Tăng tài lộc qua danh tiếng; có duyên buôn bán những thứ cao cấp.',
      'Phu Thê': 'Hôn nhân đẹp đôi, dễ tương đắc; gặp Thiên Hỷ Hồng Loan thì hỷ sự đến đẹp.',
      'Tử Tức': 'Con cái dung mạo đẹp, thông tuệ.',
      'Điền Trạch': 'Nhà cửa khang trang, đẹp đẽ.',
      'Phúc Đức': 'Dòng họ khá giả, có phúc lộc.',
    },
    combos:
      'Phượng Các + Long Trì = "Long Phượng". + Tấu Thư = thính tai, có khiếu nghe nhạc/ngôn ngữ. ' +
      '+ Hoa Cái + Bạch Hổ + Long Trì = bộ "TỨ LINH" chủ công danh, chức vị, uy quyền. ' +
      '+ Thiên Hỷ Hồng Loan = hôn nhân hỷ đẹp. Phượng + Kình = cứng tai, lãng tai.',
    advancedGeneral:
      'Cặp Long Phượng là quý cách, đặc biệt với người làm văn hóa, nghệ thuật. Bộ Tứ Linh ' +
      '(Long–Phượng–Hổ–Cái) tại Mệnh hoặc Quan Lộc là cách công danh hiển đạt, có chức vị uy quyền.',
  },
  'Giải Thần': {
    name: 'Giải Thần',
    basic:
      'Cát tinh hóa giải (Kim) — chủ giải trừ tai ách, hung họa, kiện tụng, bệnh tật; "gặp dữ hóa lành".',
    byPalace: {
      'Mệnh': 'Gặp nạn có lối thoát, hung sự được hóa giải.',
      'Tật Ách': 'Bệnh nặng hóa nhẹ, tai qua nạn khỏi.',
      'Quan Lộc': 'Kiện tụng, rắc rối công việc dễ được giải.',
    },
    combos: 'Giải Thần + Thiên/Nguyệt Đức + Thiên Lương = bộ giải hung mạnh.',
    advancedGeneral: 'Phát huy khi cung có hung sát; là sao "chữa cháy", không tạo phú quý.',
  },
  'Thiên Y': {
    name: 'Thiên Y',
    basic:
      'Y dược tinh (Mộc) — chủ y thuật, thuốc men, chữa bệnh, lòng nhân; hợp người làm y dược, từ thiện. ' +
      'Theo các tài liệu Nam phái, Thiên Y vừa là "thầy thuốc" vừa là "thuốc hay": ở cung Tật Ách thì bệnh dễ gặp đúng thầy đúng thuốc; ở Mệnh/Quan thì hợp các nghề cứu chữa, chăm sóc con người (y, dược, điều dưỡng, đông y, tâm lý, công tác xã hội).',
    byPalace: {
      'Mệnh': 'Có duyên y dược, tâm nhân ái, mát tay chăm sóc; hợp nghề chữa bệnh/chăm sóc người.',
      'Tật Ách': 'Bệnh dễ gặp thầy gặp thuốc, mau khỏi; tai ách được cứu giải (cát tinh ở cung này rất quý).',
      'Quan Lộc': 'Hợp nghề y, dược, điều dưỡng, đông y, tư vấn sức khỏe, từ thiện.',
      'Phúc Đức': 'Tâm hướng thiện, hay giúp người, tích phúc nhờ việc cứu chữa.',
      'Tử Tức': 'Con cái có thể theo nghề chăm sóc/y tế; con dễ nuôi.',
    },
    combos: 'Thiên Y + Thiên Lương/Thiên Đức/Nguyệt Đức = cách lương y cứu người. + Thiên Cơ/Thái Âm = thầy thuốc giỏi, mát tay. + Thiên Hình (Tật Ách) = hợp ngoại khoa/giải phẫu, châm cứu.',
    advancedGeneral: 'Hỗ trợ nghề y dược và lòng nhân; tại Tật Ách giúp bệnh chóng lành, gặp tai ách có quý nhân/thầy giỏi. Phát huy mạnh khi phối Thiên Lương, Thiên Đức và các sao giải (Giải Thần, Thiên Giải, Quang Quý).',
  },
  'Thiên Trù': {
    name: 'Thiên Trù',
    basic:
      'Phúc thực tinh (Thổ) — chủ ăn uống, ẩm thực, lộc ăn, hưởng thụ vật chất; hợp nghề ẩm thực, dịch vụ.',
    byPalace: {
      'Mệnh': 'Có lộc ăn, thích ẩm thực, sống đầy đủ.',
      'Tài Bạch': 'Tiền từ nghề ăn uống, dịch vụ; lộc thực vượng.',
      'Điền Trạch': 'Gia đạo no đủ, bếp núc sung túc.',
    },
    combos: 'Thiên Trù + Lộc Tồn/Hóa Lộc = lộc thực dồi dào, hợp kinh doanh ẩm thực.',
    advancedGeneral: 'Tiểu cát tinh về phúc thực; rõ nghĩa với người làm dịch vụ ăn uống.',
  },
  'Thiên Tài': {
    name: 'Thiên Tài',
    basic:
      'Tinh phụ trợ (Mộc) — chủ tài trí tùy cơ, khôn khéo theo hoàn cảnh, có tài lẻ; ảnh hưởng tùy chính tinh đồng cung.',
    byPalace: {
      'Mệnh': 'Thông minh ứng biến, khéo theo thời; tài năng "tùy duyên".',
      'Tài Bạch': 'Biết liệu cơm gắp mắm, kiếm tiền theo hoàn cảnh.',
    },
    combos: 'Thiên Tài + chính tinh sáng = tăng cơ trí; + Thiên Thọ = cách "Tài Thọ" khôn ngoan, sống lâu.',
    advancedGeneral: 'Sao phụ nhẹ, ý nghĩa biến đổi theo chính tinh; không tự thành cách lớn.',
  },
  'Thiên Thọ': {
    name: 'Thiên Thọ',
    basic:
      'Thọ tinh (Thổ) — chủ trường thọ, điềm đạm, hiền hậu, sống lâu, biết tiết chế; giải yểu, tăng phúc thọ.',
    byPalace: {
      'Mệnh': 'Tính ôn hòa, điềm tĩnh, sống thọ, biết giữ mình.',
      'Tật Ách': 'Giải bớt bệnh tật, tăng tuổi thọ.',
      'Phúc Đức': 'Phúc thọ, an nhàn về già.',
    },
    combos: 'Thiên Thọ + Thiên Tài = "Tài Thọ". + Thiên Lương/Thiên Đồng = phúc thọ song toàn.',
    advancedGeneral: 'Sao thọ — phối Phúc/Tật tăng tuổi thọ và sự an ổn.',
  },
  'Tam Thai': {
    name: 'Tam Thai',
    basic:
      'Đài cát tinh (Thủy) — theo Tử Vi Hàm Số, Tam Thai chủ phần TRÁN (thiên đình) trên tướng mặt. ' +
      'Cùng Bát Tọa là hai sao "ưa thanh nhàn, hưởng thụ, an phận, ung dung" — biểu hiện học thuyết ' +
      'Lão Trang: thanh tịnh tâm hồn, bất chấp thăng trầm ngoại cảnh. Mặt trái: dễ lười biếng, không ' +
      'hiếu động, ít chí cách mạng, bảo thủ, "nắng chiều nào che chiều ấy".',
    byPalace: {
      'Mệnh': 'Phong thái đường hoàng, an nhàn ung dung; biết hưởng thụ, ít lo nghĩ; được tôn trọng nhưng ' +
              'thiếu chí phấn đấu mạnh.',
      'Quan Lộc': 'Tăng phẩm trật, danh phận; đặc biệt cách "Mộ Trung Thai Tọa" (Thai – Tọa – Mộ ở 4 cung Tứ Mộ ' +
                  'Thìn/Tuất/Sửu/Mùi) tại Mệnh hoặc Quan → quý hiển làm nên.',
      'Tài Bạch': 'Có tiền bạc điền sản; không lo âu về vật chất dù tài sản không nhiều.',
      'Điền Trạch': 'Có của cải, không thiếu thốn về nhà đất.',
      'Phúc Đức': 'Sống thanh nhàn, hậu vận an ổn, ít sóng gió.',
    },
    combos:
      'Tam Thai + Bát Tọa = bộ đài cát quý hiển (đặc biệt khi giáp/hội Mệnh – Quan). ' +
      '+ Mộ ở 4 cung Tứ Mộ = "Mộ Trung Thai Tọa" — cách quý hiển làm nên. ' +
      '+ Đào Hoa (tại Quan) = đắc quan từ lúc tuổi trẻ, ra làm việc sớm. ' +
      '+ Tử Vi / Thái Dương = thêm rạng rỡ uy danh. + Xương Khúc + Khôi Việt = khoa danh hiển hách.',
    advancedGeneral:
      'Thai Tọa hay được giải là "an phận thủ thường" — quý nhưng thiếu xông xáo. Đắc lực nhất khi GIÁP Mệnh ' +
      '(Thai bên trái, Tọa bên phải) hoặc HỘI trong tam hợp với Tử Phủ Nhật Nguyệt. Cách Mộ Trung Thai Tọa là ' +
      'cách quý cổ điển của những người làm nên sự nghiệp.',
  },
  'Bát Tọa': {
    name: 'Bát Tọa',
    basic:
      'Đài cát tinh (Mộc) — theo Tử Vi Hàm Số, Bát Tọa chủ phần CẰM (hạ đình) trên tướng mặt. Cùng Tam Thai ' +
      'là hai sao "ưa thanh nhàn, hưởng thụ, an phận, ung dung", biểu hiện rõ rệt nhất học thuyết Lão Trang ' +
      '(thanh tịnh tâm hồn). Mặt trái: lười biếng, không hiếu động, bảo thủ, xu thời.',
    byPalace: {
      'Mệnh': 'Có uy tín, vị thế trầm ổn, được người kính trọng; tính bình thản, ít tranh đua.',
      'Quan Lộc': 'Củng cố danh phận, địa vị; cách "Mộ Trung Thai Tọa" rất quý cho công danh.',
      'Tài Bạch': 'Đủ ăn đủ tiêu, không phải lo lắng; không phát đạt lớn nếu thiếu tài tinh.',
      'Điền Trạch': 'Có nhà đất, sống an cư.',
      'Phúc Đức': 'Phúc thọ an nhàn, hậu vận tốt.',
    },
    combos:
      'Bát Tọa + Tam Thai = bộ đài cát quý. + Mộ ở Tứ Mộ = "Mộ Trung Thai Tọa" quý hiển. ' +
      '+ Tử Phủ / Nhật Nguyệt = tăng quý cách. + Long Phượng + Thai Phụ = thi đỗ, thăng quan.',
    advancedGeneral:
      'Luận tương đồng Tam Thai — phát huy khi đủ cặp Tam Thai – Bát Tọa giáp hoặc hội Mệnh / Quan và phối ' +
      'chính tinh sáng. "Mộ Trung Thai Tọa" là cách kinh điển của những người làm nên sự nghiệp lớn.',
  },
  'Ân Quang': {
    name: 'Ân Quang',
    basic:
      'Khoa quý tinh (Hỏa) — chủ ân điển, được ban thưởng, thi cử đỗ đạt, vinh hiển; đi cặp Thiên Quý thành bộ "QUANG QUÝ". ' +
      'Theo Tử Vi Hàm Số: Quang Quý (Ân Quang – Thiên Quý) ngoài khoa giáp còn là bộ sao có tính GIẢI CỨU TAI ÁCH mạnh — như có thần linh phù hộ, gặp hung hóa cát, tai qua nạn khỏi. Người có Quang Quý thường nhân hậu, độ lượng, được người trên yêu mến và quý nhân nâng đỡ; rất lợi cho học hành, công danh và phúc thọ.',
    byPalace: {
      'Mệnh': 'Được trên yêu mến, có cơ hội thăng tiến, lợi thi cử; tính nhân từ, gặp hung được giải.',
      'Quan Lộc': 'Được đề bạt, ban ơn, công danh hiển; thi cử đỗ đạt cao khi hội văn tinh.',
      'Tật Ách': 'Bộ giải bệnh – cứu nạn: ốm đau gặp thầy giỏi thuốc hay, tai nạn được cứu thoát.',
      'Phúc Đức': 'Phúc dày, có thần linh che chở, hậu vận an lành.',
    },
    combos: 'Ân Quang + Thiên Quý = bộ "QUANG QUÝ" — ân sủng + giải cứu tai ách. + Khôi Việt Xương Khúc = khoa danh hiển đạt (đỗ cao). + Thiên Hình (nữ mệnh) = dập tính đào hoa, giữ đoan chính. + Tử Phủ Nhật Nguyệt = quý cách trọn vẹn.',
    advancedGeneral: 'Hỗ trợ khoa cử/thăng thưởng và GIẢI HUNG (theo Hàm Số, Quang Quý là một trong các sao "giải thần" — hóa giải sát tinh, cứu tai ách). Phát huy mạnh nhất khi đủ cặp Ân Quang – Thiên Quý hội Mệnh/Quan/Tật và phối văn quý tinh.',
  },
  'Thiên Quý': {
    name: 'Thiên Quý',
    basic:
      'Quý tinh (Thổ) — chủ quý hiển, được quý nhân, danh dự, ân điển; đi cặp Ân Quang thành bộ "QUANG QUÝ". ' +
      'Theo Tử Vi Hàm Số: Thiên Quý hợp Ân Quang chủ lòng nhân hậu, được hưởng phúc ấm và có khả năng GIẢI CỨU — gặp tai ách thì có quý nhân/thần linh phù trợ, hung hóa cát. Lợi khoa danh, công danh và phúc thọ.',
    byPalace: {
      'Mệnh': 'Có quý khí, được trọng vọng, gặp quý nhân; nhân hậu, gặp hung được hóa giải.',
      'Quan Lộc': 'Thăng tiến nhờ quý nhân, được tín nhiệm.',
    },
    combos: 'Thiên Quý + Ân Quang = bộ "QUANG QUÝ" (ân quý + giải cứu). + Khôi Việt Xương Khúc = quý nhân mạnh, khoa danh. + Tử Phủ Nhật Nguyệt = quý cách.',
    advancedGeneral: 'Luận chung với Ân Quang — cặp Quang Quý tăng quý cách công danh, thi cử và có tính GIẢI HUNG cứu nạn (Hàm Số). Mạnh nhất khi đủ cặp hội Mệnh/Quan/Tật.',
  },
  'Thai Phụ': {
    name: 'Thai Phụ',
    basic:
      'Khoa danh quý tinh (Thổ) — chủ phẩm trật, danh vị, văn chương, được phong tặng; đi cặp Phong Cáo.',
    byPalace: {
      'Mệnh': 'Tăng quý khí, lợi học hành, danh phận.',
      'Quan Lộc': 'Hỗ trợ thăng quan, phẩm trật, danh tiếng.',
    },
    combos: 'Thai Phụ + Phong Cáo = bộ phong tặng. + Văn Xương/Khúc = khoa danh hiển.',
    advancedGeneral: 'Phụ trợ văn tinh thành cách khoa bảng khi đủ cặp với Phong Cáo.',
  },
  'Phong Cáo': {
    name: 'Phong Cáo',
    basic:
      'Khoa danh quý tinh (Thổ) — chủ sắc phong, danh vị, văn thư quý; đi cặp Thai Phụ.',
    byPalace: {
      'Mệnh': 'Tăng danh phận, lợi văn chương, được công nhận.',
      'Quan Lộc': 'Hỗ trợ phẩm trật, bằng cấp, chức danh.',
    },
    combos: 'Phong Cáo + Thai Phụ = bộ phong tặng; phối Xương Khúc Khôi Việt = quý hiển.',
    advancedGeneral: 'Như Thai Phụ; ý nghĩa rõ khi hội văn quý tinh.',
  },
  'Thiên Riêu': {
    name: 'Thiên Riêu',
    basic:
      'Đào hoa hung tinh (Thủy) — theo Tử Vi Hàm Số, Thiên Riêu tượng cho LÔNG TRÊN CƠ THỂ; người có ' +
      'Riêu ở Mệnh nhiều lông (đa mao), đặc điểm sinh dục mạnh. Tính:\n' +
      '• ĐA DÂM, đa dục, hay chơi bời trụy lạc — bất lợi cho cả nam và nữ, đặc biệt nữ.\n' +
      '• Dễ sa ngã, bất chính, vô hạnh (rất giống Thai, Mộc Dục, Đào, Hồng, Tham Lang).\n' +
      '• DỊ ĐOAN MÊ TÍN: có tính đồng bóng, hay cúng kiến, cầu sao, xem số, xem bói.\n' +
      'NGOẠI LỆ: Riêu đắc địa tại MÃO/DẬU "ví như sen mọc trong bùn" — có sắc dục nhưng không bị nhơ ' +
      'nhuốc; tuy nhiên không nên hiểu theo nghĩa thanh cao, ý nghĩa dâm dục vẫn còn.',
    byPalace: {
      'Mệnh': 'Đa tình, có sức hút sinh lý; thông minh khéo léo nhưng dễ vướng tình ái, tâm cơ; hay dị đoan ' +
              'mê tín, có tính đồng bóng, ưa xem bói cúng kiến.',
      'Phu Thê': 'Vợ chồng đều dâm đãng, chơi bời, sắc dục. Có thể NGOẠI TÌNH nếu gặp Thiên Đồng, Đào, Hồng, Thai.',
      'Tử Tức (Tử / Bào)': 'Con lăng loàn, chơi bời. Anh chị em theo trai, chửa hoang nếu thêm Thai.',
      'Nô Bộc': 'Bạn bè ham chơi, sắc dục; dễ bị lôi kéo.',
      'Tật Ách': 'Bệnh BỘ PHẬN SINH DỤC (lậu, liệt dương, teo…) nếu gặp hung sát tinh; thủy thũng.',
      'Hạn (lưu niên)': 'Đại/Tiểu hạn gặp → thời gian đó thường CÓ NHÂN TÌNH SÂU ĐẬM, ân ái mặn nồng; ' +
                        'và hay tin dị đoan, coi bói xem tướng, cúng vái, đi chùa.',
    },
    combos:
      'Riêu + Đào (hoặc Hồng) = vừa lả lơi, vừa dâm đãng — bộ NGOẠI TÌNH ĐA MANG nặng (dù trai hay gái, ' +
      'dù có gia đình hay chưa). ' +
      'Riêu + Thiên Đồng = hay "thay cũ đổi mới" về sinh lý, đổi đào thay thép; có gia đình thì ngoại tình. ' +
      'Riêu + Xương Khúc + Thiên Cơ = bị dày vò vì nhu cầu sinh lý, ám ảnh sinh lý nặng, có khuynh hướng ' +
      'sáng tác thơ dâm tình (kiểu Hồ Xuân Hương) — hết sức dâm đãng. ' +
      'Riêu + Thai = rất dâm dục, có con riêng. ' +
      'Riêu + Hình = "Hình chế Riêu" — Hình ngay thẳng chế ngự được Riêu (nữ mệnh không lẳng lơ).',
    advancedGeneral:
      'Hung tinh về tình ái và sức khỏe sinh lý. Ở Mệnh / Phu Thê / Phúc gặp đào hoa cần cát tinh + Thiên ' +
      'Hình + Tử Phủ + Nhật đắc tiết chế. Riêu đắc địa Mão/Dậu vẫn dâm dục nhưng không nhơ nhuốc. ' +
      'Lưu niên gặp Riêu → cẩn trọng nhân tình và đề phòng tin tà đạo, dị đoan.',
  },
  'Thiên Quan': {
    name: 'Thiên Quan',
    basic:
      'Quý nhân tinh (Hỏa) — "Thiên Quan quý nhân", chủ được người trên đề bạt, có chức phận, phúc ấm quan trường.',
    byPalace: {
      'Mệnh': 'Có quý nhân là bậc quan chức nâng đỡ; phong thái đoan chính.',
      'Quan Lộc': 'Lợi đường công danh, được cất nhắc.',
    },
    combos: 'Thiên Quan + Thiên Phúc = bộ quý phúc; phối Khôi Việt = quý nhân mạnh.',
    advancedGeneral: 'Tăng phúc quan; phát huy khi hội cát tinh và chính tinh sáng.',
  },
  'Thiên Phúc': {
    name: 'Thiên Phúc',
    basic:
      'Phúc quý tinh (Thổ) — "Thiên Phúc quý nhân", chủ phúc lộc, được che chở, hưởng phúc ấm, giải hung nhẹ.',
    byPalace: {
      'Mệnh': 'Có phúc khí, gặp may, được giúp đỡ.',
      'Phúc Đức': 'Phúc dày, an vui, hậu vận tốt.',
    },
    combos: 'Thiên Phúc + Thiên Quan = bộ phúc quý; + Lộc Tồn = phúc lộc song toàn.',
    advancedGeneral: 'Sao phúc nhẹ; phối Thiên Quan và cát tinh tăng phúc lộc.',
  },
  'Lưu Hà': {
    name: 'Lưu Hà',
    basic:
      'Hung tinh (Thủy) — chủ tai ách liên quan nước, trôi nổi, hao tán, trắc trở vặt; xưa chủ "chết đuối", nay luận là rủi ro về nước/giao thông thủy.',
    byPalace: {
      'Mệnh': 'Đề phòng tai nạn sông nước, công việc trôi nổi bấp bênh.',
      'Tật Ách': 'Bệnh về thủy (thận, phù), đề phòng đuối nước.',
    },
    combos: 'Lưu Hà + Kiếp Sát/Kình Đà = tai họa thủy nạn. + Thiên Mã = bôn ba trôi nổi.',
    advancedGeneral: 'Tiểu hung tinh; ý nghĩa rõ khi hội sát tinh tại Tật/Di.',
  },
  'Đường Phù': {
    name: 'Đường Phù',
    basic:
      'Tinh phụ trợ (Thổ) — chủ thị phi quan sự nhỏ, vướng giấy tờ, kiện cáo lặt vặt; có tài liệu xem là sao phù trợ công danh nhẹ.',
    byPalace: {
      'Mệnh': 'Dễ vướng giấy tờ, thủ tục, tranh chấp nhỏ.',
      'Quan Lộc': 'Công việc nhiều thủ tục, văn thư; cẩn trọng hợp đồng.',
    },
    combos: 'Đường Phù + Quan Phù/Hóa Kỵ = thị phi quan sự. + Lộc Tồn = giảm nhẹ.',
    advancedGeneral: 'Tiểu tinh; rõ nghĩa khi cùng Quan Phù, Hóa Kỵ về kiện tụng giấy tờ.',
  },
  'Quốc Ấn': {
    name: 'Quốc Ấn',
    basic:
      'Quý tinh (Thổ) — chủ ấn tín, quyền chức, được giao trọng trách, có uy tín và quyền hành.',
    byPalace: {
      'Mệnh': 'Có quyền uy, được giao phó việc lớn, đáng tin cậy.',
      'Quan Lộc': 'Nắm thực quyền, có chức ấn, thăng tiến.',
    },
    combos: 'Quốc Ấn + Tướng Quân/Hóa Quyền = nắm quyền thực. + Tử Vi = thêm quyền uy.',
    advancedGeneral: 'Tăng quyền chức; phát huy cùng Hóa Quyền, Tướng Quân, chính tinh đắc địa.',
  },
  'Văn Tinh': {
    name: 'Văn Tinh',
    basic:
      'Văn tinh phụ trợ — chủ văn chương, học vấn, thi cử (lưu niên văn tinh ứng việc học/thi trong năm).',
    byPalace: {
      'Mệnh': 'Lợi học hành, văn chương, thi cử.',
      'Quan Lộc': 'Hỗ trợ khoa danh, học thuật.',
    },
    combos: 'Văn Tinh + Xương Khúc Khôi Việt = lợi thi cử khoa bảng trong vận.',
    advancedGeneral: 'Ứng mạnh theo lưu niên cho việc học/thi; phối văn quý tinh tăng hiệu lực.',
  },
  'Lưu Niên Văn Tinh': {
    name: 'Lưu Niên Văn Tinh',
    basic:
      'Văn tinh theo năm — chủ việc học hành, thi cử, văn thư, bằng cấp ứng trong lưu niên đó.',
    byPalace: {
      'Quan Lộc': 'Năm có lợi cho thi cử, học vị, văn bằng.',
      'Mệnh': 'Năm thuận cho học tập, sáng tác, giấy tờ.',
    },
    combos: 'Cùng Xương Khúc/Khôi Việt/Hóa Khoa trong lưu niên = năm thi cử đỗ đạt.',
    advancedGeneral: 'Chỉ xét theo từng năm (lưu niên); phối Hóa Khoa, văn tinh tăng cát cho việc học/thi.',
  },
  'Đẩu Quân': {
    name: 'Đẩu Quân',
    basic:
      'Tinh chủ tháng/khởi vận (Thổ) — dùng định điểm khởi tiểu hạn/tháng; bản thân chủ chừng mực, kỷ cương, không tạo cát hung lớn.',
    byPalace: {
      'Mệnh': 'Tính nề nếp, có kỷ luật; ảnh hưởng chủ yếu về thời điểm khởi vận.',
    },
    combos: 'Đẩu Quân dùng làm mốc tính tiểu hạn theo tháng; xét cùng lưu tinh trong vận.',
    advancedGeneral: 'Là sao công cụ định vận hạn theo tháng — luận hạn theo cung Đẩu Quân tới.',
  },
  'Thiên Thương': {
    name: 'Thiên Thương',
    basic:
      'Hung tinh hư hao (Thủy) — theo Tử Vi Hàm Số, Thương luôn đóng CỐ ĐỊNH tại cung NÔ BỘC, chỉ có ý ' +
      'nghĩa khi XÉT VẬN HẠN (đặc biệt tiểu hạn), KHÔNG có ý nghĩa lắm trên toàn cuộc đời. Cùng Thiên ' +
      'Sứ tạo bộ "THƯƠNG SỨ" chủ: buồn thảm; xui xẻo, ngăn trở mọi công việc; mang lại tang thương, ' +
      'bệnh tật, tai họa.',
    byPalace: {
      'Nô Bộc': 'Cố định ở đây — chỉ thể hiện rõ khi đại/lưu hạn đi tới hoặc giáp vào Mệnh.',
      'Lưu hạn (Đại/Tiểu)': 'Khi hạn nhập cung Thương: đề phòng hao tổn, mất của vì người, bị hãm hại, ' +
                            'tang thương. Họa đến nhanh khi Thương ở Sửu / Mão / Thìn / Dậu / Tuất.',
    },
    combos:
      'Thương + Sứ = cặp HUNG GIÁP vận. + Xương hay Khúc = tác họa khủng khiếp, có thể chết non nếu 2 ' +
      'hạn cùng xấu. + Tang Môn = có tang, sự biến đổi phi thường. + Khốc = thi cử lận đận. ' +
      '+ Thiên Hình = bị đánh. + Kình + Hỏa + Riêu + Cự = HẠI CỦA, HẠI NGƯỜI.',
    advancedGeneral:
      'Theo Nguyễn Mạnh Bảo, năm hạn gặp Thương Sứ mà không chết thì cũng nguy mạng nếu thiếu sao giải ' +
      'đủ mạnh. CÁC SAO GIẢI mạnh: Tử Vi, Thiên Phủ, Thiên Lương, Thiên Đồng (chính tinh); Hóa Khoa, Lộc, ' +
      'Tả Hữu, Quang Quý, Khôi Việt, Thiên Giải, Địa Giải, Giải Thần, Thiên Quan, Thiên Phúc, Tuần, Triệt. ' +
      'Cung Phúc nhiều sao tốt cũng chế giải mạnh — nhưng "chế giải" không có nghĩa là việc không xảy ra, ' +
      'mà nếu xảy ra sẽ không tác họa đúng mức.',
  },
  'Thiên Sứ': {
    name: 'Thiên Sứ',
    basic:
      'Hung tinh hư hao (Thủy) — theo Tử Vi Hàm Số, Sứ luôn đóng CỐ ĐỊNH tại cung TẬT ÁCH, chỉ có ý nghĩa ' +
      'khi XÉT VẬN HẠN. Cùng Thương thành bộ "THƯƠNG SỨ" — buồn thảm, xui xẻo, mang bệnh tật / tai họa / ' +
      'tang thương đến thình lình.',
    byPalace: {
      'Tật Ách': 'Cố định ở đây — đề phòng bệnh tật, tai nạn bất ngờ khi đại/lưu hạn đi tới.',
      'Lưu hạn (Đại/Tiểu)': 'Khi hạn nhập cung Sứ: đề phòng tai ách, bệnh nặng, mất mát. ' +
                            'Họa đến rất nhanh khi Sứ ở Tý / Mão / Thìn / Ngọ / Mùi; nhanh nếu ở Dần / Thân / Tị / Hợi.',
    },
    combos:
      'Sứ + Thương = cặp HUNG GIÁP vận. + Cơ + Cự + Hình = KIỆN TỤNG. + Tuế = chết nếu đại hạn xấu. ' +
      '+ Thiên Không + Lưu Kình đồng chiếu vào hạn = chết. + Tang + Hổ = có tang. ' +
      '+ Sứ ở Tý + Kình Đà + Tuế vào nhị hạn = chết. + Lục Sát hội = chết. ' +
      'Thương Sứ ở Tý/Dần = độc. + Sứ + Kình + Đà = dữ (Tử Vi / Đồng Lương giải được). ' +
      '+ Xương = khoa trường thi cử lận đận.',
    advancedGeneral:
      'Cặp Thương–Sứ là một trong những cặp hung mạnh nhất khi luận VẬN HẠN. Cần luôn xét cùng các sao giải: ' +
      'Tử Phủ Lương Đồng, Khoa Lộc, Tả Hữu, Quang Quý, Khôi Việt, Thiên/Địa Giải, Giải Thần, Thiên Quan, ' +
      'Thiên Phúc, Tuần, Triệt. Phúc Đức nhiều sao tốt thì chế giải mạnh và toàn diện.',
  },
  'Thiên La': {
    name: 'Thiên La',
    basic:
      'Hung tinh trói buộc (Thổ) — "lưới trời", cố định tại Thìn; chủ giam hãm, trở ngại, khó tiến, vướng mắc (đi cặp Địa Võng tại Tuất).',
    byPalace: {
      'Mệnh': 'Cảm giác bị trói buộc, khó bung sức; cần kiên nhẫn vượt hạn.',
      'Quan Lộc': 'Sự nghiệp dễ bị kìm hãm, thăng tiến chậm.',
    },
    combos: 'Thiên La (Thìn) + Địa Võng (Tuất) = "La Võng" giam hãm; chính tinh tại La Võng cần xung phá mới phát.',
    advancedGeneral: 'Người Mệnh tại Thìn/Tuất (La Võng) thường phát muộn, qua hạn xung phá La Võng mới hanh thông.',
  },
  'Địa Võng': {
    name: 'Địa Võng',
    basic:
      'Hung tinh trói buộc (Thổ) — "lưới đất", cố định tại Tuất; chủ vây hãm, trắc trở, chậm phát (đi cặp Thiên La tại Thìn).',
    byPalace: {
      'Mệnh': 'Khó bung tỏa, cuộc đời nhiều ràng buộc; nhẫn nại sẽ qua.',
      'Quan Lộc': 'Công danh chậm, dễ bị kìm; phát về hậu vận.',
    },
    combos: 'Địa Võng + Thiên La = "La Võng" giam hãm; cần xung động (Sát Phá Tham, hung tinh xung) để thoát.',
    advancedGeneral: 'Như Thiên La — cách La Võng chủ phát muộn, "rồng cá thoát lưới" khi hạn xung phá.',
  },
  'Tuần': {
    name: 'Tuần',
    basic:
      'TUẦN TRUNG KHÔNG VONG (gọi tắt "Tuần") — an theo Can năm sinh, luôn chiếm 2 cung liền nhau. ' +
      'Theo Tử Vi Hàm Số: Tuần là một "bức màn che / sự ngăn cách tạm thời", chủ sự HOÃN LẠI, làm CHẬM, ' +
      'ngăn trở nhẹ chứ không cắt đứt hẳn (nhẹ hơn Triệt). Nguyên tắc luận: Tuần đóng vào cung có CHÍNH TINH ' +
      'SÁNG / CÁT TINH thì làm GIẢM cái tốt (tốt đến muộn, bị trì hoãn); đóng vào cung có CHÍNH TINH HÃM / ' +
      'SÁT TINH thì lại HÓA GIẢI bớt cái xấu (che chắn cái hung). Tuần ảnh hưởng mạnh ở NỬA ĐẦU đời (trước ~30 tuổi), ' +
      'về sau giảm dần. Cung Vô Chính Diệu gặp Tuần đôi khi là cách hay ("Vô chính diệu đắc Tam Không").',
    byPalace: {
      'Mệnh': 'Tính cách kín đáo, hướng nội, phát triển chậm, thành công đến muộn; nửa đầu đời nhiều trắc trở, hậu vận tỏ. Mệnh VCD gặp Tuần (+ Triệt) có thể thành cách quý ("đắc Không").',
      'Huynh Đệ': 'Anh em ít gắn kết, xa cách hoặc giúp nhau muộn; cung xấu thì Tuần đỡ bớt mâu thuẫn.',
      'Phu Thê': 'Hôn nhân muộn hoặc trắc trở ban đầu, duyên đến chậm; nếu cung xấu thì Tuần che bớt sóng gió.',
      'Tử Tức': 'Con cái đến muộn (hiếm/chậm con); tình cảm cha con phát triển dần về sau.',
      'Tài Bạch': 'Tiền tài đến chậm, dễ đình trệ giai đoạn đầu; tài tinh bị Tuần thì lộc tới muộn, phải kiên trì tích góp.',
      'Tật Ách': 'Tuần tại Tật (cung xấu) là cách TỐT — che chắn, bệnh tật tai ách giảm nhẹ, "lành ít dữ nhiều" được hóa giải.',
      'Thiên Di': 'Ra ngoài lúc đầu chưa thuận, cơ hội xa quê đến muộn; bôn ba một thời gian mới ổn.',
      'Nô Bộc': 'Bạn bè/người dưới đến rồi đi, khó giữ lâu; quan hệ thật sự gắn kết muộn.',
      'Quan Lộc': 'Công danh phát muộn, thăng tiến chậm; qua trung vận (sau 30) mới hanh thông.',
      'Điền Trạch': 'Tậu nhà đất muộn, sản nghiệp tích lũy chậm nhưng dần vững.',
      'Phúc Đức': 'Hưởng phúc về sau; nửa đầu đời tâm chưa an, hay nghĩ ngợi, trung niên trở đi mới thư thái.',
      'Phụ Mẫu': 'Quan hệ cha mẹ xa cách hoặc hưởng phúc ấm muộn; có thể sống xa song thân thời trẻ.',
    },
    combos: 'Tuần + Triệt ĐỒNG CUNG = lực ngăn trở rất mạnh ("Tuần Triệt án ngữ"). Tuần + chính tinh miếu vượng = tốt đến muộn. Tuần + sát tinh/chính tinh hãm = hóa giải bớt hung. Tuần che cung Mệnh VCD + Nhật Nguyệt/Đồng Lương sáng chiếu = cách đặc biệt hậu phát.',
    advancedGeneral:
      'Luận Tuần phải xét đồng thời: (1) cung đó vốn TỐT hay XẤU — Tuần làm chậm/giảm cái sẵn có; (2) TUỔI — mạnh nhất nửa đầu đời (trước ~30), sau đó nhạt dần; ' +
      '(3) ĐẠI/TIỂU VẬN đi qua cung bị Tuần thường khởi đầu chậm, cuối vận mới chuyển; (4) Tuần còn ảnh hưởng nhẹ tới cung XUNG CHIẾU (đối diện). ' +
      'Nguyên tắc cốt lõi: "gặp tốt thì hoãn tốt, gặp xấu thì đỡ xấu". Khác Triệt ở chỗ Tuần chỉ HOÃN — việc vẫn đến, chỉ muộn; còn Triệt thì CẮT — dễ mất hẳn.',
  },
  'Triệt': {
    name: 'Triệt',
    basic:
      'TRIỆT LỘ KHÔNG VONG (gọi tắt "Triệt") — an theo Can năm sinh, luôn chiếm 2 cung liền nhau. ' +
      'Theo Tử Vi Hàm Số: Triệt là sự CẮT ĐỨT, chặn đứng, phá ngang — mạnh và dứt khoát hơn Tuần (Tuần chỉ hoãn, ' +
      'Triệt thì chặt đứt). Nguyên tắc luận giống Tuần nhưng nặng hơn: Triệt đóng cung CHÍNH TINH SÁNG / CÁT TINH ' +
      '→ phá hỏng/cắt mất cái tốt (rất đáng tiếc); đóng cung CHÍNH TINH HÃM / SÁT TINH → chặn đứng cái xấu (hóa hung hiệu quả). ' +
      'Triệt ảnh hưởng mạnh nhất ở NỬA ĐẦU đời (đặc biệt trước 30 tuổi), sau 30 tuổi giảm nhiều.',
    byPalace: {
      'Mệnh': 'Nửa đầu đời lận đận, hay bị "chặn đường", làm gì cũng dễ đứt gánh giữa chừng; sau 30 tuổi vượng dần. Mệnh VCD + Triệt + Tuần có thể là cách quý hiếm (hậu phát lớn).',
      'Huynh Đệ': 'Anh em chia lìa, ít nhờ vả được; tình thân dễ đứt đoạn.',
      'Phu Thê': 'Tình duyên đầu dễ tan vỡ, dễ lỡ dở một lần rồi mới yên; hôn nhân muộn; cung xấu thì Triệt chặn bớt sóng gió.',
      'Tử Tức': 'Hiếm muộn rõ hơn Tuần, hoặc con cái xa cách; duyên con mỏng thời trẻ.',
      'Tài Bạch': 'Tiền tài giai đoạn đầu khó tụ, dễ đứt nguồn, làm rồi mất; tài tinh bị Triệt thì lộc bị cắt, phải qua trung vận mới phát.',
      'Tật Ách': 'Triệt tại Tật (cung xấu) là cách TỐT — chặn đứng tai ách, bệnh nặng hóa nhẹ, "thoát hiểm".',
      'Thiên Di': 'Ra ngoài buổi đầu gặp cản trở, dự định xa quê dễ gãy; cần kiên trì làm lại.',
      'Nô Bộc': 'Bạn bè/người dưới phản phúc hoặc dứt tình, khó có người gắn bó lâu thời trẻ.',
      'Quan Lộc': 'Công danh trắc trở buổi đầu, dễ gãy đổ kế hoạch, đổi nghề nhiều lần; phát muộn sau khi qua vận Triệt.',
      'Điền Trạch': 'Nhà đất buổi đầu dễ mất/bán đi, sản nghiệp gây dựng rồi tan; tích lũy bền về sau.',
      'Phúc Đức': 'Nửa đầu đời tâm bất an, phúc bị "cắt"; trung niên trở đi mới hưởng được sự yên ổn.',
      'Phụ Mẫu': 'Sớm xa cách cha mẹ, hoặc duyên với song thân đứt đoạn; ít được hưởng phúc ấm thời trẻ.',
    },
    combos: 'Triệt + Tuần ĐỒNG CUNG = "Tuần Triệt án ngữ" lực cản cực mạnh. Triệt + chính tinh miếu = phá cái quý (rất tiếc). Triệt + sát tinh/chính tinh hãm = chặn hung tốt. Triệt cư Mệnh/Thân nửa đầu đời = thăng trầm lớn. Triệt đóng Dần–Mão (cung "mộc") theo cổ thư là nơi Triệt mạnh nhất.',
    advancedGeneral:
      'Triệt mạnh và DỨT KHOÁT hơn Tuần (Tuần hoãn — việc vẫn tới muộn; Triệt cắt — dễ mất hẳn, phải làm lại từ đầu). ' +
      'Luận cốt lõi: "gặp tốt thì cắt tốt, gặp xấu thì chặn xấu", ảnh hưởng dồn vào NỬA ĐẦU đời (nặng nhất trước 30). ' +
      'Đại/tiểu vận vào cung bị Triệt thường gãy đổ buổi đầu vận, phải kiên nhẫn qua mới chuyển. Triệt cũng tác động nhẹ lên cung XUNG CHIẾU. ' +
      'Cung Vô Chính Diệu được Tuần – Triệt – Thiên Không/Địa Không hội ("đắc Tam Không") đôi khi lại thành cách lớn, đại khí vãn thành.',
  },
  'Thiên Giải': {
    name: 'Thiên Giải',
    basic:
      'Cát tinh hóa giải (Mộc) — chủ giải trừ tai ách, hung họa, bệnh tật, kiện tụng; gặp dữ hóa lành.',
    byPalace: {
      'Tật Ách': 'Bệnh nặng hóa nhẹ, tai qua nạn khỏi.',
      'Quan Lộc': 'Rắc rối, kiện tụng dễ được giải.',
      'Mệnh': 'Gặp nạn có lối thoát, hung sự được hóa.',
    },
    combos: 'Thiên Giải + Địa Giải + Giải Thần = bộ giải hung mạnh.',
    advancedGeneral: 'Sao cứu giải — phát huy khi cung có hung sát; không tạo phú quý.',
  },
  'Địa Giải': {
    name: 'Địa Giải',
    basic:
      'Cát tinh hóa giải (Mộc) — tương tự Thiên Giải, chủ hóa giải tai ương, bệnh tật, vướng mắc.',
    byPalace: {
      'Tật Ách': 'Bệnh dễ chữa, tai ách giảm.',
      'Mệnh': 'Hung họa được hóa giải, gặp khó có người gỡ.',
    },
    combos: 'Địa Giải + Thiên Giải + Giải Thần = giải hung. Đi với hung tinh thì giảm hung.',
    advancedGeneral: 'Luận như Thiên Giải; cặp Thiên–Địa Giải tăng lực hóa giải.',
  },

  // ─────────────────── VÒNG THÁI TUẾ (12 sao) ───────────────────
  // Vòng Thái Tuế khởi tại chi năm sinh, an theo chiều thuận, chia 4
  // nhóm tam hợp:
  //   • Nhóm 1 — Thái Tuế · Quan Phù · Bạch Hổ: chủ khẩu tài, lý
  //     luận sắc bén, hoạt bát, dễ thành công (nhưng nhiều thị phi).
  //   • Nhóm 2 — Tử Phù · Thiếu Dương · Phúc Đức: tinh thần sáng
  //     suốt, có chủ kiến nhưng dễ lấn át người.
  //   • Nhóm 3 — Tuế Phá · Tang Môn · Điếu Khách: thông minh tháo
  //     vát nhưng khó đạt sở nguyện, hay phiền muộn, hiếu sự.
  //   • Nhóm 4 — Long Đức · Thiếu Âm · Trực Phù: ôn hòa, hợp vị trí
  //     phụ tá / làm công ăn lương, được âm trợ.
  'Thái Tuế': {
    name: 'Thái Tuế',
    basic:
      'Chủ tinh vòng Thái Tuế (Hỏa) — đóng ngay tại chi năm sinh. Chủ năm tuổi, khẩu tài lý luận, uy danh, đồng thời chủ thị phi, khẩu thiệt, quan sự, tranh chấp. Đắc cách thì chính đại quang minh, có uy tín, lý tưởng cao; gặp hung thì thị phi kiện tụng.',
    byPalace: {
      'Mệnh': 'Cá tính mạnh, lý luận sắc, nói thẳng, có chủ kiến và uy; nhưng dễ vướng thị phi, khẩu thiệt, cố chấp.',
      'Phụ Mẫu': 'Quan hệ cha mẹ thẳng thắn nhưng dễ va chạm lời nói, ý kiến trái chiều.',
      'Quan Lộc': 'Công việc nhiều tranh luận, cạnh tranh; đắc cát thì có uy quyền, hợp ngôn luận – pháp lý.',
      'Phúc Đức': 'Tâm chính trực, nhiều suy tư, hay tranh biện trong lòng; cầu toàn.',
      'Thiên Di': 'Ra ngoài có tiếng nói, dễ gây chú ý nhưng cũng dễ thị phi nơi xa.',
      'Nô Bộc': 'Quan hệ bạn bè hay tranh luận, dễ bất đồng quan điểm.',
    },
    combos: 'Thái Tuế + Quan Phù/Bạch Hổ (cùng nhóm tam hợp) = khẩu tài mạnh nhưng nặng thị phi, quan tụng. + Tấu Thư/Hóa Khoa/Xương Khúc = lời nói có uy, hợp pháp luật, ngôn luận, giảng dạy. + Hóa Kỵ = thị phi, kiện tụng nặng. Xung với Tuế Phá.',
    advancedGeneral: 'Người "đắc Thái Tuế" mang quang minh chính đại, lý tưởng cao; gặp cát (Khoa, Tấu Thư) thì lập danh bằng ngôn luận, gặp hung (Quan Phù, Bạch Hổ, Hóa Kỵ, Hình) thì kiện tụng thị phi triền miên.',
  },
  'Thiếu Dương': {
    name: 'Thiếu Dương',
    basic:
      'Sao vòng Thái Tuế (Hỏa) — thuộc nhóm 2 (Tử Phù – Thiếu Dương – Phúc Đức). Tiểu cát, chủ dương khí, sáng suốt, hỷ khí nhẹ, hanh thông vừa phải, có tin vui nhỏ; tính thẳng, có chủ kiến.',
    byPalace: {
      'Mệnh': 'Tính lạc quan, sáng dạ, có chính kiến; việc thường hanh thông nhẹ.',
      'Quan Lộc': 'Công việc có chút thuận lợi, đôi khi có tin vui nghề nghiệp.',
      'Phúc Đức': 'Tâm sáng, suy nghĩ tích cực, ít u uất.',
      'Tử Tức': 'Lợi nhẹ về con trai, con cái sáng sủa.',
    },
    combos: 'Thiếu Dương + Thái Dương/cát tinh = tăng dương khí, hanh thông. Cùng nhóm Tử Phù – Phúc Đức: sáng suốt nhưng dễ lấn át, cần khiêm.',
    advancedGeneral: 'Tiểu cát của vòng Thái Tuế; ảnh hưởng nhẹ, rõ hơn khi xét theo lưu niên và phối cát tinh.',
  },
  'Tang Môn': {
    name: 'Tang Môn',
    basic:
      'Sao vòng Thái Tuế (Mộc) — thuộc nhóm 3 (Tuế Phá – Tang Môn – Điếu Khách). Chủ tang chế, hiếu phục, buồn phiền, chia ly, hao tổn về lục thân; thông minh tháo vát nhưng nhiều ưu sầu.',
    byPalace: {
      'Mệnh': 'Hay ưu tư, đa cảm, dễ gặp chuyện buồn về người thân; cứng cỏi che giấu nội tâm.',
      'Phụ Mẫu': 'Đề phòng tang sự, bệnh tật, lo lắng nhiều vì cha mẹ.',
      'Tật Ách': 'Buồn phiền ảnh hưởng sức khỏe, dễ suy nhược do tâm lý.',
      'Phu Thê': 'Tình cảm dễ buồn, xa cách, có lúc tang thương trong vận xấu.',
      'Huynh Đệ': 'Anh em dễ xa cách, ly tán hoặc có tang.',
      'Phúc Đức': 'Tâm nhiều phiền muộn, nghĩ ngợi về sinh tử, dễ bi quan.',
    },
    combos: 'Tang Môn + Bạch Hổ = bộ "Tang Hổ" tang chế (lưu niên gặp đề phòng hiếu sự). + Thiên Khốc/Thiên Hư/Điếu Khách = sầu khổ, hiếu sự rõ. + Giải Thần/Thiên Đức = giảm nhẹ.',
    advancedGeneral: 'Lưu niên Tang Môn (hoặc xung Bạch Hổ) là điểm hạn hiếu sự, mất mát, kiện tụng; mức độ tùy chính tinh và sao giải.',
  },
  'Thiếu Âm': {
    name: 'Thiếu Âm',
    basic:
      'Sao vòng Thái Tuế (Thủy) — thuộc nhóm 4 (Long Đức – Thiếu Âm – Trực Phù). Tiểu cát, chủ âm trợ kín đáo, hỷ sự nhỏ, được quý nhân (thường nữ) ngầm giúp; tính ôn hòa, kín đáo.',
    byPalace: {
      'Mệnh': 'Được giúp đỡ âm thầm, gặp may nhỏ, tính nhu hòa, hợp vai phụ tá.',
      'Phu Thê': 'Có trợ duyên kín trong tình cảm, phối ngẫu hiền.',
      'Nô Bộc': 'Có người âm thầm giúp đỡ, bạn bè kín đáo nhưng thật.',
      'Tài Bạch': 'Có nguồn lợi ngầm, được hỗ trợ tài chính kín.',
    },
    combos: 'Thiếu Âm + Thái Âm/cát tinh = tăng âm trợ, quý nhân nữ. Cùng nhóm Long Đức – Trực Phù: hợp làm công, phụ tá, được che chở.',
    advancedGeneral: 'Tiểu cát; ý nghĩa mờ khi đơn thủ, rõ hơn theo lưu niên và khi phối quý nhân tinh.',
  },
  'Quan Phù': {
    name: 'Quan Phù',
    basic:
      'Sao vòng Thái Tuế (Hỏa) — thuộc nhóm 1 (Thái Tuế – Quan Phù – Bạch Hổ). Chủ quan sự, kiện tụng, thị phi pháp lý, vướng văn thư công quyền; nhưng nhóm này cũng cho khẩu tài, lý luận sắc.',
    byPalace: {
      'Mệnh': 'Lý luận sắc, hay tranh biện; dễ vướng kiện tụng, thị phi quan sự — cần cẩn trọng pháp lý.',
      'Quan Lộc': 'Công việc dễ dính tranh chấp, văn thư, pháp lý; người làm luật/công quyền thì hợp (chế nghiệp).',
      'Điền Trạch': 'Đề phòng tranh chấp, kiện tụng nhà đất, giấy tờ tài sản.',
      'Tài Bạch': 'Tiền bạc dễ vướng tranh chấp, hợp đồng kiện cáo.',
      'Phụ Mẫu': 'Gia đình dễ có chuyện giấy tờ, pháp lý liên quan người trên.',
    },
    combos: 'Quan Phù + Bạch Hổ/Thái Tuế (cùng nhóm) + Hóa Kỵ = quan tụng nặng. + Thiên Hình = pháp lý, hình sự. + Tấu Thư/Hóa Khoa = chuyển thành cách dùng pháp luật/ngôn luận làm nghề.',
    advancedGeneral: 'Lưu niên Quan Phù gặp hung sát chủ kiện tụng, tranh chấp; người hành nghề pháp luật, công quyền lại "lấy nghề hóa cách".',
  },
  'Tử Phù': {
    name: 'Tử Phù',
    basic:
      'Sao vòng Thái Tuế (Kim) — thuộc nhóm 2 (Tử Phù – Thiếu Dương – Phúc Đức). Tiểu hung, chủ trở ngại, hao tổn nhỏ, lo buồn vặt, công việc đình trệ; nhóm này tinh thần sáng nhưng dễ lấn át.',
    byPalace: {
      'Mệnh': 'Hay gặp trắc trở nhỏ, tâm trạng dễ chùng; có chủ kiến nhưng dễ áp đặt.',
      'Tài Bạch': 'Tài chính trì trệ, hao vặt, thu chi không đều.',
      'Quan Lộc': 'Công việc dễ đình trệ, vướng thủ tục lặt vặt.',
      'Phúc Đức': 'Tâm hay lo nghĩ vụn vặt, khó hoàn toàn thư thái.',
    },
    combos: 'Tử Phù + Tiểu Hao/Đại Hao/Thiên Hư = hao tổn rõ. + sát tinh = trở ngại nặng trong vận.',
    advancedGeneral: 'Tiểu hung vòng Thái Tuế; ảnh hưởng nhẹ, xét theo lưu niên và phối các sao hao/sát.',
  },
  'Tuế Phá': {
    name: 'Tuế Phá',
    basic:
      'Sao vòng Thái Tuế (Hỏa) — thuộc nhóm 3 (Tuế Phá – Tang Môn – Điếu Khách), đứng xung đối Thái Tuế. Chủ phá tán, xung khắc, hao tổn, đổ vỡ, bất hòa, sự việc dở dang trong năm.',
    byPalace: {
      'Mệnh': 'Năm/đại vận dễ có xáo trộn, bất hòa, hao tán, kế hoạch dễ đổ.',
      'Tài Bạch': 'Hao tài, thất thoát, dễ đổ vỡ làm ăn, mất tiền oan.',
      'Phu Thê': 'Dễ xung khắc, bất hòa, chia ly trong vận gặp.',
      'Quan Lộc': 'Sự nghiệp dễ trục trặc, đổ vỡ kế hoạch, mâu thuẫn nội bộ.',
      'Điền Trạch': 'Hao tổn nhà đất, sửa chữa, tranh chấp tài sản.',
      'Huynh Đệ': 'Bất hòa anh em, dễ rạn nứt tình thân.',
    },
    combos: 'Tuế Phá + Đại Hao/Tang Hổ = phá tán, hao tổn nặng. + Hóa Kỵ = bất hòa, đổ vỡ rõ. Luôn xung Thái Tuế — năm Tuế Phá là năm "phá tuế" cần thận trọng.',
    advancedGeneral: 'Lưu niên Tuế Phá đề phòng xáo trộn lớn, hao tài, mâu thuẫn, kiện tụng; cần cát tinh và sao giải hóa.',
  },
  'Long Đức': {
    name: 'Long Đức',
    basic:
      'Sao vòng Thái Tuế (Thủy) — thuộc nhóm 4 (Long Đức – Thiếu Âm – Trực Phù). Cát tinh, chủ phúc đức, giải nạn, gặp hung hóa cát, được che chở; tính ôn hòa, hợp vị trí phụ tá.',
    byPalace: {
      'Mệnh': 'Có phúc, tâm hướng thiện, gặp hung hóa lành; tính nhu thuận, được người che.',
      'Tật Ách': 'Bệnh tật dễ qua, gặp thầy gặp thuốc, tai ách giảm.',
      'Phúc Đức': 'Phúc dày, tâm an, sống thiện, hậu vận tốt.',
      'Quan Lộc': 'Công việc hanh thông nhẹ, hợp vai phụ trợ, được nâng đỡ.',
      'Phu Thê': 'Phối ngẫu hiền đức, hôn nhân được che chở.',
    },
    combos: 'Long Đức + Thiên Đức/Nguyệt Đức/Giải Thần = bộ giải hung mạnh. + Lộc Tồn = phúc lộc.',
    advancedGeneral: 'Cát tinh giải nạn của vòng Thái Tuế; phát huy rõ khi cung có hung sát cần hóa giải.',
  },
  'Bạch Hổ': {
    name: 'Bạch Hổ',
    basic:
      'Sao vòng Thái Tuế (Kim) — thuộc nhóm 1 (Thái Tuế – Quan Phù – Bạch Hổ). Hung tinh, chủ tang thương, máu huyết, tai nạn, kiện tụng, bệnh tật; đắc cách (võ, y, pháp) thì lại chủ uy quyền, hổ tướng.',
    byPalace: {
      'Mệnh': 'Cương mãnh, quyết liệt, có uy; dễ tai thương, thị phi — người võ/y/pháp lại thành cách có quyền.',
      'Tật Ách': 'Đề phòng tai nạn đổ máu, mổ xẻ, bệnh cấp, thương tích.',
      'Phụ Mẫu': 'Đề phòng tang sự, bệnh nặng của cha mẹ.',
      'Phu Thê': 'Hôn nhân dễ xung khắc, có lúc tang thương trong vận xấu.',
      'Tử Tức': 'Đề phòng con cái tai nạn, sinh nở khó (nữ).',
      'Huynh Đệ': 'Anh em dễ tai ách, ly tán, có tang.',
    },
    combos: 'Bạch Hổ + Tang Môn = bộ "Tang Hổ" tang chế. + Kình Dương/Thiên Hình/Hóa Kỵ = tai nạn đổ máu, quan tụng nặng. + chính tinh võ (Thất Sát, Phá Quân, Vũ Khúc) đắc địa = uy dũng.',
    advancedGeneral: 'Lưu niên Bạch Hổ (hoặc xung Tang Môn) là điểm hạn tang thương, tai nạn, kiện tụng; người làm võ, y, pháp thì "lấy nghề chế sát".',
  },
  'Phúc Đức': {
    name: 'Phúc Đức',
    basic:
      'Sao vòng Thái Tuế (Thổ) — thuộc nhóm 2 (Tử Phù – Thiếu Dương – Phúc Đức). Cát tinh, chủ phúc lộc, an vui, hưởng thụ, gặp may, được phù hộ. (Là SAO, khác với CUNG Phúc Đức.)',
    byPalace: {
      'Mệnh': 'Có phúc, sống an, gặp việc may, ít tai ách; tính lạc quan, có chủ kiến.',
      'Tài Bạch': 'Tài lộc hanh thông, hưởng thụ vật chất tốt, có lộc ăn.',
      'Phúc Đức': 'Phúc khí dày, an nhàn, hậu vận sung túc (sao Phúc Đức nhập cung Phúc Đức — rất tốt).',
      'Tật Ách': 'Tai ách được giảm, bệnh dễ qua.',
      'Điền Trạch': 'Gia trạch yên vui, có phúc về nhà cửa.',
    },
    combos: 'Phúc Đức + Long Đức/Thiên Đức/Nguyệt Đức = tăng phúc, giải hung. + Lộc Tồn/Hóa Lộc = phúc lộc song toàn.',
    advancedGeneral: 'Cát tinh phúc lộc của vòng Thái Tuế; phối các Đức tinh và Lộc tăng an lành, hưởng thụ.',
  },
  'Điếu Khách': {
    name: 'Điếu Khách',
    basic:
      'Sao vòng Thái Tuế (Hỏa) — thuộc nhóm 3 (Tuế Phá – Tang Môn – Điếu Khách). Tiểu hung, chủ thị phi, lời ra tiếng vào, phiền muộn vì người ngoài, viếng tang, đi lại vì việc buồn.',
    byPalace: {
      'Mệnh': 'Dễ vướng lời thị phi, phiền muộn vì người ngoài; hay phải lo việc của người khác.',
      'Nô Bộc': 'Bạn bè dễ gây phiền, nói xấu, lôi kéo vào thị phi.',
      'Thiên Di': 'Ra ngoài dễ gặp lời tiếng, phiền toái, đi viếng/lo việc buồn.',
      'Phụ Mẫu': 'Dễ lo lắng, phiền muộn liên quan người lớn trong nhà.',
    },
    combos: 'Điếu Khách + Tang Môn/Thiên Khốc = sầu, hiếu sự. + Quan Phù = thị phi lời nói, kiện cáo nhỏ.',
    advancedGeneral: 'Tiểu hung; ý nghĩa rõ khi cùng Tang – Khốc – Quan Phù trong lưu niên (việc tang, thị phi).',
  },
  'Trực Phù': {
    name: 'Trực Phù',
    basic:
      'Sao vòng Thái Tuế (Thổ) — thuộc nhóm 4 (Long Đức – Thiếu Âm – Trực Phù). Tiểu hung nhẹ, chủ thị phi vặt, vướng quan sự nhỏ, lo phiền giấy tờ; tương tự Quan Phù mức nhẹ; nhóm này hợp làm công, phụ tá.',
    byPalace: {
      'Mệnh': 'Dễ vướng chuyện thủ tục, lời tiếng nhỏ; hợp vai trợ lý, làm công.',
      'Quan Lộc': 'Công việc phiền hà giấy tờ, thị phi nhẹ; hợp vị trí cấp dưới.',
      'Nô Bộc': 'Quan hệ dễ có hiểu lầm vặt.',
    },
    combos: 'Trực Phù + Quan Phù/Hóa Kỵ = thị phi quan sự rõ hơn. Cùng nhóm Long Đức – Thiếu Âm: được âm trợ, hợp làm công ăn lương.',
    advancedGeneral: 'Tiểu hung; ảnh hưởng nhẹ, xét theo lưu niên cùng các sao quan sự.',
  },

  // ─────────────────── VÒNG LỘC TỒN / BÁC SỸ (12 sao) ───────────────────
  // Vòng Bác Sỹ (còn gọi vòng Lộc Tồn vì Bác Sỹ luôn đồng cung Lộc
  // Tồn), an thuận/nghịch theo Dương nam Âm nữ. Chia 4 nhóm tam hợp:
  //   • (Lộc Tồn – Bác Sỹ) · Tướng Quân · Bệnh Phù
  //   • Lực Sĩ · Tấu Thư · Đại Hao
  //   • Thanh Long · Phi Liêm · Phục Binh
  //   • Tiểu Hao · Hỷ Thần · Quan Phủ
  'Bác Sỹ': {
    name: 'Bác Sỹ',
    basic:
      'Chủ tinh vòng Bác Sỹ (Thủy) — luôn đồng cung Lộc Tồn. Chủ thông minh, học rộng, tài trí, lòng tốt, sự ban lành; tăng trí tuệ và năng lực chuyên môn cho cung tọa thủ.',
    byPalace: {
      'Mệnh': 'Thông minh, ham học, có chuyên môn và lòng tốt; lợi đường trí thức, được người quý vì tài.',
      'Quan Lộc': 'Hợp nghề chuyên môn, học thuật, cố vấn, nghiên cứu; thành danh nhờ trí.',
      'Tài Bạch': 'Đi cùng Lộc Tồn — tiền của có nền, biết tích, kiếm tiền bằng trí tuệ.',
      'Phúc Đức': 'Tâm thiện, ưa học hỏi, hậu vận có phúc trí.',
      'Tử Tức': 'Con cái thông minh, hiếu học.',
    },
    combos: 'Bác Sỹ + Văn Xương/Văn Khúc = trí tuệ, học vấn cao. + Thiên Khôi/Thiên Việt = vinh dự, được người trên đề đạt. + Tả Phù/Hữu Bật = có người thưởng thức, nâng đỡ. Luôn đi với Lộc Tồn (tăng trí + lộc).',
    advancedGeneral: 'Rất tốt cho học vấn, chuyên môn; phát huy mạnh khi cùng Lộc Tồn, văn tinh (Xương Khúc), quý nhân (Khôi Việt) và phụ tá (Tả Hữu).',
  },
  'Lực Sĩ': {
    name: 'Lực Sĩ',
    basic:
      'Sao vòng Bác Sỹ (Hỏa) — thuộc nhóm Lực Sĩ – Tấu Thư – Đại Hao. Chủ sức mạnh, dũng cảm, chính trực, uy lực, tinh thần tiến thủ, sức bền và lòng giúp người.',
    byPalace: {
      'Mệnh': 'Khỏe khoắn, có chí tiến thủ, cương trực, làm việc mạnh mẽ, bền bỉ.',
      'Quan Lộc': 'Có lực thăng tiến, hợp việc cần sức và uy, võ nghiệp, thể thao.',
      'Tật Ách': 'Thể lực tốt, sức đề kháng cao (nếu không gặp sát).',
      'Tài Bạch': 'Kiếm tiền bằng sức lực, nghề cần thể lực/ý chí.',
    },
    combos: 'Lực Sĩ + Tướng Quân/Hóa Quyền/Quốc Ấn = tăng quyền lực, khí thế. Cùng nhóm Tấu Thư – Đại Hao: có tài nhưng dễ hao nếu thiếu tiết chế.',
    advancedGeneral: 'Tăng động lực, uy lực; phối Quyền/Tướng Quân/Quốc Ấn thành cách có thực quyền, hợp người hành động.',
  },
  'Thanh Long': {
    name: 'Thanh Long',
    basic:
      'Sao vòng Bác Sỹ (Thủy) — thuộc nhóm Thanh Long – Phi Liêm – Phục Binh. Cát tinh, chủ hỷ khí, tài lộc, tin vui, hanh thông, tài chính thuận, có duyên gặp may.',
    byPalace: {
      'Mệnh': 'Gặp may, có tin vui, hanh thông, tính tình cởi mở.',
      'Tài Bạch': 'Tài lộc đến thuận, có hỷ tài, làm ăn gặp vận.',
      'Quan Lộc': 'Công việc hanh thông, có tin vui sự nghiệp, dễ thăng.',
      'Phu Thê': 'Hôn nhân có hỷ sự, tình cảm vui.',
      'Điền Trạch': 'Có hỷ về nhà đất, tậu được sản nghiệp.',
    },
    combos: 'Thanh Long + Lộc Tồn/Hóa Lộc = hỷ tài, phát lộc. + Hỷ Thần/Thiên Hỷ/Hồng Loan = tin vui, hỷ sự. + Thiên Mã = hỷ tài tha hương.',
    advancedGeneral: 'Cát tinh tài – hỷ; ứng tài lộc và tin vui theo vận, mạnh khi phối Lộc và các hỷ tinh.',
  },
  'Tiểu Hao': {
    name: 'Tiểu Hao',
    basic:
      'Sao vòng Bác Sỹ (Hỏa) — thuộc nhóm Tiểu Hao – Hỷ Thần – Quan Phủ. Hung nhẹ, chủ hao tốn nhỏ, chi tiêu vặt, thất thoát lặt vặt, tiền khó tụ.',
    byPalace: {
      'Tài Bạch': 'Hao tài lặt vặt, nhiều khoản chi nhỏ, khó tích lũy.',
      'Mệnh': 'Tốn kém vặt, tiêu pha rộng tay, khó dành dụm.',
      'Điền Trạch': 'Nhà cửa hao phí sửa sang, chi vặt cho gia trạch.',
      'Tật Ách': 'Hao tổn sức khỏe lặt vặt, ốm vặt tốn kém.',
    },
    combos: 'Tiểu Hao + Đại Hao = bộ "song Hao" hao tán mạnh. + Tuế Phá/Hóa Kỵ = phá tài. + Lộc Tồn = giảm nhẹ.',
    advancedGeneral: 'Tiểu hung về tài; nhẹ khi đơn thủ, nặng khi cùng Đại Hao/Tuế Phá/Hóa Kỵ tại Tài – Điền.',
  },
  'Tướng Quân': {
    name: 'Tướng Quân',
    basic:
      'Sao vòng Bác Sỹ (Mộc) — thuộc nhóm (Lộc Tồn – Bác Sỹ) – Tướng Quân – Bệnh Phù. Chủ uy vũ, quyền chỉ huy, dũng mãnh, quyết đoán, khí phách tướng lĩnh.',
    byPalace: {
      'Mệnh': 'Có khí phách, quyết đoán, thích chỉ huy, không chịu khuất; hợp lãnh đạo.',
      'Quan Lộc': 'Hợp lãnh đạo, võ nghiệp, quản lý đội nhóm, chỉ huy.',
      'Phu Thê': 'Phối ngẫu cá tính mạnh, có uy; cần dung hòa.',
      'Tử Tức': 'Con cái cứng cỏi, có chí, độc lập.',
      'Tài Bạch': 'Kiếm tiền bằng quyết đoán, dám làm lớn.',
    },
    combos: 'Tướng Quân + Quốc Ấn/Hóa Quyền = nắm quyền, có chức thực. + Lực Sĩ = uy lực mạnh. + chính tinh võ (Thất Sát, Phá Quân, Vũ Khúc) = tướng cách.',
    advancedGeneral: 'Tăng uy quyền chỉ huy; phối Quyền/Quốc Ấn/Lực Sĩ và chính tinh đắc địa thành cách có thực quyền.',
  },
  'Tấu Thư': {
    name: 'Tấu Thư',
    basic:
      'Sao vòng Bác Sỹ (Kim) — thuộc nhóm Lực Sĩ – Tấu Thư – Đại Hao. Cát tinh, chủ văn thư, tài ăn nói, trình bày, giấy tờ thuận, lợi ngôn luận và khoa danh.',
    byPalace: {
      'Mệnh': 'Khéo nói, giỏi trình bày, lợi văn thư, có duyên ăn nói.',
      'Quan Lộc': 'Hợp nghề giấy tờ, hành chính, truyền thông, ngôn luận, giáo dục.',
      'Phúc Đức': 'Ưa văn chương, lời lẽ, đời sống tinh thần phong phú.',
      'Tử Tức': 'Con cái khéo nói, lợi học hành.',
    },
    combos: 'Tấu Thư + Văn Xương/Văn Khúc/Hóa Khoa = văn tài, lợi thi cử, trình bày. + Thái Tuế = lời nói có uy, hợp pháp lý/ngôn luận.',
    advancedGeneral: 'Lợi văn thư – ngôn luận; phối văn tinh và Hóa Khoa tăng khoa danh, hợp nghề "lấy lời làm nghề".',
  },
  'Phi Liêm': {
    name: 'Phi Liêm',
    basic:
      'Sao vòng Bác Sỹ (Hỏa) — theo Tử Vi Hàm Số, Phi Liêm chủ về TÓC trên cơ thể (nếu cùng Hồng Loan ' +
      'là tóc dài, đẹp). Tính: vui vẻ, lanh lợi, nhậm lẹ; nhưng làm GIẢM số con, không lợi cho thai sản – ' +
      'sinh nở, có đặc tính hiếm muộn (như Vũ Khúc, Thái Âm hãm, Thất Sát, Phá Quân, Thiên Hình…). ' +
      'Thuộc nhóm tam hợp Thanh Long – Phi Liêm – Phục Binh; tiểu hung chủ thị phi, lời đàm tiếu, ganh ' +
      'ghét, chuyện tình ái thị phi.',
    byPalace: {
      'Mệnh': 'Tính lanh lợi, nhanh nhẹn; dễ bị nói xấu sau lưng, vướng đàm tiếu.',
      'Tử Tức': 'Giảm số con, dễ hiếm muộn, sinh nở khó; gặp Hồng Loan + Đào Hoa thì cách thai sản phức tạp.',
      'Phu Thê': 'Tình cảm dễ bị dị nghị, thị phi xen vào; gặp sao đào hoa nặng → dễ ngoại tình bị đàm tiếu.',
      'Nô Bộc': 'Đề phòng tiểu nhân, bạn bè ganh ghét, nói xấu.',
      'Quan Lộc': 'Công việc dễ bị gièm pha, cạnh tranh ngầm; cần kín kẽ.',
      'Tật Ách': 'Lưu ý vấn đề tóc (rụng tóc, hói); thai sản khó.',
    },
    combos:
      'Phi Liêm + Hồng Loan = tóc dài, đẹp; nhưng ở Tử Tức/Phu Thê có thể chỉ thai sản phức tạp. ' +
      '+ Quan Phù / Phá Toái / Phục Binh (tam hợp) = thị phi đàm tiếu rõ. ' +
      '+ Long Trì / Phượng Các / Thiên Hỷ = đắc thời, hỷ sự đến nhanh (tình duyên, thi cử). ' +
      '+ chính tinh đắc địa = hóa giải tính thị phi.',
    advancedGeneral:
      'Tiểu hung; ý nghĩa rõ khi cùng các sao thị phi (Quan Phù, Phá Toái) trong vận, đặc biệt tại Mệnh – ' +
      'Phu Thê – Nô Bộc. Tại cung Tử Tức là điểm cần lưu ý: Phi Liêm là một trong các sao chủ HIẾM MUỘN, ' +
      'nên xét kèm Vũ Khúc, Thái Âm hãm, Thất Sát, Phá Quân để luận thai sản chính xác.',
  },
  'Hỷ Thần': {
    name: 'Hỷ Thần',
    basic:
      'Sao vòng Bác Sỹ (Hỏa) — thuộc nhóm Tiểu Hao – Hỷ Thần – Quan Phủ. Cát tinh, chủ vui mừng, hỷ sự, may mắn, tài lộc, sinh nở, hôn nhân, thi cử đỗ đạt.',
    byPalace: {
      'Mệnh': 'Tính vui vẻ, lạc quan, hay gặp tin vui, có duyên.',
      'Phu Thê': 'Lợi hỷ sự, hôn nhân vui; ứng năm cưới khi vận gặp.',
      'Tử Tức': 'Lợi sinh nở, con cái mang niềm vui.',
      'Tài Bạch': 'Có hỷ tài, tiền đến cùng tin vui.',
      'Quan Lộc': 'Tin vui sự nghiệp, thi cử đỗ đạt.',
    },
    combos: 'Hỷ Thần + Thanh Long/Thiên Hỷ = hỷ tài, hỷ sự. + Hồng Loan/Đào Hoa = hôn nhân, tình duyên hỷ. + Lộc = phát tài có tin vui.',
    advancedGeneral: 'Cát tinh hỷ; ứng tin vui (cưới hỏi, sinh con, thi cử, tài lộc) theo đại/tiểu vận, mạnh khi phối các hỷ tinh.',
  },
  'Bệnh Phù': {
    name: 'Bệnh Phù',
    basic:
      'Sao vòng Bác Sỹ (Thổ) — thuộc nhóm (Lộc Tồn – Bác Sỹ) – Tướng Quân – Bệnh Phù. Hung nhẹ, chủ bệnh tật vặt, uể oải, sức khỏe sa sút, lo phiền dây dưa.',
    byPalace: {
      'Tật Ách': 'Hay ốm vặt, sức khỏe trì trệ, bệnh dai dẳng nhẹ.',
      'Mệnh': 'Dễ mệt mỏi, tinh thần uể oải, hay lo về sức khỏe.',
      'Phụ Mẫu': 'Lo lắng về bệnh tật của cha mẹ.',
      'Phu Thê': 'Phối ngẫu sức khỏe yếu, hay đau ốm vặt.',
    },
    combos: 'Bệnh Phù + Thiên Sứ/Bệnh/Hóa Kỵ/Tang Hổ = bệnh tật rõ trong vận. + Thiên Y/Giải Thần/Thiên Đức = giảm nhẹ.',
    advancedGeneral: 'Tiểu hung sức khỏe; xét nặng nhẹ cùng cung Tật Ách, sao Bệnh (Trường Sinh) và các sao giải.',
  },
  'Đại Hao': {
    name: 'Đại Hao',
    basic:
      'Sao vòng Bác Sỹ (Hỏa) — thuộc nhóm Lực Sĩ – Tấu Thư – Đại Hao. Hung tinh, chủ hao tán lớn, phá tài, thất thoát mạnh, chi tiêu lớn, "nhân mã hao tài".',
    byPalace: {
      'Tài Bạch': 'Hao tài lớn, dễ vỡ nợ/phá sản nếu gặp sát; chi tiêu lớn khó kiểm soát.',
      'Mệnh': 'Cuộc đời hao tốn, tiền vào ra lớn, khó giữ của.',
      'Điền Trạch': 'Hao tổn nhà đất, dễ bán/mất sản nghiệp.',
      'Quan Lộc': 'Sự nghiệp tốn kém, đầu tư lớn dễ thua.',
    },
    combos: 'Đại Hao + Tiểu Hao = bộ "song Hao". + Tuế Phá/Hóa Kỵ/Kiếp Sát = phá tài nặng. + Lộc Tồn/Hóa Lộc = giảm bớt.',
    advancedGeneral: 'Hung tài mạnh; tại Tài – Điền gặp sát Kỵ cần đề phòng phá sản, đầu tư thua lỗ, mất của lớn.',
  },
  'Phục Binh': {
    name: 'Phục Binh',
    basic:
      'Sao vòng Bác Sỹ (Hỏa) — thuộc nhóm Thanh Long – Phi Liêm – Phục Binh. Hung tinh, chủ ám hại ngầm, tiểu nhân mai phục, mưu kế sau lưng, thị phi và phản trắc ngầm.',
    byPalace: {
      'Mệnh': 'Đề phòng bị hại ngầm, tiểu nhân ám toán; cần kín kẽ, đề cao cảnh giác.',
      'Nô Bộc': 'Bạn bè/người dưới dễ phản, mưu hại sau lưng.',
      'Quan Lộc': 'Đồng nghiệp/cấp dưới dễ chơi xấu, tranh quyền ngầm.',
      'Huynh Đệ': 'Anh em dễ bằng mặt không bằng lòng.',
    },
    combos: 'Phục Binh + Phi Liêm/Đà La = tiểu nhân ám hại rõ. + Kình Dương/Kiếp Sát = nguy hiểm ngầm, ám toán nặng.',
    advancedGeneral: 'Hung ngầm; nguy khi cùng sát tinh tại Mệnh – Nô – Quan; cần cát tinh hóa giải và sống kín đáo.',
  },
  'Quan Phủ': {
    name: 'Quan Phủ',
    basic:
      'Sao vòng Bác Sỹ (Hỏa) — thuộc nhóm Tiểu Hao – Hỷ Thần – Quan Phủ. Hung tinh, chủ quan tụng, kiện cáo, vướng pháp lý, giấy tờ tranh chấp, hình ngục.',
    byPalace: {
      'Mệnh': 'Dễ vướng kiện tụng, tranh chấp pháp lý; người làm luật/công quyền lại hợp.',
      'Quan Lộc': 'Công việc dễ dính tố tụng, hợp đồng tranh chấp.',
      'Điền Trạch': 'Đề phòng kiện tụng nhà đất, giấy tờ tài sản.',
      'Tài Bạch': 'Tiền bạc dễ vướng tranh chấp pháp lý.',
    },
    combos: 'Quan Phủ + Quan Phù/Bạch Hổ/Thiên Hình/Hóa Kỵ = quan tụng, hình ngục nặng. + cát tinh/Giải Thần = giảm.',
    advancedGeneral: 'Hung pháp lý; người hành nghề luật, công quyền, võ thì "lấy nghề chế nghiệp"; cần cát giải khi vận xấu.',
  },

  // ─────────────────── VÒNG TRƯỜNG SINH (12 sao) ───────────────────
  // Vòng Trường Sinh mô tả quy luật sinh – trưởng – thành – hoại của
  // sinh mệnh: Thai · Dưỡng · Tràng Sinh · Mộc Dục · Quan Đới · Lâm
  // Quan thuộc Dương (hướng thịnh, thuận); Đế Vượng · Suy · Bệnh · Tử ·
  // Mộ · Tuyệt thuộc Âm (hướng suy, nghịch). Đắc cách (Tràng Sinh, Đế
  // Vượng, Lâm Quan, Quan Đới, Thai, Dưỡng) thì tốt; Tử, Tuyệt, Bệnh,
  // Suy thì xấu; Mộc Dục chủ đào hoa, Mộ chủ kho tàng.
  'Tràng Sinh': {
    name: 'Tràng Sinh',
    basic:
      'Sao đứng đầu vòng Trường Sinh — tượng "sinh ra", chủ sức sống, sự sinh sôi nảy nở, khởi đầu, phát triển, trường thọ và phúc khí. Đóng đâu cũng cát: làm cho sự việc có gốc rễ, dễ hồi phục, tăng tuổi thọ và sinh lực.',
    byPalace: {
      'Mệnh': 'Khí sắc tốt, sinh lực dồi dào, có tài phát triển, làm việc gì cũng có nền; hậu vận và tuổi thọ tốt.',
      'Phụ Mẫu': 'Cha mẹ phúc thọ, được sinh dưỡng đầy đủ, tình thân tốt.',
      'Phúc Đức': 'Phúc dày, sống thọ, an lành, dòng họ hưng vượng.',
      'Tài Bạch': 'Tài lộc có nguồn gốc, sinh sôi bền, làm ăn càng về sau càng phát.',
      'Tử Tức': 'Con cái khỏe mạnh, đông, dễ nuôi, có hậu.',
      'Quan Lộc': 'Sự nghiệp có gốc, phát triển bền vững, càng làm càng lên.',
      'Tật Ách': 'Sức khỏe tốt, bệnh dễ khỏi, hồi phục nhanh, ít tai ách.',
      'Điền Trạch': 'Sản nghiệp sinh sôi, gia trạch hưng vượng.',
    },
    combos: 'Tràng Sinh + Lộc Tồn/Hóa Lộc/Đế Vượng = "sinh vượng" phát mạnh. + Thiên Đồng/Thiên Lương/Thiên Thọ = phúc thọ. Cùng tam hợp Tràng Sinh – Đế Vượng – Mộ thì khí sinh vượng đắc dụng.',
    advancedGeneral: 'Là điểm "sinh phát" của vòng — rất cát, tăng lực mọi cung; mạnh nhất khi đắc địa (Dần Thân Tị Hợi) và phối Lộc, chính tinh miếu vượng.',
  },
  'Mộc Dục': {
    name: 'Mộc Dục',
    basic:
      'Sao thứ hai vòng Trường Sinh — tượng "tắm gội cho đứa trẻ mới sinh"; còn gọi là "Bại tinh" vì giai ' +
      'đoạn này non yếu, dễ hỏng. Theo Tử Vi Hàm Số, Mộc Dục chủ:\n' +
      '• Hay THAY ĐỔI, canh cải, bỏ dở việc nửa chừng (đồng nghĩa Thiên Đồng – tính bốc đồng).\n' +
      '• NÔNG NỔI, bất định (giống Hóa Kỵ về điểm dao động).\n' +
      '• Hay CHƯNG DIỆN, làm dáng, trang điểm — đặc tính nữ giới (coquetterie).\n' +
      '• DÂM DẬT, phóng đãng, phong tình (débauche) — nặng nhất khi đi cùng Tham Lang, Hoa Cái, ' +
      'Thiên Riêu, Thai (có thể là người loạn dâm).',
    byPalace: {
      'Mệnh': 'Ưa cái mới, đa tình, hiếu kỳ, dễ thay đổi và sa đà; ý nghĩa "thay đổi" rất nổi bật với Mệnh ' +
              'Vô Chính Diệu có Mộc Dục thủ/chiếu — hay bỏ dở việc, học hành gián đoạn, đổi ngành/đổi nghề ' +
              'dở dang. Cần định hướng, tiết chế tửu sắc.',
      'Phu Thê': 'Vợ/chồng hay chưng diện, chải chuốt; dễ đa tình, ngoại tình (đặc biệt khi thêm Thiên Riêu).',
      'Tử Tức': 'Ít con, muộn con; gặp Hóa Kỵ → hao con vì "tử cung suy".',
      'Tật Ách & Hạn': 'Khó sinh, thai nghén có bệnh tật; gặp Địa Kiếp + Hóa Kỵ → hư thai, đau tử cung.',
      'Quan Lộc': 'Mộc Dục ở Mệnh hoặc Quan (thiếu cát tinh) thường chuyên về CÔNG NGHỆ — đặc biệt thợ ' +
                  'vàng, thợ bạc, thợ rèn; hoặc nghề giao tế, nghệ thuật nhiều cám dỗ.',
      'Phúc Đức': 'Tâm ưa hưởng lạc, đào hoa, khó tĩnh; phúc giảm nếu sa đà.',
      'Tài Bạch': 'Tiền dễ tiêu vào hưởng thụ, ăn chơi; khó tích lũy.',
    },
    combos:
      'Mộc Dục + Đào Hoa / Hồng Loan / Thiên Riêu = "Đào hoa Mộc Dục" — đa tình, dễ phong lưu. ' +
      '+ Tham Lang + Hoa Cái + Thiên Riêu + Thai = loạn dâm (cách rất xấu về phẩm hạnh, đặc biệt nữ). ' +
      '+ Liêm Trinh = đào hoa nặng, tửu sắc. + Văn Khúc = lãng mạn nghệ thuật. ' +
      '+ Thiên Hình / cát tinh + chính tinh đắc địa = chế ngự được tính đào hoa.',
    advancedGeneral:
      'Điểm "non yếu, chưa định" của vòng Trường Sinh; chủ ĐÀO HOA + THAY ĐỔI + ĐAM MÊ. Cần chính tinh ' +
      'vững và cát tinh ổn định; kỵ thêm đào hoa/sát tinh ở Mệnh – Phu Thê – Phúc Đức. Mệnh Vô Chính Diệu ' +
      'có Mộc Dục là cách bất định nhất — học, nghề, tình đều dễ dở dang.',
  },
  'Quan Đới': {
    name: 'Quan Đới',
    basic:
      'Sao thứ ba vòng Trường Sinh — tượng "đội mũ thắt đai", chủ trưởng thành, được xã hội công nhận, công danh khởi sắc, có lễ nghi, được nâng đỡ vinh hiển bước đầu.',
    byPalace: {
      'Mệnh': 'Có chí tiến thân, đường hoàng, sớm được công nhận; phong thái chững chạc.',
      'Quan Lộc': 'Công danh khởi sắc, thuận thăng tiến, được cất nhắc, có lễ nghi quan trường.',
      'Phúc Đức': 'Được hưởng vinh dự dòng họ, phúc khí trang trọng.',
      'Phụ Mẫu': 'Cha mẹ có thể diện, gia phong nề nếp; được hưởng tiếng tốt.',
      'Tài Bạch': 'Tiền đến cùng danh phận, nghề có chức sắc.',
      'Tử Tức': 'Con cái hiển đạt, có học vị, được trọng.',
    },
    combos: 'Quan Đới + Lâm Quan/Đế Vượng = tiến trình thịnh liên tục. + Quan Phúc/Khôi Việt/Tam Thai Bát Tọa = thăng tiến, vinh hiển. + Hóa Khoa = khoa danh.',
    advancedGeneral: 'Điểm "trưởng thành – được công nhận" của vòng sinh; cát cho công danh, lễ nghi, danh phận khi phối quý tinh.',
  },
  'Lâm Quan': {
    name: 'Lâm Quan',
    basic:
      'Sao thứ tư vòng Trường Sinh — tượng "ra làm quan, nhậm chức", chủ thành đạt, có thực quyền – chức vị, sự nghiệp lên, sung sức, tài lộc vượng.',
    byPalace: {
      'Mệnh': 'Sung sức, có năng lực và bản lĩnh, dễ đạt vị thế và quyền chức.',
      'Quan Lộc': 'Sự nghiệp hưng vượng, có chức quyền thực, được trọng dụng.',
      'Tài Bạch': 'Tài lộc dồi dào thời kỳ thịnh, kiếm tiền thuận.',
      'Phúc Đức': 'Hưởng phúc lộc do địa vị, sống có thể diện.',
      'Điền Trạch': 'Sản nghiệp tăng theo chức vị, nhà cửa khang trang.',
      'Tử Tức': 'Con cái có chức phận, thành đạt.',
    },
    combos: 'Lâm Quan + Đế Vượng = đỉnh thịnh kéo dài. + Lộc Tồn/Hóa Lộc/Hóa Quyền = chức – tài – quyền song toàn. + Tướng Quân/Quốc Ấn = nắm thực quyền.',
    advancedGeneral: 'Một trong các điểm thịnh nhất của vòng sinh (cùng Đế Vượng); rất cát cho công danh và tài lộc, đặc biệt khi phối Lộc Quyền và chính tinh miếu vượng.',
  },
  'Đế Vượng': {
    name: 'Đế Vượng',
    basic:
      'Sao thứ năm vòng Trường Sinh — đỉnh cao chu kỳ, tượng "vua ở ngôi cực thịnh": quyền uy, sung mãn, danh vọng tột bậc; nhưng "vật cực tắc phản" — thịnh đến cùng dễ chuyển suy.',
    byPalace: {
      'Mệnh': 'Khí lực mạnh nhất, có uy, tự tin, dễ thành đạt lớn; nhược điểm là dễ kiêu, ôm đồm.',
      'Quan Lộc': 'Sự nghiệp đỉnh cao, quyền uy lớn, có thể đứng đầu một lĩnh vực.',
      'Tài Bạch': 'Tài lộc cực vượng thời kỳ đỉnh; cần biết điểm dừng.',
      'Phúc Đức': 'Phúc lộc đầy đủ, hưởng thụ cao; tránh hưởng tận.',
      'Điền Trạch': 'Cơ ngơi to lớn, sản nghiệp cực thịnh.',
    },
    combos: 'Đế Vượng + Lâm Quan/Lộc Quyền Khoa = cực thịnh đại quý. Gặp sát tinh quá vượng dễ "thịnh cực sinh biến"; cần cát tinh tiết chế và giữ.',
    advancedGeneral: 'Đỉnh của vòng sinh — rất cát nhưng đề phòng "thịnh cực nhi suy"; người Đế Vượng nên khiêm, biết dừng để giữ thành quả.',
  },
  'Suy': {
    name: 'Suy',
    basic:
      'Sao thứ sáu vòng Trường Sinh — bắt đầu hướng suy, tượng "qua thời cực thịnh đã mỏi", chủ suy giảm, hụt hơi, nên thủ thành, không nên bành trướng mạo hiểm.',
    byPalace: {
      'Mệnh': 'Khí lực giảm, làm việc dễ đuối, nên giữ vững hơn là tiến mạnh; tính dễ an phận.',
      'Tài Bạch': 'Tài lộc qua đỉnh, dễ hao, nên thủ và tránh đầu cơ.',
      'Quan Lộc': 'Sự nghiệp chững lại, thăng tiến chậm, nên củng cố.',
      'Tật Ách': 'Thể lực kém dần, cần dưỡng, đề phòng bệnh do suy nhược.',
      'Phúc Đức': 'Tâm dễ chùng, ít hứng khởi, cần nuôi dưỡng tinh thần.',
    },
    combos: 'Suy + sát tinh/Hóa Kỵ = sa sút rõ. + cát tinh/Lộc = giữ được, hạ cánh nhẹ nhàng.',
    advancedGeneral: 'Điểm khởi đầu đi xuống của vòng sinh; thiên về thủ thành — cần cát tinh đỡ, kỵ phiêu lưu khuếch trương.',
  },
  'Bệnh': {
    name: 'Bệnh',
    basic:
      'Sao thứ bảy vòng Trường Sinh — tượng "ốm đau", chủ suy nhược, trì trệ, bệnh tật, việc khó hanh thông, tinh thần dễ mỏi.',
    byPalace: {
      'Tật Ách': 'Sức khỏe kém, hay ốm, bệnh dai; cần chú trọng dưỡng sinh.',
      'Mệnh': 'Khí lực yếu, dễ mệt mỏi, làm việc đuối sức, hay lo.',
      'Quan Lộc': 'Sự nghiệp trì trệ, gặp trở ngại, khó thăng.',
      'Tài Bạch': 'Tài vận bế, kiếm tiền vất vả, dễ hao vì bệnh.',
      'Phu Thê': 'Phối ngẫu sức khỏe yếu hoặc tình cảm nhạt do bệnh/lo.',
    },
    combos: 'Bệnh + Bệnh Phù/Thiên Sứ/Hóa Kỵ/Tang Hổ = bệnh tật, tai ách rõ. + Thiên Y/Giải Thần/Thiên Đức = giảm nhẹ, gặp thầy gặp thuốc.',
    advancedGeneral: 'Điểm suy nhược của vòng sinh; tại Tật Ách/Mệnh cần đặc biệt chú trọng sức khỏe và phòng bệnh mạn.',
  },
  'Tử': {
    name: 'Tử',
    basic:
      'Sao thứ tám vòng Trường Sinh — tượng "chết", chủ điểm tận, bế tắc, kết thúc một chu kỳ, khó khăn cùng cực; nhưng cũng là khởi điểm chuyển hóa sang chu kỳ mới.',
    byPalace: {
      'Mệnh': 'Giai đoạn bế tắc, dễ nản chí, cần nhẫn nại chờ chu kỳ mới; hợp hướng nội, nghiên cứu.',
      'Quan Lộc': 'Sự nghiệp đình trệ, khó tiến, nên giữ và chờ thời.',
      'Tài Bạch': 'Tài vận tắc, dễ kẹt vốn, không nên mạo hiểm.',
      'Tật Ách': 'Sức khỏe đáng lo nếu gặp hung sát; cần phòng bệnh nặng.',
      'Phu Thê': 'Tình cảm dễ bế tắc, lạnh nhạt, đứt đoạn.',
      'Tử Tức': 'Hiếm muộn hoặc khoảng cách với con cái.',
    },
    combos: 'Tử + sát tinh/Hóa Kỵ/Tang Hổ = bế tắc, tai ách nặng. + cát tinh/Giải Thần/Thiên Đức = "tử xứ phùng sinh", qua khó có lối.',
    advancedGeneral: 'Điểm tận của vòng sinh; không xấu tuyệt đối — báo hiệu chuyển chu kỳ; rất cần cát tinh và sao giải để hóa.',
  },
  'Mộ': {
    name: 'Mộ',
    basic:
      'Sao thứ chín vòng Trường Sinh — tượng "mồ mả / kho tàng", chủ thu tàng, tích trữ, khép lại để dành; người Mộ tiết kiệm, kín đáo, bền bỉ — nhưng dễ trì trệ, bảo thủ, chậm chạp. ' +
      'Theo Tử Vi Hàm Số, Mộ còn được xếp là một DÂM TINH (cùng nhóm Thiên Riêu, Mộc Dục, Hoa Cái, Thai): nét "thu tàng – kín đáo" của Mộ khi đi với đào hoa tinh chuyển thành sự âm thầm, kín đáo trong chuyện tình ái (giấu giếm, vụng trộm). Mặt này chỉ nổi khi Mộ hội Đào – Hồng – Riêu – Mộc Dục – Thai; bình thường Mộ thiên về nghĩa "kho tàng tích trữ".',
    byPalace: {
      'Mệnh': 'Tính thu vén, kín đáo, kiên trì, biết để dành; nhược là chậm, bảo thủ, khó cởi mở. Gặp đào hoa tinh thì tình cảm kín đáo, âm thầm.',
      'Tài Bạch': 'Biết tích trữ giữ của — "Mộ khố" gặp Lộc thì tụ tài lớn (kho đầy); gặp Không Kiếp thì kho trống.',
      'Điền Trạch': 'Tích lũy nhà đất, của để dành nhiều, sản nghiệp bền.',
      'Phúc Đức': 'Hậu vận có của, sống tằn tiện, an ổn về già.',
      'Quan Lộc': 'Sự nghiệp ổn, ít đột phá, hợp việc tích lũy lâu dài.',
      'Tử Tức': 'Con cái ít nhưng có nề nếp, biết thu vén.',
      'Phu Thê': 'Phối ngẫu kín đáo, biết vun vén; gặp dâm/đào tinh thì có chuyện tình cảm thầm kín.',
    },
    combos: 'Mộ + Lộc Tồn/Hóa Lộc = "khố tụ tài" tích lũy lớn (Tài/Điền rất tốt). + Không Kiếp/Hình Kỵ = "khố phá" kho rỗng, hao tán. + Tham Lang nhập Mộ = phát muộn. + Tam Thai/Bát Tọa tại tứ Mộ = "MỘ TRUNG THAI TỌA" quý hiển. + Đào/Riêu/Mộc Dục/Thai = tình ái thầm kín (mặt dâm tinh).',
    advancedGeneral: 'Mộ là "kho" — luận theo kho đầy/kho rỗng: gặp Lộc thì tụ của bền; gặp Không Kiếp Hình Kỵ thì kho thủng. Tốt nhất ở Tài – Điền. Mặt dâm tinh (Hàm Số) chỉ đáng kể khi hội nhiều đào hoa tinh.',
  },
  'Tuyệt': {
    name: 'Tuyệt',
    basic:
      'Sao thứ mười vòng Trường Sinh — tượng "tuyệt diệt", chủ tận cùng, đứt đoạn, tan rã; điểm thấp nhất trước khi quay lại Thai (sinh trở lại) — "cùng tắc biến".',
    byPalace: {
      'Mệnh': 'Giai đoạn khó cùng cực, dễ chán nản, cô lập; nhưng là bước ngoặt, qua được thì đổi vận.',
      'Phu Thê': 'Tình cảm dễ đứt đoạn, chia ly, trắc trở nặng.',
      'Tử Tức': 'Hiếm muộn, hoặc duyên con mỏng.',
      'Tài Bạch': 'Tài vận đứt đoạn, dễ trắng tay rồi làm lại.',
      'Quan Lộc': 'Sự nghiệp dễ gãy đổ, thay đổi triệt để.',
      'Tật Ách': 'Đề phòng bệnh hiểm, tai ách nếu gặp hung sát.',
    },
    combos: 'Tuyệt + sát tinh/Hóa Kỵ = đứt đoạn, mất mát nặng. + cát tinh/Giải/Tràng Sinh hội = "tuyệt xứ phùng sinh" — chuyển nguy thành cơ.',
    advancedGeneral: 'Điểm cùng của vòng sinh; gặp cát có thể "tuyệt xứ phùng sinh"; bản chất là chuyển hóa, cần kiên nhẫn vượt đáy.',
  },
  'Thai': {
    name: 'Thai',
    basic:
      'Sao thứ mười một vòng Trường Sinh — tượng "kết thai", chủ khởi mầm mới, ý tưởng phôi thai, cơ hội nhen nhóm; cũng liên quan thai sản, sinh nở; tính hiếu kỳ, ưa cái mới. ' +
      'Theo Tử Vi Hàm Số, Thai còn được xếp là một DÂM TINH (cùng nhóm Thiên Riêu, Mộc Dục, Hoa Cái, Mộ): chủ chuyện thai nghén ngoài ý muốn, tình ái vụng trộm, "ăn cơm trước kẻng". Thai đi với đào hoa tinh thì khuynh hướng tình dục sớm và mạnh; nữ mệnh gặp Thai + Riêu + Đào → dễ chửa hoang, có con riêng.',
    byPalace: {
      'Mệnh': 'Bắt đầu chu kỳ mới, nhiều ý tưởng/dự định phôi thai; tính tò mò, thích đổi mới; gặp dâm/đào tinh thì đa tình, ham muốn sớm.',
      'Tử Tức': 'Liên quan thai sản, con cái — ứng việc sinh nở theo đại/tiểu vận; gặp Riêu/Đào dễ có con ngoài giá thú.',
      'Phu Thê': 'Tình cảm mới chớm, duyên đang hình thành; cũng chủ đào hoa nhẹ; gặp dâm tinh thì quan hệ trước hôn nhân.',
      'Tài Bạch': 'Nguồn tài mới manh nha, cần thời gian nuôi lớn.',
      'Quan Lộc': 'Cơ hội nghề nghiệp mới đang hình thành.',
    },
    combos: 'Thai + Tràng Sinh/Lộc = mầm phát triển tốt. + Đào Hoa/Hồng Loan = ứng thai sản, tình duyên. + Thiên Riêu = rất dâm, dễ có con riêng (Hàm Số). + Mộc Dục = đa tình, ham muốn sớm. + sát tinh = thai dễ động, dự định khó thành.',
    advancedGeneral: 'Điểm "phôi thai" — khởi đầu chu kỳ; cát khi phối Lộc và sinh khí; tại Tử Tức ứng mạnh việc sinh con theo vận. Mặt dâm tinh (Hàm Số) chỉ nặng khi hội Đào – Hồng – Riêu – Mộc Dục; nếu có Thiên Hình/Tử Phủ/Nhật đắc địa tiết chế thì hóa giải.',
  },
  'Dưỡng': {
    name: 'Dưỡng',
    basic:
      'Sao thứ mười hai (cuối) vòng Trường Sinh — tượng "nuôi dưỡng trong bụng mẹ", chủ bồi dưỡng, tích lũy nội lực, được che chở chuẩn bị cho chu kỳ mới (nối lại Tràng Sinh).',
    byPalace: {
      'Mệnh': 'Được nuôi dưỡng, có hậu thuẫn, giai đoạn tích lực; tính ôn hòa, biết chờ thời.',
      'Phụ Mẫu': 'Được cha mẹ/người trên chăm lo, hưởng phúc dưỡng dục; có thể là con nuôi/được người khác nuôi.',
      'Phúc Đức': 'Phúc khí được bồi đắp dần, hậu vận tốt.',
      'Tử Tức': 'Con cái được nuôi dưỡng tốt, hoặc nuôi con người khác.',
      'Tài Bạch': 'Tài lực được tích dưỡng, phát dần về sau.',
      'Tật Ách': 'Cần tĩnh dưỡng thì sức khỏe hồi tốt.',
    },
    combos: 'Dưỡng + Tràng Sinh/Lộc = nền tảng vững, chuẩn bị tốt cho kỳ phát. + cát tinh = hậu thuẫn mạnh. + Đào Hoa tại Phụ Mẫu/Tử Tức = liên quan con nuôi/nghĩa dưỡng.',
    advancedGeneral: 'Điểm "dưỡng sức" trước chu kỳ thịnh; cát cho nền tảng, giáo dưỡng, sự chuẩn bị; nối tiếp về Tràng Sinh nên giàu tiềm năng.',
  },
};

import { STAR_BY_PALACE_EXT } from './starInfoByPalaceExt';

/**
 * Lấy thông tin sao theo tên (tự bỏ tiền tố "L. " của lưu tinh nếu có).
 * Tự động merge dữ liệu bổ sung byPalace từ `starInfoByPalaceExt.ts` —
 * chỉ thêm vào những cung CHƯA có trong dữ liệu gốc (không ghi đè).
 */
export function getStarInfo(name: string): StarInfo | undefined {
  const clean = name.startsWith('L. ') ? name.slice(3) : name;
  const base = STAR_INFO[clean];
  if (!base) return undefined;
  const ext = STAR_BY_PALACE_EXT[clean];
  if (!ext) return base;
  const mergedByPalace = { ...ext, ...(base.byPalace || {}) };
  return { ...base, byPalace: mergedByPalace };
}

/** Danh sách TẤT CẢ tên sao có dữ liệu (sắp xếp tiếng Việt) — cho ô tra cứu sao. */
export const ALL_STAR_NAMES: string[] = Object.keys(STAR_INFO).sort((a, b) => a.localeCompare(b, 'vi'));
