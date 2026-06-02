/**
 * Dựng AstrologyResult từ BirthInfo (+ năm xem). Dùng chung cho màn nhập liệu
 * và khi mở lại lá số đã lưu trên server.
 */
import type { BirthInfo, AstrologyResult } from '../types';
import { calculateTuViChart } from './tuViEngine';
import { calculateBatTu } from './batTuEngine';
import { calculateDaiVan, calculateTieuVan } from './daiVanEngine';

export function buildResult(birthInfo: BirthInfo, viewingYear?: number): AstrologyResult {
  const tuViChart = calculateTuViChart(birthInfo, viewingYear);
  const batTuChart = calculateBatTu(birthInfo);
  const daiVans = calculateDaiVan(birthInfo, tuViChart, batTuChart.favorableElements);
  const tieuVans = calculateTieuVan(birthInfo, tuViChart, daiVans);
  return { birthInfo, tuViChart, batTuChart, daiVans, tieuVans };
}
