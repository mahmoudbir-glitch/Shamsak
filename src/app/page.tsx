'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function HomeDashboard() {
  // حالة البيانات الحية للمنظومة (القيم الافتراضية عند التحميل)
  const [energyData, setEnergyData] = useState({
    solar_kw: 0.00,
    home_kw: 0.00,
    battery_kw: 0.00,
    battery_soc: 0,
    grid_kw: 0.00,
    battery_voltage: 0.0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. جلب آخر قراءة مسجلة في قاعدة البيانات فور فتح التطبيق مباشرة
    const fetchLatestReading = async () => {
      try {
        const { data, error } = await supabase
          .from('inverter_readings')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          setEnergyData(data[0]);
        }
      } catch (err) {
        console.error("خطأ أثناء جلب القراءات الأولية:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestReading();

    // 2. الاشتراك في البث الحي واللحظي (Realtime WebSockets)
    // أي سطر جديد يدخله الهاردوير في جدول قاعدة البيانات سيحدث الشاشة فوراً وبدون ريفريش
    const channel = supabase
      .channel('live-inverter-data')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'inverter_readings' }, 
        (payload) => {
          if (payload.new) {
            setEnergyData(payload.new as any);
          }
        }
      )
      .subscribe();

    // تنظيف الاتصال بالقناة الحية عند مغادرة أو إغلاق الصفحة
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-700">
        <p className="text-xl font-bold animate-pulse">جاري الاتصال بمنظومة شمسك الحية...</p>
      </div>
    );
  }

  return (
    // واجهة تطبيق شمسك الأنيقة المعتمدة على المظهر المضيء النظيف الخالي من العتمة
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white text-slate-800 p-6 flex flex-col items-center">
      <header className="w-full max-w-md flex justify-between items-center mb-8">
        <h1 className="text-2xl font-black text-blue-600">شمسك ☀️</h1>
        <div className="flex items-center space-x-2">
          <span className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full font-bold">● حي الآن</span>
        </div>
      </header>

      <main className="w-full max-w-md space-y-6">
        {/* كارت البطارية الرئيسي الدائري الكبير */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col items-center justify-center">
          <span className="text-sm font-medium text-slate-500 mb-1">حالة مخزون الطاقة</span>
          <div className="text-6xl font-black text-slate-800 tracking-tight mb-2">
            {energyData.battery_soc}%
          </div>
          <div className="text-sm text-blue-600 font-bold bg-blue-50 px-4 py-1 rounded-full">
            {energyData.battery_voltage} فولت
          </div>
        </div>

        {/* شبكة توزيع وتدفق البيانات الحية */}
        <div className="grid grid-cols-2 gap-4">
          {/* إنتاج الشمس الحالي */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="text-xs font-semibold text-slate-400 mb-1">إنتاج الخلايا الشمسية</div>
            <div className="text-2xl font-black text-amber-500">{energyData.solar_kw} kW</div>
          </div>

          {/* استهلاك المنزل الحقيقي */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="text-xs font-semibold text-slate-400 mb-1">حمولة المنزل الحالية</div>
            <div className="text-2xl font-black text-red-500">{energyData.home_kw} kW</div>
          </div>

          {/* تيار شحن أو تفريغ خزان البطاريات */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="text-xs font-semibold text-slate-400 mb-1">قدرة شحن البطارية</div>
            <div className="text-2xl font-black text-blue-500">{energyData.battery_kw} kW</div>
          </div>

          {/* خط شركة الكهرباء أو المولد */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="text-xs font-semibold text-slate-400 mb-1">الشبكة العامة</div>
            <div className="text-2xl font-black text-teal-600">{energyData.grid_kw} kW</div>
          </div>
        </div>
      </main>
    </div>
  );
}
