import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/inverter-config-crypto";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth-session";
import { MONITORING_ACTIONS, recordMonitoringEvent } from "@/lib/monitoring";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { InverterConnection } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const configured = () => Boolean(process.env.DATABASE_URL || process.env.PRISMA_DATABASE_URL || process.env.POSTGRES_URL);
const integer = (value: unknown, fallback: number, min: number, max: number) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
};
const text = (value: unknown, max = 255) => typeof value === "string" ? value.trim().slice(0, max) : "";

const connectionSchema = z.object({
  id: z.string().min(1).max(80).optional(),
  systemName: z.string().trim().min(1).max(120),
  inverterModel: z.string().trim().min(1).max(120),
  serialNumber: z.string().trim().max(160).optional(),
  manufacturer: z.string().trim().max(80).optional(),
  protocol: z.enum(["Modbus RTU", "Modbus TCP", "MQTT", "Cloud API", "Wi-Fi Datalogger"]),
  inverterAddress: z.string().trim().max(255).optional(),
  serialPort: z.string().trim().max(255).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  baudRate: z.number().int().min(1200).max(115200).optional(),
  dataBits: z.number().int().min(7).max(8).optional(),
  stopBits: z.number().int().min(1).max(2).optional(),
  parity: z.enum(["N", "E", "O"]).optional(),
  slaveId: z.number().int().min(1).max(247).optional(),
  timeoutMs: z.number().int().min(200).max(10000).optional(),
  pollingIntervalMs: z.number().int().min(2000).max(300000).optional(),
  gatewayUrl: z.string().trim().max(500).optional(),
  gatewayName: z.string().trim().max(120).optional(),
  connectionMode: z.enum(["local", "gateway"]).optional(),
  wifiSsid: z.string().trim().max(120).optional(),
  wifiPassword: z.string().optional(),
  mqttBroker: z.string().trim().max(500).optional(),
  mqttPort: z.number().int().min(1).max(65535).optional(),
  mqttTls: z.boolean().optional(),
  mqttUsername: z.string().trim().max(160).optional(),
  mqttPassword: z.string().optional(),
  mqttClientId: z.string().trim().max(160).optional(),
  mqttReadTopic: z.string().trim().max(500).optional(),
  mqttStatusTopic: z.string().trim().max(500).optional(),
  mqttCommandTopic: z.string().trim().max(500).optional(),
  mqttQos: z.number().int().min(0).max(2).optional(),
  mqttKeepAlive: z.number().int().min(10).max(3600).optional(),
  cloudApiUrl: z.string().trim().max(500).optional(),
  cloudAuthType: z.enum(["api_key", "bearer", "username_password"]).optional(),
  cloudApiKey: z.string().optional(),
  cloudBearerToken: z.string().optional(),
  cloudUsername: z.string().trim().max(160).optional(),
  cloudPassword: z.string().optional(),
  cloudDeviceId: z.string().trim().max(160).optional(),
  cloudReadEndpoint: z.string().trim().max(500).optional(),
  cloudStatusEndpoint: z.string().trim().max(500).optional(),
  cloudTls: z.boolean().optional(),
  retryCount: z.number().int().min(1).max(10).optional(),
  enabled: z.boolean().optional(),
  isPrimary: z.boolean().optional(),
  panelCapacityKw: z.number().finite().positive().optional(),
  batteryCapacityWh: z.number().finite().positive().optional(),
});

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function audit(username: string, action: string, details: string) {
  try {
    const user = await prisma.user.findUnique({ where: { email: username } });
    if (user) await prisma.auditLog.create({ data: { userId: user.id, action, details: details.slice(0, 4000) } });
  } catch (error) {
    console.error("[inverter] audit_write_failed", error);
  }
}

