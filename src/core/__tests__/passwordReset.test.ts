const mockInvoke = jest.fn();
jest.mock('../../lib/supabase', () => ({ supabase: { functions: { invoke: (...a: unknown[]) => mockInvoke(...a) }, auth: {} } }));
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() }));

import { parseResetToken } from '../../lib/resetLink';
import { confirmPasswordReset } from '../../lib/auth';

const T = 'a'.repeat(64);

describe('parseResetToken — liên kết /reset?token=', () => {
  test('đúng trang và đúng định dạng → token (hạ chữ thường)', () => {
    expect(parseResetToken('/reset', `?token=${T}`)).toBe(T);
    expect(parseResetToken('/reset/', `?token=${'A'.repeat(64)}`)).toBe(T);
  });
  test('đúng trang nhưng token thiếu/sai → chuỗi rỗng (hiện "liên kết không hợp lệ")', () => {
    expect(parseResetToken('/reset', '')).toBe('');
    expect(parseResetToken('/reset', '?token=abc')).toBe('');
    expect(parseResetToken('/reset', `?token=${'g'.repeat(64)}`)).toBe('');
  });
  test('trang khác → null', () => {
    expect(parseResetToken('/', `?token=${T}`)).toBeNull();
    expect(parseResetToken('/embed', `?token=${T}`)).toBeNull();
    expect(parseResetToken('/reset-x', `?token=${T}`)).toBeNull();
  });
});

describe('confirmPasswordReset — gọi auth-email confirm_reset và dịch lỗi', () => {
  beforeEach(() => mockInvoke.mockReset());
  test('thành công', async () => {
    mockInvoke.mockResolvedValue({ data: { ok: true }, error: null });
    await expect(confirmPasswordReset(T, 'matkhau-moi')).resolves.toBeUndefined();
    expect(mockInvoke).toHaveBeenCalledWith('auth-email', { body: { action: 'confirm_reset', token: T, newPassword: 'matkhau-moi' } });
  });
  test('mật khẩu ngắn: không gọi máy chủ', async () => {
    await expect(confirmPasswordReset(T, '123')).rejects.toThrow(/tối thiểu 6/);
    expect(mockInvoke).not.toHaveBeenCalled();
  });
  test('liên kết sai/hết hạn/đã dùng → thông báo rõ ràng (kể cả khi lỗi nằm trong HTTP 400)', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { ok: false, error: 'invalid_token' }, error: null });
    await expect(confirmPasswordReset(T, 'matkhau-moi')).rejects.toThrow(/hết hạn/);
    mockInvoke.mockResolvedValueOnce({ data: null, error: { context: { json: async () => ({ error: 'invalid_token' }) } } });
    await expect(confirmPasswordReset(T, 'matkhau-moi')).rejects.toThrow(/hết hạn/);
  });
  test('lỗi khác → thông báo chung', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { context: { json: async () => ({}) } } });
    await expect(confirmPasswordReset(T, 'matkhau-moi')).rejects.toThrow(/Không đặt lại được/);
  });
});
