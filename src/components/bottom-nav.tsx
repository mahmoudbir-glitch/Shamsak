'use client';

import Link from 'next/link';
import { Home, House, BatteryCharging, Sun, WalletCards, Settings } from 'lucide-react';
import { usePathname } from 'next/navigation';

export const navItems = [
  { href: '/', label: 'الرئيسية', Icon: Home },
  { href: '/home-consumption', label: 'المنزل', Icon: House },
  { href: '/battery', label: 'البطارية', Icon: BatteryCharging },
  { href: '/energy', label: 'الطاقة', Icon: Sun },
  { href: '/money', label: 'المال', Icon: WalletCards },
  { href: '/settings', label: 'الإعدادات', Icon: Settings },
];

export function isNavActive(path: string, href: string) {
  const aliases: Record<string, string[]> = {
    '/home-consumption': ['/home-consumption', '/home'],
    '/energy': ['/energy', '/energy-forecast', '/forecast'],
    '/money': ['/money', '/savings'],
  };
  return href === '/'
    ? path === '/'
    : (aliases[href] ?? [href]).some((route) => path === route || path.startsWith(route + '/'));
}

export function DesktopNav() {
  const path = usePathname();
  if (path === '/login') return null;

  return (
    <nav aria-label="التنقل الرئيسي" className="hidden md:block">
      <div className="mx-auto flex max-w-3xl items-center gap-1 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-1.5 shadow-inner">
        {navItems.map(({ href, label, Icon }) => {
          const active = isNavActive(path, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={
                'flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-extrabold transition-all ' +
                (active
                  ? 'bg-white text-blue-700 shadow-sm ring-1 ring-blue-100'
                  : 'text-slate-500 hover:bg-white/80 hover:text-slate-800')
              }
            >
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function BottomNav() {
  const path = usePathname();
  if (path === '/login') return null;

  return (
    <nav
      aria-label="التنقل السفلي"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200/80 bg-white/95 px-2 pt-2 shadow-[0_-10px_35px_rgba(15,23,42,0.10)] backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-6 gap-1">
        {navItems.map(({ href, label, Icon }) => {
          const active = isNavActive(path, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={
                'group flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-extrabold transition-all active:scale-95 ' +
                (active
                  ? 'bg-gradient-to-b from-blue-50 to-indigo-50 text-blue-700 shadow-sm ring-1 ring-blue-100'
                  : 'text-slate-500 hover:bg-slate-50')
              }
            >
              <span className={active ? 'flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm' : 'flex h-8 w-8 items-center justify-center rounded-xl'}>
                <Icon size={18} strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
              </span>
              <span className="leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
