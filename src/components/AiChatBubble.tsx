/**
 * Icon Chat AI nổi "Hỏi Tuzi" — luôn hiện trên mọi màn hình (mount 1 lần ở
 * App.tsx, sibling với AppNavigator). Kéo thả tự do quanh màn hình; nhấn (không
 * kéo) mở modal chat chiếm nửa dưới màn hình.
 *
 * Giới hạn 500 từ/câu hỏi + 500 từ/câu trả lời (server ép ở Edge Function
 * ai-chat, client cũng chặn sớm để phản hồi tức thì). Lịch sử chat lưu OFFLINE
 * trên máy (AsyncStorage, xem lib/aiChatHistory.ts) — KHÔNG lưu lên server —
 * và tự dọn các lượt cũ hơn 30 ngày. Lịch sử còn hạn cũng được gửi kèm
 * (`turns`) trong mỗi lượt hỏi để AI hiểu mạch hội thoại đang mở, thay vì xử
 * lý từng câu hỏi độc lập.
 *
 * Quota: 5 lượt/ngày miễn phí. Vượt quota → hỏi trừ 1 xu/lượt, trừ khi người
 * dùng đã tích "Không hỏi lại lần sau" (aiChatPrefs.ts) thì tự động trừ luôn.
 */
import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, PanResponder,
  TextInput, ScrollView, Platform, Dimensions,
  ActivityIndicator, Keyboard, BackHandler,
} from 'react-native';
// LƯU Ý: KHÔNG dùng <Modal> của RN cho sheet chat này nữa. Trên Android,
// <Modal> tạo 1 cửa sổ (Dialog) RIÊNG khỏi cửa sổ chính của Activity — hành vi
// tự đẩy/tự co khi bàn phím mở của cửa sổ đó KHÔNG nhất quán (đã thử qua nhiều
// lần: khi thì không đẩy gì khiến bàn phím che hết, khi thì đẩy gấp đôi mức
// cần). Sheet chat giờ là 1 View overlay thường (giống bong bóng nổi bên
// dưới) — nằm CHUNG cửa sổ Activity với mọi màn hình khác nên không còn kẹt
// giữa 2 cơ chế đẩy khác nhau. Trên Android, "pan" ở cấp Activity (app.json)
// tự đẩy hộ phần lớn nhưng vẫn để lộ thiếu một phần nhỏ khung nhập (đã xác
// nhận trên build native thật) — nên vẫn cần đẩy tay thêm chút, xem effect
// tính `effectivePush` bên dưới. Điểm QUAN TRỌNG khác đã xác nhận trên build
// thật: hễ gõ ký tự đầu tiên, thanh gợi ý từ của bàn phím Android mới hiện ra
// và làm bàn phím "cao" thêm → hệ điều hành tự tính lại "pan" và đẩy thêm,
// khiến sheet bị giật xuống ngay lúc gõ nếu mình cứ đo lại theo mỗi lần đó.
// Nên `keyboardOverlap` CHỈ đo 1 LẦN ở lần bàn phím hiện ra đầu tiên rồi chốt
// nguyên, bỏ qua các lần bắn lại sự kiện sau (xem effect đo bàn phím bên
// dưới) — giữ đúng vị trí ổn định ngay từ lúc bàn phím vừa mở, trước khi gõ.
// Nút back vật lý Android được xử lý thủ công qua BackHandler bên dưới (trước
// đây Modal tự làm qua onRequestClose).
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { sendChatMessage, chargeAndSend, countWords, AI_CHAT_MAX_WORDS } from '../lib/aiChat';
import { getSkipChargeConfirm, setSkipChargeConfirm, consumeDailyBannerFlag } from '../lib/aiChatPrefs';
import { loadChatHistory, appendChatTurn, clearChatHistory } from '../lib/aiChatHistory';
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
const BASE_SHEET_H = SCREEN_H * 0.6;
// Luôn chừa khoảng trống tối thiểu phía trên cùng màn hình khi bàn phím mở, để
// tiêu đề "✨ Hỏi Tuzi" + nút đóng không bị đẩy khuất khỏi màn hình (dễ xảy ra
// trên iPad — bàn phím rất cao so với sheet cao 60% màn hình).
const SHEET_TOP_GAP = 40;

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
  const [keyboardOverlap, setKeyboardOverlap] = useState(0);
  const [inputHeight, setInputHeight] = useState(0);
  // Đánh dấu bàn phím ĐANG mở hay không — dùng để CHỈ đo `keyboardOverlap` ở
  // lần bàn phím vừa hiện ra đầu tiên, bỏ qua mọi lần đo lại sau đó (xem effect
  // đo bàn phím bên dưới để rõ lý do).
  const keyboardOpenRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const scrollToEnd = () => scrollRef.current?.scrollToEnd({ animated: true });

  useEffect(() => {
    registerAiChatOpener(() => setOpen(true));
    return () => registerAiChatOpener(null);
  }, []);

  // Nạp lịch sử chat đã lưu offline trên máy (còn hạn ≤ 30 ngày) ngay khi mở app,
  // để mở lại "Hỏi Tuzi" vẫn thấy mạch hội thoại trước đó thay vì trống trơn.
  useEffect(() => {
    loadChatHistory().then(list => {
      if (list.length) setTurns(list.map(({ question, answer }) => ({ question, answer })));
    });
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

  // Đóng chat khi bấm nút back vật lý Android — trước đây do <Modal> tự lo qua
  // onRequestClose, giờ sheet là View thường nên phải tự đăng ký.
  useEffect(() => {
    if (Platform.OS !== 'android' || !open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      Keyboard.dismiss();
      setOpen(false);
      return true;
    });
    return () => sub.remove();
  }, [open]);

  // Tự đo chiều cao bàn phím THẬT qua sự kiện hệ điều hành. Đo theo `screenY`
  // (đỉnh bàn phím) trừ chiều cao window hiện tại thay vì dùng thẳng
  // `endCoordinates.height` — trên Android, `height` đôi khi cộng thêm cả
  // thanh điều hướng hệ thống, khiến giá trị lớn hơn phần thực sự che nội dung.
  //
  // CHỈ đo ở lần `keyboardDidShow` ĐẦU TIÊN sau khi bàn phím đóng — bỏ qua mọi
  // lần bắn lại sự kiện này SAU ĐÓ trong khi bàn phím vẫn đang mở. Lý do: trên
  // Android, ngay khi gõ ký tự đầu tiên, thanh gợi ý từ (Gboard/bàn phím hãng
  // khác) mới hiện thêm phía trên bàn phím, làm chiều cao bàn phím THỰC TẾ
  // tăng lên → `keyboardDidShow` bắn lại với giá trị lớn hơn → "pan" ở cấp hệ
  // điều hành tự tính lại và đẩy thêm, kéo cả khung chat giật xuống. Vị trí ở
  // lần hiện ra ĐẦU TIÊN (trước khi gõ, trước khi có thanh gợi ý) đã ổn rồi
  // nên giữ nguyên, không đo lại nữa cho tới khi bàn phím đóng hẳn.
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = (e: any) => {
      if (keyboardOpenRef.current) return;
      keyboardOpenRef.current = true;
      const endY = e?.endCoordinates?.screenY;
      const rawHeight = e?.endCoordinates?.height ?? 0;
      const winH = Dimensions.get('window').height;
      const overlap = typeof endY === 'number' ? Math.max(0, winH - endY) : rawHeight;
      setKeyboardOverlap(overlap);
      setTimeout(scrollToEnd, 50);
    };
    const onHide = () => {
      keyboardOpenRef.current = false;
      setKeyboardOverlap(0);
    };
    const s1 = Keyboard.addListener(showEvt, onShow);
    const s2 = Keyboard.addListener(hideEvt, onHide);
    return () => { s1.remove(); s2.remove(); };
  }, []);

  // Khoảng ĐẨY TAY thực tế — KHÁC nhau giữa 2 nền tảng vì Android đã có "pan"
  // ở cấp Activity (app.json) tự đẩy hộ PHẦN LỚN rồi (bỏ hẳn đẩy tay trên
  // Android từng khiến khung nhập bị che một phần nhỏ — "pan" một mình không
  // đủ cho overlay View thường này). iOS KHÔNG có "pan" tự động nên vẫn cần
  // đẩy tay TRỌN `keyboardOverlap`. Trên Android chỉ đẩy thêm đúng phần đệm
  // còn thiếu = 1 lần chiều cao ô nhập (đo thực qua onLayout). `keyboardOverlap`
  // đã được CHỐT ở lần bàn phím hiện ra đầu tiên (xem effect đo bàn phím) nên
  // giá trị này ổn định suốt lúc gõ, không còn bị giật xuống nữa.
  const effectivePush = keyboardOverlap <= 0
    ? 0
    : Platform.OS === 'ios'
      ? keyboardOverlap
      : Math.min(keyboardOverlap, Math.max(0, inputHeight));

  // Sheet cao 60% màn hình mặc định; khi bàn phím mở, bị bóp lại vừa đủ để
  // luôn còn khoảng trống SHEET_TOP_GAP phía trên (không để tiêu đề bị đẩy
  // khuất khỏi màn hình trên các máy bàn phím rất cao như iPad).
  const sheetHeight = effectivePush > 0
    ? Math.min(BASE_SHEET_H, SCREEN_H - effectivePush - SHEET_TOP_GAP)
    : BASE_SHEET_H;

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
      const r = await sendChatMessage(question, turns, chartFacts);
      if (r.status === 'ok') {
        setTurns(t => [...t, { question, answer: r.reply }]);
        void appendChatTurn(question, r.reply);
        setInput('');
        return;
      }
      if (r.status === 'error') {
        setErrorMsg(r.message);
        return;
      }
      // status === 'quota' — hết lượt miễn phí hôm nay.
      if (await getSkipChargeConfirm()) {
        const r2 = await chargeAndSend(question, turns, chartFacts);
        if (r2.status === 'ok') { setTurns(t => [...t, { question, answer: r2.reply }]); void appendChatTurn(question, r2.reply); setInput(''); }
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
      const r2 = await chargeAndSend(question, turns, chartFacts);
      if (r2.status === 'ok') { setTurns(t => [...t, { question, answer: r2.reply }]); void appendChatTurn(question, r2.reply); setInput(''); }
      else if (r2.status === 'error') setErrorMsg(r2.message);
    } catch (e: any) {
      setErrorMsg(`Có lỗi bất ngờ: ${e?.message || 'không rõ nguyên nhân'}. Bạn thử lại nhé.`);
    } finally {
      setLoading(false);
    }
  };

  /** Xóa lịch sử chat đã lưu offline trên máy (không ảnh hưởng quota/số dư). */
  const clearHistory = () => {
    setTurns([]);
    void clearChatHistory();
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

      {open && (
        // View overlay THƯỜNG thay cho <Modal> (xem giải thích ở đầu file) — phủ
        // kín màn hình bằng position:absolute, zIndex cao hơn bong bóng nổi.
        // paddingBottom = effectivePush (xem cách tính ở trên — iOS đẩy trọn,
        // Android chỉ đẩy thêm phần đệm nhỏ vì "pan" ở cấp Activity đã đẩy hộ
        // phần lớn rồi).
        <View style={[styles.modalRoot, { paddingBottom: effectivePush }]}>
          <TouchableOpacity style={styles.backdropTap} activeOpacity={1} onPress={closeChat} />
          <View style={[styles.sheet, { height: sheetHeight }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>✨ Hỏi Tuzi</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                {turns.length > 0 && (
                  <TouchableOpacity onPress={clearHistory} accessibilityRole="button" accessibilityLabel="Xóa lịch sử chat">
                    <Text style={styles.clearBtn}>🗑</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={closeChat}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
              </View>
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
                // CHỈ giữ giá trị LỚN NHẤT từng đo được (không cho co lại) — ô nhập
                // multiline tự đo lại layout mỗi khi gõ chữ, có lúc đo ra một giá trị
                // NHỎ HƠN thoáng qua — chỉ tăng, không giảm, để `effectivePush` không
                // bị co bất ngờ.
                onLayout={(e) => {
                  const h = e.nativeEvent.layout.height;
                  setInputHeight(prev => (h > prev ? h : prev));
                }}
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
          </View>
        </View>
      )}
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
  // Thay cho <Modal>: View overlay thường, phủ kín màn hình bằng absolute +
  // zIndex cao hơn bong bóng nổi (999) để luôn nằm trên cùng.
  modalRoot: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end',
    zIndex: 1000, elevation: 20,
  },
  backdropTap: { flex: 1 },
  // height cố định KHÔNG đặt ở đây nữa — tính động (sheetHeight) theo bàn phím, xem trên.
  sheet: {
    backgroundColor: COLORS.background, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: SPACING.lg, borderTopWidth: 1, borderColor: COLORS.gold,
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { color: COLORS.gold, fontSize: FONTS.size.lg, fontWeight: '800' },
  closeBtn: { color: COLORS.textSecondary, fontSize: FONTS.size.lg, fontWeight: '700', padding: 4 },
  clearBtn: { fontSize: FONTS.size.md, padding: 4 },
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
