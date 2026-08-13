-- ════════════════════════════════════════════════════════════════
--  SỰ KIỆN SẮP TỚI — V6: cập nhật nội dung Ý nghĩa/Nên làm/Nên tránh cho 39 sự kiện
--  (biên soạn bởi anh Toàn qua file Excel "Noi_dung_su_kien_Tuzi.xlsx", Claude chuyển thành SQL).
--
--  Chỉ UPDATE 3 cột nội dung (meaning/do_text/avoid_text) — không đổi metadata/lịch/ưu tiên.
--  Tăng version + ghi Version History (event_package_history) để nhất quán với sửa qua admin,
--  dù đây là UPDATE trực tiếp SQL chứ không qua RPC admin_update_event_package.
--
--  Chạy SAU v1–v5. Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ → Run.
-- ════════════════════════════════════════════════════════════════

update public.event_packages set
  meaning = 'Tết Nguyên Đán là dịp lễ quan trọng nhất trong văn hóa Việt, đánh dấu năm mới âm lịch và thời khắc đoàn viên. Đây là dịp tưởng nhớ tổ tiên, tri ân năm cũ và gửi gắm ước vọng bình an, sức khỏe, tài lộc cho năm mới.

Đời sống: Các phong tục phổ biến gồm dọn nhà, cúng gia tiên, chúc Tết, mừng tuổi và sum họp gia đình.',
  do_text = 'Dọn dẹp, trang hoàng nhà cửa và chuẩn bị mâm cúng gia tiên với lòng thành.
Sum họp gia đình, thăm hỏi, chúc Tết và mừng tuổi bằng lời chúc tốt đẹp.
Giữ tinh thần vui vẻ, làm việc thiện và lập kế hoạch tích cực cho năm mới.',
  avoid_text = 'Tránh cãi vã, nói lời xui rủi hoặc làm tổn thương hòa khí gia đình.
Hạn chế quét đổ rác, làm vỡ đồ vào ngày đầu năm theo quan niệm dân gian.
Không ăn uống quá độ, lái xe sau khi dùng rượu bia hoặc đốt pháo trái quy định.',
  version = version + 1,
  updated_at = now()
where event_key = 'tet_nguyen_dan';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v6', 'meaning', meaning, 'do_text', do_text, 'avoid_text', avoid_text
)::jsonb
from public.event_packages where event_key = 'tet_nguyen_dan';

update public.event_packages set
  meaning = 'Giao thừa là thời khắc chuyển giao giữa năm cũ và năm mới, thường được xem là lúc tiễn điều cũ và đón vận hội mới. Trong gia đình Việt, đây là khoảnh khắc thiêng liêng để cúng trời đất, gia tiên và cùng nhau cầu chúc bình an.

Đời sống: Giá trị nổi bật là sự đoàn tụ, biết ơn và khởi đầu bằng những ý nghĩ tốt lành.',
  do_text = 'Chuẩn bị lễ cúng giao thừa phù hợp điều kiện gia đình, bảo đảm trang nghiêm và an toàn.
Sum họp, gửi lời chúc chân thành và dành thời gian tưởng nhớ người đã khuất.
Giữ nhà cửa gọn gàng, tâm trạng hòa nhã và tuân thủ quy định khi tham gia lễ hội.',
  avoid_text = 'Tránh tranh cãi, trách móc hoặc nhắc lại chuyện buồn ngay thời khắc đầu năm.
Không đốt vàng mã, hương nến hoặc pháo ở nơi có nguy cơ cháy nổ.
Tránh chen lấn, uống rượu bia quá mức và lái xe thiếu an toàn.',
  version = version + 1,
  updated_at = now()
where event_key = 'giao_thua';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v6', 'meaning', meaning, 'do_text', do_text, 'avoid_text', avoid_text
)::jsonb
from public.event_packages where event_key = 'giao_thua';

update public.event_packages set
  meaning = 'Lễ Ông Công Ông Táo diễn ra ngày 23 tháng Chạp, gắn với tín ngưỡng tiễn Táo quân về trời báo cáo việc trong năm. Phong tục nhắc mỗi gia đình nhìn lại nếp sống, dọn dẹp bếp nhà và chuẩn bị đón Tết.

Biểu tượng cá chép thể hiện ước vọng vượt khó, thăng tiến và chuyển vận tốt lành.',
  do_text = 'Dọn sạch bếp và không gian thờ cúng; chuẩn bị lễ vật vừa phải, trang nghiêm.
Thắp hương tưởng niệm, bày tỏ lòng biết ơn và cầu mong gia đạo ấm êm.
Nếu phóng sinh cá, thả nhẹ nhàng tại nơi nước sạch và thu gom túi đựng.',
  avoid_text = 'Không thả túi nylon, tro vàng mã hoặc rác xuống sông hồ.
Tránh mâm cao cỗ đầy gây lãng phí hoặc đặt lễ ở nơi mất an toàn cháy nổ.
Không biến phong tục thành mê tín, cầu lợi bằng hành vi phản cảm.',
  version = version + 1,
  updated_at = now()
where event_key = 'ong_cong_ong_tao';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v6', 'meaning', meaning, 'do_text', do_text, 'avoid_text', avoid_text
)::jsonb
from public.event_packages where event_key = 'ong_cong_ong_tao';

update public.event_packages set
  meaning = 'Rằm tháng Giêng, còn gọi là Tết Nguyên Tiêu, là ngày trăng tròn đầu tiên của năm âm lịch. Người Việt thường lễ Phật, cúng gia tiên và cầu một năm bình an, thuận hòa; đây cũng là dịp hướng thiện và gìn giữ kết nối gia đình.

Dân gian có câu “cúng quanh năm không bằng Rằm tháng Giêng”, thể hiện sự coi trọng ngày này.',
  do_text = 'Chuẩn bị mâm lễ thanh tịnh, phù hợp phong tục gia đình và thắp hương tưởng nhớ tổ tiên.
Đi lễ văn minh, làm việc thiện, giúp đỡ người khó khăn và giữ tâm an.
Sum họp gia đình, ăn uống điều độ và cầu chúc những điều thiết thực.',
  avoid_text = 'Tránh chen lấn, đốt quá nhiều vàng mã hoặc đặt tiền tùy tiện tại nơi thờ tự.
Không sát sinh hay phô trương lễ vật nếu gia đình theo nếp ăn chay, hướng thiện.
Tránh mê tín, xem bói trục lợi và bỏ bê công việc vì nghi lễ.',
  version = version + 1,
  updated_at = now()
where event_key = 'ram_thang_gieng';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v6', 'meaning', meaning, 'do_text', do_text, 'avoid_text', avoid_text
)::jsonb
from public.event_packages where event_key = 'ram_thang_gieng';

update public.event_packages set
  meaning = 'Vía Thần Tài vào mùng 10 tháng Giêng là ngày người kinh doanh tưởng nhớ vị thần tượng trưng cho tài lộc và cầu việc làm ăn thuận lợi. Ý nghĩa tích cực của ngày này là trân trọng lao động, giữ chữ tín và khởi đầu kế hoạch tài chính trong năm.

