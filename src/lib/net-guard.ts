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
export function isPrivateIp(address: string) {
  const normalized = address.trim().toLowerCase();
  const ipv4Mapped = normalized.startsWith("::ffff:") ? normalized.slice(7) : normalized;

  if (
    normalized === "::" ||
    normalized === "::1" ||
    normalized === "0.0.0.0" ||
    normalized === "localhost" ||
    ipv4Mapped === "127.0.0.1" ||
    ipv4Mapped.startsWith("127.") ||
    ipv4Mapped.startsWith("10.") ||
    ipv4Mapped.startsWith("192.168.") ||
    ipv4Mapped.startsWith("169.254.")
  ) {
    return true;
  }

  const privateClassB = ipv4Mapped.match(/^172\.(\d+)\./);
  if (privateClassB && Number(privateClassB[1]) >= 16 && Number(privateClassB[1]) <= 31) {
    return true;
  }

  // Carrier-grade NAT (100.64.0.0/10) is not routable from the public internet either.
  const cgnat = ipv4Mapped.match(/^100\.(\d+)\./);
  if (cgnat && Number(cgnat[1]) >= 64 && Number(cgnat[1]) <= 127) {
    return true;
  }

  return /^(fc|fd|fe8[0-9a-f]:)/.test(normalized);
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
