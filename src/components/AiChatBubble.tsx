/**
 * Icon Chat AI nổi "Hỏi Tuzi" — luôn hiện trên mọi màn hình (mount 1 lần ở
 * App.tsx, sibling với AppNavigator). Kéo thả tự do quanh màn hình; nhấn (không
 * kéo) mở modal chat chiếm nửa dưới màn hình.
 *
 * Giới hạn 500 từ/câu hỏi + 500 từ/câu trả lời (server ép ở Edge Function
 * ai-chat, client cũng chặn sớm để phản hồi tức thì). Lịch sử chat CHỈ tồn tại
 * trong bộ nhớ phiên (mất khi đóng app) — không lưu lên server.
 *
 * Quota: 5 lượt/ngày miễn phí. Vượt quota → hỏi trừ 1 xu/lượt, trừ khi người
 * dùng đã tích "Không hỏi lại lần sau" (aiChatPrefs.ts) thì tự động trừ luôn.
 */
import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, PanResponder,
  Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform, Dimensions,
  ActivityIndicator, Keyboard,
} from 'react-native';
// LƯU Ý: chỉ dùng DUY NHẤT 1 <Modal> gốc — 2 <Modal> lồng/nối tiếp nhau
// (sheet chat + hộp xác nhận trừ xu) từng gây kẹt màn hình trên Android sau
// khi đóng (native window của Modal thứ 2 không giải phóng đúng lúc, chặn
// hết thao tác bên dưới trừ icon nổi vốn nằm ngoài Modal). Hộp xác nhận giờ
// là 1 overlay THƯỜNG render bên trong cùng Modal, không phải Modal riêng.
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { sendChatMessage, chargeAndSend, countWords, AI_CHAT_MAX_WORDS } from '../lib/aiChat';
import { getSkipChargeConfirm, setSkipChargeConfirm, consumeDailyBannerFlag } from '../lib/aiChatPrefs';
import { wallet } from '../constants/premium';
import { registerAiChatOpener } from '../lib/aiChatBus';
import { useAuth } from '../context/AuthContext';
import { getMyChartId } from '../lib/myChart';
import { listCharts, getCachedCharts, rowToResult } from '../lib/charts';
import { buildChatFactsBlock } from '../core/chatFacts';
import type { AstrologyResult } from '../types';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const BUBBLE_SIZE = 56;
const EDGE_MARGIN = 10;

interface Turn { question: string; answer: string; }

