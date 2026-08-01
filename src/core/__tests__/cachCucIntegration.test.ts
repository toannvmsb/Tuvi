import { detectAllCachCuc, cachCucAtPalace, buildCachCucContext, checkActivation, cachCucActivationBlock } from '../cachCucEngine';
import type { AstrologyResult } from '../../types';
import { star } from './fixtures';

const BRANCHES = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tị', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
// Tam hợp cố định: [Thân,Tý,Thìn] [Dần,Ngọ,Tuất] [Tị,Dậu,Sửu] [Hợi,Mão,Mùi]
const TAM_HOP_OF: Record<string, string[]> = {
  Thân: ['Thân', 'Tý', 'Thìn'], Tý: ['Thân', 'Tý', 'Thìn'], Thìn: ['Thân', 'Tý', 'Thìn'],
  Dần: ['Dần', 'Ngọ', 'Tuất'], Ngọ: ['Dần', 'Ngọ', 'Tuất'], Tuất: ['Dần', 'Ngọ', 'Tuất'],
  Tị: ['Tị', 'Dậu', 'Sửu'], Dậu: ['Tị', 'Dậu', 'Sửu'], Sửu: ['Tị', 'Dậu', 'Sửu'],
  Hợi: ['Hợi', 'Mão', 'Mùi'], Mão: ['Hợi', 'Mão', 'Mùi'], Mùi: ['Hợi', 'Mão', 'Mùi'],
};

/** Dựng đủ 12 cung tối thiểu; gán sao theo `stars` map { branch: tên sao[] }. */
function buildChart(stars: Record<string, string[]>, extra: Record<string, any> = {}): AstrologyResult {
  const palaceNames = [
    'Mệnh', 'Phụ Mẫu', 'Phúc Đức', 'Điền Trạch', 'Quan Lộc', 'Nô Bộc',
    'Thiên Di', 'Tật Ách', 'Tài Bạch', 'Tử Tức', 'Phu Thê', 'Huynh Đệ',
  ];
  const houses = BRANCHES.map((b, i) => ({
    branch: b,
    palaceName: palaceNames[i],
    isManh: palaceNames[i] === 'Mệnh',
    isThan: false,
    stars: (stars[b] ?? []).map(n => star(n, 'chinh', 'miếu')),
    ...(extra[b] ?? {}),
  }));
  return { tuViChart: { houses }, birthInfo: {} } as any;
}

describe('detectAllCachCuc — integration end-to-end (bug user báo cáo)', () => {
  it('Thái Dương + Thái Âm ở 2 cung KHÁC NHAU trong CÙNG tam hợp → KHÔNG báo "Nhật Nguyệt đồng cung"', () => {
    // Thân-Tý-Thìn là 1 nhóm tam hợp. Đặt Thái Dương tại Thân, Thái Âm tại Thìn — cùng
    // tam hợp nhưng KHÁC cung. Trước bug fix, engine sẽ báo nhầm "đồng cung".
    const result = buildChart({ Thân: ['Thái Dương'], Thìn: ['Thái Âm'] });
    const names = detectAllCachCuc(result).map(d => d.cach.name);
    expect(names).not.toContain('Nhật Nguyệt đồng cung');
  });

  it('Thái Dương + Thái Âm CÙNG một cung → báo "Nhật Nguyệt đồng cung" đúng', () => {
    const result = buildChart({ Sửu: ['Thái Dương', 'Thái Âm'] });
    const names = detectAllCachCuc(result).map(d => d.cach.name);
    expect(names).toContain('Nhật Nguyệt đồng cung');
    const found = detectAllCachCuc(result).find(d => d.cach.name === 'Nhật Nguyệt đồng cung')!;
    expect(found.palace).toBe('Phụ Mẫu'); // Sửu = cung Phụ Mẫu trong layout test
  });

  it('Tử Vi tại tam hợp của Tý (nhưng không phải Tý) → KHÔNG báo "Đế tọa"', () => {
    // Tam hợp Tý = Thân-Tý-Thìn. Đặt Tử Vi tại Thân (không phải Tý/Ngọ) → không đủ điều
    // kiện branches ['Tý','Ngọ'] của "Đế tọa" dù nằm trong group của cung Tý.
    const result = buildChart({ Thân: ['Tử Vi'] });
    const names = detectAllCachCuc(result).map(d => d.cach.name);
    expect(names).not.toContain('Đế tọa');
  });

  it('Tử Vi đúng tại Tý → báo "Đế tọa" đúng', () => {
    const result = buildChart({ Tý: ['Tử Vi'] });
    const names = detectAllCachCuc(result).map(d => d.cach.name);
    expect(names).toContain('Đế tọa');
  });

  it('"Sát Phá Tham Liêm" nhận diện qua tam hợp (scope=group hoạt động đúng)', () => {
    // Thất Sát + Phá Quân + Tham Lang + Liêm Trinh rải trong cùng 1 nhóm tam hợp (Thân-Tý-Thìn)
    const result = buildChart({
      Thân: ['Thất Sát'], Tý: ['Phá Quân', 'Tham Lang'], Thìn: ['Liêm Trinh'],
    });
    const names = detectAllCachCuc(result).map(d => d.cach.name);
    expect(names).toContain('Sát Phá Tham Liêm');
  });

  it('Hóa Lộc tại Phúc Đức KHÔNG được báo là "Hóa Lộc nhập Mệnh"', () => {
    const result = buildChart({ Thìn: ['Hóa Lộc'] }); // Thìn = Điền Trạch trong layout test, không phải Mệnh
    const names = detectAllCachCuc(result).map(d => d.cach.name);
    expect(names).not.toContain('Hóa Lộc nhập Mệnh');
  });

  it('Hóa Lộc đúng tại Mệnh → báo "Hóa Lộc nhập Mệnh" đúng', () => {
    const result = buildChart({ Tý: ['Hóa Lộc'] }); // Tý = Mệnh trong layout test
    const names = detectAllCachCuc(result).map(d => d.cach.name);
    expect(names).toContain('Hóa Lộc nhập Mệnh');
  });

  it('Nhật Nguyệt giáp Mệnh: Thái Dương/Thái Âm ở 2 cung KỀ Mệnh → match; ở tam hợp Mệnh → không match', () => {
    // Layout test: Mệnh=Tý(idx0), cung kề = Hợi(idx11) và Sửu(idx1).
    const rightFlank = buildChart({ Hợi: ['Thái Dương'], Sửu: ['Thái Âm'] });
    expect(detectAllCachCuc(rightFlank).map(d => d.cach.name)).toContain('Nhật Nguyệt giáp Mệnh');

    // Tam hợp của Tý là Thân-Tý-Thìn — đặt 2 sao ở Thân+Thìn (tam hợp, KHÔNG phải giáp)
    const wrongGroup = buildChart({ Thân: ['Thái Dương'], Thìn: ['Thái Âm'] });
    expect(detectAllCachCuc(wrongGroup).map(d => d.cach.name)).not.toContain('Nhật Nguyệt giáp Mệnh');
  });
});

