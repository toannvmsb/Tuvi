/**
 * Mount component này ở root App.tsx (chỉ trên web).
 * Lắng nghe webAlert.alert() và render modal dialog React Native thực sự
 * thay vì window.confirm() bị block trong iframe.
 */
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { webAlert, type AlertRequest } from '../lib/webAlert';
import { COLORS, FONTS, SPACING } from '../constants/theme';

export default function WebAlertHost() {
  const [req, setReq] = useState<AlertRequest | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    webAlert.setListener(setReq);
    return () => webAlert.setListener(() => {});
  }, []);

  if (Platform.OS !== 'web' || !req) return null;

  const dismiss = (btn?: typeof req.buttons[0]) => {
    setReq(null);
    btn?.onPress?.();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => dismiss()}>
      <View style={styles.backdrop}>
        <View style={styles.box}>
          <Text style={styles.title}>{req.title}</Text>
          {req.message ? <Text style={styles.message}>{req.message}</Text> : null}
          <View style={styles.btnRow}>
            {req.buttons.map((btn, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.btn, btn.style === 'cancel' && styles.btnCancel, btn.style === 'destructive' && styles.btnDestructive]}
                onPress={() => dismiss(btn)}
                activeOpacity={0.8}
              >
                <Text style={[styles.btnText, btn.style === 'cancel' && styles.btnCancelText]}>
                  {btn.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
    padding: SPACING.lg,
  },
  box: {
    width: '100%', maxWidth: 400,
    backgroundColor: COLORS.card,
    borderRadius: 14, padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border,
  },
  title: {
    color: COLORS.gold, fontSize: FONTS.size.lg, fontWeight: '800',
    marginBottom: SPACING.sm,
  },
  message: {
    color: COLORS.textPrimary, fontSize: FONTS.size.md, lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  btnRow: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap', justifyContent: 'flex-end' },
  btn: {
    backgroundColor: COLORS.gold, borderRadius: 8,
    paddingHorizontal: SPACING.lg, paddingVertical: 10, minWidth: 80, alignItems: 'center',
  },
  btnCancel: { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.border },
  btnDestructive: { backgroundColor: '#dc2626' },
  btnText: { color: '#1a0a00', fontSize: FONTS.size.md, fontWeight: '700' },
  btnCancelText: { color: COLORS.textSecondary },
});
