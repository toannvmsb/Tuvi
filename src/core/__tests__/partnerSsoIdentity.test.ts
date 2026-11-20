import {
  DEFAULT_PARTNER_DISPLAY_NAME, MAX_DISPLAY_NAME_LEN, pickLoginEmail, sanitizeDisplayName, shouldUpdateDisplayName,
} from '../../../supabase/functions/partner-sso/identity';

describe('Partner SSO — tên hiển thị đối tác gửi', () => {
  test('làm sạch: cắt khoảng trắng, bỏ ký tự điều khiển, giới hạn độ dài, rỗng → undefined', () => {
    expect(sanitizeDisplayName('  Nguyễn  Văn   A ')).toBe('Nguyễn Văn A');
    expect(sanitizeDisplayName('A\u0000B\nC‮D')).toBe('A B C D');
    expect(sanitizeDisplayName('x'.repeat(200))).toHaveLength(MAX_DISPLAY_NAME_LEN);
    expect(sanitizeDisplayName('   ')).toBeUndefined();
    expect(sanitizeDisplayName('')).toBeUndefined();
    expect(sanitizeDisplayName(123)).toBeUndefined();
    expect(sanitizeDisplayName(undefined)).toBeUndefined();
    expect(sanitizeDisplayName({ a: 1 })).toBeUndefined();
  });

  test('cập nhật khi người dùng CHƯA tự đổi tên', () => {
    expect(shouldUpdateDisplayName(null, undefined, 'An')).toBe(true);
    expect(shouldUpdateDisplayName('', undefined, 'An')).toBe(true);
    expect(shouldUpdateDisplayName(DEFAULT_PARTNER_DISPLAY_NAME, DEFAULT_PARTNER_DISPLAY_NAME, 'An')).toBe(true);
    expect(shouldUpdateDisplayName('partner_bank_x_cust001', undefined, 'An')).toBe(true); // tên tự sinh của bản cũ
    expect(shouldUpdateDisplayName('An cũ', 'An cũ', 'An mới')).toBe(true);                  // đối tác đổi tên → theo đối tác
  });

  test('KHÔNG ghi đè tên người dùng tự đặt, hoặc khi tên không đổi', () => {
    expect(shouldUpdateDisplayName('Biệt danh của tôi', 'An cũ', 'An mới')).toBe(false);
    expect(shouldUpdateDisplayName('Biệt danh của tôi', undefined, 'An')).toBe(false);
    expect(shouldUpdateDisplayName('An', 'An', 'An')).toBe(false);
  });
});

describe('Partner SSO — user cũ vẫn được nhận ra sau khi nâng cấp tài khoản', () => {
  const synthetic = 'partner_bank_x_cust001@users.tuzi.internal';
  test('dùng email HIỆN TẠI của tài khoản (email thật sau nâng cấp), không dùng lại email giả', () => {
    expect(pickLoginEmail('me@gmail.com', synthetic)).toBe('me@gmail.com');
    expect(pickLoginEmail(synthetic, synthetic)).toBe(synthetic); // chưa nâng cấp
  });
  test('thiếu email thì lùi về email giả', () => {
    expect(pickLoginEmail(null, synthetic)).toBe(synthetic);
    expect(pickLoginEmail(undefined, synthetic)).toBe(synthetic);
    expect(pickLoginEmail('  ', synthetic)).toBe(synthetic);
  });
});
