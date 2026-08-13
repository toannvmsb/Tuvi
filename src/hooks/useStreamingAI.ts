/**
 * Hook dùng chung cho phân tích AI dạng STREAMING theo từng phần (section).
 *
 * - Mỗi mục (đại vận / năm tiểu vận / bát tự…) định danh bằng `id` (số).
 * - Gọi TẤT CẢ section SONG SONG, ghép kết quả THEO THỨ TỰ; phần đầu xong →
 *   hiện ngay (đánh máy), phần sau tải nền → giảm độ trễ.
 * - LƯU theo MẢNG từng phần (parts[]): phần nào lỗi = null.
 * - Nếu còn phần thiếu → KHÔNG cache; cung cấp `retryMissing` để CHỈ gọi lại
 *   các prompt chưa có kết quả (KHÔNG trừ xu thêm). Khi đủ tất cả phần mới cache.
 */
import { useRef, useState, useEffect } from 'react';
import { getAiResult, setAiResult, clearAiResult } from '../lib/aiResults';
import { confirmAndUnlock, confirmReanalyze } from '../lib/confirmCharge';
import { PREMIUM } from '../constants/premium';
import { runWithConcurrency } from '../lib/concurrency';

// Bắn quá nhiều phần AI cùng lúc (vd Bát Tự 9 phần) làm chạm rate limit của key
// dùng chung phía server → hàng loạt phần lỗi/bị cắt ngắn. Giới hạn 3 lượt cùng lúc.
const AI_SECTION_CONCURRENCY = 3;

export type AiEntry = {
  status: 'idle' | 'loading' | 'done' | 'error';
  text: string;            // dùng cho thông báo lỗi
  shown?: string;          // phần đã "đánh máy" ra
  fetchingMore?: boolean;  // còn đang tải lần đầu
  retrying?: boolean;      // đang lấy lại phần còn thiếu
  missing?: number;        // số phần CHƯA lấy được (>0 → hiện nút lấy lại miễn phí)
};

export type Section = { title: string; run: () => Promise<string> };

const STEP = 24, TICK = 35;   // ~685 ký tự/giây

const placeholderOf = (title: string) =>
  `\n# ${title}\n_(Phần này chưa lấy được kết quả — bấm "Lấy lại phần còn thiếu" bên dưới.)_`;

