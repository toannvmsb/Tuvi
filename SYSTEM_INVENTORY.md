# SYSTEM INVENTORY — Tuzi v1.x (Hiện trạng trước V2.0)

> **Phase 0 – Khảo sát hệ thống hiện tại**  
> Ngày lập: 2026-07-19 | Không sửa code ở giai đoạn này.

---

## 1. Kiến trúc tổng quan hiện tại

React Native (Expo SDK 54) + TypeScript. Không có backend riêng — tính toán toàn bộ trên client. AI gọi qua Pollinations (OpenAI-compatible) hoặc Anthropic API với key lưu trong Supabase.

```
src/
├── types/index.ts          ← Tất cả interface chung
├── core/                   ← Engines tính toán
├── data/                   ← KB tĩnh (sao, cách cục, guide)
├── utils/aiAnalysis.ts     ← Xây prompt + gọi AI
├── screens/                ← 20 màn hình UI
└── components/             ← UI components
```

---

## 2. Danh sách module đã có

### 2.1 An sao & Tính lá số
| File | Chức năng | Trạng thái |
|---|---|---|
| `core/tuViEngine.ts` | An 12 chính tinh, phụ tinh, Tứ Hóa, vị trí 12 cung | Hoạt động |
| `core/starPlacer.ts` | An vị sao theo can/chi/cục | Hoạt động |
| `core/starBrightness.ts` | Độ sáng miếu/vượng/đắc/bình/hãm | Hoạt động |
| `core/lunarCalendar.ts` | Chuyển đổi dương/âm lịch | Hoạt động |
| `core/buildResult.ts` | Tổng hợp `AstrologyResult` | Hoạt động |
| `core/vongTruongSinh.ts` | Vòng Tràng Sinh 12 cung | Hoạt động |
| `core/vongLocTon.ts` | Vòng Lộc Tồn | Hoạt động |

### 2.2 Bát Tự
| File | Chức năng | Trạng thái |
|---|---|---|
| `core/batTuEngine.ts` | Tứ trụ, Thập Thần, Dụng/Kỵ thần | Hoạt động |
| `core/thapThan.ts` | Tính Thập Thần nâng cao, Hỷ Thần | Hoạt động |
| `core/phongThuyBatTu.ts` | Phân tích Phong Thủy từ Bát Tự | Hoạt động |

### 2.3 Đại Vận / Tiểu Vận / Nguyệt Vận / Nhật Vận
| File | Chức năng | Trạng thái |
|---|---|---|
| `core/daiVanEngine.ts` | Tính cung/chi từng Đại Vận | Hoạt động |
| `core/daiVanScore.ts` | Điểm Tài lộc/Thách thức Đại Vận (3 yếu tố: Thiên Thời/Địa Lợi/Nhân Hòa) | Hoạt động |
| `core/daiVanRadar.ts` | Radar chart 12 trục cho 1 Đại Vận | Hoạt động |
| `core/tieuVanScore.ts` | Điểm Tài lộc/Thách thức Tiểu Vận + quy tắc "Đại Vận lấn áp" | Hoạt động |
| `core/nguyetVanScore.ts` | Điểm Nguyệt Vận (12 tháng/năm) | Hoạt động |
| `core/nhatVan.ts` | Điểm Nhật Vận + luận giải offline | Hoạt động |
| `core/luuStars.ts` | An sao lưu niên (Lưu Thái Tuế, Lưu Tứ Hóa...) | Hoạt động |

### 2.4 Cách Cục
| File | Chức năng | Trạng thái |
|---|---|---|
| `data/cachCuc.ts` | Định nghĩa ~50+ cách cục (tên, sao, ý nghĩa, good/bad) | Hoạt động |
| `core/cachCucEngine.ts` | Nhận diện + chấm điểm + xếp hạng + meta pattern + context cho AI | Hoạt động (V1.5) |

**Lưu ý:** `cachCucEngine.ts` đã được cập nhật lên V1.5 trong session này — có filter NGỦ/kích hoạt, nhưng chưa có `completeness` và `confidence` riêng theo spec V2.0.

### 2.5 Phi Hóa Nam Phái
| File | Chức năng | Trạng thái |
|---|---|---|
| `core/phiHoa.ts` | Tính Phi Hóa, Lưu Tứ Hóa, tổng hợp | Hoạt động |

### 2.6 Offline Luận Giải
| File | Chức năng | Trạng thái |
|---|---|---|
| `core/offlineLuanGiai.ts` | Luận toàn lá số, Đại vận, Tiểu vận, Nguyệt vận offline (rule-based text) | Hoạt động |

### 2.7 AI Analysis
| File | Chức năng | Trạng thái |
|---|---|---|
| `utils/aiAnalysis.ts` | Xây text prompt + gọi AI cho tất cả màn hình | Hoạt động |

