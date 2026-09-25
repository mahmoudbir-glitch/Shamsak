'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

// تعريف البنية الدقيقة للبيانات لمنع أخطاء التايب سكريبت
interface InverterData {
  solar_kw: number;
  home_kw: number;
  battery_kw: number;
  battery_soc: number;
  grid_kw: number;
  battery_voltage: number;
}

export default function HomeDashboard() {
  const [energyData, setEnergyData] = useState<InverterData>({
    solar_kw: 0.00,
    home_kw: 0.00,
    battery_kw: 0.00,
    battery_soc: 0,
    grid_kw: 0.00,
    battery_voltage: 0.0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestReading = async () => {
      try {
        const { data, error } = await supabase
          .from('inverter_readings')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          setEnergyData(data[0] as InverterData);
        }
      } catch (err) {
        console.error("خطأ أثناء جلب القراءات الأولية:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestReading();

    // ربط البث اللحظي مع تحديد نوع الـ payload لتفادي خطأ typescript بالكامل
    const channel = supabase
      .channel('live-inverter-data')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'inverter_readings' }, 
        (payload: { new: Record<string, any> }) => {
          if (payload.new) {
            setEnergyData({
              solar_kw: Number(payload.new.solar_kw || 0),
              home_kw: Number(payload.new.home_kw || 0),
              battery_kw: Number(payload.new.battery_kw || 0),
              battery_soc: Number(payload.new.battery_soc || 0),
              grid_kw: Number(payload.new.grid_kw || 0),
              battery_voltage: Number(payload.new.battery_voltage || 0),
            });
          }
        }
      )
      .subscribe();

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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white text-slate-800 p-6 flex flex-col items-center">
      <header className="w-full max-w-md flex justify-between items-center mb-8">
        <h1 className="text-2xl font-black text-blue-600">شمسك ☀️</h1>
        <div className="flex items-center space-x-2">
          <span className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full font-bold">● حي الآن</span>
        </div>
      </header>

      <main className="w-full max-w-md space-y-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col items-center justify-center">
          <span className="text-sm font-medium text-slate-500 mb-1">حالة مخزون الطاقة</span>
          <div className="text-6xl font-black text-slate-800 tracking-tight mb-2">
            {energyData.battery_soc}%
          </div>
          <div className="text-sm text-blue-600 font-bold bg-blue-50 px-4 py-1 rounded-full">
            {energyData.battery_voltage} فولت
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="text-xs font-semibold text-slate-400 mb-1">إنتاج الخلايا الشمسية</div>
            <div className="text-2xl font-black text-amber-500">{energyData.solar_kw} kW</div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="text-xs font-semibold text-slate-400 mb-1">حمولة المنزل الحالية</div>
            <div className="text-2xl font-black text-red-500">{energyData.home_kw} kW</div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="text-xs font-semibold text-slate-400 mb-1">قدرة شحن البطارية</div>
            <div className="text-2xl font-black text-blue-500">{energyData.battery_kw} kW</div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="text-xs font-semibold text-slate-400 mb-1">الشبكة العامة</div>
            <div className="text-2xl font-black text-teal-600">{energyData.grid_kw} kW</div>
          </div>
        </div>
      </main>
    </div>
  );
}
