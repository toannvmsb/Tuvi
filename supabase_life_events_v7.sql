-- ════════════════════════════════════════════════════════════════
--  SỰ KIỆN SẮP TỚI — V7: cập nhật "Chuẩn bị lễ vật" (offering_text) và "Bài cúng" (prayer_text)
--  cho 15 sự kiện Lễ truyền thống (biên soạn bởi anh Toàn qua file Excel
--  "Noi_dung_su_kien_Tuzi.xlsx", Claude chuyển thành SQL).
--
--  Chỉ UPDATE 2 cột offering_text/prayer_text — không đổi meaning/do_text/avoid_text (đã cập
--  nhật ở v6) hay metadata/lịch/ưu tiên. Tăng version + ghi Version History để nhất quán.
--  Nội dung mới GHI ĐÈ nội dung offering_text đã có sẵn cho 5 sự kiện từ v3 (tet_nguyen_dan,
--  giao_thua, ong_cong_ong_tao, via_than_tai, ram_thang_gieng) — bản trong file Excel là bản
--  chính thức, đầy đủ hơn (kèm nguồn tham khảo) do anh Toàn biên soạn lại.
--
--  Chạy SAU v1–v6. Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ → Run.
-- ════════════════════════════════════════════════════════════════

update public.event_packages set
  offering_text = 'Trầu cau.
Hương, hoa, nước và mâm ngũ quả.
Rượu.
Đèn, nến.
Lễ ngọt, bánh kẹo.
Mâm cỗ mặn gồm xôi, gà, bánh chưng và các món Tết.
Theo tài liệu, mâm cơm đầu năm có thể gồm gà trống, canh măng hoặc canh bóng, miến, xôi, nem rán, thịt đông, bánh chưng, giò, bánh mứt kẹo; miền Bắc thường có thêm dưa hành. Lễ vật có thể điều chỉnh theo vùng miền và điều kiện gia đình.',
  prayer_text = 'Nam mô A-di-đà Phật! (3 lần, 3 lạy)
Con lạy chín phương Trời, mười phương Chư Phật, Chư Phật mười phương.
Con kính lạy Đức Đương Lai Hạ Sanh Di Lặc Tôn Phật.
Con kính lạy các cụ Tổ khảo, Tổ tỷ, Bá thúc huynh đệ, đường thượng Tiên linh và các Hương hồn nội tộc, ngoại tộc.
Hôm nay là ngày mồng 1 tháng Giêng năm ………… âm lịch.
Chúng con là: ………………………………………………………………………………………
Ngụ tại: ………………………………………………………………………………………………
Nay theo tuế luật, âm dương vận hành, tới tuần Nguyên Đán, mồng Một đầu xuân, mưa móc thấm nhuần, đón mừng năm mới. Con cháu tưởng niệm ân đức Tổ tiên như trời cao biển rộng, khôn đem tấc cỏ báo đáp ba xuân.
Do đó, chúng con cùng toàn thể con cháu trong nhà sửa sang lễ vật, hương hoa nước quả, thắp nén hương thơm, thành kính dâng lên trước án.
Kính mời các cụ Cao tằng Tổ khảo, Cao tằng Tổ tỷ, Bá thúc đệ huynh, Cô di tỷ muội, nam nữ tử tôn nội ngoại, cúi xin thương xót con cháu, linh thiêng giáng về linh sàng, phù hộ độ trì con cháu năm mới an khang, mọi bề thuận lợi, sự nghiệp hanh thông, bốn mùa không hạn ách nào xâm hại, tám tiết có điềm lành tiếp ứng.
Tín chủ chúng con đồng tâm kính mời các vị vong linh, Tiền chủ, Hậu chủ ở trong đất này cùng về hâm hưởng, phù hộ cho chúng con được bách sự như ý, vạn sự cát tường.
Chúng con lễ bạc tâm thành, trước án kính lễ, cúi xin chứng giám, phù hộ độ trì.
Nam mô A-di-đà Phật! (3 lần, 3 lạy)',
  version = version + 1,
  updated_at = now()
where event_key = 'tet_nguyen_dan';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v7', 'offering_text', offering_text, 'prayer_text', prayer_text
)::jsonb
from public.event_packages where event_key = 'tet_nguyen_dan';

update public.event_packages set
  offering_text = 'Hương.
Hoa.
Tờ sớ bài cúng giao thừa; nếu không có có thể không dùng.
Tiền vàng.
Đèn, nến.
Một chiếc mũ chuồn bằng giấy tượng trưng cho vị thần.
Trầu cau.
Rượu, bia hoặc đồ uống khác.
Bánh kẹo.
Mâm cỗ mặn ngày Tết gồm bánh chưng, giò chả, thủ lợn hoặc gà trống luộc, xôi và các món khác tùy gia đình.
Theo tài liệu, chuẩn bị hai mâm: mâm ngoài trời cúng Quan Thần và mâm trong nhà cúng Thổ Công, gia tiên.',
  prayer_text = 'BÀI KHẤN GIAO THỪA TRONG NHÀ
