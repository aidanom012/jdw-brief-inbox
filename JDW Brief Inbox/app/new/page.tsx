import { NewBriefForm } from "@/components/NewBriefForm";
import { TopBar } from "@/components/TopBar";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default function NewBriefPage() {
  const role = requireUser();

  return (
    <>
      <TopBar role={role} />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-white">New brief</h1>
          <p className="mt-2 text-sm text-zinc-400">Claude-generated JDW_CAMPAIGN_BRIEF_V1 JSON only.</p>
        </div>
        <NewBriefForm />
      </main>
    </>
  );
}
