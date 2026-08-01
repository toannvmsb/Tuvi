import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../types';
import ScreenHeader from '../components/ScreenHeader';
import { navigationRef } from '../navigation/AppNavigator';
import BatTuChartComponent from '../components/BatTuChart';
import SimpleMarkdown from '../components/SimpleMarkdown';
import AIProgressBar from '../components/AIProgressBar';
import ExportPdfButton from '../components/ExportPdfButton';
import { chartHeaderLines } from '../utils/pdfExport';
import { analyzePhongThuyBatTu } from '../core/phongThuyBatTu';
import { batTuThapThanMarkdown } from '../core/thapThan';
import { batTuSections } from '../utils/aiAnalysis';
import { cutAtSection } from '../core/offlineLuanGiai';
import PaidGate from '../components/PaidGate';
import { fkey } from '../lib/featureKey';
import { getAiResult } from '../lib/aiResults';
import { costNote, PREMIUM, AI_PREVIEW } from '../constants/premium';
import { useStreamingAI } from '../hooks/useStreamingAI';
import MissingPartsNotice from '../components/MissingPartsNotice';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { t } from '../i18n';

type Props = BottomTabScreenProps<MainTabParamList, 'BatTu'>;

export default function BatTuScreen({ route }: Props) {
  const { result } = route.params;
  const { batTuChart } = result;
  const phongThuy = useMemo(() => analyzePhongThuyBatTu(batTuChart), [batTuChart]);
  // Nâng cao = phong thủy ngũ hành + Thập Thần/Cách cục/Biến động (chuyển Bát Tự thành tư vấn thực tế).
  const offlineMd = useMemo(
    () => `${phongThuy.markdown}\n\n${batTuThapThanMarkdown(batTuChart)}`,
    [phongThuy.markdown, batTuChart],
  );
  const [ptOpen, setPtOpen] = useState(true);
  const [mode, setMode] = useState<'offline' | 'ai'>('offline');

  const aiKey = fkey(result, 'battu:ai');
  const { ai: aiMap, run, retryMissing, showCached } = useStreamingAI();
  const ai = aiMap[0];

  const openAiTab = () => {
    setMode('ai');
    if (!aiMap[0]) showCached(0, aiKey);
  };

  const runAI = (force = false) => run(0, aiKey, batTuSections(result), force);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScreenHeader title="Bát Tự" onBack={() => navigationRef.navigate('Home')} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{t('batTuTitle')}</Text>
        <Text style={styles.subtitle}>
          {result.birthInfo.name} • {result.birthInfo.gender === 'nam' ? '♂ Nam' : '♀ Nữ'}
        </Text>

        <BatTuChartComponent chart={batTuChart} />

        {/* Explanation */}
        <View style={styles.explainCard}>
          <Text style={styles.explainTitle}>Hướng dẫn đọc Bát Tự</Text>
          <Text style={styles.explainText}>
            • <Text style={styles.highlight}>Nhật Chủ</Text>: Thiên Can của Trụ Ngày - đại diện cho bản thân.{'\n'}
            • <Text style={styles.highlight}>Dụng Thần</Text>: Ngũ hành hỗ trợ nhật chủ, nên tìm kiếm trong cuộc sống.{'\n'}
            • <Text style={styles.highlight}>Kỵ Thần</Text>: Ngũ hành khắc chế, cần tránh hoặc hóa giải.{'\n'}
            • <Text style={styles.highlight}>Tàng Can</Text>: Thiên can ẩn trong Địa Chi, ảnh hưởng tinh tế hơn.
          </Text>
        </View>

        {/* Phong Thủy theo Bát Tự */}
        <View style={styles.ptCard}>
          <TouchableOpacity style={styles.ptHead} onPress={() => setPtOpen(o => !o)} activeOpacity={0.7}>
            <Text style={styles.ptHeadText}>🧭 Phong Thủy theo Bát Tự</Text>
            <Text style={styles.ptChev}>{ptOpen ? '▾' : '▸'}</Text>
          </TouchableOpacity>
          {ptOpen && (
            <View style={styles.ptBody}>
              {/* Tabs Nâng cao (offline) / Phân tích AI */}
              <View style={styles.tabsRow}>
                <TouchableOpacity
                  style={[styles.tab, mode === 'offline' && styles.tabActive]}
                  onPress={() => setMode('offline')}>
                  <Text style={[styles.tabTxt, mode === 'offline' && styles.tabTxtActive]}>📘 Nâng cao</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, mode === 'ai' && styles.tabActive]}
                  onPress={openAiTab}>
                  <Text style={[styles.tabTxt, mode === 'ai' && styles.tabTxtActive]}>🤖 Phân tích AI</Text>
                </TouchableOpacity>
              </View>

              {mode === 'offline' ? (
                <PaidGate unlockKey={fkey(result, 'battu:adv')} kind="advanced"
                  preview={cutAtSection(offlineMd, 'Cân bằng ngũ hành & ảnh hưởng tính cách')}>
                  <SimpleMarkdown content={offlineMd} />
                  <ExportPdfButton
                    title="Bát Tự & Phong Thủy"
                    subtitle="Bản Nâng cao (offline)"
                    badge="NÂNG CAO"
                    headerLines={chartHeaderLines(result)}
                    fileName={`${result.birthInfo.name || 'Lá số'} - Bát Tự - Nâng cao`}
                    getContent={() => offlineMd}
                  />
                </PaidGate>
              ) : !ai || ai.status === 'idle' ? (
                <View>
                  <Text style={styles.aiValueNote}>{AI_PREVIEW.batTu}</Text>
                  <TouchableOpacity style={styles.aiBtn} onPress={() => runAI()} activeOpacity={0.85}>
                    <Text style={styles.aiBtnText}>🔍 Phân tích AI đầy đủ Bát Tự & Phong Thủy ({costNote(PREMIUM.COST.ai)})</Text>
                  </TouchableOpacity>
                </View>
              ) : ai.status === 'loading' ? (
                <AIProgressBar label="AI đang luận Bát Tự & Phong Thủy…" />
              ) : ai.status === 'done' ? (
                <View>
                  <SimpleMarkdown content={ai.shown ?? ai.text} />
                  {ai.fetchingMore && (
                    <Text style={styles.dim}>✍️ AI đang soạn tiếp các phần sau… (bạn cứ đọc, nội dung sẽ nối tiếp)</Text>
                  )}
                  <Text style={styles.dim}>* Nội dung AI, mang tính tham khảo.</Text>
                  {!ai.fetchingMore && (
                    <MissingPartsNotice missing={ai.missing} retrying={ai.retrying} onRetry={() => retryMissing(0)} />
                  )}
                  {!ai.fetchingMore && !ai.missing && (
                    <ExportPdfButton
                      title="Bát Tự & Phong Thủy"
                      subtitle="Bản Phân tích AI"
                      badge="PHÂN TÍCH AI"
                      headerLines={chartHeaderLines(result)}
                      fileName={`${result.birthInfo.name || 'Lá số'} - Bát Tự - AI`}
                      getContent={() => ai.shown ?? ai.text}
                    />
                  )}
                  <TouchableOpacity onPress={() => runAI(true)}><Text style={styles.retry}>↻ Phân tích lại (−{PREMIUM.COST.ai} xu)</Text></TouchableOpacity>
                </View>
              ) : (
                <View>
                  <Text style={styles.explainText}>{ai.text}</Text>
                  <TouchableOpacity onPress={() => runAI()}><Text style={styles.retry}>↻ Thử lại</Text></TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },
  title: { fontSize: FONTS.size.xxl, fontWeight: 'bold', color: COLORS.gold, textAlign: 'center' },
  subtitle: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, textAlign: 'center' },
  explainCard: {
    backgroundColor: COLORS.card, borderRadius: 12,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  explainTitle: { color: COLORS.gold, fontSize: FONTS.size.sm, fontWeight: '600', marginBottom: SPACING.sm },
  explainText: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, lineHeight: 22 },
  highlight: { color: COLORS.goldLight, fontWeight: '600' },
  ptCard: {
    backgroundColor: COLORS.card, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.gold, overflow: 'hidden',
  },
  ptHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.md, backgroundColor: COLORS.gold + '14',
  },
  ptHeadText: { color: COLORS.gold, fontSize: FONTS.size.md, fontWeight: '800' },
  ptChev: { color: COLORS.gold, fontSize: FONTS.size.lg, fontWeight: '800' },
  ptBody: { padding: SPACING.md, paddingTop: SPACING.sm },
  tabsRow: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderRadius: 8, borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden', marginBottom: SPACING.sm,
  },
  tab: { flex: 1, paddingVertical: SPACING.sm, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: COLORS.gold, backgroundColor: COLORS.gold + '11' },
  tabTxt: { color: COLORS.textSecondary, fontWeight: '700', fontSize: FONTS.size.sm },
  tabTxtActive: { color: COLORS.gold },
  aiBtn: { backgroundColor: COLORS.purple, borderRadius: 8, padding: SPACING.sm, alignItems: 'center' },
  aiBtnText: { color: '#fff', fontSize: FONTS.size.sm, fontWeight: '800', textAlign: 'center' },
  aiValueNote: { color: COLORS.goldLight, fontSize: FONTS.size.sm, fontStyle: 'italic', lineHeight: 18, marginBottom: SPACING.xs },
  dim: { color: COLORS.textSecondary, fontSize: FONTS.size.xs, fontStyle: 'italic', marginTop: SPACING.xs },
  retry: { color: COLORS.purple, fontSize: FONTS.size.sm, fontWeight: '700', marginTop: 4 },
});
