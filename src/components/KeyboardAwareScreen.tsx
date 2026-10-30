/**
 * Màn hình cuộn có ô nhập liệu — tự tránh bàn phím. Thay cho tổ hợp
 * KeyboardAvoidingView + ScrollView tự viết tay, vốn qua nhiều lần sửa vẫn còn
 * lỗi trên NATIVE (Android: bàn phím che ô nhập vì ScrollView không tự cuộn
 * ô đang gõ vào khung nhìn; iOS: thừa khoảng trống phía trên bàn phím do
 * `keyboardVerticalOffset` cộng dồn với phần padding ScreenHeader đã tự đo).
 *
 * - NATIVE (iOS/Android): dùng `KeyboardAwareScrollView` (react-native-keyboard-
 *   aware-scroll-view) — tự đo & cuộn CHÍNH XÁC ô đang gõ lên trên bàn phím trên
 *   cả 2 nền tảng, và tự bỏ khoảng đệm khi bàn phím đóng lại (không để lại
 *   khoảng trống thừa như cách cộng cứng `paddingBottom` trước đây).
 * - WEB: GIỮ NGUYÊN KeyboardAvoidingView + ScrollView như cũ — đã chạy ổn định,
 *   KHÔNG đổi để tránh ảnh hưởng bản web đang hoạt động tốt.
 */
import React, { forwardRef } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, type ScrollViewProps } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const KeyboardAwareScreen = forwardRef<any, ScrollViewProps>(function KeyboardAwareScreen(
  { children, ...rest },
  ref,
) {
  if (Platform.OS === 'web') {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="height" keyboardVerticalOffset={0}>
        <ScrollView ref={ref as any} {...rest}>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }
  return (
    <KeyboardAwareScrollView
      ref={ref as any}
      enableOnAndroid
      extraScrollHeight={20}
      keyboardOpeningTime={0}
      {...(rest as any)}
    >
      {children}
    </KeyboardAwareScrollView>
  );
});

export default KeyboardAwareScreen;
