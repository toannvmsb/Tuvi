import {
  resolveOccurrence, resolveUserEventOccurrence, pickUpcomingEvent,
  resolveEventsOnDate, resolveAllUpcomingEvents, eventStage, upcomingEventNotifyTargets,
  PERSONAL_TIER_IMMINENT, PERSONAL_TIER_UPCOMING,
  type EventPackage, type UserEvent,
} from '../lifeEventEngine';

function pkg(overrides: Partial<EventPackage>): EventPackage {
  return {
    event_key: 'x', category: 'traditional', display_name: 'X', icon: '📅', element: 'Mộc',
    calendar_type: 'solar', date_rule: '01-01', priority: 40, show_before_days: 7, show_after_days: 1,
    meaning: 'm', do_text: null, avoid_text: null, theme_color: null,
    checklist_text: null, faq_text: null, offering_text: null, prayer_text: null,
    xuat_hanh_basis: 'day', tags: [], version: 1, prompt_template: null,
    ...overrides,
  };
}

function userEvent(overrides: Partial<UserEvent>): UserEvent {
  return {
    id: 1, chart_id: null, event_type: 'custom', title: 'T', calendar_type: 'solar',
    event_date: '2026-01-01', repeat_yearly: true, show_before_days: 7, note: null,
    related_people: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('resolveOccurrence', () => {
  it('sự kiện dương lịch còn trong năm nay trả đúng ngày năm nay', () => {
    const now = new Date(2026, 5, 1); // 1/6/2026
    const d = resolveOccurrence(pkg({ calendar_type: 'solar', date_rule: '12-25' }), now);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(11);
    expect(d.getDate()).toBe(25);
  });

  it('sự kiện dương lịch đã qua trong năm nay roll sang năm sau', () => {
    const now = new Date(2026, 5, 1); // 1/6/2026 — Tết Dương lịch (1/1) đã qua lâu
    const d = resolveOccurrence(pkg({ calendar_type: 'solar', date_rule: '01-01' }), now);
    expect(d.getFullYear()).toBe(2027);
  });

  it('sự kiện âm lịch (Tết Nguyên Đán) tính đúng ngày dương quy đổi', () => {
    const now = new Date(2026, 0, 1); // 1/1/2026 dương — trước Tết Bính Ngọ (17/2/2026)
    const d = resolveOccurrence(pkg({ calendar_type: 'lunar', date_rule: '01-01' }), now);
    expect(d.getTime()).toBeGreaterThan(now.getTime());
    // Tết 2026 rơi vào khoảng giữa tháng 2 dương lịch.
    expect(d.getMonth()).toBe(1);
  });

  it('tiết khí (solarterm) trả ngày gần nhất kể cả xuyên năm dương (Tiểu Hàn đầu tháng 1)', () => {
    const now = new Date(2025, 11, 28); // 28/12/2025
    const d = resolveOccurrence(pkg({ calendar_type: 'solarterm', date_rule: '22' /* Tiểu Hàn */ }), now);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(0);
  });
});

describe('resolveUserEventOccurrence', () => {
  it('không lặp lại (repeat_yearly=false) trả đúng ngày gốc dù đã qua', () => {
    const now = new Date(2026, 5, 1);
    const d = resolveUserEventOccurrence(userEvent({ event_date: '2026-01-01', repeat_yearly: false }), now);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(1);
  });

  it('lặp lại hàng năm (dương lịch), roll sang năm sau khi đã qua', () => {
    const now = new Date(2026, 5, 1);
    const d = resolveUserEventOccurrence(userEvent({ event_date: '2020-01-15', calendar_type: 'solar', repeat_yearly: true }), now);
    expect(d.getFullYear()).toBe(2027);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(15);
  });

  it('lặp lại hàng năm (âm lịch) tính lại đúng ngày dương mỗi năm', () => {
    const now = new Date(2026, 0, 1);
    // event_date gốc là ngày dương tương ứng mùng 1 Tết một năm nào đó — lặp âm phải ra đúng dịp Tết năm sau đó.
    const d = resolveUserEventOccurrence(userEvent({ event_date: '2025-01-29', calendar_type: 'lunar', repeat_yearly: true }), now);
    expect(d.getTime()).toBeGreaterThan(now.getTime());
  });
});

describe('pickUpcomingEvent', () => {
  it('trả null khi không có package/sự kiện nào', () => {
    expect(pickUpcomingEvent([], [], new Date(2026, 5, 1))).toBeNull();
  });

  it('không có gì trong cửa sổ hiển thị bình thường → fallback hiện sự kiện gần nhất thay vì trống', () => {
    const now = new Date(2026, 5, 1);
    const far = pkg({ event_key: 'far', calendar_type: 'solar', date_rule: '01-01', show_before_days: 3, show_after_days: 1 });
    const winner = pickUpcomingEvent([far], [], now);
    expect(winner?.key).toBe('far');
    expect(winner!.daysUntil).toBeGreaterThan(far.show_before_days);
  });

  it('sự kiện cá nhân sắp tới thắng lễ Tết/tiết khí theo đúng tier ưu tiên', () => {
    const now = new Date(2026, 5, 1);
    const traditional = pkg({ event_key: 'tet', priority: 80, calendar_type: 'solar', date_rule: '06-02', show_before_days: 7, show_after_days: 1 });
    const personal = userEvent({ id: 9, title: 'Sinh nhật Bo', event_date: '2020-06-02', calendar_type: 'solar', show_before_days: 7 });
    const winner = pickUpcomingEvent([traditional], [personal], now);
    expect(winner?.source).toBe('user');
    expect(winner?.priority).toBe(PERSONAL_TIER_IMMINENT);
  });

  it('cùng tier thì sự kiện gần ngày hơn thắng (tie-break theo daysUntil)', () => {
    const now = new Date(2026, 5, 1);
    const near = pkg({ event_key: 'near', priority: 40, calendar_type: 'solar', date_rule: '06-03' });
    const far = pkg({ event_key: 'far', priority: 40, calendar_type: 'solar', date_rule: '06-06' });
    const winner = pickUpcomingEvent([far, near], [], now);
    expect(winner?.key).toBe('near');
  });

  it('sự kiện cá nhân "còn vài ngày" (không phải hôm nay/mai) chỉ ở tier UPCOMING', () => {
    const now = new Date(2026, 5, 1);
    const personal = userEvent({ id: 5, event_date: '2020-06-05', calendar_type: 'solar', show_before_days: 7 });
    const winner = pickUpcomingEvent([], [personal], now);
    expect(winner?.priority).toBe(PERSONAL_TIER_UPCOMING);
  });
});

describe('resolveEventsOnDate — nhiều sự kiện trùng ngày, cho người dùng chọn ở màn chi tiết', () => {
  it('trả về CẢ 2 package trùng ngày (vd tiết khí trùng lễ), bỏ qua package khác ngày', () => {
    const date = new Date(2026, 5, 2); // 2/6/2026
    const same1 = pkg({ event_key: 'a', calendar_type: 'solar', date_rule: '06-02' });
    const same2 = pkg({ event_key: 'b', calendar_type: 'solar', date_rule: '06-02' });
    const different = pkg({ event_key: 'c', calendar_type: 'solar', date_rule: '06-10' });
    const results = resolveEventsOnDate([same1, same2, different], [], date);
    expect(results.map(r => r.key).sort()).toEqual(['a', 'b']);
  });

  it('gồm cả sự kiện cá nhân trùng ngày với package', () => {
    const date = new Date(2026, 5, 2);
    const p = pkg({ event_key: 'a', calendar_type: 'solar', date_rule: '06-02' });
    const u = userEvent({ id: 7, event_date: '2020-06-02', calendar_type: 'solar' });
    const results = resolveEventsOnDate([p], [u], date);
    expect(results.map(r => r.key).sort()).toEqual(['a', 'user:7']);
  });

  it('chỉ 1 sự kiện trong ngày thì trả về mảng 1 phần tử (không lỗi)', () => {
    const date = new Date(2026, 5, 2);
    const p = pkg({ event_key: 'solo', calendar_type: 'solar', date_rule: '06-02' });
    const results = resolveEventsOnDate([p], [], date);
    expect(results.length).toBe(1);
    expect(results[0].key).toBe('solo');
  });

  it('daysUntil tính theo `now` THẬT, không phải theo `date` truyền vào', () => {
    const date = new Date(2026, 5, 2); // ngày đang xem
    const now = new Date(2026, 4, 28); // hôm nay thực tế — còn 5 ngày nữa tới `date`
    const p = pkg({ event_key: 'a', calendar_type: 'solar', date_rule: '06-02' });
    const results = resolveEventsOnDate([p], [], date, now);
    expect(results[0].daysUntil).toBe(5);
  });

  it('không có sự kiện nào trùng ngày → mảng rỗng', () => {
    const date = new Date(2026, 5, 2);
    const p = pkg({ event_key: 'a', calendar_type: 'solar', date_rule: '06-10' });
    expect(resolveEventsOnDate([p], [], date)).toEqual([]);
  });
});

describe('resolveAllUpcomingEvents — dùng cho nút duyệt ‹ › ở Home, liệt kê hết không giới hạn cửa sổ hiển thị', () => {
  it('trả về TẤT CẢ package dù ngoài show_before_days (không lọc như pickUpcomingEvent)', () => {
    const now = new Date(2026, 0, 1);
    const farAway = pkg({ event_key: 'far', calendar_type: 'solar', date_rule: '11-01', show_before_days: 3, show_after_days: 1 });
    const results = resolveAllUpcomingEvents([farAway], [], now);
    expect(results.map(r => r.key)).toContain('far');
  });

  it('sắp xếp theo thời gian xảy ra TĂNG DẦN', () => {
    const now = new Date(2026, 0, 1);
    const late = pkg({ event_key: 'late', calendar_type: 'solar', date_rule: '11-01' });
    const early = pkg({ event_key: 'early', calendar_type: 'solar', date_rule: '02-01' });
    const results = resolveAllUpcomingEvents([late, early], [], now);
    expect(results.map(r => r.key)).toEqual(['early', 'late']);
  });

  it('gồm cả sự kiện cá nhân', () => {
    const now = new Date(2026, 0, 1);
    const u = userEvent({ id: 3, event_date: '2020-07-15', calendar_type: 'solar' });
    const results = resolveAllUpcomingEvents([], [u], now);
    expect(results.map(r => r.key)).toEqual(['user:3']);
  });
});

describe('eventStage — Timeline theo TUZI_M04 mục 7, tính từ daysUntil', () => {
  it('còn hơn 7 ngày → early (Sắp tới)', () => {
    expect(eventStage(30).key).toBe('early');
    expect(eventStage(8).key).toBe('early');
  });
  it('còn 4-7 ngày → preparation (Chuẩn bị)', () => {
    expect(eventStage(7).key).toBe('preparation');
    expect(eventStage(4).key).toBe('preparation');
  });
  it('còn 1-3 ngày → countdown (Đếm ngược)', () => {
    expect(eventStage(3).key).toBe('countdown');
    expect(eventStage(1).key).toBe('countdown');
  });
  it('đúng 0 ngày → event_day (Hôm nay)', () => {
    expect(eventStage(0).key).toBe('event_day');
  });
  it('đã qua (âm) → follow_up (Sau sự kiện)', () => {
    expect(eventStage(-1).key).toBe('follow_up');
    expect(eventStage(-10).key).toBe('follow_up');
  });
});

describe('pickUpcomingEvent — bỏ qua sự kiện đã "Ẩn"/"Nhắc lại sau" qua isDismissed', () => {
  it('sự kiện bị dismiss thì nhường cho ứng viên tiếp theo', () => {
    const now = new Date(2026, 5, 1);
    const higher = pkg({ event_key: 'higher', priority: 80, calendar_type: 'solar', date_rule: '06-02' });
    const lower = pkg({ event_key: 'lower', priority: 40, calendar_type: 'solar', date_rule: '06-03' });
    const winnerNormal = pickUpcomingEvent([higher, lower], [], now);
    expect(winnerNormal?.key).toBe('higher');
    const winnerDismissed = pickUpcomingEvent([higher, lower], [], now, ev => ev.key === 'higher');
    expect(winnerDismissed?.key).toBe('lower');
  });

  it('tất cả đều bị dismiss → vẫn rơi vào fallback đã lọc, không trả về sự kiện bị ẩn', () => {
    const now = new Date(2026, 5, 1);
    const only = pkg({ event_key: 'only', priority: 20, calendar_type: 'solar', date_rule: '12-25', show_before_days: 1 });
    // Ngoài cửa sổ hiển thị bình thường (còn xa hơn show_before_days) nên rơi vào nhánh fallback.
    const dismissedResult = pickUpcomingEvent([only], [], now, () => true);
    expect(dismissedResult).toBeNull();
  });
});

describe('upcomingEventNotifyTargets — mốc nhắc T-5/T-1/T-0, tôn trọng show_before_days riêng từng sự kiện', () => {
  it('sự kiện show_before_days đủ lớn (30) có đủ cả 3 mốc T-5/T-1/T-0', () => {
    const now = new Date(2026, 5, 1); // 1/6/2026
    const p = pkg({ event_key: 'tet', calendar_type: 'solar', date_rule: '06-10', show_before_days: 30 });
    const targets = upcomingEventNotifyTargets([p], [], now);
    const milestones = targets.filter(t => t.ev.key === 'tet').map(t => t.milestone).sort();
    expect(milestones).toEqual([0, 1, 5]);
    const t5 = targets.find(t => t.ev.key === 'tet' && t.milestone === 5)!;
    expect(t5.notifyAt.getDate()).toBe(5); // 10/6 - 5 ngày = 5/6
  });

  it('tiết khí show_before_days=3 → CHỈ có mốc T-1 và T-0, KHÔNG có T-5', () => {
    const now = new Date(2026, 5, 1);
    const p = pkg({ event_key: 'lap_thu', calendar_type: 'solar', date_rule: '06-10', show_before_days: 3 });
    const targets = upcomingEventNotifyTargets([p], [], now);
    const milestones = targets.filter(t => t.ev.key === 'lap_thu').map(t => t.milestone).sort();
    expect(milestones).toEqual([0, 1]);
  });

  it('sự kiện cá nhân cũng được tính mốc theo show_before_days riêng của nó', () => {
    const now = new Date(2026, 5, 1);
    const u = userEvent({ id: 5, event_date: '2020-06-06', calendar_type: 'solar', show_before_days: 7 });
    const targets = upcomingEventNotifyTargets([], [u], now);
    const milestones = targets.filter(t => t.ev.key === 'user:5').map(t => t.milestone).sort();
    expect(milestones).toEqual([0, 1, 5]);
  });

  it('notifyAt của mốc T-0 trùng đúng ngày diễn ra sự kiện', () => {
    const now = new Date(2026, 5, 1);
    const p = pkg({ event_key: 'x', calendar_type: 'solar', date_rule: '06-10', show_before_days: 30 });
    const targets = upcomingEventNotifyTargets([p], [], now);
    const t0 = targets.find(t => t.milestone === 0)!;
    expect(t0.notifyAt.getDate()).toBe(10);
    expect(t0.notifyAt.getMonth()).toBe(5);
  });

  it('prefs.isEnabled=false → bỏ qua HẲN sự kiện đó, không sinh mốc nào', () => {
    const now = new Date(2026, 5, 1);
    const p = pkg({ event_key: 'muted', calendar_type: 'solar', date_rule: '06-10', show_before_days: 30 });
    const targets = upcomingEventNotifyTargets([p], [], now, { isEnabled: () => false });
    expect(targets.length).toBe(0);
  });

  it('prefs.daysFor tùy chỉnh danh sách mốc riêng cho từng sự kiện (thay DEFAULT_NOTIFY_DAYS)', () => {
    const now = new Date(2026, 5, 1);
    const p = pkg({ event_key: 'custom', calendar_type: 'solar', date_rule: '06-10', show_before_days: 30 });
    const targets = upcomingEventNotifyTargets([p], [], now, { daysFor: () => [10, 3] });
    expect(targets.map(t => t.milestone).sort((a, b) => a - b)).toEqual([3, 10]);
  });

  it('mốc tùy chỉnh vẫn bị chặn nếu vượt quá show_before_days của sự kiện', () => {
    const now = new Date(2026, 5, 1);
    const p = pkg({ event_key: 'x', calendar_type: 'solar', date_rule: '06-10', show_before_days: 5 });
    const targets = upcomingEventNotifyTargets([p], [], now, { daysFor: () => [10, 3] });
    expect(targets.map(t => t.milestone)).toEqual([3]);
  });
});
