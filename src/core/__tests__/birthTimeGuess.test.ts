import type { BirthInfo } from '../../types';
import { buildResult } from '../buildResult';
import { computeAnnualPrediction } from '../annualEvents/engine';
import { currentAgeOf } from '../ageUtil';
import {
  BIRTH_HOURS, LIFE_EVENT_KINDS, guessBirthHourSync, midRank, priorFromDayParts, prepareEvents, predictLook, lookLogit,
  type UserLifeEvent, type BuildKind, type FaceKind,
} from '../birthTime';

const base = { name: 'T', gender: 'nam', birthplace: '', calendarType: 'solar', year: 1985, month: 6, day: 15, language: 'vi' } as Omit<BirthInfo, 'hour' | 'minute'>;
const NOW = new Date(2026, 10, 1);

describe('Suy đoán giờ sinh — hàm phụ', () => {
  test('midRank: phân vị giữa, hòa điểm → 0,5', () => {
    expect(midRank(5, [1, 2, 3, 4, 5])).toBeCloseTo(0.9);
    expect(midRank(0, [3, 3, 3])).toBe(0);
    expect(midRank(3, [3, 3, 3])).toBe(0.5);
    expect(midRank(1, [])).toBe(0.5);
  });
  test('prior: không nhớ → đều; nhớ buổi → dồn vào 2 canh giờ của buổi, tổng = 1', () => {
    const flat = priorFromDayParts([]);
    expect(flat.every(p => Math.abs(p - 1 / 12) < 1e-9)).toBe(true);
    const dawn = priorFromDayParts(['dawn']);
    expect(dawn.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(dawn[2]).toBeGreaterThan(dawn[0] * 5);
    expect(dawn[2]).toBeCloseTo(dawn[3]);
  });
  test('sự kiện năm chưa xảy ra / chưa đủ tuổi bị bỏ kèm lý do', () => {
    const { used, skipped } = prepareEvents(base, [
      { kind: 'marriage', year: 2030 }, { kind: 'marriage', year: 1995 }, { kind: 'marriage', year: 2012 }, { kind: 'khong-co', year: 2012 },
    ], NOW);
    expect(used.map(e => e.year)).toEqual([2012]);
    expect(skipped).toHaveLength(3);
  });
});

describe('Suy đoán giờ sinh — dáng người / khuôn mặt', () => {
  jest.setTimeout(180000);
  const lookOf = (idx: number) => predictLook(buildResult({ ...base, hour: BIRTH_HOURS[idx].hour, minute: 0 } as BirthInfo, undefined));
  const argmax = <K extends string>(r: Record<K, number>) => (Object.keys(r) as K[]).reduce((a, b) => (r[b] > r[a] ? b : a));

  test('mỗi canh giờ cho phân phối hợp lệ (tổng = 1) và các canh giờ khác nhau', () => {
    const all = BIRTH_HOURS.map((_, i) => lookOf(i));
    for (const p of all) {
      expect(Object.values(p.build).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
      expect(Object.values(p.face).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    }
    expect(new Set(all.map(p => argmax(p.face))).size).toBeGreaterThan(1);
  });
  test('lookLogit: đáp án đúng với dự đoán > 0, đáp án trái ngược < đáp án đúng, không trả lời = 0', () => {
    const p = lookOf(6);
    expect(lookLogit(p, undefined)).toBe(0);
    const hit = lookLogit(p, { build: argmax(p.build), face: argmax(p.face) });
    const miss = lookLogit(p, { build: (Object.keys(p.build) as BuildKind[]).reduce((a, b) => (p.build[b] < p.build[a] ? b : a)), face: (Object.keys(p.face) as FaceKind[]).reduce((a, b) => (p.face[b] < p.face[a] ? b : a)) });
    expect(hit).toBeGreaterThan(0);
    expect(miss).toBeLessThan(hit);
  });
  test('2 sự kiện + dáng & mặt đủ → đủ bằng chứng (không còn insufficient_data); thiếu mặt thì vẫn thiếu', () => {
    const ev: UserLifeEvent[] = [{ kind: 'marriage', year: 2010 }, { kind: 'child_birth', year: 2013 }];
    expect(guessBirthHourSync({ base, events: ev, look: { build: 'full', face: 'round' }, now: NOW }).status).not.toBe('insufficient_data');
    expect(guessBirthHourSync({ base, events: ev, look: { build: 'full' }, now: NOW }).status).toBe('insufficient_data');
  });
});

describe('Suy đoán giờ sinh — kết luận', () => {
  jest.setTimeout(180000);

  test('dưới số sự kiện tối thiểu → insufficient_data, xác suất vẫn hợp lệ', () => {
    const g = guessBirthHourSync({ base, events: [{ kind: 'marriage', year: 2012 }, { kind: 'home_buy', year: 2015 }], now: NOW });
    expect(g.status).toBe('insufficient_data');
    expect(g.candidates).toHaveLength(12);
    expect(g.candidates.reduce((s, c) => s + c.probability, 0)).toBeCloseTo(1);
  });

  test('tính tất định: cùng đầu vào → cùng kết quả', () => {
    const events: UserLifeEvent[] = [{ kind: 'marriage', year: 2010 }, { kind: 'child_birth', year: 2013 }, { kind: 'home_buy', year: 2017 }];
    const a = guessBirthHourSync({ base, events, now: NOW });
    const b = guessBirthHourSync({ base, events, now: NOW });
    expect(a.candidates.map(c => [c.index, c.probability])).toEqual(b.candidates.map(c => [c.index, c.probability]));
  });

  // Kiểm tra TỰ NHẤT QUÁN (cận trên, không phải độ chính xác thật): sự kiện lấy từ chính năm "nổi" nhất của lá số giờ thật
  // → bộ suy đoán phải đưa giờ thật vào nhóm đầu. Độ chính xác thật chỉ biết khi thử trên người có giờ sinh biết chắc.
  test.each([2, 6, 10])('sự kiện sinh từ lá số giờ thật (canh giờ #%i) → giờ thật nằm trong top 3', trueIdx => {
    const truth = buildResult({ ...base, hour: BIRTH_HOURS[trueIdx].hour, minute: 0 } as BirthInfo, undefined);
    const events: UserLifeEvent[] = [];
    for (const kid of ['marriage', 'child_birth', 'job_change', 'home_buy', 'promotion']) {
      const kind = LIFE_EVENT_KINDS.find(k => k.id === kid)!;
      let best: { y: number; s: number } | null = null;
      for (let y = 1985 + 20; y <= 2025; y++) {
        if (currentAgeOf(truth, new Date(y, 0, 1)) < (kind.minAge ?? 15)) continue;
        const ev = computeAnnualPrediction(truth, y, { skipMonthly: true }).allEvents.filter(e => kind.eventIds.includes(e.eventId));
        const s = Math.max(0, ...ev.map(e => e.strength));
        if (!best || s > best.s) best = { y, s };
      }
      if (best) events.push({ kind: kid, year: best.y });
    }
    const g = guessBirthHourSync({ base, events, now: NOW });
    const rank = g.candidates.findIndex(c => c.index === trueIdx) + 1;
    // eslint-disable-next-line no-console
    console.log(`canh giờ thật #${trueIdx} (${BIRTH_HOURS[trueIdx].branch}) → hạng ${rank}; status=${g.status}; top=${g.candidates.slice(0, 3).map(c => `${c.branch} ${(c.probability * 100).toFixed(0)}%`).join(', ')}`);
    expect(rank).toBeLessThanOrEqual(3);
  });
});
