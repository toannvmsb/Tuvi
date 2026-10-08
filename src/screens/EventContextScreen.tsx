/**
 * HOÀN CẢNH CỦA BẠN — khai các cờ ngữ cảnh để ẩn sự kiện không áp dụng (đang đi làm, có con, đang có đôi…).
 * Lưu cục bộ theo từng lá số. Khai “không” = ẩn sự kiện; chưa khai = vẫn hiện. Chạm lại lựa chọn đang chọn để bỏ chọn.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import { COLORS, FONTS } from '../constants/theme';
import { Screen, Card, Body, Eyebrow, OutlineButton } from '../ui';
import { CONTEXT_GROUPS, CONTEXT_KEYS, loadEventContext, saveEventContext, answeredCount } from '../lib/eventContext';
import { CONTEXT_LABELS } from '../data/eventContextLabels';
import type { EventContext } from '../lib/eventContext';
import type { AstrologyResult } from '../types';

export default function EventContextScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const result: AstrologyResult = route.params.result;
  const [ctx, setCtx] = useState<EventContext>({});
  const [ready, setReady] = useState(false);

  useEffect(() => { loadEventContext(result).then(c => { setCtx(c); setReady(true); }); }, [result]);

  const set = (k: string, v: boolean) => {
    const next = { ...ctx, [k]: ctx[k] === v ? null : v };
    setCtx(next);
    void saveEventContext(result, next);
  };
  const clearAll = () => { setCtx({}); void saveEventContext(result, {}); };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScreenHeader title="Hoàn cảnh của bạn" onBack={() => navigation.goBack()} />
      <Screen contentStyle={{ paddingTop: 12 }}>
        <Card style={{ gap: 6 }}>
          <Eyebrow>Vì sao cần?</Eyebrow>
          <Body size={13} style={s.justify}>
            Nhiều chủ đề (con cái, hợp đồng, kế hoạch di chuyển…) chỉ có nghĩa khi đúng hoàn cảnh của bạn. Mục nào bạn khai “không” thì sự kiện tương ứng được ẩn; mục chưa khai vẫn hiện (chỉ lọc theo tuổi).
            Thông tin chỉ lưu trên máy này, theo từng lá số, và là hoàn cảnh HIỆN TẠI của bạn.
          </Body>
          <Body size={12.5} color={COLORS.goldLight}>Đã khai {answeredCount(ctx)}/{CONTEXT_KEYS.length} mục</Body>
        </Card>

        {ready && CONTEXT_GROUPS.map(g => (
          <View key={g.title} style={{ gap: 8 }}>
            <Eyebrow color={COLORS.goldLight}>{g.title}</Eyebrow>
            <Card style={{ gap: 12 }}>
              {g.keys.filter(k => CONTEXT_LABELS[k]).map(k => (
                <View key={k} style={s.row}>
                  <Text style={s.label}>{CONTEXT_LABELS[k]}</Text>
                  <View style={s.btns}>
                    <Pressable onPress={() => set(k, true)} style={[s.btn, ctx[k] === true && s.btnOn]} accessibilityRole="button" accessibilityState={{ selected: ctx[k] === true }}>
                      <Text style={[s.btnTxt, ctx[k] === true && s.btnTxtOn]}>Có</Text>
                    </Pressable>
                    <Pressable onPress={() => set(k, false)} style={[s.btn, ctx[k] === false && s.btnOn]} accessibilityRole="button" accessibilityState={{ selected: ctx[k] === false }}>
                      <Text style={[s.btnTxt, ctx[k] === false && s.btnTxtOn]}>Không</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </Card>
          </View>
        ))}

        <OutlineButton label="Xóa toàn bộ lựa chọn" onPress={clearAll} />
        <Text style={s.foot}>Không nhập thông tin sức khỏe, bệnh án hay danh tính cụ thể. Các mục chỉ là cờ có/không.</Text>
      </Screen>
    </View>
  );
}

const s = StyleSheet.create({
  justify: { textAlign: 'justify' },
  row: { gap: 8 },
  label: { fontFamily: FONTS.body, fontSize: 13.5, lineHeight: 19, color: COLORS.textPrimary },
  btns: { flexDirection: 'row', gap: 8 },
  btn: { minHeight: 36, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(226,194,133,0.3)', backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  btnOn: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  btnTxt: { fontFamily: FONTS.bodySemi, fontSize: 13, color: COLORS.textSecondary },
  btnTxtOn: { color: '#1E1230' },
  foot: { fontFamily: FONTS.body, fontSize: 11.5, lineHeight: 17, color: COLORS.textMuted, textAlign: 'center' },
});
