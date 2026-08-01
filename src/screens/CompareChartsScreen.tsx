/**
 * So sánh hai lá số — 12 tầng Nâng cao (offline) + AI nâng cấp song song (30 xu).
 * AI gọi 12 phần đồng thời → cập nhật từng accordion card khi về.
 * Hỗ trợ xuất PDF, căn justify toàn bộ text.
 */
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, FlatList,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import { listCharts, rowToResult, type SavedChartRow } from '../lib/charts';
import type { AstrologyResult } from '../types';
import { compareCharts, type CompareResult } from '../core/compareCharts';
import {
  startCompareAI, restartCompareAI, buildCompareSections, saveCompareAILayers,
  compareAiCacheKey, decodeLayers,
} from '../lib/compareAI';
import { getAiResult } from '../lib/aiResults';
import { exportAnalysisToPdf } from '../utils/pdfExport';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { PREMIUM, costNote } from '../constants/premium';

// ─── SCORE HELPERS ────────────────────────────────────────────────────────────

function scoreBg(s: number): string {
  return s >= 75 ? '#22c55e33' : s >= 55 ? '#f59e0b33' : '#ef444433';
}
function scoreFg(s: number): string {
  return s >= 75 ? '#86efac' : s >= 55 ? '#fcd34d' : '#fca5a5';
}

function ScoreBadge({ label, score }: { label: string; score: number }) {
  return (
    <View style={[styles.badge, { backgroundColor: scoreBg(score) }]}>
      <Text style={[styles.badgeScore, { color: scoreFg(score) }]}>{score}</Text>
      <Text style={[styles.badgeLabel, { color: scoreFg(score) }]}>{label}</Text>
    </View>
  );
}

// ─── PERSON CARD ──────────────────────────────────────────────────────────────

