# GAP ANALYSIS — V1.x vs V2.0 Spec

> **Phase 0 – Khảo sát hệ thống hiện tại**  
> Ngày lập: 2026-07-19 | So sánh codebase hiện tại với bộ spec `00–11_*.docx`

---

## Tóm tắt nhanh

| Giai đoạn V2.0 | Hiện trạng | Khoảng cách |
|---|---|---|
| Phase 1 – Canonical Data Model | Có nhưng thiếu version/validator | Trung bình |
| Phase 2 – Rule & Knowledge Base | Hard-code trong data/ | Lớn |
| Phase 3 – Pattern Engine | Có V1.5, thiếu completeness/confidence | Nhỏ–Trung bình |
| Phase 4 – Palace Analysis Engine | Chưa có — logic nằm trong prompt | Lớn |
| Phase 5 – Strength/Conflict/Activation | Cơ bản, chưa tách engine | Lớn |
| Phase 6 – Score Engine | Chỉ có Tài lộc/Thách thức (2 chiều) | Lớn |
| Phase 7 – Toàn bộ lá số | Có offline + AI prompt | Trung bình |
| Phase 8 – Đại Vận | Thiếu drill-down 10 năm, peak/caution years | Trung bình |
| Phase 9 – Tiểu Vận | Cơ bản đủ, thiếu consistency test | Nhỏ |
| Phase 10 – Nguyệt Vận | Thiếu weekly series | Nhỏ–Trung bình |
| Phase 11 – Nhật Vận | Có offline, thiếu heatmap JSON | Nhỏ |
| Phase 12 – Tài lộc | Thiếu Financial DNA (8 chiều) | Lớn |
| Phase 13 – Offline Interpretation Engine | Có nhưng không template hóa | Lớn |
| Phase 14 – OpenAI Interpretation | Free-text prompt, chưa Structured Output | Lớn |
| Phase 15 – Visualization & UI | Thiếu drill-down, heatmap, Financial DNA | Trung bình |
| Phase 16 – Testing & Release | Không có test nào | Rất lớn |

---

## Chi tiết từng giai đoạn

### Phase 1 – Canonical Data Model

**Đã có:**
- `types/index.ts`: `AstrologyResult`, `TuViChart`, `TuViHouse`, `StarEntry`, `DaiVan`, `TieuVan`
- Interface `StarEntry` có `brightness` (miếu/vượng/đắc/bình/hãm)

**Thiếu theo V2.0:**
- Không có `schema_version` trên `AstrologyResult`
- Không có `confidence` field trên output
- Không có validator phát hiện dữ liệu thiếu/mâu thuẫn
- `DaiVan` có `wealthScore: 1-10` (cũ) và `DaiVanScore` (mới) — hai representation song song, dễ nhầm
- Chưa tách `computed_data` (facts) khỏi `interpreted_data` (lời luận)
- Không có migration script khi schema thay đổi

**Việc cần làm:**
- Thêm `schemaVersion: string` vào `AstrologyResult`
- Viết `validators/chartValidator.ts` — kiểm tra đầu vào hợp lệ
- Hợp nhất `DaiVan.wealthScore` (cũ) với `DaiVanScore` (mới) → dùng 1 nguồn
- Tạo `canonical-chart.schema.json`

---

### Phase 2 – Rule & Knowledge Base

**Đã có:**
- `data/cachCuc.ts` — ~50+ cách cục với `name`, `stars`, `meaning`, `good`, `baseScore`, `category`
- `data/starInfo.ts` — thông tin sao theo cung
- `data/lasoLuanGiaiGuide.ts` — khung luận 12 cung

**Thiếu theo V2.0:**
- Không có `source`, `version`, `priority`, `scope` trên từng rule
- Không có `rule_id` để traceability
- `CACH_CUC` là array tĩnh, không phải rule loader có thể cập nhật
- Không có `required_conditions` tách biệt `optional_conditions`
- Không có seed data test fixtures
- Không có rule tests

**Việc cần làm:**
- Thiết kế `KnowledgeRule` interface với `rule_id`, `version`, `source`, `scope`, `priority`
- Wrap `cachCuc.ts` và `starInfo.ts` vào rule loader
- Tạo test fixtures cho ít nhất 3 lá số mẫu