Tục mua vàng chỉ là lựa chọn văn hóa, không phải điều kiện để có may mắn.',
  do_text = 'Dọn bàn thờ sạch sẽ, chuẩn bị lễ vừa phải và thành tâm cầu việc làm ăn chân chính.
Rà soát kế hoạch kinh doanh, dòng tiền và mục tiêu tiết kiệm cho năm mới.
Nếu mua vàng, kiểm tra giá, hóa đơn, tuổi vàng và chọn đơn vị uy tín.',
  avoid_text = 'Không vay nợ hoặc mua vàng theo tâm lý đám đông vượt quá khả năng tài chính.
Tránh chen lấn, giao dịch nơi không rõ nguồn gốc hoặc tin cam kết sinh lời.
Không lãng phí lễ vật, sát sinh quá mức hay đánh đồng nghi lễ với bảo đảm tài lộc.',
  version = version + 1,
  updated_at = now()
where event_key = 'via_than_tai';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v6', 'meaning', meaning, 'do_text', do_text, 'avoid_text', avoid_text
)::jsonb
from public.event_packages where event_key = 'via_than_tai';

update public.event_packages set
  meaning = 'Tết Hàn Thực vào mùng 3 tháng Ba âm lịch là dịp làm bánh trôi, bánh chay dâng cúng tổ tiên. Tại Việt Nam, ngày này mang ý nghĩa tưởng nhớ cội nguồn, gìn giữ nghề bánh truyền thống và gắn kết các thế hệ trong gia đình.

“Hàn thực” nghĩa là đồ ăn nguội, nhưng phong tục Việt không bắt buộc kiêng lửa.',
  do_text = 'Cùng gia đình làm bánh trôi, bánh chay sạch sẽ và dâng cúng tổ tiên.
Kể cho trẻ nhỏ về nguồn gốc gia đình và giá trị nhớ nguồn.
Ăn bánh vừa phải, bảo quản đúng cách và ưu tiên nguyên liệu an toàn.',
  avoid_text = 'Không dùng phẩm màu, nguyên liệu không rõ nguồn gốc hoặc bánh đã để quá lâu.
Tránh ăn quá nhiều đồ ngọt, nhất là người cần kiểm soát đường huyết.
Không hiểu cứng nhắc rằng phải kiêng nấu nướng; phong tục tùy vùng và gia đình.',
  version = version + 1,
  updated_at = now()
where event_key = 'tet_han_thuc';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v6', 'meaning', meaning, 'do_text', do_text, 'avoid_text', avoid_text
)::jsonb
from public.event_packages where event_key = 'tet_han_thuc';

update public.event_packages set
  meaning = 'Giỗ Tổ Hùng Vương vào mùng 10 tháng Ba âm lịch là ngày tưởng nhớ các Vua Hùng và công dựng nước. Đây là biểu tượng của đạo lý “uống nước nhớ nguồn”, củng cố tinh thần cộng đồng và ý thức gìn giữ di sản dân tộc.

Ngày lễ kết nối người Việt trong và ngoài nước qua chung một cội nguồn văn hóa.',
  do_text = 'Dâng hương trang nghiêm, tìm hiểu lịch sử thời Hùng Vương và giáo dục truyền thống cho thế hệ trẻ.
Tham gia lễ hội văn minh, xếp hàng và tuân thủ hướng dẫn của ban tổ chức.
Giữ vệ sinh, bảo vệ cảnh quan và ưu tiên sử dụng dịch vụ có niêm yết giá.',
  avoid_text = 'Tránh chen lấn, xô đẩy, đặt tiền hoặc sờ vào hiện vật trái quy định.
Không xả rác, đốt hương quá nhiều hay làm hư hại di tích.
Tránh xuyên tạc lịch sử, mê tín hoặc lợi dụng lễ hội để trục lợi.',
  version = version + 1,
  updated_at = now()
where event_key = 'gio_to_hung_vuong';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v6', 'meaning', meaning, 'do_text', do_text, 'avoid_text', avoid_text
)::jsonb
from public.event_packages where event_key = 'gio_to_hung_vuong';

update public.event_packages set
  meaning = 'Tết Đoan Ngọ vào mùng 5 tháng Năm âm lịch còn gọi là “Tết diệt sâu bọ”. Phong tục gắn với thời điểm đầu hè, cầu sức khỏe, mùa màng thuận lợi và tưởng nhớ tổ tiên; các món thường gặp là cơm rượu nếp, bánh tro và trái cây theo mùa.

Ngày lễ cũng nhắc mọi người chú ý vệ sinh, ăn uống và phòng bệnh mùa nóng.',
  do_text = 'Cúng gia tiên vào buổi sáng hoặc gần giờ Ngọ tùy điều kiện gia đình.
Thưởng thức cơm rượu nếp, bánh tro, trái cây vừa phải và bảo đảm vệ sinh.
Dọn nhà, tắm nước lá nếu phù hợp cơ địa và dành thời gian sum họp.',
  avoid_text = 'Tránh ăn thực phẩm sống, ôi hỏng hoặc uống quá nhiều rượu nếp.
Không dùng lá tắm không rõ loại, đặc biệt với trẻ nhỏ hoặc người dị ứng.
Tránh cãi vã; các kiêng kỵ như soi gương đêm hay để dép lộn xộn chỉ nên xem là quan niệm dân gian.',
  version = version + 1,
  updated_at = now()
where event_key = 'tet_doan_ngo';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v6', 'meaning', meaning, 'do_text', do_text, 'avoid_text', avoid_text
)::jsonb
from public.event_packages where event_key = 'tet_doan_ngo';

update public.event_packages set
  meaning = 'Lễ Vu Lan vào rằm tháng Bảy bắt nguồn từ tinh thần báo hiếu trong Phật giáo và đã hòa vào văn hóa Việt. Đây là dịp tưởng nhớ cha mẹ, tổ tiên, tri ân người còn sống và sẻ chia với những hoàn cảnh khó khăn.

Nghi thức “bông hồng cài áo” nhắc mỗi người trân trọng tình thân khi còn có thể.',
  do_text = 'Thăm hỏi, chăm sóc cha mẹ và thể hiện lòng biết ơn bằng hành động thiết thực.
Thắp hương tưởng niệm tổ tiên, đi chùa trang nghiêm và làm việc thiện.
Ăn chay nếu phù hợp, phóng sinh đúng cách và hỗ trợ người yếu thế.',
  avoid_text = 'Không đốt quá nhiều vàng mã, phóng sinh loài ngoại lai hoặc xả rác.
Tránh biến báo hiếu thành hình thức, quà cáp phô trương hay áp lực tài chính.
Không lợi dụng tâm linh để dọa nạt, trục lợi hoặc truyền bá mê tín.',
  version = version + 1,
  updated_at = now()
where event_key = 'vu_lan';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v6', 'meaning', meaning, 'do_text', do_text, 'avoid_text', avoid_text
)::jsonb
from public.event_packages where event_key = 'vu_lan';