Nam mô A-di-đà Phật! (3 lần)
Nam mô Đương Lai Hạ Sinh Di Lặc Tôn Phật.
Nam mô Đông Phương Giáo Chủ Dược Sư Lưu Ly Quang Vương Phật.
Nam mô Đức Bồ tát Quán Thế Âm cứu nạn cứu khổ chúng sinh.
Con kính lạy chín phương Trời, mười phương Chư Phật, Chư Phật mười phương.
Con kính lạy Hoàng Thiên, Hậu Thổ, Long Mạch, Táo Quân, chư vị Tôn thần.
Con kính lạy các cụ Tổ tiên nội ngoại, chư vị Tiên linh.
Nay phút Giao thừa năm cũ ………… với năm mới …………
Chúng con là: ……………………………… Sinh năm: ………… Hành canh: ………… tuổi.
Ngụ tại: ……………………………………………………………………………………………
Chúng con kính mời:
- Ngài Bản cảnh Thành hoàng chư vị Đại vương.
- Ngài Bản xứ Thần linh Thổ địa, Hỷ Thần, Phúc đức chính Thần.
- Ngài Ngũ phương, Ngũ thổ, Long mạch Tài Thần.
- Các Ngài Bản gia Táo phủ Thần quân và chư vị Thần linh cai quản ở trong xứ này.
Cúi xin giáng lâm trước án, thụ hưởng lễ vật.
Con lại kính mời các cụ Tiên linh, Cao tằng Tổ khảo, Cao tằng Tổ tỷ, Bá thúc đệ huynh, Cô di tỷ muội, nội ngoại gia tộc, chư vị Hương linh, cúi xin giáng phó linh sàng thụ hưởng lễ vật.
Tín chủ lại kính mời các vị vong linh Tiền chủ, Hậu chủ, y thảo phụ mộc ở trong đất này, nhân tiết Giao thừa, giáng lâm trước án, chiêm ngưỡng tân xuân, thụ hưởng lễ vật.
Nguyện cho tín chủ minh niên khang thái, vạn sự cát tường, bốn mùa được bình an, gia đạo hưng long, thịnh vượng.
Tâm thành cầu nguyện, lễ bạc tiến dâng, cúi xin chứng giám.
Nam mô A-di-đà Phật! (3 lần)

BÀI KHẤN GIAO THỪA NGOÀI TRỜI
Nam mô A-di-đà Phật! (3 lần)
Con kính lạy chín phương Trời, mười phương Chư Phật, Chư Phật mười phương.
Con kính lạy Đức Đương Lai Hạ Sinh Di Lặc Tôn Phật.
Con kính lạy Đức Bồ tát Quán Thế Âm cứu nạn cứu khổ chúng sinh.
Con kính lạy Hoàng Thiên, Hậu Thổ, chư vị Tôn thần.
Con kính lạy Ngài Cựu niên Hành khiển, Cựu Hành binh chi thần, Cựu Phán quan.
Con kính lạy Ngài Đương niên Hành khiển, Đương niên Hành binh chi thần, Đương niên Phán quan.
Con kính lạy các Ngài Ngũ phương, Ngũ hổ, Long mạch, Táo quân, chư vị Tôn thần.
Nay là phút Giao thừa năm ………… với năm …………
Chúng con là: ……………………………… Sinh năm: ………… Hành canh: ………… tuổi.
Cư ngụ tại: …………………………………………………………………………………………
Nhân phút thiêng liêng Giao thừa vừa tới, năm cũ qua đi, đón mừng năm mới, tam dương khang thái, vạn tượng canh tân. Nay Ngài Thái Tuế Tôn thần trên vâng lệnh Ngọc Hoàng Thượng đế, giám sát vạn dân, dưới bảo hộ sinh linh, tảo trừ yêu nghiệt. Quan cũ về triều cửa khuyết, lưu phúc, lưu ân; Quan mới xuống thay, thể đức hiếu sinh, ban tài tiếp lộc.
Nhân buổi tân xuân, tín chủ chúng con thành tâm sửa biện hương hoa phẩm vật, nghi lễ cung trần, dâng lên trước án, cúng dường Phật, Thánh, dâng hiến Tôn thần, đốt nén tâm hương, dốc lòng bái thỉnh.
Chúng con kính mời:
- Ngài Cựu niên đương cai Thái Tuế.
- Ngài Tân niên đương cai Thái Tuế chí đức Tôn thần.
- Ngài Bản cảnh Thành hoàng chư vị Đại vương.
- Ngài Bản xứ Thần linh Thổ địa.
- Ngài Hỷ thần, Phúc đức chính Thần.
- Các Ngài Ngũ phương, Ngũ thổ, Long mạch, Tài thần.
- Chư vị Bản gia Táo quân và chư vị Thần linh cai quản ở trong xứ này.
Cúi xin giáng lâm trước án, thụ hưởng lễ vật.
Nguyện cho tín chủ minh niên khang thái, vạn sự tốt lành, bốn mùa tám tiết được chữ bình an, gia đạo hưng long thịnh vượng, bách sự hanh thông, ngày ngày được hưởng ơn Trời, Phật, chư vị Tôn thần.
Chúng con kính cẩn tiến dâng lễ vật, thành tâm cầu nguyện. Cúi xin chín phương Trời, mười phương Chư Phật cùng chư vị Tôn thần chứng giám, phù hộ độ trì.
Nam mô A-di-đà Phật! (3 lần)',
  version = version + 1,
  updated_at = now()
