import { headers } from "next/headers";

export const MAX_BRIEF_JSON_LENGTH = 250_000;
export const MAX_INTERNAL_NOTES_LENGTH = 10_000;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertSameOriginRequest(): void {
  const requestHeaders = headers();
  const origin = requestHeaders.get("origin");

  if (!origin) {
    return;
  }

  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  if (!host) {
    throw new Error("Missing request host.");
  }

  const originHost = new URL(origin).host;
  if (originHost !== host) {
    throw new Error("Invalid request origin.");
  }
}

export function assertUuid(value: string): void {
  if (!UUID_PATTERN.test(value)) {
    throw new Error("Invalid identifier.");
  }
}
