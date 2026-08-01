# MIGRATION RISK — V1.x → V2.0

> **Phase 0 – Khảo sát hệ thống hiện tại**  
> Ngày lập: 2026-07-19

---

## Tổng quan rủi ro

| Mức độ | Số lượng | Mô tả |
|---|---|---|
| 🔴 CAO | 4 | Có thể gây crash hoặc sai kết quả nghiêm trọng |
| 🟠 TRUNG BÌNH | 5 | Cần refactor cẩn thận, ảnh hưởng nhiều file |
| 🟡 THẤP | 4 | Ít ảnh hưởng, có thể làm song song |

---

## Rủi ro CAO

### R1 — Score Engine Rewrite làm vỡ biểu đồ hiện tại
**Mô tả:** `daiVanScore.ts` và `tieuVanScore.ts` là nguồn dữ liệu cho biểu đồ Tài lộc/Thách thức trong `DaiVanScreen` và `TieuVanScreen`. Nếu thay đổi công thức hoặc thêm domain scores, toàn bộ biểu đồ có thể cho kết quả khác.

**File bị ảnh hưởng:**
- `core/daiVanScore.ts` → `screens/DaiVanScreen.tsx`, `core/offlineLuanGiai.ts`, `utils/aiAnalysis.ts`
- `core/tieuVanScore.ts` → `screens/TieuVanScreen.tsx`, `screens/NguyetVanScreen.tsx`

**Rủi ro cụ thể:**
- Người dùng so sánh kết quả cũ/mới → mất tin tưởng nếu điểm thay đổi nhiều
- Chart data trong PDF export sẽ khác nhau trước/sau update

**Biện pháp giảm thiểu:**
- Giữ nguyên `taiLoc` / `thachThuc` (2 điểm hiện tại) — chỉ THÊM các domain score mới
- Gắn `formula_version: "2.0"` để phân biệt
- Test golden chart trước và sau

---

### R2 — `DaiVan.wealthScore` (cũ) vs `DaiVanScore.taiLoc` (mới) — hai nguồn song song
**Mô tả:** `DaiVan` interface có `wealthScore: 1-10` (dùng trong `WealthChart`). `DaiVanScore` (từ `scoreDaiVan()`) có `taiLoc: 0-100`. Hai giá trị này KHÔNG nhất quán. Hiện tại `WealthChart` dùng `wealthScore`, còn `DaiVanScreen` dùng `DaiVanScore`.

**File bị ảnh hưởng:**
- `types/index.ts` — `DaiVan.wealthScore`
- `components/WealthChart/index.tsx` — dùng `daiVan.wealthScore`
- `screens/WealthChartScreen.tsx`

**Rủi ro cụ thể:** Nếu thống nhất về một nguồn, `WealthChart` phải được rewrite để dùng `DaiVanScore.taiLoc / 10`.

**Biện pháp giảm thiểu:**
- Đơn giản: thêm `taiLoc: number` vào `DaiVan` interface, `WealthChart` dùng `taiLoc`
- Hoặc: migrate `WealthChart` sang dùng `scoreAllDaiVan(result)` thay vì `result.daiVans`

---

### R3 — Thay đổi `AstrologyResult` interface ảnh hưởng toàn bộ app
**Mô tả:** `AstrologyResult` được truyền qua navigation params tới 20+ màn hình. Nếu thêm fields vào `AstrologyResult` (như `schemaVersion`, `canonicalFacts`), tất cả screens cần được kiểm tra.

**File bị ảnh hưởng:** Tất cả `screens/*.tsx` và nhiều `core/*.ts`

**Rủi ro cụ thể:**
- Navigation param serialization có thể fail nếu object quá lớn
- TypeScript compile errors ở tất cả nơi dùng type

**Biện pháp giảm thiểu:**
- Chỉ THÊM optional fields (`schemaVersion?: string`) — không đổi/xóa field hiện tại
- Không nhúng pre-computed heavy data vào `AstrologyResult` — tính on-demand khi cần
- Dùng `useMemo` trong screens thay vì nhúng vào navigation params

---

### R4 — AI Prompt → JSON Schema: breaking change về output format
**Mô tả:** Hiện tại AI trả về Markdown text. Nếu chuyển sang Structured Output (JSON), toàn bộ `SimpleMarkdown` rendering sẽ không dùng được.

**File bị ảnh hưởng:**
- `utils/aiAnalysis.ts` — toàn bộ hàm `requestAI()`, `fullChartSections()`, `daiVanSections()`, v.v.
- Tất cả screens dùng `SimpleMarkdown` để render AI output
- `hooks/useStreamingAI.ts`

