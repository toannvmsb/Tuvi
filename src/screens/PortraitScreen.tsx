/**
 * CHÂN DUNG NGƯỜI TƯƠNG HỢP — AI vẽ ảnh dựa trên cung Phu Thê của lá số (tham khảo, giải trí).
 * Trừ xu SAU khi vẽ thành công (lỗi dịch vụ thì không mất xu).
 */
import React, { useState } from 'react';
import { View, Text, TextInput, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import KeyboardAwareScreen from '../components/KeyboardAwareScreen';
import { COLORS, FONTS } from '../constants/theme';
import { PREMIUM, wallet, chargeAgain } from '../constants/premium';
import { Card, Body, Segmented, GoldButton, OutlineButton, Eyebrow } from '../ui';
import { useMyResult, NoChartState } from '../hooks/useMyResult';
import { generatePortrait, buildPortraitContext } from '../lib/portraitGen';
import { saveImageOrDownload } from '../lib/platform';
import { webAlert } from '../lib/webAlert';
import type { AstrologyResult } from '../types';

type PGender = 'male' | 'female';
type Hair = 'short' | 'medium' | 'long';

export default function PortraitScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const mine = useMyResult();
  const result: AstrologyResult | null = route.params?.result ?? mine.result;

  const [gender, setGender] = useState<PGender>('female');
  const [hair, setHair] = useState<Hair>('medium');
  const [age, setAge] = useState('28');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mặc định giới tính người tương hợp = khác giới với chủ lá số (vẫn đổi được).
  const defaulted = React.useRef(false);
  React.useEffect(() => {
    if (result && !defaulted.current) {
      defaulted.current = true;
      setGender(result.birthInfo.gender === 'nu' ? 'male' : 'female');
    }
  }, [result]);

  if (!result) {
    return mine.loading ? null : <NoChartState title="Cần có lá số để vẽ chân dung" />;
  }
  const cost = PREMIUM.COST.portrait;

  const run = () => {
    if (!PREMIUM.UNLOCKED && wallet.balance < cost) {
      webAlert.alert('Không đủ xu', `Cần ${cost} xu để vẽ chân dung. Số dư: ${wallet.balance} xu.`, [
        { text: 'Để sau', style: 'cancel' },
        { text: 'Nạp xu', onPress: () => navigation.navigate('Wallet') },
      ]);
      return;
    }
    webAlert.alert(
      'Vẽ chân dung',
      `Tuzi sẽ vẽ chân dung người tương hợp và trừ ${cost} xu khi vẽ xong (lỗi thì không trừ). Số dư: ${wallet.balance} xu.`,
      [
        { text: 'Để sau', style: 'cancel' },
        { text: `Đồng ý (${cost} xu)`, onPress: () => { void doGenerate(); } },
      ],
    );
  };

  const doGenerate = async () => {
    setBusy(true); setError(null);
    try {
      const url = await generatePortrait({
        sessionId: result.birthInfo.chartId,
        compatibilityContext: buildPortraitContext(result),
        ageWanted: Math.min(80, Math.max(18, parseInt(age, 10) || 28)),
        gender, hairLength: hair, note: note.trim() || undefined,
      });
      chargeAgain(`portrait:${Date.now()}`, 'ai', cost);
      setImageUrl(url);
    } catch (e: any) {
      setError(e?.message || 'Không vẽ được chân dung, vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!imageUrl) return;
    try {
      await saveImageOrDownload(imageUrl, 'tuzi-chan-dung.png');
      webAlert.alert('Đã lưu', 'Ảnh đã được lưu.');
    } catch (e: any) {
      webAlert.alert('Chưa lưu được', e?.message || 'Vui lòng thử lại.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScreenHeader title="Chân dung tương hợp" onBack={() => navigation.goBack()} />
      <KeyboardAwareScreen contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Card hero style={{ gap: 8 }}>
          <Eyebrow>Từ cung Phu Thê</Eyebrow>
          <Body>Dựa trên các sao tọa thủ cung Phu Thê trong lá số, AI gợi ý gương mặt của người bạn đời/đối tác tương hợp. Đây chỉ là hình minh họa mang tính tham khảo.</Body>
        </Card>

        <Card style={{ gap: 14 }}>
          <Text style={s.label}>Giới tính người tương hợp</Text>
          <Segmented<PGender> options={[{ value: 'female', label: 'Nữ' }, { value: 'male', label: 'Nam' }]} value={gender} onChange={setGender} />
          <Text style={s.label}>Kiểu tóc</Text>
          <Segmented<Hair> options={[{ value: 'short', label: 'Ngắn' }, { value: 'medium', label: 'Vừa' }, { value: 'long', label: 'Dài' }]} value={hair} onChange={setHair} />
          <Text style={s.label}>Độ tuổi mong muốn</Text>
          <TextInput style={s.input} value={age} onChangeText={t => setAge(t.replace(/[^0-9]/g, '').slice(0, 2))} keyboardType="number-pad" placeholder="28" placeholderTextColor={COLORS.textMuted} />
          <Text style={s.label}>Ghi chú thêm (không bắt buộc)</Text>
          <TextInput style={[s.input, { minHeight: 64 }]} value={note} onChangeText={setNote} multiline maxLength={200}
            placeholder="Ví dụ: đeo kính, nụ cười hiền…" placeholderTextColor={COLORS.textMuted} />
        </Card>

        <GoldButton label={busy ? 'Đang vẽ…' : imageUrl ? `Vẽ lại (${cost} xu)` : `Vẽ chân dung (${cost} xu)`} onPress={busy ? undefined : run} disabled={busy} />
        {busy && (
          <View style={s.busy}><ActivityIndicator color={COLORS.gold} /><Text style={s.busyTxt}>Tuzi đang vẽ, khoảng 10–20 giây…</Text></View>
        )}
        {error && <Text style={s.error}>{error}</Text>}

        {imageUrl && (
          <Card style={{ gap: 12, padding: 12 }}>
            <Image source={{ uri: imageUrl }} style={s.img} resizeMode="cover" accessibilityLabel="Chân dung người tương hợp" />
            <OutlineButton label="Lưu ảnh" onPress={save} />
          </Card>
        )}
      </KeyboardAwareScreen>
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { padding: 16, gap: 14, paddingBottom: 48 },
  label: { fontFamily: FONTS.bodySemi, fontSize: 14, color: COLORS.textPrimary },
  input: {
    minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(226,194,133,0.28)', backgroundColor: 'rgba(255,255,255,0.06)',
    color: COLORS.textPrimary, paddingHorizontal: 14, paddingVertical: 10, fontFamily: FONTS.body, fontSize: 15,
  },
  busy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  busyTxt: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textSecondary },
  error: { fontFamily: FONTS.bodySemi, fontSize: 13, color: COLORS.red, textAlign: 'center' },
  img: { width: '100%', aspectRatio: 1, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)' },
});