function PersonCard({ result, placeholder, onPress }: {
  result: AstrologyResult | null;
  placeholder: string;
  onPress: () => void;
}) {
  const c = result?.tuViChart;
  const b = result?.birthInfo;
  return (
    <TouchableOpacity style={styles.personCard} onPress={onPress} activeOpacity={0.8}>
      {result ? (
        <>
          <Text style={styles.personName}>{b?.name || 'Không tên'}</Text>
          <Text style={styles.personSub}>
            {b?.gender === 'nam' ? '♂' : '♀'} · {b?.day}/{b?.month}/{b?.year}
          </Text>
          <Text style={styles.personSub}>{c?.menhChu} · {c?.menhElement}</Text>
          <Text style={[styles.personSub, { color: COLORS.gold, marginTop: 2 }]}>Nhấn để đổi →</Text>
        </>
      ) : (
        <>
          <Text style={styles.personEmpty}>＋</Text>
          <Text style={styles.personSub}>{placeholder}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

// ─── ACCORDION LAYER ─────────────────────────────────────────────────────────

function LayerCard({
  icon, title, offlineContent, aiContent, isLoading,
}: {
  icon: string;
  title: string;
  offlineContent: string;
  aiContent: string | null;
  isLoading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const content = aiContent ?? offlineContent;
  const hasAI = aiContent !== null;

  return (
    <View style={styles.layerCard}>
      <TouchableOpacity style={styles.layerHeader} onPress={() => setOpen(o => !o)} activeOpacity={0.8}>
        <Text style={styles.layerIcon}>{icon}</Text>
        <Text style={styles.layerTitle} numberOfLines={1}>{title}</Text>
        <View style={styles.layerRight}>
          {isLoading && <ActivityIndicator color={COLORS.purple} size="small" style={{ marginRight: 4 }} />}
          {hasAI && !isLoading && <View style={styles.aiBadge}><Text style={styles.aiBadgeTxt}>AI</Text></View>}
          <Text style={styles.layerChevron}>{open ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>
      {open && (
        <View style={styles.layerBody}>
          <MarkdownText text={content} />
        </View>
      )}
    </View>
  );
}

// ─── MARKDOWN RENDERER ────────────────────────────────────────────────────────

type MdBlock =
  | { type: 'gap' }
  | { type: 'separator' }
  | { type: 'heading'; level: 1 | 2; text: string }
  | { type: 'bullet'; marker: string; text: string }
  | { type: 'italic'; text: string }
  | { type: 'para'; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] };

function parseMarkdownBlocks(text: string): MdBlock[] {
  const lines = text.split('\n');
  const blocks: MdBlock[] = [];
  let i = 0;
  const parseCells = (line: string) => line.split('|').map(c => c.trim()).filter(Boolean);
  const isSepLine  = (line: string) => /^\|[\s|:-]+\|$/.test(line.trim());
  while (i < lines.length) {
    const raw = lines[i];
    const t = raw.trim();
    if (!t)          { blocks.push({ type: 'gap' }); i++; continue; }
    if (t === '---') { blocks.push({ type: 'separator' }); i++; continue; }
    if (t.startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) { tableLines.push(lines[i]); i++; }
      const nonSep = tableLines.filter(l => !isSepLine(l));
      if (nonSep.length > 0) {
        blocks.push({ type: 'table', headers: parseCells(nonSep[0]), rows: nonSep.slice(1).map(parseCells) });
      }
      continue;
    }
    if (t.startsWith('## ')) { blocks.push({ type: 'heading', level: 2, text: t.slice(3) }); i++; continue; }
    if (t.startsWith('# '))  { blocks.push({ type: 'heading', level: 1, text: t.slice(2) }); i++; continue; }
    if (t.startsWith('- '))  { blocks.push({ type: 'bullet', marker: '•', text: t.slice(2) }); i++; continue; }
    const numM = t.match(/^(\d+)\.\s(.*)$/);
    if (numM) { blocks.push({ type: 'bullet', marker: numM[1] + '.', text: numM[2] }); i++; continue; }
    if (t.startsWith('_') && t.endsWith('_') && t.length > 2) {
      blocks.push({ type: 'italic', text: t.slice(1, -1) }); i++; continue;
    }
    blocks.push({ type: 'para', text: t });
    i++;
  }
  return blocks;
}

// Độ rộng cột theo tên header (bảng "Khía cạnh | Điểm | Đánh giá | Ý nghĩa thực tế"):
// • "Điểm"       → 52px (vừa đủ chữ "Điểm")
// • "Đánh giá"   → 45px (~1/2 cũ, vừa đủ chữ "Tốt")
// • "Khía cạnh"  → 68px (tên mục, bằng ~1/2 flex cũ)
// • còn lại (Ý nghĩa thực tế …) → flex:1 chiếm toàn bộ phần còn lại
function colStyle(header: string): object {
  const h = header.toLowerCase().replace(/\*\*/g, '').trim();
  if (h === 'điểm' || h === 'score')        return { width: 52 };
  if (h.includes('đánh giá'))               return { width: 50 };
  if (h.includes('khía cạnh') || h === 'aspect') return { width: 68 };
  return { flex: 1 };
}

function TableBlock({ headers, rows }: { headers: string[]; rows: string[][] }) {
  // Bảng AI có cột "Ý nghĩa thực tế" → dùng colStyle riêng từng cột.
  // Bảng Nâng cao (3 cột, không có cột đó) → chia đều flex:1.
  const isAITable = headers.some(h => h.toLowerCase().includes('ý nghĩa'));
  const getCol = (h: string) => isAITable ? colStyle(h) : { flex: 1 };
  return (
    <View style={styles.tableContainer}>
      <View style={[styles.tableRow, styles.tableHeaderRow]}>
        {headers.map((h, j) => (
          <Text key={j} style={[styles.tableCellHeader, getCol(h)]}>
            {h.replace(/\*\*/g, '')}
          </Text>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={[styles.tableRow, ri % 2 === 1 && styles.tableRowAlt]}>
          {row.map((cell, j) => (
            <Text key={j} style={[styles.tableCell, getCol(headers[j] ?? '')]}>
              {cell.replace(/\*\*/g, '')}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function MarkdownText({ text }: { text: string }) {
  const blocks = parseMarkdownBlocks(text);
  return (
    <View style={{ gap: 4 }}>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'gap':       return <View key={i} style={{ height: 3 }} />;
          case 'separator': return <View key={i} style={styles.separator} />;
          case 'heading':   return (
            <Text key={i} style={block.level === 1 ? styles.mdH1 : styles.mdH2}>{block.text}</Text>
          );
          case 'bullet': return (
            <View key={i} style={styles.mdBulletRow}>
              <Text style={styles.mdBulletDot}>{block.marker}</Text>
              <ParsedLine text={block.text} style={styles.mdBulletText} />
            </View>
          );
          case 'italic': return <Text key={i} style={styles.mdItalic}>{block.text}</Text>;
          case 'table':  return <TableBlock key={i} headers={block.headers} rows={block.rows} />;
          default:       return <ParsedLine key={i} text={(block as any).text} style={styles.mdPara} />;
        }
      })}
    </View>
  );
}

function ParsedLine({ text, style }: { text: string; style: any }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  if (parts.length === 1) return <Text style={style}>{text}</Text>;
  return (
    <Text style={style}>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**')
          ? <Text key={i} style={styles.boldInline}>{p.slice(2, -2)}</Text>
          : <Text key={i}>{p}</Text>
      )}
    </Text>
  );
}

// ─── CHART PICKER MODAL ───────────────────────────────────────────────────────

function ChartPicker({ visible, onClose, onSelect }: {
  visible: boolean;
  onClose: () => void;
  onSelect: (r: AstrologyResult) => void;
}) {
  const [rows, setRows] = useState<SavedChartRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await listCharts()); } catch { setRows([]); }
    setLoading(false);
  }, []);

  React.useEffect(() => { if (visible) load(); }, [visible, load]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalBox}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Chọn lá số</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
          </View>
          {loading
            ? <ActivityIndicator color={COLORS.gold} style={{ marginTop: SPACING.xl }} />
            : rows.length === 0
              ? <Text style={styles.modalEmpty}>Chưa có lá số nào được lưu.</Text>
              : (
                <FlatList
                  data={rows}
                  keyExtractor={r => r.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.pickerRow}
                      onPress={() => { onSelect(rowToResult(item)); onClose(); }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.pickerName}>{item.name || 'Không tên'} · {item.gender === 'nam' ? '♂ Nam' : '♀ Nữ'}</Text>
                      <Text style={styles.pickerSub}>{item.birth_day}/{item.birth_month}/{item.birth_year} · giờ {item.birth_hour}h</Text>
                    </TouchableOpacity>
                  )}
                  contentContainerStyle={{ padding: SPACING.md, gap: SPACING.sm }}
                />
              )
          }
        </View>
      </View>
    </Modal>
  );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────

