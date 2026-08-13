/**
 * Giới hạn số lượng promise chạy ĐỒNG THỜI khi có nhiều "phần" AI cần gọi (mỗi
 * phần = 1 lượt gọi Edge Function `ai-proxy`). Bắn hết TẤT CẢ song song (như
 * trước đây ở toàn lá số 11 phần / bát tự 9 phần / so sánh 12 tầng) khiến
 * OpenAI/Anthropic — dùng CHUNG 1 key server — bị chạm rate limit (RPM/TPM) gần
 * như chắc chắn, dẫn tới hàng loạt phần lỗi/rớt về free model (dễ bị cắt ngắn)
 * hoặc báo lỗi "no_key_configured" khi request dồn dập.
 *
 * Trả về mảng Promise CÙNG THỨ TỰ với `tasks` — chỗ gọi vẫn `await results[i]`
 * tuần tự như cũ để ghép nội dung đúng thứ tự, nhưng bên trong chỉ tối đa
 * `limit` task thực sự chạy cùng lúc.
 */
export function runWithConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T>[] {
  const results: Promise<T>[] = new Array(tasks.length);
  const resolvers: { resolve: (v: T) => void; reject: (e: unknown) => void }[] = new Array(tasks.length);
  for (let i = 0; i < tasks.length; i++) {
    results[i] = new Promise<T>((resolve, reject) => { resolvers[i] = { resolve, reject }; });
  }
  let next = 0;
  const startNext = () => {
    const i = next++;
    if (i >= tasks.length) return;
    tasks[i]().then(
      v => { resolvers[i].resolve(v); startNext(); },
      e => { resolvers[i].reject(e); startNext(); },
    );
  };
  for (let k = 0; k < Math.min(limit, tasks.length); k++) startNext();
  return results;
}
