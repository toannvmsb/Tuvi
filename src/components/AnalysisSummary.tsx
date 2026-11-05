/**
 * Khối "TÓM TẮT" + tiêu đề "PHÂN TÍCH CHI TIẾT" dùng chung cho Toàn lá số / Đại vận / Tiểu vận / Nguyệt vận
 * (cả bản Nâng cao lẫn Phân tích AI). Tóm tắt nằm TRÊN, chi tiết nằm DƯỚI; mỗi phần có nút Xuất/In PDF riêng.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import SimpleMarkdown from './SimpleMarkdown';
import ExportPdfButton, { type ExportPdfButtonProps } from './ExportPdfButton';
import type { AstrologyResult } from '../types';
import { getAiResult, setAiResult } from '../lib/aiResults';
import { summarizeAnalysisWithAI, detailSignature, type SummaryKind } from '../utils/aiSummary';

/** Thuộc tính PDF của phần chi tiết (không gồm nội dung) — tóm tắt dùng lại để chung tiêu đề/lá số/ảnh. */
export type SummaryPdfProps = Omit<ExportPdfButtonProps, 'getContent' | 'label'>;

function SummaryShell({ children, pdf, getContent, canExport }: {
  children: React.ReactNode; pdf: SummaryPdfProps; getContent: () => string; canExport: boolean;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.tag}>📌 TÓM TẮT</Text>
      {children}
      {canExport && (
        <ExportPdfButton
          {...pdf}
          subtitle={`Tóm tắt${pdf.subtitle ? ` · ${pdf.subtitle}` : ''}`}
          fileName={pdf.fileName ? `${pdf.fileName} - Tóm tắt` : undefined}
          label="📄 Xuất / In PDF — Tóm tắt"
          getContent={getContent}
        />
      )}
    </View>
  );
}

/** Tóm tắt có sẵn (bản Nâng cao / offline). */
export function SummaryCard({ markdown, pdf }: { markdown: string; pdf: SummaryPdfProps }) {
  return (
    <SummaryShell pdf={pdf} getContent={() => markdown} canExport={!!markdown}>
      <SimpleMarkdown content={markdown} />
    </SummaryShell>
  );
}

/** Tiêu đề ngăn cách phần chi tiết bên dưới tóm tắt. */
export function DetailHeader() {
  return (
    <View style={styles.detailHead}>
      <View style={styles.line} />
      <Text style={styles.detailTxt}>📖 PHÂN TÍCH CHI TIẾT</Text>
      <View style={styles.line} />
    </View>
  );
}

/**
 * Tóm tắt cho bản Phân tích AI: tự tóm tắt từ bản chi tiết khi nó đã soạn XONG (ready), lưu lại theo
 * (summaryKey, dấu vân tay bản chi tiết) nên mở lại không gọi AI nữa; "Phân tích lại" → bản chi tiết đổi
 * → tóm tắt tự làm mới. Không trừ xu (nằm trong lần phân tích đã mở).
 */
export function AiSummaryCard({ summaryKey, kind, result, detail, ready, pdf }: {
  summaryKey: string; kind: SummaryKind; result: AstrologyResult; detail: string; ready: boolean; pdf: SummaryPdfProps;
}) {
  const [text, setText] = useState('');
  const [state, setState] = useState<'wait' | 'loading' | 'done' | 'error'>('wait');
  const [err, setErr] = useState('');
  const runId = useRef(0);
  const sig = ready ? detailSignature(detail) : '';

  const generate = async () => {
    const my = ++runId.current;
    setState('loading'); setErr('');
    try {
      const out = await summarizeAnalysisWithAI(kind, detail, result);
      if (my !== runId.current) return;
      setText(out); setState('done');
      void setAiResult(summaryKey, `${sig}\n${out}`);
    } catch (e: any) {
      if (my !== runId.current) return;
      setErr(e?.message || 'Chưa tóm tắt được.'); setState('error');
    }
  };

  useEffect(() => {
    if (!ready) { setState('wait'); return; }
    const cached = getAiResult(summaryKey);
    if (cached) {
      const nl = cached.indexOf('\n');
      if (nl > 0 && cached.slice(0, nl) === sig) { setText(cached.slice(nl + 1)); setState('done'); return; }
    }
    void generate();
    return () => { runId.current++; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, sig, summaryKey]);

  return (
    <SummaryShell pdf={pdf} getContent={() => text} canExport={state === 'done' && !!text}>
      {state === 'done' ? (
        <SimpleMarkdown content={text} />
      ) : state === 'error' ? (
        <View style={{ gap: SPACING.xs }}>
          <Text style={styles.dim}>⚠ {err}</Text>
          <TouchableOpacity onPress={() => void generate()} style={styles.retryBtn}>
            <Text style={styles.retryTxt}>↻ Tóm tắt lại (miễn phí)</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.waitRow}>
          <ActivityIndicator size="small" color={COLORS.gold} />
          <Text style={styles.dim}>
            {state === 'loading' ? 'AI đang viết tóm tắt từ bản phân tích…' : 'Tóm tắt sẽ hiện ngay khi AI soạn xong phần chi tiết bên dưới.'}
          </Text>
        </View>
      )}
    </SummaryShell>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.gold + '12', borderRadius: 10, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.gold + '55', gap: SPACING.xs, marginBottom: SPACING.sm,
  },
  tag: { color: COLORS.gold, fontSize: FONTS.size.sm, fontWeight: '900', letterSpacing: 0.5 },
  detailHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.sm, marginBottom: SPACING.sm },
  line: { flex: 1, height: 1, backgroundColor: COLORS.border },
  detailTxt: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, fontWeight: '900', letterSpacing: 0.5 },
  dim: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, fontStyle: 'italic', flexShrink: 1 },
  waitRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  retryBtn: { alignSelf: 'flex-start', borderWidth: 1, borderColor: COLORS.gold, borderRadius: 6, paddingHorizontal: SPACING.md, paddingVertical: 4 },
  retryTxt: { color: COLORS.gold, fontSize: FONTS.size.sm, fontWeight: '700' },
});
