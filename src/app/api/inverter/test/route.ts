import { NextRequest, NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import { connect as tlsConnect } from "node:tls";
import { connect as tcpConnect } from "node:net";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/inverter-config-crypto";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isPrivateIp(address: string) {
  const normalized = address.toLowerCase();
  if (normalized === "127.0.0.1" || normalized === "::1" || normalized.startsWith("10.") || normalized.startsWith("192.168.") || normalized.startsWith("169.254.") || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:")) return true;
  const match = normalized.match(/^172\.(\d+)\./);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
}

async function publicGateway(endpoint: string) {
  const url = new URL(endpoint);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("invalid_gateway_protocol");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || isPrivateIp(host)) throw new Error("private_gateway");
  const addresses = await lookup(host, { all: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateIp(address))) throw new Error("private_gateway");
  return url.toString().replace(/\/$/, "");
}

function encodeMqttString(value: string) {
  const bytes = Buffer.from(value, "utf8");
  const out = Buffer.allocUnsafe(2 + bytes.length);
  out.writeUInt16BE(bytes.length, 0);
  bytes.copy(out, 2);
  return out;
}

function encodeRemainingLength(length: number) {
  const bytes: number[] = [];
  do {
    let encoded = length % 128;
    length = Math.floor(length / 128);
    if (length > 0) encoded |= 128;
    bytes.push(encoded);
  } while (length > 0);
  return Buffer.from(bytes);
}

async function mqttPing(options: {
  host: string;
  port: number;
  tls: boolean;
  clientId: string;
  username?: string;
  password?: string;
  keepAlive: number;
  timeoutMs: number;
}) {
  const hasUsername = Boolean(options.username);
  const flags = 0x02 | (hasUsername ? 0x80 : 0) | (hasUsername && options.password ? 0x40 : 0);
  const variableHeader = Buffer.concat([
    encodeMqttString("MQTT"),
    Buffer.from([0x04, flags, (options.keepAlive >> 8) & 0xff, options.keepAlive & 0xff]),
  ]);
  const payload = Buffer.concat([
    encodeMqttString(options.clientId.slice(0, 200)),
    ...(options.username ? [encodeMqttString(options.username)] : []),
    ...(hasUsername && options.password ? [encodeMqttString(options.password)] : []),
  ]);
  const body = Buffer.concat([variableHeader, payload]);
  const packet = Buffer.concat([Buffer.from([0x10]), encodeRemainingLength(body.length), body]);
  const ping = Buffer.from([0xc0, 0x00]);
  const started = Date.now();

  return await new Promise<number>((resolve, reject) => {
    const socket = options.tls
      ? tlsConnect({ host: options.host, port: options.port, servername: options.host, rejectUnauthorized: true })
      : tcpConnect({ host: options.host, port: options.port });
    let buffer = Buffer.alloc(0);
    let stage: "connect" | "ping" = "connect";
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      socket.destroy();
      reject(new Error("mqtt_timeout"));
    }, options.timeoutMs);

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      reject(error);
    };

    socket.on("error", fail);
    socket.on("data", (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (stage === "connect" && buffer.length >= 4) {
        const packetType = buffer[0] >> 4;
        let multiplier = 1;
        let remaining = 0;
        let index = 1;
        let encoded = 0;
        do {
          if (index >= buffer.length || encoded++ > 3) return;
          const byte = buffer[index++];
          remaining += (byte & 127) * multiplier;
          multiplier *= 128;
          if ((byte & 128) === 0) break;
        } while (true);
        if (packetType !== 2 || remaining < 2 || buffer.length < index + remaining) {
          fail(new Error("mqtt_invalid_connack"));
          return;
        }
        const returnCode = buffer[index + 1];
        if (returnCode !== 0) {
          fail(new Error("mqtt_connack_" + returnCode));
          return;
        }
        stage = "ping";
        buffer = buffer.subarray(index + remaining);
        socket.write(ping);
        return;
      }
      if (stage === "ping" && buffer.length >= 2 && buffer[0] === 0xd0 && buffer[1] === 0x00) {
        settled = true;
        clearTimeout(timer);
        socket.end();
        resolve(Date.now() - started);
      }
    });

    if (options.tls) socket.once("secureConnect", () => socket.write(packet));
    else socket.once("connect", () => socket.write(packet));
  });
}

