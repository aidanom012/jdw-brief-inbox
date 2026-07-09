import { notFound } from "next/navigation";
import { AdSetTable } from "@/components/AdSetTable";
import { AdsTable } from "@/components/AdsTable";
import { Checklist } from "@/components/Checklist";
import { DeleteBriefButton } from "@/components/DeleteBriefButton";
import { InternalNotes } from "@/components/InternalNotes";
import { MissingFieldsPanel } from "@/components/MissingFieldsPanel";
import { RawJsonViewer } from "@/components/RawJsonViewer";
import { StatusBadge } from "@/components/StatusBadge";
import { StatusControl } from "@/components/StatusControl";
import { StructuredBriefView } from "@/components/StructuredBriefView";
import { SuggestedNaming } from "@/components/SuggestedNaming";
import { TopBar } from "@/components/TopBar";
import { requireUser } from "@/lib/auth";
import { getBriefWithChecklist } from "@/lib/db";
import { suggestedAdNames, suggestedAdSetNames, suggestedCampaignName } from "@/lib/naming";

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
          <section className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-4 text-amber-100">
            {errorMessage}
          </section>
        ) : null}

        {brief ? (
          <div className="grid gap-5">
            <section className="rounded-lg border border-white/10 bg-panel p-4 shadow-glow">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <p className="text-sm text-zinc-500">Created {formatDate(brief.created_at)}</p>
                  <h1 className="mt-2 text-3xl font-semibold text-white">{display(brief.artist)}</h1>
                  <p className="mt-1 text-lg text-zinc-300">{display(brief.release_title)}</p>
                </div>
                <div className="min-w-52">
                  {role === "aidan" ? (
                    <StatusControl briefId={brief.id} status={brief.status} />
                  ) : (
                    <StatusBadge status={brief.status} />
                  )}
                </div>
              </div>
              <dl className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-zinc-500">Platform</dt>
                  <dd className="font-medium text-zinc-100">{display(brief.platform)}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Account</dt>
                  <dd className="font-medium text-zinc-100">{display(brief.account)}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">ACID</dt>
                  <dd className="font-medium text-zinc-100">{display(brief.acid)}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Objective</dt>
                  <dd className="font-medium text-zinc-100">{display(brief.objective)}</dd>
                </div>
              </dl>
              {role === "aidan" ? (
                <div className="mt-5">
                  <DeleteBriefButton briefId={brief.id} />
                </div>
              ) : null}
            </section>

            <MissingFieldsPanel fields={brief.missing_required_fields} />
            <StructuredBriefView brief={brief.raw_json} />
            <AdSetTable adSets={brief.raw_json.ad_sets} />
            <AdsTable ads={brief.raw_json.ads} />
            <SuggestedNaming
              campaignName={suggestedCampaignName(brief.raw_json)}
              adSetNames={suggestedAdSetNames(brief.raw_json)}
              adNames={suggestedAdNames(brief.raw_json)}
            />
            <Checklist briefId={brief.id} items={brief.checklist_items} canEdit={role === "aidan"} />
            {role === "aidan" ? <InternalNotes briefId={brief.id} initialNotes={brief.internal_notes} /> : null}
            <RawJsonViewer brief={brief.raw_json} />
          </div>
        ) : null}
      </main>
    </>
  );
}
