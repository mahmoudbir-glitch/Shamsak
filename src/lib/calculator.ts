export interface CalculatorInput {
  roofAreaM2: number;
  dailyConsumptionKwh: number;
  outageHours: number;
}

export function calculateSolarSystem(input: CalculatorInput) {
  const dailyConsumptionKwh = Number.isFinite(input.dailyConsumptionKwh)
    ? Math.max(0, input.dailyConsumptionKwh)
    : 0;
  const outageHours = Number.isFinite(input.outageHours)
    ? Math.min(24, Math.max(0, input.outageHours))
    : 0;

  const requiredSolarKw = Number((dailyConsumptionKwh / 4.5).toFixed(1));
  const recommendedPanels = Math.ceil((requiredSolarKw * 1000) / 550);
  const inverterCapacityKw = Math.ceil(requiredSolarKw * 1.2);
  const batteryCapacityKwh = Number(((dailyConsumptionKwh / 24) * outageHours * 1.3).toFixed(1));

  return {
    dailyConsumption: dailyConsumptionKwh,
    requiredSolarKw,
    recommendedPanels,
    inverterCapacityKw,
    batteryCapacityKwh,
    plans: {
      economical: { title: 'خطة توفيرية', solarKw: (requiredSolarKw * 0.7).toFixed(1), batteryKwh: (batteryCapacityKwh * 0.6).toFixed(1) },
      balanced: { title: 'خطة متوازنة', solarKw: requiredSolarKw.toFixed(1), batteryKwh: batteryCapacityKwh.toFixed(1) },
      independence: { title: 'استقلالية كاملة', solarKw: (requiredSolarKw * 1.3).toFixed(1), batteryKwh: (batteryCapacityKwh * 1.5).toFixed(1) },
    },
  };
}
