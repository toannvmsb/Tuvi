/**
 * rules/conflict_rules_v1.yaml — sao chép nguyên văn sang TS (chỉ 3 rule, không cần file JSON riêng).
 * Áp dụng SAU khi đã chấm điểm từng sự kiện — chỉnh hướng (direction) và gắn chủ đề chéo,
 * KHÔNG đổi điểm strength.
 */
export interface ConflictRule {
  id: string;
  when: {
    category?: string;
    positiveFamiliesMin?: number;
    negativeFamiliesMin?: number;
    signalsAny?: string[];
    negativeSignalsAny?: string[];
  };
  action: {
    setDirection?: 'MIXED_IF_DELTA_LT_25';
    addTheme?: string;
    preferEvents?: string[];
    suppressAbsoluteLossLanguage?: boolean;
    avoid?: string;
  };
}

export const CONFLICT_RULES: ConflictRule[] = [
  {
    id: 'C001_FINANCE_LOC_KY',
    when: { category: 'FINANCE', positiveFamiliesMin: 1, negativeFamiliesMin: 1 },
    action: { setDirection: 'MIXED_IF_DELTA_LT_25', addTheme: 'CASHFLOW_VOLATILITY' },
  },
  {
    id: 'C002_PROPERTY_CHANGE_HAO',
    when: { category: 'PROPERTY', signalsAny: ['THIEN_MA', 'THAI_TUE'], negativeSignalsAny: ['DAI_HAO', 'TIEU_HAO', 'HOA_KY'] },
    action: { preferEvents: ['PROPERTY_RELOCATION', 'PROPERTY_RENOVATION', 'PROPERTY_LARGE_EXPENSE'], suppressAbsoluteLossLanguage: true },
  },
  {
    id: 'C003_RELATIONSHIP_POS_NEG',
    when: { category: 'RELATIONSHIP', positiveFamiliesMin: 1, negativeFamiliesMin: 1 },
    action: { setDirection: 'MIXED_IF_DELTA_LT_25', avoid: 'binary_breakup_or_marriage_without_specific_gate' },
  },
];
