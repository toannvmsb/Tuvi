import { extractJson, validateStructured, parseAndValidate, chartEvidenceIds, renderNarrative } from '../structuredAI';

import { sampleResult } from './fixtures';

describe('extractJson — parse phòng thủ', () => {
  it('JSON thuần', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });
  it('JSON bọc trong ```json fence', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
  it('JSON lẫn trong prose', () => {
    expect(extractJson('Đây là kết quả: {"a":1} hết.')).toEqual({ a: 1 });
  });
  it('text không có JSON → null', () => {
    expect(extractJson('không có json')).toBeNull();
  });
});

describe('validateStructured — shape + evidence', () => {
  const allowed = new Set(['CC.tu-phu-vu-tuong', 'palace:Mệnh']);

  it('response hợp lệ', () => {
    const data = {
      sections: [{ heading: 'H', body: 'B', evidence_ids: ['CC.tu-phu-vu-tuong'] }],
      summary: 'S', confidence: 80,
    };
    expect(validateStructured(data, allowed).ok).toBe(true);
  });

  it('evidence bịa → fail + liệt kê', () => {
    const data = {
      sections: [{ heading: 'H', body: 'B', evidence_ids: ['CC.khong-co-that'] }],
      summary: 'S', confidence: 80,
    };
    const v = validateStructured(data, allowed);
    expect(v.ok).toBe(false);
    expect(v.hallucinatedEvidence).toContain('CC.khong-co-that');
  });

  it('thiếu field → fail', () => {
    expect(validateStructured({ sections: [] }, allowed).ok).toBe(false);
    expect(validateStructured(null, allowed).ok).toBe(false);
  });
});

describe('parseAndValidate — pipeline + fallback', () => {
  const result = sampleResult();

  it('JSON hợp lệ với evidence thật → ok, có data', () => {
    const evId = [...chartEvidenceIds(result)].find(id => id.startsWith('palace:'))!;
    const json = JSON.stringify({
      sections: [{ heading: 'Tổng quan', body: 'Nội dung.', evidence_ids: [evId] }],
      summary: 'Tóm tắt.', confidence: 78,
    });
    const r = parseAndValidate(json, result);
    expect(r.ok).toBe(true);
    expect(r.data!.sections).toHaveLength(1);
    expect(renderNarrative(r.data!)).toContain('Tổng quan');
  });

  it('parse fail → fallback về text gốc', () => {
    const r = parseAndValidate('Đây là markdown thường, không JSON.', result);
    expect(r.ok).toBe(false);
    expect(r.fallbackText).toContain('markdown thường');
  });

  it('JSON parse được nhưng evidence bịa → render graceful (bỏ evidence lỗi, giữ nội dung)', () => {
    const json = JSON.stringify({
      sections: [{ heading: 'H', body: 'B', evidence_ids: ['CC.bia-dat-hoan-toan'] }],
      summary: 'S', confidence: 50,
    });
    const r = parseAndValidate(json, result);
    expect(r.ok).toBe(true); // vẫn render được
    expect(r.data!.sections[0].evidence_ids).not.toContain('CC.bia-dat-hoan-toan');
    expect(r.validation!.hallucinatedEvidence).toContain('CC.bia-dat-hoan-toan');
  });

  it('chartEvidenceIds chứa palace refs + rule ids', () => {
    const ids = chartEvidenceIds(result);
    expect([...ids].some(id => id.startsWith('palace:'))).toBe(true);
    expect([...ids].some(id => id.startsWith('ST.'))).toBe(true);
  });

  it('JSON đúng shape với evidence_ids toàn bịa (ST.001…) → render sạch, không hiện raw JSON', () => {
    // Tình huống thực từ user report: AI trả evidence "ST.001" không hợp lệ
    const json = JSON.stringify({
      sections: [
        { heading: 'Bản chất', body: 'Cá tính người này…', evidence_ids: ['palace:Mệnh', 'palace:Thân', 'ST.001'] },
        { heading: 'Cơ chế vận mệnh', body: 'Sự kết hợp…', evidence_ids: ['ST.002', 'ST.003'] },
      ],
      summary: 'Lá số cân đối.',
      confidence: 75,
    });
    const r = parseAndValidate(json, result);
    expect(r.ok).toBe(true);
    expect(r.data).toBeDefined();
    // Evidence lỗi bị loại bỏ nhưng nội dung vẫn nguyên
    expect(r.data!.sections[0].body).toContain('Cá tính');
    expect(r.data!.sections[0].evidence_ids).not.toContain('ST.001');
    // Render markdown không chứa cú pháp JSON
    const md = renderNarrative(r.data!);
    expect(md).not.toContain('"sections"');
    expect(md).not.toContain('"evidence_ids"');
    expect(md).toContain('Bản chất');
  });
});
