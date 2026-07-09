import { loginAction } from "@/app/login/actions";

type PasscodeLoginProps = {
  showError: boolean;
};

export function PasscodeLogin({ showError }: PasscodeLoginProps) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-sm rounded-lg border border-white/10 bg-panel p-6 shadow-glow">
        <div className="mb-6">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-200">Private</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">
            {process.env.NEXT_PUBLIC_APP_NAME || "JDW Brief Inbox"}
          </h1>
        </div>
        <form action={loginAction} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-zinc-200">Passcode</span>
            <input
              name="passcode"
              type="password"
              autoComplete="current-password"
              className="focus-ring mt-2 w-full rounded-md border border-white/10 bg-ink px-3 py-3 text-white placeholder:text-zinc-600"
              autoFocus
            />
          </label>
          {showError ? (
            <p className="rounded-md border border-red-400/30 bg-red-500/12 px-3 py-2 text-sm text-red-100">
              Passcode not recognised.
            </p>
          ) : null}
          <button
            type="submit"
            className="focus-ring w-full rounded-md bg-teal-300 px-4 py-3 font-semibold text-ink hover:bg-teal-200"
          >
            Enter
          </button>
        </form>
      </section>
    </main>
  );
}
