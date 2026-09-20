/**
 * LÁ SỐ (tab) — trung tâm lá số của tôi. Tóm tắt Tử Vi + Bát Tự và lối vào các màn chi tiết.
 * Các màn chi tiết (lá số 12 cung, Bát Tự, luận giải AI, Tài Lộc, chi tiết cung) vẫn là màn cũ,
 * sẽ lần lượt chuyển sang giao diện mới; tab này giữ cho người dùng luôn có 1 điểm vào duy nhất.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONTS, ELEMENT_COLORS } from '../constants/theme';
import { Screen, Card, Display, Eyebrow, Body, SectionTitle, GoldButton } from '../ui';
import Icon, { type IconName } from '../ui/Icon';
import { useMyResult, NoChartState } from '../hooks/useMyResult';
import type { AstrologyResult } from '../types';

function Row({ icon, title, sub, color, onPress }: { icon: IconName; title: string; sub: string; color: string; onPress: () => void }) {
  return (
    <Pressable style={s.row} onPress={onPress} accessibilityRole="button">
      <View style={[s.rowIcon, { backgroundColor: color + '26' }]}><Icon name={icon} size={22} color={color} /></View>
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle}>{title}</Text>
        <Text style={s.rowSub}>{sub}</Text>
      </View>
      <Icon name="chev" size={18} color={COLORS.textMuted} />
    </Pressable>
  );
}

export default function ChartHubScreen() {
  const navigation = useNavigation<any>();
  const { result, loading } = useMyResult();
  if (loading) return <Screen tabBarSpace><Body>Đang mở lá số…</Body></Screen>;
  if (!result) return <NoChartState />;

  const r: AstrologyResult = result;
  const c = r.tuViChart;
  const menhIdx = c.houses.findIndex(h => h.isManh);
  const menh = menhIdx >= 0 ? c.houses[menhIdx] : undefined;
  const chinh = (menh?.stars ?? []).filter(st => st.type === 'chinh').map(st => st.name);
  const dm = r.batTuChart.dayMaster;
  const dmEl = r.batTuChart.dayMasterElement;
  const genderLabel = r.birthInfo.gender === 'nu' ? 'Nữ' : 'Nam';
  const openTab = (screen: string) => navigation.navigate('MainTabs', { result: r, screen, params: { result: r } });

  return (
    <Screen tabBarSpace>
      <Display size={34}>Lá số</Display>
      <Text style={s.who}>
        <Text style={{ fontFamily: FONTS.bodyBold, color: COLORS.textPrimary }}>{r.birthInfo.name || 'Hồ sơ của tôi'}</Text>
        {` · ${genderLabel} · ${c.lunarDate.yearStem} ${c.lunarDate.yearBranch} ${r.birthInfo.year}`}
      </Text>

      <Card hero style={{ gap: 12 }}>
        <Eyebrow>Tử Vi</Eyebrow>
        <Display size={30} color={COLORS.goldLight}>
          {chinh.length ? `${chinh.join(' · ')} tại Mệnh` : 'Mệnh vô chính diệu'}
        </Display>
        <Body>{`Mệnh cung ${c.menhCung} · ${c.cucName} · ${c.napAmMenh}`}</Body>
        <GoldButton label="Mở lá số 12 cung" onPress={() => openTab('TuViChart')} />
      </Card>

      <Card style={{ gap: 10 }}>
        <Eyebrow>Bát Tự</Eyebrow>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
          <Display size={28} color={ELEMENT_COLORS[dmEl] ?? COLORS.gold}>{`${dm} ${dmEl}`}</Display>
          <Text style={s.who}>Nhật chủ</Text>
        </View>
        <Body>{`Dụng thần: ${r.batTuChart.favorableElements.join(', ') || '—'} · Kỵ thần: ${r.batTuChart.unfavorableElements.join(', ') || '—'}`}</Body>
        <Pressable style={s.linkRow} onPress={() => openTab('BatTu')} accessibilityRole="button">
          <Text style={s.linkTxt}>Xem Bát Tự</Text>
          <Icon name="arrow" size={18} color="#F5E0AE" />
        </Pressable>
      </Card>

      <SectionTitle title="Đi sâu hơn" />
      <View style={{ gap: 10 }}>
        <Row icon="user" color={COLORS.gold} title="Chi tiết cung Mệnh" sub="Các sao tọa thủ, tam phương, phi hóa"
          onPress={() => navigation.navigate('PalaceDetail', { result: r, branchIndex: Math.max(0, menhIdx) })} />
        <Row icon="spark" color={COLORS.purple} title="Luận giải toàn lá số bằng AI" sub="8 phần, 4 lớp: dữ kiện → khuyến nghị"
          onPress={() => navigation.navigate('FullChartAI', { result: r })} />
        <Row icon="coin" color={COLORS.green} title="Tài Lộc" sub="ADN tài chính và các đại vận tài lộc"
          onPress={() => navigation.navigate('WealthChart', { result: r })} />
        <Row icon="compare" color={COLORS.blue} title="So sánh với lá số khác" sub="Tương hợp Bát Tự và Tử Vi"
          onPress={() => navigation.navigate('CompareCharts', { preSelectedResult: r })} />
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  who: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textSecondary },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 68, padding: 12, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(226,194,133,0.18)',
  },
  rowIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: FONTS.bodySemi, fontSize: 15, color: COLORS.textPrimary },
  rowSub: { fontFamily: FONTS.body, fontSize: 12.5, color: COLORS.textSecondary, marginTop: 1 },
  linkRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  linkTxt: { fontFamily: FONTS.bodySemi, fontSize: 14, color: '#F5E0AE' },
});