function publicConnection(row: InverterConnection) {
  let extras: Record<string, unknown> = {};
  try {
    const raw = row.inverterLinkCode ? decryptSecret(row.inverterLinkCode) : "";
    if (raw) extras = JSON.parse(raw);
  } catch {
    extras = {};
  }
  return {
    id: row.id, systemName: row.systemName, inverterModel: row.inverterModel, serialNumber: row.serialNumber, manufacturer: row.manufacturer,
    protocol: row.protocol, inverterAddress: row.inverterAddress, serialPort: row.serialPort, port: row.port,
    baudRate: row.baudRate, dataBits: row.dataBits, stopBits: row.stopBits, parity: row.parity,
    slaveId: row.slaveId, timeoutMs: row.timeoutMs, pollingIntervalMs: row.pollingIntervalMs,
    gatewayUrl: row.gatewayUrl, gatewayName: row.gatewayName, connectionMode: row.connectionMode,
    wifiSsid: row.wifiSsid, hasWifiPassword: Boolean(row.wifiPasswordCipher), enabled: row.enabled,
    mqttBroker: extras.mqttBroker || null, mqttPort: extras.mqttPort || 1883, mqttTls: Boolean(extras.mqttTls),
    mqttUsername: extras.mqttUsername || null, hasMqttPassword: Boolean(extras.mqttPassword),
    mqttClientId: extras.mqttClientId || null, mqttReadTopic: extras.mqttReadTopic || null,
    mqttStatusTopic: extras.mqttStatusTopic || null, mqttCommandTopic: extras.mqttCommandTopic || null,
    mqttQos: extras.mqttQos ?? 0, mqttKeepAlive: extras.mqttKeepAlive ?? 60, retryCount: extras.retryCount ?? 3,
    cloudApiUrl: extras.cloudApiUrl || null, cloudAuthType: extras.cloudAuthType || "api_key",
    hasCloudCredential: Boolean(extras.cloudApiKey || extras.cloudBearerToken || extras.cloudPassword),
    cloudUsername: extras.cloudUsername || null, cloudDeviceId: extras.cloudDeviceId || null,
    cloudReadEndpoint: extras.cloudReadEndpoint || null, cloudStatusEndpoint: extras.cloudStatusEndpoint || null,
    cloudTls: extras.cloudTls !== false,
    isPrimary: row.isPrimary, lastStatus: row.lastStatus, lastSeenAt: row.lastSeenAt?.toISOString() ?? null,
    lastTestResult: row.lastTestResult, lastTestLatencyMs: row.lastTestLatencyMs, lastTestReason: row.lastTestReason,
  };
}

