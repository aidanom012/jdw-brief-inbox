import { NewBriefForm } from "@/components/NewBriefForm";
import { TopBar } from "@/components/TopBar";
import { getBriefs } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function unique(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))).sort();
}

type NewBriefPageProps = {
  searchParams?: {
    start?: string;
    resume?: string;
  };
};

export default async function NewBriefPage({ searchParams }: NewBriefPageProps) {
  const role = requireUser();
  const briefs = isSupabaseConfigured() ? await getBriefs() : [];
  const savedArtists = unique(briefs.map((brief) => brief.artist));
  const savedProjects = unique(briefs.map((brief) => brief.release_title));

  return (
    <>
      <TopBar role={role} />
      <main className="w-full max-w-none px-4 py-6 sm:px-6 lg:px-8">
        <NewBriefForm
          savedArtists={savedArtists}
          savedProjects={savedProjects}
          initialStart={searchParams?.start === "fresh" ? "fresh" : "choice"}
          resumeDraftId={searchParams?.resume || null}
        />
      </main>
    </>
  );
}
