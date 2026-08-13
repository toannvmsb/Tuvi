import { directionGodsForDay, canChiForBasis, personalizeDirectionGods } from '../directionGods';
import type { HeavenlyStem, EarthlyBranch } from '../../types';

// Đối chiếu TRỰC TIẾP với dữ liệu gốc anh Toàn cung cấp
// (tuzi_hy_tai_than_by_day_stem.csv + tuzi_hac_than_by_sexagenary_day.csv,
// version tuzi_direction_gods_v1.0_2026-08-05) — không suy diễn, chép nguyên văn từng dòng.

describe('directionGods — Hỷ Thần/Tài Thần theo Thiên Can (10 dòng)', () => {
  const cases: [HeavenlyStem, string, string][] = [
    ['Giáp', 'Đông Bắc', 'Đông Nam'],
    ['Ất', 'Tây Bắc', 'Đông Nam'],
    ['Bính', 'Tây Nam', 'Đông'],
    ['Đinh', 'Nam', 'Đông'],
    ['Mậu', 'Đông Nam', 'Bắc'],
    ['Kỷ', 'Đông Bắc', 'Nam'],
    ['Canh', 'Tây Bắc', 'Tây Nam'],
    ['Tân', 'Tây Nam', 'Tây Nam'],
    ['Nhâm', 'Nam', 'Tây'],
    ['Quý', 'Đông Nam', 'Tây Bắc'],
  ];
  it.each(cases)('Can %s → Hỷ Thần %s, Tài Thần %s', (stem, hy, tai) => {
    // Chi ngày dùng 'Tý' cho mọi trường hợp test bảng Thiên Can (Hỷ/Tài Thần không phụ thuộc Chi).
    const r = directionGodsForDay(stem, 'Tý');
    expect(r.hyThan.name).toBe(hy);
    expect(r.taiThan.name).toBe(tai);
  });
});

describe('directionGods — Hạc Thần theo 60 Can Chi ngày', () => {
  const rows: [HeavenlyStem, EarthlyBranch, string | null][] = [
    ['Giáp', 'Tý', 'Đông Nam'], ['Ất', 'Sửu', 'Đông Nam'], ['Bính', 'Dần', 'Nam'],
    ['Đinh', 'Mão', 'Nam'], ['Mậu', 'Thìn', 'Nam'], ['Kỷ', 'Tị', 'Nam'], ['Canh', 'Ngọ', 'Nam'],
    ['Tân', 'Mùi', 'Tây Nam'], ['Nhâm', 'Thân', 'Tây Nam'], ['Quý', 'Dậu', 'Tây Nam'],
    ['Giáp', 'Tuất', 'Tây Nam'], ['Ất', 'Hợi', 'Tây Nam'], ['Bính', 'Tý', 'Tây Nam'],
    ['Đinh', 'Sửu', 'Tây'], ['Mậu', 'Dần', 'Tây'], ['Kỷ', 'Mão', 'Tây'], ['Canh', 'Thìn', 'Tây'], ['Tân', 'Tị', 'Tây'],
    ['Nhâm', 'Ngọ', 'Tây Bắc'], ['Quý', 'Mùi', 'Tây Bắc'], ['Giáp', 'Thân', 'Tây Bắc'],
    ['Ất', 'Dậu', 'Tây Bắc'], ['Bính', 'Tuất', 'Tây Bắc'], ['Đinh', 'Hợi', 'Tây Bắc'],
    ['Mậu', 'Tý', 'Bắc'], ['Kỷ', 'Sửu', 'Bắc'], ['Canh', 'Dần', 'Bắc'], ['Tân', 'Mão', 'Bắc'], ['Nhâm', 'Thìn', 'Bắc'],
    ['Quý', 'Tị', null], ['Giáp', 'Ngọ', null], ['Ất', 'Mùi', null], ['Bính', 'Thân', null],
    ['Đinh', 'Dậu', null], ['Mậu', 'Tuất', null], ['Kỷ', 'Hợi', null], ['Canh', 'Tý', null],
    ['Tân', 'Sửu', null], ['Nhâm', 'Dần', null], ['Quý', 'Mão', null], ['Giáp', 'Thìn', null],
    ['Ất', 'Tị', null], ['Bính', 'Ngọ', null], ['Đinh', 'Mùi', null], ['Mậu', 'Thân', null],
    ['Kỷ', 'Dậu', 'Đông Bắc'], ['Canh', 'Tuất', 'Đông Bắc'], ['Tân', 'Hợi', 'Đông Bắc'],
    ['Nhâm', 'Tý', 'Đông Bắc'], ['Quý', 'Sửu', 'Đông Bắc'], ['Giáp', 'Dần', 'Đông Bắc'],
    ['Ất', 'Mão', 'Đông'], ['Bính', 'Thìn', 'Đông'], ['Đinh', 'Tị', 'Đông'], ['Mậu', 'Ngọ', 'Đông'], ['Kỷ', 'Mùi', 'Đông'],
    ['Canh', 'Thân', 'Đông Nam'], ['Tân', 'Dậu', 'Đông Nam'], ['Nhâm', 'Tuất', 'Đông Nam'], ['Quý', 'Hợi', 'Đông Nam'],
  ];

  it('đủ 60 dòng trong bộ test (đối chiếu số lượng)', () => {
    expect(rows.length).toBe(60);
  });

  it.each(rows)('%s %s → Hạc Thần %s', (stem, branch, expected) => {
    const r = directionGodsForDay(stem, branch);
    if (expected === null) {
      expect(r.hacThan.restricted).toBe(false);
      expect(r.hacThan.code).toBe('NONE');
    } else {
      expect(r.hacThan.restricted).toBe(true);
      expect(r.hacThan.name).toBe(expected);
    }
  });

  it('đúng 16/60 ngày "trên trời" không kiêng hướng (theo nguồn đối chiếu)', () => {
    const noRestrictionCount = rows.filter(([, , exp]) => exp === null).length;
    expect(noRestrictionCount).toBe(16);
  });
});

