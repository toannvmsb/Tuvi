/**
 * Trình xem ảnh trong ứng dụng — phóng to bằng cử chỉ (pinch), kéo di chuyển,
 * chạm 2 lần để reset. Dùng react-native-gesture-handler (đã có sẵn) + Animated,
 * không cần thêm package.
 */

import React, { useRef } from 'react';
import {
  Modal, View, StyleSheet, TouchableOpacity, Text, Animated, Dimensions,
} from 'react-native';
import {
  PinchGestureHandler, PanGestureHandler, TapGestureHandler, State,
} from 'react-native-gesture-handler';
import { COLORS, FONTS, SPACING } from '../constants/theme';

interface Props {
  visible: boolean;
  uri: string | null;
  onClose: () => void;
  onShare?: () => void;
  /** Bấm "Lưu ảnh" — chủ động lưu vào thư viện */
  onSave?: () => void;
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const MAX_SCALE = 5;
const MIN_SCALE = 1;

export default function ImageViewerModal({ visible, uri, onClose, onShare, onSave }: Props) {
  const pinchRef = useRef(null);
  const panRef = useRef(null);
  const doubleTapRef = useRef(null);

  const baseScale = useRef(new Animated.Value(1)).current;
  const pinchScale = useRef(new Animated.Value(1)).current;
  const scale = Animated.multiply(baseScale, pinchScale);
  const curScale = useRef(1);

  const transX = useRef(new Animated.Value(0)).current;
  const transY = useRef(new Animated.Value(0)).current;
  const offset = useRef({ x: 0, y: 0 });

  const reset = () => {
    curScale.current = 1;
    offset.current = { x: 0, y: 0 };
    Animated.parallel([
      Animated.spring(baseScale, { toValue: 1, useNativeDriver: true }),
      Animated.spring(pinchScale, { toValue: 1, useNativeDriver: true }),
      Animated.spring(transX, { toValue: 0, useNativeDriver: true }),
      Animated.spring(transY, { toValue: 0, useNativeDriver: true }),
    ]).start(() => {
      transX.setOffset(0); transX.setValue(0);
      transY.setOffset(0); transY.setValue(0);
    });
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const onPinchEvent = Animated.event(
    [{ nativeEvent: { scale: pinchScale } }],
    { useNativeDriver: true },
  );

  const onPinchStateChange = (e: any) => {
    if (e.nativeEvent.oldState === State.ACTIVE) {
      let next = curScale.current * e.nativeEvent.scale;
      if (next < MIN_SCALE) next = MIN_SCALE;
      if (next > MAX_SCALE) next = MAX_SCALE;
      curScale.current = next;
      baseScale.setValue(next);
      pinchScale.setValue(1);
      if (next === MIN_SCALE) {
        offset.current = { x: 0, y: 0 };
        transX.setOffset(0); transX.setValue(0);
        transY.setOffset(0); transY.setValue(0);
      }
    }
  };

  const onPanEvent = Animated.event(
    [{ nativeEvent: { translationX: transX, translationY: transY } }],
    { useNativeDriver: true },
  );

  const onPanStateChange = (e: any) => {
    if (e.nativeEvent.oldState === State.ACTIVE) {
      offset.current.x += e.nativeEvent.translationX;
      offset.current.y += e.nativeEvent.translationY;
      transX.setOffset(offset.current.x); transX.setValue(0);
      transY.setOffset(offset.current.y); transY.setValue(0);
    }
  };

  const onDoubleTap = (e: any) => {
    if (e.nativeEvent.state === State.ACTIVE) {
      if (curScale.current > 1) {
        reset();
      } else {
        curScale.current = 2.5;
        Animated.spring(baseScale, { toValue: 2.5, useNativeDriver: true }).start();
      }
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Text style={styles.hint}>Chụm 2 ngón để phóng to · chạm 2 lần để reset</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Zoomable image */}
        {uri ? (
          <PanGestureHandler
            ref={panRef}
            minPointers={1}
            maxPointers={2}
            avgTouches
            onGestureEvent={onPanEvent}
            onHandlerStateChange={onPanStateChange}
            simultaneousHandlers={[pinchRef]}
          >
            <Animated.View style={styles.center}>
              <PinchGestureHandler
                ref={pinchRef}
                onGestureEvent={onPinchEvent}
                onHandlerStateChange={onPinchStateChange}
                simultaneousHandlers={[panRef]}
              >
                <Animated.View>
                  <TapGestureHandler
                    ref={doubleTapRef}
                    numberOfTaps={2}
                    onHandlerStateChange={onDoubleTap}
                  >
                    <Animated.Image
                      source={{ uri }}
                      resizeMode="contain"
                      style={[
                        styles.image,
                        { transform: [{ translateX: transX }, { translateY: transY }, { scale }] },
                      ]}
                    />
                  </TapGestureHandler>
                </Animated.View>
              </PinchGestureHandler>
            </Animated.View>
          </PanGestureHandler>
        ) : null}

        {/* Bottom actions */}
        <View style={styles.bottomBar}>
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
          <TouchableOpacity style={[styles.actionBtn, styles.actionPrimary]} onPress={handleClose}>
            <Text style={[styles.actionText, { color: '#1a0a00' }]}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
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