update public.event_packages set
  meaning = 'Tết Trung Thu vào rằm tháng Tám là lễ hội trăng rằm gắn với trẻ em, đoàn viên và mùa thu hoạch. Các biểu tượng như bánh trung thu, đèn lồng, múa lân thể hiện niềm vui sum họp và ước mong đủ đầy.

Đây cũng là dịp gìn giữ trò chơi, nghệ thuật và ký ức dân gian.',
  do_text = 'Dành thời gian cho trẻ, cùng làm đèn, ngắm trăng và kể chuyện truyền thống.
Chọn bánh có nhãn mác, hạn sử dụng rõ ràng và chia khẩu phần hợp lý.
Tổ chức vui chơi an toàn, giữ vệ sinh và quan tâm trẻ em khó khăn.',
  avoid_text = 'Không để trẻ chơi nến, đèn lửa hoặc đi nơi đông người mà thiếu giám sát.
Tránh mua đồ chơi nguy hiểm, bánh không rõ nguồn gốc hoặc ăn quá nhiều đồ ngọt.
Không tổ chức âm thanh, múa lân gây mất trật tự hoặc cản trở giao thông.',
  version = version + 1,
  updated_at = now()
where event_key = 'trung_thu';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v6', 'meaning', meaning, 'do_text', do_text, 'avoid_text', avoid_text
)::jsonb
from public.event_packages where event_key = 'trung_thu';

update public.event_packages set
  meaning = 'Tết Trùng Cửu vào mùng 9 tháng Chín âm lịch là phong tục cổ của văn hóa Đông Á, số 9 lặp lại tượng trưng cho trường thọ. Ngày này thường gắn với kính lão, sum họp, thưởng cúc và lên cao ngắm cảnh; tại Việt Nam mức độ phổ biến tùy cộng đồng.

Ý nghĩa phù hợp hiện đại là quan tâm người cao tuổi và trân trọng sức khỏe.',
  do_text = 'Thăm hỏi ông bà, người cao tuổi và tổ chức bữa cơm gia đình ấm cúng.
Đi dạo, ngắm cảnh hoặc vận động nhẹ phù hợp thể trạng.
Tìm hiểu thơ ca, phong tục thưởng hoa cúc và văn hóa Trùng Cửu.',
  avoid_text = 'Không ép người cao tuổi leo cao, đi xa hoặc tham gia hoạt động quá sức.
Tránh uống rượu quá mức hay dùng dược liệu, trà hoa không rõ nguồn gốc.
Không áp đặt các kiêng kỵ cổ truyền lên người không cùng tín ngưỡng.',
  version = version + 1,
  updated_at = now()
where event_key = 'trung_cuu';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v6', 'meaning', meaning, 'do_text', do_text, 'avoid_text', avoid_text
)::jsonb
from public.event_packages where event_key = 'trung_cuu';

update public.event_packages set
  meaning = 'Rằm tháng Mười, còn gọi Tết Hạ Nguyên hay Tết Cơm Mới ở một số vùng, là dịp tạ ơn trời đất và tổ tiên sau mùa thu hoạch. Ngày lễ thể hiện lòng biết ơn thành quả lao động, cầu mùa sau thuận lợi và chia sẻ nông sản mới với gia đình, cộng đồng.

Phong tục cụ thể khác nhau theo vùng miền và dân tộc.',
  do_text = 'Chuẩn bị cơm mới, nông sản theo mùa để dâng cúng tổ tiên với lễ nghi giản dị.
Sum họp, tri ân người làm nông và chia sẻ thực phẩm với người khó khăn.
Giữ gìn các nghi lễ, món ăn và câu chuyện bản địa đúng bản sắc cộng đồng.',
  avoid_text = 'Tránh lãng phí lương thực, sát sinh hoặc tổ chức cỗ bàn quá mức.
Không đồng nhất phong tục của mọi vùng hay áp đặt một nghi thức duy nhất.
Tránh đốt vàng mã nhiều, xả rác hoặc sử dụng lửa thiếu an toàn.',
  version = version + 1,
  updated_at = now()
where event_key = 'ram_thang_10';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v6', 'meaning', meaning, 'do_text', do_text, 'avoid_text', avoid_text
)::jsonb
from public.event_packages where event_key = 'ram_thang_10';

update public.event_packages set
  meaning = 'Tết Dương lịch ngày 1 tháng 1 đánh dấu năm mới theo lịch Gregory, được sử dụng rộng rãi trên thế giới. Đây là dịp nhìn lại năm cũ, nghỉ ngơi, kết nối với người thân và đặt mục tiêu cho năm mới.

Tại Việt Nam, ngày này mang tính hiện đại và giao lưu quốc tế hơn là nghi lễ tín ngưỡng.',
  do_text = 'Tổng kết năm cũ, đặt mục tiêu cụ thể và lập kế hoạch sức khỏe, tài chính, công việc.
Gửi lời chúc, sum họp hoặc tham gia sự kiện công cộng văn minh.
Kiểm tra lịch nghỉ, phương tiện đi lại và bảo đảm an toàn cho gia đình.',
  avoid_text = 'Tránh uống rượu bia quá mức, lái xe sau khi uống hoặc tụ tập gây mất trật tự.
Không chi tiêu bốc đồng hay đặt mục tiêu thiếu thực tế tạo áp lực.
Tránh sử dụng pháo, vật liệu cháy nổ trái quy định.',
  version = version + 1,
  updated_at = now()
where event_key = 'tet_duong_lich';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v6', 'meaning', meaning, 'do_text', do_text, 'avoid_text', avoid_text
)::jsonb
from public.event_packages where event_key = 'tet_duong_lich';

update public.event_packages set
  meaning = 'Lễ Phật Đản kỷ niệm ngày Đức Phật Thích Ca đản sinh, thường được tổ chức vào rằm tháng Tư âm lịch trong truyền thống Việt Nam. Ngày lễ đề cao từ bi, trí tuệ, hòa bình và lối sống hướng thiện.

Các nghi thức thường có tắm Phật, nghe pháp, thắp hoa đăng và hoạt động thiện nguyện.',
  do_text = 'Đi chùa trang nghiêm, nghe giảng pháp và thực hành lời nói, hành động thiện lành.
Ăn chay nếu phù hợp sức khỏe, làm từ thiện và bảo vệ sự sống.
Tham gia lễ tắm Phật, hoa đăng theo hướng dẫn và giữ vệ sinh chung.',
  avoid_text = 'Không chen lấn, đặt tiền tùy tiện lên tượng hoặc đốt quá nhiều hương, vàng mã.
Tránh phóng sinh thiếu hiểu biết gây chết động vật hoặc hại môi trường.
Không lợi dụng lễ hội để buôn bán chặt chém, mê tín hay trục lợi.',
  version = version + 1,
  updated_at = now()
where event_key = 'le_phat_dan';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v6', 'meaning', meaning, 'do_text', do_text, 'avoid_text', avoid_text
)::jsonb
from public.event_packages where event_key = 'le_phat_dan';

