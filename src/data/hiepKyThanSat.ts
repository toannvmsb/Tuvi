/**
 * HIỆP KỶ 1.2 — khởi lệ thần sát theo THÁNG TIẾT KHÍ, bảng sáu bậc đẳng đệ (132 ô), điều kiện Đức/chuyển quy tắc, Nguyệt phá gia trọng.
 * SINH TỰ ĐỘNG từ "Tuzi_Hiep_Ky_1_2" (bản bổ sung 07/10/2026 của anh Toàn): than_sat_khoi_le.json, sau_bac_dang_de_132_o.json,
 * dang_de_giai_cuu_va_chuyen_quy_tac.json, nguyet_pha_gia_trong.json. KHÔNG sửa tay — sửa nguồn rồi sinh lại.
 * Khóa chữ Hán giữ nguyên như nguồn (can/chi/tên thần); tên Việt xem core/hiepKy.ts.
 */
export interface HkMonthlyRule { id: string; vi: string; kind: string; values: Record<string, string>; aliases: string[] }
export interface HkRemedyRow { trigger: string; months: string[]; qualifying: string[]; delegate: string | null; residualJi: string[] }

export const HK_MONTH_ORDER = ["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"];

export const HK_MONTHLY: HkMonthlyRule[] = [
  { id: "劫煞", vi: "Kiếp Sát", kind: "day_branch", values: {"寅": "亥", "卯": "申", "辰": "巳", "巳": "寅", "午": "亥", "未": "申", "申": "巳", "酉": "寅", "戌": "亥", "亥": "申", "子": "巳", "丑": "寅"}, aliases: ["刼煞"] },
  { id: "災煞", vi: "Tai Sát", kind: "day_branch", values: {"寅": "子", "卯": "酉", "辰": "午", "巳": "卯", "午": "子", "未": "酉", "申": "午", "酉": "卯", "戌": "子", "亥": "酉", "子": "午", "丑": "卯"}, aliases: ["天火"] },
  { id: "月煞", vi: "Nguyệt Sát", kind: "day_branch", values: {"寅": "丑", "卯": "戌", "辰": "未", "巳": "辰", "午": "丑", "未": "戌", "申": "未", "酉": "辰", "戌": "丑", "亥": "戌", "子": "未", "丑": "辰"}, aliases: ["月虛"] },
  { id: "月刑", vi: "Nguyệt Hình", kind: "day_branch", values: {"寅": "巳", "卯": "子", "辰": "辰", "巳": "申", "午": "午", "未": "丑", "申": "寅", "酉": "酉", "戌": "未", "亥": "亥", "子": "卯", "丑": "戌"}, aliases: [] },
  { id: "月害", vi: "Nguyệt Hại", kind: "day_branch", values: {"寅": "巳", "卯": "辰", "辰": "卯", "巳": "寅", "午": "丑", "未": "子", "申": "亥", "酉": "戌", "戌": "酉", "亥": "申", "子": "未", "丑": "午"}, aliases: [] },
  { id: "月厭", vi: "Nguyệt Yếm", kind: "day_branch", values: {"寅": "戌", "卯": "酉", "辰": "申", "巳": "未", "午": "午", "未": "巳", "申": "辰", "酉": "卯", "戌": "寅", "亥": "丑", "子": "子", "丑": "亥"}, aliases: ["地火"] },
  { id: "厭對", vi: "Yếm Đối", kind: "day_branch", values: {"寅": "辰", "卯": "卯", "辰": "寅", "巳": "丑", "午": "子", "未": "亥", "申": "戌", "酉": "酉", "戌": "申", "亥": "未", "子": "午", "丑": "巳"}, aliases: ["招搖", "六儀"] },
  { id: "大時", vi: "Đại Thời", kind: "day_branch", values: {"寅": "卯", "卯": "子", "辰": "酉", "巳": "午", "午": "卯", "未": "子", "申": "酉", "酉": "午", "戌": "卯", "亥": "子", "子": "酉", "丑": "午"}, aliases: ["大敗", "咸池"] },
  { id: "天吏", vi: "Thiên Lại", kind: "day_branch", values: {"寅": "酉", "卯": "午", "辰": "卯", "巳": "子", "午": "酉", "未": "午", "申": "卯", "酉": "子", "戌": "酉", "亥": "午", "子": "卯", "丑": "子"}, aliases: ["致死"] },
  { id: "遊禍", vi: "Du Họa", kind: "day_branch", values: {"寅": "巳", "卯": "寅", "辰": "亥", "巳": "申", "午": "巳", "未": "寅", "申": "亥", "酉": "申", "戌": "巳", "亥": "寅", "子": "亥", "丑": "申"}, aliases: [] },
  { id: "土符", vi: "Thổ Phù", kind: "day_branch", values: {"寅": "丑", "卯": "巳", "辰": "酉", "巳": "寅", "午": "午", "未": "戌", "申": "卯", "酉": "未", "戌": "亥", "亥": "辰", "子": "申", "丑": "子"}, aliases: [] },
  { id: "天賊", vi: "Thiên Tặc", kind: "day_branch", values: {"寅": "丑", "卯": "子", "辰": "亥", "巳": "戌", "午": "酉", "未": "申", "申": "未", "酉": "午", "戌": "巳", "亥": "辰", "子": "卯", "丑": "寅"}, aliases: [] },
  { id: "歸忌", vi: "Quy Kỵ", kind: "day_branch", values: {"寅": "丑", "卯": "寅", "辰": "子", "巳": "丑", "午": "寅", "未": "子", "申": "丑", "酉": "寅", "戌": "子", "亥": "丑", "子": "寅", "丑": "子"}, aliases: [] },
  { id: "往亡", vi: "Vãng Vong", kind: "day_branch", values: {"寅": "寅", "卯": "巳", "辰": "申", "巳": "亥", "午": "卯", "未": "午", "申": "酉", "酉": "子", "戌": "辰", "亥": "未", "子": "戌", "丑": "丑"}, aliases: [] },
  { id: "九空", vi: "Cửu Không", kind: "day_branch", values: {"寅": "辰", "卯": "丑", "辰": "戌", "巳": "未", "午": "辰", "未": "丑", "申": "戌", "酉": "未", "戌": "辰", "亥": "丑", "子": "戌", "丑": "未"}, aliases: [] },
  { id: "九坎", vi: "Cửu Khảm", kind: "day_branch", values: {"寅": "辰", "卯": "丑", "辰": "戌", "巳": "未", "午": "卯", "未": "子", "申": "酉", "酉": "午", "戌": "寅", "亥": "亥", "子": "申", "丑": "巳"}, aliases: ["九焦"] },
  { id: "月建", vi: "Nguyệt Kiến", kind: "day_branch", values: {"寅": "寅", "卯": "卯", "辰": "辰", "巳": "巳", "午": "午", "未": "未", "申": "申", "酉": "酉", "戌": "戌", "亥": "亥", "子": "子", "丑": "丑"}, aliases: ["土府", "兵福"] },
  { id: "月破", vi: "Nguyệt Phá", kind: "day_branch", values: {"寅": "申", "卯": "酉", "辰": "戌", "巳": "亥", "午": "子", "未": "丑", "申": "寅", "酉": "卯", "戌": "辰", "亥": "巳", "子": "午", "丑": "未"}, aliases: ["大耗"] },
  { id: "吉期", vi: "Cát Kỳ", kind: "day_branch", values: {"寅": "卯", "卯": "辰", "辰": "巳", "巳": "午", "午": "未", "未": "申", "申": "酉", "酉": "戌", "戌": "亥", "亥": "子", "子": "丑", "丑": "寅"}, aliases: ["兵寶"] },
  { id: "福德", vi: "Phúc Đức", kind: "day_branch", values: {"寅": "辰", "卯": "巳", "辰": "午", "巳": "未", "午": "申", "未": "酉", "申": "戌", "酉": "亥", "戌": "子", "亥": "丑", "子": "寅", "丑": "卯"}, aliases: ["天巫"] },
  { id: "死神", vi: "Tử Thần", kind: "day_branch", values: {"寅": "巳", "卯": "午", "辰": "未", "巳": "申", "午": "酉", "未": "戌", "申": "亥", "酉": "子", "戌": "丑", "亥": "寅", "子": "卯", "丑": "辰"}, aliases: [] },
  { id: "死氣", vi: "Tử Khí", kind: "day_branch", values: {"寅": "午", "卯": "未", "辰": "申", "巳": "酉", "午": "戌", "未": "亥", "申": "子", "酉": "丑", "戌": "寅", "亥": "卯", "子": "辰", "丑": "巳"}, aliases: ["時陰"] },
  { id: "小耗", vi: "Tiểu Hao", kind: "day_branch", values: {"寅": "未", "卯": "申", "辰": "酉", "巳": "戌", "午": "亥", "未": "子", "申": "丑", "酉": "寅", "戌": "卯", "亥": "辰", "子": "巳", "丑": "午"}, aliases: [] },
  { id: "天喜", vi: "Thiên Hỷ", kind: "day_branch", values: {"寅": "戌", "卯": "亥", "辰": "子", "巳": "丑", "午": "寅", "未": "卯", "申": "辰", "酉": "巳", "戌": "午", "亥": "未", "子": "申", "丑": "酉"}, aliases: ["天醫"] },
  { id: "生氣", vi: "Sinh Khí", kind: "day_branch", values: {"寅": "子", "卯": "丑", "辰": "寅", "巳": "卯", "午": "辰", "未": "巳", "申": "午", "酉": "未", "戌": "申", "亥": "酉", "子": "戌", "丑": "亥"}, aliases: ["時陽"] },
  { id: "血支", vi: "Huyết Chi", kind: "day_branch", values: {"寅": "丑", "卯": "寅", "辰": "卯", "巳": "辰", "午": "巳", "未": "午", "申": "未", "酉": "申", "戌": "酉", "亥": "戌", "子": "亥", "丑": "子"}, aliases: [] },
  { id: "六合", vi: "Lục Hợp", kind: "day_branch", values: {"寅": "亥", "卯": "戌", "辰": "酉", "巳": "申", "午": "未", "未": "午", "申": "巳", "酉": "辰", "戌": "卯", "亥": "寅", "子": "丑", "丑": "子"}, aliases: [] },
  { id: "天倉", vi: "Thiên Thương", kind: "day_branch", values: {"寅": "寅", "卯": "丑", "辰": "子", "巳": "亥", "午": "戌", "未": "酉", "申": "申", "酉": "未", "戌": "午", "亥": "巳", "子": "辰", "丑": "卯"}, aliases: [] },
  { id: "五富", vi: "Ngũ Phú", kind: "day_branch", values: {"寅": "亥", "卯": "寅", "辰": "巳", "巳": "申", "午": "亥", "未": "寅", "申": "巳", "酉": "申", "戌": "亥", "亥": "寅", "子": "巳", "丑": "申"}, aliases: [] },
  { id: "月德", vi: "Nguyệt Đức", kind: "day_stem", values: {"寅": "丙", "卯": "甲", "辰": "壬", "巳": "庚", "午": "丙", "未": "甲", "申": "壬", "酉": "庚", "戌": "丙", "亥": "甲", "子": "壬", "丑": "庚"}, aliases: [] },
  { id: "月德合", vi: "Nguyệt Đức Hợp", kind: "day_stem", values: {"寅": "辛", "卯": "己", "辰": "丁", "巳": "乙", "午": "辛", "未": "己", "申": "丁", "酉": "乙", "戌": "辛", "亥": "己", "子": "丁", "丑": "乙"}, aliases: [] },
  { id: "天德", vi: "Thiên Đức", kind: "stem_or_direction", values: {"寅": "丁", "卯": "direction:坤", "辰": "壬", "巳": "辛", "午": "direction:乾", "未": "甲", "申": "癸", "酉": "direction:艮", "戌": "丙", "亥": "乙", "子": "direction:巽", "丑": "庚"}, aliases: [] },
  { id: "天德合", vi: "Thiên Đức Hợp", kind: "day_stem_optional", values: {"寅": "壬", "卯": "none", "辰": "丁", "巳": "丙", "午": "none", "未": "己", "申": "戊", "酉": "none", "戌": "辛", "亥": "庚", "子": "none", "丑": "乙"}, aliases: [] },
  { id: "天願", vi: "Thiên Nguyện", kind: "day_pillar", values: {"寅": "乙亥", "卯": "甲戌", "辰": "乙酉", "巳": "丙申", "午": "丁未", "未": "戊午", "申": "己巳", "酉": "庚辰", "戌": "辛卯", "亥": "壬寅", "子": "癸丑", "丑": "甲子"}, aliases: [] },
  { id: "地囊", vi: "Địa Nang", kind: "day_pillar_set", values: {"寅": "庚子/庚午", "卯": "乙未/癸丑", "辰": "甲子/壬午", "巳": "己卯/己酉", "午": "壬戌/甲辰", "未": "丙辰/丙戌", "申": "丁巳/丁亥", "酉": "丙寅/丙申", "戌": "辛丑/辛未", "亥": "戊寅/戊申", "子": "辛卯/辛酉", "丑": "癸酉/乙卯"}, aliases: [] },
];

