import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, Switch, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import ScreenHeader from '../components/ScreenHeader';
import KeyboardAwareScreen from '../components/KeyboardAwareScreen';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { t, setLanguage, getCurrentLanguage, Language } from '../i18n';
import { testApiConnection } from '../api/claudeApi';

type AIProvider = 'auto' | 'claude' | 'openai';

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const [apiKey, setApiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [provider, setProvider] = useState<AIProvider>('auto');
  const [lang, setLang] = useState<Language>(getCurrentLanguage());
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);

  async function handleTest() {
    if (!apiKey.trim()) {
      Alert.alert('Thiếu API key', 'Vui lòng nhập API key Claude trước khi kiểm tra');
      return;
    }
    setTesting(true);
    setTestResult(null);
    const r = await testApiConnection(apiKey.trim());
    setTestResult(r);
    setTesting(false);
  }

  async function handleTestOpenAI() {
    if (!openaiKey.trim()) {
      Alert.alert('Thiếu API key', 'Vui lòng nhập API key OpenAI trước khi kiểm tra');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { authorization: `Bearer ${openaiKey.trim()}` },
      });
      if (res.ok) setTestResult({ ok: true });
      else if (res.status === 401 || res.status === 403) setTestResult({ ok: false, error: 'Key không hợp lệ / không có quyền' });
      else if (res.status === 429) setTestResult({ ok: false, error: 'Hết định mức / rate limit' });
      else setTestResult({ ok: false, error: `HTTP ${res.status}` });
    } catch (e: any) {
      setTestResult({ ok: false, error: e?.message || 'Lỗi mạng' });
    }
    setTesting(false);
  }

  useEffect(() => {
    // Claude key
    SecureStore.getItemAsync('anthropicApiKey').then(k => {
      if (k) setApiKey(k);
    }).catch(() => {
      AsyncStorage.getItem('anthropicApiKey').then(k => { if (k) setApiKey(k); });
    });
    // OpenAI key
    SecureStore.getItemAsync('openaiApiKey').then(k => {
      if (k) setOpenaiKey(k);
    }).catch(() => {
      AsyncStorage.getItem('openaiApiKey').then(k => { if (k) setOpenaiKey(k); });
    });
    // Provider preference (chỉ lưu AsyncStorage — không nhạy cảm)
    AsyncStorage.getItem('aiProvider').then(p => {
      if (p === 'auto' || p === 'claude' || p === 'openai') setProvider(p);
    });
  }, []);

  async function handleSave() {
    // Claude key — chỉ lưu SecureStore (mã hoá phần cứng). Không dùng AsyncStorage cho key nhạy cảm.
    try { await SecureStore.setItemAsync('anthropicApiKey', apiKey.trim()); } catch {}
    // OpenAI key
    try { await SecureStore.setItemAsync('openaiApiKey', openaiKey.trim()); } catch {}
    // AI provider — duplicate cho cả AsyncStorage (InputScreen đọc từ đây)
    await AsyncStorage.setItem('aiProvider', provider);
    setLanguage(lang);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    Alert.alert('✓', 'Đã lưu cài đặt');
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title={t('settingsTitle')} onBack={() => navigation.goBack()} />
      <KeyboardAwareScreen contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* AI Provider preference */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⚙ Ưu tiên nhà cung cấp AI</Text>
          <Text style={styles.desc}>
            Khi có cả 2 API key, ứng dụng sẽ dùng nhà cung cấp được ưu tiên trước; lỗi mới fallback nhà cung cấp còn lại, cuối cùng đến model miễn phí.
          </Text>
          <View style={styles.langRow}>
            {([
              { v: 'auto', label: '🎯 Tự động' },
              { v: 'claude', label: '🟣 Claude' },
              { v: 'openai', label: '🟢 OpenAI' },
            ] as { v: AIProvider; label: string }[]).map(opt => (
              <TouchableOpacity
                key={opt.v}
                style={[styles.langBtn, provider === opt.v && styles.langBtnActive]}
                onPress={() => setProvider(opt.v)}
              >
                <Text style={[styles.langBtnText, provider === opt.v && styles.langBtnTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Claude API Key */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🟣 API Key Claude (Anthropic)</Text>
          <Text style={styles.desc}>Chất lượng tiếng Việt rất tốt, ổn định. Lấy key tại console.anthropic.com.</Text>
          <TextInput
            style={styles.input}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="sk-ant-..."
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.testBtn, testing && { opacity: 0.5 }]}
            onPress={handleTest}
            disabled={testing}
          >
            <Text style={styles.testBtnText}>
              {testing ? '⏳ Đang kiểm tra...' : '🔌 Test Claude'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* OpenAI API Key */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🟢 API Key OpenAI (ChatGPT)</Text>
          <Text style={styles.desc}>
            Dùng GPT-4o-mini (rẻ ~$0.15/M token) hoặc GPT-3.5-turbo. Lấy key tại platform.openai.com/api-keys.
          </Text>
          <TextInput
            style={styles.input}
            value={openaiKey}
            onChangeText={setOpenaiKey}
            placeholder="sk-..."
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.testBtn, testing && { opacity: 0.5 }]}
            onPress={handleTestOpenAI}
            disabled={testing}
          >
            <Text style={styles.testBtnText}>
              {testing ? '⏳ Đang kiểm tra...' : '🔌 Test OpenAI'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.hint}>
            Key chỉ lưu trên thiết bị của bạn, không gửi đi đâu khác.
          </Text>
          {testResult && (
            <Text style={[styles.testResult, { color: testResult.ok ? '#33aa66' : '#cc4444' }]}>
              {testResult.ok ? '✓ Kết nối OK — API key hợp lệ' : `✗ ${testResult.error}`}
            </Text>
          )}
        </View>

        {/* Language */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🌐 {t('language')}</Text>
          <View style={styles.langRow}>
            {(['vi', 'en'] as Language[]).map(l => (
              <TouchableOpacity
                key={l}
                style={[styles.langBtn, lang === l && styles.langBtnActive]}
                onPress={() => setLang(l)}
              >
                <Text style={[styles.langBtnText, lang === l && styles.langBtnTextActive]}>
                  {l === 'vi' ? '🇻🇳 Tiếng Việt' : '🇺🇸 English'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* About */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ℹ️ Về ứng dụng</Text>
          <Text style={styles.desc}>
            Tuzi — Trợ lý thông minh của bạn{'\n'}
            Phương pháp tính theo Tử Vi Nam Phái{'\n'}
            của thầy Lê Quang Lăng.{'\n\n'}
            Phân tích AI sử dụng Claude Sonnet 4.5{'\n'}
            của Anthropic.
          </Text>
        </View>

        {/* Save button */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>{saved ? '✓ Đã lưu' : `💾 ${t('save')}`}</Text>
        </TouchableOpacity>
      </KeyboardAwareScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: {
    padding: SPACING.lg, gap: SPACING.md,
    paddingBottom: Platform.OS === 'web' ? 300 : SPACING.xxl,
  },
  card: {
    backgroundColor: COLORS.card, borderRadius: 12,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  cardTitle: { color: COLORS.gold, fontSize: FONTS.size.md, fontWeight: '600' },
  desc: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, lineHeight: 20 },
  input: {
    backgroundColor: COLORS.surface, color: COLORS.textPrimary,
    borderRadius: 8, padding: SPACING.sm, fontSize: FONTS.size.sm,
    borderWidth: 1, borderColor: COLORS.border, fontFamily: 'monospace',
  },
  hint: { color: COLORS.textMuted, fontSize: FONTS.size.xs, lineHeight: 18 },
  langRow: { flexDirection: 'row', gap: SPACING.sm },
  langBtn: {
    flex: 1, padding: SPACING.sm, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  langBtnActive: { backgroundColor: COLORS.gold + '22', borderColor: COLORS.gold },
  langBtnText: { color: COLORS.textSecondary, fontSize: FONTS.size.sm },
  langBtnTextActive: { color: COLORS.gold, fontWeight: '600' },
  saveBtn: {
    backgroundColor: COLORS.gold, borderRadius: 12,
    padding: SPACING.lg, alignItems: 'center',
  },
  saveBtnText: { fontSize: FONTS.size.lg, fontWeight: 'bold', color: '#1a0a00' },
  testBtn: {
    backgroundColor: COLORS.surface, borderRadius: 8,
    padding: SPACING.sm, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  testBtnText: { color: COLORS.gold, fontWeight: '600', fontSize: FONTS.size.sm },
  testResult: { fontSize: FONTS.size.xs, marginTop: 4, lineHeight: 18 },
});
