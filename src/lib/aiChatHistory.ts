/**
 * Lịch sử chat "Hỏi Tuzi" — lưu OFFLINE trên máy (AsyncStorage), KHÔNG lưu server.
 * Giữ tối đa 30 ngày; các lượt cũ hơn tự bị dọn khi đọc/ghi lần sau.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'aiChatHistory:v1';
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 ngày

export interface StoredTurn { question: string; answer: string; ts: number }

function pruneOld(list: StoredTurn[]): StoredTurn[] {
  const cutoff = Date.now() - RETENTION_MS;
  return list.filter(t => t.ts >= cutoff);
}

/** Đọc lịch sử còn hạn (≤ 30 ngày), mới nhất ở cuối — đúng thứ tự hiển thị chat. */
export async function loadChatHistory(): Promise<StoredTurn[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const all: StoredTurn[] = JSON.parse(raw);
    const fresh = pruneOld(all);
    if (fresh.length !== all.length) {
      try { await AsyncStorage.setItem(KEY, JSON.stringify(fresh)); } catch { /* bỏ qua */ }
    }
    return fresh;
  } catch {
    return [];
  }
}

/** Thêm 1 lượt hỏi-đáp vào lịch sử (gọi ngay sau khi có câu trả lời thành công). */
export async function appendChatTurn(question: string, answer: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list: StoredTurn[] = raw ? JSON.parse(raw) : [];
    list.push({ question, answer, ts: Date.now() });
    await AsyncStorage.setItem(KEY, JSON.stringify(pruneOld(list)));
  } catch { /* bỏ qua — không làm hỏng luồng chat nếu lưu lỗi */ }
}

/** Xóa toàn bộ lịch sử trên máy (người dùng bấm "Xóa lịch sử"). */
export async function clearChatHistory(): Promise<void> {
  try { await AsyncStorage.removeItem(KEY); } catch { /* bỏ qua */ }
}
