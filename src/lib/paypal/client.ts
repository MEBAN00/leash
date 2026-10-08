import { randomUUID } from "node:crypto";
import { env } from "../env";

export function paypalBaseUrl(): string {
  return env("PAYPAL_ENV") === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

let cached: { token: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const basic = Buffer.from(`${env("PAYPAL_CLIENT_ID")}:${env("PAYPAL_CLIENT_SECRET")}`).toString("base64");
  const res = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new PayPalError("oauth", res.status, await res.text());

  const json = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cached.token;
}

export class PayPalError extends Error {
  constructor(
    public readonly operation: string,
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`PayPal ${operation} failed (${status}): ${body}`);
  }
}

/**
 * Call the PayPal REST API. Pass a stable `requestId` for operations that
 * move money so retries are idempotent.
 */
export async function paypal<T>(
  operation: string,
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: unknown,
  requestId: string = randomUUID(),
): Promise<T> {
  const res = await fetch(`${paypalBaseUrl()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": requestId,
      Prefer: "return=representation",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new PayPalError(operation, res.status, text);
  return (text ? JSON.parse(text) : {}) as T;
}

export type Link = { href: string; rel: string; method?: string };

export function linkHref(links: Link[] | undefined, rel: string): string | undefined {
  return links?.find((l) => l.rel === rel)?.href;
}
