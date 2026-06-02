/**
 * Supabase Edge Function — XÁC THỰC biên nhận IAP & cộng xu.
 *
 * Client (lib/iap.ts) gọi: supabase.functions.invoke('iap-verify', { body }).
 * supabase-js tự đính kèm JWT của user trong header Authorization → ta lấy ra
 * user id, XÁC THỰC biên nhận với Apple/Google, rồi cộng xu (idempotent) qua RPC.
 *
 * Triển khai:
 *   supabase functions deploy iap-verify
 *   # Secrets cho xác thực store (điền khi hoàn thiện):
 *   supabase secrets set APPLE_SHARED_SECRET=...        # iOS (App Store)
 *   supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON=...  # Android (Play)
 *   supabase secrets set ANDROID_PACKAGE_NAME=com.yourapp
 *
 * ⚠ Phần verifyApple / verifyGoogle hiện là SKELETON — TRƯỚC KHI PHÁT HÀNH
 *   phải hoàn thiện gọi API store thật để chống gian lận.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

// Bản đồ sản phẩm → xu (đặt PHÍA SERVER để không tin số xu do client gửi).
const XU_BY_PRODUCT: Record<string, number> = {
  xu_100: 100, xu_200: 200, xu_500: 500,
  xu_1000: 1000, xu_2000: 2000, xu_5000: 5000,
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json' } });

/** TODO: xác thực biên nhận iOS qua App Store (verifyReceipt / App Store Server API). */
async function verifyApple(_receipt: string, _productId: string): Promise<{ ok: boolean; txnId?: string }> {
  // const sharedSecret = Deno.env.get('APPLE_SHARED_SECRET');
  // Gọi https://buy.itunes.apple.com/verifyReceipt (fallback sandbox), kiểm tra
  // product_id khớp + transaction_id, trả { ok, txnId }.
  // SKELETON: tạm chấp nhận để test luồng (PHẢI thay bằng xác thực thật khi phát hành).
  return { ok: true };
}

/** TODO: xác thực biên nhận Android qua Google Play Developer API. */
async function verifyGoogle(_purchaseToken: string, _productId: string): Promise<{ ok: boolean; txnId?: string }> {
  // Dùng GOOGLE_SERVICE_ACCOUNT_JSON lấy access token → gọi
  // androidpublisher purchases.products.get(packageName, productId, purchaseToken)
  // kiểm tra purchaseState=0 (purchased), trả { ok, txnId: orderId }.
  // SKELETON: tạm chấp nhận để test luồng.
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  // 1) Lấy user từ JWT đính kèm
  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: 'unauthorized' }, 401);

  // 2) Đọc body
  let p: any;
  try { p = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const platform = String(p.platform || '');
  const productId = String(p.productId || '');
  const xu = XU_BY_PRODUCT[productId];
  if (!xu) return json({ error: 'unknown_product', productId }, 400);

  // 3) Xác thực biên nhận với store
  let v: { ok: boolean; txnId?: string };
  if (platform === 'ios') v = await verifyApple(String(p.receipt || ''), productId);
  else if (platform === 'android') v = await verifyGoogle(String(p.purchaseToken || ''), productId);
  else return json({ error: 'unknown_platform' }, 400);
  if (!v.ok) return json({ error: 'invalid_receipt' }, 400);

  const txnId = v.txnId || String(p.transactionId || '');
  if (!txnId) return json({ error: 'missing_transaction_id' }, 400);

  // 4) Cộng xu (idempotent) bằng service role
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data, error } = await admin.rpc('credit_iap', {
    p_user: user.id, p_platform: platform, p_product: productId, p_xu: xu, p_txn: txnId,
  });
  if (error) return json({ error: error.message }, 500);

  return json({ ok: true, balance: data, xu, productId });
});
