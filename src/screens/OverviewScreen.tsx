/**
 * TỔNG QUAN — màn chính của thiết kế mới (thay HomeScreen cũ làm tab đầu).
 * Thứ tự: lời chào · Vận khí hôm nay + Sự kiện sắp tới · Lịch tháng tô màu ngày tốt/xấu ·
 * Vận khí hiện tại (Đại/Tiểu/Nguyệt vận) · thanh "Hỏi Tuzi" · lối tắt.
 *
 * Giữ NGUYÊN các tác vụ nền của Home cũ (đồng bộ thông báo sự kiện, nhắc hạn việc, broadcasts) —
 * xem `loadData`. Chưa gắn lá số → chế độ cơ bản (điểm ngày theo Can-Chi chung) và mọi ô
 * cá nhân hóa mở modal "Cá nhân hóa trải nghiệm" như trước.
 * Thời tiết (WeatherKit) chưa có nguồn dữ liệu nên CHƯA hiển thị — thêm khi có Edge Function.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { COLORS, FONTS, TIER_COLORS, CAL_TONE, SURFACE, fadeColor } from '../constants/theme';
import { Screen, Card, Chip, Display, Eyebrow, SectionTitle, ScoreRing, ProgressBar, Body } from '../ui';
import Icon, { type IconName } from '../ui/Icon';
import NotificationBell from '../components/NotificationBell';
import { useAuth } from '../context/AuthContext';
import { wallet } from '../constants/premium';
import type { AstrologyResult } from '../types';
import { getMyChartId } from '../lib/myChart';
import { listCharts, getCachedCharts, rowToResult, type SavedChartRow } from '../lib/charts';
import { scoreNhatVan } from '../core/nhatVan';
import { genericDayScore, buildGenericMonthHeatmapForMonth } from '../core/genericMonthHeatmap';
import { buildMonthHeatmap, toneOf, TONE_LABEL, type DayTone } from '../core/dailyPeriodService';
import { solarToLunar } from '../core/lunarCalendar';
import { currentAgeOf } from '../core/ageUtil';
import { buildTodaySummary, dailyMessage } from '../core/todaySummary';
import { syncEventNotifications, planScheduledReminders } from '../lib/notificationEvents';
import { syncBroadcasts } from '../lib/broadcasts';
import { openAiChat } from '../lib/aiChatBus';
import { listLifeTasks, compareLifeTasks, type LifeTask } from '../lib/lifeTasks';
import { fetchEventPackages, listMyUserEvents } from '../lib/lifeEvents';
import { pickUpcomingEvent, type ResolvedEvent, type EventPackage, type UserEvent } from '../core/lifeEventEngine';
import { buildIsDismissed } from '../lib/eventDismiss';
import { buildNotifyPrefLookup } from '../lib/eventNotifyPrefs';
import { promptPersonalize } from '../lib/personalizePrompt';
import { WeatherMini } from '../components/WeatherCards';
import { scoreNguyetVan } from '../core/nguyetVanScore';
import WeatherBackdrop from '../components/WeatherBackdrop';
import { formatXu } from '../lib/format';
import AnimatedAvatar from '../components/AnimatedAvatar';
import { getSelectedAvatarId } from '../lib/avatarPrefs';
import HomeNotesBox from '../components/HomeNotesBox';

const WEEKDAY_LONG = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const TONE_TIER: Record<DayTone, string> = {
  'tốt': TIER_COLORS.great, 'khá': TIER_COLORS.good, 'trung bình': TIER_COLORS.normal,
  'thận trọng': TIER_COLORS.caution, 'xấu': TIER_COLORS.bad,
};
/** Lời chào theo buổi: sáng <11h, trưa 11–13h, chiều 13–18h, tối còn lại. */
function greetingOf(d: Date): string {
  const h = d.getHours();
  return `Chào buổi ${h >= 4 && h < 11 ? 'sáng' : h >= 11 && h < 13 ? 'trưa' : h >= 13 && h < 18 ? 'chiều' : 'tối'}`;
}

const LEGEND: { c: (typeof CAL_TONE)['tốt']; t: string }[] = (['tốt', 'khá', 'trung bình', 'thận trọng', 'xấu'] as DayTone[]).map(k => ({ c: CAL_TONE[k], t: TONE_LABEL[k] }));

