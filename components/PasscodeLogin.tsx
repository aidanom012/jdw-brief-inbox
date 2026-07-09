import { loginAction } from "@/app/login/actions";

type PasscodeLoginProps = {
  showError: boolean;
};

export function PasscodeLogin({ showError }: PasscodeLoginProps) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="animate-rise pixel-window w-full max-w-md p-6 sm:p-8">
        <div className="mb-7">
          <p className="pixel-label">Private // full access</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            {process.env.NEXT_PUBLIC_APP_NAME || "JDW Brief Builder"}
          </h1>
          <p className="mt-3 text-sm font-semibold leading-6 pixel-muted">
            One passcode. No James/Aidan split. Once you are in, every page is unlocked.
          </p>
        </div>
        <form action={loginAction} className="space-y-4">
          <label className="block">
            <span className="pixel-label">Passcode</span>
            <input name="passcode" type="password" autoComplete="current-password" className="field mt-2 font-mono" autoFocus />
          </label>
          {showError ? <p className="pixel-alert px-4 py-3 text-sm font-bold">Passcode not recognised.</p> : null}
          <button type="submit" className="pixel-button focus-ring w-full px-5 py-4 text-sm">
            Enter builder
          </button>
        </form>
      </section>
    </main>
  );
}