---

### Phase 3 – Pattern Engine (Cách Cục)

**Đã có (V1.5 từ session hiện tại):**
- `cachCucEngine.ts`: `detectAllCachCuc()`, `scoreCachCuc()`, `groupByRank()`, `buildMetaPattern()`
- `buildCachCucContext()`: filter NGỦ/kích hoạt, gửi AI dữ liệu có chọn lọc
- Phân loại: chủ/phụ/hỗ trợ/phá theo score threshold

**Thiếu theo V2.0 (doc 01):**
- Không có `completeness` riêng (hiện chỉ có `score` tổng hợp)
- Không có `confidence` field
- Không có `required_stars` vs `optional_stars` trong cách cục data
- Output không theo JSON schema chuẩn:
  ```json
  // V2.0 yêu cầu:
  { "pattern_id", "completeness", "strength", "status", "evidence", "breakers", "rescuers", "domains", "confidence" }
  ```
- Không có `PatternDetectionService` (unit testable class)

**Việc cần làm:**
- Thêm `completeness: number` (0–100) tách khỏi `strength`
- Thêm `confidence: number` dựa trên data completeness
- Tách `required_stars` và `optional_stars` trong `CachCuc` type
- Tạo `PatternDetectionService` class
- Viết unit tests

---

### Phase 4 – Palace Analysis Engine

**Đã có:**
- Hàm `buildPalacePrompt()` trong `aiAnalysis.ts` — xây prompt cho 1 cung
- `detectCachCucInPalace()` dùng trong prompt

**Thiếu theo V2.0 (doc 02):**
- Không có `PalaceAnalysisService` độc lập
- Logic 12 tầng (vai trò, chính tinh, phụ tinh, bộ sao, cách cục, tam phương, Tứ Hóa, Phi Hóa, ngũ hành, Mệnh–Thân, biểu hiện, kích hoạt) chỉ tồn tại trong prompt text — không phải object có thể test
- Không có `PalaceFacts` object pre-computed trước khi sinh lời luận
- Không có per-palace config (trọng tâm luận khác nhau theo từng cung)
- Output contract:
  ```json
  // V2.0 yêu cầu:
  { "palace", "scope", "scores", "facts", "patterns", "relations", "strengths", "imbalances", "activation", "recommendations" }
  ```

**Việc cần làm:**
- Tạo `PalaceAnalysisService` với `analyzePalace(result, palaceName)` → `PalaceFacts`
- 12 palace config files (hoặc 1 config map)
- Output contract TypeScript type
- Unit tests

---

### Phase 5 – Strength, Conflict & Activation

**Đã có:**
- Độ sáng sao trong `scoreCachCuc()` (BRIGHT_PT)
- Tuần/Triệt dampen trong `daiVanScore.ts` và `tieuVanScore.ts`
- `checkActivation()` trong `cachCucEngine.ts`

**Thiếu theo V2.0:**
- Không có `StrengthEngine` độc lập (strength tính inline trong score functions)
- Không có `ConflictEngine` — xung đột cát/hung xử lý ad-hoc
- Không có `TemporalActivationEngine` — activation check trong cachCucEngine nhưng không tách riêng
- Không có `explanation traces` — không biết tại sao điểm cao/thấp
- Không phân biệt rõ trạng thái: tiềm ẩn / được hỗ trợ / kích hoạt / suy yếu / bị phá

**Việc cần làm:**
- Tạo `StrengthEngine` với trace output
- Tạo `ConflictEngine` resolve cát/hung conflicts
- Thêm `explanation: string[]` vào score results

---

### Phase 6 – Score Engine

**Đã có:**
- `daiVanScore.ts`: Tài lộc (0–100) + Thách thức (0–100) cho Đại Vận
- `tieuVanScore.ts`: Tài lộc + Thách thức cho Tiểu Vận + "Đại Vận lấn áp" rule
- `nguyetVanScore.ts`: Score cho Nguyệt Vận

**Thiếu theo V2.0 (doc 03):**
- Chỉ có 2 chiều (Tài lộc/Thách thức), thiếu: Career, Relationship, Health, Property, Opportunity, Volatility
- Không có `score_breakdown` (tại sao điểm này?)
- Không có `confidence` cho từng score
- Không có `formula_version` để version hóa công thức
- `wealthScore: 1-10` trong `DaiVan` type (cũ) không đồng nhất với 0–100 mới
- Không có "golden tests" để kiểm tra consistency