describe('cachCucAtPalace — cách cục theo TỪNG cung (task: luận cùng sao của cung)', () => {
  it('trả về cách cục hình thành TẠI đúng cung được hỏi, không lẫn cung khác', () => {
    const result = buildChart({ Tý: ['Tử Vi'] }); // Tý = Mệnh trong layout test
    const atMenh = cachCucAtPalace(result, 'Mệnh').map(d => d.cach.name);
    expect(atMenh).toContain('Đế tọa');

    const atTaiBach = cachCucAtPalace(result, 'Tài Bạch').map(d => d.cach.name);
    expect(atTaiBach).not.toContain('Đế tọa');
  });

  it('cung không có cách cục nào → trả mảng rỗng', () => {
    const result = buildChart({});
    expect(cachCucAtPalace(result, 'Huynh Đệ')).toEqual([]);
  });
});

describe('buildCachCucContext — ưu tiên CÁCH CỤC CHÍNH từ 4 cung trọng yếu (task 2)', () => {
  it('cách tại Mệnh/Tài/Quan/Di được xếp vào mục "CÁCH CỤC CHÍNH" và KHÔNG lặp lại ở mục khác', () => {
    // Tử Vi tại Tý (Mệnh) → "Đế tọa" (category 'phu', không đạt baseScore≥80 nên
    // vốn dĩ chỉ là "cách phụ" theo ngưỡng điểm cũ) — nhưng vì ở cung Mệnh nên
    // PHẢI được đưa vào mục CÁCH CỤC CHÍNH, không rơi vào "CÁCH PHỤ" nữa.
    const result = buildChart({ Tý: ['Tử Vi'] });
    const ctx = buildCachCucContext(result);
    expect(ctx).toContain('CÁCH CỤC CHÍNH');
    expect(ctx).toContain('Đế tọa');
    // Không được xuất hiện ở mục "CÁCH PHỤ" nữa (đã bỏ trùng)
    const phuSection = ctx.split('CÁCH PHỤ')[1] ?? '';
    expect(phuSection).not.toContain('Đế tọa');
  });

  it('không có cách cục nào ở toàn lá số → không hiện mục CÁCH CỤC CHÍNH', () => {
    const result = buildChart({});
    const ctx = buildCachCucContext(result);
    expect(ctx).not.toContain('CÁCH CỤC CHÍNH');
  });
});

describe('checkActivation / cachCucActivationBlock — ngôn ngữ thân thiện (task 3)', () => {
  it('reason KHÔNG còn chứa cụm kỹ thuật "vào group cách"', () => {
    const result = buildChart({ Tý: ['Hóa Lộc'] });
    const detected = detectAllCachCuc(result);
    const menh = detected.find(d => d.cach.name === 'Hóa Lộc nhập Mệnh')!;
    const pivotHouse = result.tuViChart.houses.find(h => h.branch === 'Tý')!;
    const act = checkActivation(menh, pivotHouse, 'Tý', ['Hóa Lộc'], 'Đại Vận Test');
    expect(act.reason).not.toContain('vào group cách');
  });

  it('cachCucActivationBlock KHÔNG còn ghi chú "không nổi bật — đã ẩn"', () => {
    const result = buildChart({ Tý: ['Hóa Lộc'] });
    const block = cachCucActivationBlock(result, 'Tý', 'Đại Vận Test');
    expect(block).not.toContain('không nổi bật');
    expect(block).not.toContain('đã ẩn');
  });
});
