import Link from "next/link";
import { notFound } from "next/navigation";
import { NewBriefForm } from "@/components/NewBriefForm";
import { TopBar } from "@/components/TopBar";
import { requireUser } from "@/lib/auth";
import { getBriefs, getBriefWithChecklist } from "@/lib/db";

export const dynamic = "force-dynamic";

type EditBriefPageProps = {
  params: {
    id: string;
  };
};

function unique(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))).sort();
}

export default async function EditBriefPage({ params }: EditBriefPageProps) {
  const role = requireUser();
  const [brief, briefs] = await Promise.all([getBriefWithChecklist(params.id), getBriefs()]);

  if (!brief) {
    notFound();
  }

  const savedArtists = unique(briefs.map((item) => item.artist));
  const savedProjects = unique(briefs.map((item) => item.release_title));

  return (
    <>
      <TopBar role={role} />
      <main className="w-full max-w-none px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="pixel-label">Edit saved brief</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight">Update one step at a time</h1>
            <p className="mt-2 text-sm font-semibold pixel-muted">Swipe through the same simple flow, then save the update.</p>
          </div>
          <Link href={`/brief/${params.id}`} className="mini-button focus-ring px-4 py-3">
            Back to brief
          </Link>
        </div>
        <NewBriefForm initialBrief={brief.raw_json} briefId={brief.id} savedArtists={savedArtists} savedProjects={savedProjects} />
      </main>
    </>
  );
}