update public.event_packages set
  meaning = 'Giáng Sinh kỷ niệm sự ra đời của Chúa Giêsu trong Kitô giáo, được cử hành vào ngày 25 tháng 12 và thường bắt đầu từ đêm 24. Thông điệp cốt lõi là tình yêu, hy vọng, hòa bình và sẻ chia; ngày nay đây cũng là dịp văn hóa cộng đồng.

Các hoạt động phổ biến gồm dự lễ, trang trí cây thông, tặng quà và làm thiện nguyện.',
  do_text = 'Dự lễ hoặc tham quan nhà thờ với thái độ tôn trọng không gian tôn giáo.
Gửi lời chúc, sum họp, tặng quà có ý nghĩa và giúp đỡ người khó khăn.
Trang trí an toàn, tiết kiệm điện và giữ gìn vệ sinh nơi công cộng.',
  avoid_text = 'Không gây ồn ào, chen lấn hoặc ăn mặc, ứng xử thiếu phù hợp tại nơi thờ tự.
Tránh để nến, dây điện và vật trang trí dễ cháy ngoài tầm kiểm soát.
Không uống rượu bia rồi lái xe hoặc mua sắm quá mức.',
  version = version + 1,
  updated_at = now()
where event_key = 'giang_sinh';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v6', 'meaning', meaning, 'do_text', do_text, 'avoid_text', avoid_text
)::jsonb
from public.event_packages where event_key = 'giang_sinh';

update public.event_packages set
  meaning = 'Lập Xuân là tiết khí đầu tiên trong 24 tiết khí, đánh dấu khởi đầu mùa xuân theo lịch phương Đông. Nhiệt độ và ánh sáng tăng dần, cây cối bắt đầu sinh trưởng; đây là mốc quan trọng để chuẩn bị mùa vụ và khởi động kế hoạch năm mới.

Thời tiết: Miền Bắc có thể vẫn rét ẩm, chênh lệch nhiệt độ ngày đêm.',
  do_text = 'Dọn dẹp không gian sống, trồng cây và bắt đầu các kế hoạch tích cực.
Theo dõi dự báo rét ẩm, giữ ấm và tăng vận động nhẹ ngoài trời.
Chuẩn bị giống, đất và lịch gieo trồng phù hợp khí hậu địa phương.',
  avoid_text = 'Tránh chủ quan với rét muộn, mưa phùn và bệnh hô hấp.
Không gieo trồng đồng loạt nếu đất còn quá lạnh hoặc úng nước.
Hạn chế tranh cãi, bi quan; kiêng kỵ ngày Lập Xuân chỉ mang tính dân gian.',
  version = version + 1,
  updated_at = now()
where event_key = 'lap_xuan';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v6', 'meaning', meaning, 'do_text', do_text, 'avoid_text', avoid_text
)::jsonb
from public.event_packages where event_key = 'lap_xuan';

update public.event_packages set
  meaning = 'Vũ Thủy là tiết khí thứ hai, nghĩa là “nước mưa”, báo hiệu lượng mưa tăng và băng giá dần tan ở vùng ôn đới. Trong nông nghiệp, đây là giai đoạn bổ sung độ ẩm cho đất và chuẩn bị gieo trồng vụ xuân.

Thời tiết Việt Nam có thể ẩm, mưa phùn và nồm tùy vùng.',
  do_text = 'Theo dõi mưa, khơi thông cống rãnh và kiểm tra mái nhà, kho chứa.
Chuẩn bị đất, tưới tiêu hợp lý và phòng nấm bệnh cho cây trồng.
Giữ nhà thông thoáng, bảo quản thực phẩm khô và chăm sóc đường hô hấp.',
  avoid_text = 'Tránh để nước đọng, nhà cửa ẩm mốc hoặc nông sản tiếp xúc nền ẩm.
Không tưới quá nhiều khi đất đã bão hòa nước.
Hạn chế phơi đồ lâu ngoài trời và chủ quan với đường trơn, tầm nhìn kém.',
  version = version + 1,
  updated_at = now()
where event_key = 'vu_thuy';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v6', 'meaning', meaning, 'do_text', do_text, 'avoid_text', avoid_text
)::jsonb
from public.event_packages where event_key = 'vu_thuy';

update public.event_packages set
  meaning = 'Kinh Trập là tiết khí thứ ba, nghĩa là tiếng sấm mùa xuân đánh thức côn trùng và sinh vật sau thời kỳ ẩn náu. Nhiệt độ ấm lên, mưa và hoạt động sinh học tăng, báo hiệu giai đoạn sản xuất nông nghiệp sôi động hơn.

Đời sống: Muỗi, sâu bệnh và dị ứng theo mùa cũng có thể gia tăng.',
  do_text = 'Kiểm tra sâu bệnh, vệ sinh vườn và áp dụng biện pháp phòng trừ an toàn.
Dọn nước đọng, phòng muỗi và giữ nơi ở thông thoáng.
Tăng vận động, ngủ đủ và theo dõi thay đổi thời tiết đột ngột.',
  avoid_text = 'Không tự ý lạm dụng thuốc trừ sâu hoặc hóa chất diệt côn trùng.
Tránh để thức ăn hở, rác tồn đọng và nước chứa không có nắp.
Không chủ quan với dông sét; hạn chế trú dưới cây hoặc nơi trống trải.',
  version = version + 1,
  updated_at = now()
where event_key = 'kinh_trap';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v6', 'meaning', meaning, 'do_text', do_text, 'avoid_text', avoid_text
)::jsonb
from public.event_packages where event_key = 'kinh_trap';

update public.event_packages set
  meaning = 'Xuân Phân là thời điểm Mặt Trời gần xích đạo trời, ngày và đêm có độ dài xấp xỉ nhau. Tiết khí này nằm giữa mùa xuân, thời tiết ấm dần và cây trồng bước vào giai đoạn phát triển mạnh.

Đây là mốc cân bằng ánh sáng, thường gợi ý nghĩa hài hòa và điều chỉnh nhịp sống.',
  do_text = 'Tận dụng ánh sáng tự nhiên, vận động ngoài trời và duy trì giờ ngủ đều đặn.
Chăm bón cây, làm cỏ và theo dõi sâu bệnh vụ xuân.
Dọn nhà thông thoáng, cân bằng công việc với nghỉ ngơi.',
  avoid_text = 'Tránh phơi nắng kéo dài khi chỉ số UV cao hoặc thời tiết thay đổi nhanh.
Không bón phân, phun thuốc vượt liều khuyến cáo.
Hạn chế thức khuya và ăn uống thất thường làm giảm sức đề kháng.',
  version = version + 1,
  updated_at = now()
where event_key = 'xuan_phan';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v6', 'meaning', meaning, 'do_text', do_text, 'avoid_text', avoid_text
)::jsonb
from public.event_packages where event_key = 'xuan_phan';

