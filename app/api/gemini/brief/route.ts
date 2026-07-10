import { NextResponse, type NextRequest } from "next/server";
import { readSessionRole, SESSION_COOKIE_NAME } from "@/lib/auth";
import {
  generateGeminiBrief,
  GeminiBriefError,
  MAX_RAW_GEMINI_BRIEF_LENGTH
} from "@/lib/gemini-brief";
import { assertSameOriginRequest } from "@/lib/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function jsonError(message: string, status: number, issues?: string[]) {
  return NextResponse.json(
    {
      ok: false,
      message,
      issues
    },
    { status }
  );
}

export function GET() {
  return jsonError("Use POST to generate a Gemini brief.", 405);
}

export async function POST(request: NextRequest) {
  const role = readSessionRole(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!role) {
    return jsonError("Log in before using the Gemini parser.", 401);
  }

  try {
    assertSameOriginRequest();
  } catch {
    return jsonError("Invalid request origin.", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Send a JSON body with rawBrief.", 400);
  }

  const rawBrief =
    body && typeof body === "object" && "rawBrief" in body
      ? (body as { rawBrief?: unknown }).rawBrief
      : null;

  if (typeof rawBrief !== "string" || rawBrief.trim().length === 0) {
    return jsonError("Paste a raw brief before generating.", 400);
  }

  if (rawBrief.length > MAX_RAW_GEMINI_BRIEF_LENGTH) {
    return jsonError("Raw brief is too large for the Gemini parser.", 400);
  }

  try {
    const result = await generateGeminiBrief(rawBrief);
    const missingFields = result.validation.briefs.flatMap((brief) => brief.missingFields);

    return NextResponse.json({
      ok: true,
      generated: result.payload,
      isBatch: result.validation.isBatch,
      briefCount: result.validation.briefs.length,
      missingFields,
      message: result.validation.isBatch
        ? `${result.validation.briefs.length} briefs generated. Review before saving.`
        : "Brief generated. Review before saving."
    });
  } catch (error) {
    if (error instanceof GeminiBriefError) {
      return jsonError(error.message, error.statusCode, error.issues);
    }

    return jsonError("Unable to generate a brief right now.", 500);
  }
}
