"use client";

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { BottomNav, DesktopNav, navGlow } from '@/components/bottom-nav';
import LogoutButton from '@/components/logout-button';
import { StatusBar } from '@/components/status-bar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === '/login';

  useEffect(() => {
    if (isLogin) return;

    let active = true;

    const verifyStillAuthenticated = async () => {
      try {
        const response = await fetch('/api/auth/session', {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
          headers: { 'Cache-Control': 'no-cache' },
        });

        if (active && response.status === 401) {
          window.location.replace('/login?next=' + encodeURIComponent(pathname || '/'));
        }
      } catch {
        // Keep the current page on transient network errors.
      }
    };

    // Re-check whenever the user navigates between protected pages.
    void verifyStillAuthenticated();

    // Browser back/forward can restore a protected page from bfcache
    // without a new server request. Verify the session when that happens.
    const handlePageShow = () => {
      void verifyStillAuthenticated();
    };

    window.addEventListener('pageshow', handlePageShow);

    return () => {
      active = false;
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [isLogin, pathname]);

  useEffect(() => {
    if (isLogin) return;
    const key = 'shamsak_monitoring_app_open_recorded';
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    void fetch('/api/monitoring/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'APP_OPEN' }),
    }).catch(() => undefined);
  }, [isLogin]);

  if (isLogin) return <>{children}</>;

  return (
    <div className={"min-h-screen w-full bg-gradient-to-b via-slate-50 via-40% to-slate-50 " + navGlow(pathname || '/')}>
      {/* One frosted bar (the page scrolls on beneath it, tinted in the open page's colour): brand (with the connection dot beside the name) and tagline, logout. */}
      <header className="sticky top-0 z-50 border-b border-white/70 bg-white/90 pt-[env(safe-area-inset-top)] text-slate-900 shadow-[0_6px_24px_rgba(15,23,42,0.04)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/85">
        <div className="mx-auto flex min-h-[4.5rem] max-w-5xl items-center justify-between gap-3 px-3 py-2.5 sm:px-6 lg:max-w-6xl">
          <div className="flex min-w-0 items-center gap-2.5" aria-label="شمسك">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-200/80" aria-hidden="true"><span className="sun-twinkle text-[1.6rem] leading-none">☀️</span></span>
            <div className="min-w-0">
              <div className="flex items-center gap-2"><span className="truncate text-xl font-black leading-tight">شمسك</span><StatusBar compact /></div>
              <div className="truncate text-xs font-extrabold text-slate-500">الشمس تعمل من أجلك</div>
            </div>
          </div>
          <LogoutButton />
        </div>
      </header>
      <div className="mx-auto hidden max-w-5xl px-4 pt-3 sm:px-6 md:block lg:max-w-6xl">
        <DesktopNav />
      </div>
      <main className="mx-auto min-h-[calc(100vh-120px)] w-full max-w-3xl px-3 py-3 pb-28 sm:px-5 sm:py-6 md:pb-8 lg:max-w-6xl">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
