import json
import os
import time
import threading
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from dotenv import load_dotenv

try:
    from pymodbus.client import ModbusSerialClient, ModbusTcpClient
except ImportError:
    ModbusSerialClient = None
    ModbusTcpClient = None

load_dotenv()

HOST = os.getenv("GATEWAY_HOST", "0.0.0.0")
PORT = int(os.getenv("GATEWAY_PORT", "8787"))
TOKEN = os.getenv("GATEWAY_TOKEN", "")
API_URL = os.getenv("SHAMSAK_API_URL", "").rstrip("/")
TELEMETRY_TOKEN = os.getenv("SHAMSAK_TELEMETRY_TOKEN", "")
POLL_SECONDS = max(2, int(os.getenv("POLL_INTERVAL_SECONDS", "10")))
PROFILE = os.getenv("FELICITY_PROFILE", "").strip()
REGISTER_OFFSET = int(os.getenv("FELICITY_REGISTER_OFFSET", "0"))

# This profile is intentionally limited to a community-documented IVEM6048-II map.
# Do not assume it applies to another Felicity model without its manual/register map.
PROFILES = {
    "ivem6048-ii": {
        "pv_power": 4512,
        "load_power": 4382,
        "battery_soc": 4624,
        "battery_voltage": 4621,
        "battery_current": 4620,
        "battery_power": 4511,
        "battery_temperature": 4387,
        "fault_code": 4355,
    }
}

def json_response(handler, status, payload):
    raw = json.dumps(payload, ensure_ascii=False).encode()
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(raw)))
    handler.end_headers()
    handler.wfile.write(raw)

def read_u16(result):
    return int(result.registers[0])

def read_s16(result):
    v = int(result.registers[0])
    return v - 65536 if v >= 32768 else v

def read_register(client, address, slave):
    result = client.read_holding_registers(address=address + REGISTER_OFFSET, count=1, slave=slave)
    if result.isError():
        raise RuntimeError(str(result))
    return read_u16(result)

def read_telemetry(config):
    if not PROFILE:
        raise RuntimeError("inverter_profile_not_configured")
    if PROFILE not in PROFILES:
        raise RuntimeError("felicity_profile_not_supported")
    profile = PROFILES[PROFILE]
    protocol = config.get("protocol", "modbus-rtu")
    slave = int(config.get("slaveId", 1))
    timeout = max(0.5, float(config.get("timeoutMs", 3000)) / 1000)

    manufacturer = str(config.get("manufacturer", "")).strip().lower()
    if manufacturer and "felicity" not in manufacturer:
        raise RuntimeError("unsupported_inverter_manufacturer_for_gateway")

    if protocol == "modbus-tcp":
        host = config.get("address", "")
        port = int(config.get("port") or 502)
        if not host:
            raise RuntimeError("missing_modbus_tcp_address")
        client = ModbusTcpClient(host, port=port, timeout=timeout)
    else:
        serial_port = config.get("serialPort", "")
        if not serial_port:
            raise RuntimeError("missing_serial_port")
        if ModbusSerialClient is None:
            raise RuntimeError("pymodbus_not_installed")
        client = ModbusSerialClient(
            port=serial_port,
            baudrate=int(config.get("baudRate", 9600)),
            bytesize=int(config.get("dataBits", 8)),
            parity=config.get("parity", "N"),
            stopbits=int(config.get("stopBits", 1)),
            timeout=timeout,
        )

    started = time.monotonic()
    if not client.connect():
        raise RuntimeError("port_or_host_unreachable")

    try:
        pv = read_register(client, profile["pv_power"], slave)
        load = read_register(client, profile["load_power"], slave)
        soc_raw = read_register(client, profile["battery_soc"], slave)
        batt_v_raw = read_register(client, profile["battery_voltage"], slave)
        batt_i_raw = read_register(client, profile["battery_current"], slave)
        batt_p_raw = read_register(client, profile["battery_power"], slave)
        batt_t_raw = read_register(client, profile["battery_temperature"], slave)
        fault = read_register(client, profile["fault_code"], slave)

        # Scales follow the published/community IVEM6048-II map.
        return {
            "solarPowerW": float(pv),
            "loadPowerW": float(load),
            "batterySoc": float(soc_raw) / 10.0,
            "batteryVoltage": float(batt_v_raw) / 100.0,
            "batteryCurrent": float(batt_i_raw) / 10.0 if batt_i_raw < 32768 else (batt_i_raw - 65536) / 10.0,
            "batteryPowerW": float(batt_p_raw) if batt_p_raw < 32768 else float(batt_p_raw - 65536),
            "batteryTemperature": float(batt_t_raw if batt_t_raw < 32768 else batt_t_raw - 65536),
            "gridPowerW": 0.0,
            "gridConnected": True,
            "faultCode": fault,
            "profile": PROFILE,
            "latencyMs": round((time.monotonic() - started) * 1000),
        }
    finally:
        client.close()

