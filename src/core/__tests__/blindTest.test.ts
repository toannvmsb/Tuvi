import { parseReply, parseBlindSheet, tallyRows, summarize, type KeyRow, type PersonResult, type Reply } from '../pastReview/blindTest';

describe('Thử mù — đọc phản hồi', () => {
  test('hiểu cách điền tự do, có/không dấu', () => {
    expect(parseReply('Đúng')).toBe('dung');
    expect(parseReply(' dung ')).toBe('dung');
    expect(parseReply('**Đúng**')).toBe('dung');
    expect(parseReply('Gần đúng')).toBe('gan_dung');
    expect(parseReply('gan dung')).toBe('gan_dung');
    expect(parseReply('Sai')).toBe('sai');
    expect(parseReply('Không nhớ')).toBe('khong_nho');
    expect(parseReply('khong nho')).toBe('khong_nho');
    expect(parseReply('')).toBeNull();
    expect(parseReply('chắc là có')).toBeNull();
  });

  test('đọc bảng markdown, lấy ô cuối làm phản hồi', () => {
    const md = ['# x', '| # | Năm | Tuổi | Mảng | Phản hồi |', '|---|---|---|---|---|',
      '| 1 | 2019 Kỷ Hợi | 30 | Tình duyên | Đúng |', '| 2 | 2015 Ất Mùi | 26 | Sự nghiệp |  |', '| 3 | 2011 Tân Mão | 22 | Gia đạo | Gần đúng |'].join('\n');
    const m = parseBlindSheet(md);
    expect(m.get(1)).toBe('dung');
    expect(m.get(2)).toBeNull();
    expect(m.get(3)).toBe('gan_dung');
    expect(m.size).toBe(3);
  });
});

const keys: KeyRow[] = [
  { stt: 1, year: 2019, age: 30, area: 'love', source: 'engine', agree: true },
  { stt: 2, year: 2015, age: 26, area: 'career', source: 'random' },
  { stt: 3, year: 2011, age: 22, area: 'family', source: 'engine', agree: false },
  { stt: 4, year: 2009, age: 20, area: 'family', source: 'random' },
];

describe('Thử mù — đếm và so sánh', () => {
  test('chỉ tính dòng đã trả lời; "Không nhớ" và bỏ trống không vào mẫu số', () => {
    const r = new Map<number, Reply>([[1, 'dung'], [2, 'khong_nho'], [3, 'sai'], [4, null]]);
    expect(tallyRows(keys, r, 'engine')).toEqual({ rows: 2, answered: 2, hits: 1, strictHits: 1, unsure: 0 });
    expect(tallyRows(keys, r, 'random')).toEqual({ rows: 2, answered: 0, hits: 0, strictHits: 0, unsure: 1 });
    expect(tallyRows(keys, r, 'engine', k => !!k.agree).answered).toBe(1);
  });

  const mkPerson = (id: string, eh: number, ea: number, rh: number, ra: number): PersonResult => ({
    id,
    engine: { rows: ea, answered: ea, hits: eh, strictHits: eh, unsure: 0 },
    random: { rows: ra, answered: ra, hits: rh, strictHits: rh, unsure: 0 },
  });

  test('ĐẠT khi đủ người, chênh ≥ ngưỡng và khoảng tin cậy nằm hẳn trên 0', () => {
    const ps = Array.from({ length: 60 }, (_, i) => mkPerson('p' + i, 4 + (i % 2), 5, 2 + (i % 2), 5)); // ~90% vs ~50%
    const s = summarize(ps);
    expect(s.persons).toBe(60);
    expect(s.engine.rate).toBeGreaterThan(s.random.rate);
    expect(s.diffPaired).toBeGreaterThan(0.15);
    expect(s.ci95[0]).toBeGreaterThan(0);
    expect(s.verdict).toBe('DAT');
  });

  test('CHƯA ĐẠT khi không hơn ngẫu nhiên', () => {
    const ps = Array.from({ length: 60 }, (_, i) => mkPerson('p' + i, 2 + (i % 2), 5, 2 + (i % 2), 5));
    const s = summarize(ps);
    expect(Math.abs(s.diffPaired)).toBeLessThan(0.01);
    expect(s.verdict).toBe('CHUA_DAT');
    expect(s.reasons.length).toBeGreaterThan(0);
  });

  test('CHƯA ĐỦ NGƯỜI dù kết quả đẹp; người thiếu một nhóm không được tính', () => {
    const ps = [...Array.from({ length: 10 }, (_, i) => mkPerson('p' + i, 5, 5, 0, 5)), mkPerson('thieu', 5, 5, 0, 0)];
    const s = summarize(ps);
    expect(s.persons).toBe(10);
    expect(s.verdict).toBe('CHUA_DU_NGUOI');
    expect(summarize(ps, { minPersons: 5 }).verdict).toBe('DAT');
  });
});
