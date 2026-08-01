/**
 * Dựng AstrologyResult từ BirthInfo (+ năm xem). Dùng chung cho màn nhập liệu
 * và khi mở lại lá số đã lưu trên server.
 */
import type { BirthInfo, AstrologyResult } from '../types';
import { SCHEMA_VERSION } from '../types';
import { calculateTuViChart } from './tuViEngine';
import { calculateBatTu } from './batTuEngine';
import { calculateDaiVan, calculateTieuVan } from './daiVanEngine';
import { validateChart } from './chartValidator';

export function buildResult(birthInfo: BirthInfo, viewingYear?: number): AstrologyResult {
  const tuViChart = calculateTuViChart(birthInfo, viewingYear);
  const batTuChart = calculateBatTu(birthInfo);
  const daiVans = calculateDaiVan(birthInfo, tuViChart, batTuChart.favorableElements);
  const tieuVans = calculateTieuVan(birthInfo, tuViChart, daiVans);
  const result: AstrologyResult = { birthInfo, tuViChart, batTuChart, daiVans, tieuVans, schemaVersion: SCHEMA_VERSION };

  // Dev-time: cảnh báo nếu canonical model có lỗi cấu trúc (bắt bug engine sớm).
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    const v = validateChart(result);
    if (!v.ok) console.warn('[chartValidator] Lá số có lỗi cấu trúc:', v.issues.filter(i => i.severity === 'error'));
  }

  return result;
}
