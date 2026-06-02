import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../types';
import AIAnalysisCard from '../components/common/AIAnalysisCard';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { t } from '../i18n';
import { analyzeOverview, analyzeHouse } from '../api/claudeApi';

type Props = BottomTabScreenProps<MainTabParamList, 'Analysis'>;

const PALACE_NAMES = [
  'Mệnh','Phụ Mẫu','Phúc Đức','Điền Trạch','Quan Lộc','Nô Bộc',
  'Thiên Di','Tật Ách','Tài Bạch','Tử Tức','Phu Thê','Huynh Đệ',
];

const PALACE_ICONS = ['⚡','👨‍👩‍👧','🍀','🏠','💼','🤝','✈️','❤️‍🩹','💰','👶','💑','👫'];

export default function AnalysisScreen({ route }: Props) {
  const { result } = route.params;
  const apiKey = result.birthInfo.anthropicApiKey ?? '';
  const [activeTab, setActiveTab] = useState<'overview' | 'houses'>('overview');
  const [selectedHouseIdx, setSelectedHouseIdx] = useState<number | null>(null);

  if (!apiKey) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.noKey}>
          <Text style={styles.noKeyIcon}>🔑</Text>
          <Text style={styles.noKeyText}>{t('noApiKey')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Get the house index in the houses array for a given palace (palace 0=Mệnh, but Mệnh is at menhBranchIdx)
  function getHouseByPalaceIndex(palaceIdx: number): number {
    return result.tuViChart.houses.findIndex(h => h.palaceName === PALACE_NAMES[palaceIdx]);
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Tab bar */}
      <View style={styles.tabBar}>
        {(['overview', 'houses'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'overview' ? '📖 Tổng quan' : '🏛 12 Cung'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {activeTab === 'overview' && (
          <>
            <Text style={styles.sectionTitle}>Phân tích vận mệnh tổng quát</Text>
            <AIAnalysisCard
              title="Tổng quan cuộc đời & vận mệnh"
              fetchFn={() => analyzeOverview(apiKey, result)}
              autoLoad
            />
          </>
        )}

        {activeTab === 'houses' && (
          <>
            {/* Palace grid selector */}
            <View style={styles.palaceGrid}>
              {PALACE_NAMES.map((name, i) => {
                const houseIdx = getHouseByPalaceIndex(i);
                const house = houseIdx >= 0 ? result.tuViChart.houses[houseIdx] : null;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.palaceBtn,
                      selectedHouseIdx === houseIdx && styles.palaceBtnActive,
                    ]}
                    onPress={() => setSelectedHouseIdx(houseIdx >= 0 ? houseIdx : null)}
                  >
                    <Text style={styles.palaceIcon}>{PALACE_ICONS[i]}</Text>
                    <Text style={styles.palaceName}>{name}</Text>
                    {house && <Text style={styles.palaceBranch}>{house.branch}</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedHouseIdx !== null && (
              <>
                <View style={styles.houseHeader}>
                  <Text style={styles.houseTitle}>
                    Cung {result.tuViChart.houses[selectedHouseIdx].palaceName} ({result.tuViChart.houses[selectedHouseIdx].branch})
                  </Text>
                  <Text style={styles.houseStars}>
                    Sao: {result.tuViChart.houses[selectedHouseIdx].stars.filter(s => s.type === 'chinh').map(s => s.name).join(', ') || 'Không có chính tinh'}
                  </Text>
                </View>
                <AIAnalysisCard
                  key={selectedHouseIdx}
                  title={`Phân tích cung ${result.tuViChart.houses[selectedHouseIdx].palaceName}`}
                  fetchFn={() => analyzeHouse(apiKey, result, selectedHouseIdx)}
                  autoLoad
                />
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  tabBar: { flexDirection: 'row', backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, padding: SPACING.md, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.gold },
  tabText: { color: COLORS.textSecondary, fontSize: FONTS.size.sm },
  tabTextActive: { color: COLORS.gold, fontWeight: '600' },
  scroll: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },
  sectionTitle: { color: COLORS.gold, fontSize: FONTS.size.md, fontWeight: '600' },
  palaceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  palaceBtn: {
    width: '30%', backgroundColor: COLORS.card, borderRadius: 10,
    padding: SPACING.sm, alignItems: 'center', gap: 2,
    borderWidth: 1, borderColor: COLORS.border,
  },
  palaceBtnActive: { borderColor: COLORS.gold, backgroundColor: COLORS.gold + '11' },
  palaceIcon: { fontSize: 18 },
  palaceName: { color: COLORS.textSecondary, fontSize: FONTS.size.xs, textAlign: 'center' },
  palaceBranch: { color: COLORS.gold, fontSize: FONTS.size.xs, fontWeight: '600' },
  houseHeader: {
    backgroundColor: COLORS.card, borderRadius: 8, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  houseTitle: { color: COLORS.gold, fontSize: FONTS.size.lg, fontWeight: 'bold' },
  houseStars: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, marginTop: 4 },
  noKey: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, gap: SPACING.lg },
  noKeyIcon: { fontSize: 48 },
  noKeyText: { color: COLORS.textSecondary, fontSize: FONTS.size.md, textAlign: 'center', lineHeight: 24 },
});