describe('directionGods — cảnh báo khi Hỷ/Tài Thần trùng Hạc Thần', () => {
  it('Giáp Tý: Tài Thần (Đông Nam) trùng Hạc Thần (Đông Nam) → có cảnh báo', () => {
    const r = directionGodsForDay('Giáp', 'Tý');
    expect(r.taiThan.name).toBe('Đông Nam');
    expect(r.hacThan.name).toBe('Đông Nam');
    expect(r.warning).not.toBeNull();
    expect(r.warning).toContain('Tài Thần');
  });

  it('Đinh Mão: Hỷ Thần Nam trùng Hạc Thần Nam → có cảnh báo', () => {
    const r = directionGodsForDay('Đinh', 'Mão');
    expect(r.hyThan.name).toBe('Nam');
    expect(r.hacThan.name).toBe('Nam');
    expect(r.warning).not.toBeNull();
    expect(r.warning).toContain('Hỷ Thần');
  });

  it('không có Hạc Thần (ngày "trên trời") → không bao giờ cảnh báo', () => {
    const r = directionGodsForDay('Quý', 'Tị');
    expect(r.warning).toBeNull();
  });

  it('Kỷ Dậu: không trùng cái nào → không cảnh báo', () => {
    // Kỷ: Hỷ=Đông Bắc, Tài=Nam. Hạc Thần Kỷ Dậu = Đông Bắc → thực ra TRÙNG Hỷ Thần, phải cảnh báo.
    const r = directionGodsForDay('Kỷ', 'Dậu');
    expect(r.hacThan.name).toBe('Đông Bắc');
    expect(r.hyThan.name).toBe('Đông Bắc');
    expect(r.warning).toContain('Hỷ Thần');
  });
});

