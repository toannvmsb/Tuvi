/** Điểm Bát Tự theo 12 tháng âm của một năm (cache theo lá số + năm) — để thẻ sự kiện hiện dòng đối chiếu Bát Tự. */
import { useMemo } from 'react';
import type { AstrologyResult } from '../types';
import { buildBaziNatal, evaluateBaziMonths } from '../core/pastReview/bazi/engine';
import { baziMonthNote } from '../core/pastReview/bazi/monthNote';

export function useBaziMonthNote(result: AstrologyResult | null, year: number) {
  const months = useMemo(() => {
    if (!result) return null;
    try { return evaluateBaziMonths(buildBaziNatal(result), year); } catch { return null; }
  }, [result, year]);
  return useMemo(() => (eventId: string) => (s: number, e: number) => baziMonthNote(months, eventId, s, e), [months]);
}
