import LoginForm from "@/components/login-form";
export const metadata={title:"تسجيل الدخول | شمسك",robots:{index:false,follow:false}};
export default function LoginPage(){
  return <div dir="rtl" className="flex min-h-[70vh] items-center justify-center">
    <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 text-center"><div className="text-4xl">☀️</div><h1 className="mt-2 text-2xl font-black">شمسك</h1><p className="mt-1 text-sm font-semibold text-slate-500">تسجيل الدخول إلى لوحة الطاقة</p></div>
      <LoginForm />
    </section>
  </div>;
}
