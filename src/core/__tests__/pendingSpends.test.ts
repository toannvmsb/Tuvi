import { trackSpend, awaitPendingSpends, pendingSpendCount } from '../../lib/pendingSpends';

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

describe('pendingSpends — chờ lệnh trừ xu ghi xong trước khi gọi AI', () => {
  test('không có lệnh nào: trả về ngay', async () => {
    const t0 = Date.now();
    await awaitPendingSpends(2000);
    expect(Date.now() - t0).toBeLessThan(100);
    expect(pendingSpendCount()).toBe(0);
  });

  test('chờ các lệnh đang chạy xong rồi mới trả về', async () => {
    let doneA = false, doneB = false;
    trackSpend(delay(60).then(() => { doneA = true; }));
    trackSpend(delay(120).then(() => { doneB = true; }));
    expect(pendingSpendCount()).toBe(2);
    await awaitPendingSpends(2000);
    expect(doneA && doneB).toBe(true);
    expect(pendingSpendCount()).toBe(0);
  });

  test('lệnh bị lỗi vẫn được dọn và không làm treo/ném lỗi', async () => {
    trackSpend(Promise.reject(new Error('mạng lỗi')));
    await expect(awaitPendingSpends(2000)).resolves.toBeUndefined();
    expect(pendingSpendCount()).toBe(0);
  });

  test('mất mạng (lệnh không bao giờ xong): hết thời gian chờ thì thôi, không treo', async () => {
    trackSpend(new Promise(() => { /* không bao giờ xong */ }));
    const t0 = Date.now();
    await awaitPendingSpends(150);
    const took = Date.now() - t0;
    expect(took).toBeGreaterThanOrEqual(140);
    expect(took).toBeLessThan(600);
  });

  test('chấp nhận cả "thenable" như builder của supabase-js (chỉ chạy khi được then)', async () => {
    let ran = false;
    const thenable = { then: (res: (v: unknown) => void) => { ran = true; res({ error: null }); } } as unknown as PromiseLike<unknown>;
    trackSpend(thenable);
    await awaitPendingSpends(500);
    expect(ran).toBe(true);
  });
});
