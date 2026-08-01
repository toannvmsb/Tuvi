import { computeStrength, resolveConflict, activationState } from '../strengthEngine';
import type { StarEntry } from '../../types';

const S = (name: string, type: StarEntry['type'], brightness?: StarEntry['brightness']): StarEntry =>
  ({ name, type, brightness });

describe('StrengthEngine', () => {
  it('chính tinh miếu + lục cát + Hóa Lộc → rất mạnh', () => {
    const r = computeStrength([S('Tử Vi', 'chinh', 'miếu'), S('Tả Phù', 'cat'), S('Hóa Lộc', 'trung')]);
    expect(r.value).toBeGreaterThanOrEqual(80);
    expect(r.level).toBe('rất mạnh');
    expect(r.chinhTinhVCD).toBe(false);
    expect(r.trace.length).toBeGreaterThan(0);
  });

  it('chính tinh hãm + sát + Kỵ + Tuần/Triệt → rất yếu', () => {
    const r = computeStrength([S('Cự Môn', 'chinh', 'hãm'), S('Kình Dương', 'hung'), S('Hóa Kỵ', 'trung')], true);
    expect(r.value).toBeLessThan(28);
    expect(r.level).toBe('rất yếu');
  });

  it('vô chính diệu được đánh dấu VCD', () => {
    const r = computeStrength([S('Địa Không', 'hung')]);
    expect(r.chinhTinhVCD).toBe(true);
  });
});

describe('ConflictEngine', () => {
  it('toàn cát → tone cát', () => {
    const r = resolveConflict([S('Văn Xương', 'cat'), S('Tả Phù', 'cat'), S('Hóa Lộc', 'trung')]);
    expect(r.netTone).toBe('cát');
    expect(r.catScore).toBeGreaterThan(r.hungScore);
  });

  it('toàn hung → tone hung', () => {
    const r = resolveConflict([S('Kình Dương', 'hung'), S('Địa Không', 'hung'), S('Hóa Kỵ', 'trung')]);
    expect(r.netTone).toBe('hung');
  });

  it('Hỏa Tinh + Tham Lang → Hỏa Tham cách chuyển hung thành lực (tone cát)', () => {
    const r = resolveConflict([S('Tham Lang', 'chinh', 'miếu'), S('Hỏa Tinh', 'hung')]);
    expect(r.netTone).toBe('cát');
    expect(r.trace.join(' ')).toMatch(/Hỏa Tham|Linh Tham/);
  });
});

describe('ActivationEngine', () => {
  it('vận tam hợp + cát tinh, base tốt → kích hoạt', () => {
    const r = activationState('Tý', 'Thìn', ['Hóa Lộc'], true);
    expect(r.relation).toBe('tam hợp');
    expect(r.state).toBe('kích hoạt');
  });

  it('vận không liên hệ → tiềm ẩn', () => {
    const r = activationState('Tý', 'Mão', ['Hóa Lộc'], true);
    expect(r.inGroup).toBe(false);
    expect(r.state).toBe('tiềm ẩn');
  });

  it('cung xấu, vận xung + hung tinh → bị phá', () => {
    const r = activationState('Tý', 'Ngọ', ['Kình Dương', 'Hóa Kỵ'], false);
    expect(r.relation).toBe('xung chiếu');
    expect(r.state).toBe('bị phá');
  });
});
