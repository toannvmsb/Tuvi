import { allSampleResults } from './fixtures';
import { computePastReviewSync, AREAS, type PastMarker, type PastSignal } from '../pastReview';
import { EVENT_PHRASE, describeMarker } from '../pastReview/phrases';
import { explainWhy, viewerTexts, describeSignal } from '../pastReview/explainWhy';
import { lintText, lintAll } from '../pastReview/lint';
import { EVENT_TO_AREA } from '../pastReview/areaMap';

const NOW = new Date(2026, 9, 4);

const sig = (o: Partial<PastSignal>): PastSignal => ({
  ruleId: 'X', system: 'tuvi', area: 'career', layer: 'ngoi', supports: true, tone: 0, weight: 5,
  where: 'Quan Lộc', param: { sao: 'Thiên Mã', maSao: 'THIEN_MA', suKien: 'CAREER_JOB_CHANGE', nguon: 'ANNUAL' },
  label: 'Thiên Mã tại cung Quan Lộc', ...o,
});

describe('pastReview — câu mô tả mốc', () => {
  test('mọi sự kiện được ánh xạ đều có câu mẫu; câu viết ở thể khả năng, xưng "bạn"', () => {
    for (const id of Object.keys(EVENT_TO_AREA)) {
      expect(EVENT_PHRASE[id]).toBeDefined();
    }
    for (const [id, p] of Object.entries(EVENT_PHRASE)) {
      const text = `Có thể bạn đã ${p.text}.`;
      expect(text.startsWith('Có thể bạn đã ')).toBe(true);
      expect(lintText(text, [])).toEqual([]); // không từ cấm, không câu "Không viết", không tín hiệu lạ
      expect(text.split('.').length).toBe(2); // đúng một câu
      expect(id in EVENT_TO_AREA).toBe(true);
    }
  });

  test('sự kiện đau buồn chỉ nói ở mức mảng đời (đánh dấu nhạy cảm) và không gọi tên', () => {
    for (const id of ['CAREER_JOB_LOSS', 'RELATIONSHIP_SEPARATION', 'FINANCE_INVESTMENT_LOSS', 'FINANCE_FINANCIAL_DISPUTE', 'FAMILY_PARENT_EVENT', 'PROPERTY_DISPUTE']) {
      expect(EVENT_PHRASE[id].sensitive).toBe(true);
    }
    const t = (id: string) => EVENT_PHRASE[id].text;
    expect(t('FAMILY_PARENT_EVENT')).toMatch(/nặng về gia đạo/);
    expect(t('RELATIONSHIP_SEPARATION')).toMatch(/thay đổi lớn trong chuyện tình cảm/);
    expect(t('FINANCE_INVESTMENT_LOSS')).toMatch(/hao hụt/);
    expect(t('CAREER_JOB_LOSS')).toMatch(/đứt quãng|rời chỗ/);
  });

  test('describeMarker: có sự kiện → câu của sự kiện; không có → câu dự phòng theo mảng', () => {
    expect(describeMarker({ area: 'career', topEventId: 'CAREER_JOB_CHANGE' }).text).toBe('Có thể bạn đã đổi công việc hoặc chuyển sang nơi làm mới.');
    const fb = describeMarker({ area: 'home', topEventId: null });
    expect(fb.eventId).toBeNull();
    expect(fb.text.startsWith('Có thể bạn đã ')).toBe(true);
    expect(describeMarker({ area: 'family', topEventId: 'FAMILY_PARENT_EVENT' }).sensitive).toBe(true);
  });
});

