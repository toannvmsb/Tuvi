/**
 * VẬN HẠN (tab) — bốn tầng thời gian: Đại vận (10 năm) · Tiểu vận (1 năm) · Nguyệt vận (30 ngày)
 * · Nhật vận (hôm nay). Mỗi thẻ mở màn chi tiết tương ứng (màn cũ, sẽ chuyển sang giao diện mới).
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONTS } from '../constants/theme';
import { Screen, Card, Display, Eyebrow, Body, ScoreRing, SectionTitle } from '../ui';
import Icon from '../ui/Icon';
import { useMyResult, NoChartState } from '../hooks/useMyResult';
import { currentAgeOf } from '../core/ageUtil';
import { scoreNhatVan } from '../core/nhatVan';
import { solarToLunar } from '../core/lunarCalendar';

function Tier({ eyebrow, head, sub, score, onPress, color }: {
  eyebrow: string; head: string; sub: string; score?: number; onPress: () => void; color: string;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${eyebrow}: ${head}`}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, borderColor: color + '55' }}>
        {typeof score === 'number' ? (
          <ScoreRing score={score} size={64} stroke={6} numberSize={22} />
        ) : (
          <View style={[s.dot, { backgroundColor: color + '26' }]}><Icon name="wave" size={26} color={color} /></View>
        )}
        <View style={{ flex: 1, gap: 3 }}>
          <Eyebrow color={color}>{eyebrow}</Eyebrow>
          <Display size={24} numberOfLines={2}>{head}</Display>
          <Body size={12.5}>{sub}</Body>
        </View>
        <Icon name="chev" size={20} color={COLORS.gold} />
      </Card>
    </Pressable>
  );
}

export default function VanHubScreen() {
  const navigation = useNavigation<any>();
  const { result, loading } = useMyResult();
  if (loading) return <Screen tabBarSpace><Body>Đang tải vận hạn…</Body></Screen>;
  if (!result) return <NoChartState title="Thêm hồ sơ để xem vận hạn" />;

  const now = new Date();
  const age = currentAgeOf(result);
  const dv = result.daiVans.find(d => age >= d.startAge && age <= d.endAge);
  const palace = dv ? result.tuViChart.houses.find(h => h.daiVanStartAge === dv.startAge)?.palaceName : undefined;
  const tv = result.tieuVans.find(t => t.year === now.getFullYear());
  const tvPalace = tv ? result.tuViChart.houses.find(h => h.branch === tv.branch)?.palaceName : undefined;
  const lunar = solarToLunar(now.getDate(), now.getMonth() + 1, now.getFullYear());
  const today = scoreNhatVan(result, now);
  const go = (screen: string) => navigation.navigate('MainTabs', { result, screen, params: { result } });

  return (
    <Screen tabBarSpace>
      <View style={{ gap: 6 }}>
        <Display size={34}>Vận hạn tổng quát</Display>
        <Body>Bốn tầng thời gian lồng vào nhau. Chọn một tầng để xem chi tiết.</Body>
      </View>

      <Pressable
        onPress={() => navigation.navigate('AnnualEvents', { result, year: now.getFullYear() })}
        accessibilityRole="button" accessibilityLabel={`Vận hạn diễn ra trong năm ${now.getFullYear()}`}
      >
        <Card hero style={s.annualBox}>
          <View style={s.annualIcon}><Icon name="spark" size={26} color="#1E1230" /></View>
          <View style={{ flex: 1, gap: 3 }}>
            <Eyebrow>Vận hạn diễn ra trong năm {now.getFullYear()}</Eyebrow>
            <Display size={20} numberOfLines={2}>Luận sự kiện: tháng nào kích hoạt, việc gì nên lưu ý</Display>
          </View>
          <Icon name="arrow" size={20} color={COLORS.goldLight} />
        </Card>
      </Pressable>

      <Tier color={COLORS.gold} eyebrow="Đại vận · 10 năm"
        head={palace ? `Cung ${palace}` : 'Đại vận hiện tại'}
        sub={dv ? `${dv.startAge}–${dv.endAge} tuổi · ${dv.stem} ${dv.branch}` : 'Xem các đại vận của bạn'}
        onPress={() => go('DaiVan')} />
      <Tier color={COLORS.purple} eyebrow="Tiểu vận · 1 năm"
        head={tv ? `${now.getFullYear()} - ${tvPalace ? `Cung ${tvPalace}` : `${tv.yearStem} ${tv.yearBranch}`}` : `Năm ${now.getFullYear()}`}
        sub="Kế hoạch 1 năm: các cung được kích hoạt và Lưu Tứ Hóa"
        onPress={() => go('TieuVan')} />
      <Tier color={COLORS.green} eyebrow="Nguyệt vận · 30 ngày"
        head={`Tháng ${lunar.month} âm lịch`}
        sub="Tháng này kích hoạt phần nào của Đại vận và Tiểu vận"
        onPress={() => go('NguyetVan')} />
      <Tier color={COLORS.blue} eyebrow="Nhật vận · hôm nay"
        head={`${now.getDate()}/${now.getMonth() + 1} · ${today.rating}`}
        sub="Ngày Hoàng Đạo/Hắc Đạo, giờ tốt, nên và hạn chế"
        score={today.score100}
        onPress={() => go('NhatVan')} />

      <SectionTitle title="Bốn tầng lồng nhau" />
      <Card style={{ gap: 8 }}>
        {[
          { t: 'Đại vận · 10 năm', w: '100%', c: COLORS.gold },
          { t: 'Tiểu vận · 1 năm', w: '78%', c: COLORS.purple },
          { t: 'Nguyệt vận · 30 ngày', w: '56%', c: COLORS.green },
          { t: 'Nhật vận', w: '34%', c: COLORS.blue },
        ].map(b => (
          <View key={b.t} style={{ width: b.w as any, alignSelf: 'center' }}>
            <View style={[s.nest, { backgroundColor: b.c + '2E', borderColor: b.c + '66' }]}>
              <Text style={s.nestTxt} numberOfLines={1}>{b.t}</Text>
            </View>
          </View>
        ))}
        <Body size={12.5}>
          Đại vận đặt bối cảnh, Tiểu vận chọn trọng tâm của năm, Nguyệt vận cho thấy tháng kích hoạt phần nào, Nhật vận giúp chọn thời điểm hành động.
        </Body>
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  annualBox: { flexDirection: 'row', alignItems: 'center', gap: 14, borderColor: 'rgba(226,194,133,0.55)', borderWidth: 1.5 },
  annualIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.gold },
  dot: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  nest: { height: 30, borderRadius: 10, borderWidth: 1, justifyContent: 'center', paddingHorizontal: 12 },
  nestTxt: { fontFamily: FONTS.bodySemi, fontSize: 12, color: COLORS.textPrimary },
});
