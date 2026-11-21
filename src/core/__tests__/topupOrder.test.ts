const mockGetUser = jest.fn();
const mockRpc = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: { auth: { getUser: (...a: unknown[]) => mockGetUser(...a) }, rpc: (...a: unknown[]) => mockRpc(...a) },
}));
const mockIsOnlineMode = jest.fn();
jest.mock('../../lib/auth', () => ({ isOnlineMode: () => mockIsOnlineMode() }));

import { createTopupOrder } from '../../lib/topup';
import { makeTopupCode } from '../../constants/payment';

beforeEach(() => { mockGetUser.mockReset(); mockRpc.mockReset(); mockIsOnlineMode.mockReset(); mockIsOnlineMode.mockReturnValue(true); });

describe('createTopupOrder — đơn do MÁY CHỦ tạo; chỉ báo thành công khi đơn thật sự đã ghi', () => {
  test('thành công: gọi RPC create_topup_order với mã và gói (không gửi số tiền)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockRpc.mockResolvedValue({ data: { ok: true }, error: null });
    expect(await createTopupOrder('TUVIABC123', 50000, 500)).toEqual({ ok: true });
    expect(mockRpc).toHaveBeenCalledWith('create_topup_order', { p_order_code: 'TUVIABC123', p_xu: 500 });
  });
  test('ngoại tuyến / chưa đăng nhập: thất bại, không gọi RPC', async () => {
    mockIsOnlineMode.mockReturnValue(false);
    expect(await createTopupOrder('TUVIABC123', 1, 1)).toMatchObject({ ok: false, reason: 'offline' });
    mockIsOnlineMode.mockReturnValue(true);
    mockGetUser.mockResolvedValue({ data: { user: null } });
    expect(await createTopupOrder('TUVIABC123', 1, 1)).toMatchObject({ ok: false, reason: 'no_session' });
    expect(mockRpc).not.toHaveBeenCalled();
  });
  test('lỗi máy chủ → thất bại; trùng mã → duplicate; quá nhiều đơn chờ → thông báo riêng', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockRpc.mockResolvedValueOnce({ data: null, error: { code: 'P0001', message: 'invalid_pack' } });
    expect(await createTopupOrder('TUVIABC123', 1, 1)).toMatchObject({ ok: false, reason: 'error' });
    mockRpc.mockResolvedValueOnce({ data: null, error: { code: '23505', message: 'dup' } });
    expect(await createTopupOrder('TUVIABC123', 1, 1)).toMatchObject({ ok: false, reason: 'duplicate' });
    mockRpc.mockResolvedValueOnce({ data: null, error: { code: 'P0001', message: 'too_many_orders' } });
    const r = await createTopupOrder('TUVIABC123', 1, 1);
    expect(r).toMatchObject({ ok: false, reason: 'error' });
    expect((r as { message: string }).message).toMatch(/quá nhiều đơn/);
  });
  test('mất mạng (ném lỗi) → thất bại, không văng', async () => {
    mockGetUser.mockRejectedValue(new Error('network'));
    expect(await createTopupOrder('TUVIABC123', 1, 1)).toMatchObject({ ok: false, reason: 'error' });
  });
});

describe('makeTopupCode — luôn khớp regex của webhook SePay và RPC máy chủ', () => {
  test('1000 mã đều dạng TUVI + đúng 6 ký tự [0-9A-Z], không trùng nhau nhiều', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const c = makeTopupCode();
      expect(c).toMatch(/^TUVI[0-9A-Z]{6}$/);
      seen.add(c);
    }
    expect(seen.size).toBeGreaterThan(990);
  });
});