where event_key = 'giao_thua';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v7', 'offering_text', offering_text, 'prayer_text', prayer_text
)::jsonb
from public.event_packages where event_key = 'giao_thua';

update public.event_packages set
  offering_text = 'Mũ ông Công ba cỗ (ba chiếc): hai mũ đàn ông có cánh chuồn và một mũ đàn bà không có cánh chuồn.
Tiền vàng.
Một chiếc áo, một đôi hia bằng giấy và hình cá chép bằng giấy.
Thịt heo luộc.
Gà luộc hoặc quay.
Đĩa rau xào.
Hành muối.
Xôi gấc.
Giò heo.
Canh mọc.
Cá chép nướng.
Trái cây tươi, trà, rượu và trầu cau.
Theo tài liệu, lễ cúng thực hiện trước 12 giờ ngày 23 tháng Chạp và tiến hành tại bàn thờ chính. Lễ vật có thể gia giảm theo điều kiện gia đình.',
  prayer_text = 'Nam mô A-di-đà Phật! (3 lần)
Con lạy chín phương Trời, mười phương Chư Phật, Chư Phật mười phương!
Con kính lạy Ngài Đông trù Tư mệnh Táo phủ Thần quân.
Tín chủ (chúng) con là: ………………………………
Ngụ tại: ……………………………………………………………………………………………
Hôm nay, ngày 23 tháng Chạp, tín chủ chúng con thành tâm sắp sửa hương hoa phẩm vật, xiêm hài áo mũ, kính dâng Tôn thần. Thắp nén tâm hương, tín chủ con thành tâm kính bái.
Chúng con kính mời Ngài Đông trù Tư mệnh Táo phủ Thần quân hiển linh trước án hưởng thụ lễ vật.
Cúi xin Tôn thần gia ân xá tội cho mọi lỗi lầm trong năm qua gia chủ chúng con sai phạm.
Xin Tôn thần ban phước lộc, phù hộ toàn gia chúng con, trai gái, già trẻ sức khỏe dồi dào, an khang thịnh vượng, vạn sự tốt lành.
Chúng con lễ bạc tâm thành, kính lễ cầu xin, mong Tôn thần phù hộ độ trì.
Nam mô A-di-đà Phật! (3 lần)',
  version = version + 1,
  updated_at = now()
where event_key = 'ong_cong_ong_tao';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v7', 'offering_text', offering_text, 'prayer_text', prayer_text
)::jsonb
from public.event_packages where event_key = 'ong_cong_ong_tao';

update public.event_packages set
  offering_text = 'Hương.
Hoa quả.
Đèn, nến.
Trầu cau.
Rượu.
Mâm cỗ mặn cúng gia tiên.
Mâm cỗ chay cúng Phật.
Tài liệu có nhắc vàng mã và thuốc lá; gia đình có thể gia giảm theo tín ngưỡng, ưu tiên lễ vật sạch, vừa đủ và an toàn.',
  prayer_text = 'Nam mô A-di-đà Phật! (3 lần, 3 lạy)
Con lạy chín phương Trời, mười phương Chư Phật, Chư Phật mười phương.
Con kính lạy Hoàng Thiên, Hậu Thổ chư vị Tôn thần.
Con kính lạy Ngài Bản cảnh Thành hoàng, Ngài Bản xứ Thổ địa, Ngài Bản gia Táo quân cùng chư vị Tôn thần.
Con kính lạy Cao tằng Tổ khảo, Cao tằng Tổ tỷ, Thúc bá đệ huynh, Cô di tỷ muội họ nội, họ ngoại.
Tín chủ (chúng) con là: ………………………………
Ngụ tại: ………………………………………………………………………………………………
Hôm nay là ngày Rằm tháng Giêng năm ………… âm lịch, gặp tiết Nguyên Tiêu, tín chủ con lòng thành sửa sang hương đăng, sắm sanh lễ vật, dâng lên trước án.
Chúng con kính mời:
- Ngài Bản cảnh Thành hoàng chư vị Đại vương.
- Ngài Bản xứ Thần linh Thổ địa.
- Ngài Bản gia Táo quân.
- Ngũ phương, Long mạch, Tài thần.
Cúi xin các Ngài linh thiêng nghe thấu lời mời, giáng lâm trước án, chứng giám lòng thành, thụ hưởng lễ vật.
Chúng con kính mời các cụ Tổ khảo, Tổ tỷ, chư vị Hương linh gia tiên nội ngoại họ ………………… nghe lời khẩn cầu, kính mời của con cháu, giáng về chứng giám tâm thành, thụ hưởng lễ vật.
Tín chủ con lại kính mời ông bà Tiền chủ, Hậu chủ về hưởng lễ vật, chứng giám lòng thành, phù hộ độ trì cho gia chúng con được vạn sự tốt lành, bốn mùa không hạn ách, tám tiết hưởng an bình.
Nam mô A-di-đà Phật! (3 lần, 3 lạy)',
  version = version + 1,
  updated_at = now()
where event_key = 'ram_thang_gieng';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v7', 'offering_text', offering_text, 'prayer_text', prayer_text
)::jsonb
from public.event_packages where event_key = 'ram_thang_gieng';

update public.event_packages set
  offering_text = 'Hương.
