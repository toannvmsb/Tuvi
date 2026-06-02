/**
 * Sinh khóa mở-khóa (unlock) theo TỪNG LÁ SỐ, để các mục đã trả phí của lá số
 * này không lẫn sang lá số khác. Nếu chưa lưu (chưa có chartId) → dùng 'local'.
 */
import type { AstrologyResult } from '../types';

export function fkey(result: AstrologyResult, suffix: string): string {
  return `${result.birthInfo?.chartId ?? 'local'}:${suffix}`;
}
