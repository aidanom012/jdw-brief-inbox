import { NewBriefForm } from "@/components/NewBriefForm";
import { TopBar } from "@/components/TopBar";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default function NewBriefPage() {
  const role = requireUser();

  return (
    <>
      <TopBar role={role} />
      <main className="mx-auto w-full max-w-[1500px] px-4 py-8 sm:px-6">
        <div className="mb-6 animate-rise">
          <p className="pixel-label">8-bit campaign builder</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">New brief</h1>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 pixel-muted">
            Campaign facts first. Then simple ad set notes. Then create ads once and choose which ad sets they go to.
          </p>
        </div>
        <NewBriefForm />
      </main>
    </>
  );
}
