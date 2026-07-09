import { loginAction } from "@/app/login/actions";

type PasscodeLoginProps = {
  showError: boolean;
};

export function PasscodeLogin({ showError }: PasscodeLoginProps) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pixel-grid absolute inset-0 opacity-40" />
      <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/10 blur-3xl" />
      <section className="animate-rise relative w-full max-w-md rounded-2xl border border-cyan-300/30 bg-ink/88 p-6 shadow-neon backdrop-blur-xl sm:p-8">
        <div className="mb-7">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.35em] text-cyan-200">Private // full access</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
            {process.env.NEXT_PUBLIC_APP_NAME || "JDW Brief Builder"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            One passcode. No James/Aidan role split. Once you are in, every page and action is unlocked.
          </p>
        </div>
        <form action={loginAction} className="space-y-4">
          <label className="block">
            <span className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-zinc-300">Passcode</span>
            <input
              name="passcode"
              type="password"
              autoComplete="current-password"
              className="focus-ring mt-2 w-full rounded-xl border border-white/10 bg-black/35 px-4 py-4 font-mono text-white shadow-inner placeholder:text-zinc-600"
              autoFocus
            />
          </label>
          {showError ? (
            <p className="rounded-xl border border-red-400/40 bg-red-500/15 px-4 py-3 text-sm text-red-100">
              Passcode not recognised.
            </p>
          ) : null}
          <button type="submit" className="pixel-button focus-ring w-full px-5 py-4 text-sm">
            Enter builder
          </button>
        </form>
      </section>
    </main>
  );
}
