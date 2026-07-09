import { redirect } from "next/navigation";
import { getCurrentRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const role = getCurrentRole();
  redirect(role ? "/inbox" : "/login");
}