Hoa.
Trầu cau.
Trái cây.
Chén nước sạch.
Có thể thêm trà quả, lễ chay; hoặc rượu, thịt, gà luộc và món mặn tùy nếp thờ.
PDF không có chương riêng cho ngày Vía Thần Tài mùng 10 tháng Giêng; nội dung này được lấy từ mục “Văn khấn Thần Tài Thổ Địa mùng 1 và 15 hàng tháng” và điều chỉnh ngày dùng.',
  prayer_text = 'Nam mô A-di-đà Phật! (3 lần)
Con lạy chín phương Trời, mười phương Chư Phật, Chư Phật mười phương.
Kính lạy Ngài Hoàng Thiên Hậu Thổ chư vị Tôn thần.
Con kính lạy Ngài Đông Trù Tư mệnh Táo phủ Thần quân.
Con kính lạy Thần Tài vị tiền.
Con kính lạy các Ngài Thần linh, Thổ địa cai quản trong xứ này.
Tín chủ con là: ………………………………
Ngụ tại: ………………………………………………………………………………………………
Hôm nay là ngày mùng 10 tháng Giêng năm ………… âm lịch, nhân ngày Vía Thần Tài.
Con thành tâm sửa biện hương hoa, lễ vật, trà quả và các thứ cúng dâng, bày ra trước án, kính mời Ngài Thần Tài tiền vị.
Cúi xin Thần Tài thương xót tín chủ, giáng lâm trước án, chứng giám lòng thành, thụ hưởng lễ vật, phù trì tín chủ chúng con an ninh khang thái, vạn sự tốt lành, gia đạo hưng long thịnh vượng, lộc tài tăng tiến, tâm đạo mở mang, sở cầu tất ứng, sở nguyện tòng tâm.
Chúng con lễ bạc tâm thành, trước án kính lễ, cúi xin được phù hộ độ trì.
Nam mô A-di-đà Phật! (3 lần)',
  version = version + 1,
  updated_at = now()
where event_key = 'via_than_tai';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v7', 'offering_text', offering_text, 'prayer_text', prayer_text
)::jsonb
from public.event_packages where event_key = 'via_than_tai';

update public.event_packages set
  offering_text = 'Năm hoặc ba bát bánh trôi.
Năm hoặc ba bát bánh chay.
Hương.
Hoa.
Trầu cau.
Theo tài liệu, khi cúng Tổ tiên cần khấn thần ngoại trước, thần nội sau.',
  prayer_text = 'Nam mô A-di-đà Phật! (3 lần)
Con lạy chín phương Trời, mười phương Chư Phật, Chư Phật mười phương.
Con kính lạy Hoàng Thiên Hậu Thổ chư vị Tôn thần.
Con kính lạy Ngài Bản cảnh Thành hoàng, Ngài Bản xứ Thổ địa, Ngài Bản gia Táo quân cùng chư vị Tôn thần.
Con kính lạy Cao tằng Tổ khảo, Cao tằng Tổ tỷ, Thúc bá, Đệ huynh, Cô di, Tỷ muội họ nội, họ ngoại.
Tín chủ (chúng) con là: ………………………………
Ngụ tại: ………………………………………………………………………………………………
Hôm nay là ngày ………… gặp tiết Hàn Thực, tín chủ chúng con cảm nghĩ thâm ân trời đất, chư vị Tôn thần, nhớ đức cù lao Tiên tổ, thành tâm sắm lễ, quả cau lá trầu, hương hoa trà quả, đốt nén tâm hương, dâng lên trước án.
Chúng con kính mời:
- Ngài Bản cảnh Thành hoàng chư vị Đại vương.
- Ngài Bản xứ Thần linh Thổ địa.
- Ngài Bản gia Táo quân, Ngũ phương, Long mạch, Tài thần giáng lâm trước án, chứng giám lòng thành, thụ hưởng lễ vật.
Chúng con kính mời các cụ Tổ khảo, Tổ tỷ, chư vị Hương linh gia tiên nội ngoại họ ………………… cúi xin thương xót con cháu, giáng về chứng giám tâm thành, thụ hưởng lễ vật.
Tín chủ con lại kính mời các vị vong linh, các vị Tiền chủ, Hậu chủ ngụ trong nhà này, đất này đồng lâm án tiền, đồng lai hâm hưởng, phù hộ cho toàn gia chúng con luôn mạnh khỏe, mọi sự bình an, vạn sự tốt lành, gia đình hòa thuận.
Nam mô A-di-đà Phật! (3 lần)',
  version = version + 1,
  updated_at = now()
where event_key = 'tet_han_thuc';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v7', 'offering_text', offering_text, 'prayer_text', prayer_text
)::jsonb
from public.event_packages where event_key = 'tet_han_thuc';

update public.event_packages set
  offering_text = 'Hương, hoa tươi, đèn/nến và nước sạch.
Trầu cau, mâm ngũ quả.
Bánh chưng, bánh giầy là lễ vật biểu trưng.
Có thể thêm xôi, chè hoặc mâm cơm chay/mặn giản dị.
Tại đền, thực hiện theo hướng dẫn và không đặt lễ tùy tiện.',
  prayer_text = 'Nam mô A Di Đà Phật! (3 lần)