**Ma trận giải thích 2 điểm (doc 03):**
```
Tài lộc ≥70 + Thách thức <55  → "Thuận lợi rõ"
Tài lộc ≥70 + Thách thức ≥55  → "Cơ hội cao – áp lực cao"
Tài lộc <55 + Thách thức <55  → "Ổn định – ít đột phá"
Tài lộc <55 + Thách thức ≥55  → "Nhiều thách thức"
```
Hiện tại đang dùng `net = taiLoc - thachThuc * 0.5` → rating text, chưa dùng ma trận 2 chiều này.

**Việc cần làm:**
- Thêm 6 domain scores vào `DaiVanScore`, `TieuVanScore`, `TieuVanScore`
- Thêm `score_breakdown`, `confidence`, `formula_version`
- Cập nhật ma trận 2 chiều trong `ratingOf()`
- Viết golden tests

---

### Phase 7 – Toàn bộ lá số

**Đã có:**
- `offlineLuanGiai.ts`: `generateOfflineFullChart()` — rule-based text ~1500 từ
- `aiAnalysis.ts`: `fullChartSections()` — 7 phần AI (~10,000 từ)

**Thiếu theo V2.0 (doc 04):**
- Không có `NatalAnalysisService` độc lập
- OpenAI payload là free-text, không phải structured JSON
- Không có `response validator` — AI có thể hallucinate cách cục/sao
- Không check mâu thuẫn giữa tổng quan và luận từng cung

---

### Phase 8 – Đại Vận

**Đã có:**
- `DaiVanScreen`: biểu đồ tổng quan (cột đôi tất cả đại vận) + card từng vận
- Radar chart 12 trục (daiVanRadar.ts)
- Offline + AI tab trong mỗi card

**Thiếu theo V2.0 (doc 05, 03):**
- **THIẾU CHÍNH**: Drill-down biểu đồ 10 năm bên trong một Đại Vận (cột đôi Tài lộc/Thách thức cho từng năm trong vận đó)
- Không có peak years / caution years highlight
- Không có chiến lược đầu–giữa–cuối vận trong UI
- Dữ liệu 10 năm chưa được pull từ Tiểu Vận Engine (vi phạm nguyên tắc "không nội suy ngẫu nhiên")

---

### Phase 9 – Tiểu Vận

**Đã có:**
- `TieuVanScreen`: chọn đại vận → biểu đồ 10 năm → card từng năm
- `tieuVanScore.ts`: điểm đúng với "Đại Vận lấn áp" rule

**Thiếu theo V2.0 (doc 06):**
- Biểu đồ 10 năm trong `TieuVanScreen` EXISTS nhưng **không link với `DaiVanScreen`** → vi phạm consistency
- Không có `AnnualPeriodService`
- Không có consistency test: "điểm năm trong DaiVan detail phải bằng điểm trong TieuVan"

---

### Phase 10 – Nguyệt Vận

**Đã có:**
- `NguyetVanScreen`: phân tích từng tháng (offline + AI)
- `nguyetVanScore.ts`: điểm tháng

**Thiếu theo V2.0 (doc 07):**
- Không có weekly series (4 tuần trong tháng) — chỉ có offline text
- Không có `MonthlyPeriodService`
- Không có consistency test: "điểm tháng trong TieuVan detail phải bằng điểm trong NguyetVan"

---

### Phase 11 – Nhật Vận

**Đã có:**
- `nhatVan.ts`: tính điểm ngày + `generateNhatVanOffline()` offline text
- `DailyScreen`: xem ngày hôm nay

**Thiếu theo V2.0 (doc 08):**
- Không có calendar heatmap JSON
- Không có daily action cards JSON
- Không có `confidence` flag khi dữ liệu không đủ
- Không có `DailyPeriodService`

---

### Phase 12 – Tài Lộc

**Đã có:**
- `WealthChartScreen`: biểu đồ wealthScore/10 + bảng điểm
- `WealthChart/index.tsx`: bar chart theo ngũ hành màu

