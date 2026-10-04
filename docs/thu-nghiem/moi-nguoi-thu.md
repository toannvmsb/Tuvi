# Thử nghiệm nội bộ "Nghiệm quá khứ" — tài liệu mời người thử

Dùng cho cổng ra mắt của tính năng (xem CLAUDE.md §11). Mục tiêu: ít nhất **50 người biết chắc giờ sinh**, trải đều độ tuổi (có cả 15–24 và 60+).
Mỗi người mất khoảng **3–5 phút**: cho Tuzi ngày giờ sinh, nhận 10 dòng, điền Đúng / Gần đúng / Sai / Không nhớ.

## 1. Tin nhắn mời (sửa cho hợp người nhận)

> Chào [tên], Tuzi đang thử một tính năng nhìn lại những năm đã qua của lá số. Anh/chị/bạn giúp mình trả lời 10 dòng ngắn:
> mỗi dòng là một năm và một mảng đời (sự nghiệp, tình duyên, tài lộc…), chỉ cần chọn **Đúng / Gần đúng / Sai / Không nhớ** xem năm đó ở mảng đó
> có biến động đáng kể với mình không. Mất khoảng 3–5 phút. Mình cần **ngày giờ sinh dương lịch** (giờ phải chắc chắn) và giới tính.
> Kết quả chỉ dùng để chỉnh bộ máy, không công bố tên và không chia sẻ cho ai.

## 2. Lời xin đồng ý (đọc/gửi kèm, người thử tích "Đồng ý")

- Tôi đồng ý cung cấp ngày, tháng, năm, giờ sinh (dương lịch) và giới tính để Tuzi lập lá số phục vụ thử nghiệm.
- Tôi hiểu câu trả lời của tôi (Đúng / Gần đúng / Sai / Không nhớ cho từng năm) được dùng để đánh giá và chỉnh bộ quy tắc; dữ liệu được lưu **ẩn danh** theo mã, không gắn họ tên.
- Tôi có thể yêu cầu xóa dữ liệu của mình bất cứ lúc nào bằng cách báo mã của tôi cho người phụ trách.

*(Văn bản xin đồng ý chính thức cần luật sư rà lại trước khi ra mắt — xem mục Pháp lý của đặc tả.)*

## 3. Phiếu thu thập (làm bằng Google Form hoặc bảng tính)

| Cột | Bắt buộc | Ghi chú |
|---|---|---|
| Mã người thử | có | Người phụ trách cấp (NT001, NT002…); người thử không cần nhập họ tên |
| Năm / tháng / ngày sinh dương lịch | có | |
| Giờ sinh (0–23) | có | Chỉ nhận người **chắc chắn** giờ sinh (giấy khai sinh, hoặc người nhà nhớ rõ) |
| Giới tính (nam / nữ) | có | |
| Chắc chắn giờ sinh? (Có / Không) | có | Chọn "Không" thì **loại** khỏi bộ thử |
| Đồng ý theo mục 2 | có | |
| Kênh mời / nhóm tuổi | không | Để theo dõi độ phủ độ tuổi |

Sau khi thu: lọc người đồng ý + chắc chắn giờ sinh, đổi thành từng dòng `mã,NĂM-THÁNG-NGÀY-GIỜ-nam|nu` trong file `nguoi-thu.csv`
(mẫu: `nguoi-thu-mau.csv` cùng thư mục).

## 4. Quy trình sau khi có danh sách

```bash
# 1) Xuất mỗi người một bộ thử mù (10 dòng trộn: 5 mốc bộ máy + 5 năm ngẫu nhiên cùng mảng) + file đáp án
PAST_REVIEW_EXPORT=1 PAST_REVIEW_BIRTHS_FILE=nguoi-thu.csv npx jest src/core/__tests__/pastReviewExport.test.ts

# 2) Gửi file exports/past-review-<mã>-blind.md (hoặc dán 10 dòng vào form) cho đúng người; thu lại cột "Phản hồi" vào CÙNG file

# 3) Chấm khi đã đủ phản hồi (PAST_REVIEW_PASS_DIFF=0.15 và PAST_REVIEW_MIN_PERSONS=50 là ngưỡng mặc định, anh Toàn có thể đổi)
PAST_REVIEW_SCORE=1 npx jest src/core/__tests__/pastReviewExport.test.ts      # → exports/past-review-score.md

# 4) Gói cho 2–3 người luận Tử Vi/Bát Tự có nghề đánh giá phần "Vì sao"
PAST_REVIEW_EXPERT=1 PAST_REVIEW_BIRTHS_FILE=nguoi-thu.csv npx jest src/core/__tests__/pastReviewExport.test.ts   # → exports/past-review-expert-pack.md
```

Lưu ý quyền riêng tư: `exports/` và `nguoi-thu.csv` đã nằm trong `.gitignore`; không gửi file có ngày giờ sinh qua kênh công khai. Người thử không được thấy file đáp án (`*-key.json`).
