import { NextResponse } from 'next/server';

export async function GET() {
  // إرسال قراءات الطاقة اللحظية والتنبؤية مباشرة بدون الحاجة لـ Supabase حالياً
  return NextResponse.json({
    success: true,
    data: {
      solar_production: 5827,
      home_consumption: 1299,
      battery_level: 94,
      grid_status: "مقطوعة"
    }
  });
}
