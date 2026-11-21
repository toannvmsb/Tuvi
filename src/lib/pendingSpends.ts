/**
 * Theo dõi các lệnh "trừ xu / ghi mở khóa" đang gửi lên máy chủ (gửi rồi quên ở lib/auth.ts).
 * ai-proxy cấp tín dụng AI theo xu ĐÃ TRỪ phía máy chủ, nên trước khi gọi AI phải chờ các lệnh này ghi xong
 * (nếu không, các lượt gọi AI đầu tiên có thể tới trước lệnh trừ xu và bị từ chối).
 */
const inflight = new Set<Promise<unknown>>();

/** Đăng ký một lệnh đang chạy (kể cả builder của supabase-js, vốn chỉ chạy khi được `then`). Không bao giờ ném lỗi. */
export function trackSpend(p: PromiseLike<unknown>): void {
  const w: Promise<unknown> = Promise.resolve(p).then(() => undefined, () => undefined).then(() => { inflight.delete(w); });
  inflight.add(w);
}

/** Chờ mọi lệnh đang chạy xong, tối đa `timeoutMs` (mất mạng thì không treo mãi). */
export async function awaitPendingSpends(timeoutMs = 4000): Promise<void> {
  if (inflight.size === 0) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    Promise.all([...inflight]),
    new Promise<void>(r => { timer = setTimeout(r, timeoutMs); }),
  ]);
  if (timer) clearTimeout(timer);
}

export function pendingSpendCount(): number { return inflight.size; }
