import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS, FONTS, SPACING } from '../../constants/theme';

interface Props {
  title: string;
  fetchFn: () => Promise<string>;
  cacheKey?: string;
  autoLoad?: boolean;
}

export default function AIAnalysisCard({ title, fetchFn, autoLoad = false }: Props) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (autoLoad) loadAnalysis();
  }, []);

  async function loadAnalysis() {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setText(result);
    } catch (e: any) {
      setError(e?.message ?? 'Không thể tải phân tích');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.header} onPress={() => setExpanded(e => !e)}>
        <Text style={styles.title}>🤖 {title}</Text>
        <Text style={styles.arrow}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.body}>
          {loading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={COLORS.gold} size="small" />
              <Text style={styles.loadingText}>Claude AI đang phân tích...</Text>
            </View>
          )}

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠ {error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={loadAnalysis}>
                <Text style={styles.retryText}>Thử lại</Text>
              </TouchableOpacity>
            </View>
          )}

          {text && (
            <Text style={styles.analysisText}>{text}</Text>
          )}

          {!text && !loading && !error && (
            <TouchableOpacity style={styles.loadBtn} onPress={loadAnalysis}>
              <Text style={styles.loadBtnText}>⚡ Tải phân tích AI</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.gold + '44', overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING.md, backgroundColor: COLORS.gold + '11',
  },
  title: { color: COLORS.gold, fontSize: FONTS.size.sm, fontWeight: '600', flex: 1 },
  arrow: { color: COLORS.textMuted, fontSize: FONTS.size.xs },
  body: { padding: SPACING.md, gap: SPACING.sm },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, justifyContent: 'center', padding: SPACING.md },
  loadingText: { color: COLORS.textSecondary, fontSize: FONTS.size.sm },
  errorBox: { gap: SPACING.sm },
  errorText: { color: COLORS.starHung, fontSize: FONTS.size.sm },
  retryBtn: { alignSelf: 'flex-start', padding: SPACING.sm, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border },
  retryText: { color: COLORS.textSecondary, fontSize: FONTS.size.xs },
  analysisText: { color: COLORS.textPrimary, fontSize: FONTS.size.sm, lineHeight: 24 },
  loadBtn: {
    backgroundColor: COLORS.gold + '22', borderRadius: 8, padding: SPACING.md,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.gold + '55',
  },
  loadBtnText: { color: COLORS.gold, fontSize: FONTS.size.sm, fontWeight: '600' },
});
