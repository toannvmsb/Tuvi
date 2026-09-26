/**
 * Chi tiết "Sự kiện sắp tới" — hiển thị đúng 1 sự kiện mà lifeEventEngine đã chọn cho Home
 * (lễ Tết / tiết khí / sự kiện cá nhân). "Dành riêng cho bạn" là cá nhân hóa OFFLINE (ghép lại
 * kết quả engine sẵn có — xem eventPersonalization.ts); "AI cá nhân hóa" (V2) là lớp NÂNG CẤP CÓ
 * TÍNH PHÍ, theo đúng khung "AI nhỏ" đã dùng ở Xem theo ngày (DailyScreen.tsx) — không dùng
 * PaidGate/useStreamingAI vì 2 thứ đó phục vụ ca khác.
 * Cuối màn có form rút gọn để tạo 1 sự kiện cá nhân mới (user_events) — lối vào duy nhất cho
 * tính năng này.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal, Share, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { WeatherForDate } from '../components/WeatherCards';
import ScreenHeader from '../components/ScreenHeader';
import SimpleMarkdown from '../components/SimpleMarkdown';
import AIProgressBar from '../components/AIProgressBar';
import LunarCalendarPicker from '../components/LunarCalendarPicker';
import { personalizeEvent } from '../core/eventPersonalization';
import { canChiForBasis, personalizeDirectionGods, directionGodsForDay } from '../core/directionGods';
import { suggestXongDat } from '../core/xongDatEngine';
import { createUserEvent, deleteUserEvent, lifeEventErrorMessage, fetchEventPackages, listMyUserEvents } from '../lib/lifeEvents';
import { resolveEventsOnDate, resolveAllUpcomingEvents, eventStage } from '../core/lifeEventEngine';
import type { UserEventType, ResolvedEvent, EventPackage, UserEvent } from '../core/lifeEventEngine';
import { createLifeNote, listLifeNotes, deleteLifeNote, type LifeNote } from '../lib/lifeNotes';
import { getNotifyPref, setNotifyEnabled, setNotifyDays, resetNotifyPref } from '../lib/eventNotifyPrefs';
import { clearDismiss } from '../lib/eventDismiss';
import { DEFAULT_NOTIFY_DAYS } from '../core/lifeEventEngine';
import { analyzeEventWithAI } from '../utils/aiAnalysis';
import { fkey } from '../lib/featureKey';
import { getAiResult, setAiResult, clearAiResult } from '../lib/aiResults';
import { confirmAndUnlock, confirmReanalyze } from '../lib/confirmCharge';
import { scrollInputAboveKeyboard } from '../lib/scrollToInput';
import KeyboardAwareScreen from '../components/KeyboardAwareScreen';
import { costNote, PREMIUM, AI_VALUE_NOTE } from '../constants/premium';

type Props = NativeStackScreenProps<RootStackParamList, 'EventDetail'>;

function bullets(text: string | null): string[] {
  return (text ?? '').split('\n').map(s => s.trim()).filter(Boolean);
}
function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function formatVN(d: Date): string {
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}
/** Mỗi cặp Q/A cách nhau 1 dòng trống; dòng đầu của khối là câu hỏi, các dòng sau là câu trả lời. */
function parseFaq(text: string | null): { q: string; a: string }[] {
  if (!text) return [];
  return text.split(/\n\s*\n/).map(block => {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    return { q: lines[0] ?? '', a: lines.slice(1).join(' ') };
  }).filter(x => x.q);
}

async function shareEvent(event: ResolvedEvent, dateLabel: string) {
  const text = `${event.icon} ${event.displayName} — ${dateLabel}\n${event.meaning}`;
  try {
    if (Platform.OS === 'web') {
      const nav: any = typeof navigator !== 'undefined' ? navigator : null;
      if (nav?.share) { await nav.share({ title: event.displayName, text }); return; }
      if (nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(text);
        Alert.alert('Đã sao chép', 'Nội dung đã được sao chép vào clipboard, bạn có thể dán để chia sẻ.');
        return;
      }
      Alert.alert('Không hỗ trợ', 'Trình duyệt này chưa hỗ trợ chia sẻ.');
    } else {
      await Share.share({ message: text, title: event.displayName });
    }
  } catch { /* người dùng hủy chia sẻ hoặc thiết bị không hỗ trợ — bỏ qua */ }
}

const EVENT_TYPE_OPTIONS: { key: UserEventType; label: string; icon: string }[] = [
  { key: 'birthday', label: 'Sinh nhật', icon: '🎂' },
  { key: 'wedding', label: 'Cưới hỏi', icon: '💍' },
  { key: 'moving', label: 'Chuyển nhà', icon: '🏠' },
  { key: 'opening', label: 'Khai trương', icon: '🏪' },
  { key: 'exam', label: 'Thi cử', icon: '📝' },
  { key: 'death_anniversary', label: 'Giỗ/Kỵ giỗ', icon: '🕯️' },
  { key: 'contract', label: 'Ký hợp đồng/Đấu thầu', icon: '📄' },
  { key: 'graduation', label: 'Nhập học/Tốt nghiệp', icon: '🎓' },
  { key: 'marathon', label: 'Marathon/Giải thể thao', icon: '🏃' },
  { key: 'travel', label: 'Du lịch', icon: '✈️' },
  { key: 'product_launch', label: 'Ra mắt sản phẩm', icon: '🚀' },
  { key: 'pitching', label: 'Pitching/Thuyết trình', icon: '🎤' },
  { key: 'custom', label: 'Khác', icon: '📌' },
];

/** Mọi box (trừ Tổng quan) đều thu gọn/mở được — bấm tiêu đề để đóng/mở, tránh màn quá dài. */
function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={() => setOpen(o => !o)} activeOpacity={0.7} style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardChevron}>{open ? '▾' : '▸'}</Text>
      </TouchableOpacity>
      {open && <View style={styles.cardBody}>{children}</View>}
    </View>
  );
}

