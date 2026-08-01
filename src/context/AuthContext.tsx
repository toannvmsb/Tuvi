/**
 * Quản lý phiên đăng nhập toàn app.
 * - Nếu CHƯA cấu hình Supabase (supabaseConfig) → chạy chế độ "khách" (offline,
 *   ví Admin cục bộ) như trước, không bắt đăng nhập.
 * - Nếu ĐÃ cấu hình → kiểm tra phiên, tải hồ sơ + ví xu từ server.
 */
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { isOnlineMode, getCurrentUser, loadProfileIntoWallet, signOut, type AuthUser } from '../lib/auth';
import { loadAppConfig } from '../lib/appConfig';
import { seedWallet } from '../constants/premium';

interface AuthState {
  online: boolean;          // có dùng Supabase không
  ready: boolean;           // đã kiểm tra xong phiên ban đầu
  user: AuthUser | null;    // user đã đăng nhập (null nếu chưa)
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthState>({
  online: false, ready: true, user: null,
  refresh: async () => {}, logout: async () => {},
});

export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const online = isOnlineMode();
  const [ready, setReady] = useState(!online); // offline thì sẵn sàng ngay
  const [user, setUser] = useState<AuthUser | null>(null);
  const xuChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const refresh = useCallback(async () => {
    if (!online) { setReady(true); return; }
    const u = await getCurrentUser();
    setUser(u);
    if (u) {
      try { await loadProfileIntoWallet(u); } catch {}
      // Đăng ký push token (nền, không chặn UI) để webhook đẩy thông báo nạp xu.
      try { const { registerForPush } = await import('../lib/notifications'); void registerForPush(); } catch {}

      // Realtime: lắng nghe thay đổi xu từ server (web/admin trừ xu → app cập nhật ngay).
      if (xuChannelRef.current) {
        supabase.removeChannel(xuChannelRef.current);
      }
      xuChannelRef.current = supabase
        .channel(`profile-xu-${u.id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${u.id}`,
        }, (payload: any) => {
          const newXu = payload.new?.xu;
          if (typeof newXu === 'number') seedWallet({ balance: newXu });
        })
        .subscribe();
    }
    setReady(true);
  }, [online]);

  const logout = useCallback(async () => {
    if (online) await signOut();
    if (xuChannelRef.current) {
      supabase.removeChannel(xuChannelRef.current);
      xuChannelRef.current = null;
    }
    setUser(null);
  }, [online]);

  useEffect(() => {
    // Fetch giá từ backend ngay khi app mở (cả khách lẫn user đã đăng nhập).
    void loadAppConfig();
    refresh();
    if (!online) return;
    const { data: sub } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (!session) { setUser(null); return; }
      refresh();
    });
    return () => {
      sub.subscription.unsubscribe();
      if (xuChannelRef.current) supabase.removeChannel(xuChannelRef.current);
    };
  }, [online, refresh]);

  return (
    <Ctx.Provider value={{ online, ready, user, refresh, logout }}>
      {children}
    </Ctx.Provider>
  );
}
