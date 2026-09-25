#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// إعدادات شبكة الواي فاي الخاصة بك
const char* ssid = "اسم_شبكة_الواي_فاي";
const char* password = "كلمة_سر_الواي_فاي";

// رابط الـ API الذي قمنا بإنشائه على Vercel لـ شمسك
const char* apiUrl = "https://vercel.app";

void setup() {
  Serial.begin(115200);
  
  // إعداد منفذ Serial2 لقراءة بروتوكول Modbus من إنفرتر MITECH (RX=16, TX=17) بسرعة 9600
  Serial2.begin(9600, SERIAL_8N1, 16, 17); 
  
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nتم الاتصال بالشبكة بنجاح حياً!");
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    
    // 1. إرسال أمر طلب البيانات (Modbus Request Request Packet) إلى إنفرتر MITECH
    // هذه المصفوفة تمثل الأمر القياسي لقراءة سجلات الإنفرتر الأساسية
    byte mitechQuery[] = {0x01, 0x03, 0x00, 0x00, 0x00, 0x06, 0xC5, 0xC8};
    Serial2.write(mitechQuery, sizeof(mitechQuery));
    
    delay(100); // انتظار استجابة الإنفرتر المعالج
    
    // 2. استقبال وقراءة مصفوفة البيانات القادمة من منفذ الـ RS485
    if (Serial2.available()) {
      byte response[25];
      int len = Serial2.readBytes(response, sizeof(response));
      
      if (len >= 15) { // التأكد من وصول استجابة كاملة
        // فك شفرة السجلات الحقيقية وتحويلها إلى قيم كهربائية دقيقة
        float solar_kw = ((response[3] << 8) | response[4]) / 10.0;       // إنتاج الألواح
        float home_kw = ((response[5] << 8) | response[6]) / 10.0;        // استهلاك المنزل
        float battery_kw = ((response[7] << 8) | response[8]) / 10.0;     // قدرة البطارية
        int battery_soc = response[9];                                    // نسبة الشحن
        float grid_kw = ((response[10] << 8) | response[11]) / 10.0;      // الشبكة العامة
        float battery_voltage = ((response[12] << 8) | response[13]) / 10.0; // جهد البطارية

        // 3. صياغة حزمة الـ JSON لبثها للتطبيق السحابي
        StaticJsonDocument<200> doc;
        doc["solar_kw"] = solar_kw;
        doc["home_kw"] = home_kw;
        doc["battery_kw"] = battery_kw;
        doc["battery_soc"] = battery_soc;
        doc["grid_kw"] = grid_kw;
        doc["battery_voltage"] = battery_voltage;

        String requestBody;
        serializeJson(doc, requestBody);

        // 4. عمل POST للـ API لتحديث الشاشات في نفس الثانية
        HTTPClient http;
        http.begin(apiUrl);
        http.addHeader("Content-Type", "application/json");
        
        int httpResponseCode = http.POST(requestBody);
        if (httpResponseCode > 0) {
          Serial.println("تم تحديث قراءات إنفرتر MITECH في المنظومة حياً!");
        }
        http.end();
      }
    }
  }
  delay(5000); // تكرار العملية كل 5 ثوانٍ
}
