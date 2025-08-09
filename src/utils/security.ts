import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import ipaddr from 'ipaddr.js';
import dns from 'node:dns/promises';

export type UrlValidationResult = {
  ok: boolean;
  reason?: string;
  finalUrl?: string;
  status?: number;
  headers?: Record<string, string>;
  ip?: string;
  port?: number;
  body?: string;
};

export type UrlValidationOptions = {
  urlLengthLimit?: number;      // default 4096
  redirectLimit?: number;       // default 3
  responseBytesLimit?: number;  // default 2_000_000
  requestTimeoutMs?: number;    // default 20_000 (tiempo total)
  socketTimeoutMs?: number;     // default 30_000 (inactividad de socket)
  allowedPorts?: string;        // "80,443,3000" o "80-65535"
  userAgent?: string;           // default Mozilla genérico
  fetchBody?: boolean;          // si true, hace GET tras validar
  requireHtmlContentType?: boolean; // si true y fetchBody=true, valida Content-Type HTML
};

export async function validatePublicHttpUrl(
  rawUrl: string,
  options?: UrlValidationOptions
): Promise<UrlValidationResult> {

  const IS_DEV =
    /dev/i.test(process.env.NODE_ENV ?? '') ||
    /dev/i.test(process.env.APP_ENV ?? '') ||
    (process.env.BYPASS_SSRF_VALIDATION_IN_DEV ?? '').toLowerCase() === 'true';

  const URL_LENGTH_LIMIT = options?.urlLengthLimit ?? Number(process.env.URL_LENGTH_LIMIT ?? 4096);
  const REDIRECT_LIMIT   = options?.redirectLimit   ?? Number(process.env.REDIRECT_LIMIT   ?? 3);
  const RESPONSE_BYTES_LIMIT = options?.responseBytesLimit ?? Number(process.env.RESPONSE_BYTES_LIMIT ?? 2_000_000);
  const REQUEST_TIMEOUT_MS   = options?.requestTimeoutMs   ?? Number(process.env.REQUEST_TIMEOUT_MS   ?? 20_000);
  const SOCKET_TIMEOUT_MS    = options?.socketTimeoutMs    ?? Number(process.env.SOCKET_TIMEOUT_MS    ?? 30_000);

  const defaultAllowedPorts = IS_DEV ? '80-65535' : '80,443';
  const ALLOWED_PORTS_RAW = (options?.allowedPorts ?? process.env.ALLOWED_PORTS ?? defaultAllowedPorts).trim();
  const USER_AGENT = options?.userAgent ?? 'Mozilla/5.0 (compatible; UrlValidator/1.0)';
  const REQUIRE_HTML_CT = Boolean(options?.requireHtmlContentType);

  // Helpers
  const isHttpLike = (u: URL) => u.protocol === 'http:' || u.protocol === 'https:';

  const normalizeHeaders = (h: http.IncomingHttpHeaders): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(h)) {
      if (Array.isArray(v)) out[k.toLowerCase()] = v.join(', ');
      else if (typeof v === 'string') out[k.toLowerCase()] = v;
    }
    return out;
  };

  const isLoopbackNotAllowed = (range: string | undefined) => {
    const allowLoop = (process.env.ALLOW_LOOPBACK_IN_DEV ?? '').toLowerCase() === 'true';
    return !allowLoop && range === 'loopback';
  };

  const isSpecialIpv4 = (v4: ipaddr.IPv4): boolean => {
    const inCidr = (cidr: string) => v4.match(ipaddr.parseCIDR(cidr));
    return (
      inCidr('127.0.0.0/8')   || // loopback explícito
      inCidr('100.64.0.0/10') || // CGNAT
      inCidr('0.0.0.0/8')     || // this network
      inCidr('192.0.0.0/24')  || // IANA especiales
      inCidr('198.18.0.0/15') || // benchmark/tests
      inCidr('224.0.0.0/4')   || // multicast
      inCidr('240.0.0.0/4')   || // reservado
      v4.toString() === '255.255.255.255' // broadcast
    );
  };

  const isNonPublicIp = (ipStr: string): boolean => {
    // Permitir privados en dev si está habilitado (salvo loopback)
    if (IS_DEV && (process.env.ALLOW_PRIVATE_IPS_IN_DEV ?? '').toLowerCase() === 'true') {
      try {
        const addr = ipaddr.parse(ipStr);
        const range = (addr as any).range?.() as string | undefined;
        if (isLoopbackNotAllowed(range)) return true;
        return false;
      } catch {
        return true;
      }
    }
    try {
      let addr = ipaddr.parse(ipStr);
      if (addr.kind() === 'ipv6' && (addr as ipaddr.IPv6).isIPv4MappedAddress()) {
        addr = (addr as ipaddr.IPv6).toIPv4Address();
      }
      const range = (addr as any).range?.() as string;
      if (!range || range !== 'unicast') return true;
      if (['loopback', 'linkLocal', 'private', 'reserved'].includes(range)) return true;
      if (addr.kind() === 'ipv4' && isSpecialIpv4(addr as ipaddr.IPv4)) return true;
      return false;
    } catch {
      return true;
    }
  };

  const resolveToAllowedIp = async (hostname: string): Promise<string> => {
    const ips: string[] = [];
    const [a4, a6] = await Promise.allSettled([dns.resolve4(hostname), dns.resolve6(hostname)]);
    if (a4.status === 'fulfilled') ips.push(...a4.value);
    if (a6.status === 'fulfilled') ips.push(...a6.value);
    if (ips.length === 0) {
      try {
        const { address } = await dns.lookup(hostname);
        ips.push(address);
      } catch { /* ignore */ }
    }
    if (ips.length === 0) throw new Error(`DNS failed for ${hostname}`);
    for (const ip of ips) if (!isNonPublicIp(ip)) return ip;
    throw new Error(`All resolved IPs for ${hostname} are non-public`);
  };

  // Puertos permitidos (preparse una vez)
  const ALLOWED_RANGES = ALLOWED_PORTS_RAW.split(',')
    .map(s => s.trim()).filter(Boolean)
    .map(p => /^\d+-\d+$/.test(p) ? p.split('-').map(Number) : [Number(p), Number(p)])
    .filter(([min, max]) => Number.isFinite(min) && Number.isFinite(max) && min > 0 && max <= 65535 && min <= max)
    .map(([min, max]) => ({ min, max }));
  if (!ALLOWED_RANGES.length) ALLOWED_RANGES.push({ min: 80, max: 80 }, { min: 443, max: 443 });

  const isPortAllowed = (port: number) => ALLOWED_RANGES.some(({ min, max }) => port >= min && port <= max);
  const getPort = (u: URL) => {
    if (u.port) {
      return Number(u.port);
    }
    if (u.protocol === 'https:') {
      return 443;
    }
    return 80;
  };

  // Request por IP (HEAD/GET)
  const requestByIp = async (
    method: 'HEAD' | 'GET',
    urlObj: URL,
    ip: string,
    port: number,
    maxBytes: number
  ): Promise<{ status: number; headers: Record<string, string>; body?: string }> => {
    const isHttps = urlObj.protocol === 'https:';
    const agent = isHttps
      ? new https.Agent({
          servername: urlObj.hostname,
          timeout: SOCKET_TIMEOUT_MS,
          keepAlive: false,
          rejectUnauthorized: !IS_DEV || (process.env.RELAX_TLS_IN_DEV ?? '').toLowerCase() !== 'true',
        })
      : new http.Agent({ timeout: SOCKET_TIMEOUT_MS, keepAlive: false });

    const headers: Record<string, string> = {
      Host: urlObj.hostname,
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1',
      'Accept-Encoding': 'identity',
      Connection: 'close',
    };

    const controller = new AbortController();
    const totalTimer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    return new Promise((resolve, reject) => {
      const req = (isHttps ? https.request : http.request)(
        {
          protocol: urlObj.protocol,
          method,
          host: ip,
          port,
          path: `${urlObj.pathname}${urlObj.search}`,
          headers,
          agent,
          timeout: SOCKET_TIMEOUT_MS,
          signal: controller.signal,
        },
        (res) => {
          const status = res.statusCode ?? 0;
          const respHeaders = normalizeHeaders(res.headers);

          // Early cut por Content-Length
          const cl = respHeaders['content-length'] ? Number(respHeaders['content-length']) : undefined;
          if (Number.isFinite(cl) && cl! > maxBytes) {
            res.resume();
            res.destroy();
            clearTimeout(totalTimer);
            return reject(new Error('Response exceeds byte limit (Content-Length)'));
          }

          if (method === 'HEAD') {
            res.resume();
            clearTimeout(totalTimer);
            return resolve({ status, headers: respHeaders });
          }

          // (Opcional) Rechazar si no es HTML-like
          if (REQUIRE_HTML_CT) {
            const ct = respHeaders['content-type'] || '';
            const isHtml = /\b(text\/html|application\/xhtml\+xml)\b/i.test(ct);
            if (!isHtml) {
              res.resume();
              res.destroy();
              clearTimeout(totalTimer);
              return reject(new Error(`Unexpected Content-Type: ${ct}`));
            }
          }

          // GET stream con límite de bytes
          const chunks: Buffer[] = [];
          let received = 0;
          res.on('data', (chunk: Buffer) => {
            received += chunk.length;
            if (received > maxBytes) {
              clearTimeout(totalTimer);
              req.destroy(new Error('Response exceeds byte limit'));
              return;
            }
            chunks.push(chunk);
          });
          res.on('end', () => {
            clearTimeout(totalTimer);
            const body = Buffer.concat(chunks).toString('utf8');
            resolve({ status, headers: respHeaders, body });
          });
        }
      );

      req.on('timeout', () => {
        clearTimeout(totalTimer);
        req.destroy(new Error('Socket timeout'));
      });
      req.on('error', (err) => {
        clearTimeout(totalTimer);
        reject(err);
      });

      req.end();
    });
  };

  // Redirect handler
  const handleRedirects = async (
    start: URL,
    redirectLimit: number,
    fetchBody: boolean | undefined
  ): Promise<UrlValidationResult> => {
    let current = start;

    const getIpAndCheckPort = async (url: URL): Promise<{ ip: string; port: number } | UrlValidationResult> => {
      const port = getPort(url);
      if (!isPortAllowed(port)) return { ok: false, reason: `Port ${port} not allowed` };
      try {
        const ip = await resolveToAllowedIp(url.hostname);
        return { ip, port };
      } catch (e: any) {
        return { ok: false, reason: e.message };
      }
    };

    const isRedirect = (resp: { status: number; headers: Record<string, string> }) =>
      resp.status >= 300 && resp.status < 400 && !!resp.headers.location;

    for (let i = 0; i < redirectLimit; i++) {
      if (!isHttpLike(current)) {
        return { ok: false, reason: `Unsupported protocol: ${current.protocol}` };
      }

      const ipPort = await getIpAndCheckPort(current);
      if ('ok' in ipPort && !ipPort.ok) return ipPort;
      const { ip, port } = ipPort as { ip: string; port: number };

      let headResp;
      try {
        headResp = await requestByIp('HEAD', current, ip, port, RESPONSE_BYTES_LIMIT);
      } catch (e: any) {
        return { ok: false, reason: e.message };
      }

      if (isRedirect(headResp)) {
        try {
          current = new URL(headResp.headers.location, current);
          if (!isHttpLike(current)) {
            return { ok: false, reason: `Redirected to unsupported protocol: ${current.protocol}` };
          }
        } catch {
          return { ok: false, reason: `Invalid redirect URL: ${headResp.headers.location}` };
        }
        continue;
      }

      if (fetchBody) {
        try {
          const getResp = await requestByIp('GET', current, ip, port, RESPONSE_BYTES_LIMIT);
          return {
            ok: true,
            finalUrl: current.toString(),
            status: getResp.status,
            headers: getResp.headers,
            ip,
            port,
            body: getResp.body,
          };
        } catch (e: any) {
          return { ok: false, reason: e.message };
        }
      }

      return {
        ok: true,
        finalUrl: current.toString(),
        status: headResp.status,
        headers: headResp.headers,
        ip,
        port,
      };
    }

    return { ok: false, reason: 'Too many redirects' };
  };

  // Validaciones iniciales de la URL
  if (!rawUrl || rawUrl.length > URL_LENGTH_LIMIT) {
    return { ok: false, reason: 'Invalid or too long URL' };
  }

  let firstUrl: URL;
  try {
    firstUrl = new URL(rawUrl);
  } catch {
    return { ok: false, reason: 'Invalid URL format' };
  }

  if (!isHttpLike(firstUrl)) {
    return { ok: false, reason: 'Only http/https allowed' };
  }
  if (!IS_DEV && (firstUrl.username || firstUrl.password)) {
    return { ok: false, reason: 'Credentials not allowed' };
  }

  return handleRedirects(firstUrl, REDIRECT_LIMIT, options?.fetchBody);
}