describe('pastReview — phần Vì sao', () => {
  test('mọi mốc của mọi lá số mẫu: đủ bốn tầng hai cột + đối chiếu, và lời văn qua bộ kiểm tra', () => {
    for (const r of allSampleResults()) {
      const pr = computePastReviewSync(r, { now: NOW });
      for (const m of pr.markers) {
        const ph = describeMarker(m);
        const why = explainWhy(m, { sensitive: ph.sensitive });
        for (const col of [why.viewer.tuvi, why.viewer.bazi]) {
          expect(col.goc.startsWith('Bẩm sinh:')).toBe(true);
          expect(col.nen.startsWith('Giai đoạn 10 năm:')).toBe(true);
          expect(col.ngoi.startsWith('Trong năm:')).toBe(true);
          expect(col.ket.startsWith('Tóm lại:')).toBe(true);
        }
        expect(why.viewer.doiChieu.startsWith('Đối chiếu:')).toBe(true);
        // Lời văn (mô tả mốc + toàn bộ phần Vì sao mức người xem) không vi phạm: không từ cấm, không tín hiệu ngoài danh sách.
        const bad = lintAll([ph.text, ...viewerTexts(why.viewer)], m.signals);
        expect(bad).toEqual([]);
        // Mức người học liệt kê ĐỦ mọi tín hiệu (kể cả ngược chiều), mỗi dòng có mã quy tắc.
        // Cùng một sao/quy tắc phục vụ nhiều sự kiện thì gộp thành một dòng → số dòng ≤ số tín hiệu, nhưng mã quy tắc nào cũng còn mặt.
        expect(why.learner.rows.length).toBeLessThanOrEqual(m.signals.length);
        expect(why.learner.rows.length).toBeGreaterThan(0);
        for (const s of m.signals.filter(x => x.system === 'bazi')) {
          expect(why.learner.rows.some(r => r.ruleId === s.ruleId)).toBe(true);
        }
        for (const row of why.learner.rows) {
          expect(row.ruleId).toBeTruthy();
          expect(lintText(row.detail, m.signals)).toEqual([]);
          // Phần dành cho người học: lời thường, có tiêu đề + các dòng thông tin; KHÔNG lộ mã quy tắc/điểm thô ra chữ hiển thị.
          expect(row.title.length).toBeGreaterThan(3);
          expect(row.facts.length).toBeGreaterThanOrEqual(3);
          const shown = [row.title, row.detail, ...row.facts.map(f => f.label + ' ' + f.value)].join(' | ');
          expect(shown).not.toMatch(/\b(R\d{4}|BZ_[A-Z_]+|[A-Z]{3,}_[A-Z_]+)\b/);   // mã nội bộ
          expect(shown).not.toMatch(/\d+\.\d/);                                      // điểm thô kiểu 7.1
          expect(shown).not.toMatch(/\b(Gốc|Nền|Ngòi)\b/);                            // tên tầng cũ
          expect(lintText(shown, m.signals).filter(i => i.kind !== 'unknown_term')).toEqual([]);
        }
        expect(why.learner.notes.length).toBeGreaterThan(0);
        expect(why.learner.rows.some(x => !x.supports)).toBe(m.signals.some(s => !s.supports));
      }
    }
  });

  test('đối chiếu: nói rõ khi chỉ một hệ báo, không gượng đồng thuận', () => {
    const tvOnly: PastMarker = {
      year: 2015, age: 26, area: 'career', tier: 'vua', agree: false, strength: 75, daiVanIndex: 2, topEventId: 'CAREER_JOB_CHANGE',
      signals: [sig({ layer: 'nen', param: { sao: 'Thiên Lương', maSao: 'THIEN_LUONG' }, where: 'Quan Lộc' }), sig({ layer: 'ngoi' })],
    };
    expect(explainWhy(tvOnly).viewer.doiChieu).toMatch(/chỉ Tử Vi báo/);
    expect(explainWhy(tvOnly).viewer.doiChieu).toMatch(/Bát Tự không thấy tín hiệu/);
    expect(explainWhy(tvOnly).viewer.bazi.reports).toBe(false);
    expect(explainWhy(tvOnly).viewer.bazi.ket).toMatch(/không có dấu hiệu đủ rõ/);

    const bzOnly: PastMarker = {
      ...tvOnly,
      signals: [sig({ system: 'bazi', ruleId: 'BZ_CAR_CLASH_MONTH', label: 'Chi lưu niên xung chi tháng', where: 'lưu niên Kỷ Hợi ↔ trụ tháng (Đinh Tị)', param: { quanHe: 'xung', chiLuuNien: 'Hợi', chiTru: 'Tị', tru: 'Tháng' } })],
    };
    expect(explainWhy(bzOnly).viewer.doiChieu).toMatch(/chỉ Bát Tự báo/);

    const both: PastMarker = { ...tvOnly, agree: true, tier: 'manh', signals: [...tvOnly.signals, ...bzOnly.signals] };
    expect(explainWhy(both).viewer.doiChieu).toMatch(/cả Tử Vi và Bát Tự cùng báo/);

    const none: PastMarker = { ...tvOnly, signals: [] };
    expect(explainWhy(none).viewer.doiChieu).toMatch(/không hệ nào/);
  });

  test('năm nhạy cảm: phần Kết nói "một năm nặng về mảng…", không gọi tên chuyện đau buồn', () => {
    const m: PastMarker = {
      year: 2016, age: 32, area: 'family', tier: 'manh', agree: true, strength: 100, daiVanIndex: 2, topEventId: 'FAMILY_PARENT_EVENT',
      signals: [sig({ area: 'family', layer: 'nen', where: 'Phụ Mẫu', param: { sao: 'Thiên Lương', maSao: 'THIEN_LUONG' } }), sig({ area: 'family', layer: 'ngoi', where: 'Phụ Mẫu', param: { sao: 'Tang Môn', maSao: 'TANG_MON' }, label: 'Tang Môn tại cung Phụ Mẫu' })],
    };
    const why = explainWhy(m, { sensitive: true });
    expect(why.viewer.tuvi.ket).toMatch(/một năm nặng về mảng gia đạo/);
    expect(lintAll(viewerTexts(why.viewer), m.signals)).toEqual([]);
  });

  test('describeSignal chỉ dùng đúng các trường của tín hiệu', () => {
    const s = sig({});
    const d = describeSignal(s);
    expect(d).toContain('Thiên Mã');
    expect(d).toContain('Quan Lộc');
    expect(lintText(d, [s])).toEqual([]);
  });
});

