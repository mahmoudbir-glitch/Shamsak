'use client';

import Link from 'next/link';
import { Home, House, BatteryCharging, Sun, WalletCards, Settings } from 'lucide-react';
import { usePathname } from 'next/navigation';

type NavTone = 'blue' | 'violet' | 'emerald' | 'sky' | 'cyan' | 'indigo';

const activeToneClasses: Record<NavTone, string> = {
  blue: 'bg-blue-50 text-blue-700 ring-blue-100',
  violet: 'bg-violet-50 text-violet-700 ring-violet-100',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  sky: 'bg-sky-50 text-sky-700 ring-sky-100',
  cyan: 'bg-cyan-50 text-cyan-700 ring-cyan-100',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
};

export const navItems: { href: string; label: string; Icon: typeof Home; tone: NavTone }[] = [
  { href: '/', label: 'الرئيسية', Icon: Home, tone: 'blue' },
  { href: '/home-consumption', label: 'المنزل', Icon: House, tone: 'violet' },
  { href: '/battery', label: 'البطارية', Icon: BatteryCharging, tone: 'emerald' },
  { href: '/energy', label: 'الطاقة', Icon: Sun, tone: 'sky' },
  { href: '/money', label: 'المال', Icon: WalletCards, tone: 'cyan' },
  { href: '/settings', label: 'الإعدادات', Icon: Settings, tone: 'indigo' },
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
      <div className="mx-auto flex max-w-3xl items-center gap-1 rounded-2xl border border-slate-200/70 bg-white/80 p-1.5 shadow-sm backdrop-blur">
        {navItems.map(({ href, label, Icon, tone }) => {
          const active = isNavActive(path, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={
                'flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-extrabold transition-all ' +
                (active
                  ? (activeToneClasses[tone] + ' shadow-sm ring-1')
                  : 'text-slate-500 hover:bg-white/80 hover:text-slate-800')
              }
            >
              <Icon size={21} strokeWidth={2.4} aria-hidden="true" />
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
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200/70 bg-white/96 px-2 pt-2 shadow-[0_-10px_35px_rgba(15,23,42,0.10)] backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-6 gap-1">
        {navItems.map(({ href, label, Icon, tone }) => {
          const active = isNavActive(path, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={
                'group flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-extrabold transition-all active:scale-95 ' +
                (active
                  ? (activeToneClasses[tone] + ' shadow-sm ring-1')
                  : 'text-slate-500 hover:bg-slate-50')
              }
            >
              <span className={active ? 'flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm' : 'flex h-10 w-10 items-center justify-center rounded-2xl'}>
                <Icon size={23} strokeWidth={active ? 2.7 : 2.2} aria-hidden="true" />
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
