import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable,
  Alert,
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
import { Card, Body, Segmented, GoldButton, OutlineButton } from '../ui';
import Icon from '../ui/Icon';

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

  const [showKeys, setShowKeys] = useState(false);

  const keyField = (label: string, hint: string, value: string, set: (v: string) => void, ph: string, onTest: () => void, testLabel: string) => (
    <View style={{ gap: 8 }}>
      <Text style={sx.fieldLabel}>{label}</Text>
      <Text style={sx.hint}>{hint}</Text>
      <TextInput
        style={sx.input} value={value} onChangeText={set} placeholder={ph}
        placeholderTextColor={COLORS.textMuted} secureTextEntry autoCapitalize="none" autoCorrect={false}
      />
      <OutlineButton label={testing ? 'Đang kiểm tra…' : testLabel} onPress={onTest} style={testing ? { opacity: 0.5 } : undefined} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScreenHeader title={t('settingsTitle')} onBack={() => navigation.goBack()} />
      <KeyboardAwareScreen contentContainerStyle={sx.scroll} keyboardShouldPersistTaps="handled">
        {/* Giao diện */}
        <Text style={sx.groupTitle}>GIAO DIỆN</Text>
        <Card style={{ gap: 10 }}>
          <Text style={sx.fieldLabel}>{t('language')}</Text>
          <Segmented<Language>
            options={[{ value: 'vi', label: 'Tiếng Việt' }, { value: 'en', label: 'English' }]}
            value={lang} onChange={setLang}
          />
          <Text style={sx.hint}>Tuzi được thiết kế cho nền tối nên không có chế độ sáng.</Text>
        </Card>

        {/* Trợ lý AI */}
        <Text style={sx.groupTitle}>TRỢ LÝ AI</Text>
        <Card style={{ gap: 12 }}>
          <Text style={sx.fieldLabel}>Nhà cung cấp ưu tiên</Text>
          <Segmented<AIProvider>
            options={[{ value: 'auto', label: 'Tự động' }, { value: 'claude', label: 'Claude' }, { value: 'openai', label: 'OpenAI' }]}
            value={provider} onChange={setProvider}
          />
          <Text style={sx.hint}>
            Tự động: Tuzi chọn nguồn tốt nhất cho câu trả lời. Khi lỗi sẽ chuyển sang nhà cung cấp còn lại, cuối cùng là mô hình miễn phí.
          </Text>
        </Card>

        <Pressable style={sx.advRow} onPress={() => setShowKeys(v => !v)} accessibilityRole="button" accessibilityState={{ expanded: showKeys }}>
          <View style={{ flex: 1 }}>
            <Text style={sx.advTitle}>Dùng khóa API riêng</Text>
            <Text style={sx.hint}>Nâng cao, không bắt buộc. Khóa chỉ lưu trên thiết bị của bạn.</Text>
          </View>
          <Icon name="chev" size={18} color={COLORS.textMuted} />
        </Pressable>
        {showKeys && (
          <Card style={{ gap: 16 }}>
            {keyField('API Key Claude (Anthropic)', 'Chất lượng tiếng Việt rất tốt, ổn định. Lấy key tại console.anthropic.com.', apiKey, setApiKey, 'sk-ant-...', handleTest, 'Kiểm tra Claude')}
            {keyField('API Key OpenAI', 'Dùng GPT-4o-mini hoặc GPT-3.5-turbo. Lấy key tại platform.openai.com/api-keys.', openaiKey, setOpenaiKey, 'sk-...', handleTestOpenAI, 'Kiểm tra OpenAI')}
            {testResult && (
              <Text style={[sx.testResult, { color: testResult.ok ? COLORS.green : COLORS.red }]}>
                {testResult.ok ? 'Kết nối OK — API key hợp lệ' : testResult.error}
              </Text>
            )}
          </Card>
        )}

        {/* Về ứng dụng */}
        <Text style={sx.groupTitle}>VỀ ỨNG DỤNG</Text>
        <Card>
          <Body>
            {'Tuzi — Trợ lý thông minh của bạn\nPhương pháp tính theo Tử Vi Nam Phái của thầy Lê Quang Lăng.\n\nPhân tích AI sử dụng Claude Sonnet 4.5 của Anthropic.'}
          </Body>
        </Card>

        <GoldButton label={saved ? 'Đã lưu' : t('save')} onPress={handleSave} />
      </KeyboardAwareScreen>
    </View>
  );
}

const sx = StyleSheet.create({
  scroll: { padding: 16, gap: 12, paddingBottom: 48 },
  groupTitle: { fontFamily: FONTS.bodySemi, fontSize: 11, letterSpacing: 1.8, color: COLORS.textMuted, marginTop: 8, paddingHorizontal: 4 },
  fieldLabel: { fontFamily: FONTS.bodySemi, fontSize: 14.5, color: COLORS.textPrimary },
  hint: { fontFamily: FONTS.body, fontSize: 12.5, lineHeight: 18, color: COLORS.textSecondary },
  input: {
    minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(226,194,133,0.28)', backgroundColor: 'rgba(255,255,255,0.06)',
    color: COLORS.textPrimary, paddingHorizontal: 16, fontFamily: FONTS.body, fontSize: 15,
  },
  advRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, padding: 14, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(226,194,133,0.18)',
  },
  advTitle: { fontFamily: FONTS.bodySemi, fontSize: 14.5, color: COLORS.textPrimary },
  testResult: { fontFamily: FONTS.bodySemi, fontSize: 13 },
});