async function testCloudMqtt(row: {
  inverterLinkCode: string | null;
  serialNumber: string | null;
  timeoutMs: number;
}) {
  let extras: Record<string, unknown> = {};
  try {
    if (row.inverterLinkCode) extras = JSON.parse(decryptSecret(row.inverterLinkCode));
  } catch {
    extras = {};
  }

  const brokerValue = String(extras.mqttBroker || process.env.SHAMSAK_MQTT_BROKER || "mqtt.shamsak.com").trim();
  const normalized = /^[a-z]+:\/\//i.test(brokerValue) ? brokerValue : "mqtt://" + brokerValue;
  const url = new URL(normalized);
  const tls = url.protocol === "mqtts:" || url.protocol === "tls:";
  if (!["mqtt:", "mqtts:", "tcp:", "tls:"].includes(url.protocol)) throw new Error("mqtt_invalid_broker");

  const host = url.hostname;
  const port = Number(url.port) || (tls ? 8883 : 1883);
  const clientId = String(extras.mqttClientId || (row.serialNumber ? "shamsak-" + row.serialNumber : "shamsak-test")).slice(0, 200);
  const username = typeof extras.mqttUsername === "string" ? extras.mqttUsername : "";
  const password = typeof extras.mqttPassword === "string" ? extras.mqttPassword : "";
  const keepAlive = Number(extras.mqttKeepAlive) || 30;
  const latencyMs = await mqttPing({ host, port, tls, clientId, username: username || undefined, password: password || undefined, keepAlive, timeoutMs: row.timeoutMs });
  return { host, port, latencyMs, clientId };
}

function configured() {
  return Boolean(process.env.DATABASE_URL || process.env.PRISMA_DATABASE_URL || process.env.POSTGRES_URL);
}

