# Shamsak Local Gateway

This service runs on the Windows/Linux machine physically connected to the inverter.
It is the bridge between Shamsak on Vercel and RS485/USB.

## Install
Python 3.11+ is recommended.

Windows:
1. Install Python.
2. Open PowerShell in this folder.
3. Run: python -m venv .venv
4. Run: .\.venv\Scripts\pip install -r requirements.txt
5. Copy .env.example to .env and edit it.
6. Run: .\.venv\Scripts\python gateway.py

Linux:
1. python3 -m venv .venv
2. .venv/bin/pip install -r requirements.txt
3. cp .env.example .env
4. python3 gateway.py

The HTTP endpoint is:
POST /v1/inverter/test

The gateway can also poll the inverter and POST normalized telemetry to:
POST <SHAMSAK_API_URL>/api/telemetry

Never expose port 8787 directly to the public internet. Put it on the same LAN/VPN as the Shamsak server or use a secure tunnel/reverse proxy.
