# Nghiệm quá khứ — Bảng quy tắc để duyệt

Phiên bản bảng: **pr-0.3-tam** — mọi trọng số/ngưỡng dưới đây là **TẠM**, do Claude đặt theo bảng "Tín hiệu theo mảng đời" của đặc tả, **chờ anh Toàn duyệt/chỉnh**.
File này sinh tự động từ code (`PAST_REVIEW_RULEBOOK=1 npx jest src/core/__tests__/pastReviewExport.test.ts`); cấu hình thật nằm ở `src/core/pastReview/config.ts` và `src/core/pastReview/bazi/rules.ts`. Đổi gì thì tăng `RULEBOOK_VERSION` và cập nhật golden test.

## 1. Cách chấm một năm

1. **Tử Vi** — dùng nguyên engine `annualEvents` (Nam Phái; 85 sự kiện, bằng chứng gốc/nền/ngòi). Gộp các sự kiện vào 5 mảng theo mục 2. Điểm thô mảng = 60% sự kiện mạnh nhất + 30% thứ hai + 10% thứ ba, cộng 0,5 × phần bằng chứng riêng của năm (tối đa +30).
2. **Bát Tự** — áp bảng quy tắc mục 3. Điểm thô mảng = (Σ trọng số ủng hộ − 0.5 × Σ trọng số ngược chiều) × 2, trần 100.
3. **Chuẩn hóa theo từng lá số**: điểm mỗi hệ so với phân bố của chính lá số đó — ≤ phân vị 50 → 0, ≥ phân vị 95 → 100 (vì cả hai hệ đều cho điểm nền ở hầu hết các năm).
4. **Gộp**: hai hệ cùng ≥ 30 → trung bình × 1.2; chỉ một hệ → điểm hệ đó × 0.6. Có tín hiệu nền (đại hạn/đại vận) cùng mảng với tín hiệu lưu niên → × 1.25.
5. **Độ mạnh 3 mức**: Mạnh = đồng thuận và ≥ 60; Vừa = đồng thuận hoặc ≥ 40; còn lại Nhẹ.
6. **Chọn mốc**: tối đa 8 mốc (3 nếu dưới 25 tuổi); mỗi năm một mốc; ≤ 2/mảng; ≤ 4/đại hạn; trải ≥ 2 đại hạn; từ 15 tuổi; ưu tiên 20 năm gần nhất (năm xa × 0.85); bỏ năm hiện tại; mốc thứ 6 trở đi cần độ mạnh ≥ 25.
7. **Tuổi phổ biến bị loại**: Sự nghiệp 21/22/23; Tình duyên 26/27/28.
8. **Mốc đổi năm**: Tử Vi theo NĂM ÂM LỊCH (mùng 1 Tết). Bát Tự (từ pr-0.2): trụ năm đổi ở Lập Xuân, trụ tháng đổi ở 12 tiết khí (`BAZI_BASIS` = tiet); đặt lunar để quay về cách của màn Bát Tự (tháng âm lịch).
9. **Sự kiện vô lý theo tuổi** bị loại (`EVENT_MAX_AGE`, vd thăng chức sau 62, mua nhà sau 80, sinh con sau ~50).

*Thay đổi pr-0.3-tam (06/10/2026):* thêm 3 quy tắc năm trùng tuổi / Phục ngâm / Phản ngâm; Bát Tự của cả app nay lập theo tiết khí và dùng chung phép phù ức. *Thay đổi pr-0.2-tam:* dụng/kỵ thần tính theo phép phù ức (thân vượng/nhược, tháng lệnh nặng nhất); trụ năm/tháng theo tiết khí; đại vận Bát Tự khởi từ trụ tháng tiết khí và kéo tới 12 vận; thêm `EVENT_MAX_AGE`.

## 2. Ánh xạ sự kiện Tử Vi → 5 mảng đời

**Sự nghiệp** (15): Thăng chức, tăng vị trí (≥18 tuổi) · Tăng trách nhiệm công việc (≥18 tuổi) · Đổi việc, chuyển nơi làm (≥17 tuổi) · Mất việc, gián đoạn công việc (≥17 tuổi) · Đổi vai trò công việc (≥18 tuổi) · Chuyển bộ phận nội bộ (≥18 tuổi) · Dự án mới, việc mới · Vai trò lãnh đạo, quản lý (≥22 tuổi) · Khởi nghiệp, mở việc kinh doanh riêng (≥18 tuổi) · Mở rộng kinh doanh (≥20 tuổi) · Mâu thuẫn nơi làm việc (≥17 tuổi) · Áp lực công việc (≥17 tuổi) · Được ghi nhận trong công việc (≥17 tuổi) · Sự nghiệp chững lại (≥18 tuổi) · Được ghi nhận, nổi bật (≥16 tuổi)

