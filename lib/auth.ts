import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type UserRole = "aidan" | "james";

const COOKIE_NAME = "jdw_brief_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const FULL_ACCESS_ROLE: UserRole = "aidan";

function authSecret(): string {
  return (
    process.env.SESSION_SECRET ||
    process.env.JDW_PASSCODE ||
    process.env.APP_PASSCODE ||
    process.env.AIDAN_PASSCODE ||
    process.env.JAMES_PASSCODE ||
    "jdw-brief-inbox-dev"
  );
}

function signRole(role: UserRole): string {
  return crypto.createHmac("sha256", authSecret()).update(role).digest("hex");
}

function timingSafeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function secureStringEqual(a: string, b: string): boolean {
  const aHash = crypto.createHash("sha256").update(a).digest("hex");
  const bHash = crypto.createHash("sha256").update(b).digest("hex");

  return timingSafeEqual(aHash, bHash);
}

export function createSessionValue(role: UserRole = FULL_ACCESS_ROLE): string {
  return `${role}.${signRole(role)}`;
}

export function readSessionRole(value: string | undefined): UserRole | null {
  if (!value) {
    return null;
  }

  const [role, signature] = value.split(".");
  if ((role !== "aidan" && role !== "james") || !signature) {
    return null;
  }

  return timingSafeEqual(signature, signRole(role)) ? role : null;
}

export function getCurrentRole(): UserRole | null {
  return readSessionRole(cookies().get(COOKIE_NAME)?.value);
}

export function requireUser(): UserRole {
  const role = getCurrentRole();
  if (!role) {
    redirect("/login");
  }

  return role;
}

export function requireAidan(): UserRole {
  return requireUser();
}

export function setSessionRole(role: UserRole = FULL_ACCESS_ROLE): void {
  cookies().set(COOKIE_NAME, createSessionValue(role), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
    priority: "high",
    path: "/"
  });
}

export function clearSessionRole(): void {
  cookies().set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/"
  });
}

function configuredPasscodes(): string[] {
  return [
    process.env.JDW_PASSCODE,
    process.env.APP_PASSCODE,
    process.env.AIDAN_PASSCODE,
    process.env.JAMES_PASSCODE
  ].filter((value): value is string => Boolean(value && value.trim().length > 0));
}

export function roleFromPasscode(passcode: string): UserRole | null {
  const cleanPasscode = passcode.trim();
  const passcodes = configuredPasscodes();

  if (passcodes.length === 0) {
    return null;
  }

  return passcodes.some((storedPasscode) => secureStringEqual(cleanPasscode, storedPasscode))
    ? FULL_ACCESS_ROLE
    : null;
}
