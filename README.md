# شمسك ☀️ — Shamsak

تطبيق عربي RTL لإدارة ومراقبة منظومة الطاقة الشمسية المنزلية، مبني على Next.js App Router وPrisma/PostgreSQL.

## البنية الحالية

```
الإنفرتر
   ↓
Gateway محلي (ESP32 / Raspberry Pi / Wi‑Fi dongle أو جهاز محلي مناسب)
   ↓ HTTPS + Authorization: Bearer <TELEMETRY_INGEST_TOKEN>
/api/telemetry
   ↓
Prisma / PostgreSQL
   ↓
لوحة شمسك
```

Vercel لا يتصل مباشرة بمنفذ USB/RS485 أو COM الموجود داخل المنزل. القراءة الفعلية من الإنفرتر تتم محلياً، والـ Gateway يحوّل القراءات إلى صيغة telemetry الموحدة ويرسلها إلى التطبيق.

## Telemetry API

المسار المخصص لاستقبال بيانات الـ Gateway هو:

`POST /api/telemetry`

يجب إرسال:

```http
Authorization: Bearer <TELEMETRY_INGEST_TOKEN>
Content-Type: application/json
```

مثال payload:

```json
{
  "timestamp": "2026-09-29T12:00:00.000Z",
  "pv_power": 4200,
  "load_power": 3350,
  "battery_soc": 78,
  "battery_power": 850,
  "battery_voltage": 51.2,
  "battery_current": 16.6,
  "battery_temperature": 28,
  "grid_status": false,
  "grid_power": 0,
  "source": "inverter"
}
```

في شمسك، القيمة الموجبة لـ `battery_power` و`battery_current` تعني الشحن، والقيمة السالبة تعني التفريغ. يجب على الـ Gateway تطبيع إشارة الإنفرتر وفق هذه القاعدة قبل الإرسال.

## المصادقة

- صفحات التطبيق محمية بجلسة المتصفح.
- `/api/auth/*` و`/api/telemetry` مستثناة من حماية middleware.
- استقبال telemetry لا يعتمد على Cookie؛ يعتمد على Bearer Token.
- جلسة المتصفح موقعة باستخدام Web Crypto، لذلك `verifySessionToken` متوافق مع Edge middleware.
- صفحة تسجيل الدخول ترفض قيم `next` التي تبدأ بـ `//`، ويوجد حد لمحاولات الدخول الفاشلة.

## قاعدة البيانات

Prisma هو مصدر البيانات الأساسي.

المتغير الأساسي هو:

`DATABASE_URL`

ويتم تطبيق migrations في build production قبل توليد Prisma Client وبناء Next.js:

```bash
prisma migrate deploy
node scripts/prisma-generate.mjs
next build
```

للتطوير:

```bash
npm run db:migrate
npm run db:generate
npm run typecheck
npm run lint
npm run build
```

المجلد `prisma/migrations` يحتوي migrations الخاصة بالطاقة، إعدادات الإنفرتر، الـ Gateway، الرقم التسلسلي، العملة SYP، وإعدادات Safe Zone.

## Secrets

لا تضع أي secret داخل الواجهة أو متغيرات `NEXT_PUBLIC_*`.

المتغيرات الأساسية:

- `SHAMSAK_USER` و`SHAMSAK_PASSWORD` — بيانات تسجيل الدخول. إلزامية، وبدونها يرد `/api/auth/login` بـ 503.
- `AUTH_SECRET` — مفتاح توقيع الجلسات. إلزامي: بدونه يعود التوقيع إلى `SHAMSAK_PASSWORD`، فيخرج كل المستخدمين عند تغيير كلمة المرور.
- `INVERTER_CONFIG_SECRET` — مفتاح تشفير أسرار الإنفرتر (كلمة Wi-Fi ورمز البوابة). تغييره يجعل القيم المخزّنة غير قابلة للقراءة.
- `TELEMETRY_INGEST_TOKEN` — إلزامي لاستقبال القراءات. بدونه يرد `POST /api/telemetry` بـ 503 ولا تصل أي بيانات من الإنفرتر.
- `SHAMSAK_PASSWORD_HASH` — بديل اختياري عن `SHAMSAK_PASSWORD`.

استخدم قيمة مختلفة لكل secret. القيمة نفسها لـ `TELEMETRY_INGEST_TOKEN` يجب أن توضع في الـ Gateway تحت `SHAMSAK_TELEMETRY_TOKEN`.

## Drivers والإنفرترات

الـ Gateway هو المكان الصحيح لتعريف بروتوكول الإنفرتر:

- `voltronic_pi30`: بروتوكول QPI/PI30 لإنفرترات Axpert/MPP/MAST المتوافقة.
- `modbus_generic`: Modbus RTU/TCP فقط عندما يكون Register Profile الخاص بالموديل معروفاً وموثوقاً.

لا يتم اعتبار نتيجة discovery الرقمية دليلاً على أن Register Map موثقة من الشركة المصنعة.

## ملاحظات مهمة

- لا يوجد endpoint بديل لاستقبال بيانات الإنفرتر خارج `/api/telemetry`.
- لا تستخدم Cookie من الـ Gateway.
- لا يتم اختراع Register Map لإنفرتر غير محدد الموديل.
- اختبار الـ Fake Modbus لا يعني أن الاتصال بالإنفرتر الحقيقي تم اختباره.