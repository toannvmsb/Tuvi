/**
 * HOÀN CẢNH CỦA BẠN — 28 cờ ngữ cảnh cho engine sự kiện năm Tuzi 2.1 (đang đi làm, có con, đang có đôi, có hợp đồng…).
 *
 * Quy ước của engine: `true` = có · `false` = không (chủ đề đó "không áp dụng") · thiếu/null = chưa khai (chủ đề bị ẨN, không đoán).
 * Lưu CỤC BỘ trên máy theo từng lá số (AsyncStorage) — không gửi máy chủ, không lẫn sang lá số khác. Chỉ là hoàn cảnh HIỆN TẠI;
 * Nghiệm quá khứ dùng cờ hiện tại cho mọi năm và ghi rõ giới hạn đó (anh Toàn chốt 08/10/2026).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { AstrologyResult } from '../types';
import { CONTEXT_LABELS } from '../data/eventContextLabels';
export type EventContext = Record<string, boolean | null | undefined>;

const PREFIX = 'tuzi:eventContext21:';

/** Nhóm hiển thị trên form (thứ tự + tiêu đề). */
export const CONTEXT_GROUPS: { title: string; keys: string[] }[] = [
  { title: 'Công việc & tài chính', keys: ['employed', 'workingOrSeeking', 'seekingJob', 'hasIncome', 'hasReceivables', 'hasDebt', 'hasProject', 'planningCollaboration', 'hasCollaborators'] },
  { title: 'Tài sản & di chuyển', keys: ['hasAssets', 'planningAssetTransaction', 'planningTravel', 'planningMove', 'inTransition'] },
  { title: 'Tình cảm, con cái & gia đình', keys: ['partnered', 'openToRelationship', 'hasChildren', 'planningParenthood', 'hasFamilyContact', 'sharedHousehold', 'hasElderCare'] },
  { title: 'Học tập, thủ tục & sức khỏe', keys: ['learning', 'hasExam', 'hasPublicWork', 'hasFormalProcedure', 'hasContract', 'hasDispute', 'hasCarePlan'] },
];

export const CONTEXT_KEYS = Object.keys(CONTEXT_LABELS);

/** Chữ ký hoàn cảnh hiện biết (trong bộ nhớ) — để cache Nghiệm quá khứ / Luận tương lai tính lại khi hoàn cảnh đổi. */
const sigs = new Map<string, string>();
const sigOf = (ctx: EventContext) => CONTEXT_KEYS.map(k => (ctx[k] === true ? '1' : ctx[k] === false ? '0' : '-')).join('');
export function contextSig(result: AstrologyResult): string { return sigs.get(contextStorageKey(result)) ?? '?'; }

export function contextStorageKey(result: AstrologyResult): string {
  const b = result.birthInfo;
  return PREFIX + (b.chartId ?? `local-${b.year}-${b.month}-${b.day}-${b.hour}-${b.gender}`);
}

export async function loadEventContext(result: AstrologyResult): Promise<EventContext> {
  try {
    const raw = await AsyncStorage.getItem(contextStorageKey(result));
    const out: EventContext = {};
    if (raw) {
      const o = JSON.parse(raw) as Record<string, unknown>;
      for (const k of CONTEXT_KEYS) if (o[k] === true || o[k] === false) out[k] = o[k] as boolean;
    }
    sigs.set(contextStorageKey(result), sigOf(out));
    return out;
  } catch { sigs.set(contextStorageKey(result), sigOf({})); return {}; }
}

export async function saveEventContext(result: AstrologyResult, ctx: EventContext): Promise<void> {
  const clean: Record<string, boolean> = {};
  for (const k of CONTEXT_KEYS) if (ctx[k] === true || ctx[k] === false) clean[k] = ctx[k] as boolean;
  sigs.set(contextStorageKey(result), sigOf(clean));
  try { await AsyncStorage.setItem(contextStorageKey(result), JSON.stringify(clean)); } catch { /* bỏ qua */ }
}

/** Số cờ đã khai (true/false). */
export const answeredCount = (ctx: EventContext) => CONTEXT_KEYS.filter(k => ctx[k] === true || ctx[k] === false).length;

/** Hook: nạp hoàn cảnh mỗi khi màn lấy focus (sửa ở form xong quay lại là thấy ngay). */
export function useEventContext(result: AstrologyResult | null): { ctx: EventContext; loaded: boolean; reload: () => void } {
  const [ctx, setCtx] = useState<EventContext>({});
  const [loaded, setLoaded] = useState(false);
  const reload = useCallback(() => {
    if (!result) { setLoaded(true); return; }
    loadEventContext(result).then(c => { setCtx(c); setLoaded(true); });
  }, [result]);
  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  return { ctx, loaded, reload };
}