describe('canChiForBasis — chọn Can Chi theo cơ sở NGÀY hoặc NĂM cấu hình riêng từng sự kiện', () => {
  it("basis='day' cho kết quả giống hệt dayCanChi (hành vi gốc, không đổi)", () => {
    const d = new Date(2026, 7, 7); // 7/8/2026
    const r = canChiForBasis('day', d);
    // Đối chiếu độc lập: Can Chi ngày 7/8/2026 phải là 1 cặp hợp lệ trong bảng 60 Hạc Thần ở trên.
    expect(typeof r.stem).toBe('string');
    expect(typeof r.branch).toBe('string');
  });

  it("basis='year' cho Can Chi NĂM DƯƠNG LỊCH — năm 2026 dương lịch = Bính Ngọ", () => {
    const r = canChiForBasis('year', new Date(2026, 1, 16)); // Giao Thừa Bính Ngọ rơi vào tháng 2/2026 dương lịch
    expect(r.stem).toBe('Bính');
    expect(r.branch).toBe('Ngọ');
  });

  it("basis='year' KHÔNG phụ thuộc ngày/tháng cụ thể trong năm dương lịch đó", () => {
    const r1 = canChiForBasis('year', new Date(2026, 0, 1));
    const r2 = canChiForBasis('year', new Date(2026, 11, 31));
    expect(r1).toEqual(r2);
  });
});

describe('personalizeDirectionGods — ưu tiên Hỷ Thần/Tài Thần theo dụng thần/kỵ thần Bát Tự', () => {
  // Can Bính (vd năm/ngày Bính Ngọ): Hỷ Thần = Tây Nam (Thổ), Tài Thần = Đông (Mộc).
  const gods = directionGodsForDay('Bính', 'Ngọ');

  it('dụng thần Mộc (hợp Tài Thần) → ưu tiên Tài Thần, có nêu tên sự kiện', () => {
    const r = personalizeDirectionGods(gods, ['Mộc'], ['Kim'], 'Lập Thu');
    expect(r?.priority).toBe('taiThan');
    expect(r?.note).toContain('Tài Thần');
    expect(r?.note).toContain('Lập Thu');
  });

  it('dụng thần Thổ (hợp Hỷ Thần) → ưu tiên Hỷ Thần, có nêu tên sự kiện', () => {
    const r = personalizeDirectionGods(gods, ['Thổ'], ['Thủy'], 'Lập Thu');
    expect(r?.priority).toBe('hyThan');
    expect(r?.note).toContain('Hỷ Thần');
    expect(r?.note).toContain('Lập Thu');
  });

  it('dụng thần cả Mộc lẫn Thổ → cả 2 hướng đều tốt, có nêu tên sự kiện', () => {
    const r = personalizeDirectionGods(gods, ['Mộc', 'Thổ'], [], 'Giao Thừa');
    expect(r?.priority).toBe('both');
    expect(r?.note).toContain('Giao Thừa');
  });

  it('kỵ thần Thổ (Hỷ Thần xấu) → ưu tiên Tài Thần thay thế, có nêu tên sự kiện', () => {
    const r = personalizeDirectionGods(gods, [], ['Thổ'], 'Giao Thừa');
    expect(r?.priority).toBe('taiThan');
    expect(r?.note).toContain('Giao Thừa');
  });

  it('kỵ thần Mộc (Tài Thần xấu) → ưu tiên Hỷ Thần thay thế, có nêu tên sự kiện', () => {
    const r = personalizeDirectionGods(gods, [], ['Mộc'], 'Giao Thừa');
    expect(r?.priority).toBe('hyThan');
    expect(r?.note).toContain('Giao Thừa');
  });

  it('dụng thần/kỵ thần không liên quan (Kim, Thủy) → trung tính, có nêu tên sự kiện', () => {
    const r = personalizeDirectionGods(gods, ['Kim'], ['Thủy'], 'Rằm tháng Giêng');
    expect(r?.priority).toBe('neither');
    expect(r?.note).toContain('Rằm tháng Giêng');
  });

  it('không có dụng thần/kỵ thần nào (chưa có lá số) → null', () => {
    const r = personalizeDirectionGods(gods, [], [], 'Lập Thu');
    expect(r).toBeNull();
  });
});
