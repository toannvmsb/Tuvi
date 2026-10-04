/**
 * Phía TỬ VI của "Nghiệm quá khứ": tái dùng engine `annualEvents` (Nam Phái, rule dạng dữ liệu) cho một
 * năm bất kỳ — KHÔNG viết bảng rule Tử Vi thứ hai. Chỉ làm ba việc: (1) gọi engine bỏ tầng tháng,
 * (2) gộp 85 sự kiện vào 5 mảng đời theo `areaMap`, (3) đổi bằng chứng của engine thành `PastSignal`
 * phân tầng gốc/nền/ngòi (NATAL→gốc, DA_HAN→nền, ANNUAL→ngòi).
 */
import type { AstrologyResult } from '../../types';
import { computeAnnualPrediction } from '../annualEvents/engine';
import { PALACE_CODE_TO_VN } from '../annualEvents/calendar';
import type { EvidenceItem, ScoredEvent, TimeSource } from '../annualEvents/types';
import { currentAgeOf } from '../ageUtil';
import { AREAS, EVENT_MIN_AGE, PAST_CONFIG, type AreaId } from './config';
import { areaOfEvent } from './areaMap';
import type { Layer, PastSignal } from './types';

const LAYER_OF: Record<TimeSource, Layer> = { NATAL: 'goc', DA_HAN: 'nen', ANNUAL: 'ngoi', MONTHLY: 'ngoi' };

export interface TuviAreaRaw {
  /** Điểm thô của mảng: trung bình có trọng số 3 sự kiện mạnh nhất + phần riêng của năm (CHƯA chuẩn hóa theo lá số). */
  raw: number;
  /** Cân bằng thuận/nghịch của các sự kiện trong mảng: −1 (toàn nghịch) .. +1 (toàn thuận). */
  balance: number;
  topEventId: string | null;
  signals: PastSignal[];
}

export interface TuviYearRaw {
  year: number;
  age: number;
  daiVanIndex: number | null;
  areas: Record<AreaId, TuviAreaRaw>;
}

function toSignal(ev: EvidenceItem, e: ScoredEvent, area: AreaId, supports: boolean): PastSignal {
  const where = PALACE_CODE_TO_VN[ev.palace] ?? ev.palace;
  return {
    ruleId: ev.ruleId,
    system: 'tuvi',
    area,
    layer: LAYER_OF[ev.source],
    supports,
    tone: ev.polarity === 'POSITIVE' ? 1 : ev.polarity === 'NEGATIVE' ? -1 : 0,
    weight: ev.contribution,
    where,
    param: { sao: ev.starName, maSao: ev.signalType, suKien: e.eventId, nguon: ev.source },
    label: `${ev.starName} tại cung ${where}`,
  };
}

export function tuviYearRaw(result: AstrologyResult, year: number): TuviYearRaw {
  const pred = computeAnnualPrediction(result, year, { skipMonthly: true });
  const age = currentAgeOf(result, new Date(year, 0, 1));
  const dv = result.daiVans.find(d => age >= d.startAge && age <= d.endAge);

  const byArea = {} as Record<AreaId, ScoredEvent[]>;
  for (const a of AREAS) byArea[a] = [];
  for (const e of pred.allEvents) {
    const a = areaOfEvent(e.eventId);
    if (!a || age < (EVENT_MIN_AGE[e.eventId] ?? 0)) continue;
    byArea[a].push(e);
  }

  const areas = {} as Record<AreaId, TuviAreaRaw>;
  for (const a of AREAS) {
    const evs = [...byArea[a]].sort((x, y) => y.strength - x.strength || x.eventId.localeCompare(y.eventId));
    const top = evs[0] ?? null;
    let pos = 0, neg = 0, tot = 0;
    for (const e of evs) {
      tot += e.strength;
      if (e.direction === 'POSITIVE') pos += e.strength;
      else if (e.direction === 'NEGATIVE') neg += e.strength;
    }

    const seen = new Set<string>();
    const signals: PastSignal[] = [];
    for (const e of evs.slice(0, PAST_CONFIG.tuviTopEvents)) {
      const push = (ev: EvidenceItem, supports: boolean) => {
        const k = `${ev.ruleId}|${ev.palace}|${ev.starName}|${ev.source}`;
        if (seen.has(k)) return;
        seen.add(k);
        signals.push(toSignal(ev, e, a, supports));
      };
      for (const ev of e.evidence) push(ev, true);
      for (const ev of e.counterEvidence) push(ev, false);
    }
    signals.sort((x, y) => Math.abs(y.weight) - Math.abs(x.weight) || x.ruleId.localeCompare(y.ruleId));

    // Phần riêng của NĂM (bằng chứng nguồn ANNUAL của các sự kiện mạnh nhất): điểm sự kiện có phần nền
    // (lá số + đại hạn) gần như không đổi qua các năm cùng đại hạn, nên cộng thêm phần này để các năm
    // khác nhau phân biệt được (không để nhiều năm hòa điểm).
    const annualPart = evs.slice(0, PAST_CONFIG.tuviTopEvents)
      .reduce((s, e) => s + e.evidence.filter(ev => ev.source === 'ANNUAL').reduce((x, ev) => x + ev.contribution, 0), 0);

    areas[a] = {
      // 60% top1 + 30% top2 + 10% top3, cộng 0.5 × phần riêng của năm (cap 30) — trọng số TẠM.
      raw: 0.6 * (evs[0]?.strength ?? 0) + 0.3 * (evs[1]?.strength ?? 0) + 0.1 * (evs[2]?.strength ?? 0)
        + Math.min(30, 0.5 * annualPart),
      balance: tot > 0 ? (pos - neg) / tot : 0,
      topEventId: top?.eventId ?? null,
      signals: signals.slice(0, PAST_CONFIG.tuviMaxSignalsPerArea),
    };
  }
  return { year, age, daiVanIndex: dv?.index ?? null, areas };
}
