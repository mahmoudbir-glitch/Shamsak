import React from 'react';

interface EnergyFlowProps {
  solarKw: number;
  homeKw: number;
  gridKw: number;
  batteryKw: number;
  batteryPercentage: number;
  isLive?: boolean;
  lastUpdated?: string;
}

export const EnergyFlow: React.FC<EnergyFlowProps> = ({
  solarKw,
  homeKw,
  gridKw,
  batteryKw,
  batteryPercentage,
  isLive = false,
  lastUpdated,
}) => {
  return (
    <div className="w-full max-w-md mx-auto p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <span className="px-3 py-1 bg-green-50 text-green-600 text-xs font-semibold rounded-full flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          حالة النظام الآن
        </span>

        <span
          className={`px-3 py-1 text-xs font-bold rounded-md border transition-colors ${
            isLive
              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
              : 'bg-amber-50 text-amber-600 border-amber-200'
          }`}
          aria-live="polite"
        >
          {isLive ? '● مباشر' : 'غير متصل'}
        </span>
      </div>

      <div className="relative w-64 h-64 mx-auto my-4 flex items-center justify-center">
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
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

        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-11 h-11 bg-white rounded-full shadow-md flex items-center justify-center border border-gray-100"
          aria-label="مركز تدفق الطاقة"
        >
          <span className="text-amber-500 text-lg" aria-hidden="true">⚡</span>
        </div>

        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center shadow-sm mb-1">
            <span className="text-xl" aria-hidden="true">☀️</span>
          </div>
          <span className="text-xs font-bold text-slate-800 tracking-wider">SOLAR</span>
          <span className="text-sm font-bold text-amber-600">kW {solarKw.toFixed(2)}</span>
          <span className="text-xs font-medium text-slate-600">إنتاج حالي</span>
        </div>

        <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shadow-sm mb-1">
            <span className="text-lg" aria-hidden="true">📶</span>
          </div>
          <span className="text-xs font-bold text-slate-800 tracking-wider">GRID STATUS</span>
          <span className="text-sm font-bold text-purple-600">kW {Math.abs(gridKw).toFixed(2)}</span>
          <span className="text-xs font-medium text-slate-600">
            {gridKw < -0.05 ? 'تصدير إلى الشبكة' : gridKw > 0.05 ? 'سحب من الشبكة' : 'متوازنة'}
          </span>
        </div>

        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
          <div className="w-12 h-12 rounded-full border-4 border-emerald-400 bg-white flex items-center justify-center shadow-sm mb-1">
            <span className="text-xl font-black text-slate-800">{batteryPercentage.toFixed(0)}%</span>
          </div>
          <span className="text-xs font-bold text-slate-800 tracking-wider">BATTERY STATUS</span>
          <span className="text-sm font-bold text-emerald-600">kW {Math.abs(batteryKw).toFixed(2)}</span>
          <span className="text-xs font-medium text-slate-600">
            {batteryKw > 0.05 ? 'شحن' : batteryKw < -0.05 ? 'تفريغ' : 'ثابتة'}
          </span>
        </div>

        <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shadow-sm mb-1">
            <span className="text-lg" aria-hidden="true">🏠</span>
          </div>
          <span className="text-xs font-bold text-slate-800 tracking-wider">HOME CONSUMPTION</span>
          <span className="text-sm font-bold text-blue-600">kW {homeKw.toFixed(2)}</span>
          <span className="text-xs font-medium text-slate-600">استهلاك حالي</span>
        </div>
      </div>

      {!isLive && (
        <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3 text-center text-xs font-bold text-amber-800">
          ⚠️ لا توجد قراءة حية متاحة حاليًا. تحقّق من اتصال الإنفرتر وإرسال بيانات القياس.
        </div>
      )}

      {lastUpdated && (
        <div className="mt-3 text-center text-xs text-slate-500">
          آخر قراءة: {lastUpdated}
        </div>
      )}
    </div>
  );
};