describe('pastReview — bộ kiểm tra lời văn (mẫu vi phạm cố ý)', () => {
  const sigs = [sig({})]; // chỉ có Thiên Mã, cung Quan Lộc

  test('chặn từ cấm', () => {
    for (const bad of [
      'Chủ Mệnh chủ này rất đẹp.', 'Thân chủ gặp hạn.', 'Chắc chắn bạn đã đổi việc.', 'Nhất định có biến động.',
      'Độ chính xác 100% với lá số.', 'Đây là bằng chứng chứng minh lá số đúng.', 'Phép đo này cho thấy…',
      'Có thể bạn bị bệnh nặng.', 'Dễ gặp tai nạn.', 'Ảnh hưởng tuổi thọ.', 'Dễ sảy thai.', 'Có ý định tự tử.',
    ]) {
      const issues = lintText(bad, sigs);
      expect(issues.some(i => i.kind === 'forbidden')).toBe(true);
    }
  });

  test('chặn câu ở cột "Không viết" và quy trách nhiệm cho người dùng', () => {
    for (const bad of [
      'Năm này anh mất cha.', 'Năm này bạn ly hôn.', 'Năm này anh bị lừa.', 'Anh phá sản vào năm đó.',
      'Năm này bạn bị đuổi việc.', 'Do anh nóng vội nên mất cơ hội.', 'Có giai đoạn anh thấy áp lực.',
      'Lỗi của bạn nên mới như vậy.',
    ]) {
      const issues = lintText(bad, sigs);
      expect(issues.some(i => i.kind === 'bad_sentence')).toBe(true);
    }
  });

  test('chặn tín hiệu NGOÀI danh sách: sao, cung, can chi, thập thần, thần sát', () => {
    expect(lintText('Có Tang Môn chiếu vào.', sigs).some(i => i.kind === 'unknown_term' && i.detail === 'Tang Môn')).toBe(true);
    expect(lintText('Hóa Kỵ nhập cung Quan Lộc.', sigs).some(i => i.detail === 'Hóa Kỵ')).toBe(true);
    expect(lintText('Cung Tài Bạch có biến động.', sigs).some(i => i.detail === 'cung Tài Bạch')).toBe(true);
    expect(lintText('Lưu niên Kỷ Hợi xung trụ tháng.', sigs).some(i => i.detail === 'Kỷ Hợi')).toBe(true);
    expect(lintText('Can Giáp gặp chi Tý.', sigs).filter(i => i.kind === 'unknown_term').length).toBeGreaterThanOrEqual(2);
    expect(lintText('Lưu niên gặp Thất Sát.', sigs).some(i => i.detail === 'Thất Sát')).toBe(true);
    expect(lintText('Đào Hoa động.', sigs).some(i => i.detail === 'Đào Hoa')).toBe(true);
  });

  test('cho phép đúng những gì có trong danh sách tín hiệu', () => {
    expect(lintText('Thiên Mã tại cung Quan Lộc kích hoạt di chuyển.', sigs)).toEqual([]);
    const bz = [sig({ system: 'bazi', label: 'Chi lưu niên xung chi tháng', where: 'lưu niên Kỷ Hợi ↔ trụ tháng (Đinh Tị)', param: { thapThan: 'Thất Sát', chiLuuNien: 'Hợi', chiTru: 'Tị' } })];
    expect(lintText('Lưu niên Kỷ Hợi gặp Thất Sát, chi Hợi xung chi Tị.', bz)).toEqual([]);
  });

  test('"đo" chỉ bị chặn khi là từ riêng, không khớp nhầm trong từ khác', () => {
    expect(lintText('Cách đo này không dùng.', sigs).some(i => i.kind === 'forbidden')).toBe(true);
    expect(lintText('Các yếu tố đóng góp vào điểm.', sigs).some(i => i.kind === 'forbidden')).toBe(false);
  });
});

