import dns from 'node:dns/promises';
import net from 'node:net';

/**
 * Checks if an IPv4 address belongs to a private, loopback, or reserved range.
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed IP treated as dangerous
  }

  const [a, b, c, d] = parts;

  // 0.0.0.0/8
  if (a === 0) return true;
  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;
  // 10.0.0.0/8 (Private network)
  if (a === 10) return true;
  // 172.16.0.0/12 (Private network)
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16 (Private network)
  if (a === 192 && b === 168) return true;
  // 169.254.0.0/16 (Link-local / Cloud metadata service e.g. 169.254.169.254)
  if (a === 169 && b === 254) return true;
  // 100.64.0.0/10 (Carrier-grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;
  // 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 (Documentation/Test)
  if (a === 192 && b === 0 && c === 2) return true;
  if (a === 198 && b === 51 && c === 100) return true;
  if (a === 203 && b === 0 && c === 113) return true;
  // 224.0.0.0/4 (Multicast)
  if (a >= 224 && a <= 239) return true;
  // 240.0.0.0/4 (Reserved)
  if (a >= 240) return true;
  // Broadcast
  if (a === 255 && b === 255 && c === 255 && d === 255) return true;

  return false;
}

/**
 * Checks if an IPv6 address belongs to a private, loopback, or reserved range.
 */
function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  // Loopback ::1
  if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;
  // Unspecified ::
  if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true;
  // Unique local fc00::/7 (starts with fc or fd)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  // Link-local fe80::/10 (starts with fe8, fe9, fea, feb)
  if (
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb')
  ) {
    return true;
  }
  // IPv4-mapped IPv6 ::ffff:192.0.2.1
  if (normalized.includes('::ffff:')) {
    const ipv4Part = normalized.split('::ffff:')[1];
    if (ipv4Part && net.isIPv4(ipv4Part)) {
      return isPrivateIPv4(ipv4Part);
    }
  }

  return false;
}

export interface UrlValidationResult {
  valid: boolean;
  error?: string;
  url?: URL;
  resolvedIp?: string;
}

/**
 * Validates a target URL against SSRF attacks.
 * Only HTTP and HTTPS schemes are allowed.
 * Resolves DNS and blocks private/loopback/cloud metadata IP addresses.
 */
export async function validateUrlForSsrf(rawUrl: string): Promise<UrlValidationResult> {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'Please enter a valid URL.' };
  }

  const trimmed = rawUrl.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'Malformed URL format. Please include http:// or https://' };
  }

  // Protocol check: Only http and https
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      valid: false,
      error: `Invalid protocol "${parsed.protocol}". Only HTTP and HTTPS are permitted.`,
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Hostname string checks
  const blockedHostnames = [
    'localhost',
    'localhost.localdomain',
    'local',
    'broadcasthost',
    'metadata.google.internal',
    '169.254.169.254',
  ];

  if (blockedHostnames.includes(hostname) || hostname.endsWith('.localhost') || hostname.endsWith('.internal')) {
    return {
      valid: false,
      error: 'Access to local or internal addresses is blocked for security.',
    };
  }

  // Check if hostname is an IP directly
  const ipType = net.isIP(hostname);
  if (ipType === 4) {
    if (isPrivateIPv4(hostname)) {
      return { valid: false, error: 'Requests to private IP addresses are blocked.' };
    }
    return { valid: true, url: parsed, resolvedIp: hostname };
  } else if (ipType === 6) {
    if (isPrivateIPv6(hostname)) {
      return { valid: false, error: 'Requests to private IPv6 addresses are blocked.' };
    }
    return { valid: true, url: parsed, resolvedIp: hostname };
  }

  // Perform DNS resolution to check actual underlying IP
  try {
    const lookup = await dns.lookup(hostname, { all: true });
    if (!lookup || lookup.length === 0) {
      return { valid: false, error: 'Could not resolve domain name via DNS.' };
    }

    for (const record of lookup) {
      if (record.family === 4 && isPrivateIPv4(record.address)) {
        return {
          valid: false,
          error: `Domain resolved to restricted internal IP (${record.address}). Access denied.`,
        };
      }
      if (record.family === 6 && isPrivateIPv6(record.address)) {
        return {
          valid: false,
          error: `Domain resolved to restricted internal IPv6 (${record.address}). Access denied.`,
        };
      }
    }

    return { valid: true, url: parsed, resolvedIp: lookup[0].address };
  } catch (err: any) {
    return {
      valid: false,
      error: `DNS resolution failed: ${err.message || 'Unable to contact host'}`,
    };
  }
}