Con kính lạy Quốc Tổ Hùng Vương cùng các bậc tiền nhân có công dựng nước và giữ nước.
Tín chủ con là…, ngụ tại… Hôm nay ngày mùng 10 tháng Ba, chúng con thành tâm dâng hương hoa lễ vật, tưởng nhớ công đức Tổ tiên.
Cúi xin chứng giám lòng thành, phù hộ quốc thái dân an, gia đình mạnh khỏe, đoàn kết; chúng con nguyện sống có nghĩa tình, giữ gìn truyền thống và góp sức xây dựng quê hương.
Lễ bạc tâm thành, cúi xin chứng giám.',
  version = version + 1,
  updated_at = now()
where event_key = 'gio_to_hung_vuong';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v7', 'offering_text', offering_text, 'prayer_text', prayer_text
)::jsonb
from public.event_packages where event_key = 'gio_to_hung_vuong';

update public.event_packages set
  offering_text = 'Hương, hoa.
Nước sạch.
Rượu nếp.
Bánh gio hoặc bánh ú tro.
Xôi chè.
Các loại hoa quả như mận, dưa hấu, vải, hồng xiêm và chuối.
Tài liệu có nhắc vàng mã; gia đình có thể gia giảm theo tín ngưỡng và điều kiện thực tế.',
  prayer_text = 'Nam mô A-di-đà Phật! (3 lần)
Con lạy chín phương Trời, mười phương Chư Phật, Chư Phật mười phương.
Con kính lạy Hoàng Thiên Hậu Thổ chư vị Tôn thần.
Con kính lạy Ngài Bản cảnh Thành hoàng, Ngài Bản xứ Thổ địa, Ngài Bản gia Táo quân cùng chư vị Tôn thần.
Con kính lạy Tổ tiên, Hiển khảo, Hiển tỷ, chư vị Hương linh (nếu bố, mẹ còn sống thì thay bằng Tổ khảo, Tổ tỷ).
Tín chủ con (chúng con) là: ………………………………
Ngụ tại: ………………………………………………………………………………………………
Hôm nay là ngày Đoan Ngọ, chúng con sửa sang hương đăng, sắm sanh lễ vật, hoa đăng, trà quả dâng lên trước án.
Chúng con kính mời:
- Ngài Bản cảnh Thành hoàng chư vị Đại vương.
- Ngài Bản xứ Thần linh Thổ địa.
- Ngài Bản gia Táo quân.
- Ngũ phương, Long mạch, Tài thần.
Cúi xin các Ngài giáng lâm trước án, chứng giám lòng thành, thụ hưởng lễ vật.
Chúng con kính mời các cụ Tổ khảo, Tổ tỷ, chư vị Hương linh gia tiên nội ngoại họ ………………… cúi xin các vị thương xót con cháu, chứng giám tâm thành, thụ hưởng lễ vật.
Tín chủ con lại kính mời các vị Tiền chủ, Hậu chủ tại nhà này, đất này đồng lâm án tiền, đồng lai hâm hưởng, độ cho chúng con thân cung khang thái, bản mệnh bình an, bốn mùa không hạn ách, tám tiết hưởng bình an thịnh vượng.
Chúng con lễ bạc tâm thành, trước án kính lễ, cúi xin được phù hộ độ trì.
Nam mô A-di-đà Phật! (3 lần)',
  version = version + 1,
  updated_at = now()
where event_key = 'tet_doan_ngo';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v7', 'offering_text', offering_text, 'prayer_text', prayer_text
)::jsonb
from public.event_packages where event_key = 'tet_doan_ngo';

update public.event_packages set
  offering_text = 'MÂM CÚNG PHẬT (nếu gia đình thờ Phật)
Xôi đỗ xanh, xôi gấc, xôi vò hạt sen hoặc xôi trắng ruốc nấm hương.
Giò, chả chay.
Nem chay hoặc nem nấm.
Canh nấm hoặc rau củ quả.
Đậu hũ.

MÂM CÚNG TỔ TIÊN
Hoa quả bày phía trên, cỗ mặn phía dưới theo nếp được nêu trong tài liệu.
Các món ăn tùy điều kiện gia đình hoặc món ông bà, tổ tiên từng yêu thích.
Nếu là trưởng tộc: xôi, thủ lợn hoặc gà và số bát theo phong tục dòng tộc.
Nếu cúng tại gia: một mâm cơm, có ít cúng ít, có nhiều cúng nhiều.

MÂM CÚNG CHÚNG SINH (bày riêng ngoài trời)
Bánh kẹo, bỏng ngô, bỏng gạo, thạch.
Mười hai bát cháo trắng nhỏ.
Ngô, khoai lang luộc.
Cốc nước sạch hoặc rượu.
Đĩa gạo và đĩa muối.
Đĩa ngũ quả.
Mười hai cục đường thẻ nếu có.
Tài liệu có nhắc quần áo giấy và tiền vàng; gia đình có thể cân nhắc theo tín ngưỡng, an toàn và quy định địa phương. Không cúng chúng sinh bằng món mặn.',
  prayer_text = 'Nam mô A-di-đà Phật! (3 lần)
