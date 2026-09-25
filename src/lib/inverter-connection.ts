export type ConnectionProtocol =
  | "auto"
  | "http"
  | "mqtt"
  | "home-assistant"
  | "modbus-tcp"
  | "modbus-rtu-gateway"
  | "csv";

export type ConnectionStatus = "not-configured" | "testing" | "connected" | "failed";

export type InverterConnectionConfig = {
  enabled: boolean;
  protocol: ConnectionProtocol;
  manufacturer?: string;
  model?: string;
  endpoint?: string;
  port?: number;
  username?: string;
  refreshSeconds: number;
};

export const defaultConnection: InverterConnectionConfig = {
  enabled: false,
  protocol: "auto",
  manufacturer: "",
  model: "",
  endpoint: "",
  port: undefined,
  username: "",
  refreshSeconds: 10,
};

export const protocolLabels: Record<ConnectionProtocol, string> = {
  auto: "اختيار البروتوكول لاحقًا",
  http: "API / HTTP",
  mqtt: "MQTT",
  "home-assistant": "Home Assistant",
  "modbus-tcp": "Modbus TCP عبر بوابة",
  "modbus-rtu-gateway": "Modbus RTU عبر بوابة RS485",
  csv: "ملف CSV",
};

export function sanitizeConnection(input: Partial<InverterConnectionConfig>): InverterConnectionConfig {
  const refresh = Number(input.refreshSeconds);
  return {
    ...defaultConnection,
    ...input,
    enabled: Boolean(input.enabled),
    refreshSeconds: Number.isFinite(refresh) ? Math.min(300, Math.max(2, refresh)) : 10,
    port: input.port && Number.isFinite(Number(input.port)) ? Math.min(65535, Math.max(1, Number(input.port))) : undefined,
  };
}

/**
 * This registry deliberately contains no vendor-specific assumptions.
 * A real adapter must prove connectivity and return normalized telemetry
 * before the UI is allowed to mark the connection as live.
 */
export type ConnectionAdapter = {
  protocol: ConnectionProtocol;
  test(config: InverterConnectionConfig): Promise<{ ok: boolean; message: string }>;
};

export const adapterRegistry: Partial<Record<ConnectionProtocol, ConnectionAdapter>> = {};
