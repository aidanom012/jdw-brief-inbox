"use server";

import { redirect } from "next/navigation";
import { roleFromPasscode, setSessionRole } from "@/lib/auth";
import { assertSameOriginRequest } from "@/lib/security";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function loginAction(formData: FormData): Promise<void> {
  assertSameOriginRequest();
  const passcode = String(formData.get("passcode") || "").trim();
  const role = roleFromPasscode(passcode);

  if (!role) {
    await delay(600);
    redirect("/login?error=1");
  }

  setSessionRole(role);
  redirect("/inbox");
}