update public.event_packages set
  meaning = 'Thanh Minh là tiết khí thứ năm, khi thời tiết thường trong sáng và ấm hơn; trong văn hóa Việt còn gắn với tục tảo mộ, tưởng nhớ tổ tiên. Đây là dịp chăm sóc phần mộ, kết nối họ tộc và giáo dục đạo lý nhớ nguồn.

Thời điểm cụ thể của tiết khí không đồng nhất hoàn toàn với một ngày âm lịch cố định.',
  do_text = 'Tảo mộ, dọn cỏ và thắp hương với thái độ trang nghiêm, tiết kiệm.
Chuẩn bị dụng cụ bảo hộ, nước uống và kiểm tra thời tiết trước khi đi.
Kể cho thế hệ trẻ về gia phả, nguồn cội và giữ gìn cảnh quan nghĩa trang.',
  avoid_text = 'Không đốt lửa, vàng mã gần cỏ khô hoặc để hương nến không người trông.
Tránh giẫm đạp, xâm phạm phần mộ khác và xả rác.
Không tổ chức ăn uống ồn ào, mê tín hoặc gây áp lực hình thức.',
  version = version + 1,
  updated_at = now()
where event_key = 'thanh_minh';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v6', 'meaning', meaning, 'do_text', do_text, 'avoid_text', avoid_text
)::jsonb
from public.event_packages where event_key = 'thanh_minh';

update public.event_packages set
  meaning = 'Cốc Vũ là tiết khí thứ sáu, nghĩa là “mưa cho ngũ cốc”, đánh dấu giai đoạn mưa xuân hỗ trợ cây trồng nảy mầm và sinh trưởng. Đây là tiết khí cuối mùa xuân, nhiệt độ và độ ẩm tăng trước khi sang hè.

Nông nghiệp: Cần cân bằng nước, dinh dưỡng và phòng sâu bệnh.',
  do_text = 'Theo dõi lượng mưa, chủ động tưới tiêu và thoát úng cho ruộng vườn.
Gieo trồng đúng lịch địa phương, bổ sung dinh dưỡng hợp lý.
Giữ thực phẩm, kho hạt khô ráo và phòng côn trùng, nấm mốc.',
  avoid_text = 'Tránh để cây úng nước hoặc bón phân ngay trước mưa lớn.
Không dùng thuốc bảo vệ thực vật tùy tiện, sai thời gian cách ly.
Hạn chế chủ quan với dông, sét và thời tiết chuyển nóng.',
  version = version + 1,
  updated_at = now()
where event_key = 'coc_vu';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v6', 'meaning', meaning, 'do_text', do_text, 'avoid_text', avoid_text
)::jsonb
from public.event_packages where event_key = 'coc_vu';

update public.event_packages set
  meaning = 'Lập Hạ là tiết khí thứ bảy, đánh dấu khởi đầu mùa hè theo lịch phương Đông. Nắng, nhiệt độ và các hiện tượng dông tăng; cây trồng bước vào giai đoạn sinh trưởng mạnh.

Đời sống: Cơ thể cần thích nghi với nóng ẩm, mất nước và nguy cơ thực phẩm nhanh hỏng.',
  do_text = 'Uống đủ nước, che nắng và sắp xếp lao động tránh giờ nóng cao điểm.
Kiểm tra điện, quạt, điều hòa và vệ sinh nguồn nước, thực phẩm.
Theo dõi sâu bệnh, tưới cây vào sáng sớm hoặc chiều mát.',
  avoid_text = 'Tránh phơi nắng lâu, vận động quá sức và để trẻ em trong xe kín.
Không ăn đồ ôi thiu, để thức ăn chín ở nhiệt độ phòng quá lâu.
Hạn chế tưới cây giữa trưa hoặc đốt ngoài trời khi khô nóng.',
  version = version + 1,
  updated_at = now()
where event_key = 'lap_ha';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v6', 'meaning', meaning, 'do_text', do_text, 'avoid_text', avoid_text
)::jsonb
from public.event_packages where event_key = 'lap_ha';

update public.event_packages set
  meaning = 'Tiểu Mãn là tiết khí thứ tám, hàm ý hạt ngũ cốc bắt đầu đầy nhưng chưa chín hoàn toàn. Thời tiết nóng ẩm và mưa tăng, đánh dấu giai đoạn cây trồng tích lũy dinh dưỡng và cần quản lý nước cẩn thận.

Tên gọi cũng gợi tinh thần biết đủ, tiến từng bước thay vì vội vàng.',
  do_text = 'Kiểm tra độ ẩm đất, thoát nước và theo dõi quá trình làm hạt.
Phòng nấm bệnh, côn trùng và bảo quản thức ăn trong điều kiện mát, sạch.
Ăn uống thanh nhẹ, bổ sung nước và nghỉ ngơi hợp lý.',
  avoid_text = 'Tránh để ruộng vườn úng kéo dài hoặc thiếu nước trong giai đoạn làm hạt.
Không thu hoạch non chỉ vì thời tiết thuận lợi tạm thời.
Hạn chế đồ ăn quá dầu mỡ, thực phẩm để lâu trong thời tiết nóng ẩm.',
  version = version + 1,
  updated_at = now()
where event_key = 'tieu_man';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v6', 'meaning', meaning, 'do_text', do_text, 'avoid_text', avoid_text
)::jsonb
from public.event_packages where event_key = 'tieu_man';

update public.event_packages set
  meaning = 'Mang Chủng là tiết khí thứ chín, chỉ thời điểm thuận lợi để gieo các loại cây có râu hạt và thu hoạch một số ngũ cốc đã chín. Đây là giai đoạn nông vụ bận rộn, nắng nóng xen mưa và cần tranh thủ thời vụ.

Đời sống: Cần cân đối lao động với nghỉ ngơi để tránh kiệt sức.',
  do_text = 'Lập lịch gieo, gặt theo dự báo thời tiết và đặc điểm giống cây.
Chuẩn bị máy móc, kho phơi, hệ thống thoát nước trước mưa lớn.
Bổ sung nước, điện giải phù hợp và nghỉ giữa ca khi làm ngoài trời.',
  avoid_text = 'Tránh làm việc liên tục giữa nắng, đặc biệt khi có dấu hiệu say nóng.
Không thu hoạch hoặc phơi nông sản khi sắp có mưa dông.
Hạn chế đốt rơm rạ gây ô nhiễm và nguy cơ cháy lan.',
  version = version + 1,
  updated_at = now()
where event_key = 'mang_chung';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v6', 'meaning', meaning, 'do_text', do_text, 'avoid_text', avoid_text
)::jsonb
from public.event_packages where event_key = 'mang_chung';

update public.event_packages set
  meaning = 'Hạ Chí là tiết khí thứ mười, thời điểm bán cầu Bắc có ngày dài nhất và đêm ngắn nhất trong năm. Năng lượng Mặt Trời lớn, nắng nóng và dông mùa hè thường rõ rệt; đây là mốc quan trọng cho sản xuất và sinh hoạt mùa nóng.

Sau Hạ Chí, độ dài ban ngày bắt đầu giảm dần.',
  do_text = 'Theo dõi cảnh báo nắng nóng, uống đủ nước và dùng phương tiện chống nắng.
