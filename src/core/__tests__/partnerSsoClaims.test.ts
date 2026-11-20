import {
  checkTokenTiming, MAX_CLOCK_SKEW_SEC, MAX_LIFETIME_SEC, MAX_TOKEN_AGE_SEC,
} from '../../../supabase/functions/partner-sso/claims';

const NOW = 1_800_000_000;

describe('Partner SSO — luật thời gian của token', () => {
  test('hợp lệ: iat=now, exp=now+60', () => {
    expect(checkTokenTiming({ iat: NOW, exp: NOW + 60 }, NOW)).toBeNull();
  });
  test('hợp lệ: iat lệch đồng hồ nhỏ về tương lai và sát tuổi tối đa', () => {
    expect(checkTokenTiming({ iat: NOW + MAX_CLOCK_SKEW_SEC, exp: NOW + MAX_CLOCK_SKEW_SEC + 60 }, NOW)).toBeNull();
    expect(checkTokenTiming({ iat: NOW - MAX_TOKEN_AGE_SEC, exp: NOW - MAX_TOKEN_AGE_SEC + 200 }, NOW)).toBeNull();
  });
  test('thiếu iat hoặc exp bị từ chối', () => {
    expect(checkTokenTiming({ exp: NOW + 60 }, NOW)).toBe('missing_iat');
    expect(checkTokenTiming({ iat: NOW }, NOW)).toBe('missing_exp');
    expect(checkTokenTiming({ iat: 'x', exp: NOW + 60 }, NOW)).toBe('missing_iat');
    expect(checkTokenTiming({ iat: NOW, exp: Number.NaN }, NOW)).toBe('missing_exp');
  });
  test('LỖI ĐÃ SỬA: iat ở tương lai xa không còn hợp lệ mãi', () => {
    expect(checkTokenTiming({ iat: NOW + 365 * 86400, exp: NOW + 365 * 86400 + 60 }, NOW)).toBe('iat_in_future');
    expect(checkTokenTiming({ iat: NOW + MAX_CLOCK_SKEW_SEC + 1, exp: NOW + 200 }, NOW)).toBe('iat_in_future');
  });
  test('token quá cũ, exp trước/bằng iat, sống quá lâu', () => {
    expect(checkTokenTiming({ iat: NOW - MAX_TOKEN_AGE_SEC - 1, exp: NOW + 600 }, NOW)).toBe('token_too_old');
    expect(checkTokenTiming({ iat: NOW, exp: NOW }, NOW)).toBe('exp_before_iat');
    expect(checkTokenTiming({ iat: NOW, exp: NOW - 5 }, NOW)).toBe('exp_before_iat');
    expect(checkTokenTiming({ iat: NOW, exp: NOW + MAX_LIFETIME_SEC + 1 }, NOW)).toBe('lifetime_too_long');
    expect(checkTokenTiming({ iat: NOW, exp: NOW + MAX_LIFETIME_SEC }, NOW)).toBeNull();
  });
});
