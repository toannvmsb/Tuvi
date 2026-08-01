import { detectCachCucAt, detectNearCachCucAt, optionalCoverage, CACH_CUC, type PivotStarContext } from '../../data/cachCuc';

function ctx(overrides: Partial<PivotStarContext> = {}): PivotStarContext {
  return { palaceName: 'Quan Lộc', branch: 'Tý', ownStars: [], groupStars: [], flankStars: [], ...overrides };
}

describe('Pattern Engine — near-formation (Phase 3)', () => {
  it('đủ 4 sao trong group (tam hợp) → full match, KHÔNG vào near', () => {
    const c = ctx({ groupStars: ['Tử Vi', 'Thiên Phủ', 'Vũ Khúc', 'Thiên Tướng'] });
    const full = detectCachCucAt(c).map(x => x.name);
    expect(full).toContain('Tử Phủ Vũ Tướng');
    const near = detectNearCachCucAt(c).filter(n => n.cach.name === 'Tử Phủ Vũ Tướng');
    expect(near.length).toBe(0);
  });

  it('thiếu 1 sao (3/4) trong group → near-formation completeness 75%', () => {
    const c = ctx({ groupStars: ['Tử Vi', 'Thiên Phủ', 'Vũ Khúc'] });
    const near = detectNearCachCucAt(c).find(n => n.cach.name === 'Tử Phủ Vũ Tướng');
    expect(near).toBeDefined();
    expect(near!.completeness).toBe(75);
    expect(near!.missingStars).toContain('Thiên Tướng');
  });

  it('dưới ngưỡng 60% (2/4) → không xuất hiện trong near', () => {
    const c = ctx({ groupStars: ['Tử Vi', 'Thiên Phủ'] });
    const near = detectNearCachCucAt(c).filter(n => n.cach.name === 'Tử Phủ Vũ Tướng');
    expect(near.length).toBe(0);
  });

  it('optionalCoverage đếm sao phụ trợ có mặt', () => {
    const tpvt = CACH_CUC.find(c => c.name === 'Tử Phủ Vũ Tướng')!;
    const cov = optionalCoverage(tpvt, ['Tả Phù', 'Hữu Bật']);
    expect(cov.present).toEqual(expect.arrayContaining(['Tả Phù', 'Hữu Bật']));
    expect(cov.ratio).toBeGreaterThan(0);
  });
});

