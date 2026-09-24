/**
 * TUZI_Tieu_Han_Annual_Event_Focus_Engine_v1.md §6-16, §25-26 — TIỂU HẠN LÀM "EVENT FOCUS LAYER"
 * (§6: "Do not implement Tiểu Hạn as a flat score such as 8%") + Axis Convergence (§26), thay cho
 * bucket "tieuHan" phẳng 8% trước đây (chỉ so vị trí cung, không phân biệt sự kiện nào).
 *
 * Cung Tiểu Hạn TỰ THÂN đã tính đúng theo Nam Phái Tam Hợp sẵn có trong `core/daiVanEngine.ts`
 * (`tieuHanStartBranchIdx` + "Nam thuận, Nữ nghịch" — khớp CHÍNH XÁC §4 của tài liệu), lấy qua
 * `ctx.tieuHanBranch` — file này KHÔNG tính lại cung Tiểu Hạn, chỉ thêm lớp "ưu tiên sự kiện" +
 * "hội tụ trục" phía trên, đúng tinh thần §6 "must execute before EventDetector final scoring".
 *
 * DIỄN GIẢI so với spec gốc (đọc thấy chỗ nào chưa hợp lý thì sửa — theo đúng yêu cầu ban đầu):
 *  - §7 chỉ cho "Primary:" là domain-tag tiếng Anh MỊN hơn 10 nhóm sự kiện hiện có của app — quy
 *    đổi sang CATEGORY_VN gần nhất, xem chú thích trong tieuHanDomains.ts.
 *  - §12 Dignity modifier: dùng ĐÚNG độ sáng chính tinh BẢN MỆNH tại cung Tiểu Hạn (miếu/vượng/
 *    hãm) + có Tuần/Triệt hay không — không tính riêng "đắc" (không có dữ liệu phân biệt đắc vs
 *    vượng trong app hiện tại) — chỉ dùng như 1 lượng điều chỉnh NHỎ (±0.03) lên hệ số ưu tiên
 *    sự kiện chính (1.25), không tự thành 1 tầng riêng.
 *  - §13 Five-element modifier: KHÔNG làm — spec ghi rõ "optional" và "must never override
 *    stronger event evidence"; bỏ qua để tránh thêm 1 lớp số liệu suy diễn không chắc chắn.
 *  - §25 "Contradictory ×0.90": spec không cho quy tắc cụ thể. Diễn giải: sự kiện CÙNG nhóm với
 *    domain cung Tiểu Hạn (nên đáng ra được ưu tiên) nhưng NGƯỢC HƯỚNG với cấu trúc cung đó (sự
 *    kiện tiêu cực tại 1 cung đang sáng sủa, hoặc sự kiện tích cực tại 1 cung đang xấu/có Tuần
 *    Triệt) — chỉ áp khi ĐÃ có liên hệ domain, để không giảm điểm sự kiện hoàn toàn không liên quan.
 *  - §11 Tiểu Hạn Pattern Engine (sinh "ứng viên sự kiện" từ pattern): app này chấm điểm sẵn TOÀN
 *    BỘ 85 sự kiện đã định nghĩa (không sinh ứng viên động) — kiến trúc khác nhưng đạt cùng mục
 *    đích (không map 1 sao → 1 sự kiện, luôn cần tổ hợp nhiều tầng bằng chứng, §10) nên KHÔNG cần
 *    dựng thêm 1 tầng pattern-enum riêng.
 *  - §26 Axis Convergence thay THẲNG cho convergence theo "số họ bằng chứng" (ENGINE_SPEC v1) ở
 *    bước NHÂN ĐIỂM — dùng CẢ 2 multiplier cộng dồn (cap 1.6 × cap 1.40 = tối đa 2.24×) sẽ đẩy gần
 *    hết sự kiện lên kịch trần 100, làm mất hẳn khả năng phân biệt sự kiện nào đáng chú ý hơn —
 *    đúng nguyên nhân khiến "danh sách sự kiện chưa phù hợp". Số họ bằng chứng (`independentEvidenceFamilies`)
 *    vẫn giữ để xét major-event/very-high gate (khác vai trò: gate là "đủ điều kiện gọi là sự
 *    kiện lớn", không phải hệ số nhân điểm).
 */
