import { NewBriefForm } from "@/components/NewBriefForm";
import { TopBar } from "@/components/TopBar";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default function NewBriefPage() {
  const role = requireUser();

  return (
    <>
      <TopBar role={role} />
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 animate-rise">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.28em] text-cyan-200">Campaign command flow</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-white">New brief builder</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
            A simple three-step builder: campaign setup, ad sets with nested ads, then review. Claude JSON is optional — the form is the main source of truth.
          </p>
        </div>
        <NewBriefForm />
      </main>
    </>
  );
}
