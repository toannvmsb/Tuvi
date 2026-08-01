/**
 * Màn hình chi tiết một cung.
 * - Nửa trên: các sao của cung (bố cục giống lá số nhưng to, rõ).
 * - Nửa dưới: chạm tên sao → thông tin sao, gồm 2 mục có thể đóng/mở:
 *     • CƠ BẢN: ý nghĩa chung của sao trong Tử Vi.
 *     • NÂNG CAO: 4 phần theo thứ tự:
 *         1. Ý nghĩa sao tọa tại cung này.
 *         2. Cùng sao đồng cung → cách đặc biệt (nếu có).
 *         3. Tam hợp / Nhị hợp / Xung chiếu → cách (ghi rõ cung/sao).
 *         4. Kiến thức bổ sung: các cục & cách của sao.
 * - Nút "Phân tích AI chuyên sâu": gọi AI miễn phí phân tích cả lá số.
 */
import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
  Modal, TextInput, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, StarEntry, TuViHouse } from '../types';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { getStarColor } from '../data/starElements';
import { getStarInfo, ALL_STAR_NAMES } from '../data/starInfo';
import { analyzePalaceWithAI } from '../utils/aiAnalysis';
import { generateOfflinePalaceLuu, generateOfflinePalaceAdvanced, cutAtSection } from '../core/offlineLuanGiai';
import SimpleMarkdown from '../components/SimpleMarkdown';
import AIProgressBar from '../components/AIProgressBar';
import ExportPdfButton from '../components/ExportPdfButton';
import { chartHeaderLines } from '../utils/pdfExport';
import PaidGate from '../components/PaidGate';
import { fkey } from '../lib/featureKey';
import { getAiResult, setAiResult, clearAiResult } from '../lib/aiResults';
import { premiumBadgeNote, costNote, PREMIUM, AI_PREVIEW } from '../constants/premium';
import { confirmAndUnlock, confirmReanalyze } from '../lib/confirmCharge';

type Props = NativeStackScreenProps<RootStackParamList, 'PalaceDetail'>;

const BRANCHES = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tị', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];

const TAM_HOP: number[][] = [
  [8, 0, 4], [2, 6, 10], [5, 9, 1], [11, 3, 7],
];
const NHI_HOP: Record<number, number> = {
  0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6,
};

function brightnessLabel(b?: string): string {
  switch (b) {
    case 'miếu': return 'M';
    case 'vượng': return 'V';
    case 'đắc': return 'Đ';
    case 'bình': return 'B';
    case 'hãm': return 'H';
    default: return '';
  }
}

// Vòng sao trung tinh phân loại hung (đồng bộ với HouseCell trên lá số).
const VONG_HUNG = new Set([
  'Thái Tuế', 'Tang Môn', 'Quan Phù', 'Tử Phù', 'Tuế Phá',
  'Bạch Hổ', 'Điếu Khách', 'Trực Phù',
  'Tiểu Hao', 'Đại Hao', 'Bệnh Phù', 'Quan Phủ', 'Phục Binh', 'Phi Liêm',
]);

/** Phân loại sao: chính tinh, phụ CÁT (trái), phụ SÁT/HUNG (phải), lưu sao. */
function categorize(stars: StarEntry[]) {
  const chinh: StarEntry[] = [];
  const cat: StarEntry[] = [];
  const hung: StarEntry[] = [];
  const luu: StarEntry[] = [];
  for (const s of stars) {
    if (s.name.startsWith('L. ') || s.type === 'luu') { luu.push(s); continue; }
    if (s.type === 'chinh') { chinh.push(s); continue; }
    if (s.type === 'trung') { (VONG_HUNG.has(s.name) ? hung : cat).push(s); continue; }
    if (s.type === 'hung') { hung.push(s); continue; }
    cat.push(s);
  }
  const phu = [...cat, ...hung];
  return { chinh, phu, cat, hung, luu };
}

function chinhOf(h: TuViHouse): string {
  const c = h.stars
    .filter(s => s.type === 'chinh')
    .map(s => `${s.name}${s.brightness ? `(${brightnessLabel(s.brightness)})` : ''}`)
    .join(', ');
  return c || 'Vô chính diệu';
}