Sắp xếp việc ngoài trời vào sáng sớm hoặc chiều muộn.
Kiểm tra phòng cháy, hệ thống điện và chủ động phòng dông sét.',
  avoid_text = 'Tránh ra nắng giữa trưa, vận động quá sức hoặc để cơ thể mất nước.
Không tắm sông hồ khi có dông, lũ hoặc thiếu thiết bị an toàn.
Hạn chế dùng điện quá tải và đốt rác, đốt đồng trong ngày khô nóng.',
  version = version + 1,
  updated_at = now()
where event_key = 'ha_chi';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v6', 'meaning', meaning, 'do_text', do_text, 'avoid_text', avoid_text
)::jsonb
from public.event_packages where event_key = 'ha_chi';

update public.event_packages set
  meaning = 'Tiểu Thử là tiết khí thứ mười một, nghĩa là bắt đầu bước vào giai đoạn nóng rõ nhưng chưa phải cực điểm. Nhiệt độ, độ ẩm và mưa dông cao làm tăng nguy cơ say nóng, bệnh tiêu hóa và sâu bệnh cây trồng.

Đời sống cần ưu tiên chống nóng và vệ sinh thực phẩm.',
  do_text = 'Uống nước đều, ăn thực phẩm tươi và nghỉ ngơi ở nơi thoáng mát.
Theo dõi cảnh báo nhiệt, dông và bố trí lao động hợp lý.
Tưới tiêu, che phủ đất và kiểm tra sâu bệnh sau mưa.',
  avoid_text = 'Tránh đồ ăn để lâu, nước đá không bảo đảm và rượu bia khi mất nước.
Không làm việc nặng liên tục giữa trưa hoặc ngủ ngay dưới luồng điều hòa lạnh.
Hạn chế đứng gần cây, cột điện hay mặt nước khi có sét.',
  version = version + 1,
  updated_at = now()
where event_key = 'tieu_thu';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v6', 'meaning', meaning, 'do_text', do_text, 'avoid_text', avoid_text
)::jsonb
from public.event_packages where event_key = 'tieu_thu';

update public.event_packages set
  meaning = 'Đại Thử là tiết khí thứ mười hai và thường là giai đoạn nóng nhất trong năm theo lịch tiết khí. Nắng gay gắt có thể xen mưa lớn, dông và bão; sức khỏe con người, vật nuôi và cây trồng đều chịu áp lực nhiệt.

Đây là thời điểm cần ưu tiên phòng say nóng, cháy nổ và thiên tai mùa hè.',
  do_text = 'Theo dõi cảnh báo thời tiết, chuẩn bị nước uống và phương án làm mát.
Điều chỉnh lịch lao động, chăm sóc người già, trẻ nhỏ và vật nuôi.
Gia cố mái, khơi thông thoát nước và dự trữ nhu yếu phẩm hợp lý trước bão.',
  avoid_text = 'Tránh ở ngoài trời lâu, để người hoặc vật nuôi trong không gian kín nóng.
Không dùng thiết bị điện quá tải hay đốt lửa gần vật liệu khô.
Hạn chế đi qua vùng ngập, cây lớn hoặc công trình không an toàn khi mưa bão.',
  version = version + 1,
  updated_at = now()
where event_key = 'dai_thu';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v6', 'meaning', meaning, 'do_text', do_text, 'avoid_text', avoid_text
)::jsonb
from public.event_packages where event_key = 'dai_thu';

update public.event_packages set
  meaning = 'Lập Thu là tiết khí thứ 13 trong 24 tiết khí theo lịch phương Đông, mang ý nghĩa là sự khởi đầu của mùa thu, thời điểm giao mùa từ nóng sang mát và là mốc quan trọng trong nông nghiệp. Từ "Lập" có nghĩa là bắt đầu, còn "Thu" là mùa thu.

Thời tiết: Dù theo lịch đây là khởi đầu mùa thu, trên thực tế tại nhiều nơi thời tiết vẫn còn vương vấn cái nóng của mùa hè do ảnh hưởng khí hậu.

Đời sống: Trong nông nghiệp và dân gian, đây là mốc thời gian quan trọng để chuẩn bị cho các hoạt động gieo trồng mùa mới hoặc sửa sang nhà cửa',
  do_text = 'Thắp hương cúng gia tiên: Chuẩn bị mâm hoa quả, bánh trái dâng cúng thần linh, gia tiên để cầu tài lộc, bình an và may mắn cho giai đoạn cuối năm.
Dọn dẹp, sửa sang nhà cửa: Sắp xếp lại không gian sống, quét dọn kho bãi hoặc lợp mái, sửa chữa nhỏ trong nhà để đón luồng sinh khí mới.
Trồng cây và bài trí: Trồng thêm cây xanh hoặc sắp xếp lại cây cảnh trong nhà giúp không gian thêm trong lành, tươi mát.
Chăm sóc sức khỏe, ăn uống thanh đạm: Bổ sung thực phẩm giàu dưỡng chất, ăn đồ ấm áp và dễ tiêu hóa để thích nghi với sự thay đổi của thời tiết giao mùa.',
  avoid_text = 'Kiêng kỵ sát sinh: Theo quan niệm dân gian, ngày này nên hạn chế việc sát sinh để tích đức, cầu phước và giữ tâm hồn thanh tịnh.
Tránh ăn đồ quá lạnh hoặc sống: Hệ tiêu hóa dễ bị tổn thương khi thời tiết chuyển mùa, do đó cần tránh dùng nhiều đồ ăn lạnh, đồ sống.
Tránh cãi vã, giận hờn: Giữ tinh thần vui vẻ, hòa nhã, tránh to tiếng hay tranh chấp để không làm ảnh hưởng đến vận khí cá nhân.
Hạn chế khởi công đại sự động thổ lớn: Nhiều người thường kiêng kỵ việc động thổ xây nhà quy mô lớn hoặc cải táng trong ngày này, thay vào đó chỉ nên sửa chữa nhỏ.',
  version = version + 1,
  updated_at = now()
where event_key = 'lap_thu';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v6', 'meaning', meaning, 'do_text', do_text, 'avoid_text', avoid_text
)::jsonb
from public.event_packages where event_key = 'lap_thu';

update public.event_packages set
  meaning = 'Xử Thử là tiết khí thứ mười bốn, tên gọi hàm ý cái nóng dần kết thúc. Thời tiết chuyển từ hè sang thu, ngày đêm dịu hơn nhưng vẫn có thể xuất hiện nắng nóng, mưa bão và chênh lệch nhiệt độ.

Nông nghiệp: Nhiều nơi bước vào giai đoạn chăm sóc hoặc thu hoạch vụ mùa.',
  do_text = 'Theo dõi mưa bão, gia cố nhà cửa và chủ động lịch thu hoạch.
Điều chỉnh trang phục theo nhiệt độ, ngủ đủ và ăn uống dễ tiêu.
Vệ sinh kho chứa, phơi sấy nông sản khi thời tiết thuận lợi.',
  avoid_text = 'Tránh chủ quan vì nắng nóng hoặc bão cuối mùa vẫn có thể xảy ra.
