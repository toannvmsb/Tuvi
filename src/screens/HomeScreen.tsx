import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, ScrollView, Pressable, Alert, TextInput, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, AstrologyResult } from '../types';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { wallet } from '../constants/premium';
import { APP_VERSION, COPYRIGHT } from '../constants/appInfo';
import HeaderMenuButton from '../components/HeaderMenuButton';
import NotificationBell from '../components/NotificationBell';
import AnimatedAvatar from '../components/AnimatedAvatar';
import MonthDayHeatmapPanel from '../components/MonthDayHeatmapPanel';
import { getMyChartId } from '../lib/myChart';
import { listCharts, getCachedCharts, rowToResult, type SavedChartRow } from '../lib/charts';
import { buildTodaySummary, type TodaySummary } from '../core/todaySummary';
import { buildNguyetVanCharts, type NguyetVanChartData } from '../core/nguyetVanCharts';
import { buildGenericMonthHeatmap } from '../core/genericMonthHeatmap';
import { currentAgeOf } from '../core/ageUtil';
import { dailyGreetingLine } from '../core/dailyGreeting';
import { solarToLunar } from '../core/lunarCalendar';
import { syncEventNotifications, planScheduledReminders } from '../lib/notificationEvents';
import { syncBroadcasts } from '../lib/broadcasts';
import { openAiChat } from '../lib/aiChatBus';
import { scrollInputAboveKeyboard } from '../lib/scrollToInput';
import KeyboardAwareScreen from '../components/KeyboardAwareScreen';
import { listLifeTasks, compareLifeTasks, type LifeTask } from '../lib/lifeTasks';
import { listLifeNotes, createLifeNote, type LifeNote } from '../lib/lifeNotes';
import { buildFinancialAdvice, buildGenericFinancialAdvice, type FinancialAdviceItem } from '../core/financialAdvisor';
import { promptPersonalize } from '../lib/personalizePrompt';
import { getSelectedAvatarId } from '../lib/avatarPrefs';
import { fetchEventPackages, listMyUserEvents } from '../lib/lifeEvents';
import { pickUpcomingEvent, resolveAllUpcomingEvents, type ResolvedEvent, type EventPackage, type UserEvent } from '../core/lifeEventEngine';
import { hideEventOccurrence, snoozeEvent, buildIsDismissed } from '../lib/eventDismiss';
import { buildNotifyPrefLookup } from '../lib/eventNotifyPrefs';
import type { ScrollRef, TextInputRef } from '../types/refs';

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** "10:15" nếu tạo hôm nay, "10:15 25/7" nếu ngày khác — cho preview "Ghi chú nhanh" ở Home. */
function noteTimeLabel(createdAt: string): string {
  const d = new Date(createdAt);
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const now = new Date();
  const sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  return sameDay ? hm : `${hm} ${d.getDate()}/${d.getMonth() + 1}`;
}

const MONTH_NAMES = ['', 'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const RATING_COLOR: Record<string, string> = {
  'Rất tốt': '#22c55e', 'Tốt': '#5fdb8a', 'Khá': '#a3d977',
  'Bình thường': COLORS.gold, 'Cần thận trọng': '#e0a23a', 'Xấu': '#ff7a7a',
};

/** Màu ngày bắt đầu/kết thúc trong box "Việc & Mục tiêu": đang thực hiện = vàng, quá hạn = đỏ, chưa tới ngày = xanh. */
function taskDateColor(t: LifeTask, todayStr: string): string {
  if (t.end_date && todayStr > t.end_date) return COLORS.red;
  if (t.start_date && todayStr < t.start_date) return COLORS.blue;
  return COLORS.gold;
}

const TIER_COLOR: Record<FinancialAdviceItem['tier'], string> = {
  good: COLORS.green, neutral: COLORS.gold, caution: COLORS.red,
};

