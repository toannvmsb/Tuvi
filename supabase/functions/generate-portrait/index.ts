// Edge Function: generate-portrait
// Vẽ chân dung "người tương hợp" — nhận dữ liệu lá số Tử Vi (cung Phu Thê) + lựa chọn của
// người dùng, dùng OpenAI để soạn prompt vẽ ảnh, rồi gọi Cloudflare Workers AI
// (FLUX.2 [klein] 4B) để vẽ. Chạy ở đây (không phải trên app) để API key
// (OpenAI + Cloudflare) không bao giờ lộ ra client — app chỉ gọi qua
// supabase.functions.invoke(), tự động kèm JWT người dùng.
//
// BẢO MẬT: máy chủ TỰ quyết lượt miễn phí đầu tiên và TỰ TRỪ XU (RPC portrait_begin/portrait_abort, xem supabase_portrait_gate.sql) — trước đây
// chỉ kiểm tra đã đăng nhập, việc trừ xu làm ở client sau khi vẽ nên ai cũng gọi OpenAI + Cloudflare không giới hạn mà không mất xu.
// sessionId làm sạch (đi vào đường dẫn lưu ảnh), giới hạn độ dài ngữ cảnh, KHÔNG trả chi tiết lỗi của nhà cung cấp về client.
//
// Secrets cần set trước khi deploy (xem README trong plan):
//   supabase secrets set OPENAI_API_KEY=... CLOUDFLARE_ACCOUNT_ID=... CLOUDFLARE_API_TOKEN=...
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PortraitRequest {
  sessionId?: string;
  // Ngữ cảnh khí chất/tình duyên (lib/portraitContext.ts) — CHỈ văn bản trừu
  // tượng (ý nghĩa + lời khuyên chủ đề Tình cảm/Hôn nhân/Quý nhân của người
  // ĐÃ QUÉT), không chứa mô tả ngoại hình/tên thật của họ. Có thể rỗng.
  compatibilityContext: string;
  ageWanted: number;
  gender: "male" | "female" | "other";
  hairLength: "short" | "medium" | "long";
  note?: string;
}

// Giá 1 lần vẽ (xu) — PHẢI khớp PREMIUM.COST.portrait ở src/constants/premium.ts.
const PORTRAIT_COST = 30;
const MAX_CONTEXT_CHARS = 4000;
const SAFE_SESSION_ID = /^[A-Za-z0-9_-]{1,64}$/;

const HAIR_LABEL: Record<PortraitRequest["hairLength"], string> = {
  short: "short hair",
  medium: "medium-length hair",
  long: "long hair",
};