describe('V2.1 regression — sửa lỗi gộp lẫn phạm vi scope (bug do user báo cáo)', () => {
  it('scope=same: sao chỉ ở group (tam hợp) KHÔNG được tính là "đồng cung"', () => {
    // Trước bug fix: Thái Dương + Thái Âm chỉ cần cùng "group" (tam hợp/xung/nhị hợp)
    // là bị báo "Nhật Nguyệt đồng cung" — SAI vì 2 sao không hề ở CHUNG 1 cung.
    const c = ctx({ ownStars: ['Thái Dương'], groupStars: ['Thái Âm'] });
    const names = detectCachCucAt(c).map(x => x.name);
    expect(names).not.toContain('Nhật Nguyệt đồng cung');
  });

  it('scope=same: cả 2 sao CÙNG ở own → mới match "đồng cung" (đúng)', () => {
    const c = ctx({ ownStars: ['Thái Dương', 'Thái Âm'] });
    expect(detectCachCucAt(c).map(x => x.name)).toContain('Nhật Nguyệt đồng cung');
  });

  it('scope=giap: sao phải ở 2 cung GIÁP (flank), không được tính từ group/own', () => {
    // Sao ở group (tam hợp) không được tính cho cách "giáp"
    const cWrongPool = ctx({ palaceName: 'Mệnh', groupStars: ['Thái Dương', 'Thái Âm'] });
    expect(detectCachCucAt(cWrongPool).map(x => x.name)).not.toContain('Nhật Nguyệt giáp Mệnh');

    // Đúng: sao ở flank (2 cung kề)
    const cRight = ctx({ palaceName: 'Mệnh', flankStars: ['Thái Dương', 'Thái Âm'] });
    expect(detectCachCucAt(cRight).map(x => x.name)).toContain('Nhật Nguyệt giáp Mệnh');
  });

  it('pivotPalace: cách "giáp Mệnh" KHÔNG match khi pivot không phải Mệnh', () => {
    const cWrongPalace = ctx({ palaceName: 'Quan Lộc', flankStars: ['Thái Dương', 'Thái Âm'] });
    expect(detectCachCucAt(cWrongPalace).map(x => x.name)).not.toContain('Nhật Nguyệt giáp Mệnh');
  });

  it('scope=giap với pivotStars (Ấn): cần sao neo ở own + 2 sao ở flank', () => {
    // "Tài Ấm giáp Ấn": pivotStars=['Thiên Tướng'] phải có tại own; Thiên Lương+Lộc Tồn ở flank
    const cNoAnchor = ctx({ flankStars: ['Thiên Lương', 'Lộc Tồn'] }); // thiếu Thiên Tướng tại own
    expect(detectCachCucAt(cNoAnchor).map(x => x.name)).not.toContain('Tài Ấm giáp Ấn');

    const cFull = ctx({ ownStars: ['Thiên Tướng'], flankStars: ['Thiên Lương', 'Lộc Tồn'] });
    expect(detectCachCucAt(cFull).map(x => x.name)).toContain('Tài Ấm giáp Ấn');
  });

  it('pivotPalace: cách "X nhập Mệnh" chỉ match khi pivot ĐÚNG là Mệnh (không phải bất kỳ cung nào có sao đó)', () => {
    const cMenh = ctx({ palaceName: 'Mệnh', ownStars: ['Hóa Lộc'] });
    expect(detectCachCucAt(cMenh).map(x => x.name)).toContain('Hóa Lộc nhập Mệnh');

    const cOther = ctx({ palaceName: 'Phúc Đức', ownStars: ['Hóa Lộc'] });
    expect(detectCachCucAt(cOther).map(x => x.name)).not.toContain('Hóa Lộc nhập Mệnh');
  });

  it('pivotPalace: "Hóa Lộc nhập Tài Bạch" chỉ match tại Tài Bạch, không phải Mệnh', () => {
    const cTaiBach = ctx({ palaceName: 'Tài Bạch', ownStars: ['Hóa Lộc'] });
    expect(detectCachCucAt(cTaiBach).map(x => x.name)).toContain('Hóa Lộc nhập Tài Bạch');

    const cMenh = ctx({ palaceName: 'Mệnh', ownStars: ['Hóa Lộc'] });
    expect(detectCachCucAt(cMenh).map(x => x.name)).not.toContain('Hóa Lộc nhập Tài Bạch');
  });

  it('Đế Tọa (Tử Vi tại Tý/Ngọ, scope=same+branches) — sao ở group KHÔNG match, phải đồng cung đúng chi', () => {
    // Trước bug fix: Tử Vi ở group (tam hợp của pivot Tý) cũng bị báo Đế Tọa — SAI.
    const cWrongPool = ctx({ branch: 'Tý', groupStars: ['Tử Vi'] });
    expect(detectCachCucAt(cWrongPool).map(x => x.name)).not.toContain('Đế tọa');

    const cRight = ctx({ branch: 'Tý', ownStars: ['Tử Vi'] });
    expect(detectCachCucAt(cRight).map(x => x.name)).toContain('Đế tọa');

    // Đúng vị trí own nhưng sai chi (không phải Tý/Ngọ) → vẫn không match
    const cWrongBranch = ctx({ branch: 'Sửu', ownStars: ['Tử Vi'] });
    expect(detectCachCucAt(cWrongBranch).map(x => x.name)).not.toContain('Đế tọa');
  });
});
