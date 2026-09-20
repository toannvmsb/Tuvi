/**
 * Màn hình "Kho Xu của tôi" — xem số dư & NẠP XU qua chuyển khoản VietQR.
 *
 * Luồng: chọn gói → sinh mã đơn (nội dung CK) → hiện QR VietQR + thông tin tài
 * khoản → người dùng chuyển khoản → hệ thống (webhook SePay/Casso) tự cộng xu.
 * App POLL trạng thái đơn; khi 'paid' thì cập nhật số dư.
 *
 * BẢN TEST: còn nút Admin để nạp/giả lập thanh toán phục vụ kiểm thử.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert, Linking, Platform, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import KeyboardAwareScreen from '../components/KeyboardAwareScreen';
import { wallet, deposit, seedWallet, PREMIUM } from '../constants/premium';
import { BANK, XU_PACKS, makeTopupCode, vietQrImageUrl, WEB_TOPUP_URL, type XuPack } from '../constants/payment';
import { createTopupOrder, checkTopupStatus, fetchServerBalance, listTopupOrders, deleteTopupOrder, type TopupRow } from '../lib/topup';
import { addNotification } from '../lib/notificationCenter';
import { isOnlineMode } from '../lib/auth';
import { listCharts, getCachedCharts, rowToResult, type SavedChartRow } from '../lib/charts';
import ComboOffer from '../components/ComboOffer';
import type { AstrologyResult } from '../types';
import { isIapAvailable, initIap, getXuProducts, buyXuPack, endIap } from '../lib/iap';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { isWeb, downloadToCache, saveImageOrDownload } from '../lib/platform';
import { previewVoucher, redeemGiftVoucher, createTopupWithVoucher, voucherErrorMessage, type VoucherPreview } from '../lib/vouchers';

interface Order { code: string; pack: XuPack; }

/**
 * Hiện gợi ý "nạp qua website (chuyển khoản)" trên PRODUCTION MOBILE.
 *  - Android: BẬT — Google chấp nhận thanh toán thay thế tại VN.
 *  - iOS: TẮT mặc định để tránh rủi ro Apple từ chối (anti-steering, Guideline 3.1.1/3.1.3).
 *    Muốn bật cho iOS thì đổi ALLOW_WEB_TOPUP_IOS = true (cân nhắc rủi ro khi review).
 *  - Web/dev: không cần (đã có VietQR ngay trong app).
 * Lưu ý NGÔN TỪ: chỉ nói "cách nạp khác", KHÔNG so sánh giá / KHÔNG nói rẻ hơn /
 * KHÔNG chê IAP — tránh vi phạm quy định chống "điều hướng" (steering) của Apple.
 */
const ALLOW_WEB_TOPUP_IOS = false;
const SHOW_WEB_TOPUP = Platform.OS === 'android' || (Platform.OS === 'ios' && ALLOW_WEB_TOPUP_IOS);