Không phơi nông sản khi độ ẩm cao hay cất kho lúc chưa khô.
Hạn chế tắm khuya, để cơ thể lạnh đột ngột khi giao mùa.',
  version = version + 1,
  updated_at = now()
where event_key = 'xu_thu';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v6', 'meaning', meaning, 'do_text', do_text, 'avoid_text', avoid_text
)::jsonb
from public.event_packages where event_key = 'xu_thu';

update public.event_packages set
  meaning = 'Bạch Lộ là tiết khí thứ mười lăm, nghĩa là “sương trắng”, khi đêm mát hơn và hơi nước dễ ngưng tụ thành sương. Chênh lệch nhiệt độ ngày đêm tăng, báo hiệu mùa thu rõ rệt hơn và ảnh hưởng đến sức khỏe, cây trồng.

Đời sống: Buổi sáng sớm thường ẩm lạnh, trong khi ban ngày vẫn có thể nắng.',
  do_text = 'Mặc thêm lớp mỏng sáng sớm, giữ ấm cổ và đường hô hấp.
Theo dõi sương, độ ẩm để phòng nấm bệnh và điều chỉnh tưới cây.
Phơi chăn đồ lúc có nắng, giữ nhà thông thoáng.',
  avoid_text = 'Tránh ra ngoài sớm với áo quần quá mỏng hoặc tắm nước lạnh đột ngột.
Không tưới đẫm vào chiều tối khiến cây ẩm kéo dài qua đêm.
Hạn chế thực phẩm lạnh nếu cơ thể nhạy cảm khi giao mùa.',
  version = version + 1,
  updated_at = now()
where event_key = 'bach_lo';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v6', 'meaning', meaning, 'do_text', do_text, 'avoid_text', avoid_text
)::jsonb
from public.event_packages where event_key = 'bach_lo';

update public.event_packages set
  meaning = 'Thu Phân là tiết khí thứ mười sáu, khi ngày và đêm dài gần bằng nhau. Đây là giữa mùa thu, ánh sáng giảm dần và nhiệt độ thường dịu hơn; trong nông nghiệp là mốc theo dõi chín, thu hoạch và chuẩn bị vụ sau.

Ý nghĩa biểu tượng là sự cân bằng và điều chỉnh nhịp sống.',
  do_text = 'Tận dụng thời tiết dịu để vận động, nghỉ ngơi và điều chỉnh giờ sinh hoạt.
Thu hoạch đúng độ chín, phơi sấy và bảo quản nông sản khô ráo.
Theo dõi bão, mưa lớn và giữ ấm khi nhiệt độ giảm.',
  avoid_text = 'Tránh phơi hoặc cất nông sản khi ẩm, dễ phát sinh nấm mốc.
Không chủ quan với thời tiết thay đổi nhanh giữa ngày và đêm.
Hạn chế thức khuya, ăn uống thất thường làm suy giảm sức đề kháng.',
  version = version + 1,
  updated_at = now()
where event_key = 'thu_phan';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v6', 'meaning', meaning, 'do_text', do_text, 'avoid_text', avoid_text
)::jsonb
from public.event_packages where event_key = 'thu_phan';

update public.event_packages set
  meaning = 'Hàn Lộ là tiết khí thứ mười bảy, nghĩa là “sương lạnh”, khi nhiệt độ tiếp tục giảm và sương mang cảm giác lạnh rõ hơn. Đây là giai đoạn cuối thu, thời tiết khô lạnh hoặc mưa tùy vùng, cây trồng bước vào thu hoạch và chuẩn bị chống rét.

Đời sống: Bệnh hô hấp và khô da có thể tăng.',
  do_text = 'Giữ ấm sáng tối, dưỡng ẩm da và uống đủ nước dù ít khát.
Thu hoạch nông sản chín, che chắn cây và vật nuôi nhạy cảm với lạnh.
Thông thoáng nhà cửa nhưng tránh gió lùa trực tiếp.',
  avoid_text = 'Tránh mặc phong phanh, tắm khuya hoặc thay đổi nhiệt độ đột ngột.
Không đốt than, củi trong phòng kín vì nguy cơ ngộ độc khí.
Hạn chế để nông sản ngoài trời qua đêm khi sương nhiều.',
  version = version + 1,
  updated_at = now()
where event_key = 'han_lo';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v6', 'meaning', meaning, 'do_text', do_text, 'avoid_text', avoid_text
)::jsonb
from public.event_packages where event_key = 'han_lo';

update public.event_packages set
  meaning = 'Sương Giáng là tiết khí thứ mười tám, nghĩa là sương rơi dày và ở vùng lạnh có thể xuất hiện sương giá. Đây là tiết khí cuối mùa thu, báo hiệu mùa đông đến gần và là mốc chuẩn bị bảo vệ cây trồng, vật nuôi trước rét.

Tại Việt Nam, mức độ sương giá khác nhau rõ rệt theo vùng và độ cao.',
  do_text = 'Theo dõi cảnh báo rét, che phủ cây và giữ ấm chuồng trại.
Thu hoạch cây trồng nhạy cảm trước đợt lạnh mạnh nếu cần.
Mặc ấm, khởi động kỹ trước vận động và chăm sóc người có bệnh nền.',
  avoid_text = 'Tránh tưới cây muộn trước đêm rét hoặc để vật nuôi ngoài trời.
Không dùng lửa, than sưởi trong phòng kín, thiếu thông gió.
Hạn chế đi sớm ở nơi sương dày, đường trơn và tầm nhìn kém.',
  version = version + 1,
  updated_at = now()
where event_key = 'suong_giang';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v6', 'meaning', meaning, 'do_text', do_text, 'avoid_text', avoid_text
)::jsonb
from public.event_packages where event_key = 'suong_giang';

update public.event_packages set
  meaning = 'Lập Đông là tiết khí thứ mười chín, đánh dấu khởi đầu mùa đông theo lịch phương Đông. Nhiệt độ và thời lượng chiếu sáng giảm, cây trồng sinh trưởng chậm hơn; con người cần chuyển sang chế độ giữ ấm và tích trữ phù hợp.

Ở Việt Nam, miền Bắc cảm nhận rõ hơn, còn miền Nam thường bước vào mùa khô.',
  do_text = 'Kiểm tra chăn ấm, thiết bị sưởi và thông gió an toàn.
Ăn đủ chất, vận động đều và tiêm phòng theo tư vấn y tế nếu cần.
Che chắn cây, chuồng trại và điều chỉnh lịch sản xuất theo vùng.',
  avoid_text = 'Tránh dùng bếp than, máy sưởi kém an toàn trong phòng kín.
Không đóng kín nhà cả ngày làm không khí tù đọng.
Hạn chế ra lạnh đột ngột, đặc biệt với người già và người có bệnh tim phổi.',
  version = version + 1,
  updated_at = now()