**Chỗ ở & di chuyển** (11): Đi xa, du lịch · Di chuyển nhiều nơi · Chuyển nơi sinh sống · Ra nước ngoài · Công tác xa · Thay đổi môi trường sống/làm việc · Chuyển chỗ ở · Mua nhà đất/tài sản lớn (≥20 tuổi) · Bán nhà đất/tài sản lớn (≥20 tuổi) · Sửa chữa, cải tạo nhà (≥20 tuổi) · Việc trong gia đình/nhà cửa

**Tình duyên** (9): Mối quan hệ mới · Tình cảm thêm gắn bó · Đính hôn (≥18 tuổi) · Kết hôn, lập gia đình (≥18 tuổi) · Mâu thuẫn tình cảm · Tình cảm xa cách · Chia tay, ly thân · Hàn gắn tình cảm · Mở rộng quan hệ xã hội

**Tài lộc** (16): Thu nhập tăng · Thưởng, khoản thu bất thường · Tài lộc bất ngờ · Dòng tiền vào lớn · Khoản chi lớn (≥17 tuổi) · Áp lực dòng tiền (≥17 tuổi) · Hoạt động đầu tư (≥18 tuổi) · Đầu tư có lãi (≥18 tuổi) · Đầu tư thua lỗ (≥18 tuổi) · Nợ/vay tăng (≥18 tuổi) · Giảm nợ, trả nợ (≥18 tuổi) · Tích lũy tài sản (≥18 tuổi) · Tranh chấp tiền bạc (≥18 tuổi) · Đầu tư bất động sản (≥20 tuổi) · Thừa kế tài sản · Chi lớn cho tài sản/nhà cửa (≥20 tuổi)

**Gia đạo** (10): Việc liên quan cha mẹ · Việc liên quan anh chị em · Việc vui, hiếu hỷ trong nhà · Mâu thuẫn gia đình · Tín hiệu tin vui con cái (≥20 tuổi) · Tín hiệu sinh nở (≥20 tuổi) · Việc học của con (≥22 tuổi) · Thay đổi lớn liên quan con cái (≥22 tuổi) · Tài sản chung gia đình biến động (≥18 tuổi) · Tranh chấp tài sản (≥18 tuổi)

**Loại khỏi tính năng** (cố ý): toàn bộ Sức khỏe, Giấy tờ & Pháp lý, Học vấn; Sức khỏe con cái; Sức khỏe cha mẹ; Danh tiếng bị thử thách / xuất hiện công chúng.

## 3. Bảng quy tắc Bát Tự

Chiều: **ủng hộ** = làm tăng khả năng có biến động ở mảng đó; **ngược** = làm yếu. Sắc thái dùng cho điểm tốt/xấu của biểu đồ (`theo hỷ/kỵ` = theo hành can–chi lưu niên là dụng hay kỵ thần).