export default function WalletScreen() {
  const navigation = useNavigation<any>();
  const [bal, setBal] = useState(wallet.balance);
  const [order, setOrder] = useState<Order | null>(null);
  const [status, setStatus] = useState<'idle' | 'pending' | 'paid'>('idle');
  const [checking, setChecking] = useState(false);
  const [savingQr, setSavingQr] = useState(false);
  const [msg, setMsg] = useState('');
  const [history, setHistory] = useState<TopupRow[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPoll = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  useEffect(() => () => stopPoll(), []);

  const loadHistory = useCallback(async () => {
    setHistory(await listTopupOrders());
  }, []);
  useEffect(() => { void loadHistory(); }, [loadHistory]);

  // IAP (chỉ bật ở bản build store có react-native-iap).
  const [iapReady, setIapReady] = useState(false);
  const [iapProducts, setIapProducts] = useState<any[]>([]);
  useEffect(() => {
    if (!isIapAvailable()) return;
    let alive = true;
    (async () => {
      const ok = await initIap({
        onCredited: (_pack, balance) => { setBal(balance); setMsg('✓ Nạp xu qua cửa hàng thành công!'); void addNotification({ id: `topup:${Date.now()}`, type: 'topup', title: 'Nạp xu thành công 🎉', body: 'Số dư của bạn đã được cập nhật.' }); },
        onError: (m) => setMsg('⚠ ' + m),
      });
      if (!alive) return;
      setIapReady(ok);
      if (ok) {
        const prods = await getXuProducts();
        setIapProducts(prods);
      }
    })();
    return () => { alive = false; void endIap(); };
  }, []);

  // Lá số để áp gói combo (combo mở khóa theo TỪNG lá số).
  const [charts, setCharts] = useState<SavedChartRow[]>(() => getCachedCharts() ?? []);
  const [comboChartId, setComboChartId] = useState<string | null>(null);
  const [comboResult, setComboResult] = useState<AstrologyResult | null>(null);
  const pickChart = useCallback((row: SavedChartRow) => {
    setComboChartId(row.id);
    try { setComboResult(rowToResult(row)); } catch { setComboResult(null); }
  }, []);
  useEffect(() => { (async () => { try { setCharts(await listCharts()); } catch {} })(); }, []);
  useEffect(() => {
    if (!comboChartId && charts.length) pickChart(charts[0]);
  }, [charts, comboChartId, pickChart]);

  // Khi đơn ở trạng thái chờ → poll trạng thái mỗi 8 giây.
  useEffect(() => {
    stopPoll();
    if (order && status === 'pending') {
      pollRef.current = setInterval(() => { void verify(order, true); }, 8000);
    }
    return () => stopPoll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, status]);

  // ── VOUCHER (chỉ hiển thị trên WEB / dev — xem chú thích chính sách bên dưới) ──
  const [voucherInput, setVoucherInput] = useState('');
  const [voucherBusy, setVoucherBusy] = useState(false);
  const [voucherMsg, setVoucherMsg] = useState('');
  // Mã GIẢM GIÁ đã áp (chờ chọn gói). Gift thì cộng xu ngay, không cần state.
  const [appliedVoucher, setAppliedVoucher] = useState<{ code: string; pv: VoucherPreview } | null>(null);

  /** Tính số tiền sau giảm cho 1 gói (hiển thị; server sẽ tính lại khi tạo đơn). */
  const discountedVnd = (vnd: number): number => {
    if (!appliedVoucher) return vnd;
    const { pv } = appliedVoucher;
    const off = pv.discount_type === 'percent'
      ? Math.floor(vnd * (pv.discount_value || 0) / 100)
      : (pv.discount_value || 0);
    return Math.max(1000, vnd - off);
  };

  const applyVoucher = async () => {
    const code = voucherInput.trim();
    if (!code) { setVoucherMsg('Nhập mã trước đã nhé.'); return; }
    setVoucherBusy(true); setVoucherMsg('');
    try {
      // Preview với gói đầu tiên để biết loại mã (server không tiêu mã ở bước này).
      const pv = await previewVoucher(code, XU_PACKS[0]?.vnd ?? 0);
      if (!pv) { setVoucherMsg('Cần đăng nhập (online) để dùng mã.'); return; }
      if (pv.kind === 'gift') {
        // Mã đổi xu trực tiếp → cộng ngay.
        const r = await redeemGiftVoucher(code);
        seedWallet({ balance: r.new_balance });
        setBal(r.new_balance);
        setVoucherInput('');
        setVoucherMsg(`✓ Đã cộng ${r.xu_credited.toLocaleString('vi-VN')} xu từ mã quà tặng!`);
        void addNotification({ id: `topup:gift:${Date.now()}`, type: 'topup', title: 'Đổi mã thành công 🎁', body: `+${r.xu_credited.toLocaleString('vi-VN')} xu vào tài khoản.` });
      } else {
        // Mã giảm giá → ghim lại, áp khi chọn gói nạp.
        setAppliedVoucher({ code, pv });
        setVoucherMsg(
          pv.discount_type === 'percent'
            ? `✓ Mã giảm ${pv.discount_value}% — chọn gói bên dưới để nạp với giá ưu đãi.`
            : `✓ Mã giảm ${Number(pv.discount_value).toLocaleString('vi-VN')}đ — chọn gói bên dưới để nạp với giá ưu đãi.`
        );
      }
    } catch (e: any) {
      setVoucherMsg('⚠ ' + voucherErrorMessage(e?.message));
    } finally { setVoucherBusy(false); }
  };

  const clearVoucher = () => { setAppliedVoucher(null); setVoucherInput(''); setVoucherMsg(''); };

  const startTopup = async (pack: XuPack) => {
    const code = makeTopupCode();
    setMsg('');
    if (appliedVoucher) {
      // Đơn nạp KÈM mã giảm giá — server tự tính tiền cuối + tiêu mã (atomic).
      try {
        const r = await createTopupWithVoucher(code, pack.vnd, pack.xu, appliedVoucher.code);
        const o = { code, pack: { ...pack, vnd: r.final_vnd } };
        setOrder(o);
        setStatus('pending');
        setVoucherMsg(`✓ Đã áp mã: giảm ${r.discount_vnd.toLocaleString('vi-VN')}đ — chuyển khoản ${r.final_vnd.toLocaleString('vi-VN')}đ để nhận ${pack.xu.toLocaleString('vi-VN')} xu.`);
        setAppliedVoucher(null); setVoucherInput('');
      } catch (e: any) {
        setVoucherMsg('⚠ ' + voucherErrorMessage(e?.message));
      }
      return;
    }
    const o = { code, pack };
    setOrder(o);
    setStatus('pending');
    await createTopupOrder(code, pack.vnd, pack.xu);
  };

  const onPaid = async (o: Order) => {
    stopPoll();
    setStatus('paid');
    // Cập nhật số dư từ server (webhook đã cộng xu). Nếu không lấy được thì giữ nguyên.
    const serverBal = await fetchServerBalance();
    if (typeof serverBal === 'number') { seedWallet({ balance: serverBal }); setBal(serverBal); }
    setMsg(`✓ Đã nhận thanh toán — cộng ${o.pack.xu.toLocaleString('vi-VN')} xu vào tài khoản.`);
    void addNotification({ id: `topup:${o.code || Date.now()}`, type: 'topup', title: 'Nạp xu thành công 🎉', body: `Đã cộng ${o.pack.xu.toLocaleString('vi-VN')} xu vào tài khoản của bạn.` });
    void loadHistory();
  };

  // Tải ảnh QR về Thư viện để chủ động upload lên app ngân hàng.
  const saveQr = async (o: Order) => {
    setSavingQr(true);
    try {
      const uri = await downloadToCache(vietQrImageUrl(o.pack.vnd, o.code), `QR-${o.code}.png`);
      await saveImageOrDownload(uri, `QR-${o.code}.png`);
      Alert.alert('✓ Đã lưu', isWeb ? 'Ảnh QR đã được tải xuống. Mở app ngân hàng → chọn/upload ảnh QR này để chuyển khoản nhanh.' : 'Ảnh QR đã lưu vào Thư viện ảnh. Mở app ngân hàng → chọn/upload ảnh QR này để chuyển khoản nhanh.');
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không lưu được ảnh QR.');
    } finally { setSavingQr(false); }
  };

  const verify = async (o: Order, silent = false) => {
    if (!silent) setChecking(true);
    const st = await checkTopupStatus(o.code);
    if (!silent) setChecking(false);
    if (st === 'paid') { await onPaid(o); }
    else if (!silent) setMsg('⏳ Chưa nhận được thanh toán. Sau khi chuyển khoản 1–2 phút, hệ thống sẽ tự cộng xu.');
  };

  const cancelOrder = () => { stopPoll(); setOrder(null); setStatus('idle'); setMsg(''); };

  // ----- Admin/test -----
  // Đặt số dư test về 100.000 xu và LƯU LÊN SERVER (qua deposit → RPC deposit_xu)
  // để xu giữ được khi đăng xuất/đăng nhập lại. Trước đây resetWallet() chỉ đổi
  // cục bộ nên re-login bị về 0.
  const testReset = () => {
    const target = 100000;
    const delta = target - wallet.balance;
    if (delta > 0) {
      const b = deposit(delta);   // cộng + bắn onDeposit → deposit_xu (lưu DB)
      setBal(b);
    } else {
      setBal(wallet.balance);     // đã ≥ 100.000, không cần cộng thêm
    }
    setMsg('✓ Số dư test đặt về 100.000 xu (đã lưu vào tài khoản).');
  };
  const testSimulatePaid = () => {
    if (!order) return;
    const b = deposit(order.pack.xu);   // cộng cục bộ để kiểm thử
    setBal(b);
    stopPoll(); setStatus('paid');
    setMsg(`✓ (Test) Giả lập đã thanh toán — cộng ${order.pack.xu.toLocaleString('vi-VN')} xu.`);
    void addNotification({ id: `topup:test:${Date.now()}`, type: 'topup', title: 'Nạp xu thành công 🎉', body: `Đã cộng ${order.pack.xu.toLocaleString('vi-VN')} xu vào tài khoản của bạn.` });
    void loadHistory();
  };

  const STATUS_LABEL: Record<string, { txt: string; color: string }> = {
    paid: { txt: 'Đã nạp', color: COLORS.green },
    pending: { txt: 'Chờ TT', color: COLORS.gold },
    expired: { txt: 'Hết hạn', color: COLORS.textMuted },
  };
  const fmtDate = (s: string) => {
    try { const d = new Date(s); return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`; } catch { return ''; }
  };
  const removeHistory = (h: TopupRow) => {
    Alert.alert('Xóa lịch sử nạp', `Xóa đơn ${h.code} khỏi lịch sử?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive',
        onPress: async () => { setHistory(prev => prev.filter(x => x.code !== h.code)); await deleteTopupOrder(h.code); },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="Ví xu" onBack={() => navigation.goBack()} />
      <KeyboardAwareScreen contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Số dư */}
        <View style={styles.balCard}>
          <Text style={styles.balLabel}>Số dư hiện tại</Text>
          <Text style={styles.balValue}>{bal.toLocaleString('vi-VN')} xu</Text>
          <Text style={styles.balUser}>👤 {wallet.userName}{wallet.isAdmin ? ' (Admin · test)' : ''}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Quy đổi: 10.000đ = 100 xu (1 xu = 100đ).{'\n'}
            Biểu phí: Nâng cao {PREMIUM.COST.advanced}–{PREMIUM.COST.advancedMajor} xu/lần ·
            Phân tích AI {PREMIUM.COST.ai}–{PREMIUM.COST.aiLarge} xu/lần.{'\n'}
            Mỗi mục mở rồi thì đọc lại miễn phí.
          </Text>
        </View>

        {/* GÓI LUẬN TRỌN ĐỜI (combo — mở khóa theo từng lá số) */}
        <View style={styles.comboBox}>
          <Text style={styles.section}>💎 Gói Luận Trọn Đời</Text>
          {!isOnlineMode() ? (
            <Text style={styles.note}>Đăng nhập và lưu lá số để mua gói (gói mở khóa AI theo từng lá số).</Text>
          ) : charts.length === 0 ? (
            <Text style={styles.note}>Bạn chưa có lá số đã lưu. Hãy lập một lá số (tự động lưu) rồi quay lại đây để mua gói.</Text>
          ) : (
            <>
              <Text style={styles.note}>Chọn lá số áp dụng gói:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chartChips}>
                  {charts.map(c => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.chartChip, c.id === comboChartId && styles.chartChipActive]}
                      onPress={() => pickChart(c)}
                    >
                      <Text style={[styles.chartChipTxt, c.id === comboChartId && styles.chartChipTxtActive]}>
                        {(c.name || 'Không tên')} · {c.birth_day}/{c.birth_month}/{c.birth_year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              {comboResult && <ComboOffer result={comboResult} onBought={() => setBal(wallet.balance)} />}
            </>
          )}
        </View>

        {/*
          ── CHÍNH SÁCH THANH TOÁN (tuân thủ Apple Guideline 3.1.1 + Google Payments Policy) ──
          Mọi nội dung số (xu) mua trong app MOBILE phải dùng In-App Purchase của
          Apple/Google. VietQR chỉ được phép trên WEB. Trong dev mode (__DEV__) cho
          phép VietQR trên mobile để tiện kiểm thử.
        */}
        {!isWeb && !__DEV__ && (
          <View style={styles.comboBox}>
            <Text style={styles.section}>Nạp xu qua App Store / CH Play</Text>
            {iapReady ? (
              <>
                <View style={styles.packGrid}>
                  {XU_PACKS.map(p => {
                    const iapId = Platform.OS === 'ios' ? p.iosProductId : p.productId;
                    const prod = iapProducts.find((x: any) => (x.productId || x.id) === iapId);
                    const priceTxt = prod?.localizedPrice || `${p.vnd.toLocaleString('vi-VN')}đ`;
                    return (
                      <TouchableOpacity key={p.productId} style={styles.pack} onPress={() => buyXuPack(iapId).catch((e: any) => setMsg('⚠ ' + (e?.message || 'Lỗi mua hàng')))} activeOpacity={0.85}>
                        {p.label ? <Text style={styles.packTag}>{p.label}</Text> : null}
                        <Text style={styles.packXu}>+{p.xu.toLocaleString('vi-VN')} xu</Text>
                        <Text style={styles.packGia}>{priceTxt}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={styles.note}>Thanh toán an toàn qua tài khoản App Store / Google Play của bạn.</Text>
              </>
            ) : (
              <>
                <Text style={styles.note}>⏳ Đang kết nối đến cửa hàng…</Text>
                <Text style={styles.note}>Nếu không tải được, vui lòng kiểm tra kết nối mạng hoặc thử lại sau. Trên web tuzi.vn anh có thể nạp qua VietQR.</Text>
              </>
            )}
          </View>
        )}

        {/* CÁCH NẠP KHÁC — gợi ý nạp qua chuyển khoản trên website (ngôn từ trung tính) */}
        {!isWeb && !__DEV__ && SHOW_WEB_TOPUP && (
          <View style={styles.altPayBox}>
            <Text style={styles.altPayTitle}>💳 Cách nạp khác</Text>
            <Text style={styles.altPayText}>
              Nếu không muốn thanh toán qua cửa hàng ứng dụng, bạn có thể nạp xu bằng
              chuyển khoản ngân hàng trên website của chúng tôi. Xu sẽ được cộng vào
              cùng tài khoản này.
            </Text>
            <TouchableOpacity
              style={styles.altPayBtn}
              onPress={() => Linking.openURL(WEB_TOPUP_URL).catch(() => setMsg('⚠ Không mở được trình duyệt.'))}
              activeOpacity={0.85}
            >
              <Text style={styles.altPayBtnText}>🌐 Mở tuzi.vn để nạp qua chuyển khoản</Text>
            </TouchableOpacity>
            <Text style={styles.altPayHint}>
              Đăng nhập cùng tài khoản trên website để xu được cộng đúng nơi.
            </Text>
          </View>
        )}

        {/* CHỌN GÓI NẠP (VietQR) — CHỈ web hoặc dev mode mobile (test) */}
        {(isWeb || __DEV__) && !order && (
          <>
            <Text style={styles.section}>Nạp xu qua chuyển khoản (VietQR)</Text>
            {!isWeb && __DEV__ && (
              <Text style={[styles.note, { color: '#ff9d8a' }]}>
                ⚠ DEV MODE — VietQR chỉ hiển thị trong dev. Bản production build sẽ ẩn hoàn toàn trên iOS/Android theo chính sách Apple/Google.
              </Text>
            )}

            {/* ── MÃ KHUYẾN MẠI / QUÀ TẶNG — CHỈ WEB (chính sách Apple 3.1.1 / Google Payments) ── */}
            <View style={styles.voucherBox}>
              <Text style={styles.voucherTitle}>🎟️ Mã khuyến mại / quà tặng</Text>
              <View style={styles.voucherRow}>
                <TextInput
                  style={styles.voucherInput}
                  value={voucherInput}
                  onChangeText={t => setVoucherInput(t.toUpperCase())}
                  placeholder="Nhập mã (vd TUVI-XXXX-XXXX)"
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!voucherBusy}
                />
                <TouchableOpacity
                  style={[styles.voucherBtn, voucherBusy && { opacity: 0.5 }]}
                  onPress={applyVoucher}
                  disabled={voucherBusy}
                  activeOpacity={0.85}
                >
                  {voucherBusy ? <ActivityIndicator size="small" color="#1a0a00" /> : <Text style={styles.voucherBtnTxt}>Áp dụng</Text>}
                </TouchableOpacity>
              </View>
              {!!voucherMsg && (
                <Text style={[styles.voucherMsg, voucherMsg.startsWith('⚠') && { color: '#ff9d8a' }]}>{voucherMsg}</Text>
              )}
              {appliedVoucher && (
                <TouchableOpacity onPress={clearVoucher} activeOpacity={0.7}>
                  <Text style={styles.voucherClear}>✕ Bỏ mã {appliedVoucher.code}</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.packGrid}>
              {XU_PACKS.map(p => {
                const finalVnd = discountedVnd(p.vnd);
                const hasOff = appliedVoucher && finalVnd < p.vnd;
                return (
                  <TouchableOpacity key={p.xu} style={[styles.pack, hasOff && styles.packOff]} onPress={() => startTopup(p)} activeOpacity={0.85}>
                    {p.label ? <Text style={styles.packTag}>{p.label}</Text> : null}
                    <Text style={styles.packXu}>+{p.xu.toLocaleString('vi-VN')} xu</Text>
                    {hasOff ? (
                      <>
                        <Text style={styles.packGiaOld}>{p.vnd.toLocaleString('vi-VN')}đ</Text>
                        <Text style={styles.packGiaNew}>{finalVnd.toLocaleString('vi-VN')}đ</Text>
                      </>
                    ) : (
                      <Text style={styles.packGia}>{p.vnd.toLocaleString('vi-VN')}đ</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.note}>
              Sau khi chọn gói, quét mã QR hoặc chuyển khoản đúng số tiền & đúng nội dung. Hệ thống tự
              cộng xu khi nhận được tiền (thường 1–2 phút).
            </Text>
          </>
        )}

        {/* ĐƠN NẠP — QR + thông tin chuyển khoản */}
        {(isWeb || __DEV__) && order && (
          <View style={styles.orderCard}>
            <Text style={styles.section}>Chuyển khoản để nạp {order.pack.xu.toLocaleString('vi-VN')} xu</Text>

            {status !== 'paid' && (
              <>
                <Image
                  source={{ uri: vietQrImageUrl(order.pack.vnd, order.code) }}
                  style={styles.qr}
                  resizeMode="contain"
                />
                <TouchableOpacity style={styles.qrSaveBtn} onPress={() => saveQr(order)} disabled={savingQr} activeOpacity={0.85}>
                  {savingQr
                    ? <View style={styles.row}><ActivityIndicator color={COLORS.gold} size="small" /><Text style={styles.qrSaveTxt}>Đang lưu…</Text></View>
                    : <Text style={styles.qrSaveTxt}>⬇️ Tải ảnh QR về máy</Text>}
                </TouchableOpacity>
              </>
            )}

            <View style={styles.kv}><Text style={styles.k}>Ngân hàng</Text><Text style={styles.v}>{BANK.bankLabel}</Text></View>
            <View style={styles.kv}><Text style={styles.k}>Số tài khoản</Text><Text style={styles.v}>{BANK.accountNo}</Text></View>
            <View style={styles.kv}><Text style={styles.k}>Chủ tài khoản</Text><Text style={styles.v}>{BANK.accountName}</Text></View>
            <View style={styles.kv}><Text style={styles.k}>Số tiền</Text><Text style={styles.vGold}>{order.pack.vnd.toLocaleString('vi-VN')}đ</Text></View>
            <View style={styles.kv}><Text style={styles.k}>Nội dung CK</Text><Text style={styles.vGold}>{order.code}</Text></View>

            <Text style={styles.warn}>
              ⚠ Bắt buộc ghi đúng nội dung <Text style={styles.bold}>{order.code}</Text> để hệ thống tự khớp và cộng xu.
            </Text>

            {status === 'pending' && (
              <>
                <TouchableOpacity style={styles.checkBtn} onPress={() => verify(order)} disabled={checking} activeOpacity={0.85}>
                  {checking
                    ? <View style={styles.row}><ActivityIndicator color="#1a0a00" size="small" /><Text style={styles.checkTxt}>Đang kiểm tra…</Text></View>
                    : <Text style={styles.checkTxt}>Tôi đã chuyển khoản — Kiểm tra</Text>}
                </TouchableOpacity>
                <View style={styles.pollRow}>
                  <ActivityIndicator color={COLORS.gold} size="small" />
                  <Text style={styles.pollTxt}>Đang chờ thanh toán… hệ thống tự cập nhật khi nhận được tiền.</Text>
                </View>
                <TouchableOpacity onPress={cancelOrder}><Text style={styles.cancel}>Hủy / Chọn gói khác</Text></TouchableOpacity>
              </>
            )}

            {status === 'paid' && (
              <TouchableOpacity style={styles.checkBtn} onPress={cancelOrder} activeOpacity={0.85}>
                <Text style={styles.checkTxt}>✓ Hoàn tất — Quay lại nạp tiếp</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {!!msg && <Text style={styles.msg}>{msg}</Text>}

        {/* LỊCH SỬ NẠP */}
        {isOnlineMode() && (
          <View style={styles.histBox}>
            <View style={styles.histHead}>
              <Text style={styles.section}>Lịch sử nạp</Text>
              <TouchableOpacity onPress={() => loadHistory()}><Text style={styles.refresh}>🔄 Làm mới</Text></TouchableOpacity>
            </View>
            {history.length === 0 ? (
              <Text style={styles.note}>Chưa có giao dịch nạp nào.</Text>
            ) : (
              // Hiện ~5 dòng gần nhất; cuộn trong khung để xem các lần trước.
              <ScrollView style={styles.histScroll} nestedScrollEnabled showsVerticalScrollIndicator>
                {history.map(h => {
                  const st = STATUS_LABEL[h.status] || STATUS_LABEL.pending;
                  return (
                    <View key={h.code} style={styles.histRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.histCode}>{h.code}</Text>
                        <Text style={styles.histSub}>{fmtDate(h.created_at)} · +{h.xu.toLocaleString('vi-VN')} xu · {h.amount_vnd.toLocaleString('vi-VN')}đ</Text>
                      </View>
                      <Text style={[styles.histStatus, { color: st.color, borderColor: st.color }]}>{st.txt}</Text>
                      <TouchableOpacity onPress={() => removeHistory(h)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={styles.histDel}>🗑</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            )}
            {history.length > 5 && <Text style={styles.histHint}>Cuộn trong khung để xem các lần nạp trước.</Text>}
          </View>
        )}

        {/* Khu vực TEST (Admin) */}
        {wallet.isAdmin && (
          <View style={styles.testBox}>
            <Text style={styles.testTitle}>Khu vực thử nghiệm (Admin)</Text>
            {order && status === 'pending' && (
              <TouchableOpacity style={styles.testBtn} onPress={testSimulatePaid}>
                <Text style={styles.testTxt}>✓ Giả lập đã thanh toán đơn này</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.testBtn} onPress={testReset}>
              <Text style={styles.testTxt}>↻ Đặt 100.000 xu (lưu vào tài khoản)</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.foot}>
          {isOnlineMode()
            ? 'Việc cộng xu tự động sẽ hoạt động sau khi kết nối dịch vụ đối soát ngân hàng (SePay/Casso). Hiện anh có thể dùng nút thử nghiệm ở trên.'
            : 'Đang ở chế độ khách. Đăng nhập để nạp & đồng bộ số dư.'}
        </Text>
      </KeyboardAwareScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: {
    padding: SPACING.lg, gap: SPACING.md,
    paddingBottom: Platform.OS === 'web' ? 300 : SPACING.xxl,
  },
  balCard: {
    backgroundColor: 'rgba(226,194,133,0.14)', borderRadius: 24, padding: 22,
    borderWidth: 1, borderColor: 'rgba(226,194,133,0.4)', alignItems: 'flex-start', gap: 4,
  },
  balLabel: { color: COLORS.gold, fontSize: 11, fontFamily: FONTS.bodySemi, letterSpacing: 1.8, textTransform: 'uppercase' },
  balValue: { color: COLORS.goldLight, fontSize: 52, lineHeight: 56, fontFamily: FONTS.displayBold },
  balUser: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, fontFamily: FONTS.body },
  infoCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 18, padding: SPACING.md, borderWidth: 1, borderColor: 'rgba(226,194,133,0.18)' },
  infoText: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, lineHeight: 21, fontFamily: FONTS.body },
  section: { color: COLORS.textPrimary, fontSize: 24, lineHeight: 28, fontFamily: FONTS.display },
  packGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  pack: {
    width: '47%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: SPACING.md, paddingVertical: 18,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(226,194,133,0.22)', gap: 6, minHeight: 112,
  },
  packTag: { color: '#1E1230', backgroundColor: COLORS.gold, fontSize: 10.5, fontFamily: FONTS.bodyBold, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999, overflow: 'hidden' },
  packXu: { color: COLORS.goldLight, fontFamily: FONTS.displayBold, fontSize: 28, lineHeight: 30 },
  packGia: { color: COLORS.textPrimary, fontSize: FONTS.size.sm, fontFamily: FONTS.bodySemi, backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12, overflow: 'hidden' },
  packOff: { borderColor: COLORS.green, borderWidth: 1.5 },
  packGiaOld: { color: COLORS.textMuted, fontSize: FONTS.size.xs, textDecorationLine: 'line-through' },
  packGiaNew: { color: COLORS.green, fontSize: FONTS.size.sm, fontWeight: '800' },

  // Voucher
  voucherBox: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: SPACING.md,
    borderWidth: 1, borderColor: 'rgba(226,194,133,0.34)', gap: SPACING.xs, marginBottom: SPACING.sm,
  },
  voucherTitle: { color: COLORS.gold, fontSize: FONTS.size.md, fontWeight: '800' },
  voucherRow: { flexDirection: 'row', gap: SPACING.sm },
  voucherInput: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: 8, color: COLORS.textPrimary,
    fontSize: FONTS.size.md, fontWeight: '700', letterSpacing: 1,
  },
  voucherBtn: {
    backgroundColor: COLORS.gold, borderRadius: 8, paddingHorizontal: SPACING.lg,
    alignItems: 'center', justifyContent: 'center', minWidth: 92,
  },
  voucherBtnTxt: { color: '#1a0a00', fontWeight: '800', fontSize: FONTS.size.sm },
  voucherMsg: { color: COLORS.green, fontSize: FONTS.size.sm, lineHeight: 19 },
  voucherClear: { color: COLORS.textMuted, fontSize: FONTS.size.xs, fontWeight: '700', marginTop: 2 },
  note: { color: COLORS.textMuted, fontSize: FONTS.size.xs, fontStyle: 'italic', lineHeight: 18 },

  orderCard: { backgroundColor: COLORS.card, borderRadius: 12, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.gold, gap: SPACING.sm },
  qr: { width: 220, height: 220, alignSelf: 'center', backgroundColor: '#fff', borderRadius: 8 },
  qrSaveBtn: { alignSelf: 'center', borderWidth: 1, borderColor: COLORS.gold, borderRadius: 8, paddingHorizontal: SPACING.md, paddingVertical: 6, backgroundColor: COLORS.gold + '14' },
  qrSaveTxt: { color: COLORS.gold, fontSize: FONTS.size.sm, fontWeight: '800' },
  kv: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 },
  k: { color: COLORS.textSecondary, fontSize: FONTS.size.sm },
  v: { color: COLORS.textPrimary, fontSize: FONTS.size.md, fontWeight: '700' },
  vGold: { color: COLORS.gold, fontSize: FONTS.size.md, fontWeight: '800' },
  warn: { color: COLORS.textPrimary, fontSize: FONTS.size.sm, lineHeight: 20, backgroundColor: COLORS.gold + '14', borderRadius: 6, padding: SPACING.sm },
  bold: { color: COLORS.gold, fontWeight: '800' },
  checkBtn: { backgroundColor: COLORS.gold, borderRadius: 10, padding: SPACING.md, alignItems: 'center', marginTop: 4 },
  checkTxt: { color: '#1a0a00', fontWeight: '800', fontSize: FONTS.size.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pollRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  pollTxt: { color: COLORS.textSecondary, fontSize: FONTS.size.xs, flex: 1 },
  cancel: { color: COLORS.purple, fontSize: FONTS.size.sm, fontWeight: '700', textAlign: 'center', marginTop: 4 },

  msg: { color: COLORS.green, fontSize: FONTS.size.sm, fontWeight: '700', textAlign: 'center' },
  histBox: { backgroundColor: COLORS.card, borderRadius: 12, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.xs },
  histHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  refresh: { color: COLORS.goldLight, fontSize: FONTS.size.sm, fontWeight: '700' },
  comboBox: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: SPACING.md, borderWidth: 1, borderColor: 'rgba(226,194,133,0.18)', gap: SPACING.sm },
  // Cách nạp khác (website chuyển khoản)
  altPayBox: { backgroundColor: COLORS.card, borderRadius: 12, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.sm, marginTop: SPACING.md },
  altPayTitle: { color: COLORS.gold, fontSize: FONTS.size.md, fontWeight: '800' },
  altPayText: { color: COLORS.textSecondary, fontSize: FONTS.size.sm, lineHeight: 20 },
  altPayBtn: { borderWidth: 1, borderColor: COLORS.gold, borderRadius: 10, paddingVertical: SPACING.sm, alignItems: 'center', backgroundColor: COLORS.gold + '14' },
  altPayBtnText: { color: COLORS.gold, fontWeight: '800', fontSize: FONTS.size.sm },
  altPayHint: { color: COLORS.textMuted, fontSize: FONTS.size.xs, fontStyle: 'italic' },
  chartChips: { flexDirection: 'row', gap: SPACING.xs, paddingVertical: 2 },
  chartChip: { paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: 16, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  chartChipActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  chartChipTxt: { color: COLORS.textSecondary, fontSize: FONTS.size.xs, fontWeight: '700' },
  chartChipTxtActive: { color: '#1a0a00' },
  histScroll: { maxHeight: 260 },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 6, borderTopWidth: 0.5, borderTopColor: COLORS.border },
  histCode: { color: COLORS.textPrimary, fontSize: FONTS.size.sm, fontWeight: '700' },
  histSub: { color: COLORS.textSecondary, fontSize: FONTS.size.xs, marginTop: 1 },
  histStatus: { fontSize: FONTS.size.xs, fontWeight: '800', borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
  histDel: { fontSize: 20, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, backgroundColor: '#ff6b6b22', borderWidth: 1, borderColor: '#ff8a8a', overflow: 'hidden' },
  histHint: { color: COLORS.textMuted, fontSize: FONTS.size.xs, fontStyle: 'italic', marginTop: 2 },
  testBox: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: SPACING.sm, gap: SPACING.xs },
  testTitle: { color: COLORS.textSecondary, fontSize: FONTS.size.xs, fontWeight: '700' },
  testBtn: { borderWidth: 1, borderColor: COLORS.purple, borderRadius: 8, padding: SPACING.sm, alignItems: 'center' },
  testTxt: { color: COLORS.purple, fontWeight: '700', fontSize: FONTS.size.sm },
  foot: { color: COLORS.textMuted, fontSize: FONTS.size.xs, fontStyle: 'italic', lineHeight: 18 },
});
