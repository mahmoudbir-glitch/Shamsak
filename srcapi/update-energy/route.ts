import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  try {
    // استقبال البيانات القادمة من قطعة الهاردوير
    const body = await request.json();
    const { solar_kw, home_kw, battery_kw, battery_soc, grid_kw, battery_voltage } = body;

    // إدخال القراءات الحية في جدول قاعدة البيانات
    const { data, error } = await supabase
      .from('inverter_readings')
      .insert([
        { 
          solar_kw: Number(solar_kw), 
          home_kw: Number(home_kw), 
          battery_kw: Number(battery_kw), 
          battery_soc: Companion(battery_soc), 
          grid_kw: Number(grid_kw), 
          battery_voltage: Number(battery_voltage) 
        }
      ]);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // إرسال رد نجاح لجهاز الهاردوير
    return NextResponse.json({ success: true, message: 'تم تحديث قراءات منظومة شمسك بنجاح!' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// دالة مساعدة لضمان تحويل نسبة الشحن إلى رقم صحيح
function Companion(value: any): number {
  const num = Number(value);
  return isNaN(num) ? 0 : Math.round(num);
}