export default function HomeScreen({ navigation }: Props) {
  const { online, user } = useAuth();
  const displayName = user?.displayName || (online ? '' : wallet.userName);
  const [summary, setSummary] = useState<TodaySummary | null>(null);
  const [myResult, setMyResult] = useState<AstrologyResult | null>(null);
  const [monthCharts, setMonthCharts] = useState<NguyetVanChartData | null>(null);
  const [taskPreview, setTaskPreview] = useState<LifeTask[]>([]);
  const [notesPreview, setNotesPreview] = useState<LifeNote[]>([]);
  const [upcomingEvent, setUpcomingEvent] = useState<ResolvedEvent | null>(null);
  // Giữ RAW packages/userEvents đã tải để "Ẩn"/"Nhắc lại sau" (eventDismiss.ts) có thể tính lại
  // ngay ứng viên tiếp theo mà KHÔNG cần gọi lại Supabase.
  const eventPackagesRef = useRef<EventPackage[]>([]);
  const eventUserEventsRef = useRef<UserEvent[]>([]);
  // Duyệt qua lại sự kiện bằng mũi tên ‹ › — CHỈ là xem TẠM THỜI tại lúc đó, không lưu lại đâu cả.
  // Khi màn Home tải lại (mở lại app, hoặc quay lại từ màn khác) sẽ tự quay về đúng sự kiện thật
  // theo pickUpcomingEvent (xem chỗ reset trong loadSummary bên dưới).
  const [browsedEvent, setBrowsedEvent] = useState<ResolvedEvent | null>(null);
  const displayedEvent = browsedEvent ?? upcomingEvent;
  const [showFinanceModal, setShowFinanceModal] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [avatarId, setAvatarId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollRef>(null);
  const noteInputRef = useRef<TextInputRef>(null);

  const now = new Date();
  const nowLunar = solarToLunar(now.getDate(), now.getMonth() + 1, now.getFullYear());
  const genericMonth = buildGenericMonthHeatmap(now);
  // Gợi ý Tài chính - Đầu tư: tính lại mỗi khi màn hình mở/lấy focus (loadSummary chạy lại
  // qua useFocusEffect) — tự "sang kỳ mới" theo ngày/tháng âm mà không cần lưu trạng thái.
  const financeAdvice = useMemo(
    () => (myResult ? buildFinancialAdvice(myResult, now) : buildGenericFinancialAdvice(now)),
    [myResult, nowLunar.day, nowLunar.month],
  );

  const loadSummary = useCallback(async () => {
    let result: AstrologyResult | null = null;
    let charts: SavedChartRow[] = getCachedCharts() ?? [];
    try {
      if (online) charts = await listCharts();
      const id = await getMyChartId();
      if (id) {
        const row = charts.find(r => r.id === id);
        if (row) result = rowToResult(row);
      }
    } catch { /* dùng bản chung */ }
    setMyResult(result);
    setSummary(buildTodaySummary(result, new Date()));
    if (result) {
      // Dùng tuổi TÍNH THEO NGÀY THỰC (không phải viewingAge đã lưu cố định
      // từ lúc lập lá số) — nếu không, box "hôm nay/tháng này" sẽ lệch khỏi
      // ngày thật khi lá số được tạo từ trước và "Năm xem" chưa cập nhật.
      setMonthCharts(buildNguyetVanCharts(result, currentAgeOf(result), nowLunar.month));
    } else {
      setMonthCharts(null);
    }
    // Xem trước Việc & Mục tiêu + báo hạn (chỉ khi đã đăng nhập online) — nạp
    // TRƯỚC để dùng chung cho cả preview lẫn 2 lời gọi thông báo bên dưới.
    // Việc & Mục tiêu gắn theo NGƯỜI DÙNG (không theo lá số) — chỉ cần đăng
    // nhập, giống hệt Ghi chú nhanh ngay bên dưới.
    let allOpenTasks: LifeTask[] = [];
    if (online) {
      try {
        // "3 việc quan trọng nhất": gộp Việc + Mục tiêu rồi sắp lại bằng ĐÚNG
        // quy tắc đã dùng ở màn chi tiết (ưu tiên thủ công trước, còn lại theo
        // ngày bắt đầu/kết thúc) — 2 danh sách đã sắp riêng theo kind nên phải
        // merge-sort lại bằng chung 1 comparator, không thể nối rồi cắt thẳng.
        const [tasks, goals] = await Promise.all([listLifeTasks('task'), listLifeTasks('goal')]);
        allOpenTasks = [...tasks, ...goals].filter(t => t.status === 'open').sort(compareLifeTasks);
        setTaskPreview(allOpenTasks.slice(0, 3));
      } catch { setTaskPreview([]); }
    } else {
      setTaskPreview([]);
    }

    // Ghi chú nhanh — 2 mục gần nhất, không phụ thuộc lá số (chỉ cần đăng nhập).
    if (online) {
      try {
        setNotesPreview(await listLifeNotes(3));
      } catch { setNotesPreview([]); }
    } else {
      setNotesPreview([]);
    }

    // Sự kiện sắp tới — lễ Tết/tiết khí (nội dung công khai) + sự kiện cá nhân (cần đăng nhập).
    // Rule Engine chạy client-side, chọn đúng 1 sự kiện ưu tiên cao nhất cho box Home, bỏ qua sự
    // kiện người dùng đã bấm "Ẩn"/"Nhắc lại sau" (isDismissed, xem lib/eventDismiss.ts).
    try {
      const [packages, userEvents] = await Promise.all([
        fetchEventPackages(),
        online ? listMyUserEvents().catch(() => []) : Promise.resolve([]),
      ]);
      eventPackagesRef.current = packages;
      eventUserEventsRef.current = userEvents;
      const isDismissed = await buildIsDismissed();
      setUpcomingEvent(pickUpcomingEvent(packages, userEvents, new Date(), isDismissed));
      setBrowsedEvent(null); // mỗi lần Home tải lại → bỏ trạng thái duyệt tạm, quay về sự kiện thật
    } catch { setUpcomingEvent(null); setBrowsedEvent(null); }

    // Sinh thông báo sự kiện (hiện ngay khi đang mở) + lên lịch nhắc cả khi app đóng — kèm nhắc
    // hạn Việc & Mục tiêu (bắt đầu/hết hạn hôm nay hoặc ngày mai) và mốc nhắc của "Sự kiện sắp
    // tới" (dùng eventPackagesRef/eventUserEventsRef vừa nạp ở trên + tùy chỉnh riêng từng sự
    // kiện từ mục "Quản lý thông báo", xem lib/eventNotifyPrefs.ts).
    (async () => {
      const notifyPrefs = await buildNotifyPrefLookup();
      void syncEventNotifications(result, charts, allOpenTasks, eventPackagesRef.current, eventUserEventsRef.current, notifyPrefs);
      void planScheduledReminders(result, charts, allOpenTasks, eventPackagesRef.current, eventUserEventsRef.current, notifyPrefs);
    })();
    // Thông báo từ admin (khuyến mại/giảm giá chỉ trên web · cập nhật chức năng mọi nền tảng).
    void syncBroadcasts();
  }, [online]);

  /** Box "Ngày hôm nay" / "Nhịp tháng này" khi chưa gắn lá số → hỏi tạo mới hay dùng lá số đã lưu. */
  const promptNoChart = () => {
    Alert.alert(
      'Chưa có hoặc chưa gắn lá số',
      'Bạn tạo lá số mới hoặc vào Lá số đã lưu và gắn lá số để có lời khuyên dành riêng cho bạn.',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Lá số mới', onPress: () => navigation.navigate('Input') },
        { text: 'Lá số đã lưu', onPress: () => navigation.navigate('MyCharts') },
      ],
    );
  };

  /** Nhấn Tên trong lời chào → mở màn Lá Số (tab Tử Vi); chưa có lá số → mời cá nhân hóa,
   * "Tiếp tục ở chế độ mặc định" → màn Thông tin tài khoản. */
  const goMyChart = () => {
    if (myResult) {
      (navigation as any).navigate('MainTabs', { result: myResult, screen: 'TuViChart', params: { result: myResult } });
    } else {
      promptPersonalize(navigation, () => navigation.navigate('Account'));
    }
  };

  /** Nhấn nút "Xem ngày tốt" → mở DayPicker; chưa gắn lá số → mời cá nhân hóa,
   * "Tiếp tục ở chế độ cơ bản" → vẫn vào DayPicker nhưng không cá nhân hóa
   * (pickGoodDaysGeneric — xem DayPickerScreen.tsx). */
  const goDayPicker = () => {
    if (myResult) {
      navigation.navigate('DayPicker', { result: myResult });
    } else {
      promptPersonalize(navigation, () => navigation.navigate('DayPicker', {}));
    }
  };

  /** Nhấn "Việc & Mục tiêu" → mở TasksScreen; gắn theo NGƯỜI DÙNG (không theo lá số),
   * KHÔNG chặn bởi myResult — giống hệt "Ghi chú nhanh" (goNotes bên dưới). */
  const goTasks = () => navigation.navigate('Tasks');

  /** Nhấn "Gợi ý Tài chính - Đầu tư" → mở phân tích Tài Lộc; cần có lá số (dùng ADN tài chính + Tài Bạch). */
  const goWealth = () => {
    if (myResult) {
      navigation.navigate('WealthChart', { result: myResult });
    } else {
      promptNoChart();
    }
  };

  /** Nhấn nút "Nguyệt Vận" trong modal gợi ý tài chính → mở tab Nguyệt Vận. */
  const goNguyetVan = () => {
    if (myResult) {
      (navigation as any).navigate('MainTabs', { result: myResult, screen: 'NguyetVan', params: { result: myResult } });
    } else {
      promptNoChart();
    }
  };

  /**
   * Nhấn box "Gợi ý tài chính" → hiện modal đọc TOÀN BỘ nội dung tư vấn tháng này (box chỉ hiện
   * được vài dòng, dài hơn diện tích box), kèm 2 nút để người dùng CHỦ ĐỘNG chọn xem thêm ở Tài
   * Lộc hay Nguyệt Vận — thay vì điều hướng thẳng và mất nội dung tư vấn đang xem.
   * Chưa gắn lá số → mời cá nhân hóa thay vì mở modal (2 nút "Xem Tài Lộc"/"Xem Nguyệt Vận"
   * bên trong modal đều cần lá số nên không có ý nghĩa ở chế độ mặc định).
   */
  const openFinanceModal = () => {
    if (myResult) setShowFinanceModal(true);
    else promptPersonalize(navigation);
  };

  /** Nhấn "Ghi chú nhanh" → mở NotesScreen; KHÔNG cần lá số (ghi chú tự do, không gắn Tử Vi). */
  const goNotes = () => navigation.navigate('Notes');

  /** Nhấn "Sự kiện sắp tới" → mở màn chi tiết; KHÔNG bắt buộc có lá số (cá nhân hóa chỉ là phần thêm). */
  const goEventDetail = () => {
    if (!displayedEvent) return;
    navigation.navigate('EventDetail', { event: displayedEvent, result: myResult ?? undefined });
  };

  /** Tính lại ứng viên tiếp theo từ dữ liệu ĐÃ TẢI (không gọi lại Supabase) sau khi Ẩn/Nhắc lại sau. */
  const refreshUpcomingEvent = useCallback(async () => {
    const isDismissed = await buildIsDismissed();
    setUpcomingEvent(pickUpcomingEvent(eventPackagesRef.current, eventUserEventsRef.current, new Date(), isDismissed));
    setBrowsedEvent(null); // Ẩn/Nhắc lại sau áp dụng ngay — quay về chế độ tự chọn theo thời gian thật
  }, []);

  /** "Ẩn" — bỏ qua đúng lần xảy ra này, sẽ hiện lại bình thường vào lần xảy ra kế tiếp. */
  const onHideEvent = async () => {
    if (!displayedEvent) return;
    await hideEventOccurrence(displayedEvent.key, displayedEvent.occursOn);
    await refreshUpcomingEvent();
  };

  /** "Nhắc lại sau" — tạm ẩn ~20 tiếng rồi tự hiện lại. */
  const onSnoozeEvent = async () => {
    if (!displayedEvent) return;
    await snoozeEvent(displayedEvent.key);
    await refreshUpcomingEvent();
  };

  /** ‹ › — duyệt qua lại DANH SÁCH ĐẦY ĐỦ theo thời gian (không lọc "Ẩn"/"Nhắc lại sau", không
   * lọc theo show_before/after — xem hết được mọi sự kiện, giống công cụ TEST ở màn chi tiết).
   * Chỉ đổi `browsedEvent` (state tạm) — KHÔNG lưu lại, mất khi rời/tải lại Home. */
  const browseEvent = (direction: -1 | 1) => {
    const list = resolveAllUpcomingEvents(eventPackagesRef.current, eventUserEventsRef.current);
    if (list.length < 2 || !displayedEvent) return;
    const idx = list.findIndex(e => e.key === displayedEvent.key);
    const nextIdx = idx === -1 ? 0 : (idx + direction + list.length) % list.length;
    setBrowsedEvent(list[nextIdx]);
  };
  const goPrevEvent = () => browseEvent(-1);
  const goNextEvent = () => browseEvent(1);

  const quickSaveNote = async () => {
    if (!noteInput.trim() || savingNote) return;
    if (!online) {
      Alert.alert('Cần đăng nhập', 'Đăng nhập để lưu ghi chú của bạn.');
      return;
    }
    setSavingNote(true);
    try {
      await createLifeNote({ content: noteInput });
      setNoteInput('');
      setNotesPreview(await listLifeNotes(3));
    } catch (e: any) {
      Alert.alert('Không lưu được', e?.message || 'Lỗi không xác định.');
    } finally {
      setSavingNote(false);
    }
  };

  useFocusEffect(useCallback(() => { loadSummary(); }, [loadSummary]));
  // Nạp lại mỗi khi quay lại Home — để đổi nhân vật ở Tài khoản có hiệu lực ngay.
  useFocusEffect(useCallback(() => { getSelectedAvatarId().then(setAvatarId); }, []));

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[COLORS.background, '#1a0a3a', COLORS.background]} style={styles.gradient}>
        <View style={styles.topBar}>
          <NotificationBell />
          <View style={styles.topBarGap} />
          <HeaderMenuButton />
        </View>

        <KeyboardAwareScreen
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header — nhân vật đại diện (chọn ở Tài khoản) bên trái, lời chào + câu chúc ngày mới bên phải. */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.navigate('Account')} activeOpacity={0.8}>
              <AnimatedAvatar avatarId={avatarId} size={68} />
            </TouchableOpacity>
            <View style={styles.headerText}>
              <Text style={styles.greeting}>Xin chào</Text>
              {displayName ? (
                <TouchableOpacity onPress={goMyChart} activeOpacity={0.7}>
                  <Text style={[styles.greeting, styles.greetingName]}>{displayName}</Text>
                </TouchableOpacity>
              ) : null}
              <Text style={styles.tagline}>{dailyGreetingLine()}</Text>
            </View>
          </View>

          {/* Hỏi Tuzi — lối vào nhanh tới Chat AI (icon nổi cũng luôn sẵn sàng). */}
          <TouchableOpacity style={styles.askBar} onPress={openAiChat} activeOpacity={0.85}>
            <Text style={styles.askIcon}>✨</Text>
            <Text style={styles.askText}>Hỏi Tuzi bất cứ điều gì…</Text>
          </TouchableOpacity>

          {/* NGÀY HÔM NAY — thu gọn: trái = ô ngày, phải = rating + Nên + Hạn chế. Nhấn để xem chi tiết. */}
          {summary && (
            <Pressable
              style={styles.todayCard}
              onPress={() => {
                if (myResult) navigation.navigate('DailyView', { result: myResult });
                else promptPersonalize(navigation, () => navigation.navigate('DailyView', {}));
              }}
            >
              <View style={styles.dateCell}>
                <Text style={styles.dateMonth}>{MONTH_NAMES[now.getMonth() + 1]}</Text>
                <Text style={styles.dateBig}>{now.getDate()}</Text>
                <Text style={styles.dateLunar}>{nowLunar.day}/{nowLunar.month} âm{nowLunar.isLeapMonth ? ' nhuận' : ''}</Text>
              </View>
              <View style={styles.dateInfo}>
                <Text style={styles.dateInfoRating}>
                  Hôm nay: <Text style={{ color: RATING_COLOR[summary.rating] || COLORS.gold }}>{summary.rating}</Text>
                </Text>
                <Text style={styles.dateInfoLine}>✅ Nên: {summary.good[0] ?? '—'}</Text>
                <Text style={styles.dateInfoLine}>⛔ Hạn chế: {summary.bad[0] ?? '—'}</Text>
              </View>
            </Pressable>
          )}

          {/*
            Sự kiện sắp tới (trái) + Gợi ý tài chính (phải) — 2 box nửa-nửa cùng hàng, đặt TRƯỚC
            "Việc & Mục tiêu" (theo yêu cầu anh Toàn). "Sự kiện sắp tới": lễ Tết/tiết khí/sự kiện
            cá nhân, do lifeEventEngine chọn 1 sự kiện ưu tiên cao nhất. "Gợi ý tài chính": chỉ còn
            phần THÁNG (bỏ phần "Hôm nay" cũ) — phần Hôm nay đã có box "Ngày hôm nay" riêng ở trên
            rồi, tránh trùng lặp.
          */}
          <View style={styles.eventsFinanceRow}>
            <TouchableOpacity
              style={[styles.previewBox, styles.previewBoxHalf, styles.eventBoxHighlight]}
              onPress={goEventDetail}
              activeOpacity={0.85}
              disabled={!displayedEvent}
            >
              <View style={styles.previewHead}>
                <Text style={styles.previewTitle}>🗓️ Sự kiện sắp tới</Text>
              </View>
              {!displayedEvent ? (
                <Text style={styles.previewEmpty}>Chưa có sự kiện nào sắp tới.</Text>
              ) : (
                <>
                  {/* ‹ › duyệt sự kiện trước/sau — CHỈ xem tạm, không lưu (xem browseEvent()).
                      Đặt ngay lề trái/phải của ô, lồng trong TouchableOpacity ngoài nên bấm vào
                      đây KHÔNG kích hoạt điều hướng xem chi tiết. */}
                  <TouchableOpacity
                    style={[styles.eventNavArrow, styles.eventNavArrowLeft]}
                    onPress={goPrevEvent}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.eventNavArrowText}>‹</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.eventNavArrow, styles.eventNavArrowRight]}
                    onPress={goNextEvent}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.eventNavArrowText}>›</Text>
                  </TouchableOpacity>

                  <View style={styles.eventBoxBody}>
                    <View style={styles.eventNameRow}>
                      <Text style={styles.eventAvatarIcon}>{displayedEvent.icon}</Text>
                      <Text style={styles.eventName} numberOfLines={2}>{displayedEvent.displayName}</Text>
                    </View>
                    <Text style={styles.eventDaysLeft}>
                      {displayedEvent.daysUntil === 0 ? 'Hôm nay!'
                        : displayedEvent.daysUntil < 0 ? `${-displayedEvent.daysUntil} ngày trước`
                        : `Còn ${displayedEvent.daysUntil} ngày`}
                    </Text>
                    {/* "Ẩn"/"Nhắc lại sau" (TUZI_M04 mục 8 — Home Card) — nút lồng bên trong
                        TouchableOpacity ngoài nên bấm vào đây KHÔNG kích hoạt điều hướng xem chi tiết. */}
                    <View style={styles.eventDismissRow}>
                      <TouchableOpacity onPress={onHideEvent} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                        <Text style={styles.eventDismissBtnText}>🙈 Ẩn</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={onSnoozeEvent} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                        <Text style={styles.eventDismissBtnText}>⏰ Nhắc sau</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.previewBox, styles.previewBoxHalf]}
              onPress={openFinanceModal}
              activeOpacity={0.85}
            >
              <View style={styles.previewHead}>
                <Text style={styles.previewTitle}>💰 Gợi ý tài chính</Text>
              </View>
              {!financeAdvice?.month ? (
                <Text style={styles.previewEmpty}>Dữ liệu tháng này chưa sẵn sàng, thử lại sau.</Text>
              ) : (
                <>
                  <View style={styles.financeHead}>
                    <Text style={styles.financeLabel}>{financeAdvice.month.label}</Text>
                    <Text style={[styles.financeTier, { color: TIER_COLOR[financeAdvice.month.tier] }]}>{financeAdvice.month.tierLabel}</Text>
                  </View>
                  <Text style={styles.previewLine} numberOfLines={3}>{financeAdvice.month.text}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Việc & Mục tiêu — 3 mục gần nhất. */}
          <TouchableOpacity style={styles.previewBox} onPress={goTasks} activeOpacity={0.85}>
            <View style={styles.previewHead}>
              <Text style={styles.previewTitle}>✅ Việc & Mục tiêu</Text>
              <Text style={styles.previewMore}>Xem tất cả ›</Text>
            </View>
            {taskPreview.length === 0 ? (
              <Text style={styles.previewEmpty}>Chưa có việc/mục tiêu nào — nhấn để thêm mục đầu tiên.</Text>
            ) : (
              <>
                <View style={styles.taskRow}>
                  <View style={styles.taskRowTitleCol} />
                  <View style={styles.taskRowDates}>
                    <Text style={styles.taskDateHead}>Bắt đầu</Text>
                    <Text style={styles.taskDateHead}>Kết thúc</Text>
                  </View>
                </View>
                {taskPreview.map(t => {
                  const todayStr = todayISO();
                  const color = taskDateColor(t, todayStr);
                  const startLabel = t.start_date ? t.start_date.split('-').slice(1).reverse().join('/') : '—';
                  const endLabel = t.end_date ? t.end_date.split('-').slice(1).reverse().join('/') : '—';
                  return (
                    <View key={`${t.kind}${t.id}`} style={styles.taskRow}>
                      <Text style={[styles.previewLine, styles.taskRowTitleCol]} numberOfLines={1}>
                        {t.kind === 'task' ? '📌' : '🎯'} {t.title}
                      </Text>
                      <View style={styles.taskRowDates}>
                        <Text style={[styles.taskDateText, { color }]} numberOfLines={1}>{startLabel}</Text>
                        <Text style={[styles.taskDateText, { color }]} numberOfLines={1}>{endLabel}</Text>
                      </View>
                    </View>
                  );
                })}
              </>
            )}
          </TouchableOpacity>

          {/*
            Ghi chú nhanh — sổ ghi chú TỰ DO theo ngày (không gắn Việc/Mục tiêu, không cần lá số).
            Box này KHÔNG bọc TouchableOpacity ở ngoài cùng (khác các box khác) vì có ô nhập liệu
            bên trong — bọc touchable ngoài sẽ tranh chấp chạm với TextInput.
          */}
          <View style={styles.previewBox}>
            <View style={styles.previewHead}>
              <Text style={styles.previewTitle}>📝 Ghi chú nhanh</Text>
              <TouchableOpacity onPress={goNotes}><Text style={styles.previewMore}>Xem tất cả ›</Text></TouchableOpacity>
            </View>
            <View style={styles.noteAddRow}>
              <TextInput
                ref={noteInputRef}
                style={styles.noteInput}
                placeholder="Chợt nhớ ra điều gì đó? Ghi lại ở đây…"
                placeholderTextColor={COLORS.textMuted}
                value={noteInput}
                onChangeText={setNoteInput}
                onSubmitEditing={quickSaveNote}
                onFocus={Platform.OS === 'web' ? () => scrollInputAboveKeyboard(scrollRef, noteInputRef) : undefined}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[styles.noteSaveBtn, (!noteInput.trim() || savingNote) && styles.noteSaveBtnDisabled]}
                onPress={quickSaveNote}
                disabled={!noteInput.trim() || savingNote}
              >
                <Text style={styles.noteSaveBtnText}>{savingNote ? '…' : 'Lưu'}</Text>
              </TouchableOpacity>
            </View>
            {notesPreview.length === 0 ? (
              <Text style={styles.previewEmpty}>Note lại điều bạn chợt nhớ ra, hoặc một sự kiện vừa diễn ra.</Text>
            ) : (
              notesPreview.map(n => (
                <TouchableOpacity key={n.id} onPress={goNotes} activeOpacity={0.7} style={styles.noteRow}>
                  <Text style={[styles.previewLine, styles.noteContent]} numberOfLines={1}>📝 {n.content}</Text>
                  <Text style={styles.noteTime}>{noteTimeLabel(n.created_at)}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>

          {/*
            Heatmap "Nhịp tháng này" — LUÔN hiện, kể cả khi chưa gắn lá số:
              - Đã gắn lá số: tháng ÂM của tuổi hiện tại, điểm Nhật Vận cá nhân hóa (engine Nguyệt Vận).
              - Chưa gắn lá số: tháng DƯƠNG hiện tại, điểm ngày chung theo Can-Chi (không cá nhân hóa).
            Nhấn để mở màn Nguyệt Vận đầy đủ; nếu chưa gắn lá số → báo "Chưa gắn lá số" như box ngày.
          */}
          <TouchableOpacity
            style={{ width: '100%', marginTop: SPACING.md }}
            activeOpacity={0.85}
            onPress={() => {
              if (myResult) {
                // QUAN TRỌNG: phải truyền `result` ở CẢ cấp MainTabs (không chỉ trong `params`
                // của screen con) — MainTabs() đọc route.params.result rồi phát initialParams
                // cho MỌI tab; thiếu nó khiến các tab khác (vd "Lá số") nhận result=undefined
                // và crash "Cannot read property 'tuViChart' of undefined" khi chuyển tab.
                (navigation as any).navigate('MainTabs', { result: myResult, screen: 'NguyetVan', params: { result: myResult } });
              } else {
                // Tab Nguyệt Vận thuộc MainTabs, vốn LUÔN yêu cầu có lá số ở mọi tab con — không
                // có phiên bản chung tương đương. "Tiếp tục ở chế độ mặc định" → điều hướng sang
                // "Xem theo ngày" (giống hệt Box Thông báo ngày) — cùng tinh thần theo NGÀY,
                // DailyScreen đã có sẵn bản chế độ mặc định đầy đủ (lịch + Nên/Hạn chế theo ngày).
                promptPersonalize(navigation, () => navigation.navigate('DailyView', {}));
              }
            }}
          >
            {monthCharts ? (
              <MonthDayHeatmapPanel
                days={monthCharts.days}
                stats={monthCharts.stats}
                todayLunarDay={nowLunar.day}
                title="Nhịp tháng này"
                dayKind="lunar"
                titleFontSize={13}
              />
            ) : (
              <MonthDayHeatmapPanel
                days={genericMonth.days}
                stats={genericMonth.stats}
                todayLunarDay={now.getDate()}
                title="Nhịp tháng này"
                caption="Màu = mức độ thuận lợi ngày theo lịch chung (chưa gắn lá số cá nhân). Viền trắng đậm = hôm nay."
                dayKind="solar"
                titleFontSize={13}
              />
            )}
          </TouchableOpacity>

          {/* Lưới module — "Lập lá số" giờ là 1 module trong nhiều module, không còn là CTA chính của app. */}
          <View style={styles.gridDivider} />
          <View style={styles.moduleGrid}>
            <TouchableOpacity style={styles.moduleTile} onPress={() => navigation.navigate('Input')} activeOpacity={0.85}>
              <Text style={styles.moduleIcon}>🔮</Text>
              <Text style={styles.moduleText}>Hồ sơ mới</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.moduleTile} onPress={goDayPicker} activeOpacity={0.85}>
              <Text style={styles.moduleIcon}>🧭</Text>
              <Text style={styles.moduleText}>Xem ngày tốt</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.moduleTile} onPress={() => navigation.navigate('MyCharts')} activeOpacity={0.85}>
              <Text style={styles.moduleIcon}>🗂️</Text>
              <Text style={styles.moduleText}>Hồ sơ đã lưu</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.version}>Phiên bản {APP_VERSION}</Text>
            <Text style={styles.copyright}>{COPYRIGHT}</Text>
          </View>
        </KeyboardAwareScreen>
      </LinearGradient>

      <Modal
        visible={showFinanceModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFinanceModal(false)}
      >
        <View style={styles.financeModalBackdrop}>
          <TouchableOpacity style={styles.financeModalBackdropTap} activeOpacity={1} onPress={() => setShowFinanceModal(false)} />
          <View style={styles.financeModalSheet}>
            <View style={styles.financeModalHeader}>
              <Text style={styles.financeModalTitle}>💰 Gợi ý tài chính</Text>
              <TouchableOpacity onPress={() => setShowFinanceModal(false)}>
                <Text style={styles.financeModalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 260 }}>
              {financeAdvice?.month ? (
                <>
                  <View style={styles.financeHead}>
                    <Text style={styles.financeLabel}>{financeAdvice.month.label}</Text>
                    <Text style={[styles.financeTier, { color: TIER_COLOR[financeAdvice.month.tier] }]}>{financeAdvice.month.tierLabel}</Text>
                  </View>
                  <Text style={styles.financeModalBody}>{financeAdvice.month.text}</Text>
                </>
              ) : (
                <Text style={styles.previewEmpty}>Chưa có dữ liệu tháng này.</Text>
              )}
            </ScrollView>
            <View style={styles.financeModalBtnRow}>
              <TouchableOpacity
                style={styles.financeModalBtn}
                onPress={() => { setShowFinanceModal(false); goWealth(); }}
              >
                <Text style={styles.financeModalBtnText}>📊 Xem Tài Lộc</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.financeModalBtn}
                onPress={() => { setShowFinanceModal(false); goNguyetVan(); }}
              >
                <Text style={styles.financeModalBtnText}>🌙 Xem Nguyệt Vận</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.financeModalCloseBtn} onPress={() => setShowFinanceModal(false)}>
              <Text style={styles.financeModalCloseBtnText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  gradient: { flex: 1 },
  // WEB: paddingBottom lớn cố định (không dùng SPACING — khoảng đệm riêng cho bàn phím,
  // không phải spacing bố cục) để đủ chỗ cuộn ô "Ghi chú nhanh" lên trên — đã chạy ổn định,
  // giữ nguyên. NATIVE: KeyboardAwareScreen tự thêm/bớt khoảng đệm theo bàn phím, không cần
  // (và không nên) cộng cứng thêm — nếu không, khoảng trống sẽ CÒN LẠI cả khi đóng bàn phím.
  scroll: {
    padding: SPACING.xl, paddingTop: SPACING.xxl, alignItems: 'center',
    paddingBottom: Platform.OS === 'web' ? 300 : SPACING.xl,
  },
  topBar: { position: 'absolute', top: SPACING.sm, right: SPACING.md, zIndex: 50, flexDirection: 'row', alignItems: 'center' },
  topBarGap: { width: 5 },  // chuông nằm sát trái Menu, cách ~5px
  header: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginTop: SPACING.md },
  headerText: { flex: 1, gap: 3, alignItems: 'center' },
  symbolCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: COLORS.card, borderWidth: 2, borderColor: COLORS.gold,
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm,
  },
  symbol: { fontSize: 36, color: COLORS.gold },
  greeting: { fontSize: FONTS.size.xxl, color: COLORS.goldLight, fontWeight: '700', textAlign: 'center' },
  greetingName: { color: COLORS.gold },
  tagline: { fontSize: FONTS.size.md, color: COLORS.textSecondary, lineHeight: 18, textAlign: 'center' },
  subtitle: { fontSize: FONTS.size.md, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.xs, lineHeight: 20 },
  askBar: {
    width: '100%', flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.gold,
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, marginTop: SPACING.lg,
  },
  askIcon: { fontSize: 18 },
  askText: { color: COLORS.textSecondary, fontSize: FONTS.size.md, fontStyle: 'italic', flex: 1 },

  todayCard: {
    width: '100%', flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 14,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.gold, gap: SPACING.md, marginTop: SPACING.md,
  },
  dateCell: {
    alignItems: 'center', justifyContent: 'center', minWidth: 76,
    borderRightWidth: 1, borderRightColor: COLORS.border, paddingRight: SPACING.md,
  },
  dateMonth: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, fontWeight: '700' },
  dateBig: { color: COLORS.gold, fontSize: 40, fontWeight: '900', lineHeight: 46 },
  dateLunar: { color: COLORS.textSecondary, fontSize: FONTS.size.sm },
  dateInfo: { flex: 1, justifyContent: 'center', gap: 4 },
  dateInfoRating: { color: COLORS.textPrimary, fontSize: FONTS.size.md, fontWeight: '700' },
  dateInfoLine: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, lineHeight: 16 },

  previewBox: {
    width: '100%', backgroundColor: COLORS.card, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, gap: 4, marginTop: SPACING.md,
  },
  // Box nửa-nửa cùng hàng (Sự kiện sắp tới / Gợi ý tài chính) — ghi đè width/marginTop của
  // previewBox vì marginTop đã chuyển ra ngoài `eventsFinanceRow`. THIẾU width:'100%' ở đây
  // (khác mọi box khác trong màn — askBar/todayCard/previewBox đều có) khiến hàng này tự co
  // theo nội dung thay vì lấp đầy chiều rộng khả dụng — không thấy rõ trên điện thoại (màn hẹp)
  // nhưng rất rõ trên trình duyệt máy tính màn rộng.
  eventsFinanceRow: { width: '100%', flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  previewBoxHalf: { width: 'auto', flex: 1, marginTop: 0 },
  // Viền sáng hơn để box "Sự kiện sắp tới" nổi bật hơn previewBox thường (border xám mờ).
  eventBoxHighlight: { borderColor: COLORS.gold, borderWidth: 1.5 },
  financeModalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  financeModalBackdropTap: { flex: 1 },
  financeModalSheet: {
    backgroundColor: COLORS.background, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: SPACING.lg, borderTopWidth: 1, borderColor: COLORS.gold, gap: SPACING.sm,
  },
  financeModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  financeModalTitle: { color: COLORS.gold, fontSize: FONTS.size.md, fontWeight: '800' },
  financeModalClose: { color: COLORS.textSecondary, fontSize: FONTS.size.lg, fontWeight: '700', padding: 4 },
  financeModalBody: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, lineHeight: 20, marginTop: 4 },
  financeModalBtnRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs },
  financeModalBtn: {
    flex: 1, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.gold,
    borderRadius: 8, paddingVertical: SPACING.sm, alignItems: 'center',
  },
  financeModalBtnText: { color: COLORS.gold, fontWeight: '800', fontSize: FONTS.size.sm },
  financeModalCloseBtn: { alignItems: 'center', paddingVertical: SPACING.xs },
  financeModalCloseBtnText: { color: COLORS.textMuted, fontWeight: '700', fontSize: FONTS.size.sm },
  previewHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewTitle: { color: COLORS.gold, fontSize: FONTS.size.sm, fontWeight: '800' },
  previewMore: { color: COLORS.textSecondary, fontSize: FONTS.size.xs, fontWeight: '700' },
  previewEmpty: { color: COLORS.textMuted, fontSize: FONTS.size.sm, fontStyle: 'italic' },
  previewLine: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, lineHeight: 18 },
  // Box "Sự kiện sắp tới" rút gọn: icon + tên nổi bật chung 1 dòng, còn bao nhiêu ngày ở dòng
  // dưới — tất cả căn giữa NGANG, và căn giữa DỌC trong phần còn lại của ô (dưới tiêu đề) — giống
  // cách dateBig căn giữa dọc trong box "Ngày hôm nay" khi box bị kéo cao hơn do box cạnh bên.
  eventBoxBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: SPACING.xs },
  eventNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  eventAvatarIcon: { fontSize: FONTS.size.xxl },
  eventName: { color: COLORS.textPrimary, fontSize: FONTS.size.xl, fontWeight: '800', textAlign: 'center' },
  eventDaysLeft: { color: COLORS.gold, fontSize: FONTS.size.lg, fontWeight: '700', textAlign: 'center' },
  eventDismissRow: { flexDirection: 'row', gap: SPACING.md, marginTop: 4 },
  eventDismissBtnText: { color: COLORS.textMuted, fontSize: FONTS.size.xs, fontWeight: '700' },
  // ‹ › duyệt sự kiện trước/sau — nằm sát lề trái/phải, cao hết chiều cao ô, đè lên nội dung
  // (nội dung đã căn giữa nên không bị che, xem browseEvent() để biết logic chọn sự kiện kế tiếp).
  eventNavArrow: { position: 'absolute', top: 0, bottom: 0, width: 26, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  eventNavArrowLeft: { left: 2 },
  eventNavArrowRight: { right: 2 },
  eventNavArrowText: { color: COLORS.gold, fontSize: 22, fontWeight: '900' },
  taskRow: { flexDirection: 'row', alignItems: 'center' },
  taskRowTitleCol: { flex: 2 },
  taskRowDates: { flex: 1, flexDirection: 'row' },
  taskDateHead: { flex: 1, color: COLORS.textMuted, fontSize: FONTS.size.xs, fontWeight: '700', textAlign: 'center' },
  taskDateText: { flex: 1, fontSize: FONTS.size.sm, fontWeight: '700', textAlign: 'center' },
  financeHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  financeLabel: { color: COLORS.textPrimary, fontSize: FONTS.size.sm, fontWeight: '800' },
  financeTier: { fontSize: FONTS.size.sm, fontWeight: '800' },
  noteAddRow: { flexDirection: 'row', gap: SPACING.xs, alignItems: 'center' },
  noteInput: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border,
    color: COLORS.textPrimary, paddingHorizontal: SPACING.sm, paddingVertical: 6, fontSize: FONTS.size.sm,
  },
  noteSaveBtn: { backgroundColor: COLORS.gold, borderRadius: 8, paddingHorizontal: SPACING.md, paddingVertical: 7 },
  noteSaveBtnDisabled: { opacity: 0.4 },
  noteSaveBtnText: { color: '#1a0a00', fontWeight: '800', fontSize: FONTS.size.sm },
  noteRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACING.xs },
  // flexShrink cần đặt tường minh: mặc định Yoga (native) là 0, khác CSS flexbox trên web
  // (mặc định 1) — thiếu dòng này thì trên iOS/Android nội dung ghi chú dài giữ nguyên độ
  // rộng gốc, đẩy giờ (noteTime) tràn ra ngoài box; web không lỗi vì flexbox web tự co giãn.
  noteContent: { flex: 1, flexShrink: 1 },
  noteTime: { color: COLORS.textMuted, fontSize: FONTS.size.sm, flexShrink: 0 },

  gridDivider: {
    width: '100%', height: 1, backgroundColor: COLORS.border,
    marginTop: SPACING.lg, marginBottom: SPACING.md,
  },
  moduleGrid: { flexDirection: 'row', gap: SPACING.sm, width: '100%' },
  moduleTile: {
    flex: 1, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.xs,
    borderWidth: 1, borderColor: COLORS.gold, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 61,
    backgroundColor: COLORS.card,
  },
  moduleIcon: { fontSize: 24 },
  moduleText: { color: COLORS.gold, fontSize: FONTS.size.sm, fontWeight: '700', textAlign: 'center' },
  footer: { alignItems: 'center', gap: 2, marginTop: SPACING.sm },
  version: { fontSize: FONTS.size.md, color: COLORS.textSecondary, textAlign: 'center', fontWeight: '700' },
  copyright: { fontSize: FONTS.size.sm, color: COLORS.textMuted, textAlign: 'center' },
});