/** Quy tắc theo MÙA (xuân/hạ/thu/đông theo tháng tiết khí). */
export const HK_SEASONAL: Record<string, Record<string, string>> = {"王日": {"spring": "寅", "summer": "巳", "autumn": "申", "winter": "亥"}, "官日": {"spring": "卯", "summer": "午", "autumn": "酉", "winter": "子"}, "相日": {"spring": "巳", "summer": "申", "autumn": "亥", "winter": "寅"}, "民日": {"spring": "午", "summer": "酉", "autumn": "子", "winter": "卯"}, "守日": {"spring": "辰", "summer": "未", "autumn": "戌", "winter": "丑"}, "時德": {"spring": "午", "summer": "辰", "autumn": "子", "winter": "寅"}, "四相": {"spring": "丙丁", "summer": "戊己", "autumn": "壬癸", "winter": "甲乙"}, "天赦": {"spring": "戊寅", "summer": "甲午", "autumn": "戊申", "winter": "甲子"}, "四廢": {"spring": "庚申/辛酉", "summer": "壬子/癸亥", "autumn": "甲寅/乙卯", "winter": "丙午/丁巳"}, "四忌": {"spring": "甲子", "summer": "丙子", "autumn": "庚子", "winter": "壬子"}, "四窮": {"spring": "乙亥", "summer": "丁亥", "autumn": "辛亥", "winter": "癸亥"}, "四耗": {"spring": "壬子", "summer": "乙卯", "autumn": "戊午", "winter": "辛酉"}, "四擊": {"spring": "戌", "summer": "丑", "autumn": "辰", "winter": "未"}};