const GENDER_LABEL: Record<PortraitRequest["gender"], string> = {
  male: "man",
  female: "woman",
  other: "person",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // Trạng thái cổng (miễn phí / đã trừ xu) — nằm NGOÀI try để catch hoàn lại khi vẽ lỗi.
  let gate: { uid: string; mode: "free" | "paid"; ref: string } | null = null;
  const svcUrl = Deno.env.get("SUPABASE_URL")!;
  const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const svc = createClient(svcUrl, svcKey, { auth: { persistSession: false } });
  const abortGate = async () => {
    if (!gate) return;
    const g = gate; gate = null;
    const { error } = await svc.rpc("portrait_abort", { p_user: g.uid, p_mode: g.mode, p_cost: PORTRAIT_COST, p_ref: g.ref });
    if (error) console.error("[generate-portrait] portrait_abort lỗi (cần hoàn tay):", g.uid, g.ref, error.message);
  };

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Client theo JWT người gọi — chỉ dùng để xác thực + đọc hồ sơ của
    // chính họ (RLS tự chặn nếu không phải hồ sơ của họ).
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await callerClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Chưa đăng nhập." }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const body: PortraitRequest = await req.json();
    // sessionId đi vào ĐƯỜNG DẪN lưu ảnh (service role, bỏ qua RLS) → chỉ nhận ký tự an toàn, ngược lại dùng "session".
    const sessionId = typeof body.sessionId === "string" && SAFE_SESSION_ID.test(body.sessionId) ? body.sessionId : undefined;
    const compatibilityContext = typeof body.compatibilityContext === "string" ? body.compatibilityContext.slice(0, MAX_CONTEXT_CHARS) : "";
    const gender = body.gender in GENDER_LABEL ? body.gender : "other";
    const hairLength = body.hairLength in HAIR_LABEL ? body.hairLength : "medium";
    // Chặn giá trị bất thường: tuổi 18–80, ghi chú tối đa 200 ký tự.
    const ageWanted = Math.min(80, Math.max(18, Math.round(Number(body.ageWanted) || 28)));
    const note = (body.note ?? "").slice(0, 200);

    // CỔNG: lượt miễn phí đầu tiên hoặc TỰ TRỪ XU phía máy chủ (nguyên tử). Từ đây vẽ lỗi phải hoàn lại (abortGate).
    const ref = `portrait:${user.id.slice(0, 8)}:${Date.now()}`;
    const { data: begun, error: beginErr } = await svc.rpc("portrait_begin", { p_user: user.id, p_cost: PORTRAIT_COST, p_ref: ref });
    if (beginErr || !begun || typeof begun.mode !== "string") {
      console.error("[generate-portrait] portrait_begin lỗi:", beginErr?.message);
      return new Response(JSON.stringify({ error: "gate_error" }), { status: 503, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
    }
    if (begun.mode === "insufficient") {
      return new Response(JSON.stringify({ error: "insufficient_xu", balance: begun.balance, cost: PORTRAIT_COST }), {
        status: 402, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    gate = { uid: user.id, mode: begun.mode === "paid" ? "paid" : "free", ref };

    // ---- Bước 1: OpenAI suy luận KHUÔN MẶT tương hợp (1 lần gọi DUY NHẤT) ----
    // App này xem tướng số qua khuôn mặt — khuôn mặt PHẢI là trọng tâm của
    // chân dung vẽ ra, không thể chỉ mô tả trang phục/tư thế chung chung.
    // Nhưng đã kiểm chứng thực tế: nếu để OpenAI tự do viết 1 đoạn prompt tự
    // nhiên, model nhỏ (gpt-4o-mini) rất dễ COPY NGUYÊN VĂN mô tả khuôn mặt
    // gốc thay vì suy luận ra khuôn mặt khác — và tách làm 2 lệnh gọi riêng
    // biệt (suy luận → viết prompt) thì bị Supabase Edge Function trả lỗi
    // WORKER_RESOURCE_LIMIT (vượt giới hạn tài nguyên của 1 lần invoke).
    //
    // GIẢI PHÁP: vẫn 1 LỆNH GỌI DUY NHẤT, nhưng bắt OpenAI trả về JSON CÓ
    // CẤU TRÚC (từng bộ phận khuôn mặt riêng — dáng mặt/mắt/mũi/mày/gò má+
    // hàm) thay vì viết văn tự do. Đây là dạng bài "phân loại/đối ứng" mà
    // model nhỏ tuân thủ tốt hơn NHIỀU so với "viết 1 đoạn văn sáng tạo" —
    // và quy tắc "mỗi giá trị PHẢI khác giá trị tương ứng ở đầu vào" áp dụng
    // được CHÍNH XÁC theo từng trường. Sau đó CHÍNH CODE (không phải AI) ráp
    // JSON đó thành prompt cuối — nên bước "viết prompt" không còn là một
    // bước sáng tạo tự do dễ trôi về copy nữa.
    const openaiKey = Deno.env.get("OPENAI_API_KEY")!;
    const openaiModel = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";

    const genderLabel = GENDER_LABEL[gender] ?? "person";
    const hairLabel = HAIR_LABEL[hairLength] ?? "medium-length hair";

    const contextBlock = compatibilityContext?.trim()
      ? `Dữ liệu lá số Tử Vi của người xem:\n${compatibilityContext.trim()}`
      : "Không có dữ liệu lá số chi tiết.";

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: openaiModel,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Bạn là chuyên gia Tử Vi Nam Phái. Dữ liệu đầu vào gồm: (1) các sao cung Phu Thê + gợi ý diện mạo/hình dáng người tương hợp suy từ các sao đó; (2) ngoại hình CHỦ LÁ SỐ suy từ sao cung Mệnh và ngũ hành; (3) khí chất/dụng thần. " +
              "Hãy suy ra NGOẠI HÌNH cụ thể của một NGƯỜI KHÁC — người bạn đời/đối tác tương hợp: bám sát gợi ý diện mạo của các sao Phu Thê (dáng người, khuôn mặt), đồng thời theo nguyên lý BỔ TRỢ/HÀI HÒA với chủ lá số (không sao chép ngoại hình của chủ lá số). Mỗi lá số khác nhau phải cho ra bộ đặc điểm khác nhau rõ rệt; tránh chọn lại những lựa chọn phổ biến/an toàn nhất. Đây chỉ là gợi ý tham khảo, giải trí. " +
              "Trả về DUY NHẤT 1 JSON hợp lệ (không markdown, không giải thích) đúng cấu trúc: " +
              '{"ethnicity":"quốc tịch/sắc tộc của người trong ảnh, tiếng Anh — MẶC ĐỊNH \'Vietnamese\' trừ khi ghi chú của người dùng nêu RÕ một quốc tịch/sắc tộc khác (vd \'Korean\',\'Japanese\',\'Western\'); một địa danh Việt Nam trong ghi chú (Hà Nội, Sài Gòn, Huế…) vẫn trả \'Vietnamese\'","faceShape":"hình dáng khuôn mặt, tiếng Anh","build":"vóc dáng/thể hình, tiếng Anh, vd slender, athletic, broad-shouldered, petite, full-figured","skin":"tông da, tiếng Anh, phù hợp với ethnicity đã chọn","hair":"màu và kiểu tóc chi tiết phù hợp độ dài đã chọn, tiếng Anh","eyes":"mô tả ngắn đôi mắt, tiếng Anh","nose":"mô tả ngắn mũi, tiếng Anh","eyebrows":"mô tả ngắn lông mày, tiếng Anh","lipsAndSmile":"môi và nụ cười, tiếng Anh","cheekbonesAndJaw":"mô tả ngắn gò má và hàm, tiếng Anh","mood":"khí chất tổng thể, 2-4 từ tiếng Anh"}' +
              " " +
              "Không nhắc tên riêng, không phán đoán tuyệt đối. Nếu thiếu dữ liệu, tự chọn một bộ đặc điểm hài hoà, dễ mến (vẫn mặc định ethnicity Vietnamese).",
          },
          {
            role: "user",
            content:
              `Giới tính người trong ảnh: ${genderLabel}\n` +
              (note?.trim() ? `Ghi chú thêm từ người dùng: ${note.trim()}\n` : "") +
              contextBlock,
          },
        ],
        temperature: 1.0,
        max_tokens: 400,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      throw new Error(`OpenAI lỗi (${openaiRes.status}): ${errText}`);
    }
    const openaiJson = await openaiRes.json();
    const rawContent: string = openaiJson.choices?.[0]?.message?.content?.trim();
    if (!rawContent) throw new Error("OpenAI không trả về nội dung.");

    let face: {
      ethnicity?: string; faceShape?: string; build?: string; skin?: string; hair?: string; eyes?: string; nose?: string;
      eyebrows?: string; lipsAndSmile?: string; cheekbonesAndJaw?: string; mood?: string;
    };
    try {
      face = JSON.parse(rawContent);
    } catch {
      throw new Error(`OpenAI trả về JSON không hợp lệ: ${rawContent}`);
    }

    // ---- CODE (không phải AI) ráp JSON thành prompt cuối — bước này là ----
    // ---- template cố định, không có chỗ cho việc "sáng tạo" trôi dạt. ----
    const faceBits = [
      face.faceShape && `a ${face.faceShape} face`,
      face.skin && `${face.skin} skin`,
      face.eyes,
      face.nose,
      face.eyebrows,
      face.lipsAndSmile,
      face.cheekbonesAndJaw,
    ].filter(Boolean).join(", ");

    // Đa dạng hóa: ngay cả cùng 1 lá số, mỗi lần vẽ chọn ngẫu nhiên bối cảnh/trang phục/góc chụp/ánh sáng
    // để ảnh không trùng lặp (phần khuôn mặt/vóc dáng vẫn bám theo lá số).
    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const outfit = pick([
      "a crisp white shirt", "a soft knit sweater", "a tailored blazer", "a casual denim jacket", "a simple linen shirt",
      "an elegant dark turtleneck", "a light cardigan over a plain tee", "a traditional-inspired modern collar top",
    ]);
    const backdrop = pick([
      "a softly blurred cafe interior", "a neutral warm-grey studio backdrop", "a sunlit window with sheer curtains",
      "a green garden bokeh", "a modern office with soft blur", "a golden-hour city street bokeh", "a calm bookshelf background",
    ]);
    const lighting = pick([
      "soft window light", "warm golden-hour light", "gentle studio key light with subtle rim light", "diffused overcast daylight",
    ]);
    const angle = pick([
      "a slight three-quarter angle", "a straight-on framing", "a gentle head tilt", "a relaxed candid pose",
    ]);
    const extra = pick(["", "", "", "wearing thin-framed glasses", "with a subtle earring", "with a light stubble", "with a small beauty mark"]);

    // Mặc định "Vietnamese" nếu OpenAI không trả (hoặc trả rỗng) — ethnicity là đòn bẩy quan trọng
    // nhất để FLUX vẽ đúng vùng miền thay vì mặc định ra khuôn mặt phương Tây.
    const ethnicity = face.ethnicity?.trim() || "Vietnamese";

    const imagePrompt =
      `Photorealistic portrait photograph of a ${ageWanted}-year-old ${ethnicity} ${genderLabel}, ${face.build ? `${face.build} build, ` : ""}` +
      `with ${face.hair || hairLabel} (${hairLabel}), ` +
      `featuring ${faceBits || "a warm, harmonious face"}, with a ${face.mood || "warm and friendly"} expression` +
      `${extra ? `, ${extra}` : ""}. ` +
      `Wearing ${outfit}, ${angle}, ${lighting}, against ${backdrop}. Half-body composition, natural skin texture, sharp focus.` +
      (note?.trim() ? ` ${note.trim()}` : "");

    // ---- Bước 2: Cloudflare Workers AI vẽ ảnh (FLUX.2 klein 4B) ----
    const cfAccountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID")!;
    const cfToken = Deno.env.get("CLOUDFLARE_API_TOKEN")!;

    // Model này bắt buộc multipart/form-data (kể cả khi chỉ có prompt) — để
    // fetch tự sinh header Content-Type kèm boundary, KHÔNG tự set thủ công.
    const form = new FormData();
    form.append("prompt", imagePrompt);
    form.append("width", "1024");
    form.append("height", "1024");

    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/@cf/black-forest-labs/flux-2-klein-4b`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfToken}`,
        },
        body: form,
      }
    );

    if (!cfRes.ok) {
      const errText = await cfRes.text();
      throw new Error(`Cloudflare Workers AI lỗi (${cfRes.status}): ${errText}`);
    }
    const cfJson = await cfRes.json();
    const base64Image: string = cfJson.result?.image;
    if (!base64Image) throw new Error("Cloudflare không trả về ảnh.");

    // ---- Bước 3: Upload ảnh lên Storage (service role — bỏ qua RLS) ----
    const adminClient = svc;

    // Decode base64 → bytes bằng vòng for thuần (KHÔNG dùng Uint8Array.from(str, cb) — mapFn gọi 1
    // callback riêng cho MỖI ký tự, với ảnh 1024x1024 (base64 ~1-2 triệu ký tự) tốn CPU-time đáng
    // kể trên Edge Function runtime, từng gây lỗi WORKER_RESOURCE_LIMIT ngẫu nhiên khi ảnh sinh ra
    // hơi nặng — vòng for gán thẳng bytes[i] nhanh hơn nhiều lần, không đổi kết quả.
    const binaryImage = atob(base64Image);
    const bytes = new Uint8Array(binaryImage.length);
    for (let i = 0; i < binaryImage.length; i++) bytes[i] = binaryImage.charCodeAt(i);
    const path = `${user.id}/${sessionId ?? "session"}_${Date.now()}.png`;

    const { error: uploadError } = await adminClient.storage
      .from("portraits")
      .upload(path, bytes, { contentType: "image/png", upsert: false });
    if (uploadError) throw uploadError;

    const { data: publicUrlData } = adminClient.storage.from("portraits").getPublicUrl(path);
    const imageUrl = publicUrlData.publicUrl;

    const done = gate as { mode: "free" | "paid" } | null;
    gate = null; // thành công → không hoàn
    return new Response(JSON.stringify({
      imageUrl, free: done?.mode === "free",
      ...(done?.mode === "paid" ? { charged: PORTRAIT_COST, balance: begun.balance } : {}),
    }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[generate-portrait]", e);
    await abortGate();
    // Không trả chi tiết lỗi của OpenAI/Cloudflare (có thể chứa một phần khóa/thông tin nội bộ) về client.
    return new Response(JSON.stringify({ error: "portrait_failed" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