export async function POST(request: NextRequest) {
  const session = await verifySessionToken(request.cookies.get(COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized", message: "يجب تسجيل الدخول أولاً." }, { status: 401 });
  if (process.env.SHAMSAK_MOCK_INVERTER === "true") {
    return NextResponse.json({ ok: true, source: "mock", message: "وضع الاختبار التجريبي يعمل بنجاح — لا يوجد اتصال عتادي فعلي.", latencyMs: 12 });
  }
  if (!configured()) return NextResponse.json({ ok: false, error: "database_not_configured", message: "قاعدة البيانات غير مهيأة." }, { status: 503 });

  try {
    const row = await prisma.inverterConnection.findFirst({ where: { isPrimary: true } }) ?? await prisma.inverterConnection.findUnique({ where: { id: "default" } });
    if (!row) return NextResponse.json({ ok: false, error: "inverter_not_configured", message: "لم تتم إضافة إنفرتر بعد." }, { status: 422 });

    if (row.connectionMode === "gateway") {
      const started = Date.now();
      try {
        const mqtt = await testCloudMqtt({ inverterLinkCode: row.inverterLinkCode, serialNumber: row.serialNumber, timeoutMs: row.timeoutMs });
        await prisma.inverterConnection.update({
          where: { id: row.id },
          data: { lastStatus: "connected", lastSeenAt: new Date(), lastTestResult: "success", lastTestLatencyMs: mqtt.latencyMs, lastTestReason: null },
        });
        return NextResponse.json({ ok: true, source: "mqtt", latencyMs: mqtt.latencyMs, broker: mqtt.host, port: mqtt.port, elapsedMs: Date.now() - started });
      } catch (error) {
        const reason = error instanceof Error ? error.message : "mqtt_connection_failed";
        const message = reason === "mqtt_timeout"
          ? "انتهت مهلة الاتصال بالسحابة. تحقق من الإنترنت ورقم الدونغل."
          : "تعذر الاتصال بسيرفر MQTT السحابي. تحقق من الإنترنت ورقم الدونغل.";
        await prisma.inverterConnection.update({ where: { id: row.id }, data: { lastStatus: "error", lastTestResult: "error", lastTestReason: message } });
        return NextResponse.json({ ok: false, source: "mqtt", error: "mqtt_connection_failed", message }, { status: 502 });
      }
    }

    if (row.connectionMode === "local") {
      const message = "يبدو أنك تستخدم بيانات الهاتف، يرجى التبديل لشبكة واي فاي محلية أو تغيير وضع الاتصال إلى (سحابي).";
      await prisma.inverterConnection.update({ where: { id: row.id }, data: { lastStatus: "error", lastTestResult: "error", lastTestReason: message } });
      return NextResponse.json({ ok: false, source: "local", error: "local_network_required", message }, { status: 422 });
    }

    const gatewayUrl = row.gatewayUrl || process.env.SHAMSAK_GATEWAY_URL || "";
    if (!gatewayUrl) return NextResponse.json({ ok: false, error: "gateway_not_configured", message: "لم يتم ضبط عنوان بوابة البيانات." }, { status: 422 });

    let safeGateway: string;
    try { safeGateway = await publicGateway(gatewayUrl); }
    catch (error) {
      const reason = error instanceof Error ? error.message : "";
      const message = reason === "private_gateway"
        ? "بوابة البيانات تستخدم عنواناً محلياً لا يمكن الوصول إليه من Vercel. انشر البوابة عبر HTTPS أو استخدم نفقاً آمناً."
        : "عنوان بوابة البيانات غير صالح.";
      await prisma.inverterConnection.update({ where: { id: row.id }, data: { lastTestResult: "error", lastTestReason: message } });
      return NextResponse.json({ ok: false, error: "invalid_gateway", message }, { status: 422 });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), row.timeoutMs);
    const started = Date.now();
    try {
      const response = await fetch(safeGateway + "/v1/inverter/test", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(process.env.SHAMSAK_GATEWAY_TOKEN ? { Authorization: "Bearer " + process.env.SHAMSAK_GATEWAY_TOKEN } : {}) },
        body: JSON.stringify({
          enabled: row.enabled,
          protocol: row.protocol === "Modbus TCP" ? "modbus-tcp" : row.protocol === "Wi-Fi Datalogger" ? "wifi-gateway" : "modbus-rtu",
          manufacturer: row.manufacturer || "Felicity", model: row.inverterModel || "Felicity",
          address: row.inverterAddress || "", port: row.port, serialPort: row.serialPort || "",
          baudRate: row.baudRate, dataBits: row.dataBits, stopBits: row.stopBits, parity: row.parity,
          slaveId: row.slaveId, timeoutMs: row.timeoutMs,
        }),
        cache: "no-store",
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({ message: "استجابة البوابة غير صالحة." }));
      const latencyMs = Date.now() - started;
      if (!response.ok || data.ok !== true) {
        await prisma.inverterConnection.update({ where: { id: row.id }, data: { lastStatus: "error", lastTestResult: "error", lastTestLatencyMs: latencyMs, lastTestReason: data.message || "gateway_error" } });
        return NextResponse.json({ ok: false, source: "gateway", latencyMs, ...data }, { status: 502 });
      }
      await prisma.inverterConnection.update({ where: { id: row.id }, data: { lastStatus: "connected", lastSeenAt: new Date(), lastTestResult: "success", lastTestLatencyMs: latencyMs, lastTestReason: null } });
      return NextResponse.json({ ...data, ok: true, source: "gateway", latencyMs });
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError" ? "انتهت مهلة اختبار الاتصال. تحقق من البوابة والإنفرتر." : error instanceof Error ? error.message : "تعذر اختبار الاتصال.";
    return NextResponse.json({ ok: false, source: "gateway", error: "gateway_connection_failed", message }, { status: 502 });
  }
}
