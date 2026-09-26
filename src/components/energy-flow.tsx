import React from 'react';

interface EnergyFlowProps {
  solarKw?: number;
  homeKw?: number;
  gridKw?: number;
  batteryKw?: number;
  batteryPercentage?: number;
}

export const EnergyFlow: React.FC<EnergyFlowProps> = ({
  solarKw = 5.83,
  homeKw = 1.30,
  gridKw = 0.45,
  batteryKw = 4.98,
  batteryPercentage = 78,
}) => {
  return (
    <div className="w-full max-w-md mx-auto p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
      {/* Header Tags */}
      <div className="flex justify-between items-center mb-6">
        <span className="px-3 py-1 bg-green-50 text-green-600 text-xs font-semibold rounded-full flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          حالة النظام الآن
        </span>
        <span className="px-3 py-1 bg-amber-50 text-amber-600 text-xs font-bold rounded-md">
          DEMO
        </span>
      </div>

      {/* Main Circular Diagram Container */}
      <div className="relative w-64 h-64 mx-auto my-4 flex items-center justify-center">
        {/* SVG Dashed/Dotted Connecting Ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
        </svg>

        {/* ⚡ CENTER LIGHTNING BADGE (Centered) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-11 h-11 bg-white rounded-full shadow-md flex items-center justify-center border border-gray-100">
          <span className="text-amber-500 text-lg">⚡</span>
        </div>

        {/* 1. TOP NODE: SOLAR */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center shadow-sm mb-1">
            <span className="text-xl">☀️</span>
          </div>
          <span className="text-[10px] font-bold text-gray-400 tracking-wider">SOLAR</span>
          <span className="text-xs font-black text-amber-600">kW {solarKw}</span>
          <span className="text-[9px] text-gray-400">إنتاج حالي</span>
        </div>

        {/* 2. RIGHT NODE: GRID */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shadow-sm mb-1">
            <span className="text-lg">📶</span>
          </div>
          <span className="text-[10px] font-bold text-gray-400 tracking-wider">GRID STATUS</span>
          <span className="text-xs font-black text-purple-600">kW {gridKw}</span>
          <span className="text-[9px] text-gray-400">تصدير إلى الشبكة</span>
        </div>

        {/* 3. BOTTOM NODE: BATTERY */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
          <div className="w-12 h-12 rounded-full border-4 border-emerald-400 bg-white flex items-center justify-center shadow-sm mb-1">
            <span className="text-xs font-bold text-gray-700">{batteryPercentage}%</span>
          </div>
          <span className="text-[10px] font-bold text-gray-400 tracking-wider">BATTERY STATUS</span>
          <span className="text-xs font-black text-emerald-600">kW {batteryKw}</span>
          <span className="text-[9px] text-gray-400">شحن</span>
        </div>

        {/* 4. LEFT NODE: HOME */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shadow-sm mb-1">
            <span className="text-lg">🏠</span>
          </div>
          <span className="text-[10px] font-bold text-gray-400 tracking-wider">HOME CONSUMPTION</span>
          <span className="text-xs font-black text-blue-600">kW {homeKw}</span>
          <span className="text-[9px] text-gray-400">استهلاك حالي</span>
        </div>
      </div>
    </div>
  );
};