/** Bậc 0..5 (上 上次 中 中次 下 下下) của 11 đối tượng × 12 tháng. Số bậc là MÃ THỨ TỰ, không phải điểm. */
export const HK_GRADE_CELLS: Record<string, Record<string, number>> = {"平日": {"亥": 0, "巳": 1, "申": 2, "寅": 3, "卯": 3, "午": 3, "酉": 3, "辰": 4, "戌": 4, "丑": 4, "未": 4, "子": 4}, "收日": {"寅": 0, "申": 0, "巳": 2, "亥": 2, "辰": 2, "未": 2, "子": 3, "午": 3, "酉": 3, "丑": 3, "戌": 3, "卯": 4}, "閉日": {"子": 3, "卯": 3, "午": 3, "酉": 3, "辰": 3, "戌": 3, "丑": 3, "未": 3, "寅": 4, "巳": 4, "申": 4, "亥": 4}, "劫煞": {"寅": 0, "申": 0, "辰": 1, "戌": 1, "丑": 1, "未": 1, "巳": 2, "亥": 2, "子": 3, "卯": 3, "午": 3, "酉": 3}, "災煞": {"寅": 1, "申": 1, "巳": 1, "亥": 1, "辰": 2, "戌": 2, "丑": 2, "未": 2, "子": 4, "午": 4, "卯": 5, "酉": 5}, "月煞": {"卯": 1, "酉": 1, "子": 3, "午": 3, "寅": 4, "申": 4, "巳": 4, "亥": 4, "辰": 4, "戌": 4, "丑": 4, "未": 4}, "月刑": {"巳": 1, "寅": 3, "辰": 3, "酉": 3, "亥": 3, "丑": 3, "戌": 3, "子": 4, "卯": 4, "未": 4, "申": 4, "午": 4}, "月害": {"卯": 2, "酉": 2, "丑": 2, "未": 2, "巳": 2, "亥": 2, "申": 2, "子": 3, "午": 3, "辰": 3, "戌": 3, "寅": 3}, "月厭": {"寅": 2, "申": 2, "丑": 2, "未": 2, "辰": 3, "戌": 3, "巳": 3, "亥": 3, "子": 4, "午": 4, "卯": 5, "酉": 5}, "大時": {"寅": 0, "巳": 0, "申": 0, "亥": 0, "辰": 0, "戌": 0, "丑": 2, "未": 2, "子": 3, "午": 3, "酉": 3, "卯": 4}, "天吏": {"寅": 2, "巳": 2, "申": 2, "亥": 2, "辰": 3, "戌": 3, "丑": 3, "未": 3, "卯": 3, "午": 3, "酉": 3, "子": 4}};

