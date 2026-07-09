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
          <p className="font-mono text-xs font-black uppercase tracking-[0.28em] text-[#201203]">8-bit campaign builder</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-[#201203]">New brief builder</h1>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[#5c4218]">
            Keep the campaign-level useful details, then keep ad sets and ads dead simple. Claude JSON is optional — the form is the main thing.
          </p>
        </div>
        <NewBriefForm />
      </main>
    </>
  );
}