test('mọi mảng đều có câu dự phòng và không lỗi khi mốc thiếu sự kiện', () => {
  for (const area of AREAS) {
    const p = describeMarker({ area, topEventId: 'KHONG_TON_TAI' });
    expect(p.text.startsWith('Có thể bạn đã ')).toBe(true);
    expect(lintText(p.text, [])).toEqual([]);
  }
});

import {
  summarizeFeedback, summaryText, solarRangeLabel, solarRangeOfLunarYear, HINT_BIRTH_HOUR, type FeedbackValue,
} from '../pastReview/feedback';

describe('feedback (phản hồi Nghiệm quá khứ)', () => {
  test('"Không nhớ" không tính vào mẫu số; Đúng + Gần đúng là khớp', () => {
    const s = summarizeFeedback(['dung', 'gan_dung', 'sai', 'khong_nho', 'khong_nho']);
    expect(s).toMatchObject({ answered: 3, hits: 2, nearHits: 1, wrong: 1, unsure: 2 });
    expect(summaryText(s)).toBe('Khớp 2 trên 3 mốc đã phản hồi (trong đó 1 gần đúng).');
  });

  test('chưa phản hồi → câu tóm tắt rỗng, không nhắc giờ sinh', () => {
    const s = summarizeFeedback([]);
    expect(summaryText(s)).toBe('');
    expect(s.showBirthHourHint).toBe(false);
  });

  test('nhắc giờ sinh khi QUÁ NỬA là Sai và đủ ≥3 phản hồi', () => {
    const v = (...xs: FeedbackValue[]) => summarizeFeedback(xs).showBirthHourHint;
    expect(v('sai', 'sai')).toBe(false);                    // chưa đủ 3 phản hồi
    expect(v('sai', 'sai', 'dung')).toBe(true);             // 2/3 > 50%
    expect(v('sai', 'dung', 'gan_dung', 'sai')).toBe(false);// đúng 50% chưa phải "quá nửa"
    expect(v('sai', 'sai', 'sai', 'khong_nho')).toBe(true);
    expect(HINT_BIRTH_HOUR).toMatch(/giờ sinh/);
  });

  test('khoảng dương lịch của năm âm lịch: từ Tết đến trước Tết sau, nhãn tháng/năm', () => {
    const { from, to } = solarRangeOfLunarYear(2019);
    expect(from.getFullYear()).toBe(2019); expect(from.getMonth() + 1).toBe(2);   // Tết 5/2/2019
    expect(to.getFullYear()).toBe(2020); expect(to.getMonth() + 1).toBe(1);       // trước Tết 25/1/2020
    expect(solarRangeLabel(2019)).toBe('2/2019 đến 1/2020');
  });
});
