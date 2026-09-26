'use client';

import Link from 'next/link';
import { Home, House, BatteryCharging, Sun, WalletCards, Settings } from 'lucide-react';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/', label: 'الرئيسية', Icon: Home },
  { href: '/home-consumption', label: 'المنزل', Icon: House },
  { href: '/battery', label: 'البطارية', Icon: BatteryCharging },
  { href: '/energy-forecast', label: 'الطاقة', Icon: Sun },
  { href: '/savings', label: 'المال', Icon: WalletCards },
  { href: '/settings', label: 'الإعدادات', Icon: Settings },
];

export function BottomNav() {
  const path = usePathname();

  if (path === "/login") return null;\n\n  return (
    <nav
      aria-label="التنقل السفلي"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur md:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-6 gap-1">
        {items.map(({ href, label, Icon }) => {
          const aliases: Record<string, string[]> = {
            "/home-consumption": ["/home-consumption", "/home"],
            "/energy-forecast": ["/energy-forecast", "/energy", "/forecast"],
            "/savings": ["/savings", "/money"],
          };
          const active = href === "/"
            ? path === "/"
            : (aliases[href] ?? [href]).some((route) => path === route || path.startsWith(route + "/"));

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={
                "flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold transition active:scale-95 " +
                (active
                  ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100"
                  : "text-slate-500 hover:bg-slate-50")
              }
            >
              <Icon size={19} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
