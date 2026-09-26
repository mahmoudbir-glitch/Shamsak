'use client';

import { useEffect, useState } from 'react';
import { SolarHero } from '@/components/solar-hero';
import { demoSnapshot, type EnergySnapshot } from '@/lib/energy';
import { supabase } from '@/lib/supabaseClient';

function toFiniteNumber(value: unknown, fallback = 0) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function snapshotFromRow(row: Record<string, unknown>): EnergySnapshot {
  return {
    timestamp: typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
    solarPowerW: Math.max(0, toFiniteNumber(row.solar_kw) * 1000),
    homePowerW: Math.max(0, toFiniteNumber(row.home_kw) * 1000),
    gridPowerW: toFiniteNumber(row.grid_kw) * 1000,
    batteryPowerW: toFiniteNumber(row.battery_kw) * 1000,
    batterySoc: Math.min(100, Math.max(0, toFiniteNumber(row.battery_soc))),
    batteryVoltage: Math.max(0, toFiniteNumber(row.battery_voltage)),
    batteryCurrent: row.battery_current == null ? undefined : toFiniteNumber(row.battery_current),
    batteryTemperature: row.battery_temperature == null ? undefined : toFiniteNumber(row.battery_temperature),
    gridConnected: row.grid_connected !== false,
    source: 'live',
  };
}

export default function HomeDashboard() {
  const [data, setData] = useState<EnergySnapshot | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadLatest() {
      const { data: rows, error } = await supabase
        .from('inverter_readings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!mounted) return;

      if (!error && rows?.[0]) {
        setData(snapshotFromRow(rows[0] as Record<string, unknown>));
      } else {
        // Demo is explicit; it is never presented as a live device connection.
        setData({ ...demoSnapshot, timestamp: new Date().toISOString(), source: 'demo' });
      }
    }

    void loadLatest();

    const channel = supabase
      .channel('live-inverter-data')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'inverter_readings' },
        (payload) => {
          if (!mounted || !payload.new) return;
          setData(snapshotFromRow(payload.new as Record<string, unknown>));
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto w-full max-w-6xl space-y-5 p-3 pb-28 sm:p-6">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-slate-400">لوحة الطاقة المنزلية</p>
            <h1 className="text-2xl font-black text-blue-600">شمسك ☀️</h1>
          </div>
          {data && (
            <span className={`rounded-full border px-3 py-1.5 text-xs font-black ${
              data.source === 'live'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-amber-200 bg-amber-50 text-amber-700'
            }`}>
              {data.source === 'live' ? 'LIVE' : 'DEMO'}
            </span>
          )}
        </header>

        <SolarHero data={data} />

        {data && (
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="ملخص الطاقة">
            {[
              ['الشمس', `${(data.solarPowerW / 1000).toFixed(2)} kW`],
              ['المنزل', `${(data.homePowerW / 1000).toFixed(2)} kW`],
              ['البطارية', `${Math.round(data.batterySoc)}%`],
              ['الجهد', data.batteryVoltage == null ? '—' : `${data.batteryVoltage.toFixed(1)} V`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-bold text-slate-400">{label}</p>
                <p className="mt-1 text-xl font-black text-slate-800">{value}</p>
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
