export default function Loading() {
  return (
    <div
      dir="rtl"
      className="flex min-h-[100svh] w-full items-center justify-center bg-[#f8fafc] px-4"
      aria-label="جاري تحميل شمسك"
    >
      <div className="flex flex-col items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-50 to-orange-100 text-4xl shadow-sm ring-1 ring-amber-200/70">
          ☀️
        </div>
        <div className="mt-4 text-2xl font-black tracking-tight text-slate-950">
          شمسك
        </div>
        <div className="mt-2 text-xs font-bold text-slate-400">
          جاري تحميل لوحة الطاقة…
        </div>
        <div className="mt-5 h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-amber-400" />
        </div>
      </div>
    </div>
  );
}
