import { NewBriefForm } from "@/components/NewBriefForm";
import { TopBar } from "@/components/TopBar";
import { getBriefs } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function unique(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))).sort();
}

export default async function NewBriefPage() {
  const role = requireUser();
  const briefs = isSupabaseConfigured() ? await getBriefs() : [];
  const savedArtists = unique(briefs.map((brief) => brief.artist));
  const savedProjects = unique(briefs.map((brief) => brief.release_title));

  return (
    <>
      <TopBar role={role} />
      <main className="mx-auto w-full max-w-[1320px] px-4 py-8 sm:px-6">
        <div className="build-hero mb-6 animate-rise">
          <p className="pixel-label">JDW build studio</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
            Manual build first. Groq helper underneath.
          </h1>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 pixel-muted">
            Build manually as normal, or use the Groq helper below the manual section to structure messy James notes before reviewing and saving.
          </p>
        </div>
        <NewBriefForm savedArtists={savedArtists} savedProjects={savedProjects} />
      </main>
    </>
  );
}