**Rủi ro cụ thể:**
- Migration từ text → JSON là thay đổi kiến trúc lớn
- Streaming response khó hơn với JSON schema
- Cần render engine mới cho JSON output

**Biện pháp giảm thiểu:**
- Giai đoạn trung gian: thêm `evidence_ids` validation mà không đổi toàn bộ sang JSON
- Chuyển sang JSON dần từng module (bắt đầu từ Nguyệt Vận nhỏ nhất)
- Giữ text fallback cho khi JSON parse fail

---

## Rủi ro TRUNG BÌNH

### R5 — `offlineLuanGiai.ts` — 2,500+ dòng code khó test/maintain
**Mô tả:** Logic sinh text offline là code imperative dài, nhiều if/else, khó thêm template system mà không break existing output.

**Biện pháp:** Không refactor toàn bộ một lần. Thêm `OfflineNarrativeEngine` như wrapper mới, chạy song song với code cũ.

---

### R6 — `cachCucEngine.ts` — thêm completeness/confidence
**Mô tả:** `DetectedCach` interface cần thêm `completeness`, `confidence`. Tất cả nơi dùng `DetectedCach` phải handle fields mới.

**File bị ảnh hưởng:** `cachCucEngine.ts`, `offlineLuanGiai.ts`, `aiAnalysis.ts`

**Biện pháp:** Thêm optional fields, set default nếu null.

---

### R7 — Drill-down 10 năm trong DaiVanScreen
**Mô tả:** Thêm biểu đồ 10 năm bên trong mỗi Đại Vận card yêu cầu gọi `scoreAllTieuVan()` và filter theo `daiVanIndex`. Performance: 10 đại vận × 10 năm = 100 `scoreTieuVan()` calls mỗi lần render.

**Biện pháp:** Tính lazy (chỉ khi open card), hoặc cache với `useMemo`.

---

### R8 — `wealthScore: 1-10` legacy field
**Mô tả:** Nếu xóa `DaiVan.wealthScore`, `WealthChartScreen` và `WealthChart` crash ngay.

**Biện pháp:** Giữ field, deprecate dần với `@deprecated` comment.

---

### R9 — Financial DNA — cần logic mới trên 6 cung
**Mô tả:** Financial DNA đọc Mệnh–Tài–Quan–Điền–Phúc–Di theo doc 09. Logic mới, không break gì cũ, nhưng cần implement chính xác 8 chiều.

**Biện pháp:** Tạo `WealthAnalysisService` mới độc lập, không can thiệp existing code.

---

## Rủi ro THẤP

### R10 — Thêm multi-domain scores — không break
Thêm `career`, `relationship`, `health`, `property` vào `DaiVanScore`/`TieuVanScore` là optional fields → không break.

### R11 — Palace Analysis Engine — code mới hoàn toàn
`PalaceAnalysisService` là module mới, không thay thế gì cũ → low risk.

### R12 — Rule Knowledge Base — data layer mới
Rule loader mới wrap existing data → không break nếu existing data vẫn là source of truth.

### R13 — Test setup — không ảnh hưởng production
Viết tests không ảnh hưởng production code. Cần setup Jest với Expo — có thể cần `jest-expo` configuration.

---

## Thứ tự an toàn để triển khai

Để giảm thiểu rủi ro, nên triển khai theo thứ tự sau:

```
1. Phase 1 (Canonical Model)     — thêm optional fields, không break
2. Phase 3 (Pattern Engine)      — thêm completeness/confidence optional
3. Phase 6 (Score Engine)        — thêm domain scores optional + cập nhật rating matrix
4. Phase 8 (DaiVan drill-down)   — tính năng mới, không phá hiện tại
5. Phase 9 (TieuVan consistency) — link TieuVan với DaiVan
6. Phase 10/11 (Nguyet/Nhat)     — thêm weekly/heatmap data
7. Phase 12 (Financial DNA)      — module mới độc lập
8. Phase 4/5 (Palace/Strength)   — engines mới, chạy song song
9. Phase 13 (Offline Engine)     — wrap existing code
10. Phase 14 (OpenAI JSON)       — thay đổi lớn nhất, làm cuối cùng
11. Phase 15 (UI update)         — render dữ liệu mới
12. Phase 16 (Testing)           — chạy song song từ đầu
```

---

## Checklist trước khi bắt đầu mỗi Phase

- [ ] Đọc spec doc tương ứng
- [ ] Khảo sát files bị ảnh hưởng
- [ ] Xác nhận không break existing functionality
- [ ] TypeScript compile check (`npx tsc --noEmit`)
- [ ] Báo cáo files đã thay đổi cho anh xác nhận
- [ ] Chờ xác nhận trước khi chuyển Phase tiếp theo