import type { AstrologyResult, EarthlyBranch } from '../../types';
import type { EventDefinition, EvidenceFamily, EvidenceItem, Palace } from './types';
import { PALACE_CODE_TO_VN, palaceCodeAtBranch, sanFangOf } from './calendar';
import { PALACE_EVENT_BOOST, PALACE_PRIMARY_CATEGORIES } from './tieuHanDomains';
import type { AnnualSignalContext } from './signals';

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

export interface TieuHanFocus {
  branch: EarthlyBranch | null;
  palace: Palace | null;
  sanFangPalaces: Palace[];
  dignity: 'GOOD' | 'BAD' | 'NEUTRAL';
}

function dignityOfPalace(c: AstrologyResult['tuViChart'], palace: Palace | null): 'GOOD' | 'BAD' | 'NEUTRAL' {
  if (!palace) return 'NEUTRAL';
  const h = c.houses.find(x => x.palaceName === PALACE_CODE_TO_VN[palace]);
  if (!h) return 'NEUTRAL';
  if (h.tuanAt || h.trietAt || h.stars.some(s => s.type === 'chinh' && s.brightness === 'hãm')) return 'BAD';
  if (h.stars.some(s => s.type === 'chinh' && (s.brightness === 'miếu' || s.brightness === 'vượng'))) return 'GOOD';
  return 'NEUTRAL';
}

/** §4 (đã có sẵn) + §9 Tam Phương Tứ Chính — dựng "tiêu điểm" Tiểu Hạn năm xem cho 1 lá số. */
export function buildTieuHanFocus(result: AstrologyResult, tieuHanBranch: EarthlyBranch | null): TieuHanFocus {
  const c = result.tuViChart;
  if (!tieuHanBranch) return { branch: null, palace: null, sanFangPalaces: [], dignity: 'NEUTRAL' };
  const palace = palaceCodeAtBranch(c, tieuHanBranch);
  const { trine, opposition } = sanFangOf(tieuHanBranch);
  const sanFangPalaces = [...trine, opposition].map(b => palaceCodeAtBranch(c, b)).filter((p): p is Palace => !!p);
  return { branch: tieuHanBranch, palace, sanFangPalaces, dignity: dignityOfPalace(c, palace) };
}

export type TieuHanPriorTier = 'PRIMARY_EVENT' | 'PRIMARY_DOMAIN' | 'SECONDARY_EVENT' | 'SECONDARY_DOMAIN' | 'CONTRADICTORY' | 'UNRELATED';

/** §25 Event Prior Logic — hệ số ưu tiên theo TỪNG SỰ KIỆN cụ thể (không phải flat score theo cung). */
export function tieuHanEventPriorMultiplier(focus: TieuHanFocus, event: EventDefinition): { multiplier: number; tier: TieuHanPriorTier } {
  if (!focus.palace) return { multiplier: 1.0, tier: 'UNRELATED' };
  const primaryBoost = PALACE_EVENT_BOOST[focus.palace]?.includes(event.id);
  const primaryDomain = PALACE_PRIMARY_CATEGORIES[focus.palace]?.includes(event.category);

  if (primaryBoost) {
    let m = 1.25;
    if (focus.dignity === 'GOOD') m += 0.03;
    else if (focus.dignity === 'BAD') m -= 0.03;
    return { multiplier: Math.max(1.0, Math.min(1.30, m)), tier: 'PRIMARY_EVENT' };
  }
  const secondaryBoost = focus.sanFangPalaces.some(p => PALACE_EVENT_BOOST[p]?.includes(event.id));
  if (secondaryBoost) return { multiplier: 1.12, tier: 'SECONDARY_EVENT' };
  if (primaryDomain) return { multiplier: 1.12, tier: 'PRIMARY_DOMAIN' };
  const secondaryDomain = focus.sanFangPalaces.some(p => PALACE_PRIMARY_CATEGORIES[p]?.includes(event.category));
  if (secondaryDomain) return { multiplier: 1.05, tier: 'SECONDARY_DOMAIN' };

  const domainRelated = primaryDomain || secondaryDomain;
  if (domainRelated && event.intent === 'NEGATIVE' && focus.dignity === 'GOOD') return { multiplier: 0.90, tier: 'CONTRADICTORY' };
  if (domainRelated && event.intent === 'POSITIVE' && focus.dignity === 'BAD') return { multiplier: 0.90, tier: 'CONTRADICTORY' };
  return { multiplier: 1.0, tier: 'UNRELATED' };
}