const TABS = [
  { key: 'love',       label: 'Tình yêu' },
  { key: 'marriage',   label: 'Hôn nhân' },
  { key: 'business',   label: 'Làm ăn' },
  { key: 'friendship', label: 'Bạn bè' },
] as const;
type TabKey = (typeof TABS)[number]['key'];
const TAB_ICONS: Record<TabKey, string> = {
  love: '❤️', marriage: '💍', business: '💼', friendship: '🤝',
};

const EMPTY_AI_LAYERS: (string | null)[] = new Array(12).fill(null);

export default function CompareChartsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const preSelected = route.params?.preSelectedResult as AstrologyResult | undefined;

  const [chartA, setChartA] = useState<AstrologyResult | null>(preSelected ?? null);
  const [chartB, setChartB] = useState<AstrologyResult | null>(null);
  const [pickerTarget, setPickerTarget] = useState<'A' | 'B' | null>(null);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('love');

  // AI state
  const [aiLayers, setAiLayers] = useState<(string | null)[]>(EMPTY_AI_LAYERS);
  const [aiRunning, setAiRunning] = useState(false);
  const [aiCompleted, setAiCompleted] = useState(0);
  const [aiDone, setAiDone] = useState(false);
  const aiLayersRef = useRef<(string | null)[]>(EMPTY_AI_LAYERS);
  const [viewMode, setViewMode] = useState<'pro' | 'ai'>('pro');

  const [exportingPdf, setExportingPdf] = useState(false);

  // ── Compare ──────────────────────────────────────────────────────────────────

  const runCompare = useCallback((a: AstrologyResult, b: AstrologyResult) => {
    const res = compareCharts(a, b);
    setResult(res);
    // Reset AI state for new pair
    const fresh = new Array(12).fill(null) as (string | null)[];
    aiLayersRef.current = fresh;
    setAiLayers(fresh);
    setAiCompleted(0);
    setAiDone(false);
    setAiRunning(false);
    setViewMode('pro');
    // Try loading cached AI
    const cached = getAiResult(compareAiCacheKey(a, b));
    if (cached) {
      const decoded = decodeLayers(cached);
      if (decoded.length === 12) {
        aiLayersRef.current = decoded;
        setAiLayers(decoded);
        setAiCompleted(12);
        setAiDone(true);
      }
    }
  }, []);

  const handleSetA = (r: AstrologyResult) => { setChartA(r); if (chartB) runCompare(r, chartB); };
  const handleSetB = (r: AstrologyResult) => { setChartB(r); if (chartA) runCompare(chartA, r); };

  // ── AI Runner ─────────────────────────────────────────────────────────────────

  const doRunAI = useCallback(async (a: AstrologyResult, b: AstrologyResult, res: CompareResult) => {
    const sections = buildCompareSections(a, b, res);
    const fresh = new Array(12).fill(null) as (string | null)[];
    aiLayersRef.current = fresh;
    setAiLayers([...fresh]);
    setAiCompleted(0);
    setAiDone(false);
    setAiRunning(true);
    setViewMode('ai');

    // Fire all 12 in parallel; update state as each resolves
    const inflight = sections.map((s, i) =>
      s.run().then(
        (text) => ({ ok: true as const, i, text }),
        (e)    => ({ ok: false as const, i, text: '' }),
      )
    );

    let completed = 0;
    for (const prom of inflight) {
      const r = await prom;
      if (r.ok && r.text) {
        aiLayersRef.current = [...aiLayersRef.current];
        aiLayersRef.current[r.i] = r.text;
      }
      completed++;
      setAiLayers([...aiLayersRef.current]);
      setAiCompleted(completed);
    }

    setAiRunning(false);
    setAiDone(true);
    // Cache the 12 results
    await saveCompareAILayers(a, b, aiLayersRef.current);
  }, []);

  const handleStartAI = async () => {
    if (!chartA || !chartB || !result) return;
    const status = await startCompareAI(chartA, chartB, result);
    if (status.status === 'cancel') return;
    if (status.status === 'nofund') {
      Alert.alert('Không đủ xu', `Bạn cần ${PREMIUM.COST.aiCompare} xu để phân tích AI. Vào Ví để nạp thêm.`);
      return;
    }
    if (status.status === 'cached') {
      aiLayersRef.current = status.layers;
      setAiLayers(status.layers);
      setAiCompleted(12);
      setAiDone(true);
      setViewMode('ai');
      return;
    }
    // 'started' → fire 12 calls
    doRunAI(chartA, chartB, result);
  };

  const handleReanalyzeAI = async () => {
    if (!chartA || !chartB || !result || aiRunning) return;
    const status = await restartCompareAI(chartA, chartB);
    if (status.status === 'cancel') return;
    if (status.status === 'nofund') {
      Alert.alert('Không đủ xu', `Bạn cần ${PREMIUM.COST.aiCompare} xu để phân tích lại.`);
      return;
    }
    doRunAI(chartA, chartB, result);
  };

  // ── PDF Export ────────────────────────────────────────────────────────────────

  const handleExportPdf = async () => {
    if (!chartA || !chartB || !result) return;
    setExportingPdf(true);
    try {
      const aName = chartA.birthInfo.name || 'Người A';
      const bName = chartB.birthInfo.name || 'Người B';
      // Xuất theo chế độ đang xem: AI → nội dung AI, Nâng cao → nội dung offline
      const isAIExport = viewMode === 'ai' && aiLayers.some(l => l !== null);
      const md = result.layers.map((l, i) => {
        const content = (isAIExport && aiLayers[i]) ? aiLayers[i]! : l.content;
        return `## ${l.icon} ${l.title}\n\n${content}`;
      }).join('\n\n---\n\n');

      await exportAnalysisToPdf({
        title: `So sánh: ${aName} & ${bName}`,
        subtitle: isAIExport ? 'Phân tích 12 tầng — Bản AI' : 'Phân tích 12 tầng — Bản Nâng cao',
        headerLines: [
          `${aName}: ${chartA.tuViChart.menhChu} · ${chartA.tuViChart.menhElement} · ${chartA.tuViChart.napAmMenh}`,
          `${bName}: ${chartB.tuViChart.menhChu} · ${chartB.tuViChart.menhElement} · ${chartB.tuViChart.napAmMenh}`,
          `Điểm tổng: ${result.scores.overall}/100 | ${result.element_label}`,
          result.branch_label,
        ],
        markdown: md,
        badge: isAIExport ? 'PHÂN TÍCH AI' : 'NÂNG CAO',
        fileName: `so-sanh-${aName.replace(/\s/g, '-')}-${bName.replace(/\s/g, '-')}-${isAIExport ? 'ai' : 'nangcao'}`,
      });
    } catch (e: any) {
      Alert.alert('Lỗi xuất PDF', e?.message ?? 'Không thể tạo file PDF.');
    } finally {
      setExportingPdf(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  const advice = result?.advice[activeTab];
  const sameGender = !!(chartA && chartB && chartA.birthInfo.gender === chartB.birthInfo.gender);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="So sánh lá số" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Person cards ── */}
        <View style={styles.personsRow}>
          <PersonCard result={chartA} placeholder="Chọn người A" onPress={() => setPickerTarget('A')} />
          <View style={styles.vsCircle}><Text style={styles.vsText}>VS</Text></View>
          <PersonCard result={chartB} placeholder="Chọn người B" onPress={() => setPickerTarget('B')} />
        </View>

        {!result && (
          <Text style={styles.hint}>
            {!chartA && !chartB
              ? 'Chọn hai lá số đã lưu để phân tích mức độ tương hợp'
              : 'Chọn tiếp lá số còn lại để bắt đầu so sánh'}
          </Text>
        )}

        {result && (
          <>
            {/* ── Overall score (nổi bật) ── */}
            <View style={[styles.overallBadge, {
              backgroundColor: scoreBg(result.scores.overall),
              borderColor: scoreFg(result.scores.overall) + '55',
            }]}>
              <Text style={[styles.overallScore, { color: scoreFg(result.scores.overall) }]}>
                {result.scores.overall}
                <Text style={[styles.overallScoreMax, { color: scoreFg(result.scores.overall) }]}>/100</Text>
              </Text>
              <Text style={[styles.overallLabel, { color: scoreFg(result.scores.overall) }]}>
                Điểm tương hợp tổng thể
              </Text>
            </View>

            {/* ── Sub scores ── */}
            <View style={styles.scoreRow}>
              <ScoreBadge label="Tình yêu" score={result.scores.love} />
              <ScoreBadge label="Hôn nhân" score={result.scores.marriage} />
              <ScoreBadge label="Làm ăn" score={result.scores.business} />
              <ScoreBadge label="Bạn bè" score={result.scores.friendship} />
              <ScoreBadge label="Rủi ro" score={result.scores.conflict_risk} />
            </View>

            {/* ── Element & branch ── */}
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>🌿 {result.element_label}</Text>
              <Text style={styles.infoLabel}>🌙 {result.branch_label}</Text>
            </View>

            {/* ── Tabs ── */}
            <View style={styles.tabRow}>
              {TABS.map(t => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.tabBtn, activeTab === t.key && styles.tabBtnActive]}
                  onPress={() => setActiveTab(t.key)}
                >
                  <Text style={[styles.tabTxt, activeTab === t.key && styles.tabTxtActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Advice box ── */}
            {advice && (
              <View style={styles.adviceBox}>
                {(activeTab === 'love' || activeTab === 'marriage') && sameGender && (
                  <View style={styles.sameGenderNotice}>
                    <Text style={styles.sameGenderIcon}>ℹ️</Text>
                    <Text style={styles.sameGenderText}>
                      Phân tích tình yêu và hôn nhân trong Tử Vi – Bát Tự được xây dựng theo khuôn mẫu tương hợp truyền thống giữa hai người khác giới. Hai lá số này cùng giới tính, nên một số nhận định về vai trò, hôn nhân và gia đình có thể chưa phản ánh đúng bối cảnh của bạn. Các chỉ số về ngũ hành, địa chi, tính cách và thời vận vẫn có giá trị tham khảo đầy đủ.
                    </Text>
                  </View>
                )}
                <Text style={styles.adviceTitle}>{TAB_ICONS[activeTab]} {advice.label}</Text>
                {advice.tips.map((tip, i) => (
                  <View key={i} style={styles.tipRow}>
                    <Text style={styles.tipDot}>→</Text>
                    <Text style={styles.tipTxt}>{tip}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* ── AI upgrade bar ── */}
            <View style={styles.aiBar}>
              {!aiDone && !aiRunning && (
                <TouchableOpacity style={styles.aiStartBtn} onPress={handleStartAI} activeOpacity={0.85}>
                  <Text style={styles.aiStartTxt}>✨ Phân tích AI ({costNote(PREMIUM.COST.aiCompare)})</Text>
                </TouchableOpacity>
              )}
              {aiRunning && (
                <View style={styles.aiProgressRow}>
                  <ActivityIndicator color={COLORS.purple} size="small" />
                  <Text style={styles.aiProgressTxt}>
                    Đang phân tích {aiCompleted}/12 tầng...
                  </Text>
                </View>
              )}
              {aiDone && (
                <View style={styles.aiDoneRow}>
                  <Text style={styles.aiDoneTxt}>✅ Phân tích AI hoàn tất ({aiLayers.filter(l => l !== null).length}/12 tầng)</Text>
                  <TouchableOpacity onPress={handleReanalyzeAI} style={styles.reanalyzeBtn}>
                    <Text style={styles.reanTxt}>🔄 Phân tích lại ({costNote(PREMIUM.COST.aiCompare)})</Text>
                  </TouchableOpacity>
                </View>
              )}
              <Text style={styles.aiNote}>💡 Kết quả phân tích AI tại mục này chỉ lưu tạm trên thiết bị, không đồng bộ lên máy chủ — hãy xuất PDF để giữ lại bản phân tích.</Text>
            </View>

            {/* ── 12 Layer accordions ── */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📊 Phân tích 12 tầng</Text>
              <TouchableOpacity
                style={[styles.pdfBtn, exportingPdf && { opacity: 0.5 }]}
                onPress={handleExportPdf}
                disabled={exportingPdf}
              >
                <Text style={styles.pdfBtnTxt}>{exportingPdf ? '⏳' : '📄 PDF'}</Text>
              </TouchableOpacity>
            </View>

            {/* ── View mode toggle (hiện khi đã có AI) ── */}
            {(aiDone || aiRunning || aiLayers.some(l => l !== null)) && (
              <View style={styles.viewModeRow}>
                <TouchableOpacity
                  style={[styles.viewModeBtn, viewMode === 'pro' && styles.viewModeBtnActive]}
                  onPress={() => setViewMode('pro')}
                >
                  <Text style={[styles.viewModeTxt, viewMode === 'pro' && styles.viewModeTxtActive]}>
                    📊 Nâng cao
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.viewModeBtn, viewMode === 'ai' && styles.viewModeBtnActive]}
                  onPress={() => setViewMode('ai')}
                >
                  <Text style={[styles.viewModeTxt, viewMode === 'ai' && styles.viewModeTxtActive]}>
                    ✨ AI
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {result.layers.map((layer, i) => (
              <LayerCard
                key={i}
                icon={layer.icon}
                title={layer.title}
                offlineContent={layer.content}
                aiContent={viewMode === 'ai' ? (aiLayers[i] ?? null) : null}
                isLoading={viewMode === 'ai' && aiRunning && aiLayers[i] === null}
              />
            ))}
          </>
        )}
      </ScrollView>

      <ChartPicker
        visible={pickerTarget !== null}
        onClose={() => setPickerTarget(null)}
        onSelect={r => {
          if (pickerTarget === 'A') handleSetA(r);
          else handleSetB(r);
          setPickerTarget(null);
        }}
      />
    </SafeAreaView>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.md, paddingBottom: 80, gap: SPACING.md },

  // Person cards
  personsRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  personCard: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 12, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, minHeight: 90,
  },
  personName: { color: COLORS.gold, fontSize: FONTS.size.md, fontWeight: '800' },
  personSub: { color: COLORS.textSecondary, fontSize: FONTS.size.xs, marginTop: 2 },
  personEmpty: { color: COLORS.purple, fontSize: 28, textAlign: 'center' },
  vsCircle: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.purple + '33',
    alignItems: 'center', justifyContent: 'center',
  },
  vsText: { color: COLORS.purple, fontSize: FONTS.size.xs, fontWeight: '900' },
  hint: { color: COLORS.textSecondary, textAlign: 'center', fontSize: FONTS.size.sm, lineHeight: 20 },

  // Overall score badge
  overallBadge: {
    borderRadius: 12, padding: SPACING.md, borderWidth: 1.5,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
  },
  overallScore: { fontSize: 48, fontWeight: '900', lineHeight: 56 },
  overallScoreMax: { fontSize: 20, fontWeight: '600' },
  overallLabel: { fontSize: FONTS.size.sm, fontWeight: '700', flexShrink: 1 },

  // Sub scores
  scoreRow: { flexDirection: 'row', gap: SPACING.xs },
  badge: { flex: 1, borderRadius: 8, padding: 6, alignItems: 'center' },
  badgeScore: { fontSize: FONTS.size.md, fontWeight: '800' },
  badgeLabel: { fontSize: 9, fontWeight: '600', marginTop: 1 },

  // Info box
  infoBox: {
    backgroundColor: COLORS.surface, borderRadius: 10, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, gap: 4,
  },
  infoLabel: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, lineHeight: 18 },

  // Tabs
  tabRow: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 10, padding: 4, gap: 2 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabBtnActive: { backgroundColor: COLORS.purple + '44' },
  tabTxt: { color: COLORS.textSecondary, fontSize: FONTS.size.xs, fontWeight: '600' },
  tabTxtActive: { color: COLORS.purple },

  // Advice box
  adviceBox: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.purple + '44', gap: SPACING.sm,
  },
  adviceTitle: { color: COLORS.gold, fontSize: FONTS.size.md, fontWeight: '800' },
  tipRow: { flexDirection: 'row', gap: SPACING.sm },
  tipDot: { color: COLORS.purple, fontWeight: '700', fontSize: FONTS.size.sm },
  tipTxt: { color: COLORS.textPrimary, fontSize: FONTS.size.sm, flex: 1, lineHeight: 20, textAlign: 'justify' },

  // Same-gender notice
  sameGenderNotice: {
    flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start',
    backgroundColor: COLORS.background, borderRadius: 8, padding: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  sameGenderIcon: { fontSize: 15 },
  sameGenderText: {
    flex: 1, color: COLORS.textSecondary, fontSize: FONTS.size.xs,
    lineHeight: 18, fontStyle: 'italic', textAlign: 'justify',
  },

  // AI upgrade bar
  aiBar: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.purple + '33',
  },
  aiStartBtn: {
    backgroundColor: COLORS.purple, borderRadius: 10, paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  aiStartTxt: { color: '#fff', fontWeight: '800', fontSize: FONTS.size.md },
  aiNote: { color: COLORS.textSecondary, fontSize: FONTS.size.xs, textAlign: 'center', lineHeight: 18, marginTop: SPACING.xs },
  aiProgressRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, justifyContent: 'center' },
  aiProgressTxt: { color: COLORS.purple, fontSize: FONTS.size.sm, fontWeight: '700' },
  aiDoneRow: { gap: SPACING.sm },
  aiDoneTxt: { color: COLORS.goldLight, fontSize: FONTS.size.sm, fontWeight: '700', textAlign: 'center' },
  reanalyzeBtn: {
    backgroundColor: COLORS.surface, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border,
    paddingVertical: 8, alignItems: 'center',
  },
  reanTxt: { color: COLORS.textSecondary, fontSize: FONTS.size.sm },

  // Section header
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: SPACING.xs,
  },
  sectionTitle: { color: COLORS.gold, fontSize: FONTS.size.md, fontWeight: '800' },
  pdfBtn: {
    backgroundColor: COLORS.surface, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm, paddingVertical: 4,
  },
  pdfBtnTxt: { color: COLORS.goldLight, fontSize: FONTS.size.xs, fontWeight: '700' },

  // View mode toggle
  viewModeRow: {
    flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 10, padding: 4, gap: 4,
  },
  viewModeBtn: {
    flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 8,
  },
  viewModeBtnActive: { backgroundColor: COLORS.purple + '44' },
  viewModeTxt: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, fontWeight: '600' },
  viewModeTxtActive: { color: COLORS.purple, fontWeight: '800' },

  // Layer accordion
  layerCard: {
    backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden',
  },
  layerHeader: {
    flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: SPACING.sm,
  },
  layerIcon: { fontSize: 18 },
  layerTitle: { flex: 1, color: COLORS.textPrimary, fontSize: FONTS.size.sm, fontWeight: '700' },
  layerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  aiBadge: {
    backgroundColor: COLORS.purple + '33', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2,
    borderWidth: 1, borderColor: COLORS.purple + '66',
  },
  aiBadgeTxt: { color: COLORS.purple, fontSize: 9, fontWeight: '800' },
  layerChevron: { color: COLORS.textSecondary, fontSize: 11 },
  layerBody: {
    padding: SPACING.md, paddingTop: SPACING.sm,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  separator: { height: 1, backgroundColor: COLORS.border, marginVertical: 4 },

  // Markdown
  mdH1: { color: COLORS.gold, fontSize: FONTS.size.lg, fontWeight: '800', marginTop: 8 },
  mdH2: { color: COLORS.goldLight, fontSize: FONTS.size.md, fontWeight: '700', marginTop: 6 },
  mdPara: {
    color: COLORS.textPrimary, fontSize: FONTS.size.sm, lineHeight: 21,
    textAlign: 'justify', flexShrink: 1,
  },
  mdBulletRow: { flexDirection: 'row', gap: 6 },
  mdBulletDot: { color: COLORS.purple, fontWeight: '700', fontSize: FONTS.size.sm, lineHeight: 21 },
  mdBulletText: {
    color: COLORS.textPrimary, fontSize: FONTS.size.sm, flex: 1, lineHeight: 21, textAlign: 'justify',
  },
  mdItalic: {
    color: COLORS.textSecondary, fontSize: FONTS.size.sm, fontStyle: 'italic',
    lineHeight: 21, textAlign: 'justify',
  },
  boldInline: { fontWeight: '700', color: COLORS.gold },
  // Table — cột "Điểm" hẹp, cột "Đánh giá" vừa đủ "Trung bình", cột ý nghĩa chiếm phần còn lại
  tableContainer: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 6,
    overflow: 'hidden', marginVertical: 4,
  },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border + '66' },
  tableHeaderRow: { backgroundColor: COLORS.surface },
  tableRowAlt: { backgroundColor: COLORS.background + '55' },
  tableCell: {
    color: COLORS.textPrimary, fontSize: FONTS.size.xs, padding: 6, lineHeight: 18,
    textAlign: 'justify',
  },
  tableCellHeader: { color: COLORS.gold, fontWeight: '700', fontSize: FONTS.size.xs, padding: 6, lineHeight: 18, textAlign: 'center' },

  // Picker modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: COLORS.background, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalTitle: { color: COLORS.textPrimary, fontSize: FONTS.size.lg, fontWeight: '800' },
  modalClose: { color: COLORS.textSecondary, fontSize: 22 },
  modalEmpty: { color: COLORS.textSecondary, textAlign: 'center', padding: SPACING.xl, fontSize: FONTS.size.sm },
  pickerRow: {
    backgroundColor: COLORS.card, borderRadius: 10, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  pickerName: { color: COLORS.gold, fontSize: FONTS.size.md, fontWeight: '700' },
  pickerSub: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, marginTop: 2 },
});
