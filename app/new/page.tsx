import { NewBriefForm } from "@/components/NewBriefForm";
import { TopBar } from "@/components/TopBar";
import { getBriefs } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function unique(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))).sort();
}

export default async function NewBriefPage() {
  const role = requireUser();
  const briefs = await getBriefs();
  const savedArtists = unique(briefs.map((brief) => brief.artist));
  const savedProjects = unique(briefs.map((brief) => brief.release_title));

  return (
    <>
      <TopBar role={role} />
      <main className="mx-auto w-full max-w-[1180px] px-4 py-8 sm:px-6">
        <div className="mb-6 animate-rise text-center">
          <p className="pixel-label">New manual brief</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">One question at a time.</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-6 pixel-muted">
            Artist → project → platform → setup → ad sets → ads. Use Skip whenever James has not said something.
          </p>
        </div>
        <NewBriefForm savedArtists={savedArtists} savedProjects={savedProjects} />
      </main>
    </>
  );
}
