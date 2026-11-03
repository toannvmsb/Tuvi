/**
 * Lớp bắt lỗi toàn app: lỗi khi dựng giao diện (componentDidCatch) và lỗi JS "fatal" ngoài vòng render
 * (ErrorUtils global handler) đều hiện màn thông báo kèm nội dung lỗi thay vì để bản release tự đóng
 * (bản release iOS/Android thoát app ngay khi có lỗi JS không bắt). Có nút "Thử lại" để vào lại app.
 */
import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../constants/theme';

type State = { error: Error | null };

export default class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };
  private prevHandler: ((e: any, isFatal?: boolean) => void) | null = null;

  static getDerivedStateFromError(error: Error): State { return { error }; }

  componentDidCatch(error: Error) {
    console.error('[AppErrorBoundary]', error?.message, error?.stack);
  }

  componentDidMount() {
    const EU = (globalThis as any).ErrorUtils;
    if (!EU?.setGlobalHandler) return;
    this.prevHandler = EU.getGlobalHandler?.() ?? null;
    EU.setGlobalHandler((e: any, isFatal?: boolean) => {
      console.error('[GlobalError]', isFatal, e?.message, e?.stack);
      this.setState({ error: e instanceof Error ? e : new Error(String(e?.message ?? e)) });
    });
  }

  componentWillUnmount() {
    const EU = (globalThis as any).ErrorUtils;
    if (EU?.setGlobalHandler && this.prevHandler) EU.setGlobalHandler(this.prevHandler);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <View style={s.wrap}>
        <Text style={s.title}>Tuzi gặp sự cố</Text>
        <Text style={s.sub}>Anh/chị vui lòng chụp màn hình này gửi lại để Tuzi sửa nhanh nhất.</Text>
        <ScrollView style={s.box}>
          <Text selectable style={s.msg}>{String(error.message || error)}</Text>
          <Text selectable style={s.stack}>{String(error.stack || '').slice(0, 1800)}</Text>
        </ScrollView>
        <Pressable style={s.btn} onPress={() => this.setState({ error: null })} accessibilityRole="button">
          <Text style={s.btnTxt}>Thử lại</Text>
        </Pressable>
      </View>
    );
  }
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.background, padding: 20, paddingTop: 64, gap: 12 },
  title: { fontFamily: FONTS.bodyBold, fontSize: 22, color: COLORS.gold },
  sub: { fontFamily: FONTS.body, fontSize: 14, color: COLORS.textSecondary },
  box: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12 },
  msg: { fontFamily: FONTS.bodySemi, fontSize: 14, color: COLORS.textPrimary, marginBottom: 8 },
  stack: { fontSize: 11, color: COLORS.textMuted },
  btn: { alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 28, borderRadius: 24, backgroundColor: COLORS.gold, marginBottom: 24 },
  btnTxt: { fontFamily: FONTS.bodyBold, fontSize: 15, color: '#1E1230' },
});