Con lạy chín phương Trời, mười phương Đất.
Con lạy Chư Phật mười phương, con lạy mười phương Chư Phật.
Kính lạy Hoàng Thiên Hậu Thổ chư vị Tôn thần.
Kính lạy Ngài Bản cảnh Thành hoàng, Ngài Bản xứ Thổ địa, Ngài Bản gia Táo quân cùng chư vị Tôn thần.
Kính lạy Tổ tiên trong họ, Tổ khảo, Tổ tỷ, Bà cô Tổ, Ông mãnh tại gia, chư vị Hương linh trong nhà.
Chúng con là: ………………………………
Ngụ tại: ………………………………………………………………………………………………
Hôm nay ngày ………… tháng ………… năm ………… âm lịch, con cảm nghĩ thâm ân trời đất, chư vị Tôn thần, nhớ đức cù lao Tiên tổ, mỗi niệm không quên. Con xin chân thành cảm tạ, chân thành tri ân, chắp tay trước án.
Con xin kính mời:
- Ngài Bản cảnh Thành hoàng chư vị Đại vương.
- Ngài Bản xứ Thần linh Thổ địa.
- Ngài Bản gia Táo quân, Ngũ phương, Long mạch, Tài thần.
Kính mời các Ngài chứng giám lòng thành, cảm tạ ơn dày, đại xá tội lỗi cho con. Con xin sám hối trước gia tiên, Bà Tổ Cô, Thân cô, Hiền cô, Quan bác, Quan chú trong họ.
Kính mời các vị Chân linh, Tiền chủ, Hậu chủ ở trong nhà này, đất này đồng lâm án tiền, độ cho gia đình con được may mắn, cát tường, vạn sự như ý; bốn mùa không ách hạn nào xâm, tám tiết hưởng vinh quang thịnh vượng, tài lộc dồi dào, an nhiên yên ả.
Chúng con lâu đời lâu kiếp, nghiệp chướng nặng nề, si mê lầm lạc, nay thành tâm xin sám hối, thề tránh điều dữ, nguyện làm việc lành.
Trông ơn các vị, các Ngài từ bi gia hộ, bao bọc chở che cho con tâm không phiền não, thân không bệnh tật.
Các vị, các Ngài bao bọc cho gia đình con an khang thịnh vượng, vạn sự như ý, bản mệnh kiên định, khai tâm khai sáng, nhận biết được thời cuộc, xa lánh kẻ tiểu nhân, thân gần bậc tôn quý, bớt đi những thị phi đố kỵ ghen tị trên trần thế. Nhân duyên vượng, tiền duyên tốt, tài lộc dồi dào, sinh cư bình an, thân khang tuệ minh, diên sinh trường thọ, an cư lạc nghiệp, cư địa an bình, gia môn hưng vượng.
Rằm tháng Bảy, tiết Vu Lan, vong nhân xá tội, mong cho gia tiên trong họ, Hương linh trong nhà, chúng sinh trong vùng sớm được siêu sinh tịnh độ, sớm đi về cõi Niết bàn, được sự giải thoát, an lạc an yên.
Con cúi đầu xin cẩn cáo.
Nam mô A-di-đà Phật! (3 lần)',
  version = version + 1,
  updated_at = now()
where event_key = 'vu_lan';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v7', 'offering_text', offering_text, 'prayer_text', prayer_text
)::jsonb
from public.event_packages where event_key = 'vu_lan';

update public.event_packages set
  offering_text = 'Bánh nướng.
Bánh dẻo.
Cốm.
Chuối.
Na.
Hồng.
Bưởi.
Hương.
Hoa tươi.
Đèn, nến.
Có thể bổ sung các món truyền thống khác theo nếp gia đình. Theo tài liệu, dịp Trung Thu cũng thường biếu bánh, cốm và trái cây cho ông bà, cha mẹ, người thân và người mình mang ơn để tỏ lòng biết ơn, quý trọng.',
  prayer_text = 'Nam mô A-di-đà Phật! (3 lần)
Con lạy chín phương Trời, mười phương Chư Phật, Chư Phật mười phương.
Con kính lạy Hoàng Thiên Hậu Thổ chư vị Tôn thần.
Con kính lạy Ngài Bản cảnh Thành hoàng, Ngài Bản xứ Thổ địa, Ngài Bản gia Táo quân cùng chư vị Tôn thần.
Con kính lạy Cao tằng Tổ khảo, Cao tằng Tổ tỷ, Thúc bá, Đệ huynh, Cô di, Tỷ muội họ nội, họ ngoại.
Tín chủ (chúng) con là: ………………………………
Ngụ tại: ………………………………………………………………………………………………
Hôm nay là ngày Rằm tháng Tám, gặp tiết Trung Thu, tín chủ chúng con thành tâm sắm lễ, hương hoa trà quả, thắp nén tâm hương dâng lên trước án.
Chúng con kính mời Ngài Bản cảnh Thành hoàng chư vị Đại vương, Ngài Bản xứ Thần linh Thổ địa, Ngài Bản gia Táo quân, Ngũ phương, Long mạch, Tài thần. Cúi xin các Ngài giáng lâm trước án, chứng giám lòng thành, thụ hưởng lễ vật.
Chúng con kính mời các cụ Tổ khảo, Tổ tỷ, chư vị Hương linh gia tiên nội ngoại họ …………………, cúi xin thương xót con cháu, linh thiêng hiện về, chứng giám tâm thành, thụ hưởng lễ vật.
Tín chủ con lại kính mời các vị Tiền chủ, Hậu chủ ngụ tại nhà này, đất này đồng lâm án tiền, đồng lai hâm hưởng. Xin các Ngài độ cho chúng con thân cung khang thái, bản mệnh bình an, bốn mùa không hạn ách, tám tiết hưởng vinh quang thịnh vượng.
Chúng con lễ bạc tâm thành, trước án kính lễ, cúi xin được phù hộ độ trì.
Nam mô A-di-đà Phật! (3 lần)',
  version = version + 1,
  updated_at = now()
