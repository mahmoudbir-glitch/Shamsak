const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectDir = path.join(process.cwd(), 'shamsak-private');

// 1. إنشاء شجرة المجلدات
const dirs = [
  '',
  'src',
  'src/app',
  'src/app/calculator',
  'src/lib',
  'prisma',
  'public'
];

dirs.forEach(d => {
  const dirPath = path.join(projectDir, d);
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
});

function createFile(filePath, content) {
  fs.writeFileSync(path.join(projectDir, filePath), content.trim());
}

// 2. ملف .gitignore لتصفية الملفات غير المرغوب رفعها على GitHub
createFile('.gitignore', `
node_modules
.next
*.log
.env
.env.local
dist
build
.DS_Store
`);

// 3. package.json
createFile('package.json', JSON.stringify({
  "name": "shamsak-private",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:migrate": "prisma migrate dev",
    "seed": "ts-node --compiler-options {\\\"module\\\":\\\"CommonJS\\\"} prisma/seed.ts"
  },
  "dependencies": {
    "@prisma/client": "^5.19.0",
    "next": "15.0.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "recharts": "^2.12.7",
    "zod": "^3.23.8",
    "lucide-react": "^0.439.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.2"
  },
  "devDependencies": {
    "@types/node": "^20.16.0",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "prisma": "^5.19.0",
    "typescript": "^5.5.4",
    "tailwindcss": "^3.4.10",
    "postcss": "^8.4.41",
    "autoprefixer": "^10.4.20",
    "ts-node": "^10.9.2"
  }
}, null, 2));

// 4. tsconfig.json
createFile('tsconfig.json', JSON.stringify({
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}, null, 2));

// 5. .env.example
createFile('.env.example', `
DATABASE_URL="postgresql://shamsak_user:shamsak_pass@localhost:5432/shamsak_db?schema=public"
NEXTAUTH_SECRET="change-this-to-a-secure-secret-key"
NEXTAUTH_URL="http://localhost:3000"
`);

// 6. prisma/schema.prisma
createFile('prisma/schema.prisma', `
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  OWNER
  FAMILY_MEMBER
  TECHNICIAN
  LOCAL_ADMIN
}

enum SystemStatus {
  NORMAL
  ATTENTION_NEEDED
  FAULT
}

model User {
  id            String       @id @default(uuid())
  name          String
  email         String       @unique
  passwordHash  String
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  memberships   Membership[]
}

model Household {
  id          String       @id @default(uuid())
  name        String
  description String?
  createdAt   DateTime     @default(now())
  memberships Membership[]
  sites       Site[]
}

model Membership {
  id          String    @id @default(uuid())
  userId      String
  householdId String
  role        Role      @default(FAMILY_MEMBER)
  expiresAt   DateTime?
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  household   Household @relation(fields: [householdId], references: [id], onDelete: Cascade)
}

model Site {
  id           String        @id @default(uuid())
  householdId  String
  name         String
  region       String
  installation DateTime
  household    Household     @relation(fields: [householdId], references: [id])
  systems      SolarSystem[]
}

model SolarSystem {
  id           String        @id @default(uuid())
  siteId       String
  name         String
  capacityKw   Float
  status       SystemStatus  @default(NORMAL)
  site         Site          @relation(fields: [siteId], references: [id])
}
`);

// 7. README.md
createFile('README.md', `
# ☀️ شمسك الخاص — Shamsak Private

تطبيق ويب خاص بـ Next.js 15 لإدارة ومراقبة نظام الطاقة الشمسية العائلي.

## خطوات التشغيل:
\`\`\`bash
npm install
npx prisma migrate dev
npm run seed
npm run dev
\`\`\`
`);

// 8. src/lib/calculator.ts
createFile('src/lib/calculator.ts', `
export interface CalculatorInput {
  roofAreaM2: number;
  dailyConsumptionKwh: number;
  outageHours: number;
}

export function calculateSolarSystem(input: CalculatorInput) {
  const requiredSolarKw = Number((input.dailyConsumptionKwh / 4.5).toFixed(1));
  const recommendedPanels = Math.ceil((requiredSolarKw * 1000) / 550);
  const inverterCapacityKw = Math.ceil(requiredSolarKw * 1.2);
  const batteryCapacityKwh = Number(((input.dailyConsumptionKwh / 24) * input.outageHours * 1.3).toFixed(1));

  return {
    dailyConsumption: input.dailyConsumptionKwh,
    requiredSolarKw,
    recommendedPanels,
    inverterCapacityKw,
    batteryCapacityKwh,
    plans: {
      economical: { title: "خطة توفيرية", solarKw: (requiredSolarKw * 0.7).toFixed(1), batteryKwh: (batteryCapacityKwh * 0.6).toFixed(1) },
      balanced: { title: "خطة متوازنة", solarKw: requiredSolarKw.toFixed(1), batteryKwh: batteryCapacityKwh.toFixed(1) },
      independence: { title: "استقلالية كاملة", solarKw: (requiredSolarKw * 1.3).toFixed(1), batteryKwh: (batteryCapacityKwh * 1.5).toFixed(1) }
    }
  };
}
`);

// 9. src/app/layout.tsx
createFile('src/app/layout.tsx', `
import React from 'react';
import './globals.css';

export const metadata = {
  title: 'شمسك الخاص — Shamsak Private',
  description: 'لوحة التحكم الخاصة لنظام الطاقة الشمسية',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-slate-950 text-slate-100 min-h-screen font-sans">
        <header className="border-b border-slate-800 bg-slate-900/80 p-4 sticky top-0 z-50 backdrop-blur">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <h1 className="text-xl font-bold text-amber-400">☀️ شمسك الخاص</h1>
          </div>
        </header>
        <main className="max-w-7xl mx-auto p-6">{children}</main>
      </body>
    </html>
  );
}
`);

// 10. src/app/globals.css
createFile('src/app/globals.css', `
@tailwindcss base;
@tailwindcss components;
@tailwindcss utilities;
`);

// 11. src/app/page.tsx
createFile('src/app/page.tsx', `
import React from 'react';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">لوحة التحكم الخاصة بالطاقة</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800">
          <span className="text-slate-400 text-sm">الإنتاج اللحظي</span>
          <p className="text-3xl font-extrabold text-amber-400 mt-2">6.8 kW</p>
        </div>
      </div>
    </div>
  );
}
`);

console.log('✅ تم إنشاء مجلد المشروع وبنيته الأساسية بنجاح.');

// تهيئة Git وإضافة الملفات تلقائياً
try {
  process.chdir(projectDir);
  execSync('git init');
  execSync('git add .');
  execSync('git commit -m "Initial commit for Shamsak Private"');
  console.log('🚀 تم تهيئة مستودع Git وإضافة الملفات بنجاح!');
} catch (e) {
  console.log('💡 قم بفتح مجلد shamsak-private وتطبيق الأوامر يدوياً.');
                 }