**Thiếu theo V2.0 (doc 09):**
- `wealthScore: 1-10` quá đơn giản, không phản ánh 8 chiều Financial DNA
- Financial DNA hoàn toàn chưa có:
  - earn (kiếm tiền), retain (giữ tiền), cashflow (dòng tiền)
  - invest (đầu tư), leverage (đòn bẩy), property (tích sản)
  - business (kinh doanh), risk (rủi ro)
- Không có biểu đồ timeline tài lộc theo vận
- Không có risk map
- Không có `WealthAnalysisService`

---

### Phase 13 – Offline Interpretation Engine

**Đã có:**
- `offlineLuanGiai.ts`: ~2,500+ dòng code sinh text rule-based
- Đủ nội dung cho toàn lá số, đại vận, tiểu vận, nguyệt vận, nhật vận

**Thiếu theo V2.0 (doc 10):**
- Logic sinh text là imperative code — không phải template hóa có điều kiện
- Không có `knowledge_id` / `rule_id` để traceability
- Không có deduplication logic
- Không có A/B wording support
- Không có `OfflineNarrativeEngine` class

---

### Phase 14 – OpenAI Interpretation

**Đã có:**
- `aiAnalysis.ts`: xây prompt text → gọi `requestAI()` → nhận text
- Hỗ trợ Anthropic Claude + OpenAI (qua Pollinations)

**Thiếu theo V2.0 (doc 10, 14):**
- **Quan trọng nhất**: AI nhận FREE-TEXT prompt, không phải facts-only JSON
- Không có JSON Schema / Structured Output enforcement
- Không có `response validator` — AI có thể trả sai format, hallucinate sao/cách cục
- Không có retry với giới hạn số lần
- Không có fallback mechanism rõ ràng (khi API lỗi → offline, nhưng chưa tự động)
- Không có `evidence_ids` bắt buộc trong response
- Prompt có thể vô tình yêu cầu AI "tự tính" facts (đang cải thiện dần)

---

### Phase 15 – Visualization & UI

**Đã có:**
- Biểu đồ Tài lộc/Thách thức toàn Đại Vận (DaiVanScreen)
- Biểu đồ 10 năm trong TieuVanScreen
- Radar chart 12 trục (DaiVanScreen)
- WealthChart bar chart

**Thiếu theo V2.0 (doc 03):**
- Drill-down 10 năm bên trong 1 Đại Vận card (hiện tại card chỉ có radar + text)
- Calendar heatmap ngày (Nhật Vận)
- Financial DNA radar (8 chiều)
- Weekly chart (Nguyệt Vận)
- Ma trận giải thích 2 điểm (Thuận lợi/Áp lực cao/Ổn định/Thách thức)

---

### Phase 16 – Testing & Release

**Đã có:**
- Không có

**Thiếu:**
- Unit tests (engine functions)
- Integration tests (end-to-end từ birth data → analysis)
- Golden chart tests (lá số mẫu với kết quả đã xác nhận)
- Consistency tests (điểm xuyên tầng)
- Regression tests

---

## Ưu tiên thực hiện (đề xuất)

Dựa trên tác động tới người dùng và phụ thuộc kỹ thuật:

| Ưu tiên | Giai đoạn | Lý do |
|---|---|---|
| 🔴 Cao nhất | Phase 14 (OpenAI) | AI đang hallucinate sao/cách cục — rủi ro chất lượng cao nhất |
| 🔴 Cao nhất | Phase 8 (Đại Vận drill-down) | Tính năng V2.0 quan trọng nhất chưa có trong UI |
| 🟠 Cao | Phase 3 (completeness/confidence) | Nền tảng cho tất cả engines sau |
| 🟠 Cao | Phase 6 (Score multi-domain) | Cần cho V2.0 radar và heatmap |
| 🟡 Trung bình | Phase 1 (Canonical Model) | Cần trước khi viết validators |
| 🟡 Trung bình | Phase 12 (Financial DNA) | Tính năng mới, không phá hỏng hiện tại |
| 🟢 Thấp hơn | Phase 2 (Rule KB) | Quan trọng dài hạn nhưng không block tính năng ngay |
| 🟢 Thấp hơn | Phase 16 (Testing) | Cần làm song song từng giai đoạn |
