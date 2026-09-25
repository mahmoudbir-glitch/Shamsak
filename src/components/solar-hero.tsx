import Image from "next/image";

export function SolarHero() {
  return (
    <section aria-labelledby="solar-hero-title" className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="p-4 pb-3 sm:p-5">
        <div>
          <h2 id="solar-hero-title" className="text-xl font-extrabold tracking-tight text-slate-900">
            <span aria-hidden="true" className="me-1">☀️</span>
            شمسك
          </h2>
          <p className="mt-1 text-sm text-slate-500">إدارة ومراقبة الطاقة الشمسية</p>
        </div>
      </div>
      <div className="px-3 pb-3 sm:px-5 sm:pb-5">
        <Image
          src="/images/shamsak-energy-dashboard.jpg"
          alt="واجهة شمسك لتدفق الطاقة بين الألواح الشمسية والشبكة والمنزل والبطارية"
          width={1600}
          height={900}
          priority
          className="h-auto w-full rounded-2xl object-contain"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1100px"
        />
      </div>
    </section>
  );
}