| Mã | Mảng | Tầng | Chiều | Sắc thái | Trọng số | Điều kiện | Duyệt |
|---|---|---|---|---|---|---|---|
| `BZ_CAR_ROOT` | Sự nghiệp | Gốc | ủng hộ | trung tính | 0 | mô tả trụ tháng của lá số (luôn có, chỉ để giải thích) — Trụ tháng — môi trường làm việc |  |
| `BZ_CAR_OFFICIAL` | Sự nghiệp | Ngòi | ủng hộ | theo hỷ/kỵ | 24 | can hoặc chi lưu niên là Chính Quan / Thất Sát — Lưu niên gặp Quan/Sát |  |
| `BZ_CAR_HURT` | Sự nghiệp | Ngòi | ủng hộ | theo hỷ/kỵ | 20 | can hoặc chi lưu niên là Thương Quan — Lưu niên gặp Thương Quan |  |
| `BZ_CAR_CLASH_MONTH` | Sự nghiệp | Ngòi | ủng hộ | nghịch | 30 | chi lưu niên xung chi trụ tháng — Chi lưu niên xung chi tháng |  |
| `BZ_CAR_PUNISH_MONTH` | Sự nghiệp | Ngòi | ủng hộ | nghịch | 15 | chi lưu niên hình chi trụ tháng — Chi lưu niên hình chi tháng |  |
| `BZ_CAR_COMBINE_MONTH` | Sự nghiệp | Ngòi | ngược | thuận | 15 | chi lưu niên lục hợp chi trụ tháng — Chi lưu niên lục hợp chi tháng |  |
| `BZ_CAR_LUCK_OFFICIAL` | Sự nghiệp | Nền | ủng hộ | trung tính | 12 | đại vận (can hoặc chi) là Chính Quan / Thất Sát / Thương Quan — Đại vận mang Quan/Sát/Thương Quan |  |
| `BZ_HOM_ROOT` | Chỗ ở & di chuyển | Gốc | ủng hộ | trung tính | 0 | mô tả trụ ngày của lá số (luôn có, chỉ để giải thích) — Trụ ngày — nơi an cư, bản thân |  |
| `BZ_HOM_CLASH_DAY` | Chỗ ở & di chuyển | Ngòi | ủng hộ | nghịch | 28 | chi lưu niên xung chi trụ ngày — Chi lưu niên xung chi ngày |  |
| `BZ_HOM_CLASH_YEAR` | Chỗ ở & di chuyển | Ngòi | ủng hộ | nghịch | 22 | chi lưu niên xung chi trụ năm — Chi lưu niên xung chi năm |  |
| `BZ_HOM_HORSE` | Chỗ ở & di chuyển | Ngòi | ủng hộ | trung tính | 25 | chi lưu niên trùng Dịch Mã (tính theo tam hợp của chi năm/chi ngày sinh) — Dịch Mã động |  |
| `BZ_HOM_LUCK_HORSE` | Chỗ ở & di chuyển | Nền | ủng hộ | trung tính | 10 | chi đại vận trùng Dịch Mã — Đại vận đúng Dịch Mã |  |
| `BZ_HOM_COMBINE_DAY` | Chỗ ở & di chuyển | Ngòi | ngược | thuận | 12 | chi lưu niên lục hợp chi trụ ngày — Chi lưu niên lục hợp chi ngày |  |
| `BZ_LOV_ROOT` | Tình duyên | Gốc | ủng hộ | trung tính | 0 | mô tả trụ ngày của lá số (luôn có, chỉ để giải thích) — Chi ngày — cung phối ngẫu |  |
| `BZ_LOV_SPOUSE_M` | Tình duyên | Ngòi | ủng hộ | theo hỷ/kỵ | 25 | can hoặc chi lưu niên là Chính Tài / Thiên Tài (chỉ nam) — Lưu niên gặp Tài tinh (vợ) |  |
| `BZ_LOV_SPOUSE_F` | Tình duyên | Ngòi | ủng hộ | theo hỷ/kỵ | 25 | can hoặc chi lưu niên là Chính Quan / Thất Sát (chỉ nữ) — Lưu niên gặp Quan tinh (chồng) |  |
| `BZ_LOV_COMBINE_DAY` | Tình duyên | Ngòi | ủng hộ | thuận | 22 | chi lưu niên lục hợp chi trụ ngày — Chi lưu niên lục hợp chi ngày |  |
| `BZ_LOV_TAMHOP_DAY` | Tình duyên | Ngòi | ủng hộ | thuận | 15 | chi lưu niên tam hợp chi trụ ngày — Chi lưu niên tam hợp chi ngày |  |
| `BZ_LOV_CLASH_DAY` | Tình duyên | Ngòi | ủng hộ | nghịch | 22 | chi lưu niên xung chi trụ ngày — Chi lưu niên xung chi ngày |  |
| `BZ_LOV_PEACH` | Tình duyên | Ngòi | ủng hộ | trung tính | 18 | chi lưu niên trùng Đào Hoa (tính theo tam hợp của chi năm/chi ngày sinh) — Đào Hoa động |  |
| `BZ_LOV_LUCK_SPOUSE_M` | Tình duyên | Nền | ủng hộ | trung tính | 10 | đại vận (can hoặc chi) là Chính Tài / Thiên Tài (chỉ nam) — Đại vận mang Tài tinh (nam) |  |
| `BZ_LOV_LUCK_SPOUSE_F` | Tình duyên | Nền | ủng hộ | trung tính | 10 | đại vận (can hoặc chi) là Chính Quan / Thất Sát (chỉ nữ) — Đại vận mang Quan tinh (nữ) |  |
| `BZ_WEA_ROOT` | Tài lộc | Gốc | ủng hộ | trung tính | 0 | mô tả số Tài tinh trong lá số + dụng/kỵ thần (luôn có, chỉ để giải thích) — Tài tinh trong lá số và hỷ/kỵ thần |  |
| `BZ_WEA_FAV` | Tài lộc | Ngòi | ủng hộ | thuận | 28 | can/chi lưu niên là Tài tinh và hành của nó là dụng thần — Lưu niên gặp Tài tinh là dụng thần |  |
| `BZ_WEA_UNFAV` | Tài lộc | Ngòi | ủng hộ | nghịch | 24 | can/chi lưu niên là Tài tinh và hành của nó là kỵ thần — Lưu niên gặp Tài tinh là kỵ thần |  |
| `BZ_WEA_ROB` | Tài lộc | Ngòi | ủng hộ | nghịch | 20 | can/chi lưu niên là Tỷ Kiên/Kiếp Tài, và lá số gốc có Tài — Tỷ/Kiếp đoạt tài |  |
| `BZ_WEA_LUCK_STAR` | Tài lộc | Nền | ủng hộ | trung tính | 10 | đại vận (can hoặc chi) là Chính Tài / Thiên Tài — Đại vận mang Tài tinh |  |
| `BZ_FAM_TAISUI` | Gia đạo | Ngòi | ủng hộ | trung tính | 15 | chi lưu niên TRÙNG chi trụ năm (năm trùng tuổi) — Năm trùng tuổi (chi lưu niên = chi năm sinh) |  |
| `BZ_LOV_FUYIN_DAY` | Tình duyên | Ngòi | ủng hộ | nghịch | 20 | can và chi lưu niên trùng hệt can chi trụ ngày (Phục ngâm) — Phục ngâm trụ ngày (can chi lưu niên trùng can chi ngày) |  |
| `BZ_HOM_FANYIN_DAY` | Chỗ ở & di chuyển | Ngòi | ủng hộ | nghịch | 28 | can lưu niên xung can trụ ngày và chi lưu niên xung chi trụ ngày (Phản ngâm) — Phản ngâm trụ ngày (thiên khắc địa xung) |  |
| `BZ_FAM_ROOT` | Gia đạo | Gốc | ủng hộ | trung tính | 0 | mô tả trụ năm của lá số (luôn có, chỉ để giải thích) — Trụ năm — gốc gia đình, cha mẹ |  |
| `BZ_FAM_CLASH_YEAR` | Gia đạo | Ngòi | ủng hộ | nghịch | 25 | chi lưu niên xung chi trụ năm — Chi lưu niên xung chi năm |  |
| `BZ_FAM_HARM_YEAR` | Gia đạo | Ngòi | ủng hộ | nghịch | 15 | chi lưu niên hại chi trụ năm — Chi lưu niên hại chi năm |  |
| `BZ_FAM_PUNISH_MONTH` | Gia đạo | Ngòi | ủng hộ | nghịch | 12 | chi lưu niên hình chi trụ tháng — Chi lưu niên hình chi tháng |  |
| `BZ_FAM_COMBINE_YEAR` | Gia đạo | Ngòi | ủng hộ | thuận | 12 | chi lưu niên lục hợp chi trụ năm — Chi lưu niên lục hợp chi năm |  |
| `BZ_FAM_SEAL_HURT` | Gia đạo | Ngòi | ủng hộ | nghịch | 20 | can/chi lưu niên là Tài tinh, và lá số gốc có Ấn — Tài lưu niên khắc Ấn |  |
| `BZ_FAM_LUCK_SEAL` | Gia đạo | Nền | ủng hộ | thuận | 8 | đại vận (can hoặc chi) là Chính Ấn / Thiên Ấn — Đại vận mang Ấn tinh |  |

