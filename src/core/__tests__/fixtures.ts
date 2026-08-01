import type { AstrologyResult, BirthInfo, StarEntry } from '../../types';
import { buildResult } from '../buildResult';

/** Lá số thật dùng chung cho các test tích hợp (golden chart). */
export const SAMPLE_BIRTH: BirthInfo = {
  name: 'Test Nam',
  gender: 'nam',
  birthplace: 'Hà Nội',
  calendarType: 'solar',
  year: 1990,
  month: 6,
  day: 15,
  hour: 10,
  minute: 30,
  language: 'vi',
};

/** Thêm 2 lá số mẫu để đủ ≥3 fixtures (Phase 2). */
export const SAMPLE_BIRTHS: BirthInfo[] = [
  SAMPLE_BIRTH,
  {
    name: 'Test Nữ', gender: 'nu', birthplace: 'Sài Gòn', calendarType: 'solar',
    year: 1985, month: 11, day: 3, hour: 22, minute: 0, language: 'vi',
  },
  {
    name: 'Test 2001', gender: 'nam', birthplace: 'Đà Nẵng', calendarType: 'solar',
    year: 2001, month: 2, day: 28, hour: 4, minute: 15, language: 'vi',
  },
];

const cache = new Map<string, AstrologyResult>();
export function sampleResult(bi: BirthInfo = SAMPLE_BIRTH): AstrologyResult {
  const key = `${bi.year}-${bi.month}-${bi.day}-${bi.hour}`;
  if (!cache.has(key)) cache.set(key, buildResult(bi, 2026));
  return cache.get(key)!;
}

/** Tất cả lá số mẫu (đã dựng) — dùng cho test bao phủ nhiều lá số. */
export function allSampleResults(): AstrologyResult[] {
  return SAMPLE_BIRTHS.map(bi => sampleResult(bi));
}

export const star = (name: string, type: StarEntry['type'] = 'chinh', brightness?: StarEntry['brightness']): StarEntry =>
  ({ name, type, brightness });
