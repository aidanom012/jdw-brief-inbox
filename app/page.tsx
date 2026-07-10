import { redirect } from "next/navigation";
import { ArtistDesktop } from "@/components/ArtistDesktop";
import { TopBar } from "@/components/TopBar";
import { getCurrentRole } from "@/lib/auth";
import { getBriefs } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const role = getCurrentRole();
  if (!role) redirect("/login");

  const briefs = await getBriefs();

  return (
    <>
      <TopBar role={role} />
      <main className="mx-auto w-full max-w-[1500px] px-4 py-8 sm:px-6">
        <ArtistDesktop briefs={briefs} />
      </main>
    </>
  );
}
