/**
 * Liên kết ĐẶT LẠI MẬT KHẨU trong email: https://tuzi.vn/reset?token=<64 ký tự hex> (xem Edge Function auth-email, action 'reset').
 * Trả về: null = không phải trang /reset · '' = đúng trang /reset nhưng token thiếu/sai định dạng · chuỗi 64 hex (đã hạ chữ thường) = token.
 */
export function parseResetToken(pathname: string, search: string): string | null {
  if (pathname.replace(/\/+$/, '') !== '/reset') return null;
  const t = new URLSearchParams(search).get('token') ?? '';
  return /^[0-9a-fA-F]{64}$/.test(t) ? t.toLowerCase() : '';
}