where event_key = 'trung_thu';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v7', 'offering_text', offering_text, 'prayer_text', prayer_text
)::jsonb
from public.event_packages where event_key = 'trung_thu';

update public.event_packages set
  offering_text = 'Hương, hoa tươi, đèn/nến và nước sạch.
Trà hoặc hoa cúc, trái cây theo mùa.
Bánh, xôi chè hoặc mâm cơm gia đình giản dị.
Có thể dâng món ông bà, người cao tuổi yêu thích; phong tục này không phổ biến đồng đều nên không bắt buộc mâm lễ cố định.',
  prayer_text = 'Nam mô A Di Đà Phật! (3 lần)
Con kính lạy chư vị Tôn thần và gia tiên nội ngoại họ…
Tín chủ con là…, ngụ tại… Hôm nay ngày mùng 9 tháng Chín, tiết Trùng Cửu, chúng con thành tâm dâng hương hoa trà quả, tưởng nhớ tổ tiên và kính chúc các bậc cao niên.
Cúi xin chứng giám, phù hộ gia đình mạnh khỏe, trường thọ, con cháu hiếu thuận, trên dưới hòa vui.
Lễ bạc tâm thành, cúi xin chứng giám. Nam mô A Di Đà Phật! (3 lần)',
  version = version + 1,
  updated_at = now()
where event_key = 'trung_cuu';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v7', 'offering_text', offering_text, 'prayer_text', prayer_text
)::jsonb
from public.event_packages where event_key = 'trung_cuu';

update public.event_packages set
  offering_text = 'Xôi gạo mới.
Cơm nấu từ gạo mới.
Đèn, nến.
Hương và hoa tươi.
Trầu cau.
Trà và trái cây.
Mâm lễ thơm ngon, tinh khiết để cúng gia tiên, tùy sản vật và phong tục địa phương.',
  prayer_text = 'Nam mô A-di-đà Phật! (3 lần)
Con lạy chín phương Trời, mười phương Chư Phật, Chư Phật mười phương.
Con kính lạy Hoàng Thiên Hậu Thổ chư vị Tôn thần.
Con kính lạy Ngài Bản cảnh Thành hoàng, Ngài Bản xứ Thổ địa, Ngài Bản gia Táo quân cùng chư vị Tôn thần.
Con kính lạy Cao tằng Tổ khảo, Cao tằng Tổ tỷ, Thúc bá, Đệ huynh, Cô di, Tỷ muội họ nội, họ ngoại.
Tín chủ (chúng) con là: ………………………………
Ngụ tại: ………………………………………………………………………………………………
Hôm nay là ngày ………… tháng Mười âm lịch, là ngày Tết Cơm Mới, tín chủ con thành tâm sắm lễ, đọc văn khấn Tổ tiên, cùng với quả cau lá trầu, hương hoa trà quả, nấu cơm gạo mới, thắp nén tâm hương dâng lên trước án.
Trộm nghĩ rằng:
- Cây cao bóng mát.
- Quả tốt hương bay.
- Công tài bồi xưa những ai gây.
- Của quý hóa nay con cháu hưởng.
- Ơn Trời Đất, Phật Tiên, chư vị Tôn thần.
- Sau nhờ ơn Tổ tiên gây dựng, kể công tân khổ biết là bao.
- Đến nay con cháu dồi dào, hưởng miếng trân cam.
- Nay nhân mùa gặt hái.
- Gánh nếp tẻ đầu mùa.
- Nghĩ đến ơn xưa.
- Cày bừa vun xới.
- Sửa nồi cơm mới.
- Kính cẩn dâng lên.
- Thường tiên nếm trước.
- Mong nhờ Tổ phước.
- Hỏa cốc phong đăng.
- Thóc lúa thêm tăng.
- Hoa màu tươi mới.
- Làm ăn tiến tới.
- Con cháu được nhờ.
- Lễ tuy đơn sơ.
- Tỏ lòng thành kính.
Chúng con kính mời:
- Ngài Bản cảnh Thành hoàng chư vị Đại vương.
- Ngài Bản xứ Thần linh Thổ địa.
- Ngài Bản gia Táo quân.
- Ngũ phương, Long mạch, Tài thần.
Cúi xin các Ngài giáng lâm trước án, chứng giám lòng thành, thụ hưởng lễ vật.
Chúng con kính mời các cụ Tổ khảo, Tổ tỷ, chư vị Hương linh gia tiên nội ngoại họ ………………… cúi xin thương xót con cháu, linh thiêng hiện về chứng giám tâm thành, thụ hưởng lễ vật.
Chúng con lễ bạc tâm thành, trước án kính lễ, cúi xin được phù hộ độ trì.
Nam mô A-di-đà Phật! (3 lần)',
  version = version + 1,
  updated_at = now()
