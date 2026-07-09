import { redirect } from "next/navigation";
import { clearSessionRole } from "@/lib/auth";

export async function GET(): Promise<never> {
  clearSessionRole();
  redirect("/login");
}