export default function EventDetailScreen({ route, navigation }: Props) {
  const { result } = route.params;
  // `event` là STATE (không phải destructure thẳng route.params) để có thể ĐỔI sang 1 sự kiện
  // khác cùng ngày (chip chọn ở trên) hoặc qua công cụ TEST tạm thời bên dưới, mà không cần
  // navigate lại màn hình.
  const [event, setEvent] = useState<ResolvedEvent>(route.params.event);
  const occursOn = useMemo(() => new Date(event.occursOn), [event.occursOn]);
  const stage = useMemo(() => eventStage(event.daysUntil), [event.daysUntil]);
  // "Timeline" (TUZI_M04 mục 7) — khi sự kiện BAN ĐẦU (lúc mở màn) đang ở giai đoạn đếm ngược/hôm
  // nay, mở sẵn 2 mục hành động nhất (Dành riêng cho bạn, Checklist) thay vì để người dùng tự mở.
  // Tính 1 LẦN theo route.params.event (không đổi khi bấm chip sự kiện khác cùng ngày) vì
  // `Section` chỉ đọc `defaultOpen` ở lần render đầu — đổi theo `event` đang xem sẽ không tự mở
  // lại khi chuyển sự kiện, nên cố định theo lúc mở màn để tránh hành vi nửa vời.
  const [initialActionable] = useState(() => {
    const k = eventStage(route.params.event.daysUntil).key;
    return k === 'countdown' || k === 'event_day';
  });

  // Nạp toàn bộ package + sự kiện cá nhân của người dùng — CHỈ để phục vụ (1) chọn giữa các sự
  // kiện trùng ngày, (2) công cụ TEST tạm thời xem trước sự kiện bất kỳ. Không ảnh hưởng gì tới
  // nội dung chính (event) vốn đã được truyền sẵn từ Home.
  const [allPackages, setAllPackages] = useState<EventPackage[]>([]);
  const [allUserEvents, setAllUserEvents] = useState<UserEvent[]>([]);
  useEffect(() => {
    fetchEventPackages().then(setAllPackages).catch(() => {});
    listMyUserEvents().then(setAllUserEvents).catch(() => {});
  }, []);

  // Nhiều sự kiện trùng đúng 1 ngày (vd tiết khí trùng lễ) — Home chỉ chọn 1 cái ưu tiên cao
  // nhất nên người dùng không thấy các sự kiện còn lại; ở đây liệt kê HẾT để chủ động chọn xem.
  // Chỉ 1 sự kiện trong ngày thì không hiện gì thêm (đúng yêu cầu).
  const sameDayEvents = useMemo(
    () => resolveEventsOnDate(allPackages, allUserEvents, occursOn),
    [allPackages, allUserEvents, occursOn],
  );

  // Nút ‹ › ở box trên cùng — duyệt qua TOÀN BỘ sự kiện (không chỉ trùng ngày), sắp theo thời gian
  // xảy ra. Chỉ đổi `event` (state tại chỗ, xem giải thích ở khai báo state) — KHÔNG ghi gì lại,
  // nên thoát màn rồi vào lại vẫn đúng route.params.event ban đầu (đúng rule chọn của hệ thống).
  const allUpcoming = useMemo(
    () => resolveAllUpcomingEvents(allPackages, allUserEvents),
    [allPackages, allUserEvents],
  );
  const eventIndex = useMemo(() => allUpcoming.findIndex(e => e.key === event.key), [allUpcoming, event.key]);
  // Vị trí của sự kiện HỆ THỐNG chọn (route.params.event, không đổi khi duyệt tạm) — chỉ cho phép
  // bấm "‹" khi đang đứng SAU vị trí này (tức đã bấm "›" đi trước đó), không cho lùi về TRƯỚC vị
  // trí gốc để xem sự kiện đã diễn ra từ trước (theo đúng yêu cầu anh Toàn). "›" thì luôn được đi
  // tiếp bình thường, không giới hạn.
  const baseEventIndex = useMemo(
    () => allUpcoming.findIndex(e => e.key === route.params.event.key),
    [allUpcoming, route.params.event.key],
  );
  const canGoPrevEvent = baseEventIndex >= 0 && eventIndex > baseEventIndex;
  const canGoNextEvent = eventIndex >= 0 && eventIndex < allUpcoming.length - 1;
  const goPrevEvent = () => { if (canGoPrevEvent) setEvent(allUpcoming[eventIndex - 1]); };
  const goNextEvent = () => { if (canGoNextEvent) setEvent(allUpcoming[eventIndex + 1]); };

  const dateLabel = formatVN(occursOn);
  const advice = useMemo(
    () => personalizeEvent(result ?? null, event.element, occursOn),
    [result, event.element, occursOn],
  );
  // Hướng xuất hành dân gian (Hỷ/Tài/Hạc Thần) — cơ sở Can Chi (ngày hoặc năm) do admin cấu hình
  // RIÊNG cho từng sự kiện (event.xuatHanhBasis, vd Giao Thừa = năm, Lập Thu = ngày), áp dụng
  // chung cho mọi người ở phần Hỷ/Tài/Hạc Thần gốc (khác "Hướng hợp" ở mục dưới vốn tính riêng
  // theo dụng thần) — nhưng có thêm gợi ý ưu tiên Hỷ Thần/Tài Thần cá nhân hóa khi đã có lá số.
  const godsCanChi = useMemo(() => canChiForBasis(event.xuatHanhBasis, occursOn), [event.xuatHanhBasis, occursOn]);
  const dayGods = useMemo(
    () => directionGodsForDay(godsCanChi.stem, godsCanChi.branch),
    [godsCanChi],
  );
  const godsPersonalization = useMemo(() => {
    if (!result) return null;
    return personalizeDirectionGods(dayGods, result.batTuChart.favorableElements, result.batTuChart.unfavorableElements, event.displayName);
  }, [dayGods, result, event.displayName]);
  // Người xông đất năm mới — chỉ áp dụng cho sự kiện gắn với "năm mới" (Giao Thừa, Tết Nguyên
  // Đán, tái dùng đúng cờ xuatHanhBasis==='year' đã có, xem xongDatEngine.ts).
  const xongDatOptions = useMemo(() => {
    if (event.xuatHanhBasis !== 'year' || !result) return null;
    return suggestXongDat(result);
  }, [event.xuatHanhBasis, result]);
  const doItems = bullets(event.doText);
  const avoidItems = bullets(event.avoidText);
  const offeringItems = bullets(event.offeringText);

  /** Xóa CHÍNH sự kiện cá nhân đang xem — chỉ áp dụng khi đây là sự kiện người dùng tự thêm
   * (server đã tự giới hạn chỉ chủ sở hữu mới xóa được — deleteUserEvent kiểm tra user_id). */
  const removeThisEvent = () => {
    if (!event.userEvent) return;
    Alert.alert('Xóa sự kiện này?', event.displayName, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive',
        onPress: async () => {
          try {
            await deleteUserEvent(event.userEvent!.id);
            navigation.goBack();
          } catch (e: any) {
            Alert.alert('Không xóa được', lifeEventErrorMessage(e?.message || ''));
          }
        },
      },
    ]);
  };

  // ── Quản lý thông báo (riêng cho sự kiện đang xem) — bật/tắt, tùy chỉnh nhắc trước bao nhiêu
  // ngày, và reset trạng thái Ẩn/Nhắc lại sau nếu trước đó đã bấm ở Home. Lưu cục bộ trên máy,
  // xem lib/eventNotifyPrefs.ts + lib/eventDismiss.ts. ──
  const [notifyEnabled, setNotifyEnabledState] = useState(true);
  const [notifyDaysInput, setNotifyDaysInput] = useState(DEFAULT_NOTIFY_DAYS.join(', '));
  const [notifySaving, setNotifySaving] = useState(false);
  useEffect(() => {
    getNotifyPref(event.key).then(p => {
      setNotifyEnabledState(p.enabled);
      setNotifyDaysInput(p.days.join(', '));
    });
  }, [event.key]);

  const toggleNotifyEnabled = async () => {
    const next = !notifyEnabled;
    setNotifyEnabledState(next); // cập nhật giao diện ngay, không đợi ghi xong
    await setNotifyEnabled(event.key, next);
  };

  const saveNotifyDays = async () => {
    const days = notifyDaysInput.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !Number.isNaN(n));
    if (!days.length) { Alert.alert('Chưa hợp lệ', 'Nhập ít nhất 1 số ngày, cách nhau bằng dấu phẩy (vd: 5, 1, 0).'); return; }
    setNotifySaving(true);
    try {
      await setNotifyDays(event.key, days);
      const p = await getNotifyPref(event.key); // đọc lại bản đã chuẩn hóa (bỏ trùng, sắp giảm dần)
      setNotifyDaysInput(p.days.join(', '));
      Alert.alert('Đã lưu', 'Đã cập nhật số ngày nhắc trước cho sự kiện này.');
    } finally {
      setNotifySaving(false);
    }
  };

  const doResetNotifyPref = async () => {
    await resetNotifyPref(event.key);
    setNotifyEnabledState(true);
    setNotifyDaysInput(DEFAULT_NOTIFY_DAYS.join(', '));
    Alert.alert('Đã đặt lại', 'Đã đưa thông báo của sự kiện này về mặc định (bật, nhắc trước 5/1/0 ngày).');
  };

  const doResetDismiss = () => {
    Alert.alert('Đặt lại trạng thái Ẩn/Nhắc lại sau?', 'Sự kiện này sẽ hiện lại bình thường trên Trang chủ ngay từ bây giờ.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đặt lại', onPress: async () => {
          await clearDismiss(event.key);
          Alert.alert('Đã đặt lại', 'Sự kiện sẽ hiện lại bình thường trên Trang chủ.');
        },
      },
    ]);
  };
  const checklistItems = bullets(event.checklistText);
  const faqItems = useMemo(() => parseFaq(event.faqText), [event.faqText]);

  // ── AI cá nhân hóa (V2, có tính phí — cùng khung "AI nhỏ" với Xem theo ngày) ──
  const aiKey = result ? fkey(result, `event:${event.key}:ai`) : null;
  const [ai, setAi] = useState<{ status: 'idle' | 'loading' | 'done' | 'error'; text: string }>({ status: 'idle', text: '' });
  useEffect(() => {
    // Đặt lại TOÀN BỘ state (không chỉ khi có cache) — vì `event` giờ có thể đổi ngay tại chỗ
    // (chip chọn cùng ngày / công cụ test) mà KHÔNG remount màn hình, nên nếu thiếu nhánh else
    // kết quả AI của sự kiện TRƯỚC sẽ bị giữ lại và hiện nhầm sang sự kiện MỚI chưa phân tích.
    if (!aiKey) { setAi({ status: 'idle', text: '' }); return; }
    const cached = getAiResult(aiKey);
    setAi(cached ? { status: 'done', text: cached } : { status: 'idle', text: '' });
  }, [aiKey]);
  const runAI = async (force = false) => {
    if (!result || !aiKey) return;
    if (!force) {
      const cached = getAiResult(aiKey);
      if (cached) { setAi({ status: 'done', text: cached }); return; }
    }
    const r = force ? await confirmReanalyze(aiKey, 'ai') : await confirmAndUnlock(aiKey, 'ai');
    if (r === 'cancel') return;
    if (r === 'nofund') {
      setAi({ status: 'error', text: `🔒 Số dư không đủ (cần ${PREMIUM.COST.ai} xu). Nạp thêm trong Menu → Nạp xu.` });
      return;
    }
    if (force) { try { await clearAiResult(aiKey); } catch {} }
    setAi({ status: 'loading', text: '' });
    try {
      const txt = await analyzeEventWithAI(result, event);
      setAi({ status: 'done', text: txt });
      setAiResult(aiKey, txt);
    } catch (e: any) {
      const msg = String(e?.message) === 'OFFLINE'
        ? '⚠ Cần kết nối mạng để phân tích chuyên sâu.'
        : `⚠ ${e?.message || 'Có lỗi xảy ra.'}`;
      setAi({ status: 'error', text: msg });
    }
  };

  // ── Checklist — tick cục bộ theo máy, khóa theo sự kiện + ngày (năm sau tự làm mới) ──
  const checklistKey = `checklist:${event.key}:${toISO(occursOn)}`;
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(checklistKey);
        setChecked(raw ? JSON.parse(raw) : {});
      } catch { setChecked({}); }
    })();
  }, [checklistKey]);
  const toggleCheck = async (item: string) => {
    const next = { ...checked, [item]: !checked[item] };
    setChecked(next);
    try { await AsyncStorage.setItem(checklistKey, JSON.stringify(next)); } catch {}
  };

  // ── FAQ accordion ── đóng lại khi đổi sang sự kiện khác (cùng lý do như state `ai` ở trên —
  // event có thể đổi tại chỗ không remount màn hình).
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  useEffect(() => { setFaqOpen(null); }, [event.key]);

  // ── Nhật ký — tái dùng thẳng "Ghi chú nhanh" (life_notes), không có liên kết CỨNG tới sự kiện
  // (bảng life_notes chỉ có note_date, không có event_id) — chỉ tiện set sẵn ngày. RLS của bảng
  // này đảm bảo mỗi người chỉ thấy/xóa được đúng ghi chú CỦA MÌNH — không cần lọc thêm tay. ──
  const [journalText, setJournalText] = useState('');
  const [journalSaving, setJournalSaving] = useState(false);
  const [journalEntries, setJournalEntries] = useState<LifeNote[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const journalInputRef = useRef<TextInput>(null);
  const addTitleInputRef = useRef<TextInput>(null);
  const addRelatedPeopleInputRef = useRef<TextInput>(null);
  const notifyDaysInputRef = useRef<TextInput>(null);
  const journalDateISO = toISO(occursOn);
  const loadJournal = async () => {
    try { setJournalEntries(await listLifeNotes(undefined, journalDateISO)); }
    catch { setJournalEntries([]); }
  };
  useEffect(() => { loadJournal(); }, [journalDateISO]);
  const saveJournal = async () => {
    if (!journalText.trim() || journalSaving) return;
    setJournalSaving(true);
    try {
      await createLifeNote({ content: journalText.trim(), noteDate: journalDateISO });
      setJournalText('');
      await loadJournal();
    } catch (e: any) {
      Alert.alert('Không lưu được', e?.message || 'Lỗi không xác định.');
    } finally {
      setJournalSaving(false);
    }
  };
  const removeJournal = (n: LifeNote) => {
    Alert.alert('Xóa nhật ký này?', n.content, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive',
        onPress: async () => {
          try { await deleteLifeNote(n.id); await loadJournal(); }
          catch (e: any) { Alert.alert('Không xóa được', e?.message || 'Lỗi không xác định.'); }
        },
      },
    ]);
  };

  // ── Form "+ Thêm sự kiện cá nhân" ──
  const [addType, setAddType] = useState<UserEventType>('custom');
  const [addTitle, setAddTitle] = useState('');
  const [addDate, setAddDate] = useState<string>(() => toISO(new Date()));
  const [addCalendar, setAddCalendar] = useState<'solar' | 'lunar'>('solar');
  const [addRepeat, setAddRepeat] = useState(true);
  const [addRelatedPeople, setAddRelatedPeople] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const pickerSelDate = useMemo(() => {
    const [y, m, d] = addDate.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [addDate]);

  /** Chọn loại sự kiện → gợi ý sẵn lịch/lặp hợp lý (chỉ là default, người dùng vẫn đổi được). */
  const selectType = (key: UserEventType) => {
    setAddType(key);
    if (key === 'death_anniversary') { setAddCalendar('lunar'); setAddRepeat(true); }
    else if (key === 'contract' || key === 'exam' || key === 'marathon' || key === 'travel'
      || key === 'product_launch' || key === 'pitching') { setAddCalendar('solar'); setAddRepeat(false); }
  };

  const submitAdd = async () => {
    if (!addTitle.trim() || saving) return;
    setSaving(true);
    try {
      await createUserEvent({
        eventType: addType, title: addTitle, calendarType: addCalendar,
        eventDate: addDate, repeatYearly: addRepeat, showBeforeDays: 7,
        relatedPeople: addRelatedPeople,
      });
      setAddTitle('');
      setAddRelatedPeople('');
      Alert.alert('Đã lưu', 'Sự kiện của bạn sẽ hiện trên Trang chủ khi tới gần ngày.');
    } catch (e: any) {
      Alert.alert('Không lưu được', lifeEventErrorMessage(e?.message || ''));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScreenHeader title="Sự kiện sắp tới" onBack={() => navigation.goBack()} />
      <KeyboardAwareScreen ref={scrollRef} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* 0. Nhiều sự kiện trùng đúng 1 ngày — chỉ hiện khi ngày này có từ 2 sự kiện trở lên. */}
        {sameDayEvents.length > 1 && (
          <View style={styles.sameDayBox}>
            <Text style={styles.sameDayLabel}>Ngày này có {sameDayEvents.length} sự kiện — chọn để xem:</Text>
            <View style={styles.typeRow}>
              {sameDayEvents.map(ev => (
                <TouchableOpacity
                  key={ev.key}
                  style={[styles.typeChip, ev.key === event.key && styles.typeChipActive]}
                  onPress={() => setEvent(ev)}
                >
                  <Text style={[styles.typeChipText, ev.key === event.key && styles.typeChipTextActive]}>
                    {ev.icon} {ev.displayName}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* 1. Tổng quan — chia 2 nửa bằng nhau: trái = icon+tên (to, đậm), phải = ngày/đếm ngược/chia sẻ.
            Nút ‹ › đặt ở 2 góc trên của box (absolute, không chiếm chỗ layout) để xem tạm sự kiện
            trước/sau mà không tốn thêm diện tích màn hình ngoài box. */}
        <View style={styles.heroCard}>
          <TouchableOpacity
            style={[styles.heroNavBtn, styles.heroNavBtnLeft, !canGoPrevEvent && styles.heroNavBtnDisabled]}
            onPress={goPrevEvent}
            disabled={!canGoPrevEvent}
            accessibilityRole="button"
            accessibilityLabel="Xem sự kiện trước đó"
          >
            <Text style={styles.heroNavBtnTxt}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.heroNavBtn, styles.heroNavBtnRight, !canGoNextEvent && styles.heroNavBtnDisabled]}
            onPress={goNextEvent}
            disabled={!canGoNextEvent}
            accessibilityRole="button"
            accessibilityLabel="Xem sự kiện tiếp theo"
          >
            <Text style={styles.heroNavBtnTxt}>›</Text>
          </TouchableOpacity>
          <View style={styles.heroRow}>
            <View style={styles.heroLeft}>
              <Text style={styles.heroIconInline}>{event.icon}</Text>
              <Text style={styles.heroTitleBig}>{event.displayName}</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroRight}>
              <Text style={styles.heroDate}>{dateLabel}</Text>
              <Text style={styles.heroStageBadge}>{stage.label}</Text>
              <Text style={styles.heroCountdown}>
                {event.daysUntil === 0 ? 'Hôm nay!'
                  : event.daysUntil < 0 ? `Đã qua ${-event.daysUntil} ngày`
                  : `Còn ${event.daysUntil} ngày`}
              </Text>
              <TouchableOpacity style={styles.shareBtn} onPress={() => shareEvent(event, dateLabel)}>
                <Text style={styles.shareBtnText}>📤 Chia sẻ</Text>
              </TouchableOpacity>
            </View>
          </View>
          {event.userEvent && (
            <TouchableOpacity style={styles.deleteEventBtn} onPress={removeThisEvent}>
              <Text style={styles.deleteEventBtnText}>🗑 Xóa sự kiện</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Thời tiết ngày sự kiện (nếu nằm trong 16 ngày tới) */}
        <View style={{ marginBottom: 12 }}><WeatherForDate date={occursOn} /></View>

        {/* 2. Ý nghĩa */}
        <Section title="📖 Ý nghĩa">
          <Text style={styles.bodyText}>{event.meaning}</Text>
        </Section>

        {/*
          3. Bạn nên làm gì với [event] — gộp CHUNG 1 box: cá nhân hóa offline + Nên làm/tránh +
          Hướng theo dân gian + Màu sắc·Khung giờ·Hướng theo mệnh, vì tất cả đều là nội dung MANG
          TÍNH CÁ NHÂN người dùng (theo yêu cầu anh Toàn) — tách nhau bằng 1 đường kẻ + tiêu đề phụ
          nhỏ, thay vì nhiều box riêng.
        */}
        <Section title={`🔮 Bạn nên làm gì với ${event.displayName}`} defaultOpen={initialActionable}>
          {!advice ? (
            <Text style={styles.emptyHint}>Gắn lá số của bạn (mục Lá số đã lưu) để xem gợi ý riêng theo Bát Tự.</Text>
          ) : (
            <>
              <Text style={styles.bodyText}>{advice.elementNote}</Text>
              <Text style={[styles.bodyText, { marginTop: SPACING.xs }]}>
                Chất lượng ngày này với bạn:{' '}
                <Text style={{ color: COLORS.gold, fontWeight: '800' }}>{advice.dayScore.rating}</Text>
              </Text>
              {advice.dayScore.warnings.length > 0 && (
                <Text style={[styles.bodyText, { color: COLORS.red, marginTop: 4 }]}>
                  {advice.dayScore.warnings.join(' · ')}
                </Text>
              )}
            </>
          )}

          {(doItems.length > 0 || avoidItems.length > 0) && (
            <>
              <View style={styles.innerDivider} />
              <Text style={styles.subHeading}>Nên làm · Nên tránh</Text>
              {doItems.map((it, i) => (
                <Text key={`d${i}`} style={styles.bulletText}>
                  <Text style={styles.bulletDotGood}>✓ </Text>{it}
                </Text>
              ))}
              {avoidItems.map((it, i) => (
                <Text key={`a${i}`} style={styles.bulletText}>
                  <Text style={styles.bulletDotBad}>✕ </Text>{it}
                </Text>
              ))}
            </>
          )}

          {/* Hướng theo dân gian (trước "Hướng xuất hành (dân gian)") — cơ sở ngày/năm cấu hình
              riêng từng sự kiện, có cá nhân hóa ưu tiên Hỷ Thần/Tài Thần theo dụng thần khi đã có
              lá số. Đặt SAU "Nên làm · Nên tránh" theo đúng yêu cầu. */}
          <View style={styles.innerDivider} />
          <Text style={styles.subHeading}>🧭 Hướng theo dân gian</Text>
          <Text style={styles.emptyHint}>
            Tính theo {event.xuatHanhBasis === 'year' ? 'năm' : 'ngày'} {godsCanChi.stem} {godsCanChi.branch} — đổi theo từng ngày/năm, KHÁC với "Hướng theo mệnh" bên dưới (hướng đó tính theo dụng thần cố định của bạn, không đổi theo ngày).
          </Text>
          <Text style={styles.bodyText}>
            🎉 Hỷ Thần (đón niềm vui): <Text style={styles.highlight}>{dayGods.hyThan.name}</Text>
          </Text>
          <Text style={styles.bodyText}>
            💰 Tài Thần (đón tài lộc): <Text style={styles.highlight}>{dayGods.taiThan.name}</Text>
          </Text>
          {dayGods.hacThan.restricted && (
            <Text style={[styles.bodyText, { color: COLORS.red }]}>
              ⚠️ Hạc Thần (nên tránh): {dayGods.hacThan.name}
            </Text>
          )}
          {dayGods.warning && (
            <Text style={[styles.bodyText, { color: COLORS.red, fontStyle: 'italic', marginTop: 4 }]}>
              {dayGods.warning}
            </Text>
          )}
          {godsPersonalization && (
            <Text style={[styles.bodyText, { marginTop: 4 }]}>
              🧑 Riêng cho bạn (chọn giữa Hỷ Thần/Tài Thần ở trên theo dụng thần của bạn): {godsPersonalization.note}
            </Text>
          )}
          <Text style={[styles.emptyHint, { marginTop: 4 }]}>
            * Nội dung tín ngưỡng dân gian mang tính tham khảo, không thay thế quyết định an toàn
            giao thông hay tài chính.
          </Text>

          {advice && (
            <>
              <View style={styles.innerDivider} />
              <Text style={styles.subHeading}>Màu sắc · Khung giờ · Hướng theo mệnh</Text>
              <Text style={styles.bodyText}>🎨 Màu hợp: <Text style={styles.highlight}>{advice.luckyColor}</Text></Text>
              <Text style={styles.bodyText}>🧭 Hướng hợp: <Text style={styles.highlight}>{advice.luckyDirection}</Text></Text>
              {advice.goodHours.length > 0 && (
                <Text style={styles.bodyText}>
                  ⏰ Giờ tốt: {advice.goodHours.map(h => `${h.branch} (${h.range})`).join(', ')}
                </Text>
              )}
              <Text style={[styles.emptyHint, { marginTop: 2 }]}>
                * Hướng này là hướng theo đúng mệnh (dụng thần) của bạn cho TOÀN BỘ năm {occursOn.getFullYear()}
                {' '}— năm diễn ra {event.displayName} — không chỉ dành riêng cho ngày {event.displayName}.
                Khác với Hỷ Thần/Tài Thần ở mục "Hướng theo dân gian" phía trên (chỉ đúng cho
                riêng ngày/năm đó theo dân gian).
              </Text>
            </>
          )}

          {xongDatOptions && (
            <>
              <View style={styles.innerDivider} />
              <Text style={styles.subHeading}>🧑‍🤝‍🧑 Người xông đất năm mới (dân gian)</Text>
              {xongDatOptions.map(o => (
                <Text key={o.purpose} style={[styles.bodyText, { marginTop: 4 }]}>
                  {o.purposeLabel}: <Text style={styles.highlight}>Tuổi {o.branch} ({o.zodiacName})</Text>
                  {'\n'}<Text style={styles.emptyHint}>{o.reason}</Text>
                </Text>
              ))}
              <Text style={[styles.emptyHint, { marginTop: 4 }]}>
                * Gợi ý dựa trên tương hợp tuổi/Mệnh của bạn với lá số — không xét được vận riêng
                hay sức khỏe thực tế của người được mời. Chỉ mang tính tham khảo dân gian.
              </Text>
            </>
          )}
          {!xongDatOptions && event.xuatHanhBasis === 'year' && !result && (
            <>
              <View style={styles.innerDivider} />
              <Text style={styles.emptyHint}>
                Gắn lá số của bạn để xem gợi ý người xông đất năm mới phù hợp.
              </Text>
            </>
          )}
        </Section>

        {/* 3b. AI cá nhân hóa (V2, có tính phí) — chỉ hiện khi đã gắn lá số */}
        {result && (
          <Section title="🤖 AI cá nhân hóa" defaultOpen={false}>
            {ai.status === 'idle' && (
              <>
                <Text style={styles.emptyHint}>{AI_VALUE_NOTE}</Text>
                <TouchableOpacity style={styles.aiBtn} onPress={() => runAI()}>
                  <Text style={styles.aiBtnText}>🔍 Phân tích sự kiện này bằng AI ({costNote(PREMIUM.COST.ai)})</Text>
                </TouchableOpacity>
              </>
            )}
            {ai.status === 'loading' && <AIProgressBar label="AI đang luận sự kiện…" />}
            {ai.status === 'done' && (
              <>
                <SimpleMarkdown content={ai.text} />
                <TouchableOpacity onPress={() => runAI(true)}>
                  <Text style={styles.aiRetry}>↻ Phân tích lại (−{PREMIUM.COST.ai} xu)</Text>
                </TouchableOpacity>
              </>
            )}
            {ai.status === 'error' && (
              <>
                <Text style={styles.bodyText}>{ai.text}</Text>
                <TouchableOpacity onPress={() => runAI()}>
                  <Text style={styles.aiRetry}>↻ Thử lại</Text>
                </TouchableOpacity>
              </>
            )}
          </Section>
        )}

        {/* 4b. Chuẩn bị lễ vật — mâm cúng gợi ý theo phong tục, riêng cho lễ truyền thống */}
        {offeringItems.length > 0 && (
          <Section title="🎁 Chuẩn bị lễ vật" defaultOpen={false}>
            {offeringItems.map((it, i) => <Text key={i} style={styles.bodyText}>• {it}</Text>)}
          </Section>
        )}

        {/* 4c. Bài cúng — văn khấn đầy đủ; cả box đã tự thu gọn/mở nên không cần nút bấm phụ nữa */}
        {event.prayerText && (
          <Section title="📜 Bài cúng" defaultOpen={false}>
            <Text style={styles.prayerBody}>{event.prayerText}</Text>
          </Section>
        )}

        {/* 6. Checklist */}
        {checklistItems.length > 0 && (
          <Section title="✅ Checklist" defaultOpen={initialActionable}>
            {checklistItems.map((it, i) => (
              <TouchableOpacity key={i} style={styles.checkRow} onPress={() => toggleCheck(it)} activeOpacity={0.7}>
                <Text style={styles.checkBox}>{checked[it] ? '✅' : '⬜'}</Text>
                <Text style={[styles.checkText, checked[it] && styles.checkTextDone]}>{it}</Text>
              </TouchableOpacity>
            ))}
          </Section>
        )}

        {/* 7. Người liên quan — chỉ áp dụng cho sự kiện cá nhân */}
        {event.source === 'user' && (
          <Section title="👥 Người liên quan" defaultOpen={false}>
            {event.userEvent?.related_people ? (
              <Text style={styles.bodyText}>{event.userEvent.related_people}</Text>
            ) : (
              <Text style={styles.emptyHint}>Chưa có thông tin — điền khi tạo sự kiện mới.</Text>
            )}
          </Section>
        )}

        {/* 8. FAQ */}
        {faqItems.length > 0 && (
          <Section title="❓ Câu hỏi thường gặp" defaultOpen={false}>
            {faqItems.map((f, i) => (
              <View key={i} style={styles.faqItem}>
                <TouchableOpacity onPress={() => setFaqOpen(faqOpen === i ? null : i)} activeOpacity={0.7}>
                  <Text style={styles.faqQ}>{faqOpen === i ? '▾' : '▸'} {f.q}</Text>
                </TouchableOpacity>
                {faqOpen === i && <Text style={styles.faqA}>{f.a}</Text>}
              </View>
            ))}
          </Section>
        )}

        {/* 9. Nhật ký */}
        <Section title="📓 Nhật ký" defaultOpen={true}>
          {journalEntries.map(n => (
            <View key={n.id} style={styles.journalRow}>
              <Text style={[styles.bodyText, { flex: 1, flexShrink: 1 }]}>{n.content}</Text>
              <TouchableOpacity onPress={() => removeJournal(n)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.deleteTxt}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TextInput
            ref={journalInputRef}
            style={styles.journalInput}
            placeholder="Ghi lại cảm nghĩ hoặc điều đáng nhớ về ngày này…"
            placeholderTextColor={COLORS.textMuted}
            value={journalText}
            onChangeText={setJournalText}
            onFocus={Platform.OS === 'web' ? () => scrollInputAboveKeyboard(scrollRef, journalInputRef) : undefined}
            multiline
          />
          <TouchableOpacity
            style={[styles.saveBtn, (!journalText.trim() || journalSaving) && styles.saveBtnDisabled]}
            onPress={saveJournal}
            disabled={!journalText.trim() || journalSaving}
          >
            <Text style={styles.saveBtnText}>{journalSaving ? 'Đang lưu…' : 'Lưu nhật ký'}</Text>
          </TouchableOpacity>
        </Section>

        {/* 10. Thêm sự kiện cá nhân — lối vào duy nhất cho user_events */}
        <Section title="➕ Thêm ngày kỷ niệm của riêng bạn" defaultOpen={true}>
          <View style={styles.typeRow}>
            {EVENT_TYPE_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.typeChip, addType === opt.key && styles.typeChipActive]}
                onPress={() => selectType(opt.key)}
              >
                <Text style={[styles.typeChipText, addType === opt.key && styles.typeChipTextActive]}>
                  {opt.icon} {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            ref={addTitleInputRef}
            style={styles.input}
            placeholder="Tên sự kiện, vd: Sinh nhật Bo"
            placeholderTextColor={COLORS.textMuted}
            value={addTitle}
            onChangeText={setAddTitle}
            onFocus={Platform.OS === 'web' ? () => scrollInputAboveKeyboard(scrollRef, addTitleInputRef) : undefined}
          />
          <TextInput
            ref={addRelatedPeopleInputRef}
            style={styles.input}
            placeholder="Người liên quan (tùy chọn), vd: Cô dâu Lan, chú rể Minh"
            placeholderTextColor={COLORS.textMuted}
            value={addRelatedPeople}
            onChangeText={setAddRelatedPeople}
            onFocus={Platform.OS === 'web' ? () => scrollInputAboveKeyboard(scrollRef, addRelatedPeopleInputRef) : undefined}
          />
          <TouchableOpacity style={styles.dateField} onPress={() => setShowPicker(true)} activeOpacity={0.8}>
            <Text style={styles.dateFieldLabel}>Ngày</Text>
            <Text style={styles.dateFieldValue}>{formatVN(pickerSelDate)}</Text>
          </TouchableOpacity>
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.smallToggle, addCalendar === 'solar' && styles.smallToggleActive]}
              onPress={() => setAddCalendar('solar')}
            >
              <Text style={[styles.smallToggleText, addCalendar === 'solar' && styles.smallToggleTextActive]}>Dương lịch</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.smallToggle, addCalendar === 'lunar' && styles.smallToggleActive]}
              onPress={() => setAddCalendar('lunar')}
            >
              <Text style={[styles.smallToggleText, addCalendar === 'lunar' && styles.smallToggleTextActive]}>Âm lịch</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.smallToggle, addRepeat && styles.smallToggleActive]}
              onPress={() => setAddRepeat(r => !r)}
            >
              <Text style={[styles.smallToggleText, addRepeat && styles.smallToggleTextActive]}>Lặp hàng năm</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.saveBtn, (!addTitle.trim() || saving) && styles.saveBtnDisabled]}
            onPress={submitAdd}
            disabled={!addTitle.trim() || saving}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Đang lưu…' : 'Lưu sự kiện'}</Text>
          </TouchableOpacity>
        </Section>

        {/* 11. Quản lý thông báo — riêng cho sự kiện đang xem, đặt CUỐI CÙNG theo yêu cầu. */}
        <Section title="⚙️ Quản lý thông báo" defaultOpen={false}>
          <View style={styles.notifyRow}>
            <Text style={styles.bodyText}>Nhận thông báo cho sự kiện này</Text>
            <TouchableOpacity onPress={toggleNotifyEnabled} style={[styles.notifyToggle, notifyEnabled && styles.notifyToggleOn]}>
              <Text style={styles.notifyToggleText}>{notifyEnabled ? 'Đang BẬT' : 'Đang TẮT'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.emptyHint, { marginTop: 4 }]}>
            Tắt thì sự kiện này sẽ không xuất hiện trong chuông thông báo lẫn không lên lịch nhắc, nhưng vẫn hiện bình thường ở Trang chủ và xem được ở đây.
          </Text>

          <View style={styles.innerDivider} />
          <Text style={styles.subHeading}>Nhắc trước bao nhiêu ngày</Text>
          <Text style={[styles.emptyHint, { marginTop: 2 }]}>Nhập các mốc, cách nhau bằng dấu phẩy (vd: 5, 1, 0). Mốc lớn hơn "Hiện trước" của sự kiện sẽ tự bị bỏ qua.</Text>
          <View style={styles.notifyDaysRow}>
            <TextInput
              ref={notifyDaysInputRef}
              style={[styles.input, { flex: 1 }]}
              value={notifyDaysInput}
              onChangeText={setNotifyDaysInput}
              onFocus={Platform.OS === 'web' ? () => scrollInputAboveKeyboard(scrollRef, notifyDaysInputRef) : undefined}
              placeholder="5, 1, 0"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numbers-and-punctuation"
            />
            <TouchableOpacity style={styles.notifySaveBtn} onPress={saveNotifyDays} disabled={notifySaving}>
              <Text style={styles.notifySaveBtnText}>{notifySaving ? 'Đang lưu…' : 'Lưu'}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={doResetNotifyPref} style={{ marginTop: 4 }}>
            <Text style={styles.notifyLinkText}>↺ Đặt lại mặc định (bật, nhắc 5/1/0 ngày)</Text>
          </TouchableOpacity>

          <View style={styles.innerDivider} />
          <TouchableOpacity onPress={doResetDismiss} style={{ marginTop: 4 }}>
            <Text style={styles.notifyLinkText}>↺ Đặt lại trạng thái "Ẩn"/"Nhắc lại sau" (nếu đã bấm ở Trang chủ)</Text>
          </TouchableOpacity>

          {event.userEvent && (
            <>
              <View style={styles.innerDivider} />
              <TouchableOpacity onPress={removeThisEvent} style={{ marginTop: 4 }}>
                <Text style={[styles.notifyLinkText, { color: COLORS.red }]}>🗑 Xóa sự kiện tự nhập này</Text>
              </TouchableOpacity>
            </>
          )}
        </Section>
      </KeyboardAwareScreen>

      <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <View style={styles.pickerBackdrop}>
          <TouchableOpacity style={styles.pickerBackdropTap} activeOpacity={1} onPress={() => setShowPicker(false)} />
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Chọn ngày</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}><Text style={styles.pickerClose}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView>
              <LunarCalendarPicker
                selectedDate={pickerSelDate}
                onSelectDate={(d) => { setAddDate(toISO(d)); setShowPicker(false); }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  // WEB: paddingBottom lớn cố định (không dùng SPACING — khoảng đệm riêng cho bàn phím,
  // không phải spacing bố cục) để đủ chỗ cuộn ô Nhật ký/Thêm sự kiện lên trên — giữ nguyên
  // vì đã chạy ổn định. NATIVE: KeyboardAwareScreen tự thêm/bớt khoảng đệm theo bàn phím.
  scroll: {
    padding: SPACING.lg, gap: SPACING.sm,
    paddingBottom: Platform.OS === 'web' ? 300 : SPACING.xxl,
  },
  heroNavBtn: {
    position: 'absolute', top: 10, zIndex: 2,
    width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(226,194,133,0.35)',
  },
  heroNavBtnLeft: { left: 10 },
  heroNavBtnRight: { right: 10 },
  heroNavBtnDisabled: { opacity: 0.25 },
  heroNavBtnTxt: { fontFamily: FONTS.displayBold, fontSize: 18, lineHeight: 20, color: COLORS.goldLight },
  heroCard: {
    position: 'relative',
    backgroundColor: 'rgba(226,194,133,0.13)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(226,194,133,0.38)',
    padding: 20, gap: SPACING.sm,
  },
  heroRow: { flexDirection: 'row', alignItems: 'stretch' },
  heroLeft: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  heroIconInline: { fontSize: 34 },
  heroTitleBig: { color: COLORS.goldLight, fontSize: 26, lineHeight: 30, fontFamily: FONTS.displayBold, textAlign: 'center' },
  heroDivider: { width: 1, alignSelf: 'stretch', backgroundColor: 'rgba(226,194,133,0.25)', marginHorizontal: SPACING.sm },
  heroRight: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  heroDate: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, textAlign: 'center' },
  // "Timeline" (TUZI_M04 mục 7) — nhãn giai đoạn tính từ daysUntil, xem eventStage() trong lifeEventEngine.ts.
  heroStageBadge: { color: COLORS.textMuted, fontSize: FONTS.size.xs, fontWeight: '700', textAlign: 'center' },
  heroCountdown: { color: COLORS.goldLight, fontSize: 22, lineHeight: 26, fontFamily: FONTS.displayBold, textAlign: 'center' },
  shareBtn: {
    minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(226,194,133,0.4)', borderRadius: 999,
    paddingHorizontal: SPACING.md, backgroundColor: 'rgba(255,255,255,0.06)',
  },
  shareBtnText: { color: COLORS.textSecondary, fontSize: FONTS.size.xs, fontWeight: '700' },
  deleteEventBtn: {
    alignSelf: 'flex-start', borderWidth: 1, borderColor: COLORS.red, borderRadius: 20,
    paddingVertical: 6, paddingHorizontal: SPACING.md, backgroundColor: COLORS.card,
  },
  deleteEventBtnText: { color: COLORS.red, fontSize: FONTS.size.xs, fontWeight: '700' },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(226,194,133,0.18)',
    padding: SPACING.md,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardChevron: { color: COLORS.textMuted, fontSize: FONTS.size.md, fontWeight: '700' },
  cardBody: { gap: 6, marginTop: SPACING.sm },
  // To hơn 1 chút so với trước (sm→lg) để dễ nhìn, đồng thời cao hơn cả subHeading/bodyText (md)
  // bên trong để giữ đúng thứ bậc tiêu đề box > tiêu đề phụ > nội dung.
  cardTitle: { color: COLORS.textPrimary, fontSize: 22, lineHeight: 26, fontFamily: FONTS.display, flex: 1 },
  // Đồng bộ với font "AI cá nhân hóa" (SimpleMarkdown dùng FONTS.size.md cho tiêu đề phụ lẫn nội
  // dung) — subHeading trước đây nhỏ hơn cả nội dung bên dưới nó (xs < sm), gây lệch thứ bậc.
  subHeading: {
    color: COLORS.gold, fontSize: FONTS.size.md, fontFamily: FONTS.bodyBold, marginTop: 4,
  },
  innerDivider: { height: 1, backgroundColor: COLORS.border, marginTop: SPACING.xs },
  // Nhiều sự kiện trùng ngày — chip chọn (tính năng CHÍNH THỨC, không phải test).
  sameDayBox: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(226,194,133,0.18)',
    padding: SPACING.sm, gap: SPACING.xs,
  },
  sameDayLabel: { color: COLORS.textSecondary, fontSize: FONTS.size.xs, fontWeight: '700' },
  // Nội dung chính trong mọi box — đồng bộ font với "AI cá nhân hóa" (SimpleMarkdown dùng
  // FONTS.size.md/lineHeight 22) để không còn chỗ to chỗ nhỏ giữa các mục trong cùng màn hình,
  // căn justify cho gọn 2 lề (giống SimpleMarkdown's `para`/`bulletText`).
  bodyText: { color: COLORS.textSecondary, fontSize: FONTS.size.md, lineHeight: 24, fontFamily: FONTS.body },
  emptyHint: { color: COLORS.textMuted, fontSize: FONTS.size.md, lineHeight: 22, fontStyle: 'italic', textAlign: 'justify' },
  highlight: { color: COLORS.gold, fontWeight: '800' },
  // "Nên làm/Nên tránh": chữ nội dung dùng CHUNG 1 màu với các nội dung khác (textSecondary) —
  // chỉ riêng ký tự đầu dòng (✓/✕) tô màu để phân biệt, không tô cả câu như trước.
  bulletText: { color: COLORS.textSecondary, fontSize: FONTS.size.md, lineHeight: 22, textAlign: 'justify' },
  bulletDotGood: { color: COLORS.green, fontWeight: '800' },
  bulletDotBad: { color: COLORS.red, fontWeight: '800' },
  aiBtn: { backgroundColor: COLORS.gold, borderRadius: 8, paddingVertical: SPACING.sm, alignItems: 'center', marginTop: 4 },
  aiBtnText: { color: '#1a0a00', fontWeight: '800', fontSize: FONTS.size.sm },
  aiRetry: { color: COLORS.gold, fontSize: FONTS.size.xs, fontWeight: '700', marginTop: SPACING.xs },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  checkBox: { fontSize: 18 },
  checkText: { color: COLORS.textPrimary, fontSize: FONTS.size.md, lineHeight: 22, flex: 1, flexShrink: 1, textAlign: 'justify' },
  checkTextDone: { textDecorationLine: 'line-through', color: COLORS.textMuted },
  faqItem: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 6 },
  faqQ: { color: COLORS.textPrimary, fontSize: FONTS.size.md, lineHeight: 22, fontWeight: '700', textAlign: 'justify' },
  faqA: { color: COLORS.textSecondary, fontSize: FONTS.size.md, lineHeight: 22, marginTop: 4, textAlign: 'justify' },
  prayerBody: { color: COLORS.textPrimary, fontSize: FONTS.size.md, lineHeight: 22, textAlign: 'justify' },
  // "Quản lý thông báo" — bật/tắt + tùy chỉnh số ngày nhắc trước riêng cho sự kiện đang xem.
  notifyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notifyToggle: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, paddingVertical: 4, paddingHorizontal: SPACING.sm },
  notifyToggleOn: { borderColor: COLORS.green, backgroundColor: 'rgba(95,219,138,0.15)' },
  notifyToggleText: { color: COLORS.textSecondary, fontSize: FONTS.size.xs, fontWeight: '800' },
  notifyDaysRow: { flexDirection: 'row', gap: SPACING.xs, alignItems: 'center', marginTop: 4 },
  notifySaveBtn: { backgroundColor: COLORS.gold, borderRadius: 8, paddingVertical: 8, paddingHorizontal: SPACING.sm },
  notifySaveBtnText: { color: '#1a0a00', fontWeight: '800', fontSize: FONTS.size.sm },
  notifyLinkText: { color: COLORS.gold, fontSize: FONTS.size.sm, fontWeight: '700' },
  journalRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.xs,
    backgroundColor: COLORS.surface, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.sm,
  },
  deleteTxt: { color: COLORS.red, fontSize: FONTS.size.md, fontWeight: '800', padding: 4 },
  journalInput: {
    backgroundColor: COLORS.surface, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border,
    color: COLORS.textPrimary, padding: SPACING.sm, fontSize: FONTS.size.sm, minHeight: 60, textAlignVertical: 'top',
  },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  typeChip: {
    minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(226,194,133,0.25)', borderRadius: 999,
    paddingHorizontal: SPACING.md, backgroundColor: 'rgba(255,255,255,0.05)',
  },
  typeChipActive: { borderColor: COLORS.gold, backgroundColor: 'rgba(226,194,133,0.2)' },
  typeChipText: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, fontFamily: FONTS.bodySemi },
  typeChipTextActive: { color: COLORS.goldLight },
  input: {
    backgroundColor: COLORS.surface, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border,
    color: COLORS.textPrimary, padding: SPACING.sm, fontSize: FONTS.size.sm,
  },
  dateField: {
    backgroundColor: COLORS.surface, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  dateFieldLabel: { color: COLORS.textMuted, fontSize: FONTS.size.xs, fontWeight: '700' },
  dateFieldValue: { color: COLORS.gold, fontSize: FONTS.size.sm, fontWeight: '700' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  smallToggle: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    paddingVertical: 6, paddingHorizontal: SPACING.sm, backgroundColor: COLORS.surface,
  },
  smallToggleActive: { borderColor: COLORS.gold },
  smallToggleText: { color: COLORS.textSecondary, fontSize: FONTS.size.xs, fontWeight: '700' },
  smallToggleTextActive: { color: COLORS.gold },
  saveBtn: { backgroundColor: COLORS.gold, borderRadius: 8, paddingVertical: SPACING.sm, alignItems: 'center', marginTop: 4 },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#1a0a00', fontWeight: '800', fontSize: FONTS.size.sm },

  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  pickerBackdropTap: { flex: 1 },
  pickerSheet: {
    maxHeight: '80%', backgroundColor: COLORS.background, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: SPACING.lg, borderTopWidth: 1, borderColor: COLORS.gold,
  },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  pickerTitle: { color: COLORS.gold, fontSize: FONTS.size.md, fontWeight: '800' },
  pickerClose: { color: COLORS.textSecondary, fontSize: FONTS.size.lg, fontWeight: '700', padding: 4 },
});