export function useStreamingAI() {
  const [ai, setAi] = useState<Record<number, AiEntry>>({});
  const textRefs = useRef<Record<number, string>>({});
  const partsRef = useRef<Record<number, (string | null)[]>>({});   // kết quả từng phần (null = thiếu)
  const sectionsRef = useRef<Record<number, Section[]>>({});         // sections để retry
  const keyRef = useRef<Record<number, string>>({});                // khóa cache theo id
  const doneRefs = useRef<Record<number, boolean>>({});
  const revealRefs = useRef<Record<number, ReturnType<typeof setInterval> | null>>({});

  useEffect(() => () => {
    Object.values(revealRefs.current).forEach(t => { if (t) clearInterval(t); });
  }, []);

  const startReveal = (id: number) => {
    if (revealRefs.current[id]) return;
    let i = 0;
    revealRefs.current[id] = setInterval(() => {
      const full = textRefs.current[id] || '';
      if (i < full.length) {
        i = Math.min(full.length, i + STEP);
        const slice = full.slice(0, i);
        setAi(s => ({ ...s, [id]: { ...(s[id] || { status: 'done', text: '' }), shown: slice } }));
      } else if (doneRefs.current[id]) {
        const t = revealRefs.current[id];
        if (t) { clearInterval(t); revealRefs.current[id] = null; }
      }
    }, TICK);
  };

  /** Ghép text đầy đủ từ mảng parts (phần thiếu → placeholder). */
  const buildText = (id: number): string => {
    const parts = partsRef.current[id] || [];
    const secs = sectionsRef.current[id] || [];
    return parts.map((p, i) => p ?? placeholderOf(secs[i]?.title || `Phần ${i + 1}`)).join('\n\n');
  };
  const countMissing = (id: number) => (partsRef.current[id] || []).filter(p => p == null).length;

  /** Hiện kết quả đã cache (miễn phí) nếu có. Trả về true nếu đã hiện. */
  const showCached = (id: number, key: string): boolean => {
    const cached = getAiResult(key);
    if (!cached) return false;
    textRefs.current[id] = cached; doneRefs.current[id] = true;
    partsRef.current[id] = [cached]; // coi như đủ, không thiếu
    keyRef.current[id] = key;
    setAi(s => ({ ...s, [id]: { status: 'done', text: '', shown: cached, fetchingMore: false, missing: 0 } }));
    return true;
  };

  /** Chạy 1 section với retry 1 lần. */
  const runSectionResilient = async (sec: Section): Promise<string> => {
    let lastErr: any;
    for (let attempt = 0; attempt < 2; attempt++) {
      try { return await sec.run(); }
      catch (e) { lastErr = e; }
    }
    throw lastErr;
  };

  const settle = (p: Promise<string>) =>
    p.then((v) => ({ ok: true as const, v }), (e) => ({ ok: false as const, e }));

  /**
   * Bắt đầu phân tích cho `id`. Tự xử lý cache + xác nhận trừ xu.
   * `force` = "Phân tích lại" (trừ xu, bỏ cache cũ).
   */
  const run = async (id: number, key: string, sections: Section[], force = false, cost: number = PREMIUM.COST.ai) => {
    if (!force && showCached(id, key)) return;

    const r = force ? await confirmReanalyze(key, 'ai', cost) : await confirmAndUnlock(key, 'ai', cost);
    if (r === 'cancel') return;
    if (r === 'nofund') {
      setAi(s => ({ ...s, [id]: { status: 'error', text: `🔒 Số dư không đủ (cần ${cost.toLocaleString('vi-VN')} xu). Nạp thêm trong Menu → Nạp xu.` } }));
      return;
    }
    if (force) { try { await clearAiResult(key); } catch {} }

    sectionsRef.current[id] = sections;
    keyRef.current[id] = key;
    partsRef.current[id] = new Array(sections.length).fill(null);
    textRefs.current[id] = ''; doneRefs.current[id] = false;
    if (revealRefs.current[id]) { clearInterval(revealRefs.current[id]!); revealRefs.current[id] = null; }
    setAi(s => ({ ...s, [id]: { status: 'loading', text: '', shown: '', fetchingMore: true, missing: 0 } }));

    // Gọi song song có GIỚI HẠN (tránh chạm rate limit key dùng chung), ghép theo thứ tự khi từng phần về.
    const inflight = runWithConcurrency(sections.map(s => () => settle(runSectionResilient(s))), AI_SECTION_CONCURRENCY);
    for (let i = 0; i < inflight.length; i++) {
      const res = await inflight[i];
      let chunk: string;
      if (res.ok) {
        partsRef.current[id][i] = res.v;
        chunk = res.v;
      } else {
        partsRef.current[id][i] = null;
        chunk = placeholderOf(sections[i].title);
      }
      textRefs.current[id] += (i ? '\n\n' : '') + chunk;
      if (i === 0) {
        setAi(s => ({ ...s, [id]: { ...(s[id] || { text: '' }), status: 'done', shown: '', fetchingMore: true } }));
        startReveal(id);
      }
    }

    doneRefs.current[id] = true;
    const missing = countMissing(id);
    setAi(s => ({ ...s, [id]: { ...(s[id] || { status: 'done', text: '' }), fetchingMore: false, missing } }));
    if (missing === 0) setAiResult(key, textRefs.current[id]);   // đủ tất cả mới lưu
  };

  /**
   * LẤY LẠI các phần CÒN THIẾU — KHÔNG trừ xu (mục đã mở khóa).
   * Chỉ gọi lại đúng những prompt chưa có kết quả.
   */
  const retryMissing = async (id: number) => {
    const parts = partsRef.current[id];
    const sections = sectionsRef.current[id];
    if (!parts || !sections) return;
    const missingIdx = parts.map((p, i) => (p == null ? i : -1)).filter(i => i >= 0);
    if (!missingIdx.length) return;

    setAi(s => ({ ...s, [id]: { ...(s[id] || { status: 'done', text: '' }), retrying: true } }));

    // Gọi lại CHỈ các phần thiếu (song song có giới hạn).
    const results = await Promise.all(
      runWithConcurrency(missingIdx.map(i => () => settle(runSectionResilient(sections[i]))), AI_SECTION_CONCURRENCY),
    );
    results.forEach((res, k) => {
      if (res.ok) partsRef.current[id][missingIdx[k]] = res.v;
    });

    // Dựng lại text đầy đủ, hiển thị ngay (không cần đánh máy lại từ đầu).
    if (revealRefs.current[id]) { clearInterval(revealRefs.current[id]!); revealRefs.current[id] = null; }
    textRefs.current[id] = buildText(id);
    doneRefs.current[id] = true;
    const missing = countMissing(id);
    setAi(s => ({
      ...s,
      [id]: { ...(s[id] || { status: 'done', text: '' }), shown: textRefs.current[id], retrying: false, fetchingMore: false, missing },
    }));
    if (missing === 0 && keyRef.current[id]) setAiResult(keyRef.current[id], textRefs.current[id]);
  };

  return { ai, run, retryMissing, showCached };
}