where event_key = 'ram_thang_10';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v7', 'offering_text', offering_text, 'prayer_text', prayer_text
)::jsonb
from public.event_packages where event_key = 'ram_thang_10';

update public.event_packages set
  offering_text = 'Mâm cỗ chay hoặc mặn tùy nếp gia đình.
Hương và hoa tươi.
Trà hoặc nước sạch.
Mâm cơm với các món được chế biến tinh khiết, đầy đặn và trình bày trang nghiêm.
Đặt mâm cúng gọn gàng trên bàn thờ gia tiên.
Người thực hiện nghi lễ mặc quần áo chỉn chu, sạch sẽ trước khi khấn cúng.',
  prayer_text = 'BÀI KHẤN THẦN LINH TRONG NHÀ
Nam mô A Di Đà Phật! (3 lần)
Con kính lạy chín phương Trời, lạy Chư Phật mười phương.
Con kính lạy Đức Đương Lai Hạ Sinh Di Lặc Tôn Phật.
Con kính lạy Đức Phật, Hoàng Thiên Hậu Thổ.
Con kính lạy chư vị Tôn thần.
Kính cẩn báo rằng, tín chủ chúng con là: ………………………………
Nay ngụ tại: …………………………………………………………………………………………
Hôm nay là ngày ………… tháng ………… năm ………… âm lịch, tức ngày mùng 1 tháng Giêng năm ………… theo Dương lịch.
Mừng năm mới sang, chúng con sửa biện hương hoa, bày mâm cỗ nhỏ dâng lên trước án cúng các Ngài. Với lòng thành, chúng con cúi xin Đức Tôn thần giáng lâm để thụ hưởng lễ vật.
Cúi xin Ngài phù hộ cho gia chủ chúng con sức khỏe dồi dào, tấn tài tấn lộc, gặp mọi điều may mắn. Năm mới sang, cầu cho gia chủ chúng con vạn điều như ý, tai qua nạn khỏi, điều dữ hóa lành, bình an thỏa nguyện.
Chúng con thành tâm cầu xin, mong các Ngài chứng giám!
Nam mô A Di Đà Phật! (3 lần, sau đó cúi lạy 3 lần)',
  version = version + 1,
  updated_at = now()
where event_key = 'tet_duong_lich';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v7', 'offering_text', offering_text, 'prayer_text', prayer_text
)::jsonb
from public.event_packages where event_key = 'tet_duong_lich';

update public.event_packages set
  offering_text = 'Bàn Phật sạch và trang nghiêm; tượng Phật sơ sinh nếu gia đình có nghi thức tắm Phật.
Hoa tươi, đèn/nến và nước sạch.
Trái cây, trà, bánh và mâm cơm chay.
Nước thơm thanh sạch dùng tắm Phật theo hướng dẫn nghi thức.
Không cúng đồ mặn, rượu bia hay vàng mã trước bàn Phật.',
  prayer_text = 'Nam mô Bổn Sư Thích Ca Mâu Ni Phật! (3 lần)
Hôm nay ngày Phật Đản, con tên là…, ngụ tại… thành tâm dâng hương hoa, kính mừng Đức Phật Thích Ca đản sinh.
Nguyện học theo hạnh từ bi và trí tuệ của Ngài, biết giữ tâm trong sáng, lời nói chân thật, hành động thiện lành; cầu cho gia đình bình an, mọi người bớt khổ, thế giới hòa bình.
Con xin hồi hướng công đức này đến cha mẹ, gia tiên và tất cả chúng sinh.
Nam mô Bổn Sư Thích Ca Mâu Ni Phật! (3 lần)',
  version = version + 1,
  updated_at = now()
where event_key = 'le_phat_dan';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v7', 'offering_text', offering_text, 'prayer_text', prayer_text
)::jsonb
from public.event_packages where event_key = 'le_phat_dan';

update public.event_packages set
  offering_text = 'Không dùng mâm cúng theo tín ngưỡng dân gian.
Gia đình Công giáo có thể chuẩn bị hang đá hoặc tượng Chúa Hài Đồng, Thánh Gia.
Kinh Thánh, thánh giá, hoa tươi và nến đặt an toàn.
Bánh, bữa cơm gia đình và quà sẻ chia cho người khó khăn.
Ưu tiên tham dự Thánh lễ theo hướng dẫn của giáo xứ.',
  prayer_text = 'Lời nguyện Giáng Sinh tham khảo:
Lạy Chúa Giêsu Hài Đồng, chúng con cảm tạ Chúa đã đến đem tình yêu, hy vọng và bình an cho nhân loại.
Trong đêm mừng Chúa giáng sinh, xin Chúa chúc lành cho gia đình chúng con, cho người đau yếu, cô đơn và những nơi đang bất hòa. Xin dạy chúng con biết yêu thương, tha thứ, sống khiêm nhường và quảng đại sẻ chia.
Xin cho bình an của Chúa ở lại trong mỗi người và mọi gia đình. Amen.',
  version = version + 1,
  updated_at = now()
where event_key = 'giang_sinh';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v7', 'offering_text', offering_text, 'prayer_text', prayer_text
)::jsonb
from public.event_packages where event_key = 'giang_sinh';

