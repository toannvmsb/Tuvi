/**
 * Màn hình "Điều khoản sử dụng" — quy định pháp lý giữa Người dùng và Ứng dụng.
 * Nội dung lấy từ `src/data/legalContent.ts` (dùng chung với modal trong LoginScreen).
 * Cập nhật thông tin liên hệ tại CONTACT trong file đó.
 */
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import SimpleMarkdown from '../components/SimpleMarkdown';
import { COLORS, SPACING } from '../constants/theme';
import { TERMS_CONTENT } from '../data/legalContent';


export default function TermsScreen() {
  const navigation = useNavigation<any>();
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="Điều khoản sử dụng" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <SimpleMarkdown content={TERMS_CONTENT} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  card: {
    backgroundColor: COLORS.card, borderRadius: 12,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
});
