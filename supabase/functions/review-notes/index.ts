// Edge Function: review-notes
// Ghi chú ≤500 ký tự cho từng năm của "Dòng đời đã qua". Nội dung được MÃ HÓA at-rest bằng AES-GCM,
// khóa riêng từng người = HKDF-SHA256(secret REVIEW_NOTES_KEY, salt = user_id). Bảng past_review_notes
// không có policy nào cho client → chỉ function này (service_role) đọc/ghi được.
//
// Giới hạn trung thực: máy chủ giải mã được (đây KHÔNG phải mã hóa đầu-cuối); mục đích là dữ liệu nằm
// trong DB luôn ở dạng mã hóa và chạy đồng nhất web/mobile. MẤT secret REVIEW_NOTES_KEY = MẤT ghi chú:
// bản sao lưu nằm ngoài git ở .secrets/ (xem CLAUDE.md §11).
//
// Secret: supabase secrets set REVIEW_NOTES_KEY=<chuỗi ngẫu nhiên ≥32 ký tự>
// Actions (POST JSON): { action:'save', chartId, year, text, lifeArea?, id? } · { action:'list', chartId } · { action:'delete', id }
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const MAX_LEN = 500;
const MAX_NOTES_PER_USER = 500;
const AREAS = ["career", "home", "love", "wealth", "family"];
const enc = new TextEncoder();
const dec = new TextDecoder();

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function userKey(userId: string): Promise<CryptoKey> {
  const secret = Deno.env.get("REVIEW_NOTES_KEY");
  if (!secret || secret.length < 32) throw new Error("server_not_configured");
  const ikm = await crypto.subtle.importKey("raw", enc.encode(secret), "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: enc.encode(userId), info: enc.encode("review-notes-v1") },
    ikm, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"],
  );
}

async function encrypt(userId: string, text: string): Promise<string> {
  const key = await userKey(userId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(text)));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv);
  out.set(ct, iv.length);
  return b64(out);
}

async function decrypt(userId: string, blob: string): Promise<string> {
  const key = await userKey(userId);
  const raw = unb64(blob);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: raw.slice(0, 12) }, key, raw.slice(12));
  return dec.decode(pt);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return json({ error: "Chưa đăng nhập." }, 401);
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const body = await req.json();
    const action = String(body?.action ?? "");

    if (action === "list") {
      const chartId = String(body.chartId ?? "");
      const { data, error } = await admin.from("past_review_notes")
        .select("id, year, life_area, note_enc, created_at, updated_at")
        .eq("user_id", user.id).eq("chart_id", chartId)
        .order("year", { ascending: true }).order("created_at", { ascending: true });
      if (error) return json({ error: error.message }, 500);
      const notes = [];
      for (const r of data ?? []) {
        try {
          notes.push({ id: r.id, year: r.year, lifeArea: r.life_area, text: await decrypt(user.id, r.note_enc), updatedAt: r.updated_at });
        } catch { /* không giải mã được (khóa đã đổi) → bỏ qua dòng này */ }
      }
      return json({ notes });
    }

    if (action === "save") {
      const chartId = String(body.chartId ?? "");
      const year = Math.round(Number(body.year));
      const text = String(body.text ?? "").trim();
      const lifeArea = body.lifeArea == null || body.lifeArea === "" ? null : String(body.lifeArea);
      if (!chartId) return json({ error: "Thiếu lá số." }, 400);
      if (!Number.isFinite(year) || year < 1850 || year > 2200) return json({ error: "Năm không hợp lệ." }, 400);
      if (!text) return json({ error: "Ghi chú đang trống." }, 400);
      if (text.length > MAX_LEN) return json({ error: `Ghi chú tối đa ${MAX_LEN} ký tự.` }, 400);
      if (lifeArea && !AREAS.includes(lifeArea)) return json({ error: "Nhãn mảng không hợp lệ." }, 400);

      // Chỉ ghi cho lá số CỦA CHÍNH MÌNH.
      const { data: chart } = await admin.from("charts").select("id").eq("id", chartId).eq("user_id", user.id).maybeSingle();
      if (!chart) return json({ error: "Không tìm thấy lá số." }, 404);

      const note_enc = await encrypt(user.id, text);
      if (body.id) {
        const { data, error } = await admin.from("past_review_notes")
          .update({ note_enc, life_area: lifeArea, year, updated_at: new Date().toISOString() })
          .eq("id", String(body.id)).eq("user_id", user.id).eq("chart_id", chartId).select("id").maybeSingle();
        if (error) return json({ error: error.message }, 500);
        if (!data) return json({ error: "Không tìm thấy ghi chú." }, 404);
        return json({ id: data.id });
      }
      const { count } = await admin.from("past_review_notes").select("id", { count: "exact", head: true }).eq("user_id", user.id);
      if ((count ?? 0) >= MAX_NOTES_PER_USER) return json({ error: "Đã đạt số ghi chú tối đa." }, 400);
      const { data, error } = await admin.from("past_review_notes")
        .insert({ user_id: user.id, chart_id: chartId, year, life_area: lifeArea, note_enc }).select("id").single();
      if (error) return json({ error: error.message }, 500);
      return json({ id: data.id });
    }

    if (action === "delete") {
      const { error } = await admin.from("past_review_notes").delete().eq("id", String(body.id ?? "")).eq("user_id", user.id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    return json({ error: "Hành động không hợp lệ." }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg === "server_not_configured" ? "Máy chủ chưa cấu hình." : "Có lỗi, vui lòng thử lại." }, 500);
  }
});
