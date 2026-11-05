/**
 * Supabase Edge Function — XÁC THỰC biên nhận IAP & cộng xu.
 *
 * Client (lib/iap.ts) gọi: supabase.functions.invoke('iap-verify', { body }).
 * supabase-js tự đính kèm JWT của user trong header Authorization → ta lấy ra
 * user id, XÁC THỰC biên nhận với Apple/Google, rồi cộng xu (idempotent) qua RPC.
 *
 * Triển khai:
 *   supabase functions deploy iap-verify
 *   # Secrets cho xác thực store (BẮT BUỘC điền trước khi bật IAP cho bản phát hành —
 *   # thiếu secret nào thì xác thực nền tảng đó LUÔN TỪ CHỐI, không bao giờ tự chấp nhận):
 *   supabase secrets set APPLE_SHARED_SECRET=...          # iOS (App Store Connect → shared secret)
 *   supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON=...  # Android (Play Console → service account JSON, dán nguyên văn)
 *   supabase secrets set ANDROID_PACKAGE_NAME=com.yourapp
 *
 * SỬA LỖI BẢO MẬT: verifyApple/verifyGoogle trước đây là SKELETON luôn trả `{ok:true}` — bất kỳ
 * user đăng nhập nào cũng có thể tự bịa receipt để cộng xu miễn phí (tối đa 5000 xu/lần, gọi lại
 * bao nhiêu lần cũng được). Giờ gọi THẬT App Store / Google Play Developer API.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { compactVerify, importX509 } from 'npm:jose@5';
import { X509Certificate } from 'npm:@peculiar/x509@1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

// Bản đồ sản phẩm → xu (đặt PHÍA SERVER để không tin số xu do client gửi).
// Có 2 bộ ID: Android giữ nguyên "xu_*" (constants/payment.ts XU_PACKS.productId), iOS dùng
// riêng "ios_xu_*" (XU_PACKS.iosProductId, tạo lại trên App Store Connect) — thiếu bộ ios_xu_*
// khiến MỌI giao dịch iOS bị từ chối ở bước "unknown_product" dù Apple đã xác thực đúng receipt.
const XU_BY_PRODUCT: Record<string, number> = {
  xu_100: 100, xu_200: 200, xu_500: 500,
  xu_1000: 1000, xu_2000: 2000, xu_5000: 5000,
  ios_xu_100: 100, ios_xu_200: 200, ios_xu_500: 500,
  ios_xu_1000: 1000, ios_xu_2000: 2000, ios_xu_5000: 5000,
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json' } });

/** Xác thực biên nhận iOS qua App Store `verifyReceipt` (thử production trước, fallback sandbox
 * khi Apple trả status 21007 — receipt sandbox gửi nhầm endpoint production). */
/** SHA-256 của Apple Root CA - G3 (gốc tin cậy của chữ ký StoreKit 2). */
const APPLE_ROOT_G3_SHA256 = '63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c756f3017b3a8c488c3653e9179';
const IOS_BUNDLE_ID = Deno.env.get('IOS_BUNDLE_ID') ?? 'com.tuzi.app';

const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

/** Xác thực giao dịch StoreKit 2 (JWS): chuỗi chứng chỉ x5c phải kết thúc ở Apple Root CA G3,
 * chữ ký hợp lệ, đúng bundle + sản phẩm. Trả transactionId của Apple. */
