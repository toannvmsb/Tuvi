/**
 * CHÂN DUNG NGƯỜI TƯƠNG HỢP — AI vẽ ảnh dựa trên cung Phu Thê của lá số (tham khảo, giải trí).
 * Trừ xu SAU khi vẽ thành công (lỗi dịch vụ thì không mất xu).
 */
import React, { useState } from 'react';
import { View, Text, TextInput, Image, ActivityIndicator, Pressable, Modal, StyleSheet } from 'react-native';
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
import { addPortrait, listPortraits, galleryKeyOf, type SavedPortrait } from '../lib/portraitStore';
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
  const [gallery, setGallery] = useState<SavedPortrait[]>([]);
  const [viewing, setViewing] = useState<SavedPortrait | null>(null);
  const galleryKey = galleryKeyOf(result?.birthInfo.chartId);
  React.useEffect(() => { if (result) listPortraits(galleryKey).then(setGallery); }, [result, galleryKey]);

  // Mặc định giới tính người tương hợp = khác giới với chủ lá số (vẫn đổi được).
  // Ghi chú mặc định = "người [nơi sinh]" (nơi ở/nơi sinh đã gắn cho lá số, không có thì Hà Nội) —
  // giúp AI vẽ đúng vùng miền/ngoại hình thay vì ra ảnh người nước ngoài như mặc định trước đây.
  const defaulted = React.useRef(false);
  React.useEffect(() => {
    if (result && !defaulted.current) {
      defaulted.current = true;
      setGender(result.birthInfo.gender === 'nu' ? 'male' : 'female');
      setNote(`người ${result.birthInfo.birthplace?.trim() || 'Hà Nội'}`);
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
      // Tự lưu offline vào máy (mobile) + ghi vào kho "Chân dung đã vẽ" của lá số này.
      const saved = await addPortrait(galleryKey, url);
      setImageUrl(saved.uri);
      setGallery(await listPortraits(galleryKey));
    } catch (e: any) {
      // Không hiện chi tiết lỗi kỹ thuật (API/server) lên màn hình cho người dùng — chỉ log để
      // debug, còn màn hình luôn hiện 1 câu thân thiện, mời thử lại.
      if (__DEV__) console.warn('[portrait] lỗi vẽ chân dung:', e?.message);
      setError('Hệ thống chưa tạo được ảnh, mời bạn thử tạo lại.');
    } finally {
      setBusy(false);
    }
  };

  const save = async (uri: string | null = imageUrl) => {
    if (!uri) return;
    try {
      await saveImageOrDownload(uri, 'tuzi-chan-dung.png');
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
          <Text style={s.hint}>Đã điền sẵn nơi sinh để AI vẽ đúng vùng miền — anh/chị có thể sửa hoặc xóa.</Text>
        </Card>

        <GoldButton label={busy ? 'Đang vẽ…' : imageUrl ? `Vẽ lại (${cost} xu)` : `Vẽ chân dung (${cost} xu)`} onPress={busy ? undefined : run} disabled={busy} />
        {busy && (
          <View style={s.busy}><ActivityIndicator color={COLORS.gold} /><Text style={s.busyTxt}>Tuzi đang vẽ, khoảng 10–20 giây…</Text></View>
        )}
        {error && <Text style={s.error}>{error}</Text>}

        {imageUrl && (
          <Card style={{ gap: 12, padding: 12 }}>
            <Image source={{ uri: imageUrl }} style={s.img} resizeMode="cover" accessibilityLabel="Chân dung người tương hợp" />
            <OutlineButton label="Lưu ảnh vào thư viện" onPress={() => save(imageUrl)} />
          </Card>
        )}

        {/* Chân dung đã vẽ — lưu offline trên máy này, 3 ảnh mỗi hàng */}
        <Card style={{ gap: 12 }}>
          <View style={s.galHead}>
            <Text style={s.galTitle}>Chân dung đã vẽ</Text>
            <Text style={s.galCount}>{gallery.length} ảnh</Text>
          </View>
          {gallery.length === 0 ? (
            <Body size={13}>Chưa có ảnh nào. Mỗi ảnh vẽ xong sẽ tự lưu tại đây trên máy này.</Body>
          ) : (
            <View style={{ gap: 8 }}>
              {Array.from({ length: Math.ceil(gallery.length / 3) }, (_, r) => (
                <View key={r} style={s.galRow}>
                  {[0, 1, 2].map(c => {
                    const it = gallery[r * 3 + c];
                    return it ? (
                      <Pressable key={it.id} style={s.thumbWrap} onPress={() => setViewing(it)} accessibilityRole="button" accessibilityLabel="Xem ảnh chân dung đã vẽ">
                        <Image source={{ uri: it.uri }} style={s.thumb} resizeMode="cover" />
                      </Pressable>
                    ) : <View key={`e${c}`} style={s.thumbWrap} />;
                  })}
                </View>
              ))}
            </View>
          )}
          <Text style={s.galNote}>Ảnh chỉ lưu trên máy đã vẽ. Đổi máy hoặc xóa dữ liệu ứng dụng sẽ không còn ảnh.</Text>
        </Card>
      </KeyboardAwareScreen>

      <Modal visible={!!viewing} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        <View style={s.viewerBack}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setViewing(null)} accessibilityLabel="Đóng" />
          {viewing && (
            <View style={s.viewerBox}>
              <Image source={{ uri: viewing.uri }} style={s.viewerImg} resizeMode="contain" />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}><OutlineButton label="Lưu ảnh vào thư viện" onPress={() => save(viewing.uri)} /></View>
                <View style={{ flex: 1 }}><GoldButton label="Đóng" onPress={() => setViewing(null)} /></View>
              </View>
            </View>
          )}
        </View>
      </Modal>
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
  hint: { fontFamily: FONTS.body, fontSize: 11.5, lineHeight: 16, color: COLORS.textMuted, marginTop: -4 },
  busy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  busyTxt: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textSecondary },
  error: { fontFamily: FONTS.bodySemi, fontSize: 13, color: COLORS.red, textAlign: 'center' },
  img: { width: '100%', aspectRatio: 1, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)' },
  galHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  galTitle: { fontFamily: FONTS.display, fontSize: 24, color: COLORS.textPrimary },
  galCount: { fontFamily: FONTS.body, fontSize: 12.5, color: COLORS.textSecondary },
  galRow: { flexDirection: 'row', gap: 8 },
  thumbWrap: { flex: 1, aspectRatio: 1 },
  thumb: { width: '100%', height: '100%', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(226,194,133,0.24)' },
  galNote: { fontFamily: FONTS.body, fontSize: 11.5, lineHeight: 17, color: COLORS.textMuted },
  viewerBack: { flex: 1, backgroundColor: 'rgba(6,6,20,0.92)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  viewerBox: { width: '100%', maxWidth: 460, gap: 14 },
  viewerImg: { width: '100%', aspectRatio: 1, borderRadius: 16 },
});
