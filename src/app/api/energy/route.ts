import { NextResponse } from 'next/server';
// استيراد عميل Supabase الخاص بمشروعك
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET() {
  try {
    // جلب آخر قراءة تم تسجيلها للمنظومة الشمسيّة من جدول الإحصاءات
    const { data, error } = await supabase
      .from('inverter_readings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    // في حال عدم توفر قاعدة البيانات حالياً، يتم إرسال أرقام افتراضية آمنة كبديل (Fallback)
    return NextResponse.json({
      success: false,
      data: {
        solar_production: 5827,
        home_consumption: 1299,
        battery_level: 94,
        grid_status: "مقطوعة"
      }
    });
  }
}