async function verifyAppleJws(jws: string, productId: string): Promise<{ ok: boolean; txnId?: string }> {
  try {
    const header = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(jws.split('.')[0].replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))));
    const x5c: string[] = header.x5c ?? [];
    if (header.alg !== 'ES256' || x5c.length < 2) return { ok: false };
    const certs = x5c.map(c => new X509Certificate(c));
    // Gốc phải đúng Apple Root CA G3.
    const root = certs[certs.length - 1];
    if (toHex(await crypto.subtle.digest('SHA-256', root.rawData)) !== APPLE_ROOT_G3_SHA256) return { ok: false };
    // Mỗi chứng chỉ phải do chứng chỉ kế tiếp ký, và còn hạn.
    const now = new Date();
    for (let i = 0; i < certs.length; i++) {
      if (now < certs[i].notBefore || now > certs[i].notAfter) return { ok: false };
      const issuer = certs[i + 1] ?? certs[i];
      if (!(await certs[i].verify({ publicKey: issuer.publicKey, signatureOnly: true }))) return { ok: false };
    }
    const key = await importX509(`-----BEGIN CERTIFICATE-----
${x5c[0]}
-----END CERTIFICATE-----`, 'ES256');
    const { payload } = await compactVerify(jws, key);
    const t = JSON.parse(new TextDecoder().decode(payload));
    if (t.bundleId !== IOS_BUNDLE_ID || t.productId !== productId || t.revocationDate) return { ok: false };
    return t.transactionId ? { ok: true, txnId: String(t.transactionId) } : { ok: false };
  } catch (e) {
    console.error('[iap-verify] JWS lỗi:', (e as Error)?.message);
    return { ok: false };
  }
}

async function verifyApple(receipt: string, productId: string): Promise<{ ok: boolean; txnId?: string }> {
  // StoreKit 2 (expo-iap): purchaseToken là JWS 3 phần; biên nhận cũ (verifyReceipt) là base64 thường.
  if (/^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(receipt)) return verifyAppleJws(receipt, productId);
  const sharedSecret = Deno.env.get('APPLE_SHARED_SECRET') ?? '';
  if (!receipt || !sharedSecret) return { ok: false };
  const body = JSON.stringify({ 'receipt-data': receipt, password: sharedSecret, 'exclude-old-transactions': true });
  const call = async (url: string) => {
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body });
      return await res.json();
    } catch { return null; }
  };
  let j = await call('https://buy.itunes.apple.com/verifyReceipt');
  if (j?.status === 21007) j = await call('https://sandbox.itunes.apple.com/verifyReceipt');
  if (!j || j.status !== 0) return { ok: false };
  const items = [...(j.receipt?.in_app ?? []), ...(j.latest_receipt_info ?? [])];
  const match = items.find((it: any) => it?.product_id === productId);
  if (!match?.transaction_id) return { ok: false };
  return { ok: true, txnId: String(match.transaction_id) };
}

function base64url(input: Uint8Array | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s+/g, '');
  const raw = atob(b64);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf.buffer;
}

/** Lấy OAuth2 access token cho service account (JWT Bearer flow) để gọi Android Publisher API. */
async function getGoogleAccessToken(): Promise<string | null> {
  const saJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
  if (!saJson) return null;
  try {
    const sa = JSON.parse(saJson);
    const now = Math.floor(Date.now() / 1000);
    const encHeader = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const encClaims = base64url(JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now, exp: now + 3600,
    }));
    const signInput = `${encHeader}.${encClaims}`;
    const key = await crypto.subtle.importKey(
      'pkcs8', pemToArrayBuffer(sa.private_key),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'],
    );
    const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signInput));
    const jwt = `${signInput}.${base64url(new Uint8Array(sig))}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${jwt}`,
    });
    const j = await res.json();
    return j?.access_token ?? null;
  } catch { return null; }
}

/** Xác thực biên nhận Android qua Google Play Developer API (androidpublisher). */
async function verifyGoogle(purchaseToken: string, productId: string): Promise<{ ok: boolean; txnId?: string }> {
  const packageName = Deno.env.get('ANDROID_PACKAGE_NAME') ?? '';
  if (!purchaseToken || !packageName) return { ok: false };
  const accessToken = await getGoogleAccessToken();
  if (!accessToken) return { ok: false };
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`;
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) return { ok: false };
    const j = await res.json();
    if (j?.purchaseState !== 0) return { ok: false }; // 0 = đã mua; 1 = đã hủy; 2 = đang chờ
    return { ok: true, txnId: String(j.orderId ?? purchaseToken) };
  } catch { return { ok: false }; }
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
