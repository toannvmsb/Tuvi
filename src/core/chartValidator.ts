/**
 * CHART VALIDATOR (Phase 1 — Canonical Data Model).
 *
 * Kiểm tra tính TOÀN VẸN & NHẤT QUÁN của một AstrologyResult trước khi các tầng
 * phân tích/luận giải sử dụng. Bắt lỗi cấu trúc (thiếu cung, trùng chi, thiếu
 * Mệnh…) và cảnh báo dữ liệu chưa đủ (thiếu Dụng/Kỵ thần, chính tinh thiếu độ
 * sáng…). Trả về `confidence` tổng thể của lá số.
 *
 * V2.0: "canonical model có version + validator phát hiện dữ liệu thiếu/mâu thuẫn".
 */

import type { AstrologyResult } from '../types';
import { SCHEMA_VERSION } from '../types';

const BRANCHES = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tị', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
const STANDARD_PALACES = [
  'Mệnh', 'Phụ Mẫu', 'Phúc Đức', 'Điền Trạch', 'Quan Lộc', 'Nô Bộc',
  'Thiên Di', 'Tật Ách', 'Tài Bạch', 'Tử Tức', 'Phu Thê', 'Huynh Đệ',
];
// Một số lá số dùng "Hôn Nhân" thay cho "Phu Thê"
const PALACE_ALIASES: Record<string, string> = { 'Hôn Nhân': 'Phu Thê' };

export type ValidationSeverity = 'error' | 'warning' | 'info';
export interface ValidationIssue {
  severity: ValidationSeverity;
  code: string;
  message: string;
}

export interface ChartValidation {
  ok: boolean;                 // true nếu KHÔNG có error (warning vẫn ok)
  schemaVersion: string;       // version đọc được (hoặc 'unknown')
  issues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
  confidence: number;          // 0–100, tổng thể độ tin cậy dữ liệu
}

export function validateChart(result: AstrologyResult): ChartValidation {
  const issues: ValidationIssue[] = [];
  const err = (code: string, message: string) => issues.push({ severity: 'error', code, message });
  const warn = (code: string, message: string) => issues.push({ severity: 'warning', code, message });
  const info = (code: string, message: string) => issues.push({ severity: 'info', code, message });

  const chart = result?.tuViChart;
  const houses = chart?.houses ?? [];

  // ── Cấu trúc 12 cung ──
  if (houses.length !== 12) {
    err('HOUSE_COUNT', `Lá số phải có đúng 12 cung, hiện có ${houses.length}.`);
  }

  // Chi không trùng, đủ 12
  const branchSeen = new Set<string>();
  for (const h of houses) {
    if (!h.branch) { err('HOUSE_NO_BRANCH', `Có cung thiếu địa chi (${h.palaceName ?? '?'}).`); continue; }
    if (branchSeen.has(h.branch)) err('BRANCH_DUP', `Địa chi ${h.branch} xuất hiện ở nhiều hơn 1 cung.`);
    branchSeen.add(h.branch);
    if (!BRANCHES.includes(h.branch)) err('BRANCH_INVALID', `Địa chi không hợp lệ: ${h.branch}.`);
    if (!h.palaceName) warn('HOUSE_NO_NAME', `Cung tại ${h.branch} thiếu tên cung.`);
  }
  if (houses.length === 12 && branchSeen.size !== 12) {
    err('BRANCH_INCOMPLETE', `Chỉ có ${branchSeen.size}/12 địa chi khác nhau.`);
  }

  // ── Mệnh / Thân ──
  const menhCount = houses.filter(h => h.isManh).length;
  if (menhCount === 0) err('NO_MENH', 'Không xác định được cung Mệnh.');
  else if (menhCount > 1) err('MULTI_MENH', `Có ${menhCount} cung Mệnh (phải đúng 1).`);
  const thanCount = houses.filter(h => h.isThan).length;
  if (thanCount === 0) warn('NO_THAN', 'Không xác định được cung Thân.');

  // ── Ngũ hành Mệnh ──
  if (!chart?.menhElement) err('NO_MENH_ELEMENT', 'Thiếu ngũ hành Mệnh (menhElement).');

  // ── Tên cung chuẩn ──
  const normNames = new Set(houses.map(h => PALACE_ALIASES[h.palaceName] ?? h.palaceName));
  for (const p of STANDARD_PALACES) {
    if (!normNames.has(p)) warn('PALACE_MISSING', `Thiếu cung "${p}" trong lá số.`);
  }

  // ── Chính tinh thiếu độ sáng ──
  let chinhNoBright = 0;
  for (const h of houses) {
    for (const s of h.stars ?? []) {
      if (s.type === 'chinh' && !s.brightness) chinhNoBright++;
    }
  }
  if (chinhNoBright > 0) warn('CHINH_NO_BRIGHT', `${chinhNoBright} chính tinh thiếu dữ liệu độ sáng (miếu/vượng/…).`);

  // ── Đại Vận / Tiểu Vận ──
  if (!result.daiVans?.length) warn('NO_DAIVAN', 'Thiếu dữ liệu Đại Vận.');
  const dvIndexes = new Set((result.daiVans ?? []).map(d => d.index));
  const orphanTv = (result.tieuVans ?? []).filter(t => !dvIndexes.has(t.daiVanIndex)).length;
  if (orphanTv > 0) warn('TV_ORPHAN', `${orphanTv} năm Tiểu Vận không thuộc Đại Vận nào.`);

  // ── Bát Tự Dụng/Kỵ thần (ảnh hưởng Nhật Vận) ──
  const fav = result.batTuChart?.favorableElements ?? [];
  const unfav = result.batTuChart?.unfavorableElements ?? [];
  if (fav.length === 0 && unfav.length === 0) warn('NO_BATTU_ELEMENTS', 'Thiếu Dụng/Kỵ thần Bát Tự — giảm độ chính xác chọn ngày.');

  // ── Schema version ──
  const schemaVersion = result.schemaVersion ?? 'unknown';
  if (result.schemaVersion == null) info('NO_SCHEMA_VERSION', 'Lá số chưa gắn schemaVersion (dựng bằng phiên bản cũ).');
  else if (result.schemaVersion !== SCHEMA_VERSION) info('SCHEMA_MISMATCH', `schemaVersion=${result.schemaVersion}, hiện tại ${SCHEMA_VERSION}.`);

  const errorCount = issues.filter(x => x.severity === 'error').length;
  const warningCount = issues.filter(x => x.severity === 'warning').length;

  // Confidence: trừ nặng cho error, nhẹ cho warning
  let confidence = 100 - errorCount * 25 - warningCount * 6;
  confidence = Math.max(0, Math.min(100, confidence));

  return {
    ok: errorCount === 0,
    schemaVersion,
    issues,
    errorCount,
    warningCount,
    confidence,
  };
}