export interface TieuHanAxisResult {
  eventPriorMultiplier: number;
  priorTier: TieuHanPriorTier;
  axisConvergenceMultiplier: number;
  convergenceLayerCount: number;
  luuNienDaHanScore: number;
  evidence: EvidenceItem[];
  families: EvidenceFamily[];
}

/**
 * §15 Lưu Niên Đại Hạn + §16 Lưu Thái Tuế + §26 Axis Convergence — cần accum/breakdown của PASS 1
 * (đã tính axis-specific: `daHanRaw` = accum.daHan CHƯA blend với daHanStructuralScore chung của
 * cả thập niên; `annualFourTransform`/`annualAxis`/`movingStars` lấy từ breakdown PASS 1).
 */
export function computeTieuHanAxisResult(
  event: EventDefinition, ctx: AnnualSignalContext, houses: AstrologyResult['tuViChart'],
  daHanRaw: number, annualFourTransform: number, annualAxis: number, movingStars: number,
): TieuHanAxisResult {
  const axisPalaces = new Set<Palace>([...event.axis.primary, ...event.axis.secondary]);
  const focus = ctx.tieuHanFocus;
  const { multiplier: eventPriorMultiplier, tier: priorTier } = tieuHanEventPriorMultiplier(focus, event);
  const tieuHanOnAxis = !!focus.palace && (axisPalaces.has(focus.palace) || focus.sanFangPalaces.some(p => axisPalaces.has(p)));

  const daHanPalace = ctx.daHanBranch ? palaceCodeAtBranch(houses, ctx.daHanBranch) : null;
  const daHanOnAxis = !!daHanPalace && axisPalaces.has(daHanPalace);
  const annualHitsDaHanPalace = !!daHanPalace && ctx.signals.some(s => s.source === 'ANNUAL' && s.palace === daHanPalace);
  const luuNienDaiHanActive = daHanOnAxis && annualHitsDaHanPalace;
  const luuNienDaHanScore = clamp(ctx.luuNienDaHanRelationScore + (luuNienDaiHanActive ? 25 : daHanOnAxis ? 10 : 0));

  const luuThaiTueActive = ctx.signals.some(s => s.source === 'ANNUAL' && s.signalType === 'THAI_TUE' && axisPalaces.has(s.palace));
  const daHanActive = daHanRaw > 0;
  const annualFourTransformActive = annualFourTransform > 0;
  const annualMovingStarsActive = movingStars > 0 || annualAxis > 0;

  let layers = 0;
  if (daHanActive) layers++;
  if (tieuHanOnAxis) layers++;
  if (luuNienDaiHanActive) layers++;
  if (luuThaiTueActive) layers++;
  if (annualFourTransformActive) layers++;
  if (annualMovingStarsActive) layers++;
  const axisConvergenceMultiplier = layers >= 4 ? 1.35 : layers === 3 ? 1.25 : layers === 2 ? 1.12 : 1.0;

  const evidence: EvidenceItem[] = [];
  const families: EvidenceFamily[] = [];
  if (priorTier !== 'UNRELATED' && focus.palace) {
    families.push('TIEU_HAN');
    evidence.push({
      ruleId: `TIEU_HAN_${priorTier}`,
      source: 'ANNUAL',
      palace: tieuHanOnAxis ? focus.palace : (focus.sanFangPalaces.find(p => axisPalaces.has(p)) ?? focus.palace),
      signalType: 'TIEU_HAN_FOCUS',
      starName: 'Tiểu Hạn',
      contribution: Math.round(Math.abs(eventPriorMultiplier - 1) * 100),
      evidenceFamily: 'TIEU_HAN',
      polarity: priorTier === 'CONTRADICTORY' ? 'NEUTRAL' : 'ACTIVATING',
    });
  }
  if (luuNienDaiHanActive) families.push('LUU_NIEN_DAI_HAN');
  if (luuThaiTueActive) families.push('TAI_SUI');

  return { eventPriorMultiplier, priorTier, axisConvergenceMultiplier, convergenceLayerCount: layers, luuNienDaHanScore, evidence, families };
}
