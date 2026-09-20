/**
 * Nút Menu (☰) dùng chung — tách từ ScreenHeader để Home cũng dùng được.
 *  - iOS: ActionSheet native (tự dismiss trước callback → không kẹt touch).
 *  - Android: overlay tuyệt đối phủ toàn màn.
 *  - Điều hướng qua navigationRef toàn cục (StackActions.push / reset Home).
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Pressable, Dimensions,
  Platform, ActionSheetIOS,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, StackActions, CommonActions } from '@react-navigation/native';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { navigationRef } from '../navigation/AppNavigator';
import { useAuth } from '../context/AuthContext';
import { loadNotifications, subscribeNotifications, unreadCount } from '../lib/notificationCenter';

type MenuAction = { label: string; emoji: string; run: () => void; danger?: boolean };

export default function HeaderMenuButton({ color }: { color?: string }) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(unreadCount());
  const { online, logout: authLogout } = useAuth();

  useEffect(() => {
    let mounted = true;
    loadNotifications().then(() => { if (mounted) setUnread(unreadCount()); });
    const unsub = subscribeNotifications(() => { if (mounted) setUnread(unreadCount()); });
    return () => { mounted = false; unsub(); };
  }, []);

  useFocusEffect(useCallback(() => {
    setOpen(false);
    setUnread(unreadCount());
    return () => setOpen(false);
  }, []));

  const goRoot = (name: string) => {
    if (!navigationRef.isReady()) return;
    if (name === 'Home') {
      navigationRef.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Home' }] }));
      return;
    }
    navigationRef.dispatch(StackActions.push(name));
  };
  const logout = () => {
    if (online) { authLogout(); return; }
    if (!navigationRef.isReady()) return;
    navigationRef.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Home' }] }));
  };

  const actions: MenuAction[] = [
    { label: 'Trang chủ', emoji: '🏠', run: () => goRoot('Home') },
    { label: `Tin thông báo (${unread})`, emoji: '🔔', run: () => goRoot('Notifications') },
    { label: 'Khuyến mại', emoji: '🎁', run: () => goRoot('Promotions') },
    { label: 'Lập lá số mới', emoji: '🧾', run: () => goRoot('Input') },
    { label: 'Lá số đã lưu', emoji: '🗂️', run: () => goRoot('MyCharts') },
    { label: 'Thông tin tài khoản', emoji: '👤', run: () => goRoot('Account') },
    { label: 'Nạp xu', emoji: '💰', run: () => goRoot('Wallet') },
    { label: 'Thông tin bảo mật', emoji: '🔒', run: () => goRoot('Privacy') },
    { label: 'Điều khoản sử dụng', emoji: '📄', run: () => goRoot('Terms') },
    { label: 'Giới thiệu', emoji: 'ℹ️', run: () => goRoot('About') },
    { label: 'Đăng xuất', emoji: '🚪', run: logout, danger: true },
  ];

  const openMenu = () => {
    if (Platform.OS === 'ios') {
      const labels = actions.map(a => `${a.emoji} ${a.label}`);
      const options = [...labels, 'Đóng'];
      const cancelButtonIndex = options.length - 1;
      const destructiveButtonIndex = actions.findIndex(a => a.danger);
      ActionSheetIOS.showActionSheetWithOptions(
        { title: 'Menu', options, cancelButtonIndex, destructiveButtonIndex },
        (idx) => {
          if (idx == null || idx === cancelButtonIndex) return;
          const act = actions[idx];
          if (act) act.run();
        },
      );
    } else {
      setOpen(true);
    }
  };

  const goAndroid = (fn: () => void) => {
    setOpen(false);
    requestAnimationFrame(fn);
  };

  const screen = Dimensions.get('window');

  // Overlay backdrop tap-to-close:
  //  - Web: position:fixed phủ đúng viewport (KHÔNG dùng width*2 vì sẽ tràn
  //    document làm trình duyệt zoom-out → cả UI bị thu nhỏ).
  //  - Native (Android): absolute mở rộng 2x để phủ chắc bất kể vị trí.
  const overlayStyle = Platform.OS === 'web'
    ? ({ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 1 } as any)
    : [styles.overlay, { top: -(insets.top + 60), left: -(screen.width), width: screen.width * 2, height: screen.height * 2 }];

  return (
    <View style={[styles.wrap, open && styles.raised]}>
      <TouchableOpacity style={styles.menuBtn} onPress={openMenu} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={[styles.menuTxt, color ? { color } : null]}>☰</Text>
      </TouchableOpacity>

      {open && Platform.OS !== 'ios' && (
        <>
          <Pressable
            style={overlayStyle}
            onPress={() => setOpen(false)}
          />
          <View style={styles.menuBox}>
            <Text style={styles.menuTitle}>Menu</Text>
            {actions.map((a, i) => (
              <React.Fragment key={a.label + i}>
                {a.danger && <View style={styles.sep} />}
                <TouchableOpacity style={styles.item} onPress={() => goAndroid(a.run)} activeOpacity={0.7}>
                  <Text style={[styles.itemTxt, a.danger && { color: COLORS.red }]} numberOfLines={1}>
                    {a.emoji} {a.label}
                  </Text>
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 44, height: 36, alignItems: 'flex-end', justifyContent: 'center' },
  raised: { zIndex: 9999, elevation: 9999 },
  menuBtn: { width: 44, height: 36, alignItems: 'flex-end', justifyContent: 'center' },
  menuTxt: { color: COLORS.gold, fontSize: 26, fontWeight: '900', lineHeight: 28 },
  overlay: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 1 },
  menuBox: {
    position: 'absolute', right: 0, top: 40,
    width: 280, backgroundColor: COLORS.card,
    borderRadius: 12, paddingVertical: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.gold,
    zIndex: 2, elevation: 12,
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  menuTitle: {
    color: COLORS.gold, fontWeight: '800', fontSize: FONTS.size.sm,
    paddingHorizontal: SPACING.md, paddingBottom: 4, letterSpacing: 0.5,
  },
  item: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  itemTxt: { color: COLORS.textPrimary, fontSize: FONTS.size.md, fontWeight: '600' },
  sep: { height: 1, backgroundColor: COLORS.border, marginVertical: 4 },
});