/** [không gặp Đức đủ điều kiện, gặp Đức đủ điều kiện] theo bậc 0..5. */
export const HK_GRADE_MODES: [string, string][] = [["yi", "yi"], ["balance", "yi"], ["ji", "yi"], ["ji", "balance"], ["all_ji", "ji"], ["all_ji", "all_ji"]];

export const HK_REMEDIES: HkRemedyRow[] = [
  { trigger: "平日", months: ["亥"], qualifying: [], delegate: null, residualJi: ["安撫邊境", "選將訓兵", "出師", "求醫療病"] },
  { trigger: "平日", months: ["申"], qualifying: ["天德", "月德合"], delegate: null, residualJi: ["安撫邊境", "選將訓兵", "出師", "求醫療病"] },
  { trigger: "平日", months: ["寅", "巳", "子"], qualifying: [], delegate: "月刑", residualJi: [] },
  { trigger: "平日", months: ["辰", "戌", "丑", "未"], qualifying: [], delegate: "月煞", residualJi: [] },
  { trigger: "平日", months: ["卯", "酉"], qualifying: ["月德"], delegate: null, residualJi: [] },
  { trigger: "平日", months: ["午"], qualifying: ["月德合"], delegate: null, residualJi: [] },
  { trigger: "收日", months: ["寅", "申", "巳", "亥"], qualifying: [], delegate: "劫煞", residualJi: [] },
  { trigger: "收日", months: ["子", "午"], qualifying: ["月德合"], delegate: null, residualJi: [] },
  { trigger: "收日", months: ["酉"], qualifying: ["月德"], delegate: null, residualJi: [] },
  { trigger: "收日", months: ["卯", "丑", "戌"], qualifying: [], delegate: "月刑", residualJi: [] },
  { trigger: "收日", months: ["辰", "未"], qualifying: ["天德", "月德", "天德合", "月德合"], delegate: null, residualJi: ["安撫邊境", "選將訓兵", "出師", "求醫療病"] },
  { trigger: "閉日", months: ["子", "卯", "午", "酉", "辰", "戌", "丑", "未"], qualifying: ["天德", "月德", "天德合", "月德合", "天赦", "天願"], delegate: null, residualJi: [] },
  { trigger: "閉日", months: ["寅", "巳", "申", "亥"], qualifying: [], delegate: "月煞", residualJi: [] },
  { trigger: "劫煞", months: ["寅", "申"], qualifying: [], delegate: null, residualJi: ["安撫邊境", "選將訓兵", "出師", "求醫療病"] },
  { trigger: "劫煞", months: ["巳", "亥"], qualifying: ["月德", "天德合"], delegate: null, residualJi: ["安撫邊境", "選將訓兵", "出師", "求醫療病"] },
  { trigger: "劫煞", months: ["辰", "戌", "丑", "未"], qualifying: ["天德", "月德", "天德合", "月德合"], delegate: null, residualJi: [] },
  { trigger: "劫煞", months: ["子", "卯", "午", "酉"], qualifying: ["月德", "月德合"], delegate: null, residualJi: [] },
  { trigger: "災煞", months: ["寅", "申", "巳", "亥", "辰", "戌", "丑", "未"], qualifying: ["天德", "月德", "天德合", "月德合"], delegate: null, residualJi: ["安撫邊境", "選將訓兵", "出師", "求醫療病"] },
  { trigger: "災煞", months: ["子", "卯", "午", "酉"], qualifying: [], delegate: "月破", residualJi: [] },
  { trigger: "月煞", months: ["卯", "酉"], qualifying: ["月德", "天願"], delegate: null, residualJi: [] },
  { trigger: "月煞", months: ["子", "午"], qualifying: ["月德合"], delegate: null, residualJi: [] },
  { trigger: "月煞", months: ["寅", "申", "巳", "亥", "辰", "戌", "丑", "未"], qualifying: ["天德", "月德", "天德合", "月德合"], delegate: null, residualJi: [] },
  { trigger: "月刑", months: ["巳"], qualifying: ["月德", "天德合", "天願"], delegate: null, residualJi: ["安撫邊境", "選將訓兵", "出師", "求醫療病"] },
  { trigger: "月刑", months: ["寅", "辰", "酉", "亥", "丑", "戌", "子", "卯", "未", "申"], qualifying: ["天德", "月德", "天德合", "月德合"], delegate: null, residualJi: [] },
  { trigger: "月刑", months: ["午"], qualifying: [], delegate: "月厭", residualJi: [] },
  { trigger: "月害", months: ["卯", "酉", "丑", "未"], qualifying: ["天德", "月德"], delegate: null, residualJi: ["安撫邊境", "選將訓兵", "出師", "求醫療病"] },
  { trigger: "月害", months: ["辰", "戌"], qualifying: ["天德合", "月德合"], delegate: null, residualJi: [] },
  { trigger: "月害", months: ["子", "午"], qualifying: [], delegate: "月煞", residualJi: [] },
  { trigger: "月害", months: ["巳", "亥"], qualifying: [], delegate: "劫煞", residualJi: [] },
  { trigger: "月害", months: ["寅"], qualifying: [], delegate: "月刑", residualJi: [] },
  { trigger: "月害", months: ["申"], qualifying: [], delegate: "平日", residualJi: [] },
  { trigger: "月厭", months: ["寅", "申", "丑", "未"], qualifying: ["月德", "天德合", "月德合"], delegate: null, residualJi: ["行幸遣使", "安撫邊境", "選將訓兵", "出師", "上官赴任", "臨政親民", "結婚姻", "納采問名", "嫁娶", "求醫療病", "般移", "遠迴", "栽種"] },
  { trigger: "月厭", months: ["辰", "戌", "巳", "亥"], qualifying: ["天德", "月德", "月德合"], delegate: null, residualJi: [] },
  { trigger: "月厭", months: ["子", "午"], qualifying: ["天赦"], delegate: null, residualJi: [] },
  { trigger: "月厭", months: ["卯", "酉"], qualifying: [], delegate: null, residualJi: [] },
  { trigger: "大時", months: ["寅", "巳", "申", "亥", "辰", "戌"], qualifying: [], delegate: null, residualJi: ["安撫邊境", "選將訓兵", "出師"] },
  { trigger: "大時", months: ["丑", "未"], qualifying: ["天德", "月德"], delegate: null, residualJi: ["安撫邊境", "選將訓兵", "出師"] },
  { trigger: "大時", months: ["子", "午"], qualifying: ["月德合"], delegate: null, residualJi: [] },
  { trigger: "大時", months: ["酉"], qualifying: ["月德"], delegate: null, residualJi: [] },
  { trigger: "大時", months: ["卯"], qualifying: [], delegate: "月刑", residualJi: [] },
  { trigger: "天吏", months: ["寅", "巳", "申", "亥"], qualifying: ["天德", "月德", "天德合", "月德合"], delegate: null, residualJi: ["安撫邊境", "選將訓兵", "出師", "求醫療病"] },
  { trigger: "天吏", months: ["辰", "戌", "丑", "未"], qualifying: ["天德", "月德", "天德合", "月德合", "天赦", "天願"], delegate: null, residualJi: [] },
  { trigger: "天吏", months: ["卯", "午", "酉"], qualifying: [], delegate: "平日", residualJi: [] },
  { trigger: "天吏", months: ["子"], qualifying: [], delegate: "月刑", residualJi: [] },
];

export const HK_BREAK = {"baseNotJi": ["祭祀", "覃恩肆赦", "施恩惠恤孤惸", "行惠愛雪寃枉緩刑獄", "入學", "解除", "沐浴", "求醫療病", "掃舍宇", "平治道塗", "破屋壞垣", "捕捉", "畋獵", "取魚"], "aggravatedMonths": ["子", "午", "未", "申"], "aggravatedQualifying": ["月德", "天德合", "月德合"], "aggravatedExtraJi": ["解除", "求醫療病", "破屋壞垣"], "alwaysAllJi": [{"months": ["卯", "酉"], "reason": "月破+災煞+月厭"}, {"month": "巳", "day": "癸亥", "reason": "陰陽交破"}, {"month": "亥", "day": "丁巳", "reason": "陰陽交破"}, {"month": "未", "day": "癸丑", "reason": "陽破陰衝"}, {"month": "丑", "day": "丁未", "reason": "陽破陰衝"}, {"also_active": "四廢", "reason": "四廢+月破"}]};
