/**
 * Wrapper giới hạn chiều rộng nội dung trên web desktop.
 * Trên mobile: không có effect (pass-through).
 * Trên web: căn giữa + max-width 480px để dễ đọc trên màn hình rộng.
 */
import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';

interface Props {
  children: React.ReactNode;
  maxWidth?: number;
}

export default function WebContainer({ children, maxWidth = 480 }: Props) {
  if (Platform.OS !== 'web') return <>{children}</>;
  return (
    <View style={styles.outer}>
      <View style={[styles.inner, { maxWidth }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, alignItems: 'center', width: '100%' },
  inner: { flex: 1, width: '100%' },
});
