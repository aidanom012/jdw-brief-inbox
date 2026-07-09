import Link from "next/link";
import { notFound } from "next/navigation";
import { NewBriefForm } from "@/components/NewBriefForm";
import { TopBar } from "@/components/TopBar";
import { requireUser } from "@/lib/auth";
import { getBriefWithChecklist } from "@/lib/db";

export const dynamic = "force-dynamic";

type EditBriefPageProps = {
  params: {
    id: string;
  };
};

export default async function EditBriefPage({ params }: EditBriefPageProps) {
  const role = requireUser();
  const brief = await getBriefWithChecklist(params.id);

  if (!brief) {
    notFound();
  }

  return (
    <>
      <TopBar role={role} />
      <main className="mx-auto w-full max-w-[1500px] px-4 py-8 sm:px-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="pixel-label">Edit saved brief</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight">Update campaign map</h1>
            <p className="mt-2 text-sm font-semibold pixel-muted">Change campaign setup, ad sets, ads, or ad assignments. Saving updates the same brief.</p>
          </div>
          <Link href={`/brief/${params.id}`} className="mini-button focus-ring px-4 py-3">
            Back to brief
          </Link>
        </div>
        <NewBriefForm initialBrief={brief.raw_json} briefId={brief.id} />
      </main>
    </>
  );
}
