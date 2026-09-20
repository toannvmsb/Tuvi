/**
 * Chọn nơi ở / nơi sinh: chip địa điểm thường gặp + ô tìm (Open-Meteo geocoding).
 * Địa điểm này dùng để lấy thời tiết khi gắn lá số; không chọn → mặc định Hà Nội.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../constants/theme';
import { QUICK_PLACES, searchPlaces, type Place } from '../lib/weather';

export default function PlacePicker({ value, onChange }: { value: Place | null; onChange: (p: Place | null) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    setBusy(true);
    const t = setTimeout(async () => {
      setResults(await searchPlaces(q));
      setBusy(false);
    }, 400);
    return () => clearTimeout(t);
  }, [q]);

  const pick = (p: Place) => { onChange(p); setQ(''); setResults([]); };

  return (
    <View style={{ gap: 10 }}>
      {value && (
        <View style={s.selected}>
          <Text style={s.selectedTxt} numberOfLines={1}>📍 {value.name}</Text>
          <Pressable onPress={() => onChange(null)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Bỏ chọn địa điểm">
            <Text style={s.clear}>✕</Text>
          </Pressable>
        </View>
      )}
      <View style={s.chips}>
        {QUICK_PLACES.map(p => {
          const on = value?.name === p.name;
          return (
            <Pressable key={p.name} onPress={() => pick(p)} style={[s.chip, on && s.chipOn]} accessibilityRole="button">
              <Text style={[s.chipTxt, on && s.chipTxtOn]}>{p.name}</Text>
            </Pressable>
          );
        })}
      </View>
      <TextInput
        style={s.input} value={q} onChangeText={setQ}
        placeholder="Tìm tỉnh / thành phố khác…" placeholderTextColor={COLORS.textMuted}
        autoCorrect={false}
      />
      {busy && <Text style={s.hint}>Đang tìm…</Text>}
      {results.map((p, i) => (
        <Pressable key={`${p.name}${i}`} onPress={() => pick(p)} style={s.result} accessibilityRole="button">
          <Text style={s.resultTxt}>{p.name}</Text>
        </Pressable>
      ))}
      {!busy && q.trim().length >= 2 && results.length === 0 && <Text style={s.hint}>Không tìm thấy địa điểm phù hợp.</Text>}
      <Text style={s.hint}>Dùng để hiển thị thời tiết. Không chọn thì Tuzi lấy Hà Nội.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  selected: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    padding: 12, borderRadius: 14, backgroundColor: 'rgba(226,194,133,0.12)', borderWidth: 1, borderColor: 'rgba(226,194,133,0.4)',
  },
  selectedTxt: { flex: 1, fontFamily: FONTS.bodySemi, fontSize: 14, color: COLORS.textPrimary },
  clear: { fontSize: 16, color: COLORS.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 40, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(226,194,133,0.25)', backgroundColor: 'rgba(255,255,255,0.05)' },
  chipOn: { borderColor: COLORS.gold, backgroundColor: 'rgba(226,194,133,0.18)' },
  chipTxt: { fontFamily: FONTS.bodySemi, fontSize: 13, color: COLORS.textSecondary },
  chipTxtOn: { color: COLORS.goldLight },
  input: {
    minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(226,194,133,0.28)', backgroundColor: 'rgba(255,255,255,0.06)',
    color: COLORS.textPrimary, paddingHorizontal: 14, fontFamily: FONTS.body, fontSize: 14.5,
  },
  result: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(226,194,133,0.16)' },
  resultTxt: { fontFamily: FONTS.body, fontSize: 14, color: COLORS.textPrimary },
  hint: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted },
});