/** Mục có thể đóng/mở */
function Collapsible({
  badge, badgeStyle, note, open, onToggle, children,
}: {
  badge: string; badgeStyle: any; note?: string;
  open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <TouchableOpacity style={styles.secHeader} onPress={onToggle} activeOpacity={0.7}>
        <View style={styles.badgeRow}>
          <Text style={badgeStyle}>{badge}</Text>
          {note ? <Text style={styles.freeTag}>{note}</Text> : null}
        </View>
        <Text style={styles.chevron}>{open ? '▾' : '▸'}</Text>
      </TouchableOpacity>
      {open ? <View style={styles.secBody}>{children}</View> : null}
    </View>
  );
}

export default function PalaceDetailScreen({ route, navigation }: Props) {
  const { result, branchIndex } = route.params;
  const chart = result.tuViChart;
  const house: TuViHouse = chart.houses[branchIndex];
  const { chinh, phu, cat, hung, luu } = categorize(house.stars);

  // Nhận định CỤ THỂ ảnh hưởng Tuần/Triệt: xét cung vốn tốt hay xấu rồi suy ra
  // Tuần/Triệt đang "giảm/hoãn cái tốt" hay "che chắn cái xấu".
  const ttVerdict = (() => {
    if (!house.tuanAt && !house.trietAt) return null;
    const CATS = new Set(['Lộc Tồn', 'Hóa Lộc', 'Hóa Quyền', 'Hóa Khoa', 'Thiên Khôi', 'Thiên Việt',
      'Tả Phù', 'Hữu Bật', 'Văn Xương', 'Văn Khúc', 'Long Trì', 'Phượng Các', 'Tam Thai', 'Bát Tọa',
      'Ân Quang', 'Thiên Quý', 'Quốc Ấn', 'Thiên Phúc', 'Thiên Quan', 'Đào Hoa', 'Hồng Loan', 'Thiên Hỷ']);
    const SATS = new Set(['Kình Dương', 'Đà La', 'Hỏa Tinh', 'Linh Tinh', 'Địa Không', 'Địa Kiếp',
      'Thiên Không', 'Hóa Kỵ', 'Thiên Hình', 'Thiên Riêu', 'Kiếp Sát']);
    let score = 0;
    for (const s of house.stars) {
      const nm = s.name.startsWith('L. ') ? s.name.slice(3) : s.name;
      if (s.type === 'chinh') {
        if (s.brightness === 'miếu' || s.brightness === 'vượng') score += 2;
        else if (s.brightness === 'đắc') score += 1;
        else if (s.brightness === 'hãm') score -= 2;
      }
      if (CATS.has(nm)) score += 1;
      if (SATS.has(nm)) score -= 1;
    }
    if (chinh.length === 0) score -= 1; // VCD hơi yếu
    const good = score > 0;
    return { good, score, vcd: chinh.length === 0 };
  })();

  const [selected, setSelected] = useState<string | null>(
    chinh[0]?.name ?? phu[0]?.name ?? null,
  );
  const [basicOpen, setBasicOpen] = useState(true);
  const [advOpen, setAdvOpen] = useState(true);
  // Ô tra cứu BẤT KỲ sao nào trong Tử Vi (không cần sao đó có tại cung), TẠI cung bất kỳ.
  const [starPickerOpen, setStarPickerOpen] = useState(false);
  const [starSearch, setStarSearch] = useState('');
  const [palacePickerOpen, setPalacePickerOpen] = useState(false);
  // Cung để xem "ý nghĩa tại cung" — mặc định là cung đang xem; có thể đổi.
  const [viewPalace, setViewPalace] = useState(house.palaceName);
  const palaceOptions = useMemo(
    () => result.tuViChart.houses.map(h => h.palaceName),
    [result],
  );
  const filteredStars = useMemo(() => {
    const q = starSearch.trim().toLowerCase();
    return q ? ALL_STAR_NAMES.filter(n => n.toLowerCase().includes(q)) : ALL_STAR_NAMES;
  }, [starSearch]);
  const pickStar = (name: string) => {
    setSelected(name); setBasicOpen(true); setAdvOpen(true);
    setStarPickerOpen(false); setStarSearch('');
  };
  const advText = useMemo(() => generateOfflinePalaceAdvanced(result, branchIndex), [result, branchIndex]);
  const [palaceTab, setPalaceTab] = useState<'offline' | 'ai'>('offline');
  // Luận OFFLINE sao lưu của năm xem ảnh hưởng tới cung này ('' nếu chưa chọn năm).
  const luuText = useMemo(() => generateOfflinePalaceLuu(result, branchIndex), [result, branchIndex]);
  const pdfHeader = useMemo(() => chartHeaderLines(result), [result]);
  const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'done' | 'offline' | 'error' | 'locked'>('idle');
  const [aiText, setAiText] = useState('');
  const [aiShown, setAiShown] = useState('');
  const [aiErr, setAiErr] = useState('');
  const aiRevealRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Hiệu ứng đánh máy cho phần phân tích AI của cung.
  useEffect(() => {
    if (aiRevealRef.current) { clearInterval(aiRevealRef.current); aiRevealRef.current = null; }
    if (!aiText) { setAiShown(''); return; }
    setAiShown('');
    let i = 0;
    aiRevealRef.current = setInterval(() => {
      i += 35;
      if (i >= aiText.length) {
        setAiShown(aiText);
        if (aiRevealRef.current) { clearInterval(aiRevealRef.current); aiRevealRef.current = null; }
      } else {
        setAiShown(aiText.slice(0, i));
      }
    }, 45);
    return () => {
      if (aiRevealRef.current) { clearInterval(aiRevealRef.current); aiRevealRef.current = null; }
    };
  }, [aiText]);

  const relations = useMemo(() => {
    const group = TAM_HOP.find(g => g.includes(branchIndex)) ?? [];
    const tamHop = group.filter(i => i !== branchIndex).map(i => chart.houses[i]);
    const xung = chart.houses[(branchIndex + 6) % 12];
    const nhiHopIdx = NHI_HOP[branchIndex];
    const nhiHop = nhiHopIdx !== undefined ? chart.houses[nhiHopIdx] : undefined;
    return { tamHop, xung, nhiHop };
  }, [branchIndex, chart]);

  const info = selected ? getStarInfo(selected) : undefined;
  const palaceAdvanced = info?.byPalace?.[viewPalace];

  const openAiTab = () => {
    setPalaceTab('ai');
    if (aiStatus === 'idle') {
      const key = fkey(result, `palace:${branchIndex}:ai`);
      const cached = getAiResult(key);
      if (cached) { setAiText(cached); setAiStatus('done'); }
    }
  };

  const runAI = async (force = false) => {
    const key = fkey(result, `palace:${branchIndex}:ai`);
    if (!force) {
      const cached = getAiResult(key);
      if (cached) { setAiText(cached); setAiStatus('done'); return; }
    }
    const r = force ? await confirmReanalyze(key, 'ai') : await confirmAndUnlock(key, 'ai');
    if (r === 'cancel') { setAiStatus('idle'); return; }
    if (r === 'nofund') { setAiStatus('locked'); return; }
    if (force) { try { await clearAiResult(key); } catch {} }
    setAiStatus('loading');
    try {
      const txt = await analyzePalaceWithAI(result, branchIndex);
      setAiText(txt);
      setAiStatus('done');
      setAiResult(key, txt);
    } catch (e: any) {
      if (String(e?.message) === 'OFFLINE') {
        setAiStatus('offline');
      } else {
        setAiErr(e?.message || 'Có lỗi xảy ra.');
        setAiStatus('error');
      }
    }
  };

  const StarChip = ({ s, big }: { s: StarEntry; big?: boolean }) => {
    const isSel = selected === s.name;
    const color = getStarColor(s.name);
    const b = brightnessLabel(s.brightness);
    const hasInfo = !!getStarInfo(s.name);
    return (
      <TouchableOpacity
        onPress={() => { setSelected(s.name); setViewPalace(house.palaceName); setBasicOpen(true); setAdvOpen(true); }}
        activeOpacity={0.7}
        style={[styles.starChip, isSel && styles.starChipSel, !hasInfo && { opacity: 0.55 }]}
      >
        <Text style={[{ color, fontWeight: big ? '800' : '600' }, big ? styles.starBig : styles.starSmall]}>
          {s.name}{b ? ` (${b})` : ''}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.backText} numberOfLines={1}>‹ Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>Cung {house.palaceName}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* NỬA TRÊN */}
        <View style={styles.palaceBox}>
          <View style={styles.palaceHeader}>
            <Text style={styles.palaceName}>{house.palaceName}</Text>
            <Text style={styles.palaceMeta}>
              {house.can} {house.branch}
              {house.isManh ? ' · MỆNH' : ''}{house.isThan ? ' · THÂN' : ''}
            </Text>
          </View>

          <View style={styles.chinhRow}>
            {chinh.length > 0
              ? chinh.map((s, i) => <StarChip key={`c${i}`} s={s} big />)
              : <Text style={styles.voChinhDieu}>(Vô chính diệu)</Text>}
          </View>
          {(cat.length > 0 || hung.length > 0) && (
            <View style={styles.phuCols}>
              {/* Bên trái: cát tinh */}
              <View style={styles.phuColLeft}>
                {cat.map((s, i) => <StarChip key={`pc${i}`} s={s} />)}
              </View>
              {/* Bên phải: sát tinh */}
              <View style={styles.phuColRight}>
                {hung.map((s, i) => <StarChip key={`ph${i}`} s={s} />)}
              </View>
            </View>
          )}
          {luu.length > 0 && (
            <View style={styles.luuWrap}>
              {luu.map((s, i) => <StarChip key={`l${i}`} s={s} />)}
            </View>
          )}

          <View style={styles.miscRow}>
            {!!house.vongTruongSinh && <Text style={styles.miscTag}>Vòng TS: {house.vongTruongSinh}</Text>}
            {!!house.monthIndex && <Text style={styles.miscTag}>Tháng {house.monthIndex}</Text>}
            {!!house.daiVanStartAge && <Text style={styles.miscTag}>Đại vận từ {house.daiVanStartAge} tuổi</Text>}
            {house.tuanAt && <Text style={[styles.miscTag, styles.tagRed]}>Tuần</Text>}
            {house.trietAt && <Text style={[styles.miscTag, styles.tagBlue]}>Triệt</Text>}
          </View>

          <View style={styles.relBox}>
            <Text style={styles.relLine}>▸ Tam hợp: {relations.tamHop.map(h => h.palaceName).join(' · ') || '—'}</Text>
            <Text style={styles.relLine}>▸ Xung chiếu: {relations.xung?.palaceName ?? '—'}</Text>
            <Text style={styles.relLine}>▸ Nhị hợp: {relations.nhiHop?.palaceName ?? '—'}</Text>
          </View>

          {ttVerdict && (
            <View style={styles.ttBox}>
              <Text style={styles.ttTitle}>
                ⚠ Cung bị {house.trietAt ? 'Triệt Lộ' : ''}{house.trietAt && house.tuanAt ? ' + ' : ''}{house.tuanAt ? 'Tuần Không' : ''}
              </Text>
              <Text style={styles.ttBody}>
                {house.trietAt ? 'Triệt Lộ cắt ngang, chặn đứng hiệu lực của cung (mạnh, dứt khoát). ' : ''}
                {house.tuanAt ? 'Tuần Không làm chậm, hoãn lại hiệu lực (nhẹ hơn Triệt). ' : ''}
              </Text>
              <Text style={styles.ttVerdict}>
                {ttVerdict.vcd
                  ? `→ Cung VÔ CHÍNH DIỆU gặp ${house.trietAt && house.tuanAt ? 'cả Tuần và Triệt' : house.trietAt ? 'Triệt' : 'Tuần'}: nương vào sao xung chiếu — đôi khi thành cách "đắc Không" hậu phát, nhưng nửa đầu đời lận đận, định hướng muộn.`
                  : ttVerdict.good
                  ? '→ Đây vốn là cung TỐT (chính tinh sáng / nhiều cát tinh), nên Tuần/Triệt làm GIẢM – HOÃN cái tốt: thành tựu của lĩnh vực này đến muộn, dễ gãy giữa chừng rồi mới ổn. Cần kiên nhẫn, đừng nóng vội ở nửa đầu đời.'
                  : '→ Đây vốn là cung XẤU (chính tinh hãm / nhiều sát tinh), nên Tuần/Triệt lại CHE CHẮN, chặn bớt cái hung: tai họa, trắc trở của lĩnh vực này được hóa giải đáng kể — là điều may.'}
              </Text>
              <Text style={styles.ttBody}>
                Ảnh hưởng mạnh nhất ở nửa đầu đời (trước ~30 tuổi), về sau nhạt dần.
              </Text>
            </View>
          )}

          <Text style={styles.hint}>Chạm vào tên sao để xem ý nghĩa ↓</Text>
        </View>

        {/* TRA CỨU SAO BẤT KỲ TẠI CUNG BẤT KỲ — học thêm sao không có tại cung này */}
        <View style={styles.starLookupBox}>
          <Text style={styles.starLookupLabel}>🔎 Tra cứu thêm sao khác</Text>
          <Text style={styles.starLookupHint}>
            Chọn bất kỳ sao nào trong Tử Vi (và chọn cung muốn xem) để hiểu ý nghĩa của sao đó tại cung đó.
          </Text>
          <View style={styles.lookupRow}>
            <TouchableOpacity
              style={[styles.starLookupBtn, { flex: 1 }]}
              onPress={() => { setStarSearch(''); setStarPickerOpen(true); }}
              activeOpacity={0.85}
            >
              <Text style={styles.starLookupBtnText} numberOfLines={1}>
                {selected ? `★ ${selected}` : 'Chọn sao…'}
              </Text>
              <Text style={styles.pickerArrow}>▾</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.starLookupBtn, { flex: 1 }]}
              onPress={() => setPalacePickerOpen(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.starLookupBtnText} numberOfLines={1}>
                Cung {viewPalace}
              </Text>
              <Text style={styles.pickerArrow}>▾</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* NỬA DƯỚI — thông tin sao */}
        {selected ? (
          <View style={styles.infoBox}>
            <Text style={[styles.infoStarName, { color: getStarColor(selected) }]}>{selected}</Text>

            {info ? (
              <>
                {/* CƠ BẢN — MIỄN PHÍ: ý nghĩa tổng quát + ý nghĩa tại cung + sao lưu năm */}
                <Collapsible
                  badge="CƠ BẢN" badgeStyle={styles.badgeBasic} note="Miễn phí"
                  open={basicOpen} onToggle={() => setBasicOpen(o => !o)}
                >
                  <Text style={styles.subHead}>1. Ý nghĩa tổng quát</Text>
                  <Text style={styles.bodyText}>{info.basic}</Text>

                  <Text style={styles.subHead}>2. Ý nghĩa tại cung {viewPalace}</Text>
                  <Text style={styles.bodyText}>
                    {palaceAdvanced ?? `Sao ${selected} tại cung ${viewPalace}: ý nghĩa tương tự phần tổng quát bên trên.`}
                  </Text>

                  {!!luuText && (
                    <>
                      <Text style={styles.subHead}>
                        3. Sao lưu năm {chart.viewingYear ?? ''} ảnh hưởng tới cung này
                      </Text>
                      <SimpleMarkdown content={luuText} />
                    </>
                  )}
                </Collapsible>
              </>
            ) : (
              <Text style={styles.bodyText}>
                Chưa có dữ liệu cho sao "{selected}". Dữ liệu đang được bổ sung dần.
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.infoBox}>
            <Text style={styles.bodyText}>Chạm vào một sao ở trên để xem chi tiết.</Text>
          </View>
        )}

        {/* TAB: Nâng cao / Phân tích AI */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tab, palaceTab === 'offline' && styles.tabActive]}
            onPress={() => setPalaceTab('offline')}
          >
            <Text style={[styles.tabTxt, palaceTab === 'offline' && styles.tabTxtActive]}>📘 Nâng cao</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, palaceTab === 'ai' && styles.tabActive]}
            onPress={openAiTab}
          >
            <Text style={[styles.tabTxt, palaceTab === 'ai' && styles.tabTxtActive]}>🤖 Phân tích AI</Text>
          </TouchableOpacity>
        </View>

        {palaceTab === 'offline' ? (
          <View style={styles.tabContent}>
            <PaidGate unlockKey={fkey(result, `palace:${branchIndex}:adv`)} kind="advanced" cost={PREMIUM.COST.advancedMajor}
              preview={cutAtSection(advText, '2. Chính tinh & cách cục')}>
              <SimpleMarkdown content={advText} />
              <ExportPdfButton
                title={`Phân tích nâng cao cung ${house.palaceName}`}
                subtitle="Bản Nâng cao (offline)"
                badge="NÂNG CAO"
                headerLines={pdfHeader}
                fileName={`${result.birthInfo.name || 'Lá số'} - Cung ${house.palaceName} - Nâng cao`}
                getContent={() => advText}
              />
            </PaidGate>
          </View>
        ) : (
          <View style={styles.tabContent}>
            {aiStatus === 'idle' && (
              <>
                <Text style={styles.aiValueNote}>{AI_PREVIEW.palace}</Text>
                <TouchableOpacity style={styles.runAiBtn} onPress={() => runAI()} activeOpacity={0.85}>
                  <Text style={styles.runAiBtnText}>🤖 Phân tích AI đầy đủ cung {house.palaceName} ({costNote(PREMIUM.COST.ai)})</Text>
                </TouchableOpacity>
              </>
            )}
            {aiStatus === 'loading' && (
              <AIProgressBar label={`AI đang luận giải cung ${house.palaceName}…`} />
            )}
            {aiStatus === 'locked' && (
              <Text style={styles.bodyText}>🔒 Mục "Phân tích AI" là tính năng trả phí. Hiện chưa mở khóa cho tài khoản này.</Text>
            )}
            {aiStatus === 'offline' && (
              <Text style={styles.bodyText}>⚠ Cần kết nối mạng để hệ thống phân tích chuyên sâu. Vui lòng kiểm tra Internet rồi thử lại.</Text>
            )}
            {aiStatus === 'error' && (
              <Text style={styles.bodyText}>⚠ {aiErr}</Text>
            )}
            {aiStatus === 'done' && (
              <>
                <SimpleMarkdown content={aiShown || aiText} />
                {aiShown.length < aiText.length && (
                  <Text style={styles.bodyTextDim}>▌ đang hiển thị… ({Math.round(aiShown.length / Math.max(1, aiText.length) * 100)}%)</Text>
                )}
                <Text style={styles.bodyTextDim}>* Nội dung do AI tạo, mang tính tham khảo; không thay thế luận giải chuyên gia.</Text>
                {aiShown.length >= aiText.length && (
                  <ExportPdfButton
                    title={`Phân tích cung ${house.palaceName}`}
                    subtitle="Bản Phân tích AI"
                    badge="PHÂN TÍCH AI"
                    headerLines={pdfHeader}
                    fileName={`${result.birthInfo.name || 'Lá số'} - Cung ${house.palaceName} - AI`}
                    getContent={() => aiText || aiShown}
                  />
                )}
                <TouchableOpacity style={styles.aiRetry} onPress={() => runAI(true)}>
                  <Text style={styles.aiRetryText}>↻ Phân tích lại (−{PREMIUM.COST.ai} xu)</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        <TouchableOpacity style={styles.bottomBack} onPress={() => navigation.goBack()}>
          <Text style={styles.bottomBackText}>← Về lá số</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* MODAL chọn sao để tra cứu — có ô tìm để khỏi kéo nhiều */}
      <Modal visible={starPickerOpen} transparent animationType="fade" onRequestClose={() => setStarPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn sao để tra cứu</Text>
              <TouchableOpacity onPress={() => setStarPickerOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalSearch}
              placeholder="Nhập tên sao… (vd: Tử Vi, Văn Xương)"
              placeholderTextColor={COLORS.textMuted}
              value={starSearch}
              onChangeText={setStarSearch}
              autoCorrect={false}
            />
            <FlatList
              data={filteredStars}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              style={styles.modalList}
              initialNumToRender={20}
              ListEmptyComponent={<Text style={styles.modalEmpty}>Không tìm thấy sao phù hợp.</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => pickStar(item)} activeOpacity={0.7}>
                  <Text style={[styles.modalItemText, { color: getStarColor(item) }]}>{item}</Text>
                  {selected === item && <Text style={styles.modalItemCheck}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* MODAL chọn cung để xem ý nghĩa sao tại cung đó */}
      <Modal visible={palacePickerOpen} transparent animationType="fade" onRequestClose={() => setPalacePickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn cung để xem</Text>
              <TouchableOpacity onPress={() => setPalacePickerOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={palaceOptions}
              keyExtractor={(item) => item}
              style={styles.modalList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => { setViewPalace(item); setPalacePickerOpen(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalItemText}>
                    Cung {item}{item === house.palaceName ? '  (đang xem)' : ''}
                  </Text>
                  {viewPalace === item && <Text style={styles.modalItemCheck}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { width: 90 },
  backText: { color: COLORS.gold, fontSize: FONTS.size.sm, fontWeight: '700' },
  topTitle: { color: COLORS.textPrimary, fontSize: FONTS.size.lg, fontWeight: '800', flex: 1, textAlign: 'center' },
  scroll: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xxl },

  palaceBox: {
    backgroundColor: COLORS.cellBg, borderRadius: 10,
    borderWidth: 2, borderColor: COLORS.gold, padding: SPACING.md, gap: SPACING.sm,
  },
  palaceHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: SPACING.xs,
  },
  palaceName: { color: COLORS.gold, fontSize: FONTS.size.xl, fontWeight: '800', textTransform: 'uppercase' },
  palaceMeta: { color: COLORS.goldLight, fontSize: FONTS.size.sm, fontWeight: '700' },

  chinhRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, justifyContent: 'center', paddingVertical: SPACING.xs },
  voChinhDieu: { color: '#c8d0e8', fontSize: FONTS.size.lg, fontStyle: 'italic' },
  phuWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  // Phụ tinh 2 cột: cát bên trái, sát bên phải (như ô lá số)
  phuCols: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs },
  phuColLeft: { flex: 1, alignItems: 'flex-start', gap: SPACING.xs },
  phuColRight: { flex: 1, alignItems: 'flex-end', gap: SPACING.xs },
  luuWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, borderTopWidth: 0.5, borderTopColor: COLORS.border, paddingTop: SPACING.xs },

  starChip: {
    paddingHorizontal: SPACING.sm, paddingVertical: 4,
    borderRadius: 6, borderWidth: 1, borderColor: 'transparent',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  starChipSel: { borderColor: COLORS.gold, backgroundColor: 'rgba(245,185,66,0.18)' },
  starBig: { fontSize: FONTS.size.xl },
  starSmall: { fontSize: FONTS.size.md },

  miscRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  miscTag: {
    color: COLORS.textSecondary, fontSize: FONTS.size.xs,
    backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  tagRed: { color: '#fff', backgroundColor: '#e63946' },
  tagBlue: { color: '#fff', backgroundColor: '#2563eb' },

  relBox: {
    backgroundColor: COLORS.background, borderRadius: 6, padding: SPACING.sm, gap: 2,
    borderWidth: 1, borderColor: COLORS.border,
  },
  relLine: { color: COLORS.textPrimary, fontSize: FONTS.size.sm },
  ttBox: {
    backgroundColor: 'rgba(230,57,70,0.08)', borderRadius: 6, padding: SPACING.sm,
    borderWidth: 1, borderColor: 'rgba(230,57,70,0.4)', gap: 4,
  },
  ttTitle: { color: '#ff7a85', fontSize: FONTS.size.sm, fontWeight: '800' },
  ttBody: { color: COLORS.textSecondary, fontSize: FONTS.size.xs, lineHeight: 18 },
  ttVerdict: { color: COLORS.textPrimary, fontSize: FONTS.size.sm, lineHeight: 20, fontWeight: '600' },
  hint: { color: COLORS.goldLight, fontSize: FONTS.size.sm, textAlign: 'center', fontStyle: 'italic' },

  // Ô tra cứu sao bất kỳ.
  starLookupBox: {
    backgroundColor: COLORS.surface, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, gap: 4, marginBottom: SPACING.sm,
  },
  starLookupLabel: { color: COLORS.gold, fontSize: FONTS.size.md, fontWeight: '800' },
  starLookupHint: { color: COLORS.textSecondary, fontSize: FONTS.size.xs, lineHeight: 17 },
  lookupRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: 4 },
  starLookupBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.card, borderRadius: 8, borderWidth: 1, borderColor: COLORS.gold,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
  },
  starLookupBtnText: { color: COLORS.textPrimary, fontSize: FONTS.size.md, fontWeight: '700', flex: 1 },
  pickerArrow: { color: COLORS.goldLight, fontSize: FONTS.size.md, fontWeight: '800', marginLeft: 8 },

  // Modal chọn sao.
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: SPACING.lg },
  modalCard: {
    backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.gold,
    maxHeight: '80%', padding: SPACING.md, gap: SPACING.sm,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { color: COLORS.gold, fontSize: FONTS.size.lg, fontWeight: '800' },
  modalClose: { color: COLORS.textSecondary, fontSize: FONTS.size.lg, fontWeight: '800' },
  modalSearch: {
    backgroundColor: COLORS.surface, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border,
    color: COLORS.textPrimary, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, fontSize: FONTS.size.md,
  },
  modalList: { flexGrow: 0 },
  modalItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.sm,
    borderBottomWidth: 0.5, borderBottomColor: COLORS.border,
  },
  modalItemText: { fontSize: FONTS.size.md, fontWeight: '700' },
  modalItemCheck: { color: COLORS.gold, fontSize: FONTS.size.md, fontWeight: '800' },
  modalEmpty: { color: COLORS.textSecondary, textAlign: 'center', padding: SPACING.lg, fontStyle: 'italic' },

  tabsRow: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderRadius: 8, borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden', marginTop: SPACING.xs,
  },
  tab: {
    flex: 1, paddingVertical: SPACING.sm, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.gold, backgroundColor: COLORS.gold + '11' },
  tabTxt: { color: COLORS.textSecondary, fontWeight: '700', fontSize: FONTS.size.sm },
  tabTxtActive: { color: COLORS.gold },
  tabContent: {
    backgroundColor: COLORS.surface, borderRadius: 8, padding: SPACING.md,
    gap: SPACING.xs, borderWidth: 1, borderColor: COLORS.border, marginTop: 2,
  },
  aiValueNote: { color: COLORS.goldLight, fontSize: FONTS.size.sm, fontStyle: 'italic', lineHeight: 18 },
  runAiBtn: {
    backgroundColor: COLORS.purple, borderRadius: 8,
    paddingVertical: SPACING.sm, alignItems: 'center', marginTop: SPACING.xs,
  },
  runAiBtnText: { color: '#fff', fontWeight: '800', fontSize: FONTS.size.sm, textAlign: 'center' },
  aiRetry: {
    alignSelf: 'flex-start', marginTop: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.purple, borderRadius: 6,
    paddingHorizontal: SPACING.md, paddingVertical: 4,
  },
  aiRetryText: { color: COLORS.purple, fontSize: FONTS.size.sm, fontWeight: '700' },

  infoBox: {
    backgroundColor: COLORS.card, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, gap: SPACING.sm,
  },
  infoStarName: { fontSize: FONTS.size.xxl, fontWeight: '800' },
  section: {
    backgroundColor: COLORS.surface, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  secHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.md,
  },
  secBody: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.md, gap: SPACING.xs },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexWrap: 'wrap', flex: 1 },
  chevron: { color: COLORS.goldLight, fontSize: FONTS.size.lg, fontWeight: '800' },
  badgeBasic: {
    color: '#1a0a00', backgroundColor: COLORS.green, fontWeight: '800',
    fontSize: FONTS.size.xs, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4,
  },
  freeTag: { color: COLORS.green, fontSize: FONTS.size.xs, fontWeight: '700' },
  subHead: { color: COLORS.goldLight, fontSize: FONTS.size.md, fontWeight: '700', marginTop: SPACING.sm },
  bodyText: { color: COLORS.textPrimary, fontSize: FONTS.size.md, lineHeight: 22, textAlign: 'justify' },
  bodyTextDim: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, fontStyle: 'italic', marginTop: SPACING.xs },
  relDetail: { color: COLORS.textPrimary, fontSize: FONTS.size.sm, lineHeight: 20 },
  relTag: { color: COLORS.goldLight, fontWeight: '800' },
  relStar: { color: COLORS.gold, fontWeight: '800' },
  adviceText: { color: COLORS.textPrimary, fontSize: FONTS.size.sm, lineHeight: 20, marginTop: SPACING.sm, backgroundColor: COLORS.gold + '14', borderRadius: 6, padding: SPACING.sm },
  cachItem: {
    backgroundColor: COLORS.background, borderRadius: 6, padding: SPACING.sm,
    gap: 2, borderLeftWidth: 3, borderLeftColor: COLORS.gold, marginTop: 2,
  },
  cachName: { fontSize: FONTS.size.md, fontWeight: '800' },

  bottomBack: {
    alignSelf: 'center', marginTop: SPACING.md,
    backgroundColor: COLORS.gold, borderRadius: 8,
    paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm,
  },
  bottomBackText: { color: '#1a0a00', fontSize: FONTS.size.md, fontWeight: '800' },
});