export default function AiChatBubble() {
  const { online } = useAuth();
  const [myResult, setMyResult] = useState<AstrologyResult | null>(null);
  const pan = useRef(new Animated.ValueXY({
    x: SCREEN_W - BUBBLE_SIZE - EDGE_MARGIN,
    y: SCREEN_H * 0.62,
  })).current;
  const dragging = useRef(false);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingCharge, setPendingCharge] = useState<{ question: string; cost: number; freeLimit: number } | null>(null);
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const [dailyBanner, setDailyBanner] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const scrollToEnd = () => scrollRef.current?.scrollToEnd({ animated: true });

  useEffect(() => {
    registerAiChatOpener(() => setOpen(true));
    return () => registerAiChatOpener(null);
  }, []);

  // Mở modal → báo "miễn phí 5 lượt/ngày" nếu lần đầu dùng hoặc sang ngày mới
  // (tự đánh dấu đã xem hôm nay, không hiện lại trong ngày).
  useEffect(() => {
    if (open) consumeDailyBannerFlag().then(setDailyBanner);
  }, [open]);

  // Mở modal → nạp lá số "của tôi" (nếu có gắn) để kèm facts gọn vào câu hỏi
  // khi liên quan tới lá số — không có lá số thì chat vẫn hoạt động bình thường.
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const charts = online ? await listCharts() : (getCachedCharts() ?? []);
        const id = await getMyChartId();
        const row = id ? charts.find(r => r.id === id) : undefined;
        setMyResult(row ? rowToResult(row) : null);
      } catch { setMyResult(null); }
    })();
  }, [open, online]);

  // Nội dung mới (câu hỏi/trả lời/lỗi) hoặc bàn phím vừa mở → luôn cuộn xuống
  // cuối để dòng mới nhất không bị bàn phím che mất.
  useEffect(() => {
    const t = setTimeout(scrollToEnd, 50);
    return () => clearTimeout(t);
  }, [turns, loading, errorMsg]);

  useEffect(() => {
    const sub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => {
      setTimeout(scrollToEnd, 50);
    });
    return () => sub.remove();
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
      onPanResponderGrant: () => {
        dragging.current = false;
        pan.setOffset({ x: (pan.x as any)._value, y: (pan.y as any)._value });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_e, g) => {
        if (Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4) dragging.current = true;
        Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false })(_e, g);
      },
      onPanResponderRelease: (_e, g) => {
        pan.flattenOffset();
        const wasDrag = dragging.current;
        // Ghim lại vào mép màn hình gần nhất, không tràn ra ngoài.
        const curX = (pan.x as any)._value as number;
        const curY = (pan.y as any)._value as number;
        const snapX = curX + BUBBLE_SIZE / 2 < SCREEN_W / 2 ? EDGE_MARGIN : SCREEN_W - BUBBLE_SIZE - EDGE_MARGIN;
        const clampY = Math.max(SPACING.xxl, Math.min(SCREEN_H - BUBBLE_SIZE - SPACING.xxl, curY));
        Animated.spring(pan, { toValue: { x: snapX, y: clampY }, useNativeDriver: false, friction: 7 }).start();
        if (!wasDrag) setOpen(true);
      },
    }),
  ).current;

  const wordCount = countWords(input);
  const overLimit = wordCount > AI_CHAT_MAX_WORDS;

  // BỌC try/catch/finally: nếu bất kỳ bước nào ném lỗi ngoài dự kiến (mạng,
  // AsyncStorage, v.v.), người dùng vẫn LUÔN thấy được thông báo lỗi thay vì
  // "Tuzi đang suy nghĩ" biến mất trong im lặng và loading bị treo mãi.
  const ask = async () => {
    if (!input.trim() || overLimit || loading) return;
    const question = input.trim();
    const chartFacts = myResult ? buildChatFactsBlock(myResult) : undefined;
    setLoading(true);
    setErrorMsg(null);
    try {
      const r = await sendChatMessage(question, chartFacts);
      if (r.status === 'ok') {
        setTurns(t => [...t, { question, answer: r.reply }]);
        setInput('');
        return;
      }
      if (r.status === 'error') {
        setErrorMsg(r.message);
        return;
      }
      // status === 'quota' — hết lượt miễn phí hôm nay.
      if (await getSkipChargeConfirm()) {
        const r2 = await chargeAndSend(question, chartFacts);
        if (r2.status === 'ok') { setTurns(t => [...t, { question, answer: r2.reply }]); setInput(''); }
        else if (r2.status === 'error') setErrorMsg(r2.message);
        return;
      }
      // Đóng bàn phím trước khi hiện hộp xác nhận — nếu không, bàn phím che mất
      // nút "Đồng ý"/"Để mai hỏi tiếp" và không có cách nào tắt bàn phím đi
      // (tap ra ngoài không blur được TextInput đang giữ focus).
      Keyboard.dismiss();
      setPendingCharge({ question, cost: r.cost, freeLimit: r.freeLimit });
    } catch (e: any) {
      setErrorMsg(`Có lỗi bất ngờ: ${e?.message || 'không rõ nguyên nhân'}. Bạn thử lại nhé.`);
    } finally {
      setLoading(false);
    }
  };

  const confirmCharge = async () => {
    if (!pendingCharge) return;
    const { question } = pendingCharge;
    const chartFacts = myResult ? buildChatFactsBlock(myResult) : undefined;
    if (dontAskAgain) await setSkipChargeConfirm(true);
    setPendingCharge(null);
    setDontAskAgain(false);
    setLoading(true);
    try {
      const r2 = await chargeAndSend(question, chartFacts);
      if (r2.status === 'ok') { setTurns(t => [...t, { question, answer: r2.reply }]); setInput(''); }
      else if (r2.status === 'error') setErrorMsg(r2.message);
    } catch (e: any) {
      setErrorMsg(`Có lỗi bất ngờ: ${e?.message || 'không rõ nguyên nhân'}. Bạn thử lại nhé.`);
    } finally {
      setLoading(false);
    }
  };

  const cancelCharge = () => {
    setPendingCharge(null);
    setDontAskAgain(false);
  };

  const closeChat = () => {
    Keyboard.dismiss();
    setOpen(false);
  };

  return (
    <>
      <Animated.View
        style={[styles.bubble, { transform: pan.getTranslateTransform() }]}
        {...panResponder.panHandlers}
      >
        <Text style={styles.bubbleIcon}>✨</Text>
      </Animated.View>

      <Modal visible={open} transparent animationType="slide" onRequestClose={closeChat}>
        <View style={styles.backdrop}>
          <TouchableOpacity style={styles.backdropTap} activeOpacity={1} onPress={closeChat} />
          <KeyboardAvoidingView
            behavior="padding"
            style={styles.sheet}
          >
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>✨ Hỏi Tuzi</Text>
              <TouchableOpacity onPress={closeChat}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
            </View>
            <Text style={styles.sheetSub}>Trợ lý AI đồng hành đời sống của bạn — hỏi ngắn gọn, Tuzi trả lời ngắn gọn (tối đa {AI_CHAT_MAX_WORDS} từ).</Text>
            {dailyBanner && (
              <Text style={styles.dailyBanner}>🎁 Miễn phí 5 lượt hỏi Tuzi mỗi ngày! Hỏi thêm sau khi hết lượt sẽ trừ 1 xu/lượt.</Text>
            )}

            <ScrollView
              ref={scrollRef}
              style={styles.turnsBox}
              contentContainerStyle={{ gap: SPACING.sm, paddingBottom: SPACING.sm }}
              onContentSizeChange={scrollToEnd}
            >
              {turns.length === 0 && !loading && (
                <Text style={styles.emptyHint}>Bạn có thể hỏi Tuzi về công việc, cảm xúc, các mối quan hệ, mục tiêu cá nhân… hoặc bất cứ điều gì đang băn khoăn.</Text>
              )}
              {turns.map((tn, i) => (
                <View key={i} style={styles.turn}>
                  <Text style={styles.qText}>Bạn: {tn.question}</Text>
                  <Text style={styles.aText}>✨ Tuzi: {tn.answer}</Text>
                </View>
              ))}
              {loading && (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={COLORS.gold} size="small" />
                  <Text style={styles.loadingTxt}>Tuzi đang suy nghĩ…</Text>
                </View>
              )}
              {errorMsg && <Text style={styles.errTxt}>{errorMsg}</Text>}
            </ScrollView>

            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Nhập câu hỏi của bạn…"
                placeholderTextColor={COLORS.textMuted}
                value={input}
                onChangeText={setInput}
                onFocus={() => setTimeout(scrollToEnd, 50)}
                multiline
                maxLength={2000}
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!input.trim() || overLimit || loading) && styles.sendBtnDisabled]}
                onPress={ask}
                disabled={!input.trim() || overLimit || loading}
              >
                <Text style={styles.sendBtnText}>Gửi</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.wordCounter, overLimit && styles.wordCounterOver]}>
              {wordCount}/{AI_CHAT_MAX_WORDS} từ
            </Text>

            {/* Hộp xác nhận trừ xu — overlay THƯỜNG (không phải Modal riêng), tránh
                lỗi kẹt màn hình do 2 Modal native lồng nhau trên Android. */}
            {pendingCharge && (
              <View style={styles.confirmOverlay}>
                <View style={styles.confirmCard}>
                  <Text style={styles.confirmTitle}>Đã hết lượt hỏi miễn phí hôm nay</Text>
                  <Text style={styles.confirmMsg}>
                    Bạn đã dùng hết {pendingCharge.freeLimit} lượt hỏi Tuzi miễn phí hôm nay.{'\n'}
                    Hỏi thêm lượt này sẽ trừ {pendingCharge.cost} xu (số dư hiện tại: {wallet.balance.toLocaleString('vi-VN')} xu).
                  </Text>
                  <TouchableOpacity style={styles.checkboxRow} onPress={() => setDontAskAgain(v => !v)} activeOpacity={0.7}>
                    <View style={[styles.checkbox, dontAskAgain && styles.checkboxChecked]}>
                      {dontAskAgain && <Text style={styles.checkboxMark}>✓</Text>}
                    </View>
                    <Text style={styles.checkboxLabel}>Không hỏi lại lần sau (tự động trừ xu)</Text>
                  </TouchableOpacity>
                  <View style={styles.confirmActionsRow}>
                    <TouchableOpacity style={styles.confirmCancelBtn} onPress={cancelCharge}>
                      <Text style={styles.confirmCancelText}>Để mai hỏi tiếp</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.confirmOkBtn} onPress={confirmCharge}>
                      <Text style={styles.confirmOkText}>Đồng ý ({pendingCharge.cost} xu)</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute', width: BUBBLE_SIZE, height: BUBBLE_SIZE, borderRadius: BUBBLE_SIZE / 2,
    // Nền trong suốt (không đặc màu) để không che nội dung phía dưới khi kéo qua.
    backgroundColor: 'rgba(245,185,66,0.35)', borderWidth: 1, borderColor: 'rgba(245,185,66,0.6)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 999, elevation: 12, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
  },
  bubbleIcon: { fontSize: 26 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  backdropTap: { flex: 1 },
  sheet: {
    height: SCREEN_H * 0.6, backgroundColor: COLORS.background, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: SPACING.lg, borderTopWidth: 1, borderColor: COLORS.gold,
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { color: COLORS.gold, fontSize: FONTS.size.lg, fontWeight: '800' },
  closeBtn: { color: COLORS.textSecondary, fontSize: FONTS.size.lg, fontWeight: '700', padding: 4 },
  sheetSub: { color: COLORS.textSecondary, fontSize: FONTS.size.xs, marginTop: 4, marginBottom: SPACING.sm, lineHeight: 16 },
  turnsBox: { flex: 1 },
  emptyHint: { color: COLORS.textMuted, fontSize: FONTS.size.sm, fontStyle: 'italic', lineHeight: 20 },
  turn: { gap: 4 },
  qText: { color: COLORS.textPrimary, fontSize: FONTS.size.sm, fontWeight: '700', lineHeight: 20 },
  aText: { color: COLORS.goldLight, fontSize: FONTS.size.sm, lineHeight: 20 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  loadingTxt: { color: COLORS.textSecondary, fontSize: FONTS.size.sm },
  errTxt: { color: '#ff7a7a', fontSize: FONTS.size.sm },
  inputRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-end', marginTop: SPACING.sm },
  input: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    color: COLORS.textPrimary, padding: SPACING.sm, maxHeight: 90, fontSize: FONTS.size.sm,
  },
  sendBtn: { backgroundColor: COLORS.gold, borderRadius: 10, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: '#1a0a00', fontWeight: '800', fontSize: FONTS.size.sm },
  wordCounter: { color: COLORS.textMuted, fontSize: FONTS.size.xs, textAlign: 'right', marginTop: 4 },
  wordCounterOver: { color: '#ff7a7a', fontWeight: '700' },
  dailyBanner: {
    color: COLORS.gold, fontSize: FONTS.size.xs, fontWeight: '700', lineHeight: 16,
    backgroundColor: COLORS.gold + '18', borderRadius: 8, borderWidth: 1, borderColor: COLORS.gold,
    padding: SPACING.sm, marginBottom: SPACING.sm,
  },
  confirmOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: SPACING.xl,
  },
  confirmCard: {
    width: '100%', maxWidth: 360, backgroundColor: COLORS.background, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.gold, padding: SPACING.lg, gap: SPACING.sm,
  },
  confirmTitle: { color: COLORS.gold, fontSize: FONTS.size.md, fontWeight: '800' },
  confirmMsg: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, lineHeight: 20 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: 4 },
  checkbox: {
    width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: COLORS.gold,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: COLORS.gold },
  checkboxMark: { color: '#1a0a00', fontSize: 13, fontWeight: '900' },
  checkboxLabel: { color: COLORS.textSecondary, fontSize: FONTS.size.xs, flex: 1 },
  confirmActionsRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  confirmCancelBtn: { flex: 1, paddingVertical: SPACING.sm, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  confirmCancelText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: FONTS.size.sm },
  confirmOkBtn: { flex: 1, paddingVertical: SPACING.sm, alignItems: 'center', borderRadius: 8, backgroundColor: COLORS.gold },
  confirmOkText: { color: '#1a0a00', fontWeight: '800', fontSize: FONTS.size.sm },
});
