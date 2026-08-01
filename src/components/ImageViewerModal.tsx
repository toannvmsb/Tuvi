/**
 * Trình xem ảnh — pinch-to-zoom.
 * iOS: ScrollView.maximumZoomScale (native, smooth).
 * Android: Animated + PanResponder (không cần thư viện ngoài).
 * Web: scroll view đơn giản.
 */

import React, { useRef } from 'react';
import {
  Modal, View, StyleSheet, TouchableOpacity, Text, Dimensions, Platform,
  ScrollView, Image, Animated,
} from 'react-native';
import { PinchGestureHandler, PanGestureHandler, State, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING } from '../constants/theme';

interface Props {
  visible: boolean;
  uri: string | null;
  onClose: () => void;
  onShare?: () => void;
  onSave?: () => void;
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

/** Pinch-to-zoom + pan cho Android dùng react-native-gesture-handler. */
function AndroidZoomImage({ uri }: { uri: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const savedScale = useRef(1);
  const savedTx = useRef(0);
  const savedTy = useRef(0);

  const pinchRef = useRef<PinchGestureHandler>(null);
  const panRef = useRef<PanGestureHandler>(null);

  const onPinchEvent = (e: any) => {
    const next = Math.max(1, Math.min(5, savedScale.current * e.nativeEvent.scale));
    scale.setValue(next);
    if (next <= 1) {
      translateX.setValue(0); translateY.setValue(0);
      savedTx.current = 0; savedTy.current = 0;
    }
  };

  const onPinchStateChange = (e: any) => {
    if (e.nativeEvent.oldState === State.ACTIVE) {
      savedScale.current = Math.max(1, Math.min(5, savedScale.current * e.nativeEvent.scale));
      if (savedScale.current <= 1) {
        savedScale.current = 1;
        translateX.setValue(0); translateY.setValue(0);
        savedTx.current = 0; savedTy.current = 0;
      }
    }
  };

  const onPanEvent = (e: any) => {
    if (savedScale.current <= 1) return;
    const maxX = (SCREEN_W * (savedScale.current - 1)) / 2;
    const maxY = (SCREEN_H * 0.72 * (savedScale.current - 1)) / 2;
    const nx = Math.max(-maxX, Math.min(maxX, savedTx.current + e.nativeEvent.translationX));
    const ny = Math.max(-maxY, Math.min(maxY, savedTy.current + e.nativeEvent.translationY));
    translateX.setValue(nx);
    translateY.setValue(ny);
  };

  const onPanStateChange = (e: any) => {
    if (e.nativeEvent.oldState === State.ACTIVE) {
      const maxX = (SCREEN_W * (savedScale.current - 1)) / 2;
      const maxY = (SCREEN_H * 0.72 * (savedScale.current - 1)) / 2;
      savedTx.current = Math.max(-maxX, Math.min(maxX, savedTx.current + e.nativeEvent.translationX));
      savedTy.current = Math.max(-maxY, Math.min(maxY, savedTy.current + e.nativeEvent.translationY));
    }
  };

  return (
    <PanGestureHandler ref={panRef} onGestureEvent={onPanEvent} onHandlerStateChange={onPanStateChange} simultaneousHandlers={pinchRef} minPointers={1} maxPointers={1}>
      <Animated.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <PinchGestureHandler ref={pinchRef} onGestureEvent={onPinchEvent} onHandlerStateChange={onPinchStateChange} simultaneousHandlers={panRef}>
          <Animated.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Animated.Image
              source={{ uri }}
              resizeMode="contain"
              style={[styles.image, { transform: [{ scale }, { translateX }, { translateY }] }]}
            />
          </Animated.View>
        </PinchGestureHandler>
      </Animated.View>
    </PanGestureHandler>
  );
}

export default function ImageViewerModal({ visible, uri, onClose, onShare, onSave }: Props) {
  const insets = useSafeAreaInsets();
  const hint = Platform.OS === 'web'
    ? 'Cuộn để xem ảnh · nhấn Đóng khi xong'
    : 'Chụm 2 ngón để phóng to · bung ra để thu nhỏ';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.backdrop}>
        <View style={styles.topBar}>
          <Text style={styles.hint}>{hint}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* iOS: ScrollView native zoom. Android: Animated pinch. Web: đơn giản. */}
        {Platform.OS === 'ios' ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            maximumZoomScale={5}
            minimumZoomScale={1}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            centerContent
            bouncesZoom
          >
            {uri ? <Image source={{ uri }} resizeMode="contain" style={styles.image} /> : null}
          </ScrollView>
        ) : Platform.OS === 'android' ? (
          <View style={styles.androidContainer}>
            {uri ? <AndroidZoomImage uri={uri} /> : null}
          </View>
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
            {uri ? <Image source={{ uri }} resizeMode="contain" style={styles.image} /> : null}
          </ScrollView>
        )}

        <View style={[styles.bottomBar, { paddingBottom: SPACING.lg + insets.bottom }]}>
          {onSave ? (
            <TouchableOpacity style={[styles.actionBtn, styles.actionSave]} onPress={onSave}>
              <Text style={styles.actionText}>💾 Lưu ảnh</Text>
            </TouchableOpacity>
          ) : null}
          {onShare ? (
            <TouchableOpacity style={styles.actionBtn} onPress={onShare}>
              <Text style={styles.actionText}>📤 Chia sẻ</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={[styles.actionBtn, styles.actionPrimary]} onPress={onClose}>
            <Text style={[styles.actionText, { color: '#1a0a00' }]}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingTop: SPACING.xl, paddingBottom: SPACING.sm,
  },
  hint: { color: '#cbd5e1', fontSize: FONTS.size.xs, flex: 1 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeText: { color: '#fff', fontSize: 20, fontWeight: '700', lineHeight: 22 },
  scrollContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  androidContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  image: { width: SCREEN_W, height: SCREEN_H * 0.72 },
  bottomBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.md, padding: SPACING.lg, flexWrap: 'wrap',
  },
  actionBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
  },
  actionSave: { backgroundColor: 'rgba(34,197,94,0.6)' },
  actionPrimary: { backgroundColor: COLORS.gold },
  actionText: { color: '#fff', fontSize: FONTS.size.md, fontWeight: '700' },
});
