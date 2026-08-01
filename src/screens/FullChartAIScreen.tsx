/**
 * Phân tích AI TOÀN BỘ lá số (chức năng PRO riêng).
 * Trừ xu theo COST.aiChart (Admin/UNLOCKED: miễn phí).
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import SimpleMarkdown from '../components/SimpleMarkdown';
import AIProgressBar from '../components/AIProgressBar';
import TuViChart from '../components/TuViChart';
import HouseCell from '../components/TuViChart/HouseCell';
import ExportPdfButton from '../components/ExportPdfButton';
import MissingPartsNotice from '../components/MissingPartsNotice';
import { captureChartDataUri, captureRefDataUri, chartHeaderLines, type PdfDaiVanInfo, type PdfTieuVanInfo } from '../utils/pdfExport';
import { fullChartSections } from '../utils/aiAnalysis';
import { generateOfflineFullChart, cutAtSection } from '../core/offlineLuanGiai';
import { wallet, PREMIUM, premiumBadgeNote, costNote, xuVnd, AI_VALUE_NOTE, AI_PREVIEW } from '../constants/premium';
import { confirmAndUnlock, confirmReanalyze } from '../lib/confirmCharge';
import PaidGate from '../components/PaidGate';
import { fkey } from '../lib/featureKey';
import { getAiResult, setAiResult, clearAiResult } from '../lib/aiResults';
import ScreenHeader from '../components/ScreenHeader';
import MedDisclaimer from '../components/MedDisclaimer';

type Props = NativeStackScreenProps<RootStackParamList, 'FullChartAI'>;

export default function FullChartAIScreen({ route, navigation }: Props) {
  const { result } = route.params;
  const [mode, setMode] = useState<'offline' | 'ai'>('offline');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'offline' | 'error' | 'nofund'>('idle');
  const [shown, setShown] = useState('');          // phần đã "đánh máy" ra
  const [fetchingMore, setFetchingMore] = useState(false);
  const [missing, setMissing] = useState(0);        // số phần chưa lấy được
  const [retrying, setRetrying] = useState(false);  // đang lấy lại phần thiếu
  const [err, setErr] = useState('');
  const [bal, setBal] = useState(wallet.balance);

  const textRef = useRef('');        // toàn bộ text đã tải (lớn dần theo từng phần)
  const fullDoneRef = useRef(false); // đã tải xong tất cả các phần
  const revealRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef = useRef(false);
  const partsRef = useRef<(string | null)[]>([]);   // kết quả từng phần (null = thiếu)
  const sectionsRef = useRef<{ title: string; run: () => Promise<string> }[]>([]);

  const placeholderOf = (title: string) =>
    `\n# ${title}\n_(Phần này chưa lấy được kết quả — bấm "Lấy lại phần còn thiếu" bên dưới.)_`;
  const buildText = () =>
    partsRef.current.map((p, i) => p ?? placeholderOf(sectionsRef.current[i]?.title || `Phần ${i + 1}`)).join('\n\n');
  const countMissing = () => partsRef.current.filter(p => p == null).length;

  // Báo cáo offline rule-based — sẵn sàng ngay, không tốn xu/không cần mạng.
  const offlineText = useMemo(() => generateOfflineFullChart(result), [result]);
  // Key trừ xu/cache GẮN VỚI NĂM XEM → mỗi năm trừ 1 lần, mở lại năm đó miễn phí.
  const yearKey = result.tuViChart.viewingYear ?? 'na';
  const aiKey = fkey(result, `chart:ai:${yearKey}`);

  // Chụp lá số (ẩn) để nhúng vào PDF.
  const chartRef = useRef<View>(null);
  const dvCellRef = useRef<View>(null);
  const tvCellRef = useRef<View>(null);
  const headerLines = useMemo(() => chartHeaderLines(result), [result]);
  const captureChart = () => captureChartDataUri(chartRef);
  const captureCells = async () => ({
    dvCell: await captureRefDataUri(dvCellRef),
    tvCell: await captureRefDataUri(tvCellRef),
  });

  // Cung Đại vận (theo tuổi xem) & Tiểu vận (theo năm xem) để chụp ảnh ô cung vào PDF.
  const pdfCellHouses = useMemo(() => {
    const va = result.tuViChart.viewingAge;
    const vy = result.tuViChart.viewingYear;
    const dv = result.daiVans.find(d => va != null && va >= d.startAge && va <= d.endAge);
    const tv = vy != null ? result.tieuVans.find(t => t.year === vy) : undefined;
    const houseAt = (b?: string) => (b ? result.tuViChart.houses.find(h => h.branch === b) : undefined);
    return { dvHouse: houseAt(dv?.branch), tvHouse: houseAt(tv?.branch) };
  }, [result]);

  // Thông tin đại vận / tiểu vận cho sidebar trang đầu PDF.
  const pdfSideInfo = useMemo(() => {
    const viewingAge = result.tuViChart.viewingAge;
    const viewingYear = result.tuViChart.viewingYear;
    const chinhTinhAt = (branch: string) => {
      const h = result.tuViChart.houses.find(x => x.branch === branch);
      const names = h ? h.stars.filter(s => s.type === 'chinh').map(s => s.name) : [];
      return names.length ? names.join(', ') : 'Vô chính diệu';
    };
    const dv = result.daiVans.find(d => viewingAge != null && viewingAge >= d.startAge && viewingAge <= d.endAge);
    const dvInfo: PdfDaiVanInfo | undefined = dv ? {
      label: `${dv.startAge}–${dv.endAge} tuổi`,
      stemBranch: `${dv.stem} ${dv.branch}`,
      palaceName: result.tuViChart.houses.find(h => h.branch === dv.branch)?.palaceName ?? '',
      chinhTinh: chinhTinhAt(dv.branch),
      isCurrent: true,
    } : undefined;
    const tv = viewingYear != null ? result.tieuVans.find(t => t.year === viewingYear) : undefined;
    const tvInfo: PdfTieuVanInfo | undefined = tv ? {
      year: tv.year,
      age: tv.age,
      stemBranch: `${tv.stem} ${tv.branch}`,
      palaceName: result.tuViChart.houses.find(h => h.branch === tv.branch)?.palaceName ?? '',
      chinhTinh: chinhTinhAt(tv.branch),
    } : undefined;
    return { dvInfo, tvInfo };
  }, [result]);

  // Đánh máy NỐI TIẾP: liên tục tiến `shown` về phía textRef.current (lớn dần khi
  // các phần sau tải xong). Tốc độ đánh máy đóng vai trò "đệm" che thời gian tải.
  const startReveal = () => {
    if (revealRef.current) return;
    let i = 0;                          // LUÔN đánh máy từ đầu (textRef vừa được reset về '')
    const STEP = 24, TICK = 35;        // ~685 ký tự/giây
    revealRef.current = setInterval(() => {
      const full = textRef.current;
      if (i < full.length) {
        i = Math.min(full.length, i + STEP);
        setShown(full.slice(0, i));
      } else if (fullDoneRef.current) {
        if (revealRef.current) { clearInterval(revealRef.current); revealRef.current = null; }
      }
      // else: đã đánh hết phần hiện có, chờ phần sau tải xong (interval vẫn chạy)
    }, TICK);
  };

  useEffect(() => () => { if (revealRef.current) clearInterval(revealRef.current); }, []);

  // Vào tab AI mà đã có kết quả lưu → hiện lại ngay (không gọi AI, không trừ phí).
  useEffect(() => {
    if (mode === 'ai' && status === 'idle' && !startedRef.current) {
      const cached = getAiResult(aiKey);
      if (cached) {
        textRef.current = cached; fullDoneRef.current = true;
        setShown(cached); setStatus('done');
      }
    }
  }, [mode]);

  const run = async (force = false) => {
    if (!force) {
      const cached = getAiResult(aiKey);
      if (cached) {
        textRef.current = cached; fullDoneRef.current = true;
        setShown(cached); setStatus('done'); return;
      }
    }
    const r = force ? await confirmReanalyze(aiKey, 'ai', PREMIUM.COST.aiLarge) : await confirmAndUnlock(aiKey, 'ai', PREMIUM.COST.aiLarge);
    if (r === 'cancel') return;
    if (r === 'nofund') { setStatus('nofund'); return; }
    if (force) {
      try { await clearAiResult(aiKey); } catch {}
    }
    setBal(wallet.balance);
    startedRef.current = true;
    // Dọn interval đánh máy cũ (nếu đang chạy) để lần phân tích mới bắt đầu sạch.
    if (revealRef.current) { clearInterval(revealRef.current); revealRef.current = null; }
    textRef.current = ''; fullDoneRef.current = false; setShown(''); setMissing(0);
    setStatus('loading');
    setFetchingMore(true);

    const sections = fullChartSections(result);
    sectionsRef.current = sections;
    partsRef.current = new Array(sections.length).fill(null);

    // Gọi TẤT CẢ phần SONG SONG ngay; ghép THEO THỨ TỰ khi từng phần về.
    const inflight = sections.map(s =>
      s.run().then((v) => ({ ok: true as const, v }), (e) => ({ ok: false as const, e })),
    );
    for (let i = 0; i < inflight.length; i++) {
      const res = await inflight[i];
      let part: string;
      if (res.ok) { partsRef.current[i] = res.v; part = res.v; }
      else { partsRef.current[i] = null; part = placeholderOf(sections[i].title); }
      textRef.current += (i ? '\n\n' : '') + part;
      if (i === 0) { setStatus('done'); startReveal(); }
    }
    fullDoneRef.current = true;
    setFetchingMore(false);
    const miss = countMissing();
    setMissing(miss);
    if (miss === 0) setAiResult(aiKey, textRef.current); // chỉ lưu khi đủ tất cả phần
  };

  /** Lấy lại các phần CÒN THIẾU — không trừ xu. */
  const retryMissing = async () => {
    const missingIdx = partsRef.current.map((p, i) => (p == null ? i : -1)).filter(i => i >= 0);
    if (!missingIdx.length) return;
    setRetrying(true);
    const settle = (pr: Promise<string>) => pr.then((v) => ({ ok: true as const, v }), (e) => ({ ok: false as const, e }));
    const results = await Promise.all(missingIdx.map(i => settle(sectionsRef.current[i].run())));
    results.forEach((res, k) => { if (res.ok) partsRef.current[missingIdx[k]] = res.v; });
    if (revealRef.current) { clearInterval(revealRef.current); revealRef.current = null; }
    textRef.current = buildText();
    fullDoneRef.current = true;
    setShown(textRef.current);
    const miss = countMissing();
    setMissing(miss);
    setRetrying(false);
    if (miss === 0) setAiResult(aiKey, textRef.current);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Lá số ẩn (ngoài màn hình) để chụp ảnh nhúng vào PDF */}
      <View style={styles.hiddenChart} pointerEvents="none">
        <TuViChart ref={chartRef} chart={result.tuViChart} birthInfo={result.birthInfo} />
        {pdfCellHouses.dvHouse && (
          <View ref={dvCellRef} collapsable={false}>
            <HouseCell house={pdfCellHouses.dvHouse} width={380} height={500} showLuuStars />
          </View>
        )}
        {pdfCellHouses.tvHouse && (
          <View ref={tvCellRef} collapsable={false}>
            <HouseCell house={pdfCellHouses.tvHouse} width={380} height={500} showLuuStars />
          </View>
        )}
      </View>

      <ScreenHeader title="Phân tích toàn lá số" onBack={() => navigation.goBack()} />

      <View style={styles.subBar}>
        <Text style={styles.badge}>{mode === 'ai' ? 'PRO · AI' : 'NÂNG CAO · OFFLINE'}</Text>
        <Text style={styles.note}>{premiumBadgeNote()}</Text>
      </View>

      {/* Tab switcher: Nâng cao (offline) <-> Phân tích AI */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, mode === 'offline' && styles.tabActive]}
          onPress={() => setMode('offline')}>
          <Text style={[styles.tabTxt, mode === 'offline' && styles.tabTxtActive]}>📘 Nâng cao</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, mode === 'ai' && styles.tabActive]}
          onPress={() => setMode('ai')}>
          <Text style={[styles.tabTxt, mode === 'ai' && styles.tabTxtActive]}>🤖 Phân tích AI</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {mode === 'offline' && (
          <View style={styles.resultBox}>
            <Text style={styles.bigTitle}>Phân tích tổng thể lá số</Text>



            <PaidGate unlockKey={fkey(result, `chart:adv:${yearKey}`)} kind="advanced" cost={PREMIUM.COST.advancedMajor}
              preview={cutAtSection(offlineText, 'Tổng quan bố cục lá số')}>
              <SimpleMarkdown content={offlineText} />
              <ExportPdfButton
                title="Phân tích toàn lá số"
                subtitle="Bản Nâng cao (offline)"
                badge="NÂNG CAO"
                headerLines={headerLines}
                fileName={`${result.birthInfo.name || 'Lá số'} - Toàn lá số - Nâng cao`}
                getContent={() => offlineText}
                captureChart={captureChart}
                captureCells={captureCells}
                daiVanInfo={pdfSideInfo.dvInfo}
                tieuVanInfo={pdfSideInfo.tvInfo}
              />
            </PaidGate>
          </View>
        )}

        {mode === 'ai' && (
        <>
        <View style={styles.walletBox}>
          <Text style={styles.walletCost}>
            Phí phân tích AI toàn lá số: {PREMIUM.UNLOCKED ? 'miễn phí' : xuVnd(PREMIUM.COST.aiLarge)}
            {PREMIUM.UNLOCKED ? '' : ' · mở rồi đọc lại miễn phí'}
          </Text>
          {status === 'idle' && <Text style={styles.aiValueNote}>{AI_PREVIEW.fullChart}</Text>}
        </View>

{status === 'idle' && (
          <TouchableOpacity style={styles.runBtn} onPress={() => run()} activeOpacity={0.85}>
            <Text style={styles.runBtnText}>🤖 Phân tích AI đầy đủ ({costNote(PREMIUM.COST.aiLarge)})</Text>
          </TouchableOpacity>
        )}


        {status === 'loading' && (
          <View style={styles.loadingBox}>
            <AIProgressBar label="AI đang luận giải toàn bộ 12 cung…" />
          </View>
        )}

        {status === 'nofund' && (
          <Text style={styles.body}>
            🔒 Số dư không đủ ({bal.toLocaleString('vi-VN')} xu). Cần {PREMIUM.COST.aiLarge} xu
            để phân tích toàn lá số. Vui lòng nạp thêm trong Menu → Nạp xu.
          </Text>
        )}
        {status === 'offline' && (
          <Text style={styles.body}>
            ⚠ Cần kết nối mạng để hệ thống phân tích chuyên sâu. Kiểm tra Internet rồi thử lại.
          </Text>
        )}
        {status === 'error' && <Text style={styles.body}>⚠ {err}</Text>}

        {status === 'done' && (
          <View style={styles.resultBox}>
            <SimpleMarkdown content={shown} />
            {fetchingMore && (
              <Text style={styles.dim}>✍️ AI đang soạn tiếp các phần sau… (bạn cứ đọc, nội dung sẽ nối tiếp)</Text>
            )}
            <Text style={styles.dim}>
              * Nội dung do AI tạo, mang tính tham khảo; không thay thế luận giải chuyên gia.
            </Text>
            {!fetchingMore && (
              <MissingPartsNotice missing={missing} retrying={retrying} onRetry={retryMissing} />
            )}
            {!fetchingMore && missing === 0 && (
              <ExportPdfButton
                title="Phân tích toàn lá số"
                subtitle="Bản Phân tích AI"
                badge="PHÂN TÍCH AI"
                headerLines={headerLines}
                fileName={`${result.birthInfo.name || 'Lá số'} - Toàn lá số - AI`}
                getContent={() => textRef.current || shown}
                captureChart={captureChart}
                captureCells={captureCells}
                daiVanInfo={pdfSideInfo.dvInfo}
                tieuVanInfo={pdfSideInfo.tvInfo}
              />
            )}
            <TouchableOpacity style={styles.retry} onPress={() => run(true)}>
              <Text style={styles.retryText}>↻ Phân tích lại (−{PREMIUM.COST.aiLarge} xu)</Text>
            </TouchableOpacity>
          </View>
        )}
        </>
        )}

        <MedDisclaimer style={{ marginTop: SPACING.lg }} />

        <TouchableOpacity style={styles.bottomBack} onPress={() => navigation.goBack()}>
          <Text style={styles.bottomBackText}>← Về lá số</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  hiddenChart: { position: 'absolute', top: 0, left: 0, right: 0, opacity: 0, zIndex: -1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backText: { color: COLORS.gold, fontSize: FONTS.size.md, fontWeight: '700', width: 64 },
  topTitle: { color: COLORS.textPrimary, fontSize: FONTS.size.md, fontWeight: '800', flex: 1, textAlign: 'center' },
  subBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  badge: {
    color: '#fff', backgroundColor: COLORS.purple, fontWeight: '800',
    fontSize: FONTS.size.xs, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4,
  },
  note: { color: COLORS.green, fontSize: FONTS.size.xs, fontWeight: '700' },
  tabsRow: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1, paddingVertical: SPACING.sm, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.gold },
  tabTxt: { color: COLORS.textSecondary, fontWeight: '700', fontSize: FONTS.size.md },
  tabTxtActive: { color: COLORS.gold },
  bigTitle: {
    color: COLORS.gold, fontSize: FONTS.size.xl, fontWeight: '900',
    textAlign: 'center', marginBottom: SPACING.md, letterSpacing: 0.3,
  },
  scroll: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xxl },
  walletBox: {
    backgroundColor: COLORS.surface, borderRadius: 8, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, gap: 4,
  },
  walletText: { color: COLORS.textPrimary, fontSize: FONTS.size.md },
  walletBal: { color: COLORS.gold, fontWeight: '800' },
  walletCost: { color: COLORS.textSecondary, fontSize: FONTS.size.sm },
  aiValueNote: { color: COLORS.goldLight, fontSize: FONTS.size.sm, fontStyle: 'italic', lineHeight: 18 },
  runBtn: {
    backgroundColor: COLORS.purple, borderRadius: 10,
    paddingVertical: SPACING.md, alignItems: 'center',
  },
  runBtnText: { color: '#fff', fontSize: FONTS.size.md, fontWeight: '800' },
  loadingBox: { padding: SPACING.md },
  resultBox: {
    backgroundColor: COLORS.card, borderRadius: 10, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, gap: SPACING.sm,
  },
  body: { color: COLORS.textPrimary, fontSize: FONTS.size.md, lineHeight: 22 },
  dim: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, fontStyle: 'italic', marginTop: SPACING.xs },
  retry: {
    alignSelf: 'flex-start', marginTop: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.purple, borderRadius: 6,
    paddingHorizontal: SPACING.md, paddingVertical: 4,
  },
  retryText: { color: COLORS.purple, fontSize: FONTS.size.sm, fontWeight: '700' },
  bottomBack: {
    alignSelf: 'center', marginTop: SPACING.md,
    backgroundColor: COLORS.gold, borderRadius: 8,
    paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm,
  },
  bottomBackText: { color: '#1a0a00', fontSize: FONTS.size.md, fontWeight: '800' },
});
