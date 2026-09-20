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
  Modal, TextInput, FlatList, Pressable,
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
import { Screen, Card, Display, Eyebrow, Body, SectionTitle, Segmented, GoldButton, OutlineButton } from '../ui';
import Icon from '../ui/Icon';
import { openAiChat } from '../lib/aiChatBus';

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

  const kindMeta = {
    chinh: { color: COLORS.goldLight, tag: 'Chính tinh' },
    cat: { color: COLORS.blue, tag: 'Cát' },
    hung: { color: COLORS.red, tag: 'Hung' },
    luu: { color: COLORS.starLuu, tag: 'Lưu' },
  } as const;
  type Kind = keyof typeof kindMeta;
  const BRIGHT_STEPS: { key: string; label: string }[] = [
    { key: 'miếu', label: 'Miếu' }, { key: 'vượng', label: 'Vượng' }, { key: 'đắc', label: 'Đắc' },
    { key: 'bình', label: 'Bình' }, { key: 'hãm', label: 'Hãm' },
  ];
  const oneLine = (t?: string) => {
    if (!t) return 'Dữ liệu đang được bổ sung';
    const first = t.split(/(?<=[.;])\s/)[0];
    return first.length > 88 ? `${first.slice(0, 85).trim()}…` : first;
  };

  /** 1 sao = 1 hàng; chạm để mở chi tiết ngay dưới hàng (ý nghĩa sao · tại cung này · sao lưu). */
  const StarRow = ({ s, kind }: { s: StarEntry; kind: Kind }) => {
    const isSel = selected === s.name;
    const meta = kindMeta[kind];
    const inf = getStarInfo(s.name);
    const b = brightnessLabel(s.brightness);
    const isLuu = kind === 'luu';
    return (
      <View style={{ gap: 8 }}>
        <Pressable
          onPress={() => { setSelected(isSel ? null : s.name); setViewPalace(house.palaceName); }}
          accessibilityRole="button" accessibilityState={{ expanded: isSel }}
          style={[ps.row, { borderColor: isSel ? COLORS.gold : meta.color + '4D', backgroundColor: isSel ? 'rgba(226,194,133,0.12)' : 'rgba(255,255,255,0.05)' }, isLuu && { borderStyle: 'dashed' }]}
        >
          <View style={[ps.glyph, { backgroundColor: meta.color + '2E' }, isLuu && { borderWidth: 1.5, borderStyle: 'dashed', borderColor: meta.color }]}>
            {isLuu
              ? <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 16, color: meta.color }}>L</Text>
              : <Icon name="spark" size={22} color={meta.color} />}
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[ps.starName, kind === 'chinh' && { fontFamily: FONTS.displayBold, fontSize: 22 }]}>
              {s.name.replace(/^L\. /, 'Lưu ')}{b ? <Text style={ps.bright}>{`  ${b}`}</Text> : null}
            </Text>
            <Text style={ps.oneLine} numberOfLines={2}>{oneLine(inf?.basic)}</Text>
          </View>
          <View style={[ps.tag, { backgroundColor: meta.color + '26' }]}><Text style={[ps.tagTxt, { color: meta.color }]}>{meta.tag}</Text></View>
          <Icon name={isSel ? 'chev' : 'chev'} size={16} color={COLORS.textMuted} />
        </Pressable>
        {isSel ? <StarDetail s={s} /> : null}
      </View>
    );
  };

  /** Khối chi tiết của sao đang chọn. */
  const StarDetail = ({ s }: { s?: StarEntry }) => {
    if (!selected) return null;
    const isChinh = s?.type === 'chinh';
    return (
      <Card hero={isChinh} style={{ gap: 12 }}>
        {isChinh && (
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {BRIGHT_STEPS.map(st => {
              const on = s?.brightness === st.key;
              return (
                <View key={st.key} style={[ps.step, on && { backgroundColor: COLORS.gold }]}>
                  <Text style={[ps.stepTxt, on && { color: '#1E1230', fontFamily: FONTS.bodyBold }]}>{st.label}</Text>
                </View>
              );
            })}
          </View>
        )}
        {info ? (
          <>
            <View style={[ps.block, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
              <Text style={[ps.blockLabel, { color: COLORS.blue }]}>Ý NGHĨA CỦA SAO</Text>
              <Text style={ps.blockBody}>{info.basic}</Text>
            </View>
            <View style={[ps.block, { backgroundColor: 'rgba(226,194,133,0.1)', borderColor: 'rgba(226,194,133,0.28)', borderWidth: 1 }]}>
              <Text style={[ps.blockLabel, { color: COLORS.gold }]}>{`TẠI CUNG ${viewPalace.toUpperCase()}`}</Text>
              <Text style={ps.blockBody}>
                {palaceAdvanced ?? `Sao ${selected} tại cung ${viewPalace}: ý nghĩa tương tự phần tổng quát bên trên.`}
              </Text>
            </View>
            {!!luuText && (
              <View style={[ps.block, { backgroundColor: 'rgba(168,209,104,0.08)', borderColor: 'rgba(168,209,104,0.35)', borderWidth: 1 }]}>
                <Text style={[ps.blockLabel, { color: COLORS.starLuu }]}>{`SAO LƯU NĂM ${chart.viewingYear ?? ''} ẢNH HƯỞNG CUNG NÀY`}</Text>
                <SimpleMarkdown content={luuText} />
              </View>
            )}
          </>
        ) : (
          <Body>{`Chưa có dữ liệu cho sao "${selected}". Dữ liệu đang được bổ sung dần.`}</Body>
        )}
      </Card>
    );
  };

  const groups: { title: string; sub: string; kind: Kind; list: StarEntry[] }[] = [
    { title: 'Chính tinh', sub: `${chinh.length} sao`, kind: 'chinh', list: chinh },
    { title: 'Phụ tinh cát', sub: `${cat.length} sao`, kind: 'cat', list: cat },
    { title: 'Sát tinh và hung', sub: `${hung.length} sao`, kind: 'hung', list: hung },
    { title: `Sao lưu năm ${chart.viewingYear ?? ''}`, sub: 'Chỉ có hiệu lực trong năm', kind: 'luu', list: luu },
  ];
  const selectedInHouse = house.stars.some(s => s.name === selected);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Screen>
        {/* Thanh trên */}
        <View style={ps.topRow}>
          <Pressable style={ps.roundBtn} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Quay lại">
            <Icon name="back" size={22} />
          </Pressable>
          <Eyebrow>Chi tiết cung</Eyebrow>
          <View style={{ width: 44 }} />
        </View>

        {/* Hero cung */}
        <Card hero style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <View style={ps.palaceBadge}><Text style={ps.palaceBadgeTxt}>{`CUNG ${house.palaceName.toUpperCase()}`}</Text></View>
            <Text style={ps.meta}>
              {`${house.can} ${house.branch} · hành ${house.element}`}{house.isThan ? ' · THÂN' : ''}
            </Text>
          </View>
          <Display size={34} color={COLORS.goldLight}>
            {chinh.length ? chinh.map(c => c.name).join(' · ') : 'Vô chính diệu'}
          </Display>
          <Body>{`${chinh.length} chính tinh · ${cat.length + hung.length} phụ tinh · ${luu.length} sao lưu`}</Body>
          <View style={ps.chipRow}>
            {!!house.vongTruongSinh && <Text style={ps.miscTag}>{`Tràng Sinh: ${house.vongTruongSinh}`}</Text>}
            {!!house.monthIndex && <Text style={ps.miscTag}>{`Tháng ${house.monthIndex}`}</Text>}
            {!!house.daiVanStartAge && <Text style={ps.miscTag}>{`Đại vận từ ${house.daiVanStartAge} tuổi`}</Text>}
            {house.tuanAt && <Text style={[ps.miscTag, ps.tagRed]}>Tuần</Text>}
            {house.trietAt && <Text style={[ps.miscTag, ps.tagBlue]}>Triệt</Text>}
          </View>
        </Card>

        {/* Danh sách sao theo nhóm */}
        {groups.filter(g => g.list.length > 0 || g.kind === 'chinh').map(g => (
          <View key={g.kind} style={{ gap: 10 }}>
            <SectionTitle title={g.title} sub={g.sub} />
            {g.list.length === 0
              ? <Body size={13}>Cung vô chính diệu: xem các sao xung chiếu để luận.</Body>
              : g.list.map((st, i) => <StarRow key={`${g.kind}${i}`} s={st} kind={g.kind} />)}
          </View>
        ))}

        {/* Sao tra cứu (không có tại cung này) */}
        {selected && !selectedInHouse ? (
          <View style={{ gap: 10 }}>
            <SectionTitle title={`Tra cứu: ${selected}`} sub={`tại cung ${viewPalace}`} />
            <StarDetail />
          </View>
        ) : null}

        {/* Tam hợp · xung chiếu · nhị hợp */}
        <Card style={{ gap: 10 }}>
          <SectionTitle title="Quan hệ giữa các cung" />
          <Text style={ps.relLine}><Text style={ps.relKey}>Tam hợp: </Text>{relations.tamHop.map(h => h.palaceName).join(' · ') || '—'}</Text>
          <Text style={ps.relLine}><Text style={ps.relKey}>Xung chiếu: </Text>{relations.xung?.palaceName ?? '—'}</Text>
          <Text style={ps.relLine}><Text style={ps.relKey}>Nhị hợp: </Text>{relations.nhiHop?.palaceName ?? '—'}</Text>
        </Card>

        {ttVerdict && (
          <Card tint={COLORS.red} style={{ gap: 6 }}>
            <Text style={ps.ttTitle}>
              {`Cung bị ${house.trietAt ? 'Triệt Lộ' : ''}${house.trietAt && house.tuanAt ? ' + ' : ''}${house.tuanAt ? 'Tuần Không' : ''}`}
            </Text>
            <Body size={12.5}>
              {house.trietAt ? 'Triệt Lộ cắt ngang, chặn đứng hiệu lực của cung (mạnh, dứt khoát). ' : ''}
              {house.tuanAt ? 'Tuần Không làm chậm, hoãn lại hiệu lực (nhẹ hơn Triệt). ' : ''}
            </Body>
            <Text style={ps.ttVerdict}>
              {ttVerdict.vcd
                ? `Cung vô chính diệu gặp ${house.trietAt && house.tuanAt ? 'cả Tuần và Triệt' : house.trietAt ? 'Triệt' : 'Tuần'}: nương vào sao xung chiếu; đôi khi thành cách "đắc Không" hậu phát, nhưng nửa đầu đời lận đận, định hướng muộn.`
                : ttVerdict.good
                ? 'Đây vốn là cung tốt (chính tinh sáng, nhiều cát tinh), nên Tuần/Triệt làm giảm và hoãn cái tốt: thành tựu của lĩnh vực này đến muộn, cần kiên nhẫn ở nửa đầu đời.'
                : 'Đây vốn là cung xấu (chính tinh hãm, nhiều sát tinh), nên Tuần/Triệt lại che chắn, chặn bớt cái hung: trắc trở của lĩnh vực này được hóa giải đáng kể.'}
            </Text>
            <Body size={12.5}>Ảnh hưởng mạnh nhất ở nửa đầu đời (trước khoảng 30 tuổi), về sau nhạt dần.</Body>
          </Card>
        )}

        {/* Tra cứu sao khác */}
        <Card style={{ gap: 8 }}>
          <Text style={ps.lookupTitle}>Tra cứu thêm sao khác</Text>
          <Body size={12.5}>Chọn bất kỳ sao nào và cung muốn xem để hiểu ý nghĩa của sao đó tại cung đó.</Body>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <Pressable style={ps.pick} onPress={() => { setStarSearch(''); setStarPickerOpen(true); }} accessibilityRole="button">
              <Text style={ps.pickTxt} numberOfLines={1}>{selected ? `★ ${selected}` : 'Chọn sao…'}</Text>
              <Icon name="chev" size={14} color={COLORS.goldLight} />
            </Pressable>
            <Pressable style={ps.pick} onPress={() => setPalacePickerOpen(true)} accessibilityRole="button">
              <Text style={ps.pickTxt} numberOfLines={1}>{`Cung ${viewPalace}`}</Text>
              <Icon name="chev" size={14} color={COLORS.goldLight} />
            </Pressable>
          </View>
        </Card>

        {/* Nâng cao / Phân tích AI */}
        <Segmented
          options={[{ value: 'offline', label: 'Nâng cao' }, { value: 'ai', label: 'Phân tích AI' }]}
          value={palaceTab}
          onChange={(v) => (v === 'ai' ? openAiTab() : setPalaceTab('offline'))}
        />
        {palaceTab === 'offline' ? (
          <Card style={{ gap: 8 }}>
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
          </Card>
        ) : (
          <Card style={{ gap: 10 }}>
            {aiStatus === 'idle' && (
              <>
                <Body>{AI_PREVIEW.palace}</Body>
                <GoldButton label={`Phân tích AI cung ${house.palaceName} (${costNote(PREMIUM.COST.ai)})`} onPress={() => runAI()} />
              </>
            )}
            {aiStatus === 'loading' && <AIProgressBar label={`AI đang luận giải cung ${house.palaceName}…`} />}
            {aiStatus === 'locked' && <Body>Mục "Phân tích AI" là tính năng trả phí. Hiện chưa mở khóa cho tài khoản này.</Body>}
            {aiStatus === 'offline' && <Body>Cần kết nối mạng để hệ thống phân tích chuyên sâu. Vui lòng kiểm tra Internet rồi thử lại.</Body>}
            {aiStatus === 'error' && <Body>{aiErr}</Body>}
            {aiStatus === 'done' && (
              <>
                <SimpleMarkdown content={aiShown || aiText} />
                {aiShown.length < aiText.length && (
                  <Body size={12.5}>{`Đang hiển thị… ${Math.round(aiShown.length / Math.max(1, aiText.length) * 100)}%`}</Body>
                )}
                <Body size={12.5}>Nội dung do AI tạo, mang tính tham khảo; không thay thế luận giải chuyên gia.</Body>
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
                <OutlineButton label={`Phân tích lại (−${PREMIUM.COST.ai} xu)`} onPress={() => runAI(true)} />
              </>
            )}
          </Card>
        )}

        <GoldButton label="Hỏi Tuzi về cung này" icon={<Icon name="spark" size={20} color="#1E1230" strokeWidth={2} />} onPress={() => openAiChat()} />
      </Screen>

      {/* Chọn sao để tra cứu */}
      <Modal visible={starPickerOpen} transparent animationType="fade" onRequestClose={() => setStarPickerOpen(false)}>
        <View style={ps.modalBackdrop}>
          <View style={ps.modalCard}>
            <View style={ps.modalHeader}>
              <Text style={ps.modalTitle}>Chọn sao để tra cứu</Text>
              <Pressable onPress={() => setStarPickerOpen(false)} style={ps.modalClose} accessibilityRole="button" accessibilityLabel="Đóng">
                <Icon name="plus" size={20} color={COLORS.textSecondary} />
              </Pressable>
            </View>
            <TextInput
              style={ps.modalSearch}
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
              style={{ flexGrow: 0 }}
              initialNumToRender={20}
              ListEmptyComponent={<Text style={ps.modalEmpty}>Không tìm thấy sao phù hợp.</Text>}
              renderItem={({ item }) => (
                <Pressable style={ps.modalItem} onPress={() => pickStar(item)} accessibilityRole="button">
                  <Text style={[ps.modalItemText, { color: getStarColor(item) }]}>{item}</Text>
                  {selected === item && <Icon name="check" size={18} color={COLORS.gold} />}
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Chọn cung để xem ý nghĩa sao tại cung đó */}
      <Modal visible={palacePickerOpen} transparent animationType="fade" onRequestClose={() => setPalacePickerOpen(false)}>
        <View style={ps.modalBackdrop}>
          <View style={ps.modalCard}>
            <View style={ps.modalHeader}>
              <Text style={ps.modalTitle}>Chọn cung để xem</Text>
              <Pressable onPress={() => setPalacePickerOpen(false)} style={ps.modalClose} accessibilityRole="button" accessibilityLabel="Đóng">
                <Icon name="plus" size={20} color={COLORS.textSecondary} />
              </Pressable>
            </View>
            <FlatList
              data={palaceOptions}
              keyExtractor={(item) => item}
              style={{ flexGrow: 0 }}
              renderItem={({ item }) => (
                <Pressable
                  style={ps.modalItem}
                  onPress={() => { setViewPalace(item); setPalacePickerOpen(false); }}
                  accessibilityRole="button"
                >
                  <Text style={ps.modalItemText}>{`Cung ${item}${item === house.palaceName ? '  (đang xem)' : ''}`}</Text>
                  {viewPalace === item && <Icon name="check" size={18} color={COLORS.gold} />}
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const ps = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  roundBtn: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(226,194,133,0.2)',
  },
  palaceBadge: { backgroundColor: COLORS.gold, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  palaceBadgeTxt: { fontFamily: FONTS.bodyBold, fontSize: 11, letterSpacing: 1.4, color: '#1E1230' },
  meta: { fontFamily: FONTS.body, fontSize: 12.5, color: COLORS.textSecondary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  miscTag: {
    fontFamily: FONTS.body, fontSize: 12, color: COLORS.textPrimary, overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
  },
  tagRed: { backgroundColor: 'rgba(231,123,107,0.25)', color: '#F3B0A5' },
  tagBlue: { backgroundColor: 'rgba(127,182,240,0.25)', color: '#9CC4F2' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, padding: 12, borderRadius: 18, borderWidth: 1 },
  glyph: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  starName: { fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.textPrimary },
  bright: { fontFamily: FONTS.bodySemi, fontSize: 11, color: COLORS.textMuted },
  oneLine: { fontFamily: FONTS.body, fontSize: 12.5, lineHeight: 17, color: COLORS.textSecondary },
  tag: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  tagTxt: { fontFamily: FONTS.bodyBold, fontSize: 11 },
  step: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.07)' },
  stepTxt: { fontFamily: FONTS.bodySemi, fontSize: 11, color: COLORS.textMuted },
  block: { borderRadius: 14, padding: 12, gap: 5 },
  blockLabel: { fontFamily: FONTS.bodyBold, fontSize: 10.5, letterSpacing: 1.4 },
  blockBody: { fontFamily: FONTS.body, fontSize: 13.5, lineHeight: 21, color: '#F3EBDC' },
  relLine: { fontFamily: FONTS.body, fontSize: 14, color: COLORS.textPrimary },
  relKey: { fontFamily: FONTS.bodySemi, color: COLORS.goldLight },
  ttTitle: { fontFamily: FONTS.bodyBold, fontSize: 14, color: '#F3B0A5' },
  ttVerdict: { fontFamily: FONTS.bodySemi, fontSize: 13.5, lineHeight: 20, color: COLORS.textPrimary },
  lookupTitle: { fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.gold },
  pick: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48,
    paddingHorizontal: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(226,194,133,0.4)',
  },
  pickTxt: { flex: 1, fontFamily: FONTS.bodySemi, fontSize: 14, color: COLORS.textPrimary },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(6,6,20,0.7)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: COLORS.surface, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(226,194,133,0.4)', maxHeight: '80%', padding: 16, gap: 10 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontFamily: FONTS.display, fontSize: 22, color: COLORS.goldLight },
  modalClose: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '45deg' }] },
  modalSearch: {
    minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(226,194,133,0.28)', backgroundColor: 'rgba(255,255,255,0.06)',
    color: COLORS.textPrimary, paddingHorizontal: 14, fontFamily: FONTS.body, fontSize: 15,
  },
  modalItem: {
    minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(226,194,133,0.1)',
  },
  modalItemText: { fontFamily: FONTS.bodySemi, fontSize: 15, color: COLORS.textPrimary },
  modalEmpty: { fontFamily: FONTS.body, color: COLORS.textSecondary, textAlign: 'center', padding: 20 },
});