def push_telemetry(snapshot):
    if not API_URL:
        return
    body = json.dumps({
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "pv_power": snapshot["solarPowerW"],
        "load_power": snapshot["loadPowerW"],
        "battery_soc": snapshot["batterySoc"],
        "battery_power": snapshot["batteryPowerW"],
        "battery_voltage": snapshot.get("batteryVoltage"),
        "battery_current": snapshot.get("batteryCurrent"),
        "battery_temperature": snapshot.get("batteryTemperature"),
        "grid_status": snapshot.get("gridConnected", False),
        "grid_power": snapshot.get("gridPowerW", 0),
        "source": "felicity-modbus-gateway",
    }).encode()
    req = urllib.request.Request(API_URL + "/api/telemetry", data=body, headers={
        "Content-Type": "application/json",
        "Authorization": "Bearer " + TELEMETRY_TOKEN,
    }, method="POST")
    try:
        urllib.request.urlopen(req, timeout=5).read()
    except Exception as exc:
        print("telemetry push failed:", exc)

class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/v1/inverter/test":
            return json_response(self, 404, {"ok": False, "error": "not_found"})
        if TOKEN and self.headers.get("Authorization") != "Bearer " + TOKEN:
            return json_response(self, 401, {"ok": False, "error": "unauthorized"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            config = json.loads(self.rfile.read(length) or b"{}")
            telemetry = read_telemetry(config)
            json_response(self, 200, {"ok": True, "message": "Modbus connection and register read succeeded.", "telemetry": telemetry, "latencyMs": telemetry["latencyMs"]})
        except Exception as exc:
            message = str(exc)
            if "No such file" in message or "Permission" in message:
                message = "serial_port_unavailable_or_permission_denied"
            json_response(self, 502, {"ok": False, "error": message, "message": "تعذر قراءة Modbus. تحقق من المنفذ، Baud Rate، Slave ID، RS485 wiring، وموديل Felicity."})

    def log_message(self, fmt, *args):
        print(fmt % args)

def poll_loop():
    while True:
        time.sleep(POLL_SECONDS)
        if not API_URL:
            continue
        # Polling configuration can be supplied through environment variables.
        cfg = {
            "protocol": os.getenv("MODBUS_PROTOCOL", "modbus-rtu"),
            "serialPort": os.getenv("MODBUS_SERIAL_PORT", ""),
            "address": os.getenv("MODBUS_HOST", ""),
            "port": int(os.getenv("MODBUS_PORT", "502")),
            "baudRate": int(os.getenv("MODBUS_BAUD_RATE", "9600")),
            "dataBits": int(os.getenv("MODBUS_DATA_BITS", "8")),
            "stopBits": int(os.getenv("MODBUS_STOP_BITS", "1")),
            "parity": os.getenv("MODBUS_PARITY", "N"),
            "slaveId": int(os.getenv("MODBUS_SLAVE_ID", "1")),
            "timeoutMs": int(os.getenv("MODBUS_TIMEOUT_MS", "3000")),
        }
        try:
            push_telemetry(read_telemetry(cfg))
        except Exception as exc:
            print("poll failed:", exc)

if __name__ == "__main__":
    print(f"Shamsak Gateway listening on {HOST}:{PORT}, profile={PROFILE}")
    threading.Thread(target=poll_loop, daemon=True).start()
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