## 4. Chỗ xấp xỉ cần anh biết

- **Đại vận Bát Tự**: chiều thuận/nghịch theo giới × âm dương can năm; khởi vận = số ngày tới *tiết* gần nhất ÷ 3 (theo ngày, bỏ qua giờ giao tiết), bắt đầu từ trụ tháng theo tiết khí (pr-0.2). Màn Bát Tự của app vẫn lập tháng theo âm lịch nên trụ tháng ở đây có thể khác trụ ở màn đó (đo trên 1.500 ngày sinh giả lập: khác ở ~17% người; trụ năm khác ở ~2%).
- **Dụng/kỵ thần** (pr-0.2): phép phù ức trong `bazi/strength.ts` — tổng 100 điểm: chi tháng 40, can tháng/can giờ/chi ngày 12, can năm/chi năm/chi giờ 8; ≥ 50 điểm đồng đảng (Tỷ Kiếp + Ấn) là thân vượng. Chưa xét tòng cách, điều hậu, thông quan, bệnh–dược. Kết quả có thể KHÁC danh sách dụng/kỵ hiển thị ở màn Bát Tự và phong thủy của app (vẫn dùng cách đếm hành cũ; đo trên 1.500 ngày sinh: hai cách ra cùng kết luận vượng/nhược ở ~69% người).
- **Dịch Mã/Đào Hoa**: theo tam hợp của chi năm sinh và chi ngày sinh (bảng cổ điển).
- **Chưa hỗ trợ giờ sinh không rõ** (app chưa có cờ này, mặc định giờ 12).
- Tử Vi chấm bằng **toàn bộ engine annualEvents** (trọng số của engine, không phải bảng riêng), nên chỉnh trọng số Tử Vi là chỉnh `src/data/annualEventRules.generated.json`.
