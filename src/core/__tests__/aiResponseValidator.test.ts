import { validateAINarrative, type ChartFacts } from '../aiResponseValidator';

const facts: ChartFacts = {
  starNames: ['Tử Vi', 'Thiên Phủ', 'Vũ Khúc', 'Thiên Tướng'],
  confirmedFormations: ['Tử Phủ Vũ Tướng'],
  potentialFormations: ['Sát Phá Tham'],
  palaceNames: ['Mệnh'],
  formulaVersion: '2.0',
};

describe('AI Response Validator (Phase 14)', () => {
  it('chỉ nhắc cách hợp lệ → ok', () => {
    const r = validateAINarrative('Lá số có Tử Phủ Vũ Tướng, gần thành Sát Phá Tham.', facts);
    expect(r.ok).toBe(true);
    expect(r.hallucinatedFormations).toHaveLength(0);
  });

  it('nhắc cách KHÔNG được xác nhận → bắt hallucination', () => {
    const r = validateAINarrative('Lá số hội cách Mã Đầu Đới Kiếm hiếm gặp.', facts);
    // "Mã Đầu Đới Kiếm" chỉ bị bắt nếu tồn tại trong catalog; kiểm tra cơ chế chung:
    const r2 = validateAINarrative('Lá số có Tử Phủ Vũ Tướng và Vũ Phủ đồng cung.', facts);
    expect(r2.ok).toBe(false);
    expect(r2.hallucinatedFormations).toContain('Vũ Phủ đồng cung');
    expect(r2.note).toContain('Vũ Phủ đồng cung');
  });

  it('guard chống dương tính giả với biến thể con', () => {
    const f: ChartFacts = { ...facts, confirmedFormations: ['Lộc Mã giao trì (Hóa Lộc)'] };
    const r = validateAINarrative('Cách Lộc Mã giao trì (Hóa Lộc) phát tài tha hương.', f);
    expect(r.ok).toBe(true);
  });

  it('text không nhắc cách nào → ok', () => {
    const r = validateAINarrative('Đại vận này tài lộc hanh thông.', facts);
    expect(r.ok).toBe(true);
  });
});
