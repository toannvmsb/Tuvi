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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, StarEntry, TuViHouse } from '../types';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { getStarColor } from '../data/starElements';
import { getStarInfo } from '../data/starInfo';
import { detectCachCucInPalace, detectCachCucInGroup } from '../data/cachCuc';
import { analyzePalaceWithAI } from '../utils/aiAnalysis';
import { generateOfflinePalaceLuu } from '../core/offlineLuanGiai';
import SimpleMarkdown from '../components/SimpleMarkdown';
import AIProgressBar from '../components/AIProgressBar';
import ExportPdfButton from '../components/ExportPdfButton';
import { chartHeaderLines } from '../utils/pdfExport';
import PaidGate from '../components/PaidGate';
import { fkey } from '../lib/featureKey';
import { getAiResult, setAiResult, clearAiResult } from '../lib/aiResults';
import { premiumBadgeNote, PREMIUM, AI_VALUE_NOTE } from '../constants/premium';
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

function categorize(stars: StarEntry[]) {
  const chinh: StarEntry[] = [];
  const phu: StarEntry[] = [];
  const luu: StarEntry[] = [];
  for (const s of stars) {
    if (s.name.startsWith('L. ') || s.type === 'luu') luu.push(s);
    else if (s.type === 'chinh') chinh.push(s);
    else phu.push(s);
  }
  return { chinh, phu, luu };
}

function chinhOf(h: TuViHouse): string {
  const c = h.stars
    .filter(s => s.type === 'chinh')
    .map(s => `${s.name}${s.brightness ? `(${brightnessLabel(s.brightness)})` : ''}`)
    .join(', ');
  return c || 'Vô chính diệu';
}

/** Dòng quan hệ (Tam hợp / Nhị hợp / Xung chiếu) — nếu cung VCD thì xét phụ tinh,
 *  KHÔNG coi "Vô chính diệu" là một sao. */
