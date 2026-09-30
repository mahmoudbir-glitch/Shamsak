import { lookup } from "node:dns/promises";

/**
 * Shared SSRF guard.
 *
 * Both /api/inverter/test and /api/connection/test fetch a URL supplied by the
 * signed-in user, so each one is a potential hole into Vercel's internal network.
 * They used to carry their own copy of this check and the copies had drifted: the
 * connection/test copy missed ::ffff: IPv4-mapped addresses, "localhost", "::" and
 * "0.0.0.0", so a host resolving to ::ffff:127.0.0.1 slipped through there while
 * being blocked in the other route. One implementation keeps them in step.
 */
/** "::ffff:7f00:1" and "::ffff:127.0.0.1" both mean 127.0.0.1. */
function mappedIpv4(address: string) {
  const match = address.match(/^(?:0{0,4}:){0,5}:?ffff:(.+)$/) ?? address.match(/^::ffff:(.+)$/);
  if (!match) return null;
  const tail = match[1];
  if (/^\d+\.\d+\.\d+\.\d+$/.test(tail)) return tail;
  const hex = tail.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (!hex) return null;
  const hi = parseInt(hex[1], 16);
  const lo = parseInt(hex[2], 16);
  return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
}

export function isPrivateIp(address: string) {
  const normalized = address.trim().toLowerCase();
  if (normalized === "localhost" || normalized === "::" || normalized === "::1") return true;

  const v4 = mappedIpv4(normalized) ?? (/^\d+\.\d+\.\d+\.\d+$/.test(normalized) ? normalized : null);
  if (v4) {
    const [a, b] = v4.split(".").map(Number);
    return (
      a === 0 || // 0.0.0.0/8
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
      (a === 169 && b === 254) || // link-local, cloud metadata
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) || // 192.0.0.0/24 special purpose
      (a === 198 && (b === 18 || b === 19)) || // benchmarking
      a >= 224 // multicast and reserved
    );
  }

  // IPv6: unique-local fc00::/7, link-local fe80::/10, multicast ff00::/8.
  return /^(fc|fd|fe[89ab]|ff)/.test(normalized);
}

export class PrivateEndpointError extends Error {
  constructor() {
    super("private_endpoint");
    this.name = "PrivateEndpointError";
  }
}

export class InvalidEndpointError extends Error {
  constructor() {
    super("endpoint_protocol");
    this.name = "InvalidEndpointError";
  }
}

/**
 * Resolves the hostname and rejects anything that points inside a private range.
 * Returns the normalised URL without a trailing slash.
 */
export async function assertPublicEndpoint(endpoint: string) {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new InvalidEndpointError();
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new InvalidEndpointError();
  }

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || isPrivateIp(host)) {
    throw new PrivateEndpointError();
  }

  const addresses = await lookup(host, { all: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateIp(address))) {
    throw new PrivateEndpointError();
  }

  return url.toString().replace(/\/$/, "");
}
