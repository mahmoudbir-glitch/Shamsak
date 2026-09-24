import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'owner@shamsak.local' },
    update: {},
    create: {
      name: 'محمود أحمد',
      email: 'owner@shamsak.local',
      passwordHash: 'hashed_password_example',
      memberships: {
        create: {
          role: 'OWNER',
          household: {
            create: {
              name: 'منزل العائلة الخاص',
              description: 'نظام الطاقة الشمسية المباشر',
              sites: {
                create: {
                  name: 'الموقع الرئيسي',
                  region: 'دمشق / الريف',
                  installation: new Date('2024-01-15'),
                  systems: {
                    create: {
                      name: 'نظام 6.8 كيلوواط',
                      capacityKw: 6.8,
                      status: 'NORMAL',
                      readings: {
                        create: [
                          { solarKw: 6.8, consumptionKw: 3.2, batteryPct: 94, gridKw: 0.5 },
                          { solarKw: 5.4, consumptionKw: 2.8, batteryPct: 88, gridKw: 0.0 }
                        ]
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });
  console.log('تم إدخال البيانات التجريبية بنجاح:', user.name);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