**Lưu ý:** Hiện dùng **free-text prompt**, không phải JSON schema / Structured Output.

### 2.8 Knowledge Base (Data tĩnh)
| File | Chức năng |
|---|---|
| `data/starInfo.ts` | Thông tin từng sao (basic + theo cung) |
| `data/starInfoByPalaceExt.ts` | Mở rộng starInfo theo cung |
| `data/lasoLuanGiaiGuide.ts` | Khung luận 12 cung + chính tinh core |
| `data/careerByStar.ts` | Gợi ý nghề nghiệp theo sao |
| `data/dayPickTasks.ts` | Task chọn ngày tốt |
| `data/starDefinitions.ts` | Định nghĩa sao |
| `data/starElements.ts` | Ngũ hành sao |
| `data/napAm.ts` | Nạp Âm |

### 2.9 Screens (UI)
| Màn hình | Chức năng |
|---|---|
| `TuViChartScreen` | Lá số 12 cung dạng grid |
| `BatTuScreen` | Bát Tự + Thập Thần |
| `AnalysisScreen` | Hub phân tích |
| `DaiVanScreen` | Biểu đồ tổng quan + card từng Đại Vận |
| `TieuVanScreen` | Chọn Đại Vận → biểu đồ 10 năm + card từng năm |
| `NguyetVanScreen` | Chọn năm → 12 tháng + phân tích từng tháng |
| `DailyScreen` | Nhật vận hàng ngày |
| `PalaceDetailScreen` | Luận 1 cung (AI) |
| `FullChartAIScreen` | Luận toàn lá số (offline + AI) |
| `WealthChartScreen` | Biểu đồ tài lộc (wealthScore/10) |

### 2.10 Data Structures hiện tại

```typescript
// types/index.ts
AstrologyResult {
  birthInfo: BirthInfo
  tuViChart: TuViChart    // 12 cung, lunarDate, cục số, Mệnh/Thân
  batTuChart: BatTuChart  // 4 trụ, Thập Thần
  daiVans: DaiVan[]       // index, startAge, endAge, stem, branch, wealthScore
  tieuVans: TieuVan[]     // age, year, stem, branch, daiVanIndex, yearStem, yearBranch
}

TuViHouse {
  branch, palaceName, isManh, isThan
  stars: StarEntry[]      // name, type, brightness
  can, element
  tuanAt, trietAt
  vongTruongSinh, daiVanStartAge, daiVanIndex, monthIndex
}

DaiVan {
  index, startAge, endAge, stem, branch, element
  wealthScore  // 1-10 (cũ, dùng trong WealthChart)
}
// DaiVanScore (từ daiVanScore.ts): taiLoc/thachThuc 0-100, rating, summary, thienThoi, diaLoi, nhanHoa
// TieuVanScore (từ tieuVanScore.ts): tương tự + year/age
```

---

## 3. Màn hình và tính năng hiện có

| Tính năng | Có | Chất lượng |
|---|---|---|
| An sao 12 cung | ✅ | Tốt |
| Bát Tự Tứ Trụ | ✅ | Tốt |
| Đại Vận — biểu đồ tổng quan | ✅ | Tốt (cột đôi Tài lộc/Thách thức) |
| Đại Vận — drill-down 10 năm | ❌ | Chưa có |
| Đại Vận — peak/caution years | ❌ | Chưa có |
| Tiểu Vận — biểu đồ 10 năm | ✅ | Có (TieuVanScreen) |
| Tiểu Vận — biểu đồ 12 tháng | ✅ | Có (NguyetVanScore) |
| Nguyệt Vận — 4 tuần | ❌ | Chưa có |
| Nhật Vận — calendar heatmap | ❌ | Chưa có (DailyScreen offline only) |
| Cách cục — nhận diện + điểm | ✅ | Có (V1.5) |
| Cách cục — completeness/confidence | ❌ | Chưa có |
| Phi Hóa Nam Phái | ✅ | Tốt |
| Luận offline — toàn lá số | ✅ | Có (2000+ dòng rule-based text) |
| Luận offline — Đại/Tiểu/Nguyệt vận | ✅ | Có |
| Luận AI — text prompt | ✅ | Có (Pollinations/OpenAI/Claude) |
| Luận AI — JSON schema / Structured Output | ❌ | Chưa có |
| Score đa chiều (Career/Health/Relationship) | ❌ | Chưa có (chỉ có Tài lộc/Thách thức) |
| Financial DNA | ❌ | Chưa có |
| Rule version hóa | ❌ | Không có |
| Unit / integration tests | ❌ | Không có |
| Consistency check (điểm xuyên tầng) | ❌ | Không có |

---

## 4. Tổng số file

- Source files (`.ts`, `.tsx`): **117**
- Core engines: **18**
- Data (KB tĩnh): **9**
- Screens: **20**
- Components: **20+**