function ratingLabel(score: number): { label: string; color: string } {
  const tone = toneOf(score);
  return { label: TONE_LABEL[tone], color: CAL_TONE[tone].dot };
}

export default function OverviewScreen() {
  const navigation = useNavigation<any>();
  const { online, user } = useAuth();
  const displayName = user?.displayName || (online ? '' : wallet.userName) || 'bạn';
  const [myResult, setMyResult] = useState<AstrologyResult | null>(null);
  const [event, setEvent] = useState<ResolvedEvent | null>(null);
  const [avatarId, setAvatarId] = useState<string | null>(null);
  const [summaryGood, setSummaryGood] = useState('');
  const pkgRef = useRef<EventPackage[]>([]);
  const userEvRef = useRef<UserEvent[]>([]);

  const now = new Date();
  const lunarNow = solarToLunar(now.getDate(), now.getMonth() + 1, now.getFullYear());
  const y = now.getFullYear();
  const m = now.getMonth() + 1;

  const loadData = useCallback(async () => {
    let result: AstrologyResult | null = null;
    let charts: SavedChartRow[] = getCachedCharts() ?? [];
    try {
      if (online) charts = await listCharts();
      const id = await getMyChartId();
      const row = id ? charts.find(r => r.id === id) : undefined;
      if (row) result = rowToResult(row);
    } catch { /* dùng chế độ cơ bản */ }
    setMyResult(result);
    setSummaryGood(buildTodaySummary(result, new Date()).good[0] ?? '');

    // Việc & Mục tiêu — chỉ để phục vụ nhắc hạn (không còn hiển thị ở Tổng quan).
    let openTasks: LifeTask[] = [];
    if (online) {
      try {
        const [tasks, goals] = await Promise.all([listLifeTasks('task'), listLifeTasks('goal')]);
        openTasks = [...tasks, ...goals].filter(t => t.status === 'open').sort(compareLifeTasks);
      } catch { /* bỏ qua */ }
    }

    try {
      const [packages, userEvents] = await Promise.all([
        fetchEventPackages(),
        online ? listMyUserEvents().catch(() => []) : Promise.resolve([]),
      ]);
      pkgRef.current = packages;
      userEvRef.current = userEvents;
      const isDismissed = await buildIsDismissed();
      setEvent(pickUpcomingEvent(packages, userEvents, new Date(), isDismissed));
    } catch { setEvent(null); }

    (async () => {
      const prefs = await buildNotifyPrefLookup();
      void syncEventNotifications(result, charts, openTasks, pkgRef.current, userEvRef.current, prefs);
      void planScheduledReminders(result, charts, openTasks, pkgRef.current, userEvRef.current, prefs);
    })();
    void syncBroadcasts();
  }, [online]);

  useFocusEffect(useCallback(() => { void loadData(); getSelectedAvatarId().then(setAvatarId); }, [loadData]));

  const todayScore = useMemo(
    () => (myResult ? scoreNhatVan(myResult, now).score100 : genericDayScore(now).score),
    [myResult, now.getDate()],
  );
  const hm = useMemo(
    () => (myResult ? buildMonthHeatmap(myResult, y, m) : buildGenericMonthHeatmapForMonth(y, m)),
    [myResult, y, m],
  );
  const rating = ratingLabel(todayScore);
  const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7; // T2 = cột đầu

  // Ngày mờ tháng trước/sau — cùng cách tô màu theo lá số (hoặc công thức chung) như tháng đang xem.
  const trail = (7 - ((lead + hm.days.length) % 7)) % 7;
  const { outLead, outTrail } = useMemo(() => {
    const build = (yy: number, mm: number) => (myResult ? buildMonthHeatmap(myResult, yy, mm) : buildGenericMonthHeatmapForMonth(yy, mm));
    const pm = m === 1 ? 12 : m - 1, py = m === 1 ? y - 1 : y;
    const nm = m === 12 ? 1 : m + 1, ny = m === 12 ? y + 1 : y;
    const pick = (yy: number, mm: number, days: number[]) => {
      let map: Record<number, DayTone> = {};
      try { for (const d of build(yy, mm).days) map[d.day] = d.tone; } catch { map = {}; }
      return days.map(day => ({ day, month: mm, year: yy, tone: map[day] }));
    };
    const pTotal = new Date(py, pm, 0).getDate();
    return {
      outLead: pick(py, pm, Array.from({ length: lead }, (_, i) => pTotal - lead + 1 + i)),
      outTrail: pick(ny, nm, Array.from({ length: trail }, (_, i) => i + 1)),
    };
  }, [myResult, y, m, lead, trail]);

  const renderOut = (o: { day: number; month: number; year: number; tone?: DayTone }, pfx: string) => {
    const c = o.tone ? CAL_TONE[o.tone] : undefined;
    const l = solarToLunar(o.day, o.month, o.year);
    return (
      <View key={`${pfx}${o.day}`} style={s.cellWrap}>
        <Pressable
          onPress={openDay}
          style={[s.cell, c && { backgroundColor: fadeColor(c.bg, 0.25), borderColor: fadeColor(c.border, 0.25) }]}
          accessibilityRole="button" accessibilityLabel={`Ngày ${o.day}/${o.month}`}
        >
          <Text style={[s.cellNum, { opacity: 0.4 }]}>{o.day}</Text>
          <Text style={[s.cellLunar, { opacity: 0.4 }]}>{l.day === 1 ? `1/${l.month}` : l.day}</Text>
        </Pressable>
      </View>
    );
  };

  const goPersonal = (go: () => void) => (myResult ? go() : promptPersonalize(navigation, go));
  const openDay = () => goPersonal(() => navigation.navigate('DayView'));

  // Vận khí hiện tại (chỉ khi có lá số)
  const age = myResult ? currentAgeOf(myResult) : 0;
  const dv = myResult?.daiVans.find(d => age >= d.startAge && age <= d.endAge);
  const dvPalace = dv ? myResult?.tuViChart.houses.find(h => h.daiVanStartAge === dv.startAge)?.palaceName : undefined;
  const tv = myResult?.tieuVans.find(t => t.year === y);
  // Cung mà tiểu hạn năm nay rơi vào (theo địa chi cung tiểu hạn).
  const tvPalace = tv ? myResult?.tuViChart.houses.find(h => h.branch === tv.branch)?.palaceName : undefined;
  // Cung lưu nguyệt của THÁNG ÂM hiện tại (cùng cách màn Nguyệt vận tính).
  const nvPalace = myResult ? scoreNguyetVan(myResult, age, lunarNow.month)?.palaceName : undefined;

  const eventDays = event
    ? (event.daysUntil === 0 ? 'Hôm nay' : event.daysUntil < 0 ? `${-event.daysUntil} ngày trước` : `Còn ${event.daysUntil} ngày`)
    : '';

  return (
    <Screen tabBarSpace topOverlay={<WeatherBackdrop />}>
      {/* Thanh trên: hồ sơ · xu · chuông */}
      <View style={s.topRow}>
        <Pressable
          style={s.profilePill}
          onPress={() => navigation.navigate('Account')}
          accessibilityRole="button" accessibilityLabel="Thông tin tài khoản"
        >
          <View style={s.avatar}><AnimatedAvatar avatarId={avatarId} size={38} animated={false} /></View>
          <View>
            <Text style={s.pillName}>{displayName}</Text>
            <Text style={s.pillSub}>{myResult ? 'Hồ sơ của tôi' : 'Chế độ cơ bản'}</Text>
          </View>
          <Icon name="chev" size={14} color={COLORS.textMuted} />
        </Pressable>
        <View style={s.topRight}>
          <Pressable style={s.xuChip} onPress={() => navigation.navigate('Wallet')} accessibilityRole="button" accessibilityLabel="Ví xu">
            <Icon name="coin" size={18} color="#F5E0AE" />
            <Text style={s.xuTxt}>{formatXu(wallet.balance)} xu</Text>
          </Pressable>
          <NotificationBell />
        </View>
      </View>

      {/* Lời chào */}
      <View style={{ gap: 6 }}>
        <Eyebrow style={{ fontSize: 14, letterSpacing: 1.2 }}>{`${WEEKDAY_LONG[now.getDay()]} - ${now.getDate()}/${m}/${y} (${lunarNow.day}/${lunarNow.month}${lunarNow.isLeapMonth ? ' nhuận' : ''} âm lịch)`}</Eyebrow>
        <Display size={30}>{greetingOf(now)}</Display>
        <Text style={s.dailyMsg}>{dailyMessage(todayScore, now)}</Text>
      </View>

      {/* Vận khí hôm nay + Thời tiết hôm nay */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card hero style={s.miniCard}>
          <Pressable onPress={openDay} style={{ flex: 1, justifyContent: 'space-between', gap: 10 }} accessibilityRole="button">
            <Eyebrow style={s.miniEyebrow}>Vận khí hôm nay</Eyebrow>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <ScoreRing score={todayScore} size={52} stroke={5} numberSize={22} color={rating.color} />
              <Text style={[s.miniHead, { color: rating.color, flexShrink: 1 }]}>{rating.label}</Text>
            </View>
            <Body size={11.5} style={{ lineHeight: 16 }}>{summaryGood || 'Nhấn để xem chi tiết theo ngày'}</Body>
          </Pressable>
        </Card>
        <WeatherMini onPress={openDay} />
      </View>

      {/* Thanh Hỏi Tuzi */}
      <Pressable style={s.askBar} onPress={openAiChat} accessibilityRole="button" accessibilityLabel="Hỏi Tuzi">
        <View style={s.askIcon}><Icon name="spark" size={17} color="#1E1230" strokeWidth={2} /></View>
        <Text style={s.askTxt}>Hỏi Tuzi về lá số của bạn…</Text>
        <Icon name="chev" size={18} color={COLORS.gold} />
      </Pressable>

      {/* Lịch tháng */}
      <Card style={{ gap: 12, paddingHorizontal: 14 }}>
        <View style={s.calHead}>
          <View style={{ flex: 1 }}>
            <Display size={26}>Lịch tháng {m} · {y}</Display>
            <Pressable style={s.calSubRow} onPress={() => navigation.navigate('MyCharts')} accessibilityRole="button" accessibilityLabel="Đổi lá số đang gắn">
              <Text style={s.calSub} numberOfLines={1}>{myResult ? `Màu theo lá số của ${myResult.birthInfo.name || 'bạn'}` : 'Màu theo vận khí chung của từng ngày'}</Text>
              <Icon name="swap" size={16} color={COLORS.gold} strokeWidth={2} />
            </Pressable>
          </View>
          <Pressable style={s.roundBtn} onPress={openDay} accessibilityRole="button" accessibilityLabel="Mở xem ngày">
            <Icon name="chev" size={18} color="#F5E0AE" />
          </Pressable>
        </View>
        <View style={[s.legend, { marginTop: -4 }]}>
        {LEGEND.map(l => (
          <View key={l.t} style={s.legendItem}>
            <View style={[s.legendSw, { backgroundColor: l.c.bg, borderWidth: 1, borderColor: l.c.border }]} />
            <Text style={s.legendTxt}>{l.t === 'Cần thận trọng' ? 'Thận trọng' : l.t}</Text>
          </View>
        ))}
        </View>
        <View style={s.weekRow}>
          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d, i) => (
            <Text key={d} style={[s.weekTxt, i === 6 && { color: '#F3B0A5' }]}>{d}</Text>
          ))}
        </View>
        <View style={s.grid}>
          {/* Ngày MỜ của tháng trước (lấp đầu tuần) */}
          {outLead.map(o => renderOut(o, 'p'))}
          {hm.days.map(d => {
            const c = CAL_TONE[d.tone];
            const isToday = d.day === now.getDate();
            const isEvent = !!event && event.occursOn.getFullYear() === y && event.occursOn.getMonth() + 1 === m && event.occursOn.getDate() === d.day;
            const l = solarToLunar(d.day, m, y);
            return (
              <View key={d.day} style={s.cellWrap}>
                <Pressable
                  onPress={openDay}
                  style={[s.cell, { backgroundColor: c.bg, borderColor: c.border }, isToday && s.cellToday]}
                  accessibilityRole="button" accessibilityLabel={`Ngày ${d.day}, ${d.rating}`}
                >
                  {isEvent && <View style={s.eventDot} />}
                  <Text style={[s.cellNum, isToday && { color: '#FFFFFF' }]}>{d.day}</Text>
                  <Text style={[s.cellLunar, (l.day === 1 || l.day === 15) && { color: COLORS.gold, fontFamily: FONTS.bodyBold }]}>
                    {l.day === 1 ? `1/${l.month}` : l.day}
                  </Text>
                </Pressable>
              </View>
            );
          })}
          {/* Ngày MỜ của tháng sau (lấp cuối tuần) */}
          {outTrail.map(o => renderOut(o, 'n'))}
        </View>
        {event && (
          <Pressable
            style={s.specialStrip}
            onPress={() => navigation.navigate('EventDetail', { event, result: myResult ?? undefined })}
            accessibilityRole="button" accessibilityLabel="Sự kiện sắp tới"
          >
            <View style={s.specialIcon}><Text style={{ fontSize: 16 }}>{event.icon}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.specialTitle} numberOfLines={1}>{event.displayName}</Text>
              <Text style={s.specialSub}>{eventDays}</Text>
            </View>
            <Icon name="chev" size={18} color={COLORS.gold} />
          </Pressable>
        )}
      </Card>

      {/* Vận khí hiện tại */}
      <Card style={{ gap: 14 }}>
        <SectionTitle
          title="Vận khí hiện tại"
          right={myResult ? (
            <Pressable style={s.roundBtn} onPress={() => navigation.navigate('VanHub')} accessibilityRole="button" accessibilityLabel="Xem toàn bộ vận hạn">
              <Icon name="chev" size={18} color="#F5E0AE" />
            </Pressable>
          ) : undefined}
        />
        {myResult ? (
          <>
            {/* Đại vận · Tiểu vận · Nguyệt vận: 3 nút ngang, mỗi nút 3 dòng (tên vận · mốc thời gian · cung) */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {([
                { key: 'DaiVan', label: 'Đại vận', time: dv ? `${dv.startAge}–${dv.endAge} tuổi` : '—', palace: dvPalace, color: COLORS.gold },
                { key: 'TieuVan', label: 'Tiểu vận', time: String(y), palace: tvPalace, color: COLORS.purple },
                { key: 'NguyetVan', label: 'Nguyệt vận', time: `Tháng ${lunarNow.month} âm`, palace: nvPalace, color: COLORS.green },
              ] as const).map(b => (
                <Pressable
                  key={b.key}
                  style={[s.vanBtn, { backgroundColor: b.color + '17', borderColor: b.color + '4D' }]}
                  onPress={() => navigation.navigate('MainTabs', { result: myResult, screen: b.key, params: { result: myResult } })}
                  accessibilityRole="button" accessibilityLabel={`${b.label} ${b.time}${b.palace ? `, cung ${b.palace}` : ''}`}
                >
                  <Text style={[s.vanLabel, { color: b.color }]} numberOfLines={1}>{b.label}</Text>
                  <Text style={s.vanTime} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{b.time}</Text>
                  <Text style={s.vanPalace} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{b.palace ? `Cung ${b.palace}` : 'Xem chi tiết'}</Text>
                </Pressable>
              ))}
            </View>
            <View style={s.hr} />
            {/* Nghiệm quá khứ (2/5) · Vận hạn diễn ra trong năm (1/5) · Luận tương lai (2/5) */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                style={[s.lifeBtn, { flex: 2, backgroundColor: COLORS.purple + '17', borderColor: COLORS.purple + '4D' }]}
                onPress={() => navigation.navigate('PastReview', { result: myResult })}
                accessibilityRole="button" accessibilityLabel="Nghiệm quá khứ"
              >
                <Text style={s.lifeTxt} numberOfLines={2}>Nghiệm quá khứ</Text>
              </Pressable>
              <Pressable
                style={[s.lifeBtn, { flex: 1, backgroundColor: COLORS.gold + '26', borderColor: COLORS.gold + '99' }]}
                onPress={() => navigation.navigate('AnnualEvents', { result: myResult, year: y })}
                accessibilityRole="button" accessibilityLabel={`Vận hạn diễn ra trong năm ${y}`}
              >
                <Text style={s.lifeYear}>{y}</Text>
              </Pressable>
              <Pressable
                style={[s.lifeBtn, { flex: 2, backgroundColor: COLORS.green + '17', borderColor: COLORS.green + '4D' }]}
                onPress={() => navigation.navigate('FutureReview', { result: myResult })}
                accessibilityRole="button" accessibilityLabel="Luận tương lai"
              >
                <Text style={s.lifeTxt} numberOfLines={2}>Luận tương lai</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Body>Thêm hồ sơ để xem Đại vận, Tiểu vận và Nguyệt vận dành riêng cho bạn.</Body>
            <Pressable style={s.linkRow} onPress={() => promptPersonalize(navigation)} accessibilityRole="button">
              <Text style={s.linkTxt}>Cá nhân hóa trải nghiệm</Text>
              <Icon name="arrow" size={18} color="#F5E0AE" />
            </Pressable>
          </>
        )}
      </Card>

      {/* Ghi chú: 1 ghi chú gần nhất + nhập nhanh */}
      <HomeNotesBox />

      {/* Lối tắt: hàng 1 = 3 nút chính (to, nổi bật) · hàng 2 = 4 nút */}
      <View style={{ gap: 12 }}>
        <Display size={24}>Lối tắt</Display>
        {[
          [
            { icon: 'user', label: 'Lá số của tôi', color: COLORS.gold, go: () => (myResult ? navigation.navigate('MainTabs', { result: myResult, screen: 'TuViChart', params: { result: myResult } }) : promptPersonalize(navigation)) },
            { icon: 'chart', label: 'Lập lá số mới', color: COLORS.green, go: () => navigation.navigate('Input') },
            { icon: 'doc', label: 'Lá số đã lưu', color: COLORS.blue, go: () => navigation.navigate('MyCharts') },
          ],
          [
            { icon: 'event', label: 'Xem ngày tốt', color: COLORS.gold, go: () => navigation.navigate('DayPicker', { result: myResult ?? undefined }) },
            { icon: 'coin', label: 'Tài lộc', color: COLORS.green, go: () => (myResult ? navigation.navigate('WealthChart', { result: myResult }) : promptPersonalize(navigation)) },
            { icon: 'compare', label: 'Tương hợp', color: COLORS.blue, go: () => navigation.navigate('CompareCharts', { preSelectedResult: myResult ?? undefined }) },
            { icon: 'spark', label: 'Ảnh tương hợp', color: COLORS.purple, go: () => navigation.navigate('Portrait', { result: myResult ?? undefined }) },
          ],
        ].map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row', gap: 10 }}>
            {(row as { icon: IconName; label: string; color: string; go: () => void }[]).map(t => (
              <Pressable key={t.label} onPress={t.go} style={[s.shortcut, ri === 0 && s.shortcutMain, { backgroundColor: t.color + (ri === 0 ? '33' : '17'), borderColor: t.color + '4D' }]} accessibilityRole="button">
                {/* Hàng 1: viền như cũ, nền sáng hơn hàng 2 một chút, biểu tượng to + nét đậm. */}
                <View style={[s.shortcutIcon, ri === 0 && s.shortcutIconMain, { backgroundColor: t.color + (ri === 0 ? '55' : '2E') }]}>
                  <Icon name={t.icon} size={ri === 0 ? 32 : 22} color={t.color} strokeWidth={ri === 0 ? 2.8 : 1.8} />
                </View>
                <Text style={[s.shortcutTxt, ri === 0 && s.shortcutTxtMain]} numberOfLines={2}>{t.label}</Text>
              </Pressable>
            ))}
          </View>
        ))}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  profilePill: {
    flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingVertical: 5, paddingLeft: 6, paddingRight: 12,
    borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(226,194,133,0.2)',
  },
  avatar: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontFamily: FONTS.bodyBold, fontSize: 14, color: '#1E1230' },
  pillName: { fontFamily: FONTS.bodySemi, fontSize: 14, color: COLORS.textPrimary },
  pillSub: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.textMuted },
  xuChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 12, borderRadius: 999,
    backgroundColor: 'rgba(226,194,133,0.12)', borderWidth: 1, borderColor: 'rgba(226,194,133,0.32)',
  },
  xuTxt: { fontFamily: FONTS.bodyBold, fontSize: 13, color: '#F5E0AE' },
  dailyMsg: { fontFamily: FONTS.body, fontSize: 16, lineHeight: 21, color: '#E9D9B5', marginTop: 2 },
  lunarLine: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textSecondary },
  miniCard: { flex: 1, minHeight: 136, padding: 14, borderRadius: 20 },
  miniEyebrow: { fontSize: 10.5, letterSpacing: 1.4 },
  miniHead: { fontFamily: FONTS.display, fontSize: 21, lineHeight: 23 },
  eventName: { fontFamily: FONTS.bodySemi, fontSize: 14, lineHeight: 19, color: COLORS.textPrimary },
  eventDays: { fontFamily: FONTS.displayBold, fontSize: 24, color: COLORS.goldLight },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calSubRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, paddingVertical: 2, alignSelf: 'flex-start', maxWidth: '100%' },
  calSub: { fontFamily: FONTS.body, fontSize: 14, color: COLORS.textMuted, flexShrink: 1 },
  roundBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(226,194,133,0.3)' },
  weekRow: { flexDirection: 'row' },
  weekTxt: { flex: 1, textAlign: 'center', fontFamily: FONTS.bodySemi, fontSize: 11, color: COLORS.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cellWrap: { width: `${100 / 7}%`, padding: 2 },
  cell: { height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cellToday: { borderColor: '#FFFFFF', borderWidth: 3 },
  cellNum: { fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.textPrimary, lineHeight: 16 },
  cellLunar: { fontFamily: FONTS.body, fontSize: 9.5, color: COLORS.textSecondary, lineHeight: 12 },
  eventDot: { position: 'absolute', top: 3, right: 4, width: 6, height: 6, borderRadius: 3, backgroundColor: '#ffffff' },
  legend: { flexDirection: 'row', flexWrap: 'nowrap', gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendSw: { width: 14, height: 14, borderRadius: 4 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendTxt: { fontFamily: FONTS.body, fontSize: 10.5, color: COLORS.textSecondary },
  specialStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 42, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 12,
    backgroundColor: 'rgba(226,194,133,0.12)', borderWidth: 1, borderColor: SURFACE.hairlineStrong,
  },
  specialIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(226,194,133,0.25)', alignItems: 'center', justifyContent: 'center' },
  specialTitle: { fontFamily: FONTS.bodySemi, fontSize: 13.5, color: COLORS.textPrimary },
  specialSub: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textSecondary },
  tierText: { fontFamily: FONTS.body, fontSize: 13.5, color: COLORS.textPrimary },
  hr: { height: 1, backgroundColor: 'rgba(226,194,133,0.14)' },
  linkRow: { minHeight: 28, marginTop: -4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  linkTxt: { fontFamily: FONTS.bodySemi, fontSize: 14, color: '#F5E0AE' },
  askBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 46, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 24,
    backgroundColor: 'rgba(226,194,133,0.12)', borderWidth: 1, borderColor: 'rgba(226,194,133,0.4)',
  },
  askIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.gold, alignItems: 'center', justifyContent: 'center' },
  askTxt: { flex: 1, fontFamily: FONTS.body, fontSize: 14.5, color: COLORS.textSecondary },
  shortcut: { flex: 1, minHeight: 96, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 10 },
  shortcutMain: { minHeight: 110, borderWidth: 1.5, gap: 10 },
  shortcutIconMain: { width: 58, height: 58, borderRadius: 18 },
  shortcutIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  vanBtn: { flex: 1, minHeight: 78, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 10, paddingHorizontal: 4 },
  vanLabel: { fontFamily: FONTS.bodyBold, fontSize: 11.5, letterSpacing: 0.4, textTransform: 'uppercase' },
  vanTime: { fontFamily: FONTS.display, fontSize: 19, lineHeight: 22, color: COLORS.textPrimary },
  vanPalace: { fontFamily: FONTS.bodySemi, fontSize: 12, color: COLORS.textSecondary },
  lifeBtn: { minHeight: 52, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 4 },
  lifeTxt: { fontFamily: FONTS.bodySemi, fontSize: 14, lineHeight: 18, color: COLORS.textPrimary, textAlign: 'center' },
  lifeYear: { fontFamily: FONTS.display, fontSize: 20, lineHeight: 24, color: COLORS.goldLight },
  shortcutTxtMain: { fontFamily: FONTS.bodyBold, fontSize: 14, lineHeight: 18 },
  shortcutTxt: { fontFamily: FONTS.bodySemi, fontSize: 12, lineHeight: 15, paddingHorizontal: 2, color: COLORS.textPrimary, textAlign: 'center' },
});
