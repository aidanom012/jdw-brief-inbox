import Link from "next/link";
import { notFound } from "next/navigation";
import { BriefFunnelView } from "@/components/BriefFunnelView";
import { DeleteBriefButton } from "@/components/DeleteBriefButton";
import { InternalNotes } from "@/components/InternalNotes";
import { RawJsonViewer } from "@/components/RawJsonViewer";
import { StatusControl } from "@/components/StatusControl";
import { StructuredBriefView } from "@/components/StructuredBriefView";
import { TopBar } from "@/components/TopBar";
import { requireUser } from "@/lib/auth";
import { getBriefWithChecklist } from "@/lib/db";

export const dynamic = "force-dynamic";

type BriefPageProps = {
  params: {
    id: string;
  };
};

function display(value: string | null | undefined): string {
  return value && value.trim() ? value : "Unknown";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export default async function BriefPage({ params }: BriefPageProps) {
  const role = requireUser();
  let brief;
  let errorMessage: string | null = null;

  try {
    brief = await getBriefWithChecklist(params.id);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unable to load brief.";
  }

  if (!brief && !errorMessage) {
    notFound();
  }

  return (
    <>
      <TopBar role={role} />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        {errorMessage ? (
          <section className="pixel-alert p-4">
            {errorMessage}
          </section>
        ) : null}

        {brief ? (
          <div className="grid gap-5">
            <section className="animate-rise pixel-window p-5">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <p className="pixel-label">Created {formatDate(brief.created_at)}</p>
                  <h1 className="mt-2 text-4xl font-black tracking-tight">{display(brief.artist)}</h1>
                  <p className="mt-1 text-lg font-semibold pixel-muted">{display(brief.release_title)}</p>
                </div>
                <div className="flex min-w-52 flex-wrap items-end justify-end gap-2">
                  <StatusControl briefId={brief.id} status={brief.status} />
                  <Link href={`/brief/${brief.id}/edit`} className="mini-button focus-ring px-4 py-3">
                    Edit
                  </Link>
                  <DeleteBriefButton briefId={brief.id} />
                </div>
              </div>
              {brief.missing_required_fields.length > 0 ? (
                <details className="mt-5 pixel-card p-4">
                  <summary className="cursor-pointer font-mono text-sm font-black uppercase tracking-[0.16em]">
                    Missing info ({brief.missing_required_fields.length})
                  </summary>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {brief.missing_required_fields.map((field) => (
                      <span key={field} className="pixel-missing px-3 py-2 font-mono text-xs font-black">{field}</span>
                    ))}
                  </div>
                </details>
              ) : null}
            </section>

            <BriefFunnelView brief={brief.raw_json} />
            <StructuredBriefView brief={brief.raw_json} />

            <details className="pixel-window p-4">
              <summary className="cursor-pointer font-mono text-sm font-black uppercase tracking-[0.16em]">Admin tools</summary>
              <div className="mt-5 grid gap-4">
                <InternalNotes briefId={brief.id} initialNotes={brief.internal_notes} />
                <RawJsonViewer brief={brief.raw_json} />
              </div>
            </details>
          </div>
        ) : null}
      </main>
    </>
  );
}