export async function GET(request: NextRequest) {
  const session = await verifySessionToken(request.cookies.get(COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!configured()) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  try {
    let rows = await prisma.inverterConnection.findMany({ orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }] });
    if (rows.length === 0) {
      const created = await prisma.inverterConnection.create({
        data: {
          id: "default",
          systemName: "منظومة شمسك",
          inverterModel: "NEXT - Victor Max 8.2KW",
          manufacturer: "NEXT",
          protocol: "Wi-Fi Datalogger",
          connectionMode: "gateway",
          enabled: true,
          isPrimary: true,
          baudRate: 9600,
          dataBits: 8,
          stopBits: 1,
          parity: "N",
          slaveId: 1,
          timeoutMs: 3000,
          pollingIntervalMs: 10000,
          lastStatus: "disconnected",
          lastTestReason: "تمت إضافة بيانات الإنفرتر. يلزم عنوان بوابة Wi-Fi لاختبار الاتصال الفعلي.",
        },
      });
      rows = [created];
    }
    const primary = rows.find((row) => row.isPrimary) ?? rows[0] ?? null;
    return NextResponse.json({ configured: rows.length > 0, connection: primary ? publicConnection(primary) : null, connections: rows.map(publicConnection) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "inverter_config_read_failed" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const session = await verifySessionToken(request.cookies.get(COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!configured()) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid_json", message: "البيانات المرسلة غير صالحة." }, { status: 400 }); }
  const raw = body as Record<string, unknown>;

  if (raw.action === "rotateGatewayToken") {
    const id = text(raw.id, 80);
    if (!id) return NextResponse.json({ error: "missing_connection_id", message: "حدد الإنفرتر أولاً." }, { status: 400 });
    const token = randomBytes(32).toString("base64url");
    const row = await prisma.inverterConnection.update({ where: { id }, data: { gatewayTokenHash: tokenHash(token), gatewayTokenCreatedAt: new Date() } });
    await audit(session.username, "GATEWAY_TOKEN_ROTATED", "connection=" + row.id);
    return NextResponse.json({ ok: true, token, message: "تم إنشاء رمز الربط. سيظهر مرة واحدة فقط، خزّنه في البوابة المحلية." });
  }

  if (raw.action === "setPrimary") {
    const id = text(raw.id, 80);
    if (!id) return NextResponse.json({ error: "missing_connection_id", message: "حدد الإنفرتر أولاً." }, { status: 400 });
    await prisma.$transaction([
      prisma.inverterConnection.updateMany({ data: { isPrimary: false } }),
      prisma.inverterConnection.update({ where: { id }, data: { isPrimary: true } }),
    ]);
    await audit(session.username, "INVERTER_PRIMARY_CHANGED", "connection=" + id);
    return NextResponse.json({ ok: true });
  }

  if (raw.action === "delete") {
    const id = text(raw.id, 80);
    if (!id) return NextResponse.json({ error: "missing_connection_id", message: "حدد الإنفرتر أولاً." }, { status: 400 });
    const count = await prisma.inverterConnection.count();
    if (count <= 1) return NextResponse.json({ error: "cannot_delete_last", message: "لا يمكن حذف آخر إنفرتر مضاف." }, { status: 422 });
    const row = await prisma.inverterConnection.findUnique({ where: { id } });
    if (!row) return NextResponse.json({ error: "not_found", message: "الإنفرتر غير موجود." }, { status: 404 });
    await prisma.inverterConnection.delete({ where: { id } });
    if (row.isPrimary) {
      const next = await prisma.inverterConnection.findFirst({ orderBy: { updatedAt: "desc" } });
      if (next) await prisma.inverterConnection.update({ where: { id: next.id }, data: { isPrimary: true } });
    }
    await audit(session.username, "INVERTER_DELETED", "connection=" + id);
    return NextResponse.json({ ok: true });
  }

  const parsed = connectionSchema.safeParse({
    ...raw,
    port: raw.port === undefined ? undefined : Number(raw.port),
    baudRate: raw.baudRate === undefined ? undefined : Number(raw.baudRate),
    dataBits: raw.dataBits === undefined ? undefined : Number(raw.dataBits),
    stopBits: raw.stopBits === undefined ? undefined : Number(raw.stopBits),
    slaveId: raw.slaveId === undefined ? undefined : Number(raw.slaveId),
    timeoutMs: raw.timeoutMs === undefined ? undefined : Number(raw.timeoutMs),
    pollingIntervalMs: raw.pollingIntervalMs === undefined ? undefined : Number(raw.pollingIntervalMs),
    panelCapacityKw: raw.panelCapacityKw === undefined ? undefined : Number(raw.panelCapacityKw),
    batteryCapacityWh: raw.batteryCapacityWh === undefined ? undefined : Number(raw.batteryCapacityWh),
  });
  if (!parsed.success) return NextResponse.json({ error: "invalid_connection", message: "تحقق من معاملات الاتصال والقيم المطلوبة.", issues: parsed.error.flatten() }, { status: 422 });

  const input = parsed.data;
  if (input.protocol === "Modbus RTU" && input.connectionMode === "gateway" && !input.serialPort) {
    return NextResponse.json({ error: "missing_serial_port", message: "أدخل منفذ RS485 الخاص بالبوابة المحلية مثل COM3 أو /dev/ttyUSB0." }, { status: 422 });
  }
  if (input.protocol === "MQTT" && !input.mqttBroker) {
    return NextResponse.json({ error: "missing_mqtt_broker", message: "أدخل عنوان MQTT Broker." }, { status: 422 });
  }
  if (input.protocol === "Cloud API" && !input.cloudApiUrl) {
    return NextResponse.json({ error: "missing_cloud_api", message: "أدخل عنوان Cloud API." }, { status: 422 });
  }
  if (input.protocol === "Modbus TCP" && !input.inverterAddress) {
    return NextResponse.json({ error: "missing_address", message: "أدخل عنوان IP للإنفرتر." }, { status: 422 });
  }

  try {
    const existingRows = await prisma.inverterConnection.count();
    const id = input.id || (existingRows === 0 ? "default" : randomUUID());
    const existing = await prisma.inverterConnection.findUnique({ where: { id } });
    const shouldPrimary = input.isPrimary === true || existingRows === 0;
    if (shouldPrimary) await prisma.inverterConnection.updateMany({ data: { isPrimary: false } });

    const extras = input.protocol === "MQTT" ? {
      mqttBroker: input.mqttBroker || "", mqttPort: input.mqttPort || 1883, mqttTls: input.mqttTls === true,
      mqttUsername: input.mqttUsername || "", ...(input.mqttPassword ? { mqttPassword: input.mqttPassword } : {}),
      mqttClientId: input.mqttClientId || "", mqttReadTopic: input.mqttReadTopic || "",
      mqttStatusTopic: input.mqttStatusTopic || "", mqttCommandTopic: input.mqttCommandTopic || "",
      mqttQos: input.mqttQos ?? 0, mqttKeepAlive: input.mqttKeepAlive ?? 60, retryCount: input.retryCount ?? 3,
    } : input.protocol === "Cloud API" ? {
      cloudApiUrl: input.cloudApiUrl || "", cloudAuthType: input.cloudAuthType || "api_key",
      ...(input.cloudApiKey ? { cloudApiKey: input.cloudApiKey } : {}),
      ...(input.cloudBearerToken ? { cloudBearerToken: input.cloudBearerToken } : {}),
      cloudUsername: input.cloudUsername || "", ...(input.cloudPassword ? { cloudPassword: input.cloudPassword } : {}),
      cloudDeviceId: input.cloudDeviceId || "", cloudReadEndpoint: input.cloudReadEndpoint || "",
      cloudStatusEndpoint: input.cloudStatusEndpoint || "", cloudTls: input.cloudTls !== false, retryCount: input.retryCount ?? 3,
    } : null;

    const data = {
      systemName: input.systemName,
      inverterModel: input.inverterModel,
      serialNumber: input.serialNumber || null,
      manufacturer: input.manufacturer || input.inverterModel,
      protocol: input.protocol,
      inverterAddress: input.inverterAddress || null,
      serialPort: input.serialPort || null,
      port: integer(input.port, 502, 1, 65535),
      baudRate: integer(input.baudRate, 9600, 1200, 115200),
      dataBits: integer(input.dataBits, 8, 7, 8),
      stopBits: integer(input.stopBits, 1, 1, 2),
      parity: input.parity || "N",
      slaveId: integer(input.slaveId, 1, 1, 247),
      timeoutMs: integer(input.timeoutMs, 1000, 200, 10000),
      pollingIntervalMs: integer(input.pollingIntervalMs, 10000, 2000, 300000),
      gatewayUrl: input.gatewayUrl || null,
      gatewayName: input.gatewayName || null,
      connectionMode: input.connectionMode || "gateway",
      wifiSsid: input.wifiSsid || null,
      enabled: input.enabled !== false,
      isPrimary: shouldPrimary,
      ...(input.wifiPassword ? { wifiPasswordCipher: encryptSecret(input.wifiPassword) } : {}),
      ...(extras ? { inverterLinkCode: encryptSecret(JSON.stringify(extras)) } : {}),
    };

    const row = existing
      ? await prisma.inverterConnection.update({ where: { id }, data })
      : await prisma.inverterConnection.create({ data: { id, ...data } });

    if (input.panelCapacityKw !== undefined || input.batteryCapacityWh !== undefined) {
      await prisma.energySettings.upsert({
        where: { id: "default" },
        create: { id: "default", panelPowerW: input.panelCapacityKw !== undefined ? input.panelCapacityKw * 1000 : 6000, batteryCapacityWh: input.batteryCapacityWh !== undefined ? input.batteryCapacityWh : 10000 },
        update: {
          ...(input.panelCapacityKw !== undefined ? { panelPowerW: input.panelCapacityKw * 1000 } : {}),
          ...(input.batteryCapacityWh !== undefined ? { batteryCapacityWh: input.batteryCapacityWh } : {}),
        },
      });
    }

    await audit(session.username, "INVERTER_CONFIG_SAVED", "connection=" + row.id + "; protocol=" + row.protocol + "; primary=" + row.isPrimary);
    await recordMonitoringEvent({ action: MONITORING_ACTIONS.INVERTER_CONFIG_SAVED, username: session.username, details: "connection=" + row.id + "; protocol=" + row.protocol });
    return NextResponse.json({ saved: true, connection: publicConnection(row), hasWifiPassword: Boolean(row.wifiPasswordCipher), preservedPassword: Boolean(existing?.wifiPasswordCipher && !input.wifiPassword) });
  } catch (error) {
    console.error("inverter_config_write_failed", error);
    return NextResponse.json({ error: "inverter_config_write_failed", message: "تعذر حفظ إعدادات الإنفرتر. لم تُحذف القيم السابقة." }, { status: 503 });
  }
}