function RelLine({ type, h, note }: { type: string; h: TuViHouse; note: string }) {
  const chinh = h.stars
    .filter(s => s.type === 'chinh')
    .map(s => `${s.name}${s.brightness ? `(${brightnessLabel(s.brightness)})` : ''}`);
  const phu = h.stars
    .filter(s => s.type !== 'chinh' && s.type !== 'luu' && !s.name.startsWith('L. '))
    .map(s => s.name).slice(0, 6);
  return (
    <Text style={styles.relDetail}>
      • <Text style={styles.relTag}>{type}</Text> — cung {h.palaceName} ({h.branch}):{' '}
      {chinh.length > 0 ? (
        <>sao <Text style={styles.relStar}>{chinh.join(', ')}</Text>. {note}</>
      ) : (
        <>vô chính diệu — xét các phụ tinh{' '}
          <Text style={styles.relStar}>{phu.length ? phu.join(', ') : '(không có sao phụ đáng kể)'}</Text>. {note}</>
      )}
    </Text>
  );
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
  const { chinh, phu, luu } = categorize(house.stars);

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
  const [aiOpen, setAiOpen] = useState(true);
  const [luuOpen, setLuuOpen] = useState(true);
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

  const { sameCach, groupCach } = useMemo(() => {
    const palaceNames = house.stars.map(s => s.name);
    const same = detectCachCucInPalace(palaceNames, house.branch);
    const groupSet = new Set<string>(palaceNames);
    relations.tamHop.forEach(h => h.stars.forEach(s => groupSet.add(s.name)));
    relations.xung?.stars.forEach(s => groupSet.add(s.name));
    relations.nhiHop?.stars.forEach(s => groupSet.add(s.name));
    const group = detectCachCucInGroup(Array.from(groupSet), house.branch);
    const sameNames = new Set(same.map(c => c.name));
    return { sameCach: same, groupCach: group.filter(c => !sameNames.has(c.name)) };
  }, [house, relations]);

  // Cách cục tạo bởi cung này + TỪNG quan hệ → kèm ý nghĩa.
  const relCach = useMemo(() => {
    const base = house.stars.map(s => s.name);
    const sameNames = new Set(detectCachCucInPalace(base, house.branch).map(c => c.name));
    const calc = (h?: TuViHouse) =>
      h ? detectCachCucInGroup([...base, ...h.stars.map(s => s.name)], house.branch)
            .filter(c => !sameNames.has(c.name))
        : [];
    return {
      tamHop: relations.tamHop.map(h => ({ h, cach: calc(h) })),
      nhiHop: relations.nhiHop ? { h: relations.nhiHop, cach: calc(relations.nhiHop) } : null,
      xung: relations.xung ? { h: relations.xung, cach: calc(relations.xung) } : null,
    };
  }, [house, relations]);

  const info = selected ? getStarInfo(selected) : undefined;
  const palaceAdvanced = info?.byPalace?.[house.palaceName];

  // Đánh số mục động cho phần NÂNG CAO (ẩn mục nào thì số tự dồn, không nhảy số).
  const advSteps = (() => {
    let n = 0;
    const intro = ++n;
    const same = sameCach.length > 0 ? ++n : 0;
    const rel = ++n;
    const extra = (info?.combos || info?.advancedGeneral) ? ++n : 0;
    return { intro, same, rel, extra };
  })();

  const runAI = async (force = false) => {
    setAiOpen(true);
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
        onPress={() => { setSelected(s.name); setBasicOpen(true); setAdvOpen(true); }}
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
          {phu.length > 0 && (
            <View style={styles.phuWrap}>
              {phu.map((s, i) => <StarChip key={`p${i}`} s={s} />)}
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

        {/* AI nút */}
        {aiStatus === 'idle' && <Text style={styles.aiValueNote}>✨ {AI_VALUE_NOTE}</Text>}
        <TouchableOpacity
          style={[styles.aiBtn, aiStatus === 'loading' && { opacity: 0.6 }]}
          onPress={() => runAI()}
          disabled={aiStatus === 'loading'}
          activeOpacity={0.85}
        >
          <Text style={styles.aiBtnText}>
            {aiStatus === 'loading'
              ? '🤖 Đang phân tích…'
              : `🤖 Phân tích AI cung ${house.palaceName}`}
          </Text>
        </TouchableOpacity>

        {/* Kết quả AI */}
        {aiStatus !== 'idle' && (
          <Collapsible
            badge="PHÂN TÍCH AI CUNG NÀY"
            badgeStyle={styles.badgeAI}
            note={premiumBadgeNote()}
            open={aiOpen}
            onToggle={() => setAiOpen(o => !o)}
          >
            {aiStatus === 'loading' && (
              <AIProgressBar label={`AI đang luận giải cung ${house.palaceName}…`} />
            )}
            {aiStatus === 'locked' && (
              <Text style={styles.bodyText}>
                🔒 Mục "Phân tích AI" là tính năng trả phí. Hiện chưa mở khóa cho
                tài khoản này.
              </Text>
            )}
            {aiStatus === 'offline' && (
              <Text style={styles.bodyText}>
                ⚠ Cần kết nối mạng để hệ thống phân tích chuyên sâu. Vui lòng kiểm tra
                Internet rồi nhấn lại nút "Phân tích AI cung {house.palaceName}".
              </Text>
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
                <Text style={styles.bodyTextDim}>
                  * Nội dung do AI tạo, mang tính tham khảo; không thay thế luận giải chuyên gia.
                </Text>
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
          </Collapsible>
        )}

        {/* SAO LƯU CỦA NĂM (offline, nâng cao) — ảnh hưởng tới cung này trong năm xem */}
        {!!luuText && (
          <Collapsible
            badge={`SAO LƯU NĂM ${chart.viewingYear ?? ''}`.trim()}
            badgeStyle={styles.badgeBasic}
            note="Miễn phí"
            open={luuOpen}
            onToggle={() => setLuuOpen(o => !o)}
          >
            <SimpleMarkdown content={luuText} />
          </Collapsible>
        )}

        {/* NỬA DƯỚI — thông tin sao */}
        {selected ? (
          <View style={styles.infoBox}>
            <Text style={[styles.infoStarName, { color: getStarColor(selected) }]}>{selected}</Text>

            {info ? (
              <>
                {/* CƠ BẢN */}
                <Collapsible
                  badge="CƠ BẢN" badgeStyle={styles.badgeBasic}
                  open={basicOpen} onToggle={() => setBasicOpen(o => !o)}
                >
                  <Text style={styles.bodyText}>{info.basic}</Text>
                </Collapsible>

                {/* NÂNG CAO */}
                <Collapsible
                  badge="NÂNG CAO" badgeStyle={styles.badgeAdv} note={premiumBadgeNote()}
                  open={advOpen} onToggle={() => setAdvOpen(o => !o)}
                >
                 <PaidGate unlockKey={fkey(result, `palace:${branchIndex}:adv`)} kind="advanced">
                  {/* 1. Tại cung */}
                  <Text style={styles.subHead}>{advSteps.intro}. Ý nghĩa tại cung {house.palaceName}</Text>
                  <Text style={styles.bodyText}>
                    {palaceAdvanced ?? `Sao ${selected} tại cung ${house.palaceName}: ý nghĩa tương tự nội dung phần Cơ bản phân tích bên trên.`}
                  </Text>

                  {/* 2. Đồng cung — chỉ hiện nếu có cách */}
                  {sameCach.length > 0 && (
                    <>
                      <Text style={styles.subHead}>{advSteps.same}. Cùng sao đồng cung</Text>
                      <Text style={styles.bodyText}>
                        Các sao tại cung {house.palaceName} hợp thành {sameCach.length > 1 ? 'các cách' : 'cách'}:
                      </Text>
                      {sameCach.map(c => (
                        <View key={c.name} style={styles.cachItem}>
                          <Text style={[styles.cachName, { color: c.good ? COLORS.green : COLORS.red }]}>
                            {c.good ? '✦' : '⚠'} {c.name}
                          </Text>
                          <Text style={styles.bodyText}>{c.meaning}</Text>
                        </View>
                      ))}
                    </>
                  )}

                  {/* 3. Tam hợp / Nhị hợp / Xung chiếu — diễn giải + lời khuyên */}
                  <Text style={styles.subHead}>{advSteps.rel}. Tam hợp / Nhị hợp / Xung chiếu</Text>
                  <Text style={styles.bodyText}>
                    Cung {house.palaceName} không đứng riêng: các sao ở cung tam hợp cùng "hội" về làm
                    mạnh thêm tính chất, cung nhị hợp hỗ trợ ngầm, còn cung xung chiếu tạo lực đối nghịch.
                    Cần xét các sao sau đây để định cát/hung:
                  </Text>

                  {relCach.tamHop.map(({ h, cach }, i) => (
                    <View key={`t${i}`}>
                      <RelLine type="Tam hợp" h={h} note={`Cộng hưởng, làm đậm thêm sắc thái cung ${house.palaceName}.`} />
                      {cach.map(c => (
                        <View key={c.name} style={styles.cachItem}>
                          <Text style={[styles.cachName, { color: c.good ? COLORS.green : COLORS.red }]}>
                            {c.good ? '✦' : '⚠'} {c.name}
                          </Text>
                          <Text style={styles.bodyText}>{c.meaning}</Text>
                        </View>
                      ))}
                    </View>
                  ))}
                  {relCach.nhiHop && (
                    <View>
                      <RelLine type="Nhị hợp" h={relCach.nhiHop.h} note="Hậu thuẫn ngầm, bổ trợ khi cần." />
                      {relCach.nhiHop.cach.map(c => (
                        <View key={c.name} style={styles.cachItem}>
                          <Text style={[styles.cachName, { color: c.good ? COLORS.green : COLORS.red }]}>
                            {c.good ? '✦' : '⚠'} {c.name}
                          </Text>
                          <Text style={styles.bodyText}>{c.meaning}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {relCach.xung && (
                    <View>
                      <RelLine type="Xung chiếu" h={relCach.xung.h} note="Lực đối nghịch trực diện, cần dung hòa, tránh cực đoan." />
                      {relCach.xung.cach.map(c => (
                        <View key={c.name} style={styles.cachItem}>
                          <Text style={[styles.cachName, { color: c.good ? COLORS.green : COLORS.red }]}>
                            {c.good ? '✦' : '⚠'} {c.name}
                          </Text>
                          <Text style={styles.bodyText}>{c.meaning}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <Text style={styles.adviceText}>
                    💡 Lời khuyên: khi quyết định việc thuộc lĩnh vực cung {house.palaceName}, hãy TẬN DỤNG
                    điểm cộng hưởng từ tam hợp/nhị hợp (sao tốt nâng đỡ) và ĐỀ PHÒNG áp lực từ cung xung chiếu;
                    nếu xung chiếu có sát tinh thì cân nhắc kỹ, làm việc từ tốn để tránh trục trặc.
                  </Text>

                  {/* 4. Kiến thức bổ sung */}
                  {(info.combos || info.advancedGeneral) && (
                    <>
                      <Text style={styles.subHead}>{advSteps.extra}. Kiến thức bổ sung</Text>
                      {!!info.combos && <Text style={styles.bodyText}>{info.combos}</Text>}
                      {!!info.advancedGeneral && <Text style={styles.bodyText}>{info.advancedGeneral}</Text>}
                    </>
                  )}
                 </PaidGate>
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

        <TouchableOpacity style={styles.bottomBack} onPress={() => navigation.goBack()}>
          <Text style={styles.bottomBackText}>← Về lá số</Text>
        </TouchableOpacity>
      </ScrollView>
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

  aiBtn: {
    backgroundColor: COLORS.purple, borderRadius: 10,
    paddingVertical: SPACING.md, alignItems: 'center',
  },
  aiBtnText: { color: '#fff', fontSize: FONTS.size.md, fontWeight: '800' },
  aiValueNote: { color: COLORS.goldLight, fontSize: FONTS.size.sm, fontStyle: 'italic', lineHeight: 18 },
  aiLoading: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
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
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  chevron: { color: COLORS.goldLight, fontSize: FONTS.size.lg, fontWeight: '800' },
  badgeBasic: {
    color: '#1a0a00', backgroundColor: COLORS.green, fontWeight: '800',
    fontSize: FONTS.size.xs, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4,
  },
  badgeAdv: {
    color: '#1a0a00', backgroundColor: COLORS.gold, fontWeight: '800',
    fontSize: FONTS.size.xs, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4,
  },
  badgeAI: {
    color: '#fff', backgroundColor: COLORS.purple, fontWeight: '800',
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
