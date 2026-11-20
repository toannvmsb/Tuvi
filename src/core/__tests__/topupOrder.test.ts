const mockGetUser = jest.fn();
const mockInsert = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: { auth: { getUser: (...a: unknown[]) => mockGetUser(...a) }, from: () => ({ insert: (...a: unknown[]) => mockInsert(...a) }) },
}));
const mockIsOnlineMode = jest.fn();
jest.mock('../../lib/auth', () => ({ isOnlineMode: () => mockIsOnlineMode() }));

import { createTopupOrder } from '../../lib/topup';

beforeEach(() => { mockGetUser.mockReset(); mockInsert.mockReset(); mockIsOnlineMode.mockReset(); mockIsOnlineMode.mockReturnValue(true); });

describe('createTopupOrder — chỉ báo thành công khi đơn thật sự đã ghi (tránh hiện QR khi không có đơn)', () => {
  test('thành công: ghi đúng dữ liệu', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockInsert.mockResolvedValue({ error: null });
    expect(await createTopupOrder('TUVIABC123', 50000, 500)).toEqual({ ok: true });
    expect(mockInsert).toHaveBeenCalledWith({ user_id: 'u1', code: 'TUVIABC123', amount_vnd: 50000, xu: 500, status: 'pending' });
  });
  test('ngoại tuyến / chưa đăng nhập: thất bại, không gọi ghi', async () => {
    mockIsOnlineMode.mockReturnValue(false);
    expect(await createTopupOrder('TUVIABC123', 1, 1)).toMatchObject({ ok: false, reason: 'offline' });
    mockIsOnlineMode.mockReturnValue(true);
    mockGetUser.mockResolvedValue({ data: { user: null } });
    expect(await createTopupOrder('TUVIABC123', 1, 1)).toMatchObject({ ok: false, reason: 'no_session' });
    expect(mockInsert).not.toHaveBeenCalled();
  });
  test('lỗi từ máy chủ (trước đây bị nuốt) → thất bại; trùng mã → reason duplicate', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockInsert.mockResolvedValueOnce({ error: { code: '42501', message: 'rls' } });
    expect(await createTopupOrder('TUVIABC123', 1, 1)).toMatchObject({ ok: false, reason: 'error' });
    mockInsert.mockResolvedValueOnce({ error: { code: '23505', message: 'dup' } });
    expect(await createTopupOrder('TUVIABC123', 1, 1)).toMatchObject({ ok: false, reason: 'duplicate' });
  });
  test('mất mạng (ném lỗi) → thất bại, không văng', async () => {
    mockGetUser.mockRejectedValue(new Error('network'));
    expect(await createTopupOrder('TUVIABC123', 1, 1)).toMatchObject({ ok: false, reason: 'error' });
  });
});
