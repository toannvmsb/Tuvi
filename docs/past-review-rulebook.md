# Nghiệm quá khứ — Bảng quy tắc để duyệt

Phiên bản bảng: **pr-0.1-tam** — mọi trọng số/ngưỡng dưới đây là **TẠM**, do Claude đặt theo bảng "Tín hiệu theo mảng đời" của đặc tả, **chờ anh Toàn duyệt/chỉnh**.
File này sinh tự động từ code (`PAST_REVIEW_RULEBOOK=1 npx jest src/core/__tests__/pastReviewExport.test.ts`); cấu hình thật nằm ở `src/core/pastReview/config.ts` và `src/core/pastReview/bazi/rules.ts`. Đổi gì thì tăng `RULEBOOK_VERSION` và cập nhật golden test.

## 1. Cách chấm một năm

1. **Tử Vi** — dùng nguyên engine `annualEvents` (Nam Phái; 85 sự kiện, bằng chứng gốc/nền/ngòi). Gộp các sự kiện vào 5 mảng theo mục 2. Điểm thô mảng = 60% sự kiện mạnh nhất + 30% thứ hai + 10% thứ ba, cộng 0,5 × phần bằng chứng riêng của năm (tối đa +30).
2. **Bát Tự** — áp bảng quy tắc mục 3. Điểm thô mảng = (Σ trọng số ủng hộ − 0.5 × Σ trọng số ngược chiều) × 2, trần 100.
3. **Chuẩn hóa theo từng lá số**: điểm mỗi hệ so với phân bố của chính lá số đó — ≤ phân vị 50 → 0, ≥ phân vị 95 → 100 (vì cả hai hệ đều cho điểm nền ở hầu hết các năm).
4. **Gộp**: hai hệ cùng ≥ 30 → trung bình × 1.2; chỉ một hệ → điểm hệ đó × 0.6. Có tín hiệu nền (đại hạn/đại vận) cùng mảng với tín hiệu lưu niên → × 1.25.
5. **Độ mạnh 3 mức**: Mạnh = đồng thuận và ≥ 60; Vừa = đồng thuận hoặc ≥ 40; còn lại Nhẹ.
6. **Chọn mốc**: tối đa 8 mốc (3 nếu dưới 25 tuổi); mỗi năm một mốc; ≤ 2/mảng; ≤ 4/đại hạn; trải ≥ 2 đại hạn; từ 15 tuổi; ưu tiên 20 năm gần nhất (năm xa × 0.85); bỏ năm hiện tại; mốc thứ 6 trở đi cần độ mạnh ≥ 25.
7. **Tuổi phổ biến bị loại**: Sự nghiệp 21/22/23; Tình duyên 26/27/28.
8. **Mốc đổi năm**: năm ÂM LỊCH (mùng 1 Tết) cho cả hai hệ — đúng cách app đang lập trụ năm/tháng Bát Tự (không dùng Lập Xuân).

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
| `BZ_FAM_ROOT` | Gia đạo | Gốc | ủng hộ | trung tính | 0 | mô tả trụ năm của lá số (luôn có, chỉ để giải thích) — Trụ năm — gốc gia đình, cha mẹ |  |
| `BZ_FAM_CLASH_YEAR` | Gia đạo | Ngòi | ủng hộ | nghịch | 25 | chi lưu niên xung chi trụ năm — Chi lưu niên xung chi năm |  |
| `BZ_FAM_HARM_YEAR` | Gia đạo | Ngòi | ủng hộ | nghịch | 15 | chi lưu niên hại chi trụ năm — Chi lưu niên hại chi năm |  |
| `BZ_FAM_PUNISH_MONTH` | Gia đạo | Ngòi | ủng hộ | nghịch | 12 | chi lưu niên hình chi trụ tháng — Chi lưu niên hình chi tháng |  |
| `BZ_FAM_COMBINE_YEAR` | Gia đạo | Ngòi | ủng hộ | thuận | 12 | chi lưu niên lục hợp chi trụ năm — Chi lưu niên lục hợp chi năm |  |
| `BZ_FAM_SEAL_HURT` | Gia đạo | Ngòi | ủng hộ | nghịch | 20 | can/chi lưu niên là Tài tinh, và lá số gốc có Ấn — Tài lưu niên khắc Ấn |  |
| `BZ_FAM_LUCK_SEAL` | Gia đạo | Nền | ủng hộ | thuận | 8 | đại vận (can hoặc chi) là Chính Ấn / Thiên Ấn — Đại vận mang Ấn tinh |  |

## 4. Chỗ xấp xỉ cần anh biết

- **Đại vận Bát Tự** (mới): chiều thuận/nghịch theo giới × âm dương can năm; khởi vận = số ngày tới *tiết* gần nhất ÷ 3. Nhưng trụ tháng của app lập theo tháng âm lịch (không theo tiết khí) nên đại vận chỉ là xấp xỉ, nhất quán với trụ app đang hiển thị.
- **Dụng/kỵ thần**: lấy từ `batTuChart.favorableElements/unfavorableElements` của app (công thức đơn giản theo tỷ lệ hành nhật chủ), chưa xét tháng lệnh; lệch với `phongThuyBatTu`.
- **Dịch Mã/Đào Hoa**: theo tam hợp của chi năm sinh và chi ngày sinh (bảng cổ điển).
- **Chưa hỗ trợ giờ sinh không rõ** (app chưa có cờ này, mặc định giờ 12).
- Tử Vi chấm bằng **toàn bộ engine annualEvents** (trọng số của engine, không phải bảng riêng), nên chỉnh trọng số Tử Vi là chỉnh `src/data/annualEventRules.generated.json`.
