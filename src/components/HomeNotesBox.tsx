/**
 * Khối Ghi chú ở Tổng quan: 3 ghi chú gần nhất + ô nhập nhanh. Bấm vào tiêu đề hoặc 1 ghi chú → màn Ghi chú.
 * Cần đăng nhập (ghi chú lưu trên Supabase); lỗi/offline → báo nhẹ, không làm hỏng màn chính.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { COLORS, FONTS } from '../constants/theme';
import { Card, Body, SectionTitle } from '../ui';
import Icon from '../ui/Icon';
import { listLifeNotes, createLifeNote, type LifeNote } from '../lib/lifeNotes';

const toISO = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const fmtDate = (iso: string) => {
  const [, m, d] = iso.split('-');
  return `${Number(d)}/${Number(m)}`;
};

export default function HomeNotesBox() {
  const navigation = useNavigation<any>();
  const [notes, setNotes] = useState<LifeNote[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      setNotes(await listLifeNotes(3));
      setErr('');
    } catch {
      setErr('Chưa tải được ghi chú (cần đăng nhập và có mạng).');
    } finally {
      setLoaded(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const save = async () => {
    const content = text.trim();
    if (!content || busy) return;
    setBusy(true); setErr('');
    try {
      await createLifeNote({ content, noteDate: toISO(new Date()) });
      setText('');
      await load();
    } catch (e: any) {
      setErr(e?.message || 'Không lưu được ghi chú.');
    } finally {
      setBusy(false);
    }
  };

  const open = () => navigation.navigate('Notes');

  return (
    <Card style={{ gap: 12 }}>
      <Pressable onPress={open} accessibilityRole="button" accessibilityLabel="Mở màn Ghi chú">
        <SectionTitle title="Ghi chú" right={<Icon name="chev" size={18} color={COLORS.gold} />} />
      </Pressable>

      {notes.map(n => (
        <Pressable key={n.id} onPress={open} style={s.item} accessibilityRole="button">
          <Text style={s.date}>{fmtDate(n.note_date)}</Text>
          <Text style={s.content} numberOfLines={2}>{n.content}</Text>
        </Pressable>
      ))}
      {loaded && !err && notes.length === 0 && <Body size={13}>Chưa có ghi chú nào. Viết điều bạn muốn nhớ ngay bên dưới.</Body>}

      <View style={s.inputRow}>
        <TextInput
          style={s.input} value={text} onChangeText={setText}
          placeholder="Ghi nhanh điều cần nhớ…" placeholderTextColor={COLORS.textMuted}
          returnKeyType="send" onSubmitEditing={save} blurOnSubmit={false} maxLength={500}
        />
        <Pressable
          onPress={save} disabled={!text.trim() || busy}
          style={[s.saveBtn, (!text.trim() || busy) && { opacity: 0.45 }]}
          accessibilityRole="button" accessibilityLabel="Lưu ghi chú"
        >
          <Icon name="check" size={22} color="#1E1230" strokeWidth={2.4} />
        </Pressable>
      </View>
      {!!err && <Text style={s.err}>{err}</Text>}
    </Card>
  );
}

const s = StyleSheet.create({
  item: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 10, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(226,194,133,0.14)',
  },
  date: { fontFamily: FONTS.bodySemi, fontSize: 12, color: COLORS.gold, minWidth: 34, marginTop: 1 },
  content: { flex: 1, fontFamily: FONTS.body, fontSize: 13.5, lineHeight: 19, color: COLORS.textPrimary },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(226,194,133,0.28)', backgroundColor: 'rgba(255,255,255,0.06)',
    color: COLORS.textPrimary, paddingHorizontal: 14, fontFamily: FONTS.body, fontSize: 14.5,
  },
  saveBtn: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.gold },
  err: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.red },
});