where event_key = 'lap_dong';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v6', 'meaning', meaning, 'do_text', do_text, 'avoid_text', avoid_text
)::jsonb
from public.event_packages where event_key = 'lap_dong';

update public.event_packages set
  meaning = 'Tiểu Tuyết là tiết khí thứ hai mươi, nghĩa là bắt đầu có tuyết nhẹ ở các vùng khí hậu lạnh. Tại Việt Nam, ý nghĩa thực tế chủ yếu là nhiệt độ giảm, không khí khô hoặc rét ẩm và nguy cơ rét đậm ở vùng núi.

Nông nghiệp: Cần chủ động chống rét và quản lý độ ẩm.',
  do_text = 'Theo dõi dự báo rét, giữ ấm người, vật nuôi và cây trồng.
Dưỡng ẩm da, uống đủ nước và tăng thực phẩm giàu dinh dưỡng.
Kiểm tra mái che, nguồn thức ăn và nước uống cho vật nuôi.',
  avoid_text = 'Tránh sưởi than trong phòng kín hoặc dùng thiết bị điện quá tải.
Không chăn thả gia súc khi rét đậm, mưa lạnh kéo dài.
Hạn chế tắm muộn, để quần áo ẩm hoặc ngủ nơi gió lùa.',
  version = version + 1,
  updated_at = now()
where event_key = 'tieu_tuyet';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v6', 'meaning', meaning, 'do_text', do_text, 'avoid_text', avoid_text
)::jsonb
from public.event_packages where event_key = 'tieu_tuyet';

update public.event_packages set
  meaning = 'Đại Tuyết là tiết khí thứ hai mươi mốt, chỉ giai đoạn tuyết có thể nhiều hơn ở vùng lạnh và khí lạnh hoạt động mạnh. Ở Việt Nam thường biểu hiện bằng các đợt rét, gió mùa và đôi khi băng giá vùng núi.

Đây là mốc tăng cường phòng rét, bảo đảm giao thông và an toàn sản xuất.',
  do_text = 'Cập nhật cảnh báo rét, băng giá và chuẩn bị nhu yếu phẩm vừa đủ.
Gia cố chuồng trại, dự trữ thức ăn và che phủ cây trồng.
Giữ ấm nhiều lớp, vận động nhẹ và kiểm tra sức khỏe người có bệnh nền.',
  avoid_text = 'Tránh đi vào vùng băng giá, đường trơn khi không cần thiết.
Không đốt lửa hoặc dùng máy phát điện trong không gian kín.
Hạn chế lao động ngoài trời kéo dài khi rét buốt, gió mạnh.',
  version = version + 1,
  updated_at = now()
where event_key = 'dai_tuyet';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v6', 'meaning', meaning, 'do_text', do_text, 'avoid_text', avoid_text
)::jsonb
from public.event_packages where event_key = 'dai_tuyet';

update public.event_packages set
  meaning = 'Đông Chí là tiết khí thứ hai mươi hai, thời điểm bán cầu Bắc có đêm dài nhất và ngày ngắn nhất trong năm. Sau mốc này, thời lượng ban ngày tăng dần; nhiều cộng đồng Đông Á xem đây là dịp sum họp, tưởng nhớ tổ tiên và dùng món ăn ấm.

Thời tiết: Miền Bắc thường bước vào giai đoạn rét rõ.',
  do_text = 'Sum họp, chuẩn bị bữa ăn ấm và thắp hương gia tiên nếu theo phong tục gia đình.
Giữ ấm, vận động để duy trì tuần hoàn và tận dụng ánh sáng ban ngày.
Bảo vệ cây trồng, vật nuôi và kiểm tra thiết bị sưởi.',
  avoid_text = 'Tránh ăn quá nhiều đồ béo, uống rượu để “chống rét” hoặc thức khuya.
Không sưởi than trong phòng kín hay tắm nước quá nóng khi cơ thể đang lạnh.
Hạn chế ra ngoài đêm khuya trong rét đậm nếu không cần thiết.',
  version = version + 1,
  updated_at = now()
where event_key = 'dong_chi';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v6', 'meaning', meaning, 'do_text', do_text, 'avoid_text', avoid_text
)::jsonb
from public.event_packages where event_key = 'dong_chi';

update public.event_packages set
  meaning = 'Tiểu Hàn là tiết khí thứ hai mươi ba, báo hiệu thời kỳ rét mạnh đã bắt đầu nhưng theo tên gọi chưa đến cực điểm. Gió lạnh, rét khô hoặc rét ẩm có thể ảnh hưởng lớn đến sức khỏe, giao thông và nông nghiệp.

Mức độ rét thực tế phụ thuộc từng năm và từng vùng.',
  do_text = 'Mặc nhiều lớp, ăn đủ chất và theo dõi sức khỏe người già, trẻ nhỏ.
Che phủ cây, giữ khô chuồng trại và cung cấp thức ăn giàu năng lượng cho vật nuôi.
Kiểm tra dự báo trước khi đi xa hoặc làm việc ngoài trời.',
  avoid_text = 'Tránh để cơ thể ướt lạnh, tắm khuya và vận động quá sức trong rét.
Không đốt than hoặc nổ máy xe trong phòng kín.
Hạn chế gieo trồng cây không chịu lạnh khi chưa có biện pháp bảo vệ.',
  version = version + 1,
  updated_at = now()
where event_key = 'tieu_han';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v6', 'meaning', meaning, 'do_text', do_text, 'avoid_text', avoid_text
)::jsonb
from public.event_packages where event_key = 'tieu_han';

update public.event_packages set
  meaning = 'Đại Hàn là tiết khí thứ hai mươi tư, tiết khí cuối cùng và thường tượng trưng cho giai đoạn rét nhất trong chu kỳ năm. Đây là lúc tập trung chống rét, bảo vệ sức khỏe và chuẩn bị chuyển sang Lập Xuân, mở đầu chu kỳ mới.

Nông nghiệp: Rét đậm, sương giá có thể gây thiệt hại nếu thiếu che chắn.',
  do_text = 'Theo dõi cảnh báo rét, dự trữ thức ăn và giữ ấm chuồng trại, cây trồng.
Chăm sóc người có bệnh tim mạch, hô hấp và duy trì vận động trong nhà.
Kiểm tra thiết bị điện, nước và chuẩn bị cho mùa vụ đầu xuân.',
  avoid_text = 'Tránh lao động ngoài trời quá lâu, đặc biệt sáng sớm và ban đêm.
Không dùng lửa, than hoặc thiết bị sưởi không bảo đảm trong phòng kín.
Hạn chế tưới muộn, để cây và vật nuôi tiếp xúc trực tiếp với sương giá.',
  version = version + 1,
  updated_at = now()
where event_key = 'dai_han';

insert into public.event_package_history(event_package_id, version, admin_id, snapshot)
select id, version, null, json_build_object(
  'source', 'bulk_import_v6', 'meaning', meaning, 'do_text', do_text, 'avoid_text', avoid_text
)::jsonb
from public.event_packages where event_key = 'dai_han';

notify pgrst, 'reload schema';
