/**
 * Supabase Edge Function — WEBHOOK đối soát chuyển khoản (SePay).
 *
 * Khi tài khoản ngân hàng nhận tiền, SePay POST JSON về đây. Hàm này:
 *  1) Xác thực header  Authorization: Apikey <SEPAY_API_KEY>.
 *  2) Chỉ xử lý giao dịch TIỀN VÀO (transferType === 'in').
 *  3) Tách MÃ ĐƠN (vd TUVIxxxxxx) từ nội dung chuyển khoản.
 *  4) Gọi RPC credit_topup() bằng SERVICE ROLE để cộng xu (idempotent).
 *
 * Triển khai:
 *   supabase functions deploy sepay-webhook --no-verify-jwt
 *   supabase secrets set SEPAY_API_KEY=<khóa-bạn-tự-đặt-trong-SePay>
 * (SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY do nền tảng tự cấp.)
 *
 * Cấu hình bên SePay: Webhook URL = https://<project>.functions.supabase.co/sepay-webhook
 * và đặt API Key trùng với SEPAY_API_KEY ở trên.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SEPAY_API_KEY = Deno.env.get('SEPAY_API_KEY') ?? '';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  // 1) Xác thực webhook (SePay gửi: Authorization: Apikey <key>)
  const auth = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  if (!SEPAY_API_KEY || auth !== `Apikey ${SEPAY_API_KEY}`) {
    return json({ error: 'unauthorized' }, 401);
  }

  let p: any;
  try { p = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }

  // 2) Chỉ xử lý tiền VÀO — bỏ qua nếu field vắng mặt hoặc không phải 'in'
  const type = String(p.transferType ?? '').toLowerCase();
  if (type !== 'in') return json({ ok: true, skipped: 'not_incoming' });

  const amount = Number(p.transferAmount ?? p.amount ?? 0);
  const content = String(p.content ?? p.description ?? '').toUpperCase();
  const bankTxId = String(p.referenceCode ?? p.id ?? p.transactionDate ?? '');

  // 3) Tách mã đơn dạng TUVI + 6 ký tự [0-9A-Z]
  const m = content.match(/TUVI[0-9A-Z]{6}/);
  if (!m) return json({ ok: true, skipped: 'no_code', content });
  const code = m[0];

  // 4) Cộng xu (idempotent) qua RPC với service role
  const supa = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data, error } = await supa.rpc('credit_topup', {
    p_code: code, p_amount_vnd: amount, p_bank_tx_id: bankTxId,
  });
  if (error) return json({ error: error.message }, 500);

  // 5) Nếu cộng xu thành công → đẩy PUSH cho chủ đơn (nếu có token)
  if (data === 'paid') {
    try {
      const { data: o } = await supa.from('topup_orders').select('user_id, xu').eq('code', code).single();
      if (o?.user_id) {
        const { data: p } = await supa.from('profiles').select('expo_push_token').eq('id', o.user_id).single();
        const token = p?.expo_push_token;
        if (token) {
          await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              to: token,
              title: 'Nạp xu thành công 🎉',
              body: `Đã cộng ${Number(o.xu).toLocaleString('vi-VN')} xu vào tài khoản của bạn.`,
              sound: 'default',
            }),
          });
        }
      }
    } catch { /* push lỗi không ảnh hưởng việc cộng xu */ }
  }

  return json({ ok: true, code, result: data });
});
